"""首页路由处理"""

from aiohttp import web


async def handle_index(request: web.Request) -> web.FileResponse:
    """处理根路径"""
    return web.FileResponse("web_new/dist/index.html")


async def handle_old_index(request: web.Request) -> web.FileResponse:
    """处理旧版web路径"""
    return web.FileResponse("web_old/index.html")
