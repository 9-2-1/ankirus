import asyncio
import logging
import json
from typing import cast, Sequence, Mapping, Any, TypedDict, Literal, NotRequired, Union
from dataclasses import asdict
import time
import calendar
import argparse

from aiohttp import web

from .ankicached import AnkiCachedReader
from .config import Config
from .nodejs import NodeJSAgent

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)
Json = Mapping[str, "Json"] | Sequence["Json"] | str | int | float | bool | None


class ReplyGroup(TypedDict):
    group: list[str]


class ReplyCard(TypedDict):
    time: int
    difficulty: float
    stability: float
    decay: float
    front: str
    back: str
    paused: NotRequired[Literal[True]]


def strip_dight(obj: Json) -> Json:
    if isinstance(obj, dict):
        return {key: strip_dight(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [strip_dight(item) for item in obj]
    elif isinstance(obj, float):
        obj = round(obj, 3)
        if obj % 1.0 == 0.0:
            obj = int(obj)
        return obj
    else:
        return obj


class App:
    def __init__(self, config: Config) -> None:
        self.config = config
        self.ankireader = AnkiCachedReader(
            self.config.get("userprofile") + "collection.anki2", self.config
        )
        self.nodejs_agent = NodeJSAgent()
        self.cachedb = sqlite3.connect(self.config.get("cachedb"))
        self.cachedb.execute("PRAGMA journal_mode = WAL;")
        self.cachedb.execute("PRAGMA locking_mode = EXCLUSIVE;")
        self.cachedb.execute(
            "CREATE TABLE IF NOT EXISTS sanitize (input TEXT PRIMARY KEY, output TEXT) WITHOUT ROWID"
        )
        self.cachedb.commit()

    async def sanitize_cached(self, text: str) -> str:
        input_text = text
        cacherow = self.cachedb.execute(
            "SELECT output FROM sanitize WHERE input = ?", (input_text,)
        ).fetchone()
        if cacherow:
            text = cast(str, cacherow[0])
            if text == "":
                text = input_text
            return text
        text = await self.nodejs_agent.purify(text)
        while True:
            old_text = text
            for word in self.banned_words:
                text = text.replace(word, "")
            if old_text == text:
                break
        self.cachedb.execute(
            "INSERT INTO sanitize (input, output) VALUES (?, ?)",
            (input_text, "" if input_text == text else text),
        )
        self.cachedb.commit()
        return text

    async def handle_count_due_cards(self, request: web.Request) -> web.Response:
        now = int(time.time())
        due_count = len(
            [card for card in await self.ankireader.read() if card.due <= now]
        )
        return web.Response(text=str(due_count))

    async def handle_cards(self, request: web.Request) -> web.Response:
        cards = await self.ankireader.read(sanitize=self.sanitize)
        cache_timestamp = self.ankireader.cache_mtime
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
        headers = {
            "Last-Modified": last_modified,
            "Cache-Control": "no-cache",
            "Content-Type": "application/json",
        }
        if int(cache_timestamp) == int(req_timestamp):
            return web.Response(status=304, headers=headers)

        response_arr: list[Union[ReplyGroup, ReplyCard]] = []
        last_group = ""
        for card in cards:
            if card.group != last_group:
                response_arr.append({"group": card.group.split("::")})
                last_group = card.group
            card_dict: ReplyCard = {
                "time": card.time,
                "difficulty": card.difficulty,
                "stability": card.stability,
                "decay": card.decay,
                "front": card.front,
                "back": card.back,
            }
            if card.paused:
                card_dict["paused"] = True
            response_arr.append(card_dict)
        responseBody = json.dumps(
            strip_dight(cast(Json, response_arr)),
            ensure_ascii=False,
            separators=(",", ":"),
        ).encode("utf-8")
        response = web.Response(body=responseBody, headers=headers)
        response.enable_compression(strategy=9)
        return response

    async def handle_index(self, request: web.Request) -> web.FileResponse:
        return web.FileResponse("web/index.html")

    async def run(self) -> None:
        await self.nodejs_agent.agent_run()

        app = web.Application()
        app.router.add_get("/", self.handle_index)
        app.router.add_get("/cards/", self.handle_cards)
        app.router.add_get("/cards/due/", self.handle_count_due_cards)
        app.router.add_static("/static/", "web")
        app.router.add_static(
            "/", self.config.get("userprofile") + self.config.get("media")
        )

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

        await self.nodejs_agent.agent_close()


async def main() -> None:
    parser = argparse.ArgumentParser(description="ankirus")
    parser.add_argument("--test", action="store_true")
    parser.add_argument("--config", type=str, default="config.json", help="config file")
    args = parser.parse_args()
    config = Config(args.config)

    if args.test:
        ankireader = AnkiCachedReader(
            config.get("userprofile") + "collection.anki2", config
        )
        cards = await ankireader.read()
        return
    app = App(config)

    await app.run()


if __name__ == "__main__":
    asyncio.run(main())
