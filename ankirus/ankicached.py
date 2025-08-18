from .ankidata import load_anki_data, CardGroups
from anki.collection import Collection
import shutil
import os
import logging

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


async def load_anki_data_cached(anki_db: str) -> CardGroups:
    global cache_mtime, cache_groups
    db_mtime = await get_anki_data_mtime(anki_db)
    if cache_mtime >= db_mtime:
        return cache_groups
    log.info("Cache miss. Read anki data")
    collection = copy_and_read(anki_db)
    card_groups = load_anki_data(collection)
    collection.close()
    cache_mtime = db_mtime
    cache_groups = card_groups
    return card_groups
