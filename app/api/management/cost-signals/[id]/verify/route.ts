import { managementCostRequest } from "../../../../../../lib/bardoctor/management-cost-signals";
export async function POST(request: Request, context: {params: Promise<{id: string}>}) { return managementCostRequest(request, (await context.params).id); }
