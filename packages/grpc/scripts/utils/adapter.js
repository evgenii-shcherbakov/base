const { basename, join } = require('node:path');
const { mkdir, readdir, readFile, rm, stat, writeFile } = require('node:fs/promises');
const { getProtoFiles, isModelsDir, isProtoFile } = require('./functions');
const { execSync } = require('node:child_process');
const { PROTO_EXT_REG_EXP, PROTO_SRC_ROOT } = require('./constants');
const { pascalCase } = require('change-case-all');

class Adapter {
  indexContent = [];
  genContent = [];
  modelsContent = [];
  finalIndexContent = '';

  constructor(adapterRoot) {
    this.root = adapterRoot;
    this.generatedRoot = join(adapterRoot, 'generated');
    this.modelsRoot = join(adapterRoot, 'generated/models');
    this.index = join(adapterRoot, 'index.ts');
    this.generatedIndex = join(adapterRoot, 'generated/index.ts');
    this.modelsIndex = join(adapterRoot, 'generated/models/index.ts');
  }

  async clean() {
    await rm(this.generatedRoot, { recursive: true });
    await mkdir(this.generatedRoot, { recursive: true });
    await mkdir(this.modelsRoot, { recursive: true });
  }

  async generate(commandBuilder = (file, adapter) => []) {
    const models = new Set();
    const modules = new Set();

    for (const protoFile of await getProtoFiles()) {
      if (!isProtoFile(protoFile)) {
        continue;
      }

      const command = commandBuilder(protoFile, this).join(' ');

      execSync(command, { cwd: PROTO_SRC_ROOT, encoding: 'utf-8' });

      const fileName = basename(protoFile).replace(PROTO_EXT_REG_EXP, '');
      const importName = pascalCase(fileName);
      // const importString = `import * as ${importName} from './${fileName}';`;
      const importString = `export * from './${fileName}';`;

      if (isModelsDir(protoFile)) {
        models.add(importName);
        this.modelsContent.push(importString);
      } else {
        modules.add(importName);
        this.genContent.push(importString);
      }
    }

    // this.modelsContent.push('', `export { ${[...models.values()].join(', ')} };`, '');

    // this.genContent.push(
    //   `import * as models from './models';`,
    //   '',
    //   `export { ${['models', ...modules.values()].join(', ')} };`,
    //   '',
    // );

    this.genContent.push(`export * from './models';`);

    // const modulesImportString = [...modules.values()].join(', ');

    // this.indexContent.push(
    //   '// GENERATED EXPORTS',
    //   '',
    //   `import { models, ${modulesImportString} } from './generated';`,
    //   '',
    //   `export { models, ${modulesImportString} };`,
    //   '',
    // );

    this.indexContent.push('// GENERATED EXPORTS', '', `export * from './generated';`);

    const indexOldContent = await readFile(this.index, { encoding: 'utf-8' });

    this.finalIndexContent =
      indexOldContent.split('// GENERATED EXPORTS')[0] + this.indexContent.join('\n');
  }

  async write() {
    await Promise.all([
      writeFile(this.modelsIndex, this.modelsContent.join('\n'), { encoding: 'utf-8' }),
      writeFile(this.generatedIndex, this.genContent.join('\n'), { encoding: 'utf-8' }),
      writeFile(this.index, this.finalIndexContent, { encoding: 'utf-8' }),
    ]);
  }

  async removeOptionals() {
    const generatedFiles = await readdir(this.generatedRoot, { recursive: true });

    for (const genFile of generatedFiles) {
      const generatedFilePath = join(this.generatedRoot, genFile);
      const st = await stat(generatedFilePath);

      if (st.isDirectory()) {
        continue;
      }

      const fileContent = await readFile(generatedFilePath, { encoding: 'utf8' });

      const updatedContent = fileContent
        .replace(/export const protobufPackage = (['"])[\w\s]*(['"]);/g, '')
        .replace(/ \| undefined;/g, ';');

      await writeFile(generatedFilePath, updatedContent, { encoding: 'utf8' });
    }
  }
}

module.exports = { Adapter };
