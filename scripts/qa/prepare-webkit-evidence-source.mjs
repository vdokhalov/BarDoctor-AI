import { createHash } from "node:crypto";

/** Insert only diagnostic hooks. Removing the marked insertions must recover the
 * original suite byte-for-byte; no assertions, actions or timeouts are replaced. */
export function prepareEvidenceSource(source) {
  const changes = [
    ["import { waitForSalesHostReads }", 'import { WebKitEvidenceCompletion } from "./qa/webkit-evidence-completion";\n'],
    [" const r=await closingFixture();", '\n const diagnostic=new WebKitEvidenceCompletion(r.sqlite); const diagnosticPreview=await(await r.get()).json(); assert.equal(diagnosticPreview.eligible,true); diagnostic.checkpoint("pre-navigation-preview",{eligible:diagnosticPreview.eligible});', "after"],
    [" const request=new Request(url,{method:req.method,headers:req.headers as HeadersInit,...(body.length?{body}:{})});", '\n diagnostic.apiRequest(request);', "after"],
    [" if(url.pathname===\'/api/business-health\')await evidence.health(request,response);", '\n await diagnostic.apiResponse(request,response);', "after"],
    [" try{\n await evidence.attach(context,base,r.user.token);", '\n await diagnostic.attach(context);', "beforeSuffix"],
    [" const page=await context.newPage();", 'diagnostic.bindPage(page);', "after"],
    ["const metric=await page.evaluate", 'await diagnostic.state("before-review-assertions");', "before"],
    ["assert.equal(metric.negativeDenominator,1);", 'diagnostic.checkpoint("review-assertions",{avgRating:metric.avgRating,analyzedCount:metric.analyzedCount,negativeDenominator:metric.negativeDenominator});', "after"],
    [" const preview=await(await r.get()).json();assert.equal(preview.eligible,true);", 'diagnostic.checkpoint("month-preview-assertions",{eligible:preview.eligible});', "after"],
    [" await evidence.completed(page,context);", 'await diagnostic.state("all-business-assertions-completed");diagnostic.checkpoint("all-business-assertions-completed",{result:"PASS"});', "after"],
    ["await evidence.failure(error,page,context);", 'await diagnostic.failed(error);', "after"],
    ["r.close();}", 'diagnostic.close();', "before"],
  ];
  let output = source;
  for (const [anchor, addition, placement] of changes) {
    if (output.split(anchor).length !== 2) throw new Error(`Diagnostic anchor must occur exactly once: ${anchor}`);
    const marked = `/*BD_EVIDENCE_START*/${addition}/*BD_EVIDENCE_END*/`;
    let replacement;
    if (placement === "after") replacement = anchor + marked;
    else if (placement === "beforeSuffix") replacement = anchor.replace("\n await evidence.attach", marked + "\n await evidence.attach");
    else replacement = marked + anchor;
    output = output.replace(anchor, replacement);
  }
  const recovered = output.replace(/\/\*BD_EVIDENCE_START\*\/[\s\S]*?\/\*BD_EVIDENCE_END\*\//g, "");
  if (recovered !== source) throw new Error("Unchanged suite equivalence verification failed");
  return { output, sourceSHA256: createHash("sha256").update(source).digest("hex"), insertions: changes.length, byteForByteRecovered: true };
}
