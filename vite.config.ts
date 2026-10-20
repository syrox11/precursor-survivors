import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works under the GitHub Pages sub-path
  base: './',
  // Phaser is a single ~1.2 MB chunk by design
  build: { chunkSizeWarningLimit: 1600 },
});
