(function () {
  var root=document.documentElement,art=document.querySelector('.bd-splash-art-v529'),stage=document.querySelector('.bd-splash-art-stage-v529');
  var standalone=navigator.standalone===true||matchMedia('(display-mode: standalone)').matches;
  var viewport=document.querySelector('meta[name="viewport"]'),status=document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  // Only this declared edge-to-edge launch mode has a known screen origin.
  // safe-area insets protect content INSIDE that viewport; subtracting them
  // would move the artwork twice. Do not infer a top origin from missing height.
  if(!art||!stage||!standalone||!root.hasAttribute('data-bd-launch-raster-v396')||!viewport||!viewport.content.includes('viewport-fit=cover')||!status||status.content!=='black-translucent')return;
  var width=Math.round(screen.width),height=Math.round(screen.height),frame=0;
  if(innerWidth!==width||width>=height)return;
  // Keep the same CSS cover arithmetic/rounding used to generate native PNGs.
  function align(){
    if(!art.isConnected||root.getAttribute('data-bd-startup-pending')!=='v201')return;
    var rect=art.getBoundingClientRect(),view=window.visualViewport;
    // DOM rects are layout-viewport coordinates. Translate the screen origin
    // through the visual viewport, then through the artwork container origin.
    // This also cancels an ancestor's safe-area padding/translation.
    var x=(view?view.offsetLeft:0)-rect.left,y=(view?view.offsetTop:0)-rect.top;
    stage.style.cssText='left:calc('+x+'px + '+width+'px / 2);top:calc('+y+'px + '+height+'px / 2);width:max('+width+'px,calc('+height+'px * 853 / 1844));height:max('+height+'px,calc('+width+'px * 1844 / 853));transform:translate(-50%,-50%)';
    frame=requestAnimationFrame(align);
  }
  align();
  var observer=new MutationObserver(function(){if(!art.isConnected||root.getAttribute('data-bd-startup-pending')!=='v201'){cancelAnimationFrame(frame);observer.disconnect();}});
  observer.observe(root,{attributes:true,attributeFilter:['data-bd-startup-pending'],childList:true,subtree:true});
})();
