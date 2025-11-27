import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react({ babel: { plugins: ['babel-plugin-react-compiler'] } })],
  server: { proxy: { '/cards': { target: 'http://localhost:24032', changeOrigin: true } } },
});
