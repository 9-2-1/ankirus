from aiohttp import web
import asyncio
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from typing import Optional
import html
import shutil
import os
import time
import calendar
import logging

from anki.collection import Collection, SearchNode

from treemap import (
    TreeNode,
    render_treemap,
    colormap_goldie,
    colormap_bluesea,
    color_from_value,
    svg_from_treemap,
)


logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)


# pub fn current_retrievability(state: MemoryState, days_elapsed: f32, decay: f32) -> f32 {
#     let factor = 0.9f32.powf(1.0 / -decay) - 1.0;
#     (days_elapsed / state.stability * factor + 1.0).powf(-decay)
# }


def current_retrievability(
    stability: float, days_elapsed: float, decay: float
) -> float:
    factor = 0.9 ** (1.0 / -decay) - 1.0
    reta = (days_elapsed / stability * factor + 1.0) ** -decay
    if isinstance(reta, float):
        return reta
    raise ValueError("retrievability is not a float")


def print_meta(c: Collection) -> None:
    constriants = c.build_search_string(SearchNode(deck="-meta-"))
    for nid in c.find_notes(constriants):
        note = c.get_note(nid)


@dataclass
class Item:
    group_path: list[str]
    card_id: int
    name: str
    T: Optional[datetime]
    S: float
    D: float
    R: float


def check_ankis(path: str, timestamp: float) -> bool:
    aupd = os.path.getmtime(path) > timestamp
    if os.path.exists(path + "-wal"):
        bupd = os.path.getmtime(path + "-wal") > timestamp
        aupd = aupd or bupd
    return aupd


def copy_ankis(path: str) -> None:
    shutil.copy(path, "collection.anki2")
    if os.path.exists(path + "-wal"):
        shutil.copy(path + "-wal", "collection.anki2-wal")
    else:
        if os.path.exists("collection.anki2-wal"):
            os.remove("collection.anki2-wal")


def get_items() -> list[Item]:
    curr = datetime.now().timestamp()
    # t4d = datetime(2025, 12, 21).timestamp()
    t4d = (datetime.now() + timedelta(days=4)).timestamp()

    c = Collection("collection.anki2")
    items: list[Item] = []

    constriants = c.build_search_string(SearchNode(negated=SearchNode(deck="-meta-")))
    for cid in c.find_cards(constriants):
        card = c.get_card(cid)
        did = card.current_deck_id()
        group_path = c.decks.name(did).split("::")
        card_id = card.id

        name = card.note().fields[0]
        back = card.note().fields[1]
        w = c.card_stats_data(cid)
        T = datetime.fromtimestamp(w.latest_review) if w.latest_review != 0 else None
        D = w.memory_state.difficulty or 5.5
        S = w.memory_state.stability or 0.0
        # R = w.fsrs_retrievability or 0.0
        R = 0.0
        if w.latest_review != 0 and card.memory_state:
            # for time travellers
            # your_node = None
            # for node in w.revlog:
            #     if node.(time) > your_time:
            #         break
            #     your_node = node
            # memory_state = your_node.memory_state
            # latest_review = your_node.(time)
            R = current_retrievability(
                card.memory_state.stability,
                (curr - w.latest_review) / 86400,
                card.decay or 0.1542,
            )
        card_text = "".join(
            [
                '<div class="group">',
                html.escape("::".join(group_path)),
                "</div>",
                f'<div class="retrievability" style="color:{color_from_value(R, colormap_goldie, Loff=-0.2)}">',
                html.escape(f"{R:5.1%}"),
                "</div>",
                '<div class="question">',
                name,
                "</div>",
                '<div class="answer">',
                back,
                "</div>",
            ]
        )
        items.append(
            Item(
                group_path,
                card_id,
                card_text,
                T,
                S,
                D,
                # 0.8 + (D - 1) / 9 * 0.4,
                R,
            )
        )
    c.close()
    return items


