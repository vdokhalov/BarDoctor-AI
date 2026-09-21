import { authenticateIdentityRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { readJsonRequest } from "../../../../lib/bardoctor/http";
import { deleteOwnedVenue, lifecycleFailure, setVenueArchive } from "../../../../lib/bardoctor/account-lifecycle";

type RouteContext = { params: Promise<{ id: string }> };
async function command(request: Request, context: RouteContext, deleting: boolean): Promise<Response> {
  const identity = await authenticateIdentityRequest(request);
  if (!identity) return unauthorized();
  const parsed = await readJsonRequest<{ status?: unknown; confirmation?: unknown }>(request, { maxBytes: 16 * 1024 });
  if (!parsed.ok) return parsed.response;
  const venueId = Number((await context.params).id);
  if (!Number.isSafeInteger(venueId) || venueId <= 0) return Response.json({ ok: false, error: "Некорректное заведение" }, { status: 400 });
  try {
    if (deleting) return Response.json(await deleteOwnedVenue(identity.id, venueId, parsed.data.confirmation));
    if (parsed.data.status !== 'archived' && parsed.data.status !== 'active') return Response.json({ ok: false, error: "Выберите архивацию или восстановление" }, { status: 400 });
    return Response.json(await setVenueArchive(identity.id, venueId, parsed.data.status));
  } catch (error) { return lifecycleFailure(error); }
}
export async function PATCH(request: Request, context: RouteContext) { return command(request, context, false); }
export async function DELETE(request: Request, context: RouteContext) { return command(request, context, true); }
