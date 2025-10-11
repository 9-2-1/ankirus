from dataclasses import dataclass
from typing import Optional, Callable, Awaitable
import logging

from anki.collection import Collection, QUEUE_TYPE_SUSPENDED

log = logging.getLogger(__name__)


@dataclass
class Card:
    cid: int
    group: str

    front: str
    back: str

    # memory model
    time: int  # Unix Timestamp
    difficulty: float
    stability: float
    decay: float

    # other
    paused: bool
    due: int  # Unix Timestamp


async def load_anki_data(
    col: Collection, sanitize: Optional[Callable[[str], Awaitable[str]]] = None
) -> list[Card]:

    cards: list[Card] = []

    for cid in col.find_cards(""):
        card = col.get_card(cid)
        deckid = card.current_deck_id()

        group = col.decks.name(deckid)
        cstats = col.card_stats_data(cid)

        front = card.note().fields[0] if len(card.note().fields) > 0 else ""
        back = card.note().fields[1] if len(card.note().fields) > 1 else ""

        if sanitize is not None:
            front = await sanitize(front)
            back = await sanitize(back)

        # RESCHEDULED: RevlogEntry._ReviewKind.ValueType  # 5
        RESCHEDULED = 5
        time = 0
        for revlog in cstats.revlog:  # Already reversed
            if revlog.review_kind != RESCHEDULED:
                time = revlog.time
                break

        difficulty = 5.5  # Default difficulty (1+10)/2
        stability = 0.0  # No memory
        decay = 0.1542  # FSRS 6 default decay
        if card.memory_state is not None:
            difficulty = card.memory_state.difficulty
            stability = card.memory_state.stability
        if card.decay is not None:
            decay = card.decay

        paused = card.queue == QUEUE_TYPE_SUSPENDED

        due = card.due

        cards.append(
            Card(
                cid=cid,
                group=group,
                front=front,
                back=back,
                time=time,
                difficulty=difficulty,
                stability=stability,
                decay=decay,
                paused=paused,
                due=due,
            )
        )

    return cards
