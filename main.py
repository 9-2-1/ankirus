from datetime import datetime, timedelta
from dataclasses import dataclass, field
from typing import Optional
import html
import shutil
import os

from anki.collection import Collection, SearchNode

from treemap import (
    TreeNode,
    render_treemap,
    colormap_goldie,
    colormap_bluesea,
    color_from_value,
)


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


def copy_ankis(path: str) -> None:
    shutil.copy(path, "collection.anki2")
    if os.path.exists(path + "-wal"):
        shutil.copy(path + "-wal", "collection.anki2-wal")
    else:
        os.remove("collection.anki2-wal")


def get_items() -> list[Item]:
    # curr = datetime.now().timestamp()
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
        R = w.fsrs_retrievability or 0.0
        # R = 0.0
        # if w.latest_review != 0:
        #     # for time travellers
        #     # your_node = None
        #     # for node in w.revlog:
        #     #     if node.(time) > your_time:
        #     #         break
        #     #     your_node = node
        #     # memory_state = your_node.memory_state
        #     # latest_review = your_node.(time)
        #     R = current_retrievability(
        #         card.memory_state.stability,
        #         (t4d - w.latest_review) / 86400,
        #         card.decay or 0.1542,
        #     )
        card_text = "".join(
            [
                '<div class="group">',
                html.escape("::".join(group_path)),
                "</div>",
                f'<div class="retrievability" style="color:{color_from_value(R, colormap_goldie, Loff=-0.2)}">',
                html.escape(f"{R:6.2%}"),
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


def build_tree(folder: Folder) -> TreeNode:
    childs: list[TreeNode] = []
    for item in folder.items:
        childs.append(TreeNode(item.D, item.R, item.name, None))
    for child in sorted(folder.childs.values(), key=lambda x: x.name):
        childs.append(build_tree(child))
    childs = [child for child in childs if child.weight > 0]
    child_weight = sum(child.weight for child in childs)
    value_weight = sum(child.value * child.weight for child in childs)
    value_mean = value_weight / child_weight
    return TreeNode(child_weight, value_mean, folder.name, childs)


ANKI_BASE = r"C:\Users\11951\AppData\Roaming\Anki2\arigi" + "\\"
if __name__ == "__main__":
    copy_ankis(ANKI_BASE + "collection.anki2")

    items = get_items()
    folderroot = build_folder(items)
    treeroot = build_tree(folderroot)
    displays = render_treemap(treeroot, (0, 0, 600, 600), 0.01)

    from treemap import svg_from_treemap

    svg_content = svg_from_treemap(displays, colormap_goldie, 8)

    with open("treemap-template.html", "r", encoding="utf-8") as f:
        with open("treemap.html", "w", encoding="utf-8") as g:
            content = f.read()
            g.write(content.replace("<!-- TREEMAP_HERE -->", svg_content))
