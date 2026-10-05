// QA control wrapper: use the exact pinned candidate fixture/actual routes.
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
await import(pathToFileURL(resolve('scripts/management-cost-phase4a-owner-uat.ts')).href);
