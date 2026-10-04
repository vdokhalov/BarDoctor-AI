import { managementCostRequest } from "../../../../../lib/bardoctor/management-cost-signals";
export const POST = (request: Request) => managementCostRequest(request);
