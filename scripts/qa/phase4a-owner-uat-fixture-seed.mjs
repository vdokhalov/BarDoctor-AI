// One QA definition in the pinned candidate, no duplicate seeding model.
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const source=await import(pathToFileURL(resolve('scripts/qa/phase4a-correction-fixture.mjs')).href);
export const seedOwnerUatFixture=source.seedCorrectionFixture;
export const OWNER_UAT_FIXTURE_VERSION=source.CORRECTION_FIXTURE_VERSION;
