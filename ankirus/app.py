"""主应用类"""

import asyncio
import logging

from aiohttp import web

from .services.anki_reader import AnkiCachedReader
from .services.sanitizer import TextSanitizer
from .models.config import Config
from .routes.cards import handle_cards, handle_count_due_cards
from .routes.index import handle_index

log = logging.getLogger(__name__)


class App:
    """主应用类"""

    def __init__(self, config: Config) -> None:
        self.config = config
        self.ankireader = AnkiCachedReader(
            self.config.get("userprofile") + "collection.anki2", self.config
        )
        enable_sanitizer = self.config.get("enable_sensitive_word_filter", True)
        self.sanitizer = (
            TextSanitizer(self.config.get("banned_words"), self.config.get("cachedb"))
            if enable_sanitizer
            else None
        )

    async def run(self) -> None:
        """启动应用"""
        app = web.Application()

        # 设置路由
        self._setup_routes(app)

        # 启动服务器
        runner = web.AppRunner(app)
        await runner.setup()
        site = web.TCPSite(runner, "127.0.0.1", self.config.get("port"))
        await site.start()

        log.info(f"ankirus started at http://127.0.0.1:{self.config.get('port')}")

        try:
            while True:
                await asyncio.sleep(3600)
        except KeyboardInterrupt:
            log.info("ankirus stopped")
        finally:
            self._cleanup()

    def _setup_routes(self, app: web.Application) -> None:
        """设置应用路由"""
        # 绑定应用实例到路由处理函数
        app.router.add_get("/", handle_index)
        app.router.add_get("/cards/", lambda request: handle_cards(self, request))
        app.router.add_get(
            "/cards/due/", lambda request: handle_count_due_cards(self, request)
        )

        # 静态文件路由
        app.router.add_static("/assets/", "web/dist/assets")
        app.router.add_static(
            "/", self.config.get("userprofile") + self.config.get("media")
        )

    def _cleanup(self) -> None:
        """清理资源"""
        self.ankireader.close()
        if self.sanitizer:
            self.sanitizer.close()
