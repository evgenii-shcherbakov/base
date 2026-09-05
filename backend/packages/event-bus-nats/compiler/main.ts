import { NatsAdapter } from '@compiler/nats.adapter';
import { createCompilerContext } from '@backend/event-bus/compiler';
import { join } from 'path';

/**
 * Emits this package's `src/generated/index.ts` — the NATS transports, subscriber/handler
 * interfaces, `NatsClientFactory` and `NATS_HOST_STREAMS`. Runs as this package's own turbo
 * `compile` task, so the output it writes is the output that task declares.
 */
const compile = async () => {
  try {
    const { contextService, services } = createCompilerContext();

    const adapter = NatsAdapter.createFactory({
      name: 'nats',
      outputPath: join(__dirname, '..', 'src', 'generated', 'index.ts'),
      templatePath: join(__dirname, 'templates'),
    })(contextService, services);

    await adapter.run();
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message, error.stack);
    } else {
      console.error('NATS event-bus compiler error');
    }

    throw error;
  }
};

compile()
  .then()
  .catch(() => process.exit(1));
