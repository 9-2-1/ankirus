<script lang="ts">
  import { rgbToCss, getTextColor } from '../utils/color';
  import type { GroupListItem } from '../types/card';
  import GroupList from './GroupList.svelte';

  let {
    group,
    selectedGroupPath,
    onGroupSelect,
    onGroupToggle,
    level = 0,
  }: {
    group: GroupListItem;
    selectedGroupPath: string[] | null;
    onGroupSelect: (groupPath: string[]) => void;
    onGroupToggle: (groupPath: string[]) => void;
    level?: number;
  } = $props();

  const isSelected = $derived(
    selectedGroupPath && selectedGroupPath.join('::') === group.path.join('::')
  );
  const hasSubgroups = $derived(group.subgroups.length > 0);

  function handleGroupClick(): void {
    if (hasSubgroups) {
      onGroupToggle(group.path);
    }
  }

  function handleGroupDoubleClick(): void {
    onGroupSelect(group.path);
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (hasSubgroups) {
        onGroupToggle(group.path);
      }
    }
  }
</script>

<div class="group-item">
  <div
    class="group-row {isSelected ? 'selected' : ''}"
    style="padding-left: {level * 16 + 8}px"
    onclick={handleGroupClick}
    ondblclick={handleGroupDoubleClick}
    onkeydown={handleKeyDown}
    tabindex="0"
    role="button"
    aria-label="{group.name} group with {group.totalCards} cards"
    aria-expanded={hasSubgroups ? group.isExpanded : undefined}
  >
    <div class="group-expand">
      {#if hasSubgroups}
        <span class="expand-icon {group.isExpanded ? 'expanded' : 'collapsed'}"></span>
      {/if}
    </div>
    <div class="group-name">{group.name}</div>
    <div class="group-count">{group.totalCards}</div>
    <div
      class="group-retention"
      style="color: {group.totalCards > 0
        ? rgbToCss(getTextColor(group.averageRetention))
        : '#666'}; font-weight: {group.totalCards > 0 ? 'bold' : 'normal'}"
    >
      {group.totalCards > 0 ? `${(group.averageRetention * 100).toFixed(2)}%` : '-'}
    </div>
  </div>

  {#if group.isExpanded && hasSubgroups}
    <div class="group-subgroups">
      {#each group.subgroups as subgroup (subgroup.path.join('::'))}
        <GroupList
          group={subgroup}
          {selectedGroupPath}
          {onGroupSelect}
          {onGroupToggle}
          level={level + 1}
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  .group-item {
    border-bottom: 1px solid #f0f0f0;
  }

  .group-row {
    display: grid;
    grid-template-columns: 20px 1fr auto auto;
    gap: 12px;
    padding: 8px 12px;
    cursor: pointer;
    transition: background-color 0.2s;
    align-items: center;
  }

  .group-row:hover {
    background-color: #f8f9fa;
  }

  .group-row.selected {
    background-color: #e3f2fd;
    border-left: 3px solid #1976d2;
  }

  .group-expand {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .expand-icon {
    width: 12px;
    height: 12px;
    position: relative;
    transition: transform 0.2s ease;
  }

  .expand-icon.expanded {
    transform: rotate(90deg);
  }

  .expand-icon::before {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 0;
    height: 0;
    border-top: 4px solid transparent;
    border-bottom: 4px solid transparent;
    border-left: 6px solid #666;
  }

  .group-name {
    font-weight: 500;
    color: #333;
  }

  .group-count,
  .group-retention {
    font-size: 14px;
    color: #666;
    text-align: right;
  }

  .group-subgroups {
    border-left: 1px solid #e0e0e0;
    margin-left: 8px;
  }
</style>
