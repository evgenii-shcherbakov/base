const { readdir, readFile, writeFile, stat, mkdir } = require('node:fs/promises');
const { join } = require('node:path');
const { execSync } = require('node:child_process');
const { removeOptionals } = require('./utils/functions');
const { LIBRARY_ROOT, PROTOC_PLUGIN_PATH, PROTOC_PATH } = require('./utils/constants');
const { Adapter } = require('./utils/adapter');

// const PROTOC_PATH = process.env.PROTOC_PATH ?? 'protoc';
//
// (async () => {
//   const libraryRoot = join(__dirname, '..');
//   const protoRoot = join(libraryRoot, 'modules');
//   const repositoryRoot = join(libraryRoot, '../..');
//   const destPath = join(libraryRoot, 'adapters/web');
//   const pluginPath = join(repositoryRoot, 'node_modules/.bin/protoc-gen-ts_proto');
//
//   await mkdir(destPath, { recursive: true });
//   const protoFiles = await readdir(protoRoot, { recursive: true });
//
//   protoFiles.forEach((protoFile) => {
//     if (/.proto$/g.test(protoFile)) {
//       execSync(
//         [
//           PROTOC_PATH,
//           `--plugin=${pluginPath}`,
//           `--ts_proto_out=${destPath}`,
//           // '--ts_proto_opt=nestJs=true',
//           '--ts_proto_opt=useDate=true',
//           // '--ts_proto_opt=useOptionals=none',
//           // '--ts_proto_opt=useMongoObjectId=true',
//           '--ts_proto_opt=snakeToCamel=false',
//           // '--ts_proto_opt=outputClientImpl=grpc-web',
//           '--ts_proto_opt=outputServices=grpc-js',
//           `./${protoFile}`,
//         ].join(' '),
//         { cwd: protoRoot, encoding: 'utf8' },
//       );
//     }
//   });
//
//   await removeOptionals(destPath);
// })();

(async () => {
  const webAdapter = new Adapter(join(LIBRARY_ROOT, 'adapters/web/src'));

  await webAdapter.clean();

  await webAdapter.generate((file, adapter) => [
    PROTOC_PATH,
    `--plugin=${PROTOC_PLUGIN_PATH}`,
    `--ts_proto_out=${adapter.generatedRoot}`,
    '--ts_proto_opt=useDate=true',
    '--ts_proto_opt=snakeToCamel=false',
    '--ts_proto_opt=outputServices=grpc-js',
    `./${file}`,
  ]);

  await webAdapter.write();
  // await webAdapter.removeOptionals();
})();
