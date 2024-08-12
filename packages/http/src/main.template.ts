// import { TextWriter } from '@yellicode/core';
// import { Generator } from '@yellicode/templating';
// import { TypeScriptWriter, InterfaceDefinition } from '@yellicode/typescript';
//
// Generator.generate({ outputFile: './src/generated.d.ts' }, (output: TextWriter) => {
//   const interfaceDefinition: InterfaceDefinition = {
//     name: 'TypedHttpControllerInterface',
//     export: true,
//   };
//
//   interfaceDefinition.properties = [
//     {
//       name: 'TaskDescription',
//       typeName: 'string',
//       accessModifier: 'public',
//     },
//     {
//       name: 'IsFinished',
//       typeName: 'boolean',
//       accessModifier: 'public',
//     },
//   ];
//
//   const ts = new TypeScriptWriter(output);
//
//   ts.writeInterfaceBlock(interfaceDefinition, () => {
//     interfaceDefinition.properties?.forEach((p) => {
//       ts.writeProperty(p);
//       ts.writeLine();
//     });
//   });
// });

import { BackendCv, BackendJob, BackendProject } from '@packages/common';
import {
  TypedHttpController,
  TypedHttpControllerClass,
  TypedHttpEndpoint,
  TypedHttpAction,
  TypedHttpClientSchema,
} from '@packages/http';
import { pascalCase } from 'change-case-all';
import { rm, writeFile, readFile, appendFile } from 'fs/promises';
import { resolve } from 'path';
import { TypedHttpEndpointSchema } from 'types';
import { schema } from './schema';
import ts, { ParameterDeclaration, PropertySignature, SyntaxKind } from 'typescript';
import {
  ImportDeclaration,
  Project,
  SyntaxKind as MorphSyntaxKind,
  VariableDeclaration,
  Node,
  PropertyAssignment,
  InterfaceDeclarationStructure,
  MethodSignatureStructure,
} from 'ts-morph';

// const project = new Project();

const file = ts.createSourceFile(
  resolve(__dirname, 'generated.d.ts'),
  '',
  ts.ScriptTarget.ESNext,
  false,
  ts.ScriptKind.TS,
);

const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

// const dictValueIdentifier = ts.factory.createIdentifier('T');

// const key = ts.factory.createParameterDeclaration(
//   undefined,
//   undefined,
//   undefined,
//   'key',
//   undefined,
//   ts.factory.createTypeReferenceNode('string'),
// );

// const schema = {
//   auth: new TypedHttpController('auth').declareEndpoints({
//     refresh: TypedHttpEndpoint.post('refresh').request<BackendCv>().response<bigint>(),
//     createComment: TypedHttpEndpoint.post('users/:userId/comment')
//       .request<BackendProject>()
//       .response<BackendJob>(),
//   }),
// };

