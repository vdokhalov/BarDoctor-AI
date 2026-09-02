const environment = process.env.BARDOCTOR_ENVIRONMENT?.trim() || "unconfigured";
const releaseEnvironment = environment === "production" || environment === "release-candidate";

const draftSecret = process.env.BARDOCTOR_VINEXT_DRAFT_SECRET?.trim() || "";
const prerenderSecret = process.env.BARDOCTOR_VINEXT_PRERENDER_SECRET?.trim() || "";

const errors = [];
if (draftSecret && draftSecret.length < 32) {
  errors.push("BARDOCTOR_VINEXT_DRAFT_SECRET must contain at least 32 characters");
}
if (prerenderSecret && !/^[0-9a-f]{64}$/i.test(prerenderSecret)) {
  errors.push("BARDOCTOR_VINEXT_PRERENDER_SECRET must contain exactly 64 hexadecimal characters");
}
if (releaseEnvironment && !draftSecret) {
  errors.push("BARDOCTOR_VINEXT_DRAFT_SECRET is required for a release build");
}
if (releaseEnvironment && !prerenderSecret) {
  errors.push("BARDOCTOR_VINEXT_PRERENDER_SECRET is required for a release build");
}

if (errors.length > 0) {
  for (const error of errors) console.error(`Build input rejected: ${error}.`);
  process.exit(78);
}

console.log(
  releaseEnvironment
    ? `Validated protected build-secret inputs for ${environment}.`
    : `Build-secret gate passed for non-release environment ${environment}.`,
);
