import { EVENT_BUS_OUTPUT_PATH } from '@compiler/constants';
import { createCompilerContext, EventBusService } from '@compiler/services';

/**
 * Emits this package's own half of the codegen: the abstract `<Service>EventBus` classes and
 * the `EventBusHost` enum. The transports are emitted by the adapter packages, each in its
 * own turbo task against its own `src/generated/`.
 */
const compile = async () => {
  try {
    const { project, contextService, services } = createCompilerContext();

    const eventBusService = new EventBusService(project, contextService, EVENT_BUS_OUTPUT_PATH);
    await eventBusService.compile(services);
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message, error.stack);
    } else {
      console.error('EventBus compiler error');
    }

    throw error;
  }
};

compile()
  .then()
  .catch(() => process.exit(1));
