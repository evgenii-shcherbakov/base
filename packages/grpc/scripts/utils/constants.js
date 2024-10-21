const { join } = require('node:path');

const LIBRARY_ROOT = join(__dirname, '../..');
const REPOSITORY_ROOT = join(LIBRARY_ROOT, '../..');
const NODE_MODULES_ROOT = join(REPOSITORY_ROOT, 'node_modules');
const PROTO_SRC_ROOT = join(LIBRARY_ROOT, 'modules');

const PROTOC_PATH = process.env.PROTOC_PATH ?? 'protoc';
const PROTOC_PLUGIN_PATH = join(NODE_MODULES_ROOT, '.bin/protoc-gen-ts_proto');

const PROTO_EXT_REG_EXP = /.proto$/g;
const MODELS_DIR_REG_EXP = /^models\//g;

module.exports = {
  LIBRARY_ROOT,
  REPOSITORY_ROOT,
  NODE_MODULES_ROOT,
  PROTO_SRC_ROOT,
  PROTOC_PATH,
  PROTOC_PLUGIN_PATH,
  PROTO_EXT_REG_EXP,
  MODELS_DIR_REG_EXP,
};
