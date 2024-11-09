import { PlopTypes } from '@turbo/gen';
import { writeFileSync } from 'fs';
import { SourceFile } from 'ts-morph';
import { COMMON_TEMPLATES_ROOT, TEMPLATES_ROOT } from './constants';
import { join } from 'path';

export abstract class GrpcAdapter {
  public readonly targetRoot: string;
  protected readonly adapterTemplatesRoot: string;

  protected constructor(
    protected readonly name: string,
    protected readonly root: string,
  ) {
    this.targetRoot = join(root, 'src');
    this.adapterTemplatesRoot = join(TEMPLATES_ROOT, this.name);
  }

  abstract onFile(relativePath: string, importName: string, hasPrefix: boolean): void;

  onFolder(
    relativePath: string,
    importName: string,
    folderTree: Map<string, any>,
    hasPrefix: boolean,
  ): void {
    const exports = Array.from(folderTree.keys())
      .map((item) => `export * from './${item}';\n`)
      .join('');

    writeFileSync(join(this.targetRoot, relativePath, 'index.ts'), exports, { encoding: 'utf-8' });
  }

  getActions(): PlopTypes.ActionType[] {
    return [
      {
        type: 'addMany',
        destination: this.root,
        base: COMMON_TEMPLATES_ROOT,
        templateFiles: [COMMON_TEMPLATES_ROOT, join(COMMON_TEMPLATES_ROOT, '**/.*')],
        force: true,
      },
      {
        type: 'addMany',
        destination: this.root,
        base: this.adapterTemplatesRoot,
        templateFiles: [this.adapterTemplatesRoot, join(this.adapterTemplatesRoot, '**/.*')],
        force: true,
      },
    ];
  }

  async onSourceFile(sourceFile: SourceFile): Promise<void> {
    return Promise.resolve();
  }
}
