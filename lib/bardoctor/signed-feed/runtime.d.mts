export function readCurrent(bucket: R2Bucket, validate: (value: unknown)=>Promise<unknown>): Promise<{feed: unknown;checkpoint:{digest:string; signedAt:number; policyId:string}}|null>;
export function updateFromSource(bucket:R2Bucket,args:Record<string,unknown>):Promise<{status:string}>;
export function pullVerifiedFeed(args:Record<string,unknown>):Promise<{feed:unknown;text:string;bundle:unknown;checkpoint:any}>;
