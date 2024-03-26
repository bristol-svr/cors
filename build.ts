/// <reference types='bun-types' />
import { existsSync, rmSync } from 'fs';
import dts from 'bun-plugin-dts'
import pkg from './package.json';

const root = import.meta.dir;

const distDir = root + '/dist';
if (existsSync(distDir))
  rmSync(distDir, { recursive: true });

await Bun.build({
  target: 'bun',
  // minify: true,
  outdir: './dist',
  plugins: [dts()],
  format: 'esm', // there is currently no cjs
  entrypoints: ['./lib/index.ts'],
  // external: Object.keys(pkg.dependencies)
});