import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: { index: 'src/index.ts' },
  outDir: 'lib',
  format: 'esm',
  fixedExtension: false,
  clean: false,
  dts: false,
  sourcemap: true,
  hash: false,
})
