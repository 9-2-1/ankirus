import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [svelte()],
  server: { proxy: { '/cards': { target: 'http://localhost:24032', changeOrigin: true } } },
});
