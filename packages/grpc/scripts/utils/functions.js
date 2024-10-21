const { readdir } = require('node:fs/promises');
const { MODELS_DIR_REG_EXP, PROTO_EXT_REG_EXP, PROTO_SRC_ROOT } = require('./constants');

const isProtoFile = (fileName) => {
  return PROTO_EXT_REG_EXP.test(fileName);
};

const isModelsDir = (fileName) => {
  return MODELS_DIR_REG_EXP.test(fileName);
};

const getProtoFiles = async () => {
  return readdir(PROTO_SRC_ROOT, { recursive: true });
};

module.exports = {
  isProtoFile,
  isModelsDir,
  getProtoFiles,
};
