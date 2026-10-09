import './business-dates-report-consistency.test.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {capturedBatchCost,historicalPeriodCost} from '../lib/bardoctor/financial-reconciliation';

for(const currency of ['MDL','PMR_RUB'])test('quantities-only cost with explicit shiftId does not certify full monthly margin: '+currency,()=>{
 const venueId=3389,date='2026-10-02',id='quantity-import';
 const batch={id,venueId,shiftId:'manual',businessDate:date,status:'POSTED',costStatus:'FULL',totalTheoreticalCost:2790,
  lines:[[160,9],[70,5],[100,10]].map(([quantity,unitCost],index)=>({id:'line-'+index,salesBatchId:id,quantity,processingStatus:'POSTED',currency,theoreticalCost:quantity*unitCost,
   recipeSnapshot:{recipeId:'recipe-'+index,capturedAt:date+'T12:00:00Z',ingredients:[{productKey:'product-'+index,baseQuantityTotal:quantity,unitCost,totalCost:quantity*unitCost,currency,costStatus:'KNOWN_VALUE'}]}}))};
 const input={venueId,monthKey:'2026-10',accountingCurrency:currency,revenues:[{id:'manual',venueId,date,revenue:12600,receipts:189,currency}],events:[],movements:[],batches:[batch]};
 const before=JSON.stringify(input);
 assert.deepEqual(capturedBatchCost(batch,venueId,date,currency),{known:true,cost:2790,batchIds:[id]});
 const result=historicalPeriodCost(input);
 assert.equal(result.known,false);assert.equal(result.cost,0);
 assert.deepEqual(result.reasons,['HISTORICAL_SALES_COST_MISSING','UNLINKED_SALES_CONSUMPTION']);
 assert.equal(JSON.stringify(input),before);
 const quantitiesOnly=historicalPeriodCost({...input,revenues:[]});
 assert.equal(quantitiesOnly.known,false);assert.deepEqual(quantitiesOnly.reasons,['UNLINKED_SALES_CONSUMPTION']);
});
