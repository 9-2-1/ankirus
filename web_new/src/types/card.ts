// Card data types based on existing API structure

export interface ReplyCard {
  cid: number;
  time: number;
  difficulty: number;
  stability: number;
  decay: number;
  front: string;
  back: string;
  paused?: true;
}

export interface ReplyGroup {
  group: string[];
}

export type ApiResponseItem = ReplyGroup | ReplyCard;

export interface CardData extends Omit<ReplyCard, 'cid'> {
  groupPath: string[];
  retentionRate: number;
  uniqueId: string;
}

export interface CardGroup {
  name: string;
  path: string[];
  cards: CardData[];
  subgroups: Map<string, CardGroup>;
  totalCards: number;
  averageRetention: number;
}

// Group list item for the hierarchical group display
export interface GroupListItem {
  name: string;
  path: string[];
  totalCards: number;
  averageRetention: number;
  subgroups: GroupListItem[];
  isExpanded: boolean;
}
