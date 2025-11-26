"""应用入口点"""

import asyncio
import argparse
import logging

from .app import App
from .models.config import Config
from .services.anki_reader import AnkiCachedReader

logging.basicConfig(level=logging.INFO)


async def main() -> None:
    """主函数"""
    parser = argparse.ArgumentParser(description="ankirus")
    parser.add_argument("--test", action="store_true")
    parser.add_argument("--config", type=str, default="config.json", help="config file")
    args = parser.parse_args()
    config = Config(args.config)

    if args.test:
        await _run_test_mode(config)
    else:
        await _run_app_mode(config)


async def _run_test_mode(config: Config) -> None:
    """测试模式运行"""
    ankireader = AnkiCachedReader(
        config.get("userprofile") + "collection.anki2", config
    )
    cards = await ankireader.read()
    ankireader.close()


async def _run_app_mode(config: Config) -> None:
    """应用模式运行"""
    app = App(config)
    await app.run()


if __name__ == "__main__":
    asyncio.run(main())
