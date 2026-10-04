import { managementCostRequest } from "../../../../lib/bardoctor/management-cost-signals";
export const GET = (request: Request) => managementCostRequest(request);
