import { salesAccountingPage } from "../../lib/bardoctor/sales-accounting-page";
export async function GET() {
  return new Response(salesAccountingPage(false), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" } });
}
