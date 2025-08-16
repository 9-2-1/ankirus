from anki.collection import Collection, QUEUE_TYPE_SUSPENDED
from dataclasses import dataclass, field
from typing import Literal
import time
import logging

log = logging.getLogger(__name__)


@dataclass
class RetentionParams:
    basetime: int  # Unix Timestamp
    difficulty: float
    stability: float
    decay: float

    def retention(self, time: float) -> float:
        if self.stability == 0.0:
            return 0.0
        days_elapsed = (time - self.basetime) / 86400.0
        factor = 0.9 ** (1.0 / -self.decay) - 1.0
        reta = (days_elapsed / self.stability * factor + 1.0) ** -self.decay
        if isinstance(reta, float):
            return reta
        raise ValueError("retrievability is not a float")


@dataclass
class CardStats:
    total: int = 1
    paused: Literal[0, 1] = 0
    weight: float = 1
    retention: float = 0.0
    stability: float = 0.0


@dataclass
class Card:
    cid: int
    content: tuple[str, str]
    retention_params: RetentionParams
    paused: bool = False
    stats: CardStats = field(default_factory=CardStats)


def stat_from_card(card: Card, timestamp: float) -> CardStats:
    stats = CardStats()
    if card.paused:
        stats.paused = 1
    stats.weight = card.retention_params.difficulty
    stats.stability = card.retention_params.stability
    stats.retention = card.retention_params.retention(timestamp)
    return stats


@dataclass
class CardGroupStats:
    total: int = 0
    paused: int = 0
    weight: float = 0.0
    retention_weight: float = 0.0
    stability_weight: float = 0.0

    @property
    def retention(self) -> float:
        if self.weight == 0:
            return 0.0
        return self.retention_weight / self.weight

    @property
    def stability(self) -> float:
        if self.weight == 0:
            return 0.0
        return self.stability_weight / self.weight

    def append(self, cardstat: CardStats) -> None:
        self.total += cardstat.total
        self.paused += cardstat.paused
        self.weight += cardstat.weight
        self.retention_weight += cardstat.retention * cardstat.weight
        self.stability_weight += cardstat.stability * cardstat.weight


class GroupNotFound(Exception):
    pass


@dataclass
class CardGroups:
    cards: list[Card] = field(default_factory=list)
    groups: dict[str, "CardGroups"] = field(default_factory=dict)
    stats: CardGroupStats = field(default_factory=CardGroupStats)

    def subgroup_append(self, card: Card, *path: str) -> None:
        self.stats.append(card.stats)
        group = self
        for name in path:
            if name not in group.groups:
                group.groups[name] = CardGroups()
            group = group.groups[name]
            group.stats.append(card.stats)
        group.cards.append(card)

    def subgroup(self, *path: str) -> "CardGroups":
        group = self
        for name in path:
            if name not in group.groups:
                raise GroupNotFound(f"group {'::'.join(path)} not found")
            group = group.groups[name]
        return group


@dataclass
class DisplayGroups:
    cards: list[CardStats] = field(default_factory=list)
    groups: dict[str, "DisplayGroups"] = field(default_factory=dict)
    # items omitted because of too small
    stats: CardGroupStats = field(default_factory=CardGroupStats)


def load_anki_data(collection: Collection) -> CardGroups:
    card_groups = CardGroups()
    for cid in collection.find_cards(""):
        card = collection.get_card(cid)
        cstats = collection.card_stats_data(cid)
        D = 5.5
        S = 0.0
        DECAY = 0.1542
        if card.memory_state is not None:
            D = card.memory_state.difficulty
            S = card.memory_state.stability
        if card.decay is not None:
            DECAY = card.decay

        retention_params = RetentionParams(
            basetime=cstats.latest_review,
            difficulty=D,
            stability=S,
            decay=DECAY,
        )
        carddata = Card(
            cid=cid,
            content=(card.note().fields[0], card.note().fields[1]),
            retention_params=retention_params,
            paused=card.queue == QUEUE_TYPE_SUSPENDED,
        )
        carddata.stats = stat_from_card(carddata, time.time())
        deckid = card.current_deck_id()
        deckname = collection.decks.name(deckid)
        deckpath = deckname.split("::")
        card_groups.subgroup_append(carddata, *deckpath)
    return card_groups
