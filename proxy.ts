import { NextResponse } from "next/server";
import { securityHeaders } from "./lib/bardoctor/security-headers";

export function proxy(): NextResponse {
  const response = NextResponse.next();
  for (const [name, value] of Object.entries(securityHeaders())) {
    response.headers.set(name, value);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/).*)"],
};

