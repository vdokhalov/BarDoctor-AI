/** QA-only: observe native fetch and the body readers the application invokes. */
export function installApiReadTracker(options = {}) {
  const target = options.target ?? globalThis;
  if (target.__qaFetchTrackingInstalled) return;
  const nativeFetch = target.fetch;
  const decorated = new WeakSet();
  let pending = 0;
  function decorate(response) {
    if (!response || decorated.has(response)) return response;
    decorated.add(response);
    for (const method of ['json', 'text', 'arrayBuffer', 'blob', 'formData', 'bytes']) {
      const nativeReader = response[method];
      if (typeof nativeReader !== 'function') continue;
      Object.defineProperty(response, method, {
        configurable: true,
        writable: true,
        value: function (...args) {
          pending++;
          let reading;
          try { reading = Reflect.apply(nativeReader, this, args); }
          catch (error) { pending--; throw error; }
          return Promise.resolve(reading).finally(() => { pending--; });
        },
      });
    }
    const nativeClone = response.clone;
    if (typeof nativeClone === 'function') Object.defineProperty(response, 'clone', {
      configurable: true,
      writable: true,
      // Only decorate clones explicitly requested by the application.
      value: function (...args) { return decorate(Reflect.apply(nativeClone, this, args)); },
    });
    return response;
  }
  function trackedFetch(...args) {
    let tracked = false;
    try {
      const input = args[0];
      const url = typeof input === 'string' || input instanceof URL ? String(input) : input?.url;
      tracked = new URL(url, target.location?.href).pathname.startsWith('/api/');
    } catch { /* Preserve the native fetch result for unusual or invalid inputs. */ }
    if (!tracked) return Reflect.apply(nativeFetch, this, args);
    pending++;
    let fetching;
    try { fetching = Reflect.apply(nativeFetch, this, args); }
    catch (error) { pending--; throw error; }
    return Promise.resolve(fetching).then(decorate).finally(() => { pending--; });
  }
  target.fetch = trackedFetch;
  Object.defineProperty(target, '__qaPendingApi', { get: () => pending });
  Object.defineProperty(target, '__qaFetchTrackingInstalled', { value: true });
}
