"""Anki数据读取服务"""

import shutil
import os
import logging
import time
import asyncio
from typing import Optional, Callable, Awaitable, List

from anki.collection import Collection

from ..models.card import Card
from ..models.config import Config
from ..models.constants import AnkiConstants

log = logging.getLogger(__name__)


class AnkiCachedReader:
    """
    Anki数据库读取器
    Anki数据库在使用期间被锁定，需要复制到临时文件进行读取
    """

    def __init__(self, anki_db: str, config: Config) -> None:
        self.anki_db = anki_db
        self.config = config
        self.collection: Optional[Collection] = None
        self.cache_mtime: float = 0.0
        self.cards: Optional[List[Card]] = None
        self.lock = asyncio.Lock()

    async def read(
        self, sanitize: Optional[Callable[[str], Awaitable[str]]] = None
    ) -> List[Card]:
        """读取卡片数据"""
        async with self.lock:
            db_mtime = get_anki_data_mtime(self.anki_db)
            current_time = time.time()

            if (
                self.cards is None
                or self.cache_mtime < db_mtime
                or current_time - self.cache_mtime > self.config.get("cache_ttl")
            ):
                await self._refresh_cache(sanitize)

        return self.cards or []

    async def _refresh_cache(
        self, sanitize: Optional[Callable[[str], Awaitable[str]]]
    ) -> None:
        """刷新缓存数据"""
        if self.collection is not None:
            self.collection.close()

        log.info("Cache miss or expired. Read anki data")
        self.collection = copy_and_read(self.anki_db, self.config.get("tmp_db"))
        self.cards = await load_anki_data(self.collection, sanitize=sanitize)
        self.collection.close()
        self.collection = None
        self.cache_mtime = time.time()
        cleanup_temp_files(self.config.get("tmp_db"))

    def close(self) -> None:
        """关闭资源"""
        if self.collection:
            self.collection.close()
        cleanup_temp_files(self.config.get("tmp_db"))


async def load_anki_data(
    col: Collection, sanitize: Optional[Callable[[str], Awaitable[str]]] = None
) -> List[Card]:
    """从Anki集合加载卡片数据"""
    from anki.collection import (
        QUEUE_TYPE_NEW,
        QUEUE_TYPE_LRN,
        QUEUE_TYPE_REV,
        QUEUE_TYPE_PREVIEW,
        QUEUE_TYPE_DAY_LEARN_RELEARN,
        QUEUE_TYPE_SUSPENDED,
    )

    # 获取时间配置
    crt = col.crt
    tzoffs = col.get_config("creationOffset")
    if not isinstance(tzoffs, int):
        tzoffs = 0
    rollover = col.get_config("rollover")
    if not isinstance(rollover, int):
        rollover = 0

    cards: List[Card] = []

    for cid in col.find_cards(""):
        card = col.get_card(cid)
        deckid = card.current_deck_id()

        group = col.decks.name(deckid)
        cstats = col.card_stats_data(cid)

        fields = card.note().fields
        front = fields[0] if len(fields) > 0 else ""
        back = fields[1] if len(fields) > 1 else ""

        if sanitize is not None:
            front = await sanitize(front)
            back = await sanitize(back)

        # 获取最后复习时间
        time = _get_last_review_time(cstats)

        # 获取记忆状态
        difficulty, stability, decay = _get_memory_state(card)

        paused = card.queue == QUEUE_TYPE_SUSPENDED

        # 计算due时间
        due = _calculate_due_time(card, crt, tzoffs, rollover)

        cards.append(
            Card(
                cid=cid,
                group=group,
                front=front,
                back=back,
                time=time,
                difficulty=difficulty,
                stability=stability,
                decay=decay,
                paused=paused,
                due=due,
            )
        )

    return cards


def _get_last_review_time(cstats) -> int:
    """获取最后复习时间"""
    time = 0
    for revlog in cstats.revlog:  # 已经反转
        if revlog.review_kind != AnkiConstants.RESCHEDULED:
            time = revlog.time
            break
    return time


def _get_memory_state(card) -> tuple[float, float, float]:
    """获取记忆状态"""
    difficulty = AnkiConstants.DEFAULT_DIFFICULTY
    stability = AnkiConstants.DEFAULT_STABILITY
    decay = AnkiConstants.DEFAULT_DECAY

    if card.memory_state is not None:
        difficulty = card.memory_state.difficulty
        stability = card.memory_state.stability
    if card.decay is not None:
        decay = card.decay

    return difficulty, stability, decay


def _calculate_due_time(card, crt: int, tzoffs: int, rollover: int) -> int:
    """计算卡片due时间"""
    from anki.collection import (
        QUEUE_TYPE_NEW,
        QUEUE_TYPE_LRN,
        QUEUE_TYPE_REV,
        QUEUE_TYPE_PREVIEW,
        QUEUE_TYPE_DAY_LEARN_RELEARN,
    )

    if card.queue == QUEUE_TYPE_NEW:
        return 0
    elif card.queue == QUEUE_TYPE_LRN or card.queue == QUEUE_TYPE_PREVIEW:
        return card.due
    elif card.queue == QUEUE_TYPE_REV or card.queue == QUEUE_TYPE_DAY_LEARN_RELEARN:
        return (
            ((crt - tzoffs * 60) // (24 * 60 * 60) + card.due) * (24 * 60 * 60)  # 时区
            + tzoffs * 60  # 时区偏移
            + rollover * 60 * 60  # 跨天时间节点(小时)
        )
    else:
        return AnkiConstants.NEVER_DUE


def sync_cp_rm(src: str, dst: str) -> None:
    """同步复制或删除文件"""
    if os.path.exists(src):
        shutil.copy(src, dst)
    elif os.path.exists(dst):
        os.remove(dst)


def copy_and_read(anki_db: str, tmp_db: str) -> Collection:
    """复制并读取Anki数据库"""
    sync_cp_rm(anki_db, tmp_db)
    sync_cp_rm(anki_db + "-wal", tmp_db + "-wal")
    collection = Collection(tmp_db)
    return collection


def get_anki_data_mtime(anki_db: str) -> float:
    """获取Anki数据修改时间"""
    mtime = 0.0
    if os.path.exists(anki_db):
        mtime = max(os.stat(anki_db).st_mtime, mtime)
    if os.path.exists(anki_db + "-wal"):
        mtime = max(os.stat(anki_db + "-wal").st_mtime, mtime)
    return mtime


def cleanup_temp_files(tmp_db: str) -> None:
    """清理临时文件"""
    for file in [tmp_db, tmp_db + "-wal"]:
        if os.path.exists(file):
            try:
                os.remove(file)
            except OSError as e:
                log.warning(f"Cannot delete temporary file {file}")
