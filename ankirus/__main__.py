from typing import Callable
import asyncio
import logging
import time

from aiohttp import web
from anki.collection import Collection, SearchNode

from .nodejs import NodeJSAgent

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

ANKI_USERPROFILE = "/anki/arigi/"
ANKI_MEDIA_FOLDER_NAME = "media/"  # "collection.media"

nodejs_agent = NodeJSAgent()


async def handle_cards(request: web.Request) -> web.Response:
    # [{group, items, subgroups}]
    return web.Response(text="1155665")


async def handle_index(request: web.Request) -> web.FileResponse:
    return web.FileResponse("web/index.html")


async def main() -> None:
    await nodejs_agent.agent_run()
    tasks = asyncio.gather(
        *[
            asyncio.create_task(nodejs_agent.mathjax(v))
            for v in [
                # examples
                "<script>alert('hello');</script>",
                "<div>hello</div>",
                "<div>hello</div><script>alert('hello');</script>",
                "HELLO $$ax^2+bx+c=0$$",
                r"HELLO \(ax^2+bx+c=0\)",
            ]
        ]
    )
    start = time.time()
    results = await tasks
    end = time.time()
    print(results, end - start)
    await nodejs_agent.agent_close()
    return

    app = web.Application()
    app.router.add_get("/", handle_index)
    app.router.add_get("/cards/", handle_cards)
    app.router.add_static("/static/", "web")
    app.router.add_static("/", ANKI_USERPROFILE + ANKI_MEDIA_FOLDER_NAME)

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "127.0.0.1", 24032)
    await site.start()

    log.info("Started")
    try:
        while True:
            await asyncio.sleep(3600)
    except KeyboardInterrupt:
        log.info("Stopped")

    await nodejs_agent.agent_close()


if __name__ == "__main__":
    asyncio.run(main())
