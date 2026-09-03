import { barDoctorResponse } from "./bar-doctor-response";

const STALE_STARTUP_ASSET = "/bardoctor-preview-v397.js?v=shell-first-startup-v397";
const CURRENT_STARTUP_ASSET = "/bardoctor-preview-v397.js?v=desktop-startup-v411";

export async function barDoctorStartupResponseV411(): Promise<Response> {
  const response = barDoctorResponse();
  const html = await response.text();
  const nextHtml = html.includes(CURRENT_STARTUP_ASSET)
    ? html
    : html.replace(STALE_STARTUP_ASSET, CURRENT_STARTUP_ASSET);

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");

  return new Response(nextHtml, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
