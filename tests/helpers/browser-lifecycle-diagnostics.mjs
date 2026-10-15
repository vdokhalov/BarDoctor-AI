/** Read-only QA instrumentation. No application exceptions or failed requests are filtered. */
export async function browserLifecycleDiagnostics(page){
 const events=[],requests=new WeakMap();let sequence=0;
 const record=(type,data={})=>{const item={type,hostTime:Date.now(),url:page.url(),...data};events.push(item);if(type==='pageerror'||type==='requestfailed')console.log('OWNER_LIFECYCLE',JSON.stringify(item));};
 page.on('pageerror',error=>record('pageerror',{message:error.message,stack:error.stack}));
 page.on('framenavigated',frame=>{if(frame===page.mainFrame())record('navigation',{destination:frame.url()});});
 page.on('request',request=>{if(!new URL(request.url()).pathname.startsWith('/api/'))return;requests.set(request,++sequence);record('request',{id:sequence,path:new URL(request.url()).pathname,method:request.method()});});
 page.on('response',response=>{const id=requests.get(response.request());if(id)record('response',{id,status:response.status()});});
 page.on('requestfinished',request=>{const id=requests.get(request);if(id)record('requestfinished',{id});});
 page.on('requestfailed',request=>{const id=requests.get(request);if(id)record('requestfailed',{id,path:new URL(request.url()).pathname,failure:request.failure()});});
 await page.exposeBinding('__bdLifecycleDiagnostic',(_source,event)=>record('document',event));
 await page.addInitScript(()=>{
  const send=(event,extra={})=>{void window.__bdLifecycleDiagnostic({event,documentTimeOrigin:performance.timeOrigin,documentTime:performance.now(),documentUrl:location.href,...extra}).catch(()=>{});};
  send('init');addEventListener('pagehide',()=>send('pagehide'));addEventListener('pageshow',()=>send('pageshow'));addEventListener('unhandledrejection',event=>send('unhandledrejection',{message:String(event.reason),stack:event.reason?.stack}));
 });
 return {events,mark:(label)=>record('forced-navigation',{label})};
}
