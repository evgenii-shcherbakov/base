import { ContextService, ServiceEventBus } from '@compiler/services';
import { FormatService, TemplateService, ImportService } from '@packages/compiler-utils';
import { mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { Project, SourceFile } from 'ts-morph';

export type AdapterParams = {
  name: string;
  outputPath: string;
  templatePath?: string;
};

export type AdapterClass = {
  new (
    contextService: ContextService,
    services: ServiceEventBus[],
    name: string,
    outputPath: string,
    templatePath?: string,
  ): BaseAdapter;
};

export type AdapterFactory = (
  contextService: ContextService,
  services: ServiceEventBus[],
) => BaseAdapter;

export abstract class BaseAdapter {
  protected readonly project: Project;
  protected readonly templateService: TemplateService;
  protected readonly formatService = new FormatService();
  protected outputFile: SourceFile;
  protected importService: ImportService;

  protected constructor(
    protected readonly contextService: ContextService,
    protected readonly services: ServiceEventBus[],
    protected readonly name: string,
    protected readonly outputPath: string,
    protected readonly templatePath?: string,
  ) {
    this.project = this.getProject();
    this.templateService = new TemplateService(this.templatePath);
  }

  protected getProject() {
    return new Project({
      compilerOptions: {
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
      },
    });
  }

  static createFactory<Adapter extends typeof BaseAdapter>(
    this: Adapter,
    params: AdapterParams,
  ): AdapterFactory {
    return (contextService: ContextService, services: ServiceEventBus[]): BaseAdapter => {
      const Constructor = this as unknown as AdapterClass;
      return new Constructor(
        contextService,
        services,
        params.name,
        params.outputPath,
        params.templatePath,
      );
    };
  }

  async onInit() {
    // The adapter owns its output file the way `EventBusService` owns the event-bus one:
    // adding a new adapter must not require its `generated/` file to exist beforehand.
    await mkdir(dirname(this.outputPath), { recursive: true });
    await writeFile(this.outputPath, '/* eslint-disable */\n', { encoding: 'utf-8' });

    this.outputFile = this.project.addSourceFileAtPath(this.outputPath);
    this.importService = new ImportService(this.outputFile);

    this.outputFile.addImportDeclarations(this.contextService.getExternalImportStructures());

    this.importService.addOrUpdate(
      this.contextService.getEventBusImportSpecifier(),
      this.contextService.getEventBusImports(),
    );

    if (this.templatePath) {
      await this.templateService.parse();
    }
  }

  protected abstract compile(): void | Promise<void>;

  async run() {
    await this.onInit();
    await this.compile();

    this.outputFile.organizeImports();
    this.outputFile.fixMissingImports();
    await this.formatService.saveSourceFile(this.outputFile);
  }
}
