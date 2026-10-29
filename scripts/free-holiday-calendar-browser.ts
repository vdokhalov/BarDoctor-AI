import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {createRequire} from 'node:module';
import {chromium} from 'playwright-core';
import {GET} from '../app/opportunities/route';
const require=createRequire(import.meta.url),{resolveBrowserExecutable,chromiumArgs}=require('./browser-runtime.cjs');
const browser=await chromium.launch({executablePath:await resolveBrowserExecutable(chromium.executablePath()),args:chromiumArgs,headless:true});
const autoMode=process.argv.includes('--auto');
const event={id:'holiday',title:'День Конституции Казахстана',summary:'Национальный праздник. Источник: Основные праздники · проверено 28.10.2026.',category:'holiday',startDate:'2027-03-15',activationDate:'2027-03-15',potentialScore:0,assessmentAvailable:false,evidenceAssessment:{label:'Предварительная оценка',schedule:'По текущему графику заведение открыто с 10:00 до 18:00.',history:'Закрытых дней с тем же днём недели и временем работы за последние 8 недель: 4. Это не прогноз на праздник.',conclusion:'Влияние события на спрос пока не подтверждено.'},decision:'watching',recommendation:{leadDays:14},notificationPlan:{status:'unavailable',count:0},sourceUrls:['https://www.gov.kz/org/enbek/documents/details/1034069?lang=ru'],whyUseful:[]};
const payload={ok:true,restaurant:{name:'Локальная проверка',timezone:'Asia/Almaty'},calendar:{summary:'Список неполный. Курбан айт на 2027 год ожидает официального уточнения. График работы заведения не меняется.',events:[event],sources:[{url:event.sourceUrls[0],title:'Основные праздники · проверено 28.10.2026'}],windowStart:'2026-10-28',windowEnd:'2027-12-31'},notificationStatus:{enabled:true,calendarAlerts:true,serverConfigured:true}};
if(autoMode){event.title='День работника гражданской авиации';event.startDate='2027-06-24';event.activationDate='2027-06-24';payload.restaurant.timezone='Europe/Chisinau';payload.calendar.summary='Список неполный: профессиональные и памятные даты сверены частично.';}
const heldMode=process.argv.includes('--held');
const movedMode=process.argv.includes('--moved');
if(movedMode)Object.assign(event,{sourceScheduleChanged:true});
if(heldMode){event.summary='Дата отсутствует в последнем ответе справочника. Сохранена для проверки.';Object.assign(event,{sourceMissing:true});Object.assign(event.notificationPlan,{status:'error',error:'Отмена прежнего напоминания не подтверждена. Повторите позже.'});}
const sync={supported:autoMode,allowed:autoMode,due:autoMode};
const dir=movedMode?'outputs/holiday-source-moved':heldMode?'outputs/holiday-source-held':autoMode?'outputs/holiday-auto-sync':'outputs/free-holidays';mkdirSync(dir,{recursive:true});let refreshes=0,automatic=0,external=0,dialogs=0;
try{const page=await browser.newPage();page.on('dialog',async dialog=>{dialogs++;await dialog.dismiss()});await page.route('**/*',async route=>{
 const req=route.request(),url=new URL(req.url());
 if(url.hostname!=='localhost'){external++;return route.abort()}
 if(url.pathname==='/opportunities')return route.fulfill({status:200,contentType:'text/html',body:await (await GET(new Request(url))).text()});
 if(url.pathname==='/api/opportunities'){
  if(req.method()==='POST'){refreshes++;if(req.postDataJSON().automatic){automatic++;sync.due=false;}assert.equal(req.postDataJSON().action,'refresh');return route.fulfill({json:{...payload,sync,partial:true,warning:'Показаны основные праздники. Список неполный; график работы заведения не меняется.'}})}
  assert.equal(req.method(),'GET');return route.fulfill({json:{...payload,sync}});
 }
 if(url.pathname.startsWith('/api/'))return route.fulfill({json:{ok:true,venues:[]}});
 const path=resolve('dist/client','.'+url.pathname);if(existsSync(path))return route.fulfill({body:readFileSync(path),contentType:extname(path)==='.js'?'application/javascript':extname(path)==='.css'?'text/css':'image/svg+xml'});return route.fulfill({status:404,body:''});
});
 for(const width of [390,820,1280]){sync.due=autoMode;await page.setViewportSize({width,height:900});await page.goto('http://localhost/opportunities?embedded=1');await page.getByText('Без балла',{exact:true}).waitFor();await page.getByText('Подробнее',{exact:true}).click();assert.equal(await page.getByText('Факторы оценки',{exact:true}).count(),0);if(movedMode)await page.getByText('Дата обновлена. Напоминания будут перенесены после отмены прежних.',{exact:true}).waitFor();if(heldMode)await page.getByText('Дата требует проверки. Новые напоминания приостановлены; ранее переданные могут прийти.',{exact:true}).waitFor();await page.getByRole('link',{name:'Основные праздники · проверено 28.10.2026'}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:dir+'/calendar-'+width+'.png',fullPage:true});await page.locator('#refresh-calendar').click();await page.getByText('Показаны основные праздники. Список неполный; график работы заведения не меняется.',{exact:true}).waitFor();await page.reload();await page.getByText('Без балла',{exact:true}).waitFor();await page.locator('#calendar-coverage').getByText('Список неполный',{exact:false}).waitFor();}
 assert.equal(refreshes,autoMode?6:3);assert.equal(automatic,autoMode?3:0);assert.equal(external,0);assert.equal(dialogs,0);console.log('PASS actual UI390/820/1280, unknown assessment, attribution, refresh without paid dialog, reserve warning, reload; mocked API, no external requests');
}finally{await browser.close()}
