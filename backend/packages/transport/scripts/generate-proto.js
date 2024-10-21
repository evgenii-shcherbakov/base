const { readdir, readFile, writeFile, stat } = require('node:fs/promises');
const { resolve, join } = require('node:path');
const { execSync } = require('node:child_process');

const PROTOC_PATH = process.env.PROTOC_PATH ?? 'protoc';

(async () => {
  const libraryRoot = resolve(__dirname, '..');
  const protoDir = resolve(libraryRoot, 'src/proto');
  const files = await readdir(protoDir, { recursive: true });

  files.forEach((file) => {
    if (/.proto$/g.test(file)) {
      execSync(
        [
          PROTOC_PATH,
          `--plugin=${join(libraryRoot, '../../../node_modules/.bin/protoc-gen-ts_proto')}`,
          `--ts_proto_out=../generated`,
          '--ts_proto_opt=nestJs=true',
          '--ts_proto_opt=useDate=true',
          // '--ts_proto_opt=useOptionals=none',
          // '--ts_proto_opt=useMongoObjectId=true',
          '--ts_proto_opt=snakeToCamel=false',
          `./${file}`,
        ].join(' '),
        { cwd: protoDir, encoding: 'utf8' },
      );
    }
  });

  const generatedDir = resolve(libraryRoot, 'src/generated');
  const generatedFiles = await readdir(generatedDir, { recursive: true });

  for (const file of generatedFiles) {
    const dest = join(generatedDir, file);
    const st = await stat(dest);

    if (st.isDirectory()) {
      continue;
    }

    const generatedFile = await readFile(dest, { encoding: 'utf8' });
    await writeFile(dest, generatedFile.replace(/ \| undefined;/g, ';'), { encoding: 'utf8' });
  }
})();
