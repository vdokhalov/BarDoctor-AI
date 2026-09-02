import { BARDOCTOR_BUILD_ID } from "./version";

declare const __BARDOCTOR_SOURCE_COMMIT__: string;

export const BARDOCTOR_SOURCE_COMMIT = typeof __BARDOCTOR_SOURCE_COMMIT__ === "string"
  && __BARDOCTOR_SOURCE_COMMIT__.trim()
  ? __BARDOCTOR_SOURCE_COMMIT__.trim()
  : BARDOCTOR_BUILD_ID;
