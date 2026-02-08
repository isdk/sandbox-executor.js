import { defineConfig } from 'tsup'
import fs from 'node:fs'
import path from 'node:path'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  // Inject cjs and esm shims:https://tsup.egoist.dev/#inject-cjs-and-esm-shims
  shims: true,
  // splitting: true,
  // sourcemap: true,
  // clean: true,
  minify: 'terser',
  terserOptions: {
    // compress: {
    //   drop_console: true,
    //   drop_debugger: true,
    // },
    // https://terser.org/docs/options/#mangle-options
    "mangle": {
      "properties": {
        "regex": /^_[$]/,
        // "undeclared": true, // Mangle those names when they are accessed as properties of known top level variables but their declarations are never found in input code.
      },
      "toplevel": true,
      "reserved": [
        // # expected names in web-extension content
        "WeakSet", "Set",
        // # expected names in 3rd-party extensions' contents
        "requestIdleCallback",
        // # content global names:
        "browser",
      ],
    }
  },
  onSuccess: async () => {
    const copyDir = (src: string, dest: string) => {
      if (!fs.existsSync(src)) return
      fs.mkdirSync(dest, { recursive: true })
      const entries = fs.readdirSync(src, { withFileTypes: true })
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name)
        const destPath = path.join(dest, entry.name)
        if (entry.isDirectory()) {
          copyDir(srcPath, destPath)
        } else {
          fs.copyFileSync(srcPath, destPath)
        }
      }
    }

    // Copy generators templates to dist/templates
    copyDir('src/generators/templates', 'dist/templates')

    console.log('Templates copied to dist/templates')
  },
})
