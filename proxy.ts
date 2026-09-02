import { NextResponse } from "next/server";
import { incompatibleMutationResponse } from "./lib/bardoctor/client-contract";
import { securityHeaders } from "./lib/bardoctor/security-headers";

function applySecurityHeaders<T extends Response>(response: T): T {
  for (const [name, value] of Object.entries(securityHeaders())) {
    response.headers.set(name, value);
  }
  return response;
}

export function proxy(request?: Request): Response {
  const incompatible = request ? incompatibleMutationResponse(request) : null;
  return applySecurityHeaders(incompatible ?? NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/).*)"],
};
