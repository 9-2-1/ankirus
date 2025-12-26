"""文本清理服务"""

import sqlite3
from typing import List
from pathlib import Path


class TextSanitizer:
    """文本清理服务类"""

    def __init__(self, banned_words_path: str, cache_db_path: str):
        self.banned_words = self._load_banned_words(banned_words_path)
        Path(cache_db_path).parent.mkdir(parents=True, exist_ok=True)
        self.cachedb = sqlite3.connect(cache_db_path)
        self._init_cache_table()

    def _load_banned_words(self, banned_words_path: str) -> List[str]:
        """加载禁用词列表"""
        banned_words = []
        with open(banned_words_path, "r", encoding="utf-8") as f:
            banned_words = f.read().splitlines()
            banned_words = [word.strip() for word in banned_words if word.strip() != ""]
            banned_words.sort(key=len, reverse=True)
        return banned_words

    def _init_cache_table(self) -> None:
        """初始化缓存表"""
        self.cachedb.execute("PRAGMA journal_mode = WAL;")
        self.cachedb.execute("PRAGMA locking_mode = EXCLUSIVE;")
        self.cachedb.execute(
            "CREATE TABLE IF NOT EXISTS sanitize (input TEXT PRIMARY KEY, output TEXT) WITHOUT ROWID"
        )
        self.cachedb.commit()

    async def sanitize_cached(self, text: str) -> str:
        """带缓存的文本清理"""
        input_text = text
        cacherow = self.cachedb.execute(
            "SELECT output FROM sanitize WHERE input = ?", (input_text,)
        ).fetchone()

        if cacherow:
            text = cacherow[0]
            if text == "":
                text = input_text
            return text

        # 执行清理
        text = self._sanitize_text(text)

        # 缓存结果
        self.cachedb.execute(
            "INSERT INTO sanitize (input, output) VALUES (?, ?)",
            (input_text, "" if input_text == text else text),
        )
        self.cachedb.commit()
        return text

    def _sanitize_text(self, text: str) -> str:
        """执行文本清理"""
        while True:
            old_text = text
            for word in self.banned_words:
                text = text.replace(word, "")
            if old_text == text:
                break
        return text

    def close(self) -> None:
        """关闭数据库连接"""
        self.cachedb.close()
