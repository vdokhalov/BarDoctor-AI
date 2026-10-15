import assert from 'node:assert/strict';

// Keep the actual DOM Document across the gesture. A timestamp is evidence,
// not identity: even a reload with an identical rounded timeOrigin must fail.
export async function captureDocumentIdentity(frame) {
 return frame.evaluateHandle(() => {
  const state = { document, departed: false, timeOrigin: performance.timeOrigin };
  state.leave = () => { state.departed = true; };
  addEventListener('pagehide', state.leave, {once:true});
  return state;
 });
}
export async function assertDocumentIdentity(frame, handle, label) {
 try {
  const state = await frame.evaluate(previous => {
   removeEventListener('pagehide', previous.leave);
   return {sameDocument:previous.document === document, departed:previous.departed,
    beforeTimeOrigin:previous.timeOrigin, afterTimeOrigin:performance.timeOrigin};
  }, handle);
  assert.equal(state.sameDocument,true,'gesture must stay in the same DOM document '+label);
  assert.equal(state.departed,false,'document departed during gesture '+label);
  return state;
 } finally { await handle.dispose(); }
}
