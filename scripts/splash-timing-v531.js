(function () {
  var root=document.documentElement,node=document.querySelector('[data-bd-static-startup="v201"]');
  if(!node||root.getAttribute('data-bd-startup-pending')!=='v201')return;
  var started=null,callback=null,timer=0,frame=0,finished=false,fading=false;
  var image=node.querySelector('.bd-splash-art-stage-v529 img'),imageReady=!image;
  if(image)image.decode().then(function(){imageReady=true;},function(){imageReady=true;});
  var reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  function event(name){window.dispatchEvent(new CustomEvent('bd:splash-'+name,{detail:{at:performance.now()}}));}
  function cancel(){finished=true;clearTimeout(timer);cancelAnimationFrame(frame);observer.disconnect();}
  function complete(){if(finished)return;var done=callback;cancel();event('finished');if(done)done();}
  function fade(){
    if(finished||fading)return;
    if(started!==null&&performance.now()-started<1500){schedule();return;}
    if(!node.isConnected||root.getAttribute('data-bd-startup-pending')!=='v201'){cancel();return;}
    fading=true;event('fade');
    if(reduced.matches){complete();return;}
    node.setAttribute('data-bd-splash-fading','');timer=setTimeout(complete,180);
  }
  function schedule(){if(started===null||!callback||finished||fading)return;clearTimeout(timer);timer=setTimeout(fade,Math.max(0,Math.ceil(1500-(performance.now()-started))));}
  function visible(){
    if(finished)return;
    var style=getComputedStyle(node);
    if(imageReady&&!document.hidden&&node.isConnected&&style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)>0){started=performance.now();event('visible');schedule();}
    else frame=requestAnimationFrame(visible);
  }
  // Recovery owns immediate exit. Never restore a pending attribute or removed node.
  var observer=new MutationObserver(function(){if(!node.isConnected||root.getAttribute('data-bd-startup-pending')!=='v201')cancel();});
  observer.observe(root,{attributes:true,attributeFilter:['data-bd-startup-pending'],childList:true,subtree:true});
  window.bdSplashReadyV531=function(done){if(finished)return false;if(!callback)event('ready');callback=done;schedule();return true;};
  frame=requestAnimationFrame(visible);
})();
