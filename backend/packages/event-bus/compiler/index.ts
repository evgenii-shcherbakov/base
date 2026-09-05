// Build-time API consumed by the adapter packages (@backend/event-bus-nats,
// @backend/event-bus-redis), each of which compiles its own transports in its own turbo task.
// Reached as `@backend/event-bus/compiler`; nothing here is part of the runtime entrypoint.
export * from './adapters/base.adapter';
export * from './services';
export { EVENT_BUS_IMPORT_SPECIFIER } from './constants';
