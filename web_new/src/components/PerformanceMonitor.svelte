<script lang="ts">
  import { onMount } from 'svelte';

  let { cardCount, isVisible }: { cardCount: number; isVisible: boolean } = $props();

  let frameCount = $state(0);
  let fps = $state(0);
  let lastTime = $state(0);
  let animationFrameId: number;

  onMount(() => {
    const measureFPS = (currentTime: number) => {
      frameCount++;

      if (currentTime - lastTime >= 1000) {
        fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        frameCount = 0;
        lastTime = currentTime;
      }

      animationFrameId = requestAnimationFrame(measureFPS);
    };

    lastTime = performance.now();
    animationFrameId = requestAnimationFrame(measureFPS);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  });
</script>

{#if isVisible}
  <div class="performance-monitor">
    <div class="performance-stats">
      <div>Cards: {cardCount}</div>
      <div>FPS: {fps}</div>
      <div>
        Memory: {Math.round(
          (performance as unknown as { memory: { usedJSHeapSize: number } }).memory
            ?.usedJSHeapSize / 1048576
        ) || 'N/A'} MB
      </div>
    </div>
  </div>
{/if}

<style>
  /* Performance Monitor */
  .performance-monitor {
    position: fixed;
    bottom: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 10px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 12px;
    z-index: 1000;
  }

  .performance-stats > div {
    margin: 2px 0;
  }
</style>