@dataclass
class Folder:
    name: str
    items: list[Item] = field(default_factory=list)
    childs: dict[str, "Folder"] = field(default_factory=dict)


def build_folder(items: list[Item]) -> Folder:
    root = Folder("root", [])
    for item in items:
        folder = root
        for folder_name in item.group_path:
            if folder_name not in folder.childs:
                folder.childs[folder_name] = Folder(folder_name)
            folder = folder.childs[folder_name]
        folder.items.append(item)
    return root


def build_tree(folder: Folder, *path: str) -> TreeNode:
    childs: list[TreeNode] = []
    for item in folder.items:
        childs.append(TreeNode(item.D, item.R, item.name, None))
    for child in sorted(folder.childs.values(), key=lambda x: x.name):
        childs.append(build_tree(child, *path, child.name))
    childs = [child for child in childs if child.weight > 0]
    child_weight = sum(child.weight for child in childs)
    value_weight = sum(child.value * child.weight for child in childs)
    value_mean = value_weight / child_weight
    folder_text = "".join(
        [
            '<div class="group">',
            html.escape("::".join(path)),
            "</div>",
            f'<div class="retrievability" style="color:{color_from_value(value_mean, colormap_goldie, Loff=-0.2)}">',
            html.escape(f"{value_mean:5.1%}"),
            "</div>",
        ]
    )
    return TreeNode(child_weight, value_mean, folder_text, childs)


ANKI_USERPROFILE = "/anki/arigi/"
ANKI_MEDIA_FOLDER_NAME = "media/"  # "collection.media"

# 缓存相关变量
cache_timestamp = 0.0
cache_html = ""
CACHE_DURATION = 10 * 60  # 缓存时间（秒）


async def generate_html() -> str:
    """生成HTML内容"""
    global cache_timestamp, cache_html
    current_time = time.time()

    # 检查是否需要更新缓存
    if check_ankis(ANKI_USERPROFILE + "collection.anki2", cache_timestamp):
        log.info("Anki collection updated. Updating...")
        need_update = True
    elif current_time - cache_timestamp > CACHE_DURATION:
        log.info("Cache expired. Updating...")
        need_update = True
    else:
        need_update = False
    if need_update:
        # 复制Anki数据库
        copy_ankis(ANKI_USERPROFILE + "collection.anki2")

        # 生成树形图
        items = get_items()
        folderroot = build_folder(items)
        treeroot = build_tree(folderroot)
        displays = render_treemap(treeroot, (0, 0, 600, 600), 0.01)
        svg_content = svg_from_treemap(displays, colormap_goldie, 8)

        # 读取模板并插入SVG
        with open("treemap-template.html", "r", encoding="utf-8") as f:
            content = f.read()
            cache_html = content.replace("<!-- TREEMAP_HERE -->", svg_content)

        # 更新缓存时间戳
        cache_timestamp = current_time

    return cache_html


async def handle_root(request: web.Request) -> web.Response:
    global cache_timestamp
    html_content = await generate_html()
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
    if int(cache_timestamp) > int(req_timestamp):
        response = web.Response(
            text=html_content, content_type="text/html", headers=headers
        )
        response.enable_compression(strategy=9)
        return response
    return web.Response(status=304, headers=headers)


async def handle_script(request: web.Request) -> web.FileResponse:
    response = web.FileResponse(
        "/home/richia/arigi.top/html/ankirus/" + request.path[1:]
    )
    response.enable_compression(strategy=9)
    return response


async def main() -> None:
    app = web.Application()
    app.router.add_get("/", handle_root)
    app.router.add_get("/purify.min.js", handle_script)
    app.router.add_get("/purify.min.js.map", handle_script)
    app.router.add_static("/", ANKI_USERPROFILE + ANKI_MEDIA_FOLDER_NAME)

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "127.0.0.1", 24032)
    await site.start()

    while True:
        await asyncio.sleep(3600)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        log.info("Stopped")
