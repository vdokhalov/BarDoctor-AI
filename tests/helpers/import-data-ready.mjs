/** This fixture contains 15 unresolved rows; the UI deliberately renders only 12. */
export function importDataReady(expectedRows){
 const list=document.querySelector('#quality-list'),notice=document.querySelector('#notice');
 return Boolean(list&&notice&&list.querySelectorAll('button[data-batch]').length===expectedRows
  &&Number(document.querySelector('#quality-count')?.textContent)>=expectedRows
  &&notice.textContent.trim()===''&&document.querySelector('#journal-venue')?.textContent.includes('Atelier'));
}
export async function waitForImportData(frame){
 await frame.waitForFunction(importDataReady,12,{timeout:20000});
 await frame.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
}
