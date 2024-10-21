const { readdir, readFile, writeFile, stat, mkdir } = require('node:fs/promises');
const { join } = require('node:path');
const { execSync } = require('node:child_process');
const { removeOptionals } = require('./utils/functions');
const { LIBRARY_ROOT, PROTOC_PLUGIN_PATH, PROTOC_PATH } = require('./utils/constants');
const { Adapter } = require('./utils/adapter');

(async () => {
  const webAdapter = new Adapter(join(LIBRARY_ROOT, 'adapters/test/src'));

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
  await webAdapter.removeOptionals();
})();
