import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
class Storage {
  values = new Map<string,string>();
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
  removeItem(key: string) { this.values.delete(key); }
}
test('new identity incarnation clears old email caches and pending writes, existing account preserves them', () => {
  const source = fs.readFileSync(new URL('../public/bardoctor-preview.js', import.meta.url), 'utf8');
  const start = source.indexOf('    // Account incarnation, not email:');
  const end = source.indexOf('    window.__bdAuthBootstrapV274 = result.bootstrap', start);
  assert.ok(start > 0 && end > start);
  const localStorage = new Storage(), sessionStorage = new Storage();
  localStorage.setItem('bd_session', 'same@isolated.test'); localStorage.setItem('bd_session_userid', '10'); localStorage.setItem('bd_store_cache__same@isolated.test', 'old venue'); localStorage.setItem('bd_sync_queue', 'old write'); localStorage.setItem('unrelated', 'keep'); sessionStorage.setItem('bd_restaurant', 'old venue');
  const script = new vm.Script(source.slice(start, end));
  const apply = (id: number) => script.runInNewContext({ result: { userId: id, email: 'same@isolated.test' }, localStorage, sessionStorage });
  apply(10); assert.equal(localStorage.getItem('bd_sync_queue'), 'old write', 'existing account upgrade must preserve cache');
  apply(11); assert.equal(localStorage.getItem('bd_sync_queue'), null); assert.equal(localStorage.getItem('bd_store_cache__same@isolated.test'), null); assert.equal(sessionStorage.getItem('bd_restaurant'), null); assert.equal(localStorage.getItem('unrelated'), 'keep');
  assert.equal(localStorage.getItem('bd_identity_incarnation__same@isolated.test'), '11');
});
test('settings and zero-active-venue recovery expose the same lifecycle UI', () => {
  const bundle = fs.readFileSync(new URL('../public/assets/index-BQGspy0I.js', import.meta.url), 'utf8');
  assert.match(bundle, /title:"Управление заведениями",subtitle:"Архивация, восстановление и удаление"/);
  assert.match(bundle, /title:"Архив заведений"/); assert.match(bundle, /title:"Удалить мой аккаунт"/);
  assert.match(bundle, /e\.accessibleVenueCount===0\)return i\.jsx\(bdLifecycleEmpty/);
  assert.match(bundle, /href:"\/settings\/lifecycle#archive"/);
});
