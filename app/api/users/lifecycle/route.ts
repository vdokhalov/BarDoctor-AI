import { authenticateIdentityRequest, clearSessionCookie, unauthorized } from "../../../../lib/bardoctor/auth";
import { readJsonRequest } from "../../../../lib/bardoctor/http";
import { deleteOwnAccount, lifecycleFailure, lifecycleVenueName, ownedLifecycleVenues } from "../../../../lib/bardoctor/account-lifecycle";

export async function GET(request: Request): Promise<Response> {
  const account = await authenticateIdentityRequest(request);
  if (!account) return unauthorized();
  const venues = await ownedLifecycleVenues(account.id);
  return Response.json({ ok: true, passwordRequired: Boolean(account.passwordHash), venues: venues.map(venue => ({
    id: venue.id, name: lifecycleVenueName(venue), status: venue.status, otherOwners: venue.other_owners,
  })) }, { headers: { 'Cache-Control': 'private, no-store' } });
}
export async function DELETE(request: Request): Promise<Response> {
  const account = await authenticateIdentityRequest(request);
  if (!account) return unauthorized();
  const parsed = await readJsonRequest<{ password?: string; confirmation?: string; deleteVenues?: Record<string, string> }>(request, { maxBytes: 32 * 1024 });
  if (!parsed.ok) return parsed.response;
  try {
    const result = await deleteOwnAccount(account, request, parsed.data);
    return Response.json(result, { headers: { 'Set-Cookie': clearSessionCookie(request), 'Cache-Control': 'private, no-store' } });
  } catch (error) { return lifecycleFailure(error); }
}
