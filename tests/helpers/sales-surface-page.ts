import type { Page, Locator, Frame } from 'playwright-core';

/** Same UI assertions on a direct document and its canonical SPA iframe host. */
export function salesSurfacePage(page:Page):Page {
  async function surface():Promise<Page|Frame>{
    const path=new URL(page.url()).pathname;
    if(!['/cashier','/sales-entry'].includes(path)||!await page.locator('#root').count())return page;
    const host=page.locator('iframe[data-bd-sales-surface]');await host.waitFor();
    const handle=await host.elementHandle();const frame=await handle?.contentFrame();
    if(!frame)throw Error('Sales iframe did not attach');
    await frame.waitForURL(url=>url.pathname===path);return frame;
  }
  type Step={method:string;args:unknown[]};
  const chainMethods=new Set(['locator','getByRole','getByText','getByLabel','getByPlaceholder','getByTestId','filter','first','last','nth']);
  function lazy(steps:Step[],top=false):Locator{
    return new Proxy({} as Locator,{get(_target,key){
      if(key==='then')return undefined;
      if(chainMethods.has(String(key)))return (...args:unknown[])=>lazy([...steps,{method:String(key),args}],top);
      return async(...args:unknown[])=>{
        let target:unknown=top?page:await surface();
        for(const step of steps){const current=target as Record<string, (...values:unknown[])=>unknown>;target=current[step.method].apply(target,step.args);}
        const locator=target as Record<string,(...values:unknown[])=>unknown>;return locator[String(key)].apply(target,args);
      };
    }});
  }
  return new Proxy(page,{get(target,key){
    if(chainMethods.has(String(key)))return (...args:unknown[])=>lazy([{method:String(key),args}],String(args[0]).includes('iframe'));
    if(key==='evaluate'||key==='waitForFunction')return async(...args:unknown[])=>{const current=await surface();const method=Reflect.get(current,key) as (...values:unknown[])=>unknown;return method.apply(current,args)};
    const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
  }});
}

