import shutil
import os
import logging
import time

from .ankidata import load_anki_data, CardGroups
from .config import Config

from anki.collection import Collection

log = logging.getLogger(__name__)


def sync_cp_rm(src: str, dst: str) -> None:
    if os.path.exists(src):
        shutil.copy(src, dst)
    elif os.path.exists(dst):
        os.remove(dst)


def copy_and_read(anki_db: str) -> Collection:
    tmp_path = "tmp-collection.anki2"
    tmp_path_wal = "tmp-collection.anki2-wal"
    sync_cp_rm(anki_db, tmp_path)
    sync_cp_rm(anki_db + "-wal", tmp_path_wal)
    collection = Collection(tmp_path)
    return collection


cache_mtime: float = 0.0
cache_groups: CardGroups = CardGroups()


async def get_anki_data_mtime(anki_db: str) -> float:
    mtime = 0.0
    if os.path.exists(anki_db):
        mtime = max(os.stat(anki_db).st_mtime, mtime)
    if os.path.exists(anki_db + "-wal"):
        mtime = max(os.stat(anki_db + "-wal").st_mtime, mtime)
    return mtime


async def load_anki_data_cached(anki_db: str, config: Config) -> CardGroups:

    global cache_mtime, cache_groups
    db_mtime = await get_anki_data_mtime(anki_db)
    current_time = time.time()

    if cache_mtime >= db_mtime and current_time - cache_mtime < config.get("cache_ttl"):
        return cache_groups

    log.info("Cache miss or expired. Read anki data")
    collection = copy_and_read(anki_db)
    card_groups = load_anki_data(collection)
    collection.close()

    cleanup_temp_files()

    cache_mtime = current_time
    cache_groups = card_groups
    return card_groups


def cleanup_temp_files() -> None:
    for file in ["tmp-collection.anki2", "tmp-collection.anki2-wal"]:
        if os.path.exists(file):
            try:
                os.remove(file)
            except OSError as e:
                log.warning(f"Cannot delete temporary file {file}")
