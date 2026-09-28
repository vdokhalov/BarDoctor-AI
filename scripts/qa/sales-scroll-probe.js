/* QA only; injected by the browser runner, never served by application HTML. */
(() => {
 const q=window.__scrollQA={events:[],listeners:[],observerCallbacks:0};
 const add=(kind,data={})=>q.events.push({kind,t:performance.now(),url:location.href,scrollY,viewport:visualViewport?.height,height:document.documentElement.scrollHeight,...data});
 const native=window.ResizeObserver;window.ResizeObserver=class extends native {constructor(fn){super((entries,observer)=>{q.observerCallbacks++;add('resize-observer',{sizes:entries.map(e=>({target:e.target.className,width:e.contentRect.width,height:e.contentRect.height}))});fn(entries,observer)})}};
 for(const key of ['scrollTo','scrollBy']){const original=window[key];window[key]=function(...args){add(key,{args,stack:new Error().stack});return original.apply(this,args)}}
 const original=Element.prototype.scrollIntoView;Element.prototype.scrollIntoView=function(...args){add('scrollIntoView',{target:this.id||this.className,args});return original.apply(this,args)};
 const listen=EventTarget.prototype.addEventListener;EventTarget.prototype.addEventListener=function(type,fn,options){if(/touch|pointer|wheel/.test(type))q.listeners.push({type,target:this.tagName||'window',options});return listen.call(this,type,fn,options)};
 addEventListener('scroll',()=>add('scroll'),true);addEventListener('resize',()=>add('resize'));addEventListener('focusin',e=>add('focus',{target:e.target.id}));
 if(visualViewport)visualViewport.addEventListener('resize',()=>add('visual-resize'));
 try{new PerformanceObserver(list=>{for(const e of list.getEntries())add('layout-shift',{value:e.value,recentInput:e.hadRecentInput})}).observe({type:'layout-shift',buffered:true})}catch{}
})();
