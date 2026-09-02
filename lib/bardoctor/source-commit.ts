declare const __BARDOCTOR_SOURCE_COMMIT__: string;

export const BARDOCTOR_SOURCE_COMMIT = typeof __BARDOCTOR_SOURCE_COMMIT__ === "string"
  && __BARDOCTOR_SOURCE_COMMIT__.trim()
  ? __BARDOCTOR_SOURCE_COMMIT__.trim()
  : "source-commit-unavailable";
