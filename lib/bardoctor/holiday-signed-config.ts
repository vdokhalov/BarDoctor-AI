import root from './signed-feed/trusted-root.json';
export const BUNDLED_HOLIDAY_ROOT_ID = 'sha256:844a1c6de3986c9f02070266b25e0d1a2fa99ceccc89f6b9ad90aae47b62a16e';
type Config={source:{payloadUrl?:string;bundleUrl?:string;releaseFeed?:boolean};policy:Record<string,unknown>;root:Record<string,unknown>};
// The trust material is part of the reviewed artifact, never fetched from the feed.
export function parseSignedSourceConfig(raw: string | undefined): Config | null {
 try {
  if (!raw) return null;
  const c = JSON.parse(raw);
  if (!(c?.source?.releaseFeed === true || (c?.source?.payloadUrl && c?.source?.bundleUrl)) || !c.policy) return null;
  // Retain compatibility only for the exact previous trust material. No root override.
  if (c.rootId !== undefined && c.rootId !== BUNDLED_HOLIDAY_ROOT_ID) return null;
  if (c.root !== undefined && JSON.stringify(c.root) !== JSON.stringify(root)) return null;
  if (c.rootId !== BUNDLED_HOLIDAY_ROOT_ID && c.root === undefined) return null;
  return {source:c.source, policy:c.policy, root:JSON.parse(JSON.stringify(root))};
 } catch { return null; }
}
