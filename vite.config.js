import { defineConfig } from 'vite'
import path from 'node:path'
import dts from 'vite-plugin-dts'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode, command }) => {
  const isBuild = command === 'build';

  if (mode === 'site') {
    return {
      // The website (landing, docs, demos): served in dev, built for GitHub Pages
      root: 'site',
      base: isBuild ? '/flyby-motion/' : '/',
      build: {
        outDir: '../dist-site',
        emptyOutDir: true,
      },
      plugins: [react(), dts({
        // The library's own tsconfig: the root one includes the site, which moves the emitted root.
        // Absolute: in this mode `root` is `site`, so a relative path would resolve inside it.
        tsconfigPath: path.resolve(__dirname, 'tsconfig.lib.json'),
        entryRoot: path.resolve(__dirname, 'src'),
        outDir: path.resolve(__dirname, 'dist'),
        include: ['src/**/*'],
        exclude: ['**/*.test.ts', '**/*.spec.ts'],
        insertTypesEntry: true,
      })],
    }
  }

  return {
    plugins: [react(), dts({
      // The library's own tsconfig: the root one includes the site, which moves the emitted root.
      tsconfigPath: './tsconfig.lib.json',
      entryRoot: 'src',
      outDir: 'dist',
      include: ['src/**/*'],
      exclude: ['**/*.test.ts', '**/*.spec.ts'],
      insertTypesEntry: true,
    })],
    test: {
      environment: 'node',
      // CSS imports are empty strings in tests unless included; the theme test reads colors.css.
      css: { include: [/site\/styles\/colors\.css/] },
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
