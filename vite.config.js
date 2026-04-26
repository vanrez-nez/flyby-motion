import { defineConfig } from 'vite'
import path from 'node:path'

export default defineConfig(({ mode }) => {
  if (mode === 'demos') {
    return {
      // Dev server config only: serves the demos
      root: '.',
      build: {
        outDir: 'dist-demos',
      },
    }
  }

  return {
    build: {
      lib: {
        entry: path.resolve(__dirname, 'src/index.js'),
        name: 'FlybyMotion',
        fileName: (format) => `flyby-motion.${format}.js`,
      },
      rollupOptions: {
        // Externalize deps that shouldn't be bundled
        external: [],
        output: {
          globals: {},
        },
      },
    },
  }
})
