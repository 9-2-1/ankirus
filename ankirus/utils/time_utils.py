"""时间处理工具"""

import time
import calendar


def format_timestamp(timestamp: float) -> str:
    """格式化时间戳为HTTP日期格式"""
    return time.strftime("%a, %d %b %Y %H:%M:%S GMT", time.gmtime(int(timestamp)))


def parse_if_modified_since(header_value: str) -> float:
    """解析If-Modified-Since头为时间戳"""
    try:
        return calendar.timegm(time.strptime(header_value, "%a, %d %b %Y %H:%M:%S GMT"))
    except ValueError:
        return 0.0
