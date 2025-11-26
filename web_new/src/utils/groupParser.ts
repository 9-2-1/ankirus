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
    subgroups: [],
    totalCards: 0,
    averageRetention: 0,
  };

  for (const card of cards) {
    let currentGroup = rootGroup;

    // Navigate through group hierarchy
    for (let i = 0; i < card.groupPath.length; i++) {
      const groupName = card.groupPath[i];
      const groupPath = card.groupPath.slice(0, i + 1);

      if (groupName) {
        // Find or create subgroup
        let subgroup = currentGroup.subgroups.find(g => g.name === groupName);
        if (!subgroup) {
          subgroup = {
            name: groupName,
            path: groupPath,
            cards: [],
            subgroups: [],
            totalCards: 0,
            averageRetention: 0,
          };
          currentGroup.subgroups.push(subgroup);
        }
        currentGroup = subgroup;
      }
    }

    // Add card to the final group
    currentGroup.cards.push(card);
  }

  // Calculate statistics for all groups
  calculateGroupStatistics(rootGroup);

  // Sort subgroups by name for consistent ordering
  sortGroupHierarchy(rootGroup);

  return rootGroup;
}

/**
 * Recursively calculate statistics for groups
 */
function calculateGroupStatistics(group: CardGroup): void {
  let totalRetention = 0;
  let totalCards = 0;

  // Calculate from direct cards
  for (const card of group.cards) {
    totalRetention += card.retentionRate;
    totalCards += 1;
  }

  // Process subgroups
  for (const subgroup of group.subgroups) {
    calculateGroupStatistics(subgroup);

    // Add subgroup's weighted retention
    if (subgroup.totalCards > 0) {
      totalRetention += subgroup.averageRetention * subgroup.totalCards;
      totalCards += subgroup.totalCards;
    }
  }

  group.totalCards = totalCards;
  group.averageRetention = totalCards > 0 ? totalRetention / totalCards : 0;
}

/**
 * Recursively sort group hierarchy by name for consistent ordering
 */
function sortGroupHierarchy(group: CardGroup): void {
  // Sort subgroups alphabetically by name
  group.subgroups.sort((a, b) => a.name.localeCompare(b.name));

  // Recursively sort all subgroups
  for (const subgroup of group.subgroups) {
    sortGroupHierarchy(subgroup);
  }
}
