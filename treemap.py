from dataclasses import dataclass
from typing import Optional
from oklch.colors import OKLCH


@dataclass
class TreeNode:
    weight: float
    value: float
    text: str
    childs: Optional[list["TreeNode"]] = None


@dataclass
class TreeNodeDisplay:
    rect: tuple[float, float, float, float]
    value: float
    text: str
    node: TreeNode
    level: int
    leaf: bool


def squarify(
    nodes: list[TreeNode],
    rect: tuple[float, float, float, float],
    min_size: float,
    level: int,
    keep_order: bool = False,
) -> list[TreeNodeDisplay]:
    if not keep_order:
        nodes = list(sorted(nodes, key=lambda x: x.weight, reverse=True))
    displays: list[TreeNodeDisplay] = []
    n = len(nodes)
    i0 = 0
    tot_weight = sum([node.weight for node in nodes])
    x, y, w, h = rect
    while i0 < n:
        node = nodes[i0]
        row_way = h > w or keep_order
        row_weight = node.weight
        min_weight = row_weight
        max_weight = row_weight
        # https://github.com/d3/d3-hierarchy/blob/main/src/treemap/squarify.js
        if row_way:
            row_h = row_weight / tot_weight * h
            min_w = min_weight / row_weight * w
            max_w = max_weight / row_weight * w
            # max(k) = max_w / h
            # max(1/k) = h / min_w
            min_ratio = max(max_w / row_h, row_h / min_w)
        else:
            row_w = row_weight / tot_weight * w
            min_h = min_weight / row_weight * h
            max_h = max_weight / row_weight * h
            min_ratio = max(max_h / row_w, row_w / min_h)

        i1 = i0 + 1
        while i1 < n:
            node = nodes[i1]
            row_weight += node.weight
            if node.weight > min_weight:
                min_weight = node.weight
            if node.weight > max_weight:
                max_weight = node.weight
            if row_way:
                min_w = node.weight / row_weight * w
                max_w = node.weight / row_weight * w
                row_h = row_weight / tot_weight * h
                new_ratio = max(max_w / row_h, row_h / min_w)
            else:
                min_h = node.weight / row_weight * h
                max_h = node.weight / row_weight * h
                row_w = row_weight / tot_weight * w
                new_ratio = max(max_h / row_w, row_w / min_h)
            if new_ratio > min_ratio:
                row_weight -= node.weight
                break
            min_ratio = new_ratio
            i1 += 1
        if row_way:
            row_h = row_weight / tot_weight * h
            x0 = x
            for i in range(i0, i1):
                node = nodes[i]
                node_rect = (x0, y, node.weight / row_weight * w, row_h)
                displays.extend(render_treemap(node, node_rect, min_size, level))
                x0 += node.weight / row_weight * w
            y += row_h
            h -= row_h
        else:
            row_w = row_weight / tot_weight * w
            y0 = y
            for i in range(i0, i1):
                node = nodes[i]
                node_rect = (x, y0, row_w, node.weight / row_weight * h)
                displays.extend(render_treemap(node, node_rect, min_size, level))
                y0 += node.weight / row_weight * h
            x += row_w
            w -= row_w
        tot_weight -= row_weight
        i0 = i1
    return displays


def render_treemap(
    root: TreeNode,
    rect: tuple[float, float, float, float],
    min_size: float,
    level: int = 0,
) -> list[TreeNodeDisplay]:
    displays = []
    if root.childs is not None:
        have_folder = any([node.childs is not None for node in root.childs])
        displays.append(
            TreeNodeDisplay(rect, root.value, root.text, root, level, False)
        )
        displays.extend(
            squarify(root.childs, rect, min_size, level + 1, keep_order=have_folder)
        )
    else:
        displays.append(TreeNodeDisplay(rect, root.value, root.text, root, level, True))
    return displays


def _escape_svg_text(text: str) -> str:
    """Escape special characters in SVG text."""
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
        .replace("\r", "&#13;")
        .replace("\n", "&#10;")
    )


# oklch.com
colormap_goldie = {
    0.00: (0.98, 0.00, 28.0),
    0.80: (0.78, 0.09, 28.0),
    0.90: (0.93, 0.17, 104.0),
    1.00: (0.57, 0.20, 260.0),
}