const parseFile = async (schemaName: string, filePath: string) => {
  const project = new Project();

  project.addSourceFilesAtPaths(`src/**/*.ts`);

  const sourceFile = project.getSourceFiles().find((file) => file.getFilePath() === filePath);

  if (!sourceFile) {
    console.log(project.getSourceFiles().map((file) => file.getFilePath()));
    return;
  }

  const schema: TypedHttpClientSchema = (await import(filePath))[schemaName];

  // const sourceFile = project.getSourceFileOrThrow(`${__dirname}/schema.ts`);
  const targetFile = project.createSourceFile(`${__dirname}/generated.d.ts`, '', {
    overwrite: true,
  });

  const variableDeclaration = sourceFile.getVariableDeclarationOrThrow(schemaName);

  // @ts-ignore
  console.log(
    // variableDeclaration.getStructure().initializer,
    // typeof variableDeclaration.getStructure().initializer,
    schema,
  );

  const usedTypes = new Set<string>();
  const controllers = new Set<string>();
  const endpoints = new Set<string>();

  const types = ['request', 'response'];

  let currentController = '';
  let currentEndpoint = '';
  let currentType: 'request' | 'response' | '' = '';
  const typeStack: Map<string, { request?: string; response?: string }> = new Map();

  function collectUsedTypes(node: any) {
    const id = `${currentController}.${currentEndpoint}`;
    // console.log('node', node.getKindName?.());

    // if (node.getKindName?.() === 'Identifier') {
    //   console.log(node.getText(), (node as Node).getSymbol?.());
    //
    //   (node as Node).getChildren?.()?.forEach((n) => {
    //     // if (node.getKindName?.() === 'TypeReference') {
    //     // }
    //
    //     console.log(node.getText(), (n as Node).getKindName?.());
    //   });
    //
    //   // console.log(node.getText());
    // }

    if (node.getKindName?.() === 'Identifier') {
      const text = node.getText();
      const isController = Object.keys(schema).some((controller) => controller === text);

      if (isController) {
        currentController = text;
      }

      const endpoint = Object.keys(schema[currentController]?.endpoints ?? {}).find(
        (endpoint) => endpoint === text,
      );

      if (endpoint) {
        currentEndpoint = text;
      }

      if (types.includes(text)) {
        currentType = text;
      }

      // console.log(text);
    }

    if (node.getKindName?.() === 'TypeReference') {
      const typeName = node.getTypeName().getText();
      usedTypes.add(typeName);

      if (currentType) {
        typeStack.set(id, { ...(typeStack.get(id) ?? {}), [currentType]: typeName });
      }

      // console.log(typeName);

      // if (typeStack.has(id)) {
      //   typeStack.set(id, { ...typeStack.get(id) });
      // } else {
      //   typeStack.set(id, {});
      // }
    }
    node.forEachChild(collectUsedTypes);
  }

  collectUsedTypes(variableDeclaration);

  console.log(typeStack);

  // console.log('VARIABLE ->', variableDeclaration.getKindName());
  //
  // variableDeclaration.forEachChild((node) => {
  //   console.log('NODE ->', node.getKindName(), node.getText());
  // });

  const necessaryImports = new Set<ImportDeclaration>();

  sourceFile.getImportDeclarations().forEach((importDeclaration) => {
    importDeclaration.getNamedImports().forEach((namedImport) => {
      const importName = namedImport.getName();

      if (usedTypes.has(importName)) {
        necessaryImports.add(importDeclaration);
      }
    });
  });

  necessaryImports.forEach((importDeclaration) => {
    const originalStructure = importDeclaration.getStructure();
    targetFile.addImportDeclaration(originalStructure);
  });

  targetFile.addImportDeclaration({
    namedImports: ['RequestParam'],
    moduleSpecifier: 'types',
    isTypeOnly: true,
  });

  for (const controller of Object.keys(schema)) {
    const endpoints = schema[controller].endpoints;

    const methods: InterfaceDeclarationStructure['methods'] = Object.keys(endpoints).reduce(
      (controllerMethods: InterfaceDeclarationStructure['methods'], endpoint) => {
        const endpointSchema = endpoints[endpoint][TypedHttpAction.SCHEMA];

        const methodParams: MethodSignatureStructure['parameters'] = [];

        const routeParamsProperties: InterfaceDeclarationStructure['properties'] =
          endpointSchema.fullUrl
            .split('/')
            .reduce((properties: InterfaceDeclarationStructure['properties'], segment: string) => {
              const param = segment.replace(/(^:|\?$)/gi, '');

              if (/(^:|\?$)/gi.test(segment)) {
                properties?.push({
                  name: param,
                  type: 'RequestParam',
                  hasQuestionToken: true,
                });
                return properties;
              }

              if (/^:/gi.test(segment)) {
                properties?.push({
                  name: param,
                  type: 'RequestParam',
                });
              }

              return properties;
            }, []);

        if (routeParamsProperties?.length) {
          const routeParamsSymbol = `${pascalCase(controller)}${pascalCase(endpoint)}RequestParams`;

          targetFile.addInterface({
            name: routeParamsSymbol,
            properties: routeParamsProperties,
          });

          methodParams.push({
            name: 'params',
            type: routeParamsSymbol,
          });
        }

        const typeData = typeStack.get(`${controller}.${endpoint}`);

        if (typeData?.request) {
          methodParams.push({
            name: 'body',
            type: typeData.request,
          });
        }

        methodParams.push({
          name: 'rest',
          type: 'any[]',
          isRestParameter: true,
        });

        controllerMethods?.push({
          name: endpoint,
          parameters: methodParams,
          returnType: typeData?.response ? `Promise<${typeData.response}>` : `Promise<any>`,
        });

        return controllerMethods;
      },
      [],
    );

    targetFile.addInterface({
      name: `${pascalCase(controller)}HttpControllerInterface`,
      methods,
    });
  }

  await project.save();
  // console.log('Necessary imports copied to target file.');

  // const sourceFiles = project.getSourceFiles();
  //
  // sourceFiles.forEach((sourceFile) => {
  //   // console.log(`Processing ${sourceFile.getFilePath()}`);
  //
  //   const importDeclarations = sourceFile.getImportDeclarations();
  //
  //   importDeclarations.forEach((importDeclaration) => {
  //     console.log(`Import: ${importDeclaration.getText()}`);
  //
  //     console.log(importDeclaration.getType());
  //   });
  //
  //   const variableStatements = sourceFile.getVariableStatements();
  //
  //   variableStatements.forEach((variableStatement) => {
  //     const declarations = variableStatement.getDeclarations();
  //     declarations.forEach((declaration) => {
  //       if (schemaName === declaration.getName()) {
  //         const name = declaration.getName();
  //         const type = declaration.getType().getText();
  //
  //         console.log(`Variable: ${name}, Type: ${type}`);
  //       }
  //     });
  //   });
  // });

  // const fileContent = await readFile(filePath, { encoding: 'utf-8' });
  // console.log(fileContent.match(new RegExp(`import`, 'gi')));
  // console.log(fileContent.match(new RegExp(`${schemaName} = \{1\}`, 'gi')));
};

