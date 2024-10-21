const { readdir, readFile, writeFile, stat, mkdir, appendFile } = require('node:fs/promises');
const { join, basename } = require('node:path');
const { execSync } = require('node:child_process');
const { pascalCase, camelCase } = require('change-case-all');

const PROTOC_PATH = process.env.PROTOC_PATH ?? 'protoc';

(async () => {
  const libraryRoot = join(__dirname, '..');
  const protoRoot = join(libraryRoot, 'modules');
  const repositoryRoot = join(libraryRoot, '../..');
  const destPath = join(repositoryRoot, 'backend/packages/grpc/src/generated');
  const destIndexFilePath = join(destPath, 'index.ts');
  const destModelsIndexFilePath = join(destPath, 'models/index.ts');
  const pluginPath = join(repositoryRoot, 'node_modules/.bin/protoc-gen-ts_proto');
  const protoExtRegExp = /.proto$/g;
  const modelsDirRegExp = /^models\//g;

  await mkdir(destPath, { recursive: true });
  const protoFiles = await readdir(protoRoot, { recursive: true });
  await writeFile(destIndexFilePath, '', { encoding: 'utf-8' });
  await writeFile(destModelsIndexFilePath, '', { encoding: 'utf-8' });

  const models = new Set();
  const modules = new Set();

  for (const protoFile of protoFiles) {
    if (!protoExtRegExp.test(protoFile)) {
      continue;
    }

    execSync(
      [
        PROTOC_PATH,
        `--plugin=${pluginPath}`,
        `--ts_proto_out=${destPath}`,
        '--ts_proto_opt=nestJs=true',
        '--ts_proto_opt=useDate=true',
        '--ts_proto_opt=snakeToCamel=false',
        `./${protoFile}`,
      ].join(' '),
      { cwd: protoRoot, encoding: 'utf8' },
    );

    const importPath = join('generated', protoFile.replace(protoExtRegExp, ''));
    const isModel = modelsDirRegExp.test(protoFile);
    const fileName = basename(protoFile).replace(protoExtRegExp, '');
    const importName = (isModel ? camelCase : pascalCase)(fileName);
    const importString = `import * as ${importName} from '${importPath}';\n`;
    const targetFile = isModel ? destModelsIndexFilePath : destIndexFilePath;

    (isModel ? models : modules).add(importName);

    await appendFile(targetFile, importString, { encoding: 'utf-8' });
  }

  const exportModelsContent = [...models.values()].join(', ');

  await appendFile(destModelsIndexFilePath, `\nexport { ${exportModelsContent} };\n`, {
    encoding: 'utf-8',
  });

  const exportModulesContent = ['models', ...modules.values()].join(', ');

  await appendFile(
    destIndexFilePath,
    `import * as models from 'generated/models';\n\nexport { ${exportModulesContent} };\n`,
    { encoding: 'utf-8' },
  );

  const generatedFiles = await readdir(destPath, { recursive: true });

  for (const genFile of generatedFiles) {
    const generatedFilePath = join(destPath, genFile);
    const st = await stat(generatedFilePath);

    if (st.isDirectory()) {
      continue;
    }

    const generatedFile = await readFile(generatedFilePath, { encoding: 'utf8' });

    await writeFile(generatedFilePath, generatedFile.replace(/ \| undefined;/g, ';'), {
      encoding: 'utf8',
    });
  }
})();
