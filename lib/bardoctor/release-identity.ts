import { BARDOCTOR_SOURCE_COMMIT } from "./source-commit";
import {
  BARDOCTOR_APP_VERSION,
  BARDOCTOR_BUILD_NUMBER,
  BARDOCTOR_BUILD_TIMESTAMP,
  BARDOCTOR_SCHEMA_VERSION,
} from "./version";
import { CURRENT_MUTATION_CONTRACT, MINIMUM_MUTATION_CONTRACT } from "./client-contract";

export interface BarDoctorReleaseIdentity {
  appVersion: string;
  buildNumber: string;
  gitCommit: string;
  buildTimestamp: string;
  schemaVersion: string;
  environment: string;
  mutationContractVersion: number;
  minimumSupportedMutationContract: number;
}

export function getBarDoctorReleaseIdentity(environment = "unconfigured"): BarDoctorReleaseIdentity {
  return {
    appVersion: BARDOCTOR_APP_VERSION,
    buildNumber: BARDOCTOR_BUILD_NUMBER,
    gitCommit: BARDOCTOR_SOURCE_COMMIT,
    buildTimestamp: BARDOCTOR_BUILD_TIMESTAMP,
    schemaVersion: BARDOCTOR_SCHEMA_VERSION,
    environment,
    mutationContractVersion: CURRENT_MUTATION_CONTRACT,
    minimumSupportedMutationContract: MINIMUM_MUTATION_CONTRACT,
  };
}
