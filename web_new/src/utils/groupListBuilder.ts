import { CardGroup, GroupListItem } from '../types/card';

/**
 * Convert CardGroup hierarchy to GroupListItem hierarchy with expand/collapse state
 */
export function buildGroupList(
  group: CardGroup,
  expandedGroups: Set<string> = new Set()
): GroupListItem {
  const groupPathKey = group.path.join('::');
  const isExpanded = expandedGroups.has(groupPathKey);

  const listItem: GroupListItem = {
    name: group.name,
    path: group.path,
    totalCards: group.totalCards,
    averageRetention: group.averageRetention,
    subgroups: [],
    isExpanded,
  };

  // Recursively build subgroups
  if (group.subgroups.size > 0) {
    for (const subgroup of group.subgroups.values()) {
      listItem.subgroups.push(buildGroupList(subgroup, expandedGroups));
    }
  }

  return listItem;
}

/**
 * Get a flattened list of all groups for filtering
 */
export function getAllGroups(group: CardGroup): CardGroup[] {
  const groups: CardGroup[] = [group];

  for (const subgroup of group.subgroups.values()) {
    groups.push(...getAllGroups(subgroup));
  }

  return groups;
}

/**
 * Find a group by its path
 */
export function findGroupByPath(group: CardGroup, path: string[]): CardGroup | null {
  if (path.length === 0) {
    return group;
  }

  let currentGroup = group;
  for (const segment of path) {
    if (!currentGroup.subgroups.has(segment)) {
      return null;
    }
    currentGroup = currentGroup.subgroups.get(segment)!;
  }

  return currentGroup;
}
