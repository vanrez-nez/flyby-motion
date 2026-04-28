import { defineConfig } from 'vite'
import path from 'node:path'
import dts from 'vite-plugin-dts'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  if (mode === 'demos') {
    return {
      // Dev server config only: serves the demos
      root: 'demos',
      build: {
        outDir: 'dist-demos',
      },
      plugins: [react(), dts({
        entryRoot: 'src',
        outDir: 'dist',
        include: ['src/**/*'],
        exclude: ['**/*.test.ts', '**/*.spec.ts'],
        insertTypesEntry: true,
      })],
    }
  }

  return {
    plugins: [react(), dts({
      entryRoot: 'src',
      outDir: 'dist',
      include: ['src/**/*'],
      exclude: ['**/*.test.ts', '**/*.spec.ts'],
      insertTypesEntry: true,
    })],
    test: {
      environment: 'node',
    },
    build: {
      lib: {
        entry: path.resolve(__dirname, 'src/index.ts'),
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
