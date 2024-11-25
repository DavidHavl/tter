export type EventKey = string | symbol;
export type EventHandler<T> = (payload: T) => void | Promise<void>;
export type EventHandlers<T> = { [K in keyof T]?: EventHandler<T[K]>[] };
export type EventPayloadMap = { [key: string]: unknown };
export type EmitAsyncOptions = { mode: 'concurrent' | 'sequencial' };
export type EventEmitterOptions = { maxHandlers?: number };

export interface Emitter<EPMap extends EventPayloadMap> {
  on<Key extends keyof EPMap>(key: Key, handler: EventHandler<EPMap[Key]>): void;
  off<Key extends keyof EPMap>(key: Key, handler?: EventHandler<EPMap[Key]>): void;
  emit<Key extends keyof EPMap>(key: Key, payload: EPMap[Key]): void;
  emitAsync<Key extends keyof EPMap>(key: Key, payload: EPMap[Key], options?: EmitAsyncOptions): Promise<void>;
}

/**
 * Function to define fully typed event handler.
 * @param {EventHandler} handler - The event handlers.
 * @returns The event handler.
 */
export const defineHandler = <EPMap extends EventPayloadMap, Key extends keyof EPMap>(
  handler: EventHandler<EPMap[Key]>,
): EventHandler<EPMap[Key]> => {
  return handler;
};

/**
 * Function to define fully typed event handlers (to use as an argument of createEmitter function).
 * @param {EventHandler[]} handlers - An object where each key is an event type and the value is an array of event handlers.
 * @returns The event handlers.
 *
 * @example
 * ```ts
 * type AvailableEvents = {
 *     'user:created': { name: string };
 * };
 *
 * const handlers = defineHandlers<AvailableEvents>({
 *     'user:created': [
 *         (payload) => {
 *             console.log('New user created:', pyload)
 *         }
 *     ]
 * });
 * ```
 */
export const defineHandlers = <EPMap extends EventPayloadMap>(
  handlers: { [K in keyof EPMap]?: EventHandler<EPMap[K]>[] },
): { [K in keyof EPMap]?: EventHandler<EPMap[K]>[] } => {
  return handlers;
};

/**
 * Create Event Emitter instance.
 *
 * @template EPMap - The event payload map.
 * @param {EventHandlers<EPMap>} [eventHandlers] - Event handlers to be registered.
 * @param {EventEmitterOptions} [options] - Options for the event emitter.
 * @returns {Emitter} The EventEmitter instance.
 *
 * @example
 * ```ts
 * // Define available events and their payload types
 * type AvailableEvents = {
 *   // event key: payload type
 *   'foo': number;
 *   'bar': { item: { id: string } };
 * };
 *
 * // Initialize emitter with handler types
 * const ee = createEmitter<AvailableEvents>()
 *
 * // Assign event handlers
 * ee.on('foo', (payload) => { // payload type will be correctly inferred as number
 *   c.get('logger').log('Bar:', payload.item.id)
 * })
 *
 * ee.on('bar', async (payload) => { // payload type will be correctly inferred as { item: { id: string } }
 *  // Do something async
 * })
 *
 * // Use the emitter to emit events.
 * ee.emit('foo', 42) // The second argument will be expected to be of a type number
 * await ee.emitAsync('bar', { item: { id: '12345678' } }) // The second argument will be expected to be of a type { item: { id: string } }
 * ```
 *
 */
export const createEmitter = <EPMap extends EventPayloadMap>(
  eventHandlers?: EventHandlers<EPMap>,
  options?: EventEmitterOptions,
): Emitter<EPMap> => {
  // A map of event keys and their corresponding event handlers.
  const handlers: Map<EventKey, EventHandler<unknown>[]> = eventHandlers
    ? new Map(Object.entries(eventHandlers))
    : new Map();

  return {
    /**
     * Add an event handler for the given event key.
     * @param {string|symbol} key Type of event to listen for
     * @param {Function} handler Function that is invoked when the specified event occurs
     * @throws {TypeError} If the handler is not a function
     */
    on<Key extends keyof EPMap>(key: Key, handler: EventHandler<EPMap[Key]>) {
      if (typeof handler !== 'function') {
        throw new TypeError('The handler must be a function');
      }
      if (!handlers.has(key as EventKey)) {
        handlers.set(key as EventKey, []);
      }
      const handlerArray = handlers.get(key as EventKey) as Array<EventHandler<EPMap[Key]>>;
      const limit = options?.maxHandlers ?? 10;
      if (handlerArray.length >= limit) {
        throw new RangeError(
          `Max handlers limit (${limit}) reached for the event "${String(key)}".
          This may indicate a memory leak,
          perhaps due to adding anonymous function as handler within middleware or request handler.
          Check your code or consider increasing limit using options.maxHandlers.`,
        );
      }
      if (!handlerArray.includes(handler)) {
        handlerArray.push(handler);
      }
    },

    /**
     * Remove an event handler for the given event key.
     * If `handler` is undefined, all handlers for the given key are removed.
     * @param {string|symbol} key Type of event to unregister `handler` from
     * @param {Function} handler - Handler function to remove
     */
    off<Key extends keyof EPMap>(key: Key, handler?: EventHandler<EPMap[Key]>) {
      if (!handler) {
        handlers.delete(key as EventKey);
      } else {
        const handlerArray = handlers.get(key as EventKey);
        if (handlerArray) {
          handlers.set(
            key as EventKey,
            handlerArray.filter((h) => h !== handler),
          );
        }
      }
    },

    /**
     * Emit an event with the given event key and payload.
     * Triggers all event handlers associated with the specified key.
     * @param {string|symbol} key - The event key
     * @param {EventPayloadMap[keyof EventPayloadMap]} payload - Data passed to each invoked handler
     */
    emit<Key extends keyof EPMap>(key: Key, payload: EPMap[Key]) {
      const handlerArray = handlers.get(key as EventKey);
      if (handlerArray) {
        for (const handler of handlerArray) {
          handler(payload);
        }
      }
    },

    /**
     * Emit an event with the given event key and payload.
     * Asynchronously triggers all event handlers associated with the specified key.
     * @param {string|symbol} key - The event key
     * @param {EventPayloadMap[keyof EventPayloadMap]} payload - Data passed to each invoked handler
     * @param {EmitAsyncOptions} options - Options.
     * @throws {AggregateError} If any handler encounters an error.
     */
    async emitAsync<Key extends keyof EPMap>(
      key: Key,
      payload: EPMap[Key],
      options: EmitAsyncOptions = { mode: 'concurrent' },
    ) {
      const handlerArray = handlers.get(key as EventKey);
      if (handlerArray) {
        if (options.mode === 'sequencial') {
          for (const handler of handlerArray) {
            await handler(payload);
          }
        } else {
          const results = await Promise.allSettled(
            handlerArray.map(async (handler) => {
              await handler(payload);
            }),
          );
          const errors = (results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[]).map(
            (e) => e.reason,
          );
          if (errors.length > 0) {
            throw new AggregateError(errors, `${errors.length} handler(s) for event ${String(key)} encountered errors`);
          }
        }
      }
    },
  };
};

