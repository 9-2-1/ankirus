import asyncio
import logging
import json
from typing import cast
from dataclasses import asdict
import time
import calendar

from aiohttp import web

from .ankidata import GroupNotFound
from .ankicached import load_anki_data_cached, get_anki_data_mtime
from .config import Config
from .nodejs import NodeJSAgent

config = Config()
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)


nodejs_agent = NodeJSAgent()

Json = dict[str, "Json"] | list["Json"] | str | int | float | bool | None


def strip_dight(obj: Json) -> Json:
    if isinstance(obj, dict):
        return {key: strip_dight(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [strip_dight(item) for item in obj]
    elif isinstance(obj, float):
        return round(obj, 3)
    else:
        return obj


async def handle_cards(request: web.Request) -> web.Response:
    cache_timestamp = await get_anki_data_mtime(
        config.get("userprofile") + "collection.anki2"
    )
    last_modified = time.strftime(
        "%a, %d %b %Y %H:%M:%S GMT", time.gmtime(int(cache_timestamp))
    )
    if_modified_since = request.headers.get("If-Modified-Since", "?")
    try:
        req_timestamp = calendar.timegm(
            time.strptime(if_modified_since, "%a, %d %b %Y %H:%M:%S GMT")
        )
    except ValueError:
        req_timestamp = int(cache_timestamp) - 1
    headers = {"Last-Modified": last_modified, "Cache-Control": "no-cache"}
    if int(cache_timestamp) <= int(req_timestamp):
        return web.Response(status=304, headers=headers)
    card_groups = await load_anki_data_cached(
        config.get("userprofile") + "collection.anki2", config
    )
    a_group = request.query.get("group")
    if a_group is not None and a_group != "":
        try:
            card_groups = card_groups.subgroup(*a_group.split("::"))
        except GroupNotFound:
            return web.Response(text='{"error":"group not found"}', status=404)
    jsondict = cast(Json, asdict(card_groups))
    jsondict = strip_dight(jsondict)
    jsondata = json.dumps(jsondict, ensure_ascii=False, separators=(",", ":"))
    response = web.Response(
        text=jsondata, content_type="application/json", headers=headers
    )
    response.enable_compression(strategy=9)
    return response


async def handle_index(request: web.Request) -> web.FileResponse:
    return web.FileResponse("web/index.html")


async def main() -> None:
    await nodejs_agent.agent_run()

    app = web.Application()
    app.router.add_get("/", handle_index)
    app.router.add_get("/cards/", handle_cards)
    app.router.add_static("/static/", "web")
    app.router.add_static("/", config.get("userprofile") + config.get("media"))

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "127.0.0.1", 24032)
    await site.start()

    log.info("ankirus started at http://127.0.0.1:24032")
    try:
        while True:
            await asyncio.sleep(3600)
    except KeyboardInterrupt:
        log.info("ankirus stopped")

    await nodejs_agent.agent_close()


if __name__ == "__main__":
    asyncio.run(main())
