import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('server conflict survives an incomplete catalogue and clears only after explicit selection', () => {
  const scope = vm.createContext({});
  vm.runInContext(fs.readFileSync(new URL('../scripts/fragments/tech-card-access-v440.fragment.txt', import.meta.url), 'utf8'), scope);
  const line = {nomenclatureItemId:'grain', productKey:'cookie', purchaseProductKey:'cookie', resolutionStatus:'reference_conflict'};
  assert.equal(scope.bdIngredientReferenceConflictV440(line, []), true);
  const choice = scope.bdIngredientReferencePatchV440({id:'grain'}, 'grain');
  assert.equal(scope.bdIngredientReferenceConflictV440({...line, ...choice}, []), false);
});

test('fresh recipe updates synchronize pristine input and preserve dirty input', () => {
  const slots = [];
  let cursor = 0;
  let effects = [];
  const scope = vm.createContext({bdCatArray:value=>value||[], bdCatBalanceKey:line=>line.purchaseProductKey, S:{
    useRef(value) {const index=cursor++; return slots[index] ||= {current:value};},
    useState(value) {const index=cursor++; if(!(index in slots))slots[index]=value; return [slots[index],next=>{slots[index]=next;}];},
    useEffect(effect) {effects.push(effect);},
  }});
  vm.runInContext(fs.readFileSync(new URL('../scripts/fragments/tech-card-access-v440.fragment.txt', import.meta.url), 'utf8'), scope);
  const dirty={current:false},saving={current:false};
  let form={id:'recipe',ingredients:[{id:'line',quantity:1,purchaseProductKey:'grain'}]},balances;
  const render=source=>{
    cursor=0;effects=[];
    const blocked=scope.bdUseRecipeRefreshV442(source,[{key:'grain',safety:4}],dirty,saving,next=>{form=next;},next=>{balances=next;});
    effects.forEach(effect=>effect());
    return blocked;
  };
  render(form);
  const fresh={...form,ingredients:[{...form.ingredients[0],quantity:2}]};
  assert.equal(render(fresh),false);
  assert.equal(form.ingredients[0].quantity,2);
  assert.equal(balances.line.safety,4);
  dirty.current=true;
  form={...form,ingredients:[{...form.ingredients[0],quantity:3}]};
  assert.equal(render(fresh),false,'identical refresh does not block edits');
  const newer={...fresh,ingredients:[{...fresh.ingredients[0],quantity:4}]};
  assert.equal(render(newer),true);
  assert.equal(form.ingredients[0].quantity,3,'never discard entered quantity');
  assert.equal(render(newer),true,'block remains until the editor closes');
});
