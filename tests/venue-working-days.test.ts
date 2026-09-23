import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import { lifecycleRuntime } from "./helpers/lifecycle-runtime";

const source = fs.readFileSync("public/venue-schedule.js", "utf8");
const sandbox = { window: { customElements: { get: () => undefined, define: () => undefined } }, HTMLElement: class {} };
vm.runInNewContext(source, sandbox);
const schedule = (sandbox.window as typeof sandbox.window & { bdVenueSchedule: {
  daysOf: (v: unknown) => boolean[] | null;
  toggleDays: (v: unknown, day: number) => Record<string, unknown>;
  summary: (v: {workingDays?: unknown;openTime: string;closeTime: string}) => string;
} }).bdVenueSchedule;
const base = { name: "Тестовое заведение", businessType: "Бар", country: "Молдова", city: "Кишинёв", currency: "MDL" };
const hours = (days: number[], openTime: string, closeTime: string) => ({
  openTime, closeTime, workingDays: Object.fromEntries(Array.from({length: 7}, (_, i) => [String(i + 1), days.includes(i + 1)]))
});
const read = async (r: Awaited<ReturnType<typeof lifecycleRuntime>>, user: {email:string;token:string}, id: number) => {
  const request = new Request("https://isolated.test/api/restaurants/me", {
    headers: {"X-Session-Email":user.email,"X-Session-Token":user.token,"X-Venue-Id":String(id)}
  });
  const response = await r.api.restaurantMe.GET(request);
  assert.equal(response.status,200);
  return ((await response.json()) as {restaurant: unknown}).restaurant as {workingDays?: Record<string,unknown>;openTime:string;closeTime:string;name:string};
};
test("common component keeps optional days, legacy keys and overnight summary", () => {
  assert.equal(schedule.daysOf(undefined), null);
  assert.equal(schedule.summary({openTime:"10:00",closeTime:"23:00"}), "Рабочие дни не указаны · 10:00–23:00");
  let days: Record<string,unknown> | undefined;
  for(const day of [5,6,7]) days = schedule.toggleDays(days,day);
  assert.equal(schedule.summary({...hours([5,6,7],"22:00","06:00"),workingDays:days}),"Пт, Сб, Вс · 22:00–06:00 следующего дня");
  assert.equal((days as Record<string,unknown>)["1"], false);
  assert.equal(schedule.daysOf({monday:true,tuesday:false})?.[0],true);
  const individual = {"5":{open:"18:00",close:"02:00"},"6":true};
  const changed = schedule.toggleDays(individual,7);
  assert.deepEqual(changed["5"],individual["5"]);
  assert.equal(schedule.daysOf(changed)?.[4],true);
});
test("real venue routes persist selected days, night end and tenant isolation", async t => {
  const r = await lifecycleRuntime({restaurantMe:"./app/api/restaurants/me/route",restaurants:"./app/api/restaurants/route"});
  t.after(r.close);
  const owner = await r.register("schedule-owner@isolated.test");
  const other = await r.register("schedule-other@isolated.test");
  const save = async (user: typeof owner, profile: Record<string,unknown>) => {
    const result = await r.api.restaurants.POST(r.request(user,"/api/restaurants","POST",profile));
    assert.equal(result.status,200,JSON.stringify(await result.clone().json()));
  };
  const friday = hours([5,6,7],"22:00","06:00");
  await save(owner,{...base,...friday});
  assert.deepEqual((await read(r,owner,owner.activeVenueId)).workingDays,friday.workingDays);
  assert.equal((await read(r,owner,owner.activeVenueId)).closeTime,"06:00");
  const weekdays=hours([1,2,3,4,5],"09:00","18:00");
  await save(owner,{...base,...weekdays});
  assert.deepEqual((await read(r,owner,owner.activeVenueId)).workingDays,weekdays.workingDays);
  const everyday=hours([1,2,3,4,5,6,7],"10:00","23:00");
  const created=await r.api.venues.POST(r.request(owner,"/api/venues","POST",{...base,name:"Дополнительное",...everyday}));
  assert.equal(created.status,201,JSON.stringify(await created.clone().json()));
  const id=((await created.json()) as {activeVenueId:number}).activeVenueId;
  assert.deepEqual((await read(r,owner,id)).workingDays,everyday.workingDays);
  assert.deepEqual((await read(r,owner,owner.activeVenueId)).workingDays,weekdays.workingDays);
  assert.equal(await read(r,other,other.activeVenueId),null);
  const denied=await r.api.restaurants.POST(new Request("https://isolated.test/api/restaurants",{method:"POST",headers:{"Content-Type":"application/json","X-Session-Email":other.email,"X-Session-Token":other.token,"X-Venue-Id":String(id)},body:JSON.stringify({...base,...friday})}));
  assert.notEqual(denied.status,200);
  assert.deepEqual((await read(r,owner,id)).workingDays,everyday.workingDays);
  await save(other,{...base,openTime:"11:00",closeTime:"19:00"});
  const legacy=await read(r,other,other.activeVenueId);
  assert.equal(legacy.workingDays,undefined);
  assert.equal(legacy.openTime,"11:00");
  assert.equal(legacy.closeTime,"19:00");
});

