<script lang="ts">
  /* eslint-disable svelte/no-at-html-tags */

  import DOMPurify from 'dompurify';
  import { mathJaxReady, renderMathJax } from '../utils/mathJax.svelte';

  let { content }: { content: string } = $props();

  let containerRef: HTMLDivElement;
  let sanitizedContent = $state('');

  $effect(() => {
    if (mathJaxReady.value) {
      sanitizedContent = DOMPurify.sanitize(content);
      renderMathJax(containerRef!);
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
