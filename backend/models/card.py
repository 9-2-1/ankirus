"""卡片数据模型"""

from dataclasses import dataclass
from typing import Literal, NotRequired, TypedDict


@dataclass
class Card:
    """卡片数据类"""

    cid: int
    group: str
    front: str
    back: str
    time: int  # Unix Timestamp
    difficulty: float
    stability: float
    decay: float
    paused: bool
    due: int  # Unix Timestamp


class ReplyGroup(TypedDict):
    """API响应分组格式"""

    group: list[str]


class ReplyCard(TypedDict):
    """API响应卡片格式"""

    time: int
    difficulty: float
    stability: float
    decay: float
    front: str
    back: str
    paused: NotRequired[Literal[True]]
