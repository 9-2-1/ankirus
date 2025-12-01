"""首页路由处理"""

from aiohttp import web


async def handle_index(request: web.Request) -> web.FileResponse:
    """处理根路径"""
    return web.FileResponse("web/dist/index.html")
