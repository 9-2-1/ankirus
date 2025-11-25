import { ApiResponseItem, CardData, CardGroup, ReplyCard } from '../types/card';

/**
 * Calculate retention rate based on FSRS decay value
 * Uses current time as fixed reference point
 */
export function calculateRetentionRate(card: ReplyCard): number {
  // FSRS retention rate formula: retention = e^(-decay)
  const S = card.stability;
  const T = card.time;
  const DECAY = card.decay;
  if (S === 0) {
    return 0;
  }
  const factor = Math.pow(0.9, 1.0 / -DECAY) - 1.0;
  const days_elapsed = (Date.now() / 1000 - T) / 86400.0;
  const reta = Math.pow((days_elapsed / S) * factor + 1.0, -DECAY);
  if (typeof reta === 'number') {
    return reta;
  }
  throw new Error('retrievability is not a float');
}

/**
 * Parse API response and convert to structured card data
 */
export function parseApiResponse(response: ApiResponseItem[]): CardData[] {
  const cards: CardData[] = [];
  let currentGroup: string[] = [];

  for (const item of response) {
    if ('group' in item) {
      // This is a group marker
      currentGroup = item.group;
    } else if ('front' in item) {
      // This is a card
      const card: CardData = {
        ...item,
        groupPath: currentGroup,
        retentionRate: calculateRetentionRate(item),
        uniqueId: `${currentGroup.join('::')}::card-${cards.length}`,
      };
      cards.push(card);
    }
  }

  return cards;
}

/**
 * Build hierarchical group structure from flat card data
 */
export function buildGroupHierarchy(cards: CardData[]): CardGroup {
  const rootGroup: CardGroup = {
    name: 'root',
    path: [],
    cards: [],
    subgroups: new Map(),
    totalCards: 0,
    averageRetention: 0,
  };

  for (const card of cards) {
    let currentGroup = rootGroup;

    // Navigate through group hierarchy
    for (let i = 0; i < card.groupPath.length; i++) {
      const groupName = card.groupPath[i];
      const groupPath = card.groupPath.slice(0, i + 1);

      if (groupName && !currentGroup.subgroups.has(groupName)) {
        currentGroup.subgroups.set(groupName, {
          name: groupName,
          path: groupPath,
          cards: [],
          subgroups: new Map(),
          totalCards: 0,
          averageRetention: 0,
        });
      }

      if (groupName) {
        currentGroup = currentGroup.subgroups.get(groupName)!;
      }
    }

    // Add card to the final group
    currentGroup.cards.push(card);
  }

  // Calculate statistics for all groups
  calculateGroupStatistics(rootGroup);

  return rootGroup;
}

/**
 * Recursively calculate statistics for groups
 */
function calculateGroupStatistics(group: CardGroup): void {
  group.totalCards = group.cards.length;

  // Calculate average retention for this group's direct cards
  if (group.cards.length > 0) {
    const totalRetention = group.cards.reduce((sum, card) => sum + card.retentionRate, 0);
    group.averageRetention = totalRetention / group.cards.length;
  } else {
    group.averageRetention = 0;
  }

  // Process subgroups
  for (const subgroup of group.subgroups.values()) {
    calculateGroupStatistics(subgroup);

    // Update parent statistics with subgroup data
    group.totalCards += subgroup.totalCards;

    if (subgroup.totalCards > 0) {
      const weightedRetention = subgroup.averageRetention * subgroup.totalCards;
      const currentWeightedRetention = group.averageRetention * group.cards.length;
      const totalWeight = group.cards.length + subgroup.totalCards;

      if (totalWeight > 0) {
        group.averageRetention = (currentWeightedRetention + weightedRetention) / totalWeight;
      }
    }
  }
}