test("Sunday 22:00 shift ends on Monday 06:00 in the actual client scheduler", () => {
  const bundle=fs.readFileSync("public/assets/index-BQGspy0I.js","utf8");
  const start=bundle.indexOf("function Ig("),end=bundle.indexOf("function wo(",start);
  assert.ok(start>0&&end>start);
  const context: Record<string,unknown>={
    xM:(value:string)=>value.split(":").map(Number),
    Cz:(date:Date)=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-"),
    Rg:(profile:{workingDays:Record<string,boolean>},date:Date)=>profile.workingDays[String(date.getDay()||7)]===true,
    profile:{openTime:"22:00",closeTime:"06:00",workingDays:hours([7],"22:00","06:00").workingDays},
    sunday:new Date(2026,8,20,12),
    monday:new Date(2026,8,21,5)
  };
  vm.runInNewContext(bundle.slice(start,end)+";globalThis.result=$g(profile,sunday,monday)",context);
  const result=context.result as {status:string;bounds:{operatingDate:string;end:Date;overnight:boolean}};
  assert.equal(result.status,"active");
  assert.equal(result.bounds.operatingDate,"2026-09-20");
  assert.equal(result.bounds.end.getDay(),1);
  assert.equal(result.bounds.end.getHours(),6);
  assert.equal(result.bounds.overnight,true);
});
test("all venue entrypoints use the shared schedule editor without duplicate day controls", () => {
  const bundle=fs.readFileSync("public/assets/index-BQGspy0I.js","utf8");
  const initializer=bundle.slice(bundle.indexOf("function QCe("),bundle.indexOf("function ZCe("));
  assert.doesNotMatch(initializer,/workingDays:e.workingDays\?\?/);
  const wizard=bundle.slice(bundle.indexOf("function Ule("),bundle.indexOf("function Vle("));
  const profile=bundle.slice(bundle.indexOf("function bdProfileVenueV281("),bundle.indexOf("function bdProfileCurrencyV281("));
  const standalone=fs.readFileSync("app/venues/new/route.ts","utf8");
  assert.match(wizard,/bdVenueScheduleReact/);
  assert.doesNotMatch(wizard,/label:"Открытие"/);
  assert.match(profile,/bdVenueScheduleReact/);
  assert.doesNotMatch(profile,/children:"Рабочие дни"/);
  assert.match(standalone,/<bd-venue-schedule><\/bd-venue-schedule>/);
  assert.doesNotMatch(standalone,/name="day"/);
  assert.match(fs.readFileSync("public/venue-create.js","utf8"),/form.querySelector\("bd-venue-schedule"\).value/);
});
