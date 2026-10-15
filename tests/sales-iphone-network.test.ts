import assert from 'node:assert/strict';
import test from 'node:test';
import {expectedDepartingCashierIcon} from './helpers/sales-iphone-trace';

const outgoing={url:'http://127.0.0.1:1234/integration-icons/clock-3.svg',owner:'http://127.0.0.1:1234/cashier?venue=1',method:'GET',type:'image',error:'Load request cancelled',pendingBeforeBack:true,duringBack:true,departed:true};
test('only an in-flight outgoing Cashier icon cancellation is expected',()=>assert.equal(expectedDepartingCashierIcon(outgoing),true));
for(const [name,change] of Object.entries({
 api:{url:'http://127.0.0.1:1234/api/sales-events',type:'fetch'},
 document:{type:'document'},script:{type:'script'},post:{method:'POST'},
 destination:{owner:'http://127.0.0.1:1234/sales-import?venue=1'},
 foreignOrigin:{url:'https://example.com/integration-icons/clock-3.svg'},
 otherResource:{url:'http://127.0.0.1:1234/critical.svg'},
 queryResource:{url:outgoing.url+'?action=read'},
 newRequest:{pendingBeforeBack:false},outsideHandoff:{duringBack:false},
 noDeparture:{departed:false},realNetworkFailure:{error:'Connection refused'},
 otherCancellation:{error:'net::ERR_ABORTED'},
}))test('rejects '+name,()=>assert.equal(expectedDepartingCashierIcon({...outgoing,...change}),false));
