"""卡片相关路由处理"""

import time
import json
from typing import Union, cast

from aiohttp import web

from ..models.card import ReplyGroup, ReplyCard
from ..models.constants import AppConstants
from ..types.json import Json
from ..utils.time_utils import format_timestamp, parse_if_modified_since


def strip_dight(obj: Json) -> Json:
    """格式化JSON响应数据，减少精度"""
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


async def handle_cards(app, request: web.Request) -> web.Response:
    """处理/cards/端点"""
    cards = await app.ankireader.read(sanitize=app.sanitizer.sanitize_cached)
    cache_timestamp = app.ankireader.cache_mtime

    # 处理缓存头
    headers = _build_cache_headers(cache_timestamp)

    # 检查If-Modified-Since
    if_modified_since = request.headers.get("If-Modified-Since", "?")
    req_timestamp = parse_if_modified_since(if_modified_since)

    if int(cache_timestamp) == int(req_timestamp):
        return web.Response(status=304, headers=headers)

    # 构建响应数据
    response_arr = _build_response_data(cards)

    # 构建响应体
    response_body = json.dumps(
        strip_dight(cast(Json, response_arr)), ensure_ascii=False, separators=(",", ":")
    ).encode("utf-8")

    response = web.Response(body=response_body, headers=headers)
    response.enable_compression(strategy=AppConstants.COMPRESSION_STRATEGY)
    return response


async def handle_count_due_cards(app, request: web.Request) -> web.Response:
    """处理/cards/due/端点"""
    now = int(time.time())
    cards = await app.ankireader.read()
    due_count = len([card for card in cards if card.due <= now])
    return web.Response(text=str(due_count))


def _build_cache_headers(cache_timestamp: float) -> dict:
    """构建缓存相关的响应头"""
    last_modified = format_timestamp(cache_timestamp)
    return {
        "Last-Modified": last_modified,
        "Cache-Control": AppConstants.CACHE_CONTROL,
        "Content-Type": AppConstants.CONTENT_TYPE,
    }


def _build_response_data(cards) -> list[Union[ReplyGroup, ReplyCard]]:
    """构建响应数据"""
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

    return response_arr
