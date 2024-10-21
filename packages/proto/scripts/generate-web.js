const { readdir, readFile, writeFile, stat, mkdir, re } = require('node:fs/promises');
const { join } = require('node:path');
const { execSync } = require('node:child_process');

const PROTOC_PATH = process.env.PROTOC_PATH ?? 'protoc';

(async () => {
  const libraryRoot = join(__dirname, '..');
  const protoRoot = join(libraryRoot, 'modules');
  const repositoryRoot = join(libraryRoot, '../..');
  const destPath = join(libraryRoot, 'web');
  const pluginPath = join(repositoryRoot, 'node_modules/.bin/protoc-gen-ts_proto');

  await mkdir(destPath, { recursive: true });
  const protoFiles = await readdir(protoRoot, { recursive: true });

  protoFiles.forEach((protoFile) => {
    if (/.proto$/g.test(protoFile)) {
      execSync(
        [
          PROTOC_PATH,
          `--plugin=${pluginPath}`,
          `--ts_proto_out=${destPath}`,
          // '--ts_proto_opt=nestJs=true',
          '--ts_proto_opt=useDate=true',
          // '--ts_proto_opt=useOptionals=none',
          // '--ts_proto_opt=useMongoObjectId=true',
          '--ts_proto_opt=snakeToCamel=false',
          // '--ts_proto_opt=outputClientImpl=grpc-web',
          '--ts_proto_opt=outputServices=grpc-js',
          `./${protoFile}`,
        ].join(' '),
        { cwd: protoRoot, encoding: 'utf8' },
      );
    }
  });

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
