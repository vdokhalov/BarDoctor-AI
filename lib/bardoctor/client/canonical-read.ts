/** Bounded transport only. No caching, source substitution or scope decisions. */
export async function readCanonicalJson<T>(path: string, headers: HeadersInit, signal?: AbortSignal, request?: Pick<RequestInit, 'method' | 'body'>): Promise<{ response: Response; value: T }> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancel: () => void = () => undefined;
  const deadline = new Promise<never>((_, reject) => {
    cancel = () => { controller.abort(); reject(new DOMException('Request canceled', 'AbortError')); };
    if (signal?.aborted) cancel(); else signal?.addEventListener('abort', cancel, { once: true });
    timer = setTimeout(() => { controller.abort(); reject(new Error('Сервер не ответил вовремя. Повторите проверку.')); }, 15000);
  });
  try {
    return await Promise.race([deadline, (async () => {
      const response = await fetch(path, { ...request, headers, cache: 'no-store', signal: controller.signal });
      return { response, value: await response.json() as T };
    })()]);
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
}

/** Coalesce notifications, rereading once after a write during an active read.
 * Focus alone never queues an extra read. Disposal suppresses pending work. */
export function canonicalReadScheduler(read: () => Promise<void>) {
  let active = false, pending = false, disposed = false;
  const run = async () => {
    if (disposed || active) return;
    active = true;
    try { await read(); } finally {
      active = false;
      if (pending && !disposed) { pending = false; void run(); }
    }
  };
  return { start: () => void run(), notify: (event: Event) => {
    if (active) { if (event.type !== 'focus') pending = true; }
    else void run();
  }, dispose: () => { disposed = true; pending = false; } };
}
