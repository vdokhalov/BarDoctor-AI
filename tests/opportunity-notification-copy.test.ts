import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
const source = readFileSync('public/opportunities.js','utf8');
const body=source.slice(source.indexOf('  function notificationCopy(event)'),source.indexOf('  function sourceBlock'));
function copy(status:string,settings:Record<string,boolean>={enabled:true,calendarAlerts:true,serverConfigured:true},decision='planned',offline=false){return runInNewContext(body+';notificationCopy(event)',{state:{notificationStatus:settings,offline},event:{decision,notificationPlan:{status,count:2}}});}
test('current category settings override stale event status',()=>{
 assert.match(copy('disabled'),/не запланированы/);
 assert.doesNotMatch(copy('disabled'),/выключены/);
 assert.match(copy('scheduled',{enabled:true,calendarAlerts:false,serverConfigured:true}),/выключены/);
});
test('service setup is separate from a category toggle',()=>{
 assert.match(copy('disabled',{enabled:true,calendarAlerts:true,serverConfigured:false}),/не настроена/);
 assert.doesNotMatch(copy('disabled',{enabled:true,calendarAlerts:true,serverConfigured:false}),/выключены/);
});
test('planned event with no future candidates does not ask to plan it again',()=>{
 assert.match(copy('not_needed'),/Будущие напоминания/);
 assert.doesNotMatch(copy('not_needed'),/после планирования/);
 assert.match(copy('not_needed',undefined,'dismissed'),/отклонённого/);
});
test('queue or provider acceptance is not proof of device delivery',()=>{
 assert.match(copy('queued'),/ожидают отправки/);
 assert.match(copy('scheduled'),/Доставка на устройство не подтверждена/);
 assert.match(copy('error'),/Не удалось/);
});
test('offline data does not claim current settings or delivery',()=>{
 assert.match(copy('scheduled',undefined,'planned',true),/не обновлён/);
 assert.doesNotMatch(copy('scheduled',undefined,'planned',true),/Передано/);
});
