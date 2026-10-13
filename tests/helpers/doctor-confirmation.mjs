import assert from 'node:assert/strict';

/** Only called by isolated QA; verify the exact existing consent before accepting. */
export async function confirmDoctorAction(page,button,{required=true}={}){
 if(!required){await button.click();return;}
 const pending=page.waitForEvent('dialog',{timeout:5000});
 const clicked=button.click();
 try{
  const dialog=await pending;
  try{assert.equal(dialog.type(),'confirm');assert.match(dialog.message(),/^Платный AI Doctor: один запрос, до 8000 выходных токенов\./);}
  catch(error){await dialog.dismiss();throw error;}
  await dialog.accept();await clicked;
 }catch(error){await clicked.catch(()=>{});throw error;}
}