(async () => {
  const schemaName = 'schema';
  const filePath = resolve(__dirname, 'schema.ts');

  // await rm(file.fileName, { recursive: true, force: true });
  await parseFile(schemaName, filePath);

  // const content: string[] = [];

  // const exportModifier = ts.factory.createModifier(SyntaxKind.ExportKeyword);
  // const publicModifier = ts.factory.createModifier(SyntaxKind.PublicKeyword);
  // const readonlyModifier = ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword);

  // const typesId = ts.factory.createIdentifier("'types'");
  // const requestParamTypeId = ts.factory.createIdentifier('RequestParam');
  // const requestParamTypeRef = ts.factory.createTypeReferenceNode(requestParamTypeId);

  // const typeImports = ts.factory.createImportDeclaration(
  //   [],
  //   ts.factory.createImportClause(
  //     true,
  //     undefined,
  //     ts.factory.createNamedImports([
  //       ts.factory.createImportSpecifier(false, undefined, requestParamTypeId),
  //     ]),
  //   ),
  //   typesId,
  // );
  //
  // content.push(printer.printNode(ts.EmitHint.Unspecified, typeImports, file));

  // for (const controller of Object.keys(schema)) {
  //   // @ts-ignore
  //   const endpoints = (schema[controller] as unknown as TypedHttpControllerClass<any, any>)
  //     .endpoints;
  //
  //   const members = Object.keys(endpoints).map((endpoint) => {
  //     const endpointSchema = (endpoints[endpoint] as TypedHttpEndpoint<any, any, any>)[
  //       TypedHttpAction.SCHEMA
  //     ];
  //
  //     const methodParams: ParameterDeclaration[] = [];
  //     const routeParamsFields: PropertySignature[] = [];
  //
  //     endpointSchema.fullUrl.split('/').forEach((segment) => {
  //       if (/(^:|\?$)/gi.test(segment)) {
  //         routeParamsFields.push(
  //           ts.factory.createPropertySignature(
  //             [],
  //             segment.replace(/(^:|\?$)/gi, ''),
  //             ts.factory.createToken(ts.SyntaxKind.QuestionToken),
  //             requestParamTypeRef,
  //           ),
  //         );
  //         return;
  //       }
  //
  //       if (/^:/gi.test(segment)) {
  //         routeParamsFields.push(
  //           ts.factory.createPropertySignature(
  //             [],
  //             segment.replace(/(^:|\?$)/gi, ''),
  //             undefined,
  //             requestParamTypeRef,
  //           ),
  //         );
  //         return;
  //       }
  //     });
  //
  //     if (routeParamsFields.length) {
  //       const paramsId = ts.factory.createIdentifier(
  //         `${pascalCase(controller)}${pascalCase(endpoint)}Params`,
  //       );
  //
  //       const paramsType = ts.factory.createTypeReferenceNode(paramsId);
  //
  //       const paramsInterface = ts.factory.createInterfaceDeclaration(
  //         [exportModifier],
  //         paramsId,
  //         [],
  //         [],
  //         routeParamsFields,
  //       );
  //
  //       content.push(printer.printNode(ts.EmitHint.Unspecified, paramsInterface, file));
  //
  //       methodParams.push(
  //         ts.factory.createParameterDeclaration([], undefined, 'params', undefined, paramsType),
  //       );
  //     }
  //
  //     methodParams.push(
  //       ts.factory.createParameterDeclaration(
  //         [],
  //         undefined,
  //         'body',
  //         undefined,
  //         ts.factory.createTypeReferenceNode('any'),
  //       ),
  //       ts.factory.createParameterDeclaration(
  //         [],
  //         ts.factory.createToken(SyntaxKind.DotDotDotToken),
  //         'rest',
  //         undefined,
  //         ts.factory.createArrayTypeNode(ts.factory.createTypeReferenceNode('any')),
  //       ),
  //     );
  //
  //     return ts.factory.createMethodSignature(
  //       [],
  //       endpoint,
  //       undefined,
  //       undefined,
  //       methodParams,
  //       ts.factory.createTypeReferenceNode('Promise<Response>'),
  //     );
  //   });
  //
  //   const interfaceDeclaration = ts.factory.createInterfaceDeclaration(
  //     [exportModifier],
  //     `${pascalCase(controller)}HttpControllerInterface`,
  //     [],
  //     [],
  //     members,
  //   );
  //
  //   content.push(printer.printNode(ts.EmitHint.Unspecified, interfaceDeclaration, file));
  // }

  // console.log(content);
  // await appendFile(file.fileName, content.join('\n\n'), { encoding: 'utf-8' });
})();
