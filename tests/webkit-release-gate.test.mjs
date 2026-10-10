import test from "node:test";
import assert from "node:assert/strict";
import { isWebKitLifecycleReleaseReady } from "../scripts/qa/webkit-release-gate.mjs";
const complete = () => ["health-inputs-phase3a9", "derived-metrics-phase3a8"].flatMap(suite => [390, 820, 1280].map(width => ({ suite, width, status: "PASS", exitCode: 0, sourceSHA: "a".repeat(40) })));
test("release requires six successful unique lifecycle cases on one commit", () => assert.equal(isWebKitLifecycleReleaseReady(complete()), true));
for (const status of ["ENVIRONMENT_BLOCKED", "FAIL"]) test(`${status} cannot authorize release`, () => { const rows = complete(); rows[3].status = status; assert.equal(isWebKitLifecycleReleaseReady(rows), false); });
test("missing, duplicate, mixed-source and nonzero native results block release", () => {
 const rows=complete(); assert.equal(isWebKitLifecycleReleaseReady(rows.slice(1)),false);
 for(const mutate of [r=>r[5]=r[0],r=>r[5].sourceSHA="b".repeat(40),r=>r[5].exitCode=1]){const copy=complete();mutate(copy);assert.equal(isWebKitLifecycleReleaseReady(copy),false);}
});
