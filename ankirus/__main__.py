import asyncio
import logging
import json
from typing import cast
from dataclasses import asdict

from aiohttp import web

from .ankidata import GroupNotFound
from .ankicached import load_anki_data_cached
from .nodejs import NodeJSAgent

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

ANKI_USERPROFILE = "/anki/arigi/"
ANKI_MEDIA_FOLDER_NAME = "media/"  # "collection.media"

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
    card_groups = await load_anki_data_cached(ANKI_USERPROFILE + "collection.anki2")
    a_group = request.query.get("group")
    if a_group is not None and a_group != "":
        try:
            card_groups = card_groups.subgroup(*a_group.split("::"))
        except GroupNotFound:
            return web.Response(text='{"error":"group not found"}', status=404)
    jsondict = cast(Json, asdict(card_groups))
    jsondict = strip_dight(jsondict)
    jsondata = json.dumps(jsondict, ensure_ascii=False, separators=(",", ":"))
    response = web.Response(text=jsondata, content_type="application/json")
    response.enable_compression()
    return response


async def handle_index(request: web.Request) -> web.FileResponse:
    return web.FileResponse("web/index.html")


async def main() -> None:
    global ANKI_MEDIA_FOLDER_NAME
    global ANKI_USERPROFILE
    with open("config.json", "rb") as f:
        config = json.load(f)
    ANKI_MEDIA_FOLDER_NAME = config.get("media", ANKI_MEDIA_FOLDER_NAME)
    ANKI_USERPROFILE = config.get("userprofile", ANKI_USERPROFILE)
    await nodejs_agent.agent_run()

    app = web.Application()
    app.router.add_get("/", handle_index)
    app.router.add_get("/cards/", handle_cards)
    app.router.add_static("/static/", "web")
    app.router.add_static("/", ANKI_USERPROFILE + ANKI_MEDIA_FOLDER_NAME)

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
