import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {createRequire} from 'node:module';
import {chromium} from 'playwright-core';
import {GET} from '../app/opportunities/route';
const require=createRequire(import.meta.url),{resolveBrowserExecutable,chromiumArgs}=require('./browser-runtime.cjs');
const browser=await chromium.launch({executablePath:await resolveBrowserExecutable(chromium.executablePath()),args:chromiumArgs,headless:true});
const event={id:'local-event',title:'Локальное событие',category:'holiday',startDate:'2027-01-15',activationDate:'2027-01-15',potentialScore:80,decision:'planned',recommendation:{leadDays:7},notificationPlan:{status:'disabled',count:0},sourceUrls:[],whyUseful:[]};
const payload={ok:true,restaurant:{name:'Локальная проверка',timezone:'UTC'},calendar:{events:[event],sources:[],windowStart:'2026-10-01',windowEnd:'2027-10-01'},notificationStatus:{enabled:true,calendarAlerts:true,serverConfigured:true}};
const dir='outputs/rv05';mkdirSync(dir,{recursive:true});let writes=0;
try{const page=await browser.newPage();await page.route('**/*',async route=>{
 const req=route.request(),url=new URL(req.url());if(req.method()!=='GET')writes++;
 if(url.hostname!=='localhost')return route.abort();
 if(url.pathname==='/opportunities')return route.fulfill({status:200,contentType:'text/html',body:await (await GET(new Request(url))).text()});
 if(url.pathname==='/api/opportunities')return route.fulfill({json:payload});
 if(url.pathname.startsWith('/api/'))return route.fulfill({json:{ok:true,venues:[]}});
 const path=resolve('dist/client','.'+url.pathname);if(existsSync(path))return route.fulfill({body:readFileSync(path),contentType:extname(path)==='.js'?'application/javascript':extname(path)==='.css'?'text/css':'image/svg+xml'});return route.fulfill({status:404,body:''});
});
 for(const width of [390,820,1280]){await page.setViewportSize({width,height:900});await page.goto('http://localhost/opportunities?embedded=1');await page.getByText('Подробнее',{exact:true}).click();await page.getByText('Для события напоминания не запланированы',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:dir+'/calendar-'+width+'.png',fullPage:true});}
 payload.notificationStatus.calendarAlerts=false;await page.reload();await page.getByText('Подробнее',{exact:true}).click();await page.getByText('Уведомления календаря выключены в настройках',{exact:true}).waitFor();payload.notificationStatus.calendarAlerts=true;payload.notificationStatus.serverConfigured=false;await page.reload();await page.getByText('Подробнее',{exact:true}).click();await page.getByText('Отправка уведомлений пока не настроена',{exact:true}).waitFor();
 payload.notificationStatus.serverConfigured=true;event.notificationPlan.status='unavailable';await page.reload();await page.getByText('Подробнее',{exact:true}).click();await page.getByText('Нет получателей с настроенными уведомлениями календаря',{exact:true}).waitFor();
 for(const width of [390,820,1280]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:dir+'/unavailable-'+width+'.png',fullPage:true});}
 assert.equal(writes,0);console.log('PASS actual calendar UI, stale disabled/current enabled, category off, server unavailable, reload,390/820/1280, zero writes or external calls');
}finally{await browser.close()}
