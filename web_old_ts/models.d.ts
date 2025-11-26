type Card = {
  group: Array<string>;

  front: string;
  back: string;

  // memory model
  time: number; // Unix Timestamp
  difficulty: number;
  stability: number;
  decay: number;

  // other
  paused: boolean;

  // stat
  st_weight: number;
  st_value: number;
};

type ReplyGroup = { group: Array<string> };

type ReplyCard = {
  cid: number;
  time: number;
  difficulty: number;
  stability: number;
  decay: number;
  front: string;
  back: string;
  paused: NotRequired<true>;
};

type CardGroup = {
  cards: Card[];
  groups: Map<string, CardGroup>;

  // stat
  st_weight: number;
  st_value_weight: number;
};
