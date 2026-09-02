export const CURRENT_MUTATION_CONTRACT = 1;
export const MINIMUM_MUTATION_CONTRACT = 1;
export const MUTATION_CONTRACT_HEADER = "X-BarDoctor-Client-Contract";

const PROTECTED_MUTATION_PREFIXES = [
  "/api/store",
  "/api/purchases",
  "/api/inventory",
  "/api/write-offs",
  "/api/sales",
  "/api/shifts",
  "/api/expenses",
  "/api/equipment",
  "/api/nomenclature",
];

export function requiresMutationContract(request: Request): boolean {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method.toUpperCase())) return false;
  const path = new URL(request.url).pathname;
  return PROTECTED_MUTATION_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function incompatibleMutationResponse(request: Request): Response | null {
  if (!requiresMutationContract(request)) return null;
  const supplied = request.headers.get(MUTATION_CONTRACT_HEADER);
  const version = supplied && /^\d+$/.test(supplied) ? Number(supplied) : 0;
  if (version >= MINIMUM_MUTATION_CONTRACT && version <= CURRENT_MUTATION_CONTRACT) return null;
  return Response.json({
    ok: false,
    code: "CLIENT_UPDATE_REQUIRED",
    error: "Эта версия BarDoctor устарела. Операция не выполнена — обновите приложение и повторите.",
    minimumMutationContract: MINIMUM_MUTATION_CONTRACT,
    currentMutationContract: CURRENT_MUTATION_CONTRACT,
  }, {
    status: 426,
    headers: {
      "Cache-Control": "no-store",
      "Upgrade": `BarDoctor-Client-Contract/${CURRENT_MUTATION_CONTRACT}`,
    },
  });
}

