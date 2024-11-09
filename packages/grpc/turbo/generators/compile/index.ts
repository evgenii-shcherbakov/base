import { PlopTypes } from '@turbo/gen';
import { EventEmitter } from 'events';
import { mkdir, readdir, rm } from 'fs/promises';
import { join } from 'path';
import { Project } from 'ts-morph';
import { parseProtoTree } from './helpers/utils';
import { GrpcCompilerAnswers } from './helpers/types';
import { GrpcAdapter } from './helpers/grpc-adapter';
import { PROTO_EXT_REG_EXP, PROTO_SRC_ROOT } from './helpers/constants';
import { JsAdapter } from './js.adapter';
import { NestAdapter } from './nest.adapter';

export const compileGenerator = (plop: PlopTypes.NodePlopAPI) => {
  const adapters: GrpcAdapter[] = [new NestAdapter(), new JsAdapter()];

  plop.setActionType('cleanup', async (answers: GrpcCompilerAnswers) => {
    await Promise.all(
      adapters.map(async (adapter) => {
        await rm(adapter.targetRoot, { recursive: true, force: true });
        await mkdir(adapter.targetRoot, { recursive: true });
      }),
    );

    return 'cleanup adapters';
  });

  plop.setActionType('ts-proto', async (answers: GrpcCompilerAnswers) => {
    const eventEmitter = new EventEmitter();

    adapters.forEach((adapter) => {
      eventEmitter.on('file', adapter.onFile.bind(adapter));
      eventEmitter.on('folder', adapter.onFolder.bind(adapter));
    });

    const protoFiles = await readdir(PROTO_SRC_ROOT, { recursive: true });

    eventEmitter.on('file', (relativePath: string, importName: string, hasPrefix: boolean) => {
      answers.files.push(relativePath.replace(PROTO_EXT_REG_EXP, '.ts'));

      if (!hasPrefix) {
        answers.indexExports.push(importName);
      }
    });

    eventEmitter.on(
      'folder',
      (
        relativePath: string,
        importName: string,
        folderTree: Map<string, any>,
        hasPrefix: boolean,
      ) => {
        if (!hasPrefix) {
          answers.indexExports.push(importName);
        }
      },
    );

    await parseProtoTree(PROTO_SRC_ROOT, protoFiles, undefined, eventEmitter);
    eventEmitter.removeAllListeners();
    return 'run ts-proto';
  });

  plop.setActionType('ts-morph', async (answers: GrpcCompilerAnswers) => {
    for (const adapter of adapters) {
      const project = new Project();

      for (const appFile of answers.files) {
        const filePath = join(adapter.targetRoot, appFile);
        const sourceFile = project.addSourceFileAtPath(filePath);
        await adapter.onSourceFile(sourceFile);
        await sourceFile.save();
      }
    }

    return 'run ts-morph';
  });

  plop.setGenerator('compile', {
    description: 'Compile gRPC adapters',
    prompts: async () => ({ files: [], indexExports: [] }),
    actions: [
      { type: 'cleanup' },
      { type: 'ts-proto' },
      { type: 'ts-morph' },
      ...adapters.reduce((acc, adapter) => {
        acc.push(...adapter.getActions());
        return acc;
      }, []),
    ],
  });
};
