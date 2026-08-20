/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { authenticateRequest } from "../lib/bardoctor/auth";
import {
  runNotificationTriggers,
  runNotificationTriggersForAccount,
} from "../lib/bardoctor/notification-triggers";

interface Env {
  ASSETS: Fetcher;
  BARDOCTOR_PUBLIC_ORIGIN?: string;
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
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    const storeMatch = request.method === "PUT"
      ? url.pathname.match(/^\/api\/store\/(bd_cases|bd_equipment)$/)
      : null;
    const notificationAuthRequest = storeMatch
      ? new Request(request.url, { headers: request.headers })
      : null;
    const response = await handler.fetch(request, env, ctx);

    if (response.ok && notificationAuthRequest) {
      ctx.waitUntil(
        authenticateRequest(notificationAuthRequest)
          .then((account) => account
            ? runNotificationTriggersForAccount(account.id, url.origin)
            : undefined)
          .catch(() => undefined),
      );
    }

    return response;
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
