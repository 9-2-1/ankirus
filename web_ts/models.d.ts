type RetentionParams = {
  basetime: number; // Unix Timestamp
  difficulty: number;
  stability: number;
  decay: number;
};

type CardStats = {
  total: number;
  paused: 0 | 1;
  weight: number;
  retention: number;
  stability: number;
};

type Card = {
  cid: number; // 对应后端的cid
  content: [string, string];
  retention_params: RetentionParams;
  paused: boolean;
  stats: CardStats;
};

type CardGroupStats = {
  total: number;
  paused: number;
  weight: number;
  retention_weight: number;
  stability_weight: number;
};

type CardGroup = {
  cards: Card[];
  groups: Record<string, CardGroup>;
  stats: CardGroupStats;
};
