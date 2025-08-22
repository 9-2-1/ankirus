import shutil
import os
import logging
import time
from typing import Optional, Callable, Awaitable
import asyncio


from .ankidata import load_anki_data, Card
from .config import Config

from anki.collection import Collection

log = logging.getLogger(__name__)


class AnkiCachedReader:
    """
    Anki database is locked during use.
    We have to copy it to a temp file to read it.
    It is not safe, but works.
    """

    def __init__(self, anki_db: str, config: Config) -> None:
        self.anki_db = anki_db
        self.config = config
        self.collection: Optional[Collection] = None
        self.cache_mtime: float = 0.0
        self.cards: Optional[list[Card]] = None
        self.lock = asyncio.Lock()

    async def read(
        self, sanitize: Optional[Callable[[str], Awaitable[str]]] = None
    ) -> list[Card]:
        async with self.lock:
            db_mtime = get_anki_data_mtime(self.anki_db)
            current_time = time.time()
            if (
                self.cards is None
                or self.cache_mtime < db_mtime
                or current_time - self.cache_mtime > self.config.get("cache_ttl")
            ):
                if self.collection is not None:
                    self.collection.close()
                log.info("Cache miss or expired. Read anki data")
                self.collection = copy_and_read(self.anki_db, self.config.get("tmp_db"))
                self.cards = await load_anki_data(self.collection, sanitize=sanitize)
                self.collection.close()  # keep opened for future?
                self.collection = None
                self.cache_mtime = current_time
                cleanup_temp_files(self.config.get("tmp_db"))
        return self.cards

    def close(self) -> None:
        if self.collection:
            self.collection.close()
        cleanup_temp_files(self.config.get("tmp_db"))


def sync_cp_rm(src: str, dst: str) -> None:
    if os.path.exists(src):
        shutil.copy(src, dst)
    elif os.path.exists(dst):
        os.remove(dst)


def copy_and_read(anki_db: str, tmp_db: str) -> Collection:
    sync_cp_rm(anki_db, tmp_db)
    sync_cp_rm(anki_db + "-wal", tmp_db + "-wal")
    collection = Collection(tmp_db)
    return collection


def get_anki_data_mtime(anki_db: str) -> float:
    mtime = 0.0
    if os.path.exists(anki_db):
        mtime = max(os.stat(anki_db).st_mtime, mtime)
    if os.path.exists(anki_db + "-wal"):
        mtime = max(os.stat(anki_db + "-wal").st_mtime, mtime)
    return mtime


def cleanup_temp_files(tmp_db: str) -> None:
    for file in [tmp_db, tmp_db + "-wal"]:
        if os.path.exists(file):
            try:
                os.remove(file)
            except OSError as e:
                log.warning(f"Cannot delete temporary file {file}")
