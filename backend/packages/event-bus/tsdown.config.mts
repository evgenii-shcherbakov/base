import { defineConfig } from 'tsdown';
import rootPkg from '../../../package.json' with { type: 'json' };
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  // Named entries, not an array: an array preserves each entry's source directory
  // (`dist/src/index.cjs`, `dist/compiler/index.cjs`) and would move the runtime entry
  // out from under `main`. The keys are the file names the `exports` map points at.
  //
  // The compiler entry is the build-time API the adapter packages compile against; runtime
  // consumers only ever reach `.`, so ts-morph/pug never enter their graph.
  entry: { index: 'src/index.ts', compiler: 'compiler/index.ts' },
  format: ['cjs'],
  dts: true,
  deps: {
    // This package's own deps join the root ones because the compiler entry pulls in
    // ts-morph and pug, which are declared here and nowhere else — without them listed,
    // tsdown inlines both and `dist/compiler.cjs` grows to ~13 MB. The adapter packages
    // carry the same devDependencies, so the externals resolve on their side.
    neverBundle: Object.keys({
      ...rootPkg.dependencies,
      ...rootPkg.devDependencies,
      ...pkg.dependencies,
      ...pkg.devDependencies,
    }),
  },
});
