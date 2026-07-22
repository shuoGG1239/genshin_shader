import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    open: true,
  },
  assetsInclude: ['**/*.pmx', '**/*.pmd', '**/*.vmd', '**/*.bmp', '**/*.fbx', '**/*.dae'],
});
