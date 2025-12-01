<script lang="ts">
  /* eslint-disable svelte/no-at-html-tags */

  import DOMPurify from 'dompurify';
  import { mathJaxStore } from '../stores/mathJax';

  let { content }: { content: string } = $props();

  let containerRef: HTMLDivElement;
  let mathJaxReady = $state(false);
  let sanitizedContent = $state('');

  $effect(() => {
    const unsubscribe = mathJaxStore.subscribe(state => {
      mathJaxReady = state.isReady;
    });
    return unsubscribe;
  });

  $effect(() => {
    if (content) {
      sanitizedContent = DOMPurify.sanitize(content);
    }
  });

  $effect(() => {
    if (containerRef && mathJaxReady) {
      mathJaxStore.renderMathJax(containerRef);
    }
  });

  // 当内容更新时也重新渲染MathJax
  $effect(() => {
    if (containerRef && mathJaxReady && sanitizedContent) {
      // 等待DOM更新后再渲染MathJax
      queueMicrotask(() => {
        mathJaxStore.renderMathJax(containerRef);
      });
    }
  });
</script>

<div class="card-content" bind:this={containerRef}>
  {@html sanitizedContent}
</div>

<style>
  .card-content {
    line-height: 1.6;
    color: #333;
  }
</style>
