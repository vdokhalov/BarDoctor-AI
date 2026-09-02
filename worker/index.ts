/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { authenticateRequest } from "../lib/bardoctor/auth";
import { recordException, recordRequest, requestIdFor, withRequestId } from "../lib/bardoctor/observability";
import {
  runNotificationTriggers,
  runNotificationTriggersForAccount,
} from "../lib/bardoctor/notification-triggers";

interface Env {
  ASSETS: Fetcher;
  BARDOCTOR_PUBLIC_ORIGIN?: string;
  INVOICE_RECOGNITION_V2_MODE?: string;
  INVOICE_RECOGNITION_V2_AI_FALLBACK?: string;
  INVOICE_OCR_PROVIDER?: string;
  INVOICE_OCR_ENDPOINT?: string;
  INVOICE_OCR_API_KEY?: string;
  INVOICE_OCR_TIMEOUT_MS?: string;
  INVOICE_OCR_API_VERSION?: string;
  INVOICE_OCR_MODEL?: string;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const startedAt = performance.now();
    const requestId = requestIdFor(request);
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("X-Request-Id", requestId);
    const observedRequest = new Request(request, { headers: requestHeaders });
    const url = new URL(observedRequest.url);

    try {

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      const imageResponse = await handleImageOptimization(observedRequest, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, observedRequest.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
      recordRequest({ request: observedRequest, requestId, status: imageResponse.status, startedAt, category: "image" });
      return withRequestId(imageResponse, requestId);
    }

    const storeMatch = observedRequest.method === "PUT"
      ? url.pathname.match(/^\/api\/store\/(bd_cases|bd_equipment)$/)
      : null;
    const notificationAuthRequest = storeMatch
      ? new Request(observedRequest.url, { headers: observedRequest.headers })
      : null;
    const response = await handler.fetch(observedRequest, env, ctx);

    if (response.ok && notificationAuthRequest) {
      ctx.waitUntil(
        authenticateRequest(notificationAuthRequest)
          .then((account) => account
            ? runNotificationTriggersForAccount(account.id, url.origin)
            : undefined)
          .catch(() => undefined),
      );
    }

    recordRequest({ request: observedRequest, requestId, status: response.status, startedAt });
    response.headers.set("Server-Timing", `app;dur=${Math.max(0, Math.round(performance.now() - startedAt))}`);
    return withRequestId(response, requestId);
    } catch (error) {
      recordException({ requestId, endpoint: url.pathname, category: "worker_unhandled", error, startedAt });
      throw error;
    }
  },

  async scheduled(_controller: unknown, env: Env, ctx: ExecutionContext): Promise<void> {
    const origin = env.BARDOCTOR_PUBLIC_ORIGIN || "https://bardoctor-preview.v-dokhalov.chatgpt.site";
    ctx.waitUntil(
      runNotificationTriggers(origin).then((summary) => {
        if (summary.failed > 0) {
          console.error("BarDoctor notification run completed with failures", summary);
        }
      }),
    );
  },
};

export default worker;
