const { join } = require('node:path');
const { LIBRARY_ROOT, PROTOC_PLUGIN_PATH, PROTOC_PATH } = require('./utils/constants');
const { Adapter } = require('./utils/adapter');

(async () => {
  const nestAdapter = new Adapter(join(LIBRARY_ROOT, 'adapters/nest/src'));

  await nestAdapter.clean();

  await nestAdapter.generate((file, adapter) => [
    PROTOC_PATH,
    `--plugin=${PROTOC_PLUGIN_PATH}`,
    `--ts_proto_out=${adapter.generatedRoot}`,
    '--ts_proto_opt=nestJs=true',
    '--ts_proto_opt=useDate=true',
    '--ts_proto_opt=snakeToCamel=false',
    // '--ts_proto_opt=exportCommonSymbols=false',
    // '--ts_proto_opt=outputIndex=true',
    '--ts_proto_opt=emitImportedFiles=false',
    // '--ts_proto_opt=noDefaultsForOptionals=true',
    // '--ts_proto_opt=useReadonlyTypes=true',
    '--ts_proto_opt=useMapType=true',
    // '--ts_proto_opt=initializeFieldsAsUndefined=false',
    `./${file}`,
  ]);

  await nestAdapter.write();
  await nestAdapter.removeOptionals();
})();