colormap_bluesea = {
    0.00: (0.95, 0.02, 257.0),
    0.90: (0.82, 0.07, 257.0),
    1.00: (0.53, 0.18, 257.0),
}


def color_from_value(
    value: float,
    colormap: dict[float, tuple[float, float, float]],
    Loff: float = 0.0,
    Coff: float = 0.0,
    Hoff: float = 0.0,
) -> str:
    last = None
    nexx = None
    for v in colormap:
        if v > value:
            nexx = v
            break
        last = v
    if last is None:
        if nexx is None:
            raise ValueError("Empty colormap")
        cL, cC, cH = colormap[nexx]
    elif nexx is None:
        cL, cC, cH = colormap[last]
    else:
        cL, cC, cH = [
            x + (y - x) * (value - last) / (nexx - last)
            for x, y in zip(colormap[last], colormap[nexx])
        ]
    oklch = OKLCH(l=cL + Loff, c=cC + Coff, h=cH + Hoff)  # type: ignore[no-untyped-call]
    color = str(oklch.to_RGB())  # type: ignore[no-untyped-call]
    return color


def svg_from_treemap(
    displays: list[TreeNodeDisplay],
    colormap: dict[float, tuple[float, float, float]],
    level_frames: int,
) -> str:
    """Generate an SVG file from the treemap displays."""
    x, y, w, h = displays[0].rect
    sidebar_padding_left = 10
    sidebar_width = 20
    sidebar_padding_right = 30
    sidebar = sidebar_padding_left + sidebar_width + sidebar_padding_right

    svg_content = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w + sidebar}" height="{h}">',
    ]

    colormap_display: list[str] = []
    min_value = min(colormap.keys())
    max_value = max(colormap.keys())
    for p in range(101):
        color = color_from_value(
            min_value + p / 100 * (max_value - min_value), colormap
        )
        colormap_display.append(
            f'      <stop stop-color="{color}" offset="{(p/100)*100}%" />'
        )

    # sidebar first
    svg_content.extend(
        [
            "  <defs>",
            '    <linearGradient id="a" x1="0" y1="0" x2="0" y2="1">',
            *colormap_display,
            "    </linearGradient>",
            "  </defs>"
            f'  <rect class="sidebar" x="{w + sidebar_padding_left}" y="0" width="{sidebar_width}" height="{h}" fill="url(#a)" stroke="white" stroke-width="{(level_frames-1)/2}"/>',
        ]
    )

    for v in colormap.keys():
        color_stroke = color_from_value(v, colormap, Loff=-0.2)
        svg_content.append(
            f'  <line x1="{w + sidebar_padding_left}" y1="{(v-min_value)/(max_value-min_value)*h}" x2="{w + sidebar_padding_left + sidebar_width}" y2="{(v-min_value)/(max_value-min_value)*h}" stroke="white" stroke-width="{(level_frames-1)/2}" />'
        )
        svg_content.append(
            f'  <text x="{w + sidebar_padding_left + sidebar_width + 5}" y="{(v-min_value)/(max_value-min_value)*(h-10)+10}" font-size="10" fill="{color_stroke}">{v}</text>'
        )
    for d in displays:
        x, y, w, h = d.rect
        color = color_from_value(d.value, colormap)
        color_stroke = color_from_value(d.value, colormap, Loff=-0.05)
        # Add rectangle
        svg_content.append(
            f'  <rect class="rect" x="{x}" y="{y}" width="{w}" height="{h}" fill="{color}" stroke="{color_stroke}" stroke-width="0.5" data-text="{_escape_svg_text(d.text)}" data-value="{d.value}" />'
        )
    for d in displays[::-1]:
        if d.level < level_frames and d.level != 0 and not d.leaf:
            x, y, w, h = d.rect
            # Add border
            svg_content.append(
                f'  <rect class="rect" x="{x}" y="{y}" width="{w}" height="{h}" fill="none" stroke="white" stroke-width="{(level_frames-d.level)/2}" />'
            )

    svg_content.append("</svg>")

    return "\n".join(svg_content)
