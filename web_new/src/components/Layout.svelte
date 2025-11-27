<script lang="ts">
  import type { Snippet } from 'svelte';
  let {
    isWideScreen,
    treemap,
    preview,
  }: { isWideScreen: boolean; treemap: Snippet; preview: Snippet } = $props();
</script>

<div class="layout {isWideScreen ? 'layout-wide' : 'layout-narrow'}">
  <div class="treemap-section">
    {@render treemap()}
  </div>
  <div class="preview-section">
    {@render preview()}
  </div>
</div>

<style>
  /* Responsive layout styles */
  .layout {
    height: 100vh;
    display: flex;
    justify-content: stretch;
    align-items: stretch;
    background-color: #f5f5f5;
  }

  /* Wide screen layout (horizontal split) */
  .layout-wide {
    flex-direction: row;
  }

  .layout-wide .treemap-section {
    flex: 7 7 0;
    border-right: 1px solid #ddd;
    overflow: hidden; /* Prevent sections from expanding */
    min-width: 0;
  }

  .layout-wide .preview-section {
    flex: 3 3 0;
    overflow: hidden; /* Prevent sections from expanding */
    min-width: 0;
  }

  /* Narrow screen layout (vertical stack) */
  .layout-narrow {
    flex-direction: column;
  }

  .layout-narrow .treemap-section {
    flex: 6 6 0;
    border-bottom: 1px solid #ddd;
    min-height: 0; /* Allow flex item to shrink */
  }

  .layout-narrow .preview-section {
    flex: 4 4 0;
    min-height: 0; /* Allow flex item to shrink */
  }
</style>
