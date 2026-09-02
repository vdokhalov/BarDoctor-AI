/* bd-cookie-session-v403 */
const bdOwnerUATFixesV285="owner-uat-v285";const bdOwnerUATFixesV294="owner-uat-v294";const bdInvoiceRecognitionV2="invoice-recognition-v2";const bdInvoiceRecognitionQaStorageV2="bd.invoiceRecognitionQa",bdInvoiceRecognitionQaRequestedV2=(()=>{let e=new URLSearchParams(window.location.search).get("invoiceRecognitionQa");try{e==="shadow"||e==="ai-unavailable"?sessionStorage.setItem(bdInvoiceRecognitionQaStorageV2,e):e=sessionStorage.getItem(bdInvoiceRecognitionQaStorageV2)}catch{}return e==="shadow"||e==="ai-unavailable"?e:""})();function bdInvoiceRecognitionQaUrlV2(){const e=bdInvoiceRecognitionQaRequestedV2;try{sessionStorage.removeItem(bdInvoiceRecognitionQaStorageV2)}catch{}return e==="shadow"?"/api/purchases/scan?qa=shadow":e==="ai-unavailable"?"/api/purchases/scan?qa=ai-unavailable":"/api/purchases/scan"}const bdMenuSaleSizePatchV298="menu-sale-size-patch-v298";const bdOwnerUATFixesV286="owner-uat-v286";const bdOwnerUATFixesV295="owner-uat-v295";const bdOwnerUATFixesV293="owner-uat-v293";const bdOwnerUATFixesV292="owner-uat-v292";const bdOwnerUATFixesV291="owner-uat-v291";const bdOwnerUATFixesV290="owner-uat-v290";const bdOwnerUATFixesV289="owner-uat-v289";const bdOwnerUATFixesV288="owner-uat-v288";const bdOwnerUATFixesV287="owner-uat-v287";function NW(e,t){for(var n=0;n<t.length;n++){const r=t[n];if(typeof r!="string"&&!Array.isArray(r)){for(const a in r)if(a!=="default"&&!(a in e)){const s=Object.getOwnPropertyDescriptor(r,a);s&&Object.defineProperty(e,a,s.get?s:{enumerable:!0,get:()=>r[a]})}}}return Object.freeze(Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}))}(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))r(a);new MutationObserver(a=>{for(const s of a)if(s.type==="childList")for(const l of s.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&r(l)}).observe(document,{childList:!0,subtree:!0});function n(a){const s={};return a.integrity&&(s.integrity=a.integrity),a.referrerPolicy&&(s.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?s.credentials="include":a.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function r(a){if(a.ep)return;a.ep=!0;const s=n(a);fetch(a.href,s)}})();var ph=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};function Et(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}var Vb={exports:{}},Ju={};var UO;function AW(){if(UO)return Ju;UO=1;var e=Symbol.for("react.transitional.element"),t=Symbol.for("react.fragment");function n(r,a,s){var l=null;if(s!==void 0&&(l=""+s),a.key!==void 0&&(l=""+a.key),"key"in a){s={};for(var u in a)u!=="key"&&(s[u]=a[u])}else s=a;return a=s.ref,{$$typeof:e,type:r,key:l,ref:a!==void 0?a:null,props:s}}return Ju.Fragment=t,Ju.jsx=n,Ju.jsxs=n,Ju}var VO;function CW(){return VO||(VO=1,Vb.exports=AW()),Vb.exports}var i=CW(),Hb={exports:{}},ed={},Gb={exports:{}},Wb={};var HO;function _W(){return HO||(HO=1,(function(e){function t(I,V){var F=I.length;I.push(V);e:for(;0<F;){var Z=F-1>>>1,R=I[Z];if(0<a(R,V))I[Z]=V,I[F]=R,F=Z;else break e}}function n(I){return I.length===0?null:I[0]}function r(I){if(I.length===0)return null;var V=I[0],F=I.pop();if(F!==V){I[0]=F;e:for(var Z=0,R=I.length,K=R>>>1;Z<K;){var Y=2*(Z+1)-1,ne=I[Y],ae=Y+1,ce=I[ae];if(0>a(ne,F))ae<R&&0>a(ce,ne)?(I[Z]=ce,I[ae]=F,Z=ae):(I[Z]=ne,I[Y]=F,Z=Y);else if(ae<R&&0>a(ce,F))I[Z]=ce,I[ae]=F,Z=ae;else break e}}return V}function a(I,V){var F=I.sortIndex-V.sortIndex;return F!==0?F:I.id-V.id}if(e.unstable_now=void 0,typeof performance=="object"&&typeof performance.now=="function"){var s=performance;e.unstable_now=function(){return s.now()}}else{var l=Date,u=l.now();e.unstable_now=function(){return l.now()-u}}var d=[],f=[],m=1,h=null,g=3,y=!1,j=!1,v=!1,b=!1,N=typeof setTimeout=="function"?setTimeout:null,E=typeof clearTimeout=="function"?clearTimeout:null,_=typeof setImmediate<"u"?setImmediate:null;function T(I){for(var V=n(f);V!==null;){if(V.callback===null)r(f);else if(V.startTime<=I)r(f),V.sortIndex=V.expirationTime,t(d,V);else break;V=n(f)}}function A(I){if(v=!1,T(I),!j)if(n(d)!==null)j=!0,k||(k=!0,q());else{var V=n(f);V!==null&&H(A,V.startTime-I)}}var k=!1,O=-1,M=5,D=-1;function z(){return b?!0:!(e.unstable_now()-D<M)}function L(){if(b=!1,k){var I=e.unstable_now();D=I;var V=!0;try{e:{j=!1,v&&(v=!1,E(O),O=-1),y=!0;var F=g;try{t:{for(T(I),h=n(d);h!==null&&!(h.expirationTime>I&&z());){var Z=h.callback;if(typeof Z=="function"){h.callback=null,g=h.priorityLevel;var R=Z(h.expirationTime<=I);if(I=e.unstable_now(),typeof R=="function"){h.callback=R,T(I),V=!0;break t}h===n(d)&&r(d),T(I)}else r(d);h=n(d)}if(h!==null)V=!0;else{var K=n(f);K!==null&&H(A,K.startTime-I),V=!1}}break e}finally{h=null,g=F,y=!1}V=void 0}}finally{V?q():k=!1}}}var q;if(typeof _=="function")q=function(){_(L)};else if(typeof MessageChannel<"u"){var B=new MessageChannel,U=B.port2;B.port1.onmessage=L,q=function(){U.postMessage(null)}}else q=function(){N(L,0)};function H(I,V){O=N(function(){I(e.unstable_now())},V)}e.unstable_IdlePriority=5,e.unstable_ImmediatePriority=1,e.unstable_LowPriority=4,e.unstable_NormalPriority=3,e.unstable_Profiling=null,e.unstable_UserBlockingPriority=2,e.unstable_cancelCallback=function(I){I.callback=null},e.unstable_forceFrameRate=function(I){0>I||125<I?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):M=0<I?Math.floor(1e3/I):5},e.unstable_getCurrentPriorityLevel=function(){return g},e.unstable_next=function(I){switch(g){case 1:case 2:case 3:var V=3;break;default:V=g}var F=g;g=V;try{return I()}finally{g=F}},e.unstable_requestPaint=function(){b=!0},e.unstable_runWithPriority=function(I,V){switch(I){case 1:case 2:case 3:case 4:case 5:break;default:I=3}var F=g;g=I;try{return V()}finally{g=F}},e.unstable_scheduleCallback=function(I,V,F){var Z=e.unstable_now();switch(typeof F=="object"&&F!==null?(F=F.delay,F=typeof F=="number"&&0<F?Z+F:Z):F=Z,I){case 1:var R=-1;break;case 2:R=250;break;case 5:R=1073741823;break;case 4:R=1e4;break;default:R=5e3}return R=F+R,I={id:m++,callback:V,priorityLevel:I,startTime:F,expirationTime:R,sortIndex:-1},F>Z?(I.sortIndex=F,t(f,I),n(d)===null&&I===n(f)&&(v?(E(O),O=-1):v=!0,H(A,F-Z))):(I.sortIndex=R,t(d,I),j||y||(j=!0,k||(k=!0,q()))),I},e.unstable_shouldYield=z,e.unstable_wrapCallback=function(I){var V=g;return function(){var F=g;g=V;try{return I.apply(this,arguments)}finally{g=F}}}})(Wb)),Wb}var GO;function EW(){return GO||(GO=1,Gb.exports=_W()),Gb.exports}var Kb={exports:{}},Be={};var WO;function TW(){if(WO)return Be;WO=1;var e=Symbol.for("react.transitional.element"),t=Symbol.for("react.portal"),n=Symbol.for("react.fragment"),r=Symbol.for("react.strict_mode"),a=Symbol.for("react.profiler"),s=Symbol.for("react.consumer"),l=Symbol.for("react.context"),u=Symbol.for("react.forward_ref"),d=Symbol.for("react.suspense"),f=Symbol.for("react.memo"),m=Symbol.for("react.lazy"),h=Symbol.iterator;function g(R){return R===null||typeof R!="object"?null:(R=h&&R[h]||R["@@iterator"],typeof R=="function"?R:null)}var y={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},j=Object.assign,v={};function b(R,K,Y){this.props=R,this.context=K,this.refs=v,this.updater=Y||y}b.prototype.isReactComponent={},b.prototype.setState=function(R,K){if(typeof R!="object"&&typeof R!="function"&&R!=null)throw Error("takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,R,K,"setState")},b.prototype.forceUpdate=function(R){this.updater.enqueueForceUpdate(this,R,"forceUpdate")};function N(){}N.prototype=b.prototype;function E(R,K,Y){this.props=R,this.context=K,this.refs=v,this.updater=Y||y}var _=E.prototype=new N;_.constructor=E,j(_,b.prototype),_.isPureReactComponent=!0;var T=Array.isArray,A={H:null,A:null,T:null,S:null,V:null},k=Object.prototype.hasOwnProperty;function O(R,K,Y,ne,ae,ce){return Y=ce.ref,{$$typeof:e,type:R,key:K,ref:Y!==void 0?Y:null,props:ce}}function M(R,K){return O(R.type,K,void 0,void 0,void 0,R.props)}function D(R){return typeof R=="object"&&R!==null&&R.$$typeof===e}function z(R){var K={"=":"=0",":":"=2"};return"$"+R.replace(/[=:]/g,function(Y){return K[Y]})}var L=/\/+/g;function q(R,K){return typeof R=="object"&&R!==null&&R.key!=null?z(""+R.key):K.toString(36)}function B(){}function U(R){switch(R.status){case"fulfilled":return R.value;case"rejected":throw R.reason;default:switch(typeof R.status=="string"?R.then(B,B):(R.status="pending",R.then(function(K){R.status==="pending"&&(R.status="fulfilled",R.value=K)},function(K){R.status==="pending"&&(R.status="rejected",R.reason=K)})),R.status){case"fulfilled":return R.value;case"rejected":throw R.reason}}throw R}function H(R,K,Y,ne,ae){var ce=typeof R;(ce==="undefined"||ce==="boolean")&&(R=null);var ge=!1;if(R===null)ge=!0;else switch(ce){case"bigint":case"string":case"number":ge=!0;break;case"object":switch(R.$$typeof){case e:case t:ge=!0;break;case m:return ge=R._init,H(ge(R._payload),K,Y,ne,ae)}}if(ge)return ae=ae(R),ge=ne===""?"."+q(R,0):ne,T(ae)?(Y="",ge!=null&&(Y=ge.replace(L,"$&/")+"/"),H(ae,K,Y,"",function(fe){return fe})):ae!=null&&(D(ae)&&(ae=M(ae,Y+(ae.key==null||R&&R.key===ae.key?"":(""+ae.key).replace(L,"$&/")+"/")+ge)),K.push(ae)),1;ge=0;var ye=ne===""?".":ne+":";if(T(R))for(var je=0;je<R.length;je++)ne=R[je],ce=ye+q(ne,je),ge+=H(ne,K,Y,ce,ae);else if(je=g(R),typeof je=="function")for(R=je.call(R),je=0;!(ne=R.next()).done;)ne=ne.value,ce=ye+q(ne,je++),ge+=H(ne,K,Y,ce,ae);else if(ce==="object"){if(typeof R.then=="function")return H(U(R),K,Y,ne,ae);throw K=String(R),Error("Objects are not valid as a React child (found: "+(K==="[object Object]"?"object with keys {"+Object.keys(R).join(", ")+"}":K)+"). If you meant to render a collection of children, use an array instead.")}return ge}function I(R,K,Y){if(R==null)return R;var ne=[],ae=0;return H(R,ne,"","",function(ce){return K.call(Y,ce,ae++)}),ne}function V(R){if(R._status===-1){var K=R._result;K=K(),K.then(function(Y){(R._status===0||R._status===-1)&&(R._status=1,R._result=Y)},function(Y){(R._status===0||R._status===-1)&&(R._status=2,R._result=Y)}),R._status===-1&&(R._status=0,R._result=K)}if(R._status===1)return R._result.default;throw R._result}var F=typeof reportError=="function"?reportError:function(R){if(typeof window=="object"&&typeof window.ErrorEvent=="function"){var K=new window.ErrorEvent("error",{bubbles:!0,cancelable:!0,message:typeof R=="object"&&R!==null&&typeof R.message=="string"?String(R.message):String(R),error:R});if(!window.dispatchEvent(K))return}else if(typeof process=="object"&&typeof process.emit=="function"){process.emit("uncaughtException",R);return}console.error(R)};function Z(){}return Be.Children={map:I,forEach:function(R,K,Y){I(R,function(){K.apply(this,arguments)},Y)},count:function(R){var K=0;return I(R,function(){K++}),K},toArray:function(R){return I(R,function(K){return K})||[]},only:function(R){if(!D(R))throw Error("React.Children.only expected to receive a single React element child.");return R}},Be.Component=b,Be.Fragment=n,Be.Profiler=a,Be.PureComponent=E,Be.StrictMode=r,Be.Suspense=d,Be.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE=A,Be.__COMPILER_RUNTIME={__proto__:null,c:function(R){return A.H.useMemoCache(R)}},Be.cache=function(R){return function(){return R.apply(null,arguments)}},Be.cloneElement=function(R,K,Y){if(R==null)throw Error("The argument must be a React element, but you passed "+R+".");var ne=j({},R.props),ae=R.key,ce=void 0;if(K!=null)for(ge in K.ref!==void 0&&(ce=void 0),K.key!==void 0&&(ae=""+K.key),K)!k.call(K,ge)||ge==="key"||ge==="__self"||ge==="__source"||ge==="ref"&&K.ref===void 0||(ne[ge]=K[ge]);var ge=arguments.length-2;if(ge===1)ne.children=Y;else if(1<ge){for(var ye=Array(ge),je=0;je<ge;je++)ye[je]=arguments[je+2];ne.children=ye}return O(R.type,ae,void 0,void 0,ce,ne)},Be.createContext=function(R){return R={$$typeof:l,_currentValue:R,_currentValue2:R,_threadCount:0,Provider:null,Consumer:null},R.Provider=R,R.Consumer={$$typeof:s,_context:R},R},Be.createElement=function(R,K,Y){var ne,ae={},ce=null;if(K!=null)for(ne in K.key!==void 0&&(ce=""+K.key),K)k.call(K,ne)&&ne!=="key"&&ne!=="__self"&&ne!=="__source"&&(ae[ne]=K[ne]);var ge=arguments.length-2;if(ge===1)ae.children=Y;else if(1<ge){for(var ye=Array(ge),je=0;je<ge;je++)ye[je]=arguments[je+2];ae.children=ye}if(R&&R.defaultProps)for(ne in ge=R.defaultProps,ge)ae[ne]===void 0&&(ae[ne]=ge[ne]);return O(R,ce,void 0,void 0,null,ae)},Be.createRef=function(){return{current:null}},Be.forwardRef=function(R){return{$$typeof:u,render:R}},Be.isValidElement=D,Be.lazy=function(R){return{$$typeof:m,_payload:{_status:-1,_result:R},_init:V}},Be.memo=function(R,K){return{$$typeof:f,type:R,compare:K===void 0?null:K}},Be.startTransition=function(R){var K=A.T,Y={};A.T=Y;try{var ne=R(),ae=A.S;ae!==null&&ae(Y,ne),typeof ne=="object"&&ne!==null&&typeof ne.then=="function"&&ne.then(Z,F)}catch(ce){F(ce)}finally{A.T=K}},Be.unstable_useCacheRefresh=function(){return A.H.useCacheRefresh()},Be.use=function(R){return A.H.use(R)},Be.useActionState=function(R,K,Y){return A.H.useActionState(R,K,Y)},Be.useCallback=function(R,K){return A.H.useCallback(R,K)},Be.useContext=function(R){return A.H.useContext(R)},Be.useDebugValue=function(){},Be.useDeferredValue=function(R,K){return A.H.useDeferredValue(R,K)},Be.useEffect=function(R,K,Y){var ne=A.H;if(typeof Y=="function")throw Error("useEffect CRUD overload is not enabled in this build of React.");return ne.useEffect(R,K)},Be.useId=function(){return A.H.useId()},Be.useImperativeHandle=function(R,K,Y){return A.H.useImperativeHandle(R,K,Y)},Be.useInsertionEffect=function(R,K){return A.H.useInsertionEffect(R,K)},Be.useLayoutEffect=function(R,K){return A.H.useLayoutEffect(R,K)},Be.useMemo=function(R,K){return A.H.useMemo(R,K)},Be.useOptimistic=function(R,K){return A.H.useOptimistic(R,K)},Be.useReducer=function(R,K,Y){return A.H.useReducer(R,K,Y)},Be.useRef=function(R){return A.H.useRef(R)},Be.useState=function(R){return A.H.useState(R)},Be.useSyncExternalStore=function(R,K,Y){return A.H.useSyncExternalStore(R,K,Y)},Be.useTransition=function(){return A.H.useTransition()},Be.version="19.1.0",Be}var KO;function og(){return KO||(KO=1,Kb.exports=TW()),Kb.exports}var Yb={exports:{}},En={};var YO;function kW(){if(YO)return En;YO=1;var e=og();function t(d){var f="https://react.dev/errors/"+d;if(1<arguments.length){f+="?args[]="+encodeURIComponent(arguments[1]);for(var m=2;m<arguments.length;m++)f+="&args[]="+encodeURIComponent(arguments[m])}return"Minified React error #"+d+"; visit "+f+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}function n(){}var r={d:{f:n,r:function(){throw Error(t(522))},D:n,C:n,L:n,m:n,X:n,S:n,M:n},p:0,findDOMNode:null},a=Symbol.for("react.portal");function s(d,f,m){var h=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:a,key:h==null?null:""+h,children:d,containerInfo:f,implementation:m}}var l=e.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;function u(d,f){if(d==="font")return"";if(typeof f=="string")return f==="use-credentials"?f:""}return En.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE=r,En.createPortal=function(d,f){var m=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!f||f.nodeType!==1&&f.nodeType!==9&&f.nodeType!==11)throw Error(t(299));return s(d,f,null,m)},En.flushSync=function(d){var f=l.T,m=r.p;try{if(l.T=null,r.p=2,d)return d()}finally{l.T=f,r.p=m,r.d.f()}},En.preconnect=function(d,f){typeof d=="string"&&(f?(f=f.crossOrigin,f=typeof f=="string"?f==="use-credentials"?f:"":void 0):f=null,r.d.C(d,f))},En.prefetchDNS=function(d){typeof d=="string"&&r.d.D(d)},En.preinit=function(d,f){if(typeof d=="string"&&f&&typeof f.as=="string"){var m=f.as,h=u(m,f.crossOrigin),g=typeof f.integrity=="string"?f.integrity:void 0,y=typeof f.fetchPriority=="string"?f.fetchPriority:void 0;m==="style"?r.d.S(d,typeof f.precedence=="string"?f.precedence:void 0,{crossOrigin:h,integrity:g,fetchPriority:y}):m==="script"&&r.d.X(d,{crossOrigin:h,integrity:g,fetchPriority:y,nonce:typeof f.nonce=="string"?f.nonce:void 0})}},En.preinitModule=function(d,f){if(typeof d=="string")if(typeof f=="object"&&f!==null){if(f.as==null||f.as==="script"){var m=u(f.as,f.crossOrigin);r.d.M(d,{crossOrigin:m,integrity:typeof f.integrity=="string"?f.integrity:void 0,nonce:typeof f.nonce=="string"?f.nonce:void 0})}}else f==null&&r.d.M(d)},En.preload=function(d,f){if(typeof d=="string"&&typeof f=="object"&&f!==null&&typeof f.as=="string"){var m=f.as,h=u(m,f.crossOrigin);r.d.L(d,m,{crossOrigin:h,integrity:typeof f.integrity=="string"?f.integrity:void 0,nonce:typeof f.nonce=="string"?f.nonce:void 0,type:typeof f.type=="string"?f.type:void 0,fetchPriority:typeof f.fetchPriority=="string"?f.fetchPriority:void 0,referrerPolicy:typeof f.referrerPolicy=="string"?f.referrerPolicy:void 0,imageSrcSet:typeof f.imageSrcSet=="string"?f.imageSrcSet:void 0,imageSizes:typeof f.imageSizes=="string"?f.imageSizes:void 0,media:typeof f.media=="string"?f.media:void 0})}},En.preloadModule=function(d,f){if(typeof d=="string")if(f){var m=u(f.as,f.crossOrigin);r.d.m(d,{as:typeof f.as=="string"&&f.as!=="script"?f.as:void 0,crossOrigin:m,integrity:typeof f.integrity=="string"?f.integrity:void 0})}else r.d.m(d)},En.requestFormReset=function(d){r.d.r(d)},En.unstable_batchedUpdates=function(d,f){return d(f)},En.useFormState=function(d,f,m){return l.H.useFormState(d,f,m)},En.useFormStatus=function(){return l.H.useHostTransitionStatus()},En.version="19.1.0",En}var XO;function u9(){if(XO)return Yb.exports;XO=1;function e(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(e)}catch(t){console.error(t)}}return e(),Yb.exports=kW(),Yb.exports}var QO;function OW(){if(QO)return ed;QO=1;var e=EW(),t=og(),n=u9();function r(o){var c="https://react.dev/errors/"+o;if(1<arguments.length){c+="?args[]="+encodeURIComponent(arguments[1]);for(var p=2;p<arguments.length;p++)c+="&args[]="+encodeURIComponent(arguments[p])}return"Minified React error #"+o+"; visit "+c+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}function a(o){return!(!o||o.nodeType!==1&&o.nodeType!==9&&o.nodeType!==11)}function s(o){var c=o,p=o;if(o.alternate)for(;c.return;)c=c.return;else{o=c;do c=o,(c.flags&4098)!==0&&(p=c.return),o=c.return;while(o)}return c.tag===3?p:null}function l(o){if(o.tag===13){var c=o.memoizedState;if(c===null&&(o=o.alternate,o!==null&&(c=o.memoizedState)),c!==null)return c.dehydrated}return null}function u(o){if(s(o)!==o)throw Error(r(188))}function d(o){var c=o.alternate;if(!c){if(c=s(o),c===null)throw Error(r(188));return c!==o?null:o}for(var p=o,x=c;;){var w=p.return;if(w===null)break;var C=w.alternate;if(C===null){if(x=w.return,x!==null){p=x;continue}break}if(w.child===C.child){for(C=w.child;C;){if(C===p)return u(w),o;if(C===x)return u(w),c;C=C.sibling}throw Error(r(188))}if(p.return!==x.return)p=w,x=C;else{for(var P=!1,$=w.child;$;){if($===p){P=!0,p=w,x=C;break}if($===x){P=!0,x=w,p=C;break}$=$.sibling}if(!P){for($=C.child;$;){if($===p){P=!0,p=C,x=w;break}if($===x){P=!0,x=C,p=w;break}$=$.sibling}if(!P)throw Error(r(189))}}if(p.alternate!==x)throw Error(r(190))}if(p.tag!==3)throw Error(r(188));return p.stateNode.current===p?o:c}function f(o){var c=o.tag;if(c===5||c===26||c===27||c===6)return o;for(o=o.child;o!==null;){if(c=f(o),c!==null)return c;o=o.sibling}return null}var m=Object.assign,h=Symbol.for("react.element"),g=Symbol.for("react.transitional.element"),y=Symbol.for("react.portal"),j=Symbol.for("react.fragment"),v=Symbol.for("react.strict_mode"),b=Symbol.for("react.profiler"),N=Symbol.for("react.provider"),E=Symbol.for("react.consumer"),_=Symbol.for("react.context"),T=Symbol.for("react.forward_ref"),A=Symbol.for("react.suspense"),k=Symbol.for("react.suspense_list"),O=Symbol.for("react.memo"),M=Symbol.for("react.lazy"),D=Symbol.for("react.activity"),z=Symbol.for("react.memo_cache_sentinel"),L=Symbol.iterator;function q(o){return o===null||typeof o!="object"?null:(o=L&&o[L]||o["@@iterator"],typeof o=="function"?o:null)}var B=Symbol.for("react.client.reference");function U(o){if(o==null)return null;if(typeof o=="function")return o.$$typeof===B?null:o.displayName||o.name||null;if(typeof o=="string")return o;switch(o){case j:return"Fragment";case b:return"Profiler";case v:return"StrictMode";case A:return"Suspense";case k:return"SuspenseList";case D:return"Activity"}if(typeof o=="object")switch(o.$$typeof){case y:return"Portal";case _:return(o.displayName||"Context")+".Provider";case E:return(o._context.displayName||"Context")+".Consumer";case T:var c=o.render;return o=o.displayName,o||(o=c.displayName||c.name||"",o=o!==""?"ForwardRef("+o+")":"ForwardRef"),o;case O:return c=o.displayName||null,c!==null?c:U(o.type)||"Memo";case M:c=o._payload,o=o._init;try{return U(o(c))}catch{}}return null}var H=Array.isArray,I=t.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,V=n.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,F={pending:!1,data:null,method:null,action:null},Z=[],R=-1;function K(o){return{current:o}}function Y(o){0>R||(o.current=Z[R],Z[R]=null,R--)}function ne(o,c){R++,Z[R]=o.current,o.current=c}var ae=K(null),ce=K(null),ge=K(null),ye=K(null);function je(o,c){switch(ne(ge,c),ne(ce,o),ne(ae,null),c.nodeType){case 9:case 11:o=(o=c.documentElement)&&(o=o.namespaceURI)?gO(o):0;break;default:if(o=c.tagName,c=c.namespaceURI)c=gO(c),o=yO(c,o);else switch(o){case"svg":o=1;break;case"math":o=2;break;default:o=0}}Y(ae),ne(ae,o)}function fe(){Y(ae),Y(ce),Y(ge)}function Ce(o){o.memoizedState!==null&&ne(ye,o);var c=ae.current,p=yO(c,o.type);c!==p&&(ne(ce,o),ne(ae,p))}function he(o){ce.current===o&&(Y(ae),Y(ce)),ye.current===o&&(Y(ye),Ku._currentValue=F)}var le=Object.prototype.hasOwnProperty,Te=e.unstable_scheduleCallback,be=e.unstable_cancelCallback,Ve=e.unstable_shouldYield,rt=e.unstable_requestPaint,We=e.unstable_now,ve=e.unstable_getCurrentPriorityLevel,Re=e.unstable_ImmediatePriority,ot=e.unstable_UserBlockingPriority,lt=e.unstable_NormalPriority,It=e.unstable_LowPriority,Le=e.unstable_IdlePriority,Rn=e.log,ie=e.unstable_setDisableYieldValue,An=null,ln=null;function gr(o){if(typeof Rn=="function"&&ie(o),ln&&typeof ln.setStrictMode=="function")try{ln.setStrictMode(An,o)}catch{}}var jt=Math.clz32?Math.clz32:uH,lH=Math.log,cH=Math.LN2;function uH(o){return o>>>=0,o===0?32:31-(lH(o)/cH|0)|0}var ep=256,tp=4194304;function Ms(o){var c=o&42;if(c!==0)return c;switch(o&-o){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:return 64;case 128:return 128;case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return o&4194048;case 4194304:case 8388608:case 16777216:case 33554432:return o&62914560;case 67108864:return 67108864;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 0;default:return o}}function np(o,c,p){var x=o.pendingLanes;if(x===0)return 0;var w=0,C=o.suspendedLanes,P=o.pingedLanes;o=o.warmLanes;var $=x&134217727;return $!==0?(x=$&~C,x!==0?w=Ms(x):(P&=$,P!==0?w=Ms(P):p||(p=$&~o,p!==0&&(w=Ms(p))))):($=x&~C,$!==0?w=Ms($):P!==0?w=Ms(P):p||(p=x&~o,p!==0&&(w=Ms(p)))),w===0?0:c!==0&&c!==w&&(c&C)===0&&(C=w&-w,p=c&-c,C>=p||C===32&&(p&4194048)!==0)?c:w}function ru(o,c){return(o.pendingLanes&~(o.suspendedLanes&~o.pingedLanes)&c)===0}function dH(o,c){switch(o){case 1:case 2:case 4:case 8:case 64:return c+250;case 16:case 32:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return c+5e3;case 4194304:case 8388608:case 16777216:case 33554432:return-1;case 67108864:case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function eE(){var o=ep;return ep<<=1,(ep&4194048)===0&&(ep=256),o}function tE(){var o=tp;return tp<<=1,(tp&62914560)===0&&(tp=4194304),o}function Py(o){for(var c=[],p=0;31>p;p++)c.push(o);return c}function au(o,c){o.pendingLanes|=c,c!==268435456&&(o.suspendedLanes=0,o.pingedLanes=0,o.warmLanes=0)}function fH(o,c,p,x,w,C){var P=o.pendingLanes;o.pendingLanes=p,o.suspendedLanes=0,o.pingedLanes=0,o.warmLanes=0,o.expiredLanes&=p,o.entangledLanes&=p,o.errorRecoveryDisabledLanes&=p,o.shellSuspendCounter=0;var $=o.entanglements,G=o.expirationTimes,re=o.hiddenUpdates;for(p=P&~p;0<p;){var de=31-jt(p),me=1<<de;$[de]=0,G[de]=-1;var se=re[de];if(se!==null)for(re[de]=null,de=0;de<se.length;de++){var oe=se[de];oe!==null&&(oe.lane&=-536870913)}p&=~me}x!==0&&nE(o,x,0),C!==0&&w===0&&o.tag!==0&&(o.suspendedLanes|=C&~(P&~c))}function nE(o,c,p){o.pendingLanes|=c,o.suspendedLanes&=~c;var x=31-jt(c);o.entangledLanes|=c,o.entanglements[x]=o.entanglements[x]|1073741824|p&4194090}function rE(o,c){var p=o.entangledLanes|=c;for(o=o.entanglements;p;){var x=31-jt(p),w=1<<x;w&c|o[x]&c&&(o[x]|=c),p&=~w}}function Dy(o){switch(o){case 2:o=1;break;case 8:o=4;break;case 32:o=16;break;case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:o=128;break;case 268435456:o=134217728;break;default:o=0}return o}function Ry(o){return o&=-o,2<o?8<o?(o&134217727)!==0?32:268435456:8:2}function aE(){var o=V.p;return o!==0?o:(o=window.event,o===void 0?32:$O(o.type))}function pH(o,c){var p=V.p;try{return V.p=o,c()}finally{V.p=p}}var Mi=Math.random().toString(36).slice(2),Cn="__reactFiber$"+Mi,Vn="__reactProps$"+Mi,qo="__reactContainer$"+Mi,Iy="__reactEvents$"+Mi,hH="__reactListeners$"+Mi,mH="__reactHandles$"+Mi,iE="__reactResources$"+Mi,iu="__reactMarker$"+Mi;function $y(o){delete o[Cn],delete o[Vn],delete o[Iy],delete o[hH],delete o[mH]}function Fo(o){var c=o[Cn];if(c)return c;for(var p=o.parentNode;p;){if(c=p[qo]||p[Cn]){if(p=c.alternate,c.child!==null||p!==null&&p.child!==null)for(o=wO(o);o!==null;){if(p=o[Cn])return p;o=wO(o)}return c}o=p,p=o.parentNode}return null}function Uo(o){if(o=o[Cn]||o[qo]){var c=o.tag;if(c===5||c===6||c===13||c===26||c===27||c===3)return o}return null}function su(o){var c=o.tag;if(c===5||c===26||c===27||c===6)return o.stateNode;throw Error(r(33))}function Vo(o){var c=o[iE];return c||(c=o[iE]={hoistableStyles:new Map,hoistableScripts:new Map}),c}function cn(o){o[iu]=!0}var sE=new Set,oE={};function Ps(o,c){Ho(o,c),Ho(o+"Capture",c)}function Ho(o,c){for(oE[o]=c,o=0;o<c.length;o++)sE.add(c[o])}var xH=RegExp("^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"),lE={},cE={};function gH(o){return le.call(cE,o)?!0:le.call(lE,o)?!1:xH.test(o)?cE[o]=!0:(lE[o]=!0,!1)}function rp(o,c,p){if(gH(c))if(p===null)o.removeAttribute(c);else{switch(typeof p){case"undefined":case"function":case"symbol":o.removeAttribute(c);return;case"boolean":var x=c.toLowerCase().slice(0,5);if(x!=="data-"&&x!=="aria-"){o.removeAttribute(c);return}}o.setAttribute(c,""+p)}}function ap(o,c,p){if(p===null)o.removeAttribute(c);else{switch(typeof p){case"undefined":case"function":case"symbol":case"boolean":o.removeAttribute(c);return}o.setAttribute(c,""+p)}}function Fa(o,c,p,x){if(x===null)o.removeAttribute(p);else{switch(typeof x){case"undefined":case"function":case"symbol":case"boolean":o.removeAttribute(p);return}o.setAttributeNS(c,p,""+x)}}var Ly,uE;function Go(o){if(Ly===void 0)try{throw Error()}catch(p){var c=p.stack.trim().match(/\n( *(at )?)/);Ly=c&&c[1]||"",uE=-1<p.stack.indexOf(`
    at`)?" (<anonymous>)":-1<p.stack.indexOf("@")?"@unknown:0:0":""}return`
`+Ly+o+uE}var By=!1;function zy(o,c){if(!o||By)return"";By=!0;var p=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{var x={DetermineComponentFrameRoot:function(){try{if(c){var me=function(){throw Error()};if(Object.defineProperty(me.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(me,[])}catch(oe){var se=oe}Reflect.construct(o,[],me)}else{try{me.call()}catch(oe){se=oe}o.call(me.prototype)}}else{try{throw Error()}catch(oe){se=oe}(me=o())&&typeof me.catch=="function"&&me.catch(function(){})}}catch(oe){if(oe&&se&&typeof oe.stack=="string")return[oe.stack,se.stack]}return[null,null]}};x.DetermineComponentFrameRoot.displayName="DetermineComponentFrameRoot";var w=Object.getOwnPropertyDescriptor(x.DetermineComponentFrameRoot,"name");w&&w.configurable&&Object.defineProperty(x.DetermineComponentFrameRoot,"name",{value:"DetermineComponentFrameRoot"});var C=x.DetermineComponentFrameRoot(),P=C[0],$=C[1];if(P&&$){var G=P.split(`
`),re=$.split(`
`);for(w=x=0;x<G.length&&!G[x].includes("DetermineComponentFrameRoot");)x++;for(;w<re.length&&!re[w].includes("DetermineComponentFrameRoot");)w++;if(x===G.length||w===re.length)for(x=G.length-1,w=re.length-1;1<=x&&0<=w&&G[x]!==re[w];)w--;for(;1<=x&&0<=w;x--,w--)if(G[x]!==re[w]){if(x!==1||w!==1)do if(x--,w--,0>w||G[x]!==re[w]){var de=`
`+G[x].replace(" at new "," at ");return o.displayName&&de.includes("<anonymous>")&&(de=de.replace("<anonymous>",o.displayName)),de}while(1<=x&&0<=w);break}}}finally{By=!1,Error.prepareStackTrace=p}return(p=o?o.displayName||o.name:"")?Go(p):""}function yH(o){switch(o.tag){case 26:case 27:case 5:return Go(o.type);case 16:return Go("Lazy");case 13:return Go("Suspense");case 19:return Go("SuspenseList");case 0:case 15:return zy(o.type,!1);case 11:return zy(o.type.render,!1);case 1:return zy(o.type,!0);case 31:return Go("Activity");default:return""}}function dE(o){try{var c="";do c+=yH(o),o=o.return;while(o);return c}catch(p){return`
Error generating stack: `+p.message+`
`+p.stack}}function yr(o){switch(typeof o){case"bigint":case"boolean":case"number":case"string":case"undefined":return o;case"object":return o;default:return""}}function fE(o){var c=o.type;return(o=o.nodeName)&&o.toLowerCase()==="input"&&(c==="checkbox"||c==="radio")}function vH(o){var c=fE(o)?"checked":"value",p=Object.getOwnPropertyDescriptor(o.constructor.prototype,c),x=""+o[c];if(!o.hasOwnProperty(c)&&typeof p<"u"&&typeof p.get=="function"&&typeof p.set=="function"){var w=p.get,C=p.set;return Object.defineProperty(o,c,{configurable:!0,get:function(){return w.call(this)},set:function(P){x=""+P,C.call(this,P)}}),Object.defineProperty(o,c,{enumerable:p.enumerable}),{getValue:function(){return x},setValue:function(P){x=""+P},stopTracking:function(){o._valueTracker=null,delete o[c]}}}}function ip(o){o._valueTracker||(o._valueTracker=vH(o))}function pE(o){if(!o)return!1;var c=o._valueTracker;if(!c)return!0;var p=c.getValue(),x="";return o&&(x=fE(o)?o.checked?"true":"false":o.value),o=x,o!==p?(c.setValue(o),!0):!1}function sp(o){if(o=o||(typeof document<"u"?document:void 0),typeof o>"u")return null;try{return o.activeElement||o.body}catch{return o.body}}var bH=/[\n"\\]/g;function vr(o){return o.replace(bH,function(c){return"\\"+c.charCodeAt(0).toString(16)+" "})}function qy(o,c,p,x,w,C,P,$){o.name="",P!=null&&typeof P!="function"&&typeof P!="symbol"&&typeof P!="boolean"?o.type=P:o.removeAttribute("type"),c!=null?P==="number"?(c===0&&o.value===""||o.value!=c)&&(o.value=""+yr(c)):o.value!==""+yr(c)&&(o.value=""+yr(c)):P!=="submit"&&P!=="reset"||o.removeAttribute("value"),c!=null?Fy(o,P,yr(c)):p!=null?Fy(o,P,yr(p)):x!=null&&o.removeAttribute("value"),w==null&&C!=null&&(o.defaultChecked=!!C),w!=null&&(o.checked=w&&typeof w!="function"&&typeof w!="symbol"),$!=null&&typeof $!="function"&&typeof $!="symbol"&&typeof $!="boolean"?o.name=""+yr($):o.removeAttribute("name")}function hE(o,c,p,x,w,C,P,$){if(C!=null&&typeof C!="function"&&typeof C!="symbol"&&typeof C!="boolean"&&(o.type=C),c!=null||p!=null){if(!(C!=="submit"&&C!=="reset"||c!=null))return;p=p!=null?""+yr(p):"",c=c!=null?""+yr(c):p,$||c===o.value||(o.value=c),o.defaultValue=c}x=x??w,x=typeof x!="function"&&typeof x!="symbol"&&!!x,o.checked=$?o.checked:!!x,o.defaultChecked=!!x,P!=null&&typeof P!="function"&&typeof P!="symbol"&&typeof P!="boolean"&&(o.name=P)}function Fy(o,c,p){c==="number"&&sp(o.ownerDocument)===o||o.defaultValue===""+p||(o.defaultValue=""+p)}function Wo(o,c,p,x){if(o=o.options,c){c={};for(var w=0;w<p.length;w++)c["$"+p[w]]=!0;for(p=0;p<o.length;p++)w=c.hasOwnProperty("$"+o[p].value),o[p].selected!==w&&(o[p].selected=w),w&&x&&(o[p].defaultSelected=!0)}else{for(p=""+yr(p),c=null,w=0;w<o.length;w++){if(o[w].value===p){o[w].selected=!0,x&&(o[w].defaultSelected=!0);return}c!==null||o[w].disabled||(c=o[w])}c!==null&&(c.selected=!0)}}function mE(o,c,p){if(c!=null&&(c=""+yr(c),c!==o.value&&(o.value=c),p==null)){o.defaultValue!==c&&(o.defaultValue=c);return}o.defaultValue=p!=null?""+yr(p):""}function xE(o,c,p,x){if(c==null){if(x!=null){if(p!=null)throw Error(r(92));if(H(x)){if(1<x.length)throw Error(r(93));x=x[0]}p=x}p==null&&(p=""),c=p}p=yr(c),o.defaultValue=p,x=o.textContent,x===p&&x!==""&&x!==null&&(o.value=x)}function Ko(o,c){if(c){var p=o.firstChild;if(p&&p===o.lastChild&&p.nodeType===3){p.nodeValue=c;return}}o.textContent=c}var jH=new Set("animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(" "));function gE(o,c,p){var x=c.indexOf("--")===0;p==null||typeof p=="boolean"||p===""?x?o.setProperty(c,""):c==="float"?o.cssFloat="":o[c]="":x?o.setProperty(c,p):typeof p!="number"||p===0||jH.has(c)?c==="float"?o.cssFloat=p:o[c]=(""+p).trim():o[c]=p+"px"}function yE(o,c,p){if(c!=null&&typeof c!="object")throw Error(r(62));if(o=o.style,p!=null){for(var x in p)!p.hasOwnProperty(x)||c!=null&&c.hasOwnProperty(x)||(x.indexOf("--")===0?o.setProperty(x,""):x==="float"?o.cssFloat="":o[x]="");for(var w in c)x=c[w],c.hasOwnProperty(w)&&p[w]!==x&&gE(o,w,x)}else for(var C in c)c.hasOwnProperty(C)&&gE(o,C,c[C])}function Uy(o){if(o.indexOf("-")===-1)return!1;switch(o){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var wH=new Map([["acceptCharset","accept-charset"],["htmlFor","for"],["httpEquiv","http-equiv"],["crossOrigin","crossorigin"],["accentHeight","accent-height"],["alignmentBaseline","alignment-baseline"],["arabicForm","arabic-form"],["baselineShift","baseline-shift"],["capHeight","cap-height"],["clipPath","clip-path"],["clipRule","clip-rule"],["colorInterpolation","color-interpolation"],["colorInterpolationFilters","color-interpolation-filters"],["colorProfile","color-profile"],["colorRendering","color-rendering"],["dominantBaseline","dominant-baseline"],["enableBackground","enable-background"],["fillOpacity","fill-opacity"],["fillRule","fill-rule"],["floodColor","flood-color"],["floodOpacity","flood-opacity"],["fontFamily","font-family"],["fontSize","font-size"],["fontSizeAdjust","font-size-adjust"],["fontStretch","font-stretch"],["fontStyle","font-style"],["fontVariant","font-variant"],["fontWeight","font-weight"],["glyphName","glyph-name"],["glyphOrientationHorizontal","glyph-orientation-horizontal"],["glyphOrientationVertical","glyph-orientation-vertical"],["horizAdvX","horiz-adv-x"],["horizOriginX","horiz-origin-x"],["imageRendering","image-rendering"],["letterSpacing","letter-spacing"],["lightingColor","lighting-color"],["markerEnd","marker-end"],["markerMid","marker-mid"],["markerStart","marker-start"],["overlinePosition","overline-position"],["overlineThickness","overline-thickness"],["paintOrder","paint-order"],["panose-1","panose-1"],["pointerEvents","pointer-events"],["renderingIntent","rendering-intent"],["shapeRendering","shape-rendering"],["stopColor","stop-color"],["stopOpacity","stop-opacity"],["strikethroughPosition","strikethrough-position"],["strikethroughThickness","strikethrough-thickness"],["strokeDasharray","stroke-dasharray"],["strokeDashoffset","stroke-dashoffset"],["strokeLinecap","stroke-linecap"],["strokeLinejoin","stroke-linejoin"],["strokeMiterlimit","stroke-miterlimit"],["strokeOpacity","stroke-opacity"],["strokeWidth","stroke-width"],["textAnchor","text-anchor"],["textDecoration","text-decoration"],["textRendering","text-rendering"],["transformOrigin","transform-origin"],["underlinePosition","underline-position"],["underlineThickness","underline-thickness"],["unicodeBidi","unicode-bidi"],["unicodeRange","unicode-range"],["unitsPerEm","units-per-em"],["vAlphabetic","v-alphabetic"],["vHanging","v-hanging"],["vIdeographic","v-ideographic"],["vMathematical","v-mathematical"],["vectorEffect","vector-effect"],["vertAdvY","vert-adv-y"],["vertOriginX","vert-origin-x"],["vertOriginY","vert-origin-y"],["wordSpacing","word-spacing"],["writingMode","writing-mode"],["xmlnsXlink","xmlns:xlink"],["xHeight","x-height"]]),SH=/^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;function op(o){return SH.test(""+o)?"javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')":o}var Vy=null;function Hy(o){return o=o.target||o.srcElement||window,o.correspondingUseElement&&(o=o.correspondingUseElement),o.nodeType===3?o.parentNode:o}var Yo=null,Xo=null;function vE(o){var c=Uo(o);if(c&&(o=c.stateNode)){var p=o[Vn]||null;e:switch(o=c.stateNode,c.type){case"input":if(qy(o,p.value,p.defaultValue,p.defaultValue,p.checked,p.defaultChecked,p.type,p.name),c=p.name,p.type==="radio"&&c!=null){for(p=o;p.parentNode;)p=p.parentNode;for(p=p.querySelectorAll('input[name="'+vr(""+c)+'"][type="radio"]'),c=0;c<p.length;c++){var x=p[c];if(x!==o&&x.form===o.form){var w=x[Vn]||null;if(!w)throw Error(r(90));qy(x,w.value,w.defaultValue,w.defaultValue,w.checked,w.defaultChecked,w.type,w.name)}}for(c=0;c<p.length;c++)x=p[c],x.form===o.form&&pE(x)}break e;case"textarea":mE(o,p.value,p.defaultValue);break e;case"select":c=p.value,c!=null&&Wo(o,!!p.multiple,c,!1)}}}var Gy=!1;function bE(o,c,p){if(Gy)return o(c,p);Gy=!0;try{var x=o(c);return x}finally{if(Gy=!1,(Yo!==null||Xo!==null)&&(Gp(),Yo&&(c=Yo,o=Xo,Xo=Yo=null,vE(c),o)))for(c=0;c<o.length;c++)vE(o[c])}}function ou(o,c){var p=o.stateNode;if(p===null)return null;var x=p[Vn]||null;if(x===null)return null;p=x[c];e:switch(c){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(x=!x.disabled)||(o=o.type,x=!(o==="button"||o==="input"||o==="select"||o==="textarea")),o=!x;break e;default:o=!1}if(o)return null;if(p&&typeof p!="function")throw Error(r(231,c,typeof p));return p}var Ua=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),Wy=!1;if(Ua)try{var lu={};Object.defineProperty(lu,"passive",{get:function(){Wy=!0}}),window.addEventListener("test",lu,lu),window.removeEventListener("test",lu,lu)}catch{Wy=!1}var Pi=null,Ky=null,lp=null;function jE(){if(lp)return lp;var o,c=Ky,p=c.length,x,w="value"in Pi?Pi.value:Pi.textContent,C=w.length;for(o=0;o<p&&c[o]===w[o];o++);var P=p-o;for(x=1;x<=P&&c[p-x]===w[C-x];x++);return lp=w.slice(o,1<x?1-x:void 0)}function cp(o){var c=o.keyCode;return"charCode"in o?(o=o.charCode,o===0&&c===13&&(o=13)):o=c,o===10&&(o=13),32<=o||o===13?o:0}function up(){return!0}function wE(){return!1}function Hn(o){function c(p,x,w,C,P){this._reactName=p,this._targetInst=w,this.type=x,this.nativeEvent=C,this.target=P,this.currentTarget=null;for(var $ in o)o.hasOwnProperty($)&&(p=o[$],this[$]=p?p(C):C[$]);return this.isDefaultPrevented=(C.defaultPrevented!=null?C.defaultPrevented:C.returnValue===!1)?up:wE,this.isPropagationStopped=wE,this}return m(c.prototype,{preventDefault:function(){this.defaultPrevented=!0;var p=this.nativeEvent;p&&(p.preventDefault?p.preventDefault():typeof p.returnValue!="unknown"&&(p.returnValue=!1),this.isDefaultPrevented=up)},stopPropagation:function(){var p=this.nativeEvent;p&&(p.stopPropagation?p.stopPropagation():typeof p.cancelBubble!="unknown"&&(p.cancelBubble=!0),this.isPropagationStopped=up)},persist:function(){},isPersistent:up}),c}var Ds={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(o){return o.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},dp=Hn(Ds),cu=m({},Ds,{view:0,detail:0}),NH=Hn(cu),Yy,Xy,uu,fp=m({},cu,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:Zy,button:0,buttons:0,relatedTarget:function(o){return o.relatedTarget===void 0?o.fromElement===o.srcElement?o.toElement:o.fromElement:o.relatedTarget},movementX:function(o){return"movementX"in o?o.movementX:(o!==uu&&(uu&&o.type==="mousemove"?(Yy=o.screenX-uu.screenX,Xy=o.screenY-uu.screenY):Xy=Yy=0,uu=o),Yy)},movementY:function(o){return"movementY"in o?o.movementY:Xy}}),SE=Hn(fp),AH=m({},fp,{dataTransfer:0}),CH=Hn(AH),_H=m({},cu,{relatedTarget:0}),Qy=Hn(_H),EH=m({},Ds,{animationName:0,elapsedTime:0,pseudoElement:0}),TH=Hn(EH),kH=m({},Ds,{clipboardData:function(o){return"clipboardData"in o?o.clipboardData:window.clipboardData}}),OH=Hn(kH),MH=m({},Ds,{data:0}),NE=Hn(MH),PH={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},DH={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},RH={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function IH(o){var c=this.nativeEvent;return c.getModifierState?c.getModifierState(o):(o=RH[o])?!!c[o]:!1}function Zy(){return IH}var $H=m({},cu,{key:function(o){if(o.key){var c=PH[o.key]||o.key;if(c!=="Unidentified")return c}return o.type==="keypress"?(o=cp(o),o===13?"Enter":String.fromCharCode(o)):o.type==="keydown"||o.type==="keyup"?DH[o.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:Zy,charCode:function(o){return o.type==="keypress"?cp(o):0},keyCode:function(o){return o.type==="keydown"||o.type==="keyup"?o.keyCode:0},which:function(o){return o.type==="keypress"?cp(o):o.type==="keydown"||o.type==="keyup"?o.keyCode:0}}),LH=Hn($H),BH=m({},fp,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),AE=Hn(BH),zH=m({},cu,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:Zy}),qH=Hn(zH),FH=m({},Ds,{propertyName:0,elapsedTime:0,pseudoElement:0}),UH=Hn(FH),VH=m({},fp,{deltaX:function(o){return"deltaX"in o?o.deltaX:"wheelDeltaX"in o?-o.wheelDeltaX:0},deltaY:function(o){return"deltaY"in o?o.deltaY:"wheelDeltaY"in o?-o.wheelDeltaY:"wheelDelta"in o?-o.wheelDelta:0},deltaZ:0,deltaMode:0}),HH=Hn(VH),GH=m({},Ds,{newState:0,oldState:0}),WH=Hn(GH),KH=[9,13,27,32],Jy=Ua&&"CompositionEvent"in window,du=null;Ua&&"documentMode"in document&&(du=document.documentMode);var YH=Ua&&"TextEvent"in window&&!du,CE=Ua&&(!Jy||du&&8<du&&11>=du),_E=" ",EE=!1;function TE(o,c){switch(o){case"keyup":return KH.indexOf(c.keyCode)!==-1;case"keydown":return c.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function kE(o){return o=o.detail,typeof o=="object"&&"data"in o?o.data:null}var Qo=!1;function XH(o,c){switch(o){case"compositionend":return kE(c);case"keypress":return c.which!==32?null:(EE=!0,_E);case"textInput":return o=c.data,o===_E&&EE?null:o;default:return null}}function QH(o,c){if(Qo)return o==="compositionend"||!Jy&&TE(o,c)?(o=jE(),lp=Ky=Pi=null,Qo=!1,o):null;switch(o){case"paste":return null;case"keypress":if(!(c.ctrlKey||c.altKey||c.metaKey)||c.ctrlKey&&c.altKey){if(c.char&&1<c.char.length)return c.char;if(c.which)return String.fromCharCode(c.which)}return null;case"compositionend":return CE&&c.locale!=="ko"?null:c.data;default:return null}}var ZH={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function OE(o){var c=o&&o.nodeName&&o.nodeName.toLowerCase();return c==="input"?!!ZH[o.type]:c==="textarea"}function ME(o,c,p,x){Yo?Xo?Xo.push(x):Xo=[x]:Yo=x,c=Zp(c,"onChange"),0<c.length&&(p=new dp("onChange","change",null,p,x),o.push({event:p,listeners:c}))}var fu=null,pu=null;function JH(o){fO(o,0)}function pp(o){var c=su(o);if(pE(c))return o}function PE(o,c){if(o==="change")return c}var DE=!1;if(Ua){var ev;if(Ua){var tv="oninput"in document;if(!tv){var RE=document.createElement("div");RE.setAttribute("oninput","return;"),tv=typeof RE.oninput=="function"}ev=tv}else ev=!1;DE=ev&&(!document.documentMode||9<document.documentMode)}function IE(){fu&&(fu.detachEvent("onpropertychange",$E),pu=fu=null)}function $E(o){if(o.propertyName==="value"&&pp(pu)){var c=[];ME(c,pu,o,Hy(o)),bE(JH,c)}}function eG(o,c,p){o==="focusin"?(IE(),fu=c,pu=p,fu.attachEvent("onpropertychange",$E)):o==="focusout"&&IE()}function tG(o){if(o==="selectionchange"||o==="keyup"||o==="keydown")return pp(pu)}function nG(o,c){if(o==="click")return pp(c)}function rG(o,c){if(o==="input"||o==="change")return pp(c)}function aG(o,c){return o===c&&(o!==0||1/o===1/c)||o!==o&&c!==c}var er=typeof Object.is=="function"?Object.is:aG;function hu(o,c){if(er(o,c))return!0;if(typeof o!="object"||o===null||typeof c!="object"||c===null)return!1;var p=Object.keys(o),x=Object.keys(c);if(p.length!==x.length)return!1;for(x=0;x<p.length;x++){var w=p[x];if(!le.call(c,w)||!er(o[w],c[w]))return!1}return!0}function LE(o){for(;o&&o.firstChild;)o=o.firstChild;return o}function BE(o,c){var p=LE(o);o=0;for(var x;p;){if(p.nodeType===3){if(x=o+p.textContent.length,o<=c&&x>=c)return{node:p,offset:c-o};o=x}e:{for(;p;){if(p.nextSibling){p=p.nextSibling;break e}p=p.parentNode}p=void 0}p=LE(p)}}function zE(o,c){return o&&c?o===c?!0:o&&o.nodeType===3?!1:c&&c.nodeType===3?zE(o,c.parentNode):"contains"in o?o.contains(c):o.compareDocumentPosition?!!(o.compareDocumentPosition(c)&16):!1:!1}function qE(o){o=o!=null&&o.ownerDocument!=null&&o.ownerDocument.defaultView!=null?o.ownerDocument.defaultView:window;for(var c=sp(o.document);c instanceof o.HTMLIFrameElement;){try{var p=typeof c.contentWindow.location.href=="string"}catch{p=!1}if(p)o=c.contentWindow;else break;c=sp(o.document)}return c}function nv(o){var c=o&&o.nodeName&&o.nodeName.toLowerCase();return c&&(c==="input"&&(o.type==="text"||o.type==="search"||o.type==="tel"||o.type==="url"||o.type==="password")||c==="textarea"||o.contentEditable==="true")}var iG=Ua&&"documentMode"in document&&11>=document.documentMode,Zo=null,rv=null,mu=null,av=!1;function FE(o,c,p){var x=p.window===p?p.document:p.nodeType===9?p:p.ownerDocument;av||Zo==null||Zo!==sp(x)||(x=Zo,"selectionStart"in x&&nv(x)?x={start:x.selectionStart,end:x.selectionEnd}:(x=(x.ownerDocument&&x.ownerDocument.defaultView||window).getSelection(),x={anchorNode:x.anchorNode,anchorOffset:x.anchorOffset,focusNode:x.focusNode,focusOffset:x.focusOffset}),mu&&hu(mu,x)||(mu=x,x=Zp(rv,"onSelect"),0<x.length&&(c=new dp("onSelect","select",null,c,p),o.push({event:c,listeners:x}),c.target=Zo)))}function Rs(o,c){var p={};return p[o.toLowerCase()]=c.toLowerCase(),p["Webkit"+o]="webkit"+c,p["Moz"+o]="moz"+c,p}var Jo={animationend:Rs("Animation","AnimationEnd"),animationiteration:Rs("Animation","AnimationIteration"),animationstart:Rs("Animation","AnimationStart"),transitionrun:Rs("Transition","TransitionRun"),transitionstart:Rs("Transition","TransitionStart"),transitioncancel:Rs("Transition","TransitionCancel"),transitionend:Rs("Transition","TransitionEnd")},iv={},UE={};Ua&&(UE=document.createElement("div").style,"AnimationEvent"in window||(delete Jo.animationend.animation,delete Jo.animationiteration.animation,delete Jo.animationstart.animation),"TransitionEvent"in window||delete Jo.transitionend.transition);function Is(o){if(iv[o])return iv[o];if(!Jo[o])return o;var c=Jo[o],p;for(p in c)if(c.hasOwnProperty(p)&&p in UE)return iv[o]=c[p];return o}var VE=Is("animationend"),HE=Is("animationiteration"),GE=Is("animationstart"),sG=Is("transitionrun"),oG=Is("transitionstart"),lG=Is("transitioncancel"),WE=Is("transitionend"),KE=new Map,sv="abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");sv.push("scrollEnd");function Hr(o,c){KE.set(o,c),Ps(c,[o])}var YE=new WeakMap;function br(o,c){if(typeof o=="object"&&o!==null){var p=YE.get(o);return p!==void 0?p:(c={value:o,source:c,stack:dE(c)},YE.set(o,c),c)}return{value:o,source:c,stack:dE(c)}}var jr=[],el=0,ov=0;function hp(){for(var o=el,c=ov=el=0;c<o;){var p=jr[c];jr[c++]=null;var x=jr[c];jr[c++]=null;var w=jr[c];jr[c++]=null;var C=jr[c];if(jr[c++]=null,x!==null&&w!==null){var P=x.pending;P===null?w.next=w:(w.next=P.next,P.next=w),x.pending=w}C!==0&&XE(p,w,C)}}function mp(o,c,p,x){jr[el++]=o,jr[el++]=c,jr[el++]=p,jr[el++]=x,ov|=x,o.lanes|=x,o=o.alternate,o!==null&&(o.lanes|=x)}function lv(o,c,p,x){return mp(o,c,p,x),xp(o)}function tl(o,c){return mp(o,null,null,c),xp(o)}function XE(o,c,p){o.lanes|=p;var x=o.alternate;x!==null&&(x.lanes|=p);for(var w=!1,C=o.return;C!==null;)C.childLanes|=p,x=C.alternate,x!==null&&(x.childLanes|=p),C.tag===22&&(o=C.stateNode,o===null||o._visibility&1||(w=!0)),o=C,C=C.return;return o.tag===3?(C=o.stateNode,w&&c!==null&&(w=31-jt(p),o=C.hiddenUpdates,x=o[w],x===null?o[w]=[c]:x.push(c),c.lane=p|536870912),C):null}function xp(o){if(50<zu)throw zu=0,hb=null,Error(r(185));for(var c=o.return;c!==null;)o=c,c=o.return;return o.tag===3?o.stateNode:null}var nl={};function cG(o,c,p,x){this.tag=o,this.key=p,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.refCleanup=this.ref=null,this.pendingProps=c,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=x,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function tr(o,c,p,x){return new cG(o,c,p,x)}function cv(o){return o=o.prototype,!(!o||!o.isReactComponent)}function Va(o,c){var p=o.alternate;return p===null?(p=tr(o.tag,c,o.key,o.mode),p.elementType=o.elementType,p.type=o.type,p.stateNode=o.stateNode,p.alternate=o,o.alternate=p):(p.pendingProps=c,p.type=o.type,p.flags=0,p.subtreeFlags=0,p.deletions=null),p.flags=o.flags&65011712,p.childLanes=o.childLanes,p.lanes=o.lanes,p.child=o.child,p.memoizedProps=o.memoizedProps,p.memoizedState=o.memoizedState,p.updateQueue=o.updateQueue,c=o.dependencies,p.dependencies=c===null?null:{lanes:c.lanes,firstContext:c.firstContext},p.sibling=o.sibling,p.index=o.index,p.ref=o.ref,p.refCleanup=o.refCleanup,p}function QE(o,c){o.flags&=65011714;var p=o.alternate;return p===null?(o.childLanes=0,o.lanes=c,o.child=null,o.subtreeFlags=0,o.memoizedProps=null,o.memoizedState=null,o.updateQueue=null,o.dependencies=null,o.stateNode=null):(o.childLanes=p.childLanes,o.lanes=p.lanes,o.child=p.child,o.subtreeFlags=0,o.deletions=null,o.memoizedProps=p.memoizedProps,o.memoizedState=p.memoizedState,o.updateQueue=p.updateQueue,o.type=p.type,c=p.dependencies,o.dependencies=c===null?null:{lanes:c.lanes,firstContext:c.firstContext}),o}function gp(o,c,p,x,w,C){var P=0;if(x=o,typeof o=="function")cv(o)&&(P=1);else if(typeof o=="string")P=dW(o,p,ae.current)?26:o==="html"||o==="head"||o==="body"?27:5;else e:switch(o){case D:return o=tr(31,p,c,w),o.elementType=D,o.lanes=C,o;case j:return $s(p.children,w,C,c);case v:P=8,w|=24;break;case b:return o=tr(12,p,c,w|2),o.elementType=b,o.lanes=C,o;case A:return o=tr(13,p,c,w),o.elementType=A,o.lanes=C,o;case k:return o=tr(19,p,c,w),o.elementType=k,o.lanes=C,o;default:if(typeof o=="object"&&o!==null)switch(o.$$typeof){case N:case _:P=10;break e;case E:P=9;break e;case T:P=11;break e;case O:P=14;break e;case M:P=16,x=null;break e}P=29,p=Error(r(130,o===null?"null":typeof o,"")),x=null}return c=tr(P,p,c,w),c.elementType=o,c.type=x,c.lanes=C,c}function $s(o,c,p,x){return o=tr(7,o,x,c),o.lanes=p,o}function uv(o,c,p){return o=tr(6,o,null,c),o.lanes=p,o}function dv(o,c,p){return c=tr(4,o.children!==null?o.children:[],o.key,c),c.lanes=p,c.stateNode={containerInfo:o.containerInfo,pendingChildren:null,implementation:o.implementation},c}var rl=[],al=0,yp=null,vp=0,wr=[],Sr=0,Ls=null,Ha=1,Ga="";function Bs(o,c){rl[al++]=vp,rl[al++]=yp,yp=o,vp=c}function ZE(o,c,p){wr[Sr++]=Ha,wr[Sr++]=Ga,wr[Sr++]=Ls,Ls=o;var x=Ha;o=Ga;var w=32-jt(x)-1;x&=~(1<<w),p+=1;var C=32-jt(c)+w;if(30<C){var P=w-w%5;C=(x&(1<<P)-1).toString(32),x>>=P,w-=P,Ha=1<<32-jt(c)+w|p<<w|x,Ga=C+o}else Ha=1<<C|p<<w|x,Ga=o}function fv(o){o.return!==null&&(Bs(o,1),ZE(o,1,0))}function pv(o){for(;o===yp;)yp=rl[--al],rl[al]=null,vp=rl[--al],rl[al]=null;for(;o===Ls;)Ls=wr[--Sr],wr[Sr]=null,Ga=wr[--Sr],wr[Sr]=null,Ha=wr[--Sr],wr[Sr]=null}var In=null,$t=null,st=!1,zs=null,fa=!1,hv=Error(r(519));function qs(o){var c=Error(r(418,""));throw yu(br(c,o)),hv}function JE(o){var c=o.stateNode,p=o.type,x=o.memoizedProps;switch(c[Cn]=o,c[Vn]=x,p){case"dialog":Ye("cancel",c),Ye("close",c);break;case"iframe":case"object":case"embed":Ye("load",c);break;case"video":case"audio":for(p=0;p<Fu.length;p++)Ye(Fu[p],c);break;case"source":Ye("error",c);break;case"img":case"image":case"link":Ye("error",c),Ye("load",c);break;case"details":Ye("toggle",c);break;case"input":Ye("invalid",c),hE(c,x.value,x.defaultValue,x.checked,x.defaultChecked,x.type,x.name,!0),ip(c);break;case"select":Ye("invalid",c);break;case"textarea":Ye("invalid",c),xE(c,x.value,x.defaultValue,x.children),ip(c)}p=x.children,typeof p!="string"&&typeof p!="number"&&typeof p!="bigint"||c.textContent===""+p||x.suppressHydrationWarning===!0||xO(c.textContent,p)?(x.popover!=null&&(Ye("beforetoggle",c),Ye("toggle",c)),x.onScroll!=null&&Ye("scroll",c),x.onScrollEnd!=null&&Ye("scrollend",c),x.onClick!=null&&(c.onclick=Jp),c=!0):c=!1,c||qs(o)}function eT(o){for(In=o.return;In;)switch(In.tag){case 5:case 13:fa=!1;return;case 27:case 3:fa=!0;return;default:In=In.return}}function xu(o){if(o!==In)return!1;if(!st)return eT(o),st=!0,!1;var c=o.tag,p;if((p=c!==3&&c!==27)&&((p=c===5)&&(p=o.type,p=!(p!=="form"&&p!=="button")||kb(o.type,o.memoizedProps)),p=!p),p&&$t&&qs(o),eT(o),c===13){if(o=o.memoizedState,o=o!==null?o.dehydrated:null,!o)throw Error(r(317));e:{for(o=o.nextSibling,c=0;o;){if(o.nodeType===8)if(p=o.data,p==="/$"){if(c===0){$t=Wr(o.nextSibling);break e}c--}else p!=="$"&&p!=="$!"&&p!=="$?"||c++;o=o.nextSibling}$t=null}}else c===27?(c=$t,Yi(o.type)?(o=Db,Db=null,$t=o):$t=c):$t=In?Wr(o.stateNode.nextSibling):null;return!0}function gu(){$t=In=null,st=!1}function tT(){var o=zs;return o!==null&&(Kn===null?Kn=o:Kn.push.apply(Kn,o),zs=null),o}function yu(o){zs===null?zs=[o]:zs.push(o)}var mv=K(null),Fs=null,Wa=null;function Di(o,c,p){ne(mv,c._currentValue),c._currentValue=p}function Ka(o){o._currentValue=mv.current,Y(mv)}function xv(o,c,p){for(;o!==null;){var x=o.alternate;if((o.childLanes&c)!==c?(o.childLanes|=c,x!==null&&(x.childLanes|=c)):x!==null&&(x.childLanes&c)!==c&&(x.childLanes|=c),o===p)break;o=o.return}}function gv(o,c,p,x){var w=o.child;for(w!==null&&(w.return=o);w!==null;){var C=w.dependencies;if(C!==null){var P=w.child;C=C.firstContext;e:for(;C!==null;){var $=C;C=w;for(var G=0;G<c.length;G++)if($.context===c[G]){C.lanes|=p,$=C.alternate,$!==null&&($.lanes|=p),xv(C.return,p,o),x||(P=null);break e}C=$.next}}else if(w.tag===18){if(P=w.return,P===null)throw Error(r(341));P.lanes|=p,C=P.alternate,C!==null&&(C.lanes|=p),xv(P,p,o),P=null}else P=w.child;if(P!==null)P.return=w;else for(P=w;P!==null;){if(P===o){P=null;break}if(w=P.sibling,w!==null){w.return=P.return,P=w;break}P=P.return}w=P}}function vu(o,c,p,x){o=null;for(var w=c,C=!1;w!==null;){if(!C){if((w.flags&524288)!==0)C=!0;else if((w.flags&262144)!==0)break}if(w.tag===10){var P=w.alternate;if(P===null)throw Error(r(387));if(P=P.memoizedProps,P!==null){var $=w.type;er(w.pendingProps.value,P.value)||(o!==null?o.push($):o=[$])}}else if(w===ye.current){if(P=w.alternate,P===null)throw Error(r(387));P.memoizedState.memoizedState!==w.memoizedState.memoizedState&&(o!==null?o.push(Ku):o=[Ku])}w=w.return}o!==null&&gv(c,o,p,x),c.flags|=262144}function bp(o){for(o=o.firstContext;o!==null;){if(!er(o.context._currentValue,o.memoizedValue))return!0;o=o.next}return!1}function Us(o){Fs=o,Wa=null,o=o.dependencies,o!==null&&(o.firstContext=null)}function _n(o){return nT(Fs,o)}function jp(o,c){return Fs===null&&Us(o),nT(o,c)}function nT(o,c){var p=c._currentValue;if(c={context:c,memoizedValue:p,next:null},Wa===null){if(o===null)throw Error(r(308));Wa=c,o.dependencies={lanes:0,firstContext:c},o.flags|=524288}else Wa=Wa.next=c;return p}var uG=typeof AbortController<"u"?AbortController:function(){var o=[],c=this.signal={aborted:!1,addEventListener:function(p,x){o.push(x)}};this.abort=function(){c.aborted=!0,o.forEach(function(p){return p()})}},dG=e.unstable_scheduleCallback,fG=e.unstable_NormalPriority,Qt={$$typeof:_,Consumer:null,Provider:null,_currentValue:null,_currentValue2:null,_threadCount:0};function yv(){return{controller:new uG,data:new Map,refCount:0}}function bu(o){o.refCount--,o.refCount===0&&dG(fG,function(){o.controller.abort()})}var ju=null,vv=0,il=0,sl=null;function pG(o,c){if(ju===null){var p=ju=[];vv=0,il=jb(),sl={status:"pending",value:void 0,then:function(x){p.push(x)}}}return vv++,c.then(rT,rT),c}function rT(){if(--vv===0&&ju!==null){sl!==null&&(sl.status="fulfilled");var o=ju;ju=null,il=0,sl=null;for(var c=0;c<o.length;c++)(0,o[c])()}}function hG(o,c){var p=[],x={status:"pending",value:null,reason:null,then:function(w){p.push(w)}};return o.then(function(){x.status="fulfilled",x.value=c;for(var w=0;w<p.length;w++)(0,p[w])(c)},function(w){for(x.status="rejected",x.reason=w,w=0;w<p.length;w++)(0,p[w])(void 0)}),x}var aT=I.S;I.S=function(o,c){typeof c=="object"&&c!==null&&typeof c.then=="function"&&pG(o,c),aT!==null&&aT(o,c)};var Vs=K(null);function bv(){var o=Vs.current;return o!==null?o:At.pooledCache}function wp(o,c){c===null?ne(Vs,Vs.current):ne(Vs,c.pool)}function iT(){var o=bv();return o===null?null:{parent:Qt._currentValue,pool:o}}var wu=Error(r(460)),sT=Error(r(474)),Sp=Error(r(542)),jv={then:function(){}};function oT(o){return o=o.status,o==="fulfilled"||o==="rejected"}function Np(){}function lT(o,c,p){switch(p=o[p],p===void 0?o.push(c):p!==c&&(c.then(Np,Np),c=p),c.status){case"fulfilled":return c.value;case"rejected":throw o=c.reason,uT(o),o;default:if(typeof c.status=="string")c.then(Np,Np);else{if(o=At,o!==null&&100<o.shellSuspendCounter)throw Error(r(482));o=c,o.status="pending",o.then(function(x){if(c.status==="pending"){var w=c;w.status="fulfilled",w.value=x}},function(x){if(c.status==="pending"){var w=c;w.status="rejected",w.reason=x}})}switch(c.status){case"fulfilled":return c.value;case"rejected":throw o=c.reason,uT(o),o}throw Su=c,wu}}var Su=null;function cT(){if(Su===null)throw Error(r(459));var o=Su;return Su=null,o}function uT(o){if(o===wu||o===Sp)throw Error(r(483))}var Ri=!1;function wv(o){o.updateQueue={baseState:o.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,lanes:0,hiddenCallbacks:null},callbacks:null}}function Sv(o,c){o=o.updateQueue,c.updateQueue===o&&(c.updateQueue={baseState:o.baseState,firstBaseUpdate:o.firstBaseUpdate,lastBaseUpdate:o.lastBaseUpdate,shared:o.shared,callbacks:null})}function Ii(o){return{lane:o,tag:0,payload:null,callback:null,next:null}}function $i(o,c,p){var x=o.updateQueue;if(x===null)return null;if(x=x.shared,(dt&2)!==0){var w=x.pending;return w===null?c.next=c:(c.next=w.next,w.next=c),x.pending=c,c=xp(o),XE(o,null,p),c}return mp(o,x,c,p),xp(o)}function Nu(o,c,p){if(c=c.updateQueue,c!==null&&(c=c.shared,(p&4194048)!==0)){var x=c.lanes;x&=o.pendingLanes,p|=x,c.lanes=p,rE(o,p)}}function Nv(o,c){var p=o.updateQueue,x=o.alternate;if(x!==null&&(x=x.updateQueue,p===x)){var w=null,C=null;if(p=p.firstBaseUpdate,p!==null){do{var P={lane:p.lane,tag:p.tag,payload:p.payload,callback:null,next:null};C===null?w=C=P:C=C.next=P,p=p.next}while(p!==null);C===null?w=C=c:C=C.next=c}else w=C=c;p={baseState:x.baseState,firstBaseUpdate:w,lastBaseUpdate:C,shared:x.shared,callbacks:x.callbacks},o.updateQueue=p;return}o=p.lastBaseUpdate,o===null?p.firstBaseUpdate=c:o.next=c,p.lastBaseUpdate=c}var Av=!1;function Au(){if(Av){var o=sl;if(o!==null)throw o}}function Cu(o,c,p,x){Av=!1;var w=o.updateQueue;Ri=!1;var C=w.firstBaseUpdate,P=w.lastBaseUpdate,$=w.shared.pending;if($!==null){w.shared.pending=null;var G=$,re=G.next;G.next=null,P===null?C=re:P.next=re,P=G;var de=o.alternate;de!==null&&(de=de.updateQueue,$=de.lastBaseUpdate,$!==P&&($===null?de.firstBaseUpdate=re:$.next=re,de.lastBaseUpdate=G))}if(C!==null){var me=w.baseState;P=0,de=re=G=null,$=C;do{var se=$.lane&-536870913,oe=se!==$.lane;if(oe?(et&se)===se:(x&se)===se){se!==0&&se===il&&(Av=!0),de!==null&&(de=de.next={lane:0,tag:$.tag,payload:$.payload,callback:null,next:null});e:{var Ie=o,Me=$;se=c;var xt=p;switch(Me.tag){case 1:if(Ie=Me.payload,typeof Ie=="function"){me=Ie.call(xt,me,se);break e}me=Ie;break e;case 3:Ie.flags=Ie.flags&-65537|128;case 0:if(Ie=Me.payload,se=typeof Ie=="function"?Ie.call(xt,me,se):Ie,se==null)break e;me=m({},me,se);break e;case 2:Ri=!0}}se=$.callback,se!==null&&(o.flags|=64,oe&&(o.flags|=8192),oe=w.callbacks,oe===null?w.callbacks=[se]:oe.push(se))}else oe={lane:se,tag:$.tag,payload:$.payload,callback:$.callback,next:null},de===null?(re=de=oe,G=me):de=de.next=oe,P|=se;if($=$.next,$===null){if($=w.shared.pending,$===null)break;oe=$,$=oe.next,oe.next=null,w.lastBaseUpdate=oe,w.shared.pending=null}}while(!0);de===null&&(G=me),w.baseState=G,w.firstBaseUpdate=re,w.lastBaseUpdate=de,C===null&&(w.shared.lanes=0),Hi|=P,o.lanes=P,o.memoizedState=me}}function dT(o,c){if(typeof o!="function")throw Error(r(191,o));o.call(c)}function fT(o,c){var p=o.callbacks;if(p!==null)for(o.callbacks=null,o=0;o<p.length;o++)dT(p[o],c)}var ol=K(null),Ap=K(0);function pT(o,c){o=ti,ne(Ap,o),ne(ol,c),ti=o|c.baseLanes}function Cv(){ne(Ap,ti),ne(ol,ol.current)}function _v(){ti=Ap.current,Y(ol),Y(Ap)}var Li=0,Fe=null,ht=null,Ht=null,Cp=!1,ll=!1,Hs=!1,_p=0,_u=0,cl=null,mG=0;function qt(){throw Error(r(321))}function Ev(o,c){if(c===null)return!1;for(var p=0;p<c.length&&p<o.length;p++)if(!er(o[p],c[p]))return!1;return!0}function Tv(o,c,p,x,w,C){return Li=C,Fe=c,c.memoizedState=null,c.updateQueue=null,c.lanes=0,I.H=o===null||o.memoizedState===null?XT:QT,Hs=!1,C=p(x,w),Hs=!1,ll&&(C=mT(c,p,x,w)),hT(o),C}function hT(o){I.H=Pp;var c=ht!==null&&ht.next!==null;if(Li=0,Ht=ht=Fe=null,Cp=!1,_u=0,cl=null,c)throw Error(r(300));o===null||un||(o=o.dependencies,o!==null&&bp(o)&&(un=!0))}function mT(o,c,p,x){Fe=o;var w=0;do{if(ll&&(cl=null),_u=0,ll=!1,25<=w)throw Error(r(301));if(w+=1,Ht=ht=null,o.updateQueue!=null){var C=o.updateQueue;C.lastEffect=null,C.events=null,C.stores=null,C.memoCache!=null&&(C.memoCache.index=0)}I.H=wG,C=c(p,x)}while(ll);return C}function xG(){var o=I.H,c=o.useState()[0];return c=typeof c.then=="function"?Eu(c):c,o=o.useState()[0],(ht!==null?ht.memoizedState:null)!==o&&(Fe.flags|=1024),c}function kv(){var o=_p!==0;return _p=0,o}function Ov(o,c,p){c.updateQueue=o.updateQueue,c.flags&=-2053,o.lanes&=~p}function Mv(o){if(Cp){for(o=o.memoizedState;o!==null;){var c=o.queue;c!==null&&(c.pending=null),o=o.next}Cp=!1}Li=0,Ht=ht=Fe=null,ll=!1,_u=_p=0,cl=null}function Gn(){var o={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return Ht===null?Fe.memoizedState=Ht=o:Ht=Ht.next=o,Ht}function Gt(){if(ht===null){var o=Fe.alternate;o=o!==null?o.memoizedState:null}else o=ht.next;var c=Ht===null?Fe.memoizedState:Ht.next;if(c!==null)Ht=c,ht=o;else{if(o===null)throw Fe.alternate===null?Error(r(467)):Error(r(310));ht=o,o={memoizedState:ht.memoizedState,baseState:ht.baseState,baseQueue:ht.baseQueue,queue:ht.queue,next:null},Ht===null?Fe.memoizedState=Ht=o:Ht=Ht.next=o}return Ht}function Pv(){return{lastEffect:null,events:null,stores:null,memoCache:null}}function Eu(o){var c=_u;return _u+=1,cl===null&&(cl=[]),o=lT(cl,o,c),c=Fe,(Ht===null?c.memoizedState:Ht.next)===null&&(c=c.alternate,I.H=c===null||c.memoizedState===null?XT:QT),o}function Ep(o){if(o!==null&&typeof o=="object"){if(typeof o.then=="function")return Eu(o);if(o.$$typeof===_)return _n(o)}throw Error(r(438,String(o)))}function Dv(o){var c=null,p=Fe.updateQueue;if(p!==null&&(c=p.memoCache),c==null){var x=Fe.alternate;x!==null&&(x=x.updateQueue,x!==null&&(x=x.memoCache,x!=null&&(c={data:x.data.map(function(w){return w.slice()}),index:0})))}if(c==null&&(c={data:[],index:0}),p===null&&(p=Pv(),Fe.updateQueue=p),p.memoCache=c,p=c.data[c.index],p===void 0)for(p=c.data[c.index]=Array(o),x=0;x<o;x++)p[x]=z;return c.index++,p}function Ya(o,c){return typeof c=="function"?c(o):c}function Tp(o){var c=Gt();return Rv(c,ht,o)}function Rv(o,c,p){var x=o.queue;if(x===null)throw Error(r(311));x.lastRenderedReducer=p;var w=o.baseQueue,C=x.pending;if(C!==null){if(w!==null){var P=w.next;w.next=C.next,C.next=P}c.baseQueue=w=C,x.pending=null}if(C=o.baseState,w===null)o.memoizedState=C;else{c=w.next;var $=P=null,G=null,re=c,de=!1;do{var me=re.lane&-536870913;if(me!==re.lane?(et&me)===me:(Li&me)===me){var se=re.revertLane;if(se===0)G!==null&&(G=G.next={lane:0,revertLane:0,action:re.action,hasEagerState:re.hasEagerState,eagerState:re.eagerState,next:null}),me===il&&(de=!0);else if((Li&se)===se){re=re.next,se===il&&(de=!0);continue}else me={lane:0,revertLane:re.revertLane,action:re.action,hasEagerState:re.hasEagerState,eagerState:re.eagerState,next:null},G===null?($=G=me,P=C):G=G.next=me,Fe.lanes|=se,Hi|=se;me=re.action,Hs&&p(C,me),C=re.hasEagerState?re.eagerState:p(C,me)}else se={lane:me,revertLane:re.revertLane,action:re.action,hasEagerState:re.hasEagerState,eagerState:re.eagerState,next:null},G===null?($=G=se,P=C):G=G.next=se,Fe.lanes|=me,Hi|=me;re=re.next}while(re!==null&&re!==c);if(G===null?P=C:G.next=$,!er(C,o.memoizedState)&&(un=!0,de&&(p=sl,p!==null)))throw p;o.memoizedState=C,o.baseState=P,o.baseQueue=G,x.lastRenderedState=C}return w===null&&(x.lanes=0),[o.memoizedState,x.dispatch]}function Iv(o){var c=Gt(),p=c.queue;if(p===null)throw Error(r(311));p.lastRenderedReducer=o;var x=p.dispatch,w=p.pending,C=c.memoizedState;if(w!==null){p.pending=null;var P=w=w.next;do C=o(C,P.action),P=P.next;while(P!==w);er(C,c.memoizedState)||(un=!0),c.memoizedState=C,c.baseQueue===null&&(c.baseState=C),p.lastRenderedState=C}return[C,x]}function xT(o,c,p){var x=Fe,w=Gt(),C=st;if(C){if(p===void 0)throw Error(r(407));p=p()}else p=c();var P=!er((ht||w).memoizedState,p);P&&(w.memoizedState=p,un=!0),w=w.queue;var $=vT.bind(null,x,w,o);if(Tu(2048,8,$,[o]),w.getSnapshot!==c||P||Ht!==null&&Ht.memoizedState.tag&1){if(x.flags|=2048,ul(9,kp(),yT.bind(null,x,w,p,c),null),At===null)throw Error(r(349));C||(Li&124)!==0||gT(x,c,p)}return p}function gT(o,c,p){o.flags|=16384,o={getSnapshot:c,value:p},c=Fe.updateQueue,c===null?(c=Pv(),Fe.updateQueue=c,c.stores=[o]):(p=c.stores,p===null?c.stores=[o]:p.push(o))}function yT(o,c,p,x){c.value=p,c.getSnapshot=x,bT(c)&&jT(o)}function vT(o,c,p){return p(function(){bT(c)&&jT(o)})}function bT(o){var c=o.getSnapshot;o=o.value;try{var p=c();return!er(o,p)}catch{return!0}}function jT(o){var c=tl(o,2);c!==null&&sr(c,o,2)}function $v(o){var c=Gn();if(typeof o=="function"){var p=o;if(o=p(),Hs){gr(!0);try{p()}finally{gr(!1)}}}return c.memoizedState=c.baseState=o,c.queue={pending:null,lanes:0,dispatch:null,lastRenderedReducer:Ya,lastRenderedState:o},c}function wT(o,c,p,x){return o.baseState=p,Rv(o,ht,typeof x=="function"?x:Ya)}function gG(o,c,p,x,w){if(Mp(o))throw Error(r(485));if(o=c.action,o!==null){var C={payload:w,action:o,next:null,isTransition:!0,status:"pending",value:null,reason:null,listeners:[],then:function(P){C.listeners.push(P)}};I.T!==null?p(!0):C.isTransition=!1,x(C),p=c.pending,p===null?(C.next=c.pending=C,ST(c,C)):(C.next=p.next,c.pending=p.next=C)}}function ST(o,c){var p=c.action,x=c.payload,w=o.state;if(c.isTransition){var C=I.T,P={};I.T=P;try{var $=p(w,x),G=I.S;G!==null&&G(P,$),NT(o,c,$)}catch(re){Lv(o,c,re)}finally{I.T=C}}else try{C=p(w,x),NT(o,c,C)}catch(re){Lv(o,c,re)}}function NT(o,c,p){p!==null&&typeof p=="object"&&typeof p.then=="function"?p.then(function(x){AT(o,c,x)},function(x){return Lv(o,c,x)}):AT(o,c,p)}function AT(o,c,p){c.status="fulfilled",c.value=p,CT(c),o.state=p,c=o.pending,c!==null&&(p=c.next,p===c?o.pending=null:(p=p.next,c.next=p,ST(o,p)))}function Lv(o,c,p){var x=o.pending;if(o.pending=null,x!==null){x=x.next;do c.status="rejected",c.reason=p,CT(c),c=c.next;while(c!==x)}o.action=null}function CT(o){o=o.listeners;for(var c=0;c<o.length;c++)(0,o[c])()}function _T(o,c){return c}function ET(o,c){if(st){var p=At.formState;if(p!==null){e:{var x=Fe;if(st){if($t){t:{for(var w=$t,C=fa;w.nodeType!==8;){if(!C){w=null;break t}if(w=Wr(w.nextSibling),w===null){w=null;break t}}C=w.data,w=C==="F!"||C==="F"?w:null}if(w){$t=Wr(w.nextSibling),x=w.data==="F!";break e}}qs(x)}x=!1}x&&(c=p[0])}}return p=Gn(),p.memoizedState=p.baseState=c,x={pending:null,lanes:0,dispatch:null,lastRenderedReducer:_T,lastRenderedState:c},p.queue=x,p=WT.bind(null,Fe,x),x.dispatch=p,x=$v(!1),C=Uv.bind(null,Fe,!1,x.queue),x=Gn(),w={state:c,dispatch:null,action:o,pending:null},x.queue=w,p=gG.bind(null,Fe,w,C,p),w.dispatch=p,x.memoizedState=o,[c,p,!1]}function TT(o){var c=Gt();return kT(c,ht,o)}function kT(o,c,p){if(c=Rv(o,c,_T)[0],o=Tp(Ya)[0],typeof c=="object"&&c!==null&&typeof c.then=="function")try{var x=Eu(c)}catch(P){throw P===wu?Sp:P}else x=c;c=Gt();var w=c.queue,C=w.dispatch;return p!==c.memoizedState&&(Fe.flags|=2048,ul(9,kp(),yG.bind(null,w,p),null)),[x,C,o]}function yG(o,c){o.action=c}function OT(o){var c=Gt(),p=ht;if(p!==null)return kT(c,p,o);Gt(),c=c.memoizedState,p=Gt();var x=p.queue.dispatch;return p.memoizedState=o,[c,x,!1]}function ul(o,c,p,x){return o={tag:o,create:p,deps:x,inst:c,next:null},c=Fe.updateQueue,c===null&&(c=Pv(),Fe.updateQueue=c),p=c.lastEffect,p===null?c.lastEffect=o.next=o:(x=p.next,p.next=o,o.next=x,c.lastEffect=o),o}function kp(){return{destroy:void 0,resource:void 0}}function MT(){return Gt().memoizedState}function Op(o,c,p,x){var w=Gn();x=x===void 0?null:x,Fe.flags|=o,w.memoizedState=ul(1|c,kp(),p,x)}function Tu(o,c,p,x){var w=Gt();x=x===void 0?null:x;var C=w.memoizedState.inst;ht!==null&&x!==null&&Ev(x,ht.memoizedState.deps)?w.memoizedState=ul(c,C,p,x):(Fe.flags|=o,w.memoizedState=ul(1|c,C,p,x))}function PT(o,c){Op(8390656,8,o,c)}function DT(o,c){Tu(2048,8,o,c)}function RT(o,c){return Tu(4,2,o,c)}function IT(o,c){return Tu(4,4,o,c)}function $T(o,c){if(typeof c=="function"){o=o();var p=c(o);return function(){typeof p=="function"?p():c(null)}}if(c!=null)return o=o(),c.current=o,function(){c.current=null}}function LT(o,c,p){p=p!=null?p.concat([o]):null,Tu(4,4,$T.bind(null,c,o),p)}function Bv(){}function BT(o,c){var p=Gt();c=c===void 0?null:c;var x=p.memoizedState;return c!==null&&Ev(c,x[1])?x[0]:(p.memoizedState=[o,c],o)}function zT(o,c){var p=Gt();c=c===void 0?null:c;var x=p.memoizedState;if(c!==null&&Ev(c,x[1]))return x[0];if(x=o(),Hs){gr(!0);try{o()}finally{gr(!1)}}return p.memoizedState=[x,c],x}function zv(o,c,p){return p===void 0||(Li&1073741824)!==0?o.memoizedState=c:(o.memoizedState=p,o=Uk(),Fe.lanes|=o,Hi|=o,p)}function qT(o,c,p,x){return er(p,c)?p:ol.current!==null?(o=zv(o,p,x),er(o,c)||(un=!0),o):(Li&42)===0?(un=!0,o.memoizedState=p):(o=Uk(),Fe.lanes|=o,Hi|=o,c)}function FT(o,c,p,x,w){var C=V.p;V.p=C!==0&&8>C?C:8;var P=I.T,$={};I.T=$,Uv(o,!1,c,p);try{var G=w(),re=I.S;if(re!==null&&re($,G),G!==null&&typeof G=="object"&&typeof G.then=="function"){var de=hG(G,x);ku(o,c,de,ir(o))}else ku(o,c,x,ir(o))}catch(me){ku(o,c,{then:function(){},status:"rejected",reason:me},ir())}finally{V.p=C,I.T=P}}function vG(){}function qv(o,c,p,x){if(o.tag!==5)throw Error(r(476));var w=UT(o).queue;FT(o,w,c,F,p===null?vG:function(){return VT(o),p(x)})}function UT(o){var c=o.memoizedState;if(c!==null)return c;c={memoizedState:F,baseState:F,baseQueue:null,queue:{pending:null,lanes:0,dispatch:null,lastRenderedReducer:Ya,lastRenderedState:F},next:null};var p={};return c.next={memoizedState:p,baseState:p,baseQueue:null,queue:{pending:null,lanes:0,dispatch:null,lastRenderedReducer:Ya,lastRenderedState:p},next:null},o.memoizedState=c,o=o.alternate,o!==null&&(o.memoizedState=c),c}function VT(o){var c=UT(o).next.queue;ku(o,c,{},ir())}function Fv(){return _n(Ku)}function HT(){return Gt().memoizedState}function GT(){return Gt().memoizedState}function bG(o){for(var c=o.return;c!==null;){switch(c.tag){case 24:case 3:var p=ir();o=Ii(p);var x=$i(c,o,p);x!==null&&(sr(x,c,p),Nu(x,c,p)),c={cache:yv()},o.payload=c;return}c=c.return}}function jG(o,c,p){var x=ir();p={lane:x,revertLane:0,action:p,hasEagerState:!1,eagerState:null,next:null},Mp(o)?KT(c,p):(p=lv(o,c,p,x),p!==null&&(sr(p,o,x),YT(p,c,x)))}function WT(o,c,p){var x=ir();ku(o,c,p,x)}function ku(o,c,p,x){var w={lane:x,revertLane:0,action:p,hasEagerState:!1,eagerState:null,next:null};if(Mp(o))KT(c,w);else{var C=o.alternate;if(o.lanes===0&&(C===null||C.lanes===0)&&(C=c.lastRenderedReducer,C!==null))try{var P=c.lastRenderedState,$=C(P,p);if(w.hasEagerState=!0,w.eagerState=$,er($,P))return mp(o,c,w,0),At===null&&hp(),!1}catch{}if(p=lv(o,c,w,x),p!==null)return sr(p,o,x),YT(p,c,x),!0}return!1}function Uv(o,c,p,x){if(x={lane:2,revertLane:jb(),action:x,hasEagerState:!1,eagerState:null,next:null},Mp(o)){if(c)throw Error(r(479))}else c=lv(o,p,x,2),c!==null&&sr(c,o,2)}function Mp(o){var c=o.alternate;return o===Fe||c!==null&&c===Fe}function KT(o,c){ll=Cp=!0;var p=o.pending;p===null?c.next=c:(c.next=p.next,p.next=c),o.pending=c}function YT(o,c,p){if((p&4194048)!==0){var x=c.lanes;x&=o.pendingLanes,p|=x,c.lanes=p,rE(o,p)}}var Pp={readContext:_n,use:Ep,useCallback:qt,useContext:qt,useEffect:qt,useImperativeHandle:qt,useLayoutEffect:qt,useInsertionEffect:qt,useMemo:qt,useReducer:qt,useRef:qt,useState:qt,useDebugValue:qt,useDeferredValue:qt,useTransition:qt,useSyncExternalStore:qt,useId:qt,useHostTransitionStatus:qt,useFormState:qt,useActionState:qt,useOptimistic:qt,useMemoCache:qt,useCacheRefresh:qt},XT={readContext:_n,use:Ep,useCallback:function(o,c){return Gn().memoizedState=[o,c===void 0?null:c],o},useContext:_n,useEffect:PT,useImperativeHandle:function(o,c,p){p=p!=null?p.concat([o]):null,Op(4194308,4,$T.bind(null,c,o),p)},useLayoutEffect:function(o,c){return Op(4194308,4,o,c)},useInsertionEffect:function(o,c){Op(4,2,o,c)},useMemo:function(o,c){var p=Gn();c=c===void 0?null:c;var x=o();if(Hs){gr(!0);try{o()}finally{gr(!1)}}return p.memoizedState=[x,c],x},useReducer:function(o,c,p){var x=Gn();if(p!==void 0){var w=p(c);if(Hs){gr(!0);try{p(c)}finally{gr(!1)}}}else w=c;return x.memoizedState=x.baseState=w,o={pending:null,lanes:0,dispatch:null,lastRenderedReducer:o,lastRenderedState:w},x.queue=o,o=o.dispatch=jG.bind(null,Fe,o),[x.memoizedState,o]},useRef:function(o){var c=Gn();return o={current:o},c.memoizedState=o},useState:function(o){o=$v(o);var c=o.queue,p=WT.bind(null,Fe,c);return c.dispatch=p,[o.memoizedState,p]},useDebugValue:Bv,useDeferredValue:function(o,c){var p=Gn();return zv(p,o,c)},useTransition:function(){var o=$v(!1);return o=FT.bind(null,Fe,o.queue,!0,!1),Gn().memoizedState=o,[!1,o]},useSyncExternalStore:function(o,c,p){var x=Fe,w=Gn();if(st){if(p===void 0)throw Error(r(407));p=p()}else{if(p=c(),At===null)throw Error(r(349));(et&124)!==0||gT(x,c,p)}w.memoizedState=p;var C={value:p,getSnapshot:c};return w.queue=C,PT(vT.bind(null,x,C,o),[o]),x.flags|=2048,ul(9,kp(),yT.bind(null,x,C,p,c),null),p},useId:function(){var o=Gn(),c=At.identifierPrefix;if(st){var p=Ga,x=Ha;p=(x&~(1<<32-jt(x)-1)).toString(32)+p,c="Â«"+c+"R"+p,p=_p++,0<p&&(c+="H"+p.toString(32)),c+="Â»"}else p=mG++,c="Â«"+c+"r"+p.toString(32)+"Â»";return o.memoizedState=c},useHostTransitionStatus:Fv,useFormState:ET,useActionState:ET,useOptimistic:function(o){var c=Gn();c.memoizedState=c.baseState=o;var p={pending:null,lanes:0,dispatch:null,lastRenderedReducer:null,lastRenderedState:null};return c.queue=p,c=Uv.bind(null,Fe,!0,p),p.dispatch=c,[o,c]},useMemoCache:Dv,useCacheRefresh:function(){return Gn().memoizedState=bG.bind(null,Fe)}},QT={readContext:_n,use:Ep,useCallback:BT,useContext:_n,useEffect:DT,useImperativeHandle:LT,useInsertionEffect:RT,useLayoutEffect:IT,useMemo:zT,useReducer:Tp,useRef:MT,useState:function(){return Tp(Ya)},useDebugValue:Bv,useDeferredValue:function(o,c){var p=Gt();return qT(p,ht.memoizedState,o,c)},useTransition:function(){var o=Tp(Ya)[0],c=Gt().memoizedState;return[typeof o=="boolean"?o:Eu(o),c]},useSyncExternalStore:xT,useId:HT,useHostTransitionStatus:Fv,useFormState:TT,useActionState:TT,useOptimistic:function(o,c){var p=Gt();return wT(p,ht,o,c)},useMemoCache:Dv,useCacheRefresh:GT},wG={readContext:_n,use:Ep,useCallback:BT,useContext:_n,useEffect:DT,useImperativeHandle:LT,useInsertionEffect:RT,useLayoutEffect:IT,useMemo:zT,useReducer:Iv,useRef:MT,useState:function(){return Iv(Ya)},useDebugValue:Bv,useDeferredValue:function(o,c){var p=Gt();return ht===null?zv(p,o,c):qT(p,ht.memoizedState,o,c)},useTransition:function(){var o=Iv(Ya)[0],c=Gt().memoizedState;return[typeof o=="boolean"?o:Eu(o),c]},useSyncExternalStore:xT,useId:HT,useHostTransitionStatus:Fv,useFormState:OT,useActionState:OT,useOptimistic:function(o,c){var p=Gt();return ht!==null?wT(p,ht,o,c):(p.baseState=o,[o,p.queue.dispatch])},useMemoCache:Dv,useCacheRefresh:GT},dl=null,Ou=0;function Dp(o){var c=Ou;return Ou+=1,dl===null&&(dl=[]),lT(dl,o,c)}function Mu(o,c){c=c.props.ref,o.ref=c!==void 0?c:null}function Rp(o,c){throw c.$$typeof===h?Error(r(525)):(o=Object.prototype.toString.call(c),Error(r(31,o==="[object Object]"?"object with keys {"+Object.keys(c).join(", ")+"}":o)))}function ZT(o){var c=o._init;return c(o._payload)}function JT(o){function c(J,Q){if(o){var te=J.deletions;te===null?(J.deletions=[Q],J.flags|=16):te.push(Q)}}function p(J,Q){if(!o)return null;for(;Q!==null;)c(J,Q),Q=Q.sibling;return null}function x(J){for(var Q=new Map;J!==null;)J.key!==null?Q.set(J.key,J):Q.set(J.index,J),J=J.sibling;return Q}function w(J,Q){return J=Va(J,Q),J.index=0,J.sibling=null,J}function C(J,Q,te){return J.index=te,o?(te=J.alternate,te!==null?(te=te.index,te<Q?(J.flags|=67108866,Q):te):(J.flags|=67108866,Q)):(J.flags|=1048576,Q)}function P(J){return o&&J.alternate===null&&(J.flags|=67108866),J}function $(J,Q,te,pe){return Q===null||Q.tag!==6?(Q=uv(te,J.mode,pe),Q.return=J,Q):(Q=w(Q,te),Q.return=J,Q)}function G(J,Q,te,pe){var _e=te.type;return _e===j?de(J,Q,te.props.children,pe,te.key):Q!==null&&(Q.elementType===_e||typeof _e=="object"&&_e!==null&&_e.$$typeof===M&&ZT(_e)===Q.type)?(Q=w(Q,te.props),Mu(Q,te),Q.return=J,Q):(Q=gp(te.type,te.key,te.props,null,J.mode,pe),Mu(Q,te),Q.return=J,Q)}function re(J,Q,te,pe){return Q===null||Q.tag!==4||Q.stateNode.containerInfo!==te.containerInfo||Q.stateNode.implementation!==te.implementation?(Q=dv(te,J.mode,pe),Q.return=J,Q):(Q=w(Q,te.children||[]),Q.return=J,Q)}function de(J,Q,te,pe,_e){return Q===null||Q.tag!==7?(Q=$s(te,J.mode,pe,_e),Q.return=J,Q):(Q=w(Q,te),Q.return=J,Q)}function me(J,Q,te){if(typeof Q=="string"&&Q!==""||typeof Q=="number"||typeof Q=="bigint")return Q=uv(""+Q,J.mode,te),Q.return=J,Q;if(typeof Q=="object"&&Q!==null){switch(Q.$$typeof){case g:return te=gp(Q.type,Q.key,Q.props,null,J.mode,te),Mu(te,Q),te.return=J,te;case y:return Q=dv(Q,J.mode,te),Q.return=J,Q;case M:var pe=Q._init;return Q=pe(Q._payload),me(J,Q,te)}if(H(Q)||q(Q))return Q=$s(Q,J.mode,te,null),Q.return=J,Q;if(typeof Q.then=="function")return me(J,Dp(Q),te);if(Q.$$typeof===_)return me(J,jp(J,Q),te);Rp(J,Q)}return null}function se(J,Q,te,pe){var _e=Q!==null?Q.key:null;if(typeof te=="string"&&te!==""||typeof te=="number"||typeof te=="bigint")return _e!==null?null:$(J,Q,""+te,pe);if(typeof te=="object"&&te!==null){switch(te.$$typeof){case g:return te.key===_e?G(J,Q,te,pe):null;case y:return te.key===_e?re(J,Q,te,pe):null;case M:return _e=te._init,te=_e(te._payload),se(J,Q,te,pe)}if(H(te)||q(te))return _e!==null?null:de(J,Q,te,pe,null);if(typeof te.then=="function")return se(J,Q,Dp(te),pe);if(te.$$typeof===_)return se(J,Q,jp(J,te),pe);Rp(J,te)}return null}function oe(J,Q,te,pe,_e){if(typeof pe=="string"&&pe!==""||typeof pe=="number"||typeof pe=="bigint")return J=J.get(te)||null,$(Q,J,""+pe,_e);if(typeof pe=="object"&&pe!==null){switch(pe.$$typeof){case g:return J=J.get(pe.key===null?te:pe.key)||null,G(Q,J,pe,_e);case y:return J=J.get(pe.key===null?te:pe.key)||null,re(Q,J,pe,_e);case M:var He=pe._init;return pe=He(pe._payload),oe(J,Q,te,pe,_e)}if(H(pe)||q(pe))return J=J.get(te)||null,de(Q,J,pe,_e,null);if(typeof pe.then=="function")return oe(J,Q,te,Dp(pe),_e);if(pe.$$typeof===_)return oe(J,Q,te,jp(Q,pe),_e);Rp(Q,pe)}return null}function Ie(J,Q,te,pe){for(var _e=null,He=null,Oe=Q,Pe=Q=0,fn=null;Oe!==null&&Pe<te.length;Pe++){Oe.index>Pe?(fn=Oe,Oe=null):fn=Oe.sibling;var at=se(J,Oe,te[Pe],pe);if(at===null){Oe===null&&(Oe=fn);break}o&&Oe&&at.alternate===null&&c(J,Oe),Q=C(at,Q,Pe),He===null?_e=at:He.sibling=at,He=at,Oe=fn}if(Pe===te.length)return p(J,Oe),st&&Bs(J,Pe),_e;if(Oe===null){for(;Pe<te.length;Pe++)Oe=me(J,te[Pe],pe),Oe!==null&&(Q=C(Oe,Q,Pe),He===null?_e=Oe:He.sibling=Oe,He=Oe);return st&&Bs(J,Pe),_e}for(Oe=x(Oe);Pe<te.length;Pe++)fn=oe(Oe,J,Pe,te[Pe],pe),fn!==null&&(o&&fn.alternate!==null&&Oe.delete(fn.key===null?Pe:fn.key),Q=C(fn,Q,Pe),He===null?_e=fn:He.sibling=fn,He=fn);return o&&Oe.forEach(function(es){return c(J,es)}),st&&Bs(J,Pe),_e}function Me(J,Q,te,pe){if(te==null)throw Error(r(151));for(var _e=null,He=null,Oe=Q,Pe=Q=0,fn=null,at=te.next();Oe!==null&&!at.done;Pe++,at=te.next()){Oe.index>Pe?(fn=Oe,Oe=null):fn=Oe.sibling;var es=se(J,Oe,at.value,pe);if(es===null){Oe===null&&(Oe=fn);break}o&&Oe&&es.alternate===null&&c(J,Oe),Q=C(es,Q,Pe),He===null?_e=es:He.sibling=es,He=es,Oe=fn}if(at.done)return p(J,Oe),st&&Bs(J,Pe),_e;if(Oe===null){for(;!at.done;Pe++,at=te.next())at=me(J,at.value,pe),at!==null&&(Q=C(at,Q,Pe),He===null?_e=at:He.sibling=at,He=at);return st&&Bs(J,Pe),_e}for(Oe=x(Oe);!at.done;Pe++,at=te.next())at=oe(Oe,J,Pe,at.value,pe),at!==null&&(o&&at.alternate!==null&&Oe.delete(at.key===null?Pe:at.key),Q=C(at,Q,Pe),He===null?_e=at:He.sibling=at,He=at);return o&&Oe.forEach(function(SW){return c(J,SW)}),st&&Bs(J,Pe),_e}function xt(J,Q,te,pe){if(typeof te=="object"&&te!==null&&te.type===j&&te.key===null&&(te=te.props.children),typeof te=="object"&&te!==null){switch(te.$$typeof){case g:e:{for(var _e=te.key;Q!==null;){if(Q.key===_e){if(_e=te.type,_e===j){if(Q.tag===7){p(J,Q.sibling),pe=w(Q,te.props.children),pe.return=J,J=pe;break e}}else if(Q.elementType===_e||typeof _e=="object"&&_e!==null&&_e.$$typeof===M&&ZT(_e)===Q.type){p(J,Q.sibling),pe=w(Q,te.props),Mu(pe,te),pe.return=J,J=pe;break e}p(J,Q);break}else c(J,Q);Q=Q.sibling}te.type===j?(pe=$s(te.props.children,J.mode,pe,te.key),pe.return=J,J=pe):(pe=gp(te.type,te.key,te.props,null,J.mode,pe),Mu(pe,te),pe.return=J,J=pe)}return P(J);case y:e:{for(_e=te.key;Q!==null;){if(Q.key===_e)if(Q.tag===4&&Q.stateNode.containerInfo===te.containerInfo&&Q.stateNode.implementation===te.implementation){p(J,Q.sibling),pe=w(Q,te.children||[]),pe.return=J,J=pe;break e}else{p(J,Q);break}else c(J,Q);Q=Q.sibling}pe=dv(te,J.mode,pe),pe.return=J,J=pe}return P(J);case M:return _e=te._init,te=_e(te._payload),xt(J,Q,te,pe)}if(H(te))return Ie(J,Q,te,pe);if(q(te)){if(_e=q(te),typeof _e!="function")throw Error(r(150));return te=_e.call(te),Me(J,Q,te,pe)}if(typeof te.then=="function")return xt(J,Q,Dp(te),pe);if(te.$$typeof===_)return xt(J,Q,jp(J,te),pe);Rp(J,te)}return typeof te=="string"&&te!==""||typeof te=="number"||typeof te=="bigint"?(te=""+te,Q!==null&&Q.tag===6?(p(J,Q.sibling),pe=w(Q,te),pe.return=J,J=pe):(p(J,Q),pe=uv(te,J.mode,pe),pe.return=J,J=pe),P(J)):p(J,Q)}return function(J,Q,te,pe){try{Ou=0;var _e=xt(J,Q,te,pe);return dl=null,_e}catch(Oe){if(Oe===wu||Oe===Sp)throw Oe;var He=tr(29,Oe,null,J.mode);return He.lanes=pe,He.return=J,He}}}var fl=JT(!0),ek=JT(!1),Nr=K(null),pa=null;function Bi(o){var c=o.alternate;ne(Zt,Zt.current&1),ne(Nr,o),pa===null&&(c===null||ol.current!==null||c.memoizedState!==null)&&(pa=o)}function tk(o){if(o.tag===22){if(ne(Zt,Zt.current),ne(Nr,o),pa===null){var c=o.alternate;c!==null&&c.memoizedState!==null&&(pa=o)}}else zi()}function zi(){ne(Zt,Zt.current),ne(Nr,Nr.current)}function Xa(o){Y(Nr),pa===o&&(pa=null),Y(Zt)}var Zt=K(0);function Ip(o){for(var c=o;c!==null;){if(c.tag===13){var p=c.memoizedState;if(p!==null&&(p=p.dehydrated,p===null||p.data==="$?"||Pb(p)))return c}else if(c.tag===19&&c.memoizedProps.revealOrder!==void 0){if((c.flags&128)!==0)return c}else if(c.child!==null){c.child.return=c,c=c.child;continue}if(c===o)break;for(;c.sibling===null;){if(c.return===null||c.return===o)return null;c=c.return}c.sibling.return=c.return,c=c.sibling}return null}function Vv(o,c,p,x){c=o.memoizedState,p=p(x,c),p=p==null?c:m({},c,p),o.memoizedState=p,o.lanes===0&&(o.updateQueue.baseState=p)}var Hv={enqueueSetState:function(o,c,p){o=o._reactInternals;var x=ir(),w=Ii(x);w.payload=c,p!=null&&(w.callback=p),c=$i(o,w,x),c!==null&&(sr(c,o,x),Nu(c,o,x))},enqueueReplaceState:function(o,c,p){o=o._reactInternals;var x=ir(),w=Ii(x);w.tag=1,w.payload=c,p!=null&&(w.callback=p),c=$i(o,w,x),c!==null&&(sr(c,o,x),Nu(c,o,x))},enqueueForceUpdate:function(o,c){o=o._reactInternals;var p=ir(),x=Ii(p);x.tag=2,c!=null&&(x.callback=c),c=$i(o,x,p),c!==null&&(sr(c,o,p),Nu(c,o,p))}};function nk(o,c,p,x,w,C,P){return o=o.stateNode,typeof o.shouldComponentUpdate=="function"?o.shouldComponentUpdate(x,C,P):c.prototype&&c.prototype.isPureReactComponent?!hu(p,x)||!hu(w,C):!0}function rk(o,c,p,x){o=c.state,typeof c.componentWillReceiveProps=="function"&&c.componentWillReceiveProps(p,x),typeof c.UNSAFE_componentWillReceiveProps=="function"&&c.UNSAFE_componentWillReceiveProps(p,x),c.state!==o&&Hv.enqueueReplaceState(c,c.state,null)}function Gs(o,c){var p=c;if("ref"in c){p={};for(var x in c)x!=="ref"&&(p[x]=c[x])}if(o=o.defaultProps){p===c&&(p=m({},p));for(var w in o)p[w]===void 0&&(p[w]=o[w])}return p}var $p=typeof reportError=="function"?reportError:function(o){if(typeof window=="object"&&typeof window.ErrorEvent=="function"){var c=new window.ErrorEvent("error",{bubbles:!0,cancelable:!0,message:typeof o=="object"&&o!==null&&typeof o.message=="string"?String(o.message):String(o),error:o});if(!window.dispatchEvent(c))return}else if(typeof process=="object"&&typeof process.emit=="function"){process.emit("uncaughtException",o);return}console.error(o)};function ak(o){$p(o)}function ik(o){console.error(o)}function sk(o){$p(o)}function Lp(o,c){try{var p=o.onUncaughtError;p(c.value,{componentStack:c.stack})}catch(x){setTimeout(function(){throw x})}}function ok(o,c,p){try{var x=o.onCaughtError;x(p.value,{componentStack:p.stack,errorBoundary:c.tag===1?c.stateNode:null})}catch(w){setTimeout(function(){throw w})}}function Gv(o,c,p){return p=Ii(p),p.tag=3,p.payload={element:null},p.callback=function(){Lp(o,c)},p}function lk(o){return o=Ii(o),o.tag=3,o}function ck(o,c,p,x){var w=p.type.getDerivedStateFromError;if(typeof w=="function"){var C=x.value;o.payload=function(){return w(C)},o.callback=function(){ok(c,p,x)}}var P=p.stateNode;P!==null&&typeof P.componentDidCatch=="function"&&(o.callback=function(){ok(c,p,x),typeof w!="function"&&(Gi===null?Gi=new Set([this]):Gi.add(this));var $=x.stack;this.componentDidCatch(x.value,{componentStack:$!==null?$:""})})}function SG(o,c,p,x,w){if(p.flags|=32768,x!==null&&typeof x=="object"&&typeof x.then=="function"){if(c=p.alternate,c!==null&&vu(c,p,w,!0),p=Nr.current,p!==null){switch(p.tag){case 13:return pa===null?xb():p.alternate===null&&Lt===0&&(Lt=3),p.flags&=-257,p.flags|=65536,p.lanes=w,x===jv?p.flags|=16384:(c=p.updateQueue,c===null?p.updateQueue=new Set([x]):c.add(x),yb(o,x,w)),!1;case 22:return p.flags|=65536,x===jv?p.flags|=16384:(c=p.updateQueue,c===null?(c={transitions:null,markerInstances:null,retryQueue:new Set([x])},p.updateQueue=c):(p=c.retryQueue,p===null?c.retryQueue=new Set([x]):p.add(x)),yb(o,x,w)),!1}throw Error(r(435,p.tag))}return yb(o,x,w),xb(),!1}if(st)return c=Nr.current,c!==null?((c.flags&65536)===0&&(c.flags|=256),c.flags|=65536,c.lanes=w,x!==hv&&(o=Error(r(422),{cause:x}),yu(br(o,p)))):(x!==hv&&(c=Error(r(423),{cause:x}),yu(br(c,p))),o=o.current.alternate,o.flags|=65536,w&=-w,o.lanes|=w,x=br(x,p),w=Gv(o.stateNode,x,w),Nv(o,w),Lt!==4&&(Lt=2)),!1;var C=Error(r(520),{cause:x});if(C=br(C,p),Bu===null?Bu=[C]:Bu.push(C),Lt!==4&&(Lt=2),c===null)return!0;x=br(x,p),p=c;do{switch(p.tag){case 3:return p.flags|=65536,o=w&-w,p.lanes|=o,o=Gv(p.stateNode,x,o),Nv(p,o),!1;case 1:if(c=p.type,C=p.stateNode,(p.flags&128)===0&&(typeof c.getDerivedStateFromError=="function"||C!==null&&typeof C.componentDidCatch=="function"&&(Gi===null||!Gi.has(C))))return p.flags|=65536,w&=-w,p.lanes|=w,w=lk(w),ck(w,o,p,x),Nv(p,w),!1}p=p.return}while(p!==null);return!1}var uk=Error(r(461)),un=!1;function mn(o,c,p,x){c.child=o===null?ek(c,null,p,x):fl(c,o.child,p,x)}function dk(o,c,p,x,w){p=p.render;var C=c.ref;if("ref"in x){var P={};for(var $ in x)$!=="ref"&&(P[$]=x[$])}else P=x;return Us(c),x=Tv(o,c,p,P,C,w),$=kv(),o!==null&&!un?(Ov(o,c,w),Qa(o,c,w)):(st&&$&&fv(c),c.flags|=1,mn(o,c,x,w),c.child)}function fk(o,c,p,x,w){if(o===null){var C=p.type;return typeof C=="function"&&!cv(C)&&C.defaultProps===void 0&&p.compare===null?(c.tag=15,c.type=C,pk(o,c,C,x,w)):(o=gp(p.type,null,x,c,c.mode,w),o.ref=c.ref,o.return=c,c.child=o)}if(C=o.child,!eb(o,w)){var P=C.memoizedProps;if(p=p.compare,p=p!==null?p:hu,p(P,x)&&o.ref===c.ref)return Qa(o,c,w)}return c.flags|=1,o=Va(C,x),o.ref=c.ref,o.return=c,c.child=o}function pk(o,c,p,x,w){if(o!==null){var C=o.memoizedProps;if(hu(C,x)&&o.ref===c.ref)if(un=!1,c.pendingProps=x=C,eb(o,w))(o.flags&131072)!==0&&(un=!0);else return c.lanes=o.lanes,Qa(o,c,w)}return Wv(o,c,p,x,w)}function hk(o,c,p){var x=c.pendingProps,w=x.children,C=o!==null?o.memoizedState:null;if(x.mode==="hidden"){if((c.flags&128)!==0){if(x=C!==null?C.baseLanes|p:p,o!==null){for(w=c.child=o.child,C=0;w!==null;)C=C|w.lanes|w.childLanes,w=w.sibling;c.childLanes=C&~x}else c.childLanes=0,c.child=null;return mk(o,c,x,p)}if((p&536870912)!==0)c.memoizedState={baseLanes:0,cachePool:null},o!==null&&wp(c,C!==null?C.cachePool:null),C!==null?pT(c,C):Cv(),tk(c);else return c.lanes=c.childLanes=536870912,mk(o,c,C!==null?C.baseLanes|p:p,p)}else C!==null?(wp(c,C.cachePool),pT(c,C),zi(),c.memoizedState=null):(o!==null&&wp(c,null),Cv(),zi());return mn(o,c,w,p),c.child}function mk(o,c,p,x){var w=bv();return w=w===null?null:{parent:Qt._currentValue,pool:w},c.memoizedState={baseLanes:p,cachePool:w},o!==null&&wp(c,null),Cv(),tk(c),o!==null&&vu(o,c,x,!0),null}function Bp(o,c){var p=c.ref;if(p===null)o!==null&&o.ref!==null&&(c.flags|=4194816);else{if(typeof p!="function"&&typeof p!="object")throw Error(r(284));(o===null||o.ref!==p)&&(c.flags|=4194816)}}function Wv(o,c,p,x,w){return Us(c),p=Tv(o,c,p,x,void 0,w),x=kv(),o!==null&&!un?(Ov(o,c,w),Qa(o,c,w)):(st&&x&&fv(c),c.flags|=1,mn(o,c,p,w),c.child)}function xk(o,c,p,x,w,C){return Us(c),c.updateQueue=null,p=mT(c,x,p,w),hT(o),x=kv(),o!==null&&!un?(Ov(o,c,C),Qa(o,c,C)):(st&&x&&fv(c),c.flags|=1,mn(o,c,p,C),c.child)}function gk(o,c,p,x,w){if(Us(c),c.stateNode===null){var C=nl,P=p.contextType;typeof P=="object"&&P!==null&&(C=_n(P)),C=new p(x,C),c.memoizedState=C.state!==null&&C.state!==void 0?C.state:null,C.updater=Hv,c.stateNode=C,C._reactInternals=c,C=c.stateNode,C.props=x,C.state=c.memoizedState,C.refs={},wv(c),P=p.contextType,C.context=typeof P=="object"&&P!==null?_n(P):nl,C.state=c.memoizedState,P=p.getDerivedStateFromProps,typeof P=="function"&&(Vv(c,p,P,x),C.state=c.memoizedState),typeof p.getDerivedStateFromProps=="function"||typeof C.getSnapshotBeforeUpdate=="function"||typeof C.UNSAFE_componentWillMount!="function"&&typeof C.componentWillMount!="function"||(P=C.state,typeof C.componentWillMount=="function"&&C.componentWillMount(),typeof C.UNSAFE_componentWillMount=="function"&&C.UNSAFE_componentWillMount(),P!==C.state&&Hv.enqueueReplaceState(C,C.state,null),Cu(c,x,C,w),Au(),C.state=c.memoizedState),typeof C.componentDidMount=="function"&&(c.flags|=4194308),x=!0}else if(o===null){C=c.stateNode;var $=c.memoizedProps,G=Gs(p,$);C.props=G;var re=C.context,de=p.contextType;P=nl,typeof de=="object"&&de!==null&&(P=_n(de));var me=p.getDerivedStateFromProps;de=typeof me=="function"||typeof C.getSnapshotBeforeUpdate=="function",$=c.pendingProps!==$,de||typeof C.UNSAFE_componentWillReceiveProps!="function"&&typeof C.componentWillReceiveProps!="function"||($||re!==P)&&rk(c,C,x,P),Ri=!1;var se=c.memoizedState;C.state=se,Cu(c,x,C,w),Au(),re=c.memoizedState,$||se!==re||Ri?(typeof me=="function"&&(Vv(c,p,me,x),re=c.memoizedState),(G=Ri||nk(c,p,G,x,se,re,P))?(de||typeof C.UNSAFE_componentWillMount!="function"&&typeof C.componentWillMount!="function"||(typeof C.componentWillMount=="function"&&C.componentWillMount(),typeof C.UNSAFE_componentWillMount=="function"&&C.UNSAFE_componentWillMount()),typeof C.componentDidMount=="function"&&(c.flags|=4194308)):(typeof C.componentDidMount=="function"&&(c.flags|=4194308),c.memoizedProps=x,c.memoizedState=re),C.props=x,C.state=re,C.context=P,x=G):(typeof C.componentDidMount=="function"&&(c.flags|=4194308),x=!1)}else{C=c.stateNode,Sv(o,c),P=c.memoizedProps,de=Gs(p,P),C.props=de,me=c.pendingProps,se=C.context,re=p.contextType,G=nl,typeof re=="object"&&re!==null&&(G=_n(re)),$=p.getDerivedStateFromProps,(re=typeof $=="function"||typeof C.getSnapshotBeforeUpdate=="function")||typeof C.UNSAFE_componentWillReceiveProps!="function"&&typeof C.componentWillReceiveProps!="function"||(P!==me||se!==G)&&rk(c,C,x,G),Ri=!1,se=c.memoizedState,C.state=se,Cu(c,x,C,w),Au();var oe=c.memoizedState;P!==me||se!==oe||Ri||o!==null&&o.dependencies!==null&&bp(o.dependencies)?(typeof $=="function"&&(Vv(c,p,$,x),oe=c.memoizedState),(de=Ri||nk(c,p,de,x,se,oe,G)||o!==null&&o.dependencies!==null&&bp(o.dependencies))?(re||typeof C.UNSAFE_componentWillUpdate!="function"&&typeof C.componentWillUpdate!="function"||(typeof C.componentWillUpdate=="function"&&C.componentWillUpdate(x,oe,G),typeof C.UNSAFE_componentWillUpdate=="function"&&C.UNSAFE_componentWillUpdate(x,oe,G)),typeof C.componentDidUpdate=="function"&&(c.flags|=4),typeof C.getSnapshotBeforeUpdate=="function"&&(c.flags|=1024)):(typeof C.componentDidUpdate!="function"||P===o.memoizedProps&&se===o.memoizedState||(c.flags|=4),typeof C.getSnapshotBeforeUpdate!="function"||P===o.memoizedProps&&se===o.memoizedState||(c.flags|=1024),c.memoizedProps=x,c.memoizedState=oe),C.props=x,C.state=oe,C.context=G,x=de):(typeof C.componentDidUpdate!="function"||P===o.memoizedProps&&se===o.memoizedState||(c.flags|=4),typeof C.getSnapshotBeforeUpdate!="function"||P===o.memoizedProps&&se===o.memoizedState||(c.flags|=1024),x=!1)}return C=x,Bp(o,c),x=(c.flags&128)!==0,C||x?(C=c.stateNode,p=x&&typeof p.getDerivedStateFromError!="function"?null:C.render(),c.flags|=1,o!==null&&x?(c.child=fl(c,o.child,null,w),c.child=fl(c,null,p,w)):mn(o,c,p,w),c.memoizedState=C.state,o=c.child):o=Qa(o,c,w),o}function yk(o,c,p,x){return gu(),c.flags|=256,mn(o,c,p,x),c.child}var Kv={dehydrated:null,treeContext:null,retryLane:0,hydrationErrors:null};function Yv(o){return{baseLanes:o,cachePool:iT()}}function Xv(o,c,p){return o=o!==null?o.childLanes&~p:0,c&&(o|=Ar),o}function vk(o,c,p){var x=c.pendingProps,w=!1,C=(c.flags&128)!==0,P;if((P=C)||(P=o!==null&&o.memoizedState===null?!1:(Zt.current&2)!==0),P&&(w=!0,c.flags&=-129),P=(c.flags&32)!==0,c.flags&=-33,o===null){if(st){if(w?Bi(c):zi(),st){var $=$t,G;if(G=$){e:{for(G=$,$=fa;G.nodeType!==8;){if(!$){$=null;break e}if(G=Wr(G.nextSibling),G===null){$=null;break e}}$=G}$!==null?(c.memoizedState={dehydrated:$,treeContext:Ls!==null?{id:Ha,overflow:Ga}:null,retryLane:536870912,hydrationErrors:null},G=tr(18,null,null,0),G.stateNode=$,G.return=c,c.child=G,In=c,$t=null,G=!0):G=!1}G||qs(c)}if($=c.memoizedState,$!==null&&($=$.dehydrated,$!==null))return Pb($)?c.lanes=32:c.lanes=536870912,null;Xa(c)}return $=x.children,x=x.fallback,w?(zi(),w=c.mode,$=zp({mode:"hidden",children:$},w),x=$s(x,w,p,null),$.return=c,x.return=c,$.sibling=x,c.child=$,w=c.child,w.memoizedState=Yv(p),w.childLanes=Xv(o,P,p),c.memoizedState=Kv,x):(Bi(c),Qv(c,$))}if(G=o.memoizedState,G!==null&&($=G.dehydrated,$!==null)){if(C)c.flags&256?(Bi(c),c.flags&=-257,c=Zv(o,c,p)):c.memoizedState!==null?(zi(),c.child=o.child,c.flags|=128,c=null):(zi(),w=x.fallback,$=c.mode,x=zp({mode:"visible",children:x.children},$),w=$s(w,$,p,null),w.flags|=2,x.return=c,w.return=c,x.sibling=w,c.child=x,fl(c,o.child,null,p),x=c.child,x.memoizedState=Yv(p),x.childLanes=Xv(o,P,p),c.memoizedState=Kv,c=w);else if(Bi(c),Pb($)){if(P=$.nextSibling&&$.nextSibling.dataset,P)var re=P.dgst;P=re,x=Error(r(419)),x.stack="",x.digest=P,yu({value:x,source:null,stack:null}),c=Zv(o,c,p)}else if(un||vu(o,c,p,!1),P=(p&o.childLanes)!==0,un||P){if(P=At,P!==null&&(x=p&-p,x=(x&42)!==0?1:Dy(x),x=(x&(P.suspendedLanes|p))!==0?0:x,x!==0&&x!==G.retryLane))throw G.retryLane=x,tl(o,x),sr(P,o,x),uk;$.data==="$?"||xb(),c=Zv(o,c,p)}else $.data==="$?"?(c.flags|=192,c.child=o.child,c=null):(o=G.treeContext,$t=Wr($.nextSibling),In=c,st=!0,zs=null,fa=!1,o!==null&&(wr[Sr++]=Ha,wr[Sr++]=Ga,wr[Sr++]=Ls,Ha=o.id,Ga=o.overflow,Ls=c),c=Qv(c,x.children),c.flags|=4096);return c}return w?(zi(),w=x.fallback,$=c.mode,G=o.child,re=G.sibling,x=Va(G,{mode:"hidden",children:x.children}),x.subtreeFlags=G.subtreeFlags&65011712,re!==null?w=Va(re,w):(w=$s(w,$,p,null),w.flags|=2),w.return=c,x.return=c,x.sibling=w,c.child=x,x=w,w=c.child,$=o.child.memoizedState,$===null?$=Yv(p):(G=$.cachePool,G!==null?(re=Qt._currentValue,G=G.parent!==re?{parent:re,pool:re}:G):G=iT(),$={baseLanes:$.baseLanes|p,cachePool:G}),w.memoizedState=$,w.childLanes=Xv(o,P,p),c.memoizedState=Kv,x):(Bi(c),p=o.child,o=p.sibling,p=Va(p,{mode:"visible",children:x.children}),p.return=c,p.sibling=null,o!==null&&(P=c.deletions,P===null?(c.deletions=[o],c.flags|=16):P.push(o)),c.child=p,c.memoizedState=null,p)}function Qv(o,c){return c=zp({mode:"visible",children:c},o.mode),c.return=o,o.child=c}function zp(o,c){return o=tr(22,o,null,c),o.lanes=0,o.stateNode={_visibility:1,_pendingMarkers:null,_retryCache:null,_transitions:null},o}function Zv(o,c,p){return fl(c,o.child,null,p),o=Qv(c,c.pendingProps.children),o.flags|=2,c.memoizedState=null,o}function bk(o,c,p){o.lanes|=c;var x=o.alternate;x!==null&&(x.lanes|=c),xv(o.return,c,p)}function Jv(o,c,p,x,w){var C=o.memoizedState;C===null?o.memoizedState={isBackwards:c,rendering:null,renderingStartTime:0,last:x,tail:p,tailMode:w}:(C.isBackwards=c,C.rendering=null,C.renderingStartTime=0,C.last=x,C.tail=p,C.tailMode=w)}function jk(o,c,p){var x=c.pendingProps,w=x.revealOrder,C=x.tail;if(mn(o,c,x.children,p),x=Zt.current,(x&2)!==0)x=x&1|2,c.flags|=128;else{if(o!==null&&(o.flags&128)!==0)e:for(o=c.child;o!==null;){if(o.tag===13)o.memoizedState!==null&&bk(o,p,c);else if(o.tag===19)bk(o,p,c);else if(o.child!==null){o.child.return=o,o=o.child;continue}if(o===c)break e;for(;o.sibling===null;){if(o.return===null||o.return===c)break e;o=o.return}o.sibling.return=o.return,o=o.sibling}x&=1}switch(ne(Zt,x),w){case"forwards":for(p=c.child,w=null;p!==null;)o=p.alternate,o!==null&&Ip(o)===null&&(w=p),p=p.sibling;p=w,p===null?(w=c.child,c.child=null):(w=p.sibling,p.sibling=null),Jv(c,!1,w,p,C);break;case"backwards":for(p=null,w=c.child,c.child=null;w!==null;){if(o=w.alternate,o!==null&&Ip(o)===null){c.child=w;break}o=w.sibling,w.sibling=p,p=w,w=o}Jv(c,!0,p,null,C);break;case"together":Jv(c,!1,null,null,void 0);break;default:c.memoizedState=null}return c.child}function Qa(o,c,p){if(o!==null&&(c.dependencies=o.dependencies),Hi|=c.lanes,(p&c.childLanes)===0)if(o!==null){if(vu(o,c,p,!1),(p&c.childLanes)===0)return null}else return null;if(o!==null&&c.child!==o.child)throw Error(r(153));if(c.child!==null){for(o=c.child,p=Va(o,o.pendingProps),c.child=p,p.return=c;o.sibling!==null;)o=o.sibling,p=p.sibling=Va(o,o.pendingProps),p.return=c;p.sibling=null}return c.child}function eb(o,c){return(o.lanes&c)!==0?!0:(o=o.dependencies,!!(o!==null&&bp(o)))}function NG(o,c,p){switch(c.tag){case 3:je(c,c.stateNode.containerInfo),Di(c,Qt,o.memoizedState.cache),gu();break;case 27:case 5:Ce(c);break;case 4:je(c,c.stateNode.containerInfo);break;case 10:Di(c,c.type,c.memoizedProps.value);break;case 13:var x=c.memoizedState;if(x!==null)return x.dehydrated!==null?(Bi(c),c.flags|=128,null):(p&c.child.childLanes)!==0?vk(o,c,p):(Bi(c),o=Qa(o,c,p),o!==null?o.sibling:null);Bi(c);break;case 19:var w=(o.flags&128)!==0;if(x=(p&c.childLanes)!==0,x||(vu(o,c,p,!1),x=(p&c.childLanes)!==0),w){if(x)return jk(o,c,p);c.flags|=128}if(w=c.memoizedState,w!==null&&(w.rendering=null,w.tail=null,w.lastEffect=null),ne(Zt,Zt.current),x)break;return null;case 22:case 23:return c.lanes=0,hk(o,c,p);case 24:Di(c,Qt,o.memoizedState.cache)}return Qa(o,c,p)}function wk(o,c,p){if(o!==null)if(o.memoizedProps!==c.pendingProps)un=!0;else{if(!eb(o,p)&&(c.flags&128)===0)return un=!1,NG(o,c,p);un=(o.flags&131072)!==0}else un=!1,st&&(c.flags&1048576)!==0&&ZE(c,vp,c.index);switch(c.lanes=0,c.tag){case 16:e:{o=c.pendingProps;var x=c.elementType,w=x._init;if(x=w(x._payload),c.type=x,typeof x=="function")cv(x)?(o=Gs(x,o),c.tag=1,c=gk(null,c,x,o,p)):(c.tag=0,c=Wv(null,c,x,o,p));else{if(x!=null){if(w=x.$$typeof,w===T){c.tag=11,c=dk(null,c,x,o,p);break e}else if(w===O){c.tag=14,c=fk(null,c,x,o,p);break e}}throw c=U(x)||x,Error(r(306,c,""))}}return c;case 0:return Wv(o,c,c.type,c.pendingProps,p);case 1:return x=c.type,w=Gs(x,c.pendingProps),gk(o,c,x,w,p);case 3:e:{if(je(c,c.stateNode.containerInfo),o===null)throw Error(r(387));x=c.pendingProps;var C=c.memoizedState;w=C.element,Sv(o,c),Cu(c,x,null,p);var P=c.memoizedState;if(x=P.cache,Di(c,Qt,x),x!==C.cache&&gv(c,[Qt],p,!0),Au(),x=P.element,C.isDehydrated)if(C={element:x,isDehydrated:!1,cache:P.cache},c.updateQueue.baseState=C,c.memoizedState=C,c.flags&256){c=yk(o,c,x,p);break e}else if(x!==w){w=br(Error(r(424)),c),yu(w),c=yk(o,c,x,p);break e}else for(o=c.stateNode.containerInfo,o.nodeType===9?o=o.body:o=o.nodeName==="HTML"?o.ownerDocument.body:o,$t=Wr(o.firstChild),In=c,st=!0,zs=null,fa=!0,p=ek(c,null,x,p),c.child=p;p;)p.flags=p.flags&-3|4096,p=p.sibling;else{if(gu(),x===w){c=Qa(o,c,p);break e}mn(o,c,x,p)}c=c.child}return c;case 26:return Bp(o,c),o===null?(p=CO(c.type,null,c.pendingProps,null))?c.memoizedState=p:st||(p=c.type,o=c.pendingProps,x=eh(ge.current).createElement(p),x[Cn]=c,x[Vn]=o,gn(x,p,o),cn(x),c.stateNode=x):c.memoizedState=CO(c.type,o.memoizedProps,c.pendingProps,o.memoizedState),null;case 27:return Ce(c),o===null&&st&&(x=c.stateNode=SO(c.type,c.pendingProps,ge.current),In=c,fa=!0,w=$t,Yi(c.type)?(Db=w,$t=Wr(x.firstChild)):$t=w),mn(o,c,c.pendingProps.children,p),Bp(o,c),o===null&&(c.flags|=4194304),c.child;case 5:return o===null&&st&&((w=x=$t)&&(x=ZG(x,c.type,c.pendingProps,fa),x!==null?(c.stateNode=x,In=c,$t=Wr(x.firstChild),fa=!1,w=!0):w=!1),w||qs(c)),Ce(c),w=c.type,C=c.pendingProps,P=o!==null?o.memoizedProps:null,x=C.children,kb(w,C)?x=null:P!==null&&kb(w,P)&&(c.flags|=32),c.memoizedState!==null&&(w=Tv(o,c,xG,null,null,p),Ku._currentValue=w),Bp(o,c),mn(o,c,x,p),c.child;case 6:return o===null&&st&&((o=p=$t)&&(p=JG(p,c.pendingProps,fa),p!==null?(c.stateNode=p,In=c,$t=null,o=!0):o=!1),o||qs(c)),null;case 13:return vk(o,c,p);case 4:return je(c,c.stateNode.containerInfo),x=c.pendingProps,o===null?c.child=fl(c,null,x,p):mn(o,c,x,p),c.child;case 11:return dk(o,c,c.type,c.pendingProps,p);case 7:return mn(o,c,c.pendingProps,p),c.child;case 8:return mn(o,c,c.pendingProps.children,p),c.child;case 12:return mn(o,c,c.pendingProps.children,p),c.child;case 10:return x=c.pendingProps,Di(c,c.type,x.value),mn(o,c,x.children,p),c.child;case 9:return w=c.type._context,x=c.pendingProps.children,Us(c),w=_n(w),x=x(w),c.flags|=1,mn(o,c,x,p),c.child;case 14:return fk(o,c,c.type,c.pendingProps,p);case 15:return pk(o,c,c.type,c.pendingProps,p);case 19:return jk(o,c,p);case 31:return x=c.pendingProps,p=c.mode,x={mode:x.mode,children:x.children},o===null?(p=zp(x,p),p.ref=c.ref,c.child=p,p.return=c,c=p):(p=Va(o.child,x),p.ref=c.ref,c.child=p,p.return=c,c=p),c;case 22:return hk(o,c,p);case 24:return Us(c),x=_n(Qt),o===null?(w=bv(),w===null&&(w=At,C=yv(),w.pooledCache=C,C.refCount++,C!==null&&(w.pooledCacheLanes|=p),w=C),c.memoizedState={parent:x,cache:w},wv(c),Di(c,Qt,w)):((o.lanes&p)!==0&&(Sv(o,c),Cu(c,null,null,p),Au()),w=o.memoizedState,C=c.memoizedState,w.parent!==x?(w={parent:x,cache:x},c.memoizedState=w,c.lanes===0&&(c.memoizedState=c.updateQueue.baseState=w),Di(c,Qt,x)):(x=C.cache,Di(c,Qt,x),x!==w.cache&&gv(c,[Qt],p,!0))),mn(o,c,c.pendingProps.children,p),c.child;case 29:throw c.pendingProps}throw Error(r(156,c.tag))}function Za(o){o.flags|=4}function Sk(o,c){if(c.type!=="stylesheet"||(c.state.loading&4)!==0)o.flags&=-16777217;else if(o.flags|=16777216,!OO(c)){if(c=Nr.current,c!==null&&((et&4194048)===et?pa!==null:(et&62914560)!==et&&(et&536870912)===0||c!==pa))throw Su=jv,sT;o.flags|=8192}}function qp(o,c){c!==null&&(o.flags|=4),o.flags&16384&&(c=o.tag!==22?tE():536870912,o.lanes|=c,xl|=c)}function Pu(o,c){if(!st)switch(o.tailMode){case"hidden":c=o.tail;for(var p=null;c!==null;)c.alternate!==null&&(p=c),c=c.sibling;p===null?o.tail=null:p.sibling=null;break;case"collapsed":p=o.tail;for(var x=null;p!==null;)p.alternate!==null&&(x=p),p=p.sibling;x===null?c||o.tail===null?o.tail=null:o.tail.sibling=null:x.sibling=null}}function Dt(o){var c=o.alternate!==null&&o.alternate.child===o.child,p=0,x=0;if(c)for(var w=o.child;w!==null;)p|=w.lanes|w.childLanes,x|=w.subtreeFlags&65011712,x|=w.flags&65011712,w.return=o,w=w.sibling;else for(w=o.child;w!==null;)p|=w.lanes|w.childLanes,x|=w.subtreeFlags,x|=w.flags,w.return=o,w=w.sibling;return o.subtreeFlags|=x,o.childLanes=p,c}function AG(o,c,p){var x=c.pendingProps;switch(pv(c),c.tag){case 31:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return Dt(c),null;case 1:return Dt(c),null;case 3:return p=c.stateNode,x=null,o!==null&&(x=o.memoizedState.cache),c.memoizedState.cache!==x&&(c.flags|=2048),Ka(Qt),fe(),p.pendingContext&&(p.context=p.pendingContext,p.pendingContext=null),(o===null||o.child===null)&&(xu(c)?Za(c):o===null||o.memoizedState.isDehydrated&&(c.flags&256)===0||(c.flags|=1024,tT())),Dt(c),null;case 26:return p=c.memoizedState,o===null?(Za(c),p!==null?(Dt(c),Sk(c,p)):(Dt(c),c.flags&=-16777217)):p?p!==o.memoizedState?(Za(c),Dt(c),Sk(c,p)):(Dt(c),c.flags&=-16777217):(o.memoizedProps!==x&&Za(c),Dt(c),c.flags&=-16777217),null;case 27:he(c),p=ge.current;var w=c.type;if(o!==null&&c.stateNode!=null)o.memoizedProps!==x&&Za(c);else{if(!x){if(c.stateNode===null)throw Error(r(166));return Dt(c),null}o=ae.current,xu(c)?JE(c):(o=SO(w,x,p),c.stateNode=o,Za(c))}return Dt(c),null;case 5:if(he(c),p=c.type,o!==null&&c.stateNode!=null)o.memoizedProps!==x&&Za(c);else{if(!x){if(c.stateNode===null)throw Error(r(166));return Dt(c),null}if(o=ae.current,xu(c))JE(c);else{switch(w=eh(ge.current),o){case 1:o=w.createElementNS("http://www.w3.org/2000/svg",p);break;case 2:o=w.createElementNS("http://www.w3.org/1998/Math/MathML",p);break;default:switch(p){case"svg":o=w.createElementNS("http://www.w3.org/2000/svg",p);break;case"math":o=w.createElementNS("http://www.w3.org/1998/Math/MathML",p);break;case"script":o=w.createElement("div"),o.innerHTML="<script><\/script>",o=o.removeChild(o.firstChild);break;case"select":o=typeof x.is=="string"?w.createElement("select",{is:x.is}):w.createElement("select"),x.multiple?o.multiple=!0:x.size&&(o.size=x.size);break;default:o=typeof x.is=="string"?w.createElement(p,{is:x.is}):w.createElement(p)}}o[Cn]=c,o[Vn]=x;e:for(w=c.child;w!==null;){if(w.tag===5||w.tag===6)o.appendChild(w.stateNode);else if(w.tag!==4&&w.tag!==27&&w.child!==null){w.child.return=w,w=w.child;continue}if(w===c)break e;for(;w.sibling===null;){if(w.return===null||w.return===c)break e;w=w.return}w.sibling.return=w.return,w=w.sibling}c.stateNode=o;e:switch(gn(o,p,x),p){case"button":case"input":case"select":case"textarea":o=!!x.autoFocus;break e;case"img":o=!0;break e;default:o=!1}o&&Za(c)}}return Dt(c),c.flags&=-16777217,null;case 6:if(o&&c.stateNode!=null)o.memoizedProps!==x&&Za(c);else{if(typeof x!="string"&&c.stateNode===null)throw Error(r(166));if(o=ge.current,xu(c)){if(o=c.stateNode,p=c.memoizedProps,x=null,w=In,w!==null)switch(w.tag){case 27:case 5:x=w.memoizedProps}o[Cn]=c,o=!!(o.nodeValue===p||x!==null&&x.suppressHydrationWarning===!0||xO(o.nodeValue,p)),o||qs(c)}else o=eh(o).createTextNode(x),o[Cn]=c,c.stateNode=o}return Dt(c),null;case 13:if(x=c.memoizedState,o===null||o.memoizedState!==null&&o.memoizedState.dehydrated!==null){if(w=xu(c),x!==null&&x.dehydrated!==null){if(o===null){if(!w)throw Error(r(318));if(w=c.memoizedState,w=w!==null?w.dehydrated:null,!w)throw Error(r(317));w[Cn]=c}else gu(),(c.flags&128)===0&&(c.memoizedState=null),c.flags|=4;Dt(c),w=!1}else w=tT(),o!==null&&o.memoizedState!==null&&(o.memoizedState.hydrationErrors=w),w=!0;if(!w)return c.flags&256?(Xa(c),c):(Xa(c),null)}if(Xa(c),(c.flags&128)!==0)return c.lanes=p,c;if(p=x!==null,o=o!==null&&o.memoizedState!==null,p){x=c.child,w=null,x.alternate!==null&&x.alternate.memoizedState!==null&&x.alternate.memoizedState.cachePool!==null&&(w=x.alternate.memoizedState.cachePool.pool);var C=null;x.memoizedState!==null&&x.memoizedState.cachePool!==null&&(C=x.memoizedState.cachePool.pool),C!==w&&(x.flags|=2048)}return p!==o&&p&&(c.child.flags|=8192),qp(c,c.updateQueue),Dt(c),null;case 4:return fe(),o===null&&Ab(c.stateNode.containerInfo),Dt(c),null;case 10:return Ka(c.type),Dt(c),null;case 19:if(Y(Zt),w=c.memoizedState,w===null)return Dt(c),null;if(x=(c.flags&128)!==0,C=w.rendering,C===null)if(x)Pu(w,!1);else{if(Lt!==0||o!==null&&(o.flags&128)!==0)for(o=c.child;o!==null;){if(C=Ip(o),C!==null){for(c.flags|=128,Pu(w,!1),o=C.updateQueue,c.updateQueue=o,qp(c,o),c.subtreeFlags=0,o=p,p=c.child;p!==null;)QE(p,o),p=p.sibling;return ne(Zt,Zt.current&1|2),c.child}o=o.sibling}w.tail!==null&&We()>Vp&&(c.flags|=128,x=!0,Pu(w,!1),c.lanes=4194304)}else{if(!x)if(o=Ip(C),o!==null){if(c.flags|=128,x=!0,o=o.updateQueue,c.updateQueue=o,qp(c,o),Pu(w,!0),w.tail===null&&w.tailMode==="hidden"&&!C.alternate&&!st)return Dt(c),null}else 2*We()-w.renderingStartTime>Vp&&p!==536870912&&(c.flags|=128,x=!0,Pu(w,!1),c.lanes=4194304);w.isBackwards?(C.sibling=c.child,c.child=C):(o=w.last,o!==null?o.sibling=C:c.child=C,w.last=C)}return w.tail!==null?(c=w.tail,w.rendering=c,w.tail=c.sibling,w.renderingStartTime=We(),c.sibling=null,o=Zt.current,ne(Zt,x?o&1|2:o&1),c):(Dt(c),null);case 22:case 23:return Xa(c),_v(),x=c.memoizedState!==null,o!==null?o.memoizedState!==null!==x&&(c.flags|=8192):x&&(c.flags|=8192),x?(p&536870912)!==0&&(c.flags&128)===0&&(Dt(c),c.subtreeFlags&6&&(c.flags|=8192)):Dt(c),p=c.updateQueue,p!==null&&qp(c,p.retryQueue),p=null,o!==null&&o.memoizedState!==null&&o.memoizedState.cachePool!==null&&(p=o.memoizedState.cachePool.pool),x=null,c.memoizedState!==null&&c.memoizedState.cachePool!==null&&(x=c.memoizedState.cachePool.pool),x!==p&&(c.flags|=2048),o!==null&&Y(Vs),null;case 24:return p=null,o!==null&&(p=o.memoizedState.cache),c.memoizedState.cache!==p&&(c.flags|=2048),Ka(Qt),Dt(c),null;case 25:return null;case 30:return null}throw Error(r(156,c.tag))}function CG(o,c){switch(pv(c),c.tag){case 1:return o=c.flags,o&65536?(c.flags=o&-65537|128,c):null;case 3:return Ka(Qt),fe(),o=c.flags,(o&65536)!==0&&(o&128)===0?(c.flags=o&-65537|128,c):null;case 26:case 27:case 5:return he(c),null;case 13:if(Xa(c),o=c.memoizedState,o!==null&&o.dehydrated!==null){if(c.alternate===null)throw Error(r(340));gu()}return o=c.flags,o&65536?(c.flags=o&-65537|128,c):null;case 19:return Y(Zt),null;case 4:return fe(),null;case 10:return Ka(c.type),null;case 22:case 23:return Xa(c),_v(),o!==null&&Y(Vs),o=c.flags,o&65536?(c.flags=o&-65537|128,c):null;case 24:return Ka(Qt),null;case 25:return null;default:return null}}function Nk(o,c){switch(pv(c),c.tag){case 3:Ka(Qt),fe();break;case 26:case 27:case 5:he(c);break;case 4:fe();break;case 13:Xa(c);break;case 19:Y(Zt);break;case 10:Ka(c.type);break;case 22:case 23:Xa(c),_v(),o!==null&&Y(Vs);break;case 24:Ka(Qt)}}function Du(o,c){try{var p=c.updateQueue,x=p!==null?p.lastEffect:null;if(x!==null){var w=x.next;p=w;do{if((p.tag&o)===o){x=void 0;var C=p.create,P=p.inst;x=C(),P.destroy=x}p=p.next}while(p!==w)}}catch($){wt(c,c.return,$)}}function qi(o,c,p){try{var x=c.updateQueue,w=x!==null?x.lastEffect:null;if(w!==null){var C=w.next;x=C;do{if((x.tag&o)===o){var P=x.inst,$=P.destroy;if($!==void 0){P.destroy=void 0,w=c;var G=p,re=$;try{re()}catch(de){wt(w,G,de)}}}x=x.next}while(x!==C)}}catch(de){wt(c,c.return,de)}}function Ak(o){var c=o.updateQueue;if(c!==null){var p=o.stateNode;try{fT(c,p)}catch(x){wt(o,o.return,x)}}}function Ck(o,c,p){p.props=Gs(o.type,o.memoizedProps),p.state=o.memoizedState;try{p.componentWillUnmount()}catch(x){wt(o,c,x)}}function Ru(o,c){try{var p=o.ref;if(p!==null){switch(o.tag){case 26:case 27:case 5:var x=o.stateNode;break;case 30:x=o.stateNode;break;default:x=o.stateNode}typeof p=="function"?o.refCleanup=p(x):p.current=x}}catch(w){wt(o,c,w)}}function ha(o,c){var p=o.ref,x=o.refCleanup;if(p!==null)if(typeof x=="function")try{x()}catch(w){wt(o,c,w)}finally{o.refCleanup=null,o=o.alternate,o!=null&&(o.refCleanup=null)}else if(typeof p=="function")try{p(null)}catch(w){wt(o,c,w)}else p.current=null}function _k(o){var c=o.type,p=o.memoizedProps,x=o.stateNode;try{e:switch(c){case"button":case"input":case"select":case"textarea":p.autoFocus&&x.focus();break e;case"img":p.src?x.src=p.src:p.srcSet&&(x.srcset=p.srcSet)}}catch(w){wt(o,o.return,w)}}function tb(o,c,p){try{var x=o.stateNode;WG(x,o.type,p,c),x[Vn]=c}catch(w){wt(o,o.return,w)}}function Ek(o){return o.tag===5||o.tag===3||o.tag===26||o.tag===27&&Yi(o.type)||o.tag===4}function nb(o){e:for(;;){for(;o.sibling===null;){if(o.return===null||Ek(o.return))return null;o=o.return}for(o.sibling.return=o.return,o=o.sibling;o.tag!==5&&o.tag!==6&&o.tag!==18;){if(o.tag===27&&Yi(o.type)||o.flags&2||o.child===null||o.tag===4)continue e;o.child.return=o,o=o.child}if(!(o.flags&2))return o.stateNode}}function rb(o,c,p){var x=o.tag;if(x===5||x===6)o=o.stateNode,c?(p.nodeType===9?p.body:p.nodeName==="HTML"?p.ownerDocument.body:p).insertBefore(o,c):(c=p.nodeType===9?p.body:p.nodeName==="HTML"?p.ownerDocument.body:p,c.appendChild(o),p=p._reactRootContainer,p!=null||c.onclick!==null||(c.onclick=Jp));else if(x!==4&&(x===27&&Yi(o.type)&&(p=o.stateNode,c=null),o=o.child,o!==null))for(rb(o,c,p),o=o.sibling;o!==null;)rb(o,c,p),o=o.sibling}function Fp(o,c,p){var x=o.tag;if(x===5||x===6)o=o.stateNode,c?p.insertBefore(o,c):p.appendChild(o);else if(x!==4&&(x===27&&Yi(o.type)&&(p=o.stateNode),o=o.child,o!==null))for(Fp(o,c,p),o=o.sibling;o!==null;)Fp(o,c,p),o=o.sibling}function Tk(o){var c=o.stateNode,p=o.memoizedProps;try{for(var x=o.type,w=c.attributes;w.length;)c.removeAttributeNode(w[0]);gn(c,x,p),c[Cn]=o,c[Vn]=p}catch(C){wt(o,o.return,C)}}var Ja=!1,Ft=!1,ab=!1,kk=typeof WeakSet=="function"?WeakSet:Set,dn=null;function _G(o,c){if(o=o.containerInfo,Eb=sh,o=qE(o),nv(o)){if("selectionStart"in o)var p={start:o.selectionStart,end:o.selectionEnd};else e:{p=(p=o.ownerDocument)&&p.defaultView||window;var x=p.getSelection&&p.getSelection();if(x&&x.rangeCount!==0){p=x.anchorNode;var w=x.anchorOffset,C=x.focusNode;x=x.focusOffset;try{p.nodeType,C.nodeType}catch{p=null;break e}var P=0,$=-1,G=-1,re=0,de=0,me=o,se=null;t:for(;;){for(var oe;me!==p||w!==0&&me.nodeType!==3||($=P+w),me!==C||x!==0&&me.nodeType!==3||(G=P+x),me.nodeType===3&&(P+=me.nodeValue.length),(oe=me.firstChild)!==null;)se=me,me=oe;for(;;){if(me===o)break t;if(se===p&&++re===w&&($=P),se===C&&++de===x&&(G=P),(oe=me.nextSibling)!==null)break;me=se,se=me.parentNode}me=oe}p=$===-1||G===-1?null:{start:$,end:G}}else p=null}p=p||{start:0,end:0}}else p=null;for(Tb={focusedElem:o,selectionRange:p},sh=!1,dn=c;dn!==null;)if(c=dn,o=c.child,(c.subtreeFlags&1024)!==0&&o!==null)o.return=c,dn=o;else for(;dn!==null;){switch(c=dn,C=c.alternate,o=c.flags,c.tag){case 0:break;case 11:case 15:break;case 1:if((o&1024)!==0&&C!==null){o=void 0,p=c,w=C.memoizedProps,C=C.memoizedState,x=p.stateNode;try{var Ie=Gs(p.type,w,p.elementType===p.type);o=x.getSnapshotBeforeUpdate(Ie,C),x.__reactInternalSnapshotBeforeUpdate=o}catch(Me){wt(p,p.return,Me)}}break;case 3:if((o&1024)!==0){if(o=c.stateNode.containerInfo,p=o.nodeType,p===9)Mb(o);else if(p===1)switch(o.nodeName){case"HEAD":case"HTML":case"BODY":Mb(o);break;default:o.textContent=""}}break;case 5:case 26:case 27:case 6:case 4:case 17:break;default:if((o&1024)!==0)throw Error(r(163))}if(o=c.sibling,o!==null){o.return=c.return,dn=o;break}dn=c.return}}function Ok(o,c,p){var x=p.flags;switch(p.tag){case 0:case 11:case 15:Fi(o,p),x&4&&Du(5,p);break;case 1:if(Fi(o,p),x&4)if(o=p.stateNode,c===null)try{o.componentDidMount()}catch(P){wt(p,p.return,P)}else{var w=Gs(p.type,c.memoizedProps);c=c.memoizedState;try{o.componentDidUpdate(w,c,o.__reactInternalSnapshotBeforeUpdate)}catch(P){wt(p,p.return,P)}}x&64&&Ak(p),x&512&&Ru(p,p.return);break;case 3:if(Fi(o,p),x&64&&(o=p.updateQueue,o!==null)){if(c=null,p.child!==null)switch(p.child.tag){case 27:case 5:c=p.child.stateNode;break;case 1:c=p.child.stateNode}try{fT(o,c)}catch(P){wt(p,p.return,P)}}break;case 27:c===null&&x&4&&Tk(p);case 26:case 5:Fi(o,p),c===null&&x&4&&_k(p),x&512&&Ru(p,p.return);break;case 12:Fi(o,p);break;case 13:Fi(o,p),x&4&&Dk(o,p),x&64&&(o=p.memoizedState,o!==null&&(o=o.dehydrated,o!==null&&(p=IG.bind(null,p),eW(o,p))));break;case 22:if(x=p.memoizedState!==null||Ja,!x){c=c!==null&&c.memoizedState!==null||Ft,w=Ja;var C=Ft;Ja=x,(Ft=c)&&!C?Ui(o,p,(p.subtreeFlags&8772)!==0):Fi(o,p),Ja=w,Ft=C}break;case 30:break;default:Fi(o,p)}}function Mk(o){var c=o.alternate;c!==null&&(o.alternate=null,Mk(c)),o.child=null,o.deletions=null,o.sibling=null,o.tag===5&&(c=o.stateNode,c!==null&&$y(c)),o.stateNode=null,o.return=null,o.dependencies=null,o.memoizedProps=null,o.memoizedState=null,o.pendingProps=null,o.stateNode=null,o.updateQueue=null}var kt=null,Wn=!1;function ei(o,c,p){for(p=p.child;p!==null;)Pk(o,c,p),p=p.sibling}function Pk(o,c,p){if(ln&&typeof ln.onCommitFiberUnmount=="function")try{ln.onCommitFiberUnmount(An,p)}catch{}switch(p.tag){case 26:Ft||ha(p,c),ei(o,c,p),p.memoizedState?p.memoizedState.count--:p.stateNode&&(p=p.stateNode,p.parentNode.removeChild(p));break;case 27:Ft||ha(p,c);var x=kt,w=Wn;Yi(p.type)&&(kt=p.stateNode,Wn=!1),ei(o,c,p),Vu(p.stateNode),kt=x,Wn=w;break;case 5:Ft||ha(p,c);case 6:if(x=kt,w=Wn,kt=null,ei(o,c,p),kt=x,Wn=w,kt!==null)if(Wn)try{(kt.nodeType===9?kt.body:kt.nodeName==="HTML"?kt.ownerDocument.body:kt).removeChild(p.stateNode)}catch(C){wt(p,c,C)}else try{kt.removeChild(p.stateNode)}catch(C){wt(p,c,C)}break;case 18:kt!==null&&(Wn?(o=kt,jO(o.nodeType===9?o.body:o.nodeName==="HTML"?o.ownerDocument.body:o,p.stateNode),Zu(o)):jO(kt,p.stateNode));break;case 4:x=kt,w=Wn,kt=p.stateNode.containerInfo,Wn=!0,ei(o,c,p),kt=x,Wn=w;break;case 0:case 11:case 14:case 15:Ft||qi(2,p,c),Ft||qi(4,p,c),ei(o,c,p);break;case 1:Ft||(ha(p,c),x=p.stateNode,typeof x.componentWillUnmount=="function"&&Ck(p,c,x)),ei(o,c,p);break;case 21:ei(o,c,p);break;case 22:Ft=(x=Ft)||p.memoizedState!==null,ei(o,c,p),Ft=x;break;default:ei(o,c,p)}}function Dk(o,c){if(c.memoizedState===null&&(o=c.alternate,o!==null&&(o=o.memoizedState,o!==null&&(o=o.dehydrated,o!==null))))try{Zu(o)}catch(p){wt(c,c.return,p)}}function EG(o){switch(o.tag){case 13:case 19:var c=o.stateNode;return c===null&&(c=o.stateNode=new kk),c;case 22:return o=o.stateNode,c=o._retryCache,c===null&&(c=o._retryCache=new kk),c;default:throw Error(r(435,o.tag))}}function ib(o,c){var p=EG(o);c.forEach(function(x){var w=$G.bind(null,o,x);p.has(x)||(p.add(x),x.then(w,w))})}function nr(o,c){var p=c.deletions;if(p!==null)for(var x=0;x<p.length;x++){var w=p[x],C=o,P=c,$=P;e:for(;$!==null;){switch($.tag){case 27:if(Yi($.type)){kt=$.stateNode,Wn=!1;break e}break;case 5:kt=$.stateNode,Wn=!1;break e;case 3:case 4:kt=$.stateNode.containerInfo,Wn=!0;break e}$=$.return}if(kt===null)throw Error(r(160));Pk(C,P,w),kt=null,Wn=!1,C=w.alternate,C!==null&&(C.return=null),w.return=null}if(c.subtreeFlags&13878)for(c=c.child;c!==null;)Rk(c,o),c=c.sibling}var Gr=null;function Rk(o,c){var p=o.alternate,x=o.flags;switch(o.tag){case 0:case 11:case 14:case 15:nr(c,o),rr(o),x&4&&(qi(3,o,o.return),Du(3,o),qi(5,o,o.return));break;case 1:nr(c,o),rr(o),x&512&&(Ft||p===null||ha(p,p.return)),x&64&&Ja&&(o=o.updateQueue,o!==null&&(x=o.callbacks,x!==null&&(p=o.shared.hiddenCallbacks,o.shared.hiddenCallbacks=p===null?x:p.concat(x))));break;case 26:var w=Gr;if(nr(c,o),rr(o),x&512&&(Ft||p===null||ha(p,p.return)),x&4){var C=p!==null?p.memoizedState:null;if(x=o.memoizedState,p===null)if(x===null)if(o.stateNode===null){e:{x=o.type,p=o.memoizedProps,w=w.ownerDocument||w;t:switch(x){case"title":C=w.getElementsByTagName("title")[0],(!C||C[iu]||C[Cn]||C.namespaceURI==="http://www.w3.org/2000/svg"||C.hasAttribute("itemprop"))&&(C=w.createElement(x),w.head.insertBefore(C,w.querySelector("head > title"))),gn(C,x,p),C[Cn]=o,cn(C),x=C;break e;case"link":var P=TO("link","href",w).get(x+(p.href||""));if(P){for(var $=0;$<P.length;$++)if(C=P[$],C.getAttribute("href")===(p.href==null||p.href===""?null:p.href)&&C.getAttribute("rel")===(p.rel==null?null:p.rel)&&C.getAttribute("title")===(p.title==null?null:p.title)&&C.getAttribute("crossorigin")===(p.crossOrigin==null?null:p.crossOrigin)){P.splice($,1);break t}}C=w.createElement(x),gn(C,x,p),w.head.appendChild(C);break;case"meta":if(P=TO("meta","content",w).get(x+(p.content||""))){for($=0;$<P.length;$++)if(C=P[$],C.getAttribute("content")===(p.content==null?null:""+p.content)&&C.getAttribute("name")===(p.name==null?null:p.name)&&C.getAttribute("property")===(p.property==null?null:p.property)&&C.getAttribute("http-equiv")===(p.httpEquiv==null?null:p.httpEquiv)&&C.getAttribute("charset")===(p.charSet==null?null:p.charSet)){P.splice($,1);break t}}C=w.createElement(x),gn(C,x,p),w.head.appendChild(C);break;default:throw Error(r(468,x))}C[Cn]=o,cn(C),x=C}o.stateNode=x}else kO(w,o.type,o.stateNode);else o.stateNode=EO(w,x,o.memoizedProps);else C!==x?(C===null?p.stateNode!==null&&(p=p.stateNode,p.parentNode.removeChild(p)):C.count--,x===null?kO(w,o.type,o.stateNode):EO(w,x,o.memoizedProps)):x===null&&o.stateNode!==null&&tb(o,o.memoizedProps,p.memoizedProps)}break;case 27:nr(c,o),rr(o),x&512&&(Ft||p===null||ha(p,p.return)),p!==null&&x&4&&tb(o,o.memoizedProps,p.memoizedProps);break;case 5:if(nr(c,o),rr(o),x&512&&(Ft||p===null||ha(p,p.return)),o.flags&32){w=o.stateNode;try{Ko(w,"")}catch(oe){wt(o,o.return,oe)}}x&4&&o.stateNode!=null&&(w=o.memoizedProps,tb(o,w,p!==null?p.memoizedProps:w)),x&1024&&(ab=!0);break;case 6:if(nr(c,o),rr(o),x&4){if(o.stateNode===null)throw Error(r(162));x=o.memoizedProps,p=o.stateNode;try{p.nodeValue=x}catch(oe){wt(o,o.return,oe)}}break;case 3:if(rh=null,w=Gr,Gr=th(c.containerInfo),nr(c,o),Gr=w,rr(o),x&4&&p!==null&&p.memoizedState.isDehydrated)try{Zu(c.containerInfo)}catch(oe){wt(o,o.return,oe)}ab&&(ab=!1,Ik(o));break;case 4:x=Gr,Gr=th(o.stateNode.containerInfo),nr(c,o),rr(o),Gr=x;break;case 12:nr(c,o),rr(o);break;case 13:nr(c,o),rr(o),o.child.flags&8192&&o.memoizedState!==null!=(p!==null&&p.memoizedState!==null)&&(db=We()),x&4&&(x=o.updateQueue,x!==null&&(o.updateQueue=null,ib(o,x)));break;case 22:w=o.memoizedState!==null;var G=p!==null&&p.memoizedState!==null,re=Ja,de=Ft;if(Ja=re||w,Ft=de||G,nr(c,o),Ft=de,Ja=re,rr(o),x&8192)e:for(c=o.stateNode,c._visibility=w?c._visibility&-2:c._visibility|1,w&&(p===null||G||Ja||Ft||Ws(o)),p=null,c=o;;){if(c.tag===5||c.tag===26){if(p===null){G=p=c;try{if(C=G.stateNode,w)P=C.style,typeof P.setProperty=="function"?P.setProperty("display","none","important"):P.display="none";else{$=G.stateNode;var me=G.memoizedProps.style,se=me!=null&&me.hasOwnProperty("display")?me.display:null;$.style.display=se==null||typeof se=="boolean"?"":(""+se).trim()}}catch(oe){wt(G,G.return,oe)}}}else if(c.tag===6){if(p===null){G=c;try{G.stateNode.nodeValue=w?"":G.memoizedProps}catch(oe){wt(G,G.return,oe)}}}else if((c.tag!==22&&c.tag!==23||c.memoizedState===null||c===o)&&c.child!==null){c.child.return=c,c=c.child;continue}if(c===o)break e;for(;c.sibling===null;){if(c.return===null||c.return===o)break e;p===c&&(p=null),c=c.return}p===c&&(p=null),c.sibling.return=c.return,c=c.sibling}x&4&&(x=o.updateQueue,x!==null&&(p=x.retryQueue,p!==null&&(x.retryQueue=null,ib(o,p))));break;case 19:nr(c,o),rr(o),x&4&&(x=o.updateQueue,x!==null&&(o.updateQueue=null,ib(o,x)));break;case 30:break;case 21:break;default:nr(c,o),rr(o)}}function rr(o){var c=o.flags;if(c&2){try{for(var p,x=o.return;x!==null;){if(Ek(x)){p=x;break}x=x.return}if(p==null)throw Error(r(160));switch(p.tag){case 27:var w=p.stateNode,C=nb(o);Fp(o,C,w);break;case 5:var P=p.stateNode;p.flags&32&&(Ko(P,""),p.flags&=-33);var $=nb(o);Fp(o,$,P);break;case 3:case 4:var G=p.stateNode.containerInfo,re=nb(o);rb(o,re,G);break;default:throw Error(r(161))}}catch(de){wt(o,o.return,de)}o.flags&=-3}c&4096&&(o.flags&=-4097)}function Ik(o){if(o.subtreeFlags&1024)for(o=o.child;o!==null;){var c=o;Ik(c),c.tag===5&&c.flags&1024&&c.stateNode.reset(),o=o.sibling}}function Fi(o,c){if(c.subtreeFlags&8772)for(c=c.child;c!==null;)Ok(o,c.alternate,c),c=c.sibling}function Ws(o){for(o=o.child;o!==null;){var c=o;switch(c.tag){case 0:case 11:case 14:case 15:qi(4,c,c.return),Ws(c);break;case 1:ha(c,c.return);var p=c.stateNode;typeof p.componentWillUnmount=="function"&&Ck(c,c.return,p),Ws(c);break;case 27:Vu(c.stateNode);case 26:case 5:ha(c,c.return),Ws(c);break;case 22:c.memoizedState===null&&Ws(c);break;case 30:Ws(c);break;default:Ws(c)}o=o.sibling}}function Ui(o,c,p){for(p=p&&(c.subtreeFlags&8772)!==0,c=c.child;c!==null;){var x=c.alternate,w=o,C=c,P=C.flags;switch(C.tag){case 0:case 11:case 15:Ui(w,C,p),Du(4,C);break;case 1:if(Ui(w,C,p),x=C,w=x.stateNode,typeof w.componentDidMount=="function")try{w.componentDidMount()}catch(re){wt(x,x.return,re)}if(x=C,w=x.updateQueue,w!==null){var $=x.stateNode;try{var G=w.shared.hiddenCallbacks;if(G!==null)for(w.shared.hiddenCallbacks=null,w=0;w<G.length;w++)dT(G[w],$)}catch(re){wt(x,x.return,re)}}p&&P&64&&Ak(C),Ru(C,C.return);break;case 27:Tk(C);case 26:case 5:Ui(w,C,p),p&&x===null&&P&4&&_k(C),Ru(C,C.return);break;case 12:Ui(w,C,p);break;case 13:Ui(w,C,p),p&&P&4&&Dk(w,C);break;case 22:C.memoizedState===null&&Ui(w,C,p),Ru(C,C.return);break;case 30:break;default:Ui(w,C,p)}c=c.sibling}}function sb(o,c){var p=null;o!==null&&o.memoizedState!==null&&o.memoizedState.cachePool!==null&&(p=o.memoizedState.cachePool.pool),o=null,c.memoizedState!==null&&c.memoizedState.cachePool!==null&&(o=c.memoizedState.cachePool.pool),o!==p&&(o!=null&&o.refCount++,p!=null&&bu(p))}function ob(o,c){o=null,c.alternate!==null&&(o=c.alternate.memoizedState.cache),c=c.memoizedState.cache,c!==o&&(c.refCount++,o!=null&&bu(o))}function ma(o,c,p,x){if(c.subtreeFlags&10256)for(c=c.child;c!==null;)$k(o,c,p,x),c=c.sibling}function $k(o,c,p,x){var w=c.flags;switch(c.tag){case 0:case 11:case 15:ma(o,c,p,x),w&2048&&Du(9,c);break;case 1:ma(o,c,p,x);break;case 3:ma(o,c,p,x),w&2048&&(o=null,c.alternate!==null&&(o=c.alternate.memoizedState.cache),c=c.memoizedState.cache,c!==o&&(c.refCount++,o!=null&&bu(o)));break;case 12:if(w&2048){ma(o,c,p,x),o=c.stateNode;try{var C=c.memoizedProps,P=C.id,$=C.onPostCommit;typeof $=="function"&&$(P,c.alternate===null?"mount":"update",o.passiveEffectDuration,-0)}catch(G){wt(c,c.return,G)}}else ma(o,c,p,x);break;case 13:ma(o,c,p,x);break;case 23:break;case 22:C=c.stateNode,P=c.alternate,c.memoizedState!==null?C._visibility&2?ma(o,c,p,x):Iu(o,c):C._visibility&2?ma(o,c,p,x):(C._visibility|=2,pl(o,c,p,x,(c.subtreeFlags&10256)!==0)),w&2048&&sb(P,c);break;case 24:ma(o,c,p,x),w&2048&&ob(c.alternate,c);break;default:ma(o,c,p,x)}}function pl(o,c,p,x,w){for(w=w&&(c.subtreeFlags&10256)!==0,c=c.child;c!==null;){var C=o,P=c,$=p,G=x,re=P.flags;switch(P.tag){case 0:case 11:case 15:pl(C,P,$,G,w),Du(8,P);break;case 23:break;case 22:var de=P.stateNode;P.memoizedState!==null?de._visibility&2?pl(C,P,$,G,w):Iu(C,P):(de._visibility|=2,pl(C,P,$,G,w)),w&&re&2048&&sb(P.alternate,P);break;case 24:pl(C,P,$,G,w),w&&re&2048&&ob(P.alternate,P);break;default:pl(C,P,$,G,w)}c=c.sibling}}function Iu(o,c){if(c.subtreeFlags&10256)for(c=c.child;c!==null;){var p=o,x=c,w=x.flags;switch(x.tag){case 22:Iu(p,x),w&2048&&sb(x.alternate,x);break;case 24:Iu(p,x),w&2048&&ob(x.alternate,x);break;default:Iu(p,x)}c=c.sibling}}var $u=8192;function hl(o){if(o.subtreeFlags&$u)for(o=o.child;o!==null;)Lk(o),o=o.sibling}function Lk(o){switch(o.tag){case 26:hl(o),o.flags&$u&&o.memoizedState!==null&&pW(Gr,o.memoizedState,o.memoizedProps);break;case 5:hl(o);break;case 3:case 4:var c=Gr;Gr=th(o.stateNode.containerInfo),hl(o),Gr=c;break;case 22:o.memoizedState===null&&(c=o.alternate,c!==null&&c.memoizedState!==null?(c=$u,$u=16777216,hl(o),$u=c):hl(o));break;default:hl(o)}}function Bk(o){var c=o.alternate;if(c!==null&&(o=c.child,o!==null)){c.child=null;do c=o.sibling,o.sibling=null,o=c;while(o!==null)}}function Lu(o){var c=o.deletions;if((o.flags&16)!==0){if(c!==null)for(var p=0;p<c.length;p++){var x=c[p];dn=x,qk(x,o)}Bk(o)}if(o.subtreeFlags&10256)for(o=o.child;o!==null;)zk(o),o=o.sibling}function zk(o){switch(o.tag){case 0:case 11:case 15:Lu(o),o.flags&2048&&qi(9,o,o.return);break;case 3:Lu(o);break;case 12:Lu(o);break;case 22:var c=o.stateNode;o.memoizedState!==null&&c._visibility&2&&(o.return===null||o.return.tag!==13)?(c._visibility&=-3,Up(o)):Lu(o);break;default:Lu(o)}}function Up(o){var c=o.deletions;if((o.flags&16)!==0){if(c!==null)for(var p=0;p<c.length;p++){var x=c[p];dn=x,qk(x,o)}Bk(o)}for(o=o.child;o!==null;){switch(c=o,c.tag){case 0:case 11:case 15:qi(8,c,c.return),Up(c);break;case 22:p=c.stateNode,p._visibility&2&&(p._visibility&=-3,Up(c));break;default:Up(c)}o=o.sibling}}function qk(o,c){for(;dn!==null;){var p=dn;switch(p.tag){case 0:case 11:case 15:qi(8,p,c);break;case 23:case 22:if(p.memoizedState!==null&&p.memoizedState.cachePool!==null){var x=p.memoizedState.cachePool.pool;x!=null&&x.refCount++}break;case 24:bu(p.memoizedState.cache)}if(x=p.child,x!==null)x.return=p,dn=x;else e:for(p=o;dn!==null;){x=dn;var w=x.sibling,C=x.return;if(Mk(x),x===p){dn=null;break e}if(w!==null){w.return=C,dn=w;break e}dn=C}}}var TG={getCacheForType:function(o){var c=_n(Qt),p=c.data.get(o);return p===void 0&&(p=o(),c.data.set(o,p)),p}},kG=typeof WeakMap=="function"?WeakMap:Map,dt=0,At=null,Ke=null,et=0,ft=0,ar=null,Vi=!1,ml=!1,lb=!1,ti=0,Lt=0,Hi=0,Ks=0,cb=0,Ar=0,xl=0,Bu=null,Kn=null,ub=!1,db=0,Vp=1/0,Hp=null,Gi=null,xn=0,Wi=null,gl=null,yl=0,fb=0,pb=null,Fk=null,zu=0,hb=null;function ir(){if((dt&2)!==0&&et!==0)return et&-et;if(I.T!==null){var o=il;return o!==0?o:jb()}return aE()}function Uk(){Ar===0&&(Ar=(et&536870912)===0||st?eE():536870912);var o=Nr.current;return o!==null&&(o.flags|=32),Ar}function sr(o,c,p){(o===At&&(ft===2||ft===9)||o.cancelPendingCommit!==null)&&(vl(o,0),Ki(o,et,Ar,!1)),au(o,p),((dt&2)===0||o!==At)&&(o===At&&((dt&2)===0&&(Ks|=p),Lt===4&&Ki(o,et,Ar,!1)),xa(o))}function Vk(o,c,p){if((dt&6)!==0)throw Error(r(327));var x=!p&&(c&124)===0&&(c&o.expiredLanes)===0||ru(o,c),w=x?PG(o,c):gb(o,c,!0),C=x;do{if(w===0){ml&&!x&&Ki(o,c,0,!1);break}else{if(p=o.current.alternate,C&&!OG(p)){w=gb(o,c,!1),C=!1;continue}if(w===2){if(C=c,o.errorRecoveryDisabledLanes&C)var P=0;else P=o.pendingLanes&-536870913,P=P!==0?P:P&536870912?536870912:0;if(P!==0){c=P;e:{var $=o;w=Bu;var G=$.current.memoizedState.isDehydrated;if(G&&(vl($,P).flags|=256),P=gb($,P,!1),P!==2){if(lb&&!G){$.errorRecoveryDisabledLanes|=C,Ks|=C,w=4;break e}C=Kn,Kn=w,C!==null&&(Kn===null?Kn=C:Kn.push.apply(Kn,C))}w=P}if(C=!1,w!==2)continue}}if(w===1){vl(o,0),Ki(o,c,0,!0);break}e:{switch(x=o,C=w,C){case 0:case 1:throw Error(r(345));case 4:if((c&4194048)!==c)break;case 6:Ki(x,c,Ar,!Vi);break e;case 2:Kn=null;break;case 3:case 5:break;default:throw Error(r(329))}if((c&62914560)===c&&(w=db+300-We(),10<w)){if(Ki(x,c,Ar,!Vi),np(x,0,!0)!==0)break e;x.timeoutHandle=vO(Hk.bind(null,x,p,Kn,Hp,ub,c,Ar,Ks,xl,Vi,C,2,-0,0),w);break e}Hk(x,p,Kn,Hp,ub,c,Ar,Ks,xl,Vi,C,0,-0,0)}}break}while(!0);xa(o)}function Hk(o,c,p,x,w,C,P,$,G,re,de,me,se,oe){if(o.timeoutHandle=-1,me=c.subtreeFlags,(me&8192||(me&16785408)===16785408)&&(Wu={stylesheets:null,count:0,unsuspend:fW},Lk(c),me=hW(),me!==null)){o.cancelPendingCommit=me(Zk.bind(null,o,c,C,p,x,w,P,$,G,de,1,se,oe)),Ki(o,C,P,!re);return}Zk(o,c,C,p,x,w,P,$,G)}function OG(o){for(var c=o;;){var p=c.tag;if((p===0||p===11||p===15)&&c.flags&16384&&(p=c.updateQueue,p!==null&&(p=p.stores,p!==null)))for(var x=0;x<p.length;x++){var w=p[x],C=w.getSnapshot;w=w.value;try{if(!er(C(),w))return!1}catch{return!1}}if(p=c.child,c.subtreeFlags&16384&&p!==null)p.return=c,c=p;else{if(c===o)break;for(;c.sibling===null;){if(c.return===null||c.return===o)return!0;c=c.return}c.sibling.return=c.return,c=c.sibling}}return!0}function Ki(o,c,p,x){c&=~cb,c&=~Ks,o.suspendedLanes|=c,o.pingedLanes&=~c,x&&(o.warmLanes|=c),x=o.expirationTimes;for(var w=c;0<w;){var C=31-jt(w),P=1<<C;x[C]=-1,w&=~P}p!==0&&nE(o,p,c)}function Gp(){return(dt&6)===0?(qu(0),!1):!0}function mb(){if(Ke!==null){if(ft===0)var o=Ke.return;else o=Ke,Wa=Fs=null,Mv(o),dl=null,Ou=0,o=Ke;for(;o!==null;)Nk(o.alternate,o),o=o.return;Ke=null}}function vl(o,c){var p=o.timeoutHandle;p!==-1&&(o.timeoutHandle=-1,YG(p)),p=o.cancelPendingCommit,p!==null&&(o.cancelPendingCommit=null,p()),mb(),At=o,Ke=p=Va(o.current,null),et=c,ft=0,ar=null,Vi=!1,ml=ru(o,c),lb=!1,xl=Ar=cb=Ks=Hi=Lt=0,Kn=Bu=null,ub=!1,(c&8)!==0&&(c|=c&32);var x=o.entangledLanes;if(x!==0)for(o=o.entanglements,x&=c;0<x;){var w=31-jt(x),C=1<<w;c|=o[w],x&=~C}return ti=c,hp(),p}function Gk(o,c){Fe=null,I.H=Pp,c===wu||c===Sp?(c=cT(),ft=3):c===sT?(c=cT(),ft=4):ft=c===uk?8:c!==null&&typeof c=="object"&&typeof c.then=="function"?6:1,ar=c,Ke===null&&(Lt=1,Lp(o,br(c,o.current)))}function Wk(){var o=I.H;return I.H=Pp,o===null?Pp:o}function Kk(){var o=I.A;return I.A=TG,o}function xb(){Lt=4,Vi||(et&4194048)!==et&&Nr.current!==null||(ml=!0),(Hi&134217727)===0&&(Ks&134217727)===0||At===null||Ki(At,et,Ar,!1)}function gb(o,c,p){var x=dt;dt|=2;var w=Wk(),C=Kk();(At!==o||et!==c)&&(Hp=null,vl(o,c)),c=!1;var P=Lt;e:do try{if(ft!==0&&Ke!==null){var $=Ke,G=ar;switch(ft){case 8:mb(),P=6;break e;case 3:case 2:case 9:case 6:Nr.current===null&&(c=!0);var re=ft;if(ft=0,ar=null,bl(o,$,G,re),p&&ml){P=0;break e}break;default:re=ft,ft=0,ar=null,bl(o,$,G,re)}}MG(),P=Lt;break}catch(de){Gk(o,de)}while(!0);return c&&o.shellSuspendCounter++,Wa=Fs=null,dt=x,I.H=w,I.A=C,Ke===null&&(At=null,et=0,hp()),P}function MG(){for(;Ke!==null;)Yk(Ke)}function PG(o,c){var p=dt;dt|=2;var x=Wk(),w=Kk();At!==o||et!==c?(Hp=null,Vp=We()+500,vl(o,c)):ml=ru(o,c);e:do try{if(ft!==0&&Ke!==null){c=Ke;var C=ar;t:switch(ft){case 1:ft=0,ar=null,bl(o,c,C,1);break;case 2:case 9:if(oT(C)){ft=0,ar=null,Xk(c);break}c=function(){ft!==2&&ft!==9||At!==o||(ft=7),xa(o)},C.then(c,c);break e;case 3:ft=7;break e;case 4:ft=5;break e;case 7:oT(C)?(ft=0,ar=null,Xk(c)):(ft=0,ar=null,bl(o,c,C,7));break;case 5:var P=null;switch(Ke.tag){case 26:P=Ke.memoizedState;case 5:case 27:var $=Ke;if(!P||OO(P)){ft=0,ar=null;var G=$.sibling;if(G!==null)Ke=G;else{var re=$.return;re!==null?(Ke=re,Wp(re)):Ke=null}break t}}ft=0,ar=null,bl(o,c,C,5);break;case 6:ft=0,ar=null,bl(o,c,C,6);break;case 8:mb(),Lt=6;break e;default:throw Error(r(462))}}DG();break}catch(de){Gk(o,de)}while(!0);return Wa=Fs=null,I.H=x,I.A=w,dt=p,Ke!==null?0:(At=null,et=0,hp(),Lt)}function DG(){for(;Ke!==null&&!Ve();)Yk(Ke)}function Yk(o){var c=wk(o.alternate,o,ti);o.memoizedProps=o.pendingProps,c===null?Wp(o):Ke=c}function Xk(o){var c=o,p=c.alternate;switch(c.tag){case 15:case 0:c=xk(p,c,c.pendingProps,c.type,void 0,et);break;case 11:c=xk(p,c,c.pendingProps,c.type.render,c.ref,et);break;case 5:Mv(c);default:Nk(p,c),c=Ke=QE(c,ti),c=wk(p,c,ti)}o.memoizedProps=o.pendingProps,c===null?Wp(o):Ke=c}function bl(o,c,p,x){Wa=Fs=null,Mv(c),dl=null,Ou=0;var w=c.return;try{if(SG(o,w,c,p,et)){Lt=1,Lp(o,br(p,o.current)),Ke=null;return}}catch(C){if(w!==null)throw Ke=w,C;Lt=1,Lp(o,br(p,o.current)),Ke=null;return}c.flags&32768?(st||x===1?o=!0:ml||(et&536870912)!==0?o=!1:(Vi=o=!0,(x===2||x===9||x===3||x===6)&&(x=Nr.current,x!==null&&x.tag===13&&(x.flags|=16384))),Qk(c,o)):Wp(c)}function Wp(o){var c=o;do{if((c.flags&32768)!==0){Qk(c,Vi);return}o=c.return;var p=AG(c.alternate,c,ti);if(p!==null){Ke=p;return}if(c=c.sibling,c!==null){Ke=c;return}Ke=c=o}while(c!==null);Lt===0&&(Lt=5)}function Qk(o,c){do{var p=CG(o.alternate,o);if(p!==null){p.flags&=32767,Ke=p;return}if(p=o.return,p!==null&&(p.flags|=32768,p.subtreeFlags=0,p.deletions=null),!c&&(o=o.sibling,o!==null)){Ke=o;return}Ke=o=p}while(o!==null);Lt=6,Ke=null}function Zk(o,c,p,x,w,C,P,$,G){o.cancelPendingCommit=null;do Kp();while(xn!==0);if((dt&6)!==0)throw Error(r(327));if(c!==null){if(c===o.current)throw Error(r(177));if(C=c.lanes|c.childLanes,C|=ov,fH(o,p,C,P,$,G),o===At&&(Ke=At=null,et=0),gl=c,Wi=o,yl=p,fb=C,pb=w,Fk=x,(c.subtreeFlags&10256)!==0||(c.flags&10256)!==0?(o.callbackNode=null,o.callbackPriority=0,LG(lt,function(){return rO(),null})):(o.callbackNode=null,o.callbackPriority=0),x=(c.flags&13878)!==0,(c.subtreeFlags&13878)!==0||x){x=I.T,I.T=null,w=V.p,V.p=2,P=dt,dt|=4;try{_G(o,c,p)}finally{dt=P,V.p=w,I.T=x}}xn=1,Jk(),eO(),tO()}}function Jk(){if(xn===1){xn=0;var o=Wi,c=gl,p=(c.flags&13878)!==0;if((c.subtreeFlags&13878)!==0||p){p=I.T,I.T=null;var x=V.p;V.p=2;var w=dt;dt|=4;try{Rk(c,o);var C=Tb,P=qE(o.containerInfo),$=C.focusedElem,G=C.selectionRange;if(P!==$&&$&&$.ownerDocument&&zE($.ownerDocument.documentElement,$)){if(G!==null&&nv($)){var re=G.start,de=G.end;if(de===void 0&&(de=re),"selectionStart"in $)$.selectionStart=re,$.selectionEnd=Math.min(de,$.value.length);else{var me=$.ownerDocument||document,se=me&&me.defaultView||window;if(se.getSelection){var oe=se.getSelection(),Ie=$.textContent.length,Me=Math.min(G.start,Ie),xt=G.end===void 0?Me:Math.min(G.end,Ie);!oe.extend&&Me>xt&&(P=xt,xt=Me,Me=P);var J=BE($,Me),Q=BE($,xt);if(J&&Q&&(oe.rangeCount!==1||oe.anchorNode!==J.node||oe.anchorOffset!==J.offset||oe.focusNode!==Q.node||oe.focusOffset!==Q.offset)){var te=me.createRange();te.setStart(J.node,J.offset),oe.removeAllRanges(),Me>xt?(oe.addRange(te),oe.extend(Q.node,Q.offset)):(te.setEnd(Q.node,Q.offset),oe.addRange(te))}}}}for(me=[],oe=$;oe=oe.parentNode;)oe.nodeType===1&&me.push({element:oe,left:oe.scrollLeft,top:oe.scrollTop});for(typeof $.focus=="function"&&$.focus(),$=0;$<me.length;$++){var pe=me[$];pe.element.scrollLeft=pe.left,pe.element.scrollTop=pe.top}}sh=!!Eb,Tb=Eb=null}finally{dt=w,V.p=x,I.T=p}}o.current=c,xn=2}}function eO(){if(xn===2){xn=0;var o=Wi,c=gl,p=(c.flags&8772)!==0;if((c.subtreeFlags&8772)!==0||p){p=I.T,I.T=null;var x=V.p;V.p=2;var w=dt;dt|=4;try{Ok(o,c.alternate,c)}finally{dt=w,V.p=x,I.T=p}}xn=3}}function tO(){if(xn===4||xn===3){xn=0,rt();var o=Wi,c=gl,p=yl,x=Fk;(c.subtreeFlags&10256)!==0||(c.flags&10256)!==0?xn=5:(xn=0,gl=Wi=null,nO(o,o.pendingLanes));var w=o.pendingLanes;if(w===0&&(Gi=null),Ry(p),c=c.stateNode,ln&&typeof ln.onCommitFiberRoot=="function")try{ln.onCommitFiberRoot(An,c,void 0,(c.current.flags&128)===128)}catch{}if(x!==null){c=I.T,w=V.p,V.p=2,I.T=null;try{for(var C=o.onRecoverableError,P=0;P<x.length;P++){var $=x[P];C($.value,{componentStack:$.stack})}}finally{I.T=c,V.p=w}}(yl&3)!==0&&Kp(),xa(o),w=o.pendingLanes,(p&4194090)!==0&&(w&42)!==0?o===hb?zu++:(zu=0,hb=o):zu=0,qu(0)}}function nO(o,c){(o.pooledCacheLanes&=c)===0&&(c=o.pooledCache,c!=null&&(o.pooledCache=null,bu(c)))}function Kp(o){return Jk(),eO(),tO(),rO()}function rO(){if(xn!==5)return!1;var o=Wi,c=fb;fb=0;var p=Ry(yl),x=I.T,w=V.p;try{V.p=32>p?32:p,I.T=null,p=pb,pb=null;var C=Wi,P=yl;if(xn=0,gl=Wi=null,yl=0,(dt&6)!==0)throw Error(r(331));var $=dt;if(dt|=4,zk(C.current),$k(C,C.current,P,p),dt=$,qu(0,!1),ln&&typeof ln.onPostCommitFiberRoot=="function")try{ln.onPostCommitFiberRoot(An,C)}catch{}return!0}finally{V.p=w,I.T=x,nO(o,c)}}function aO(o,c,p){c=br(p,c),c=Gv(o.stateNode,c,2),o=$i(o,c,2),o!==null&&(au(o,2),xa(o))}function wt(o,c,p){if(o.tag===3)aO(o,o,p);else for(;c!==null;){if(c.tag===3){aO(c,o,p);break}else if(c.tag===1){var x=c.stateNode;if(typeof c.type.getDerivedStateFromError=="function"||typeof x.componentDidCatch=="function"&&(Gi===null||!Gi.has(x))){o=br(p,o),p=lk(2),x=$i(c,p,2),x!==null&&(ck(p,x,c,o),au(x,2),xa(x));break}}c=c.return}}function yb(o,c,p){var x=o.pingCache;if(x===null){x=o.pingCache=new kG;var w=new Set;x.set(c,w)}else w=x.get(c),w===void 0&&(w=new Set,x.set(c,w));w.has(p)||(lb=!0,w.add(p),o=RG.bind(null,o,c,p),c.then(o,o))}function RG(o,c,p){var x=o.pingCache;x!==null&&x.delete(c),o.pingedLanes|=o.suspendedLanes&p,o.warmLanes&=~p,At===o&&(et&p)===p&&(Lt===4||Lt===3&&(et&62914560)===et&&300>We()-db?(dt&2)===0&&vl(o,0):cb|=p,xl===et&&(xl=0)),xa(o)}function iO(o,c){c===0&&(c=tE()),o=tl(o,c),o!==null&&(au(o,c),xa(o))}function IG(o){var c=o.memoizedState,p=0;c!==null&&(p=c.retryLane),iO(o,p)}function $G(o,c){var p=0;switch(o.tag){case 13:var x=o.stateNode,w=o.memoizedState;w!==null&&(p=w.retryLane);break;case 19:x=o.stateNode;break;case 22:x=o.stateNode._retryCache;break;default:throw Error(r(314))}x!==null&&x.delete(c),iO(o,p)}function LG(o,c){return Te(o,c)}var Yp=null,jl=null,vb=!1,Xp=!1,bb=!1,Ys=0;function xa(o){o!==jl&&o.next===null&&(jl===null?Yp=jl=o:jl=jl.next=o),Xp=!0,vb||(vb=!0,zG())}function qu(o,c){if(!bb&&Xp){bb=!0;do for(var p=!1,x=Yp;x!==null;){if(o!==0){var w=x.pendingLanes;if(w===0)var C=0;else{var P=x.suspendedLanes,$=x.pingedLanes;C=(1<<31-jt(42|o)+1)-1,C&=w&~(P&~$),C=C&201326741?C&201326741|1:C?C|2:0}C!==0&&(p=!0,cO(x,C))}else C=et,C=np(x,x===At?C:0,x.cancelPendingCommit!==null||x.timeoutHandle!==-1),(C&3)===0||ru(x,C)||(p=!0,cO(x,C));x=x.next}while(p);bb=!1}}function BG(){sO()}function sO(){Xp=vb=!1;var o=0;Ys!==0&&(KG()&&(o=Ys),Ys=0);for(var c=We(),p=null,x=Yp;x!==null;){var w=x.next,C=oO(x,c);C===0?(x.next=null,p===null?Yp=w:p.next=w,w===null&&(jl=p)):(p=x,(o!==0||(C&3)!==0)&&(Xp=!0)),x=w}qu(o)}function oO(o,c){for(var p=o.suspendedLanes,x=o.pingedLanes,w=o.expirationTimes,C=o.pendingLanes&-62914561;0<C;){var P=31-jt(C),$=1<<P,G=w[P];G===-1?(($&p)===0||($&x)!==0)&&(w[P]=dH($,c)):G<=c&&(o.expiredLanes|=$),C&=~$}if(c=At,p=et,p=np(o,o===c?p:0,o.cancelPendingCommit!==null||o.timeoutHandle!==-1),x=o.callbackNode,p===0||o===c&&(ft===2||ft===9)||o.cancelPendingCommit!==null)return x!==null&&x!==null&&be(x),o.callbackNode=null,o.callbackPriority=0;if((p&3)===0||ru(o,p)){if(c=p&-p,c===o.callbackPriority)return c;switch(x!==null&&be(x),Ry(p)){case 2:case 8:p=ot;break;case 32:p=lt;break;case 268435456:p=Le;break;default:p=lt}return x=lO.bind(null,o),p=Te(p,x),o.callbackPriority=c,o.callbackNode=p,c}return x!==null&&x!==null&&be(x),o.callbackPriority=2,o.callbackNode=null,2}function lO(o,c){if(xn!==0&&xn!==5)return o.callbackNode=null,o.callbackPriority=0,null;var p=o.callbackNode;if(Kp()&&o.callbackNode!==p)return null;var x=et;return x=np(o,o===At?x:0,o.cancelPendingCommit!==null||o.timeoutHandle!==-1),x===0?null:(Vk(o,x,c),oO(o,We()),o.callbackNode!=null&&o.callbackNode===p?lO.bind(null,o):null)}function cO(o,c){if(Kp())return null;Vk(o,c,!0)}function zG(){XG(function(){(dt&6)!==0?Te(Re,BG):sO()})}function jb(){return Ys===0&&(Ys=eE()),Ys}function uO(o){return o==null||typeof o=="symbol"||typeof o=="boolean"?null:typeof o=="function"?o:op(""+o)}function dO(o,c){var p=c.ownerDocument.createElement("input");return p.name=c.name,p.value=c.value,o.id&&p.setAttribute("form",o.id),c.parentNode.insertBefore(p,c),o=new FormData(o),p.parentNode.removeChild(p),o}function qG(o,c,p,x,w){if(c==="submit"&&p&&p.stateNode===w){var C=uO((w[Vn]||null).action),P=x.submitter;P&&(c=(c=P[Vn]||null)?uO(c.formAction):P.getAttribute("formAction"),c!==null&&(C=c,P=null));var $=new dp("action","action",null,x,w);o.push({event:$,listeners:[{instance:null,listener:function(){if(x.defaultPrevented){if(Ys!==0){var G=P?dO(w,P):new FormData(w);qv(p,{pending:!0,data:G,method:w.method,action:C},null,G)}}else typeof C=="function"&&($.preventDefault(),G=P?dO(w,P):new FormData(w),qv(p,{pending:!0,data:G,method:w.method,action:C},C,G))},currentTarget:w}]})}}for(var wb=0;wb<sv.length;wb++){var Sb=sv[wb],FG=Sb.toLowerCase(),UG=Sb[0].toUpperCase()+Sb.slice(1);Hr(FG,"on"+UG)}Hr(VE,"onAnimationEnd"),Hr(HE,"onAnimationIteration"),Hr(GE,"onAnimationStart"),Hr("dblclick","onDoubleClick"),Hr("focusin","onFocus"),Hr("focusout","onBlur"),Hr(sG,"onTransitionRun"),Hr(oG,"onTransitionStart"),Hr(lG,"onTransitionCancel"),Hr(WE,"onTransitionEnd"),Ho("onMouseEnter",["mouseout","mouseover"]),Ho("onMouseLeave",["mouseout","mouseover"]),Ho("onPointerEnter",["pointerout","pointerover"]),Ho("onPointerLeave",["pointerout","pointerover"]),Ps("onChange","change click focusin focusout input keydown keyup selectionchange".split(" ")),Ps("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")),Ps("onBeforeInput",["compositionend","keypress","textInput","paste"]),Ps("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" ")),Ps("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" ")),Ps("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var Fu="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),VG=new Set("beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(Fu));function fO(o,c){c=(c&4)!==0;for(var p=0;p<o.length;p++){var x=o[p],w=x.event;x=x.listeners;e:{var C=void 0;if(c)for(var P=x.length-1;0<=P;P--){var $=x[P],G=$.instance,re=$.currentTarget;if($=$.listener,G!==C&&w.isPropagationStopped())break e;C=$,w.currentTarget=re;try{C(w)}catch(de){$p(de)}w.currentTarget=null,C=G}else for(P=0;P<x.length;P++){if($=x[P],G=$.instance,re=$.currentTarget,$=$.listener,G!==C&&w.isPropagationStopped())break e;C=$,w.currentTarget=re;try{C(w)}catch(de){$p(de)}w.currentTarget=null,C=G}}}}function Ye(o,c){var p=c[Iy];p===void 0&&(p=c[Iy]=new Set);var x=o+"__bubble";p.has(x)||(pO(c,o,2,!1),p.add(x))}function Nb(o,c,p){var x=0;c&&(x|=4),pO(p,o,x,c)}var Qp="_reactListening"+Math.random().toString(36).slice(2);function Ab(o){if(!o[Qp]){o[Qp]=!0,sE.forEach(function(p){p!=="selectionchange"&&(VG.has(p)||Nb(p,!1,o),Nb(p,!0,o))});var c=o.nodeType===9?o:o.ownerDocument;c===null||c[Qp]||(c[Qp]=!0,Nb("selectionchange",!1,c))}}function pO(o,c,p,x){switch($O(c)){case 2:var w=gW;break;case 8:w=yW;break;default:w=Bb}p=w.bind(null,c,p,o),w=void 0,!Wy||c!=="touchstart"&&c!=="touchmove"&&c!=="wheel"||(w=!0),x?w!==void 0?o.addEventListener(c,p,{capture:!0,passive:w}):o.addEventListener(c,p,!0):w!==void 0?o.addEventListener(c,p,{passive:w}):o.addEventListener(c,p,!1)}function Cb(o,c,p,x,w){var C=x;if((c&1)===0&&(c&2)===0&&x!==null)e:for(;;){if(x===null)return;var P=x.tag;if(P===3||P===4){var $=x.stateNode.containerInfo;if($===w)break;if(P===4)for(P=x.return;P!==null;){var G=P.tag;if((G===3||G===4)&&P.stateNode.containerInfo===w)return;P=P.return}for(;$!==null;){if(P=Fo($),P===null)return;if(G=P.tag,G===5||G===6||G===26||G===27){x=C=P;continue e}$=$.parentNode}}x=x.return}bE(function(){var re=C,de=Hy(p),me=[];e:{var se=KE.get(o);if(se!==void 0){var oe=dp,Ie=o;switch(o){case"keypress":if(cp(p)===0)break e;case"keydown":case"keyup":oe=LH;break;case"focusin":Ie="focus",oe=Qy;break;case"focusout":Ie="blur",oe=Qy;break;case"beforeblur":case"afterblur":oe=Qy;break;case"click":if(p.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":oe=SE;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":oe=CH;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":oe=qH;break;case VE:case HE:case GE:oe=TH;break;case WE:oe=UH;break;case"scroll":case"scrollend":oe=NH;break;case"wheel":oe=HH;break;case"copy":case"cut":case"paste":oe=OH;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":oe=AE;break;case"toggle":case"beforetoggle":oe=WH}var Me=(c&4)!==0,xt=!Me&&(o==="scroll"||o==="scrollend"),J=Me?se!==null?se+"Capture":null:se;Me=[];for(var Q=re,te;Q!==null;){var pe=Q;if(te=pe.stateNode,pe=pe.tag,pe!==5&&pe!==26&&pe!==27||te===null||J===null||(pe=ou(Q,J),pe!=null&&Me.push(Uu(Q,pe,te))),xt)break;Q=Q.return}0<Me.length&&(se=new oe(se,Ie,null,p,de),me.push({event:se,listeners:Me}))}}if((c&7)===0){e:{if(se=o==="mouseover"||o==="pointerover",oe=o==="mouseout"||o==="pointerout",se&&p!==Vy&&(Ie=p.relatedTarget||p.fromElement)&&(Fo(Ie)||Ie[qo]))break e;if((oe||se)&&(se=de.window===de?de:(se=de.ownerDocument)?se.defaultView||se.parentWindow:window,oe?(Ie=p.relatedTarget||p.toElement,oe=re,Ie=Ie?Fo(Ie):null,Ie!==null&&(xt=s(Ie),Me=Ie.tag,Ie!==xt||Me!==5&&Me!==27&&Me!==6)&&(Ie=null)):(oe=null,Ie=re),oe!==Ie)){if(Me=SE,pe="onMouseLeave",J="onMouseEnter",Q="mouse",(o==="pointerout"||o==="pointerover")&&(Me=AE,pe="onPointerLeave",J="onPointerEnter",Q="pointer"),xt=oe==null?se:su(oe),te=Ie==null?se:su(Ie),se=new Me(pe,Q+"leave",oe,p,de),se.target=xt,se.relatedTarget=te,pe=null,Fo(de)===re&&(Me=new Me(J,Q+"enter",Ie,p,de),Me.target=te,Me.relatedTarget=xt,pe=Me),xt=pe,oe&&Ie)t:{for(Me=oe,J=Ie,Q=0,te=Me;te;te=wl(te))Q++;for(te=0,pe=J;pe;pe=wl(pe))te++;for(;0<Q-te;)Me=wl(Me),Q--;for(;0<te-Q;)J=wl(J),te--;for(;Q--;){if(Me===J||J!==null&&Me===J.alternate)break t;Me=wl(Me),J=wl(J)}Me=null}else Me=null;oe!==null&&hO(me,se,oe,Me,!1),Ie!==null&&xt!==null&&hO(me,xt,Ie,Me,!0)}}e:{if(se=re?su(re):window,oe=se.nodeName&&se.nodeName.toLowerCase(),oe==="select"||oe==="input"&&se.type==="file")var _e=PE;else if(OE(se))if(DE)_e=rG;else{_e=tG;var He=eG}else oe=se.nodeName,!oe||oe.toLowerCase()!=="input"||se.type!=="checkbox"&&se.type!=="radio"?re&&Uy(re.elementType)&&(_e=PE):_e=nG;if(_e&&(_e=_e(o,re))){ME(me,_e,p,de);break e}He&&He(o,se,re),o==="focusout"&&re&&se.type==="number"&&re.memoizedProps.value!=null&&Fy(se,"number",se.value)}switch(He=re?su(re):window,o){case"focusin":(OE(He)||He.contentEditable==="true")&&(Zo=He,rv=re,mu=null);break;case"focusout":mu=rv=Zo=null;break;case"mousedown":av=!0;break;case"contextmenu":case"mouseup":case"dragend":av=!1,FE(me,p,de);break;case"selectionchange":if(iG)break;case"keydown":case"keyup":FE(me,p,de)}var Oe;if(Jy)e:{switch(o){case"compositionstart":var Pe="onCompositionStart";break e;case"compositionend":Pe="onCompositionEnd";break e;case"compositionupdate":Pe="onCompositionUpdate";break e}Pe=void 0}else Qo?TE(o,p)&&(Pe="onCompositionEnd"):o==="keydown"&&p.keyCode===229&&(Pe="onCompositionStart");Pe&&(CE&&p.locale!=="ko"&&(Qo||Pe!=="onCompositionStart"?Pe==="onCompositionEnd"&&Qo&&(Oe=jE()):(Pi=de,Ky="value"in Pi?Pi.value:Pi.textContent,Qo=!0)),He=Zp(re,Pe),0<He.length&&(Pe=new NE(Pe,o,null,p,de),me.push({event:Pe,listeners:He}),Oe?Pe.data=Oe:(Oe=kE(p),Oe!==null&&(Pe.data=Oe)))),(Oe=YH?XH(o,p):QH(o,p))&&(Pe=Zp(re,"onBeforeInput"),0<Pe.length&&(He=new NE("onBeforeInput","beforeinput",null,p,de),me.push({event:He,listeners:Pe}),He.data=Oe)),qG(me,o,re,p,de)}fO(me,c)})}function Uu(o,c,p){return{instance:o,listener:c,currentTarget:p}}function Zp(o,c){for(var p=c+"Capture",x=[];o!==null;){var w=o,C=w.stateNode;if(w=w.tag,w!==5&&w!==26&&w!==27||C===null||(w=ou(o,p),w!=null&&x.unshift(Uu(o,w,C)),w=ou(o,c),w!=null&&x.push(Uu(o,w,C))),o.tag===3)return x;o=o.return}return[]}function wl(o){if(o===null)return null;do o=o.return;while(o&&o.tag!==5&&o.tag!==27);return o||null}function hO(o,c,p,x,w){for(var C=c._reactName,P=[];p!==null&&p!==x;){var $=p,G=$.alternate,re=$.stateNode;if($=$.tag,G!==null&&G===x)break;$!==5&&$!==26&&$!==27||re===null||(G=re,w?(re=ou(p,C),re!=null&&P.unshift(Uu(p,re,G))):w||(re=ou(p,C),re!=null&&P.push(Uu(p,re,G)))),p=p.return}P.length!==0&&o.push({event:c,listeners:P})}var HG=/\r\n?/g,GG=/\u0000|\uFFFD/g;function mO(o){return(typeof o=="string"?o:""+o).replace(HG,`
`).replace(GG,"")}function xO(o,c){return c=mO(c),mO(o)===c}function Jp(){}function mt(o,c,p,x,w,C){switch(p){case"children":typeof x=="string"?c==="body"||c==="textarea"&&x===""||Ko(o,x):(typeof x=="number"||typeof x=="bigint")&&c!=="body"&&Ko(o,""+x);break;case"className":ap(o,"class",x);break;case"tabIndex":ap(o,"tabindex",x);break;case"dir":case"role":case"viewBox":case"width":case"height":ap(o,p,x);break;case"style":yE(o,x,C);break;case"data":if(c!=="object"){ap(o,"data",x);break}case"src":case"href":if(x===""&&(c!=="a"||p!=="href")){o.removeAttribute(p);break}if(x==null||typeof x=="function"||typeof x=="symbol"||typeof x=="boolean"){o.removeAttribute(p);break}x=op(""+x),o.setAttribute(p,x);break;case"action":case"formAction":if(typeof x=="function"){o.setAttribute(p,"javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')");break}else typeof C=="function"&&(p==="formAction"?(c!=="input"&&mt(o,c,"name",w.name,w,null),mt(o,c,"formEncType",w.formEncType,w,null),mt(o,c,"formMethod",w.formMethod,w,null),mt(o,c,"formTarget",w.formTarget,w,null)):(mt(o,c,"encType",w.encType,w,null),mt(o,c,"method",w.method,w,null),mt(o,c,"target",w.target,w,null)));if(x==null||typeof x=="symbol"||typeof x=="boolean"){o.removeAttribute(p);break}x=op(""+x),o.setAttribute(p,x);break;case"onClick":x!=null&&(o.onclick=Jp);break;case"onScroll":x!=null&&Ye("scroll",o);break;case"onScrollEnd":x!=null&&Ye("scrollend",o);break;case"dangerouslySetInnerHTML":if(x!=null){if(typeof x!="object"||!("__html"in x))throw Error(r(61));if(p=x.__html,p!=null){if(w.children!=null)throw Error(r(60));o.innerHTML=p}}break;case"multiple":o.multiple=x&&typeof x!="function"&&typeof x!="symbol";break;case"muted":o.muted=x&&typeof x!="function"&&typeof x!="symbol";break;case"suppressContentEditableWarning":case"suppressHydrationWarning":case"defaultValue":case"defaultChecked":case"innerHTML":case"ref":break;case"autoFocus":break;case"xlinkHref":if(x==null||typeof x=="function"||typeof x=="boolean"||typeof x=="symbol"){o.removeAttribute("xlink:href");break}p=op(""+x),o.setAttributeNS("http://www.w3.org/1999/xlink","xlink:href",p);break;case"contentEditable":case"spellCheck":case"draggable":case"value":case"autoReverse":case"externalResourcesRequired":case"focusable":case"preserveAlpha":x!=null&&typeof x!="function"&&typeof x!="symbol"?o.setAttribute(p,""+x):o.removeAttribute(p);break;case"inert":case"allowFullScreen":case"async":case"autoPlay":case"controls":case"default":case"defer":case"disabled":case"disablePictureInPicture":case"disableRemotePlayback":case"formNoValidate":case"hidden":case"loop":case"noModule":case"noValidate":case"open":case"playsInline":case"readOnly":case"required":case"reversed":case"scoped":case"seamless":case"itemScope":x&&typeof x!="function"&&typeof x!="symbol"?o.setAttribute(p,""):o.removeAttribute(p);break;case"capture":case"download":x===!0?o.setAttribute(p,""):x!==!1&&x!=null&&typeof x!="function"&&typeof x!="symbol"?o.setAttribute(p,x):o.removeAttribute(p);break;case"cols":case"rows":case"size":case"span":x!=null&&typeof x!="function"&&typeof x!="symbol"&&!isNaN(x)&&1<=x?o.setAttribute(p,x):o.removeAttribute(p);break;case"rowSpan":case"start":x==null||typeof x=="function"||typeof x=="symbol"||isNaN(x)?o.removeAttribute(p):o.setAttribute(p,x);break;case"popover":Ye("beforetoggle",o),Ye("toggle",o),rp(o,"popover",x);break;case"xlinkActuate":Fa(o,"http://www.w3.org/1999/xlink","xlink:actuate",x);break;case"xlinkArcrole":Fa(o,"http://www.w3.org/1999/xlink","xlink:arcrole",x);break;case"xlinkRole":Fa(o,"http://www.w3.org/1999/xlink","xlink:role",x);break;case"xlinkShow":Fa(o,"http://www.w3.org/1999/xlink","xlink:show",x);break;case"xlinkTitle":Fa(o,"http://www.w3.org/1999/xlink","xlink:title",x);break;case"xlinkType":Fa(o,"http://www.w3.org/1999/xlink","xlink:type",x);break;case"xmlBase":Fa(o,"http://www.w3.org/XML/1998/namespace","xml:base",x);break;case"xmlLang":Fa(o,"http://www.w3.org/XML/1998/namespace","xml:lang",x);break;case"xmlSpace":Fa(o,"http://www.w3.org/XML/1998/namespace","xml:space",x);break;case"is":rp(o,"is",x);break;case"innerText":case"textContent":break;default:(!(2<p.length)||p[0]!=="o"&&p[0]!=="O"||p[1]!=="n"&&p[1]!=="N")&&(p=wH.get(p)||p,rp(o,p,x))}}function _b(o,c,p,x,w,C){switch(p){case"style":yE(o,x,C);break;case"dangerouslySetInnerHTML":if(x!=null){if(typeof x!="object"||!("__html"in x))throw Error(r(61));if(p=x.__html,p!=null){if(w.children!=null)throw Error(r(60));o.innerHTML=p}}break;case"children":typeof x=="string"?Ko(o,x):(typeof x=="number"||typeof x=="bigint")&&Ko(o,""+x);break;case"onScroll":x!=null&&Ye("scroll",o);break;case"onScrollEnd":x!=null&&Ye("scrollend",o);break;case"onClick":x!=null&&(o.onclick=Jp);break;case"suppressContentEditableWarning":case"suppressHydrationWarning":case"innerHTML":case"ref":break;case"innerText":case"textContent":break;default:if(!oE.hasOwnProperty(p))e:{if(p[0]==="o"&&p[1]==="n"&&(w=p.endsWith("Capture"),c=p.slice(2,w?p.length-7:void 0),C=o[Vn]||null,C=C!=null?C[p]:null,typeof C=="function"&&o.removeEventListener(c,C,w),typeof x=="function")){typeof C!="function"&&C!==null&&(p in o?o[p]=null:o.hasAttribute(p)&&o.removeAttribute(p)),o.addEventListener(c,x,w);break e}p in o?o[p]=x:x===!0?o.setAttribute(p,""):rp(o,p,x)}}}function gn(o,c,p){switch(c){case"div":case"span":case"svg":case"path":case"a":case"g":case"p":case"li":break;case"img":Ye("error",o),Ye("load",o);var x=!1,w=!1,C;for(C in p)if(p.hasOwnProperty(C)){var P=p[C];if(P!=null)switch(C){case"src":x=!0;break;case"srcSet":w=!0;break;case"children":case"dangerouslySetInnerHTML":throw Error(r(137,c));default:mt(o,c,C,P,p,null)}}w&&mt(o,c,"srcSet",p.srcSet,p,null),x&&mt(o,c,"src",p.src,p,null);return;case"input":Ye("invalid",o);var $=C=P=w=null,G=null,re=null;for(x in p)if(p.hasOwnProperty(x)){var de=p[x];if(de!=null)switch(x){case"name":w=de;break;case"type":P=de;break;case"checked":G=de;break;case"defaultChecked":re=de;break;case"value":C=de;break;case"defaultValue":$=de;break;case"children":case"dangerouslySetInnerHTML":if(de!=null)throw Error(r(137,c));break;default:mt(o,c,x,de,p,null)}}hE(o,C,$,G,re,P,w,!1),ip(o);return;case"select":Ye("invalid",o),x=P=C=null;for(w in p)if(p.hasOwnProperty(w)&&($=p[w],$!=null))switch(w){case"value":C=$;break;case"defaultValue":P=$;break;case"multiple":x=$;default:mt(o,c,w,$,p,null)}c=C,p=P,o.multiple=!!x,c!=null?Wo(o,!!x,c,!1):p!=null&&Wo(o,!!x,p,!0);return;case"textarea":Ye("invalid",o),C=w=x=null;for(P in p)if(p.hasOwnProperty(P)&&($=p[P],$!=null))switch(P){case"value":x=$;break;case"defaultValue":w=$;break;case"children":C=$;break;case"dangerouslySetInnerHTML":if($!=null)throw Error(r(91));break;default:mt(o,c,P,$,p,null)}xE(o,x,w,C),ip(o);return;case"option":for(G in p)p.hasOwnProperty(G)&&(x=p[G],x!=null)&&(G==="selected"?o.selected=x&&typeof x!="function"&&typeof x!="symbol":mt(o,c,G,x,p,null));return;case"dialog":Ye("beforetoggle",o),Ye("toggle",o),Ye("cancel",o),Ye("close",o);break;case"iframe":case"object":Ye("load",o);break;case"video":case"audio":for(x=0;x<Fu.length;x++)Ye(Fu[x],o);break;case"image":Ye("error",o),Ye("load",o);break;case"details":Ye("toggle",o);break;case"embed":case"source":case"link":Ye("error",o),Ye("load",o);case"area":case"base":case"br":case"col":case"hr":case"keygen":case"meta":case"param":case"track":case"wbr":case"menuitem":for(re in p)if(p.hasOwnProperty(re)&&(x=p[re],x!=null))switch(re){case"children":case"dangerouslySetInnerHTML":throw Error(r(137,c));default:mt(o,c,re,x,p,null)}return;default:if(Uy(c)){for(de in p)p.hasOwnProperty(de)&&(x=p[de],x!==void 0&&_b(o,c,de,x,p,void 0));return}}for($ in p)p.hasOwnProperty($)&&(x=p[$],x!=null&&mt(o,c,$,x,p,null))}function WG(o,c,p,x){switch(c){case"div":case"span":case"svg":case"path":case"a":case"g":case"p":case"li":break;case"input":var w=null,C=null,P=null,$=null,G=null,re=null,de=null;for(oe in p){var me=p[oe];if(p.hasOwnProperty(oe)&&me!=null)switch(oe){case"checked":break;case"value":break;case"defaultValue":G=me;default:x.hasOwnProperty(oe)||mt(o,c,oe,null,x,me)}}for(var se in x){var oe=x[se];if(me=p[se],x.hasOwnProperty(se)&&(oe!=null||me!=null))switch(se){case"type":C=oe;break;case"name":w=oe;break;case"checked":re=oe;break;case"defaultChecked":de=oe;break;case"value":P=oe;break;case"defaultValue":$=oe;break;case"children":case"dangerouslySetInnerHTML":if(oe!=null)throw Error(r(137,c));break;default:oe!==me&&mt(o,c,se,oe,x,me)}}qy(o,P,$,G,re,de,C,w);return;case"select":oe=P=$=se=null;for(C in p)if(G=p[C],p.hasOwnProperty(C)&&G!=null)switch(C){case"value":break;case"multiple":oe=G;default:x.hasOwnProperty(C)||mt(o,c,C,null,x,G)}for(w in x)if(C=x[w],G=p[w],x.hasOwnProperty(w)&&(C!=null||G!=null))switch(w){case"value":se=C;break;case"defaultValue":$=C;break;case"multiple":P=C;default:C!==G&&mt(o,c,w,C,x,G)}c=$,p=P,x=oe,se!=null?Wo(o,!!p,se,!1):!!x!=!!p&&(c!=null?Wo(o,!!p,c,!0):Wo(o,!!p,p?[]:"",!1));return;case"textarea":oe=se=null;for($ in p)if(w=p[$],p.hasOwnProperty($)&&w!=null&&!x.hasOwnProperty($))switch($){case"value":break;case"children":break;default:mt(o,c,$,null,x,w)}for(P in x)if(w=x[P],C=p[P],x.hasOwnProperty(P)&&(w!=null||C!=null))switch(P){case"value":se=w;break;case"defaultValue":oe=w;break;case"children":break;case"dangerouslySetInnerHTML":if(w!=null)throw Error(r(91));break;default:w!==C&&mt(o,c,P,w,x,C)}mE(o,se,oe);return;case"option":for(var Ie in p)se=p[Ie],p.hasOwnProperty(Ie)&&se!=null&&!x.hasOwnProperty(Ie)&&(Ie==="selected"?o.selected=!1:mt(o,c,Ie,null,x,se));for(G in x)se=x[G],oe=p[G],x.hasOwnProperty(G)&&se!==oe&&(se!=null||oe!=null)&&(G==="selected"?o.selected=se&&typeof se!="function"&&typeof se!="symbol":mt(o,c,G,se,x,oe));return;case"img":case"link":case"area":case"base":case"br":case"col":case"embed":case"hr":case"keygen":case"meta":case"param":case"source":case"track":case"wbr":case"menuitem":for(var Me in p)se=p[Me],p.hasOwnProperty(Me)&&se!=null&&!x.hasOwnProperty(Me)&&mt(o,c,Me,null,x,se);for(re in x)if(se=x[re],oe=p[re],x.hasOwnProperty(re)&&se!==oe&&(se!=null||oe!=null))switch(re){case"children":case"dangerouslySetInnerHTML":if(se!=null)throw Error(r(137,c));break;default:mt(o,c,re,se,x,oe)}return;default:if(Uy(c)){for(var xt in p)se=p[xt],p.hasOwnProperty(xt)&&se!==void 0&&!x.hasOwnProperty(xt)&&_b(o,c,xt,void 0,x,se);for(de in x)se=x[de],oe=p[de],!x.hasOwnProperty(de)||se===oe||se===void 0&&oe===void 0||_b(o,c,de,se,x,oe);return}}for(var J in p)se=p[J],p.hasOwnProperty(J)&&se!=null&&!x.hasOwnProperty(J)&&mt(o,c,J,null,x,se);for(me in x)se=x[me],oe=p[me],!x.hasOwnProperty(me)||se===oe||se==null&&oe==null||mt(o,c,me,se,x,oe)}var Eb=null,Tb=null;function eh(o){return o.nodeType===9?o:o.ownerDocument}function gO(o){switch(o){case"http://www.w3.org/2000/svg":return 1;case"http://www.w3.org/1998/Math/MathML":return 2;default:return 0}}function yO(o,c){if(o===0)switch(c){case"svg":return 1;case"math":return 2;default:return 0}return o===1&&c==="foreignObject"?0:o}function kb(o,c){return o==="textarea"||o==="noscript"||typeof c.children=="string"||typeof c.children=="number"||typeof c.children=="bigint"||typeof c.dangerouslySetInnerHTML=="object"&&c.dangerouslySetInnerHTML!==null&&c.dangerouslySetInnerHTML.__html!=null}var Ob=null;function KG(){var o=window.event;return o&&o.type==="popstate"?o===Ob?!1:(Ob=o,!0):(Ob=null,!1)}var vO=typeof setTimeout=="function"?setTimeout:void 0,YG=typeof clearTimeout=="function"?clearTimeout:void 0,bO=typeof Promise=="function"?Promise:void 0,XG=typeof queueMicrotask=="function"?queueMicrotask:typeof bO<"u"?function(o){return bO.resolve(null).then(o).catch(QG)}:vO;function QG(o){setTimeout(function(){throw o})}function Yi(o){return o==="head"}function jO(o,c){var p=c,x=0,w=0;do{var C=p.nextSibling;if(o.removeChild(p),C&&C.nodeType===8)if(p=C.data,p==="/$"){if(0<x&&8>x){p=x;var P=o.ownerDocument;if(p&1&&Vu(P.documentElement),p&2&&Vu(P.body),p&4)for(p=P.head,Vu(p),P=p.firstChild;P;){var $=P.nextSibling,G=P.nodeName;P[iu]||G==="SCRIPT"||G==="STYLE"||G==="LINK"&&P.rel.toLowerCase()==="stylesheet"||p.removeChild(P),P=$}}if(w===0){o.removeChild(C),Zu(c);return}w--}else p==="$"||p==="$?"||p==="$!"?w++:x=p.charCodeAt(0)-48;else x=0;p=C}while(p);Zu(c)}function Mb(o){var c=o.firstChild;for(c&&c.nodeType===10&&(c=c.nextSibling);c;){var p=c;switch(c=c.nextSibling,p.nodeName){case"HTML":case"HEAD":case"BODY":Mb(p),$y(p);continue;case"SCRIPT":case"STYLE":continue;case"LINK":if(p.rel.toLowerCase()==="stylesheet")continue}o.removeChild(p)}}function ZG(o,c,p,x){for(;o.nodeType===1;){var w=p;if(o.nodeName.toLowerCase()!==c.toLowerCase()){if(!x&&(o.nodeName!=="INPUT"||o.type!=="hidden"))break}else if(x){if(!o[iu])switch(c){case"meta":if(!o.hasAttribute("itemprop"))break;return o;case"link":if(C=o.getAttribute("rel"),C==="stylesheet"&&o.hasAttribute("data-precedence"))break;if(C!==w.rel||o.getAttribute("href")!==(w.href==null||w.href===""?null:w.href)||o.getAttribute("crossorigin")!==(w.crossOrigin==null?null:w.crossOrigin)||o.getAttribute("title")!==(w.title==null?null:w.title))break;return o;case"style":if(o.hasAttribute("data-precedence"))break;return o;case"script":if(C=o.getAttribute("src"),(C!==(w.src==null?null:w.src)||o.getAttribute("type")!==(w.type==null?null:w.type)||o.getAttribute("crossorigin")!==(w.crossOrigin==null?null:w.crossOrigin))&&C&&o.hasAttribute("async")&&!o.hasAttribute("itemprop"))break;return o;default:return o}}else if(c==="input"&&o.type==="hidden"){var C=w.name==null?null:""+w.name;if(w.type==="hidden"&&o.getAttribute("name")===C)return o}else return o;if(o=Wr(o.nextSibling),o===null)break}return null}function JG(o,c,p){if(c==="")return null;for(;o.nodeType!==3;)if((o.nodeType!==1||o.nodeName!=="INPUT"||o.type!=="hidden")&&!p||(o=Wr(o.nextSibling),o===null))return null;return o}function Pb(o){return o.data==="$!"||o.data==="$?"&&o.ownerDocument.readyState==="complete"}function eW(o,c){var p=o.ownerDocument;if(o.data!=="$?"||p.readyState==="complete")c();else{var x=function(){c(),p.removeEventListener("DOMContentLoaded",x)};p.addEventListener("DOMContentLoaded",x),o._reactRetry=x}}function Wr(o){for(;o!=null;o=o.nextSibling){var c=o.nodeType;if(c===1||c===3)break;if(c===8){if(c=o.data,c==="$"||c==="$!"||c==="$?"||c==="F!"||c==="F")break;if(c==="/$")return null}}return o}var Db=null;function wO(o){o=o.previousSibling;for(var c=0;o;){if(o.nodeType===8){var p=o.data;if(p==="$"||p==="$!"||p==="$?"){if(c===0)return o;c--}else p==="/$"&&c++}o=o.previousSibling}return null}function SO(o,c,p){switch(c=eh(p),o){case"html":if(o=c.documentElement,!o)throw Error(r(452));return o;case"head":if(o=c.head,!o)throw Error(r(453));return o;case"body":if(o=c.body,!o)throw Error(r(454));return o;default:throw Error(r(451))}}function Vu(o){for(var c=o.attributes;c.length;)o.removeAttributeNode(c[0]);$y(o)}var Cr=new Map,NO=new Set;function th(o){return typeof o.getRootNode=="function"?o.getRootNode():o.nodeType===9?o:o.ownerDocument}var ni=V.d;V.d={f:tW,r:nW,D:rW,C:aW,L:iW,m:sW,X:lW,S:oW,M:cW};function tW(){var o=ni.f(),c=Gp();return o||c}function nW(o){var c=Uo(o);c!==null&&c.tag===5&&c.type==="form"?VT(c):ni.r(o)}var Sl=typeof document>"u"?null:document;function AO(o,c,p){var x=Sl;if(x&&typeof c=="string"&&c){var w=vr(c);w='link[rel="'+o+'"][href="'+w+'"]',typeof p=="string"&&(w+='[crossorigin="'+p+'"]'),NO.has(w)||(NO.add(w),o={rel:o,crossOrigin:p,href:c},x.querySelector(w)===null&&(c=x.createElement("link"),gn(c,"link",o),cn(c),x.head.appendChild(c)))}}function rW(o){ni.D(o),AO("dns-prefetch",o,null)}function aW(o,c){ni.C(o,c),AO("preconnect",o,c)}function iW(o,c,p){ni.L(o,c,p);var x=Sl;if(x&&o&&c){var w='link[rel="preload"][as="'+vr(c)+'"]';c==="image"&&p&&p.imageSrcSet?(w+='[imagesrcset="'+vr(p.imageSrcSet)+'"]',typeof p.imageSizes=="string"&&(w+='[imagesizes="'+vr(p.imageSizes)+'"]')):w+='[href="'+vr(o)+'"]';var C=w;switch(c){case"style":C=Nl(o);break;case"script":C=Al(o)}Cr.has(C)||(o=m({rel:"preload",href:c==="image"&&p&&p.imageSrcSet?void 0:o,as:c},p),Cr.set(C,o),x.querySelector(w)!==null||c==="style"&&x.querySelector(Hu(C))||c==="script"&&x.querySelector(Gu(C))||(c=x.createElement("link"),gn(c,"link",o),cn(c),x.head.appendChild(c)))}}function sW(o,c){ni.m(o,c);var p=Sl;if(p&&o){var x=c&&typeof c.as=="string"?c.as:"script",w='link[rel="modulepreload"][as="'+vr(x)+'"][href="'+vr(o)+'"]',C=w;switch(x){case"audioworklet":case"paintworklet":case"serviceworker":case"sharedworker":case"worker":case"script":C=Al(o)}if(!Cr.has(C)&&(o=m({rel:"modulepreload",href:o},c),Cr.set(C,o),p.querySelector(w)===null)){switch(x){case"audioworklet":case"paintworklet":case"serviceworker":case"sharedworker":case"worker":case"script":if(p.querySelector(Gu(C)))return}x=p.createElement("link"),gn(x,"link",o),cn(x),p.head.appendChild(x)}}}function oW(o,c,p){ni.S(o,c,p);var x=Sl;if(x&&o){var w=Vo(x).hoistableStyles,C=Nl(o);c=c||"default";var P=w.get(C);if(!P){var $={loading:0,preload:null};if(P=x.querySelector(Hu(C)))$.loading=5;else{o=m({rel:"stylesheet",href:o,"data-precedence":c},p),(p=Cr.get(C))&&Rb(o,p);var G=P=x.createElement("link");cn(G),gn(G,"link",o),G._p=new Promise(function(re,de){G.onload=re,G.onerror=de}),G.addEventListener("load",function(){$.loading|=1}),G.addEventListener("error",function(){$.loading|=2}),$.loading|=4,nh(P,c,x)}P={type:"stylesheet",instance:P,count:1,state:$},w.set(C,P)}}}function lW(o,c){ni.X(o,c);var p=Sl;if(p&&o){var x=Vo(p).hoistableScripts,w=Al(o),C=x.get(w);C||(C=p.querySelector(Gu(w)),C||(o=m({src:o,async:!0},c),(c=Cr.get(w))&&Ib(o,c),C=p.createElement("script"),cn(C),gn(C,"link",o),p.head.appendChild(C)),C={type:"script",instance:C,count:1,state:null},x.set(w,C))}}function cW(o,c){ni.M(o,c);var p=Sl;if(p&&o){var x=Vo(p).hoistableScripts,w=Al(o),C=x.get(w);C||(C=p.querySelector(Gu(w)),C||(o=m({src:o,async:!0,type:"module"},c),(c=Cr.get(w))&&Ib(o,c),C=p.createElement("script"),cn(C),gn(C,"link",o),p.head.appendChild(C)),C={type:"script",instance:C,count:1,state:null},x.set(w,C))}}function CO(o,c,p,x){var w=(w=ge.current)?th(w):null;if(!w)throw Error(r(446));switch(o){case"meta":case"title":return null;case"style":return typeof p.precedence=="string"&&typeof p.href=="string"?(c=Nl(p.href),p=Vo(w).hoistableStyles,x=p.get(c),x||(x={type:"style",instance:null,count:0,state:null},p.set(c,x)),x):{type:"void",instance:null,count:0,state:null};case"link":if(p.rel==="stylesheet"&&typeof p.href=="string"&&typeof p.precedence=="string"){o=Nl(p.href);var C=Vo(w).hoistableStyles,P=C.get(o);if(P||(w=w.ownerDocument||w,P={type:"stylesheet",instance:null,count:0,state:{loading:0,preload:null}},C.set(o,P),(C=w.querySelector(Hu(o)))&&!C._p&&(P.instance=C,P.state.loading=5),Cr.has(o)||(p={rel:"preload",as:"style",href:p.href,crossOrigin:p.crossOrigin,integrity:p.integrity,media:p.media,hrefLang:p.hrefLang,referrerPolicy:p.referrerPolicy},Cr.set(o,p),C||uW(w,o,p,P.state))),c&&x===null)throw Error(r(528,""));return P}if(c&&x!==null)throw Error(r(529,""));return null;case"script":return c=p.async,p=p.src,typeof p=="string"&&c&&typeof c!="function"&&typeof c!="symbol"?(c=Al(p),p=Vo(w).hoistableScripts,x=p.get(c),x||(x={type:"script",instance:null,count:0,state:null},p.set(c,x)),x):{type:"void",instance:null,count:0,state:null};default:throw Error(r(444,o))}}function Nl(o){return'href="'+vr(o)+'"'}function Hu(o){return'link[rel="stylesheet"]['+o+"]"}function _O(o){return m({},o,{"data-precedence":o.precedence,precedence:null})}function uW(o,c,p,x){o.querySelector('link[rel="preload"][as="style"]['+c+"]")?x.loading=1:(c=o.createElement("link"),x.preload=c,c.addEventListener("load",function(){return x.loading|=1}),c.addEventListener("error",function(){return x.loading|=2}),gn(c,"link",p),cn(c),o.head.appendChild(c))}function Al(o){return'[src="'+vr(o)+'"]'}function Gu(o){return"script[async]"+o}function EO(o,c,p){if(c.count++,c.instance===null)switch(c.type){case"style":var x=o.querySelector('style[data-href~="'+vr(p.href)+'"]');if(x)return c.instance=x,cn(x),x;var w=m({},p,{"data-href":p.href,"data-precedence":p.precedence,href:null,precedence:null});return x=(o.ownerDocument||o).createElement("style"),cn(x),gn(x,"style",w),nh(x,p.precedence,o),c.instance=x;case"stylesheet":w=Nl(p.href);var C=o.querySelector(Hu(w));if(C)return c.state.loading|=4,c.instance=C,cn(C),C;x=_O(p),(w=Cr.get(w))&&Rb(x,w),C=(o.ownerDocument||o).createElement("link"),cn(C);var P=C;return P._p=new Promise(function($,G){P.onload=$,P.onerror=G}),gn(C,"link",x),c.state.loading|=4,nh(C,p.precedence,o),c.instance=C;case"script":return C=Al(p.src),(w=o.querySelector(Gu(C)))?(c.instance=w,cn(w),w):(x=p,(w=Cr.get(C))&&(x=m({},p),Ib(x,w)),o=o.ownerDocument||o,w=o.createElement("script"),cn(w),gn(w,"link",x),o.head.appendChild(w),c.instance=w);case"void":return null;default:throw Error(r(443,c.type))}else c.type==="stylesheet"&&(c.state.loading&4)===0&&(x=c.instance,c.state.loading|=4,nh(x,p.precedence,o));return c.instance}function nh(o,c,p){for(var x=p.querySelectorAll('link[rel="stylesheet"][data-precedence],style[data-precedence]'),w=x.length?x[x.length-1]:null,C=w,P=0;P<x.length;P++){var $=x[P];if($.dataset.precedence===c)C=$;else if(C!==w)break}C?C.parentNode.insertBefore(o,C.nextSibling):(c=p.nodeType===9?p.head:p,c.insertBefore(o,c.firstChild))}function Rb(o,c){o.crossOrigin==null&&(o.crossOrigin=c.crossOrigin),o.referrerPolicy==null&&(o.referrerPolicy=c.referrerPolicy),o.title==null&&(o.title=c.title)}function Ib(o,c){o.crossOrigin==null&&(o.crossOrigin=c.crossOrigin),o.referrerPolicy==null&&(o.referrerPolicy=c.referrerPolicy),o.integrity==null&&(o.integrity=c.integrity)}var rh=null;function TO(o,c,p){if(rh===null){var x=new Map,w=rh=new Map;w.set(p,x)}else w=rh,x=w.get(p),x||(x=new Map,w.set(p,x));if(x.has(o))return x;for(x.set(o,null),p=p.getElementsByTagName(o),w=0;w<p.length;w++){var C=p[w];if(!(C[iu]||C[Cn]||o==="link"&&C.getAttribute("rel")==="stylesheet")&&C.namespaceURI!=="http://www.w3.org/2000/svg"){var P=C.getAttribute(c)||"";P=o+P;var $=x.get(P);$?$.push(C):x.set(P,[C])}}return x}function kO(o,c,p){o=o.ownerDocument||o,o.head.insertBefore(p,c==="title"?o.querySelector("head > title"):null)}function dW(o,c,p){if(p===1||c.itemProp!=null)return!1;switch(o){case"meta":case"title":return!0;case"style":if(typeof c.precedence!="string"||typeof c.href!="string"||c.href==="")break;return!0;case"link":if(typeof c.rel!="string"||typeof c.href!="string"||c.href===""||c.onLoad||c.onError)break;return c.rel==="stylesheet"?(o=c.disabled,typeof c.precedence=="string"&&o==null):!0;case"script":if(c.async&&typeof c.async!="function"&&typeof c.async!="symbol"&&!c.onLoad&&!c.onError&&c.src&&typeof c.src=="string")return!0}return!1}function OO(o){return!(o.type==="stylesheet"&&(o.state.loading&3)===0)}var Wu=null;function fW(){}function pW(o,c,p){if(Wu===null)throw Error(r(475));var x=Wu;if(c.type==="stylesheet"&&(typeof p.media!="string"||matchMedia(p.media).matches!==!1)&&(c.state.loading&4)===0){if(c.instance===null){var w=Nl(p.href),C=o.querySelector(Hu(w));if(C){o=C._p,o!==null&&typeof o=="object"&&typeof o.then=="function"&&(x.count++,x=ah.bind(x),o.then(x,x)),c.state.loading|=4,c.instance=C,cn(C);return}C=o.ownerDocument||o,p=_O(p),(w=Cr.get(w))&&Rb(p,w),C=C.createElement("link"),cn(C);var P=C;P._p=new Promise(function($,G){P.onload=$,P.onerror=G}),gn(C,"link",p),c.instance=C}x.stylesheets===null&&(x.stylesheets=new Map),x.stylesheets.set(c,o),(o=c.state.preload)&&(c.state.loading&3)===0&&(x.count++,c=ah.bind(x),o.addEventListener("load",c),o.addEventListener("error",c))}}function hW(){if(Wu===null)throw Error(r(475));var o=Wu;return o.stylesheets&&o.count===0&&$b(o,o.stylesheets),0<o.count?function(c){var p=setTimeout(function(){if(o.stylesheets&&$b(o,o.stylesheets),o.unsuspend){var x=o.unsuspend;o.unsuspend=null,x()}},6e4);return o.unsuspend=c,function(){o.unsuspend=null,clearTimeout(p)}}:null}function ah(){if(this.count--,this.count===0){if(this.stylesheets)$b(this,this.stylesheets);else if(this.unsuspend){var o=this.unsuspend;this.unsuspend=null,o()}}}var ih=null;function $b(o,c){o.stylesheets=null,o.unsuspend!==null&&(o.count++,ih=new Map,c.forEach(mW,o),ih=null,ah.call(o))}function mW(o,c){if(!(c.state.loading&4)){var p=ih.get(o);if(p)var x=p.get(null);else{p=new Map,ih.set(o,p);for(var w=o.querySelectorAll("link[data-precedence],style[data-precedence]"),C=0;C<w.length;C++){var P=w[C];(P.nodeName==="LINK"||P.getAttribute("media")!=="not all")&&(p.set(P.dataset.precedence,P),x=P)}x&&p.set(null,x)}w=c.instance,P=w.getAttribute("data-precedence"),C=p.get(P)||x,C===x&&p.set(null,w),p.set(P,w),this.count++,x=ah.bind(this),w.addEventListener("load",x),w.addEventListener("error",x),C?C.parentNode.insertBefore(w,C.nextSibling):(o=o.nodeType===9?o.head:o,o.insertBefore(w,o.firstChild)),c.state.loading|=4}}var Ku={$$typeof:_,Provider:null,Consumer:null,_currentValue:F,_currentValue2:F,_threadCount:0};function xW(o,c,p,x,w,C,P,$){this.tag=1,this.containerInfo=o,this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.next=this.pendingContext=this.context=this.cancelPendingCommit=null,this.callbackPriority=0,this.expirationTimes=Py(-1),this.entangledLanes=this.shellSuspendCounter=this.errorRecoveryDisabledLanes=this.expiredLanes=this.warmLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=Py(0),this.hiddenUpdates=Py(null),this.identifierPrefix=x,this.onUncaughtError=w,this.onCaughtError=C,this.onRecoverableError=P,this.pooledCache=null,this.pooledCacheLanes=0,this.formState=$,this.incompleteTransitions=new Map}function MO(o,c,p,x,w,C,P,$,G,re,de,me){return o=new xW(o,c,p,P,$,G,re,me),c=1,C===!0&&(c|=24),C=tr(3,null,null,c),o.current=C,C.stateNode=o,c=yv(),c.refCount++,o.pooledCache=c,c.refCount++,C.memoizedState={element:x,isDehydrated:p,cache:c},wv(C),o}function PO(o){return o?(o=nl,o):nl}function DO(o,c,p,x,w,C){w=PO(w),x.context===null?x.context=w:x.pendingContext=w,x=Ii(c),x.payload={element:p},C=C===void 0?null:C,C!==null&&(x.callback=C),p=$i(o,x,c),p!==null&&(sr(p,o,c),Nu(p,o,c))}function RO(o,c){if(o=o.memoizedState,o!==null&&o.dehydrated!==null){var p=o.retryLane;o.retryLane=p!==0&&p<c?p:c}}function Lb(o,c){RO(o,c),(o=o.alternate)&&RO(o,c)}function IO(o){if(o.tag===13){var c=tl(o,67108864);c!==null&&sr(c,o,67108864),Lb(o,67108864)}}var sh=!0;function gW(o,c,p,x){var w=I.T;I.T=null;var C=V.p;try{V.p=2,Bb(o,c,p,x)}finally{V.p=C,I.T=w}}function yW(o,c,p,x){var w=I.T;I.T=null;var C=V.p;try{V.p=8,Bb(o,c,p,x)}finally{V.p=C,I.T=w}}function Bb(o,c,p,x){if(sh){var w=zb(x);if(w===null)Cb(o,c,x,oh,p),LO(o,x);else if(bW(w,o,c,p,x))x.stopPropagation();else if(LO(o,x),c&4&&-1<vW.indexOf(o)){for(;w!==null;){var C=Uo(w);if(C!==null)switch(C.tag){case 3:if(C=C.stateNode,C.current.memoizedState.isDehydrated){var P=Ms(C.pendingLanes);if(P!==0){var $=C;for($.pendingLanes|=2,$.entangledLanes|=2;P;){var G=1<<31-jt(P);$.entanglements[1]|=G,P&=~G}xa(C),(dt&6)===0&&(Vp=We()+500,qu(0))}}break;case 13:$=tl(C,2),$!==null&&sr($,C,2),Gp(),Lb(C,2)}if(C=zb(x),C===null&&Cb(o,c,x,oh,p),C===w)break;w=C}w!==null&&x.stopPropagation()}else Cb(o,c,x,null,p)}}function zb(o){return o=Hy(o),qb(o)}var oh=null;function qb(o){if(oh=null,o=Fo(o),o!==null){var c=s(o);if(c===null)o=null;else{var p=c.tag;if(p===13){if(o=l(c),o!==null)return o;o=null}else if(p===3){if(c.stateNode.current.memoizedState.isDehydrated)return c.tag===3?c.stateNode.containerInfo:null;o=null}else c!==o&&(o=null)}}return oh=o,null}function $O(o){switch(o){case"beforetoggle":case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"toggle":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 2;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 8;case"message":switch(ve()){case Re:return 2;case ot:return 8;case lt:case It:return 32;case Le:return 268435456;default:return 32}default:return 32}}var Fb=!1,Xi=null,Qi=null,Zi=null,Yu=new Map,Xu=new Map,Ji=[],vW="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(" ");function LO(o,c){switch(o){case"focusin":case"focusout":Xi=null;break;case"dragenter":case"dragleave":Qi=null;break;case"mouseover":case"mouseout":Zi=null;break;case"pointerover":case"pointerout":Yu.delete(c.pointerId);break;case"gotpointercapture":case"lostpointercapture":Xu.delete(c.pointerId)}}function Qu(o,c,p,x,w,C){return o===null||o.nativeEvent!==C?(o={blockedOn:c,domEventName:p,eventSystemFlags:x,nativeEvent:C,targetContainers:[w]},c!==null&&(c=Uo(c),c!==null&&IO(c)),o):(o.eventSystemFlags|=x,c=o.targetContainers,w!==null&&c.indexOf(w)===-1&&c.push(w),o)}function bW(o,c,p,x,w){switch(c){case"focusin":return Xi=Qu(Xi,o,c,p,x,w),!0;case"dragenter":return Qi=Qu(Qi,o,c,p,x,w),!0;case"mouseover":return Zi=Qu(Zi,o,c,p,x,w),!0;case"pointerover":var C=w.pointerId;return Yu.set(C,Qu(Yu.get(C)||null,o,c,p,x,w)),!0;case"gotpointercapture":return C=w.pointerId,Xu.set(C,Qu(Xu.get(C)||null,o,c,p,x,w)),!0}return!1}function BO(o){var c=Fo(o.target);if(c!==null){var p=s(c);if(p!==null){if(c=p.tag,c===13){if(c=l(p),c!==null){o.blockedOn=c,pH(o.priority,function(){if(p.tag===13){var x=ir();x=Dy(x);var w=tl(p,x);w!==null&&sr(w,p,x),Lb(p,x)}});return}}else if(c===3&&p.stateNode.current.memoizedState.isDehydrated){o.blockedOn=p.tag===3?p.stateNode.containerInfo:null;return}}}o.blockedOn=null}function lh(o){if(o.blockedOn!==null)return!1;for(var c=o.targetContainers;0<c.length;){var p=zb(o.nativeEvent);if(p===null){p=o.nativeEvent;var x=new p.constructor(p.type,p);Vy=x,p.target.dispatchEvent(x),Vy=null}else return c=Uo(p),c!==null&&IO(c),o.blockedOn=p,!1;c.shift()}return!0}function zO(o,c,p){lh(o)&&p.delete(c)}function jW(){Fb=!1,Xi!==null&&lh(Xi)&&(Xi=null),Qi!==null&&lh(Qi)&&(Qi=null),Zi!==null&&lh(Zi)&&(Zi=null),Yu.forEach(zO),Xu.forEach(zO)}function ch(o,c){o.blockedOn===c&&(o.blockedOn=null,Fb||(Fb=!0,e.unstable_scheduleCallback(e.unstable_NormalPriority,jW)))}var uh=null;function qO(o){uh!==o&&(uh=o,e.unstable_scheduleCallback(e.unstable_NormalPriority,function(){uh===o&&(uh=null);for(var c=0;c<o.length;c+=3){var p=o[c],x=o[c+1],w=o[c+2];if(typeof x!="function"){if(qb(x||p)===null)continue;break}var C=Uo(p);C!==null&&(o.splice(c,3),c-=3,qv(C,{pending:!0,data:w,method:p.method,action:x},x,w))}}))}function Zu(o){function c(G){return ch(G,o)}Xi!==null&&ch(Xi,o),Qi!==null&&ch(Qi,o),Zi!==null&&ch(Zi,o),Yu.forEach(c),Xu.forEach(c);for(var p=0;p<Ji.length;p++){var x=Ji[p];x.blockedOn===o&&(x.blockedOn=null)}for(;0<Ji.length&&(p=Ji[0],p.blockedOn===null);)BO(p),p.blockedOn===null&&Ji.shift();if(p=(o.ownerDocument||o).$$reactFormReplay,p!=null)for(x=0;x<p.length;x+=3){var w=p[x],C=p[x+1],P=w[Vn]||null;if(typeof C=="function")P||qO(p);else if(P){var $=null;if(C&&C.hasAttribute("formAction")){if(w=C,P=C[Vn]||null)$=P.formAction;else if(qb(w)!==null)continue}else $=P.action;typeof $=="function"?p[x+1]=$:(p.splice(x,3),x-=3),qO(p)}}}function Ub(o){this._internalRoot=o}dh.prototype.render=Ub.prototype.render=function(o){var c=this._internalRoot;if(c===null)throw Error(r(409));var p=c.current,x=ir();DO(p,x,o,c,null,null)},dh.prototype.unmount=Ub.prototype.unmount=function(){var o=this._internalRoot;if(o!==null){this._internalRoot=null;var c=o.containerInfo;DO(o.current,2,null,o,null,null),Gp(),c[qo]=null}};function dh(o){this._internalRoot=o}dh.prototype.unstable_scheduleHydration=function(o){if(o){var c=aE();o={blockedOn:null,target:o,priority:c};for(var p=0;p<Ji.length&&c!==0&&c<Ji[p].priority;p++);Ji.splice(p,0,o),p===0&&BO(o)}};var FO=t.version;if(FO!=="19.1.0")throw Error(r(527,FO,"19.1.0"));V.findDOMNode=function(o){var c=o._reactInternals;if(c===void 0)throw typeof o.render=="function"?Error(r(188)):(o=Object.keys(o).join(","),Error(r(268,o)));return o=d(c),o=o!==null?f(o):null,o=o===null?null:o.stateNode,o};var wW={bundleType:0,version:"19.1.0",rendererPackageName:"react-dom",currentDispatcherRef:I,reconcilerVersion:"19.1.0"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){var fh=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!fh.isDisabled&&fh.supportsFiber)try{An=fh.inject(wW),ln=fh}catch{}}return ed.createRoot=function(o,c){if(!a(o))throw Error(r(299));var p=!1,x="",w=ak,C=ik,P=sk,$=null;return c!=null&&(c.unstable_strictMode===!0&&(p=!0),c.identifierPrefix!==void 0&&(x=c.identifierPrefix),c.onUncaughtError!==void 0&&(w=c.onUncaughtError),c.onCaughtError!==void 0&&(C=c.onCaughtError),c.onRecoverableError!==void 0&&(P=c.onRecoverableError),c.unstable_transitionCallbacks!==void 0&&($=c.unstable_transitionCallbacks)),c=MO(o,1,!1,null,null,p,x,w,C,P,$,null),o[qo]=c.current,Ab(o),new Ub(c)},ed.hydrateRoot=function(o,c,p){if(!a(o))throw Error(r(299));var x=!1,w="",C=ak,P=ik,$=sk,G=null,re=null;return p!=null&&(p.unstable_strictMode===!0&&(x=!0),p.identifierPrefix!==void 0&&(w=p.identifierPrefix),p.onUncaughtError!==void 0&&(C=p.onUncaughtError),p.onCaughtError!==void 0&&(P=p.onCaughtError),p.onRecoverableError!==void 0&&($=p.onRecoverableError),p.unstable_transitionCallbacks!==void 0&&(G=p.unstable_transitionCallbacks),p.formState!==void 0&&(re=p.formState)),c=MO(o,1,!0,c,p??null,x,w,C,P,$,G,re),c.context=PO(null),p=c.current,x=ir(),x=Dy(x),w=Ii(x),w.callback=null,$i(p,w,x),p=x,c.current.lanes=p,au(c,p),xa(c),o[qo]=c.current,Ab(o),new dh(c)},ed.version="19.1.0",ed}var ZO;function MW(){if(ZO)return Hb.exports;ZO=1;function e(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(e)}catch(t){console.error(t)}}return e(),Hb.exports=OW(),Hb.exports}var PW=MW(),lg=class{constructor(){this.listeners=new Set,this.subscribe=this.subscribe.bind(this)}subscribe(e){return this.listeners.add(e),this.onSubscribe(),()=>{this.listeners.delete(e),this.onUnsubscribe()}}hasListeners(){return this.listeners.size>0}onSubscribe(){}onUnsubscribe(){}},DW=class extends lg{#e;#t;#n;constructor(){super(),this.#n=e=>{if(typeof window<"u"&&window.addEventListener){const t=()=>e();return window.addEventListener("visibilitychange",t,!1),()=>{window.removeEventListener("visibilitychange",t)}}}}onSubscribe(){this.#t||this.setEventListener(this.#n)}onUnsubscribe(){this.hasListeners()||(this.#t?.(),this.#t=void 0)}setEventListener(e){this.#n=e,this.#t?.(),this.#t=e(t=>{typeof t=="boolean"?this.setFocused(t):this.onFocus()})}setFocused(e){this.#e!==e&&(this.#e=e,this.onFocus())}onFocus(){const e=this.isFocused();this.listeners.forEach(t=>{t(e)})}isFocused(){return typeof this.#e=="boolean"?this.#e:globalThis.document?.visibilityState!=="hidden"}},d9=new DW,RW={setTimeout:(e,t)=>setTimeout(e,t),clearTimeout:e=>clearTimeout(e),setInterval:(e,t)=>setInterval(e,t),clearInterval:e=>clearInterval(e)},IW=class{#e=RW;#t=!1;setTimeoutProvider(e){this.#e=e}setTimeout(e,t){return this.#e.setTimeout(e,t)}clearTimeout(e){this.#e.clearTimeout(e)}setInterval(e,t){return this.#e.setInterval(e,t)}clearInterval(e){this.#e.clearInterval(e)}},V2=new IW;function $W(e){setTimeout(e,0)}var LW=typeof window>"u"||"Deno"in globalThis;function Zr(){}function BW(e,t){return typeof e=="function"?e(t):e}function zW(e){return typeof e=="number"&&e>=0&&e!==1/0}function qW(e,t){return Math.max(e+(t||0)-Date.now(),0)}function H2(e,t){return typeof e=="function"?e(t):e}function FW(e,t){return typeof e=="function"?e(t):e}function JO(e,t){const{type:n="all",exact:r,fetchStatus:a,predicate:s,queryKey:l,stale:u}=e;if(l){if(r){if(t.queryHash!==bA(l,t.options))return!1}else if(!Rd(t.queryKey,l))return!1}if(n!=="all"){const d=t.isActive();if(n==="active"&&!d||n==="inactive"&&d)return!1}return!(typeof u=="boolean"&&t.isStale()!==u||a&&a!==t.state.fetchStatus||s&&!s(t))}function e5(e,t){const{exact:n,status:r,predicate:a,mutationKey:s}=e;if(s){if(!t.options.mutationKey)return!1;if(n){if(Dd(t.options.mutationKey)!==Dd(s))return!1}else if(!Rd(t.options.mutationKey,s))return!1}return!(r&&t.state.status!==r||a&&!a(t))}function bA(e,t){return(t?.queryKeyHashFn||Dd)(e)}function Dd(e){return JSON.stringify(e,(t,n)=>G2(n)?Object.keys(n).sort().reduce((r,a)=>(r[a]=n[a],r),{}):n)}function Rd(e,t){return e===t?!0:typeof e!=typeof t?!1:e&&t&&typeof e=="object"&&typeof t=="object"?Object.keys(t).every(n=>Rd(e[n],t[n])):!1}var UW=Object.prototype.hasOwnProperty;function f9(e,t,n=0){if(e===t)return e;if(n>500)return t;const r=t5(e)&&t5(t);if(!r&&!(G2(e)&&G2(t)))return t;const s=(r?e:Object.keys(e)).length,l=r?t:Object.keys(t),u=l.length,d=r?new Array(u):{};let f=0;for(let m=0;m<u;m++){const h=r?m:l[m],g=e[h],y=t[h];if(g===y){d[h]=g,(r?m<s:UW.call(e,h))&&f++;continue}if(g===null||y===null||typeof g!="object"||typeof y!="object"){d[h]=y;continue}const j=f9(g,y,n+1);d[h]=j,j===g&&f++}return s===u&&f===s?e:d}function t5(e){return Array.isArray(e)&&e.length===Object.keys(e).length}function G2(e){if(!n5(e))return!1;const t=e.constructor;if(t===void 0)return!0;const n=t.prototype;return!(!n5(n)||!n.hasOwnProperty("isPrototypeOf")||Object.getPrototypeOf(e)!==Object.prototype)}function n5(e){return Object.prototype.toString.call(e)==="[object Object]"}function VW(e){return new Promise(t=>{V2.setTimeout(t,e)})}function HW(e,t,n){return typeof n.structuralSharing=="function"?n.structuralSharing(e,t):n.structuralSharing!==!1?f9(e,t):t}function GW(e,t,n=0){const r=[...e,t];return n&&r.length>n?r.slice(1):r}function WW(e,t,n=0){const r=[t,...e];return n&&r.length>n?r.slice(0,-1):r}var jA=Symbol();function p9(e,t){return!e.queryFn&&t?.initialPromise?()=>t.initialPromise:!e.queryFn||e.queryFn===jA?()=>Promise.reject(new Error(`Missing queryFn: '${e.queryHash}'`)):e.queryFn}function KW(e,t,n){let r=!1,a;return Object.defineProperty(e,"signal",{enumerable:!0,get:()=>(a??=t(),r||(r=!0,a.aborted?n():a.addEventListener("abort",n,{once:!0})),a)}),e}var h9=(()=>{let e=()=>LW;return{isServer(){return e()},setIsServer(t){e=t}}})();function YW(){let e,t;const n=new Promise((a,s)=>{e=a,t=s});n.status="pending",n.catch(()=>{});function r(a){Object.assign(n,a),delete n.resolve,delete n.reject}return n.resolve=a=>{r({status:"fulfilled",value:a}),e(a)},n.reject=a=>{r({status:"rejected",reason:a}),t(a)},n}var XW=$W;function QW(){let e=[],t=0,n=u=>{u()},r=u=>{u()},a=XW;const s=u=>{t?e.push(u):a(()=>{n(u)})},l=()=>{const u=e;e=[],u.length&&a(()=>{r(()=>{u.forEach(d=>{n(d)})})})};return{batch:u=>{let d;t++;try{d=u()}finally{t--,t||l()}return d},batchCalls:u=>(...d)=>{s(()=>{u(...d)})},schedule:s,setNotifyFunction:u=>{n=u},setBatchNotifyFunction:u=>{r=u},setScheduler:u=>{a=u}}}var $n=QW(),ZW=class extends lg{#e=!0;#t;#n;constructor(){super(),this.#n=e=>{if(typeof window<"u"&&window.addEventListener){const t=()=>e(!0),n=()=>e(!1);return window.addEventListener("online",t,!1),window.addEventListener("offline",n,!1),()=>{window.removeEventListener("online",t),window.removeEventListener("offline",n)}}}}onSubscribe(){this.#t||this.setEventListener(this.#n)}onUnsubscribe(){this.hasListeners()||(this.#t?.(),this.#t=void 0)}setEventListener(e){this.#n=e,this.#t?.(),this.#t=e(this.setOnline.bind(this))}setOnline(e){this.#e!==e&&(this.#e=e,this.listeners.forEach(n=>{n(e)}))}isOnline(){return this.#e}},Am=new ZW;function JW(e){return Math.min(1e3*2**e,3e4)}function m9(e){return(e??"online")==="online"?Am.isOnline():!0}var W2=class extends Error{constructor(e){super("CancelledError"),this.revert=e?.revert,this.silent=e?.silent}};function x9(e){let t=!1,n=0,r;const a=YW(),s=()=>a.status!=="pending",l=v=>{if(!s()){const b=new W2(v);g(b),e.onCancel?.(b)}},u=()=>{t=!0},d=()=>{t=!1},f=()=>d9.isFocused()&&(e.networkMode==="always"||Am.isOnline())&&e.canRun(),m=()=>m9(e.networkMode)&&e.canRun(),h=v=>{s()||(r?.(),a.resolve(v))},g=v=>{s()||(r?.(),a.reject(v))},y=()=>new Promise(v=>{r=b=>{(s()||f())&&v(b)},e.onPause?.()}).then(()=>{r=void 0,s()||e.onContinue?.()}),j=()=>{if(s())return;let v;const b=n===0?e.initialPromise:void 0;try{v=b??e.fn()}catch(N){v=Promise.reject(N)}Promise.resolve(v).then(h).catch(N=>{if(s())return;const E=e.retry??(h9.isServer()?0:3),_=e.retryDelay??JW,T=typeof _=="function"?_(n,N):_,A=E===!0||typeof E=="number"&&n<E||typeof E=="function"&&E(n,N);if(t||!A){g(N);return}n++,e.onFail?.(n,N),VW(T).then(()=>f()?void 0:y()).then(()=>{t?g(N):j()})})};return{promise:a,status:()=>a.status,cancel:l,continue:()=>(r?.(),a),cancelRetry:u,continueRetry:d,canStart:m,start:()=>(m()?j():y().then(j),a)}}var g9=class{#e;destroy(){this.clearGcTimeout()}scheduleGc(){this.clearGcTimeout(),zW(this.gcTime)&&(this.#e=V2.setTimeout(()=>{this.optionalRemove()},this.gcTime))}updateGcTime(e){this.gcTime=Math.max(this.gcTime||0,e??(h9.isServer()?1/0:300*1e3))}clearGcTimeout(){this.#e!==void 0&&(V2.clearTimeout(this.#e),this.#e=void 0)}};function eK(e){return{onFetch:(t,n)=>{const r=t.options,a=t.fetchOptions?.meta?.fetchMore?.direction,s=t.state.data?.pages||[],l=t.state.data?.pageParams||[];let u={pages:[],pageParams:[]},d=0;const f=async()=>{let m=!1;const h=j=>{KW(j,()=>t.signal,()=>m=!0)},g=p9(t.options,t.fetchOptions),y=async(j,v,b)=>{if(m)return Promise.reject(t.signal.reason);if(v==null&&j.pages.length)return Promise.resolve(j);const E=(()=>{const k={client:t.client,queryKey:t.queryKey,pageParam:v,direction:b?"backward":"forward",meta:t.options.meta};return h(k),k})(),_=await g(E),{maxPages:T}=t.options,A=b?WW:GW;return{pages:A(j.pages,_,T),pageParams:A(j.pageParams,v,T)}};if(a&&s.length){const j=a==="backward",v=j?tK:r5,b={pages:s,pageParams:l},N=v(r,b);u=await y(b,N,j)}else{const j=e??s.length;do{const v=d===0?l[0]??r.initialPageParam:r5(r,u);if(d>0&&v==null)break;u=await y(u,v),d++}while(d<j)}return u};t.options.persister?t.fetchFn=()=>t.options.persister?.(f,{client:t.client,queryKey:t.queryKey,meta:t.options.meta,signal:t.signal},n):t.fetchFn=f}}}function r5(e,{pages:t,pageParams:n}){const r=t.length-1;return t.length>0?e.getNextPageParam(t[r],t,n[r],n):void 0}function tK(e,{pages:t,pageParams:n}){return t.length>0?e.getPreviousPageParam?.(t[0],t,n[0],n):void 0}var nK=class extends g9{#e;#t;#n;#a;#i;#r;#l;#s;constructor(e){super(),this.#s=!1,this.#l=e.defaultOptions,this.setOptions(e.options),this.observers=[],this.#i=e.client,this.#a=this.#i.getQueryCache(),this.queryKey=e.queryKey,this.queryHash=e.queryHash,this.#t=i5(this.options),this.state=e.state??this.#t,this.scheduleGc()}get meta(){return this.options.meta}get queryType(){return this.#e}get promise(){return this.#r?.promise}setOptions(e){if(this.options={...this.#l,...e},e?._type&&(this.#e=e._type),this.updateGcTime(this.options.gcTime),this.state&&this.state.data===void 0){const t=i5(this.options);t.data!==void 0&&(this.setState(a5(t.data,t.dataUpdatedAt)),this.#t=t)}}optionalRemove(){!this.observers.length&&this.state.fetchStatus==="idle"&&this.#a.remove(this)}setData(e,t){const n=HW(this.state.data,e,this.options);return this.#o({data:n,type:"success",dataUpdatedAt:t?.updatedAt,manual:t?.manual}),n}setState(e){this.#o({type:"setState",state:e})}cancel(e){const t=this.#r?.promise;return this.#r?.cancel(e),t?t.then(Zr).catch(Zr):Promise.resolve()}destroy(){super.destroy(),this.cancel({silent:!0})}get resetState(){return this.#t}reset(){this.destroy(),this.setState(this.resetState)}isActive(){return this.observers.some(e=>FW(e.options.enabled,this)!==!1)}isDisabled(){return this.getObserversCount()>0?!this.isActive():this.options.queryFn===jA||!this.isFetched()}isFetched(){return this.state.dataUpdateCount+this.state.errorUpdateCount>0}isStatic(){return this.getObserversCount()>0?this.observers.some(e=>H2(e.options.staleTime,this)==="static"):!1}isStale(){return this.getObserversCount()>0?this.observers.some(e=>e.getCurrentResult().isStale):this.state.data===void 0||this.state.isInvalidated}isStaleByTime(e=0){return this.state.data===void 0?!0:e==="static"?!1:this.state.isInvalidated?!0:!qW(this.state.dataUpdatedAt,e)}onFocus(){this.observers.find(t=>t.shouldFetchOnWindowFocus())?.refetch({cancelRefetch:!1}),this.#r?.continue()}onOnline(){this.observers.find(t=>t.shouldFetchOnReconnect())?.refetch({cancelRefetch:!1}),this.#r?.continue()}addObserver(e){this.observers.includes(e)||(this.observers.push(e),this.clearGcTimeout(),this.#a.notify({type:"observerAdded",query:this,observer:e}))}removeObserver(e){this.observers.includes(e)&&(this.observers=this.observers.filter(t=>t!==e),this.observers.length||(this.#r&&(this.#s||this.#c()?this.#r.cancel({revert:!0}):this.#r.cancelRetry()),this.scheduleGc()),this.#a.notify({type:"observerRemoved",query:this,observer:e}))}getObserversCount(){return this.observers.length}#c(){return this.state.fetchStatus==="paused"&&this.state.status==="pending"}invalidate(){this.state.isInvalidated||this.#o({type:"invalidate"})}async fetch(e,t){if(this.state.fetchStatus!=="idle"&&this.#r?.status()!=="rejected"){if(this.state.data!==void 0&&t?.cancelRefetch)this.cancel({silent:!0});else if(this.#r)return this.#r.continueRetry(),this.#r.promise}if(e&&this.setOptions(e),!this.options.queryFn){const d=this.observers.find(f=>f.options.queryFn);d&&this.setOptions(d.options)}const n=new AbortController,r=d=>{Object.defineProperty(d,"signal",{enumerable:!0,get:()=>(this.#s=!0,n.signal)})},a=()=>{const d=p9(this.options,t),m=(()=>{const h={client:this.#i,queryKey:this.queryKey,meta:this.meta};return r(h),h})();return this.#s=!1,this.options.persister?this.options.persister(d,m,this):d(m)},l=(()=>{const d={fetchOptions:t,options:this.options,queryKey:this.queryKey,client:this.#i,state:this.state,fetchFn:a};return r(d),d})();(this.#e==="infinite"?eK(this.options.pages):this.options.behavior)?.onFetch(l,this),this.#n=this.state,(this.state.fetchStatus==="idle"||this.state.fetchMeta!==l.fetchOptions?.meta)&&this.#o({type:"fetch",meta:l.fetchOptions?.meta}),this.#r=x9({initialPromise:t?.initialPromise,fn:l.fetchFn,onCancel:d=>{d instanceof W2&&d.revert&&this.setState({...this.#n,fetchStatus:"idle"}),n.abort()},onFail:(d,f)=>{this.#o({type:"failed",failureCount:d,error:f})},onPause:()=>{this.#o({type:"pause"})},onContinue:()=>{this.#o({type:"continue"})},retry:l.options.retry,retryDelay:l.options.retryDelay,networkMode:l.options.networkMode,canRun:()=>!0});try{const d=await this.#r.start();if(d===void 0)throw new Error(`${this.queryHash} data is undefined`);return this.setData(d),this.#a.config.onSuccess?.(d,this),this.#a.config.onSettled?.(d,this.state.error,this),d}catch(d){if(d instanceof W2){if(d.silent)return this.#r.promise;if(d.revert){if(this.state.data===void 0)throw d;return this.state.data}}throw this.#o({type:"error",error:d}),this.#a.config.onError?.(d,this),this.#a.config.onSettled?.(this.state.data,d,this),d}finally{this.scheduleGc()}}#o(e){const t=n=>{switch(e.type){case"failed":return{...n,fetchFailureCount:e.failureCount,fetchFailureReason:e.error};case"pause":return{...n,fetchStatus:"paused"};case"continue":return{...n,fetchStatus:"fetching"};case"fetch":return{...n,...rK(n.data,this.options),fetchMeta:e.meta??null};case"success":const r={...n,...a5(e.data,e.dataUpdatedAt),dataUpdateCount:n.dataUpdateCount+1,...!e.manual&&{fetchStatus:"idle",fetchFailureCount:0,fetchFailureReason:null}};return this.#n=e.manual?r:void 0,r;case"error":const a=e.error;return{...n,error:a,errorUpdateCount:n.errorUpdateCount+1,errorUpdatedAt:Date.now(),fetchFailureCount:n.fetchFailureCount+1,fetchFailureReason:a,fetchStatus:"idle",status:"error",isInvalidated:!0};case"invalidate":return{...n,isInvalidated:!0};case"setState":return{...n,...e.state}}};this.state=t(this.state),$n.batch(()=>{this.observers.forEach(n=>{n.onQueryUpdate()}),this.#a.notify({query:this,type:"updated",action:e})})}};function rK(e,t){return{fetchFailureCount:0,fetchFailureReason:null,fetchStatus:m9(t.networkMode)?"fetching":"paused",...e===void 0&&{error:null,status:"pending"}}}function a5(e,t){return{data:e,dataUpdatedAt:t??Date.now(),error:null,isInvalidated:!1,status:"success"}}function i5(e){const t=typeof e.initialData=="function"?e.initialData():e.initialData,n=t!==void 0,r=n?typeof e.initialDataUpdatedAt=="function"?e.initialDataUpdatedAt():e.initialDataUpdatedAt:0;return{data:t,dataUpdateCount:0,dataUpdatedAt:n?r??Date.now():0,error:null,errorUpdateCount:0,errorUpdatedAt:0,fetchFailureCount:0,fetchFailureReason:null,fetchMeta:null,isInvalidated:!1,status:n?"success":"pending",fetchStatus:"idle"}}var aK=class extends g9{#e;#t;#n;#a;constructor(e){super(),this.#e=e.client,this.mutationId=e.mutationId,this.#n=e.mutationCache,this.#t=[],this.state=e.state||iK(),this.setOptions(e.options),this.scheduleGc()}setOptions(e){this.options=e,this.updateGcTime(this.options.gcTime)}get meta(){return this.options.meta}addObserver(e){this.#t.includes(e)||(this.#t.push(e),this.clearGcTimeout(),this.#n.notify({type:"observerAdded",mutation:this,observer:e}))}removeObserver(e){this.#t=this.#t.filter(t=>t!==e),this.scheduleGc(),this.#n.notify({type:"observerRemoved",mutation:this,observer:e})}optionalRemove(){this.#t.length||(this.state.status==="pending"?this.scheduleGc():this.#n.remove(this))}continue(){return this.#a?.continue()??this.execute(this.state.variables)}async execute(e){const t=()=>{this.#i({type:"continue"})},n={client:this.#e,meta:this.options.meta,mutationKey:this.options.mutationKey};this.#a=x9({fn:()=>this.options.mutationFn?this.options.mutationFn(e,n):Promise.reject(new Error("No mutationFn found")),onFail:(s,l)=>{this.#i({type:"failed",failureCount:s,error:l})},onPause:()=>{this.#i({type:"pause"})},onContinue:t,retry:this.options.retry??0,retryDelay:this.options.retryDelay,networkMode:this.options.networkMode,canRun:()=>this.#n.canRun(this)});const r=this.state.status==="pending",a=!this.#a.canStart();try{if(r)t();else{this.#i({type:"pending",variables:e,isPaused:a}),this.#n.config.onMutate&&await this.#n.config.onMutate(e,this,n);const l=await this.options.onMutate?.(e,n);l!==this.state.context&&this.#i({type:"pending",context:l,variables:e,isPaused:a})}const s=await this.#a.start();return await this.#n.config.onSuccess?.(s,e,this.state.context,this,n),await this.options.onSuccess?.(s,e,this.state.context,n),await this.#n.config.onSettled?.(s,null,this.state.variables,this.state.context,this,n),await this.options.onSettled?.(s,null,e,this.state.context,n),this.#i({type:"success",data:s}),s}catch(s){try{await this.#n.config.onError?.(s,e,this.state.context,this,n)}catch(l){Promise.reject(l)}try{await this.options.onError?.(s,e,this.state.context,n)}catch(l){Promise.reject(l)}try{await this.#n.config.onSettled?.(void 0,s,this.state.variables,this.state.context,this,n)}catch(l){Promise.reject(l)}try{await this.options.onSettled?.(void 0,s,e,this.state.context,n)}catch(l){Promise.reject(l)}throw this.#i({type:"error",error:s}),s}finally{this.#n.runNext(this)}}#i(e){const t=n=>{switch(e.type){case"failed":return{...n,failureCount:e.failureCount,failureReason:e.error};case"pause":return{...n,isPaused:!0};case"continue":return{...n,isPaused:!1};case"pending":return{...n,context:e.context,data:void 0,failureCount:0,failureReason:null,error:null,isPaused:e.isPaused,status:"pending",variables:e.variables,submittedAt:Date.now()};case"success":return{...n,data:e.data,failureCount:0,failureReason:null,error:null,status:"success",isPaused:!1};case"error":return{...n,data:void 0,error:e.error,failureCount:n.failureCount+1,failureReason:e.error,isPaused:!1,status:"error"}}};this.state=t(this.state),$n.batch(()=>{this.#t.forEach(n=>{n.onMutationUpdate(e)}),this.#n.notify({mutation:this,type:"updated",action:e})})}};function iK(){return{context:void 0,data:void 0,error:null,failureCount:0,failureReason:null,isPaused:!1,status:"idle",variables:void 0,submittedAt:0}}var sK=class extends lg{constructor(e={}){super(),this.config=e,this.#e=new Set,this.#t=new Map,this.#n=0}#e;#t;#n;build(e,t,n){const r=new aK({client:e,mutationCache:this,mutationId:++this.#n,options:e.defaultMutationOptions(t),state:n});return this.add(r),r}add(e){this.#e.add(e);const t=hh(e);if(typeof t=="string"){const n=this.#t.get(t);n?n.push(e):this.#t.set(t,[e])}this.notify({type:"added",mutation:e})}remove(e){if(this.#e.delete(e)){const t=hh(e);if(typeof t=="string"){const n=this.#t.get(t);if(n)if(n.length>1){const r=n.indexOf(e);r!==-1&&n.splice(r,1)}else n[0]===e&&this.#t.delete(t)}}this.notify({type:"removed",mutation:e})}canRun(e){const t=hh(e);if(typeof t=="string"){const r=this.#t.get(t)?.find(a=>a.state.status==="pending");return!r||r===e}else return!0}runNext(e){const t=hh(e);return typeof t=="string"?this.#t.get(t)?.find(r=>r!==e&&r.state.isPaused)?.continue()??Promise.resolve():Promise.resolve()}clear(){$n.batch(()=>{this.#e.forEach(e=>{this.notify({type:"removed",mutation:e})}),this.#e.clear(),this.#t.clear()})}getAll(){return Array.from(this.#e)}find(e){const t={exact:!0,...e};return this.getAll().find(n=>e5(t,n))}findAll(e={}){return this.getAll().filter(t=>e5(e,t))}notify(e){$n.batch(()=>{this.listeners.forEach(t=>{t(e)})})}resumePausedMutations(){const e=this.getAll().filter(t=>t.state.isPaused);return $n.batch(()=>Promise.all(e.map(t=>t.continue().catch(Zr))))}};function hh(e){return e.options.scope?.id}var oK=class extends lg{constructor(e={}){super(),this.config=e,this.#e=new Map}#e;build(e,t,n){const r=t.queryKey,a=t.queryHash??bA(r,t);let s=this.get(a);return s||(s=new nK({client:e,queryKey:r,queryHash:a,options:e.defaultQueryOptions(t),state:n,defaultOptions:e.getQueryDefaults(r)}),this.add(s)),s}add(e){this.#e.has(e.queryHash)||(this.#e.set(e.queryHash,e),this.notify({type:"added",query:e}))}remove(e){const t=this.#e.get(e.queryHash);t&&(e.destroy(),t===e&&this.#e.delete(e.queryHash),this.notify({type:"removed",query:e}))}clear(){$n.batch(()=>{this.getAll().forEach(e=>{this.remove(e)})})}get(e){return this.#e.get(e)}getAll(){return[...this.#e.values()]}find(e){const t={exact:!0,...e};return this.getAll().find(n=>JO(t,n))}findAll(e={}){const t=this.getAll();return Object.keys(e).length>0?t.filter(n=>JO(e,n)):t}notify(e){$n.batch(()=>{this.listeners.forEach(t=>{t(e)})})}onFocus(){$n.batch(()=>{this.getAll().forEach(e=>{e.onFocus()})})}onOnline(){$n.batch(()=>{this.getAll().forEach(e=>{e.onOnline()})})}},lK=class{#e;#t;#n;#a;#i;#r;#l;#s;constructor(e={}){this.#e=e.queryCache||new oK,this.#t=e.mutationCache||new sK,this.#n=e.defaultOptions||{},this.#a=new Map,this.#i=new Map,this.#r=0}mount(){this.#r++,this.#r===1&&(this.#l=d9.subscribe(async e=>{e&&(await this.resumePausedMutations(),this.#e.onFocus())}),this.#s=Am.subscribe(async e=>{e&&(await this.resumePausedMutations(),this.#e.onOnline())}))}unmount(){this.#r--,this.#r===0&&(this.#l?.(),this.#l=void 0,this.#s?.(),this.#s=void 0)}isFetching(e){return this.#e.findAll({...e,fetchStatus:"fetching"}).length}isMutating(e){return this.#t.findAll({...e,status:"pending"}).length}getQueryData(e){const t=this.defaultQueryOptions({queryKey:e});return this.#e.get(t.queryHash)?.state.data}ensureQueryData(e){const t=this.defaultQueryOptions(e),n=this.#e.build(this,t),r=n.state.data;return r===void 0?this.fetchQuery(e):(e.revalidateIfStale&&n.isStaleByTime(H2(t.staleTime,n))&&this.prefetchQuery(t),Promise.resolve(r))}getQueriesData(e){return this.#e.findAll(e).map(({queryKey:t,state:n})=>{const r=n.data;return[t,r]})}setQueryData(e,t,n){const r=this.defaultQueryOptions({queryKey:e}),s=this.#e.get(r.queryHash)?.state.data,l=BW(t,s);if(l!==void 0)return this.#e.build(this,r).setData(l,{...n,manual:!0})}setQueriesData(e,t,n){return $n.batch(()=>this.#e.findAll(e).map(({queryKey:r})=>[r,this.setQueryData(r,t,n)]))}getQueryState(e){const t=this.defaultQueryOptions({queryKey:e});return this.#e.get(t.queryHash)?.state}removeQueries(e){const t=this.#e;$n.batch(()=>{t.findAll(e).forEach(n=>{t.remove(n)})})}resetQueries(e,t){const n=this.#e;return $n.batch(()=>(n.findAll(e).forEach(r=>{r.reset()}),this.refetchQueries({type:"active",...e},t)))}cancelQueries(e,t={}){const n={revert:!0,...t},r=$n.batch(()=>this.#e.findAll(e).map(a=>a.cancel(n)));return Promise.all(r).then(Zr).catch(Zr)}invalidateQueries(e,t={}){return $n.batch(()=>(this.#e.findAll(e).forEach(n=>{n.invalidate()}),e?.refetchType==="none"?Promise.resolve():this.refetchQueries({...e,type:e?.refetchType??e?.type??"active"},t)))}refetchQueries(e,t={}){const n={...t,cancelRefetch:t.cancelRefetch??!0},r=$n.batch(()=>this.#e.findAll(e).filter(a=>!a.isDisabled()&&!a.isStatic()).map(a=>{let s=a.fetch(void 0,n);return n.throwOnError||(s=s.catch(Zr)),a.state.fetchStatus==="paused"?Promise.resolve():s}));return Promise.all(r).then(Zr)}fetchQuery(e){const t=this.defaultQueryOptions(e);t.retry===void 0&&(t.retry=!1);const n=this.#e.build(this,t);return n.isStaleByTime(H2(t.staleTime,n))?n.fetch(t):Promise.resolve(n.state.data)}prefetchQuery(e){return this.fetchQuery(e).then(Zr).catch(Zr)}fetchInfiniteQuery(e){return e._type="infinite",this.fetchQuery(e)}prefetchInfiniteQuery(e){return this.fetchInfiniteQuery(e).then(Zr).catch(Zr)}ensureInfiniteQueryData(e){return e._type="infinite",this.ensureQueryData(e)}resumePausedMutations(){return Am.isOnline()?this.#t.resumePausedMutations():Promise.resolve()}getQueryCache(){return this.#e}getMutationCache(){return this.#t}getDefaultOptions(){return this.#n}setDefaultOptions(e){this.#n=e}setQueryDefaults(e,t){this.#a.set(Dd(e),{queryKey:e,defaultOptions:t})}getQueryDefaults(e){const t=[...this.#a.values()],n={};return t.forEach(r=>{Rd(e,r.queryKey)&&Object.assign(n,r.defaultOptions)}),n}setMutationDefaults(e,t){this.#i.set(Dd(e),{mutationKey:e,defaultOptions:t})}getMutationDefaults(e){const t=[...this.#i.values()],n={};return t.forEach(r=>{Rd(e,r.mutationKey)&&Object.assign(n,r.defaultOptions)}),n}defaultQueryOptions(e){if(e._defaulted)return e;const t={...this.#n.queries,...this.getQueryDefaults(e.queryKey),...e,_defaulted:!0};return t.queryHash||(t.queryHash=bA(t.queryKey,t)),t.refetchOnReconnect===void 0&&(t.refetchOnReconnect=t.networkMode!=="always"),t.throwOnError===void 0&&(t.throwOnError=!!t.suspense),!t.networkMode&&t.persister&&(t.networkMode="offlineFirst"),t.queryFn===jA&&(t.enabled=!1),t}defaultMutationOptions(e){return e?._defaulted?e:{...this.#n.mutations,...e?.mutationKey&&this.getMutationDefaults(e.mutationKey),...e,_defaulted:!0}}clear(){this.#e.clear(),this.#t.clear()}},S=og();const ee=Et(S),cg=NW({__proto__:null,default:ee},[S]);var cK=S.createContext(void 0),uK=({client:e,children:t})=>(S.useEffect(()=>(e.mount(),()=>{e.unmount()}),[e]),i.jsx(cK.Provider,{value:e,children:t})),ug=u9();function _t(e,t,{checkForDefaultPrevented:n=!0}={}){return function(a){if(e?.(a),n===!1||!a.defaultPrevented)return t?.(a)}}function s5(e,t){if(typeof e=="function")return e(t);e!=null&&(e.current=t)}function dK(...e){return t=>{let n=!1;const r=e.map(a=>{const s=s5(a,t);return!n&&typeof s=="function"&&(n=!0),s});if(n)return()=>{for(let a=0;a<r.length;a++){const s=r[a];typeof s=="function"?s():s5(e[a],null)}}}}function an(...e){return S.useCallback(dK(...e),e)}function To(e,t=[]){let n=[];function r(s,l){const u=S.createContext(l);u.displayName=s+"Context";const d=n.length;n=[...n,l];const f=h=>{const{scope:g,children:y,...j}=h,v=g?.[e]?.[d]||u,b=S.useMemo(()=>j,Object.values(j));return i.jsx(v.Provider,{value:b,children:y})};f.displayName=s+"Provider";function m(h,g){const y=g?.[e]?.[d]||u,j=S.useContext(y);if(j)return j;if(l!==void 0)return l;throw new Error(`\`${h}\` must be used within \`${s}\``)}return[f,m]}const a=()=>{const s=n.map(l=>S.createContext(l));return function(u){const d=u?.[e]||s;return S.useMemo(()=>({[`__scope${e}`]:{...u,[e]:d}}),[u,d])}};return a.scopeName=e,[r,fK(a,...t)]}function fK(...e){const t=e[0];if(e.length===1)return t;const n=()=>{const r=e.map(a=>({useScope:a(),scopeName:a.scopeName}));return function(s){const l=r.reduce((u,{useScope:d,scopeName:f})=>{const h=d(s)[`__scope${f}`];return{...u,...h}},{});return S.useMemo(()=>({[`__scope${t.scopeName}`]:l}),[l])}};return n.scopeName=t.scopeName,n}function Id(e){const t=S.forwardRef((n,r)=>{let{children:a,...s}=n,l=null,u=!1;const d=[];o5(a)&&typeof mh=="function"&&(a=mh(a._payload)),S.Children.forEach(a,g=>{if(yK(g)){u=!0;const y=g;let j="child"in y.props?y.props.child:y.props.children;o5(j)&&typeof mh=="function"&&(j=mh(j._payload)),l=mK(y,j),d.push(l?.props?.children)}else d.push(g)}),l?l=S.cloneElement(l,void 0,d):!u&&S.Children.count(a)===1&&S.isValidElement(a)&&(l=a);const f=l?gK(l):void 0,m=an(r,f);if(!l){if(a||a===0)throw new Error(u?wK(e):jK(e));return a}const h=xK(s,l.props??{});return l.type!==S.Fragment&&(h.ref=r?m:f),S.cloneElement(l,h)});return t.displayName=`${e}.Slot`,t}var pK=Id("Slot"),y9=Symbol.for("radix.slottable");function hK(e){const t=n=>"child"in n?n.children(n.child):n.children;return t.displayName=`${e}.Slottable`,t.__radixId=y9,t}var mK=(e,t)=>{if("child"in e.props){const n=e.props.child;return S.isValidElement(n)?S.cloneElement(n,void 0,e.props.children(n.props.children)):null}return S.isValidElement(t)?t:null};function xK(e,t){const n={...t};for(const r in t){const a=e[r],s=t[r];/^on[A-Z]/.test(r)?a&&s?n[r]=(...u)=>{const d=s(...u);return a(...u),d}:a&&(n[r]=a):r==="style"?n[r]={...a,...s}:r==="className"&&(n[r]=[a,s].filter(Boolean).join(" "))}return{...e,...n}}function gK(e){let t=Object.getOwnPropertyDescriptor(e.props,"ref")?.get,n=t&&"isReactWarning"in t&&t.isReactWarning;return n?e.ref:(t=Object.getOwnPropertyDescriptor(e,"ref")?.get,n=t&&"isReactWarning"in t&&t.isReactWarning,n?e.props.ref:e.props.ref||e.ref)}function yK(e){return S.isValidElement(e)&&typeof e.type=="function"&&"__radixId"in e.type&&e.type.__radixId===y9}var vK=Symbol.for("react.lazy");function o5(e){return e!=null&&typeof e=="object"&&"$$typeof"in e&&e.$$typeof===vK&&"_payload"in e&&bK(e._payload)}function bK(e){return typeof e=="object"&&e!==null&&"then"in e}var jK=e=>`${e} failed to slot onto its children. Expected a single React element child or \`Slottable\`.`,wK=e=>`${e} failed to slot onto its \`Slottable\`. Expected \`Slottable\` to receive a single React element child.`,mh=cg[" use ".trim().toString()];function SK(e){const t=e+"CollectionProvider",[n,r]=To(t),[a,s]=n(t,{collectionRef:{current:null},itemMap:new Map}),l=v=>{const{scope:b,children:N}=v,E=S.useRef(null),_=S.useRef(new Map).current;return i.jsx(a,{scope:b,itemMap:_,collectionRef:E,children:N})};l.displayName=t;const u=e+"CollectionSlot",d=Id(u),f=S.forwardRef((v,b)=>{const{scope:N,children:E}=v,_=s(u,N),T=an(b,_.collectionRef);return i.jsx(d,{ref:T,children:E})});f.displayName=u;const m=e+"CollectionItemSlot",h="data-radix-collection-item",g=Id(m),y=S.forwardRef((v,b)=>{const{scope:N,children:E,..._}=v,T=S.useRef(null),A=an(b,T),k=s(m,N);return S.useEffect(()=>(k.itemMap.set(T,{ref:T,..._}),()=>{k.itemMap.delete(T)})),i.jsx(g,{[h]:"",ref:A,children:E})});y.displayName=m;function j(v){const b=s(e+"CollectionConsumer",v);return S.useCallback(()=>{const E=b.collectionRef.current;if(!E)return[];const _=Array.from(E.querySelectorAll(`[${h}]`));return Array.from(b.itemMap.values()).sort((k,O)=>_.indexOf(k.ref.current)-_.indexOf(O.ref.current))},[b.collectionRef,b.itemMap])}return[{Provider:l,Slot:f,ItemSlot:y},j,r]}var NK=["a","button","div","form","h2","h3","img","input","label","li","nav","ol","p","select","span","svg","ul"],Rt=NK.reduce((e,t)=>{const n=Id(`Primitive.${t}`),r=S.forwardRef((a,s)=>{const{asChild:l,...u}=a,d=l?n:t;return typeof window<"u"&&(window[Symbol.for("radix-ui")]=!0),i.jsx(d,{...u,ref:s})});return r.displayName=`Primitive.${t}`,{...e,[t]:r}},{});function v9(e,t){e&&ug.flushSync(()=>e.dispatchEvent(t))}function Da(e){const t=S.useRef(e);return S.useEffect(()=>{t.current=e}),S.useMemo(()=>((...n)=>t.current?.(...n)),[])}function AK(e,t=globalThis?.document){const n=Da(e);S.useEffect(()=>{const r=a=>{a.key==="Escape"&&n(a)};return t.addEventListener("keydown",r,{capture:!0}),()=>t.removeEventListener("keydown",r,{capture:!0})},[n,t])}var CK="DismissableLayer",K2="dismissableLayer.update",_K="dismissableLayer.pointerDownOutside",EK="dismissableLayer.focusOutside",l5,wA=S.createContext({layers:new Set,layersWithOutsidePointerEventsDisabled:new Set,branches:new Set,dismissableSurfaces:new Set}),dg=S.forwardRef((e,t)=>{const{disableOutsidePointerEvents:n=!1,deferPointerDownOutside:r=!1,onEscapeKeyDown:a,onPointerDownOutside:s,onFocusOutside:l,onInteractOutside:u,onDismiss:d,...f}=e,m=S.useContext(wA),[h,g]=S.useState(null),y=h?.ownerDocument??globalThis?.document,[,j]=S.useState({}),v=an(t,D=>g(D)),b=Array.from(m.layers),[N]=[...m.layersWithOutsidePointerEventsDisabled].slice(-1),E=b.indexOf(N),_=h?b.indexOf(h):-1,T=m.layersWithOutsidePointerEventsDisabled.size>0,A=_>=E,k=S.useRef(!1),O=OK(D=>{const z=D.target;if(!(z instanceof Node))return;const L=[...m.branches].some(q=>q.contains(z));!A||L||(s?.(D),u?.(D),D.defaultPrevented||d?.())},{ownerDocument:y,deferPointerDownOutside:r,isDeferredPointerDownOutsideRef:k,dismissableSurfaces:m.dismissableSurfaces}),M=MK(D=>{if(r&&k.current)return;const z=D.target;[...m.branches].some(q=>q.contains(z))||(l?.(D),u?.(D),D.defaultPrevented||d?.())},y);return AK(D=>{_===m.layers.size-1&&(a?.(D),!D.defaultPrevented&&d&&(D.preventDefault(),d()))},y),S.useEffect(()=>{if(h)return n&&(m.layersWithOutsidePointerEventsDisabled.size===0&&(l5=y.body.style.pointerEvents,y.body.style.pointerEvents="none"),m.layersWithOutsidePointerEventsDisabled.add(h)),m.layers.add(h),c5(),()=>{n&&(m.layersWithOutsidePointerEventsDisabled.delete(h),m.layersWithOutsidePointerEventsDisabled.size===0&&(y.body.style.pointerEvents=l5))}},[h,y,n,m]),S.useEffect(()=>()=>{h&&(m.layers.delete(h),m.layersWithOutsidePointerEventsDisabled.delete(h),c5())},[h,m]),S.useEffect(()=>{const D=()=>j({});return document.addEventListener(K2,D),()=>document.removeEventListener(K2,D)},[]),i.jsx(Rt.div,{...f,ref:v,style:{pointerEvents:T?A?"auto":"none":void 0,...e.style},onFocusCapture:_t(e.onFocusCapture,M.onFocusCapture),onBlurCapture:_t(e.onBlurCapture,M.onBlurCapture),onPointerDownCapture:_t(e.onPointerDownCapture,O.onPointerDownCapture)})});dg.displayName=CK;var TK="DismissableLayerBranch",b9=S.forwardRef((e,t)=>{const n=S.useContext(wA),r=S.useRef(null),a=an(t,r);return S.useEffect(()=>{const s=r.current;if(s)return n.branches.add(s),()=>{n.branches.delete(s)}},[n.branches]),i.jsx(Rt.div,{...e,ref:a})});b9.displayName=TK;function kK(){const e=S.useContext(wA),[t,n]=S.useState(null);return S.useEffect(()=>{if(t)return e.dismissableSurfaces.add(t),()=>{e.dismissableSurfaces.delete(t)}},[t,e.dismissableSurfaces]),n}function OK(e,t){const{ownerDocument:n=globalThis?.document,deferPointerDownOutside:r=!1,isDeferredPointerDownOutsideRef:a,dismissableSurfaces:s}=t,l=Da(e),u=S.useRef(!1),d=S.useRef(!1),f=S.useRef(new Map),m=S.useRef(()=>{});return S.useEffect(()=>{function h(){d.current=!1,a.current=!1,f.current.clear()}function g(){return Array.from(f.current.values()).some(Boolean)}function y(E){if(!d.current)return;const _=E.target;_ instanceof Node&&[...s].some(A=>A.contains(_))||f.current.set(E.type,!0),E.type==="click"&&window.setTimeout(()=>{d.current&&m.current()},0)}function j(E){d.current&&f.current.set(E.type,!1)}const v=E=>{if(E.target&&!u.current){let _=function(){n.removeEventListener("click",m.current);const A=g();h(),A||j9(_K,l,T,{discrete:!0})};const T={originalEvent:E};d.current=!0,a.current=r&&E.button===0,f.current.clear(),!r||E.button!==0?_():(n.removeEventListener("click",m.current),m.current=_,n.addEventListener("click",m.current,{once:!0}))}else n.removeEventListener("click",m.current),h();u.current=!1},b=["pointerup","mousedown","mouseup","touchstart","touchend","click"];for(const E of b)n.addEventListener(E,y,!0),n.addEventListener(E,j);const N=window.setTimeout(()=>{n.addEventListener("pointerdown",v)},0);return()=>{window.clearTimeout(N),n.removeEventListener("pointerdown",v),n.removeEventListener("click",m.current);for(const E of b)n.removeEventListener(E,y,!0),n.removeEventListener(E,j)}},[n,l,r,a,s]),{onPointerDownCapture:()=>u.current=!0}}function MK(e,t=globalThis?.document){const n=Da(e),r=S.useRef(!1);return S.useEffect(()=>{const a=s=>{s.target&&!r.current&&j9(EK,n,{originalEvent:s},{discrete:!1})};return t.addEventListener("focusin",a),()=>t.removeEventListener("focusin",a)},[t,n]),{onFocusCapture:()=>r.current=!0,onBlurCapture:()=>r.current=!1}}function c5(){const e=new CustomEvent(K2);document.dispatchEvent(e)}function j9(e,t,n,{discrete:r}){const a=n.originalEvent.target,s=new CustomEvent(e,{bubbles:!1,cancelable:!0,detail:n});t&&a.addEventListener(e,t,{once:!0}),r?v9(a,s):a.dispatchEvent(s)}var PK=dg,DK=b9,_a=globalThis?.document?S.useLayoutEffect:()=>{},RK="Portal",fg=S.forwardRef((e,t)=>{const{container:n,...r}=e,[a,s]=S.useState(!1);_a(()=>s(!0),[]);const l=n||a&&globalThis?.document?.body;return l?ug.createPortal(i.jsx(Rt.div,{...r,ref:t}),l):null});fg.displayName=RK;function IK(e,t){return S.useReducer((n,r)=>t[n][r]??n,e)}var ko=e=>{const{present:t,children:n}=e,r=$K(t),a=typeof n=="function"?n({present:r.isPresent}):S.Children.only(n),s=LK(r.ref,BK(a));return typeof n=="function"||r.isPresent?S.cloneElement(a,{ref:s}):null};ko.displayName="Presence";function $K(e){const[t,n]=S.useState(),r=S.useRef(null),a=S.useRef(e),s=S.useRef("none"),l=e?"mounted":"unmounted",[u,d]=IK(l,{mounted:{UNMOUNT:"unmounted",ANIMATION_OUT:"unmountSuspended"},unmountSuspended:{MOUNT:"mounted",ANIMATION_END:"unmounted"},unmounted:{MOUNT:"mounted"}});return S.useEffect(()=>{const f=xh(r.current);s.current=u==="mounted"?f:"none"},[u]),_a(()=>{const f=r.current,m=a.current;if(m!==e){const g=s.current,y=xh(f);e?d("MOUNT"):y==="none"||f?.display==="none"?d("UNMOUNT"):d(m&&g!==y?"ANIMATION_OUT":"UNMOUNT"),a.current=e}},[e,d]),_a(()=>{if(t){let f;const m=t.ownerDocument.defaultView??window,h=y=>{const v=xh(r.current).includes(CSS.escape(y.animationName));if(y.target===t&&v&&(d("ANIMATION_END"),!a.current)){const b=t.style.animationFillMode;t.style.animationFillMode="forwards",f=m.setTimeout(()=>{t.style.animationFillMode==="forwards"&&(t.style.animationFillMode=b)})}},g=y=>{y.target===t&&(s.current=xh(r.current))};return t.addEventListener("animationstart",g),t.addEventListener("animationcancel",h),t.addEventListener("animationend",h),()=>{m.clearTimeout(f),t.removeEventListener("animationstart",g),t.removeEventListener("animationcancel",h),t.removeEventListener("animationend",h)}}else d("ANIMATION_END")},[t,d]),{isPresent:["mounted","unmountSuspended"].includes(u),ref:S.useCallback(f=>{r.current=f?getComputedStyle(f):null,n(f)},[])}}function u5(e,t){if(typeof e=="function")return e(t);e!=null&&(e.current=t)}function LK(...e){const t=S.useRef(e);return t.current=e,S.useCallback(n=>{const r=t.current;let a=!1;const s=r.map(l=>{const u=u5(l,n);return!a&&typeof u=="function"&&(a=!0),u});if(a)return()=>{for(let l=0;l<s.length;l++){const u=s[l];typeof u=="function"?u():u5(r[l],null)}}},[])}function xh(e){return e?.animationName||"none"}function BK(e){let t=Object.getOwnPropertyDescriptor(e.props,"ref")?.get,n=t&&"isReactWarning"in t&&t.isReactWarning;return n?e.ref:(t=Object.getOwnPropertyDescriptor(e,"ref")?.get,n=t&&"isReactWarning"in t&&t.isReactWarning,n?e.props.ref:e.props.ref||e.ref)}var zK=cg[" useInsertionEffect ".trim().toString()]||_a;function SA({prop:e,defaultProp:t,onChange:n=()=>{},caller:r}){const[a,s,l]=qK({defaultProp:t,onChange:n}),u=e!==void 0,d=u?e:a;{const m=S.useRef(e!==void 0);S.useEffect(()=>{const h=m.current;h!==u&&console.warn(`${r} is changing from ${h?"controlled":"uncontrolled"} to ${u?"controlled":"uncontrolled"}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`),m.current=u},[u,r])}const f=S.useCallback(m=>{if(u){const h=FK(m)?m(e):m;h!==e&&l.current?.(h)}else s(m)},[u,e,s,l]);return[d,f]}function qK({defaultProp:e,onChange:t}){const[n,r]=S.useState(e),a=S.useRef(n),s=S.useRef(t);return zK(()=>{s.current=t},[t]),S.useEffect(()=>{a.current!==n&&(s.current?.(n),a.current=n)},[n,a]),[n,r,s]}function FK(e){return typeof e=="function"}var UK=Object.freeze({position:"absolute",border:0,width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0, 0, 0, 0)",whiteSpace:"nowrap",wordWrap:"normal"}),VK="VisuallyHidden",pg=S.forwardRef((e,t)=>i.jsx(Rt.span,{...e,ref:t,style:{...UK,...e.style}}));pg.displayName=VK;var HK=pg,NA="ToastProvider",[AA,GK,WK]=SK("Toast"),[w9]=To("Toast",[WK]),[KK,hg]=w9(NA),S9=e=>{const{__scopeToast:t,label:n="Notification",duration:r=5e3,swipeDirection:a="right",swipeThreshold:s=50,announcerContainer:l,children:u}=e,[d,f]=S.useState(null),[m,h]=S.useState(0),g=S.useRef(!1),y=S.useRef(!1);return n.trim()||console.error(`Invalid prop \`label\` supplied to \`${NA}\`. Expected non-empty \`string\`.`),i.jsx(AA.Provider,{scope:t,children:i.jsx(KK,{scope:t,label:n,duration:r,swipeDirection:a,swipeThreshold:s,toastCount:m,viewport:d,onViewportChange:f,onToastAdd:S.useCallback(()=>h(j=>j+1),[]),onToastRemove:S.useCallback(()=>h(j=>j-1),[]),isFocusedToastEscapeKeyDownRef:g,isClosePausedRef:y,announcerContainer:l,children:u})})};S9.displayName=NA;var N9="ToastViewport",YK=["F8"],Y2="toast.viewportPause",X2="toast.viewportResume",A9=S.forwardRef((e,t)=>{const{__scopeToast:n,hotkey:r=YK,label:a="Notifications ({hotkey})",...s}=e,l=hg(N9,n),u=GK(n),d=S.useRef(null),f=S.useRef(null),m=S.useRef(null),h=S.useRef(null),g=an(t,h,l.onViewportChange),y=r.join("+").replace(/Key/g,"").replace(/Digit/g,""),j=l.toastCount>0;S.useEffect(()=>{const b=N=>{r.length!==0&&r.every(_=>N[_]||N.code===_)&&h.current?.focus()};return document.addEventListener("keydown",b),()=>document.removeEventListener("keydown",b)},[r]),S.useEffect(()=>{const b=d.current,N=h.current;if(j&&b&&N){const E=()=>{if(!l.isClosePausedRef.current){const k=new CustomEvent(Y2);N.dispatchEvent(k),l.isClosePausedRef.current=!0}},_=()=>{if(l.isClosePausedRef.current){const k=new CustomEvent(X2);N.dispatchEvent(k),l.isClosePausedRef.current=!1}},T=k=>{!b.contains(k.relatedTarget)&&_()},A=()=>{b.contains(document.activeElement)||_()};return b.addEventListener("focusin",E),b.addEventListener("focusout",T),b.addEventListener("pointermove",E),b.addEventListener("pointerleave",A),window.addEventListener("blur",E),window.addEventListener("focus",_),()=>{b.removeEventListener("focusin",E),b.removeEventListener("focusout",T),b.removeEventListener("pointermove",E),b.removeEventListener("pointerleave",A),window.removeEventListener("blur",E),window.removeEventListener("focus",_)}}},[j,l.isClosePausedRef]);const v=S.useCallback(({tabbingDirection:b})=>{const E=u().map(_=>{const T=_.ref.current,A=[T,...lY(T)];return b==="forwards"?A:A.reverse()});return(b==="forwards"?E.reverse():E).flat()},[u]);return S.useEffect(()=>{const b=h.current;if(b){const N=E=>{const _=E.altKey||E.ctrlKey||E.metaKey;if(E.key==="Tab"&&!_){const A=document.activeElement,k=E.shiftKey;if(E.target===b&&k){f.current?.focus();return}const D=v({tabbingDirection:k?"backwards":"forwards"}),z=D.findIndex(L=>L===A);Xb(D.slice(z+1))?E.preventDefault():k?f.current?.focus():m.current?.focus()}};return b.addEventListener("keydown",N),()=>b.removeEventListener("keydown",N)}},[u,v]),i.jsxs(DK,{ref:d,role:"region","aria-label":a.replace("{hotkey}",y),tabIndex:-1,style:{pointerEvents:j?void 0:"none"},children:[j&&i.jsx(Q2,{ref:f,onFocusFromOutsideViewport:()=>{const b=v({tabbingDirection:"forwards"});Xb(b)}}),i.jsx(AA.Slot,{scope:n,children:i.jsx(Rt.ol,{tabIndex:-1,...s,ref:g})}),j&&i.jsx(Q2,{ref:m,onFocusFromOutsideViewport:()=>{const b=v({tabbingDirection:"backwards"});Xb(b)}})]})});A9.displayName=N9;var C9="ToastFocusProxy",Q2=S.forwardRef((e,t)=>{const{__scopeToast:n,onFocusFromOutsideViewport:r,...a}=e,s=hg(C9,n);return i.jsx(pg,{tabIndex:0,...a,ref:t,style:{position:"fixed"},onFocus:l=>{const u=l.relatedTarget;!s.viewport?.contains(u)&&r()}})});Q2.displayName=C9;var kf="Toast",XK="toast.swipeStart",QK="toast.swipeMove",ZK="toast.swipeCancel",JK="toast.swipeEnd",_9=S.forwardRef((e,t)=>{const{forceMount:n,open:r,defaultOpen:a,onOpenChange:s,...l}=e,[u,d]=SA({prop:r,defaultProp:a??!0,onChange:s,caller:kf});return i.jsx(ko,{present:n||u,children:i.jsx(nY,{open:u,...l,ref:t,onClose:()=>d(!1),onPause:Da(e.onPause),onResume:Da(e.onResume),onSwipeStart:_t(e.onSwipeStart,f=>{f.currentTarget.setAttribute("data-swipe","start")}),onSwipeMove:_t(e.onSwipeMove,f=>{const{x:m,y:h}=f.detail.delta;f.currentTarget.setAttribute("data-swipe","move"),f.currentTarget.style.setProperty("--radix-toast-swipe-move-x",`${m}px`),f.currentTarget.style.setProperty("--radix-toast-swipe-move-y",`${h}px`)}),onSwipeCancel:_t(e.onSwipeCancel,f=>{f.currentTarget.setAttribute("data-swipe","cancel"),f.currentTarget.style.removeProperty("--radix-toast-swipe-move-x"),f.currentTarget.style.removeProperty("--radix-toast-swipe-move-y"),f.currentTarget.style.removeProperty("--radix-toast-swipe-end-x"),f.currentTarget.style.removeProperty("--radix-toast-swipe-end-y")}),onSwipeEnd:_t(e.onSwipeEnd,f=>{const{x:m,y:h}=f.detail.delta;f.currentTarget.setAttribute("data-swipe","end"),f.currentTarget.style.removeProperty("--radix-toast-swipe-move-x"),f.currentTarget.style.removeProperty("--radix-toast-swipe-move-y"),f.currentTarget.style.setProperty("--radix-toast-swipe-end-x",`${m}px`),f.currentTarget.style.setProperty("--radix-toast-swipe-end-y",`${h}px`),d(!1)})})})});_9.displayName=kf;var[eY,tY]=w9(kf,{onClose(){}}),nY=S.forwardRef((e,t)=>{const{__scopeToast:n,type:r="foreground",duration:a,open:s,onClose:l,onEscapeKeyDown:u,onPause:d,onResume:f,onSwipeStart:m,onSwipeMove:h,onSwipeCancel:g,onSwipeEnd:y,...j}=e,v=hg(kf,n),[b,N]=S.useState(null),E=an(t,U=>N(U)),_=S.useRef(null),T=S.useRef(null),A=a||v.duration,k=S.useRef(0),O=S.useRef(A),M=S.useRef(0),{onToastAdd:D,onToastRemove:z}=v,L=Da(()=>{b?.contains(document.activeElement)&&v.viewport?.focus(),l()}),q=S.useCallback(U=>{!U||U===1/0||(window.clearTimeout(M.current),k.current=new Date().getTime(),M.current=window.setTimeout(L,U))},[L]);S.useEffect(()=>{const U=v.viewport;if(U){const H=()=>{q(O.current),f?.()},I=()=>{const V=new Date().getTime()-k.current;O.current=O.current-V,window.clearTimeout(M.current),d?.()};return U.addEventListener(Y2,I),U.addEventListener(X2,H),()=>{U.removeEventListener(Y2,I),U.removeEventListener(X2,H)}}},[v.viewport,A,d,f,q]),S.useEffect(()=>{s&&!v.isClosePausedRef.current&&q(A)},[s,A,v.isClosePausedRef,q]),S.useEffect(()=>(D(),()=>z()),[D,z]);const B=S.useMemo(()=>b?D9(b):null,[b]);return v.viewport?i.jsxs(i.Fragment,{children:[B&&i.jsx(rY,{__scopeToast:n,role:"status","aria-live":r==="foreground"?"assertive":"polite",children:B}),i.jsx(eY,{scope:n,onClose:L,children:ug.createPortal(i.jsx(AA.ItemSlot,{scope:n,children:i.jsx(PK,{asChild:!0,onEscapeKeyDown:_t(u,()=>{v.isFocusedToastEscapeKeyDownRef.current||L(),v.isFocusedToastEscapeKeyDownRef.current=!1}),children:i.jsx(Rt.li,{tabIndex:0,"data-state":s?"open":"closed","data-swipe-direction":v.swipeDirection,...j,ref:E,style:{userSelect:"none",touchAction:"none",...e.style},onKeyDown:_t(e.onKeyDown,U=>{U.key==="Escape"&&(u?.(U.nativeEvent),U.nativeEvent.defaultPrevented||(v.isFocusedToastEscapeKeyDownRef.current=!0,L()))}),onPointerDown:_t(e.onPointerDown,U=>{U.button===0&&(_.current={x:U.clientX,y:U.clientY})}),onPointerMove:_t(e.onPointerMove,U=>{if(!_.current)return;const H=U.clientX-_.current.x,I=U.clientY-_.current.y,V=!!T.current,F=["left","right"].includes(v.swipeDirection),Z=["left","up"].includes(v.swipeDirection)?Math.min:Math.max,R=F?Z(0,H):0,K=F?0:Z(0,I),Y=U.pointerType==="touch"?10:2,ne={x:R,y:K},ae={originalEvent:U,delta:ne};V?(T.current=ne,gh(QK,h,ae,{discrete:!1})):d5(ne,v.swipeDirection,Y)?(T.current=ne,gh(XK,m,ae,{discrete:!1}),U.target.setPointerCapture(U.pointerId)):(Math.abs(H)>Y||Math.abs(I)>Y)&&(_.current=null)}),onPointerUp:_t(e.onPointerUp,U=>{const H=T.current,I=U.target;if(I.hasPointerCapture(U.pointerId)&&I.releasePointerCapture(U.pointerId),T.current=null,_.current=null,H){const V=U.currentTarget,F={originalEvent:U,delta:H};d5(H,v.swipeDirection,v.swipeThreshold)?gh(JK,y,F,{discrete:!0}):gh(ZK,g,F,{discrete:!0}),V.addEventListener("click",Z=>Z.preventDefault(),{once:!0})}})})})}),v.viewport)})]}):null}),rY=e=>{const{__scopeToast:t,children:n,...r}=e,a=hg(kf,t),[s,l]=S.useState(!1),[u,d]=S.useState(!1);return sY(()=>l(!0)),S.useEffect(()=>{const f=window.setTimeout(()=>d(!0),1e3);return()=>window.clearTimeout(f)},[]),u?null:i.jsx(fg,{asChild:!0,container:a.announcerContainer||void 0,children:i.jsx(pg,{...r,children:s&&i.jsxs(i.Fragment,{children:[a.label," ",n]})})})},aY="ToastTitle",E9=S.forwardRef((e,t)=>{const{__scopeToast:n,...r}=e;return i.jsx(Rt.div,{...r,ref:t})});E9.displayName=aY;var iY="ToastDescription",T9=S.forwardRef((e,t)=>{const{__scopeToast:n,...r}=e;return i.jsx(Rt.div,{...r,ref:t})});T9.displayName=iY;var k9="ToastAction",O9=S.forwardRef((e,t)=>{const{altText:n,...r}=e;return n.trim()?i.jsx(P9,{altText:n,asChild:!0,children:i.jsx(CA,{...r,ref:t})}):(console.error(`Invalid prop \`altText\` supplied to \`${k9}\`. Expected non-empty \`string\`.`),null)});O9.displayName=k9;var M9="ToastClose",CA=S.forwardRef((e,t)=>{const{__scopeToast:n,...r}=e,a=tY(M9,n);return i.jsx(P9,{asChild:!0,children:i.jsx(Rt.button,{type:"button",...r,ref:t,onClick:_t(e.onClick,a.onClose)})})});CA.displayName=M9;var P9=S.forwardRef((e,t)=>{const{__scopeToast:n,altText:r,...a}=e;return i.jsx(Rt.div,{"data-radix-toast-announce-exclude":"","data-radix-toast-announce-alt":r||void 0,...a,ref:t})});function D9(e){const t=[];return Array.from(e.childNodes).forEach(r=>{if(r.nodeType===r.TEXT_NODE&&r.textContent&&t.push(r.textContent),oY(r)){const a=r.ariaHidden||r.hidden||r.style.display==="none",s=r.dataset.radixToastAnnounceExclude==="";if(!a)if(s){const l=r.dataset.radixToastAnnounceAlt;l&&t.push(l)}else t.push(...D9(r))}}),t}function gh(e,t,n,{discrete:r}){const a=n.originalEvent.currentTarget,s=new CustomEvent(e,{bubbles:!0,cancelable:!0,detail:n});t&&a.addEventListener(e,t,{once:!0}),r?v9(a,s):a.dispatchEvent(s)}var d5=(e,t,n=0)=>{const r=Math.abs(e.x),a=Math.abs(e.y),s=r>a;return t==="left"||t==="right"?s&&r>n:!s&&a>n};function sY(e=()=>{}){const t=Da(e);_a(()=>{let n=0,r=0;return n=window.requestAnimationFrame(()=>r=window.requestAnimationFrame(t)),()=>{window.cancelAnimationFrame(n),window.cancelAnimationFrame(r)}},[t])}function oY(e){return e.nodeType===e.ELEMENT_NODE}function lY(e){const t=[],n=document.createTreeWalker(e,NodeFilter.SHOW_ELEMENT,{acceptNode:r=>{const a=r.tagName==="INPUT"&&r.type==="hidden";return r.disabled||r.hidden||a?NodeFilter.FILTER_SKIP:r.tabIndex>=0?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP}});for(;n.nextNode();)t.push(n.currentNode);return t}function Xb(e){const t=document.activeElement;return e.some(n=>n===t?!0:(n.focus(),document.activeElement!==t))}var cY=S9,R9=A9,I9=_9,$9=E9,L9=T9,B9=O9,z9=CA;const uY=(e,t)=>{const n=new Array(e.length+t.length);for(let r=0;r<e.length;r++)n[r]=e[r];for(let r=0;r<t.length;r++)n[e.length+r]=t[r];return n},dY=(e,t)=>({classGroupId:e,validator:t}),q9=(e=new Map,t=null,n)=>({nextPart:e,validators:t,classGroupId:n}),Cm="-",f5=[],fY="arbitrary..",pY=e=>{const t=mY(e),{conflictingClassGroups:n,conflictingClassGroupModifiers:r}=e;return{getClassGroupId:l=>{if(l.startsWith("[")&&l.endsWith("]"))return hY(l);const u=l.split(Cm),d=u[0]===""&&u.length>1?1:0;return F9(u,d,t)},getConflictingClassGroupIds:(l,u)=>{if(u){const d=r[l],f=n[l];return d?f?uY(f,d):d:f||f5}return n[l]||f5}}},F9=(e,t,n)=>{if(e.length-t===0)return n.classGroupId;const a=e[t],s=n.nextPart.get(a);if(s){const f=F9(e,t+1,s);if(f)return f}const l=n.validators;if(l===null)return;const u=t===0?e.join(Cm):e.slice(t).join(Cm),d=l.length;for(let f=0;f<d;f++){const m=l[f];if(m.validator(u))return m.classGroupId}},hY=e=>e.slice(1,-1).indexOf(":")===-1?void 0:(()=>{const t=e.slice(1,-1),n=t.indexOf(":"),r=t.slice(0,n);return r?fY+r:void 0})(),mY=e=>{const{theme:t,classGroups:n}=e;return xY(n,t)},xY=(e,t)=>{const n=q9();for(const r in e){const a=e[r];_A(a,n,r,t)}return n},_A=(e,t,n,r)=>{const a=e.length;for(let s=0;s<a;s++){const l=e[s];gY(l,t,n,r)}},gY=(e,t,n,r)=>{if(typeof e=="string"){yY(e,t,n);return}if(typeof e=="function"){vY(e,t,n,r);return}bY(e,t,n,r)},yY=(e,t,n)=>{const r=e===""?t:U9(t,e);r.classGroupId=n},vY=(e,t,n,r)=>{if(jY(e)){_A(e(r),t,n,r);return}t.validators===null&&(t.validators=[]),t.validators.push(dY(n,e))},bY=(e,t,n,r)=>{const a=Object.entries(e),s=a.length;for(let l=0;l<s;l++){const[u,d]=a[l];_A(d,U9(t,u),n,r)}},U9=(e,t)=>{let n=e;const r=t.split(Cm),a=r.length;for(let s=0;s<a;s++){const l=r[s];let u=n.nextPart.get(l);u||(u=q9(),n.nextPart.set(l,u)),n=u}return n},jY=e=>"isThemeGetter"in e&&e.isThemeGetter===!0,wY=e=>{if(e<1)return{get:()=>{},set:()=>{}};let t=0,n=Object.create(null),r=Object.create(null);const a=(s,l)=>{n[s]=l,t++,t>e&&(t=0,r=n,n=Object.create(null))};return{get(s){let l=n[s];if(l!==void 0)return l;if((l=r[s])!==void 0)return a(s,l),l},set(s,l){s in n?n[s]=l:a(s,l)}}},Z2="!",p5=":",SY=[],h5=(e,t,n,r,a)=>({modifiers:e,hasImportantModifier:t,baseClassName:n,maybePostfixModifierPosition:r,isExternal:a}),NY=e=>{const{prefix:t,experimentalParseClassName:n}=e;let r=a=>{const s=[];let l=0,u=0,d=0,f;const m=a.length;for(let v=0;v<m;v++){const b=a[v];if(l===0&&u===0){if(b===p5){s.push(a.slice(d,v)),d=v+1;continue}if(b==="/"){f=v;continue}}b==="["?l++:b==="]"?l--:b==="("?u++:b===")"&&u--}const h=s.length===0?a:a.slice(d);let g=h,y=!1;h.endsWith(Z2)?(g=h.slice(0,-1),y=!0):h.startsWith(Z2)&&(g=h.slice(1),y=!0);const j=f&&f>d?f-d:void 0;return h5(s,y,g,j)};if(t){const a=t+p5,s=r;r=l=>l.startsWith(a)?s(l.slice(a.length)):h5(SY,!1,l,void 0,!0)}if(n){const a=r;r=s=>n({className:s,parseClassName:a})}return r},AY=e=>{const t=new Map;return e.orderSensitiveModifiers.forEach((n,r)=>{t.set(n,1e6+r)}),n=>{const r=[];let a=[];for(let s=0;s<n.length;s++){const l=n[s],u=l[0]==="[",d=t.has(l);u||d?(a.length>0&&(a.sort(),r.push(...a),a=[]),r.push(l)):a.push(l)}return a.length>0&&(a.sort(),r.push(...a)),r}},CY=e=>({cache:wY(e.cacheSize),parseClassName:NY(e),sortModifiers:AY(e),postfixLookupClassGroupIds:_Y(e),...pY(e)}),_Y=e=>{const t=Object.create(null),n=e.postfixLookupClassGroups;if(n)for(let r=0;r<n.length;r++)t[n[r]]=!0;return t},EY=/\s+/,TY=(e,t)=>{const{parseClassName:n,getClassGroupId:r,getConflictingClassGroupIds:a,sortModifiers:s,postfixLookupClassGroupIds:l}=t,u=[],d=e.trim().split(EY);let f="";for(let m=d.length-1;m>=0;m-=1){const h=d[m],{isExternal:g,modifiers:y,hasImportantModifier:j,baseClassName:v,maybePostfixModifierPosition:b}=n(h);if(g){f=h+(f.length>0?" "+f:f);continue}let N=!!b,E;if(N){const O=v.substring(0,b);E=r(O);const M=E&&l[E]?r(v):void 0;M&&M!==E&&(E=M,N=!1)}else E=r(v);if(!E){if(!N){f=h+(f.length>0?" "+f:f);continue}if(E=r(v),!E){f=h+(f.length>0?" "+f:f);continue}N=!1}const _=y.length===0?"":y.length===1?y[0]:s(y).join(":"),T=j?_+Z2:_,A=T+E;if(u.indexOf(A)>-1)continue;u.push(A);const k=a(E,N);for(let O=0;O<k.length;++O){const M=k[O];u.push(T+M)}f=h+(f.length>0?" "+f:f)}return f},kY=(...e)=>{let t=0,n,r,a="";for(;t<e.length;)(n=e[t++])&&(r=V9(n))&&(a&&(a+=" "),a+=r);return a},V9=e=>{if(typeof e=="string")return e;let t,n="";for(let r=0;r<e.length;r++)e[r]&&(t=V9(e[r]))&&(n&&(n+=" "),n+=t);return n},OY=(e,...t)=>{let n,r,a,s;const l=d=>{const f=t.reduce((m,h)=>h(m),e());return n=CY(f),r=n.cache.get,a=n.cache.set,s=u,u(d)},u=d=>{const f=r(d);if(f)return f;const m=TY(d,n);return a(d,m),m};return s=l,(...d)=>s(kY(...d))},MY=[],Jt=e=>{const t=n=>n[e]||MY;return t.isThemeGetter=!0,t},H9=/^\[(?:(\w[\w-]*):)?(.+)\]$/i,G9=/^\((?:(\w[\w-]*):)?(.+)\)$/i,PY=/^\d+(?:\.\d+)?\/\d+(?:\.\d+)?$/,DY=/^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/,RY=/\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/,IY=/^(rgba?|hsla?|hwb|(ok)?(lab|lch)|color-mix)\(.+\)$/,$Y=/^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/,LY=/^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/,ts=e=>PY.test(e),Ue=e=>!!e&&!Number.isNaN(Number(e)),ga=e=>!!e&&Number.isInteger(Number(e)),Qb=e=>e.endsWith("%")&&Ue(e.slice(0,-1)),ri=e=>DY.test(e),W9=()=>!0,BY=e=>RY.test(e)&&!IY.test(e),EA=()=>!1,zY=e=>$Y.test(e),qY=e=>LY.test(e),FY=e=>!Se(e)&&!Ne(e),UY=e=>e.startsWith("@container")&&(e[10]==="/"&&e[11]!==void 0||e[11]==="s"&&e[16]!==void 0&&e.startsWith("-size/",10)||e[11]==="n"&&e[18]!==void 0&&e.startsWith("-normal/",10)),VY=e=>bs(e,X9,EA),Se=e=>H9.test(e),Xs=e=>bs(e,Q9,BY),m5=e=>bs(e,ZY,Ue),HY=e=>bs(e,J9,W9),GY=e=>bs(e,Z9,EA),x5=e=>bs(e,K9,EA),WY=e=>bs(e,Y9,qY),yh=e=>bs(e,e$,zY),Ne=e=>G9.test(e),td=e=>Oo(e,Q9),KY=e=>Oo(e,Z9),g5=e=>Oo(e,K9),YY=e=>Oo(e,X9),XY=e=>Oo(e,Y9),vh=e=>Oo(e,e$,!0),QY=e=>Oo(e,J9,!0),bs=(e,t,n)=>{const r=H9.exec(e);return r?r[1]?t(r[1]):n(r[2]):!1},Oo=(e,t,n=!1)=>{const r=G9.exec(e);return r?r[1]?t(r[1]):n:!1},K9=e=>e==="position"||e==="percentage",Y9=e=>e==="image"||e==="url",X9=e=>e==="length"||e==="size"||e==="bg-size",Q9=e=>e==="length",ZY=e=>e==="number",Z9=e=>e==="family-name",J9=e=>e==="number"||e==="weight",e$=e=>e==="shadow",JY=()=>{const e=Jt("color"),t=Jt("font"),n=Jt("text"),r=Jt("font-weight"),a=Jt("tracking"),s=Jt("leading"),l=Jt("breakpoint"),u=Jt("container"),d=Jt("spacing"),f=Jt("radius"),m=Jt("shadow"),h=Jt("inset-shadow"),g=Jt("text-shadow"),y=Jt("drop-shadow"),j=Jt("blur"),v=Jt("perspective"),b=Jt("aspect"),N=Jt("ease"),E=Jt("animate"),_=()=>["auto","avoid","all","avoid-page","page","left","right","column"],T=()=>["center","top","bottom","left","right","top-left","left-top","top-right","right-top","bottom-right","right-bottom","bottom-left","left-bottom"],A=()=>[...T(),Ne,Se],k=()=>["auto","hidden","clip","visible","scroll"],O=()=>["auto","contain","none"],M=()=>[Ne,Se,d],D=()=>[ts,"full","auto",...M()],z=()=>[ga,"none","subgrid",Ne,Se],L=()=>["auto",{span:["full",ga,Ne,Se]},ga,Ne,Se],q=()=>[ga,"auto",Ne,Se],B=()=>["auto","min","max","fr",Ne,Se],U=()=>["start","end","center","between","around","evenly","stretch","baseline","center-safe","end-safe"],H=()=>["start","end","center","stretch","center-safe","end-safe"],I=()=>["auto",...M()],V=()=>[ts,"auto","full","dvw","dvh","lvw","lvh","svw","svh","min","max","fit",...M()],F=()=>[ts,"screen","full","dvw","lvw","svw","min","max","fit",...M()],Z=()=>[ts,"screen","full","lh","dvh","lvh","svh","min","max","fit",...M()],R=()=>[e,Ne,Se],K=()=>[...T(),g5,x5,{position:[Ne,Se]}],Y=()=>["no-repeat",{repeat:["","x","y","space","round"]}],ne=()=>["auto","cover","contain",YY,VY,{size:[Ne,Se]}],ae=()=>[Qb,td,Xs],ce=()=>["","none","full",f,Ne,Se],ge=()=>["",Ue,td,Xs],ye=()=>["solid","dashed","dotted","double"],je=()=>["normal","multiply","screen","overlay","darken","lighten","color-dodge","color-burn","hard-light","soft-light","difference","exclusion","hue","saturation","color","luminosity"],fe=()=>[Ue,Qb,g5,x5],Ce=()=>["","none",j,Ne,Se],he=()=>["none",Ue,Ne,Se],le=()=>["none",Ue,Ne,Se],Te=()=>[Ue,Ne,Se],be=()=>[ts,"full",...M()];return{cacheSize:500,theme:{animate:["spin","ping","pulse","bounce"],aspect:["video"],blur:[ri],breakpoint:[ri],color:[W9],container:[ri],"drop-shadow":[ri],ease:["in","out","in-out"],font:[FY],"font-weight":["thin","extralight","light","normal","medium","semibold","bold","extrabold","black"],"inset-shadow":[ri],leading:["none","tight","snug","normal","relaxed","loose"],perspective:["dramatic","near","normal","midrange","distant","none"],radius:[ri],shadow:[ri],spacing:["px",Ue],text:[ri],"text-shadow":[ri],tracking:["tighter","tight","normal","wide","wider","widest"]},classGroups:{aspect:[{aspect:["auto","square",ts,Se,Ne,b]}],container:["container"],"container-type":[{"@container":["","normal","size",Ne,Se]}],"container-named":[UY],columns:[{columns:[Ue,Se,Ne,u]}],"break-after":[{"break-after":_()}],"break-before":[{"break-before":_()}],"break-inside":[{"break-inside":["auto","avoid","avoid-page","avoid-column"]}],"box-decoration":[{"box-decoration":["slice","clone"]}],box:[{box:["border","content"]}],display:["block","inline-block","inline","flex","inline-flex","table","inline-table","table-caption","table-cell","table-column","table-column-group","table-footer-group","table-header-group","table-row-group","table-row","flow-root","grid","inline-grid","contents","list-item","hidden"],sr:["sr-only","not-sr-only"],float:[{float:["right","left","none","start","end"]}],clear:[{clear:["left","right","both","none","start","end"]}],isolation:["isolate","isolation-auto"],"object-fit":[{object:["contain","cover","fill","none","scale-down"]}],"object-position":[{object:A()}],overflow:[{overflow:k()}],"overflow-x":[{"overflow-x":k()}],"overflow-y":[{"overflow-y":k()}],overscroll:[{overscroll:O()}],"overscroll-x":[{"overscroll-x":O()}],"overscroll-y":[{"overscroll-y":O()}],position:["static","fixed","absolute","relative","sticky"],inset:[{inset:D()}],"inset-x":[{"inset-x":D()}],"inset-y":[{"inset-y":D()}],start:[{"inset-s":D(),start:D()}],end:[{"inset-e":D(),end:D()}],"inset-bs":[{"inset-bs":D()}],"inset-be":[{"inset-be":D()}],top:[{top:D()}],right:[{right:D()}],bottom:[{bottom:D()}],left:[{left:D()}],visibility:["visible","invisible","collapse"],z:[{z:[ga,"auto",Ne,Se]}],basis:[{basis:[ts,"full","auto",u,...M()]}],"flex-direction":[{flex:["row","row-reverse","col","col-reverse"]}],"flex-wrap":[{flex:["nowrap","wrap","wrap-reverse"]}],flex:[{flex:[Ue,ts,"auto","initial","none",Se]}],grow:[{grow:["",Ue,Ne,Se]}],shrink:[{shrink:["",Ue,Ne,Se]}],order:[{order:[ga,"first","last","none",Ne,Se]}],"grid-cols":[{"grid-cols":z()}],"col-start-end":[{col:L()}],"col-start":[{"col-start":q()}],"col-end":[{"col-end":q()}],"grid-rows":[{"grid-rows":z()}],"row-start-end":[{row:L()}],"row-start":[{"row-start":q()}],"row-end":[{"row-end":q()}],"grid-flow":[{"grid-flow":["row","col","dense","row-dense","col-dense"]}],"auto-cols":[{"auto-cols":B()}],"auto-rows":[{"auto-rows":B()}],gap:[{gap:M()}],"gap-x":[{"gap-x":M()}],"gap-y":[{"gap-y":M()}],"justify-content":[{justify:[...U(),"normal"]}],"justify-items":[{"justify-items":[...H(),"normal"]}],"justify-self":[{"justify-self":["auto",...H()]}],"align-content":[{content:["normal",...U()]}],"align-items":[{items:[...H(),{baseline:["","last"]}]}],"align-self":[{self:["auto",...H(),{baseline:["","last"]}]}],"place-content":[{"place-content":U()}],"place-items":[{"place-items":[...H(),"baseline"]}],"place-self":[{"place-self":["auto",...H()]}],p:[{p:M()}],px:[{px:M()}],py:[{py:M()}],ps:[{ps:M()}],pe:[{pe:M()}],pbs:[{pbs:M()}],pbe:[{pbe:M()}],pt:[{pt:M()}],pr:[{pr:M()}],pb:[{pb:M()}],pl:[{pl:M()}],m:[{m:I()}],mx:[{mx:I()}],my:[{my:I()}],ms:[{ms:I()}],me:[{me:I()}],mbs:[{mbs:I()}],mbe:[{mbe:I()}],mt:[{mt:I()}],mr:[{mr:I()}],mb:[{mb:I()}],ml:[{ml:I()}],"space-x":[{"space-x":M()}],"space-x-reverse":["space-x-reverse"],"space-y":[{"space-y":M()}],"space-y-reverse":["space-y-reverse"],size:[{size:V()}],"inline-size":[{inline:["auto",...F()]}],"min-inline-size":[{"min-inline":["auto",...F()]}],"max-inline-size":[{"max-inline":["none",...F()]}],"block-size":[{block:["auto",...Z()]}],"min-block-size":[{"min-block":["auto",...Z()]}],"max-block-size":[{"max-block":["none",...Z()]}],w:[{w:[u,"screen",...V()]}],"min-w":[{"min-w":[u,"screen","none",...V()]}],"max-w":[{"max-w":[u,"screen","none","prose",{screen:[l]},...V()]}],h:[{h:["screen","lh",...V()]}],"min-h":[{"min-h":["screen","lh","none",...V()]}],"max-h":[{"max-h":["screen","lh",...V()]}],"font-size":[{text:["base",n,td,Xs]}],"font-smoothing":["antialiased","subpixel-antialiased"],"font-style":["italic","not-italic"],"font-weight":[{font:[r,QY,HY]}],"font-stretch":[{"font-stretch":["ultra-condensed","extra-condensed","condensed","semi-condensed","normal","semi-expanded","expanded","extra-expanded","ultra-expanded",Qb,Se]}],"font-family":[{font:[KY,GY,t]}],"font-features":[{"font-features":[Se]}],"fvn-normal":["normal-nums"],"fvn-ordinal":["ordinal"],"fvn-slashed-zero":["slashed-zero"],"fvn-figure":["lining-nums","oldstyle-nums"],"fvn-spacing":["proportional-nums","tabular-nums"],"fvn-fraction":["diagonal-fractions","stacked-fractions"],tracking:[{tracking:[a,Ne,Se]}],"line-clamp":[{"line-clamp":[Ue,"none",Ne,m5]}],leading:[{leading:[s,...M()]}],"list-image":[{"list-image":["none",Ne,Se]}],"list-style-position":[{list:["inside","outside"]}],"list-style-type":[{list:["disc","decimal","none",Ne,Se]}],"text-alignment":[{text:["left","center","right","justify","start","end"]}],"placeholder-color":[{placeholder:R()}],"text-color":[{text:R()}],"text-decoration":["underline","overline","line-through","no-underline"],"text-decoration-style":[{decoration:[...ye(),"wavy"]}],"text-decoration-thickness":[{decoration:[Ue,"from-font","auto",Ne,Xs]}],"text-decoration-color":[{decoration:R()}],"underline-offset":[{"underline-offset":[Ue,"auto",Ne,Se]}],"text-transform":["uppercase","lowercase","capitalize","normal-case"],"text-overflow":["truncate","text-ellipsis","text-clip"],"text-wrap":[{text:["wrap","nowrap","balance","pretty"]}],indent:[{indent:M()}],"tab-size":[{tab:[ga,Ne,Se]}],"vertical-align":[{align:["baseline","top","middle","bottom","text-top","text-bottom","sub","super",Ne,Se]}],whitespace:[{whitespace:["normal","nowrap","pre","pre-line","pre-wrap","break-spaces"]}],break:[{break:["normal","words","all","keep"]}],wrap:[{wrap:["break-word","anywhere","normal"]}],hyphens:[{hyphens:["none","manual","auto"]}],content:[{content:["none",Ne,Se]}],"bg-attachment":[{bg:["fixed","local","scroll"]}],"bg-clip":[{"bg-clip":["border","padding","content","text"]}],"bg-origin":[{"bg-origin":["border","padding","content"]}],"bg-position":[{bg:K()}],"bg-repeat":[{bg:Y()}],"bg-size":[{bg:ne()}],"bg-image":[{bg:["none",{linear:[{to:["t","tr","r","br","b","bl","l","tl"]},ga,Ne,Se],radial:["",Ne,Se],conic:[ga,Ne,Se]},XY,WY]}],"bg-color":[{bg:R()}],"gradient-from-pos":[{from:ae()}],"gradient-via-pos":[{via:ae()}],"gradient-to-pos":[{to:ae()}],"gradient-from":[{from:R()}],"gradient-via":[{via:R()}],"gradient-to":[{to:R()}],rounded:[{rounded:ce()}],"rounded-s":[{"rounded-s":ce()}],"rounded-e":[{"rounded-e":ce()}],"rounded-t":[{"rounded-t":ce()}],"rounded-r":[{"rounded-r":ce()}],"rounded-b":[{"rounded-b":ce()}],"rounded-l":[{"rounded-l":ce()}],"rounded-ss":[{"rounded-ss":ce()}],"rounded-se":[{"rounded-se":ce()}],"rounded-ee":[{"rounded-ee":ce()}],"rounded-es":[{"rounded-es":ce()}],"rounded-tl":[{"rounded-tl":ce()}],"rounded-tr":[{"rounded-tr":ce()}],"rounded-br":[{"rounded-br":ce()}],"rounded-bl":[{"rounded-bl":ce()}],"border-w":[{border:ge()}],"border-w-x":[{"border-x":ge()}],"border-w-y":[{"border-y":ge()}],"border-w-s":[{"border-s":ge()}],"border-w-e":[{"border-e":ge()}],"border-w-bs":[{"border-bs":ge()}],"border-w-be":[{"border-be":ge()}],"border-w-t":[{"border-t":ge()}],"border-w-r":[{"border-r":ge()}],"border-w-b":[{"border-b":ge()}],"border-w-l":[{"border-l":ge()}],"divide-x":[{"divide-x":ge()}],"divide-x-reverse":["divide-x-reverse"],"divide-y":[{"divide-y":ge()}],"divide-y-reverse":["divide-y-reverse"],"border-style":[{border:[...ye(),"hidden","none"]}],"divide-style":[{divide:[...ye(),"hidden","none"]}],"border-color":[{border:R()}],"border-color-x":[{"border-x":R()}],"border-color-y":[{"border-y":R()}],"border-color-s":[{"border-s":R()}],"border-color-e":[{"border-e":R()}],"border-color-bs":[{"border-bs":R()}],"border-color-be":[{"border-be":R()}],"border-color-t":[{"border-t":R()}],"border-color-r":[{"border-r":R()}],"border-color-b":[{"border-b":R()}],"border-color-l":[{"border-l":R()}],"divide-color":[{divide:R()}],"outline-style":[{outline:[...ye(),"none","hidden"]}],"outline-offset":[{"outline-offset":[Ue,Ne,Se]}],"outline-w":[{outline:["",Ue,td,Xs]}],"outline-color":[{outline:R()}],shadow:[{shadow:["","none",m,vh,yh]}],"shadow-color":[{shadow:R()}],"inset-shadow":[{"inset-shadow":["none",h,vh,yh]}],"inset-shadow-color":[{"inset-shadow":R()}],"ring-w":[{ring:ge()}],"ring-w-inset":["ring-inset"],"ring-color":[{ring:R()}],"ring-offset-w":[{"ring-offset":[Ue,Xs]}],"ring-offset-color":[{"ring-offset":R()}],"inset-ring-w":[{"inset-ring":ge()}],"inset-ring-color":[{"inset-ring":R()}],"text-shadow":[{"text-shadow":["none",g,vh,yh]}],"text-shadow-color":[{"text-shadow":R()}],opacity:[{opacity:[Ue,Ne,Se]}],"mix-blend":[{"mix-blend":[...je(),"plus-darker","plus-lighter"]}],"bg-blend":[{"bg-blend":je()}],"mask-clip":[{"mask-clip":["border","padding","content","fill","stroke","view"]},"mask-no-clip"],"mask-composite":[{mask:["add","subtract","intersect","exclude"]}],"mask-image-linear-pos":[{"mask-linear":[Ue]}],"mask-image-linear-from-pos":[{"mask-linear-from":fe()}],"mask-image-linear-to-pos":[{"mask-linear-to":fe()}],"mask-image-linear-from-color":[{"mask-linear-from":R()}],"mask-image-linear-to-color":[{"mask-linear-to":R()}],"mask-image-t-from-pos":[{"mask-t-from":fe()}],"mask-image-t-to-pos":[{"mask-t-to":fe()}],"mask-image-t-from-color":[{"mask-t-from":R()}],"mask-image-t-to-color":[{"mask-t-to":R()}],"mask-image-r-from-pos":[{"mask-r-from":fe()}],"mask-image-r-to-pos":[{"mask-r-to":fe()}],"mask-image-r-from-color":[{"mask-r-from":R()}],"mask-image-r-to-color":[{"mask-r-to":R()}],"mask-image-b-from-pos":[{"mask-b-from":fe()}],"mask-image-b-to-pos":[{"mask-b-to":fe()}],"mask-image-b-from-color":[{"mask-b-from":R()}],"mask-image-b-to-color":[{"mask-b-to":R()}],"mask-image-l-from-pos":[{"mask-l-from":fe()}],"mask-image-l-to-pos":[{"mask-l-to":fe()}],"mask-image-l-from-color":[{"mask-l-from":R()}],"mask-image-l-to-color":[{"mask-l-to":R()}],"mask-image-x-from-pos":[{"mask-x-from":fe()}],"mask-image-x-to-pos":[{"mask-x-to":fe()}],"mask-image-x-from-color":[{"mask-x-from":R()}],"mask-image-x-to-color":[{"mask-x-to":R()}],"mask-image-y-from-pos":[{"mask-y-from":fe()}],"mask-image-y-to-pos":[{"mask-y-to":fe()}],"mask-image-y-from-color":[{"mask-y-from":R()}],"mask-image-y-to-color":[{"mask-y-to":R()}],"mask-image-radial":[{"mask-radial":[Ne,Se]}],"mask-image-radial-from-pos":[{"mask-radial-from":fe()}],"mask-image-radial-to-pos":[{"mask-radial-to":fe()}],"mask-image-radial-from-color":[{"mask-radial-from":R()}],"mask-image-radial-to-color":[{"mask-radial-to":R()}],"mask-image-radial-shape":[{"mask-radial":["circle","ellipse"]}],"mask-image-radial-size":[{"mask-radial":[{closest:["side","corner"],farthest:["side","corner"]}]}],"mask-image-radial-pos":[{"mask-radial-at":T()}],"mask-image-conic-pos":[{"mask-conic":[Ue]}],"mask-image-conic-from-pos":[{"mask-conic-from":fe()}],"mask-image-conic-to-pos":[{"mask-conic-to":fe()}],"mask-image-conic-from-color":[{"mask-conic-from":R()}],"mask-image-conic-to-color":[{"mask-conic-to":R()}],"mask-mode":[{mask:["alpha","luminance","match"]}],"mask-origin":[{"mask-origin":["border","padding","content","fill","stroke","view"]}],"mask-position":[{mask:K()}],"mask-repeat":[{mask:Y()}],"mask-size":[{mask:ne()}],"mask-type":[{"mask-type":["alpha","luminance"]}],"mask-image":[{mask:["none",Ne,Se]}],filter:[{filter:["","none",Ne,Se]}],blur:[{blur:Ce()}],brightness:[{brightness:[Ue,Ne,Se]}],contrast:[{contrast:[Ue,Ne,Se]}],"drop-shadow":[{"drop-shadow":["","none",y,vh,yh]}],"drop-shadow-color":[{"drop-shadow":R()}],grayscale:[{grayscale:["",Ue,Ne,Se]}],"hue-rotate":[{"hue-rotate":[Ue,Ne,Se]}],invert:[{invert:["",Ue,Ne,Se]}],saturate:[{saturate:[Ue,Ne,Se]}],sepia:[{sepia:["",Ue,Ne,Se]}],"backdrop-filter":[{"backdrop-filter":["","none",Ne,Se]}],"backdrop-blur":[{"backdrop-blur":Ce()}],"backdrop-brightness":[{"backdrop-brightness":[Ue,Ne,Se]}],"backdrop-contrast":[{"backdrop-contrast":[Ue,Ne,Se]}],"backdrop-grayscale":[{"backdrop-grayscale":["",Ue,Ne,Se]}],"backdrop-hue-rotate":[{"backdrop-hue-rotate":[Ue,Ne,Se]}],"backdrop-invert":[{"backdrop-invert":["",Ue,Ne,Se]}],"backdrop-opacity":[{"backdrop-opacity":[Ue,Ne,Se]}],"backdrop-saturate":[{"backdrop-saturate":[Ue,Ne,Se]}],"backdrop-sepia":[{"backdrop-sepia":["",Ue,Ne,Se]}],"border-collapse":[{border:["collapse","separate"]}],"border-spacing":[{"border-spacing":M()}],"border-spacing-x":[{"border-spacing-x":M()}],"border-spacing-y":[{"border-spacing-y":M()}],"table-layout":[{table:["auto","fixed"]}],caption:[{caption:["top","bottom"]}],transition:[{transition:["","all","colors","opacity","shadow","transform","none",Ne,Se]}],"transition-behavior":[{transition:["normal","discrete"]}],duration:[{duration:[Ue,"initial",Ne,Se]}],ease:[{ease:["linear","initial",N,Ne,Se]}],delay:[{delay:[Ue,Ne,Se]}],animate:[{animate:["none",E,Ne,Se]}],backface:[{backface:["hidden","visible"]}],perspective:[{perspective:[v,Ne,Se]}],"perspective-origin":[{"perspective-origin":A()}],rotate:[{rotate:he()}],"rotate-x":[{"rotate-x":he()}],"rotate-y":[{"rotate-y":he()}],"rotate-z":[{"rotate-z":he()}],scale:[{scale:le()}],"scale-x":[{"scale-x":le()}],"scale-y":[{"scale-y":le()}],"scale-z":[{"scale-z":le()}],"scale-3d":["scale-3d"],skew:[{skew:Te()}],"skew-x":[{"skew-x":Te()}],"skew-y":[{"skew-y":Te()}],transform:[{transform:[Ne,Se,"","none","gpu","cpu"]}],"transform-origin":[{origin:A()}],"transform-style":[{transform:["3d","flat"]}],translate:[{translate:be()}],"translate-x":[{"translate-x":be()}],"translate-y":[{"translate-y":be()}],"translate-z":[{"translate-z":be()}],"translate-none":["translate-none"],zoom:[{zoom:[ga,Ne,Se]}],accent:[{accent:R()}],appearance:[{appearance:["none","auto"]}],"caret-color":[{caret:R()}],"color-scheme":[{scheme:["normal","dark","light","light-dark","only-dark","only-light"]}],cursor:[{cursor:["auto","default","pointer","wait","text","move","help","not-allowed","none","context-menu","progress","cell","crosshair","vertical-text","alias","copy","no-drop","grab","grabbing","all-scroll","col-resize","row-resize","n-resize","e-resize","s-resize","w-resize","ne-resize","nw-resize","se-resize","sw-resize","ew-resize","ns-resize","nesw-resize","nwse-resize","zoom-in","zoom-out",Ne,Se]}],"field-sizing":[{"field-sizing":["fixed","content"]}],"pointer-events":[{"pointer-events":["auto","none"]}],resize:[{resize:["none","","y","x"]}],"scroll-behavior":[{scroll:["auto","smooth"]}],"scrollbar-thumb-color":[{"scrollbar-thumb":R()}],"scrollbar-track-color":[{"scrollbar-track":R()}],"scrollbar-gutter":[{"scrollbar-gutter":["auto","stable","both"]}],"scrollbar-w":[{scrollbar:["auto","thin","none"]}],"scroll-m":[{"scroll-m":M()}],"scroll-mx":[{"scroll-mx":M()}],"scroll-my":[{"scroll-my":M()}],"scroll-ms":[{"scroll-ms":M()}],"scroll-me":[{"scroll-me":M()}],"scroll-mbs":[{"scroll-mbs":M()}],"scroll-mbe":[{"scroll-mbe":M()}],"scroll-mt":[{"scroll-mt":M()}],"scroll-mr":[{"scroll-mr":M()}],"scroll-mb":[{"scroll-mb":M()}],"scroll-ml":[{"scroll-ml":M()}],"scroll-p":[{"scroll-p":M()}],"scroll-px":[{"scroll-px":M()}],"scroll-py":[{"scroll-py":M()}],"scroll-ps":[{"scroll-ps":M()}],"scroll-pe":[{"scroll-pe":M()}],"scroll-pbs":[{"scroll-pbs":M()}],"scroll-pbe":[{"scroll-pbe":M()}],"scroll-pt":[{"scroll-pt":M()}],"scroll-pr":[{"scroll-pr":M()}],"scroll-pb":[{"scroll-pb":M()}],"scroll-pl":[{"scroll-pl":M()}],"snap-align":[{snap:["start","end","center","align-none"]}],"snap-stop":[{snap:["normal","always"]}],"snap-type":[{snap:["none","x","y","both"]}],"snap-strictness":[{snap:["mandatory","proximity"]}],touch:[{touch:["auto","none","manipulation"]}],"touch-x":[{"touch-pan":["x","left","right"]}],"touch-y":[{"touch-pan":["y","up","down"]}],"touch-pz":["touch-pinch-zoom"],select:[{select:["none","text","all","auto"]}],"will-change":[{"will-change":["auto","scroll","contents","transform",Ne,Se]}],fill:[{fill:["none",...R()]}],"stroke-w":[{stroke:[Ue,td,Xs,m5]}],stroke:[{stroke:["none",...R()]}],"forced-color-adjust":[{"forced-color-adjust":["auto","none"]}]},conflictingClassGroups:{"container-named":["container-type"],overflow:["overflow-x","overflow-y"],overscroll:["overscroll-x","overscroll-y"],inset:["inset-x","inset-y","inset-bs","inset-be","start","end","top","right","bottom","left"],"inset-x":["right","left"],"inset-y":["top","bottom"],flex:["basis","grow","shrink"],gap:["gap-x","gap-y"],p:["px","py","ps","pe","pbs","pbe","pt","pr","pb","pl"],px:["pr","pl"],py:["pt","pb"],m:["mx","my","ms","me","mbs","mbe","mt","mr","mb","ml"],mx:["mr","ml"],my:["mt","mb"],size:["w","h"],"font-size":["leading"],"fvn-normal":["fvn-ordinal","fvn-slashed-zero","fvn-figure","fvn-spacing","fvn-fraction"],"fvn-ordinal":["fvn-normal"],"fvn-slashed-zero":["fvn-normal"],"fvn-figure":["fvn-normal"],"fvn-spacing":["fvn-normal"],"fvn-fraction":["fvn-normal"],"line-clamp":["display","overflow"],rounded:["rounded-s","rounded-e","rounded-t","rounded-r","rounded-b","rounded-l","rounded-ss","rounded-se","rounded-ee","rounded-es","rounded-tl","rounded-tr","rounded-br","rounded-bl"],"rounded-s":["rounded-ss","rounded-es"],"rounded-e":["rounded-se","rounded-ee"],"rounded-t":["rounded-tl","rounded-tr"],"rounded-r":["rounded-tr","rounded-br"],"rounded-b":["rounded-br","rounded-bl"],"rounded-l":["rounded-tl","rounded-bl"],"border-spacing":["border-spacing-x","border-spacing-y"],"border-w":["border-w-x","border-w-y","border-w-s","border-w-e","border-w-bs","border-w-be","border-w-t","border-w-r","border-w-b","border-w-l"],"border-w-x":["border-w-r","border-w-l"],"border-w-y":["border-w-t","border-w-b"],"border-color":["border-color-x","border-color-y","border-color-s","border-color-e","border-color-bs","border-color-be","border-color-t","border-color-r","border-color-b","border-color-l"],"border-color-x":["border-color-r","border-color-l"],"border-color-y":["border-color-t","border-color-b"],translate:["translate-x","translate-y","translate-none"],"translate-none":["translate","translate-x","translate-y","translate-z"],"scroll-m":["scroll-mx","scroll-my","scroll-ms","scroll-me","scroll-mbs","scroll-mbe","scroll-mt","scroll-mr","scroll-mb","scroll-ml"],"scroll-mx":["scroll-mr","scroll-ml"],"scroll-my":["scroll-mt","scroll-mb"],"scroll-p":["scroll-px","scroll-py","scroll-ps","scroll-pe","scroll-pbs","scroll-pbe","scroll-pt","scroll-pr","scroll-pb","scroll-pl"],"scroll-px":["scroll-pr","scroll-pl"],"scroll-py":["scroll-pt","scroll-pb"],touch:["touch-x","touch-y","touch-pz"],"touch-x":["touch"],"touch-y":["touch"],"touch-pz":["touch"]},conflictingClassGroupModifiers:{"font-size":["leading"]},postfixLookupClassGroups:["container-type"],orderSensitiveModifiers:["*","**","after","backdrop","before","details-content","file","first-letter","first-line","marker","placeholder","selection"]}},eX=OY(JY);function t$(e){var t,n,r="";if(typeof e=="string"||typeof e=="number")r+=e;else if(typeof e=="object")if(Array.isArray(e)){var a=e.length;for(t=0;t<a;t++)e[t]&&(n=t$(e[t]))&&(r&&(r+=" "),r+=n)}else for(n in e)e[n]&&(r&&(r+=" "),r+=n);return r}function Je(){for(var e,t,n=0,r="",a=arguments.length;n<a;n++)(e=arguments[n])&&(t=t$(e))&&(r&&(r+=" "),r+=t);return r}function X(...e){return eX(Je(e))}const y5=e=>typeof e=="boolean"?`${e}`:e===0?"0":e,v5=Je,n$=(e,t)=>n=>{var r;if(t?.variants==null)return v5(e,n?.class,n?.className);const{variants:a,defaultVariants:s}=t,l=Object.keys(a).map(f=>{const m=n?.[f],h=s?.[f];if(m===null)return null;const g=y5(m)||y5(h);return a[f][g]}),u=n&&Object.entries(n).reduce((f,m)=>{let[h,g]=m;return g===void 0||(f[h]=g),f},{}),d=t==null||(r=t.compoundVariants)===null||r===void 0?void 0:r.reduce((f,m)=>{let{class:h,className:g,...y}=m;return Object.entries(y).every(j=>{let[v,b]=j;return Array.isArray(b)?b.includes({...s,...u}[v]):{...s,...u}[v]===b})?[...f,h,g]:f},[]);return v5(e,l,d,n?.class,n?.className)};const tX=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),nX=e=>e.replace(/^([A-Z])|[\s-_]+(\w)/g,(t,n,r)=>r?r.toUpperCase():n.toLowerCase()),b5=e=>{const t=nX(e);return t.charAt(0).toUpperCase()+t.slice(1)},r$=(...e)=>e.filter((t,n,r)=>!!t&&t.trim()!==""&&r.indexOf(t)===n).join(" ").trim(),rX=e=>{for(const t in e)if(t.startsWith("aria-")||t==="role"||t==="title")return!0};var aX={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};const iX=S.forwardRef(({color:e="currentColor",size:t=24,strokeWidth:n=2,absoluteStrokeWidth:r,className:a="",children:s,iconNode:l,...u},d)=>S.createElement("svg",{ref:d,...aX,width:t,height:t,stroke:e,strokeWidth:r?Number(n)*24/Number(t):n,className:r$("lucide",a),...!s&&!rX(u)&&{"aria-hidden":"true"},...u},[...l.map(([f,m])=>S.createElement(f,m)),...Array.isArray(s)?s:[s]]));const xe=(e,t)=>{const n=S.forwardRef(({className:r,...a},s)=>S.createElement(iX,{ref:s,iconNode:t,className:r$(`lucide-${tX(b5(e))}`,`lucide-${e}`,r),...a}));return n.displayName=b5(e),n};const sX=[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h2",key:"tvwodi"}],["path",{d:"M20 8v11a2 2 0 0 1-2 2h-2",key:"1gkqxj"}],["path",{d:"m9 15 3-3 3 3",key:"1pd0qc"}],["path",{d:"M12 12v9",key:"192myk"}]],oX=xe("archive-restore",sX);const lX=[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",key:"1s80jp"}],["path",{d:"M10 12h4",key:"a56b0p"}]],mg=xe("archive",lX);const cX=[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]],js=xe("arrow-left",cX);const uX=[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]],xg=xe("arrow-right",uX);const dX=[["path",{d:"m21 16-4 4-4-4",key:"f6ql7i"}],["path",{d:"M17 20V4",key:"1ejh1v"}],["path",{d:"m3 8 4-4 4 4",key:"11wl7u"}],["path",{d:"M7 4v16",key:"1glfcx"}]],fX=xe("arrow-up-down",dX);const pX=[["rect",{width:"20",height:"12",x:"2",y:"6",rx:"2",key:"9lu3g6"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}],["path",{d:"M6 12h.01M18 12h.01",key:"113zkx"}]],a$=xe("banknote",pX);const hX=[["path",{d:"M10.268 21a2 2 0 0 0 3.464 0",key:"vwvbt9"}],["path",{d:"M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326",key:"11g9vi"}]],i$=xe("bell",hX);const mX=[["path",{d:"M12 18V5",key:"adv99a"}],["path",{d:"M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4",key:"1e3is1"}],["path",{d:"M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5",key:"1gqd8o"}],["path",{d:"M17.997 5.125a4 4 0 0 1 2.526 5.77",key:"iwvgf7"}],["path",{d:"M18 18a4 4 0 0 0 2-7.464",key:"efp6ie"}],["path",{d:"M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517",key:"1gq6am"}],["path",{d:"M6 18a4 4 0 0 1-2-7.464",key:"k1g0md"}],["path",{d:"M6.003 5.125a4 4 0 0 0-2.526 5.77",key:"q97ue3"}]],Pr=xe("brain",mX);const xX=[["path",{d:"M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16",key:"jecpp"}],["rect",{width:"20",height:"14",x:"2",y:"6",rx:"2",key:"i6l2r4"}]],gX=xe("briefcase",xX);const yX=[["path",{d:"M12 20v-9",key:"1qisl0"}],["path",{d:"M14 7a4 4 0 0 1 4 4v3a6 6 0 0 1-12 0v-3a4 4 0 0 1 4-4z",key:"uouzyp"}],["path",{d:"M14.12 3.88 16 2",key:"qol33r"}],["path",{d:"M21 21a4 4 0 0 0-3.81-4",key:"1b0z45"}],["path",{d:"M21 5a4 4 0 0 1-3.55 3.97",key:"5cxbf6"}],["path",{d:"M22 13h-4",key:"1jl80f"}],["path",{d:"M3 21a4 4 0 0 1 3.81-4",key:"1fjd4g"}],["path",{d:"M3 5a4 4 0 0 0 3.55 3.97",key:"1d7oge"}],["path",{d:"M6 13H2",key:"82j7cp"}],["path",{d:"m8 2 1.88 1.88",key:"fmnt4t"}],["path",{d:"M9 7.13V6a3 3 0 1 1 6 0v1.13",key:"1vgav8"}]],vX=xe("bug",yX);const bX=[["path",{d:"M10 12h4",key:"a56b0p"}],["path",{d:"M10 8h4",key:"1sr2af"}],["path",{d:"M14 21v-3a2 2 0 0 0-4 0v3",key:"1rgiei"}],["path",{d:"M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2",key:"secmi2"}],["path",{d:"M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16",key:"16ra0t"}]],J2=xe("building-2",bX);const jX=[["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2",key:"1nb95v"}],["line",{x1:"8",x2:"16",y1:"6",y2:"6",key:"x4nwl0"}],["line",{x1:"16",x2:"16",y1:"14",y2:"18",key:"wjye3r"}],["path",{d:"M16 10h.01",key:"1m94wz"}],["path",{d:"M12 10h.01",key:"1nrarc"}],["path",{d:"M8 10h.01",key:"19clt8"}],["path",{d:"M12 14h.01",key:"1etili"}],["path",{d:"M8 14h.01",key:"6423bh"}],["path",{d:"M12 18h.01",key:"mhygvu"}],["path",{d:"M8 18h.01",key:"lrp35t"}]],wX=xe("calculator",jX);const SX=[["path",{d:"M16 14v2.2l1.6 1",key:"fo4ql5"}],["path",{d:"M16 2v4",key:"4m81vk"}],["path",{d:"M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5",key:"1osxxc"}],["path",{d:"M3 10h5",key:"r794hk"}],["path",{d:"M8 2v4",key:"1cmpym"}],["circle",{cx:"16",cy:"16",r:"6",key:"qoo3c4"}]],s$=xe("calendar-clock",SX);const NX=[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"M8 14h.01",key:"6423bh"}],["path",{d:"M12 14h.01",key:"1etili"}],["path",{d:"M16 14h.01",key:"1gbofw"}],["path",{d:"M8 18h.01",key:"lrp35t"}],["path",{d:"M12 18h.01",key:"mhygvu"}],["path",{d:"M16 18h.01",key:"kzsmim"}]],o$=xe("calendar-days",NX);const AX=[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]],_m=xe("calendar",AX);const CX=[["path",{d:"M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z",key:"18u6gg"}],["circle",{cx:"12",cy:"13",r:"3",key:"1vg3eu"}]],sa=xe("camera",CX);const _X=[["path",{d:"M5 21v-6",key:"1hz6c0"}],["path",{d:"M12 21V3",key:"1lcnhd"}],["path",{d:"M19 21V9",key:"unv183"}]],Ic=xe("chart-no-axes-column",_X);const EX=[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]],Pn=xe("check",EX);const TX=[["path",{d:"M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z",key:"1qvrer"}],["path",{d:"M6 17h12",key:"1jwigz"}]],kX=xe("chef-hat",TX);const OX=[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]],gg=xe("chevron-down",OX);const MX=[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]],Nn=xe("chevron-left",MX);const PX=[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]],Br=xe("chevron-right",PX);const DX=[["path",{d:"m18 15-6-6-6 6",key:"153udz"}]],RX=xe("chevron-up",DX);const IX=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]],Fn=xe("circle-alert",IX);const $X=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]],TA=xe("circle-check",$X);const LX=[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1",key:"tgr4d6"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",key:"116196"}],["path",{d:"m9 14 2 2 4-4",key:"df797q"}]],BX=xe("clipboard-check",LX);const zX=[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1",key:"tgr4d6"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",key:"116196"}],["path",{d:"M12 11h4",key:"1jrz19"}],["path",{d:"M12 16h4",key:"n85exb"}],["path",{d:"M8 11h.01",key:"1dfujw"}],["path",{d:"M8 16h.01",key:"18s6g9"}]],qX=xe("clipboard-list",zX);const FX=[["path",{d:"M11 14h10",key:"1w8e9d"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v1.344",key:"1e62lh"}],["path",{d:"m17 18 4-4-4-4",key:"z2g111"}],["path",{d:"M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 1.793-1.113",key:"bjbb7m"}],["rect",{x:"8",y:"2",width:"8",height:"4",rx:"1",key:"ublpy"}]],l$=xe("clipboard-paste",FX);const UX=[["path",{d:"M12 6v6l4 2",key:"mmk7yg"}],["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}]],La=xe("clock",UX);const VX=[["path",{d:"m17 15-5.5 5.5L9 18",key:"15q87x"}],["path",{d:"M5 17.743A7 7 0 1 1 15.71 10h1.79a4.5 4.5 0 0 1 1.5 8.742",key:"9ho6ki"}]],HX=xe("cloud-check",VX);const GX=[["path",{d:"m2 2 20 20",key:"1ooewy"}],["path",{d:"M5.782 5.782A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.307-.193",key:"yfwify"}],["path",{d:"M21.532 16.5A4.5 4.5 0 0 0 17.5 10h-1.79A7.008 7.008 0 0 0 10 5.07",key:"jlfiyv"}]],WX=xe("cloud-off",GX);const KX=[["path",{d:"M12 13v8",key:"1l5pq0"}],["path",{d:"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242",key:"1pljnt"}],["path",{d:"m8 17 4-4 4 4",key:"1quai1"}]],YX=xe("cloud-upload",KX);const XX=[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]],QX=xe("copy",XX);const ZX=[["line",{x1:"12",x2:"12",y1:"2",y2:"22",key:"7eqyqh"}],["path",{d:"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",key:"1b0p4s"}]],$c=xe("dollar-sign",ZX);const JX=[["circle",{cx:"12",cy:"12",r:"1",key:"41hilf"}],["circle",{cx:"19",cy:"12",r:"1",key:"1wjl8i"}],["circle",{cx:"5",cy:"12",r:"1",key:"1pcz8c"}]],eQ=xe("ellipsis",JX);const tQ=[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]],eS=xe("eye-off",tQ);const nQ=[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]],Em=xe("eye",nQ);const rQ=[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]],aQ=xe("file-text",rQ);const iQ=[["path",{d:"M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528",key:"1jaruq"}]],c$=xe("flag",iQ);const sQ=[["path",{d:"m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2",key:"usdka0"}]],kA=xe("folder-open",sQ);const oQ=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",key:"13o1zl"}],["path",{d:"M2 12h20",key:"9i4pu4"}]],lQ=xe("globe",oQ);const cQ=[["line",{x1:"4",x2:"20",y1:"9",y2:"9",key:"4lhtct"}],["line",{x1:"4",x2:"20",y1:"15",y2:"15",key:"vyu0kd"}],["line",{x1:"10",x2:"8",y1:"3",y2:"21",key:"1ggp8o"}],["line",{x1:"16",x2:"14",y1:"3",y2:"21",key:"weycgp"}]],uQ=xe("hash",cQ);const dQ=[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}],["path",{d:"M12 7v5l4 2",key:"1fdv2h"}]],u$=xe("history",dQ);const fQ=[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",key:"5wwlr5"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",key:"r6nss1"}]],pQ=xe("house",fQ);const hQ=[["polyline",{points:"22 12 16 12 14 15 10 15 8 12 2 12",key:"o97t9d"}],["path",{d:"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",key:"oot6mr"}]],mQ=xe("inbox",hQ);const xQ=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 16v-4",key:"1dtifu"}],["path",{d:"M12 8h.01",key:"e9boi3"}]],Of=xe("info",xQ);const gQ=[["path",{d:"M10 8h.01",key:"1r9ogq"}],["path",{d:"M12 12h.01",key:"1mp3jc"}],["path",{d:"M14 8h.01",key:"1primd"}],["path",{d:"M16 12h.01",key:"1l6xoz"}],["path",{d:"M18 8h.01",key:"emo2bl"}],["path",{d:"M6 8h.01",key:"x9i8wu"}],["path",{d:"M7 16h10",key:"wp8him"}],["path",{d:"M8 12h.01",key:"czm47f"}],["rect",{width:"20",height:"16",x:"2",y:"4",rx:"2",key:"18n3k1"}]],yQ=xe("keyboard",gQ);const vQ=[["path",{d:"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",key:"zw3jo"}],["path",{d:"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",key:"1wduqc"}],["path",{d:"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",key:"kqbvx6"}]],bQ=xe("layers",vQ);const jQ=[["rect",{width:"7",height:"7",x:"3",y:"3",rx:"1",key:"1g98yp"}],["rect",{width:"7",height:"7",x:"14",y:"3",rx:"1",key:"6d4xhi"}],["rect",{width:"7",height:"7",x:"14",y:"14",rx:"1",key:"nxv5o0"}],["rect",{width:"7",height:"7",x:"3",y:"14",rx:"1",key:"1bb6yr"}]],tS=xe("layout-grid",jQ);const wQ=[["rect",{width:"7",height:"7",x:"3",y:"3",rx:"1",key:"1g98yp"}],["rect",{width:"7",height:"7",x:"3",y:"14",rx:"1",key:"1bb6yr"}],["path",{d:"M14 4h7",key:"3xa0d5"}],["path",{d:"M14 9h7",key:"1icrd9"}],["path",{d:"M14 15h7",key:"1mj8o2"}],["path",{d:"M14 20h7",key:"11slyb"}]],SQ=xe("layout-list",wQ);const NQ=[["path",{d:"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5",key:"1gvzjb"}],["path",{d:"M9 18h6",key:"x1upvd"}],["path",{d:"M10 22h4",key:"ceow96"}]],nS=xe("lightbulb",NQ);const AQ=[["path",{d:"M9 17H7A5 5 0 0 1 7 7h2",key:"8i5ue5"}],["path",{d:"M15 7h2a5 5 0 1 1 0 10h-2",key:"1b9ql8"}],["line",{x1:"8",x2:"16",y1:"12",y2:"12",key:"1jonct"}]],CQ=xe("link-2",AQ);const _Q=[["path",{d:"M13 5h8",key:"a7qcls"}],["path",{d:"M13 12h8",key:"h98zly"}],["path",{d:"M13 19h8",key:"c3s6r1"}],["path",{d:"m3 17 2 2 4-4",key:"1jhpwq"}],["path",{d:"m3 7 2 2 4-4",key:"1obspn"}]],d$=xe("list-checks",_Q);const EQ=[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]],Mo=xe("loader-circle",EQ);const TQ=[["path",{d:"m16 17 5-5-5-5",key:"1bji2h"}],["path",{d:"M21 12H9",key:"dn1m92"}],["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}]],kQ=xe("log-out",TQ);const OQ=[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]],Tm=xe("lock",OQ);const MQ=[["path",{d:"m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7",key:"132q7q"}],["rect",{x:"2",y:"4",width:"20",height:"16",rx:"2",key:"izxlao"}]],OA=xe("mail",MQ);const PQ=[["path",{d:"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",key:"1r0f0z"}],["circle",{cx:"12",cy:"10",r:"3",key:"ilqhr7"}]],DQ=xe("map-pin",PQ);const RQ=[["path",{d:"M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719",key:"1sd12s"}]],f$=xe("message-circle",RQ);const IQ=[["path",{d:"M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",key:"18887p"}],["path",{d:"M7 11h10",key:"1twpyw"}],["path",{d:"M7 15h6",key:"d9of3u"}],["path",{d:"M7 7h8",key:"af5zfr"}]],$Q=xe("message-square-text",IQ);const LQ=[["path",{d:"M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",key:"18887p"}]],Lc=xe("message-square",LQ);const BQ=[["path",{d:"M12 19v3",key:"npa21l"}],["path",{d:"M15 9.34V5a3 3 0 0 0-5.68-1.33",key:"1gzdoj"}],["path",{d:"M16.95 16.95A7 7 0 0 1 5 12v-2",key:"cqa7eg"}],["path",{d:"M18.89 13.23A7 7 0 0 0 19 12v-2",key:"16hl24"}],["path",{d:"m2 2 20 20",key:"1ooewy"}],["path",{d:"M9 9v3a3 3 0 0 0 5.12 2.12",key:"r2i35w"}]],p$=xe("mic-off",BQ);const zQ=[["path",{d:"M12 19v3",key:"npa21l"}],["path",{d:"M19 10v2a7 7 0 0 1-14 0v-2",key:"1vc78b"}],["rect",{x:"9",y:"2",width:"6",height:"13",rx:"3",key:"s6n7sd"}]],yg=xe("mic",zQ);const qQ=[["path",{d:"M5 12h14",key:"1ays0h"}]],MA=xe("minus",qQ);const FQ=[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",key:"1a0edw"}],["path",{d:"M12 22V12",key:"d0xqtd"}],["polyline",{points:"3.29 7 12 12 20.71 7",key:"ousv84"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}]],PA=xe("package",FQ);const UQ=[["path",{d:"M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z",key:"e79jfc"}],["circle",{cx:"13.5",cy:"6.5",r:".5",fill:"currentColor",key:"1okk4w"}],["circle",{cx:"17.5",cy:"10.5",r:".5",fill:"currentColor",key:"f64h9f"}],["circle",{cx:"6.5",cy:"12.5",r:".5",fill:"currentColor",key:"qy21gx"}],["circle",{cx:"8.5",cy:"7.5",r:".5",fill:"currentColor",key:"fotxhn"}]],VQ=xe("palette",UQ);const HQ=[["path",{d:"m16 6-8.414 8.586a2 2 0 0 0 2.829 2.829l8.414-8.586a4 4 0 1 0-5.657-5.657l-8.379 8.551a6 6 0 1 0 8.485 8.485l8.379-8.551",key:"1miecu"}]],vg=xe("paperclip",HQ);const GQ=[["path",{d:"M13 21h8",key:"1jsn5i"}],["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}]],DA=xe("pen-line",GQ);const WQ=[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}],["path",{d:"m15 5 4 4",key:"1mk7zo"}]],rS=xe("pencil",WQ);const KQ=[["path",{d:"M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384",key:"9njp5v"}]],YQ=xe("phone",KQ);const XQ=[["path",{d:"M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z",key:"10ikf1"}]],QQ=xe("play",XQ);const ZQ=[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]],Vt=xe("plus",ZQ);const JQ=[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z",key:"q3az6g"}],["path",{d:"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8",key:"1h4pet"}],["path",{d:"M12 17.5v-11",key:"1jc1ny"}]],eZ=xe("receipt",JQ);const tZ=[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]],$r=xe("refresh-cw",tZ);const nZ=[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]],rZ=xe("rotate-ccw",nZ);const aZ=[["path",{d:"m21 21-4.34-4.34",key:"14j7rj"}],["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}]],xi=xe("search",aZ);const iZ=[["path",{d:"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",key:"1ffxy3"}],["path",{d:"m21.854 2.147-10.94 10.939",key:"12cjpa"}]],hs=xe("send",iZ);const sZ=[["path",{d:"M14 17H5",key:"gfn3mx"}],["path",{d:"M19 7h-9",key:"6i9tg"}],["circle",{cx:"17",cy:"17",r:"3",key:"18b49y"}],["circle",{cx:"7",cy:"7",r:"3",key:"dfmy0x"}]],h$=xe("settings-2",sZ);const oZ=[["path",{d:"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",key:"1i5ecw"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]],m$=xe("settings",oZ);const lZ=[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"M12 8v4",key:"1got3b"}],["path",{d:"M12 16h.01",key:"1drbdi"}]],cZ=xe("shield-alert",lZ);const uZ=[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]],x$=xe("shield-check",uZ);const dZ=[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}]],$d=xe("shield",dZ);const fZ=[["path",{d:"M21 4v16",key:"7j8fe9"}],["path",{d:"M6.029 4.285A2 2 0 0 0 3 6v12a2 2 0 0 0 3.029 1.715l9.997-5.998a2 2 0 0 0 .003-3.432z",key:"zs4d6"}]],g$=xe("skip-forward",fZ);const pZ=[["rect",{width:"14",height:"20",x:"5",y:"2",rx:"2",ry:"2",key:"1yt0o3"}],["path",{d:"M12 18h.01",key:"mhygvu"}]],hZ=xe("smartphone",pZ);const mZ=[["path",{d:"M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3",key:"1dgpiv"}],["path",{d:"M2 16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v1.5a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5V11a2 2 0 0 0-4 0z",key:"xacw8m"}],["path",{d:"M4 18v2",key:"jwo5n2"}],["path",{d:"M20 18v2",key:"1ar1qi"}],["path",{d:"M12 4v9",key:"oqhhn3"}]],xZ=xe("sofa",mZ);const gZ=[["path",{d:"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",key:"1s2grr"}],["path",{d:"M20 2v4",key:"1rf3ol"}],["path",{d:"M22 4h-4",key:"gwowj6"}],["circle",{cx:"4",cy:"20",r:"2",key:"6kqj1y"}]],bg=xe("sparkles",gZ);const yZ=[["path",{d:"M21 10.656V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.344",key:"2acyp4"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]],km=xe("square-check-big",yZ);const vZ=[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}]],bZ=xe("square",vZ);const jZ=[["path",{d:"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",key:"r04s7s"}]],Mf=xe("star",jZ);const wZ=[["path",{d:"M11 2v2",key:"1539x4"}],["path",{d:"M5 2v2",key:"1yf1q8"}],["path",{d:"M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1",key:"rb5t3r"}],["path",{d:"M8 15a6 6 0 0 0 12 0v-3",key:"x18d4x"}],["circle",{cx:"20",cy:"10",r:"2",key:"ts1r5v"}]],yo=xe("stethoscope",wZ);const SZ=[["path",{d:"M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z",key:"qazsjp"}],["path",{d:"M15 3v4a2 2 0 0 0 2 2h4",key:"40519r"}]],NZ=xe("sticky-note",SZ);const AZ=[["path",{d:"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",key:"vktsd0"}],["circle",{cx:"7.5",cy:"7.5",r:".5",fill:"currentColor",key:"kqv944"}]],y$=xe("tag",AZ);const CZ=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["circle",{cx:"12",cy:"12",r:"6",key:"1vlfrh"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}]],_Z=xe("target",CZ);const EZ=[["path",{d:"M17 14V2",key:"8ymqnk"}],["path",{d:"M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z",key:"m61m77"}]],TZ=xe("thumbs-down",EZ);const kZ=[["path",{d:"M7 10v12",key:"1qc93n"}],["path",{d:"M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z",key:"emmmcr"}]],OZ=xe("thumbs-up",kZ);const MZ=[["path",{d:"M10 11v6",key:"nco0om"}],["path",{d:"M14 11v6",key:"outv1u"}],["path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",key:"miytrc"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",key:"e791ji"}]],Ra=xe("trash-2",MZ);const PZ=[["path",{d:"M16 17h6v-6",key:"t6n2it"}],["path",{d:"m22 17-8.5-8.5-5 5L2 7",key:"x473p"}]],Bc=xe("trending-down",PZ);const DZ=[["path",{d:"M16 7h6v6",key:"box55l"}],["path",{d:"m22 7-8.5 8.5-5-5L2 17",key:"1t1m79"}]],Po=xe("trending-up",DZ);const RZ=[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]],Qn=xe("triangle-alert",RZ);const IZ=[["path",{d:"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2",key:"wrbu53"}],["path",{d:"M15 18H9",key:"1lyqi6"}],["path",{d:"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14",key:"lysw3i"}],["circle",{cx:"17",cy:"18",r:"2",key:"332jqn"}],["circle",{cx:"7",cy:"18",r:"2",key:"19iecd"}]],Pf=xe("truck",IZ);const $Z=[["path",{d:"m18.84 12.25 1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71",key:"yqzxt4"}],["path",{d:"m5.17 11.75-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71",key:"4qinb0"}],["line",{x1:"8",x2:"8",y1:"2",y2:"5",key:"1041cp"}],["line",{x1:"2",x2:"5",y1:"8",y2:"8",key:"14m1p5"}],["line",{x1:"16",x2:"16",y1:"19",y2:"22",key:"rzdirn"}],["line",{x1:"19",x2:"22",y1:"16",y2:"16",key:"ox905f"}]],LZ=xe("unlink",$Z);const BZ=[["path",{d:"M12 3v12",key:"1x0j5s"}],["path",{d:"m17 8-5-5-5 5",key:"7q97r8"}],["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}]],v$=xe("upload",BZ);const zZ=[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["path",{d:"M16 3.128a4 4 0 0 1 0 7.744",key:"16gr8j"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]],zr=xe("users",zZ);const qZ=[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]],zc=xe("user",qZ);const FZ=[["path",{d:"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",key:"18etb6"}],["path",{d:"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",key:"xoc0q4"}]],RA=xe("wallet",FZ);const UZ=[["path",{d:"M8 22h8",key:"rmew8v"}],["path",{d:"M7 10h10",key:"1101jm"}],["path",{d:"M12 15v7",key:"t2xh3l"}],["path",{d:"M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z",key:"10ffi3"}]],VZ=xe("wine",UZ);const HZ=[["path",{d:"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z",key:"1ngwbx"}]],Dn=xe("wrench",HZ);const GZ=[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]],vt=xe("x",GZ);const WZ=[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]],jg=xe("zap",WZ),KZ=cY,b$=S.forwardRef(({className:e,...t},n)=>i.jsx(R9,{ref:n,className:X("fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",e),...t}));b$.displayName=R9.displayName;const YZ=n$("group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",{variants:{variant:{default:"border bg-background text-foreground",destructive:"destructive group border-destructive bg-destructive text-destructive-foreground"}},defaultVariants:{variant:"default"}}),j$=S.forwardRef(({className:e,variant:t,...n},r)=>i.jsx(I9,{ref:r,className:X(YZ({variant:t}),e),...n}));j$.displayName=I9.displayName;const XZ=S.forwardRef(({className:e,...t},n)=>i.jsx(B9,{ref:n,className:X("inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",e),...t}));XZ.displayName=B9.displayName;const w$=S.forwardRef(({className:e,...t},n)=>i.jsx(z9,{ref:n,className:X("absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",e),"toast-close":"",...t,children:i.jsx(vt,{className:"h-4 w-4"})}));w$.displayName=z9.displayName;const S$=S.forwardRef(({className:e,...t},n)=>i.jsx($9,{ref:n,className:X("text-sm font-semibold",e),...t}));S$.displayName=$9.displayName;const N$=S.forwardRef(({className:e,...t},n)=>i.jsx(L9,{ref:n,className:X("text-sm opacity-90",e),...t}));N$.displayName=L9.displayName;const QZ=1,ZZ=1e6;let Zb=0;function JZ(){return Zb=(Zb+1)%Number.MAX_SAFE_INTEGER,Zb.toString()}const Jb=new Map,j5=e=>{if(Jb.has(e))return;const t=setTimeout(()=>{Jb.delete(e),wd({type:"REMOVE_TOAST",toastId:e})},ZZ);Jb.set(e,t)},eJ=(e,t)=>{switch(t.type){case"ADD_TOAST":return{...e,toasts:[t.toast,...e.toasts].slice(0,QZ)};case"UPDATE_TOAST":return{...e,toasts:e.toasts.map(n=>n.id===t.toast.id?{...n,...t.toast}:n)};case"DISMISS_TOAST":{const{toastId:n}=t;return n?j5(n):e.toasts.forEach(r=>{j5(r.id)}),{...e,toasts:e.toasts.map(r=>r.id===n||n===void 0?{...r,open:!1}:r)}}case"REMOVE_TOAST":return t.toastId===void 0?{...e,toasts:[]}:{...e,toasts:e.toasts.filter(n=>n.id!==t.toastId)}}},cm=[];let um={toasts:[]};function wd(e){um=eJ(um,e),cm.forEach(t=>{t(um)})}function tJ({...e}){const t=JZ(),n=a=>wd({type:"UPDATE_TOAST",toast:{...a,id:t}}),r=()=>wd({type:"DISMISS_TOAST",toastId:t});return wd({type:"ADD_TOAST",toast:{...e,id:t,open:!0,onOpenChange:a=>{a||r()}}}),{id:t,dismiss:r,update:n}}function nJ(){const[e,t]=S.useState(um);return S.useEffect(()=>(cm.push(t),()=>{const n=cm.indexOf(t);n>-1&&cm.splice(n,1)}),[e]),{...e,toast:tJ,dismiss:n=>wd({type:"DISMISS_TOAST",toastId:n})}}function rJ(){const{toasts:e}=nJ();return i.jsxs(KZ,{children:[e.map(function({id:t,title:n,description:r,action:a,...s}){return i.jsxs(j$,{...s,children:[i.jsxs("div",{className:"grid gap-1",children:[n&&i.jsx(S$,{children:n}),r&&i.jsx(N$,{children:r})]}),a,i.jsx(w$,{})]},t)}),i.jsx(b$,{})]})}var aJ=cg[" useId ".trim().toString()]||(()=>{}),iJ=0;function e0(e){const[t,n]=S.useState(aJ());return _a(()=>{n(r=>r??String(iJ++))},[e]),e||(t?`radix-${t}`:"")}const sJ=["top","right","bottom","left"],ms=Math.min,dr=Math.max,Om=Math.round,bh=Math.floor,Ea=e=>({x:e,y:e}),oJ={left:"right",right:"left",bottom:"top",top:"bottom"};function aS(e,t,n){return dr(e,ms(t,n))}function gi(e,t){return typeof e=="function"?e(t):e}function yi(e){return e.split("-")[0]}function qc(e){return e.split("-")[1]}function IA(e){return e==="x"?"y":"x"}function $A(e){return e==="y"?"height":"width"}function Aa(e){const t=e[0];return t==="t"||t==="b"?"y":"x"}function LA(e){return IA(Aa(e))}function lJ(e,t,n){n===void 0&&(n=!1);const r=qc(e),a=LA(e),s=$A(a);let l=a==="x"?r===(n?"end":"start")?"right":"left":r==="start"?"bottom":"top";return t.reference[s]>t.floating[s]&&(l=Mm(l)),[l,Mm(l)]}function cJ(e){const t=Mm(e);return[iS(e),t,iS(t)]}function iS(e){return e.includes("start")?e.replace("start","end"):e.replace("end","start")}const w5=["left","right"],S5=["right","left"],uJ=["top","bottom"],dJ=["bottom","top"];function fJ(e,t,n){switch(e){case"top":case"bottom":return n?t?S5:w5:t?w5:S5;case"left":case"right":return t?uJ:dJ;default:return[]}}function pJ(e,t,n,r){const a=qc(e);let s=fJ(yi(e),n==="start",r);return a&&(s=s.map(l=>l+"-"+a),t&&(s=s.concat(s.map(iS)))),s}function Mm(e){const t=yi(e);return oJ[t]+e.slice(t.length)}function hJ(e){return{top:0,right:0,bottom:0,left:0,...e}}function A$(e){return typeof e!="number"?hJ(e):{top:e,right:e,bottom:e,left:e}}function Pm(e){const{x:t,y:n,width:r,height:a}=e;return{width:r,height:a,top:n,left:t,right:t+r,bottom:n+a,x:t,y:n}}function N5(e,t,n){let{reference:r,floating:a}=e;const s=Aa(t),l=LA(t),u=$A(l),d=yi(t),f=s==="y",m=r.x+r.width/2-a.width/2,h=r.y+r.height/2-a.height/2,g=r[u]/2-a[u]/2;let y;switch(d){case"top":y={x:m,y:r.y-a.height};break;case"bottom":y={x:m,y:r.y+r.height};break;case"right":y={x:r.x+r.width,y:h};break;case"left":y={x:r.x-a.width,y:h};break;default:y={x:r.x,y:r.y}}switch(qc(t)){case"start":y[l]-=g*(n&&f?-1:1);break;case"end":y[l]+=g*(n&&f?-1:1);break}return y}async function mJ(e,t){var n;t===void 0&&(t={});const{x:r,y:a,platform:s,rects:l,elements:u,strategy:d}=e,{boundary:f="clippingAncestors",rootBoundary:m="viewport",elementContext:h="floating",altBoundary:g=!1,padding:y=0}=gi(t,e),j=A$(y),b=u[g?h==="floating"?"reference":"floating":h],N=Pm(await s.getClippingRect({element:(n=await(s.isElement==null?void 0:s.isElement(b)))==null||n?b:b.contextElement||await(s.getDocumentElement==null?void 0:s.getDocumentElement(u.floating)),boundary:f,rootBoundary:m,strategy:d})),E=h==="floating"?{x:r,y:a,width:l.floating.width,height:l.floating.height}:l.reference,_=await(s.getOffsetParent==null?void 0:s.getOffsetParent(u.floating)),T=await(s.isElement==null?void 0:s.isElement(_))?await(s.getScale==null?void 0:s.getScale(_))||{x:1,y:1}:{x:1,y:1},A=Pm(s.convertOffsetParentRelativeRectToViewportRelativeRect?await s.convertOffsetParentRelativeRectToViewportRelativeRect({elements:u,rect:E,offsetParent:_,strategy:d}):E);return{top:(N.top-A.top+j.top)/T.y,bottom:(A.bottom-N.bottom+j.bottom)/T.y,left:(N.left-A.left+j.left)/T.x,right:(A.right-N.right+j.right)/T.x}}const xJ=50,gJ=async(e,t,n)=>{const{placement:r="bottom",strategy:a="absolute",middleware:s=[],platform:l}=n,u=l.detectOverflow?l:{...l,detectOverflow:mJ},d=await(l.isRTL==null?void 0:l.isRTL(t));let f=await l.getElementRects({reference:e,floating:t,strategy:a}),{x:m,y:h}=N5(f,r,d),g=r,y=0;const j={};for(let v=0;v<s.length;v++){const b=s[v];if(!b)continue;const{name:N,fn:E}=b,{x:_,y:T,data:A,reset:k}=await E({x:m,y:h,initialPlacement:r,placement:g,strategy:a,middlewareData:j,rects:f,platform:u,elements:{reference:e,floating:t}});m=_??m,h=T??h,j[N]={...j[N],...A},k&&y<xJ&&(y++,typeof k=="object"&&(k.placement&&(g=k.placement),k.rects&&(f=k.rects===!0?await l.getElementRects({reference:e,floating:t,strategy:a}):k.rects),{x:m,y:h}=N5(f,g,d)),v=-1)}return{x:m,y:h,placement:g,strategy:a,middlewareData:j}},yJ=e=>({name:"arrow",options:e,async fn(t){const{x:n,y:r,placement:a,rects:s,platform:l,elements:u,middlewareData:d}=t,{element:f,padding:m=0}=gi(e,t)||{};if(f==null)return{};const h=A$(m),g={x:n,y:r},y=LA(a),j=$A(y),v=await l.getDimensions(f),b=y==="y",N=b?"top":"left",E=b?"bottom":"right",_=b?"clientHeight":"clientWidth",T=s.reference[j]+s.reference[y]-g[y]-s.floating[j],A=g[y]-s.reference[y],k=await(l.getOffsetParent==null?void 0:l.getOffsetParent(f));let O=k?k[_]:0;(!O||!await(l.isElement==null?void 0:l.isElement(k)))&&(O=u.floating[_]||s.floating[j]);const M=T/2-A/2,D=O/2-v[j]/2-1,z=ms(h[N],D),L=ms(h[E],D),q=z,B=O-v[j]-L,U=O/2-v[j]/2+M,H=aS(q,U,B),I=!d.arrow&&qc(a)!=null&&U!==H&&s.reference[j]/2-(U<q?z:L)-v[j]/2<0,V=I?U<q?U-q:U-B:0;return{[y]:g[y]+V,data:{[y]:H,centerOffset:U-H-V,...I&&{alignmentOffset:V}},reset:I}}}),vJ=function(e){return e===void 0&&(e={}),{name:"flip",options:e,async fn(t){var n,r;const{placement:a,middlewareData:s,rects:l,initialPlacement:u,platform:d,elements:f}=t,{mainAxis:m=!0,crossAxis:h=!0,fallbackPlacements:g,fallbackStrategy:y="bestFit",fallbackAxisSideDirection:j="none",flipAlignment:v=!0,...b}=gi(e,t);if((n=s.arrow)!=null&&n.alignmentOffset)return{};const N=yi(a),E=Aa(u),_=yi(u)===u,T=await(d.isRTL==null?void 0:d.isRTL(f.floating)),A=g||(_||!v?[Mm(u)]:cJ(u)),k=j!=="none";!g&&k&&A.push(...pJ(u,v,j,T));const O=[u,...A],M=await d.detectOverflow(t,b),D=[];let z=((r=s.flip)==null?void 0:r.overflows)||[];if(m&&D.push(M[N]),h){const U=lJ(a,l,T);D.push(M[U[0]],M[U[1]])}if(z=[...z,{placement:a,overflows:D}],!D.every(U=>U<=0)){var L,q;const U=(((L=s.flip)==null?void 0:L.index)||0)+1,H=O[U];if(H&&(!(h==="alignment"?E!==Aa(H):!1)||z.every(F=>Aa(F.placement)===E?F.overflows[0]>0:!0)))return{data:{index:U,overflows:z},reset:{placement:H}};let I=(q=z.filter(V=>V.overflows[0]<=0).sort((V,F)=>V.overflows[1]-F.overflows[1])[0])==null?void 0:q.placement;if(!I)switch(y){case"bestFit":{var B;const V=(B=z.filter(F=>{if(k){const Z=Aa(F.placement);return Z===E||Z==="y"}return!0}).map(F=>[F.placement,F.overflows.filter(Z=>Z>0).reduce((Z,R)=>Z+R,0)]).sort((F,Z)=>F[1]-Z[1])[0])==null?void 0:B[0];V&&(I=V);break}case"initialPlacement":I=u;break}if(a!==I)return{reset:{placement:I}}}return{}}}};function A5(e,t){return{top:e.top-t.height,right:e.right-t.width,bottom:e.bottom-t.height,left:e.left-t.width}}function C5(e){return sJ.some(t=>e[t]>=0)}const bJ=function(e){return e===void 0&&(e={}),{name:"hide",options:e,async fn(t){const{rects:n,platform:r}=t,{strategy:a="referenceHidden",...s}=gi(e,t);switch(a){case"referenceHidden":{const l=await r.detectOverflow(t,{...s,elementContext:"reference"}),u=A5(l,n.reference);return{data:{referenceHiddenOffsets:u,referenceHidden:C5(u)}}}case"escaped":{const l=await r.detectOverflow(t,{...s,altBoundary:!0}),u=A5(l,n.floating);return{data:{escapedOffsets:u,escaped:C5(u)}}}default:return{}}}}},C$=new Set(["left","top"]);async function jJ(e,t){const{placement:n,platform:r,elements:a}=e,s=await(r.isRTL==null?void 0:r.isRTL(a.floating)),l=yi(n),u=qc(n),d=Aa(n)==="y",f=C$.has(l)?-1:1,m=s&&d?-1:1,h=gi(t,e);let{mainAxis:g,crossAxis:y,alignmentAxis:j}=typeof h=="number"?{mainAxis:h,crossAxis:0,alignmentAxis:null}:{mainAxis:h.mainAxis||0,crossAxis:h.crossAxis||0,alignmentAxis:h.alignmentAxis};return u&&typeof j=="number"&&(y=u==="end"?j*-1:j),d?{x:y*m,y:g*f}:{x:g*f,y:y*m}}const wJ=function(e){return e===void 0&&(e=0),{name:"offset",options:e,async fn(t){var n,r;const{x:a,y:s,placement:l,middlewareData:u}=t,d=await jJ(t,e);return l===((n=u.offset)==null?void 0:n.placement)&&(r=u.arrow)!=null&&r.alignmentOffset?{}:{x:a+d.x,y:s+d.y,data:{...d,placement:l}}}}},SJ=function(e){return e===void 0&&(e={}),{name:"shift",options:e,async fn(t){const{x:n,y:r,placement:a,platform:s}=t,{mainAxis:l=!0,crossAxis:u=!1,limiter:d={fn:N=>{let{x:E,y:_}=N;return{x:E,y:_}}},...f}=gi(e,t),m={x:n,y:r},h=await s.detectOverflow(t,f),g=Aa(yi(a)),y=IA(g);let j=m[y],v=m[g];if(l){const N=y==="y"?"top":"left",E=y==="y"?"bottom":"right",_=j+h[N],T=j-h[E];j=aS(_,j,T)}if(u){const N=g==="y"?"top":"left",E=g==="y"?"bottom":"right",_=v+h[N],T=v-h[E];v=aS(_,v,T)}const b=d.fn({...t,[y]:j,[g]:v});return{...b,data:{x:b.x-n,y:b.y-r,enabled:{[y]:l,[g]:u}}}}}},NJ=function(e){return e===void 0&&(e={}),{options:e,fn(t){const{x:n,y:r,placement:a,rects:s,middlewareData:l}=t,{offset:u=0,mainAxis:d=!0,crossAxis:f=!0}=gi(e,t),m={x:n,y:r},h=Aa(a),g=IA(h);let y=m[g],j=m[h];const v=gi(u,t),b=typeof v=="number"?{mainAxis:v,crossAxis:0}:{mainAxis:0,crossAxis:0,...v};if(d){const _=g==="y"?"height":"width",T=s.reference[g]-s.floating[_]+b.mainAxis,A=s.reference[g]+s.reference[_]-b.mainAxis;y<T?y=T:y>A&&(y=A)}if(f){var N,E;const _=g==="y"?"width":"height",T=C$.has(yi(a)),A=s.reference[h]-s.floating[_]+(T&&((N=l.offset)==null?void 0:N[h])||0)+(T?0:b.crossAxis),k=s.reference[h]+s.reference[_]+(T?0:((E=l.offset)==null?void 0:E[h])||0)-(T?b.crossAxis:0);j<A?j=A:j>k&&(j=k)}return{[g]:y,[h]:j}}}},AJ=function(e){return e===void 0&&(e={}),{name:"size",options:e,async fn(t){var n,r;const{placement:a,rects:s,platform:l,elements:u}=t,{apply:d=()=>{},...f}=gi(e,t),m=await l.detectOverflow(t,f),h=yi(a),g=qc(a),y=Aa(a)==="y",{width:j,height:v}=s.floating;let b,N;h==="top"||h==="bottom"?(b=h,N=g===(await(l.isRTL==null?void 0:l.isRTL(u.floating))?"start":"end")?"left":"right"):(N=h,b=g==="end"?"top":"bottom");const E=v-m.top-m.bottom,_=j-m.left-m.right,T=ms(v-m[b],E),A=ms(j-m[N],_),k=!t.middlewareData.shift;let O=T,M=A;if((n=t.middlewareData.shift)!=null&&n.enabled.x&&(M=_),(r=t.middlewareData.shift)!=null&&r.enabled.y&&(O=E),k&&!g){const z=dr(m.left,0),L=dr(m.right,0),q=dr(m.top,0),B=dr(m.bottom,0);y?M=j-2*(z!==0||L!==0?z+L:dr(m.left,m.right)):O=v-2*(q!==0||B!==0?q+B:dr(m.top,m.bottom))}await d({...t,availableWidth:M,availableHeight:O});const D=await l.getDimensions(u.floating);return j!==D.width||v!==D.height?{reset:{rects:!0}}:{}}}};function wg(){return typeof window<"u"}function Fc(e){return _$(e)?(e.nodeName||"").toLowerCase():"#document"}function pr(e){var t;return(e==null||(t=e.ownerDocument)==null?void 0:t.defaultView)||window}function Ba(e){var t;return(t=(_$(e)?e.ownerDocument:e.document)||window.document)==null?void 0:t.documentElement}function _$(e){return wg()?e instanceof Node||e instanceof pr(e).Node:!1}function oa(e){return wg()?e instanceof Element||e instanceof pr(e).Element:!1}function Ni(e){return wg()?e instanceof HTMLElement||e instanceof pr(e).HTMLElement:!1}function _5(e){return!wg()||typeof ShadowRoot>"u"?!1:e instanceof ShadowRoot||e instanceof pr(e).ShadowRoot}function Df(e){const{overflow:t,overflowX:n,overflowY:r,display:a}=la(e);return/auto|scroll|overlay|hidden|clip/.test(t+r+n)&&a!=="inline"&&a!=="contents"}function CJ(e){return/^(table|td|th)$/.test(Fc(e))}function Sg(e){try{if(e.matches(":popover-open"))return!0}catch{}try{return e.matches(":modal")}catch{return!1}}const _J=/transform|translate|scale|rotate|perspective|filter/,EJ=/paint|layout|strict|content/,Qs=e=>!!e&&e!=="none";let t0;function BA(e){const t=oa(e)?la(e):e;return Qs(t.transform)||Qs(t.translate)||Qs(t.scale)||Qs(t.rotate)||Qs(t.perspective)||!zA()&&(Qs(t.backdropFilter)||Qs(t.filter))||_J.test(t.willChange||"")||EJ.test(t.contain||"")}function TJ(e){let t=xs(e);for(;Ni(t)&&!sc(t);){if(BA(t))return t;if(Sg(t))return null;t=xs(t)}return null}function zA(){return t0==null&&(t0=typeof CSS<"u"&&CSS.supports&&CSS.supports("-webkit-backdrop-filter","none")),t0}function sc(e){return/^(html|body|#document)$/.test(Fc(e))}function la(e){return pr(e).getComputedStyle(e)}function Ng(e){return oa(e)?{scrollLeft:e.scrollLeft,scrollTop:e.scrollTop}:{scrollLeft:e.scrollX,scrollTop:e.scrollY}}function xs(e){if(Fc(e)==="html")return e;const t=e.assignedSlot||e.parentNode||_5(e)&&e.host||Ba(e);return _5(t)?t.host:t}function E$(e){const t=xs(e);return sc(t)?e.ownerDocument?e.ownerDocument.body:e.body:Ni(t)&&Df(t)?t:E$(t)}function Ld(e,t,n){var r;t===void 0&&(t=[]),n===void 0&&(n=!0);const a=E$(e),s=a===((r=e.ownerDocument)==null?void 0:r.body),l=pr(a);if(s){const u=sS(l);return t.concat(l,l.visualViewport||[],Df(a)?a:[],u&&n?Ld(u):[])}else return t.concat(a,Ld(a,[],n))}function sS(e){return e.parent&&Object.getPrototypeOf(e.parent)?e.frameElement:null}function T$(e){const t=la(e);let n=parseFloat(t.width)||0,r=parseFloat(t.height)||0;const a=Ni(e),s=a?e.offsetWidth:n,l=a?e.offsetHeight:r,u=Om(n)!==s||Om(r)!==l;return u&&(n=s,r=l),{width:n,height:r,$:u}}function qA(e){return oa(e)?e:e.contextElement}function Ql(e){const t=qA(e);if(!Ni(t))return Ea(1);const n=t.getBoundingClientRect(),{width:r,height:a,$:s}=T$(t);let l=(s?Om(n.width):n.width)/r,u=(s?Om(n.height):n.height)/a;return(!l||!Number.isFinite(l))&&(l=1),(!u||!Number.isFinite(u))&&(u=1),{x:l,y:u}}const kJ=Ea(0);function k$(e){const t=pr(e);return!zA()||!t.visualViewport?kJ:{x:t.visualViewport.offsetLeft,y:t.visualViewport.offsetTop}}function OJ(e,t,n){return t===void 0&&(t=!1),!n||t&&n!==pr(e)?!1:t}function vo(e,t,n,r){t===void 0&&(t=!1),n===void 0&&(n=!1);const a=e.getBoundingClientRect(),s=qA(e);let l=Ea(1);t&&(r?oa(r)&&(l=Ql(r)):l=Ql(e));const u=OJ(s,n,r)?k$(s):Ea(0);let d=(a.left+u.x)/l.x,f=(a.top+u.y)/l.y,m=a.width/l.x,h=a.height/l.y;if(s){const g=pr(s),y=r&&oa(r)?pr(r):r;let j=g,v=sS(j);for(;v&&r&&y!==j;){const b=Ql(v),N=v.getBoundingClientRect(),E=la(v),_=N.left+(v.clientLeft+parseFloat(E.paddingLeft))*b.x,T=N.top+(v.clientTop+parseFloat(E.paddingTop))*b.y;d*=b.x,f*=b.y,m*=b.x,h*=b.y,d+=_,f+=T,j=pr(v),v=sS(j)}}return Pm({width:m,height:h,x:d,y:f})}function Ag(e,t){const n=Ng(e).scrollLeft;return t?t.left+n:vo(Ba(e)).left+n}function O$(e,t){const n=e.getBoundingClientRect(),r=n.left+t.scrollLeft-Ag(e,n),a=n.top+t.scrollTop;return{x:r,y:a}}function MJ(e){let{elements:t,rect:n,offsetParent:r,strategy:a}=e;const s=a==="fixed",l=Ba(r),u=t?Sg(t.floating):!1;if(r===l||u&&s)return n;let d={scrollLeft:0,scrollTop:0},f=Ea(1);const m=Ea(0),h=Ni(r);if((h||!h&&!s)&&((Fc(r)!=="body"||Df(l))&&(d=Ng(r)),h)){const y=vo(r);f=Ql(r),m.x=y.x+r.clientLeft,m.y=y.y+r.clientTop}const g=l&&!h&&!s?O$(l,d):Ea(0);return{width:n.width*f.x,height:n.height*f.y,x:n.x*f.x-d.scrollLeft*f.x+m.x+g.x,y:n.y*f.y-d.scrollTop*f.y+m.y+g.y}}function PJ(e){return Array.from(e.getClientRects())}function DJ(e){const t=Ba(e),n=Ng(e),r=e.ownerDocument.body,a=dr(t.scrollWidth,t.clientWidth,r.scrollWidth,r.clientWidth),s=dr(t.scrollHeight,t.clientHeight,r.scrollHeight,r.clientHeight);let l=-n.scrollLeft+Ag(e);const u=-n.scrollTop;return la(r).direction==="rtl"&&(l+=dr(t.clientWidth,r.clientWidth)-a),{width:a,height:s,x:l,y:u}}const E5=25;function RJ(e,t){const n=pr(e),r=Ba(e),a=n.visualViewport;let s=r.clientWidth,l=r.clientHeight,u=0,d=0;if(a){s=a.width,l=a.height;const m=zA();(!m||m&&t==="fixed")&&(u=a.offsetLeft,d=a.offsetTop)}const f=Ag(r);if(f<=0){const m=r.ownerDocument,h=m.body,g=getComputedStyle(h),y=m.compatMode==="CSS1Compat"&&parseFloat(g.marginLeft)+parseFloat(g.marginRight)||0,j=Math.abs(r.clientWidth-h.clientWidth-y);j<=E5&&(s-=j)}else f<=E5&&(s+=f);return{width:s,height:l,x:u,y:d}}function IJ(e,t){const n=vo(e,!0,t==="fixed"),r=n.top+e.clientTop,a=n.left+e.clientLeft,s=Ni(e)?Ql(e):Ea(1),l=e.clientWidth*s.x,u=e.clientHeight*s.y,d=a*s.x,f=r*s.y;return{width:l,height:u,x:d,y:f}}function T5(e,t,n){let r;if(t==="viewport")r=RJ(e,n);else if(t==="document")r=DJ(Ba(e));else if(oa(t))r=IJ(t,n);else{const a=k$(e);r={x:t.x-a.x,y:t.y-a.y,width:t.width,height:t.height}}return Pm(r)}function M$(e,t){const n=xs(e);return n===t||!oa(n)||sc(n)?!1:la(n).position==="fixed"||M$(n,t)}function $J(e,t){const n=t.get(e);if(n)return n;let r=Ld(e,[],!1).filter(u=>oa(u)&&Fc(u)!=="body"),a=null;const s=la(e).position==="fixed";let l=s?xs(e):e;for(;oa(l)&&!sc(l);){const u=la(l),d=BA(l);!d&&u.position==="fixed"&&(a=null),(s?!d&&!a:!d&&u.position==="static"&&!!a&&(a.position==="absolute"||a.position==="fixed")||Df(l)&&!d&&M$(e,l))?r=r.filter(m=>m!==l):a=u,l=xs(l)}return t.set(e,r),r}function LJ(e){let{element:t,boundary:n,rootBoundary:r,strategy:a}=e;const l=[...n==="clippingAncestors"?Sg(t)?[]:$J(t,this._c):[].concat(n),r],u=T5(t,l[0],a);let d=u.top,f=u.right,m=u.bottom,h=u.left;for(let g=1;g<l.length;g++){const y=T5(t,l[g],a);d=dr(y.top,d),f=ms(y.right,f),m=ms(y.bottom,m),h=dr(y.left,h)}return{width:f-h,height:m-d,x:h,y:d}}function BJ(e){const{width:t,height:n}=T$(e);return{width:t,height:n}}function zJ(e,t,n){const r=Ni(t),a=Ba(t),s=n==="fixed",l=vo(e,!0,s,t);let u={scrollLeft:0,scrollTop:0};const d=Ea(0);function f(){d.x=Ag(a)}if(r||!r&&!s)if((Fc(t)!=="body"||Df(a))&&(u=Ng(t)),r){const y=vo(t,!0,s,t);d.x=y.x+t.clientLeft,d.y=y.y+t.clientTop}else a&&f();s&&!r&&a&&f();const m=a&&!r&&!s?O$(a,u):Ea(0),h=l.left+u.scrollLeft-d.x-m.x,g=l.top+u.scrollTop-d.y-m.y;return{x:h,y:g,width:l.width,height:l.height}}function n0(e){return la(e).position==="static"}function k5(e,t){if(!Ni(e)||la(e).position==="fixed")return null;if(t)return t(e);let n=e.offsetParent;return Ba(e)===n&&(n=n.ownerDocument.body),n}function P$(e,t){const n=pr(e);if(Sg(e))return n;if(!Ni(e)){let a=xs(e);for(;a&&!sc(a);){if(oa(a)&&!n0(a))return a;a=xs(a)}return n}let r=k5(e,t);for(;r&&CJ(r)&&n0(r);)r=k5(r,t);return r&&sc(r)&&n0(r)&&!BA(r)?n:r||TJ(e)||n}const qJ=async function(e){const t=this.getOffsetParent||P$,n=this.getDimensions,r=await n(e.floating);return{reference:zJ(e.reference,await t(e.floating),e.strategy),floating:{x:0,y:0,width:r.width,height:r.height}}};function FJ(e){return la(e).direction==="rtl"}const UJ={convertOffsetParentRelativeRectToViewportRelativeRect:MJ,getDocumentElement:Ba,getClippingRect:LJ,getOffsetParent:P$,getElementRects:qJ,getClientRects:PJ,getDimensions:BJ,getScale:Ql,isElement:oa,isRTL:FJ};function D$(e,t){return e.x===t.x&&e.y===t.y&&e.width===t.width&&e.height===t.height}function VJ(e,t){let n=null,r;const a=Ba(e);function s(){var u;clearTimeout(r),(u=n)==null||u.disconnect(),n=null}function l(u,d){u===void 0&&(u=!1),d===void 0&&(d=1),s();const f=e.getBoundingClientRect(),{left:m,top:h,width:g,height:y}=f;if(u||t(),!g||!y)return;const j=bh(h),v=bh(a.clientWidth-(m+g)),b=bh(a.clientHeight-(h+y)),N=bh(m),_={rootMargin:-j+"px "+-v+"px "+-b+"px "+-N+"px",threshold:dr(0,ms(1,d))||1};let T=!0;function A(k){const O=k[0].intersectionRatio;if(O!==d){if(!T)return l();O?l(!1,O):r=setTimeout(()=>{l(!1,1e-7)},1e3)}O===1&&!D$(f,e.getBoundingClientRect())&&l(),T=!1}try{n=new IntersectionObserver(A,{..._,root:a.ownerDocument})}catch{n=new IntersectionObserver(A,_)}n.observe(e)}return l(!0),s}function HJ(e,t,n,r){r===void 0&&(r={});const{ancestorScroll:a=!0,ancestorResize:s=!0,elementResize:l=typeof ResizeObserver=="function",layoutShift:u=typeof IntersectionObserver=="function",animationFrame:d=!1}=r,f=qA(e),m=a||s?[...f?Ld(f):[],...t?Ld(t):[]]:[];m.forEach(N=>{a&&N.addEventListener("scroll",n,{passive:!0}),s&&N.addEventListener("resize",n)});const h=f&&u?VJ(f,n):null;let g=-1,y=null;l&&(y=new ResizeObserver(N=>{let[E]=N;E&&E.target===f&&y&&t&&(y.unobserve(t),cancelAnimationFrame(g),g=requestAnimationFrame(()=>{var _;(_=y)==null||_.observe(t)})),n()}),f&&!d&&y.observe(f),t&&y.observe(t));let j,v=d?vo(e):null;d&&b();function b(){const N=vo(e);v&&!D$(v,N)&&n(),v=N,j=requestAnimationFrame(b)}return n(),()=>{var N;m.forEach(E=>{a&&E.removeEventListener("scroll",n),s&&E.removeEventListener("resize",n)}),h?.(),(N=y)==null||N.disconnect(),y=null,d&&cancelAnimationFrame(j)}}const GJ=wJ,WJ=SJ,KJ=vJ,YJ=AJ,XJ=bJ,O5=yJ,QJ=NJ,ZJ=(e,t,n)=>{const r=new Map,a={platform:UJ,...n},s={...a.platform,_c:r};return gJ(e,t,{...a,platform:s})};var JJ=typeof document<"u",eee=function(){},dm=JJ?S.useLayoutEffect:eee;function Dm(e,t){if(e===t)return!0;if(typeof e!=typeof t)return!1;if(typeof e=="function"&&e.toString()===t.toString())return!0;let n,r,a;if(e&&t&&typeof e=="object"){if(Array.isArray(e)){if(n=e.length,n!==t.length)return!1;for(r=n;r--!==0;)if(!Dm(e[r],t[r]))return!1;return!0}if(a=Object.keys(e),n=a.length,n!==Object.keys(t).length)return!1;for(r=n;r--!==0;)if(!{}.hasOwnProperty.call(t,a[r]))return!1;for(r=n;r--!==0;){const s=a[r];if(!(s==="_owner"&&e.$$typeof)&&!Dm(e[s],t[s]))return!1}return!0}return e!==e&&t!==t}function R$(e){return typeof window>"u"?1:(e.ownerDocument.defaultView||window).devicePixelRatio||1}function M5(e,t){const n=R$(e);return Math.round(t*n)/n}function r0(e){const t=S.useRef(e);return dm(()=>{t.current=e}),t}function tee(e){e===void 0&&(e={});const{placement:t="bottom",strategy:n="absolute",middleware:r=[],platform:a,elements:{reference:s,floating:l}={},transform:u=!0,whileElementsMounted:d,open:f}=e,[m,h]=S.useState({x:0,y:0,strategy:n,placement:t,middlewareData:{},isPositioned:!1}),[g,y]=S.useState(r);Dm(g,r)||y(r);const[j,v]=S.useState(null),[b,N]=S.useState(null),E=S.useCallback(F=>{F!==k.current&&(k.current=F,v(F))},[]),_=S.useCallback(F=>{F!==O.current&&(O.current=F,N(F))},[]),T=s||j,A=l||b,k=S.useRef(null),O=S.useRef(null),M=S.useRef(m),D=d!=null,z=r0(d),L=r0(a),q=r0(f),B=S.useCallback(()=>{if(!k.current||!O.current)return;const F={placement:t,strategy:n,middleware:g};L.current&&(F.platform=L.current),ZJ(k.current,O.current,F).then(Z=>{const R={...Z,isPositioned:q.current!==!1};U.current&&!Dm(M.current,R)&&(M.current=R,ug.flushSync(()=>{h(R)}))})},[g,t,n,L,q]);dm(()=>{f===!1&&M.current.isPositioned&&(M.current.isPositioned=!1,h(F=>({...F,isPositioned:!1})))},[f]);const U=S.useRef(!1);dm(()=>(U.current=!0,()=>{U.current=!1}),[]),dm(()=>{if(T&&(k.current=T),A&&(O.current=A),T&&A){if(z.current)return z.current(T,A,B);B()}},[T,A,B,z,D]);const H=S.useMemo(()=>({reference:k,floating:O,setReference:E,setFloating:_}),[E,_]),I=S.useMemo(()=>({reference:T,floating:A}),[T,A]),V=S.useMemo(()=>{const F={position:n,left:0,top:0};if(!I.floating)return F;const Z=M5(I.floating,m.x),R=M5(I.floating,m.y);return u?{...F,transform:"translate("+Z+"px, "+R+"px)",...R$(I.floating)>=1.5&&{willChange:"transform"}}:{position:n,left:Z,top:R}},[n,u,I.floating,m.x,m.y]);return S.useMemo(()=>({...m,update:B,refs:H,elements:I,floatingStyles:V}),[m,B,H,I,V])}const nee=e=>{function t(n){return{}.hasOwnProperty.call(n,"current")}return{name:"arrow",options:e,fn(n){const{element:r,padding:a}=typeof e=="function"?e(n):e;return r&&t(r)?r.current!=null?O5({element:r.current,padding:a}).fn(n):{}:r?O5({element:r,padding:a}).fn(n):{}}}},ree=(e,t)=>{const n=GJ(e);return{name:n.name,fn:n.fn,options:[e,t]}},aee=(e,t)=>{const n=WJ(e);return{name:n.name,fn:n.fn,options:[e,t]}},iee=(e,t)=>({fn:QJ(e).fn,options:[e,t]}),see=(e,t)=>{const n=KJ(e);return{name:n.name,fn:n.fn,options:[e,t]}},oee=(e,t)=>{const n=YJ(e);return{name:n.name,fn:n.fn,options:[e,t]}},lee=(e,t)=>{const n=XJ(e);return{name:n.name,fn:n.fn,options:[e,t]}},cee=(e,t)=>{const n=nee(e);return{name:n.name,fn:n.fn,options:[e,t]}};var uee="Arrow",I$=S.forwardRef((e,t)=>{const{children:n,width:r=10,height:a=5,...s}=e;return i.jsx(Rt.svg,{...s,ref:t,width:r,height:a,viewBox:"0 0 30 10",preserveAspectRatio:"none",children:e.asChild?n:i.jsx("polygon",{points:"0,0 30,0 15,10"})})});I$.displayName=uee;var dee=I$;function $$(e){const[t,n]=S.useState(void 0);return _a(()=>{if(e){n({width:e.offsetWidth,height:e.offsetHeight});const r=new ResizeObserver(a=>{if(!Array.isArray(a)||!a.length)return;const s=a[0];let l,u;if("borderBoxSize"in s){const d=s.borderBoxSize,f=Array.isArray(d)?d[0]:d;l=f.inlineSize,u=f.blockSize}else l=e.offsetWidth,u=e.offsetHeight;n({width:l,height:u})});return r.observe(e,{box:"border-box"}),()=>r.unobserve(e)}else n(void 0)},[e]),t}var L$="Popper",[B$,z$]=To(L$),[uEe,q$]=B$(L$),F$="PopperAnchor",U$=S.forwardRef((e,t)=>{const{__scopePopper:n,virtualRef:r,...a}=e,s=q$(F$,n),l=S.useRef(null),u=s.onAnchorChange,d=S.useCallback(j=>{l.current=j,j&&u(j)},[u]),f=an(t,d),m=S.useRef(null);S.useEffect(()=>{if(!r)return;const j=m.current;m.current=r.current,j!==m.current&&u(m.current)});const h=s.placementState&&UA(s.placementState),g=h?.[0],y=h?.[1];return r?null:i.jsx(Rt.div,{"data-radix-popper-side":g,"data-radix-popper-align":y,...a,ref:f})});U$.displayName=F$;var FA="PopperContent",[fee,pee]=B$(FA),V$=S.forwardRef((e,t)=>{const{__scopePopper:n,side:r="bottom",sideOffset:a=0,align:s="center",alignOffset:l=0,arrowPadding:u=0,avoidCollisions:d=!0,collisionBoundary:f=[],collisionPadding:m=0,sticky:h="partial",hideWhenDetached:g=!1,updatePositionStrategy:y="optimized",onPlaced:j,...v}=e,b=q$(FA,n),[N,E]=S.useState(null),_=an(t,je=>E(je)),[T,A]=S.useState(null),k=$$(T),O=k?.width??0,M=k?.height??0,D=r+(s!=="center"?"-"+s:""),z=typeof m=="number"?m:{top:0,right:0,bottom:0,left:0,...m},L=Array.isArray(f)?f:[f],q=L.length>0,B={padding:z,boundary:L.filter(mee),altBoundary:q},{refs:U,floatingStyles:H,placement:I,isPositioned:V,middlewareData:F}=tee({strategy:"fixed",placement:D,whileElementsMounted:(...je)=>HJ(...je,{animationFrame:y==="always"}),elements:{reference:b.anchor},middleware:[ree({mainAxis:a+M,alignmentAxis:l}),d&&aee({mainAxis:!0,crossAxis:!1,limiter:h==="partial"?iee():void 0,...B}),d&&see({...B}),oee({...B,apply:({elements:je,rects:fe,availableWidth:Ce,availableHeight:he})=>{const{width:le,height:Te}=fe.reference,be=je.floating.style;be.setProperty("--radix-popper-available-width",`${Ce}px`),be.setProperty("--radix-popper-available-height",`${he}px`),be.setProperty("--radix-popper-anchor-width",`${le}px`),be.setProperty("--radix-popper-anchor-height",`${Te}px`)}}),T&&cee({element:T,padding:u}),xee({arrowWidth:O,arrowHeight:M}),g&&lee({strategy:"referenceHidden",...B,boundary:q?B.boundary:void 0})]}),Z=b.setPlacementState;_a(()=>(Z(I),()=>{Z(void 0)}),[I,Z]);const[R,K]=UA(I),Y=Da(j);_a(()=>{V&&Y?.()},[V,Y]);const ne=F.arrow?.x,ae=F.arrow?.y,ce=F.arrow?.centerOffset!==0,[ge,ye]=S.useState();return _a(()=>{N&&ye(window.getComputedStyle(N).zIndex)},[N]),i.jsx("div",{ref:U.setFloating,"data-radix-popper-content-wrapper":"",style:{...H,transform:V?H.transform:"translate(0, -200%)",minWidth:"max-content",zIndex:ge,"--radix-popper-transform-origin":[F.transformOrigin?.x,F.transformOrigin?.y].join(" "),...F.hide?.referenceHidden&&{visibility:"hidden",pointerEvents:"none"}},dir:e.dir,children:i.jsx(fee,{scope:n,placedSide:R,placedAlign:K,onArrowChange:A,arrowX:ne,arrowY:ae,shouldHideArrow:ce,children:i.jsx(Rt.div,{"data-side":R,"data-align":K,...v,ref:_,style:{...v.style,animation:V?void 0:"none"}})})})});V$.displayName=FA;var H$="PopperArrow",hee={top:"bottom",right:"left",bottom:"top",left:"right"},G$=S.forwardRef(function(t,n){const{__scopePopper:r,...a}=t,s=pee(H$,r),l=hee[s.placedSide];return i.jsx("span",{ref:s.onArrowChange,style:{position:"absolute",left:s.arrowX,top:s.arrowY,[l]:0,transformOrigin:{top:"",right:"0 0",bottom:"center 0",left:"100% 0"}[s.placedSide],transform:{top:"translateY(100%)",right:"translateY(50%) rotate(90deg) translateX(-50%)",bottom:"rotate(180deg)",left:"translateY(50%) rotate(-90deg) translateX(50%)"}[s.placedSide],visibility:s.shouldHideArrow?"hidden":void 0},children:i.jsx(dee,{...a,ref:n,style:{...a.style,display:"block"}})})});G$.displayName=H$;function mee(e){return e!==null}var xee=e=>({name:"transformOrigin",options:e,fn(t){const{placement:n,rects:r,middlewareData:a}=t,l=a.arrow?.centerOffset!==0,u=l?0:e.arrowWidth,d=l?0:e.arrowHeight,[f,m]=UA(n),h={start:"0%",center:"50%",end:"100%"}[m],g=(a.arrow?.x??0)+u/2,y=(a.arrow?.y??0)+d/2;let j="",v="";return f==="bottom"?(j=l?h:`${g}px`,v=`${-d}px`):f==="top"?(j=l?h:`${g}px`,v=`${r.floating.height+d}px`):f==="right"?(j=`${-d}px`,v=l?h:`${y}px`):f==="left"&&(j=`${r.floating.width+d}px`,v=l?h:`${y}px`),{data:{x:j,y:v}}}});function UA(e){const[t,n="center"]=e.split("-");return[t,n]}var gee=U$,yee=V$,vee=G$,[Cg]=To("Tooltip",[z$]),VA=z$(),W$="TooltipProvider",bee=700,P5="tooltip.open",[jee,K$]=Cg(W$),Y$=e=>{const{__scopeTooltip:t,delayDuration:n=bee,skipDelayDuration:r=300,disableHoverableContent:a=!1,children:s}=e,l=S.useRef(!0),u=S.useRef(!1),d=S.useRef(0);return S.useEffect(()=>{const f=d.current;return()=>window.clearTimeout(f)},[]),i.jsx(jee,{scope:t,isOpenDelayedRef:l,delayDuration:n,onOpen:S.useCallback(()=>{r<=0||(window.clearTimeout(d.current),l.current=!1)},[r]),onClose:S.useCallback(()=>{r<=0||(window.clearTimeout(d.current),d.current=window.setTimeout(()=>l.current=!0,r))},[r]),isPointerInTransitRef:u,onPointerInTransitChange:S.useCallback(f=>{u.current=f},[]),disableHoverableContent:a,children:s})};Y$.displayName=W$;var X$="Tooltip",[dEe,Rf]=Cg(X$),oS="TooltipTrigger",wee=S.forwardRef((e,t)=>{const{__scopeTooltip:n,...r}=e,a=Rf(oS,n),s=K$(oS,n),l=VA(n),u=S.useRef(null),d=an(t,u,a.onTriggerChange),f=S.useRef(!1),m=S.useRef(!1),h=S.useCallback(()=>f.current=!1,[]);return S.useEffect(()=>()=>document.removeEventListener("pointerup",h),[h]),i.jsx(gee,{asChild:!0,...l,children:i.jsx(Rt.button,{"aria-describedby":a.open?a.contentId:void 0,"data-state":a.stateAttribute,...r,ref:d,onPointerMove:_t(e.onPointerMove,g=>{g.pointerType!=="touch"&&!m.current&&!s.isPointerInTransitRef.current&&(a.onTriggerEnter(),m.current=!0)}),onPointerLeave:_t(e.onPointerLeave,()=>{a.onTriggerLeave(),m.current=!1}),onPointerDown:_t(e.onPointerDown,()=>{a.open&&a.onClose(),f.current=!0,document.addEventListener("pointerup",h,{once:!0})}),onFocus:_t(e.onFocus,()=>{f.current||a.onOpen()}),onBlur:_t(e.onBlur,a.onClose),onClick:_t(e.onClick,a.onClose)})})});wee.displayName=oS;var HA="TooltipPortal",[See,Nee]=Cg(HA,{forceMount:void 0}),Q$=e=>{const{__scopeTooltip:t,forceMount:n,children:r,container:a}=e,s=Rf(HA,t);return i.jsx(See,{scope:t,forceMount:n,children:i.jsx(ko,{present:n||s.open,children:i.jsx(fg,{asChild:!0,container:a,children:r})})})};Q$.displayName=HA;var oc="TooltipContent",Z$=S.forwardRef((e,t)=>{const n=Nee(oc,e.__scopeTooltip),{forceMount:r=n.forceMount,side:a="top",...s}=e,l=Rf(oc,e.__scopeTooltip);return i.jsx(ko,{present:r||l.open,children:l.disableHoverableContent?i.jsx(J$,{side:a,...s,ref:t}):i.jsx(Aee,{side:a,...s,ref:t})})}),Aee=S.forwardRef((e,t)=>{const n=Rf(oc,e.__scopeTooltip),r=K$(oc,e.__scopeTooltip),a=S.useRef(null),s=an(t,a),[l,u]=S.useState(null),{trigger:d,onClose:f}=n,m=a.current,{onPointerInTransitChange:h}=r,g=S.useCallback(()=>{u(null),h(!1)},[h]),y=S.useCallback((j,v)=>{const b=j.currentTarget,N={x:j.clientX,y:j.clientY},E=kee(N,b.getBoundingClientRect()),_=Oee(N,E),T=Mee(v.getBoundingClientRect()),A=Dee([..._,...T]);u(A),h(!0)},[h]);return S.useEffect(()=>()=>g(),[g]),S.useEffect(()=>{if(d&&m){const j=b=>y(b,m),v=b=>y(b,d);return d.addEventListener("pointerleave",j),m.addEventListener("pointerleave",v),()=>{d.removeEventListener("pointerleave",j),m.removeEventListener("pointerleave",v)}}},[d,m,y,g]),S.useEffect(()=>{if(l){const j=v=>{const b=v.target,N={x:v.clientX,y:v.clientY},E=d?.contains(b)||m?.contains(b),_=!Pee(N,l);E?g():_&&(g(),f())};return document.addEventListener("pointermove",j),()=>document.removeEventListener("pointermove",j)}},[d,m,l,f,g]),i.jsx(J$,{...e,ref:s})}),[Cee,_ee]=Cg(X$,{isInside:!1}),Eee=hK("TooltipContent"),J$=S.forwardRef((e,t)=>{const{__scopeTooltip:n,children:r,"aria-label":a,onEscapeKeyDown:s,onPointerDownOutside:l,...u}=e,d=Rf(oc,n),f=VA(n),{onClose:m}=d;return S.useEffect(()=>(document.addEventListener(P5,m),()=>document.removeEventListener(P5,m)),[m]),S.useEffect(()=>{if(d.trigger){const h=g=>{g.target instanceof Node&&g.target.contains(d.trigger)&&m()};return window.addEventListener("scroll",h,{capture:!0}),()=>window.removeEventListener("scroll",h,{capture:!0})}},[d.trigger,m]),i.jsx(dg,{asChild:!0,disableOutsidePointerEvents:!1,onEscapeKeyDown:s,onPointerDownOutside:l,onFocusOutside:h=>h.preventDefault(),onDismiss:m,children:i.jsxs(yee,{"data-state":d.stateAttribute,...f,...u,ref:t,style:{...u.style,"--radix-tooltip-content-transform-origin":"var(--radix-popper-transform-origin)","--radix-tooltip-content-available-width":"var(--radix-popper-available-width)","--radix-tooltip-content-available-height":"var(--radix-popper-available-height)","--radix-tooltip-trigger-width":"var(--radix-popper-anchor-width)","--radix-tooltip-trigger-height":"var(--radix-popper-anchor-height)"},children:[i.jsx(Eee,{children:r}),i.jsx(Cee,{scope:n,isInside:!0,children:i.jsx(HK,{id:d.contentId,role:"tooltip",children:a||r})})]})})});Z$.displayName=oc;var eL="TooltipArrow",Tee=S.forwardRef((e,t)=>{const{__scopeTooltip:n,...r}=e,a=VA(n);return _ee(eL,n).isInside?null:i.jsx(vee,{...a,...r,ref:t})});Tee.displayName=eL;function kee(e,t){const n=Math.abs(t.top-e.y),r=Math.abs(t.bottom-e.y),a=Math.abs(t.right-e.x),s=Math.abs(t.left-e.x);switch(Math.min(n,r,a,s)){case s:return"left";case a:return"right";case n:return"top";case r:return"bottom";default:throw new Error("unreachable")}}function Oee(e,t,n=5){const r=[];switch(t){case"top":r.push({x:e.x-n,y:e.y+n},{x:e.x+n,y:e.y+n});break;case"bottom":r.push({x:e.x-n,y:e.y-n},{x:e.x+n,y:e.y-n});break;case"left":r.push({x:e.x+n,y:e.y-n},{x:e.x+n,y:e.y+n});break;case"right":r.push({x:e.x-n,y:e.y-n},{x:e.x-n,y:e.y+n});break}return r}function Mee(e){const{top:t,right:n,bottom:r,left:a}=e;return[{x:a,y:t},{x:n,y:t},{x:n,y:r},{x:a,y:r}]}function Pee(e,t){const{x:n,y:r}=e;let a=!1;for(let s=0,l=t.length-1;s<t.length;l=s++){const u=t[s],d=t[l],f=u.x,m=u.y,h=d.x,g=d.y;m>r!=g>r&&n<(h-f)*(r-m)/(g-m)+f&&(a=!a)}return a}function Dee(e){const t=e.slice();return t.sort((n,r)=>n.x<r.x?-1:n.x>r.x?1:n.y<r.y?-1:n.y>r.y?1:0),Ree(t)}function Ree(e){if(e.length<=1)return e.slice();const t=[];for(let r=0;r<e.length;r++){const a=e[r];for(;t.length>=2;){const s=t[t.length-1],l=t[t.length-2];if((s.x-l.x)*(a.y-l.y)>=(s.y-l.y)*(a.x-l.x))t.pop();else break}t.push(a)}t.pop();const n=[];for(let r=e.length-1;r>=0;r--){const a=e[r];for(;n.length>=2;){const s=n[n.length-1],l=n[n.length-2];if((s.x-l.x)*(a.y-l.y)>=(s.y-l.y)*(a.x-l.x))n.pop();else break}n.push(a)}return n.pop(),t.length===1&&n.length===1&&t[0].x===n[0].x&&t[0].y===n[0].y?t:t.concat(n)}var Iee=Y$,$ee=Q$,tL=Z$;const Lee=Iee,Bee=S.forwardRef(({className:e,sideOffset:t=4,...n},r)=>i.jsx($ee,{children:i.jsx(tL,{ref:r,sideOffset:t,className:X("z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-tooltip-content-transform-origin]",e),...n})}));Bee.displayName=tL.displayName;function zee(e,t){if(e instanceof RegExp)return{keys:!1,pattern:e};var n,r,a,s,l=[],u="",d=e.split("/");for(d[0]||d.shift();a=d.shift();)n=a[0],n==="*"?(l.push(n),u+=a[1]==="?"?"(?:/(.*))?":"/(.*)"):n===":"?(r=a.indexOf("?",1),s=a.indexOf(".",1),l.push(a.substring(1,~r?r:~s?s:a.length)),u+=~r&&!~s?"(?:/([^/]+?))?":"/([^/]+?)",~s&&(u+=(~r?"?":"")+"\\"+a.substring(s))):u+="/"+a;return{keys:l,pattern:new RegExp("^"+u+(t?"(?=$|/)":"/?$"),"i")}}var a0={exports:{}},i0={};var D5;function qee(){if(D5)return i0;D5=1;var e=og();function t(h,g){return h===g&&(h!==0||1/h===1/g)||h!==h&&g!==g}var n=typeof Object.is=="function"?Object.is:t,r=e.useState,a=e.useEffect,s=e.useLayoutEffect,l=e.useDebugValue;function u(h,g){var y=g(),j=r({inst:{value:y,getSnapshot:g}}),v=j[0].inst,b=j[1];return s(function(){v.value=y,v.getSnapshot=g,d(v)&&b({inst:v})},[h,y,g]),a(function(){return d(v)&&b({inst:v}),h(function(){d(v)&&b({inst:v})})},[h]),l(y),y}function d(h){var g=h.getSnapshot;h=h.value;try{var y=g();return!n(h,y)}catch{return!0}}function f(h,g){return g()}var m=typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"?f:u;return i0.useSyncExternalStore=e.useSyncExternalStore!==void 0?e.useSyncExternalStore:m,i0}var R5;function Fee(){return R5||(R5=1,a0.exports=qee()),a0.exports}var Uee=Fee();const Vee=cg.useInsertionEffect,Hee=typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement<"u",nL=Hee?S.useLayoutEffect:S.useEffect,Gee=Vee||nL,GA=e=>{const t=S.useRef([e,(...n)=>t[0](...n)]).current;return Gee(()=>{t[0]=e}),t[1]},Wee="popstate",WA="pushState",KA="replaceState",Kee="hashchange",I5=[Wee,WA,KA,Kee],Yee=e=>{for(const t of I5)addEventListener(t,e);return()=>{for(const t of I5)removeEventListener(t,e)}},rL=(e,t)=>Uee.useSyncExternalStore(Yee,e,t),$5=()=>location.search,Xee=({ssrSearch:e}={})=>rL($5,e!=null?()=>e:$5),L5=()=>location.pathname,Qee=({ssrPath:e}={})=>rL(L5,e!=null?()=>e:L5),Zee=(e,{replace:t=!1,state:n=null}={})=>history[t?KA:WA](n,"",e),Jee=(e={})=>[Qee(e),Zee],B5=Symbol.for("wouter_v3");if(typeof history<"u"&&typeof window[B5]>"u"){for(const e of[WA,KA]){const t=history[e];history[e]=function(){const n=t.apply(this,arguments),r=new Event(e);return r.arguments=arguments,dispatchEvent(r),n}}Object.defineProperty(window,B5,{value:!0})}const ete=(e,t)=>t.toLowerCase().indexOf(e.toLowerCase())?"~"+t:t.slice(e.length)||"/",aL=(e="")=>e==="/"?"":e,tte=(e,t)=>e[0]==="~"?e.slice(1):aL(t)+e,nte=(e="",t)=>ete(lS(aL(e)),lS(t)),rte=e=>e[0]==="?"?e.slice(1):e,lS=e=>{try{return decodeURI(e)}catch{return e}},ate=e=>lS(rte(e)),iL={hook:Jee,searchHook:Xee,parser:zee,base:"",ssrPath:void 0,ssrSearch:void 0,ssrContext:void 0,hrefs:e=>e,aroundNav:(e,t,n)=>e(t,n)},sL=S.createContext(iL),ws=()=>S.useContext(sL),oL={},lL=S.createContext(oL),ite=()=>S.useContext(lL),If=e=>{const[t,n]=e.hook(e);return[nte(e.base,t),GA((r,a)=>e.aroundNav(n,tte(r,e.base),a))]},bt=()=>If(ws()),ste=()=>{const e=ws();return ate(e.searchHook(e))},YA=(e,t,n,r)=>{const{pattern:a,keys:s}=t instanceof RegExp?{keys:!1,pattern:t}:e(t||"*",r),l=a.exec(n)||[],[u,...d]=l;return u!==void 0?[!0,(()=>{const f=s!==!1?Object.fromEntries(s.map((h,g)=>[h,d[g]])):l.groups;let m={...d};return f&&Object.assign(m,f),m})(),...r?[u]:[]]:[!1,null]},$f=e=>YA(ws().parser,e,bt()[0]),cL=({children:e,...t})=>{const n=ws(),r=t.hook?iL:n;let a=r;const[s,l=t.ssrSearch??""]=t.ssrPath?.split("?")??[];s&&(t.ssrSearch=l,t.ssrPath=s),t.hrefs=t.hrefs??t.hook?.hrefs,t.searchHook=t.searchHook??t.hook?.searchHook;let u=S.useRef({}),d=u.current,f=d;for(let m in r){const h=m==="base"?r[m]+(t[m]??""):t[m]??r[m];d===f&&h!==f[m]&&(u.current=f={...f}),f[m]=h,(h!==r[m]||h!==a[m])&&(a=f)}return S.createElement(sL.Provider,{value:a,children:e})},z5=({children:e,component:t},n)=>t?S.createElement(t,{params:n}):typeof e=="function"?e(n):e,ote=e=>{let t=S.useRef(oL);const n=t.current;return t.current=Object.keys(e).length!==Object.keys(n).length||Object.entries(e).some(([r,a])=>a!==n[r])?e:n},Xe=({path:e,nest:t,match:n,...r})=>{const a=ws(),[s]=If(a),[l,u,d]=n??YA(a.parser,e,s,t),f=ote({...ite(),...u});if(!l)return null;const m=d?S.createElement(cL,{base:d},z5(r,f)):z5(r,f);return S.createElement(lL.Provider,{value:f,children:m})},Zl=S.forwardRef((e,t)=>{const n=ws(),[r,a]=If(n),{to:s="",href:l=s,onClick:u,asChild:d,children:f,className:m,replace:h,state:g,transition:y,...j}=e,v=GA(N=>{N.ctrlKey||N.metaKey||N.altKey||N.shiftKey||N.button!==0||(u?.(N),N.defaultPrevented||(N.preventDefault(),a(l,e)))}),b=n.hrefs(l[0]==="~"?l.slice(1):n.base+l,n);return d&&S.isValidElement(f)?S.cloneElement(f,{onClick:v,href:b}):S.createElement("a",{...j,onClick:v,href:b,className:m?.call?m(r===l):m,children:f,ref:t})}),uL=e=>Array.isArray(e)?e.flatMap(t=>uL(t&&t.type===S.Fragment?t.props.children:t)):[e],lte=({children:e,location:t})=>{const n=ws(),[r]=If(n);for(const a of uL(e)){let s=0;if(S.isValidElement(a)&&(s=YA(n.parser,a.props.path,t||r,a.props.nest))[0])return S.cloneElement(a,{match:s})}return null},cS=e=>{const{to:t,href:n=t}=e,r=ws(),[,a]=If(r),s=GA(()=>a(t||n,e)),{ssrContext:l}=r;return nL(()=>{s()},[]),l&&(l.redirectTo=t),null},XA=S.createContext({});function _g(e){const t=S.useRef(null);return t.current===null&&(t.current=e()),t.current}const cte=typeof window<"u",dL=cte?S.useLayoutEffect:S.useEffect,Eg=S.createContext(null);function QA(e,t){e.indexOf(t)===-1&&e.push(t)}function lc(e,t){const n=e.indexOf(t);n>-1&&e.splice(n,1)}const Ia=(e,t,n)=>n>t?t:n<e?e:n;let ZA=()=>{};const gs={},fL=e=>/^-?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(e),pL=e=>typeof e=="object"&&e!==null,hL=e=>/^0[^.\s]+$/u.test(e);function mL(e){let t;return()=>(t===void 0&&(t=e()),t)}const Dr=e=>e,Lf=(...e)=>e.reduce((t,n)=>r=>n(t(r))),cc=(e,t,n)=>{const r=t-e;return r?(n-e)/r:1};class JA{constructor(){this.subscriptions=[]}add(t){return QA(this.subscriptions,t),()=>lc(this.subscriptions,t)}notify(t,n,r){const a=this.subscriptions.length;if(a)if(a===1)this.subscriptions[0](t,n,r);else for(let s=0;s<a;s++){const l=this.subscriptions[s];l&&l(t,n,r)}}getSize(){return this.subscriptions.length}clear(){this.subscriptions.length=0}}const Xn=e=>e*1e3,Or=e=>e/1e3,xL=(e,t)=>t?e*(1e3/t):0,ute=(e,t,n)=>{const r=t-e;return((n-e)%r+r)%r+e},gL=(e,t,n)=>(((1-3*n+3*t)*e+(3*n-6*t))*e+3*t)*e,dte=1e-7,fte=12;function pte(e,t,n,r,a){let s,l,u=0;do l=t+(n-t)/2,s=gL(l,r,a)-e,s>0?n=l:t=l;while(Math.abs(s)>dte&&++u<fte);return l}function Bf(e,t,n,r){if(e===t&&n===r)return Dr;const a=s=>pte(s,0,1,e,n);return s=>s===0||s===1?s:gL(a(s),t,r)}const yL=e=>t=>t<=.5?e(2*t)/2:(2-e(2*(1-t)))/2,eC=e=>t=>1-e(1-t),vL=Bf(.33,1.53,.69,.99),tC=eC(vL),bL=yL(tC),jL=e=>e>=1?1:(e*=2)<1?.5*tC(e):.5*(2-Math.pow(2,-10*(e-1))),nC=e=>1-Math.sin(Math.acos(e)),wL=eC(nC),SL=yL(nC),hte=Bf(.42,0,1,1),mte=Bf(0,0,.58,1),NL=Bf(.42,0,.58,1),AL=e=>Array.isArray(e)&&typeof e[0]!="number";function CL(e,t){return AL(e)?e[ute(0,e.length,t)]:e}const _L=e=>Array.isArray(e)&&typeof e[0]=="number",xte={linear:Dr,easeIn:hte,easeInOut:NL,easeOut:mte,circIn:nC,circInOut:SL,circOut:wL,backIn:tC,backInOut:bL,backOut:vL,anticipate:jL},gte=e=>typeof e=="string",q5=e=>{if(_L(e)){ZA(e.length===4);const[t,n,r,a]=e;return Bf(t,n,r,a)}else if(gte(e))return xte[e];return e},jh=["setup","read","resolveKeyframes","preUpdate","update","preRender","render","postRender"];function yte(e,t){let n=new Set,r=new Set,a=!1,s=!1;const l=new WeakSet;let u={delta:0,timestamp:0,isProcessing:!1};function d(m){l.has(m)&&(f.schedule(m),e()),m(u)}const f={schedule:(m,h=!1,g=!1)=>{const j=g&&a?n:r;return h&&l.add(m),j.add(m),m},cancel:m=>{r.delete(m),l.delete(m)},process:m=>{if(u=m,a){s=!0;return}a=!0;const h=n;n=r,r=h,n.forEach(d),n.clear(),a=!1,s&&(s=!1,f.process(m))}};return f}const vte=40;function EL(e,t){let n=!1,r=!0;const a={delta:0,timestamp:0,isProcessing:!1},s=()=>n=!0,l=jh.reduce((_,T)=>(_[T]=yte(s),_),{}),{setup:u,read:d,resolveKeyframes:f,preUpdate:m,update:h,preRender:g,render:y,postRender:j}=l,v=()=>{const _=gs.useManualTiming,T=_?a.timestamp:performance.now();n=!1,_||(a.delta=r?1e3/60:Math.max(Math.min(T-a.timestamp,vte),1)),a.timestamp=T,a.isProcessing=!0,u.process(a),d.process(a),f.process(a),m.process(a),h.process(a),g.process(a),y.process(a),j.process(a),a.isProcessing=!1,n&&t&&(r=!1,e(v))},b=()=>{n=!0,r=!0,a.isProcessing||e(v)};return{schedule:jh.reduce((_,T)=>{const A=l[T];return _[T]=(k,O=!1,M=!1)=>(n||b(),A.schedule(k,O,M)),_},{}),cancel:_=>{for(let T=0;T<jh.length;T++)l[jh[T]].cancel(_)},state:a,steps:l}}const{schedule:St,cancel:ys,state:bn,steps:s0}=EL(typeof requestAnimationFrame<"u"?requestAnimationFrame:Dr,!0);let fm;function bte(){fm=void 0}const Bn={now:()=>(fm===void 0&&Bn.set(bn.isProcessing||gs.useManualTiming?bn.timestamp:performance.now()),fm),set:e=>{fm=e,queueMicrotask(bte)}},TL=e=>t=>typeof t=="string"&&t.startsWith(e),kL=TL("--"),jte=TL("var(--"),rC=e=>jte(e)?wte.test(e.split("/*")[0].trim()):!1,wte=/var\(--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)$/iu;function F5(e){return typeof e!="string"?!1:e.split("/*")[0].includes("var(--")}const Uc={test:e=>typeof e=="number",parse:parseFloat,transform:e=>e},Bd={...Uc,transform:e=>Ia(0,1,e)},wh={...Uc,default:1},Sd=e=>Math.round(e*1e5)/1e5,aC=/-?(?:\d+(?:\.\d+)?|\.\d+)/gu;function Ste(e){return e==null}const Nte=/^(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))$/iu,iC=(e,t)=>n=>!!(typeof n=="string"&&Nte.test(n)&&n.startsWith(e)||t&&!Ste(n)&&Object.prototype.hasOwnProperty.call(n,t)),OL=(e,t,n)=>r=>{if(typeof r!="string")return r;const[a,s,l,u]=r.match(aC);return{[e]:parseFloat(a),[t]:parseFloat(s),[n]:parseFloat(l),alpha:u!==void 0?parseFloat(u):1}},Ate=e=>Ia(0,255,e),o0={...Uc,transform:e=>Math.round(Ate(e))},ao={test:iC("rgb","red"),parse:OL("red","green","blue"),transform:({red:e,green:t,blue:n,alpha:r=1})=>"rgba("+o0.transform(e)+", "+o0.transform(t)+", "+o0.transform(n)+", "+Sd(Bd.transform(r))+")"};function Cte(e){let t="",n="",r="",a="";return e.length>5?(t=e.substring(1,3),n=e.substring(3,5),r=e.substring(5,7),a=e.substring(7,9)):(t=e.substring(1,2),n=e.substring(2,3),r=e.substring(3,4),a=e.substring(4,5),t+=t,n+=n,r+=r,a+=a),{red:parseInt(t,16),green:parseInt(n,16),blue:parseInt(r,16),alpha:a?parseInt(a,16)/255:1}}const uS={test:iC("#"),parse:Cte,transform:ao.transform},zf=e=>({test:t=>typeof t=="string"&&t.endsWith(e)&&t.split(" ").length===1,parse:parseFloat,transform:t=>`${t}${e}`}),ui=zf("deg"),Ta=zf("%"),Ee=zf("px"),_te=zf("vh"),Ete=zf("vw"),U5={...Ta,parse:e=>Ta.parse(e)/100,transform:e=>Ta.transform(e*100)},Ul={test:iC("hsl","hue"),parse:OL("hue","saturation","lightness"),transform:({hue:e,saturation:t,lightness:n,alpha:r=1})=>"hsla("+Math.round(e)+", "+Ta.transform(Sd(t))+", "+Ta.transform(Sd(n))+", "+Sd(Bd.transform(r))+")"},Yt={test:e=>ao.test(e)||uS.test(e)||Ul.test(e),parse:e=>ao.test(e)?ao.parse(e):Ul.test(e)?Ul.parse(e):uS.parse(e),transform:e=>typeof e=="string"?e:e.hasOwnProperty("red")?ao.transform(e):Ul.transform(e),getAnimatableNone:e=>{const t=Yt.parse(e);return t.alpha=0,Yt.transform(t)}},Tte=/(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))/giu;function kte(e){return isNaN(e)&&typeof e=="string"&&(e.match(aC)?.length||0)+(e.match(Tte)?.length||0)>0}const ML="number",PL="color",Ote="var",Mte="var(",V5="${}",Pte=/var\s*\(\s*--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)|#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\)|-?(?:\d+(?:\.\d+)?|\.\d+)/giu;function uc(e){const t=e.toString(),n=[],r={color:[],number:[],var:[]},a=[];let s=0;const u=t.replace(Pte,d=>(Yt.test(d)?(r.color.push(s),a.push(PL),n.push(Yt.parse(d))):d.startsWith(Mte)?(r.var.push(s),a.push(Ote),n.push(d)):(r.number.push(s),a.push(ML),n.push(parseFloat(d))),++s,V5)).split(V5);return{values:n,split:u,indexes:r,types:a}}function Dte(e){return uc(e).values}function DL({split:e,types:t}){const n=e.length;return r=>{let a="";for(let s=0;s<n;s++)if(a+=e[s],r[s]!==void 0){const l=t[s];l===ML?a+=Sd(r[s]):l===PL?a+=Yt.transform(r[s]):a+=r[s]}return a}}function Rte(e){return DL(uc(e))}const Ite=e=>typeof e=="number"?0:Yt.test(e)?Yt.getAnimatableNone(e):e,$te=(e,t)=>typeof e=="number"?t?.trim().endsWith("/")?e:0:Ite(e);function Lte(e){const t=uc(e);return DL(t)(t.values.map((r,a)=>$te(r,t.split[a])))}const ia={test:kte,parse:Dte,createTransformer:Rte,getAnimatableNone:Lte};function l0(e,t,n){return n<0&&(n+=1),n>1&&(n-=1),n<1/6?e+(t-e)*6*n:n<1/2?t:n<2/3?e+(t-e)*(2/3-n)*6:e}function Bte({hue:e,saturation:t,lightness:n,alpha:r}){e/=360,t/=100,n/=100;let a=0,s=0,l=0;if(!t)a=s=l=n;else{const u=n<.5?n*(1+t):n+t-n*t,d=2*n-u;a=l0(d,u,e+1/3),s=l0(d,u,e),l=l0(d,u,e-1/3)}return{red:Math.round(a*255),green:Math.round(s*255),blue:Math.round(l*255),alpha:r}}function Rm(e,t){return n=>n>0?t:e}const yt=(e,t,n)=>e+(t-e)*n,c0=(e,t,n)=>{const r=e*e,a=n*(t*t-r)+r;return a<0?0:Math.sqrt(a)},zte=[uS,ao,Ul],qte=e=>zte.find(t=>t.test(e));function H5(e){const t=qte(e);if(!t)return!1;let n=t.parse(e);return t===Ul&&(n=Bte(n)),n}const G5=(e,t)=>{const n=H5(e),r=H5(t);if(!n||!r)return Rm(e,t);const a={...n};return s=>(a.red=c0(n.red,r.red,s),a.green=c0(n.green,r.green,s),a.blue=c0(n.blue,r.blue,s),a.alpha=yt(n.alpha,r.alpha,s),ao.transform(a))},dS=new Set(["none","hidden"]);function Fte(e,t){return dS.has(e)?n=>n<=0?e:t:n=>n>=1?t:e}function Ute(e,t){return n=>yt(e,t,n)}function sC(e){return typeof e=="number"?Ute:typeof e=="string"?rC(e)?Rm:Yt.test(e)?G5:Gte:Array.isArray(e)?RL:typeof e=="object"?Yt.test(e)?G5:Vte:Rm}function RL(e,t){const n=[...e],r=n.length,a=e.map((s,l)=>sC(s)(s,t[l]));return s=>{for(let l=0;l<r;l++)n[l]=a[l](s);return n}}function Vte(e,t){const n={...e,...t},r={};for(const a in n)e[a]!==void 0&&t[a]!==void 0&&(r[a]=sC(e[a])(e[a],t[a]));return a=>{for(const s in r)n[s]=r[s](a);return n}}function Hte(e,t){const n=[],r={color:0,var:0,number:0};for(let a=0;a<t.values.length;a++){const s=t.types[a],l=e.indexes[s][r[s]],u=e.values[l]??0;n[a]=u,r[s]++}return n}const Gte=(e,t)=>{const n=ia.createTransformer(t),r=uc(e),a=uc(t);return r.indexes.var.length===a.indexes.var.length&&r.indexes.color.length===a.indexes.color.length&&r.indexes.number.length>=a.indexes.number.length?dS.has(e)&&!a.values.length||dS.has(t)&&!r.values.length?Fte(e,t):Lf(RL(Hte(r,a),a.values),n):Rm(e,t)};function IL(e,t,n){return typeof e=="number"&&typeof t=="number"&&typeof n=="number"?yt(e,t,n):sC(e)(e,t)}const Wte=e=>{const t=({timestamp:n})=>e(n);return{start:(n=!0)=>St.update(t,n),stop:()=>ys(t),now:()=>bn.isProcessing?bn.timestamp:Bn.now()}},$L=(e,t,n=10)=>{let r="";const a=Math.max(Math.round(t/n),2);for(let s=0;s<a;s++)r+=Math.round(e(s/(a-1))*1e4)/1e4+", ";return`linear(${r.substring(0,r.length-2)})`},Im=2e4;function oC(e){let t=0;const n=50;let r=e.next(t);for(;!r.done&&t<Im;)t+=n,r=e.next(t);return t>=Im?1/0:t}function LL(e,t=100,n){const r=n({...e,keyframes:[0,t]}),a=Math.min(oC(r),Im);return{type:"keyframes",ease:s=>r.next(a*s).value/t,duration:Or(a)}}const Bt={stiffness:100,damping:10,mass:1,velocity:0,duration:800,bounce:.3,visualDuration:.3,restSpeed:{granular:.01,default:2},restDelta:{granular:.005,default:.5},minDuration:.01,maxDuration:10,minDamping:.05,maxDamping:1};function fS(e,t){return e*Math.sqrt(1-t*t)}const Kte=12;function Yte(e,t,n){let r=n;for(let a=1;a<Kte;a++)r=r-e(r)/t(r);return r}const u0=.001;function Xte({duration:e=Bt.duration,bounce:t=Bt.bounce,velocity:n=Bt.velocity,mass:r=Bt.mass}){let a,s,l=1-t;l=Ia(Bt.minDamping,Bt.maxDamping,l),e=Ia(Bt.minDuration,Bt.maxDuration,Or(e)),l<1?(a=f=>{const m=f*l,h=m*e,g=m-n,y=fS(f,l),j=Math.exp(-h);return u0-g/y*j},s=f=>{const h=f*l*e,g=h*n+n,y=Math.pow(l,2)*Math.pow(f,2)*e,j=Math.exp(-h),v=fS(Math.pow(f,2),l);return(-a(f)+u0>0?-1:1)*((g-y)*j)/v}):(a=f=>{const m=Math.exp(-f*e),h=(f-n)*e+1;return-u0+m*h},s=f=>{const m=Math.exp(-f*e),h=(n-f)*(e*e);return m*h});const u=5/e,d=Yte(a,s,u);if(e=Xn(e),isNaN(d))return{stiffness:Bt.stiffness,damping:Bt.damping,duration:e};{const f=Math.pow(d,2)*r;return{stiffness:f,damping:l*2*Math.sqrt(r*f),duration:e}}}const Qte=["duration","bounce"],Zte=["stiffness","damping","mass"];function W5(e,t){return t.some(n=>e[n]!==void 0)}function Jte(e){let t={velocity:Bt.velocity,stiffness:Bt.stiffness,damping:Bt.damping,mass:Bt.mass,isResolvedFromDuration:!1,...e};if(!W5(e,Zte)&&W5(e,Qte))if(t.velocity=0,e.visualDuration){const n=e.visualDuration,r=2*Math.PI/(n*1.2),a=r*r,s=2*Ia(.05,1,1-(e.bounce||0))*Math.sqrt(a);t={...t,mass:Bt.mass,stiffness:a,damping:s}}else{const n=Xte({...e,velocity:0});t={...t,...n,mass:Bt.mass},t.isResolvedFromDuration=!0}return t}function zd(e=Bt.visualDuration,t=Bt.bounce){const n=typeof e!="object"?{visualDuration:e,keyframes:[0,1],bounce:t}:e;let{restSpeed:r,restDelta:a}=n;const s=n.keyframes[0],l=n.keyframes[n.keyframes.length-1],u={done:!1,value:s},{stiffness:d,damping:f,mass:m,duration:h,velocity:g,isResolvedFromDuration:y}=Jte({...n,velocity:-Or(n.velocity||0)}),j=g||0,v=f/(2*Math.sqrt(d*m)),b=l-s,N=Or(Math.sqrt(d/m)),E=Math.abs(b)<5;r||(r=E?Bt.restSpeed.granular:Bt.restSpeed.default),a||(a=E?Bt.restDelta.granular:Bt.restDelta.default);let _,T,A,k,O,M;if(v<1)A=fS(N,v),k=(j+v*N*b)/A,_=z=>{const L=Math.exp(-v*N*z);return l-L*(k*Math.sin(A*z)+b*Math.cos(A*z))},O=v*N*k+b*A,M=v*N*b-k*A,T=z=>Math.exp(-v*N*z)*(O*Math.sin(A*z)+M*Math.cos(A*z));else if(v===1){_=L=>l-Math.exp(-N*L)*(b+(j+N*b)*L);const z=j+N*b;T=L=>Math.exp(-N*L)*(N*z*L-j)}else{const z=N*Math.sqrt(v*v-1);_=U=>{const H=Math.exp(-v*N*U),I=Math.min(z*U,300);return l-H*((j+v*N*b)*Math.sinh(I)+z*b*Math.cosh(I))/z};const L=(j+v*N*b)/z,q=v*N*L-b*z,B=v*N*b-L*z;T=U=>{const H=Math.exp(-v*N*U),I=Math.min(z*U,300);return H*(q*Math.sinh(I)+B*Math.cosh(I))}}const D={calculatedDuration:y&&h||null,velocity:z=>Xn(T(z)),next:z=>{if(!y&&v<1){const q=Math.exp(-v*N*z),B=Math.sin(A*z),U=Math.cos(A*z),H=l-q*(k*B+b*U),I=Xn(q*(O*B+M*U));return u.done=Math.abs(I)<=r&&Math.abs(l-H)<=a,u.value=u.done?l:H,u}const L=_(z);if(y)u.done=z>=h;else{const q=Xn(T(z));u.done=Math.abs(q)<=r&&Math.abs(l-L)<=a}return u.value=u.done?l:L,u},toString:()=>{const z=Math.min(oC(D),Im),L=$L(q=>D.next(z*q).value,z,30);return z+"ms "+L},toTransition:()=>{}};return D}zd.applyToOptions=e=>{const t=LL(e,100,zd);return e.ease=t.ease,e.duration=Xn(t.duration),e.type="keyframes",e};const ene=5;function BL(e,t,n){const r=Math.max(t-ene,0);return xL(n-e(r),t-r)}function pS({keyframes:e,velocity:t=0,power:n=.8,timeConstant:r=325,bounceDamping:a=10,bounceStiffness:s=500,modifyTarget:l,min:u,max:d,restDelta:f=.5,restSpeed:m}){const h=e[0],g={done:!1,value:h},y=M=>u!==void 0&&M<u||d!==void 0&&M>d,j=M=>u===void 0?d:d===void 0||Math.abs(u-M)<Math.abs(d-M)?u:d;let v=n*t;const b=h+v,N=l===void 0?b:l(b);N!==b&&(v=N-h);const E=M=>-v*Math.exp(-M/r),_=M=>N+E(M),T=M=>{const D=E(M),z=_(M);g.done=Math.abs(D)<=f,g.value=g.done?N:z};let A,k;const O=M=>{y(g.value)&&(A=M,k=zd({keyframes:[g.value,j(g.value)],velocity:BL(_,M,g.value),damping:a,stiffness:s,restDelta:f,restSpeed:m}))};return O(0),{calculatedDuration:null,next:M=>{let D=!1;return!k&&A===void 0&&(D=!0,T(M),O(M)),A!==void 0&&M>=A?k.next(M-A):(!D&&T(M),g)}}}function tne(e,t,n){const r=[],a=n||gs.mix||IL,s=e.length-1;for(let l=0;l<s;l++){let u=a(e[l],e[l+1]);if(t){const d=Array.isArray(t)?t[l]||Dr:t;u=Lf(d,u)}r.push(u)}return r}function nne(e,t,{clamp:n=!0,ease:r,mixer:a}={}){const s=e.length;if(ZA(s===t.length),s===1)return()=>t[0];if(s===2&&t[0]===t[1])return()=>t[1];const l=e[0]===e[1];e[0]>e[s-1]&&(e=[...e].reverse(),t=[...t].reverse());const u=tne(t,r,a),d=u.length,f=m=>{if(l&&m<e[0])return t[0];let h=0;if(d>1)for(;h<e.length-2&&!(m<e[h+1]);h++);const g=cc(e[h],e[h+1],m);return u[h](g)};return n?m=>f(Ia(e[0],e[s-1],m)):f}function zL(e,t){const n=e[e.length-1];for(let r=1;r<=t;r++){const a=cc(0,t,r);e.push(yt(n,1,a))}}function qL(e){const t=[0];return zL(t,e.length-1),t}function rne(e,t){return e.map(n=>n*t)}function ane(e,t){return e.map(()=>t||NL).splice(0,e.length-1)}function Nd({duration:e=300,keyframes:t,times:n,ease:r="easeInOut"}){const a=AL(r)?r.map(q5):q5(r),s={done:!1,value:t[0]},l=rne(n&&n.length===t.length?n:qL(t),e),u=nne(l,t,{ease:Array.isArray(a)?a:ane(t,a)});return{calculatedDuration:e,next:d=>(s.value=u(d),s.done=d>=e,s)}}const ine=e=>e!==null;function Tg(e,{repeat:t,repeatType:n="loop"},r,a=1){const s=e.filter(ine),u=a<0||t&&n!=="loop"&&t%2===1?0:s.length-1;return!u||r===void 0?s[u]:r}const sne={decay:pS,inertia:pS,tween:Nd,keyframes:Nd,spring:zd};function FL(e){typeof e.type=="string"&&(e.type=sne[e.type])}class lC{constructor(){this.updateFinished()}get finished(){return this._finished}updateFinished(){this._finished=new Promise(t=>{this.resolve=t})}notifyFinished(){this.resolve()}then(t,n){return this.finished.then(t,n)}}const one=e=>e/100;class $m extends lC{constructor(t){super(),this.state="idle",this.startTime=null,this.isStopped=!1,this.currentTime=0,this.holdTime=null,this.playbackSpeed=1,this.delayState={done:!1,value:void 0},this.stop=()=>{const{motionValue:n}=this.options;n&&n.updatedAt!==Bn.now()&&this.tick(Bn.now()),this.isStopped=!0,this.state!=="idle"&&(this.teardown(),this.options.onStop?.())},this.options=t,this.initAnimation(),this.play(),t.autoplay===!1&&this.pause()}initAnimation(){const{options:t}=this;FL(t);const{type:n=Nd,repeat:r=0,repeatDelay:a=0,repeatType:s,velocity:l=0}=t;let{keyframes:u}=t;const d=n||Nd;d!==Nd&&typeof u[0]!="number"&&(this.mixKeyframes=Lf(one,IL(u[0],u[1])),u=[0,100]);const f=d({...t,keyframes:u});s==="mirror"&&(this.mirroredGenerator=d({...t,keyframes:[...u].reverse(),velocity:-l})),f.calculatedDuration===null&&(f.calculatedDuration=oC(f));const{calculatedDuration:m}=f;this.calculatedDuration=m,this.resolvedDuration=m+a,this.totalDuration=this.resolvedDuration*(r+1)-a,this.generator=f}updateTime(t){const n=Math.round(t-this.startTime)*this.playbackSpeed;this.holdTime!==null?this.currentTime=this.holdTime:this.currentTime=n}tick(t,n=!1){const{generator:r,totalDuration:a,mixKeyframes:s,mirroredGenerator:l,resolvedDuration:u,calculatedDuration:d}=this;if(this.startTime===null)return r.next(0);const{delay:f=0,keyframes:m,repeat:h,repeatType:g,repeatDelay:y,type:j,onUpdate:v,finalKeyframe:b}=this.options;this.speed>0?this.startTime=Math.min(this.startTime,t):this.speed<0&&(this.startTime=Math.min(t-a/this.speed,this.startTime)),n?this.currentTime=t:this.updateTime(t);const N=this.currentTime-f*(this.playbackSpeed>=0?1:-1),E=this.playbackSpeed>=0?N<0:N>a;this.currentTime=Math.max(N,0),this.state==="finished"&&this.holdTime===null&&(this.currentTime=a);let _=this.currentTime,T=r;if(h){const M=Math.min(this.currentTime,a)/u;let D=Math.floor(M),z=M%1;!z&&M>=1&&(z=1),z===1&&D--,D=Math.min(D,h+1),D%2&&(g==="reverse"?(z=1-z,y&&(z-=y/u)):g==="mirror"&&(T=l)),_=Ia(0,1,z)*u}let A;E?(this.delayState.value=m[0],A=this.delayState):A=T.next(_),s&&!E&&(A.value=s(A.value));let{done:k}=A;!E&&d!==null&&(k=this.playbackSpeed>=0?this.currentTime>=a:this.currentTime<=0);const O=this.holdTime===null&&(this.state==="finished"||this.state==="running"&&k);return O&&j!==pS&&(A.value=Tg(m,this.options,b,this.speed)),v&&v(A.value),O&&this.finish(),A}then(t,n){return this.finished.then(t,n)}get duration(){return Or(this.calculatedDuration)}get iterationDuration(){const{delay:t=0}=this.options||{};return this.duration+Or(t)}get time(){return Or(this.currentTime)}set time(t){t=Xn(t),this.currentTime=t,this.startTime===null||this.holdTime!==null||this.playbackSpeed===0?this.holdTime=t:this.driver&&(this.startTime=this.driver.now()-t/this.playbackSpeed),this.driver?this.driver.start(!1):(this.startTime=0,this.state="paused",this.holdTime=t,this.tick(t))}getGeneratorVelocity(){const t=this.currentTime;if(t<=0)return this.options.velocity||0;if(this.generator.velocity)return this.generator.velocity(t);const n=this.generator.next(t).value;return BL(r=>this.generator.next(r).value,t,n)}get speed(){return this.playbackSpeed}set speed(t){const n=this.playbackSpeed!==t;n&&this.driver&&this.updateTime(Bn.now()),this.playbackSpeed=t,n&&this.driver&&(this.time=Or(this.currentTime))}play(){if(this.isStopped)return;const{driver:t=Wte,startTime:n}=this.options;this.driver||(this.driver=t(a=>this.tick(a))),this.options.onPlay?.();const r=this.driver.now();this.state==="finished"?(this.updateFinished(),this.startTime=r):this.holdTime!==null?this.startTime=r-this.holdTime:this.startTime||(this.startTime=n??r),this.state==="finished"&&this.speed<0&&(this.startTime+=this.calculatedDuration),this.holdTime=null,this.state="running",this.driver.start()}pause(){this.state="paused",this.updateTime(Bn.now()),this.holdTime=this.currentTime}complete(){this.state!=="running"&&this.play(),this.state="finished",this.holdTime=null}finish(){this.notifyFinished(),this.teardown(),this.state="finished",this.options.onComplete?.()}cancel(){this.holdTime=null,this.startTime=0,this.tick(0),this.teardown(),this.options.onCancel?.()}teardown(){this.state="idle",this.stopDriver(),this.startTime=this.holdTime=null}stopDriver(){this.driver&&(this.driver.stop(),this.driver=void 0)}sample(t){return this.startTime=0,this.tick(t,!0)}attachTimeline(t){return this.options.allowFlatten&&(this.options.type="keyframes",this.options.ease="linear",this.initAnimation()),this.driver?.stop(),t.observe(this)}}function lne(e){for(let t=1;t<e.length;t++)e[t]??(e[t]=e[t-1])}const io=e=>e*180/Math.PI,hS=e=>{const t=io(Math.atan2(e[1],e[0]));return mS(t)},cne={x:4,y:5,translateX:4,translateY:5,scaleX:0,scaleY:3,scale:e=>(Math.abs(e[0])+Math.abs(e[3]))/2,rotate:hS,rotateZ:hS,skewX:e=>io(Math.atan(e[1])),skewY:e=>io(Math.atan(e[2])),skew:e=>(Math.abs(e[1])+Math.abs(e[2]))/2},mS=e=>(e=e%360,e<0&&(e+=360),e),K5=hS,Y5=e=>Math.sqrt(e[0]*e[0]+e[1]*e[1]),X5=e=>Math.sqrt(e[4]*e[4]+e[5]*e[5]),une={x:12,y:13,z:14,translateX:12,translateY:13,translateZ:14,scaleX:Y5,scaleY:X5,scale:e=>(Y5(e)+X5(e))/2,rotateX:e=>mS(io(Math.atan2(e[6],e[5]))),rotateY:e=>mS(io(Math.atan2(-e[2],e[0]))),rotateZ:K5,rotate:K5,skewX:e=>io(Math.atan(e[4])),skewY:e=>io(Math.atan(e[1])),skew:e=>(Math.abs(e[1])+Math.abs(e[4]))/2};function xS(e){return e.includes("scale")?1:0}function gS(e,t){if(!e||e==="none")return xS(t);const n=e.match(/^matrix3d\(([-\d.e\s,]+)\)$/u);let r,a;if(n)r=une,a=n;else{const u=e.match(/^matrix\(([-\d.e\s,]+)\)$/u);r=cne,a=u}if(!a)return xS(t);const s=r[t],l=a[1].split(",").map(fne);return typeof s=="function"?s(l):l[s]}const dne=(e,t)=>{const{transform:n="none"}=getComputedStyle(e);return gS(n,t)};function fne(e){return parseFloat(e.trim())}const Vc=["transformPerspective","x","y","z","translateX","translateY","translateZ","scale","scaleX","scaleY","rotate","rotateX","rotateY","rotateZ","skew","skewX","skewY"],Hc=new Set([...Vc,"pathRotation"]),Q5=e=>e===Uc||e===Ee,pne=new Set(["x","y","z"]),hne=Vc.filter(e=>!pne.has(e));function mne(e){const t=[];return hne.forEach(n=>{const r=e.getValue(n);r!==void 0&&(t.push([n,r.get()]),r.set(n.startsWith("scale")?1:0))}),t}const cs={width:({x:e},{paddingLeft:t="0",paddingRight:n="0",boxSizing:r})=>{const a=e.max-e.min;return r==="border-box"?a:a-parseFloat(t)-parseFloat(n)},height:({y:e},{paddingTop:t="0",paddingBottom:n="0",boxSizing:r})=>{const a=e.max-e.min;return r==="border-box"?a:a-parseFloat(t)-parseFloat(n)},top:(e,{top:t})=>parseFloat(t),left:(e,{left:t})=>parseFloat(t),bottom:({y:e},{top:t})=>parseFloat(t)+(e.max-e.min),right:({x:e},{left:t})=>parseFloat(t)+(e.max-e.min),x:(e,{transform:t})=>gS(t,"x"),y:(e,{transform:t})=>gS(t,"y")};cs.translateX=cs.x;cs.translateY=cs.y;const fo=new Set;let yS=!1,vS=!1,bS=!1;function UL(){if(vS){const e=Array.from(fo).filter(r=>r.needsMeasurement),t=new Set(e.map(r=>r.element)),n=new Map;t.forEach(r=>{const a=mne(r);a.length&&(n.set(r,a),r.render())}),e.forEach(r=>r.measureInitialState()),t.forEach(r=>{r.render();const a=n.get(r);a&&a.forEach(([s,l])=>{r.getValue(s)?.set(l)})}),e.forEach(r=>r.measureEndState()),e.forEach(r=>{r.suspendedScrollY!==void 0&&window.scrollTo(0,r.suspendedScrollY)})}vS=!1,yS=!1,fo.forEach(e=>e.complete(bS)),fo.clear()}function VL(){fo.forEach(e=>{e.readKeyframes(),e.needsMeasurement&&(vS=!0)})}function xne(){bS=!0,VL(),UL(),bS=!1}class cC{constructor(t,n,r,a,s,l=!1){this.state="pending",this.isAsync=!1,this.needsMeasurement=!1,this.unresolvedKeyframes=[...t],this.onComplete=n,this.name=r,this.motionValue=a,this.element=s,this.isAsync=l}scheduleResolve(){this.state="scheduled",this.isAsync?(fo.add(this),yS||(yS=!0,St.read(VL),St.resolveKeyframes(UL))):(this.readKeyframes(),this.complete())}readKeyframes(){const{unresolvedKeyframes:t,name:n,element:r,motionValue:a}=this;if(t[0]===null){const s=a?.get(),l=t[t.length-1];if(s!==void 0)t[0]=s;else if(r&&n){const u=r.readValue(n,l);u!=null&&(t[0]=u)}t[0]===void 0&&(t[0]=l),a&&s===void 0&&a.set(t[0])}lne(t)}setFinalKeyframe(){}measureInitialState(){}renderEndStyles(){}measureEndState(){}complete(t=!1){this.state="complete",this.onComplete(this.unresolvedKeyframes,this.finalKeyframe,t),fo.delete(this)}cancel(){this.state==="scheduled"&&(fo.delete(this),this.state="pending")}resume(){this.state==="pending"&&this.scheduleResolve()}}const gne=e=>e.startsWith("--");function HL(e,t,n){gne(t)?e.style.setProperty(t,n):e.style[t]=n}const yne={};function GL(e,t){const n=mL(e);return()=>yne[t]??n()}const vne=GL(()=>window.ScrollTimeline!==void 0,"scrollTimeline"),WL=GL(()=>{try{document.createElement("div").animate({opacity:0},{easing:"linear(0, 1)"})}catch{return!1}return!0},"linearEasing"),gd=([e,t,n,r])=>`cubic-bezier(${e}, ${t}, ${n}, ${r})`,Z5={linear:"linear",ease:"ease",easeIn:"ease-in",easeOut:"ease-out",easeInOut:"ease-in-out",circIn:gd([0,.65,.55,1]),circOut:gd([.55,0,1,.45]),backIn:gd([.31,.01,.66,-.59]),backOut:gd([.33,1.53,.69,.99])};function KL(e,t){if(e)return typeof e=="function"?WL()?$L(e,t):"ease-out":_L(e)?gd(e):Array.isArray(e)?e.map(n=>KL(n,t)||Z5.easeOut):Z5[e]}function bne(e,t,n,{delay:r=0,duration:a=300,repeat:s=0,repeatType:l="loop",ease:u="easeOut",times:d}={},f=void 0){const m={[t]:n};d&&(m.offset=d);const h=KL(u,a);Array.isArray(h)&&(m.easing=h);const g={delay:r,duration:a,easing:Array.isArray(h)?"linear":h,fill:"both",iterations:s+1,direction:l==="reverse"?"alternate":"normal"};return f&&(g.pseudoElement=f),e.animate(m,g)}function uC(e){return typeof e=="function"&&"applyToOptions"in e}function jne({type:e,...t}){return uC(e)&&WL()?e.applyToOptions(t):(t.duration??(t.duration=300),t.ease??(t.ease="easeOut"),t)}class YL extends lC{constructor(t){if(super(),this.finishedTime=null,this.isStopped=!1,this.manualStartTime=null,!t)return;const{element:n,name:r,keyframes:a,pseudoElement:s,allowFlatten:l=!1,finalKeyframe:u,onComplete:d}=t;this.isPseudoElement=!!s,this.allowFlatten=l,this.options=t,ZA(typeof t.type!="string");const f=jne(t);this.animation=bne(n,r,a,f,s),f.autoplay===!1&&this.animation.pause(),this.animation.onfinish=()=>{if(this.finishedTime=this.time,!s){const m=Tg(a,this.options,u,this.speed);this.updateMotionValue&&this.updateMotionValue(m),HL(n,r,m),this.animation.cancel()}d?.(),this.notifyFinished()}}play(){this.isStopped||(this.manualStartTime=null,this.animation.play(),this.state==="finished"&&this.updateFinished())}pause(){this.animation.pause()}complete(){this.animation.finish?.()}cancel(){try{this.animation.cancel()}catch{}}stop(){if(this.isStopped)return;this.isStopped=!0;const{state:t}=this;t==="idle"||t==="finished"||(this.updateMotionValue?this.updateMotionValue():this.commitStyles(),this.isPseudoElement||this.cancel())}commitStyles(){const t=this.options?.element;!this.isPseudoElement&&t?.isConnected&&this.animation.commitStyles?.()}get duration(){const t=this.animation.effect?.getComputedTiming?.().duration||0;return Or(Number(t))}get iterationDuration(){const{delay:t=0}=this.options||{};return this.duration+Or(t)}get time(){return Or(Number(this.animation.currentTime)||0)}set time(t){const n=this.finishedTime!==null;this.manualStartTime=null,this.finishedTime=null,this.animation.currentTime=Xn(t),n&&this.animation.pause()}get speed(){return this.animation.playbackRate}set speed(t){t<0&&(this.finishedTime=null),this.animation.playbackRate=t}get state(){return this.finishedTime!==null?"finished":this.animation.playState}get startTime(){return this.manualStartTime??Number(this.animation.startTime)}set startTime(t){this.manualStartTime=this.animation.startTime=t}attachTimeline({timeline:t,rangeStart:n,rangeEnd:r,observe:a}){return this.allowFlatten&&this.animation.effect?.updateTiming({easing:"linear"}),this.animation.onfinish=null,t&&vne()?(this.animation.timeline=t,n&&(this.animation.rangeStart=n),r&&(this.animation.rangeEnd=r),Dr):a(this)}}const XL={anticipate:jL,backInOut:bL,circInOut:SL};function wne(e){return e in XL}function Sne(e){typeof e.ease=="string"&&wne(e.ease)&&(e.ease=XL[e.ease])}const d0=10;class Nne extends YL{constructor(t){Sne(t),FL(t),super(t),t.startTime!==void 0&&t.autoplay!==!1&&(this.startTime=t.startTime),this.options=t}updateMotionValue(t){const{motionValue:n,onUpdate:r,onComplete:a,element:s,...l}=this.options;if(!n)return;if(t!==void 0){n.set(t);return}const u=new $m({...l,autoplay:!1}),d=Math.max(d0,Bn.now()-this.startTime),f=Ia(0,d0,d-d0),m=u.sample(d).value,{name:h}=this.options;s&&h&&HL(s,h,m),n.setWithVelocity(u.sample(Math.max(0,d-f)).value,m,f),u.stop()}}const J5=(e,t)=>t==="zIndex"?!1:!!(typeof e=="number"||Array.isArray(e)||typeof e=="string"&&(ia.test(e)||e==="0")&&!e.startsWith("url("));function Ane(e){const t=e[0];if(e.length===1)return!0;for(let n=0;n<e.length;n++)if(e[n]!==t)return!0}function Cne(e,t,n,r){const a=e[0];if(a===null)return!1;if(t==="display"||t==="visibility")return!0;const s=e[e.length-1],l=J5(a,t),u=J5(s,t);return!l||!u?!1:Ane(e)||(n==="spring"||uC(n))&&r}function jS(e){e.duration=0,e.type="keyframes"}const QL=new Set(["opacity","clipPath","filter","transform"]),_ne=/^(?:oklch|oklab|lab|lch|color|color-mix|light-dark)\(/;function Ene(e){for(let t=0;t<e.length;t++)if(typeof e[t]=="string"&&_ne.test(e[t]))return!0;return!1}const Tne=new Set(["color","backgroundColor","outlineColor","fill","stroke","borderColor","borderTopColor","borderRightColor","borderBottomColor","borderLeftColor"]),kne=mL(()=>Object.hasOwnProperty.call(Element.prototype,"animate"));function One(e){const{motionValue:t,name:n,repeatDelay:r,repeatType:a,damping:s,type:l,keyframes:u}=e;if(!(t?.owner?.current instanceof HTMLElement))return!1;const{onUpdate:f,transformTemplate:m}=t.owner.getProps();return kne()&&n&&(QL.has(n)||Tne.has(n)&&Ene(u))&&(n!=="transform"||!m)&&!f&&!r&&a!=="mirror"&&s!==0&&l!=="inertia"}const Mne=40;class Pne extends lC{constructor({autoplay:t=!0,delay:n=0,type:r="keyframes",repeat:a=0,repeatDelay:s=0,repeatType:l="loop",keyframes:u,name:d,motionValue:f,element:m,...h}){super(),this.stop=()=>{this._animation&&(this._animation.stop(),this.stopTimeline?.()),this.keyframeResolver?.cancel()},this.createdAt=Bn.now();const g={autoplay:t,delay:n,type:r,repeat:a,repeatDelay:s,repeatType:l,name:d,motionValue:f,element:m,...h},y=m?.KeyframeResolver||cC;this.keyframeResolver=new y(u,(j,v,b)=>this.onKeyframesResolved(j,v,g,!b),d,f,m),this.keyframeResolver?.scheduleResolve()}onKeyframesResolved(t,n,r,a){this.keyframeResolver=void 0;const{name:s,type:l,velocity:u,delay:d,isHandoff:f,onUpdate:m}=r;this.resolvedAt=Bn.now();let h=!0;Cne(t,s,l,u)||(h=!1,(gs.instantAnimations||!d)&&m?.(Tg(t,r,n)),t[0]=t[t.length-1],jS(r),r.repeat=0);const y={startTime:a?this.resolvedAt?this.resolvedAt-this.createdAt>Mne?this.resolvedAt:this.createdAt:this.createdAt:void 0,finalKeyframe:n,...r,keyframes:t},j=h&&!f&&One(y),v=y.motionValue?.owner?.current;let b;if(j)try{b=new Nne({...y,element:v})}catch{b=new $m(y)}else b=new $m(y);b.finished.then(()=>{this.notifyFinished()}).catch(Dr),this.pendingTimeline&&(this.stopTimeline=b.attachTimeline(this.pendingTimeline),this.pendingTimeline=void 0),this._animation=b}get finished(){return this._animation?this.animation.finished:this._finished}then(t,n){return this.finished.finally(t).then(()=>{})}get animation(){return this._animation||(this.keyframeResolver?.resume(),xne()),this._animation}get duration(){return this.animation.duration}get iterationDuration(){return this.animation.iterationDuration}get time(){return this.animation.time}set time(t){this.animation.time=t}get speed(){return this.animation.speed}get state(){return this.animation.state}set speed(t){this.animation.speed=t}get startTime(){return this.animation.startTime}attachTimeline(t){return this._animation?this.stopTimeline=this.animation.attachTimeline(t):this.pendingTimeline=t,()=>this.stop()}play(){this.animation.play()}pause(){this.animation.pause()}complete(){this.animation.complete()}cancel(){this._animation&&this.animation.cancel(),this.keyframeResolver?.cancel()}}class Dne{constructor(t){this.stop=()=>this.runAll("stop"),this.animations=t.filter(Boolean)}get finished(){return Promise.all(this.animations.map(t=>t.finished))}getAll(t){return this.animations[0][t]}setAll(t,n){for(let r=0;r<this.animations.length;r++)this.animations[r][t]=n}attachTimeline(t){const n=this.animations.map(r=>r.attachTimeline(t));return()=>{n.forEach((r,a)=>{r&&r(),this.animations[a].stop()})}}get time(){return this.getAll("time")}set time(t){this.setAll("time",t)}get speed(){return this.getAll("speed")}set speed(t){this.setAll("speed",t)}get state(){return this.getAll("state")}get startTime(){return this.getAll("startTime")}get duration(){return e3(this.animations,"duration")}get iterationDuration(){return e3(this.animations,"iterationDuration")}runAll(t){this.animations.forEach(n=>n[t]())}play(){this.runAll("play")}pause(){this.runAll("pause")}cancel(){this.runAll("cancel")}complete(){this.runAll("complete")}}function e3(e,t){let n=0;for(let r=0;r<e.length;r++){const a=e[r][t];a!==null&&a>n&&(n=a)}return n}class Rne extends Dne{then(t,n){return this.finished.finally(t).then(()=>{})}}function ZL(e,t,n,r=0,a=1){const s=Array.from(e).sort((f,m)=>f.sortNodePosition(m)).indexOf(t),l=e.size,u=(l-1)*r;return typeof n=="function"?n(s,l):a===1?s*r:u-s*r}const t3=30,Ine=e=>!isNaN(parseFloat(e));class $ne{constructor(t,n={}){this.canTrackVelocity=null,this.events={},this.updateAndNotify=r=>{const a=Bn.now();if(this.updatedAt!==a&&this.setPrevFrameValue(),this.prev=this.current,this.setCurrent(r),this.current!==this.prev&&(this.events.change?.notify(this.current),this.dependents))for(const s of this.dependents)s.dirty()},this.hasAnimated=!1,this.setCurrent(t),this.owner=n.owner}setCurrent(t){this.current=t,this.updatedAt=Bn.now(),this.canTrackVelocity===null&&t!==void 0&&(this.canTrackVelocity=Ine(this.current))}setPrevFrameValue(t=this.current){this.prevFrameValue=t,this.prevUpdatedAt=this.updatedAt}onChange(t){return this.on("change",t)}on(t,n){this.events[t]||(this.events[t]=new JA);const r=this.events[t].add(n);return t==="change"?()=>{r(),St.read(()=>{this.events.change.getSize()||this.stop()})}:r}clearListeners(){for(const t in this.events)this.events[t].clear()}attach(t,n){this.passiveEffect=t,this.stopPassiveEffect=n}set(t){this.passiveEffect?this.passiveEffect(t,this.updateAndNotify):this.updateAndNotify(t)}setWithVelocity(t,n,r){this.set(n),this.prev=void 0,this.prevFrameValue=t,this.prevUpdatedAt=this.updatedAt-r}jump(t,n=!0){this.updateAndNotify(t),this.prev=t,this.prevUpdatedAt=this.prevFrameValue=void 0,n&&this.stop(),this.stopPassiveEffect&&this.stopPassiveEffect()}dirty(){this.events.change?.notify(this.current)}addDependent(t){this.dependents||(this.dependents=new Set),this.dependents.add(t)}removeDependent(t){this.dependents&&this.dependents.delete(t)}get(){return this.current}getPrevious(){return this.prev}getVelocity(){const t=Bn.now();if(!this.canTrackVelocity||this.prevFrameValue===void 0||t-this.updatedAt>t3)return 0;const n=Math.min(this.updatedAt-this.prevUpdatedAt,t3);return xL(parseFloat(this.current)-parseFloat(this.prevFrameValue),n)}start(t){return this.stop(),new Promise(n=>{this.hasAnimated=!0,this.animation=t(n),this.events.animationStart&&this.events.animationStart.notify()}).then(()=>{this.events.animationComplete&&this.events.animationComplete.notify(),this.clearAnimation()})}stop(){this.animation&&(this.animation.stop(),this.events.animationCancel&&this.events.animationCancel.notify()),this.clearAnimation()}isAnimating(){return!!this.animation}clearAnimation(){delete this.animation}destroy(){this.dependents?.clear(),this.events.destroy?.notify(),this.clearListeners(),this.stop(),this.stopPassiveEffect&&this.stopPassiveEffect()}}function vs(e,t){return new $ne(e,t)}function JL(e,t){if(e?.inherit&&t){const{inherit:n,...r}=e;return{...t,...r}}return e}function dC(e,t){const n=e?.[t]??e?.default??e;return n!==e?JL(n,e):n}const Lne={type:"spring",stiffness:500,damping:25,restSpeed:10},Bne=e=>({type:"spring",stiffness:550,damping:e===0?2*Math.sqrt(550):30,restSpeed:10}),zne={type:"keyframes",duration:.8},qne={type:"keyframes",ease:[.25,.1,.35,1],duration:.3},Fne=(e,{keyframes:t})=>t.length>2?zne:Hc.has(e)?e.startsWith("scale")?Bne(t[1]):Lne:qne,Une=new Set(["when","delay","delayChildren","staggerChildren","staggerDirection","repeat","repeatType","repeatDelay","from","elapsed"]);function Vne(e){for(const t in e)if(!Une.has(t))return!0;return!1}const fC=(e,t,n,r={},a,s)=>l=>{const u=dC(r,e)||{},d=u.delay||r.delay||0;let{elapsed:f=0}=r;f=f-Xn(d);const m={keyframes:Array.isArray(n)?n:[null,n],ease:"easeOut",velocity:t.getVelocity(),...u,delay:-f,onUpdate:g=>{t.set(g),u.onUpdate&&u.onUpdate(g)},onComplete:()=>{l(),u.onComplete&&u.onComplete()},name:e,motionValue:t,element:s?void 0:a};Vne(u)||Object.assign(m,Fne(e,m)),m.duration&&(m.duration=Xn(m.duration)),m.repeatDelay&&(m.repeatDelay=Xn(m.repeatDelay)),m.from!==void 0&&(m.keyframes[0]=m.from);let h=!1;if((m.type===!1||m.duration===0&&!m.repeatDelay)&&(jS(m),m.delay===0&&(h=!0)),(gs.instantAnimations||gs.skipAnimations||a?.shouldSkipAnimations||u.skipAnimations)&&(h=!0,jS(m),m.delay=0),m.allowFlatten=!u.type&&!u.ease,h&&!s&&t.get()!==void 0){const g=Tg(m.keyframes,u);if(g!==void 0){St.update(()=>{m.onUpdate(g),m.onComplete()});return}}return u.isSync?new $m(m):new Pne(m)},Hne=/^var\(--(?:([\w-]+)|([\w-]+), ?([a-zA-Z\d ()%#.,-]+))\)/u;function Gne(e){const t=Hne.exec(e);if(!t)return[,];const[,n,r,a]=t;return[`--${n??r}`,a]}function eB(e,t,n=1){const[r,a]=Gne(e);if(!r)return;const s=window.getComputedStyle(t).getPropertyValue(r);if(s){const l=s.trim();return fL(l)?parseFloat(l):l}return rC(a)?eB(a,t,n+1):a}function n3(e){const t=[{},{}];return e?.values.forEach((n,r)=>{t[0][r]=n.get(),t[1][r]=n.getVelocity()}),t}function pC(e,t,n,r){if(typeof t=="function"){const[a,s]=n3(r);t=t(n!==void 0?n:e.custom,a,s)}if(typeof t=="string"&&(t=e.variants&&e.variants[t]),typeof t=="function"){const[a,s]=n3(r);t=t(n!==void 0?n:e.custom,a,s)}return t}function po(e,t,n){const r=e.getProps();return pC(r,t,n!==void 0?n:r.custom,e)}const tB=new Set(["width","height","top","left","right","bottom",...Vc]),wS=e=>Array.isArray(e);function Wne(e,t,n){e.hasValue(t)?e.getValue(t).set(n):e.addValue(t,vs(n))}function Kne(e){return wS(e)?e[e.length-1]||0:e}function Yne(e,t){const n=po(e,t);let{transitionEnd:r={},transition:a={},...s}=n||{};s={...s,...r};for(const l in s){const u=Kne(s[l]);Wne(e,l,u)}}const nn=e=>!!(e&&e.getVelocity);function Xne(e){return!!(nn(e)&&e.add)}function SS(e,t){const n=e.getValue("willChange");if(Xne(n))return n.add(t);if(!n&&gs.WillChange){const r=new gs.WillChange("auto");e.addValue("willChange",r),r.add(t)}}function hC(e){return e.replace(/([A-Z])/g,t=>`-${t.toLowerCase()}`)}const Qne="framerAppearId",nB="data-"+hC(Qne);function rB(e){return e.props[nB]}function Zne({protectedKeys:e,needsAnimating:t},n){const r=e.hasOwnProperty(n)&&t[n]!==!0;return t[n]=!1,r}function mC(e,t,{delay:n=0,transitionOverride:r,type:a}={}){let{transition:s,transitionEnd:l,...u}=t;const d=e.getDefaultTransition();s=s?JL(s,d):d;const f=s?.reduceMotion,m=s?.skipAnimations;r&&(s=r);const h=[],g=a&&e.animationState&&e.animationState.getState()[a],y=s?.path;y&&y.animateVisualElement(e,u,s,n,h);for(const j in u){const v=e.getValue(j,e.latestValues[j]??null),b=u[j];if(b===void 0||g&&Zne(g,j))continue;const N={delay:n,...dC(s||{},j)};m&&(N.skipAnimations=!0);const E=v.get();if(E!==void 0&&!v.isAnimating()&&!Array.isArray(b)&&b===E&&!N.velocity){St.update(()=>v.set(b));continue}let _=!1;if(window.MotionHandoffAnimation){const k=rB(e);if(k){const O=window.MotionHandoffAnimation(k,j,St);O!==null&&(N.startTime=O,_=!0)}}SS(e,j);const T=f??e.shouldReduceMotion;v.start(fC(j,v,b,T&&tB.has(j)?{type:!1}:N,e,_));const A=v.animation;A&&h.push(A)}if(l){const j=()=>St.update(()=>{l&&Yne(e,l)});h.length?Promise.all(h).then(j):j()}return h}function NS(e,t,n={}){const r=po(e,t,n.type==="exit"?e.presenceContext?.custom:void 0);let{transition:a=e.getDefaultTransition()||{}}=r||{};n.transitionOverride&&(a=n.transitionOverride);const s=r?()=>Promise.all(mC(e,r,n)):()=>Promise.resolve(),l=e.variantChildren&&e.variantChildren.size?(d=0)=>{const{delayChildren:f=0,staggerChildren:m,staggerDirection:h}=a;return Jne(e,t,d,f,m,h,n)}:()=>Promise.resolve(),{when:u}=a;if(u){const[d,f]=u==="beforeChildren"?[s,l]:[l,s];return d().then(()=>f())}else return Promise.all([s(),l(n.delay)])}function Jne(e,t,n=0,r=0,a=0,s=1,l){const u=[];for(const d of e.variantChildren)d.notify("AnimationStart",t),u.push(NS(d,t,{...l,delay:n+(typeof r=="function"?0:r)+ZL(e.variantChildren,d,r,a,s)}).then(()=>d.notify("AnimationComplete",t)));return Promise.all(u)}function ere(e,t,n={}){e.notify("AnimationStart",t);let r;if(Array.isArray(t)){const a=t.map(s=>NS(e,s,n));r=Promise.all(a)}else if(typeof t=="string")r=NS(e,t,n);else{const a=typeof t=="function"?po(e,t,n.custom):t;r=Promise.all(mC(e,a,n))}return r.then(()=>{e.notify("AnimationComplete",t)})}const tre={test:e=>e==="auto",parse:e=>e},aB=e=>t=>t.test(e),iB=[Uc,Ee,Ta,ui,Ete,_te,tre],r3=e=>iB.find(aB(e));function nre(e){return typeof e=="number"?e===0:e!==null?e==="none"||e==="0"||hL(e):!0}const rre=new Set(["brightness","contrast","saturate","opacity"]);function are(e){const[t,n]=e.slice(0,-1).split("(");if(t==="drop-shadow")return e;const[r]=n.match(aC)||[];if(!r)return e;const a=n.replace(r,"");let s=rre.has(t)?1:0;return r!==n&&(s*=100),t+"("+s+a+")"}const ire=/\b([a-z-]*)\(.*?\)/gu,AS={...ia,getAnimatableNone:e=>{const t=e.match(ire);return t?t.map(are).join(" "):e}},CS={...ia,getAnimatableNone:e=>{const t=ia.parse(e);return ia.createTransformer(e)(t.map(r=>typeof r=="number"?0:typeof r=="object"?{...r,alpha:1}:r))}},a3={...Uc,transform:Math.round},sre={rotate:ui,pathRotation:ui,rotateX:ui,rotateY:ui,rotateZ:ui,scale:wh,scaleX:wh,scaleY:wh,scaleZ:wh,skew:ui,skewX:ui,skewY:ui,distance:Ee,translateX:Ee,translateY:Ee,translateZ:Ee,x:Ee,y:Ee,z:Ee,perspective:Ee,transformPerspective:Ee,opacity:Bd,originX:U5,originY:U5,originZ:Ee},Lm={borderWidth:Ee,borderTopWidth:Ee,borderRightWidth:Ee,borderBottomWidth:Ee,borderLeftWidth:Ee,borderRadius:Ee,borderTopLeftRadius:Ee,borderTopRightRadius:Ee,borderBottomRightRadius:Ee,borderBottomLeftRadius:Ee,width:Ee,maxWidth:Ee,height:Ee,maxHeight:Ee,top:Ee,right:Ee,bottom:Ee,left:Ee,inset:Ee,insetBlock:Ee,insetBlockStart:Ee,insetBlockEnd:Ee,insetInline:Ee,insetInlineStart:Ee,insetInlineEnd:Ee,padding:Ee,paddingTop:Ee,paddingRight:Ee,paddingBottom:Ee,paddingLeft:Ee,paddingBlock:Ee,paddingBlockStart:Ee,paddingBlockEnd:Ee,paddingInline:Ee,paddingInlineStart:Ee,paddingInlineEnd:Ee,margin:Ee,marginTop:Ee,marginRight:Ee,marginBottom:Ee,marginLeft:Ee,marginBlock:Ee,marginBlockStart:Ee,marginBlockEnd:Ee,marginInline:Ee,marginInlineStart:Ee,marginInlineEnd:Ee,fontSize:Ee,backgroundPositionX:Ee,backgroundPositionY:Ee,...sre,zIndex:a3,fillOpacity:Bd,strokeOpacity:Bd,numOctaves:a3},ore={...Lm,color:Yt,backgroundColor:Yt,outlineColor:Yt,fill:Yt,stroke:Yt,borderColor:Yt,borderTopColor:Yt,borderRightColor:Yt,borderBottomColor:Yt,borderLeftColor:Yt,filter:AS,WebkitFilter:AS,mask:CS,WebkitMask:CS},sB=e=>ore[e],lre=new Set([AS,CS]);function oB(e,t){let n=sB(e);return lre.has(n)||(n=ia),n.getAnimatableNone?n.getAnimatableNone(t):void 0}const cre=new Set(["auto","none","0"]);function ure(e,t,n){let r=0,a;for(;r<e.length&&!a;){const s=e[r];typeof s=="string"&&!cre.has(s)&&uc(s).values.length&&(a=e[r]),r++}if(a&&n)for(const s of t)e[s]=oB(n,a)}class dre extends cC{constructor(t,n,r,a,s){super(t,n,r,a,s,!0)}readKeyframes(){const{unresolvedKeyframes:t,element:n,name:r}=this;if(!n||!n.current)return;super.readKeyframes();for(let m=0;m<t.length;m++){let h=t[m];if(typeof h=="string"&&(h=h.trim(),rC(h))){const g=eB(h,n.current);g!==void 0&&(t[m]=g),m===t.length-1&&(this.finalKeyframe=h)}}if(this.resolveNoneKeyframes(),!tB.has(r)||t.length!==2)return;const[a,s]=t,l=r3(a),u=r3(s),d=F5(a),f=F5(s);if(d!==f&&cs[r]){this.needsMeasurement=!0;return}if(l!==u)if(Q5(l)&&Q5(u))for(let m=0;m<t.length;m++){const h=t[m];typeof h=="string"&&(t[m]=parseFloat(h))}else cs[r]&&(this.needsMeasurement=!0)}resolveNoneKeyframes(){const{unresolvedKeyframes:t,name:n}=this,r=[];for(let a=0;a<t.length;a++)(t[a]===null||nre(t[a]))&&r.push(a);r.length&&ure(t,r,n)}measureInitialState(){const{element:t,unresolvedKeyframes:n,name:r}=this;if(!t||!t.current)return;r==="height"&&(this.suspendedScrollY=window.pageYOffset),this.measuredOrigin=cs[r](t.measureViewportBox(),window.getComputedStyle(t.current)),n[0]=this.measuredOrigin;const a=n[n.length-1];a!==void 0&&t.getValue(r,a).jump(a,!1)}measureEndState(){const{element:t,name:n,unresolvedKeyframes:r}=this;if(!t||!t.current)return;const a=t.getValue(n);a&&a.jump(this.measuredOrigin,!1);const s=r.length-1,l=r[s];r[s]=cs[n](t.measureViewportBox(),window.getComputedStyle(t.current)),l!==null&&this.finalKeyframe===void 0&&(this.finalKeyframe=l),this.removedTransforms?.length&&this.removedTransforms.forEach(([u,d])=>{t.getValue(u).set(d)}),this.resolveNoneKeyframes()}}function xC(e,t,n){if(e==null)return[];if(e instanceof EventTarget)return[e];if(typeof e=="string"){let r=document;t&&(r=t.current);const a=n?.[e]??r.querySelectorAll(e);return a?Array.from(a):[]}return Array.from(e).filter(r=>r!=null)}const _S=(e,t)=>t&&typeof e=="number"?t.transform(e):e;function pm(e){return pL(e)&&"offsetHeight"in e&&!("ownerSVGElement"in e)}const{schedule:gC}=EL(queueMicrotask,!1),Qr={x:!1,y:!1};function lB(){return Qr.x||Qr.y}function fre(e){return e==="x"||e==="y"?Qr[e]?null:(Qr[e]=!0,()=>{Qr[e]=!1}):Qr.x||Qr.y?null:(Qr.x=Qr.y=!0,()=>{Qr.x=Qr.y=!1})}function cB(e,t){const n=xC(e),r=new AbortController,a={passive:!0,...t,signal:r.signal};return[n,a,()=>r.abort()]}function pre(e){return!(e.pointerType==="touch"||lB())}function hre(e,t,n={}){const[r,a,s]=cB(e,n);return r.forEach(l=>{let u=!1,d=!1,f;const m=()=>{l.removeEventListener("pointerleave",j)},h=b=>{f&&(f(b),f=void 0),m()},g=b=>{u=!1,window.removeEventListener("pointerup",g),window.removeEventListener("pointercancel",g),d&&(d=!1,h(b))},y=()=>{u=!0,window.addEventListener("pointerup",g,a),window.addEventListener("pointercancel",g,a)},j=b=>{if(b.pointerType!=="touch"){if(u){d=!0;return}h(b)}},v=b=>{if(!pre(b))return;d=!1;const N=t(l,b);typeof N=="function"&&(f=N,l.addEventListener("pointerleave",j,a))};l.addEventListener("pointerenter",v,a),l.addEventListener("pointerdown",y,a)}),s}const uB=(e,t)=>t?e===t?!0:uB(e,t.parentElement):!1,yC=e=>e.pointerType==="mouse"?typeof e.button!="number"||e.button<=0:e.isPrimary!==!1,mre=new Set(["BUTTON","INPUT","SELECT","TEXTAREA","A"]);function xre(e){return mre.has(e.tagName)||e.isContentEditable===!0}const gre=new Set(["INPUT","SELECT","TEXTAREA"]);function yre(e){return gre.has(e.tagName)||e.isContentEditable===!0}const hm=new WeakSet;function i3(e){return t=>{t.key==="Enter"&&e(t)}}function f0(e,t){e.dispatchEvent(new PointerEvent("pointer"+t,{isPrimary:!0,bubbles:!0}))}const vre=(e,t)=>{const n=e.currentTarget;if(!n)return;const r=i3(()=>{if(hm.has(n))return;f0(n,"down");const a=i3(()=>{f0(n,"up")}),s=()=>f0(n,"cancel");n.addEventListener("keyup",a,t),n.addEventListener("blur",s,t)});n.addEventListener("keydown",r,t),n.addEventListener("blur",()=>n.removeEventListener("keydown",r),t)};function s3(e){return yC(e)&&!lB()}const o3=new WeakSet;function bre(e,t,n={}){const[r,a,s]=cB(e,n),l=u=>{const d=u.currentTarget;if(!s3(u)||o3.has(u))return;hm.add(d),n.stopPropagation&&o3.add(u);const f=t(d,u),m=(y,j)=>{window.removeEventListener("pointerup",h),window.removeEventListener("pointercancel",g),hm.has(d)&&hm.delete(d),s3(y)&&typeof f=="function"&&f(y,{success:j})},h=y=>{m(y,d===window||d===document||n.useGlobalTarget||uB(d,y.target))},g=y=>{m(y,!1)};window.addEventListener("pointerup",h,a),window.addEventListener("pointercancel",g,a)};return r.forEach(u=>{(n.useGlobalTarget?window:u).addEventListener("pointerdown",l,a),pm(u)&&(u.addEventListener("focus",f=>vre(f,a)),!xre(u)&&!u.hasAttribute("tabindex")&&(u.tabIndex=0))}),s}function kg(e){return pL(e)&&"ownerSVGElement"in e}const mm=new WeakMap;let xm;const dB=(e,t,n)=>(r,a)=>a&&a[0]?a[0][e+"Size"]:kg(r)&&"getBBox"in r?r.getBBox()[t]:r[n],jre=dB("inline","width","offsetWidth"),wre=dB("block","height","offsetHeight");function Sre({target:e,borderBoxSize:t}){mm.get(e)?.forEach(n=>{n(e,{get width(){return jre(e,t)},get height(){return wre(e,t)}})})}function Nre(e){e.forEach(Sre)}function Are(){typeof ResizeObserver>"u"||(xm=new ResizeObserver(Nre))}function Cre(e,t){xm||Are();const n=xC(e);return n.forEach(r=>{let a=mm.get(r);a||(a=new Set,mm.set(r,a)),a.add(t),xm?.observe(r)}),()=>{n.forEach(r=>{const a=mm.get(r);a?.delete(t),a?.size||xm?.unobserve(r)})}}const gm=new Set;let Vl;function _re(){Vl=()=>{const e={get width(){return window.innerWidth},get height(){return window.innerHeight}};gm.forEach(t=>t(e))},window.addEventListener("resize",Vl)}function Ere(e){return gm.add(e),Vl||_re(),()=>{gm.delete(e),!gm.size&&typeof Vl=="function"&&(window.removeEventListener("resize",Vl),Vl=void 0)}}function l3(e,t){return typeof e=="function"?Ere(e):Cre(e,t)}function fB(e){return kg(e)&&e.tagName==="svg"}const Tre=[...iB,Yt,ia],kre=e=>Tre.find(aB(e)),c3=()=>({translate:0,scale:1,origin:0,originPoint:0}),Hl=()=>({x:c3(),y:c3()}),u3=()=>({min:0,max:0}),Wt=()=>({x:u3(),y:u3()}),qd=new WeakMap;function Og(e){return e!==null&&typeof e=="object"&&typeof e.start=="function"}function Fd(e){return typeof e=="string"||Array.isArray(e)}const vC=["animate","whileInView","whileFocus","whileHover","whileTap","whileDrag","exit"],bC=["initial",...vC];function Mg(e){return Og(e.animate)||bC.some(t=>Fd(e[t]))}function pB(e){return!!(Mg(e)||e.variants)}function Ore(e,t,n){for(const r in t){const a=t[r],s=n[r];if(nn(a))e.addValue(r,a);else if(nn(s))e.addValue(r,vs(a,{owner:e}));else if(s!==a)if(e.hasValue(r)){const l=e.getValue(r);l.liveStyle===!0?l.jump(a):l.hasAnimated||l.set(a)}else{const l=e.getStaticValue(r);e.addValue(r,vs(l!==void 0?l:a,{owner:e}))}}for(const r in n)t[r]===void 0&&e.removeValue(r);return t}const ES={current:null},hB={current:!1},Mre=typeof window<"u";function Pre(){if(hB.current=!0,!!Mre)if(window.matchMedia){const e=window.matchMedia("(prefers-reduced-motion)"),t=()=>ES.current=e.matches;e.addEventListener("change",t),t()}else ES.current=!1}const d3=["AnimationStart","AnimationComplete","Update","BeforeLayoutMeasure","LayoutMeasure","LayoutAnimationStart","LayoutAnimationComplete"];let Bm={};function mB(e){Bm=e}function Dre(){return Bm}class xB{scrapeMotionValuesFromProps(t,n,r){return{}}constructor({parent:t,props:n,presenceContext:r,reducedMotionConfig:a,skipAnimations:s,blockInitialAnimation:l,visualState:u},d={}){this.current=null,this.children=new Set,this.isVariantNode=!1,this.isControllingVariants=!1,this.shouldReduceMotion=null,this.shouldSkipAnimations=!1,this.values=new Map,this.KeyframeResolver=cC,this.features={},this.valueSubscriptions=new Map,this.prevMotionValues={},this.hasBeenMounted=!1,this.events={},this.propEventSubscriptions={},this.notifyUpdate=()=>this.notify("Update",this.latestValues),this.render=()=>{this.current&&(this.triggerBuild(),this.renderInstance(this.current,this.renderState,this.props.style,this.projection))},this.renderScheduledAt=0,this.scheduleRender=()=>{const y=Bn.now();this.renderScheduledAt<y&&(this.renderScheduledAt=y,St.render(this.render,!1,!0))};const{latestValues:f,renderState:m}=u;this.latestValues=f,this.baseTarget={...f},this.initialValues=n.initial?{...f}:{},this.renderState=m,this.parent=t,this.props=n,this.presenceContext=r,this.depth=t?t.depth+1:0,this.reducedMotionConfig=a,this.skipAnimationsConfig=s,this.options=d,this.blockInitialAnimation=!!l,this.isControllingVariants=Mg(n),this.isVariantNode=pB(n),this.isVariantNode&&(this.variantChildren=new Set),this.manuallyAnimateOnMount=!!(t&&t.current);const{willChange:h,...g}=this.scrapeMotionValuesFromProps(n,{},this);for(const y in g){const j=g[y];f[y]!==void 0&&nn(j)&&j.set(f[y])}}mount(t){if(this.hasBeenMounted)for(const n in this.initialValues)this.values.get(n)?.jump(this.initialValues[n]),this.latestValues[n]=this.initialValues[n];this.current=t,qd.set(t,this),this.projection&&!this.projection.instance&&this.projection.mount(t),this.parent&&this.isVariantNode&&!this.isControllingVariants&&(this.removeFromVariantTree=this.parent.addVariantChild(this)),this.values.forEach((n,r)=>this.bindToMotionValue(r,n)),this.reducedMotionConfig==="never"?this.shouldReduceMotion=!1:this.reducedMotionConfig==="always"?this.shouldReduceMotion=!0:(hB.current||Pre(),this.shouldReduceMotion=ES.current),this.shouldSkipAnimations=this.skipAnimationsConfig??!1,this.parent?.addChild(this),this.update(this.props,this.presenceContext),this.hasBeenMounted=!0}unmount(){this.projection&&this.projection.unmount(),ys(this.notifyUpdate),ys(this.render),this.valueSubscriptions.forEach(t=>t()),this.valueSubscriptions.clear(),this.removeFromVariantTree&&this.removeFromVariantTree(),this.parent?.removeChild(this);for(const t in this.events)this.events[t].clear();for(const t in this.features){const n=this.features[t];n&&(n.unmount(),n.isMounted=!1)}this.current=null}addChild(t){this.children.add(t),this.enteringChildren??(this.enteringChildren=new Set),this.enteringChildren.add(t)}removeChild(t){this.children.delete(t),this.enteringChildren&&this.enteringChildren.delete(t)}bindToMotionValue(t,n){if(this.valueSubscriptions.has(t)&&this.valueSubscriptions.get(t)(),n.accelerate&&QL.has(t)&&this.current instanceof HTMLElement){const{factory:l,keyframes:u,times:d,ease:f,duration:m}=n.accelerate,h=new YL({element:this.current,name:t,keyframes:u,times:d,ease:f,duration:Xn(m)}),g=l(h);this.valueSubscriptions.set(t,()=>{g(),h.cancel()});return}const r=Hc.has(t);r&&this.onBindTransform&&this.onBindTransform();const a=n.on("change",l=>{this.latestValues[t]=l,this.props.onUpdate&&St.preRender(this.notifyUpdate),r&&this.projection&&(this.projection.isTransformDirty=!0),this.scheduleRender()});let s;typeof window<"u"&&window.MotionCheckAppearSync&&(s=window.MotionCheckAppearSync(this,t,n)),this.valueSubscriptions.set(t,()=>{a(),s&&s()})}sortNodePosition(t){return!this.current||!this.sortInstanceNodePosition||this.type!==t.type?0:this.sortInstanceNodePosition(this.current,t.current)}updateFeatures(){let t="animation";for(t in Bm){const n=Bm[t];if(!n)continue;const{isEnabled:r,Feature:a}=n;if(!this.features[t]&&a&&r(this.props)&&(this.features[t]=new a(this)),this.features[t]){const s=this.features[t];s.isMounted?s.update():(s.mount(),s.isMounted=!0)}}}triggerBuild(){this.build(this.renderState,this.latestValues,this.props)}measureViewportBox(){return this.current?this.measureInstanceViewportBox(this.current,this.props):Wt()}getStaticValue(t){return this.latestValues[t]}setStaticValue(t,n){this.latestValues[t]=n}update(t,n){(t.transformTemplate||this.props.transformTemplate)&&this.scheduleRender(),this.prevProps=this.props,this.props=t,this.prevPresenceContext=this.presenceContext,this.presenceContext=n;for(let r=0;r<d3.length;r++){const a=d3[r];this.propEventSubscriptions[a]&&(this.propEventSubscriptions[a](),delete this.propEventSubscriptions[a]);const s="on"+a,l=t[s];l&&(this.propEventSubscriptions[a]=this.on(a,l))}this.prevMotionValues=Ore(this,this.scrapeMotionValuesFromProps(t,this.prevProps||{},this),this.prevMotionValues),this.handleChildMotionValue&&this.handleChildMotionValue()}getProps(){return this.props}getVariant(t){return this.props.variants?this.props.variants[t]:void 0}getDefaultTransition(){return this.props.transition}getTransformPagePoint(){return this.props.transformPagePoint}getClosestVariantNode(){return this.isVariantNode?this:this.parent?this.parent.getClosestVariantNode():void 0}addVariantChild(t){const n=this.getClosestVariantNode();if(n)return n.variantChildren&&n.variantChildren.add(t),()=>n.variantChildren.delete(t)}addValue(t,n){const r=this.values.get(t);n!==r&&(r&&this.removeValue(t),this.bindToMotionValue(t,n),this.values.set(t,n),this.latestValues[t]=n.get())}removeValue(t){this.values.delete(t);const n=this.valueSubscriptions.get(t);n&&(n(),this.valueSubscriptions.delete(t)),delete this.latestValues[t],this.removeValueFromRenderState(t,this.renderState)}hasValue(t){return this.values.haÛ~ößÍÊ×¬¢h­µçZ[™[Žˆ´(t,´-t`4.4`´c4`H4/´`4.4,ô.4/t,4.ô/´/4-4/´.´`ô/4-t/t`´,8¡¤ˆŸJKˆKšœÞÊ™]Z[È‹ØÛ\ÜÓ˜[YNˆ˜™\™XÙZ]š[™Ë[Y]K]ŒÍMÈ‹Ü[ŽˆYKœÝ\Y\’YÚ[™[Ž–ÚKšœÞÊœÝ[[X\žH‹ØÚ[™[Ž–ÚKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÚKšœÞ
˜ˆ‹ØÚ[™[Žˆ´(4-t.´,´.4-ô.4`´bÈŸJKKšœÞÊœÛX[‹ØÚ[™[Ž–ÙKœÝ\Y\“˜[Y_´'ô/´`t`´,4,´bt.4.ˆ4/t-H4,´bô,t`4,4/H‹ˆ0­È‹™›ØÑ]JK™]JKˆ0­È‹™›ØÓ[Û™^J[X™\ŠKÝ[
_K˜Ý\œ™[˜ÞJW_JW_JKKšœÞ
™[H‹ØÚ[™[Ž™KœÝ\Y\’YÈ´%ô,4/ô/´.ô/t-t/t/ˆŽˆ´'t`ô-´/t/ˆ4-ô,4/ô/´.ô/t.4`´cŸJW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\™XÙZ]š[™Ë[Y]KYšY[Ë]ŒÍMÈ‹Ú[™[Ž–ÂˆKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[Y›Ü›KYÜšY‹Ú[™[Ž–ÚKšœÞ
™›ØÑšY[ÛX™[ˆ´(´.4/È4-4/´.´`ô/4-t/t`´,‹Ú[™[ŽšKšœÞÊœÙ[XÝ‹Ý˜[YN™K™ØÝ[Y[\KÛÚ[™ÙN™ÏO›
™ØÝ[Y[\H‹Ë\™Ù]˜[YJKÚ[™[Ž–ÚKšœÞ
›Ü[Ûˆ‹Ý˜[YNˆœ™XÙZ\‹Ú[™[Žˆ´)ô-t.ˆ4/4,4,ô,4-ô.4/t,ŸJKKšœÞ
›Ü[Ûˆ‹Ý˜[YNˆš[›ÚXÙH‹Ú[™[Žˆ´'t,4.´.ô,4-4/t,4cÈŸJKKšœÞ
›Ü[Ûˆ‹Ý˜[YNˆœšXÙWÛ\Ý‹Ú[™[Žˆ´'ô`4,4.t`Kt.ô.4`t`ˆŸJW_J_JKKšœÞ
™›ØÑšY[ÛX™[ˆ´%4,4`´,‹Ú[™[ŽšKšœÞ
š[œ]‹Ý\Nˆ™]H‹˜[YN™K™]KÛÚ[™ÙN™ÏO›
™]H‹Ë\™Ù]˜[YJKÛ’[œ]™ÏO›
™]H‹Ë˜Ý\œ™[\™Ù]˜[YJ_J_JW_JKˆKšœÞ
™›ØÑšY[ÛX™[ˆ´'ô/´`t`´,4,´bt.4.ˆ‹Ú[™[ŽšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\\˜Ú\ÙK\Ý\Y\‹]ŒÍMˆ‹Ú[™[Ž–ÚKšœÞ
š[œ]‹Ý\NˆœÙX\˜Ú‹˜[YN˜™Ý\Y\”ÙX\˜ÚÛ‘›ØÝ\ÎŠ
OO˜™Ù]Ý\Y\“Ü[ŠL
KÛ›\ŽŠ
OOœÙ][Y[Ý]


OO˜™Ù]Ý\Y\“Ü[ŠLJKLŒ
KÛÚ[™ÙN™ÏOžØÛÛœÝ˜[YOYË\™Ù]˜[YNØ™Ù]Ý\Y\”ÙX\˜Ú
˜[YJNØ™Ù]Ý\Y\“Ü[ŠL
NÙKœÝ\Y\’Y	‰˜™›ØÓ›Ü›UŒMŽ
˜[YJHOOX™›ØÓ›Ü›UŒMŽ
KœÝ\Y\“˜[YJI‰›ŠË‹‹™KÝ\Y\’Y›ÚYÝ\Y\“˜[YN˜[Y_J_KXÙZÛ\Žˆ´'t,4.t`´.4`t`ôbt-t`t`´,´`ôc´bt-t,ô/ˆ4/ô/´`t`´,4,´bt.4.´,8 )ˆ‹˜\šXK[X™[Žˆ´'ô/´.4`t.ˆ4/ô/´`t`´,4,´bt.4.´,ŸJKKœÝ\Y\’Y	‰šKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆœÙ[XÝY‹Ú[™[Žˆ´$´bô,t`4,4/H4`t`ôbt-t`t`´,´`ôc´bt.4.H4/ô/´`t`´,4,´bt.4.ˆŸJK™Ý\Y\“Ü[‰‰šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\\˜Ú\ÙK\Ý\Y\‹\™\Ý[Ë]ŒÍMˆ‹Ú[™[Ž–Ø™Ý\Y\“X]Ú\Ë›X\
][OOšKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û“[Ý\ÙQÝÛŽ™]™[O™]™[œ™]™[Y˜][

KÛÛXÚÎŠ
OO˜™Ù[XÝÝ\Y\•ŒÍMÊ][JKÚ[™[Ž–ÚKšœÞ
˜ˆ‹ØÚ[™[Žš][K›˜[Y_JKKšœÞ
œÛX[‹ØÚ[™[Žš][K\OOOHœ™]Z[È´(4/´-ô/t.4aô/tbô.H4/4,4,ô,4-ô.4/HŽˆ´'ô/´`t`´,4,´bt.4.ˆŸJW_K][KšY
JKX™Ý\Y\“X]Ú\Ë›[™Ý	‰šKšœÞ
œ‹ØÚ[™[Žˆ´'ô/´`t`´,4,´bt.4.ˆ4/t-H4/t,4.t-4-t/HŸJKÉ‰šKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜Ü™X]H‹Û“[Ý\ÙQÝÛŽ™]™[O™]™[œ™]™[Y˜][

KÛÛXÚÎŠ
OOžØ™Ù]Ý\Y\“Ü[ŠLJNÛÊ
_KÚ[™[ŽˆŠÈ4(t/´-ô-4,4`´c4.´,4`4`´/´aô.´`È4/ô/´`t`´,4,´bt.4.´,ŸJW_JW_J_JKˆKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[Y›Ü›KYÜšY‹Ú[™[Ž–ÚKšœÞ
™›ØÑšY[ÛX™[ˆ´'t/´/4-t`4-4/´.´`ô/4-t/t`´,‹Ú[™[ŽšKšœÞ
š[œ]‹Ý˜[YN™K™ØÝ[Y[[X™\Ÿˆ‹ÛÚ[™ÙN™ÏO›
™ØÝ[Y[[X™\ˆ‹Ë\™Ù]˜[YJKXÙZÛ\Žˆ´'t-t/´,tcô-ô,4`´-t.ôc4/t/ˆŸJ_JKKšœÞ
™™[YPÝ\œ™[˜ÞSØÚÙYŒÌ‹ØÝ\œ™[˜ÞN˜™XØÛÝ[[™ÐÝ\œ™[˜Þ_JW_JKˆ™ž™YYY	‰šKšœÞÊœÙXÝ[Ûˆ‹È™]KX™XXØÛÝ[[™ËYžŽˆŒÌŒH‹Û\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[\™]šY]Ë[›ÝH‹Ú[™[Ž–ÚKšœÞÊœ‹ØÚ[™[Ž–È´(t`ô/4/4,4-4/´.´`ô/4-t/t`´,ˆ‹[X™\ŠKÝ[
KÑš^Y
ŠKˆ‹K˜Ý\œ™[˜ÞKˆ0­È4(ôaôdt`´/t,4cÈ4,´,4.ôc´`´,ˆ‹™XØÛÝ[[™ÐÝ\œ™[˜ÞW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[Y›Ü›KYÜšY‹Ú[™[Ž–ÚKšœÞ
™›ØÑšY[ÛX™[ˆ´&4`t`´/´`4.4aô-t`t.´.4.H4.´`ô`4`H
HŠÙK˜Ý\œ™[˜ÞJÈˆH8 )ˆŠØ™XØÛÝ[[™ÐÝ\œ™[˜ÞJÈŠH‹Ú[™[ŽšKšœÞ
š[œ]‹Ý\Nˆ›[X™\ˆ‹Ý\ˆŒŒH‹[œ][ÙNˆ™XÚ[X[‹˜[YN™K™ž˜]_ˆ‹ÛÚ[™ÙN™ÏO›
™ž˜]H‹Ë\™Ù]˜[YJ_J_JKKšœÞ
™›ØÑšY[ÛX™[ˆ´%4,4`´,4.´`ô`4`t,‹Ú[™[ŽšKšœÞ
š[œ]‹Ý\Nˆ™]H‹˜[YN™K™žY™™XÝ]™Q]_K™]_ˆ‹ÛÚ[™ÙN™ÏO›
™žY™™XÝ]™Q]H‹Ë\™Ù]˜[YJ_J_JW_JKKšœÞ
™›ØÑšY[ÛX™[ˆ´&4`t`´/´aô/t.4.ˆ4.´`ô`4`t,‹Ú[™[ŽšKšœÞ
š[œ]‹Ý˜[YN™K™žÛÝ\˜Ù_ˆ‹ÛÚ[™ÙN™ÏO›
™žÛÝ\˜ÙH‹Ë\™Ù]˜[YJ_J_JW_JKˆKšœÞ
™›ØÑšY[ÛX™[ˆ´&´,4`´-t,ô/´`4.4cÈ4-ô,4.´`ô/ô.´.‹Ú[™[ŽšKšœÞ
œÙ[XÝ‹Ý˜[YN™K™^[œÙPØ]YÛÜž_˜]]È‹ÛÚ[™ÙN™ÏO›
™^[œÙPØ]YÛÜžH‹Ë\™Ù]˜[YJKÚ[™[Ž–ÚKšœÞ
›Ü[Ûˆ‹Ý˜[YNˆ˜]]È‹Ú[™[Žˆ´'´/ô`4-t-4-t.ô.4`´c4,4,´`´/´/4,4`´.4aô-t`t.´.ŸJK‹‹˜™›ØÕ[š\]YPØ]YÛÜžSÜ[ÛœÕŒÍÊK™^[œÙPØ]YÛÜžJK›X\

ÚÙ^KX™[JOOšKšœÞ
›Ü[Ûˆ‹Ý˜[YNšÙ^KÚ[™[Ž›X™[KÙ^JJW_J_JKˆKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ˜™\™XÙZ]š[™ËXXØÛÝ[[™Ë[›ÝK]ŒÍMÈ‹Ú[™[Žˆ´'ô/´`t.ô-H4/ô`4/´,´-t-4-t/t.4cÈ4`´/´,´,4`4/tbô-H4/ô/´-ô.4a´.4.4`ô,´-t.ô.4aô,4`ˆ4/´`t`´,4`´.´.4.4/´,t/t/´,´cô`ˆ4`t-t,t-t`t`´/´.4/4/´`t`´cˆ4%4/´.ô,È4/ô/´`t`´,4,´bt.4.´`È4/ô/´cô,´.4`´`tcÈ4/ô/ˆ4-4/´.´`ô/4-t/t`´`ÎÈ4/´/ô.ô,4`´`È4-4/´,t,4,´c4`´-H4/´`´-4-t.ôc4/t/´.H4/´/ô-t`4,4a´.4-t.KˆŸJBˆ_JW_JKˆKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\™XÙZ]š[™Ë[[™\ËZXY]ŒÍMÈ‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
šÈ‹ØÚ[™[Žˆ´'ô/´-ô.4a´.4.4-4/´.´`ô/4-t/t`´,ŸJKKšœÞ
œÜ[ˆ‹ØÚ[™[Žˆ´'ô/´`4cô-4/´.ˆ4`t`´`4/´.ˆ4`t/´at`4,4/tdt/H4.´,4.ˆ4,ˆ4-4/´.´`ô/4-t/t`´-HŸJW_JK™][[Û“[™\ÕŒÍMË›[™ÝŒ	‰šKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎ˜™™^][[Û•ŒÍMËÚ[™[Žˆ´(t.ô-t-4`ôc´bt,4cÈ4/ô`4/´,t.ô-t/4,ŸJW_JKˆKœÛÝ\˜ÙHOOH›X[X[‰‰šKšœÞ
™[›ÚXÙT™]šY]ÔÝ[[X\žUÚ][\Î™Kš][\ËÛÚ[™ÙN™ÏO›
š][\È‹Ê_JKˆKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\™XÙZ]š[™ËYš[\œË]ŒÍMÈ‹Ú[™[Ž–ÞÚYˆ˜][[Ûˆ‹X™[ˆ´(´`4-t,t`ôc´`ˆ4,´/t.4/4,4/t.4cÈ‹ÛÝ[˜™][[Û“[™\ÕŒÍMË›[™ÝKÚYˆ˜[‹X™[ˆ´$´`t-H‹ÛÝ[™Kš][\Ë›[™ÝKÚYˆœ™XYH‹X™[ˆ´$ô/´`´/´,´/ˆ‹ÛÝ[˜™™XYS[™\ÕŒÍMË›[™ÝWK›X\
š[\OšKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YN˜™[™UšY]ÕŒÍMÏOOYš[\‹šYÈ˜XÝ]™HŽˆˆ‹\ØX›Y™š[\‹šYOOH˜[‰‰ˆYš[\‹˜ÛÝ[ÛÛXÚÎŠ
OO˜™Ù][™UšY]ÕŒÍMÊš[\‹šY
KÚ[™[Ž–Ùš[\‹›X™[KšœÞ
˜ˆ‹ØÚ[™[Ž™š[\‹˜ÛÝ[JW_Kš[\‹šY
J_JKˆKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\™XÙZ]š[™Ë[[™K[\Ý]ŒÍMÈ‹Ú[™[Ž˜™ÚÝÛ“[™\ÕŒÍMË›X\
[™OOžØÛÛœÝÝ]OX™[™TÝ]UŒÍMÊ[™JK\ÓÜ[[[™KšYOOX™XÝ]™S[™UŒÍMË[™^YKš][\Ë™š[™[™^
][OOš][KšYOO[[™KšY
JÌNÜ™]\›ˆKšœÞÊ˜\XÛH‹ØÛ\ÜÓ˜[YNˆ˜™\™XÙZ]š[™Ë[[™K]ŒÍMÈŠÜÝ]KÛ™JÊ\ÓÜ[ÈˆÜ[ˆŽˆˆŠKÚ[™[Ž–ÂˆKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™\™XÙZ]š[™Ë[[™K\Ý[[X\žK]ŒÍMÈ‹ÛÛXÚÎŠ
OO˜™Ù]XÝ]™S[™UŒÍMÊ\ÓÜ[Û[›[™KšY
K˜\šXKY^[™YŽš\ÓÜ[‹Ú[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\™XÙZ]š[™Ë[[™KYÝ]ŒÍMÈ‹˜\šXKZY[ˆŽˆLJKKšœÞÊœÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\™XÙZ]š[™Ë[[™KXÛÜK]ŒÍMÈ‹Ú[™[Ž–ÚKšœÞÊœÛX[‹ØÚ[™[Ž–È´'ô/´-ô.4a´.4cÈ‹[™^ˆ0­È‹Ý]K›X™[_JKKšœÞ
œÝ›Û™È‹ØÚ[™[Ž›[™Kœ˜]Ó˜[Y_[™K›˜[Y_´$t-t-È4/t,4-ô,´,4/t.4cÈŸJKKšœÞ
™[H‹ØÚ[™[Ž›[™Kœ\˜Ú\ÙT›ÙXÝÙ^OÊ[™K››ÛY[˜Û]\™S˜[Y_[™K›˜[YJNˆ´$´bô,t-t`4.4`´-H4/ô/´-ô.4a´.4cˆ4/t/´/4-t/t.´.ô,4`´`ô`4bÈŸJW_JKKšœÞÊœÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\™XÙZ]š[™Ë[[™K\™\Ý[]ŒÍMÈ‹Ú[™[Ž–ÚKšœÞ
˜ˆ‹ØÚ[™[Ž˜™›ØÓ[Û™^J[X™\Š[™K›[™UÝ[
_K˜Ý\œ™[˜ÞJ_JKKšœÞ
œÛX[‹ØÚ[™[Ž˜™›ØÔÝØÚÔ™]šY]ÕŒŒŒJ[™J_JKKšœÞ
šH‹ØÚ[™[Žš\ÓÜ[È¸¢$ˆŽˆŠÈŸJW_JW_JKˆ\ÓÜ[‰‰šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\™XÙZ]š[™Ë[[™KYY]Ü‹]ŒÍMÈ‹Ú[™[Ž–ÚKšœÞ
™›ØÑšY[ÛX™[ˆ´'t,4-ô,´,4/t.4-H4,ˆ4-4/´.´`ô/4-t/t`´-H‹Ú[™[ŽšKšœÞ
š[œ]‹Ý˜[YN›[™K›˜[YKÛÚ[™ÙN™]™[OžØÛÛœÝ˜[YOY]™[\™Ù]˜[YKXÚÏX™›ØÔÝYÙÙ\ÝYXÚØYÙUŒŒJ˜[YK™›ØÐÝ\œ™[XÚØYÙUŒŒJ[™JJNÝJ[™KšYÛ˜[YN˜[YK‹‹œXÚÈOOX™›ØÐÝ\œ™[XÚØYÙUŒŒJ[™JOØ™›ØÔXÚØYÙU\]UŒŒJXÚÊNžß_J_KXÙZÛ\Žˆ´'t,4-ô,´,4/t.4-H4`´/´,´,4`4,ŸJ_JKK™ØÝ[Y[\HOOHœšXÙWÛ\Ý‰‰šKšœÞ
™[›ÚXÙS[™SX\[™ÕŒÍM‹Û[™KÝ\Y\’Y™KœÝ\Y\’YÝ\Y\“˜[YN™KœÝ\Y\“˜[YKØÝ[Y[Y™KšYÛ”Ù[XÝœ]ÚOJ[™KšY]Ú
_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[Y›Ü›KYÜšY‹Ú[™[Ž–ÚKšœÞ
™›ØÑšY[ÛX™[ˆ´&´/´.ô.4aô-t`t`´,´/ˆ‹Ú[™[ŽšKšœÞ
š[œ]‹Ý\Nˆ›[X™\ˆ‹Ý\ˆŒŒH‹[œ][ÙNˆ™XÚ[X[‹˜[YN›[™Kœ]X[]KÛÚ[™ÙN™]™[OJ[™KšYÜ]X[]N™]™[\™Ù]˜[Y_J_J_JKKšœÞ
™›ØÑšY[ÛX™[ˆ´%t-4.4/t.4a´,4.´/´.ô.4aô-t`t`´,´,‹Ú[™[ŽšKšœÞ
œÙ[XÝ‹Ý˜[YN›[™K[š]´b4`‹ˆ‹ÛÚ[™ÙN™]™[OJ[™KšYÝ[š]™]™[\™Ù]˜[YK]X[]S[ÙN˜™›ØÔ]X[]S[ÙUŒŒŒJ]™[\™Ù]˜[YJ_JKÚ[™[Ž˜™›ØÔ]X[]U[š]ÕŒŒŒK›X\

Ý˜[YKX™[JOOšKšœÞ
›Ü[Ûˆ‹Ý˜[YKÚ[™[Ž›X™[K˜[YJJ_J_JW_JKKšœÞ
™›ØÑšY[ÛX™[ˆ´)4,4`t/´,´.´,4/´-4/t/´.H4-t-4.4/t.4a´bÈ‹Ú[™[ŽšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[\XÚØYÙKYY]Ü‹]ŒŒH‹Ú[™[Ž–ÚKšœÞÊœÙ[XÝ‹È˜\šXK[X™[Žˆ´$´bô,t`4,4`´c4`t`´,4/t-4,4`4`´/t`ôcˆ4a4,4`t/´,´.´`È‹˜[YN˜™›ØÔXÚØYÙT™\Ù]ÕŒŒKš[˜ÛY\Ê™›ØÐÝ\œ™[XÚØYÙUŒŒJ[™JJOØ™›ØÐÝ\œ™[XÚØYÙUŒŒJ[™JNˆˆ‹ÛÚ[™ÙN™]™[OžØÛÛœÝ˜[YOY]™[\™Ù]˜[YNÝ˜[YI‰J[™KšY™›ØÔXÚØYÙU\]UŒŒJ˜[YJJ_KÚ[™[Ž–ÚKšœÞ
›Ü[Ûˆ‹Ý˜[YNˆˆ‹Ú[™[Žˆ´$´bô,t`4,4`´c4a4,4`t/´,´.´`ÈŸJK‹‹˜™›ØÔXÚØYÙQÜ›Ý\ÕŒŒK›X\
Ü›Ý\OšKšœÞ
›ÜÜ›Ý\‹ÛX™[™Ü›Ý\›X™[Ú[™[Ž™Ü›Ý\›Ü[ÛœË›X\
˜[YOOšKšœÞ
›Ü[Ûˆ‹Ý˜[YKÚ[™[Ž˜[Y_K˜[YJJ_KÜ›Ý\›X™[
JW_JKKšœÞ
š[œ]‹È˜\šXK[X™[Žˆ´(t,´/´cÈ4a4,4`t/´,´.´,‹˜[YN˜™›ØÐÝ\œ™[XÚØYÙUŒŒJ[™JKÛÚ[™ÙN™]™[OJ[™KšY™›ØÔXÚØYÙU\]UŒŒJ]™[\™Ù]˜[YJJKXÙZÛ\Žˆ´'t,4/ô`4.4/4-t`ˆH4.ÈŸJW_J_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[\ÝØÚË\™]šY]Ë]ŒŒŒH‹Ú[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÚ[™[Žˆ´'t,4`t.´.ô,4-4/ô/´`t`´`ô/ô.4`ˆŸJKKšœÞ
œÝ›Û™È‹ØÚ[™[Ž˜™›ØÔÝØÚÔ™]šY]ÕŒŒŒJ[™J_JW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[Y›Ü›KYÜšY‹Ú[™[Ž–ÚKšœÞ
™›ØÑšY[ÛX™[ˆ´)´-t/t,4-ô,4-t-4.4/t.4a´`È‹Ú[™[ŽšKšœÞ
š[œ]‹Ý\Nˆ›[X™\ˆ‹Ý\ˆŒŒH‹[œ][ÙNˆ™XÚ[X[‹˜[YN›[™K[š]šXÙKÛÚ[™ÙN™]™[OJ[™KšYÝ[š]šXÙN™]™[\™Ù]˜[Y_J_J_JKKšœÞ
™›ØÑšY[ÛX™[ˆ´(t`ô/4/4,4`t`´`4/´.´.‹Ú[™[ŽšKšœÞ
š[œ]‹Ý\Nˆ›[X™\ˆ‹Ý\ˆŒŒH‹[œ][ÙNˆ™XÚ[X[‹˜[YN›[™K›[™UÝ[ÛÚ[™ÙN™]™[OJ[™KšYÛ[™UÝ[“[X™\Š]™[\™Ù]˜[YJ_J_J_JW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\™XÙZ]š[™Ë[[™KXXÝ[ÛœË]ŒÍMÈ‹Ú[™[Ž–ÚKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ™[™Ù\ˆ‹ÛÛXÚÎŠ
OOžÛ
š][\È‹Kš][\Ë™š[\Š][OOš][KšYOO[[™KšY
JNØ™Ù]XÝ]™S[™UŒÍMÊ[
_KÚ[™[Žˆ´(ô-4,4.ô.4`´c4/ô/´-ô.4a´.4cˆŸJKÝ]KÛ™OOOHœ™XYH‰‰˜™][[Û“[™\ÕŒÍMË›[™ÝŒ	‰šKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎ˜™™^][[Û•ŒÍMËÚ[™[Žˆ´&ˆ4`t.ô-t-4`ôc´bt-t.H4/ô`4/´,t.ô-t/4-H8¡¤ˆŸJW_JW_JBˆ_K[™KšY
_H
_JKˆKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[\ÙXÛÛ™\žH™\™XÙZ]š[™ËXY[[™K]ŒÍMÈ‹ÛÛXÚÎ™‹Ú[™[ŽˆŠÈ4%4/´,t,4,´.4`´c4/ô/´-ô.4a´.4cˆŸJKˆK™ØÝ[Y[\HOOHœšXÙWÛ\Ý‰‰šKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™\™XÙZ]š[™Ë]Ý[Ë]ŒÍMÈ‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÚ[™[Žˆ´(t`ô/4/4,4/ô/´-ô.4a´.4.HŸJKKšœÞ
œÝ›Û™È‹ØÚ[™[Ž˜™›ØÓ[Û™^JK˜Ý\œ™[˜ÞJ_JW_JKKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÚ[™[Žˆ´&4`´/´,È4-4/´.´`ô/4-t/t`´,ŸJKKšœÞ
š[œ]‹Ý\Nˆ›[X™\ˆ‹Ý\ˆŒŒH‹[œ][ÙNˆ™XÚ[X[‹˜[YN™KÝ[ÛÚ[™ÙN™]™[O›
Ý[‹[X™\Š]™[\™Ù]˜[YJ_
K˜\šXK[X™[Žˆ´&4`´/´,È4-4/´.´`ô/4-t/t`´,ŸJW_JKKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÚ[™[Žˆ´'t%4(HÈ4/t,4.ô/´,ÈŸJKKšœÞ
š[œ]‹Ý\Nˆ›[X™\ˆ‹Ý\ˆŒŒH‹[œ][ÙNˆ™XÚ[X[‹˜[YN™K˜]ˆ‹ÛÚ[™ÙN™]™[O›
˜]‹[X™\Š]™[\™Ù]˜[YJ_
KXÙZÛ\ŽˆŒ‹˜\šXK[X™[Žˆ´'t%4(H4.4.ô.4/t,4.ô/´,ÈŸJW_JK™Ý[Z\ÛX]ÚŒÍMÉ‰šKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎ›KÚ[™[Žˆ´'ô`4.4/tcô`´c4`t`ô/4/4`È4/ô/´-ô.4a´.4.H4.´,4.ˆ4.4`´/´,ÈŸJW_JBˆ_JKˆKšœÞÊ™›ÛÝ\ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[\ÚY]XXÝ[ÛœÈ™\™XÙZ]š[™ËXXÝ[ÛœË]ŒÍMÈ‹Ú[™[Ž–ÚKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[\ÙXÛÛ™\žH‹\ØX›YœËÛÛXÚÎœ‹Ú[™[Ž™KœÝ]\ÏOOH˜ÛÛ™š\›YYÈ´%ô,4.´`4bô`´cŽˆ´'t-H4`t/´at`4,4/tcô`´cŸJKKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
œÛX[‹ØÚ[™[Ž˜™Ø[”ÜÝŒÍMÏÙKœÝ]\ÏOOH˜ÛÛ™š\›YYÈ´&4-ô/4-t/t-t/t.4cÈ4,t`ô-4`ô`ˆ4/ô-t`4-t`taô.4`´,4/tbÈŽˆ´(t.´.ô,4-4.4`t-t,t-t`t`´/´.4/4/´`t`´c4/´,t/t/´,´cô`´`tcÈ4/ô/´`t.ô-H4/ô`4/´,´-t-4-t/t.4cÈŽ˜™›ØÚÚ[™Õ^ŒÍMßJKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[\š[X\žH‹\ØX›YœßX™Ø[”ÜÝŒÍMËÛÛXÚÎ˜KÚ[™[ŽœÏÈ´(t/´at`4,4/tcôc¸ )ˆŽ™KœÝ]\ÏOOH˜ÛÛ™š\›YYÈ´(t/´at`4,4/t.4`´c4.4-ô/4-t/t-t/t.4cÈŽ™K™ØÝ[Y[\OOOHœšXÙWÛ\ÝÈ´(t/´at`4,4/t.4`´c4/ô`4,4.t`HŽˆ´'ô`4/´,´-t`t`´.4/ô`4.4at/´-ŸJW_JW_JBˆ_J_JBŸB˜ÛÛœÝ™[XYÙU\ØY™\œÚ[ÛHœ^[ØY\ØY™K]ŒÍÈ‹™\™XÝ[XYÙU\\Ï[™]ÈÙ]
Èš[XYÙKÚœYÈ‹š[XYÙKÜ™È‹š[XYÙKÝÙXœ‹š[XYÙKÙÚYˆ—JK™\ØY^[ØYYÙ]ž]\ÏMÎÌŒ™\ØYÚ[™ÛTÛÝ\˜ÙS[Z]ž]\ÏLÌÍMMÌŽÂ™[˜Ý[Ûˆ™\ØYš[S˜[YJKHœÝËšœÈŠ^ØÛÛœÝTÝš[™ÊOË›˜[Y_OË˜™š[S˜[Y_
Kœ™\XÙJÖ××——JËÙË—ÈŠKš[J
NÜ™]\›ŠŸ
KœÛXÙJN
_B™[˜Ý[Ûˆ™Ø[›ÛšXØ[ÛY[[XYÙU\JJ^ØÛÛœÝTÝš[™Ê_ˆŠKœÜ]
ŽÈŠVÌKš[J
KÓØØ[SÝÙ\Ø\ÙJ™[ˆŠNÜ™]\›ˆOOHš[XYÙKÚœÈŸOOHš[XYÙKÜœYÈÈš[XYÙKÚœYÈŽB™[˜Ý[Ûˆ™ÛY[[XYÙR[™›ÊJ^ØÛÛœÝX™\ØYš[S˜[YJJKX™Ø[›ÛšXØ[ÛY[[XYÙU\JOË\JK[‹œÝ\ÕÚ]
š[XYÙKÈŠ_×ŠÎšœOÙß™ßÙXœÚYŸZXßZYŠIÚK\Ý

NÜ™]\›žÛ˜[YN\N›‹\Ò[XYÙNœŸ_B™[˜Ý[Ûˆ™™XY[XYÙQ]U\›
J^Ü™]\›ˆ™]È›ÛZ\ÙJ
ŠOOžØÛÛœÝ[™]Èš[T™XY\ŽÜ‹›Û›ØYJ
OO\[Ùˆ‹œ™\Ý[OOHœÝš[™È‰‰œ‹œ™\Ý[Ý
‹œ™\Ý[
N›Š™]È\œ›ÜŠ´)4/´`´/´,ô`4,4a4.4cÈ4/t-H4/ô`4/´aô.4`´,4/t,ˆŠJK‹›Û™\œ›ÜJ
OO›Š™]È\œ›ÜŠ´)4/´`´/´,ô`4,4a4.4cÈ4/t-H4/ô`4/´aô.4`´,4/t,ˆŠJK‹›Û˜X›ÜJ
OO›Š™]È\œ›ÜŠ´)ô`´-t/t.4-H4a4/´`´/´,ô`4,4a4.4.4/´`´/4-t/t-t/t/‹ˆŠJNÝž^Ü‹œ™XY\Ñ]UT“
J_XØ]ÚÛŠ™]È\œ›ÜŠ´)4/´`´/´,ô`4,4a4.4cÈ4/t-H4/ô`4/´aô.4`´,4/t,4/t,4ct`´/´/4`ô`t`´`4/´.t`t`´,´-KˆŠJ__J_B™[˜Ý[Ûˆ™ØY\ØY[XYÙJJ^Ü™]\›ˆ™]È›ÛZ\ÙJ
ŠOOžØÛÛœÝ[™]È[XYÙNÜ‹›Û›ØYJ
OO
ŠK‹›Û™\œ›ÜJ
OO›Š™]È\œ›ÜŠ´)4/´`4/4,4`ˆ4a4/´`´/´,ô`4,4a4.4.4/t-H4/ô/´-4-4-t`4-´.4,´,4-t`´`tcÈ4,t`4,4`ô-ô-t`4/´/ˆŠJNÝž^Ü‹œÜ˜ÏY_XØ]ÚÛŠ™]È\œ›ÜŠ´)4/´`4/4,4`ˆ4a4/´`´/´,ô`4,4a4.4.4/t-H4/ô/´-4-4-t`4-´.4,´,4-t`´`tcÈ4,t`4,4`ô-ô-t`4/´/ˆŠJ__J_B™[˜Ý[Ûˆ™Ø[˜\Ò[XYÙP›ØŠK
^Ü™]\›ˆ™]È›ÛZ\ÙJ
‹ŠOOžÝž^ÙKÐ›ØŠOO˜OÛŠJNœŠ™]È\œ›ÜŠ´'t-H4`ô-4,4.ô/´`tc4/ô/´-4,ô/´`´/´,´.4`´c4a4/´`´/´,ô`4,4a4.4c‹ˆŠJKš[XYÙKÚœYÈ‹
_XØ]ÚÜŠ™]È\œ›ÜŠ´'t-H4`ô-4,4.ô/´`tc4/ô/´-4,ô/´`´/´,´.4`´c4a4/´`´/´,ô`4,4a4.4c‹ˆŠJ__J_B™[˜Ý[Ûˆ™\ØY[XYÙQš[JK
^Ýž^Ü™]\›ˆ™]Èš[JÙWKÝ\Nˆš[XYÙKÚœYÈ‹\Ý[ÙYšYY‘]K››ÝÊ
_J_XØ]ÚÜ™]\›ˆØš™XÝ™Yš[™T›Ü\JK˜™š[S˜[YH‹Ý˜[YNÛÛ™šYÝ\˜X›NˆLJK__B˜\Þ[˜È[˜Ý[Ûˆ™›ØÔ™\\™R[XYÙJK^ßJ^ÚYŠY_\[ÙˆHOOH›Øš™XÝŠ]›ÝÈ™]È\œ›ÜŠ´)4,4.t.È4a4/´`´/´,ô`4,4a4.4.4/t-H4/ô`4/´aô.4`´,4/Kˆ4$´bô,t-t`4.4`´-H4-t,ô/ˆ4-tbtdH4`4,4-ËˆŠNØÛÛœÝX™ÛY[[XYÙR[™›ÊJNÚYŠ[‹š\Ò[XYÙJ\™]\›ˆNØÛÛœÝS[X™\ŠKœÚ^™J_OSX]›X^
NMŒ[X™\Š\™Ù]ž]\Ê_NÍÍŠNÚYŠL
]›ÝÈ™]È\œ›ÜŠ´)4/´`´/´,ô`4,4a4.4cÈ4/ô`ô`t`´,ˆ4$´bô,t-t`4.4`´-H4-tdH4-tbtdH4`4,4-ËˆŠNÚYŠ˜™\ØYÚ[™ÛTÛÝ\˜ÙS[Z]ž]\Ê]›ÝÈ™]È\œ›ÜŠ´'´-4/t/ˆ4.4`tat/´-4/t/´-H4a4/´`´/ˆ4/t-H4-4/´.ô-´/t/ˆ4/ô`4-t,´bôb4,4`´cÌˆ4'4$KˆŠNÚYŠ]™›Ü˜ÙI‰˜™\™XÝ[XYÙU\\Ëš\Ê‹\JI‰œLÎLÌŒMŠ\™]\›ˆNÝž^ØÛÛœÝÏX]ØZ]™™XY[XYÙQ]U\›
JKX]ØZ]™ØY\ØY[XYÙJÊKO[›˜]\˜[ÚYÚY[›˜]\˜[ZYÚšZYÚSX]›X^
K
NÚYŠYŠ]›ÝÈ™]È\œ›ÜŠ´)4/´`´/´,ô`4,4a4.4cÈ4/t-H4`t/´-4-t`4-´.4`ˆ4.4-ô/´,t`4,4-´-t/t.4cËˆŠNØÛÛœÝOXOMÌŒMÌMÌ˜OLLNŽLOÌŒŒÛ]SX]›Z[ŠKKÙŠKÏ[[Ù›ÜŠ]OLÞONÞJÊÊ^ØÛÛœÝYØÝ[Y[˜Ü™X]Q[[Y[
˜Ø[˜\ÈŠNÚ‹ÚYSX]›X^
KX]œ›Ý[™
Jš
JK‹šZYÚSX]›X^
KX]œ›Ý[™

š
JNØÛÛœÝZ‹™Ù]ÛÛ^
Œ™ŠNÚYŠ]Š]›ÝÈ™]È\œ›ÜŠ´'t-H4`ô-4,4.ô/´`tc4/ô/´-4,ô/´`´/´,´.4`´c4a4/´`´/´,ô`4,4a4.4c‹ˆŠNÝ‹™š[Ý[OHˆÙ™™ˆ‹‹™š[™XÝ
‹ÚY‹šZYÚ
K‹™˜]Ò[XYÙJ‹ÚY‹šZYÚ
NÙÏX]ØZ]™Ø[˜\Ò[XYÙP›ØŠ‹ËŽ‹ŽÍŽŒ—VÞWJNÚYŠËœÚ^™OXJXœ™XZÎÚ
SX]›Z[ŠŽKX]›X^
NX]œÜ\
KÙËœÚ^™JJ‹ŽM
J_ZYŠYÊ]›ÝÈ™]È\œ›ÜŠ´'t-H4`ô-4,4.ô/´`tc4/ô/´-4,ô/´`´/´,´.4`´c4a4/´`´/´,ô`4,4a4.4c‹ˆŠNÚYŠXI‰™ËœÚ^™O\Š\™]\›ˆNÚYŠËœÚ^™O˜JŒKŒMJ]›ÝÈ™]È\œ›ÜŠ´)4/´`´/´,ô`4,4a4.4cˆ4/t-H4`ô-4,4.ô/´`tc4`ô/4-t/tc4b4.4`´c4-4/ˆ4,t-t-ô/´/ô,4`t/t/´,ô/ˆ4`4,4-ô/4-t`4,ˆŠNÜ™]\›ˆ™\ØY[XYÙQš[JË‹›˜[YKœ™\XÙJ×–×‹—JÉËˆŠJÈ‹šœÈŠ_XØ]Ú
Ê^ÚYŠ™\™XÝ[XYÙU\\Ëš\Ê‹\JI‰œXJ\™]\›ˆNØÛÛœÝ\È[œÝ[˜Ù[Ùˆ\œ›ÜÜË›Y\ÜØYÙNˆˆŽÚYŠ	‰›OOH´)4/´`4/4,4`ˆ4a4/´`´/´,ô`4,4a4.4.4/t-H4/ô/´-4-4-t`4-´.4,´,4-t`´`tcÈ4,t`4,4`ô-ô-t`4/´/ˆŠ]›ÝÈÎÝ›ÝÈ™]È\œ›ÜŠ´)4/´`4/4,4`ˆ4a4/´`´/ˆ4/t-H4`ô-4,4.ô/´`tc4/´,t`4,4,t/´`´,4`´c4/t,TÛ™Kˆ4(t-4-t.ô,4.t`´-H4`t/t.4/4/´.ˆ4ct.´`4,4/t,4.4.ô.4,´bô,t-t`4.4`´-H4,´-t`4`t.4cˆ”ËÔ‘ËˆŠ__B˜\Þ[˜È[˜Ý[Ûˆ™›ØÔ™\\™R[XYÙ\ÊJ^ØÛÛœÝP\œ˜^Kš\Ð\œ˜^JJOÙN–ÙWK]™š[\ŠO˜™ÛY[[XYÙR[™›ÊŠKš\Ò[XYÙJNÚYŠ[‹›[™Ý
\™]\›ˆÚYŠ‹›[™ÝOO]›[™Ý
]›ÝÈ™]È\œ›ÜŠ´)4/´`´/´,ô`4,4a4.4.4.4a4,4.t.ôbÈ4-4`4`ô,ô.4aH4`´.4/ô/´,ˆ4-ô,4,ô`4`ô-´,4.t`´-H4/´`´-4-t.ôc4/t/‹ˆŠNØÛÛœÝSX]›X^
ÎLÌŒM‹X]™›ÛÜŠ
™\ØY^[ØYYÙ]ž]\ËMMLÍŠKÛ‹›[™Ý
JKOSX]›Z[ŠNÍÍ‹ŠKÏV×NÙ›ÜŠÛÛœÝÙˆ
\Ëœ\Ú
]ØZ]™›ØÔ™\\™R[XYÙJÙ›Ü˜ÙN›‹›[™ÝŒ_[X™\ŠœÚ^™JOŒÎLÌŒM‹\™Ù]ž]\Î˜_JJNØÛÛœÝO\Ëœ™YXÙJ

OO›
Ê[X™\ŠœÚ^™J_
K
NÚYŠO˜™\ØY^[ØYYÙ]ž]\Ê]›ÝÈ™]È\œ›ÜŠ´)4/´`´/´,ô`4,4a4.4.4,´`tdH4-tbtdH4`t.ô.4b4.´/´/4,´-t.ô.4.´.ˆ4$´bô,t-t`4.4`´-H4/4-t/tc4b4-H4`t`´`4,4/t.4aˆ4-ô,4/´-4.4/H4`4,4-ËˆŠNÜ™]\›ˆßB˜\Þ[˜È[˜Ý[Ûˆ™\ØY™\ÜÛœÙRœÛÛŠK
^ØÛÛœÝX]ØZ]K^

NÛ][[Ýž^Ü[Ò”ÓÓ‹œ\œÙJŠN›[XØ]ÚßZYŠYK›Úß\Ë›ÚÊ^ÚYŠKœÝ]\ÏOOMLÊ]›ÝÈ™]È\œ›ÜŠ´'t-H4`ô-4,4.ô/´`tc4/ô-t`4-t-4,4`´c4a4/´`´/´,ô`4,4a4.4cˆ4/ô/´`t.ô-H4,4,´`´/´/4,4`´.4aô-t`t.´/´,ô/ˆ4`t-´,4`´.4cËˆ4'ô/´,´`´/´`4.4`´-H4/ô/´/ôbô`´.´`ËˆŠNÝ›ÝÈ™]È\œ›ÜŠË™\œ›ÜŸ
_\™]\›ˆŸB˜ÛÛœÝ™\˜Ú\ÙPÚ[šÕ\ØY™\œÚ[ÛHœÝYÙY\\˜Ú\ÙK]ŽH‹™\˜Ú\ÙTYÙU\™Ù]ž]\ÏMMÌÍ™\˜Ú\ÙT™]žU\™Ù]ž]\ÏLÌÍŽÂ˜\Þ[˜È[˜Ý[Ûˆ™\˜Ú\ÙQ[]Qš[\ÊJ^Ù›ÜŠÛÛœÝÙˆJ]ž^Ø]ØZ]™]Ú
‹Ø\KÜ\˜Ú\Ù\ËÙš[\ËÈŠÙ[˜ÛÙUT’PÛÛ\Û™[

KÛY]Ùˆ‘SUHŸJ_XØ]Úß_B˜\Þ[˜È[˜Ý[Ûˆ™\˜Ú\ÙTÝYÙR[XYÙJK‹‹J^Ù›ÜŠ]ÏLÜÏŽÜÊÊÊ^ØÛÛœÝ\ÏOOLØ™\˜Ú\ÙTYÙU\™Ù]ž]\Î˜™\˜Ú\ÙT™]žU\™Ù]ž]\ÎÝ\[ÙˆOOOH™[˜Ý[Ûˆ‰‰˜J
ÏOOLÈ´'ô/´-4,ô/´`´,4,´.ô.4,´,4cˆŽˆ´%4/´/ô/´.ô/t.4`´-t.ôc4/t/ˆ4`t-´.4/4,4cˆŠJÈˆ4a4/´`´/ˆŠÛŠÈˆ4.4-ÈŠÜŠÈ¸ )ˆŠNØÛÛœÝOX]ØZ]™›ØÔ™\\™R[XYÙJKÙ›Ü˜ÙNˆL\™Ù]ž]\Î›JK[™]È›Ü›Q]NÙ˜\[™
™š[H‹K™\ØYš[S˜[YJK™\ØYš[S˜[YJK™ØÝ[Y[HŠÛŠÈ‹šœÈŠJJK˜\[™
œÛÝ\˜ÙH‹
K\[ÙˆOOOH™[˜Ý[Ûˆ‰‰˜J´%ô,4,ô`4`ô-´,4cˆ4a4/´`´/ˆŠÛŠÈˆ4.4-ÈŠÜŠÈ¸ )ˆŠNØÛÛœÝX]ØZ]™]Ú
‹Ø\KÜ\˜Ú\Ù\ËÙš[\È‹ÛY]Ùˆ”ÔÕ‹›ÙN™JNÚYŠ‹œÝ]\ÏOOMLÉ‰œÏOOL
XÛÛ[YNØÛÛœÝOX]ØZ]™\ØY™\ÜÛœÙRœÛÛŠ‹´'t-H4`ô-4,4.ô/´`tc4-ô,4,ô`4`ô-ô.4`´c4a4/´`´/ˆŠÛŠNÜ™]\›ˆK™š[_]›ÝÈ™]È\œ›ÜŠ´)4/´`´/ˆŠÛŠÈˆ4/t-H4/ô/´/4-t`t`´.4.ô/´`tc4-4,4-´-H4/ô/´`t.ô-H4/ô/´,´`´/´`4/t/´,ô/ˆ4`t-´,4`´.4cËˆ4(t-4-t.ô,4.t`´-H4`t/t.4/4/´.ˆ4,t.ô.4-´-H4.4.ô.4/´,t`4-t-´c4`´-H4.ô.4b4/t.4-H4.´`4,4cËˆŠ_B˜\Þ[˜È[˜Ý[Ûˆ™\˜Ú\ÙTÝYÙR[XYÙ\ÊKŠ^ØÛÛœÝV×NÝž^Ù›ÜŠ]OLØOK›[™ÝØJÊÊ\‹œ\Ú
]ØZ]™\˜Ú\ÙTÝYÙR[XYÙJVØWKJÌKK›[™ÝŠJNÜ™]\›ˆŸXØ]Ú
J^Ø]ØZ]™\˜Ú\ÙQ[]Qš[\Ê‹›X\
ÏOœËšY
JNÝ›ÝÈ__B˜ÛÛœÝ™Y[PÚ[šÕ\ØY™\œÚ[ÛH˜˜XÚÙÜ›Ý[™[Y[K]H‹™Y[TYÙU\™Ù]ž]\ÏLMMÌŽ™Y[T™XÛÙÛš][Û˜]ÚÚ^™OLK™Y[T™XÛÙÛš][ÛÛÛ˜Ý\œ™[˜ÞOL‹™Y[TÛ[\˜[\ÏLN™Y[TÛXY[™S\ÏMÂ˜\Þ[˜È[˜Ý[Ûˆ™Ø][ÙÑ[]Qš[\ÊJ^Ù›ÜŠÛÛœÝÙˆJ]ž^Ø]ØZ]™]Ú
‹Ø\KØØ][ÙËÙš[\ËÈŠÙ[˜ÛÙUT’PÛÛ\Û™[

KÛY]Ùˆ‘SUHŸJ_XØ]Úß_B˜\Þ[˜È[˜Ý[Ûˆ™Ø][ÙÔÝYÙT™\ÜÛœÙJK
^ØÛÛœÝX]ØZ]K^

NÛ][[Ýž^Ü[Ò”ÓÓ‹œ\œÙJŠN›[XØ]ÚßZYŠYK›Úß\Ë›ÚÊ^ÚYŠKœÝ]\ÏOOMLÊ]›ÝÈ™]È\œ›ÜŠ´(t`´`4,4/t.4a´,ŠÝ
Èˆ4/t-H4/ô/´/4-t`t`´.4.ô,4`tc4/ô/´`t.ô-H4,4,´`´/´/4,4`´.4aô-t`t.´/´.H4/ô/´-4,ô/´`´/´,´.´.ˆ4'ô/´,´`´/´`4.4`´-H4-ô,4,ô`4`ô-ô.´`ËˆŠNÝ›ÝÈ™]È\œ›ÜŠË™\œ›ÜŸ´'t-H4`ô-4,4.ô/´`tc4-ô,4,ô`4`ô-ô.4`´c4`t`´`4,4/t.4a´`ÈŠÝ
_\™]\›ˆŸB˜\Þ[˜È[˜Ý[Ûˆ™Ø][ÙÔÝYÙR[XYÙ\ÊKŠ^ØÛÛœÝV×NÝž^Ù›ÜŠ]OLØOK›[™ÝØJÊÊ^Ý\[ÙˆOOH™[˜Ý[Ûˆ‰‰›Š´'ô/´-4,ô/´`´,4,´.ô.4,´,4cˆ4`t`´`4,4/t.4a´`ÈŠÊJÌJJÈˆ4.4-ÈŠÙK›[™Ý
È¸ )ˆŠNØÛÛœÝÏYVØWKX]ØZ]™›ØÔ™\\™R[XYÙJËÙ›Ü˜ÙNˆL\™Ù]ž]\Î˜™Y[TYÙU\™Ù]ž]\ßJKO[™]È›Ü›Q]NÝK˜\[™
™š[H‹™\ØYš[S˜[YJ™\ØYš[S˜[YJË›Y[KHŠÊJÌJJÈ‹šœÈŠJJKK˜\[™
œÛÝ\˜ÙH‹
K\[ÙˆOOH™[˜Ý[Ûˆ‰‰›Š´%ô,4,ô`4`ô-´,4cˆ4`t`´`4,4/t.4a´`ÈŠÊJÌJJÈˆ4.4-ÈŠÙK›[™Ý
È¸ )ˆŠNØÛÛœÝX]ØZ]™]Ú
‹Ø\KØØ][ÙËÙš[\È‹ÛY]Ùˆ”ÔÕ‹›ÙN_JKX]ØZ]™Ø][ÙÔÝYÙT™\ÜÛœÙJJÌJNÜ‹œ\Ú
‹™š[J_\™]\›ˆŸXØ]Ú
J^Ø]ØZ]™Ø][ÙÑ[]Qš[\Ê‹›X\
ÏOœËšY
JNÝ›ÝÈ__B˜\Þ[˜È[˜Ý[Ûˆ™Ø][ÙÒœÛÛ”™\ÜÛœÙJK
^ØÛÛœÝX]ØZ]K^

NÛ][[Ýž^Ü[Ò”ÓÓ‹œ\œÙJŠN›[XØ]ÚßZYŠYK›Úß\Ë›ÚÊ^ØÛÛœÝO[™]È\œ›ÜŠË™\œ›ÜŸ
NØKœÝ]\ÏYKœÝ]\ËK˜ÛÙO\Ë˜ÛÙ_ˆŽÝ›ÝÈ_\™]\›ˆŸB™[˜Ý[Ûˆ™Ø][ÙÕØZ]
J^Ü™]\›ˆ™]È›ÛZ\ÙJOœÙ][Y[Ý]
JJ_B˜\Þ[˜È[˜Ý[Ûˆ™Ø][ÙÔÛ›ØŠKŠ^ØÛÛœÝQ]K››ÝÊ
JØ™Y[TÛXY[™S\ÎÛ]OLÝÚ[J]K››ÝÊ
OŠ^Ø]ØZ]™Ø][ÙÕØZ]
™Y[TÛ[\˜[\ÊNÝž^ØÛÛœÝÏX]ØZ]™]Ú
‹Ø\KØØ][ÙËÚ[\Ü‹ÛY]Ùˆ”ÔÕ‹XY\œÎžÈÛÛ[U\HŽˆ˜\XØ][Û‹ÚœÛÛˆŸK›ÙN’”ÓÓ‹œÝš[™ÚYžJØXÝ[ÛŽˆœÛ\™XÛÙÛš][Ûˆ‹›Ø’Y™_J_JNÚYŠËœÝ]\ÏOOLŒŠ^ØOLØÛÛ[Y_ZYŠ\Ë›ÚÉ‰–ÍL‹LËLKš[˜ÛY\ÊËœÝ]\ÊI‰˜JÊÏÊXÛÛ[YNÜ™]\›ˆ]ØZ]™Ø][ÙÒœÛÛ”™\ÜÛœÙJË
_XØ]Ú
Ê^ÚYŠ
È[œÝ[˜Ù[Ùˆ\Q\œ›ÜŸÍL‹LËLKš[˜ÛY\Ê[X™\ŠÏËœÝ]\ÊJJI‰˜JÊÏÊXÛÛ[YNÚYŠÈ[œÝ[˜Ù[Ùˆ\œ›Ü‰‰ˆKÓØY˜Z[YÚK\Ý
Ë›Y\ÜØYÙJJ]›ÝÈÎÝ›ÝÈ™]È\œ›ÜŠŸ
__]›ÝÈ™]È\œ›ÜŠ´(4,4`t/ô/´-ô/t,4,´,4/t.4-H4`t`´`4,4/t.4a´bÈ4-ô,4/tcô.ô/ˆ4,t/´.ôc4b4-H4,´/´`tc4/4.4/4.4/t`ô`‹ˆ4'ô/´,´`´/´`4.4`´-H4-ô,4,ô`4`ô-ô.´`È4/ô/´-ô-´-KˆŠ_B˜\Þ[˜È[˜Ý[Ûˆ™Ø][ÙÔ™\]Y\Ý
KŠ^Û][[Ù›ÜŠ]OLØOŽØJÊÊ]ž^ØÛÛœÝÏX]ØZ]™]Ú
‹Ø\KØØ][ÙËÚ[\Ü‹ÛY]Ùˆ”ÔÕ‹XY\œÎžÈÛÛ[U\HŽˆ˜\XØ][Û‹ÚœÛÛˆŸK›ÙN’”ÓÓ‹œÝš[™ÚYžJJ_JNÚYŠ\Ë›ÚÉ‰–ÍL‹LËLKš[˜ÛY\ÊËœÝ]\ÊI‰˜OOOL
XÛÛ[YNØÛÛœÝX]ØZ]™Ø][ÙÒœÛÛ”™\ÜÛœÙJË
NÜ™]\›ˆËš›Ø’YØ]ØZ]™Ø][ÙÔÛ›ØŠš›Ø’YŠN›XØ]Ú
Ê^Ü\ÎÚYŠOOOL	‰ŠÈ[œÝ[˜Ù[Ùˆ\Q\œ›ÜŸÍL‹LËLKš[˜ÛY\Ê[X™\ŠÏËœÝ]\ÊJJJXÛÛ[YNØœ™XZßZYŠˆ[œÝ[˜Ù[Ùˆ\œ›Ü‰‰ˆKÓØY˜Z[YÚK\Ý
‹›Y\ÜØYÙJJ]›ÝÈŽÝ›ÝÈ™]È\œ›ÜŠŸ
_B™[˜Ý[Ûˆ™Ø][ÙÔÜ]™XÛÙÛš][Û‘\œ›ÜŠJ^Ü™]\›ˆ[X™\ŠOËœÝ]\ÊOOOMŒ‰‰–ÈRWÔ‘TÔÓ”ÑWÑ“Ô“PU‹RWÓÕUUÒSÓÓTUH—Kš[˜ÛY\ÊÝš[™ÊOË˜ÛÙ_ˆŠJ_B˜\Þ[˜È[˜Ý[Ûˆ™Ø][ÙÔ™XÛÙÛš\ÙR[XYÙ\ÊKŠ^ØÛÛœÝV×NÙ›ÜŠ]OLØOK›[™ÝØJÏX™Y[T™XÛÙÛš][Û˜]ÚÚ^™J\‹œ\Ú
Ùš[\Î™KœÛXÙJKJØ™Y[T™XÛÙÛš][Û˜]ÚÚ^™JKÝ\˜JÌ_JNØÛÛœÝÏ[™]È\œ˜^J‹›[™Ý
NÛ]LOL[[Ø\Þ[˜È[˜Ý[ÛˆŠ
^Ù›ÜŠÎÊ^ÚYŠ
\™]\›ŽØÛÛœÝO[
ÊÎÚYŠO\‹›[™Ý
\™]\›ŽØÛÛœÝ\–ÛWKÏZœÝ\
Ú™š[\Ë›[™ÝLKOZ™š[\Ë›[™ÝOOLOÈ´(4,4`t/ô/´-ô/t,4cˆ4`t`´`4,4/t.4a´`ÈŠÚœÝ\
Èˆ4.4-ÈŠÙK›[™Ý
È¸ )ˆŽˆ´(4,4`t/ô/´-ô/t,4cˆ4`t`´`4,4/t.4a´bÈŠÚœÝ\
È¸ $ÈŠÙÊÈˆ4.4-ÈŠÙK›[™Ý
È¸ )ˆŽÝž^Ý\[ÙˆOOH™[˜Ý[Ûˆ‰‰›ŠJNØÛÛœÝX]ØZ]™Ø][ÙÔ™\]Y\Ý
ØXÝ[ÛŽˆœ™XÛÙÛš\ÙKX˜]Ú‹ÛÝ\˜ÙQš[RYÎš™š[\Ë›X\
O‹šY
KÛÝ\˜ÙNYÙTÝ\šœÝ\YÙUÝ[™K›[™ÝK´'t-H4`ô-4,4.ô/´`tc4`4,4`t/ô/´-ô/t,4`´c4`t`´`4,4/t.4a´`ÈŠÚœÝ\´(t,´cô-ôc4/ô`4-t`4,´,4.ô,4`tc4/ô`4.4`4,4`t/ô/´-ô/t,4,´,4/t.4.4`t`´`4,4/t.4a´bÈŠÚœÝ\
È‹ˆ4'ô/´,´`´/´`4.4`´-H4-ô,4,ô`4`ô-ô.´`ËˆŠNÜÖÛWOVÚ‹œ\KJÏZ™š[\Ë›[™Ý\[ÙˆOOH™[˜Ý[Ûˆ‰‰›Š´(4,4`t/ô/´-ô/t,4/t/ˆŠÝJÈˆ4.4-ÈŠÙK›[™Ý
Èˆ4`t`´`4,4/t.4aˆ4/4-t/tc¸ )ˆŠ_XØ]Ú
Š^ÚYŠ™š[\Ë›[™ÝŒI‰˜™Ø][ÙÔÜ]™XÛÙÛš][Û‘\œ›ÜŠŠJ^ØÛÛœÝV×NÝž^Ù›ÜŠ]LØ™š[\Ë›[™ÝØŠÊÊ^ØÛÛœÝZœÝ\
ØŽÝ\[ÙˆOOH™[˜Ý[Ûˆ‰‰›Š´(ô`´/´aô/tcôcˆ4`t`´`4,4/t.4a´`ÈŠÓŠÈˆ4.4-ÈŠÙK›[™Ý
È¸ )ˆŠNØÛÛœÝOX]ØZ]™Ø][ÙÔ™\]Y\Ý
ØXÝ[ÛŽˆœ™XÛÙÛš\ÙKX˜]Ú‹ÛÝ\˜ÙQš[RYÎ–Ú™š[\ÖØ—KšYKÛÝ\˜ÙNYÙTÝ\“‹YÙUÝ[™K›[™ÝK´'t-H4`ô-4,4.ô/´`tc4`4,4`t/ô/´-ô/t,4`´c4`t`´`4,4/t.4a´`ÈŠÓ‹´(t,´cô-ôc4/ô`4-t`4,´,4.ô,4`tc4/ô`4.4`4,4`t/ô/´-ô/t,4,´,4/t.4.4`t`´`4,4/t.4a´bÈŠÓŠÈ‹ˆ4'ô/´,´`´/´`4.4`´-H4-ô,4,ô`4`ô-ô.´`ËˆŠNÝ‹œ\Ú
Kœ\
KJÊË\[ÙˆOOH™[˜Ý[Ûˆ‰‰›Š´(4,4`t/ô/´-ô/t,4/t/ˆŠÝJÈˆ4.4-ÈŠÙK›[™Ý
Èˆ4`t`´`4,4/t.4aˆ4/4-t/tc¸ )ˆŠ_\ÖÛWO]ŸXØ]Ú
Š^ÙXŽÜ™]\›Ÿ_Y[Ù^ÙZŽÜ™]\›Ÿ___X]ØZ]›ÛZ\ÙK˜[
\œ˜^K™œ›ÛJÛ[™Ý“X]›Z[Š™Y[T™XÛÙÛš][ÛÛÛ˜Ý\œ™[˜ÞK‹›[™Ý
_K

OO™Š
JJNÚYŠ
]›ÝÈØÛÛœÝO\Ë™›]

K™š[\Š›ÛÛX[ŠNÝ\[ÙˆOOH™[˜Ý[Ûˆ‰‰›Š´'´,tb´-t-4.4/tcôcˆŠÙK›[™Ý
Èˆ4`t`´`4,4/t.4aˆ4,ˆ4/´-4/t/ˆ4/4-t/tc¸ )ˆŠNØÛÛœÝX]ØZ]™Ø][ÙÔ™\]Y\Ý
ØXÝ[ÛŽˆ›Y\™ÙKX˜]Ú\È‹ÛÝ\˜ÙQš[RYÎ™K›X\
ÏO™ËšY
KÛÝ\˜ÙN\Î›_K´'t-H4`ô-4,4.ô/´`tc4/´,tb´-t-4.4/t.4`´c4`4,4`t/ô/´-ô/t,4/t/tbô-H4`t`´`4,4/t.4a´bÈ‹´(t,´cô-ôc4/ô`4-t`4,´,4.ô,4`tc4/ô`4.4`t,t/´`4.´-H4/4-t/tc‹ˆ4'ô/´,´`´/´`4.4`´-H4-ô,4,ô`4`ô-ô.´`ËˆŠNÜ™]\›ˆ™˜YB™[˜Ý[Ûˆ™Ý\Y\œÔYÙJ
^ØÛÛœÝËWOX

K™Ý\Y\”]Y\žO\ÝJ
K™Ý\Y\”™]\›•Ï[™]ÈT“ÙX\˜Ú\˜[\Ê™Ý\Y\”]Y\žJK™Ù]
œ™]\›•ÈŠOOOH™š[˜[˜ÙHÈ‹Ùš[˜[˜ÙHŽˆ‹ÜÝ\Y\œÈ‹Ú\Ô™XYNOPZJ
KÝØ\Ý›ŸO\ÛŠ
KÜ‹WOTË\ÙTÝ]J

OO–È™ØÝ[Y[È‹˜ÛÛ\\™H‹œÝ\Y\œÈ—Kš[˜ÛY\ÊÚ[™ÝË˜™™XY˜]šYØ][Û”]Y\žJXˆ‹™ØÝ[Y[ÈŠJOÝÚ[™ÝË˜™™XY˜]šYØ][Û”]Y\žJXˆ‹™ØÝ[Y[ÈŠNˆ™ØÝ[Y[ÈŠKÜËOTË\ÙTÝ]J

OO˜™›ØÐ\œ˜^J™Ý\Y\”ÝÜ™RÙ^JJKÝKOTË\ÙTÝ]J

OO˜™›ØÐ\œ˜^J™\˜Ú\ÙTÝÜ™RÙ^JJKÙ‹WOTË\ÙTÝ]J[
KÚ×OTË\ÙTÝ]J[
KÞK—OTË\ÙTÝ]J

OOÚ[™ÝË˜™™XY˜]šYØ][Û”]Y\žJœH‹ˆŠJKÝ‹—OTË\ÙTÝ]JLJKÓ‹WOTË\ÙTÝ]JˆŠKÐËOTË\ÙTÝ]J×JKØ™šY]ÙY\˜Ú\ÙK™Ù]šY]ÙY\˜Ú\ÙWOTË\ÙTÝ]J[
KÏTË\ÙT™YŠ[
KTË\ÙT™YŠ[
KTË\ÙT™YŠ[
KO]\[ÙˆÚ[™ÝË˜™\ÐÛY[\›Z\ÜÚ[ÛOOH™[˜Ý[ÛˆÝÚ[™ÝË˜™\ÐÛY[\›Z\ÜÚ[ÛŠš[™[ÜžK›X[˜YÙHŠN›ØØ[ÝÜ˜YÙK™Ù]][J˜™ØXÝ]™WÜ›ÛHŠOOOH›ÝÛ™\ˆ‹™Ø[“X[˜YÙQš[˜[˜ÙO]\[ÙˆÚ[™ÝË˜™\ÐÛY[\›Z\ÜÚ[ÛOOH™[˜Ý[ÛˆÝÚ[™ÝË˜™\ÐÛY[\›Z\ÜÚ[ÛŠ™š[˜[˜ÙK›X[˜YÙHŠN›ØØ[ÝÜ˜YÙK™Ù]][J˜™ØXÝ]™WÜ›ÛHŠOOOH›ÝÛ™\ˆŽÔË\ÙQY™™XÝ


OOžÝÚ[™ÝË˜™Þ[˜Ó˜]šYØ][Û”]Y\žJÝXŽœOOH™ØÝ[Y[ÈÛ[œ‹Nž_[J_KÜ‹WJNÔË\ÙQY™™XÝ


OOžÝ	‰Š
™›ØÐ\œ˜^J™Ý\Y\”ÝÜ™RÙ^JJK
™›ØÐ\œ˜^J™\˜Ú\ÙTÝÜ™RÙ^JJJ_KÝJNÔË\ÙQY™™XÝ


OOžÚYŠ]
\™]\›ŽØÛÛœÝ[™]ÈT“ÙX\˜Ú\˜[\Ê™Ý\Y\”]Y\žJKÏ\™Ù]
™ØÝ[Y[YŠNÚYŠXÊ\™]\›ŽØÛÛœÝOX™›ØÐ\œ˜^J™\˜Ú\ÙTÝÜ™RÙ^JK™š[™
O”‹šYOOXÊNÒI‰Š™Ù]
™Y]ŠOOOHŒHÛJË‹‹’_JN˜™Ù]šY]ÙY\˜Ú\ÙJJJ_KÝ™Ý\Y\”]Y\žWJNØÛÛœÝÏTË\ÙSY[[Ê

OO˜™›ØÐ[\ÊJKÝWJKÏTË\ÙSY[[Ê

OO˜™›ØÐÛÛ\\š\ÛÛœÊJKÝWJKO[™]È]J
KÒTÓÔÝš[™Ê
KœÛXÙJÊK™Ý\Y\XØÛÝ[[™ÐÝ\œ™[˜ÞOX™[ÛPXØÛÝ[[™ÐÝ\œ™[˜ÞUŒÌŒ
[[
K™Ý\Y\“[ÛÝ\œ™[˜ÞOX™[ÛPÝ\œ™[˜ÞT\][Û•ŒÌŒ
K™š[\ŠOœœÝ]\ÏOOH˜ÛÛ™š\›YY‰‰œ™ØÝ[Y[\HOOHœšXÙWÛ\Ý‰‰”Ýš[™Ê™]_ˆŠKœÝ\ÕÚ]
JJKœ\˜Ú\ÙH‹™Ý\Y\XØÛÝ[[™ÐÝ\œ™[˜ÞJKX™Ý\Y\“[ÛÝ\œ™[˜ÞKš[˜ÛYYœ™YXÙJ
ÊOOœ
Ê[X™\ŠËÝ[
_
K
K™Ý\Y\‘^ÛYYÝ[ÏX™[ÛQ^ÛYYÝ\œ™[˜ÞUÝ[ÕŒÌŒ
™Ý\Y\“[ÛÝ\œ™[˜ÞK™^ÛYY
K\Ë™š[\ŠOœœÝ]\ÈOOH˜\˜Ú]™YŠK›[™ÝSË™š[\ŠOœœØ]š[™Ô\˜Ù[MJK›[™ÝOVË‹‹WKœÛÜ

ÊOO”Ýš[™ÊË™]_ˆŠK›ØØ[PÛÛ\\™JÝš[™Ê™]_ˆŠJ_Ýš[™ÊË˜ÛÛ™š\›YY]ˆŠK›ØØ[PÛÛ\\™JÝš[™Ê˜ÛÛ™š\›YY]ˆŠJJKSË™š[\ŠOˆ^_™›ØÓ›Ü›J›˜[YJÈˆŠÜœXÚØYÙTÚ^™JKš[˜ÛY\Ê™›ØÓ›Ü›JJJJNØ\Þ[˜È[˜Ý[ÛˆJÏH\ØY‹OH˜]]ÈŠ^ØÛÛœÝP\œ˜^Kš\Ð\œ˜^J
OÜ–ÜNÚYŠT‹›[™ÝPJ\™]\›ŽÑJÏOOH˜Ø[Y\˜HÈ´'ô/´-4,ô/´`´,4,´.ô.4,´,4cˆ4a4/´`´/ˆ4-4/´.´`ô/4-t/t`´,8 )ˆŽ˜ÏOOH™Ø[\žHÈ´'ô/´-4,ô/´`´,4,´.ô.4,´,4cˆŠÔ‹›[™Ý
Èˆ4a4/´`´/ˆ4-4/´.´`ô/4-t/t`´,8 )ˆŽˆ´(4,4`t/ô/´-ô/t,4cˆ4-ô,4.´`ô/ô/´aô/tbô.H4-4/´.´`ô/4-t/t`¸ )ˆŠNÛ]™ÝYÙY\˜Ú\ÙQš[\ÏV×K™[›ÚXÙT™XÛÙÛš][Û”\ÙU[Y\ŽÝž^Û]ÙNÚYŠ‹™]™\žJOO˜™ÛY[[XYÙR[™›ÊJKš\Ò[XYÙJJ^Ø™ÝYÙY\˜Ú\ÙQš[\ÏX]ØZ]™\˜Ú\ÙTÝYÙR[XYÙ\Ê‹ËJKJ´)ô.4`´,4-t/4-4/´.´`ô/4-t/t`¸ )ˆŠK™[›ÚXÙT™XÛÙÛš][Û”\ÙU[Y\\Ù][Y[Ý]


OO‘J´(t/´/ô/´`t`´,4,´.ôcô-t/4/ô/´-ô.4a´.4.8 )ˆŠKL
KÙOX]ØZ]™]Ú
™[›ÚXÙT™XÛÙÛš][Û”XU\›ŒŠ
KÛY]Ùˆ”ÔÕ‹XY\œÎžÈÛÛ[U\HŽˆ˜\XØ][Û‹ÚœÛÛˆŸK›ÙN’”ÓÓ‹œÝš[™ÚYžJÜÛÝ\˜ÙQš[RYÎ˜™ÝYÙY\˜Ú\ÙQš[\Ë›X\
OO–KšY
KÛÝ\˜ÙN˜Ë[’_J_J_Y[Ù^ØÛÛœÝOX]ØZ]™›ØÔ™\\™R[XYÙ\ÊŠKYO[™]È›Ü›Q]NÙ›ÜŠ]LÒK›[™ÝÒŠÊÊ^ØÛÛœÝYYOVVÒ—NÚYK˜\[™
™š[\È‹YYK™\ØYš[S˜[YJYYK™\ØYš[S˜[YJ–Ò—K™ØÝ[Y[HŠÊŠÌJJÈ‹šœÈŠJJ_ZYK˜\[™
œÛÝ\˜ÙH‹ÊKYK˜\[™
š[‹JKÙOX]ØZ]™]Ú
™[›ÚXÙT™XÛÙÛš][Û”XU\›ŒŠ
KÛY]Ùˆ”ÔÕ‹›ÙNšY_J_XÛÛœÝYOX]ØZ]™\ØY™\ÜÛœÙRœÛÛŠÙK´'t-H4`ô-4,4.ô/´`tc4`4,4`t/ô/´-ô/t,4`´c4-4/´.´`ô/4-t/t`ˆŠNÛJYK™˜Y
K™ÝYÙY\˜Ú\ÙQš[\ÏV×_XØ]Ú
J^Ø™ÝYÙY\˜Ú\ÙQš[\Ë›[™Ý	‰˜]ØZ]™\˜Ú\ÙQ[]Qš[\Ê™ÝYÙY\˜Ú\ÙQš[\Ë›X\
YOOšYKšY
JKŠÝ˜\šX[ˆ™\œ›Üˆ‹]Nˆ´%4/´.´`ô/4-t/t`ˆ4/t-H4`4,4`t/ô/´-ô/t,4/H‹\ØÜš\[ÛŽ–H[œÝ[˜Ù[Ùˆ\œ›ÜÖK›Y\ÜØYÙNˆ´'ô/´,´`´/´`4.4`´-H4-ô,4,ô`4`ô-ô.´`È4`H4,t/´.ô-t-H4aôdt`´.´.4/4a4/´`´/‹ˆŸJ_Yš[˜[^ØÛX\•[Y[Ý]
™[›ÚXÙT™XÛÙÛš][Û”\ÙU[Y\ŠKJˆŠ__X\Þ[˜È[˜Ý[ÛˆŠËJ^ØÛÛœÝVË‹‹Š˜Ý\œ™[\™Ù]™š[\ß×JWKO\˜Ý\œ™[\™Ù]Ü˜Ý\œ™[\™Ù]˜[YOHˆŽÚYŠT‹›[™Ý
\™]\›ŽÚYŠOOOQ‹˜Ý\œ™[
^Þ
O–Ë‹‹’‹‹‹”—KœÛXÙJLŠJNÜ™]\›ŸX]ØZ]J‹ËJ_X\Þ[˜È[˜Ý[ÛˆŠ
^ØÛÛœÝYŽÛJ[
NÚYŠËœÝ]\ÏOOH˜ÛÛ™š\›YYŠ^ÙJ™Ý\Y\”™]\›•ÊNÜ™]\›ŸXÛÛœÝÏX™›ØÐ\œ˜^JËœÛÝ\˜ÙQš[RYÏË›[™ÝÜœÛÝ\˜ÙQš[RYÎ–ÜËœÛÝ\˜ÙQš[RYJK™š[\Š›ÛÛX[ŠNÙ›ÜŠÛÛœÝHÙˆÊ]ž^Ø]ØZ]™]Ú
‹Ø\KÜ\˜Ú\Ù\ËÙš[\ËÈŠÙ[˜ÛÙUT’PÛÛ\Û™[
JKÛY]Ùˆ‘SUHŸJ_XØ]Úß_X\Þ[˜È[˜Ý[ÛˆJ
^ÚYŠYŠ\™]\›ŽØŠL
NÝž^ØÛÛœÝ™Y][™ÐÛÛ™š\›YYY‹œÝ]\ÏOOH˜ÛÛ™š\›YY‹X]ØZ]™]Ú
™Y][™ÐÛÛ™š\›YYÈ‹Ø\KÜ\˜Ú\Ù\ËÝ\]HŽˆ‹Ø\KÜ\˜Ú\Ù\ËØÛÛ™š\›H‹ÛY]Ùˆ”ÔÕ‹XY\œÎžÈÛÛ[U\HŽˆ˜\XØ][Û‹ÚœÛÛˆŸK›ÙN’”ÓÓ‹œÝš[™ÚYžJÙØÝ[Y[™ŸJ_JKÏX]ØZ]šœÛÛŠ
NÚYŠ\›ÚßXË›ÚÊ]›ÝÈ™]È\œ›ÜŠË™\œ›ÜŸ´'t-H4`ô-4,4.ô/´`tc4`t/´at`4,4/t.4`´c4-ô,4.´`ô/ô.´`ÈŠNÐ\œ˜^Kš\Ð\œ˜^JËœÝ\Y\œÊI‰ŠÜÙJ™Ý\Y\”ÝÜ™RÙ^KËœÝ\Y\œÊK
ËœÝ\Y\œÊJK\œ˜^Kš\Ð\œ˜^JË™ØÝ[Y[ÊI‰ŠÜÙJ™\˜Ú\ÙTÝÜ™RÙ^KË™ØÝ[Y[ÊK
Ë™ØÝ[Y[ÊJK\œ˜^Kš\Ð\œ˜^JË™^[œÙ\ÊI‰’ÜÙJ˜™Ùš[˜[˜ÙWÙ^[œÙ\È‹Ë™^[œÙ\ÊKË˜\ÜÛÜY[	‰’ÜÙJ˜™Ø\ÜÛÜY[ÝŒH‹Ë˜\ÜÛÜY[
K\œ˜^Kš\Ð\œ˜^JËœÝØÚÓ[Ý™[Y[ÊI‰’ÜÙJ˜™ÜÝØÚ×Û[Ý™[Y[È‹ËœÝØÚÓ[Ý™[Y[ÊKJ[
K™Y][™ÐÛÛ™š\›YY	‰™J™Ý\Y\”™]\›•ÊKŠÝ˜\šX[ˆœÝXØÙ\ÜÈ‹]N˜™Y][™ÐÛÛ™š\›YYÈ´'t,4.´.ô,4-4/t,4cÈ4/´,t/t/´,´.ô-t/t,Ž™‹™ØÝ[Y[\OOOHœšXÙWÛ\ÝÈ´'ô`4,4.t`H4`t/´at`4,4/tdt/HŽˆ´%ô,4.´`ô/ô.´,4/ô`4/´,´-t-4-t/t,‹\ØÜš\[ÛŽ™‹™ØÝ[Y[\OOOHœšXÙWÛ\ÝÈ´)´-t/tbÈ4-4/´`t`´`ô/ô/tbÈ4-4.ôcÈ4`t`4,4,´/t-t/t.4cËˆŽ˜™Y][™ÐÛÛ™š\›YYÈ´%4/´.´`ô/4-t/t`ˆ4/´,t/t/´,´.ôdt/Kˆ4(t.´.ô,4-4/ô-t`4-t`taô.4`´,4/H4`´/´.ôc4.´/ˆ4-4.ôcÈ4`´/´,´,4`4/tbôaH4/ô/´-ô.4a´.4.NÈ4/´/ô.ô,4`´bÈ4/´`t`´,4c´`´`tcÈ4/´`´-4-t.ôc4/tbô/4.4/´/ô-t`4,4a´.4cô/4.ˆŽ“[X™\ŠËš[™[ÜžTÝ[[X\žOËœÜÝY[™\ÊOŒØ	Ó[X™\ŠËš[™[ÜžTÝ[[X\žKœÜÝY[™\Ê_H4/ô/´-ô.4a´.4.H4/ô/´`t`´,4,´.ô-t/t/ˆ4/t,4/ô`4.4at/´-ˆ4'´/ô.ô,4`´`È4-4/´,t,4,´c4`´-H4/´`´-4-t.ôc4/t/´.H4/´/ô-t`4,4a´.4-t.K˜ˆ´%4/´.´`ô/4-t/t`ˆ4/ô`4/´,´-t-4dt/H4,t-t-È4`t.´.ô,4-4`t.´/´,ô/ˆ4/ô`4.4at/´-4,ˆ4'´/ô.ô,4`´`È4-4/´,t,4,´c4`´-H4/´`´-4-t.ôc4/t/´.H4/´/ô-t`4,4a´.4-t.KˆŸJ_XØ]Ú

^ÛŠÝ˜\šX[ˆ™\œ›Üˆ‹]Nˆ´'t-H4`ô-4,4.ô/´`tc4`t/´at`4,4/t.4`´c‹\ØÜš\[ÛŽœ[œÝ[˜Ù[Ùˆ\œ›ÜÜ›Y\ÜØYÙNˆ´'ô`4/´,´-t`4c4`´-H4-4,4/t/tbô-H4.4/ô/´,´`´/´`4.4`´-KˆŸJ_Yš[˜[^ØŠLJ__X\Þ[˜È[˜Ý[Ûˆ

^ØÛÛœÝÏ\ËœÛÛYJOO’KšYOO\šY
OÜË›X\
OO’KšYOO\šYÜ’JN–Ü‹‹œ×NÛ
ÊK]ØZ]\Š™Ý\Y\”ÝÜ™RÙ^KÊKÊ[
KŠÝ˜\šX[ˆœÝXØÙ\ÜÈ‹]Nˆ´'ô/´`t`´,4,´bt.4.ˆ4`t/´at`4,4/tdt/H‹\ØÜš\[ÛŽœ›˜[Y_J_\™]\›ˆKšœÞÊK‘œ˜YÛY[ØÚ[™[Ž–ÚKšœÞ
ÜÚÝÐ›ÝÛS˜]ŽˆLÚ[™[ŽšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[‹Ú[™[Ž–ÚKšœÞÊšXY\ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[ZXY\ˆ‹Ú[™[Ž–ÚKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[X˜XÚÈ‹ÛÛXÚÎŠ
OOÚ[™ÝË˜™˜]šYØ]P˜XÚÊ‹Û[Ü™HŠK˜\šXK[X™[Žˆ´'t,4-ô,4-‹Ú[™[Žˆ¸¡¤ŸJKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[]]H‹Ú[™[Ž–ÚKšœÞ
šH‹ØÚ[™[Žˆ´'ô/´`t`´,4,´bt.4.´.4.4-ô,4.´`ô/ô.´.ŸJKKšœÞ
œ‹ØÚ[™[Žˆ´%4/´.´`ô/4-t/t`´bË4a´-t/tbÈ4.4`ô`t.ô/´,´.4cÈ4,ˆ4/´-4/t/´/4.´/´/t`´`ô`4-HŸJW_JKI‰šKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[ZXÛÛ‹X]Ûˆ‹ÛÛXÚÎŠ
OO™ÊßJK˜\šXK[X™[Žˆ´%4/´,t,4,´.4`´c4/ô/´`t`´,4,´bt.4.´,‹Ú[™[ŽˆŠÈŸJW_JKKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[Z\›È‹Ú[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[Y^YXœ›ÝÈ‹Ú[™[Žˆ´$tbô`t`´`4bô.H4`ôaôdt`ˆŸJKKšœÞ
šˆ‹ØÚ[™[Žˆ´(ta4/´`´/´,ô`4,4a4.4`4`ô.t`´-H4aô-t.ˆ8 %˜\‘ØÝÜˆ4`4,4-ô,t-t`4dt`ˆ4-t,ô/ˆ4/ô/ˆ4/ô/´-ô.4a´.4cô/ŸJKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[Z\›ËXÛÜH‹Ú[™[Žˆ´'ô-t`4-t-4`t/´at`4,4/t-t/t.4-t/4,´bÈ4/ô`4/´,´-t`4.4`´-H4/ô/´`t`´,4,´bt.4.´,4/ô/´-ô.4a´.4.4a4,4`t/´,´.´.4.4.4`´/´,Ëˆ4(t.´.ô,4-4`t.´/´.H4`ôaô-t`ˆ4/´/ô`4-t-4-t.ô.4`´`tcÈ4/ô/ˆ4`t,´cô-ô,4/t/tbô/4/ô/´-ô.4a´.4cô/4/t/´/4-t/t.´.ô,4`´`ô`4bËˆŸJKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[\š[X\žH‹\ØX›YˆPKÛÛXÚÎŠ
OO—Ë˜Ý\œ™[Ë˜ÛXÚÊ
KÚ[™[Žˆ¼'äíÈ4(t.´,4/t.4`4/´,´,4`´c4aô-t.ˆŸJW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[\Ý]È‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[\Ý]‹Ú[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Ž˜™›ØÓ[Û™^JK™š[™
O”Ýš[™Ê™]_ˆŠKœÝ\ÕÚ]
JJOË˜Ý\œ™[˜Þ_”•PˆŠ_JKKšœÞ
œÜ[ˆ‹ØÚ[™[Žˆ´%ô,4.´`ô/ô.´.4-ô,4/4-t`tcôaˆŸJW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[\Ý]‹Ú[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[ŽžŸJKKšœÞ
œÜ[ˆ‹ØÚ[™[Žˆ´'ô/´`t`´,4,´bt.4.´/´,ˆŸJW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[\Ý]‹Ú[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Ž“JKKšœÞ
œÜ[ˆ‹ØÚ[™[Žˆ´$´bô,ô/´-4/tbôaH4-ô,4/4-t/HŸJW_JW_JK™Ý\Y\“[ÛÝ\œ™[˜ÞK™^ÛYY›[™ÝŒ	‰šKšœÞ
™[ÛPÝ\œ™[˜ÞP›Ý[™\žS›ÝXÙUŒÌŒÜ™\ÜžØXØÛÝ[[™ÐÝ\œ™[˜ÞN˜™Ý\Y\XØÛÝ[[™ÐÝ\œ™[˜ÞK^ÛYY›Ü™ZYÛÝ\œ™[˜ÞUÝ[Î˜™Ý\Y\‘^ÛYYÝ[ß_JKI‰šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[XXÝ[ÛœÈ‹Ú[™[Ž–ÚKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[XXÝ[Ûˆ‹ÛÛXÚÎŠ
OO‘‹˜Ý\œ™[Ë˜ÛXÚÊ
KÚ[™[Ž–ÚKšœÞ
˜ˆ‹ØÚ[™[Žˆ¼'å¯4&4-È4,ô,4.ô-t`4-t.ŸJKKšœÞ
œÛX[‹ØÚ[™[Žˆ´'´-4/t/ˆ4.4.ô.4/t-t`t.´/´.ôc4.´/ˆ4a4/´`´/ˆŸJW_JKKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[XXÝ[Ûˆ‹ÛÛXÚÎŠ
OO•˜Ý\œ™[Ë˜ÛXÚÊ
KÚ[™[Ž–ÚKšœÞ
˜ˆ‹ØÚ[™[Žˆ¸«!ˆ4&4/4/ô/´`4`ˆ4a4,4.t.ô,ŸJKKšœÞ
œÛX[‹ØÚ[™[Žˆ”‹^Ù[4.4.ô.ÔÕˆŸJW_JKKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[XXÝ[Ûˆ‹Ý[NžÙÜšYÛÛ[[ŽˆŒHÈLHŸKÛÛXÚÎŠ
OO™ÊßJKÚ[™[Ž–ÚKšœÞ
˜ˆ‹ØÚ[™[Žˆ»ï"È4'ô/´`t`´,4,´bt.4.ˆŸJKKšœÞ
œÛX[‹ØÚ[™[Žˆ´&´/´/t`´,4.´`´bÈ4.4`ô`t.ô/´,´.4cÈ4`4,4,t/´`´bÈŸJW_JW_JKKšœÞ
š[œ]‹Ü™YŽ—Ë\Nˆ™š[H‹XØÙ\ˆš[XYÙKÊˆ‹Ø\\™Nˆ™[š\›Û›Y[‹Y[ŽˆLÛÚ[™ÙNœO•Š˜Ø[Y\˜H‹œ™XÙZ\Š_JKKšœÞ
š[œ]‹Ü™YŽ•\Nˆ™š[H‹XØÙ\ˆ‹œ‹˜ÜÝ‹Ý‹žËžÞ‹Y[ŽˆLÛÚ[™ÙNœO•Š\ØY‹˜]]ÈŠ_JKKšœÞ
š[œ]‹Ü™YŽ‘‹\Nˆ™š[H‹XØÙ\ˆš[XYÙKÊˆ‹][\NˆLY[ŽˆLÛÚ[™ÙNœO•Š™Ø[\žH‹˜]]ÈŠ_JKKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[XØ][ÙËYØ]]Ø^H‹ÛÛXÚÎŠ
OO™J‹ØØ][ÙÈŠKÚ[™[Ž–ÚKšœÞ
˜ˆ‹ØÚ[™[Žˆ´$4`t`t/´`4`´.4/4-t/t`ˆ4.4`´-tat.´,4`4`´bÈ8¡¤ˆŸJKKšœÞ
œÜ[ˆ‹ØÚ[™[Žˆ´(t,´cô-´.4`´-H4/4-t/tc‹4/t/´`4/4bË4/´`t`´,4`´.´.4.4-ô,4.´`ô/ô/´aô/tbô-H4`´/´,´,4`4bË4aô`´/´,tbÈ˜\‘ØÝÜˆ4`4,4`t`taô.4`´,4.È4/ô/´`´`4-t,t/t/´`t`´cˆŸJW_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[]XœÈ‹Ú[™[Ž–ÖÈ™ØÝ[Y[È‹´%4/´.´`ô/4-t/t`´bÈ—KÈ˜ÛÛ\\™H‹´(t`4,4,´/t-t/t.4-H—KÈœÝ\Y\œÈ‹´'ô/´`t`´,4,´bt.4.´.—WK›X\

Ü×JOOšKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[]XˆŠÊOO\È˜XÝ]™HŽˆˆŠKÛÛXÚÎŠ
OO˜J
KÚ[™[Ž˜ßK
J_JKOOH™ØÝ[Y[È‰‰šKšœÞÊK‘œ˜YÛY[ØÚ[™[Ž–ÚË›[™ÝŒ	‰šKšœÞÊK‘œ˜YÛY[ØÚ[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[\ÙXÝ[Û‹ZXY‹Ú[™[Ž–ÚKšœÞ
šÈ‹ØÚ[™[Žˆ´'ô/´-4/´`4/´-´,4/t.4-HŸJKKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÚË›[™Ýˆ4`t.4,ô/t,4.ô/´,ˆ—_JW_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[[\Ý‹Ú[™[ŽšËœÛXÙJ
K›X\
OšKšœÞÊ˜\XÛH‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[XØ\™™\›ØÝ\™[Y[X[\‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[XØ\™]Ü‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
š‹ØÚ[™[Žœ›˜[Y_JKKšœÞÊœ‹ØÚ[™[Ž–ÜœÝ\Y\“˜[YKˆ0­È‹™›ØÑ]J™]JW_JW_JKKšœÞÊœÝ›Û™È‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[XØ\™X[[Ý[‹Ú[™[Ž–ÈŠÈ‹š[˜Ü™X\ÙT\˜Ù[‰H—_JW_JKKšœÞÊœ‹ØÚ[™[Ž–È´$tbô.ô/ˆ‹™›ØÓ[Û™^Jœ™]š[Ý\ÔšXÙK˜Ý\œ™[˜ÞJK‹4`t`´,4.ô/ˆ‹™›ØÓ[Û™^JœšXÙK˜Ý\œ™[˜ÞJK‹ˆ—_JW_KœÝ\Y\“˜[YJÈ‹HŠÜ›˜[YJJ_JW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[\ÙXÝ[Û‹ZXY‹Ú[™[Ž–ÚKšœÞ
šÈ‹ØÚ[™[Žˆ´%ô,4.´`ô/ô/´aô/tbô-H4-4/´.´`ô/4-t/t`´bÈŸJKKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÜK›[™Ýˆ4,´`t-t,ô/ˆ—_JW_JKK›[™ÝÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[[\Ý‹Ú[™[ŽœK›X\
OšKšœÞÊ˜\XÛH‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[XØ\™‹ÛÛXÚÎŠ
OO˜™Ù]šY]ÙY\˜Ú\ÙJ
KÝ[NžØÝ\œÛÜŽˆœÚ[\ˆŸKÚ[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[XØ\™]Ü‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
š‹ØÚ[™[ŽœœÝ\Y\“˜[Y_´'ô/´`t`´,4,´bt.4.ˆŸJKKšœÞÊœ‹ØÚ[™[Ž–Ø™›ØÑØÓX™[
™ØÝ[Y[\JKˆ0­È‹™›ØÑ]J™]JK™ØÝ[Y[[X™\Èˆ0­È8¡%ˆŠÜ™ØÝ[Y[[X™\Žˆˆ—_JW_JKKšœÞ
œÝ›Û™È‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[XØ\™X[[Ý[‹Ú[™[Žœ™ØÝ[Y[\OOOHœšXÙWÛ\ÝÔÝš[™Êš][\ÏË›[™Ý
JÈˆ4/ô/´-ËˆŽ˜™›ØÓ[Û™^JÝ[˜Ý\œ™[˜ÞJ_JW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[XÚ\\›ÝÈ‹Ú[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[XÚ\‹Ú[™[Ž˜™›ØÑØÝ[Y[XØÛÝ[[™ÓX™[ŒÍNJš][\Ê_JKKšœÞÊœÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[XÚ\ŠÊ[X™\Š˜ÛÛ™šY[˜ÙJOKŽOÈ™ÛÛÙŽˆØ\›ˆŠKÚ[™[Ž–È´(4,4`t/ô/´-ô/t,4/t/ˆ‹X]œ›Ý[™

[X™\Š˜ÛÛ™šY[˜ÙJ_
JŒL
K‰H—_JKKšœÞÊœÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[XÚ\‹Ú[™[Ž–Üš][\ÏË›[™Ýˆ4/ô/´-ô.4a´.4.H—_JW_JKœÛÝ\˜ÙU\›	‰šKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[XØ\™XXÝ[ÛœÈ‹Ú[™[ŽšKšœÞ
˜H‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[[[šÈ‹™YŽœœÛÝ\˜ÙU\›\™Ù]ˆ—Ø›[šÈ‹™[ˆ››Ü™Y™\œ™\ˆ‹ÛÛXÚÎ˜ÏO˜ËœÝÜ›ÜYØ][ÛŠ
KÚ[™[Žˆ´'´`´.´`4bô`´c4/´`4.4,ô.4/t,4.È8¡¤ˆŸJ_JW_KšY
J_JNšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[Y[\H‹Ú[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Žˆ´%4/´.´`ô/4-t/t`´/´,ˆ4/ô/´.´,4/t-t`ˆŸJKKšœÞ
œ‹ØÚ[™[Žˆ´(ta4/´`´/´,ô`4,4a4.4`4`ô.t`´-H4/ô-t`4,´bô.H4aô-t.ˆ4.4.ô.4-ô,4,ô`4`ô-ô.4`´-H4/t,4.´.ô,4-4/t`ôc‹ˆ4'ô-t`4-t-4`t/´at`4,4/t-t/t.4-t/4/ô`4.4.ô/´-´-t/t.4-H4/´,tcô-ô,4`´-t.ôc4/t/ˆ4/ô/´.´,4-´-t`ˆ4ct.´`4,4/H4/ô`4/´,´-t`4.´.ˆŸJW_JW_JKOOH˜ÛÛ\\™H‰‰šKšœÞÊK‘œ˜YÛY[ØÚ[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[\ÙXÝ[Û‹ZXY‹Ú[™[Ž–ÚKšœÞ
šÈ‹ØÚ[™[Žˆ´(t`4,4,´/t-t/t.4-H4`t/´,t`t`´,´-t/t/tbôaH4a´-t/HŸJKKšœÞ
œÜ[ˆ‹ØÚ[™[Žˆ´/ô/ˆ4/ô/´`t.ô-t-4/t.4/4-4/´.´`ô/4-t/t`´,4/ŸJW_JKKšœÞ
š[œ]‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[\ÙX\˜Ú‹˜[YNžKÛÚ[™ÙNœOšŠ\™Ù]˜[YJKXÙZÛ\Žˆ´'t,4.t`´.4`´/´,´,4`8 )ˆŸJK‹›[™ÝÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[[\Ý‹Ú[™[Ž‹›X\
OšKšœÞÊ˜\XÛH‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[XØ\™‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[XØ\™]Ü‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
š‹ØÚ[™[Žœ›˜[Y_JKKšœÞ
œ‹ØÚ[™[ŽœœXÚØYÙTÚ^™_´)4,4`t/´,´.´,4/t-H4`ô.´,4-ô,4/t,ŸJW_JKKšœÞÊœÝ›Û™È‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[XØ\™X[[Ý[‹Ú[™[Ž–È¸¢$ˆ‹œØ]š[™Ô\˜Ù[‰H—_JW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[XÛÛ\\™KX™\Ý‹Ú[™[Ž–È´$´bô,ô/´-4/t-t-H4`È0ªÈ‹˜™\ÝœÝ\Y\“˜[YK°®È8 %‹™›ØÓ[Û™^J˜™\ÝœšXÙK˜™\Ý˜Ý\œ™[˜ÞJK‹ˆ4+t.´/´/t/´/4.4cÈ4/ô`4/´`´.4,ˆ4`t.ô-t-4`ôc´bt-t.H4a´-t/tbÎˆ‹™›ØÓ[Û™^JœØ]š[™Ë˜™\Ý˜Ý\œ™[˜ÞJK‹ˆ—_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[[Ù™™\œÈ‹Ú[™[Žœ›Ù™™\œË›X\

ËJOOšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[[Ù™™\ˆŠÊOOOLÈ˜™\ÝŽˆˆŠKÚ[™[Ž–ÚKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÒOOOLÈ¸§$ÈŽˆˆ‹ËœÝ\Y\“˜[YKˆ0­È‹™›ØÑ]JË™]JW_JKKšœÞ
˜ˆ‹ØÚ[™[Ž˜™›ØÓ[Û™^JËœšXÙKË˜Ý\œ™[˜ÞJ_JW_KËœÝ\Y\’Y
J_JW_K›˜[YJÈ‹HŠÜœXÚØYÙTÚ^™JJ_JNšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[Y[\H‹Ú[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Žˆ´%4.ôcÈ4`t`4,4,´/t-t/t.4cÈ4/t`ô-´/tbÈ4-4,´-H4a´-t/tbÈŸJKKšœÞ
œ‹ØÚ[™[Žˆ´%ô,4,ô`4`ô-ô.4`´-H4-4/´.´`ô/4-t/t`´bÈ4at/´`´cÈ4,tbÈ4/´`ˆ4-4,´`ôaH4/ô/´`t`´,4,´bt.4.´/´,ˆ4`H4/´-4.4/t,4.´/´,´/´.H4/ô/´-ô.4a´.4-t.H4.4a4,4`t/´,´.´/´.Kˆ˜\‘ØÝÜˆ4/t-H4,t`ô-4-t`ˆ4`t`4,4,´/t.4,´,4`´cH4.È4`HH4.È4.´,4.ˆ4/´-4.4/H4`´/´,´,4`ˆŸJW_JW_JKOOHœÝ\Y\œÈ‰‰šKšœÞÊK‘œ˜YÛY[ØÚ[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[\ÙXÝ[Û‹ZXY‹Ú[™[Ž–ÚKšœÞ
šÈ‹ØÚ[™[Žˆ´'ô/´`t`´,4,´bt.4.´.4-ô,4,´-t-4-t/t.4cÈŸJKKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÜË›[™Ýˆ4.´,4`4`´/´aô-t.ˆ—_JW_JKË›[™ÝÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[[\Ý‹Ú[™[ŽœË›X\
OžØÛÛœÝÏ]K™š[\ŠOO’KœÝ\Y\’YOO\šY
KXËœÛÜ

KÊOO”Ýš[™ÊË™]_ˆŠK›ØØ[PÛÛ\\™JÝš[™ÊK™]_ˆŠJJVÌNÜ™]\›ˆKšœÞÊ˜\XÛH‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[XØ\™‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[XØ\™]Ü‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
š‹ØÚ[™[Žœ›˜[Y_JKKšœÞÊœ‹ØÚ[™[Ž–Ü\OOOHœ™]Z[È´(4/´-ô/t.4aô/tbô.H4/4,4,ô,4-ô.4/HŽˆ´'´/ô`´/´,´bô.H4/ô/´`t`´,4,´bt.4.ˆ‹˜ÛÛXÝ\œÛÛÈˆ0­ÈŠÜ˜ÛÛXÝ\œÛÛŽˆˆ—_JW_JKKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[XÚ\ŠÊœÝ]\ÏOOH˜\˜Ú]™YÈˆŽˆ™ÛÛÙŠKÚ[™[ŽœœÝ]\ÏOOH˜\˜Ú]™YÈ´$4`4at.4,ˆŽˆ´$4.´`´.4,´-t/HŸJW_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[XÚ\\›ÝÈ‹Ú[™[ŽŠ\œ˜^Kš\Ð\œ˜^J˜Ø]YÛÜšY\ÊOÜ˜Ø]YÛÜšY\Î–×JKœÛXÙJ
K›X\
OOšKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[XÚ\‹Ú[™[Ž˜™›ØÐØ]YÛÜžSX™[ÖÒW__KJJ_JKKšœÞÊœ‹ØÚ[™[Ž–ØË›[™Ýˆ4-4/´.´`ô/4-t/t`´/´,ˆ‹Èˆ0­È4/ô/´`t.ô-t-4/tcôcÈ4a´-t/t,ŠØ™›ØÑ]J‹™]JNˆˆ0­È4-ô,4.´`ô/ô/´.ˆ4-tbtdH4/t-t`ˆ—_JKI‰šKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[XØ\™XXÝ[ÛœÈ‹Ú[™[ŽšKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[[[šÈ‹ÛÛXÚÎŠ
OO™Ê
KÚ[™[Žˆ´(4-t-4,4.´`´.4`4/´,´,4`´c8¡¤ˆŸJ_JW_KšY
_J_JNšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[Y[\H‹Ú[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Žˆ´%4/´,t,4,´c4`´-H4/ô-t`4,´/´,ô/ˆ4/ô/´`t`´,4,´bt.4.´,ŸJKKšœÞ
œ‹ØÚ[™[Žˆ´&´,4`4`´/´aô.´,4/t`ô-´/t,4-4.ôcÈ4.´/´/t`´,4.´`´/´,ˆ4.4`ô`t.ô/´,´.4.Kˆ4'ô-t`4-t-4`t/´at`4,4/t-t/t.4-t/4-4/´.´`ô/4-t/t`´,4,´bô,t-t`4.4`´-H4`t`ôbt-t`t`´,´`ôc´bt-t,ô/ˆ4/ô/´`t`´,4,´bt.4.´,4.4.ô.4`t/´-ô-4,4.t`´-H4/´`´-4-t.ôc4/t`ôcˆ4.´,4`4`´/´aô.´`ËˆŸJKI‰šKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[\ÙXÛÛ™\žH‹Ý[NžÛX\™Ú[•ÜŒLŸKÛÛXÚÎŠ
OO™ÊßJKÚ[™[Žˆ´%4/´,t,4,´.4`´c4/ô/´`t`´,4,´bt.4.´,ŸJW_JW_JW_J_JKË›[™ÝŒ	‰šKšœÞ
™ÝÔÙ[XÝ[Û‹Ùš[\ÎËÛÚ[™ÙNžÛØ[˜Ù[Š
OOž
×JKÛYŠ
OO‘‹˜Ý\œ™[Ë˜ÛXÚÊ
KÛÛÛ™š\›NŠ
OOžØÛÛœÝPÎÞ
×JNÕJ™Ø[\žH‹˜]]ÈŠ_K]Nˆ´)4/´`´/´,ô`4,4a4.4.4-4/´.´`ô/4-t/t`´,‹ÛÜNˆ´'ô`4/´,´-t`4c4`´-H4/ô/´`4cô-4/´.ˆ4`t`´`4,4/t.4a‹ˆ4'4/´-´/t/ˆ4`ô-4,4.ô.4`´c4.ô.4b4/t.4-H4`t/t.4/4.´.4.4.ô.4-4/´,t,4,´.4`´c4/t-t-4/´`t`´,4c´bt.4-H4-4/ˆ4`4,4`t/ô/´-ô/t,4,´,4/t.4cËˆŸJK‰‰šKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[[ØY[™È‹Ú[™[ŽšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[[ØY[™ËXØ\™‹Ú[™[Ž–ÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\›ØÝ\™[Y[\Ü[›™\ˆŸJKKšœÞ
œÝ›Û™È‹ØÚ[™[Ž“ŸJKKšœÞ
œ‹ØÚ[™[Žˆ´+t`´/ˆ4/4/´-´-t`ˆ4-ô,4/tcô`´c4-4/ˆ4/4.4/t`ô`´bËˆ4't-H4-ô,4.´`4bô,´,4.t`´-H4/ô`4.4.ô/´-´-t/t.4-H8 %4-ô,4`´-t/4/ô/´cô,´.4`´`tcÈ4/´,tcô-ô,4`´-t.ôc4/t,4cÈ4`t,´-t`4.´,4-4,4/t/tbôaKˆŸJW_J_JK™šY]ÙY\˜Ú\ÙI‰šKšœÞ
™ØÝ[Y[]Z[ÚY]ÙØÝ[Y[˜™šY]ÙY\˜Ú\ÙKÛÛÜÙNŠ
OOžØ™Ù]šY]ÙY\˜Ú\ÙJ[
K™Ý\Y\”]Y\žI‰™J™Ý\Y\”™]\›•Ê_KÛ‘Y]I‰Š™šY]ÙY\˜Ú\ÙK™ØÝ[Y[\OOOHœšXÙWÛ\ÝŸ™Ø[“X[˜YÙQš[˜[˜ÙJOÊ
OOžØÛÛœÝX™šY]ÙY\˜Ú\ÙNØ™Ù]šY]ÙY\˜Ú\ÙJ[
KJË‹‹œJ_N›[JK‰‰šKšœÞ
™\˜Ú\ÙT™]šY]ËÙ˜Y™‹Ý\Y\œÎœËÛÚ[™ÙN›KÛØ[˜Ù[–‹ÛÛÛ™š\›N”KØ]š[™ÎŸJK	‰šKšœÞ
™Ý\Y\‘Y]Ü‹ÜÝ\Y\ŽššYÚ›[ÛÛÜÙNŠ
OO™Ê[
KÛ”Ø]™N’JW_J_XÛÛœÝ™ÝÑØ[\žU™\œÚ[ÛH˜˜XÚÙÜ›Ý[™[Y[K]HŽÂ™[˜Ý[Ûˆ™ÝÔÙ[XÝ[ÛŠÙš[\Î™KÛÚ[™ÙNÛØ[˜Ù[›‹ÛÛÛ™š\›Nœ‹ÛY˜K]NœËÛÜN›J^ØÛÛœÝOTË\ÙSY[[Ê

OO™K›X\
O•T“˜Ü™X]SØš™XÝT“
ŠJKÙWJNÔË\ÙQY™™XÝ


OOŠ
OOK™›Ü‘XXÚ
O•T“œ™]›ÚÙSØš™XÝT“
ŠJKÝWJNØÛÛœÝJ‹JOOžØÛÛœÝYŠÛNÚYŠYK›[™Ý
\™]\›ŽØÛÛœÝÏVË‹‹™WKÞK—OVÙÖÙ—KÖÚWNÙÖÙ—OZ‹ÖÚO^K
Ê_K[OO
K™š[\Š
ÊOO™ÈOO[JJNÜ™]\›ˆKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]X˜XÚÙ›Ü‹Ú[™[ŽšKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]™\ÝË\XÚÙ\‹\ÚY]‹Ú[™[Ž–ÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]Z[™HŸJKKšœÞÊšXY\ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]ZXY‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
šˆ‹ØÚ[™[ŽœßJKKšœÞÊœ‹ØÚ[™[Ž–ÙK›[™Ýˆ4a4/´`´/ˆ0­È4/4,4.´`t.4/4`ô/Lˆ—_JW_JKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙËXÛÜÙH‹ÛÛXÚÎ›‹˜\šXK[X™[Žˆ´%ô,4.´`4bô`´c‹Ú[™[Žˆ°åÈŸJW_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\™]šY]Ë[›ÝHÛÛÙ‹Ú[™[Ž›JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\ÝË\XÚÙ\‹[\Ý‹Ú[™[Ž™K›X\

K
OOšKšœÞÊ˜\XÛH‹ØÛ\ÜÓ˜[YNˆ˜™\ÝË\XÚÙ\‹Z][H‹Ú[™[Ž–ÚKšœÞ
š[YÈ‹ÜÜ˜ÎVÚK[ˆ´(t`´`4,4/t.4a´,ŠÊ
ÌJKØY[™Îˆ›^žHŸJKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\ÝË\XÚÙ\‹XÛÜH‹Ú[™[Ž–ÚKšœÞÊ˜ˆ‹ØÚ[™[Ž–È´(t`´`4,4/t.4a´,‹
ÌW_JKKšœÞÊœÛX[‹ØÚ[™[Ž–ÛK›˜[YKˆ0­È‹X]›X^
KX]œ›Ý[™
KœÚ^™KÌL
JKˆ4&´$H—_JW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\ÝË\XÚÙ\‹XÛÛ›ÛÈ‹Ú[™[Ž–ÚKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹\ØX›YšOOLÛÛXÚÎŠ
OO™
LJK˜\šXK[X™[Žˆ´'ô-t`4-t/4-t`t`´.4`´c4,´bôb4-H‹Ú[™[Žˆ¸¡¤HŸJKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹\ØX›YšOOYK›[™ÝLKÛÛXÚÎŠ
OO™
JK˜\šXK[X™[Žˆ´'ô-t`4-t/4-t`t`´.4`´c4/t.4-´-H‹Ú[™[Žˆ¸¡¤ÈŸJKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆœ™[[Ý™H‹ÛÛXÚÎŠ
OO™Š
KÚ[™[Žˆ´(ô-4,4.ô.4`´cŸJW_JW_KK›˜[YJÈ‹HŠÛK›\Ý[ÙYšYY
È‹HŠÚ
J_JKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË\ÙXÛÛ™\žH™\ÝË\XÚÙ\‹XY‹\ØX›Y™K›[™ÝLL‹ÛÛXÚÎ˜KÚ[™[ŽˆŠÈ4%4/´,t,4,´.4`´c4-tbtdH4a4/´`´/ˆŸJKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]XXÝ[ÛœÈ‹Ú[™[Ž–ÚKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË\ÙXÛÛ™\žH‹ÛÛXÚÎ›‹Ú[™[Žˆ´'´`´/4-t/t,ŸJKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË\š[X\žH‹\ØX›YˆYK›[™ÝÛÛXÚÎœ‹Ú[™[Ž™K›[™ÝŒOÈ´(4,4`t/ô/´-ô/t,4`´cŠÙK›[™Ý
Èˆ4`t`´`4,4/t.4aˆŽˆ´(4,4`t/ô/´-ô/t,4`´c4a4/´`´/ˆŸJW_JW_J_J_B˜ÛÛœÝ™Ø][ÙÕÛÜšÜÜXÙU™\œÚ[ÛH˜Ø][ÙË[[Ý™KXÛÛ›ÛË]‹™Ø][ÙÔÝÜ™RÙ^OH˜™Ø\ÜÛÜY[ÝŒHŽÂ™[˜Ý[Ûˆ™Ø]\œ˜^JJ^Ü™]\›ˆ\œ˜^Kš\Ð\œ˜^JJOÙN–×_B™[˜Ý[Ûˆ™Ø]›Ü›S˜[YJJ^Ü™]\›ˆÝš[™Ê_ˆŠKš[J
Kœ™\XÙJ×ÊËÙËˆŠKÓØØ[SÝÙ\Ø\ÙJœHŠ_B™[˜Ý[Ûˆ™Ø]ÝX›U^Y
K‹‹
^Û]LŒMŒLÍŒŒNØÛÛœÝ]›X\
™Ø]›Ü›S˜[YJKš›Ú[ŠŸŠNÙ›ÜŠ]OLØO‹›[™ÝØJÊÊ[—\‹˜Ú\ÛÙP]
JKSX]š[][
‹MÍÍÍŒNJNÜ™]\›ˆJÈ‹HŠÊŒ
KÔÝš[™ÊÍŠ_B™[˜Ý[Ûˆ™Ø]Y˜][Ü›Ý\Ê
^Ü™]\›ˆ™Ø]\\Y[Ë›X\

K
OOŠÚY™KšY˜[YN™K›X™[YØXÞQ\\Y[™KšYÛÜÜ™\ŽJJ_B™[˜Ý[Ûˆ™Ø]YØXÞQ\\Y[›Ü‘Ü›Ý\
K
^ØÛÛœÝX™Ø]\œ˜^JOË™Ü›Ý\ÊK™š[™
Oœ‹šYOO]
NÜ™]\›–È˜˜\ˆ‹šÚ]Ú[ˆ‹šÛÚØZ‹›Ý\ˆ—Kš[˜ÛY\ÊË›YØXÞQ\\Y[
OÛ‹›YØXÞQ\\Y[ˆ›Ý\ˆŸB™[˜Ý[Ûˆ™Ø]Ý]JJ^ØÛÛœÝYI‰\[ÙˆOOOH›Øš™XÝ‰‰ˆP\œ˜^Kš\Ð\œ˜^JJOÙNžßK[™]ÈX\Ù›ÜŠÛÛœÝÈÙˆ™Ø]\œ˜^J™Ü›Ý\ÊJ^ØÛÛœÝOTÝš[™ÊÏËšYˆŠKš[J
KTÝš[™ÊÏË›˜[Y_ÏË›X™[ˆŠKš[J
NÒI‰”‰‰ˆ[‹š\ÊJI‰›‹œÙ]
KË‹‹˜ËY’K˜[YN”‹YØXÞQ\\Y[–È˜˜\ˆ‹šÚ]Ú[ˆ‹šÛÚØZ‹›Ý\ˆ—Kš[˜ÛY\ÊÏË›YØXÞQ\\Y[
OØË›YØXÞQ\\Y[ˆ›Ý\ˆ‹ÛÜÜ™\Ž˜™Ø][X™\ŠÏËœÛÜÜ™\‹‹œÚ^™J_J_ZYŠ[‹œÚ^™JY›ÜŠÛÛœÝÈÙˆ™Ø]Y˜][Ü›Ý\Ê
J[‹œÙ]
ËšYÊNØÛÛœÝVË‹‹›‹˜[Y\Ê
WKœÛÜ

ËJOO˜™Ø][X™\ŠËœÛÜÜ™\ŠKX™Ø][X™\ŠKœÛÜÜ™\Š_Ë›˜[YK›ØØ[PÛÛ\\™JK›˜[YKœHŠJKO[™]ÈX\
‹›X\
ÏO–ØËšY×JJKÏ[™]ÈX\Ù›ÜŠÛÛœÝÈÙˆ™Ø]\œ˜^JœÝX™Ü›Ý\ÊJ^ØÛÛœÝOTÝš[™ÊÏËšYˆŠKš[J
KTÝš[™ÊÏË›˜[Y_ÏË›X™[ˆŠKš[J
KÏXKš\ÊÏË™Ü›Ý\Y
OØË™Ü›Ý\YˆˆŽÒI‰”‰‰•É‰ˆ\Ëš\ÊJI‰œËœÙ]
KË‹‹˜ËY’KÜ›Ý\Y•Ë˜[YN”‹ÛÜÜ™\Ž˜™Ø][X™\ŠÏËœÛÜÜ™\‹ËœÚ^™J_J_XÛÛœÝX™Ø]\œ˜^J›Y[R][\ÊK›X\
ÏOžØÛÛœÝOXKš\ÊÏË™Ü›Ý\Y
OØË™Ü›Ý\Yœ‹™š[™
O”›YØXÞQ\\Y[OOX™Ø]\\Y[
ÊJOËšY–ÌOËšY›Ý\ˆ‹X™Ø]ÝXœÙXÝ[ÛŠÊNÛ]Ï\Ë™Ù]
ÏËœÝX™Ü›Ý\Y
NÚYŠUßË™Ü›Ý\YOORJUÏVË‹‹œË˜[Y\Ê
WK™š[™
O”™Ü›Ý\YOORI‰˜™Ø]›Ü›S˜[YJ›˜[YJOOOX™Ø]›Ü›S˜[YJŠJNÚYŠUÊ^ØÛÛœÝX™Ø]ÝX›U^Y
œÝXˆ‹KŠNÕÏ^ÚY”Ü›Ý\Y’K˜[YN”‹ÛÜÜ™\ŽœËœÚ^™_KËœÙ]
Ê_XÛÛœÝXK™Ù]
JNÜ™]\›žË‹‹˜ËÜ›Ý\Y’KÝX™Ü›Ý\Y•ËšY\\Y[’Ë›YØXÞQ\\Y[›Ý\ˆ‹Ø]YÛÜžN•Ë›˜[Y__JKOVË‹‹œË˜[Y\Ê
WKœÛÜ

ËJOO˜™Ø][X™\ŠËœÛÜÜ™\ŠKX™Ø][X™\ŠKœÛÜÜ™\Š_Ë›˜[YK›ØØ[PÛÛ\\™JK›˜[YKœHŠJNÜ™]\›žÝ™\œÚ[ÛŽŒ‹Üš^›Û‘^\Î–ÍËMÌKš[˜ÛY\Ê[X™\ŠšÜš^›Û‘^\ÊJOÓ[X™\ŠšÜš^›Û‘^\ÊNËÜ›Ý\Îœ‹ÝX™Ü›Ý\ÎKY[R][\Î›™XÚ\\Î˜™Ø]\œ˜^Jœ™XÚ\\ÊKšXÙR\ÝÜžN˜™Ø]\œ˜^JœšXÙR\ÝÜžJKØ[›ÛšXØ[›ÙXÝ[X\Ù\Î˜™Ø]\œ˜^J˜Ø[›ÛšXØ[›ÙXÝ[X\Ù\ÊK[™[ÜžT›ÙXÝ[X\Ù\Î˜™Ø]\œ˜^Jš[™[ÜžT›ÙXÝ[X\Ù\ÊKÝ\Y\”›ÙXÝX\[™ÜÎ˜™Ø]\œ˜^JœÝ\Y\”›ÙXÝX\[™ÜÊK›ÛY[˜Û]\™N˜™Ø]\œ˜^J››ÛY[˜Û]\™JKÝØÚÐ˜[[˜Ù\Î˜™Ø]\œ˜^JœÝØÚÐ˜[[˜Ù\ÊKXÚØ\™[™Ü™YY[[X\Ù\Î˜™Ø]\œ˜^JXÚØ\™[™Ü™YY[[X\Ù\ÊKXÚØ\™™XÛÛ˜Ú[X][ÛŽXÚØ\™™XÛÛ˜Ú[X][Û‰‰\[ÙˆXÚØ\™™XÛÛ˜Ú[X][ÛOOH›Øš™XÝÝXÚØ\™™XÛÛ˜Ú[X][ÛŽ›[[\›˜[][\Î˜™Ø]\œ˜^Jš[\›˜[][\ÊKÛÝ\˜Ù\Î˜™Ø]\œ˜^JœÛÝ\˜Ù\ÊK\]Y]\]Y]™]È]J
KÒTÓÔÝš[™Ê
__B™[˜Ý[Ûˆ™Ø][Ý™TÝX™Ü›Ý\Ý]JKŠ^ØÛÛœÝX™Ø]Ý]JJKO\‹œÝX™Ü›Ý\Ë™š[™
ÏO˜ËšYOO]
KÏ\‹™Ü›Ý\Ë™š[™
ÏO˜ËšYOO[ŠNÚYŠX_\ßK™Ü›Ý\YOO[Š\™]\›ˆŽØÛÛœÝ\‹œÝX™Ü›Ý\Ë™š[™
ÏO˜ËšYOO]	‰˜Ë™Ü›Ý\YOO[‰‰˜™Ø]›Ü›S˜[YJË›˜[YJOOOX™Ø]›Ü›S˜[YJK›˜[YJJKO[ËšYKšY[Ë›˜[Y_K›˜[YNÜ™]\›ˆ™Ø]Ý]JË‹‹œ‹ÝX™Ü›Ý\Î›Ü‹œÝX™Ü›Ý\Ë™š[\ŠÏO˜ËšYOO]
Nœ‹œÝX™Ü›Ý\Ë›X\
ÏO˜ËšYOO]ÞË‹‹˜ËÜ›Ý\Y›ŸN˜ÊKY[R][\Îœ‹›Y[R][\Ë›X\
ÏO˜ËœÝX™Ü›Ý\YOO]ÞË‹‹˜ËÜ›Ý\Y›‹ÝX™Ü›Ý\YK\\Y[œË›YØXÞQ\\Y[›Ý\ˆ‹Ø]YÛÜžN™N˜ÊK\]Y]›™]È]J
KÒTÓÔÝš[™Ê
_J_B™[˜Ý[Ûˆ™Ø]Y\™ÙQÜ›Ý\Ý]JKŠ^ØÛÛœÝX™Ø]Ý]JJKO\‹™Ü›Ý\Ë™š[™
ÏO˜ËšYOO]
KÏ\‹™Ü›Ý\Ë™š[™
ÏO˜ËšYOO[ŠNÚYŠX_\ßOO[Ÿ‹™Ü›Ý\Ë›[™ÝŠ\™]\›ˆŽØÛÛœÝ\‹œÝX™Ü›Ý\Ë™š[\ŠÏO˜Ë™Ü›Ý\YOO]
KO[™]ÈX\Ù›ÜŠÛÛœÝÈÙˆ
^ØÛÛœÝO\‹œÝX™Ü›Ý\Ë™š[™
O”‹™Ü›Ý\YOO[‰‰”‹šYOOXËšY	‰˜™Ø]›Ü›S˜[YJ‹›˜[YJOOOX™Ø]›Ü›S˜[YJË›˜[YJJNÝKœÙ]
ËšYÚY’OËšYËšY˜[YN’OË›˜[Y_Ë›˜[Y_J_XÛÛœÝ\‹œÝX™Ü›Ý\Ë™š[\ŠÏOžÚYŠË™Ü›Ý\YOO]
\™]\›ˆLÜ™]\›ˆK™Ù]
ËšY
OËšYOOXËšYJK›X\
ÏO˜Ë™Ü›Ý\YOO]ÞË‹‹˜ËÜ›Ý\Y›ŸN˜ÊK\‹›Y[R][\Ë›X\
ÏOžÚYŠË™Ü›Ý\YOO]	‰ˆ]Kš\ÊËœÝX™Ü›Ý\Y
J\™]\›ˆÎØÛÛœÝO]K™Ù]
ËœÝX™Ü›Ý\Y
KROËšYËœÝX™Ü›Ý\YÏROË›˜[Y_‹œÝX™Ü›Ý\Ë™š[™
O’‹šYOOTŠOË›˜[Y_Ë˜Ø]YÛÜžNÜ™]\›žË‹‹˜ËÜ›Ý\Y›‹ÝX™Ü›Ý\Y”‹\\Y[œË›YØXÞQ\\Y[›Ý\ˆ‹Ø]YÛÜžN•ß_JNÜ™]\›ˆ™Ø]Ý]JË‹‹œ‹Ü›Ý\Îœ‹™Ü›Ý\Ë™š[\ŠÏO˜ËšYOO]
KÝX™Ü›Ý\Î™Y[R][\Î™‹\]Y]›™]È]J
KÒTÓÔÝš[™Ê
_J_B™[˜Ý[Ûˆ™Ø][X™\ŠKL
^ØÛÛœÝ]\[ÙˆOOOHœÝš[™ÈÓ[X™\ŠKœ™\XÙJ×ËÙËˆŠKœ™\XÙJ‹‹‹ˆŠJN“[X™\ŠJNÜ™]\›ˆ[X™\‹š\Ñš[š]JŠOÛŽB™[˜Ý[Ûˆ™Ø]\SX™[
J^Ü™]\›ˆOOOHœ™XYHÈ´$ô/´`´/´,´bô.H4`´/´,´,4`Ž™OOOHœÙ\šXÙHÈ´(ô`t.ô`ô,ô,Žˆ´(t/´`t`´,4,´/t,4cÈ4/ô/´-ô.4a´.4cÈŸB˜ÛÛœÝ™Ø]\ØÛÜÝ\™RÙ^OH˜™ØØ][Ù×Ù\ØÛÜÝ\™WÝŒH‹™Ø]\\Y[ÏVÞÚYˆ˜˜\ˆ‹X™[ˆ´$t,4`ŸKÚYˆšÚ]Ú[ˆ‹X™[ˆ´&´`ôat/tcÈŸKÚYˆšÛÚØZ‹X™[ˆ´&´,4.ôc4cô/tbÈŸKÚYˆ›Ý\ˆ‹X™[ˆ´%4`4`ô,ô/´-HŸWNÂ™[˜Ý[Ûˆ™Ø]™XY\ØÛÜÝ\™J
^Ýž^ØÛÛœÝOR”ÓÓ‹œ\œÙJØØ[ÝÜ˜YÙK™Ù]][J
™Ø]\ØÛÜÝ\™RÙ^JJ_žßHŠNÜ™]\›ˆI‰\[ÙˆOOOH›Øš™XÝ‰‰ˆP\œ˜^Kš\Ð\œ˜^JJOÙNžß_XØ]ÚÜ™]\›žß__B™[˜Ý[Ûˆ™Ø]\\Y[
J^ØÛÛœÝTÝš[™ÊOË™\\Y[OËœÙXÝ[ÛŸˆŠKš[J
KÓØØ[SÝÙ\Ø\ÙJœHŠNÚYŠÈ˜˜\ˆ‹´,t,4`‹´/t,4/ô.4`´.´.—Kš[˜ÛY\Ê
J\™]\›ˆ˜˜\ˆŽÚYŠÈšÚ]Ú[ˆ‹´.´`ôat/tcÈ‹´-t-4,—Kš[˜ÛY\Ê
J\™]\›ˆšÚ]Ú[ˆŽÚYŠÈšÛÚØZ‹´.´,4.ôc4cô/H‹´.´,4.ôc4cô/tbÈ—Kš[˜ÛY\Ê
J\™]\›ˆšÛÚØZŽÚYŠÈ›Ý\ˆ‹´-4`4`ô,ô/´-H‹´/ô`4/´aô-t-H—Kš[˜ÛY\Ê
J\™]\›ˆ›Ý\ˆŽØÛÛœÝTÝš[™ÊOË˜Ø]YÛÜž_ˆŠKÓØØ[SÝÙ\Ø\ÙJœHŠKJŠÈˆŠÔÝš[™ÊOË›˜[Y_ˆŠJKÓØØ[SÝÙ\Ø\ÙJœHŠKOKô.´,4.ôc4cô/_4`´,4,t,4.Ÿ4aô,4b4,4-ô,4,t.4,´.ŸÚ\Ú_ÛÚØZËÏKô.´`ôat/_4`t,4.ô,4`Ÿ4-ô,4.´`ô`t.Ÿ4`t`ô/ß4,ô/´`4côaß4/ô.4a´aŸ4,t`ô`4,ô-t`4/ô,4`t`´,4,ô`4.4.ôc4/4cô`_4`4bô,_4,ô,4`4/t.4`4-4-t`t-t`4`Ÿ4-t-4,4,t.ôc´-4`tct/t-4,´.4aß4at.ô-t,_4`t/´`ô`_4`4/´.ô.ß4`t`ôb4.4-ô,4,´`´`4,4.Ÿ4a4`4.ËKô,t,4`4.´/´.´`´-t.t.ß4/ô.4,´/Ÿ™Y\Ÿ4,´.4/t/ŸÚ[™_4,´/´-4.Ÿ4,´.4`t.´.Ú\ÚÞ_4`4/´/4-4-´.4/_4`´-t.´.4.ß4.´/´/tc4cô.Ÿ4,t`4-t/t-4.4.ô.4.–ô-tdWt`4b4/´`Ÿ4,4.ô.´/´,ß4/t,4/ô.4`Ÿ4.ô.4/4/´/t,4-4.´/´a4-_4aô,4._4`t/´.Ÿ4,´/´-4,4ct/t-t`4,ô-t`´.4.‹ÎÜ™]\›ˆK\Ý
ŠOÈšÛÚØZŽœË\Ý
ŠOÈšÚ]Ú[ˆŽ›\Ý
ŠOÈ˜˜\ˆŽœË\Ý
ŠOÈšÚ]Ú[ˆŽ›\Ý
ŠOÈ˜˜\ˆŽˆ›Ý\ˆŸB™[˜Ý[Ûˆ™Ø]ÝXœÙXÝ[ÛŠJ^ØÛÛœÝTÝš[™ÊOË˜Ø]YÛÜž_ˆŠKš[J
K]ÓØØ[SÝÙ\Ø\ÙJœHŠNÜ™]\›ˆ]È´,t,4`‹´.´`ôat/tcÈ‹´.´,4.ôc4cô/H‹´.´,4.ôc4cô/tbÈ‹´-4`4`ô,ô/´-H‹´/ô`4/´aô-t-H‹´,t-t-È4.´,4`´-t,ô/´`4.4.‹´,t-t-È4/ô/´-4`4,4-ô-4-t.ô,—Kš[˜ÛY\ÊŠOÈ´$t-t-È4/ô/´-4`4,4-ô-4-t.ô,ŽB™[˜Ý[Ûˆ™Ø]Y[QÜ›Ý\ÊKŠ^ØÛÛœÝX™^™XÛÜ™ŒÌÍŠ™Ø\™ZÝ\ÙT™XÛÜ™
Š™Ø][ÙÔÝÜ™RÙ^JJK››ÛY[˜Û]\™TÝXÝ\™JKOX™^\œ˜^UŒÌÍŠ‹œÙXÝ[ÛœÊKÏX™^\œ˜^UŒÌÍŠ‹˜Ø]YÛÜšY\ÊKX™^\œ˜^UŒÌÍŠ‹œÝX˜Ø]YÛÜšY\ÊKO[™]ÈX\
K›X\
ÏO–ÐËšYË‹‹ËX™[Ë›˜[YKÝ[ŒÝXœÙXÝ[ÛœÎ›™]ÈX\WJJK™YØXÞSY[TÙXÝ[ÛœÕŒÍL[™]ÈX\Ù›ÜŠÛÛœÝÈÙˆ™Ø]\œ˜^J
J^ØÛÛœÝXK™š[™
O˜™Ø]›Ü›S˜[YJ‹›˜[YJOOOX™Ø]›Ü›S˜[YJË›˜[YJJK^ËšYËšYØ™YØXÞSY[TÙXÝ[ÛœÕŒÍLœÙ]
ËšYŠKKš\ÊŠ_KœÙ]
‹Ë‹‹ËY”‹X™[Ë›˜[YKÝ[ŒÝXœÙXÝ[ÛœÎ›™]ÈX\J_XÛÛœÝ^ÚYˆ[˜\ÜÚYÛ™Y‹˜[YNˆ´$t-t-È4.´,4`´-t,ô/´`4.4.‹X™[ˆ´$t-t-È4.´,4`´-t,ô/´`4.4.‹ÛÜÜ™\ŽŽNNNNKÝ[ŒÝXœÙXÝ[ÛœÎ›™]ÈX\NÝKœÙ]
šY
NÙ›ÜŠÛÛœÝÈÙˆ™Ø]\œ˜^JJJ^ØÛÛœÝ™YØXÞQÜ›Ý\ŒÍLX™Ø]\œ˜^J
K™š[™
OO”KšYOOPË™Ü›Ý\Y
K™YØXÞTÝX™Ü›Ý\ŒÍLX™Ø]\œ˜^JŠK™š[™
OO”KšYOOPËœÝX™Ü›Ý\Y	‰”K™Ü›Ý\YOOPË™Ü›Ý\Y
K]K™Ù]
ËœÙXÝ[Û’Y
_K™Ù]
™YØXÞSY[TÙXÝ[ÛœÕŒÍL™Ù]
™YØXÞQÜ›Ý\ŒÍLËšY
J_\Ë™š[™
ÏO•ËšYOOPË^Û›Û^PØ]YÛÜžRY
KÏ[™š[™
O’‹šYOOPËœÝX˜Ø]YÛÜžRY
KUÏËšYËšY™YØXÞTÝX™Ü›Ý\ŒÍLËšY[˜\ÜÚYÛ™Y‹ÏVÔË›˜[YKÏË›˜[YWK™š[\Š›ÛÛX[ŠKš›Ú[Šˆ8¡¤ˆŠ_™YØXÞTÝX™Ü›Ý\ŒÍLË›˜[Y_´$t-t-È4.´,4`´-t,ô/´`4.4.‹O^œÝXœÙXÝ[ÛœË™Ù]
Š_ÚY’‹Ü›Ý\YžšY˜[YN’ËX™[’ËÛÜÜ™\Ž•ÏË›Ü™\ÏÔË›Ü™\ÏÎNNNNK][\Î–×_NÔKš][\Ëœ\Ú
ÊKœÝXœÙXÝ[ÛœËœÙ]
‹JKÝ[
Êß\™]\›–Ë‹‹K˜[Y\Ê
WKœÛÜ

Ë
OOŠ[X™\ŠË›Ü™\ÏÐËœÛÜÜ™\Š_
KJ[X™\Š›Ü™\ÏÞœÛÜÜ™\Š_
_Ë›˜[YK›ØØ[PÛÛ\\™J›˜[YKœHŠJK›X\
ÏOŠË‹‹ËÝXœÙXÝ[ÛœÎ–Ë‹‹ËœÝXœÙXÝ[ÛœË˜[Y\Ê
WKœÛÜ

ŠOOŠ[X™\ŠœÛÜÜ™\Š_
KJ[X™\Š‹œÛÜÜ™\Š_
_›˜[YK›ØØ[PÛÛ\\™J‹›˜[YKœHŠJK›X\
OŠË‹‹ž][\Îžš][\ËœÛÜ

‹ÊOO”Ýš[™Ê‹›˜[YJK›ØØ[PÛÛ\\™JÝš[™ÊË›˜[YJKœHŠJ_JJ_JJK™š[\ŠÏOËÝ[Œ
_B‚™[˜Ý[Ûˆ™Ø]\ÓÜ[ŠKŠ^Ü™]\›ˆØš™XÝœ›ÝÝ\Kš\ÓÝÛ”›Ü\K˜Ø[
K
OÙVÝOOOHL›OOHœÙXÝ[ÛˆŸB™[˜Ý[Ûˆ™Ø][š]X™[
J^Ü™]\›ˆOOOH›[È´/4.ÈŽ™OOOH™ÈÈ´,ÈŽ™OOOHœÜÈÈ´b4`‹ˆŽ”Ýš[™Ê_´-t-ˆŠ_B™[˜Ý[Ûˆ™Ø]Ð˜\ÙJK
^ØÛÛœÝSX]›X^
™Ø][X™\ŠJJKTÝš[™ÊˆŠKÓØØ[SÝÙ\Ø\ÙJœHŠNÜ™]\›‹×Š4.ß4.ô.4`´`
KË\Ý
ŠOÞØ[[Ý[›ŠŒYLË[š]ˆ›[ŸN‹×Š4/4.ß[
KË\Ý
ŠOÞØ[[Ý[›‹[š]ˆ›[ŸN‹×Š4.´,ßÙÊKË\Ý
ŠOÞØ[[Ý[›ŠŒYLË[š]ˆ™ÈŸN‹×Š4,ß4,ô`ÊKË\Ý
ŠOÞØ[[Ý[›‹[š]ˆ™ÈŸN‹×Š4b4`ŸÜß4/ô/´`4aŠKË\Ý
ŠOÞØ[[Ý[›‹[š]ˆœÜÈŸNžØ[[Ý[›‹[š]ˆ[šÛ›ÝÛˆŸ_B™[˜Ý[Ûˆ™Ø]XÚØYÙJJ^ØÛÛœÝTÝš[™Ê_ˆŠKÓØØ[SÝÙ\Ø\ÙJœHŠKœ™\XÙJ‹‹‹ˆŠK]›X]Ú
Ê
ÊÎ——
ÊOÊWÊŠ4/4.ß[4.ß4.ô.4`´`
Î´,4/´,ŠOß4,ß4,ô`ß4.´,ßÙß4b4`ŸÜÊKÚJNÜ™]\›ˆØ™Ø]Ð˜\ÙJ–ÌWK–Ì—JNžØ[[Ý[Œ[š]ˆ[šÛ›ÝÛˆŸ_B™[˜Ý[Ûˆ™Ø]\˜Ú\ÙT›ÙXÝÊJ^ØÛÛœÝ[™]ÈX\Ù›ÜŠÛÛœÝˆÙˆJ^ÚYŠ‹œÝ]\ÈOOH˜ÛÛ™š\›YYŠXÛÛ[YNÙ›ÜŠÛÛœÝˆÙˆ™Ø]\œ˜^J‹š][\ÊJ^ØÛÛœÝOX™›ØÔ›ÙXÝÙ^JŠKÏ^ÚÙ^N˜K˜[YNœ‹›˜[Y_´(´/´,´,4`‹XÚØYÙTÚ^™Nœ‹œXÚØYÙTÚ^™_‹[š]ˆ‹Ý\Y\“˜[YN›‹œÝ\Y\“˜[Y_´'ô/´`t`´,4,´bt.4.ˆ‹Ø]YÛÜžNœ‹œÝX˜Ø]YÛÜžS˜[Y_‹˜Ø]YÛÜžS˜[Y_‹˜Ø]YÛÜž_ˆ‹ÙXÝ[Û’Yœ‹œÙXÝ[Û’Yˆ‹Ø]YÛÜžRYœ‹^Û›Û^PØ]YÛÜžRY‹˜Ø]YÛÜžRYˆ‹šXÙN˜™Ø][X™\Š‹[š]šXÙJ_™Ø][X™\Š‹›[™UÝ[
KÊ™Ø][X™\Š‹œ]X[]J_JKÝ\œ™[˜ÞN›‹˜Ý\œ™[˜Þ_”•Pˆ‹]N›‹™]_ˆ‹‹‹˜™Ø]XÚØYÙJ‹œXÚØYÙTÚ^™_‹[š]
_NØÛÛœÝ]™Ù]
JNÊ[Ë™]O[™]JI‰œÙ]
KÊ__\™]\›–Ë‹‹˜[Y\Ê
WKœÛÜ

‹ŠOO”Ýš[™Ê‹›˜[YJK›ØØ[PÛÛ\\™JÝš[™Ê‹›˜[YJKœHŠJ_B™[˜Ý[Ûˆ™Ø]X]Ú[™Ô›ÙXÝÕŒN
K
^ØÛÛœÝ[™]ÈX\JKÊOOžÚYŠX_K˜XÝ]™OOOHL_KœÝ]\ÏOOH˜\˜Ú]™YŠ\™]\›ŽØÛÛœÝXKœ›ÙXÝÙ^_KšÙ^KOXK›˜[Y_Kœ›ÙXÝ˜[YNÚYŠ[]J\™]\›ŽØÛÛœÝ[‹™Ù]

_ßKX™Ø]XÚØYÙJKœXÚØYÙTÚ^™_K[š]
KOVÈ›[‹™È‹œÜÈ—Kš[˜ÛY\ÊK˜˜\ÙU[š]
OØK˜˜\ÙU[š]–È›[‹™È‹œÜÈ—Kš[˜ÛY\ÊK[š]
OØK[š]™‹[š]OOH[šÛ›ÝÛˆÙ‹[š]™[š][šÛ›ÝÛˆŽÛ‹œÙ]
Ë‹‹™‹‹˜KÙ^N›˜[YNœÏJœÛÝ\˜ÙT˜[šß
OÝN™›˜[Y_KXÚØYÙTÚ^™N˜KœXÚØYÙTÚ^™_œXÚØYÙTÚ^™_K[š]ˆ‹Ý\Y\“˜[YN™œÝ\Y\“˜[Y_ˆ‹Ý\Y\“˜[Y\Î™œÝ\Y\“˜[Y\ß×KÝ\Y\[X\Ù\Î™œÝ\Y\[X\Ù\ß×KØ]YÛÜžN˜KœÝX˜Ø]YÛÜžS˜[Y_K˜Ø]YÛÜžS˜[Y_K˜Ø]YÛÜž_˜Ø]YÛÜž_ˆ‹šXÙN˜™Ø][X™\ŠKœšXÙJ_™Ø][X™\ŠœšXÙJKÝ\œ™[˜ÞN˜K˜Ý\œ™[˜Þ_˜Ý\œ™[˜Þ_ˆ‹[[Ý[˜K˜[[Ý[‹˜[[Ý[˜[[Ý[[š]›KÛÝ\˜ÙT˜[šÎ“X]›X^
ËœÛÝ\˜ÙT˜[šß
_J_NÙ›ÜŠÛÛœÝHÙˆ™Ø]\œ˜^JOËœÝØÚÐ˜[[˜Ù\ÊJ\ŠKŠNÙ›ÜŠÛÛœÝHÙˆ™Ø]\œ˜^JOË››ÛY[˜Û]\™JJ\ŠKÊNÙ›ÜŠÛÛœÝHÙˆ™Ø]\œ˜^JOËœÝ\Y\”›ÙXÝX\[™ÜÊJ^ØÛÛœÝÏ[‹™Ù]
K˜Ø[›ÛšXØ[›ÙXÝÙ^JNÚYŠ\ßKœÝ]\ÏOOH›Üœ[ˆŠXÛÛ[YNØÛÛœÝVË‹‹›™]ÈÙ]
Ë‹‹ŠËœÝ\Y\“˜[Y\ß×JKKœÝ\Y\“˜[YWK™š[\Š›ÛÛX[ŠJWKOVË‹‹›™]ÈÙ]
Ë‹‹ŠËœÝ\Y\[X\Ù\ß×JKKœÛÝ\˜ÙS˜[YWK™š[\Š›ÛÛX[ŠJWNÛ‹œÙ]
K˜Ø[›ÛšXØ[›ÙXÝÙ^KË‹‹œËÝ\Y\“˜[Y\Î›Ý\Y\[X\Ù\ÎKÝ\Y\“˜[YN››[™ÝŒOÛÌJÈˆ
È4-tbtdHŠÊ›[™ÝLJN›Ì_ˆ‹Ý\Y\ÛÝ[››[™ÝÛÝ\˜ÙPÛÝ[K›[™ÝJ_\™]\›–Ë‹‹›‹˜[Y\Ê
WKœÛÜ

KÊOO”Ýš[™ÊK›˜[YJK›ØØ[PÛÛ\\™JÝš[™ÊË›˜[YJKœHŠJ_B™[˜Ý[Ûˆ™Ø]™XÚ\Tš[Üš]UŒMÊJ^ÚYŠOË˜Ý\œ™[OOHL
\™]\›ˆLÚYŠOËœ™]šY]ÔÝ]\ÏOOH˜\›Ý™YŠ\™]\›ˆOËœÛÝ\˜ÙOOOH˜ZHÎŽLÚYŠOËœÝ]\ÏOOH˜ÛÛ™š\›YYŠ\™]\›ˆOËœÛÝ\˜ÙOOOH˜ZHÍÌÍNÚYŠOË˜Ý\œ™[˜YOOHL
\™]\›ˆŒÚYŠOËœ™]šY]ÔÝ]\ÏOOHœ™\]Z\™\×Ü™]šY]ÈŠ\™]\›ˆLÚYŠOËœ™]šY]ÔÝ]\ÏOOH˜ZWÙ˜YŸOËœÛÝ\˜ÙOOOH˜ZHŠ\™]\›ˆÜ™]\›ˆLB™[˜Ý[Ûˆ™Ø]™XÚ\\Ñ›Ü•ŒMÊK
^Ü™]\›ˆ™Ø]\œ˜^J
K™š[\ŠO”Ýš[™ÊË›Y[R][RYË›ÝÛ™\’YˆŠOOOTÝš[™ÊOËšY_ˆŠJ_B™[˜Ý[Ûˆ™Ø]™XÚ\Q›ÜŠK
^Ü™]\›ˆ™Ø]™XÚ\\Ñ›Ü•ŒMÊK
KœÛÜ

‹ŠOO˜™Ø]™XÚ\Tš[Üš]UŒMÊŠKX™Ø]™XÚ\Tš[Üš]UŒMÊŠ_Ýš[™ÊË\]Y]Ë˜ÛÛ™š\›YY]ˆŠK›ØØ[PÛÛ\\™JÝš[™ÊË\]Y]Ë˜ÛÛ™š\›YY]ˆŠJJVÌ_B™[˜Ý[Ûˆ™Ø]XÚØ\™Ý]UŒMÊK
^ÚYŠYJ\™]\›ˆ›Z\ÜÚ[™ÈŽÚYŠÈ˜[XšYÝ[Ý\È‹›Üœ[ˆ‹Ü›Û™×Ý™[YH—Kš[˜ÛY\ÊÝš[™ÊK›ÝÛ™\“[šÔÝ]\ßˆŠJJ\™]\›ˆ›[š×Ù\œ›ÜˆŽÚYŠKœ™]šY]ÔÝ]\ÏOOH˜\›Ý™YŸKœÝ]\ÏOOH˜ÛÛ™š\›YYŠ\™]\›ˆ˜\›Ý™YŽÚYŠKœ™]šY]ÔÝ]\ÏOOH˜ZWÙ˜YŸKœÛÝ\˜ÙOOOH˜ZHŠ\™]\›ˆ˜ZWÙ˜YŽÜ™]\›ˆœ™]šY]ÈŸB™[˜Ý[Ûˆ™Ø]XÚØ\™Y]UŒMÊK
^ØÛÛœÝX™Ø]XÚØ\™Ý]UŒMÊK
K^ÛZ\ÜÚ[™ÎžÛX™[ˆ´'t-t`ˆ4`´-tat.´,4`4`´bÈ‹Û™Nˆ˜˜YŸK\›Ý™YžÛX™[ˆ´(´-tat.´,4`4`´,4-t`t`´c‹Û™Nˆ™ÛÛÙŸKZWÙ˜YžÛX™[ˆ´)ô-t`4/t/´,´.4.ˆRH‹Û™NˆØ\›ˆŸK™]šY]ÎžÛX™[ˆ´(´`4-t,t`ô-t`ˆ4/ô`4/´,´-t`4.´.‹Û™NˆØ\›ˆŸK[š×Ù\œ›ÜŽžÛX™[ˆ´'´b4.4,t.´,4`t,´cô-ô.‹Û™Nˆ˜˜YŸ_VÛ—KOX™Ø]\œ˜^JOËš[™Ü™YY[ÊKÏXK™š[\ŠOžØÛÛœÝOTÝš[™ÊË›[šÔÝ]\ß
Ëœ\˜Ú\ÙT›ÙXÝÙ^OÈ›[šÙYŽˆ›Z\ÜÚ[™ÈŠJNÜ™]\›ˆVÈ›[šÙY‹˜]]×Û[šÙY—Kš[˜ÛY\ÊJ_JK›[™ÝX™Ø]™XÚ\\Ñ›Ü•ŒMÊ\™Ý[Y[ÖÌ—_×JK™š[™
OOOË˜Ý\œ™[˜YOOHL	‰OËšYOOYOËšY
NÜ™]\›žË‹‹œ‹Ý]N›‹ÛÝ\˜ÙN™OËœÛÝ\˜ÙOOOH˜ZHÈRHŽ™OËœÛÝ\˜ÙOOOHš[\ÜÈ´&4/4/ô/´`4`ˆŽˆ´$´`4`ôaô/t`ôcˆ‹™\œÚ[ÛŽ“[X™\ŠOË™\œÚ[ÛŠ_K[™Ü™YY[ÛÝ[˜K›[™Ýœ›ÚÙ[’[™Ü™YY[ÎœË[™[™Ñ˜Y›[_B™[˜Ý[Ûˆ™Ø]˜[[˜ÙRÙ^JJ^ØÛÛœÝX™Ø]Ð˜\ÙJKœ]X[]KK[š]
NÜ™]\›ˆKœ\˜Ú\ÙT›ÙXÝÙ^_›X[X[ˆŠØ™›ØÓ›Ü›JK›˜[YJJÈŸŠÝ[š]B‚™[˜Ý[Ûˆ™Ø]™XY[™\ÜÊJ^ØÛÛœÝYK›Y[R][\Ë™š[\ŠOO˜K˜XÝ]™HOOHLI‰˜K\HOOHœÙ\šXÙHŠK]™š[\ŠOO˜™Ø]™XÚ\Q›ÜŠKKœ™XÚ\\ÊOËœÝ]\ÏOOH˜ÛÛ™š\›YYŠK]™š[\ŠOO˜™Ø][X™\ŠKœ[›™YØ[\ÊOŒ
KO[‹™›]X\
ÏO˜™Ø]\œ˜^J™Ø]™XÚ\Q›ÜŠËKœ™XÚ\\ÊOËš[™Ü™YY[ÊJKÏXK™š[\ŠO›œ\˜Ú\ÙT›ÙXÝÙ^JK[™]ÈÙ]
KœÝØÚÐ˜[[˜Ù\Ë™š[\ŠOOK˜ÚXÚÙY]
K›X\
OOKšÙ^JJKO\Ë™š[\ŠO›š\Ê™Ø]˜[[˜ÙRÙ^J
JJK]›[™ÝKXK›[™ÝKOSX]œ›Ý[™
JŠ‹›[™ÝÙ
Ü‹›[™ÝÙ
ÜË›[™ÝÙŠÝK›[™ÝÙŠJNÜ™]\›žÜØÛÜ™N›[™ÝÓX]›Z[ŠLJNŒÝ[›[™Ý™XÚ\\Î›‹›[™Ý[œÎœ‹›[™Ý[šÙYœË›[™Ý[™Ü™YY[Î˜K›[™ÝÝØÚÎK›[™Ý_B™[˜Ý[Ûˆ™Ø]™\ÛÛ™Y[[Ý[ŒNJJ^ÚYŠÈ›[šÙYÝ[š]Ü™]šY]È‹›[šÙYÜXÚØYÚ[™×Ü™]šY]È—Kš[˜ÛY\ÊKœ™\ÛÛ][Û”Ý]\ßK›[šÔÝ]\ÊJ\™]\›žË‹‹˜™Ø]Ð˜\ÙJKœ]X[]KK[š]
K™]šY]ÎˆLNÚYŠÈ™^XÝØÛÛ\]X›H‹œXÚØYÚ[™×ØÛÛ\]X›H—Kš[˜ÛY\ÊK[š]™\ÛÛ][Û”Ý]\ÊI‰˜™Ø][X™\ŠK››Ü›X[^™Y]X[]JOL	‰–È™È‹›[‹œÜÈ—Kš[˜ÛY\ÊK››Ü›X[^™Y[š]
J\™]\›žØ[[Ý[˜™Ø][X™\ŠK››Ü›X[^™Y]X[]JK[š]™K››Ü›X[^™Y[š]™]šY]ÎˆL_NÜ™]\›žË‹‹˜™Ø]Ð˜\ÙJKœ]X[]KK[š]
K™]šY]ÎˆL__B™[˜Ý[Ûˆ™Ø]™YYÊK
^ØÛÛœÝ[™]ÈX\V×KO[™]ÈX\
KœÝØÚÐ˜[[˜Ù\Ë›X\
O–ÚšÙ^KJJKÏ[™]ÈX\
›X\
O–ÚšÙ^KJJNÙ›ÜŠÛÛœÝÙˆK›Y[R][\Ë™š[\ŠÏO™Ë˜XÝ]™HOOHLI‰™Ë\HOOHœÙ\šXÙHŠJ^ØÛÛœÝÏX™Ø]™XÚ\Q›ÜŠKœ™XÚ\\ÊKOX™Ø][X™\Šœ[›™YØ[\ÊNÚYŠÏËœÝ]\ÈOOH˜ÛÛ™š\›YYŠ^Ü‹œ\Ú
´'t-t`ˆ4/ô/´-4`´,´-t`4-´-4dt/t/t/´.H4`´-tat.´,4`4`´bÎˆŠÚ›˜[YJNØÛÛ[Y_ZYŠJOŒ
J^Ü‹œ\Ú
´'t-H4-ô,4-4,4/H4/ô.ô,4/H4/ô`4/´-4,4-ŽˆŠÚ›˜[YJNØÛÛ[Y_Y›ÜŠÛÛœÝˆÙˆ™Ø]\œ˜^JËš[™Ü™YY[ÊJ^ØÛÛœÝX™Ø]™\ÛÛ™Y[[Ý[ŒNJŠNÚYŠ‹œ™]šY]Ê^Ü‹œ\Ú
´'t`ô-´/t/ˆ4`ô`´/´aô/t.4`´c4/t/´`4/4`È4.4.ô.4a4,4`t/´,´.´`ÎˆŠÚ‹›˜[YJNØÛÛ[Y_ZYŠ‹[š]OOH[šÛ›ÝÛˆŠ^Ü‹œ\Ú
´'t-tcô`t/t,4cÈ4-t-4.4/t.4a´,4.4-ô/4-t`4-t/t.4cÎˆŠÚ‹›˜[YJNØÛÛ[Y_ZYŠZ‹œ\˜Ú\ÙT›ÙXÝÙ^J^Ü‹œ\Ú
´'t-H4`t,´cô-ô,4/H4`H4-ô,4.´`ô/ô/´aô/tbô/4`´/´,´,4`4/´/ˆŠÚ‹›˜[YJNØÛÛ[Y_XÛÛœÝZ‹œ\˜Ú\ÙT›ÙXÝÙ^JÈŸŠÝ‹[š][‹™Ù]
Š_ÚÙ^N˜‹›ÙXÝÙ^Nš‹œ\˜Ú\ÙT›ÙXÝÙ^K˜[YNš‹›˜[YK™\]Z\™YŒ[š]‹[š]NÓ‹œ™\]Z\™Y
Ï]‹˜[[Ý[
žK‹œÙ]
‹Š__XÛÛœÝV×NÙ›ÜŠÛÛœÝÙˆ‹˜[Y\Ê
J^ØÛÛœÝÏ\Ë™Ù]
œ›ÙXÝÙ^JKOXK™Ù]
œ›ÙXÝÙ^J_K™Ù]
šÙ^J_ßKSX]›X^
œ™\]Z\™Y
Ø™Ø][X™\ŠKœØY™]JKX™Ø][X™\ŠK˜Ý\œ™[
KX™Ø][X™\ŠK›Û“Ü™\ŠJKYÉ‰™Ë[š]OOZ[š]ÙË˜[[Ý[˜™Ø][X™\ŠKœXÚØYÙP[[Ý[
K]ŒÓX]˜ÙZ[
‹ÝŠNŒÝL	‰šŒ	‰œ‹œ\Ú
´'t-H4/´/ô`4-t-4-t.ô-t/t,4a4,4`t/´,´.´,ˆŠÚ›˜[YJKœ\Ú
Ë‹‹šÝ\œ™[˜™Ø][X™\ŠK˜Ý\œ™[
KØY™]N˜™Ø][X™\ŠKœØY™]JKÛ“Ü™\Ž˜™Ø][X™\ŠK›Û“Ü™\ŠK™]š‹XÚØYÙP[[Ý[‹XÚØYÙ\Î˜‹Ü™\™Y˜Š‹šXÙN™ÏËœšXÙ_Ý\œ™[˜ÞN™ÏË˜Ý\œ™[˜Þ_ˆ‹Ý\Y\“˜[YN™ÏËœÝ\Y\“˜[Y_ˆ‹\Ý[X]Y™ÏËœšXÙOÓX]œ›Ý[™
Š™ËœšXÙJŒL
KÌL›[J_Y›ÜŠÛÛœÝÙˆKš[\›˜[][\Ë™š[\ŠÏO™Ë˜XÝ]™HOOHLJJ^ØÛÛœÝÏ\Ë™Ù]
œ\˜Ú\ÙT›ÙXÝÙ^JKOSX]›X^
™Ø][X™\Š›Z[š[][TÝØÚÊKX™Ø][X™\Š˜Ý\œ™[ÝØÚÊKX™Ø][X™\Š›Û“Ü™\ŠJKX™Ø][X™\ŠœXÚØYÙP[[Ý[
_
ÏË˜[[Ý[
KZŒÓX]˜ÙZ[
KÚŠNŒÚYŠOŒ	‰ˆZŠ\‹œ\Ú
´'t-H4/´/ô`4-t-4-t.ô-t/t,4a4,4`t/´,´.´,ˆŠÚ›˜[YJNÞOŒ	‰›œ\Ú
ÚÙ^Nˆš[\›˜[ˆŠÚšY›ÙXÝÙ^Nšœ\˜Ú\ÙT›ÙXÝÙ^_ˆ‹˜[YNš›˜[YK™\]Z\™YŒÝ\œ™[˜™Ø][X™\Š˜Ý\œ™[ÝØÚÊKØY™]N˜™Ø][X™\Š›Z[š[][TÝØÚÊKÛ“Ü™\Ž˜™Ø][X™\Š›Û“Ü™\ŠK™]žK[š]š[š]ÏË[š][šÛ›ÝÛˆ‹XÚØYÙP[[Ý[š‹XÚØYÙ\Î‹Ü™\™YŠš‹šXÙN™ÏËœšXÙ_Ý\œ™[˜ÞN™ÏË˜Ý\œ™[˜Þ_ˆ‹Ý\Y\“˜[YN™ÏËœÝ\Y\“˜[Y_ˆ‹\Ý[X]Y™ÏËœšXÙOÓX]œ›Ý[™
Š™ËœšXÙJŒL
KÌL›[[\›˜[ˆLJ_\™]\›žÛ™YYÎ›™š[\ŠOš›™]Œ
KœÛÜ

ÊOO™Ë›™]Z›™]
K\ÜÝY\Î–Ë‹‹›™]ÈÙ]
ŠWKœÛXÙJÌ
__B™[˜Ý[Ûˆ™Ø]šY[
ÛX™[™KÚ[™[ŽJ^Ü™]\›ˆKšœÞÊ›X™[‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËYšY[‹Ú[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÚ[™[Ž™_JK_J_B˜ÛÛœÝ™Y[TØ[TÚ^™U™\œÚ[Û•ŒŽNH›Y[K\Ø[K\Ú^™K]ŒŽNŽÂ˜ÛÛœÝ™Y[PØ[›ÛšXØ[[š]ÕŒŽNVÞØÛÙNˆ›[‹X™[ˆ´/4.È‹˜\ÙU[š]ˆ›[‹[Y[œÚ[ÛŽˆ›Û[YH‹˜XÝÜŽŒ_KØÛÙNˆ›‹X™[ˆ´.È‹˜\ÙU[š]ˆ›[‹[Y[œÚ[ÛŽˆ›Û[YH‹˜XÝÜŽŒYLßKØÛÙNˆ™È‹X™[ˆ´,È‹˜\ÙU[š]ˆ™È‹[Y[œÚ[ÛŽˆ›X\ÜÈ‹˜XÝÜŽŒ_KØÛÙNˆšÙÈ‹X™[ˆ´.´,È‹˜\ÙU[š]ˆ™È‹[Y[œÚ[ÛŽˆ›X\ÜÈ‹˜XÝÜŽŒYLßKØÛÙNˆœÜÈ‹X™[ˆ´b4`‹ˆ‹˜\ÙU[š]ˆœÜÈ‹[Y[œÚ[ÛŽˆ˜ÛÝ[‹˜XÝÜŽŒ_WNÂ™[˜Ý[Ûˆ™Y[U[š]Ü[ÛœÕŒŽN
J^ØÛÛœÝX™Ø]\œ˜^JJK™š[\ŠO˜™Y[PØ[›ÛšXØ[[š]ÕŒŽNœÛÛYJOœ‹˜ÛÙOOO[Ë˜ÛÙJJNÜ™]\›ˆ›[™ÝÝ˜™Y[PØ[›ÛšXØ[[š]ÕŒŽNB™[˜Ý[Ûˆ™Y[S[X™\•ŒŽN
J^ÚYŠOO[[OOOHˆŠ\™]\›ˆ[ØÛÛœÝ]\[ÙˆOOOHœÝš[™ÈÓ[X™\ŠKœ™\XÙJ×ËÙËˆŠKœ™\XÙJ‹‹‹ˆŠJN“[X™\ŠJNÜ™]\›ˆ[X™\‹š\Ñš[š]J
OÝ›[B™[˜Ý[Ûˆ™Y[U[š]ŒŽN
J^ØÛÛœÝTÝš[™Ê_ˆŠKš[J
KÓØØ[SÝÙ\Ø\ÙJœHŠKœ™\XÙJ×‰ËˆŠNÜ™]\›‹×Š4/4.ß[4/4.4.ô.ô.4.ô.4`´`
KË\Ý

OÈ›[Ž‹×Š4.ß4.ô.4`´`
KË\Ý

OÈ›Ž‹×Š4.´,ßÙß4.´.4.ô/´,ô`4,4/4/
KË\Ý

OÈšÙÈŽ‹×Š4,ß4,ô`ß4,ô`4,4/4/
KË\Ý

OÈ™ÈŽ‹×Š4b4`ŸÜßYXÙ_4/ô/´`4aŠKË\Ý

OÈœÜÈŽˆˆŸB™[˜Ý[Ûˆ™Y[TÝXÝ\™YÚ^™UŒŽN
KH›X[X[‹^ßJ^ØÛÛœÝOX™Y[S[X™\•ŒŽN
JKÏX™Y[PØ[›ÛšXØ[[š]ÕŒŽN™š[™
O›˜ÛÙOOOX™Y[U[š]ŒŽN

JNÜ™]\›ˆHO[[	‰˜OŒ	‰œÏÞÝ™\œÚ[ÛŽŒK]X[]N“X]œ›Ý[™
JŒYMŠKÌYM‹[š]œË˜ÛÙK˜\ÙT]X[]N“X]œ›Ý[™
JœË™˜XÝÜŠŒYMŠKÌYM‹˜\ÙU[š]œË˜˜\ÙU[š]ÛÝ\˜ÙN›‹Ý]\Îˆ˜ÛÛ™š\›YY‹‹‹Š‹››ÛY[˜Û]\™R][RYÞÛ[šÙY›ÛY[˜Û]\™R][RYœ‹››ÛY[˜Û]\™R][RYNžßJK‹‹Š‹œ›ÙXÝÙ^OÞÜ›ÙXÝÙ^Nœ‹œ›ÙXÝÙ^_NžßJK‹‹Š‹œXÚØYÙSX™[ÞÜXÚØYÙSX™[œ‹œXÚØYÙSX™[NžßJ_N›[B™[˜Ý[Ûˆ™Y[SYØXÞTÚ^™UŒŽN
J^ØÛÛœÝTÝš[™Ê_ˆŠKš[J
NÚYŠ]
\™]\›ˆ[ØÛÛœÝ]ÓØØ[SÝÙ\Ø\ÙJœHŠKœ™\XÙJÖË¸à —JÉÙËˆŠKš[J
K›X]Ú
×Š
ÊÎ–Ë‹W
ÊOÊWÊŠ4/4.ß[4/4.4.ô.ô.4.ô.4`´`
Î´,4/´,ŠOß4.ß4.ô.4`´`
Î´,4/´,ŠOß4,ß4,ô`ß4,ô`4,4/4/
Î´,4/´,ŠOß4.´,ßÙß4.´.4.ô/´,ô`4,4/4/
Î´,4/´,ŠOß4b4`—ßÜßYXÙJÎœÊOß4/ô/´`4aŠÎ´.4cß4.4.4.4.JO×ÊIÚ]JNÜ™]\›ˆØ™Y[TÝXÝ\™YÚ^™UŒŽN
–ÌWK–Ì—JNžÝ™\œÚ[ÛŽŒKÛÝ\˜ÙNˆ›YØXÞH‹Ý]\Îˆ›™YY×Ü™]šY]È‹YØXÞU˜[YN_B™[˜Ý[Ûˆ™Y[TØ[Q˜YŒŽN
J^ØÛÛœÝYOËœØ[TÚ^™I‰\[ÙˆKœØ[TÚ^™OOOH›Øš™XÝÙKœØ[TÚ^™N›[ÚYŠËœÝ]\ÏOOH˜ÛÛ™š\›YY‰‰˜™Y[TÝXÝ\™YÚ^™UŒŽN
œ]X[]K[š]œÛÝ\˜ÙK
J\™]\›žÜ]X[]N”Ýš[™Êœ]X[]JKœ™\XÙJ‹ˆ‹‹ŠK[š][š]YØXÞNˆˆŸNØÛÛœÝX™Y[SYØXÞTÚ^™UŒŽN
Ë›YØXÞU˜[Y_OË›YØXÞTÜ[Û”Ú^™_OËœÜ[Û”Ú^™_OËœÜ[ÛŠNÜ™]\›ˆËœÝ]\ÏOOH˜ÛÛ™š\›YYÞÜ]X[]N”Ýš[™Ê‹œ]X[]JKœ™\XÙJ‹ˆ‹‹ŠK[š]›‹[š]YØXÞNˆˆŸNžÜ]X[]Nˆˆ‹[š]ˆ›[‹YØXÞN›Ë›YØXÞU˜[Y_ˆŸ_B™[˜Ý[Ûˆ™Y[TXÚØYÙSX™[ÕŒŽN
J^ØÛÛœÝVË‹‹˜™Ø]\œ˜^JOËœXÚØYÙSÜ[ÛœÊKOËœXÚØYÙTÚ^™KOË™\Ü^TXÚØYÙTÚ^™KOËœ\˜Ú\ÙTXÚØYÙTÚ^™WK[™]ÈX\Ù›ÜŠÛÛœÝˆÙˆ
^ØÛÛœÝO]\[ÙˆOOHœÝš[™ÈÜŽœË›X™[ËœXÚØYÙTÚ^™_ˆŽÚYŠX_ô/t-t`t.´/´.ôc4.´/—Êôa4,4`t/´,´/´.‹ÚK\Ý
JJXÛÛ[YNØÛÛœÝÏX™Ø]XÚØYÙJJK\Ë[š]OOH[šÛ›ÝÛˆ‰‰œË˜[[Ý[ŒÜË[š]
ÈŽˆŠÜË˜[[Ý[”Ýš[™ÊJKÓØØ[SÝÙ\Ø\ÙJœHŠNÛ‹š\Ê
_‹œÙ]
J_\™]\›–Ë‹‹›‹˜[Y\Ê
W_B™[˜Ý[Ûˆ™Y[TÚ^™Qœ›ÛTXÚØYÙUŒŽN
K
^ØÛÛœÝX™Y[SYØXÞTÚ^™UŒŽN
JNÚYŠËœÝ]\ÏOOH˜ÛÛ™š\›YYŠ\™]\›ˆ™Y[TÝXÝ\™YÚ^™UŒŽN
‹œ]X[]K‹[š]œXÚØYÚ[™È‹Û›ÛY[˜Û]\™R][RYËšYË››ÛY[˜Û]\™R][RYËšÙ^K›ÙXÝÙ^NËšÙ^_Ëœ›ÙXÝÙ^KXÚØYÙSX™[™_JNÜ™]\›ˆI‰ŠË[š]OOHœÜÈŸË˜˜\ÙU[š]OOHœÜÈŠOØ™Y[TÝXÝ\™YÚ^™UŒŽN
KœÜÈ‹œXÚØYÚ[™È‹Û›ÛY[˜Û]\™R][RYËšYË››ÛY[˜Û]\™R][RYËšÙ^K›ÙXÝÙ^NËšÙ^_Ëœ›ÙXÝÙ^KXÚØYÙSX™[™_JN›[B™[˜Ý[Ûˆ™Y[TØ[TÚ^™U^ŒŽN
J^ÚYŠYJ\™]\›ˆˆŽÚYŠKœÝ]\ÏOOH›™YY×Ü™]šY]ÈŠ\™]\›ˆK›YØXÞU˜[Y_ˆŽØÛÛœÝX™Y[PØ[›ÛšXØ[[š]ÕŒŽN™š[™
O›‹˜ÛÙOOOYK[š]
NÜ™]\›ˆ™]È[“[X™\‘›Ü›X]
œKT•H‹ÛX^[][Qœ˜XÝ[Û‘YÚ]ÎŒßJK™›Ü›X]
Kœ]X[]JJÈˆŠÊË›X™[K[š]
_B™[˜Ý[Ûˆ™Y[T]X[]PÚ[™ÙUŒŽN
KŠ^ÚYŠK×—
ŠÎ–Ë‹WÌßJOÉË\Ý
JJ\™]\›ŽØÛÛœÝX™Y[TÝXÝ\™YÚ^™UŒŽN
K
NÛŠÜØ[T]X[]R[œ]™KØ[U[š]Ø[TÚ^™NœŸ›ÚYÜ[Û”Ú^™N›ÚYJ_B™[˜Ý[Ûˆ™Y[R[\ÜÚ^™U˜[YŒŽN
J^ÚYŠOË\OOOHœÙ\šXÙHŠ\™]\›ˆLØÛÛœÝX™Y[TÝXÝ\™YÚ^™UŒŽN
OËœØ[T]X[]R[œ]ÏÙOËœØ[TÚ^™OËœ]X[]KOËœØ[U[š]OËœØ[TÚ^™OË[š]
_™Y[SYØXÞTÚ^™UŒŽN
OË›YØXÞTÜ[Û”Ú^™_OËœÜ[Û”Ú^™JNÜ™]\›ˆËœÝ]\ÏOOH˜ÛÛ™š\›YYŸB™[˜Ý[Ûˆ™Y[PÛX[’][UŒŽN
J^ØÛÛœÝÜØ[T]X[]R[œ]Ø[U[š]›‹Ü[Û”Ú^™Nœ‹‹‹˜_OY_ßKÏYOË\OOOHœÙ\šXÙHÝ›ÚY˜™Y[TÝXÝ\™YÚ^™UŒŽN
ÏÙOËœØ[TÚ^™OËœ]X[]KŸOËœØ[TÚ^™OË[š]OËœØ[TÚ^™OËœÛÝ\˜Ù_›X[X[‹OËœØ[TÚ^™_ßJNÜ™]\›žË‹‹˜KØ[TÚ^™NœßOËœØ[TÚ^™KÜ[Û”Ú^™N›ÚYYØXÞTÜ[Û”Ú^™NœÏÝ›ÚY™OË›YØXÞTÜ[Û”Ú^™__B™[˜Ý[Ûˆ™Y[TØ[TÚ^™PÛÛ›ÛŒŽN
Ú][N™KÛÚ[™ÙN[š]Ü[ÛœÎ›ŸJ^ÚYŠOË\OOOHœÙ\šXÙHŠ\™]\›ˆ[ØÛÛœÝX™Y[TØ[Q˜YŒŽN
JKOYOËœØ[T]X[]R[œ]ÏÜ‹œ]X[]KÏYOËœØ[U[š]‹[š]X™Y[U[š]Ü[ÛœÕŒŽN
ŠKOX™Y[TÝXÝ\™YÚ^™UŒŽN
KÊKYOË›YØXÞTÜ[Û”Ú^™_
]OÜ‹›YØXÞNˆˆŠNÜ™]\›ˆKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™[Y[K\Ø[K\Ú^™K]ŒŽN‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™[Y[K\Ø[K\Ú^™KYšY[Ë]ŒŽN‹Ú[™[Ž–ÚKšœÞ
™Ø]šY[ÛX™[ˆ´&´/´.ô.4aô-t`t`´,´/ˆ‹Ú[™[ŽšKšœÞ
š[œ]‹Ý\Nˆ^‹[œ][ÙNˆ™XÚ[X[‹]\›Žˆ–ÌNWJÊË—VÌNWJÊOÈ‹˜[YN˜KÛÚ[™ÙN™O˜™Y[T]X[]PÚ[™ÙUŒŽN
‹\™Ù]˜[YKË
KXÙZÛ\ŽˆŒKH‹˜\šXK[X™[Žˆ´&´/´.ô.4aô-t`t`´,´/ˆ4/ô`4/´-4,4-´.ŸJ_JKKšœÞ
™Ø]šY[ÛX™[ˆ´%t-4.4/t.4a´,‹Ú[™[ŽšKšœÞ
œÙ[XÝ‹Ý˜[YNœËÛÚ[™ÙN™OžØÛÛœÝOY‹\™Ù]˜[YNÝ
ÜØ[U[š]›KØ[TÚ^™N˜™Y[TÝXÝ\™YÚ^™UŒŽN
KJ_›ÚYÜ[Û”Ú^™N›ÚYJ_K˜\šXK[X™[Žˆ´%t-4.4/t.4a´,4/ô`4/´-4,4-´.‹Ú[™[Ž››X\
OšKšœÞ
›Ü[Ûˆ‹Ý˜[YN™‹˜ÛÙKÚ[™[Ž™‹›X™[K‹˜ÛÙJJ_J_JW_JK	‰šKšœÞÊœ‹ØÛ\ÜÓ˜[YNˆ˜™[Y[K\Ø[K\Ú^™K[YØXÞK]ŒŽN‹›ÛNˆœÝ]\È‹Ú[™[Ž–È´'ô`4-t-´/t-t-H4-ô/t,4aô-t/t.4-H0ªÈ‹°®È4/t-t/´-4/t/´-ô/t,4aô/t/‹ˆ4(ô.´,4-´.4`´-H4.´/´.ô.4aô-t`t`´,´/ˆ4.4-t-4.4/t.4a´`È4/ô-t`4-t-4`t/´at`4,4/t-t/t.4-t/ˆ—_JW_J_B™[˜Ý[Ûˆ™Ø]Y[QY]ÜŠÚ][N™KÜš^›ÛŽÜ›Ý\Î›‹ÝX™Ü›Ý\Îœ‹ÛÛÜÙN˜KÛ”Ø]™NœËÛ“X[˜YÙTÝXÝ\™N›Ý\œ™[˜ÞN˜™Y[U™[YPÝ\œ™[˜ÞOH”•Pˆ‹›ÙXÝÎ˜™Y[T›ÙXÝÏV×K[š]Ü[ÛœÎ˜™Y[U[š]Ü[ÛœËÛ“›ÛY[˜Û]\™PÜ™X]Y˜™Y[SÛ“›ÛY[˜Û]\™PÜ™X]YŒÍLŸJ^ØÛÛœÝOX™Ø]\œ˜^JŠKX™Ø]\œ˜^JŠK™Y[U^[š]X[X™^™XÛÜ™ŒÌÍŠ™Ø\™ZÝ\ÙT™XÛÜ™
Š˜™Ø\ÜÛÜY[ÝŒHŠJK››ÛY[˜Û]\™TÝXÝ\™JK™Y[U^Y˜][ÙXÝ[ÛX™^Ü\˜][Û˜[ŒÍŒÊ™Y[U^[š]X[œÙXÝ[ÛœÊVÌK™Y[U^Y˜][Ø]YÛÜžOX™Y[U^Y˜][ÙXÝ[Û‰‰˜™^Ü\˜][Û˜[ŒÍŒÊ™Y[U^[š]X[˜Ø]YÛÜšY\ÊK™š[™
O”œ\™[YOOX™Y[U^Y˜][ÙXÝ[Û‹šY
K™Y[U^Y˜][ÝX˜Ø]YÛÜžOX™Y[U^Y˜][Ø]YÛÜžI‰˜™^Ü\˜][Û˜[ŒÍŒÊ™Y[U^[š]X[œÝX˜Ø]YÛÜšY\ÊK™š[™
O”œ\™[YOOX™Y[U^Y˜][Ø]YÛÜžKšY
K]K™š[™
O”šYOOYOË™Ü›Ý\Y
_VÌKOX™Y[TØ[Q˜YŒŽN
JKÚ×OTË\ÙTÝ]J

OO™OÞË‹‹™KÙXÝ[Û’Y™KœÙXÝ[Û’Yˆ‹^Û›Û^PØ]YÛÜžRY™K^Û›Û^PØ]YÛÜžRYˆ‹ÝX˜Ø]YÛÜžRY™KœÝX˜Ø]YÛÜžRYˆ‹Ý\œ™[˜ÞN˜™XØÛÝ[[™ÐÝ\œ™[˜ÞUŒÊK˜Ý\œ™[˜ÞJ_™XØÛÝ[[™ÐÝ\œ™[˜ÞUŒÊ™Y[U™[YPÝ\œ™[˜ÞJ_”•Pˆ‹Ü›Ý\Y™ËšYˆ‹ÝX™Ü›Ý\Y™œÛÛYJO”šYOOYOËœÝX™Ü›Ý\Y	‰”™Ü›Ý\YOOJËšYˆŠJOÙKœÝX™Ü›Ý\Yˆˆ‹Ø[T]X[]R[œ]›Kœ]X[]KØ[U[š]›K[š]YØXÞTÜ[Û”Ú^™N™K›YØXÞTÜ[Û”Ú^™_K›YØXÞ_›ÚYNžÚY˜Üž\Ëœ˜[™ÛUURQ

KÙXÝ[Û’Y˜™Y[U^Y˜][ÙXÝ[ÛËšYˆ‹^Û›Û^PØ]YÛÜžRY˜™Y[U^Y˜][Ø]YÛÜžOËšYˆ‹ÝX˜Ø]YÛÜžRY˜™Y[U^Y˜][ÝX˜Ø]YÛÜžOËšYˆ‹Ü›Ý\Y™ËšYˆ‹ÝX™Ü›Ý\Y™™š[™
O”™Ü›Ý\YOOYËšY
OËšYˆ‹˜[YNˆˆ‹Ø[TšXÙNŒÝ\œ™[˜ÞN˜™Y[U™[YPÝ\œ™[˜Þ_”•Pˆ‹Ø[T]X[]R[œ]ˆˆ‹Ø[U[š]ˆ›[‹\Nˆ˜ÛÛ\ÜÚ]H‹XÝ]™NˆL[›™YØ[\ÎŒÛÛ™šY[˜ÙNŒKØ\›š[™ÜÎ–×_JKÞK—OTË\ÙTÝ]JˆŠKØ™Y[U^Û›Û^K™Ù]Y[U^Û›Û^WOTË\ÙTÝ]J™Y[U^[š]X[
KØ™Y[U^]ÕŒÍL™Ù]Y[U^]ÕŒÍLOTË\ÙTÝ]J×JKØ™Y[U^ØY[™ÕŒÍL™Ù]Y[U^ØY[™ÕŒÍLOTË\ÙTÝ]JL
KØ™Y[T]ZXÚÓÜ[•ŒÍL™Ù]Y[T]ZXÚÓÜ[•ŒÍLOTË\ÙTÝ]JLJKØ™Y[PÜ™X]Y›ÙXÝŒÍL™Ù]Y[PÜ™X]Y›ÙXÝŒÍLOTË\ÙTÝ]J[
KØ™Y[T›ÙXÝ]Y\žUŒÍL™Ù]Y[T›ÙXÝ]Y\žUŒÍLOTË\ÙTÝ]JˆŠNÔË\ÙQY™™XÝ


OOžÛ]HLØ™^™\]Y\ÝŒÌÍŠ‹Ø\KÛ›ÛY[˜Û]\™KÝ^Û›Û^HŠK[ŠÏOžÚYŠT
\™]\›ŽØ™Ù]Y[U^Û›Û^JË^Û›Û^JK™Ù]Y[U^]ÕŒÍL
Ë›YØXÞSY[T]ß×JKÊOOžÚYŠKœÙXÝ[Û’Y	‰’K^Û›Û^PØ]YÛÜžRY	‰’KœÝX˜Ø]YÛÜžRY
\™]\›ˆNØÛÛœÝJË›YØXÞSY[T]ß×JK™š[™
ÏO•Ë™Ü›Ý\YOORK™Ü›Ý\Y	‰ŠRKœÝX™Ü›Ý\YËœÝX™Ü›Ý\YOORKœÝX™Ü›Ý\Y
J_
Ë›YØXÞSY[T]ß×JK™š[™
ÏO•Ë™Ü›Ý\YOORK™Ü›Ý\Y
NÚYŠŠ\™]\›žË‹‹’KÙXÝ[Û’Y”‹œÙXÝ[Û’Y^Û›Û^PØ]YÛÜžRY”‹^Û›Û^PØ]YÛÜžRYÝX˜Ø]YÛÜžRY”‹œÝX˜Ø]YÛÜžRYNØÛÛœÝÏX™^Ü\˜][Û˜[ŒÍŒÊË^Û›Û^OËœÙXÝ[ÛœÊVÌKUÉ‰˜™^Ü\˜][Û˜[ŒÍŒÊË^Û›Û^OË˜Ø]YÛÜšY\ÊK™š[™
OO”Kœ\™[YOOUËšY
KÏR‰‰˜™^Ü\˜][Û˜[ŒÍŒÊË^Û›Û^OËœÝX˜Ø]YÛÜšY\ÊK™š[™
OO”Kœ\™[YOOR‹šY
NÜ™]\›žË‹‹’KÙXÝ[Û’Y•ÏËšYˆ‹^Û›Û^PØ]YÛÜžRY’ËšYˆ‹ÝX˜Ø]YÛÜžRY’ÏËšYˆŸ_JK™Ù]Y[U^ØY[™ÕŒÍL
LJ_JK˜Ø]Ú
OžÚŠ›Y\ÜØYÙJK™Ù]Y[U^ØY[™ÕŒÍL
LJ_JNÜ™]\›Š
OOžÔHL__K×JNØ\Þ[˜È[˜Ý[Ûˆ™Ü™X]SY[U^Û›Û^J
^ØÛÛœÝÏ]Ú[™ÝËœ›Û\
´'t,4-ô,´,4/t.4-H4/t/´,´/´,ô/ˆŠÊOOHœÙXÝ[ÛˆÈ´`4,4-ô-4-t.ô,Ž”OOH˜Ø]YÛÜžHÈ´.´,4`´-t,ô/´`4.4.Žˆ´/ô/´-4.´,4`´-t,ô/´`4.4.ŠJNÚYŠXÏËš[J
J\™]\›ŽÝž^ØÛÛœÝOX]ØZ]™^™\]Y\ÝŒÌÍŠ‹Ø\KÛ›ÛY[˜Û]\™KÝ^Û›Û^H‹ÛY]Ùˆ”ÔÕ‹›ÙN’”ÓÓ‹œÝš[™ÚYžJØXÝ[ÛŽˆ˜Ü™X]H‹]™[”˜[YN˜Ëš[J
K\™[Y”OOH˜Ø]YÛÜžHÚœÙXÝ[Û’Y”OOHœÝX˜Ø]YÛÜžHÚ^Û›Û^PØ]YÛÜžRY›ÚYJ_JNØ™Ù]Y[U^Û›Û^JK^Û›Û^JKK˜\ÜÛÜY[	‰’ÜÙJ˜™Ø\ÜÛÜY[ÝŒH‹K˜\ÜÛÜY[
NØÛÛœÝRK››ÙOËšYÔ‰‰™ÊÏOŠË‹‹•ËÔOOHœÙXÝ[ÛˆÈœÙXÝ[Û’YŽ”OOH˜Ø]YÛÜžHÈ^Û›Û^PØ]YÛÜžRYŽˆœÝX˜Ø]YÛÜžRY—N”‹‹‹ŠOOHœÙXÝ[ÛˆÞÝ^Û›Û^PØ]YÛÜžRYˆˆ‹ÝX˜Ø]YÛÜžRYˆˆŸN”OOH˜Ø]YÛÜžHÞÜÝX˜Ø]YÛÜžRYˆˆŸNžßJ_JJ_XØ]Ú
J^ÚŠK›Y\ÜØYÙJ__XÛÛœÝJÊOO™ÊOOŠË‹‹’KÔN˜ßJJK™Y[TÙ]^Û›Û^UŒÍLTOžØÛÛœÝÏX™Y[U^]ÕŒÍL™š[™
OO’KœÙXÝ[Û’YOOTœÙXÝ[Û’Y	‰’K^Û›Û^PØ]YÛÜžRYOOT^Û›Û^PØ]YÛÜžRY	‰’KœÝX˜Ø]YÛÜžRYOOTœÝX˜Ø]YÛÜžRY
NÙÊË‹‹”‹‹ŠÏÞÙÜ›Ý\Y˜Ë™Ü›Ý\YÝX™Ü›Ý\Y˜ËœÝX™Ü›Ý\YNžßJ_J_KY™š[\ŠO”™Ü›Ý\YOOZ™Ü›Ý\Y
KTOžØÛÛœÝÏY™š[™
OO’K™Ü›Ý\YOOT
NÙÊOOŠË‹‹’KÜ›Ý\Y”ÝX™Ü›Ý\Y˜ÏËšYˆŸJJ_KOVË‹‹Š™Y[PÜ™X]Y›ÙXÝŒÍLÖØ™Y[PÜ™X]Y›ÙXÝŒÍLN–×JK‹‹˜™Ø]\œ˜^J™Y[T›ÙXÝÊK™š[\ŠO”šÙ^HOOX™Y[PÜ™X]Y›ÙXÝŒÍLËšÙ^JWK™Y[Uš\ÚX›T›ÙXÝÕŒÍLX™[X™]XØ[ŒÍŒÊK™š[\ŠOˆX™Y[T›ÙXÝ]Y\žUŒÍLš[J
_™›ØÓ›Ü›J›˜[YJKš[˜ÛY\Ê™›ØÓ›Ü›J™Y[T›ÙXÝ]Y\žUŒÍL
JJJKœÛXÙJL
K™Y[Q^XÝ›ÙXÝÕŒÍLHZœ™XYT›ÙXÝËœ›ÙXÝÙ^I‰š\OOOHœ™XYHÑK™š[\ŠO˜™›ØÓ›Ü›J›˜[YJOOOX™›ØÓ›Ü›J›˜[YJJN–×KÏQK™š[™
O”šÙ^OOOJœ™XYT›ÙXÝËœ›ÙXÝÙ^_ˆŠJKX™Y[TXÚØYÙSX™[ÕŒŽN
ÊK™Y[Q^XÝ›ÙXÝŒÍLX™Y[Q^XÝ›ÙXÝÕŒÍL‹›[™ÝOOLOØ™Y[Q^XÝ›ÙXÝÕŒÍL–ÌN›[ÔË\ÙQY™™XÝ


OOžÚYŠX™Y[Q^XÝ›ÙXÝŒÍLŠ\™]\›ŽØÛÛœÝX™Y[TXÚØYÙSX™[ÕŒŽN
™Y[Q^XÝ›ÙXÝŒÍLŠNÙÊÏOŠË‹‹˜ËÙXÝ[Û’Y˜™Y[Q^XÝ›ÙXÝŒÍL‹œÙXÝ[Û’YËœÙXÝ[Û’Y^Û›Û^PØ]YÛÜžRY˜™Y[Q^XÝ›ÙXÝŒÍL‹^Û›Û^PØ]YÛÜžRYË^Û›Û^PØ]YÛÜžRYÝX˜Ø]YÛÜžRY˜™Y[Q^XÝ›ÙXÝŒÍL‹œÝX˜Ø]YÛÜžRYËœÝX˜Ø]YÛÜžRY™XYT›ÙXÝžÛ›ÛY[˜Û]\™R][RY˜™Y[Q^XÝ›ÙXÝŒÍL‹šY™Y[Q^XÝ›ÙXÝŒÍL‹šÙ^K›ÙXÝÙ^N˜™Y[Q^XÝ›ÙXÝŒÍL‹šÙ^KXÚØYÙSX™[”›[™ÝOOLOÔÌN›ÚYXÚØYÙ\Ô\”Ø[NŒ__JJK™Ù]Y[T›ÙXÝ]Y\žUŒÍL
™Y[Q^XÝ›ÙXÝŒÍL‹›˜[Y_ˆŠ_KØ™Y[Q^XÝ›ÙXÝŒÍLËšÙ^WJNØÛÛœÝOZœ™XYT›ÙXÝËœXÚØYÙSX™[
›[™ÝOOLOÕÌNˆˆŠKÏZ\OOOHœ™XYH‰‰—ÏØ™Y[TÚ^™Qœ›ÛTXÚØYÙUŒŽN
KÊN˜™Y[TÝXÝ\™YÚ^™UŒŽN
œØ[T]X[]R[œ]œØ[U[š]
KÏZ\OOOHœÙ\šXÙHŸ
\OOOHœ™XYHÐ›ÛÛX[ŠÉ‰šÊN›ÛÛX[ŠÊJKOJ
OOžÚYŠZ›˜[YKš[J
_ZœÙXÝ[Û’YZ^Û›Û^PØ]YÛÜžRY
^ÚŠ´$´bô,t-t`4.4`´-H4`4,4-ô-4-t.È4.4.´,4`´-t,ô/´`4.4cˆŠNÜ™]\›ŸZYŠSÊ^ÚŠ\OOOHœ™XYH‰‰ˆWÏÈ´$´bô,t-t`4.4`´-H4`´/´,´,4`4.4-È4/t/´/4-t/t.´.ô,4`´`ô`4bÈ4.4.ô.4`t/´-ô-4,4.t`´-H4-t,ô/ˆ4-ô-4-t`tcˆŽš›YØXÞTÜ[Û”Ú^™OÈ´'ô`4/´,´-t`4c4`´-H4/ô`4-t-´/t-t-H4-ô/t,4aô-t/t.4-H4.4,´bô,t-t`4.4`´-H4.´/´.ô.4aô-t`t`´,´/ˆ4`H4-t-4.4/t.4a´-t.KˆŽš\OOOHœ™XYH‰‰—É‰•›[™ÝŒOÈ´$´bô,t-t`4.4`´-H4a4,4`t/´,´.´`È4/ô`4/´-4,4-´.ˆŽˆ´&´/´.ô.4aô-t`t`´,´/ˆ4/ô`4/´-4,4-´.4-4/´.ô-´/t/ˆ4,tbô`´c4,t/´.ôc4b4-H4/t`ô.ôcËˆŠNÜ™]\›ŸXÛÛœÝ]K™š[™
ÏO˜ËšYOOZ™Ü›Ý\Y
KÏY™š[™
OO’KšYOOZœÝX™Ü›Ý\Y	‰’K™Ü›Ý\YOOZ™Ü›Ý\Y
KÜØ[T]X[]R[œ]’KØ[U[š]”‹YØXÞTÜ[Û”Ú^™N•ËÜ[Û”Ú^™N’‹‹‹’ßOZOZ\OOOHœÙ\šXÙHÝ›ÚYšËZ\OOOHœ™XYH‰‰—ÏÞÛ›ÛY[˜Û]\™R][RY—ËšYË››ÛY[˜Û]\™R][RYËšÙ^K›ÙXÝÙ^N—ËšÙ^_Ëœ›ÙXÝÙ^KXÚØYÙSX™[_›ÚYXÚØYÙ\Ô\”Ø[NŒ_N›ÚYÜÊË‹‹’ËÝ\œ™[˜ÞN˜™XØÛÝ[[™ÐÝ\œ™[˜ÞUŒÊ™Y[U™[YPÝ\œ™[˜ÞJ_”•Pˆ‹Ü›Ý\Yš™Ü›Ý\YÝX™Ü›Ý\Y˜ÏËšYˆ‹\\Y[”Ë›YØXÞQ\\Y[›Ý\ˆ‹Ø]YÛÜžN˜ÏË›˜[Y_´$t-t-È4/ô/´-4`4,4-ô-4-t.ô,‹˜[YNš›˜[YKš[J
KØ[TšXÙN“X]›X^
™Ø][X™\ŠœØ[TšXÙJJK[›™YØ[\Î“X]›X^
™Ø][X™\Šœ[›™YØ[\ÊJKØ[TÚ^™N”K™XYT›ÙXÝ’YØXÞTÜ[Û”Ú^™N›ÚYÜ[Û”Ú^™N›ÚY\]Y]›™]È]J
KÒTÓÔÝš[™Ê
KÜ™X]Y]š˜Ü™X]Y]™]È]J
KÒTÓÔÝš[™Ê
_JKJ
_NÜ™]\›ˆKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]X˜XÚÙ›Ü™[Y[K\ÜÚ][Û‹X˜XÚÙ›Ü]‹ÛÛXÚÎ”O”\™Ù]OOT˜Ý\œ™[\™Ù]	‰˜J
KÚ[™[ŽšKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]™[Y[K\ÜÚ][Û‹YY]Ü‹]‹Ú[™[Ž–ÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]Z[™HŸJKKšœÞÊšXY\ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]ZXY‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
šˆ‹ØÚ[™[Ž™OÈ´(4-t-4,4.´`´.4`4/´,´,4`´c4/ô/´-ô.4a´.4cˆŽˆ´'t/´,´,4cÈ4/ô/´-ô.4a´.4cÈŸJKKšœÞ
œ‹ØÚ[™[Žˆ´(t/t,4aô,4.ô,4`ô.´,4-´.4`´-K4aô`´/ˆ4/ô`4/´-4,4dt`´`tcËˆ4$ô/´`´/´,´bô.H4`´/´,´,4`4`t,´cô-ôbô,´,4-t`´`tcÈ4`t/ˆ4`t.´.ô,4-4/´/4,t.ôc´-4/ˆ4.4.ô.4/t,4/ô.4`´/´.ˆ8 %4`H4`´-tat.´,4`4`´/´.KˆŸJW_JKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙËXÛÜÙH‹ÛÛXÚÎ˜KÚ[™[Žˆ°åÈŸJW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËY›Ü›H‹Ú[™[Ž–ÚKšœÞ
™Ø]šY[ÛX™[ˆ´'t,4-ô,´,4/t.4-H‹Ú[™[ŽšKšœÞ
š[œ]‹Ý˜[YNš›˜[YKÛÚ[™ÙN”OŠ›˜[YH‹\™Ù]˜[YJKXÙZÛ\Žˆ´'t,4/ô`4.4/4-t`4$´.4`t.´.t.´/´.ô,ŸJ_JK™Y[U^ØY[™ÕŒÍLÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™[Y[K]^[ØY[™Ë]ŒÍL‹Ú[™[Žˆ´%ô,4,ô`4`ô-´,4-t/4`4,4-ô-4-t.ôbÈ4/4-t/tc¸ )ˆŸJNšKšœÞ
™^Û›Û^TÙ[XÝÜœÕŒÌÍ‹Ý^Û›Û^N˜™Y[U^Û›Û^K˜[YNšÛÚ[™ÙN˜™Y[TÙ]^Û›Û^UŒÍLÛÜ™X]N˜™Ü™X]SY[U^Û›Û^_JKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË\ÝXÝ\™K[[šÈ‹ÛÛXÚÎŠ
OOžØJ
KËŠ
_KÚ[™[Žˆ´(ô/ô`4,4,´.ô-t/t.4-H4/´,tbt-t.H4`t`´`4`ô.´`´`ô`4/´.H8¡¤ˆŸJKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËYÜšY‹Ú[™[Ž–ÚKšœÞ
™Ø]šY[ÛX™[ˆ´)´-t/t,4/ô`4/´-4,4-´.‹Ú[™[ŽšKšœÞ
š[œ]‹Ý\Nˆ›[X™\ˆ‹Ý\ˆŒŒH‹[œ][ÙNˆ™XÚ[X[‹˜[YNšœØ[TšXÙKÛÚ[™ÙN”OŠœØ[TšXÙH‹\™Ù]˜[YJ_J_JKKšœÞ
™™[YPÝ\œ™[˜ÞSØÚÙYŒÌ‹ØÝ\œ™[˜ÞN˜™Y[U™[YPÝ\œ™[˜Þ_JW_JKKšœÞ
™Ø]šY[ÛX™[ˆ´)ô`´/ˆ4/ô`4/´-4,4dt`´`tcÈ‹Ú[™[ŽšKšœÞÊœÙ[XÝ‹Ý˜[YNš\KÛÚ[™ÙN”OžØÛÛœÝÏT\™Ù]˜[YNÙÊOOŠË‹‹’K\N˜Ë™XYT›ÙXÝ˜ÏOOHœ™XYHÒKœ™XYT›ÙXÝ›ÚYJJKŠˆŠ_KÚ[™[Ž–ÚKšœÞ
›Ü[Ûˆ‹Ý˜[YNˆ˜ÛÛ\ÜÚ]H‹Ú[™[Žˆ´$t.ôc´-4/ˆ4.4.ô.4/t,4/ô.4`´/´.ˆ0­È4,ô/´`´/´,´.4`´`tcÈ4/ô/ˆ4`´-tat.´,4`4`´-HŸJKKšœÞ
›Ü[Ûˆ‹Ý˜[YNˆœ™XYH‹Ú[™[Žˆ´$ô/´`´/´,´bô.H4`´/´,´,4`0­È4/ô`4/´-4,4dt`´`tcÈ4,t-t-È4/ô`4.4,ô/´`´/´,´.ô-t/t.4cÈŸJKKšœÞ
›Ü[Ûˆ‹Ý˜[YNˆœÙ\šXÙH‹Ú[™[Žˆ´(ô`t.ô`ô,ô,0­È4,t-t-È4`t.´.ô,4-4,4.4`´-tat.´,4`4`´bÈŸJW_J_JKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ˜™[Y[K]\K[›ÝK]ŒÍLÈ‹Ú[™[Žš\OOOHœ™XYHÈ´'´,tcô-ô,4`´-t.ôc4/t,4cÈ4`t,´cô-ôcˆ4/´-4/t,4/ô`4/´-4,4-´,4`t/ô.4b4-t`ˆ4,´bô,t`4,4/t/t`ôcˆ4`t.´.ô,4-4`t.´`ôcˆ4`ô/ô,4.´/´,´.´`ËˆŽš\OOOH˜ÛÛ\ÜÚ]HÈ´'ô/´`t.ô-H4`t/´at`4,4/t-t/t.4cÈ4`t`4,4-ô`È4/´`´.´`4/´-t`´`tcÈ4`´-tat.´,4`4`´,4ct`´/´.H4/ô/´-ô.4a´.4.ˆŽˆ´(ô`t.ô`ô,ô,4/t-H4`t/´-ô-4,4dt`ˆ4-4,´.4-´-t/t.4cÈ4/ô/ˆ4`t.´.ô,4-4`ËˆŸJK\OOOHœ™XYH‰‰šKšœÞ
™Ø]šY[ÛX™[ˆ´'t/´/4-t/t.´.ô,4`´`ô`4,‹Ú[™[ŽšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™[Y[K[›ÛY[˜Û]\™K\XÚÙ\‹]ŒÍL‹Ú[™[Ž–ÚKšœÞ
š[œ]‹Ý\NˆœÙX\˜Ú‹˜[YN˜™Y[T›ÙXÝ]Y\žUŒÍLÛÚ[™ÙN”O˜™Ù]Y[T›ÙXÝ]Y\žUŒÍL
\™Ù]˜[YJKXÙZÛ\Žˆ´'t,4.t`´.4`´/´,´,4`4/t,4/ô`4.4/4-t`4(t/ô`4,4.t`ˆ‹˜\šXK[X™[Žˆ´'ô/´.4`t.ˆ4,ˆ4/t/´/4-t/t.´.ô,4`´`ô`4-HŸJKKšœÞÊœÙ[XÝ‹Ý˜[YNšœ™XYT›ÙXÝËœ›ÙXÝÙ^_ˆ‹ÛÚ[™ÙN”OžØÛÛœÝÏQK™š[™
OO’KšÙ^OOOT\™Ù]˜[YJKOX™Y[TXÚØYÙSX™[ÕŒŽN
ÊNÙÊOŠË‹‹”‹™XYT›ÙXÝ”\™Ù]˜[YOÞÛ›ÛY[˜Û]\™R][RY˜ÏËšYÏË››ÛY[˜Û]\™R][RYÏËšÙ^K›ÙXÝÙ^N”\™Ù]˜[YKXÚØYÙSX™[’K›[™ÝOOLOÒVÌN›ÚYXÚØYÙ\Ô\”Ø[NŒ_N›ÚYJJKŠˆŠ_KÚ[™[Ž–ÚKšœÞ
›Ü[Ûˆ‹Ý˜[YNˆˆ‹Ú[™[Žˆ´'t-H4/t,4.t-4-t/t/ˆÈ4/t-H4`t,´cô-ô,4/t/ˆŸJK‹‹˜™Y[Uš\ÚX›T›ÙXÝÕŒÍL›X\
OšKšœÞÊ›Ü[Ûˆ‹Ý˜[YN”šÙ^KÚ[™[Ž–Ô›˜[YKœXÚØYÙTÚ^™OÈˆ0­ÈŠÔœXÚØYÙTÚ^™Nˆˆ—_KšÙ^JJW_JKWÉ‰šKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™[Y[KXÜ™X]K[›ÛY[˜Û]\™K]ŒÍL‹ÛÛXÚÎŠ
OO˜™Ù]Y[T]ZXÚÓÜ[•ŒÍL
L
KÚ[™[ŽˆŠÈ4(t/´-ô-4,4`´c0ªÈŠÊ›˜[YKš[J
_´/t/´,´`ôcˆ4/ô/´-ô.4a´.4cˆŠJÈ°®È4,ˆ4/t/´/4-t/t.´.ô,4`´`ô`4-HŸJKKšœÞ
œÛX[‹ØÚ[™[Ž—ÏÈ´(t,´cô-ô,4/t/ˆ4`H4/t/´/4-t/t.´.ô,4`´`ô`4/´.NˆŠ×Ë›˜[YNˆ´%t`t.ô.4`´/´,´,4`4,4-tbtdH4/t-t`‹4`t/´-ô-4,4.t`´-H4-t,ô/ˆ4/´-4.4/H4`4,4-È8 %4`t,´cô-ôc4`t/´at`4,4/t.4`´`tcÈ4,4,´`´/´/4,4`´.4aô-t`t.´.ˆŸJW_J_JK\OOOHœ™XYH‰‰—É‰•›[™ÝŒI‰šKšœÞ
™Ø]šY[ÛX™[ˆ´(ô/ô,4.´/´,´.´,4/ô`4/´-4,4-´.‹Ú[™[ŽšKšœÞÊœÙ[XÝ‹Ý˜[YNKÛÚ[™ÙN”OžØÛÛœÝÏT\™Ù]˜[YNÙÊOOŠË‹‹’K™XYT›ÙXÝžË‹‹’Kœ™XYT›ÙXÝXÚØYÙSX™[˜ß_JJKŠˆŠ_KÚ[™[Ž–ÚKšœÞ
›Ü[Ûˆ‹Ý˜[YNˆˆ‹Ú[™[Žˆ´$´bô,t-t`4.4`´-H4a4,4`t/´,´.´`ÈŸJK‹‹•›X\
OšKšœÞ
›Ü[Ûˆ‹Ý˜[YN”Ú[™[Ž”K
JW_J_JK\OOOHœ™XYH‰‰—ÏÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™[Y[K\™XYK\Ý[[X\žK]ŒŽN‹Ú[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Žˆ´'ô/´`4a´.4cÈÈ4/´,tb´dt/ŸJKKšœÞ
œÜ[ˆ‹ØÚ[™[ŽšÏÈŒH4`ô/Ëˆ0­ÈŠØ™Y[TØ[TÚ^™U^ŒŽN
ÊNˆ´$´bô,t-t`4.4`´-H4/ô/´-4`´,´-t`4-´-4dt/t/t`ôcˆ4a4,4`t/´,´.´`ÈŸJKKšœÞ
œÛX[‹ØÚ[™[Žˆ´'´-4/t,4/ô`4/´-4,4-´,4`t/ô.4b4-t`ˆ4/´-4/t`È4`t,´cô-ô,4/t/t`ôcˆ4`t.´.ô,4-4`t.´`ôcˆ4`ô/ô,4.´/´,´.´`ËˆŸJW_JNšKšœÞ
™Y[TØ[TÚ^™PÛÛ›ÛŒŽNÚ][NšÛÚ[™ÙN”OžÙÊÏOŠË‹‹˜Ë‹‹”JJKŠˆŠ_K[š]Ü[ÛœÎ˜™Y[U[š]Ü[ÛœßJK\HOOHœÙ\šXÙH‰‰šKšœÞ
™Ø]šY[ÛX™[ˆ´'ô.ô,4/H4/ô`4/´-4,4-ˆ4/t,ŠÝ
Èˆ4-4/t-t.H‹Ú[™[ŽšKšœÞ
š[œ]‹Ý\Nˆ›[X™\ˆ‹Ý\ˆŒH‹Z[ŽˆŒ‹[œ][ÙNˆ›[Y\šXÈ‹˜[YNšœ[›™YØ[\ËÛÚ[™ÙN”OŠœ[›™YØ[\È‹\™Ù]˜[YJKXÙZÛ\Žˆ´(t.´/´.ôc4.´/ˆ4/ô/´`4a´.4.H4/´-´.4-4,4-t`´`tcÈŸJ_JKKšœÞ
™Ø]šY[ÛX™[ˆ´(t`´,4`´`ô`H‹Ú[™[ŽšKšœÞÊœÙ[XÝ‹Ý˜[YNš˜XÝ]™OOOHLOÈ˜\˜Ú]™YŽˆ˜XÝ]™H‹ÛÚ[™ÙN”OŠ˜XÝ]™H‹\™Ù]˜[YOOOH˜XÝ]™HŠKÚ[™[Ž–ÚKšœÞ
›Ü[Ûˆ‹Ý˜[YNˆ˜XÝ]™H‹Ú[™[Žˆ´$4.´`´.4,´/t,ŸJKKšœÞ
›Ü[Ûˆ‹Ý˜[YNˆ˜\˜Ú]™Y‹Ú[™[Žˆ´$ˆ4,4`4at.4,´-HŸJW_J_JK™Y[T]ZXÚÓÜ[•ŒÍL	‰šKšœÞ
™›ÛY[˜Û]\™T]ZXÚÐÜ™X]UŒÌÍ‹Ú[š]X[˜[YNš›˜[YK™Yš[žÛ˜[YNš›˜[YK[š]šœØ[U[š]XÚØYÙTÚ^™NšœØ[T]X[]R[œ]ÔÝš[™ÊœØ[T]X[]R[œ]
JÈˆŠÚœØ[U[š]ˆˆ‹ÙXÝ[Û’YšœÙXÝ[Û’Y^Û›Û^PØ]YÛÜžRYš^Û›Û^PØ]YÛÜžRYÝX˜Ø]YÛÜžRYšœÝX˜Ø]YÛÜžRYKÛÛ^ˆ›Y[H‹ÛÛÜÙNŠ
OO˜™Ù]Y[T]ZXÚÓÜ[•ŒÍL
LJKÛÜ™X]YŠË™Y[P\ÜÛÜY[ŒÍLŠOOžØÛÛœÝO^Ë‹‹˜Ë‹‹”Ù^N”šÙ^_œ›ÙXÝÙ^K›ÙXÝÙ^N”œ›ÙXÝÙ^_šÙ^_NØ™Y[SÛ“›ÛY[˜Û]\™PÜ™X]YŒÍLËŠ™Y[P\ÜÛÜY[ŒÍL‹JNØ™Ù]Y[PÜ™X]Y›ÙXÝŒÍL
JNØÛÛœÝX™Y[TXÚØYÙSX™[ÕŒŽN
JNÙÊÏOŠË‹‹•Ë\Nˆœ™XYH‹ÙXÝ[Û’Y’KœÙXÝ[Û’YËœÙXÝ[Û’Y^Û›Û^PØ]YÛÜžRY’K^Û›Û^PØ]YÛÜžRYË^Û›Û^PØ]YÛÜžRYÝX˜Ø]YÛÜžRY’KœÝX˜Ø]YÛÜžRYËœÝX˜Ø]YÛÜžRY™XYT›ÙXÝžÛ›ÛY[˜Û]\™R][RY’KšYKšÙ^K›ÙXÝÙ^N’KšÙ^KXÚØYÙSX™[”‹›[™ÝOOLOÔ–ÌN›ÚYXÚØYÙ\Ô\”Ø[NŒ__JJK™Ù]Y[T›ÙXÝ]Y\žUŒÍL
K›˜[Y_ˆŠK™Ù]Y[T]ZXÚÓÜ[•ŒÍL
LJKŠˆŠ__JKI‰šKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÝXÝ\™KY\œ›Üˆ‹›ÛNˆ˜[\‹Ú[™[Žž_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]XXÝ[ÛœÈ‹Ú[™[Ž–ÚKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË\ÙXÛÛ™\žH‹ÛÛXÚÎ˜KÚ[™[Žˆ´'´`´/4-t/t,ŸJKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË\š[X\žH‹\ØX›YˆZ›˜[YKš[J
_ZœÙXÝ[Û’YZ^Û›Û^PØ]YÛÜžRYSËÛÛXÚÎ“KÚ[™[Žˆ´(t/´at`4,4/t.4`´c4/ô/´-ô.4a´.4cˆŸJW_JW_JW_J_J_B™[˜Ý[Ûˆ™Ø]ÝXÝ\™SX[˜YÙ\ŠÜÝ]N™KÛÛÜÙNÛ”Ø]™N›ŸJ^ØÛÛœÝÜ‹WOTË\ÙTÝ]J

OO˜™Ø]Ý]JJJKÜËOTË\ÙTÝ]JˆŠKÝKOTË\ÙTÝ]JßJKÙ‹WOTË\ÙTÝ]JˆŠKÚ×OTË\ÙTÝ]JLJKÞK—OTË\ÙTÝ]JßJKÝ‹—OTË\ÙTÝ]JßJKROOœ‹›Y[R][\Ë™š[\ŠO”‹™Ü›Ý\YOORJK›[™ÝOROOœ‹›Y[R][\Ë™š[\ŠO”‹œÝX™Ü›Ý\YOORJK›[™ÝÏROOžØÛÛœÝRKš[J
NÚYŠTŠ\™]\›ŽØÛÛœÝÏX™Ø]›Ü›S˜[YJŠNÚYŠ‹™Ü›Ý\ËœÛÛYJO˜™Ø]›Ü›S˜[YJ‹›˜[YJOOOUÊJ^ÛJ´(4,4-ô-4-t.È4`H4`´,4.´.4/4/t,4-ô,´,4/t.4-t/4`ô-´-H4`t`ôbt-t`t`´,´`ô-t`‹ˆŠNÜ™]\›ŸXJOŠË‹‹’‹Ü›Ý\Î–Ë‹‹’‹™Ü›Ý\ËÚY˜Üž\Ëœ˜[™ÛUURQ

K˜[YN”‹YØXÞQ\\Y[ˆ›Ý\ˆ‹ÛÜÜ™\Ž’‹™Ü›Ý\Ë›[™ÝW_JJK
ˆŠKJˆŠ_KJKŠOOžØÛÛœÝÏT‹š[J
NÕÉ‰˜JOŠË‹‹’‹Ü›Ý\Î’‹™Ü›Ý\Ë›X\
ÏO’ËšYOOROÞË‹‹’Ë˜[YN•ßN’Ê_JJ_KOJKŠOOžØÛÛœÝÏT‹š[J
NÚYŠUÊ\™]\›ŽÚYŠ‹œÝX™Ü›Ý\ËœÛÛYJO’‹™Ü›Ý\YOORI‰˜™Ø]›Ü›S˜[YJ‹›˜[YJOOOX™Ø]›Ü›S˜[YJÊJJ^ÛJ´$ˆ4ct`´/´/4`4,4-ô-4-t.ô-H4`ô-´-H4-t`t`´c4/ô/´-4`4,4-ô-4-t.È0ªÈŠÕÊÈ°®ËˆŠNÜ™]\›ŸXJOŠË‹‹’‹ÝX™Ü›Ý\Î–Ë‹‹’‹œÝX™Ü›Ý\ËÚY˜Üž\Ëœ˜[™ÛUURQ

KÜ›Ý\Y’K˜[YN•ËÛÜÜ™\Ž’‹œÝX™Ü›Ý\Ë™š[\ŠÏO’Ë™Ü›Ý\YOORJK›[™ÝW_JJK
OŠË‹‹’‹ÒWNˆˆŸJJKJˆŠ_KÏJKŠOOžØÛÛœÝÏT‹š[J
NÚYŠUÊ\™]\›ŽØJOŠË‹‹’‹ÝX™Ü›Ý\Î’‹œÝX™Ü›Ý\Ë›X\
ÏO’ËšYOOROÞË‹‹’Ë˜[YN•ßN’ÊKY[R][\Î’‹›Y[R][\Ë›X\
ÏO’ËœÝX™Ü›Ý\YOOROÞË‹‹’ËØ]YÛÜžN•ßN’Ê_JJ_KÏJKŠOOžØÛÛœÝÏ\‹œÝX™Ü›Ý\Ë™š[™
O’‹šYOORJNÚYŠUßTŸË™Ü›Ý\YOOTŠ\™]\›ŽØJO˜™Ø][Ý™TÝX™Ü›Ý\Ý]J‹KŠJKŠOŠË‹‹’‹ÒWN”ŸJJKJˆŠ_KOJKŠOOžØÛÛœÝÏ\‹™Ü›Ý\Ë™š[™
O’‹šYOORJKÏ\‹™Ü›Ý\Ë™š[™
O’‹šYOOTŠNÚYŠUßRßOOOTŠ\™]\›ŽÚYŠ\[ÙˆÚ[™ÝÈOOH[™Yš[™Y‰‰ˆ]Ú[™ÝË˜ÛÛ™š\›J´'ô-t`4-t/t-t`t`´.4`4,4-ô-4-t.È0ªÈŠÕË›˜[YJÈ°®È4,ˆ0ªÈŠÒË›˜[YJÈ°®ÏÈ4$´`t-H4/ô/´-4`4,4-ô-4-t.ôbÈ4.4/ô/´-ô.4a´.4.4/ô-t`4-t.t-4`ô`ˆ4,ˆ4,´bô,t`4,4/t/tbô.H4`4,4-ô-4-t.ËˆŠJ\™]\›ŽØJO˜™Ø]Y\™ÙQÜ›Ý\Ý]J‹KŠJKŠOŠË‹‹’‹ÒWNˆˆŸJJKJˆŠ_KX\Þ[˜Ê
OOžÙÊL
NÝž^Ø]ØZ]Š™Ø]Ý]JŠJ_Yš[˜[^ÙÊLJ__NÜ™]\›ˆKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]X˜XÚÙ›Ü‹Ú[™[ŽšKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]™XØ][ÙË\ÝXÝ\™K\ÚY]‹Ú[™[Ž–ÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]Z[™HŸJKKšœÞÊšXY\ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]ZXY‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
šˆ‹ØÚ[™[Žˆ´(4,4-ô-4-t.ôbÈ4.4/ô/´-4`4,4-ô-4-t.ôbÈŸJKKšœÞ
œ‹ØÚ[™[Žˆ´%ô-4-t`tc4/4/´-´/t/ˆ4/ô-t`4-t.4/4-t/t/´,´,4`´c4.4.ô.4/ô-t`4-t/t-t`t`´.4a´-t.ôbô.H4`4,4-ô-4-t.È4.ô.4,t/ˆ4/´`´-4-t.ôc4/tbô.H4/ô/´-4`4,4-ô-4-t.ËˆŸJW_JKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙËXÛÜÙH‹ÛÛXÚÎÚ[™[Žˆ°åÈŸJW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÝXÝ\™KXY‹Ú[™[Ž–ÚKšœÞ
š[œ]‹Ý˜[YNœËÛÚ[™ÙN’OO›
K\™Ù]˜[YJKXÙZÛ\Žˆ´'t,4-ô,´,4/t.4-H4/t/´,´/´,ô/ˆ4`4,4-ô-4-t.ô,‹Û’Ù^QÝÛŽ’OO’KšÙ^OOOH‘[\ˆ‰‰—ÊÊ_JKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË\ÙXÛÛ™\žH‹\ØX›Yˆ\Ëš[J
KÛÛXÚÎŠ
OO—ÊÊKÚ[™[ŽˆŠÈ4(4,4-ô-4-t.ÈŸJW_JK‰‰šKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÝXÝ\™KY\œ›Üˆ‹›ÛNˆ˜[\‹Ú[™[Ž™ŸJKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÝXÝ\™K[\Ý‹Ú[™[Žœ‹™Ü›Ý\Ë›X\
OOšKšœÞÊ˜\XÛH‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÝXÝ\™KYÜ›Ý\‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÝXÝ\™KYÜ›Ý\ZXY‹Ú[™[Ž–ÚKšœÞ
š[œ]‹Ý˜[YN’K›˜[YKÛÚ[™ÙN”O•
KšY‹\™Ù]˜[YJK˜\šXK[X™[Žˆ´'t,4-ô,´,4/t.4-H4`4,4-ô-4-t.ô,ŸJKKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÓŠKšY
Kˆ4/ô/´-Ëˆ—_JW_JK‹™Ü›Ý\Ë›[™ÝŒI‰šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËYÜ›Ý\[[Ý™H‹Ú[™[Ž–ÚKšœÞÊ›X™[‹ØÚ[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÚ[™[Žˆ´'ô-t`4-t/t-t`t`´.4,´-t`tc4`4,4-ô-4-t.È4,ˆŸJKKšœÞÊœÙ[XÝ‹Ý˜[YN–ÒKšY_ˆ‹ÛÚ[™ÙN”O˜ŠÏOŠË‹‹•ËÒKšYN”‹\™Ù]˜[Y_JJKÚ[™[Ž–ÚKšœÞ
›Ü[Ûˆ‹Ý˜[YNˆˆ‹Ú[™[Žˆ´$´bô,t-t`4.4`´-H4`4,4-ô-4-t.ÈŸJK‹‹œ‹™Ü›Ý\Ë™š[\ŠO”‹šYOORKšY
K›X\
OšKšœÞ
›Ü[Ûˆ‹Ý˜[YN”‹šYÚ[™[Ž”‹›˜[Y_K‹šY
JW_JW_JKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË[[Ý™KX]Ûˆ‹\ØX›Yˆ]–ÒKšYKÛÛXÚÎŠ
OO“JKšY–ÒKšYJKÚ[™[Žˆ´'ô-t`4-t/t-t`t`´.4`4,4-ô-4-t.ÈŸJKKšœÞ
œÛX[‹ØÚ[™[Žˆ´'ô/´-4`4,4-ô-4-t.ôbÈ4.4/ô/´-ô.4a´.4.4/ô-t`4-t.t-4`ô`ˆ4,´/4-t`t`´-NÈ4`t/´,´/ô,4-4,4c´bt.4-H4/ô/´-4`4,4-ô-4-t.ôbÈ4/´,tb´-t-4.4/tcô`´`tcËˆŸJW_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÝXÝ\™K\ÝX›\Ý‹Ú[™[Žœ‹œÝX™Ü›Ý\Ë™š[\ŠO”‹™Ü›Ý\YOORKšY
K›X\
OžØÛÛœÝÏ^VÔ‹šYOÏÔ‹™Ü›Ý\YÏUÈOOT‹™Ü›Ý\YÜ™]\›ˆKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÝXÝ\™K\ÝXœ›ÝÈ‹Ú[™[Ž–ÚKšœÞ
š[œ]‹Ý˜[YN”‹›˜[YKÛÚ[™ÙN’OšÊ‹šY‹\™Ù]˜[YJK˜\šXK[X™[Žˆ´'t,4-ô,´,4/t.4-H4/ô/´-4`4,4-ô-4-t.ô,ŸJKKšœÞÊ›X™[‹ØÚ[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÚ[™[Žˆ´'ô-t`4-t/t-t`t`´.4/ô/´-4`4,4-ô-4-t.È4,ˆŸJKKšœÞ
œÙ[XÝ‹Ý˜[YN•ËÛÚ[™ÙN’OšŠOŠË‹‹”Ô‹šYN’‹\™Ù]˜[Y_JJKÚ[™[Žœ‹™Ü›Ý\Ë›X\
OšKšœÞ
›Ü[Ûˆ‹Ý˜[YN’‹šYÚ[™[Ž’‹›˜[Y_K‹šY
J_JW_JKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË[[Ý™KX]Ûˆ‹\ØX›YˆRËÛÛXÚÎŠ
OO“Ê‹šYÊKÚ[™[Žˆ´'ô-t`4-t/t-t`t`´.ŸJKKšœÞÊœÛX[‹ØÚ[™[Ž–ÑJ‹šY
Kˆ4/ô/´-ô.4a´.4.H—_JW_K‹šY
_J_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÝXÝ\™K[™]Ë\ÝXˆ‹Ú[™[Ž–ÚKšœÞ
š[œ]‹Ý˜[YNVÒKšY_ˆ‹ÛÚ[™ÙN”O™
ÏOŠË‹‹•ËÒKšYN”‹\™Ù]˜[Y_JJKXÙZÛ\Žˆ´'t/´,´bô.H4/ô/´-4`4,4-ô-4-t.È‹Û’Ù^QÝÛŽ”O”‹šÙ^OOOH‘[\ˆ‰‰JKšYVÒKšY_ˆŠ_JKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË\ÙXÛÛ™\žH‹\ØX›YˆJVÒKšY_ˆŠKš[J
KÛÛXÚÎŠ
OOJKšYVÒKšY_ˆŠKÚ[™[ŽˆŠÈ4'ô/´-4`4,4-ô-4-t.ÈŸJW_JW_KKšY
J_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\™]šY]Ë[›ÝHÛÛÙ‹Ú[™[Žˆ´'ô-t`4-t/t/´`H4`t/´at`4,4/tcô-t`ˆ4/ô/´-ô.4a´.4.4a´-t/tbË4/ô.ô,4/tbÈ4/ô`4/´-4,4-ˆ4.4`´-tat.´,4`4`´bËˆ4&4-ô/4-t/t-t/t.4cÈ4/ô`4.4/4-t/tcô`´`tcÈ4/ô/´`t.ô-H4/t,4-´,4`´.4cÈ0ªô(t/´at`4,4/t.4`´c4`t`´`4`ô.´`´`ô`4`ð®ËˆŸJKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]XXÝ[ÛœÈ‹Ú[™[Ž–ÚKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË\ÙXÛÛ™\žH‹ÛÛXÚÎÚ[™[Žˆ´'´`´/4-t/t,ŸJKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË\š[X\žH‹\ØX›YšÛÛXÚÎ‘Ú[™[ŽšÈ´(t/´at`4,4/tcôc¸ )ˆŽˆ´(t/´at`4,4/t.4`´c4`t`´`4`ô.´`´`ô`4`ÈŸJW_JW_J_J_B™[˜Ý[Ûˆ™Ø]X]ÚÚÙ[œÕŒN
J^Ü™]\›–Ë‹‹›™]ÈÙ]
™›ØÓ›Ü›JÝš[™Ê_ˆŠJKœÜ]
ˆŠK™š[\ŠO›[™ÝŒJJW_B™[˜Ý[Ûˆ™Ø]X]Ú[š]ŒN
J^Ü™]\›ˆOOOH›[È´/4.ÈŽ™OOOH™ÈÈ´,ÈŽ™OOOHœÜÈÈ´b4`‹ˆŽ”Ýš[™Ê_´-t-ˆŠ_B™[˜Ý[Ûˆ™Ø]˜[šÔ›ÙXÝÕŒN
KHˆŠ^ØÛÛœÝX™Ø]X]ÚÚÙ[œÕŒN
ŸK›˜[YJKOX™Ø]Ð˜\ÙJKœ]X[]KK[š]
K[š]Ï[™]ÈX\
™Ø]\œ˜^JK›X]ÚÝYÙÙ\Ý[ÛœÊK›X\

K
OO–ÝKœ›ÙXÝÙ^KLŒYJJK]›X\
OOžØÛÛœÝX™Ø]X]ÚÚÙ[œÕŒN
K›˜[YJK\‹™š[\ŠOO™š[˜ÛY\ÊJJK›[™Ý\‹›[™ÝÙ‹Ü‹›[™ÝŒÏ]K[š]	‰˜HOOH[šÛ›ÝÛˆ‰‰K[š]OOXOËLNK[š]OOXOÌLŽŒÜ™]\›žË‹‹KX]Ú˜[šÎŠË™Ù]
KšÙ^J_
JÓX]œ›Ý[™

Ì
JÙß_JNÜ™]\›ˆœÛÜ

K
OO™›X]Ú˜[šË]K›X]Ú˜[šßÝš[™ÊK›˜[YJK›ØØ[PÛÛ\\™JÝš[™Ê›˜[YJKœHŠJ_B˜ÛÛœÝ™XÚØ\™ÛÛœÚ\Ý[˜ÞUŒŽNOH˜™]XÚXØ\™XÛÛœÚ\Ý[˜ÞK]ŒŽNHŽÂ‹Êˆ™]XÚXØ\™XØ][ÙË\XÚÙ\‹]ŒÍŽÛÛ\]Xš[]HX\šÙ\ˆ
‹Â‹Êˆ™]XÚXØ\™\ÙX\˜Ú]^]ŒÍÍH
‹Â™[˜Ý[Ûˆ™XÚÙX\˜Ú›Ü›UŒÍÍJ˜[YJ^Ü™]\›ˆÝš[™Ê˜[Y_ˆŠKÓØØ[SÝÙ\Ø\ÙJœKT•HŠKœ™\XÙJôdKÙË´-HŠKœ™\XÙJÊ
VË—J
KÙË‰K‰ˆŠKœ™\XÙJÊŸ×˜K^´,tcÌNWJJÎ´/4.4.ô.ô.4.ô.4`´`
Î´,4/´,ŠOß4/4.ß[
JÏI×˜K^´,tcÌNWJKÙÚK‰H[ŠKœ™\XÙJÊŸ×˜K^´,tcÌNWJJÎ´.ô.4`´`
Î´,4/´,ŠOß4.ß
JÏI×˜K^´,tcÌNWJKÙÚK‰HŠKœ™\XÙJÊŸ×˜K^´,tcÌNWJJÎ´.´.4.ô/´,ô`4,4/4/
Î´,4/´,ŠOß4.´,ßÙÊJÏI×˜K^´,tcÌNWJKÙÚK‰HÙÈŠKœ™\XÙJÊŸ×˜K^´,tcÌNWJJÎ´,ô`4,4/4/
Î´,4/´,ŠOß4,ô`4,ßÊJÏI×˜K^´,tcÌNWJKÙÚK‰HÈŠKœ™\XÙJÊŸ×˜K^´,tcÌNWJJÎ´b4`´`ô.ŠÎ´,4.
Oß4b4`ŸÜÏÊJÏI×˜K^´,tcÌNWJKÙÚK‰HÜÈŠKœ™\XÙJÖ×˜K^´,tcÌNK—JËÙÚKˆŠKœ™\XÙJ×ÊËÙËˆŠKš[J
_B™[˜Ý[Ûˆ™XÚ^Û›Û^T]ŒÍÍJ][K™YJ^ØÛÛœÝÙXÝ[Û]™YKœÙXÝ[ÛœË™š[™
[žOO™[žKšYOOZ][KœÙXÝ[Û’Y
KØ]YÛÜžO]™YK˜Ø]YÛÜšY\Ë™š[™
[žOO™[žKšYOOJ][K^Û›Û^PØ]YÛÜžRY][K˜Ø]YÛÜžRY
JKÝX˜Ø]YÛÜžO]™YKœÝX˜Ø]YÛÜšY\Ë™š[™
[žOO™[žKšYOOZ][KœÝX˜Ø]YÛÜžRY
NÜ™]\›žÜÙXÝ[Û‹Ø]YÛÜžKÝX˜Ø]YÛÜžKX™[–ÜÙXÝ[ÛË›˜[YKØ]YÛÜžOË›˜[YKÝX˜Ø]YÛÜžOË›˜[YWK™š[\Š›ÛÛX[ŠKš›Ú[Šˆ8¡¤ˆŠ_´$t-t-È4`4,4-ô-4-t.ô,Ÿ_B™[˜Ý[Ûˆ™XÚ›ÙXÝØÝ[Y[ŒÍÍJ][K™YJ^ØÛÛœÝ]X™XÚ^Û›Û^T]ŒÍÍJ][K™YJNÜ™]\›ˆ™XÚÙX\˜Ú›Ü›UŒÍÍJÚ][K›˜[YK][Kœ›ÙXÝ˜[YK][K˜Ø[›ÛšXØ[˜[YK][KœXÚØYÙTÚ^™K][K[š]][K˜˜\ÙU[š]][KœÝ\Y\“˜[YK™Ø]\œ˜^J][KœÝ\Y\“˜[Y\ÊKš›Ú[ŠˆŠK™Ø]\œ˜^J][KœÝ\Y\[X\Ù\ÊKš›Ú[ŠˆŠK]›X™[Kš›Ú[ŠˆŠJ_B™[˜Ý[Ûˆ™XÚÛÛ\]T›ÙXÝÕŒÍÍJ[œ]
^ØÛÛœÝ™XÛÜ™X™Ø\™ZÝ\ÙT™XÛÜ™
Š˜™Ø\ÜÛÜY[ÝŒHŠJKÛÛ\]OX™Ø]X]Ú[™Ô›ÙXÝÕŒN
™XÛÜ™×JKžRÙ^O[™]ÈX\Ù›ÜŠÛÛœÝ][HÙˆË‹‹˜ÛÛ\]K‹‹˜™Ø]\œ˜^J[œ]
WJ^ØÛÛœÝÙ^OTÝš[™Ê][OËšÙ^_][OËœ›ÙXÝÙ^_ˆŠKš[J
NÚYŠZÙ^JXÛÛ[YNØÛÛœÝÝ\œ™[XžRÙ^K™Ù]
Ù^J_ßNØžRÙ^KœÙ]
Ù^KË‹‹˜Ý\œ™[‹‹š][KÙ^K˜[YNš][K›˜[Y_][Kœ›ÙXÝ˜[Y_Ý\œ™[›˜[Y_J_\™]\›–Ë‹‹˜žRÙ^K˜[Y\Ê
WK™š[\Š][OOš][I‰š][K›˜[YI‰š][K˜XÝ]™HOOHLI‰š][KœÝ]\ÈOOH˜\˜Ú]™Y‰‰š][K˜\˜Ú]™YOOHL	‰š][KšÚ[™OOHœÙ\šXÙH‰‰š][K\HOOHœÙ\šXÙHŠKœÛÜ

YšYÚ
OO”Ýš[™ÊY›˜[Y_ˆŠK›ØØ[PÛÛ\\™JÝš[™ÊšYÚ›˜[Y_ˆŠKœH‹ÜÙ[œÚ]]š]Nˆ˜˜\ÙH‹[Y\šXÎˆLJJ_B™[˜Ý[Ûˆ™Ø][™Ü™YY[X]ÚŒÍÍJÚ[™Ü™YY[™K›ÙXÝÎÛÚÛÜÙN›‹ÚÝÐ[œ‹Û”ÚÝÐ[˜K]Y\žNœËÛ”]Y\žN›ÛÛ™\œÚ[Û•˜[YNKÛÛÛ™\œÚ[ÛÚ[™ÙN™ÛÛÛ™š\›PÛÛ™\œÚ[ÛŽ™ŸJ^ØÛÛœÝOX™Ø]\œ˜^JK›X]ÚÝYÙÙ\Ý[ÛœÊKœÛXÙJÊKYKœ\˜Ú\ÙT›ÙXÝÙ^KÏ]™š[™
O‹šÙ^OOOZ
KOYK›X]ÚY˜[Y_ÏË›˜[Y_K™š[™
O‹œ›ÙXÝÙ^OOOZ
OË›˜[Y_K˜Ø[›ÛšXØ[˜[YKYK›[šÔÝ]\ÏOOH˜]]×Û[šÙYŸK›[šÔÛÝ\˜ÙOOOHœÙ[X[X×ÛX]Ú‹YKœ™\ÛÛ][Û”Ý]\ÏOOH›[šÙYÝ[š]Ü™]šY]ÈŸK›[šÔÝ]\ÏOOH›[šÙYÝ[š]Ü™]šY]È‹YKœ™\ÛÛ][Û”Ý]\ÏOOH›[šÙYÜXÚØYÚ[™×Ü™]šY]ÈŸK›[šÔÝ]\ÏOOH›[šÙYÜXÚØYÚ[™×Ü™]šY]È‹]Ÿ‹OX™Ø]\œ˜^JK[š]XÚØYÙSÜ[ÛœÊKÜÙXÝ[Û’YÙ]ÙXÝ[Û’YOTË\ÙTÝ]JˆŠKØØ]YÛÜžRYÙ]Ø]YÛÜžRYOTË\ÙTÝ]JˆŠKÜÝX˜Ø]YÛÜžRYÙ]ÝX˜Ø]YÛÜžRYOTË\ÙTÝ]JˆŠKÙš[\œÓÜ[‹Ù]š[\œÓÜ[—OTË\ÙTÝ]JLJKØ™]ZXÚÓÜ[•ŒÌÍ‹™Ù]]ZXÚÓÜ[•ŒÌÍ—OTË\ÙTÝ]JLJNØÛÛœÝ™XÛÜ™X™Ø\™ZÝ\ÙT™XÛÜ™
Š˜™Ø\ÜÛÜY[ÝŒHŠJK™YOX™›ÛY[˜Û]\™U™YJ™XÛÜ™
K›ÙXÝÏX™XÚÛÛ\]T›ÙXÝÕŒÍÍJ
KÙXÝ[ÛœÏ]™YKœÙXÝ[ÛœË™š[\Š][OOš][KšYOOH[˜\ÜÚYÛ™Y‰‰œ›ÙXÝËœÛÛYJ›ÙXÝOœ›ÙXÝœÙXÝ[Û’YOOZ][KšY
JKØ]YÛÜšY\Ï]™YK˜Ø]YÛÜšY\Ë™š[\Š][OOš][KšYOOH[˜\ÜÚYÛ™YXØ]YÛÜžH‰‰Š\ÙXÝ[Û’Y][Kœ\™[YOO\ÙXÝ[Û’Y
I‰œ›ÙXÝËœÛÛYJ›ÙXÝOŠ›ÙXÝ^Û›Û^PØ]YÛÜžRY›ÙXÝ˜Ø]YÛÜžRY
OOOZ][KšY
JKÝX˜Ø]YÛÜšY\Ï]™YKœÝX˜Ø]YÛÜšY\Ë™š[\Š][OOš][KšYOOH[˜\ÜÚYÛ™Y\ÝX˜Ø]YÛÜžH‰‰ŠXØ]YÛÜžRY][Kœ\™[YOOXØ]YÛÜžRY
I‰œ›ÙXÝËœÛÛYJ›ÙXÝOœ›ÙXÝœÝX˜Ø]YÛÜžRYOOZ][KšY
JK›Ü›X[^™Y]Y\žOX™XÚÙX\˜Ú›Ü›UŒÍÍJÊKÚÙ[œÏ[›Ü›X[^™Y]Y\žKœÜ]
ˆŠK™š[\Š›ÛÛX[ŠKš\ÚX›O\›ÙXÝË™š[\Š][OOŠ\ÙXÝ[Û’Y][KœÙXÝ[Û’YOO\ÙXÝ[Û’Y
I‰ŠXØ]YÛÜžRY
][K^Û›Û^PØ]YÛÜžRY][K˜Ø]YÛÜžRY
OOOXØ]YÛÜžRY
I‰Š\ÝX˜Ø]YÛÜžRY][KœÝX˜Ø]YÛÜžRYOO\ÝX˜Ø]YÛÜžRY
I‰Š]ÚÙ[œË›[™ÝÚÙ[œË™]™\žJÚÙ[O˜™XÚ›ÙXÝØÝ[Y[ŒÍÍJ][K™YJKš[˜ÛY\ÊÚÙ[ŠJJJKÜ›Ý\ÏVË‹‹š\ÚX›Kœ™YXÙJ
X\][JOOžØÛÛœÝ]X™XÚ^Û›Û^T]ŒÍÍJ][K™YJKÙ^OVÜ]œÙXÝ[ÛËšY››Û™H‹]˜Ø]YÛÜžOËšY››Û™H‹]œÝX˜Ø]YÛÜžOËšY››Û™H—Kš›Ú[ŠŽˆŠNÚYŠ[X\š\ÊÙ^JJ[X\œÙ]
Ù^KÚÙ^KX™[œ]›X™[][\Î–×_JNÛX\™Ù]
Ù^JKš][\Ëœ\Ú
][JNÜ™]\›ˆX\K™]ÈX\
K˜[Y\Ê
WKœÛÜ

YšYÚ
OO›Y›X™[›ØØ[PÛÛ\\™JšYÚ›X™[œH‹ÜÙ[œÚ]]š]Nˆ˜˜\ÙH‹[Y\šXÎˆLJJKXÝ]™Qš[\ÛÝ[VÜÙXÝ[Û’YØ]YÛÜžRYÝX˜Ø]YÛÜžRYK™š[\Š›ÛÛX[ŠK›[™ÝÚÛÜÙOZ][OO›Š][KšÙ^K][JNÚYŠ	‰ˆ\Š\™]\›ˆKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™Z[™Ü™YY[[X]Ú]ŒN\Ë[[šÙYŠÊÈˆ™YYË][š]\™]šY]Ë]ŒNHŽˆˆŠKÚ[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™Z[™Ü™YY[[X]Ú[XZ[‹]ŒN‹Ú[™[Ž–ÚKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Žž_´(t,´cô-ô,4/t/tbô.H4`´/´,´,4`ŸJKKšœÞ
œÛX[‹ØÚ[™[ŽšÈ´(´/´,´,4`4/t,4.t-4-t/H4,4,´`´/´/4,4`´.4aô-t`t.´.Žˆ´(´/´,´,4`4`t,´cô-ô,4/H4/ô/´.ôc4-ô/´,´,4`´-t.ô-t/ŸJW_JKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎ˜KÚ[™[Žˆ´&4-ô/4-t/t.4`´c4`´/´,´,4`ŸJW_JK‰‰šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™Z[™Ü™YY[][š]\™]šY]Ë]ŒNH‹Ú[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Ž˜È´'t`ô-´/t/ˆ4,´bô,t`4,4`´c4a4,4`t/´,´.´`ÈŽˆ´'t`ô-´/t/ˆ4`ô`´/´aô/t.4`´c4/t/´`4/4`ÈŸJKKšœÞÊœ‹ØÚ[™[Ž–È´$ˆ4`´-tat.´,4`4`´-H4`ô.´,4-ô,4/t/ˆ‹Kœ]X[]Kˆ‹K[š]´-t-ˆ‹‹4`´/´,´,4`4`ôaô.4`´bô,´,4-t`´`tcÈ4,ˆ‹™Ø]X]Ú[š]ŒN
K›X]ÚY˜\ÙU[š]ÏË[š]
K‹ˆ—_JKK›[™ÝŒ	‰šKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™Z[™Ü™YY[\XÚØYÙK[Ü[ÛœË]ŒNH‹Ú[™[Ž‘K›X\
OšKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OO™Š˜[[Ý[[š]
KÚ[™[Ž–Ñ›X™[ˆ0­È‹˜[[Ý[ˆ‹™Ø]X]Ú[š]ŒN
[š]
W_K[š]
ÈŽˆŠÑ˜[[Ý[
J_JKQK›[™Ý	‰šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™Z[™Ü™YY[XÛÛ™\œÚ[Û‹]ŒNH‹Ú[™[Ž–ÚKšœÞ
š[œ]‹Ý\Nˆ›[X™\ˆ‹Z[ŽˆŒ‹Ý\ˆŒŒH‹[œ][ÙNˆ™XÚ[X[‹˜[YN_ˆ‹ÛÚ[™ÙN‘O™
\™Ù]˜[YJKXÙZÛ\Žˆ´$´-t`H4.4.ô.4/´,tb´dt/H4b4`‹ˆ‹˜\šXK[X™[Žˆ´$´-t`H4.4.ô.4/´,tb´dt/4/´-4/t/´.H4b4`´`ô.´.ŸJKKšœÞ
œÜ[ˆ‹ØÚ[™[Ž˜™Ø]X]Ú[š]ŒN
K›X]ÚY˜\ÙU[š]ÏË[š]
_JKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹\ØX›YˆJ™Ø][X™\ŠJOŒ
KÛÛXÚÎŠ
OO™Š™Ø][X™\ŠJKK›X]ÚY˜\ÙU[š]ÏË[š]
KÚ[™[Žˆ´'ô/´-4`´,´-t`4-4.4`´cŸJW_JKKšœÞ
œÛX[‹ØÚ[™[Ž™K[š]™\ÛÛ][Û”™X\ÛÛŸ˜\‘ØÝÜˆ4/t-H4/ô`4.4-4`ô/4bô,´,4-t`ˆ4,´-t`H4.4.ô.4/´,tb´dt/8 %4`ô.´,4-´.4`´-H4/ô/´-4`´,´-t`4-´-4dt/t/t/´-H4-ô/t,4aô-t/t.4-KˆŸJW_JKS‰‰š‰‰˜™Ø]\œ˜^JK›X]Ú]šY[˜ÙJK›[™ÝŒ	‰šKšœÞÊ™]Z[È‹ØÚ[™[Ž–ÚKšœÞ
œÝ[[X\žH‹ØÚ[™[Žˆ´'ô/´aô-t/4`È4`t,´cô-ô,4/t/ÈŸJKKšœÞ
œ‹ØÚ[™[Ž˜™Ø]\œ˜^JK›X]Ú]šY[˜ÙJKš›Ú[Šˆ0­ÈŠ_JW_JW_JNÚYŠ\‰‰™K›X]ÚY\OOH›YY][H‰‰›K›[™Ý
\™]\›ˆKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™Z[™Ü™YY[[X]Ú]ŒN\Ë\™]šY]È‹Ú[™[Ž–ÚKšœÞÊšXY\ˆ‹ØÚ[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Žˆ´'t,4.t-4-t/t/ˆŠÛK›[™Ý
Èˆ4,´/´-ô/4/´-´/tbôaH4`t/´/´`´,´-t`´`t`´,´.4cÈŸJKKšœÞ
œÛX[‹ØÚ[™[Ž™K›X]Ú™X\ÛÛŸ´$´bô,t-t`4.4`´-H4/ô/´-4at/´-4côbt`ôcˆ4/ô/´-ô.4a´.4cˆŸJW_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™Z[™Ü™YY[\ÝYÙÙ\Ý[ÛœË]ŒN‹Ú[™[Ž›K›X\
OšKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OO›Šœ›ÙXÝÙ^K
KÚ[™[Ž–ÚKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÚKšœÞ
˜ˆ‹ØÚ[™[Ž‘›˜[Y_JKKšœÞÊœÛX[‹ØÚ[™[Ž–Ø™Ø]X]Ú[š]ŒN
[š]
K˜Ø]YÛÜžOÈˆ0­ÈŠÑ˜Ø]YÛÜžNˆˆ‹œÝ\Y\“˜[YOÈˆ0­È4'ô/´`t`´,4,´bt.4.´.ˆŠÑœÝ\Y\“˜[YNˆˆ—_JW_JKKšœÞÊ™[H‹ØÚ[™[Ž–ÑœØÛÜ™K‰H—_JW_Kœ›ÙXÝÙ^JJ_JKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™Z[™Ü™YY[\ÚÝËX[]ŒN‹ÛÛXÚÎ˜KÚ[™[Žˆ´'ô/´.´,4-ô,4`´c4,´`t-HŸJW_JNÚYŠ\Š\™]\›ˆKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™Z[™Ü™YY[[X]Ú]ŒN\Ë[Z\ÜÚ[™È‹Ú[™[Ž–ÚKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Ž™K›X[X[Ø\™›ÝXÝYÈ´(t,´cô-ôc4`´`4-t,t`ô-t`ˆ4/ô/´-4`´,´-t`4-´-4-t/t.4cÈŽˆ´(´/´,´,4`4/t-H4/t,4.t-4-t/HŸJKKšœÞ
œÛX[‹ØÚ[™[Ž™K›X]Ú™X\ÛÛŸ´'t,4-4dt-´/t/´,ô/ˆ4`t/´/´`´,´-t`´`t`´,´.4cÈ4/t-H4/t,4.t-4-t/t/ˆŸJW_JKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎ˜KÚ[™[Ž™K›X[X[Ø\™›ÝXÝYÈ´'ô`4/´,´-t`4.4`´cŽˆ´'t,4.t`´.4,ˆ4/t/´/4-t/t.´.ô,4`´`ô`4-HŸJW_JNÜ™]\›ˆKšœÞÊ™]ˆ‹È™]KX™]XÚXØ\™\XÚÙ\ˆŽˆœ™\Ý[Yš\œÝ]ŒÍÍH‹Û\ÜÓ˜[YNˆ˜™Z[™Ü™YY[Y[\ÙX\˜Ú]ŒN™Z[™Ü™YY[\Ù[XÝÜ‹]ŒŽNH™]XÚXØ\™\XÚÙ\‹]ŒÍÍHŠÊ›Ü›X[^™Y]Y\žOÈš\Ë\ÙX\˜Ú[™ÈŽˆš\ËXœ›ÝÜÚ[™ÈŠKÚ[™[Ž–ÚKšœÞ
š[œ]‹Ý\NˆœÙX\˜Ú‹˜[YNœßˆ‹]]Ñ›ØÝ\ÎˆLÛÚ[™ÙNš][OO›
][K\™Ù]˜[YJKXÙZÛ\Žˆ´$´,´-t-4.4`´-H4/t,4-ô,´,4/t.4-K4/ô/´`t`´,4,´bt.4.´,4.4.ô.4a4,4`t/´,´.´`ø )ˆ‹˜\šXK[X™[Žˆ´'ô/´.4`t.ˆ4/ô/ˆ4,´`t-t.H4/t/´/4-t/t.´.ô,4`´`ô`4-H‹˜\šXKY\ØÜšX™YžHŽˆ˜™]XÚ\ÙX\˜Ú\Ý]\ËHŠÙKšYJKKšœÞÊ™]ˆ‹ÚYˆ˜™]XÚ\ÙX\˜Ú\Ý]\ËHŠÙKšYÛ\ÜÓ˜[YNˆ˜™]XÚXØ\™\XÚÙ\‹\Ý[[X\žK]ŒÍÍH‹›ÛNˆœÝ]\È‹˜\šXK[]™HŽˆœÛ]H‹Ú[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Ž››Ü›X[^™Y]Y\žOÝš\ÚX›K›[™ÝÈ´'t,4.t-4-t/t/ŽˆŠÝš\ÚX›K›[™Ýˆ´'ô/ˆ4-ô,4/ô`4/´`t`È0ªÈŠÜÊÈ°®È4/t.4aô-t,ô/ˆ4/t-H4/t,4.t-4-t/t/ˆŽˆ´%4/´`t`´`ô/ô/t/ˆ4/ô/´-ô.4a´.4.NˆŠÜ›ÙXÝË›[™ÝJKKšœÞ
œÜ[ˆ‹ØÚ[™[Ž˜XÝ]™Qš[\ÛÝ[È´'ô`4.4/4-t/t-t/tbÈ4a4.4.ôc4`´`4bÎˆŠØXÝ]™Qš[\ÛÝ[ˆ´'ô/´.4`t.ˆ4/ô/ˆ4,´`t-t/4`È4`t/ô`4,4,´/´aô/t.4.´`ÈŸJW_JKš\ÚX›K›[™ÝŒ	‰šKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™]XÚXØ\™YÜ›Ý\Ë]ŒÍÍH‹Ú[™[Ž™Ü›Ý\Ë›X\
Ü›Ý\OšKšœÞÊœÙXÝ[Ûˆ‹ØÚ[™[Ž–ÚKšœÞ
š‹ØÚ[™[Ž™Ü›Ý\›X™[JKKšœÞ
™]ˆ‹ØÚ[™[Ž™Ü›Ý\š][\Ë›X\
][OOšKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNš][KšÙ^OOOZÈœÙ[XÝYŽˆˆ‹ÛÛXÚÎŠ
OO˜ÚÛÜÙJ][JKÚ[™[Ž–ÚKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Žš][K›˜[Y_JKKšœÞÊœÛX[‹ØÚ[™[Ž–Ú][KœXÚØYÙTÚ^™_™Ø]X]Ú[š]ŒN
][K[š]
K][KœÝ\Y\“˜[YOÈˆ0­ÈŠÚ][KœÝ\Y\“˜[YNˆˆ—_JW_JKKšœÞ
˜ˆ‹ØÚ[™[Žš][KšÙ^OOOZÈ´$´bô,t`4,4/t/ˆŽˆ´$´bô,t`4,4`´cŸJW_K][KšÙ^JJ_JW_KÜ›Ý\šÙ^JJ_JKKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™]XÚXØ\™Yš[\‹]ÙÙÛK]ŒÍÍH‹ÛÛXÚÎŠ
OOœÙ]š[\œÓÜ[Š˜[YOOˆ]˜[YJK˜\šXKY^[™YŽ™š[\œÓÜ[‹Ú[™[Ž–Ùš[\œÓÜ[È´(t.´`4bô`´c4a4.4.ôc4`´`4bÈŽˆ´)4.4.ôc4`´`4bÈ4/ô/ˆ4`4,4-ô-4-t.ô,4/‹XÝ]™Qš[\ÛÝ[Èˆ0­ÈŠØXÝ]™Qš[\ÛÝ[ˆˆ—_JKš[\œÓÜ[‰‰šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™]XÚXØ\™]^Û›Û^K]ŒÍÍH‹Ú[™[Ž–ÚKšœÞÊ›X™[‹ØÚ[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÚ[™[Žˆ´(4,4-ô-4-t.ÈŸJKKšœÞÊœÙ[XÝ‹Ý˜[YNœÙXÝ[Û’YÛÚ[™ÙNš][OOžÜÙ]ÙXÝ[Û’Y
][K\™Ù]˜[YJKÙ]Ø]YÛÜžRY
ˆŠKÙ]ÝX˜Ø]YÛÜžRY
ˆŠ_KÚ[™[Ž–ÚKšœÞ
›Ü[Ûˆ‹Ý˜[YNˆˆ‹Ú[™[Žˆ´$´`t-H4`4,4-ô-4-t.ôbÈŸJK‹‹œÙXÝ[ÛœË›X\
][OOšKšœÞ
›Ü[Ûˆ‹Ý˜[YNš][KšYÚ[™[Žš][K›˜[Y_K][KšY
JW_JW_JKKšœÞÊ›X™[‹ØÚ[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÚ[™[Žˆ´&´,4`´-t,ô/´`4.4cÈŸJKKšœÞÊœÙ[XÝ‹Ý˜[YN˜Ø]YÛÜžRYÛÚ[™ÙNš][OOžÜÙ]Ø]YÛÜžRY
][K\™Ù]˜[YJKÙ]ÝX˜Ø]YÛÜžRY
ˆŠ_KÚ[™[Ž–ÚKšœÞ
›Ü[Ûˆ‹Ý˜[YNˆˆ‹Ú[™[Žˆ´$´`t-H4.´,4`´-t,ô/´`4.4.ŸJK‹‹˜Ø]YÛÜšY\Ë›X\
][OOšKšœÞ
›Ü[Ûˆ‹Ý˜[YNš][KšYÚ[™[Žš][K›˜[Y_K][KšY
JW_JW_JKKšœÞÊ›X™[‹ØÚ[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÚ[™[Žˆ´'ô/´-4.´,4`´-t,ô/´`4.4cÈŸJKKšœÞÊœÙ[XÝ‹Ý˜[YNœÝX˜Ø]YÛÜžRYÛÚ[™ÙNš][OOœÙ]ÝX˜Ø]YÛÜžRY
][K\™Ù]˜[YJKÚ[™[Ž–ÚKšœÞ
›Ü[Ûˆ‹Ý˜[YNˆˆ‹Ú[™[Žˆ´$´`t-H4/ô/´-4.´,4`´-t,ô/´`4.4.ŸJK‹‹œÝX˜Ø]YÛÜšY\Ë›X\
][OOšKšœÞ
›Ü[Ûˆ‹Ý˜[YNš][KšYÚ[™[Žš][K›˜[Y_K][KšY
JW_JW_JW_JK]š\ÚX›K›[™Ý	‰šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™]XÚXØ\™Y[\K]ŒÍÍH‹Ú[™[Ž–ÚKšœÞ
œ‹ØÚ[™[Žœ›ÙXÝË›[™ÝÈ´'ô`4/´,´-t`4c4`´-H4/t,4/ô.4`t,4/t.4-H4.4.ô.4`t,t`4/´`tc4`´-H4a4.4.ôc4`´`4bËˆ4't/´,´`ôcˆ4/ô/´-ô.4a´.4cˆ4`t/´-ô-4,4,´,4.t`´-H4`´/´.ôc4.´/ˆ4-t`t.ô.4-tdH4-4-t.t`t`´,´.4`´-t.ôc4/t/ˆ4/t-t`ˆ4,ˆ4`t/ô`4,4,´/´aô/t.4.´-KˆŽˆ´$ˆ4/t/´/4-t/t.´.ô,4`´`ô`4-H4`´-t.´`ôbt-t,ô/ˆ4-ô,4,´-t-4-t/t.4cÈ4/ô/´.´,4/t-t`ˆ4-4/´`t`´`ô/ô/tbôaH4`t.´.ô,4-4`t.´.4aH4/ô/´-ô.4a´.4.KˆŸJKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™Z[™Ü™YY[XÜ™X]K]ŒÌÍˆ‹ÛÛXÚÎŠ
OO˜™Ù]]ZXÚÓÜ[•ŒÌÍŠL
KÚ[™[ŽœÏÈŠÈ4(t/´-ô-4,4`´c4/t/´,´`ôcˆ4/ô/´-ô.4a´.4cˆ0ªÈŠÜÊÈ°®ÈŽˆŠÈ4(t/´-ô-4,4`´c4/ô/´-ô.4a´.4cˆŸJW_JKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™Z[™Ü™YY[\ÚÝËX[]ŒN‹ÛÛXÚÎ˜KÚ[™[Žˆ´%ô,4.´`4bô`´c4/ô/´.4`t.ˆŸJK™]ZXÚÓÜ[•ŒÌÍ‰‰šKšœÞ
™›ÛY[˜Û]\™T]ZXÚÐÜ™X]UŒÌÍ‹Ú[š]X[˜[YNœßK›˜[Y_ˆ‹ÛÛ^ˆXÚXØ\™‹ÛÛÜÙNŠ
OO˜™Ù]]ZXÚÓÜ[•ŒÌÍŠLJKÛÜ™X]Yš][OOžÛŠ][KšÙ^K][JK™Ù]]ZXÚÓÜ[•ŒÌÍŠLJ__JW_J_B˜ÛÛœÝ™Ø][™Ü™YY[X]ÚŒÍŽX™Ø][™Ü™YY[X]ÚŒÍÍNÂ˜ÛÛœÝ™Ø][™Ü™YY[X]ÚŒŽNOX™Ø][™Ü™YY[X]ÚŒÍŽÂ˜ÛÛœÝ™Ø][™Ü™YY[X]ÚŒNOX™Ø][™Ü™YY[X]ÚŒŽNNÂ™[˜Ý[Ûˆ™Ø]™XÚ\QY]ÜŠÚ][N™K™XÚ\N›ÙXÝÎ›‹˜[[˜Ù\Îœ‹ÛÛÜÙN˜KÛ”Ø]™NœßJ^ØÛÛœÝÛWOTË\ÙTÝ]J

OOÞË‹‹[™Ü™YY[Î˜™Ø]\œ˜^Jš[™Ü™YY[ÊK›X\
OŠË‹‹œJJ_NžÚY˜Üž\Ëœ˜[™ÛUURQ

KY[R][RY™KšYÝ]\Îˆ™˜Y‹ÛÝ\˜ÙNˆ›X[X[‹[™Ü™YY[Î™K\OOOHœ™XYHÖÞÚY˜Üž\Ëœ˜[™ÛUURQ

K˜[YN™K›˜[YK]X[]NŒK[š]ˆ´b4`‹ˆ‹ÛÛ™šY[˜ÙNŒ_WN–×KØ\›š[™ÜÎ–×_JKÙ—OTË\ÙTÝ]J

OOžØÛÛœÝ^ßNÙ›ÜŠÛÛœÝÈÙˆ™Ø]\œ˜^Jš[™Ü™YY[ÊJ^ØÛÛœÝOX™Ø]˜[[˜ÙRÙ^JÊK\‹™š[™
ÏO‘ËšÙ^OOORJ_ßNÜØËšYO^ÚÙ^N’KÝ\œ™[”‹˜Ý\œ™[ÏÈˆ‹ØY™]N”‹œØY™]OÏÈˆ‹Û“Ü™\Ž”‹›Û“Ü™\ÏÈˆ‹XÚØYÙP[[Ý[”‹œXÚØYÙP[[Ý[ÏÈˆ‹ÚXÚÙY]”‹˜ÚXÚÙY]ˆŸ_\™]\›ˆJKÛKOTË\ÙTÝ]JßJKÙËWOTË\ÙTÝ]JßJKÞ×OTË\ÙTÝ]JßJK™XÚX[ÙÔ™Y•ŒÍMTË\ÙT™YŠ[
NÔË\ÙQY™™XÝ


OOžØÛÛœÝYØÝ[Y[˜›ÙKœÝ[K›Ý™\™›ÝÏOOHšY[ˆÈˆŽ™ØÝ[Y[˜›ÙKœÝ[K›Ý™\™›ÝËÏROOžÒKšÙ^OOOH‘\ØØ\H‰‰ˆYØÝ[Y[œ]Y\žTÙ[XÝÜŠ‹˜™\]ZXÚËXÜ™X]KX˜XÚÙ›Ü]ŒÌÍˆŠI‰˜J
_NÙØÝ[Y[˜›ÙKœÝ[K›Ý™\™›ÝÏHšY[ˆ‹Ú[™ÝË˜Y]™[\Ý[™\ŠšÙ^YÝÛˆ‹ÊNØÛÛœÝO\™\]Y\Ý[š[X][Û‘œ˜[YJ

OO˜™XÚX[ÙÔ™Y•ŒÍM˜Ý\œ™[Ë™›ØÝ\ÊÜ™]™[ØÜ›ÛˆLJJNÜ™]\›Š
OOžØØ[˜Ù[[š[X][Û‘œ˜[YJJKÚ[™ÝËœ™[[Ý™Q]™[\Ý[™\ŠšÙ^YÝÛˆ‹ÊKØÝ[Y[˜›ÙKœÝ[K›Ý™\™›ÝÏ\_KØWJNØÛÛœÝJÊOOJOOŠË‹‹’K[™Ü™YY[Î’Kš[™Ü™YY[Ë›X\
O”‹šYOO\ÞË‹‹”‹‹‹˜ßN”Š_JJKJÊOO™ŠOOŠË‹‹’KÜNžË‹‹ŠVÜ_ßJK‹‹˜ß_JJKJ
OOžØÛÛœÝ^ÚY˜Üž\Ëœ˜[™ÛUURQ

K˜[YNˆˆ‹]X[]NŒK[š]ˆ´b4`‹ˆ‹ÛÛ™šY[˜ÙNŒKX]ÚY\Žˆ›ÝÈŸNÝJÏOŠË‹‹˜Ë[™Ü™YY[Î–Ë‹‹˜Ëš[™Ü™YY[Ë_JJKŠÏOŠË‹‹˜ËÜšYNžÚÙ^N˜™Ø]˜[[˜ÙRÙ^J
KÝ\œ™[ˆˆ‹ØY™]Nˆˆ‹Û“Ü™\Žˆˆ‹XÚØYÙP[[Ý[ˆˆ‹ÚXÚÙY]ˆˆŸ_JJ_KJËJOOžØÛÛœÝR_‹™š[™
ÏO‘ËšÙ^OOOXÊKÏXß›X[X[ˆŠØ™›ØÓ›Ü›J›˜[YJJÈŸŠØ™Ø]Ð˜\ÙJœ]X[]K[š]
K[š]\‹™š[™
ÏO‘ËšÙ^OOOUÊ_ßNÚŠšYÏÞÜ\˜Ú\ÙT›ÙXÝÙ^N˜Ë›ÛY[˜Û]\™R][RY”ËšYË››ÛY[˜Û]\™R][RYËX]ÚY˜[YN”Ë›˜[Y_›X]ÚY˜[YKX]ÚY˜\ÙU[š]”Ë[š]Ë˜˜\ÙU[š]›X]ÚY˜\ÙU[š][šÔÝ]\Îˆ›[šÙY‹[šÔÛÝ\˜ÙNˆ›X[X[‹[šÐÛÛ™š\›YYžU\Ù\ŽˆLX]ÚY\ŽˆšYÚ‹X]ÚØÛÜ™NŒLX]Ú]šY[˜ÙN–È´/ô/´-4`´,´-t`4-´-4-t/t/ˆ4/ô/´.ôc4-ô/´,´,4`´-t.ô-t/—KX]ÚÝYÙÙ\Ý[ÛœÎ–×_NžÜ\˜Ú\ÙT›ÙXÝÙ^N›ÚYX]ÚY˜[YN›ÚY[šÔÝ]\Îˆ›Z\ÜÚ[™È‹[šÔÛÝ\˜ÙN›ÚY[šÐÛÛ™š\›YYžU\Ù\Ž›ÚYX]ÚY\Žˆ›ÝÈ‹X]ÚØÛÜ™NŒX]Ú]šY[˜ÙN–×KX]ÚÝYÙÙ\Ý[ÛœÎ–×_JKŠšYÚÙ^N•ËÝ\œ™[’‹˜Ý\œ™[ÏÈˆ‹ØY™]N’‹œØY™]OÏÈˆ‹Û“Ü™\Ž’‹›Û“Ü™\ÏÈˆ‹XÚØYÙP[[Ý[’‹œXÚØYÙP[[Ý[ÏÈˆ‹ÚXÚÙY]’‹˜ÚXÚÙY]ˆŸJK
ÏOŠË‹‹‘ËÜšYNˆL_JJ_KÏJËJOOžØÛÛœÝX™Ø][X™\ŠÊKÏR_›X]ÚY˜\ÙU[š]ÚYŠJŒ
_VÈ™È‹›[‹œÜÈ—Kš[˜ÛY\ÊÊJ\™]\›ŽÚŠšYÝ[š]ÛÛ™\œÚ[ÛŽžØ[[Ý[”‹[š]•ËÛÛ™š\›YYžU\Ù\ŽˆLÛÝ\˜ÙNˆ›X[X[ŸK[š]™\ÛÛ][Û”Ý]\ÎˆœXÚØYÚ[™×ØÛÛ\]X›H‹[š]™\ÛÛ][Û”™X\ÛÛŽˆ´&´/´/t,´-t`4`t.4cÈ4/ô/´-4`´,´-t`4-´-4-t/t,4/ô/´.ôc4-ô/´,´,4`´-t.ô-t/‹™\ÛÛ][Û”Ý]\Îˆ›[šÙYÜ™XYH‹[šÔÝ]\Îœ›[šÔÛÝ\˜ÙOOOHœÙ[X[X×ÛX]ÚÈ˜]]×Û[šÙYŽˆ›[šÙY‹›Ü›X[^™Y]X[]N˜™Ø][X™\Šœ]X[]JJ”‹›Ü›X[^™Y[š]•Ë]\ÚXš[]UØ\›š[™ÜÎ–×_JKÊOŠË‹‹’‹ÜšYNˆˆŸJJ_KOX\Þ[˜ÈOžØÛÛœÝÏ[š[™Ü™YY[Ë™š[\ŠOO’K›˜[YKš[J
I‰˜™Ø][X™\ŠKœ]X[]JOŒ
K›X\
OOŠË‹‹’K˜[YN’K›˜[YKš[J
K]X[]N˜™Ø][X™\ŠKœ]X[]JK\]Y]›™]È]J
KÒTÓÔÝš[™Ê
_JJKOXË›X\
OžØÛÛœÝÏYÔ‹šY_ßKT‹œ\˜Ú\ÙT›ÙXÝÙ^_ËšÙ^_™Ø]˜[[˜ÙRÙ^JŠNÜ™]\›žÚÙ^N’›ÙXÝÙ^N’˜[YN”‹›X]ÚY˜[Y_‹›˜[YKØ]YÛÜžN”‹˜Ø]YÛÜž_›Ý\ˆ‹Ý\œ™[“X]›X^
™Ø][X™\ŠË˜Ý\œ™[
JKØY™]N“X]›X^
™Ø][X™\ŠËœØY™]JJKÛ“Ü™\Ž“X]›X^
™Ø][X™\ŠË›Û“Ü™\ŠJKXÚØYÙP[[Ý[“X]›X^
™Ø][X™\ŠËœXÚØYÙP[[Ý[
JK[š]˜™Ø]Ð˜\ÙJ‹œ]X[]K‹[š]
K[š]Y]Y]TÛÝ\˜ÙNˆœ™XÚ\H‹ÚXÚÙY]›™]È]J
KÒTÓÔÝš[™Ê
K\]Y]›™]È]J
KÒTÓÔÝš[™Ê
__JNØ]ØZ]ÊË‹‹›[™Ü™YY[Î˜ËÝ]\ÎœÈ˜ÛÛ™š\›YYŽˆ™˜Y‹ÛÝ\˜ÙN›œÛÝ\˜Ù_›X[X[‹\]Y]›™]È]J
KÒTÓÔÝš[™Ê
KÛÛ™š\›YY]œÛ™]È]J
KÒTÓÔÝš[™Ê
N›˜ÛÛ™š\›YY]KJ_NØÛÛœÝ™Z\ÜÚ[™ÐÛÜÝÛÝ[[š[™Ü™YY[Ë™š[\ŠOžÚYŠ\œ\˜Ú\ÙT›ÙXÝÙ^J\™]\›ˆLNØÛÛœÝÏ[‹™š[™
OO’KšÙ^OOO\œ\˜Ú\ÙT›ÙXÝÙ^JKS[X™\ŠÏË˜]™\˜YÙU[š]ÛÜÝÏØÏË›\Ý\˜Ú\ÙTšXÙOÏØÏËœšXÙJNÜ™]\›ˆJŒ
_JK›[™Ý™XÚ[˜[YÛÝ[[š[™Ü™YY[Ë™š[\ŠOˆ\›˜[YKš[J
_J™Ø][X™\Šœ]X[]JOŒ
_\œ\˜Ú\ÙT›ÙXÝÙ^_›[šÔÝ]\ÏOOH›Z\ÜÚ[™ÈŸÈœ™\]Z\™\×Ü™]šY]È‹š[˜[Y‹›Z\ÜÚ[™È—Kš[˜ÛY\Ê[š]™\ÛÛ][Û”Ý]\ÊJK›[™Ý™XÚ[šÙYÛÝ[[š[™Ü™YY[Ë›[™ÝX™XÚ[˜[YÛÝ[™XÚØ[ÛÛ™š\›O[š[™Ü™YY[Ë›[™ÝŒ	‰˜™XÚ[˜[YÛÝ[OOLÜ™]\›ˆKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]X˜XÚÙ›Ü™]XÚXØ\™]ÛÜšÜÜXÙK]ŒÍM‹›ÛNˆœ™\Ù[][Ûˆ‹ÛÛXÚÎœOœ\™Ù]OO\˜Ý\œ™[\™Ù]	‰˜J
KÚ[™[ŽšKšœÞÊœÙXÝ[Ûˆ‹Ü™YŽ˜™XÚX[ÙÔ™Y•ŒÍMÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]™]XÚXØ\™YY]Ü‹]ŒÍM‹›ÛNˆ™X[ÙÈ‹˜\šXK[[Ù[ŽˆL˜\šXK[X™[YžHŽˆ˜™]XÚXØ\™]]K]ŒÍM‹X’[™^‹LKÚ[™[Ž–ÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]Z[™HŸJKKšœÞÊšXY\ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]ZXY‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™]XÚXØ\™XÛÛ^]ŒÍM‹Ú[™[Žˆ´'4-t/tcˆ8¡¤ˆ4(´-tat.´,4`4`´,ŸJKKšœÞ
šˆ‹ÚYˆ˜™]XÚXØ\™]]K]ŒÍM‹Ú[™[ŽÈ´(4-t-4,4.´`´.4`4/´,´,4/t.4-H4`´-tat.´,4`4`´bÈŽˆ´'t/´,´,4cÈ4`´-tat.´,4`4`´,ŸJKKšœÞÊœ‹ØÚ[™[Ž–ÙK›˜[YKˆ0­È4/t/´`4/4bÈ4/t,4/´-4/t`È4/ô`4/´-4,4-´`È‹Ë™\œÚ[ÛÈˆ0­È4,´-t`4`t.4cÈŠÝ™\œÚ[ÛŽˆˆ—_JW_JKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙËXÛÜÙH‹ÛÛXÚÎ˜K˜\šXK[X™[Žˆ´%ô,4.´`4bô`´c4`´-tat.´,4`4`´`È‹Ú[™[Žˆ°åÈŸJW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËY›Ü›H‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË]ÛÜšÙ›ÝË\Ý]\Ë]ŒÍLÈŠÊ™XÚØ[ÛÛ™š\›OÈ™ÛÛÙŽˆˆŠK›ÛNˆœÝ]\È‹Ú[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Ž˜™XÚØ[ÛÛ™š\›OÈ´(´-tat.´,4`4`´,4,ô/´`´/´,´,4.ˆ4/ô/´-4`´,´-t`4-´-4-t/t.4cˆŽˆ´%ô,4,´-t`4b4.4`´-H4/´,tcô-ô,4`´-t.ôc4/tbô-H4`t,´cô-ô.ŸJKKšœÞ
œÜ[ˆ‹ØÚ[™[Ž›š[™Ü™YY[Ë›[™ÝÖÈ´(t,´cô-ô,4/t/ˆ‹™XÚ[šÙYÛÝ[ˆ4.4-È‹š[™Ü™YY[Ë›[™Ýˆ4.4/t,ô`4-t-4.4-t/t`´/´,ˆ‹™XÚ[˜[YÛÝ[Èˆ0­È4/ô`4/´,´-t`4.4`´cˆŠØ™XÚ[˜[YÛÝ[ˆˆ—Kš›Ú[ŠˆŠNˆ´%4/´,t,4,´c4`´-H4at/´`´cÈ4,tbÈ4/´-4.4/H4.4/t,ô`4-t-4.4-t/t`ˆŸJW_JKœÝ]\ÈOOH˜ÛÛ™š\›YY‰‰šKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\™]šY]Ë[›ÝH‹Ú[™[Ž›œÛÝ\˜ÙOOOH˜ZHÈ´&4&4/ô`4-t-4.ô/´-´.4.È4aô-t`4/t/´,´.4.‹ˆ4'´aô-t,´.4-4/tbô-H4`t,´cô-ô.˜\‘ØÝÜˆ4`ô-´-H4,´bô/ô/´.ô/t.4.Ë4/t-t/´-4/t/´-ô/t,4aô/tbô-H4,´,4`4.4,4/t`´bÈ4/´`t`´,4,´.ô-t/tbÈ4-4.ôcÈ4/ô/´-4`´,´-t`4-´-4-t/t.4cËˆŽˆ´(´-tat.´,4`4`´,4/ô/´.´,4/t-H4/ô/´-4`´,´-t`4-´-4-t/t,4.4/t-H4`ôaô,4`t`´,´`ô-t`ˆ4,ˆ4`4,4`taôdt`´-H4-ô,4.´`ô/ô.´.ˆŸJKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËZ[™Ü™YY[[\Ý‹Ú[™[Ž›š[™Ü™YY[Ë›X\

ÊOOžØÛÛœÝOX™Ø]Ð˜\ÙJœ]X[]K[š]
KYÜšY_ßNÜ™]\›ˆKšœÞÊ˜\XÛH‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËZ[™Ü™YY[‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËZ[™Ü™YY[ZXY‹Ú[™[Ž–ÚKšœÞÊ˜ˆ‹ØÚ[™[Ž–È´&4/t,ô`4-t-4.4-t/t`ˆ‹ÊÌW_JKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË\™[[Ý™H‹ÛÛXÚÎŠ
OOžÝJÏOŠË‹‹‘Ë[™Ü™YY[Î‘Ëš[™Ü™YY[Ë™š[\ŠO’šYOO\šY
_JJKŠÏOžØÛÛœÝ^Ë‹‹‘ßNÜ™]\›ˆ[]HÜšYKJ_KÚ[™[Žˆ´(ô-4,4.ô.4`´cŸJW_JKKšœÞ
™Ø]šY[ÛX™[ˆ´'t,4-ô,´,4/t.4-H‹Ú[™[ŽšKšœÞ
š[œ]‹Ý˜[YNœ›˜[YKÛÚ[™ÙN‘ÏOšŠšYÛ˜[YN‘Ë\™Ù]˜[Y_JKXÙZÛ\Žˆ´&4/t,ô`4-t-4.4-t/t`ˆ4.4.ô.4,ô/´`´/´,´bô.H4`´/´,´,4`ŸJ_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËYÜšY‹Ú[™[Ž–ÚKšœÞ
™Ø]šY[ÛX™[ˆ´&´/´.ô.4aô-t`t`´,´/ˆ4/t,4/ô/´`4a´.4cˆ‹Ú[™[ŽšKšœÞ
š[œ]‹Ý\Nˆ›[X™\ˆ‹Ý\ˆŒŒH‹[œ][ÙNˆ™XÚ[X[‹˜[YNœœ]X[]KÛÚ[™ÙN‘ÏOšŠšYÜ]X[]N‘Ë\™Ù]˜[Y_J_J_JKKšœÞ
™Ø]šY[ÛX™[ˆ´%t-4.4/t.4a´,‹Ú[™[ŽšKšœÞÊœÙ[XÝ‹Ý˜[YNœ[š]´b4`‹ˆ‹ÛÚ[™ÙN‘ÏOšŠšYÝ[š]‘Ë\™Ù]˜[Y_JKÚ[™[Ž–ÚKšœÞ
›Ü[Ûˆ‹Ý˜[YNˆ´/4.È‹Ú[™[Žˆ´/4.ÈŸJKKšœÞ
›Ü[Ûˆ‹Ý˜[YNˆ´.È‹Ú[™[Žˆ´.ÈŸJKKšœÞ
›Ü[Ûˆ‹Ý˜[YNˆ´,È‹Ú[™[Žˆ´,ÈŸJKKšœÞ
›Ü[Ûˆ‹Ý˜[YNˆ´.´,È‹Ú[™[Žˆ´.´,ÈŸJKKšœÞ
›Ü[Ûˆ‹Ý˜[YNˆ´b4`‹ˆ‹Ú[™[Žˆ´b4`‹ˆŸJW_J_JW_JKKšœÞ
™Ø]šY[ÛX™[ˆ´(t,´cô-ôc4`H4/t/´/4-t/t.´.ô,4`´`ô`4/´.H‹Ú[™[ŽšKšœÞ
™Ø][™Ü™YY[X]ÚŒŽNKÚ[™Ü™YY[œ›ÙXÝÎ›‹ÛÚÛÜÙNŠË
OOžÓŠË
K
OŠË‹‹’‹ÜšYNˆL_JJ_KÚÝÐ[›VÜšYOOOHLÛ”ÚÝÐ[Š
OOš
ÏOŠË‹‹‘ËÜšYNˆQÖÜšY_JJK]Y\žN™ÖÜšY_ˆ‹Û”]Y\žN‘ÏOžJOŠË‹‹’ÜšYN‘ßJJKÛÛ™\œÚ[Û•˜[YNžÜšY_ˆ‹ÛÛÛ™\œÚ[ÛÚ[™ÙN‘ÏOÊOŠË‹‹’ÜšYN‘ßJJKÛÛÛ™š\›PÛÛ™\œÚ[ÛŽŠË
OO’ÊË
_J_JKKšœÞÊ™]Z[È‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÝØÚËX›Þ]ŒÍLÈ‹Ú[™[Ž–ÚKšœÞ
œÝ[[X\žH‹ØÚ[™[Žˆ´(t.´.ô,4-4`t.´.4-H4/ô,4`4,4/4-t`´`4bÈ
4/t-t/´,tcô-ô,4`´-t.ôc4/t/ŠHŸJKKšœÞÊ˜ˆ‹ØÚ[™[Ž–È´'´`t`´,4`´/´.ˆ4.4`4-t-ô-t`4,ˆ4,ˆ4,t,4-ô/´,´/´.H4-t-4.4/t.4a´-Nˆ‹™Ø][š]X™[
K[š]
W_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËYÜšY‹Ú[™[Ž–ÚKšœÞ
™Ø]šY[ÛX™[ˆ´(t-t.taô,4`H‹Ú[™[ŽšKšœÞ
š[œ]‹Ý\Nˆ›[X™\ˆ‹Ý\ˆŒŒH‹[œ][ÙNˆ™XÚ[X[‹˜[YN”‹˜Ý\œ™[ÏÈˆ‹ÛÚ[™ÙN‘ÏOŠšYØÝ\œ™[‘Ë\™Ù]˜[Y_J_J_JKKšœÞ
™Ø]šY[ÛX™[ˆ´(t`´`4,4at/´,´/´.H4-ô,4/ô,4`H‹Ú[™[ŽšKšœÞ
š[œ]‹Ý\Nˆ›[X™\ˆ‹Ý\ˆŒŒH‹[œ][ÙNˆ™XÚ[X[‹˜[YN”‹œØY™]OÏÈˆ‹ÛÚ[™ÙN‘ÏOŠšYÜØY™]N‘Ë\™Ù]˜[Y_J_J_JW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËYÜšY‹Ú[™[Ž–ÚKšœÞ
™Ø]šY[ÛX™[ˆ´(ô-´-H4-ô,4.´,4-ô,4/t/ˆ‹Ú[™[ŽšKšœÞ
š[œ]‹Ý\Nˆ›[X™\ˆ‹Ý\ˆŒŒH‹[œ][ÙNˆ™XÚ[X[‹˜[YN”‹›Û“Ü™\ÏÈˆ‹ÛÚ[™ÙN‘ÏOŠšYÛÛ“Ü™\Ž‘Ë\™Ù]˜[Y_J_J_JKKšœÞ
™Ø]šY[ÛX™[ˆ´)4,4`t/´,´.´,4,´`4`ôaô/t`ôcˆ‹Ú[™[ŽšKšœÞ
š[œ]‹Ý\Nˆ›[X™\ˆ‹Ý\ˆŒŒH‹[œ][ÙNˆ™XÚ[X[‹˜[YN”‹œXÚØYÙP[[Ý[ÏÈˆ‹ÛÚ[™ÙN‘ÏOŠšYÜXÚØYÙP[[Ý[‘Ë\™Ù]˜[Y_JKXÙZÛ\Žˆ´%t`t.ô.4-tdH4/t-t`ˆ4,ˆ4-4/´.´`ô/4-t/t`´-HŸJ_JW_JW_JW_KšY
_J_JKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË\ÙXÛÛ™\žH‹ÛÛXÚÎ˜‹Ú[™[ŽˆŠÈ4%4/´,t,4,´.4`´c4.4/t,ô`4-t-4.4-t/t`ˆŸJK™Z\ÜÚ[™ÐÛÜÝÛÝ[Œ	‰šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËZ\ÜÝYH‹›ÛNˆœÝ]\È‹Ú[™[Ž–È´(t-t,t-t`t`´/´.4/4/´`t`´c4/t-t/ô/´.ô/t,4cÎˆ4/´`´`t`ô`´`t`´,´`ô-t`ˆ4`t`´/´.4/4/´`t`´c‹™Z\ÜÚ[™ÐÛÜÝÛÝ[ˆ4.4/t,ô`4-t-4.4-t/t`´/´,‹ˆ4)´-t/t,4/ô/´cô,´.4`´`tcÈ4/ô/´`t.ô-H]]Üš]]]™H4-ô,4.´`ô/ô.´.ˆ—_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]XXÝ[ÛœÈ‹Ú[™[Ž–ÚKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË\ÙXÛÛ™\žH‹\ØX›Yˆ[š[™Ü™YY[Ë›[™ÝÛÛXÚÎŠ
OO‘JLJKÚ[™[Žˆ´(t/´at`4,4/t.4`´c4aô-t`4/t/´,´.4.ˆŸJKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË\š[X\žH‹\ØX›YˆX™XÚØ[ÛÛ™š\›KÛÛXÚÎŠ
OO‘JL
KÚ[™[Žˆ´'ô/´-4`´,´-t`4-4.4`´c4`´-tat.´,4`4`´`ÈŸJW_JW_JW_J_J_B™[˜Ý[Ûˆ™Ø][\Ü™]šY]ÊÙ˜Y™KÛÚ[™ÙNÛØ[˜Ù[›‹ÛÛÛ™š\›Nœ‹Ø]š[™Î˜_J^ØÛÛœÝÏJK
OO
Ë‹‹™KY[R][\Î™K›Y[R][\Ë›X\
O™‹šYOO]OÞË‹‹™‹‹‹™N™Š_JKYK›Y[R][\Ë›[™ÝŒ	‰™K›Y[R][\Ë™]™\žJ™Y[R[\ÜÚ^™U˜[YŒŽN
NÜ™]\›ˆKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]X˜XÚÙ›Ü‹Ú[™[ŽšKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]‹Ú[™[Ž–ÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]Z[™HŸJKKšœÞÊšXY\ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]ZXY‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
šˆ‹ØÚ[™[Žˆ´'ô`4/´,´-t`4c4`´-H4/4-t/tcˆŸJKKšœÞÊœ‹ØÚ[™[Ž–ÙK›Y[R][\Ë›[™Ýˆ4/ô/´-ô.4a´.4.H0­È4`ô,´-t`4-t/t/t/´`t`´c‹X]œ›Ý[™

™Ø][X™\ŠK˜ÛÛ™šY[˜ÙJ_
JŒL
K‰H—_JW_JKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙËXÛÜÙH‹ÛÛXÚÎ›‹Ú[™[Žˆ°åÈŸJW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËY›Ü›H‹Ú[™[Ž–ÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\™]šY]Ë[›ÝHŠÊ™Ø][X™\ŠK˜ÛÛ™šY[˜ÙJOKŽI‰ˆYKØ\›š[™ÜÏË›[™ÝÈ™ÛÛÙŽˆˆŠKÚ[™[Ž™KØ\›š[™ÜÏË›[™ÝÙKØ\›š[™ÜËš›Ú[ŠˆŠNˆ´'ô`4/´,´-t`4c4`´-H4/t,4-ô,´,4/t.4cË4a´-t/tbË4/ô/´`4a´.4.4.4`´.4/ôbËˆ4'ô`4-t-4.ô/´-´-t/t/tbô-H4`´-tat.´,4`4`´bÈ4`t/´at`4,4/tcô`´`tcÈ4`´/´.ôc4.´/ˆ4.´,4.ˆ4aô-t`4/t/´,´.4.´.ˆŸJKKœÛÝ\˜ÙU\›	‰šKšœÞ
˜H‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË[[šÈ‹™YŽ™KœÛÝ\˜ÙU\›\™Ù]ˆ—Ø›[šÈ‹™[ˆ››Ü™Y™\œ™\ˆ‹Ú[™[Žˆ´'´`´.´`4bô`´c4.4`tat/´-4/t/´-H4/4-t/tcˆ8¡¤ˆŸJKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\™]šY]Ë[\Ý‹Ú[™[Ž™K›Y[R][\Ë›X\

K
OOšKšœÞÊ˜\XÛH‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\™]šY]ËZ][H‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\™]šY]ËZ][KZXY‹Ú[™[Ž–ÚKšœÞÊ˜ˆ‹ØÚ[™[Ž–È´'ô/´-ô.4a´.4cÈ‹
ÌKˆ0­ÈRH‹X]œ›Ý[™

™Ø][X™\ŠK˜ÛÛ™šY[˜ÙJ_
JŒL
K‰H—_JKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË\™[[Ý™H‹ÛÛXÚÎŠ
OO
Ë‹‹™KY[R][\Î™K›Y[R][\Ë™š[\ŠO™‹šYOO]KšY
_JKÚ[™[Žˆ´(ô-4,4.ô.4`´cŸJW_JKKšœÞ
™Ø]šY[ÛX™[ˆ´'t,4-ô,´,4/t.4-H‹Ú[™[ŽšKšœÞ
š[œ]‹Ý˜[YNK›˜[YKÛÚ[™ÙN™OœÊKšYÛ˜[YN™‹\™Ù]˜[Y_J_J_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËYÜšY‹Ú[™[Ž–ÚKšœÞ
™Ø]šY[ÛX™[ˆ´(4,4-ô-4-t.È‹Ú[™[ŽšKšœÞ
œÙ[XÝ‹Ý˜[YNK™\\Y[™Ø]\\Y[
JKÛÚ[™ÙN™OœÊKšYÙ\\Y[™‹\™Ù]˜[Y_JKÚ[™[Ž˜™Ø]\\Y[Ë›X\
OšKšœÞ
›Ü[Ûˆ‹Ý˜[YN™‹šYÚ[™[Ž™‹›X™[K‹šY
J_J_JKKšœÞ
™Ø]šY[ÛX™[ˆ´'ô/´-4`4,4-ô-4-t.È‹Ú[™[ŽšKšœÞ
š[œ]‹Ý˜[YNK˜Ø]YÛÜžKÛÚ[™ÙN™OœÊKšYØØ]YÛÜžN™‹\™Ù]˜[Y_J_J_JW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËYÜšY‹Ú[™[Ž–ÚKšœÞ
™Ø]šY[ÛX™[ˆ´)´-t/t,‹Ú[™[ŽšKšœÞ
š[œ]‹Ý\Nˆ›[X™\ˆ‹Ý\ˆŒŒH‹[œ][ÙNˆ™XÚ[X[‹˜[YNKœØ[TšXÙKÛÚ[™ÙN™OœÊKšYÜØ[TšXÙN™‹\™Ù]˜[Y_J_J_JKKšœÞ
™Y[TØ[TÚ^™PÛÛ›ÛŒŽNÚ][NKÛÚ[™ÙN™OœÊKšYŠ_JW_JKKšœÞ
™Ø]šY[ÛX™[ˆ´(´.4/È‹Ú[™[ŽšKšœÞÊœÙ[XÝ‹Ý˜[YNK\KÛÚ[™ÙN™OœÊKšYÝ\N™‹\™Ù]˜[Y_JKÚ[™[Ž–ÚKšœÞ
›Ü[Ûˆ‹Ý˜[YNˆ˜ÛÛ\ÜÚ]H‹Ú[™[Žˆ´(t/´`t`´,4,´/t,4cÈ0­È4/ô/ˆ4`´-tat.´,4`4`´-HŸJKKšœÞ
›Ü[Ûˆ‹Ý˜[YNˆœ™XYH‹Ú[™[Žˆ´$ô/´`´/´,´bô.H4`´/´,´,4`0­È4.4-È4/t/´/4-t/t.´.ô,4`´`ô`4bÈŸJKKšœÞ
›Ü[Ûˆ‹Ý˜[YNˆœÙ\šXÙH‹Ú[™[Žˆ´(ô`t.ô`ô,ô,ŸJW_J_JW_KKšY
J_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\™]šY]Ë[›ÝHÛÛÙ‹Ú[™[Ž–È´)ô-t`4/t/´,´.4.´/´,ˆ4`´-tat.´,4`4`Žˆ‹Kœ™XÚ\\ÏË›[™Ý‹ˆ4't.4/´-4.4/H4`4-ta´-t/ô`ˆ4/t-H4/ô/´/ô,4-4dt`ˆ4,ˆ4`4,4`taôdt`ˆ4-4/ˆ4,´,4b4-t,ô/ˆ4/ô/´-4`´,´-t`4-´-4-t/t.4cËˆ—_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]XXÝ[ÛœÈ‹Ú[™[Ž–ÚKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË\ÙXÛÛ™\žH™XØ][ÙËY[™Ù\ˆ‹\ØX›Y˜KÛÛXÚÎ›‹Ú[™[Žˆ´'t-H4`t/´at`4,4/tcô`´cŸJKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË\š[X\žH‹\ØX›Y˜_[ÛÛXÚÎœ‹Ú[™[Ž˜OÈ´(t/´at`4,4/tcôc¸ )ˆŽˆ´%4/´,t,4,´.4`´c4,ˆ4,4`t`t/´`4`´.4/4-t/t`ˆŸJW_JW_JW_J_J_B™[˜Ý[Ûˆ™Ø]\›ÚY]
ÛÛÛÜÙN™KÛ”ÝX›Z]ØY[™Î›ŸJ^ØÛÛœÝÜ‹WOTË\ÙTÝ]JˆŠNÜ™]\›ˆKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]X˜XÚÙ›Ü‹ÛÛXÚÎœÏOœË\™Ù]OO\Ë˜Ý\œ™[\™Ù]	‰™J
KÚ[™[ŽšKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]‹Ú[™[Ž–ÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]Z[™HŸJKKšœÞÊšXY\ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]ZXY‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
šˆ‹ØÚ[™[Žˆ´'4-t/tcˆ4/ô/ˆ4`t`tbô.ô.´-HŸJKKšœÞ
œ‹ØÚ[™[Žˆ´(t`tbô.ô.´,4-4/´.ô-´/t,4/´`´.´`4bô,´,4`´c4`tcÈ4,t-t-È4,´at/´-4,4.4/ô,4`4/´.ôcËˆŸJW_JKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙËXÛÜÙH‹ÛÛXÚÎ™KÚ[™[Žˆ°åÈŸJW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËY›Ü›H‹Ú[™[Ž–ÚKšœÞ
™Ø]šY[ÛX™[ˆ´'ô`ô,t.ô.4aô/t,4cÈ4`t`tbô.ô.´,‹Ú[™[ŽšKšœÞ
š[œ]‹Ý\Nˆ\›‹[œ][ÙNˆ\›‹˜[YNœ‹ÛÚ[™ÙNœÏO˜JË\™Ù]˜[YJKXÙZÛ\ŽˆšÎ‹ËÜÚ]K˜ÛÛKÛY[HŸJ_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\™]šY]Ë[›ÝH‹Ú[™[Žˆ˜\‘ØÝÜˆ4/ô`4/´aô.4`´,4-t`ˆ4,´.4-4.4/4bô-H4/ô/´-ô.4a´.4.4.4a´-t/tbË4,4-ô,4`´-t/4/ô/´.´,4-´-t`ˆ4/´,tcô-ô,4`´-t.ôc4/t`ôcˆ4`t,´-t`4.´`Ëˆ4%ô,4.´`4bô`´bô-H4`t`´`4,4/t.4a´bÈ4.4`t/´a´`t-t`´.4/4/´,ô`ô`ˆ4/t-H4/´`´-4,4`´c4/4-t/tc‹ˆŸJKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]XXÝ[ÛœÈ‹Ú[™[Ž–ÚKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË\ÙXÛÛ™\žH‹ÛÛXÚÎ™KÚ[™[Žˆ´'´`´/4-t/t,ŸJKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË\š[X\žH‹\ØX›Y›ŸK×šÏÎ—×ËÚK\Ý
‹š[J
JKÛÛXÚÎŠ
OO
‹š[J
JKÚ[™[Ž›È´)ô.4`´,4c¸ )ˆŽˆ´%ô,4,ô`4`ô-ô.4`´cŸJW_JW_JW_J_J_B™[˜Ý[Ûˆ™Ø][\›˜[Y]ÜŠÚ][N™K›ÙXÝÎÛÛÜÙN›‹Û”Ø]™NœŸJ^ØÛÛœÝØK×OTË\ÙTÝ]J

OO™OÞË‹‹™_NžÚY˜Üž\Ëœ˜[™ÛUURQ

K˜[YNˆˆ‹[š]ˆœÜÈ‹Ý\œ™[ÝØÚÎŒZ[š[][TÝØÚÎŒÛ“Ü™\ŽŒXÚØYÙP[[Ý[Œ\˜Ú\ÙT›ÙXÝÙ^Nˆˆ‹XÝ]™NˆLJKJK
OOœÊOŠË‹‹™‹ÝWN™JJKOJ
OOžÚYŠXK›˜[YKš[J
J\™]\›ŽÜŠË‹‹˜K˜[YN˜K›˜[YKš[J
KÝ\œ™[ÝØÚÎ“X]›X^
™Ø][X™\ŠK˜Ý\œ™[ÝØÚÊJKZ[š[][TÝØÚÎ“X]›X^
™Ø][X™\ŠK›Z[š[][TÝØÚÊJKÛ“Ü™\Ž“X]›X^
™Ø][X™\ŠK›Û“Ü™\ŠJKXÚØYÙP[[Ý[“X]›X^
™Ø][X™\ŠKœXÚØYÙP[[Ý[
JK\]Y]›™]È]J
KÒTÓÔÝš[™Ê
KÜ™X]Y]˜K˜Ü™X]Y]™]È]J
KÒTÓÔÝš[™Ê
_JKŠ
_NÜ™]\›ˆKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]X˜XÚÙ›Ü‹Ú[™[ŽšKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]‹Ú[™[Ž–ÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]Z[™HŸJKKšœÞÊšXY\ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]ZXY‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
šˆ‹ØÚ[™[Ž™OÈ´$´/t`ô`´`4-t/t/t.4.H4`4,4`tat/´-4/t.4.ˆŽˆ´'t/´,´bô.H4`4,4`tat/´-4/t.4.ˆŸJKKšœÞ
œ‹ØÚ[™[Žˆ´%4.ôcÈ4`´/´,´,4`4/´,ˆ4,´/t-H4/4-t/tcŽˆ4`t,4.ôa4-t`´.´.4at.4/4.4cË4`ô,ô/´.ôc4`ô/ô,4.´/´,´.´,ˆŸJW_JKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙËXÛÜÙH‹ÛÛXÚÎ›‹Ú[™[Žˆ°åÈŸJW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËY›Ü›H‹Ú[™[Ž–ÚKšœÞ
™Ø]šY[ÛX™[ˆ´'t,4-ô,´,4/t.4-H‹Ú[™[ŽšKšœÞ
š[œ]‹Ý˜[YN˜K›˜[YKÛÚ[™ÙN™O›
›˜[YH‹\™Ù]˜[YJKXÙZÛ\Žˆ´'t,4/ô`4.4/4-t`4/ô,4.´-t`´bÈ4-4.ôcÈ4/4`ô`t/´`4,ŸJ_JKKšœÞ
™Ø]šY[ÛX™[ˆ´(t,´cô-ôc4`H4-ô,4.´`ô/ô/´aô/tbô/4`´/´,´,4`4/´/‹Ú[™[ŽšKšœÞÊœÙ[XÝ‹Ý˜[YN˜Kœ\˜Ú\ÙT›ÙXÝÙ^_ˆ‹ÛÚ[™ÙN™OžØÛÛœÝ]™š[™
OO›KšÙ^OOOY\™Ù]˜[YJNÜÊOOŠË‹‹›K\˜Ú\ÙT›ÙXÝÙ^N™\™Ù]˜[YK[š]™Ë[š]K[š]XÚØYÙP[[Ý[™Ë˜[[Ý[KœXÚØYÙP[[Ý[JJ_KÚ[™[Ž–ÚKšœÞ
›Ü[Ûˆ‹Ý˜[YNˆˆ‹Ú[™[Žˆ´'t-H4`t,´cô-ô,4/t/ˆŸJK‹‹›X\
OšKšœÞÊ›Ü[Ûˆ‹Ý˜[YN™šÙ^KÚ[™[Ž–Ù›˜[YKœXÚØYÙTÚ^™OÈˆ0­ÈŠÙœXÚØYÙTÚ^™Nˆˆ—_KšÙ^JJW_J_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËYÜšY‹Ú[™[Ž–ÚKšœÞ
™Ø]šY[ÛX™[ˆ´%t-4.4/t.4a´,‹Ú[™[ŽšKšœÞÊœÙ[XÝ‹Ý˜[YN˜K[š]ÛÚ[™ÙN™O›
[š]‹\™Ù]˜[YJKÚ[™[Ž–ÚKšœÞ
›Ü[Ûˆ‹Ý˜[YNˆœÜÈ‹Ú[™[Žˆ´b4`‹ˆŸJKKšœÞ
›Ü[Ûˆ‹Ý˜[YNˆ›[‹Ú[™[Žˆ´/4.ÈŸJKKšœÞ
›Ü[Ûˆ‹Ý˜[YNˆ™È‹Ú[™[Žˆ´,ÈŸJW_J_JKKšœÞ
™Ø]šY[ÛX™[ˆ´)4,4`t/´,´.´,‹Ú[™[ŽšKšœÞ
š[œ]‹Ý\Nˆ›[X™\ˆ‹Ý\ˆŒŒH‹[œ][ÙNˆ™XÚ[X[‹˜[YN˜KœXÚØYÙP[[Ý[ÛÚ[™ÙN™O›
œXÚØYÙP[[Ý[‹\™Ù]˜[YJ_J_JW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËYÜšY‹Ú[™[Ž–ÚKšœÞ
™Ø]šY[ÛX™[ˆ´(t-t.taô,4`H‹Ú[™[ŽšKšœÞ
š[œ]‹Ý\Nˆ›[X™\ˆ‹Ý\ˆŒŒH‹[œ][ÙNˆ™XÚ[X[‹˜[YN˜K˜Ý\œ™[ÝØÚËÛÚ[™ÙN™O›
˜Ý\œ™[ÝØÚÈ‹\™Ù]˜[YJ_J_JKKšœÞ
™Ø]šY[ÛX™[ˆ´'4.4/t.4/4,4.ôc4/tbô.H4/´`t`´,4`´/´.ˆ‹Ú[™[ŽšKšœÞ
š[œ]‹Ý\Nˆ›[X™\ˆ‹Ý\ˆŒŒH‹[œ][ÙNˆ™XÚ[X[‹˜[YN˜K›Z[š[][TÝØÚËÛÚ[™ÙN™O›
›Z[š[][TÝØÚÈ‹\™Ù]˜[YJ_J_JW_JKKšœÞ
™Ø]šY[ÛX™[ˆ´(ô-´-H4-ô,4.´,4-ô,4/t/ˆ‹Ú[™[ŽšKšœÞ
š[œ]‹Ý\Nˆ›[X™\ˆ‹Ý\ˆŒŒH‹[œ][ÙNˆ™XÚ[X[‹˜[YN˜K›Û“Ü™\‹ÛÚ[™ÙN™O›
›Û“Ü™\ˆ‹\™Ù]˜[YJ_J_JKKšœÞ
™Ø]šY[ÛX™[ˆ´(t`´,4`´`ô`H‹Ú[™[ŽšKšœÞÊœÙ[XÝ‹Ý˜[YN˜K˜XÝ]™OOOHLOÈ˜\˜Ú]™YŽˆ˜XÝ]™H‹ÛÚ[™ÙN™O›
˜XÝ]™H‹\™Ù]˜[YOOOH˜XÝ]™HŠKÚ[™[Ž–ÚKšœÞ
›Ü[Ûˆ‹Ý˜[YNˆ˜XÝ]™H‹Ú[™[Žˆ´$4.´`´.4,´-t/HŸJKKšœÞ
›Ü[Ûˆ‹Ý˜[YNˆ˜\˜Ú]™Y‹Ú[™[Žˆ´$ˆ4,4`4at.4,´-HŸJW_J_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÚY]XXÝ[ÛœÈ‹Ú[™[Ž–ÚKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË\ÙXÛÛ™\žH‹ÛÛXÚÎ›‹Ú[™[Žˆ´'´`´/4-t/t,ŸJKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË\š[X\žH‹\ØX›YˆXK›˜[YKš[J
KÛÛXÚÎKÚ[™[Žˆ´(t/´at`4,4/t.4`´cŸJW_JW_JW_J_J_B™[˜Ý[Ûˆ™Ø][ÙÔYÙJ
^ØÛÛœÝËWOX

KÚ\Ô™XYNOPZJ
KÝØ\Ý›ŸO\ÛŠ
KÜ‹WOTË\ÙTÝ]J

OO–È›Y[H‹œ™XÚ\\È‹›™YYÈ—Kš[˜ÛY\ÊÚ[™ÝË˜™™XY˜]šYØ][Û”]Y\žJXˆ‹›Y[HŠJOÝÚ[™ÝË˜™™XY˜]šYØ][Û”]Y\žJXˆ‹›Y[HŠNˆ›Y[HŠKÜËOTË\ÙTÝ]J

OO˜™Ø]Ý]JŠ™Ø][ÙÔÝÜ™RÙ^JJJKÝKOTË\ÙTÝ]J

OO˜™Ø]\œ˜^JŠ™\˜Ú\ÙTÝÜ™RÙ^JJJKÙ‹WOTË\ÙTÝ]J[
KÚ×OTË\ÙTÝ]J[
KÞK—OTË\ÙTÝ]J[
KÝ‹—OTË\ÙTÝ]J[
KÓ‹WOTË\ÙTÝ]J[
K×ËOTË\ÙTÝ]JLJKÐK×OTË\ÙTÝ]JˆŠKÓËWOTË\ÙTÝ]JLJKÐËOTË\ÙTÝ]J×JKØ™\ØÛÜÝ\™K™Ù]\ØÛÜÝ\™WOTË\ÙTÝ]J™Ø]™XY\ØÛÜÝ\™JKØ™ÝXÝ\™SÜ[‹™Ù]ÝXÝ\™SÜ[—OTË\ÙTÝ]JLJKTË\ÙT™YŠ[
KTË\ÙT™YŠ[
KTË\ÙT™YŠ[
K]\[ÙˆÚ[™ÝË˜™\ÐÛY[\›Z\ÜÚ[ÛOOH™[˜Ý[ÛˆÝÚ[™ÝË˜™\ÐÛY[\›Z\ÜÚ[ÛŠš[™[ÜžK›X[˜YÙHŠN›ØØ[ÝÜ˜YÙK™Ù]][J˜™ØXÝ]™WÜ›ÛHŠOOOH›ÝÛ™\ˆŽÔË\ÙQY™™XÝ


OOžÝÚ[™ÝË˜™Þ[˜Ó˜]šYØ][Û”]Y\žJÝXŽœOOH›Y[HÛ[œŸJ_KÜ—JNÔË\ÙQY™™XÝ


OOžÝ	‰Š
™Ø]Ý]JŠ™Ø][ÙÔÝÜ™RÙ^JJJK
™Ø]\œ˜^JŠ™\˜Ú\ÙTÝÜ™RÙ^JJJJ_KÝJNØÛÛœÝOTË\ÙSY[[Ê

OO˜™Ø]X]Ú[™Ô›ÙXÝÕŒN
Ë™Ø]\˜Ú\ÙT›ÙXÝÊJJKÜËWJKTË\ÙSY[[Ê

OO˜™Ø]™XY[™\ÜÊÊKÜ×JKOTË\ÙSY[[Ê

OO˜™Ø]™YYÊËJKÜËWJK™Y[QÜ›Ý\ÏTË\ÙSY[[Ê

OO˜™Ø]Y[QÜ›Ý\ÊË›Y[R][\ËË™Ü›Ý\ËËœÝX™Ü›Ý\ÊKÜË›Y[R][\ËË™Ü›Ý\ËËœÝX™Ü›Ý\×JK™ÙÙÛQ\ØÛÜÝ\™OJÊOOžØ™Ù]\ØÛÜÝ\™JOOžØÛÛœÝ^Ë‹‹’KÜNˆX™Ø]\ÓÜ[ŠKÊ_NÝž^ÛØØ[ÝÜ˜YÙKœÙ]][J
™Ø]\ØÛÜÝ\™RÙ^JK”ÓÓ‹œÝš[™ÚYžJŠJ_XØ]Úß\™]\›ˆŸJ_KX\Þ[˜ÊÊOOžØÛÛœÝO^Ë‹‹˜™Ø]Ý]JÊK\]Y]›™]È]J
KÒTÓÔÝš[™Ê
_NÛ
JKÜÙJ™Ø][ÙÔÝÜ™RÙ^KJNØÛÛœÝX]ØZ]\Š™Ø][ÙÔÝÜ™RÙ^KJNÛŠÝ˜\šX[”ÈœÝXØÙ\ÜÈŽˆ™Y˜][‹]Nœ\ØÜš\[ÛŽ”È´%4,4/t/tbô-H4`t/´at`4,4/t-t/tbÈ4,ˆ4,4.´.´,4`ô/t`´-H4-ô,4,´-t-4-t/t.4cËˆŽˆ´&4-ô/4-t/t-t/t.4-H4`t/´at`4,4/t-t/t/ˆ4.4,t`ô-4-t`ˆ4`t.4/tat`4/´/t.4-ô.4`4/´,´,4/t/ˆ4/ô`4.4,´/´`t`t`´,4/t/´,´.ô-t/t.4.4`t,´cô-ô.ˆŸJ_KX\Þ[˜ÊÏH\ØYŠOOžØÛÛœÝOP\œ˜^Kš\Ð\œ˜^J
OÜ–ÜNÚYŠRK›[™ÝS
\™]\›ŽÚÊÏOOH˜Ø[Y\˜HÈ´)ô.4`´,4cˆ4a4/´`´/´,ô`4,4a4.4cˆ4/4-t/tc¸ )ˆŽ˜ÏOOH™Ø[\žHÈ´$ô/´`´/´,´.ôcˆŠÒK›[™Ý
Èˆ4`t`´`4,4/t.4aˆ4/4-t/tc¸ )ˆŽˆ´(4,4`t/ô/´-ô/t,4cˆ4/4-t/tcˆ4.4a´-t/tbø )ˆŠNÝž^ÚYŠK™]™\žJO˜™ÛY[[XYÙR[™›ÊŠKš\Ò[XYÙJJ^ØÛÛœÝX]ØZ]™Ø][ÙÔÝYÙR[XYÙ\ÊKËÊNÝž^ØÛÛœÝÏX]ØZ]™Ø][ÙÔ™XÛÙÛš\ÙR[XYÙ\Ê‹ËÊNÛJÊ_XØ]Ú
Ê^Ø]ØZ]™Ø][ÙÑ[]Qš[\Ê‹›X\
O’šY
JNÝ›ÝÈß\™]\›ŸXÛÛœÝRVÌKÏ[™]È›Ü›Q]NÑË˜\[™
™š[H‹‹™\ØYš[S˜[YJ‹›Y[KYš[HŠJKË˜\[™
œÛÝ\˜ÙH‹ÊNØÛÛœÝX]ØZ]™]Ú
‹Ø\KØØ][ÙËÚ[\Ü‹ÛY]Ùˆ”ÔÕ‹›ÙN‘ßJKX]ØZ]™\ØY™\ÜÛœÙRœÛÛŠ´'t-H4`ô-4,4.ô/´`tc4`4,4`t/ô/´-ô/t,4`´c4/4-t/tcˆŠNÛJ‹™˜Y
_XØ]Ú
Š^ÛŠÝ˜\šX[ˆ™\œ›Üˆ‹]Nˆ´'4-t/tcˆ4/t-H4`4,4`t/ô/´-ô/t,4/t/ˆ‹\ØÜš\[ÛŽ”ˆ[œÝ[˜Ù[Ùˆ\œ›ÜÔ‹›Y\ÜØYÙNˆ´'ô/´/ô`4/´,t`ô.t`´-H4,t/´.ô-t-H4aôdt`´.´/´-H4a4/´`´/ˆ4.4.ô.4-4`4`ô,ô/´.H4a4,4.t.ËˆŸJ_Yš[˜[^ÚÊˆŠ__KOX\Þ[˜ÈOžÚÊ´'´`´.´`4bô,´,4cˆ4`t`tbô.ô.´`È4.4.4-ô,´.ô-t.´,4cˆ4,4`t`t/´`4`´.4/4-t/t`¸ )ˆŠNÝž^ØÛÛœÝÏX]ØZ]™]Ú
‹Ø\KØØ][ÙËÚ[\Ü‹ÛY]Ùˆ”ÔÕ‹XY\œÎžÈÛÛ[U\HŽˆ˜\XØ][Û‹ÚœÛÛˆŸK›ÙN’”ÓÓ‹œÝš[™ÚYžJÝ\›œJ_JKOX]ØZ]ËšœÛÛŠ
NÚYŠXË›ÚßRK›ÚÊ]›ÝÈ™]È\œ›ÜŠK™\œ›ÜŸ´'t-H4`ô-4,4.ô/´`tc4/ô`4/´aô.4`´,4`´c4`t`tbô.ô.´`ÈŠNÛJK™˜Y
KJLJ_XØ]Ú
Ê^ÛŠÝ˜\šX[ˆ™\œ›Üˆ‹]Nˆ´(t`tbô.ô.´,4/t-H4/ô`4/´aô.4`´,4/t,‹\ØÜš\[ÛŽ˜È[œÝ[˜Ù[Ùˆ\œ›ÜØË›Y\ÜØYÙNˆ´'ô`4/´,´-t`4c4`´-H4,4-4`4-t`KˆŸJ_Yš[˜[^ÚÊˆŠ__KX\Þ[˜ÈOžØÛÛœÝÏVË‹‹Š˜Ý\œ™[\™Ù]™š[\ß×JWKO\˜Ý\œ™[\™Ù]Ü˜Ý\œ™[\™Ù]˜[YOHˆŽÚYŠXË›[™Ý
\™]\›ŽÚYŠOOOQ‹˜Ý\œ™[
^Þ
O–Ë‹‹”‹‹‹˜×KœÛXÙJLŠJNÜ™]\›ŸX]ØZ]ŠËOOOQ˜Ý\œ™[È˜Ø[Y\˜HŽˆ\ØYŠ_KÏX\Þ[˜Ê
OOžØÛÛœÝYŽÛJ[
NØÛÛœÝÏX™Ø]\œ˜^JËœÛÝ\˜ÙQš[RYÏË›[™ÝÜœÛÝ\˜ÙQš[RYÎ–ÜËœÛÝ\˜ÙQš[RYJK™š[\Š›ÛÛX[ŠNÙ›ÜŠÛÛœÝHÙˆÊ]ž^Ø]ØZ]™]Ú
‹Ø\KØØ][ÙËÙš[\ËÈŠÙ[˜ÛÙUT’PÛÛ\Û™[
JKÛY]Ùˆ‘SUHŸJ_XØ]Úß_KOX\Þ[˜Ê
OOžÚYŠYŠ\™]\›ŽÕ
L
NÝž^ØÛÛœÝX™Ø]Ý]JÊKÏ[™]ÈX\
›Y[R][\Ë›X\
O–Ø™›ØÓ›Ü›J‹›˜[YJK—JJKO^ßNÙ›ÜŠÛÛœÝ™˜]ÓY[R][UŒŽNÙˆ‹›Y[R][\Ê^ØÛÛœÝX™Y[PÛX[’][UŒŽN
™˜]ÓY[R][UŒŽN
KÏXË™Ù]
™›ØÓ›Ü›J‹›˜[YJJKUÏËšY‹šYÒVÔ‹šYORŽØÛÛœÝÏ^Ë‹‹•Ë‹‹”‹Y’‹[›™YØ[\Î•ÏËœ[›™YØ[\ÏÏÔ‹œ[›™YØ[\ÏÏÌÜ™X]Y]•ÏË˜Ü™X]Y]™]È]J
KÒTÓÔÝš[™Ê
K\]Y]›™]È]J
KÒTÓÔÝš[™Ê
_NØËœÙ]
™›ØÓ›Ü›JË›˜[YJKÊ_XÛÛœÝVË‹‹œœ™XÚ\\×NÙ›ÜŠÛÛœÝÈÙˆ™Ø]\œ˜^J‹œ™XÚ\\ÊJ^ØÛÛœÝRVÕË›Y[R][RYNÚYŠRŠXÛÛ[YNØÛÛœÝÏT‹™š[™[™^
O”›Y[R][RYOORŠKÙO^Ë‹‹•ËY’ÏLÔ–Ò×KšY•ËšYY[R][RY’‹Ý]\Î’ÏL	‰”–Ò×KœÝ]\ÏOOH˜ÛÛ™š\›YYÈ˜ÛÛ™š\›YYŽˆ™˜Y‹ÛÝ\˜ÙNˆ˜ZH‹\]Y]›™]È]J
KÒTÓÔÝš[™Ê
_NÒÏLÔ–Ò×KœÝ]\ÈOOH˜ÛÛ™š\›YY‰‰Š–Ò×OXÙJN”‹œ\Ú
ÙJ_XÛÛœÝÏ^Ë‹‹œY[R][\Î–Ë‹‹˜Ë˜[Y\Ê
WK™XÚ\\Î”‹ÛÝ\˜Ù\Î–ÞÚY™‹šYÛÝ\˜ÙQš[RY™‹œÛÝ\˜ÙQš[RYÛÝ\˜ÙQš[RYÎ™‹œÛÝ\˜ÙQš[RYËÛÝ\˜ÙU\›™‹œÛÝ\˜ÙU\›˜[YN™‹œÛÝ\˜ÙQš[S˜[Y_‹™[YS˜[Y_´'4-t/tcˆ‹ÛÝ\˜ÙN™‹œÛÝ\˜ÙKYÙPÛÝ[™‹œYÙPÛÝ[‹œÛÝ\˜ÙQš[RYÏË›[™ÝK[\ÜY]›™]È]J
KÒTÓÔÝš[™Ê
_K‹‹œœÛÝ\˜Ù\Ë™š[\ŠO’‹œÛÝ\˜ÙQš[RYOOY‹œÛÝ\˜ÙQš[RY
WKœÛXÙJÌ
_NØ]ØZ]Š´'4-t/tcˆ4-4/´,t,4,´.ô-t/t/ˆ‹ÊKJ[
KŠÝ˜\šX[ˆœÝXØÙ\ÜÈ‹]Nˆ´'ô`4/´,´-t`4c4`´-H4`´-tat.´,4`4`´bÈ‹\ØÜš\[ÛŽˆ´&4&t,´-t`4`t.4.4`t/´at`4,4/t-t/tbÈ4.´,4.ˆ4aô-t`4/t/´,´.4.´.4.4/ô/´.´,4/t-H4,´.ô.4côc´`ˆ4/t,4-ô,4.´`ô/ô/´aô/tbô.H4`4,4`taôdt`‹ˆŸJ_Yš[˜[^Õ
LJ__KYOX\Þ[˜ÈOžØÛÛœÝÏX™Ø]Ý]JŠ™Ø][ÙÔÝÜ™RÙ^J_ÊKOXË›Y[R][\ËœÛÛYJO”‹šYOO\šY
OØË›Y[R][\Ë›X\
O”‹šYOO\šYÜ”ŠN–Ü‹‹˜Ë›Y[R][\×K\\OOOHœÙ\šXÙHØËœ™XÚ\\Ë™š[\ŠÏO•Ë›Y[R][RYOO\šY
N˜Ëœ™XÚ\\ÎØ]ØZ]Š´'ô/´-ô.4a´.4cÈ4`t/´at`4,4/t-t/t,‹Ë‹‹˜ËY[R][\Î’K™XÚ\\Î”ŸJ_KÙOX\Þ[˜ÊÊOOžØÛÛœÝOX™Ø]Ý]JÊKRKœ™XÚ\\ËœÛÛYJÏO•ËšYOO\šY
OÒKœ™XÚ\\Ë›X\
ÏO•ËšYOO\šYÜ•ÊN–Ü‹‹’Kœ™XÚ\\×KÏ[™]ÈX\
KœÝØÚÐ˜[[˜Ù\Ë›X\
O–Ò‹šÙ^K—JJNÙ›ÜŠÛÛœÝˆÙˆÊUËœÙ]
‹šÙ^KË‹‹•Ë™Ù]
‹šÙ^JK‹‹’ŸJNØ]ØZ]ŠœÝ]\ÏOOH˜ÛÛ™š\›YYÈ´(´-tat.´,4`4`´,4/ô/´-4`´,´-t`4-´-4-t/t,Žˆ´)ô-t`4/t/´,´.4.ˆ4`t/´at`4,4/tdt/H‹Ë‹‹’K™XÚ\\Î”‹ÝØÚÐ˜[[˜Ù\Î–Ë‹‹•Ë˜[Y\Ê
W_J_KYOX\Þ[˜ÈOžØÛÛœÝÏX™Ø]Ý]JÊKOXËš[\›˜[][\ËœÛÛYJO”‹šYOO\šY
OØËš[\›˜[][\Ë›X\
O”‹šYOO\šYÜ”ŠN–Ü‹‹˜Ëš[\›˜[][\×NØ]ØZ]Š´(4,4`tat/´-4/t.4.ˆ4`t/´at`4,4/tdt/H‹Ë‹‹˜Ë[\›˜[][\Î’_J_KOX\Þ[˜ÈOžØ]ØZ]Š´'ô-t`4.4/´-4`4,4`taôdt`´,4.4-ô/4-t/tdt/H‹Ë‹‹œËÜš^›Û‘^\Î“[X™\Š
_J_NÜ™]\›ˆKšœÞÊK‘œ˜YÛY[ØÚ[™[Ž–ÚKšœÞ
ÜÚÝÐ›ÝÛS˜]ŽˆLÚ[™[ŽšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙÈ‹Ú[™[Ž–ÚKšœÞÊšXY\ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËZXY\ˆ‹Ú[™[Ž–ÚKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙËX˜XÚÈ‹ÛÛXÚÎŠ
OOÚ[™ÝË˜™˜]šYØ]P˜XÚÊ‹Û[Ü™HŠK˜\šXK[X™[Žˆ´'t,4-ô,4-‹Ú[™[Žˆ¸¡¤ŸJKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË]]H‹Ú[™[Ž–ÚKšœÞ
šH‹ØÚ[™[Žˆ´$4`t`t/´`4`´.4/4-t/t`ˆ4.4`´-tat.´,4`4`´bÈŸJKKšœÞ
œ‹ØÚ[™[Žˆ´)ô`´/ˆ4/ô`4/´-4,4dt/4.4-È4aô-t,ô/ˆ4,ô/´`´/´,´.4/4.4aô`´/ˆ4-ô,4.´`ô/ô,4`´cŸJW_JK	‰šKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË\\È‹ÛÛXÚÎŠ
OO™ÊßJK˜\šXK[X™[Žˆ´%4/´,t,4,´.4`´c4/ô/´-ô.4a´.4cˆ‹Ú[™[ŽˆŠÈŸJW_JKKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËZ\›È‹Ú[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËY^YXœ›ÝÈ‹Ú[™[Žˆ´'´`t/t/´,´,4-ô,4.´`ô/ô/´aô/t/´,ô/ˆ4/ô`4/´,ô/t/´-ô,ŸJKKšœÞ
šˆ‹ØÚ[™[Žˆ´%ô,4,ô`4`ô-ô.4`´-H4/4-t/tcˆ8 %˜\‘ØÝÜˆ4`t/´,t-t`4dt`ˆ4,4`t`t/´`4`´.4/4-t/t`ˆŸJKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËZ\›ËXÛÜH‹Ú[™[Žˆ´'ô/´-ô.4a´.4.4.4a´-t/tbÈ4`4,4`t/ô/´-ô/t,4c´`´`tcÈ4,4,´`´/´/4,4`´.4aô-t`t.´.ˆ4(4-ta´-t/ô`´`ô`4bÈ4`t/´at`4,4/tcôc´`´`tcÈ4`´/´.ôc4.´/ˆ4.´,4.ˆ4aô-t`4/t/´,´.4.´.4-4/ˆ4,´,4b4-t.H4/ô`4/´,´-t`4.´.ˆŸJKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË\š[X\žH‹\ØX›YˆSÛÛXÚÎŠ
OO‘‹˜Ý\œ™[Ë˜ÛXÚÊ
KÚ[™[Žˆ¼'å¯4$´bô,t`4,4`´c4a4/´`´/ˆ4/4-t/tcˆŸJW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËZ[\ÜXXÝ[ÛœÈ‹Ú[™[Ž–ÚKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙËZ[\ÜXXÝ[Ûˆ‹\ØX›YˆSÛÛXÚÎŠ
OO‘˜Ý\œ™[Ë˜ÛXÚÊ
KÚ[™[Ž–ÚKšœÞ
˜ˆ‹ØÚ[™[Žˆ´&´,4/4-t`4,ŸJKKšœÞ
œÛX[‹ØÚ[™[Žˆ´(t/tcô`´c4/´-4/t`È4`t`´`4,4/t.4a´`ÈŸJW_JKKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙËZ[\ÜXXÝ[Ûˆ‹\ØX›YˆSÛÛXÚÎŠ
OO‘‹˜Ý\œ™[Ë˜ÛXÚÊ
KÚ[™[Ž–ÚKšœÞ
˜ˆ‹ØÚ[™[Žˆ´$ô,4.ô-t`4-tcÈŸJKKšœÞ
œÛX[‹ØÚ[™[Žˆ´$´bô,t`4,4`´c4/t-t`t.´/´.ôc4.´/ˆ4a4/´`´/ˆŸJW_JKKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙËZ[\ÜXXÝ[Ûˆ‹\ØX›YˆSÛÛXÚÎŠ
OOž‹˜Ý\œ™[Ë˜ÛXÚÊ
KÚ[™[Ž–ÚKšœÞ
˜ˆ‹ØÚ[™[Žˆ´)4,4.t.ÈŸJKKšœÞ
œÛX[‹ØÚ[™[Žˆ”‹^Ù[4.4.ô.ÔÕˆŸJW_JKKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙËZ[\ÜXXÝ[Ûˆ‹\ØX›YˆSÛÛXÚÎŠ
OO“JL
KÚ[™[Ž–ÚKšœÞ
˜ˆ‹ØÚ[™[Žˆ´(t`tbô.ô.´,ŸJKKšœÞ
œÛX[‹ØÚ[™[Žˆ´'ô`ô,t.ô.4aô/t,4cÈ4`t`´`4,4/t.4a´,4/4-t/tcˆŸJW_JW_JKKšœÞ
š[œ]‹Ü™YŽ‘\Nˆ™š[H‹XØÙ\ˆš[XYÙKÊˆ‹Ø\\™Nˆ™[š\›Û›Y[‹Y[ŽˆLÛÚ[™ÙN’JKKšœÞ
š[œ]‹Ü™YŽž‹\Nˆ™š[H‹XØÙ\ˆ‹œ‹˜ÜÝ‹Ý‹žËžÞš[šH‹Y[ŽˆLÛÚ[™ÙN’JKKšœÞ
š[œ]‹Ü™YŽ‘‹\Nˆ™š[H‹XØÙ\ˆš[XYÙKÊˆ‹][\NˆLY[ŽˆLÛÚ[™ÙN’JKKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\™XY[™\ÜÈ‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\™XY[™\ÜËZXY‹Ú[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÚ[™[Žˆ´$ô/´`´/´,´/t/´`t`´c4-ô,4.´`ô/ô/´aô/t/´,ô/ˆ4`4,4`taôdt`´,ŸJKKšœÞÊœÝ›Û™È‹ØÚ[™[Ž–Ð‹œØÛÜ™K‰H—_JW_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\›ÙÜ™\ÜÈ‹Ú[™[ŽšKšœÞ
šH‹ÜÝ[NžÝÚY‹œØÛÜ™JÈ‰HŸ_J_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\™XY[™\ÜËYÜšY‹Ú[™[Ž–ÚKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÚKšœÞÊ˜ˆ‹ØÚ[™[Ž–Ð‹œ™XÚ\\Ë‹È‹‹Ý[_JK´`´-tat.´,4`4`´bÈ—_JKKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÚKšœÞÊ˜ˆ‹ØÚ[™[Ž–Ð‹œ[œË‹È‹‹Ý[_JK´/ô.ô,4/tbÈ—_JKKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÚKšœÞÊ˜ˆ‹ØÚ[™[Ž–Ð‹›[šÙY‹È‹‹š[™Ü™YY[×_JK´`t,´cô-ô.—_JKKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÚKšœÞÊ˜ˆ‹ØÚ[™[Ž–Ð‹œÝØÚË‹È‹‹š[™Ü™YY[×_JK´/´`t`´,4`´.´.—_JW_JW_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË]XœÈ‹Ú[™[Ž–ÖÈ›Y[H‹´'4-t/tcˆ—KÈœ™XÚ\\È‹´(´-tat.´,4`4`´bÈ—KÈ›™YYÈ‹´&ˆ4-ô,4.´`ô/ô.´-H—WK›X\

Ü×JOOšKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË]XˆŠÊOO\È˜XÝ]™HŽˆˆŠKÛÛXÚÎŠ
OO˜J
KÚ[™[Ž˜ßK
J_JKOOH›Y[H‰‰šKšœÞÊK‘œ˜YÛY[ØÚ[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÙXÝ[Û‹ZXY‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
šÈ‹ØÚ[™[Žˆ´'ô/´-ô.4a´.4.4-ô,4,´-t-4-t/t.4cÈŸJKKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÜË›Y[R][\Ë›[™Ýˆ4,´`t-t,ô/ˆ—_JW_JK	‰šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËZXYXXÝ[ÛœÈ‹Ú[™[Ž–ÚKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË[Z[šKXXÝ[Ûˆ‹ÛÛXÚÎŠ
OO™ÊßJKÚ[™[ŽˆŠÈ4'ô/´-ô.4a´.4cÈŸJKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË[Z[šKXXÝ[Ûˆ‹ÛÛXÚÎŠ
OO™J‹Û›ÛY[˜Û]\™OÝšY]Ï]^Û›Û^Iœ™]\›•ÏXØ][ÙÈŠKÚ[™[Žˆ´(4,4-ô-4-t.ôbÈŸJW_JW_JK	‰šKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË\ÝXÝ\™KYØ]]Ø^H‹ÛÛXÚÎŠ
OO™J‹Û›ÛY[˜Û]\™OÝšY]Ï]^Û›Û^Iœ™]\›•ÏXØ][ÙÈŠKÚ[™[Ž–ÚKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÚKšœÞ
˜ˆ‹ØÚ[™[Žˆ´(ô/ô`4,4,´.ô-t/t.4-H4`4,4-ô-4-t.ô,4/4.ŸJKKšœÞ
œÛX[‹ØÚ[™[Žˆ´'ô-t`4-t.4/4-t/t/´,´,4`´c4.4.ô.4/ô-t`4-t/t-t`t`´.4`4,4-ô-4-t.È4.4/ô/´-4`4,4-ô-4-t.È4,´/4-t`t`´-H4`H4/ô/´-ô.4a´.4cô/4.ŸJW_JKKšœÞ
œÝ›Û™È‹ØÚ[™[Žˆ´'´`´.´`4bô`´c8¡¤ˆŸJW_JKË›Y[R][\Ë›[™ÝÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËY\\Y[È‹Ú[™[Ž˜™Y[QÜ›Ý\Ë›X\
OžØÛÛœÝÏHœÙXÝ[ÛŽˆŠÜšYOX™Ø]\ÓÜ[Š™\ØÛÜÝ\™KËœÙXÝ[ÛˆŠNÜ™]\›ˆKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËY\\Y[ŠÊOÈ›Ü[ˆŽˆˆŠKÚ[™[Ž–ÚKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙËY\\Y[]ÙÙÛH‹ÛÛXÚÎŠ
OO˜™ÙÙÛQ\ØÛÜÝ\™JËœÙXÝ[ÛˆŠK˜\šXKY^[™YŽ’KÚ[™[Ž–ÚKšœÞÊœÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËY\\Y[]]H‹Ú[™[Ž–ÚKšœÞ
šH‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËY\\Y[YÝŠÊ›YØXÞQ\\Y[˜Ý\ÝÛHŠ_JKKšœÞ
˜ˆ‹ØÚ[™[Žœ›˜[Y_JW_JKKšœÞÊœÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË]ÙÙÛK[Y]H‹Ú[™[Ž–ÜÝ[
Èˆ4/ô/´-Ëˆ‹KšœÞ
šH‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËXÚ]œ›Ûˆ‹Ú[™[Žˆ¸£!ŸJW_JW_JKI‰šKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÝXœÙXÝ[ÛœÈ‹Ú[™[ŽœœÝXœÙXÝ[ÛœË›X\
ÏOžØÛÛœÝOHœÝXœÙXÝ[ÛŽˆŠØËšYX™Ø]\ÓÜ[Š™\ØÛÜÝ\™KKœÝXœÙXÝ[ÛˆŠNÜ™]\›ˆKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÝXœÙXÝ[ÛˆŠÊÈ›Ü[ˆŽˆˆŠKÚ[™[Ž–ÚKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË\ÝXœÙXÝ[Û‹]ÙÙÛH‹ÛÛXÚÎŠ
OO˜™ÙÙÛQ\ØÛÜÝ\™JKœÝXœÙXÝ[ÛˆŠK˜\šXKY^[™YŽ”‹Ú[™[Ž–ÚKšœÞ
˜ˆ‹ØÚ[™[Ž˜Ë›˜[Y_JKKšœÞÊœÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË]ÙÙÛK[Y]H‹Ú[™[Ž–ØËš][\Ë›[™Ý
Èˆ4/ô/´-Ëˆ‹KšœÞ
šH‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËXÚ]œ›Ûˆ‹Ú[™[Žˆ¸£!ŸJW_JW_JK‰‰šKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÝXœÙXÝ[Û‹[\Ý‹Ú[™[Ž˜Ëš][\Ë›X\
ÏOžØÛÛœÝX™Ø]™XÚ\Q›ÜŠËËœ™XÚ\\ÊNÜ™]\›ˆKšœÞÊ˜\XÛH‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËXØ\™‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËXØ\™]Ü‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
š‹ØÚ[™[Ž•Ë›˜[Y_JKKšœÞÊœ‹ØÚ[™[Ž–ØË›˜[YK™Y[TØ[TÚ^™U^ŒŽN
ËœØ[TÚ^™_™Y[SYØXÞTÚ^™UŒŽN
Ë›YØXÞTÜ[Û”Ú^™_ËœÜ[Û”Ú^™JJOÈˆ0­ÈŠØ™Y[TØ[TÚ^™U^ŒŽN
ËœØ[TÚ^™_™Y[SYØXÞTÚ^™UŒŽN
Ë›YØXÞTÜ[Û”Ú^™_ËœÜ[Û”Ú^™JJNˆˆ—_JW_JKKšœÞ
œÝ›Û™È‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËXØ\™X[[Ý[‹Ú[™[Ž˜™›ØÓ[Û™^JËœØ[TšXÙKË˜Ý\œ™[˜Þ_”•PˆŠ_JW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËXÚ\È‹Ú[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËXÚ\‹Ú[™[Ž˜™Ø]\SX™[
Ë\J_JKË\HOOHœÙ\šXÙH‰‰šKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËXÚ\ŠÊËœÝ]\ÏOOH˜ÛÛ™š\›YYÈ™ÛÛÙŽˆØ\›ˆŠKÚ[™[Ž’ËœÝ]\ÏOOH˜ÛÛ™š\›YYÈ´(´-tat.´,4`4`´,4,ô/´`´/´,´,Žˆ´'t-t`ˆ4`´-tat.´,4`4`´bÈŸJKË\HOOHœÙ\šXÙH‰‰šKšœÞÊœÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËXÚ\ŠÊ™Ø][X™\ŠËœ[›™YØ[\ÊOŒÈ™ÛÛÙŽˆ˜˜YŠKÚ[™[Ž–È´'ô.ô,4/H‹™Ø][X™\ŠËœ[›™YØ[\ÊW_JKË˜XÝ]™OOOHLI‰šKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËXÚ\‹Ú[™[Žˆ´$4`4at.4,ˆŸJW_JK	‰šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËXØ\™XXÝ[ÛœÈ‹Ú[™[Ž–ÕË\HOOHœÙ\šXÙH‰‰šKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË[[šÈ‹ÛÛXÚÎŠ
OOšŠÊKÚ[™[Ž’È´(4-t-4,4.´`´.4`4/´,´,4`´c4`´-tat.´,4`4`´`ÈŽˆ´(t/´-ô-4,4`´c4`´-tat.´,4`4`´`ÈŸJKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË[[šÈ‹ÛÛXÚÎŠ
OO™ÊÊKÚ[™[Žˆ´&4-ô/4-t/t.4`´c4/ô/´-ô.4a´.4cˆŸJW_JW_KËšY
_J_JW_KËšY
_J_JW_KšY
_J_JNšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËY[\H‹Ú[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Žˆ´$4`t`t/´`4`´.4/4-t/t`ˆ4/ô/´.´,4/ô`ô`t`ˆŸJKKšœÞ
œ‹ØÚ[™[Žˆ´%ô,4,ô`4`ô-ô.4`´-H4/4-t/tcˆ4.4.ô.4`t/´-ô-4,4.t`´-H4/ô-t`4,´`ôcˆ4/ô/´-ô.4a´.4cˆ4,´`4`ôaô/t`ôc‹ˆŸJK	‰šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËY[\KXXÝ[ÛœÈ‹Ú[™[Ž–ÚKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË\š[X\žH‹ÛÛXÚÎŠ
OO™ÊßJKÚ[™[ŽˆŠÈ4%4/´,t,4,´.4`´c4/ô/´-ô.4a´.4cˆŸJKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË\ÙXÛÛ™\žH‹ÛÛXÚÎŠ
OO™J‹Û›ÛY[˜Û]\™OÝšY]Ï]^Û›Û^Iœ™]\›•ÏXØ][ÙÈŠKÚ[™[Žˆ´'t,4`t`´`4/´.4`´c4`t`´`4`ô.´`´`ô`4`ÈŸJW_JW_JKËœÛÝ\˜Ù\Ë›[™ÝŒ	‰šKšœÞÊK‘œ˜YÛY[ØÚ[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÙXÝ[Û‹ZXY‹Ú[™[Ž–ÚKšœÞ
šÈ‹ØÚ[™[Žˆ´&4`t`´/´aô/t.4.´.4/4-t/tcˆŸJKKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÜËœÛÝ\˜Ù\Ë›[™Ýˆ4a4,4.t.ô/´,ˆ—_JW_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË[\Ý‹Ú[™[ŽœËœÛÝ\˜Ù\ËœÛXÙJJK›X\
OšKšœÞÊ˜\XÛH‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËXØ\™‹Ú[™[Ž–ÚKšœÞ
š‹ØÚ[™[Žœ›˜[Y_´'4-t/tcˆŸJKKšœÞ
œ‹ØÚ[™[Ž›™]È[‘]U[YQ›Ü›X]
œKT•H‹Ù^NˆŒ‹YYÚ]‹[ÛˆœÚÜ‹YX\Žˆ›[Y\šXÈŸJK™›Ü›X]
™]È]Jš[\ÜY]
J_JK
œYÙPÛÝ[JOŒI‰šKšœÞÊœ‹ØÚ[™[Ž–ÜœYÙPÛÝ[ˆ4`t`´`4,4/t.4aˆ4-ô,4,ô`4`ô-´-t/t/ˆ—_JKœÛÝ\˜ÙU\›	‰šKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËXØ\™XXÝ[ÛœÈ‹Ú[™[ŽšKšœÞ
˜H‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË[[šÈ‹™YŽœœÛÝ\˜ÙU\›\™Ù]ˆ—Ø›[šÈ‹™[ˆ››Ü™Y™\œ™\ˆ‹Ú[™[Žˆ´'´`´.´`4bô`´c4.4`t`´/´aô/t.4.ˆ8¡¤ˆŸJ_JW_KšY
J_JW_JW_JKOOHœ™XÚ\\È‰‰šKšœÞÊK‘œ˜YÛY[ØÚ[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÙXÝ[Û‹ZXY‹Ú[™[Ž–ÚKšœÞ
šÈ‹ØÚ[™[Žˆ´(´-tat.´,4`4`´bÈŸJKKšœÞ
œÜ[ˆ‹ØÚ[™[Žˆ´/t/´`4/4bÈ4/t,4/´-4/t`È4/ô`4/´-4,4-´`ÈŸJW_JKË›Y[R][\Ë™š[\ŠOœ˜XÝ]™HOOHLI‰œ\HOOHœÙ\šXÙHŠK›[™ÝÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË[\Ý‹Ú[™[ŽœË›Y[R][\Ë™š[\ŠOœ˜XÝ]™HOOHLI‰œ\HOOHœÙ\šXÙHŠK›X\
OžØÛÛœÝÏX™Ø]™XÚ\Q›ÜŠËœ™XÚ\\ÊKOX™Ø]\œ˜^JÏËš[™Ü™YY[ÊKRK™š[\ŠÏO•Ëœ\˜Ú\ÙT›ÙXÝÙ^JK›[™ÝÜ™]\›ˆKšœÞÊ˜\XÛH‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËXØ\™‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËXØ\™]Ü‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
š‹ØÚ[™[Žœ›˜[Y_JKKšœÞÊœ‹ØÚ[™[Ž–ÒK›[™Ýˆ4.4/t,ô`4-t-4.4-t/t`´/´,ˆ0­È‹‹ˆ4`t,´cô-ô,4/tbÈ4`H4-ô,4.´`ô/ô.´,4/4.—_JW_JKKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËXÚ\ŠÊÏËœÝ]\ÏOOH˜ÛÛ™š\›YYÈ™ÛÛÙŽˆØ\›ˆŠKÚ[™[Ž˜ÏËœÝ]\ÏOOH˜ÛÛ™š\›YYÈ´'ô/´-4`´,´-t`4-´-4-t/t,Žˆ´)ô-t`4/t/´,´.4.ˆŸJW_JKXÉ‰šKšœÞ
œ‹ØÚ[™[Žˆ´(´-tat.´,4`4`´,4-tbtdH4/t-H4`t/´-ô-4,4/t,ˆ4$t-t-È4/t-tdH4/ô/´-ô.4a´.4cÈ4/t-H4`ôaô,4`t`´,´`ô-t`ˆ4,ˆ4`4,4`taôdt`´-H4/ô/´`´`4-t,t/t/´`t`´.ˆŸJK	‰šKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËXØ\™XXÝ[ÛœÈ‹Ú[™[ŽšKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË[[šÈ‹ÛÛXÚÎŠ
OOšŠ
KÚ[™[Ž˜ÏÈ´'ô`4/´,´-t`4.4`´c4.4.4-ô/4-t/t.4`´c8¡¤ˆŽˆ´(t/´-ô-4,4`´c4`´-tat.´,4`4`´`È8¡¤ˆŸJ_JW_KšY
_J_JNšKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËY[\H‹Ú[™[ŽšKšœÞ
œ‹ØÚ[™[Žˆ´(t/t,4aô,4.ô,4-4/´,t,4,´c4`´-H4/ô/´-ô.4a´.4.4/4-t/tc‹4-4.ôcÈ4.´/´`´/´`4bôaH4/t`ô-´/tbÈ4.4/t,ô`4-t-4.4-t/t`´bËˆŸJ_JW_JKOOH›™YYÈ‰‰šKšœÞÊK‘œ˜YÛY[ØÚ[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÙXÝ[Û‹ZXY‹Ú[™[Ž–ÚKšœÞ
šÈ‹ØÚ[™[Žˆ´(4,4`taôdt`ˆ4/ô/´`´`4-t,t/t/´`t`´.ŸJKKšœÞÊœÙ[XÝ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\\š[Ù‹˜[YNœËšÜš^›Û‘^\ËÛÚ[™ÙNœO™J\™Ù]˜[YJK\ØX›YˆSÚ[™[Ž–ÚKšœÞ
›Ü[Ûˆ‹Ý˜[YNËÚ[™[ŽˆÈ4-4/t-t.HŸJKKšœÞ
›Ü[Ûˆ‹Ý˜[YNŒMÚ[™[ŽˆŒM4-4/t-t.HŸJKKšœÞ
›Ü[Ûˆ‹Ý˜[YNŒÌÚ[™[ŽˆŒÌ4-4/t-t.HŸJW_JW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\Ý[[X\žH‹Ú[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÚ[™[Žˆ´(4-t.´/´/4-t/t-4,4a´.4cÈ4/ô/ˆ4`´-t.´`ôbt.4/4-4,4/t/tbô/ŸJKKšœÞÊœÝ›Û™È‹ØÚ[™[Ž–ÕK›™YYË›[™Ýˆ4/ô/´-ô.4a´.4.H4.ˆ4-ô,4.´`ô/ô.´-H—_JKKšœÞÊœ‹ØÚ[™[Ž–È´(4,4`taôdt`Žˆ4/ô.ô,4/H4/ô`4/´-4,4-ˆ0åÈ4`´-tat.´,4`4`´,
È4`4-t-ô-t`4,ˆ8¢$ˆ4/´`t`´,4`´/´.ˆ8¢$ˆ4`ô-´-H4-ô,4.´,4-ô,4/t/‹ˆ4'ô-t`4.4/´-ˆ‹ËšÜš^›Û‘^\Ëˆ4-4/t-t.Kˆ—_JW_JKKš\ÜÝY\Ë›[™ÝŒ	‰šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËZ\ÜÝYH‹Ú[™[Ž–È´(4,4`taôdt`ˆ4/t-t/ô/´.ô/tbô.Nˆ‹Kš\ÜÝY\ËœÛXÙJ
Kš›Ú[Šˆ0­ÈŠKKš\ÜÝY\Ë›[™ÝÈˆ0­È4-tbtdHŠÊKš\ÜÝY\Ë›[™ÝM
Nˆˆ—_JKK›™YYË›[™ÝÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË[\Ý‹Ú[™[Ž•K›™YYË›X\
OšKšœÞÊ˜\XÛH‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËXØ\™™XØ][ÙË[™YY‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËXØ\™]Ü‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
š‹ØÚ[™[Žœ›˜[Y_JKKšœÞ
œ‹ØÚ[™[Žœš[\›˜[È´$´/t`ô`´`4-t/t/t.4.H4`4,4`tat/´-4/t.4.ˆŽœœÝ\Y\“˜[Y_´'ô/´`t`´,4,´bt.4.ˆ4/t-H4/´/ô`4-t-4-t.ôdt/HŸJW_JKKšœÞ
œÝ›Û™È‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËXØ\™X[[Ý[‹Ú[™[ŽœœXÚØYÙ\ÏŒÜœXÚØYÙ\ÊÈˆ4`ô/ËˆŽˆ´'t-t`ˆ4a4,4`t/´,´.´.ŸJW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË[™YY[Y]H‹Ú[™[Ž–ÚKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–È´'t`ô-´/t/ˆ‹KšœÞÊ˜ˆ‹ØÚ[™[Ž–ÓX]œ›Ý[™
›™]
ŒL
KÌLˆ‹™Ø][š]X™[
[š]
W_JW_JKKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–È´%ô,4.´,4-ô,4`´c‹KšœÞÊ˜ˆ‹ØÚ[™[Ž–ÓX]œ›Ý[™
›Ü™\™Y
ŒL
KÌLˆ‹™Ø][š]X™[
[š]
W_JW_JKKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–È´'´a´-t/t.´,‹KšœÞ
˜ˆ‹ØÚ[™[Žœ™\Ý[X]YO[[Ø™›ØÓ[Û™^J™\Ý[X]Y˜Ý\œ™[˜ÞJNˆ¸ %ŸJW_JW_JW_KšÙ^JJ_JNšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËY[\H‹Ú[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Žˆ´'ô/´.´,4/t-taô-t,ô/ˆ4-ô,4.´,4-ôbô,´,4`´cŸJKKšœÞ
œ‹ØÚ[™[Ž‹œØÛÜ™OLÈ´%ô,4/ô/´.ô/t.4`´-H4/ô.ô,4/H4/ô`4/´-4,4-‹4/ô/´-4`´,´-t`4-4.4`´-H4`´-tat.´,4`4`´bË4`t,´cô-ô.4.4/´`t`´,4`´.´.ˆŽˆ´'ô/ˆ4,´,´-t-4dt/t/tbô/4/´`t`´,4`´.´,4/4/ô/´`´`4-t,t/t/´`t`´c4`ô-´-H4/ô/´.´`4bô`´,ˆŸJW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\ÙXÝ[Û‹ZXY‹Ú[™[Ž–ÚKšœÞ
šÈ‹ØÚ[™[Žˆ´(´/´,´,4`4bÈ4,´/t-H4/4-t/tcˆŸJKKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÜËš[\›˜[][\Ë›[™Ýˆ4/ô/´-ô.4a´.4.H—_JW_JKËš[\›˜[][\Ë›[™ÝÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË[\Ý‹Ú[™[ŽœËš[\›˜[][\Ë›X\
OšKšœÞÊ˜\XÛH‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËXØ\™‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËXØ\™]Ü‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
š‹ØÚ[™[Žœ›˜[Y_JKKšœÞÊœ‹ØÚ[™[Ž–È´(t-t.taô,4`H‹˜Ý\œ™[ÝØÚËˆ0­È4/4.4/t.4/4`ô/‹›Z[š[][TÝØÚËˆ‹™Ø][š]X™[
[š]
W_JW_JKKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËXÚ\ŠÊ˜XÝ]™OOOHLOÈˆŽˆ™ÛÛÙŠKÚ[™[Žœ˜XÝ]™OOOHLOÈ´$4`4at.4,ˆŽˆ´$4.´`´.4,´-t/HŸJW_JK	‰šKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËXØ\™XXÝ[ÛœÈ‹Ú[™[ŽšKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË[[šÈ‹ÛÛXÚÎŠ
OO‘J
KÚ[™[Žˆ´(4-t-4,4.´`´.4`4/´,´,4`´c8¡¤ˆŸJ_JW_KšY
J_JNšKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙËY[\H‹Ú[™[ŽšKšœÞ
œ‹ØÚ[™[Žˆ´%4/´,t,4,´c4`´-H4`4,4`tat/´-4/t.4.´.4.´/´`´/´`4bôaH4/t-t`ˆ4,ˆ4/4-t/tcŽˆ4`t,4.ôa4-t`´.´.4`ô,ô/´.ôc4`ô/ô,4.´/´,´.´`Ë4at.4/4.4c‹ˆŸJ_JK	‰šKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™XØ][ÙË\ÙXÛÛ™\žH‹Ý[NžÛX\™Ú[•ÜŒLKÛÛXÚÎŠ
OO‘JßJKÚ[™[ŽˆŠÈ4%4/´,t,4,´.4`´c4`4,4`tat/´-4/t.4.ˆŸJW_JW_J_JKË›[™ÝŒ	‰šKšœÞ
™ÝÔÙ[XÝ[Û‹Ùš[\ÎËÛÚ[™ÙNžÛØ[˜Ù[Š
OOž
×JKÛYŠ
OO‘‹˜Ý\œ™[Ë˜ÛXÚÊ
KÛÛÛ™š\›NŠ
OOžØÛÛœÝPÎÞ
×JNÖŠ™Ø[\žHŠ_K]Nˆ´(t`´`4,4/t.4a´bÈ4/4-t/tcˆ‹ÛÜNˆ´'ô`4/´,´-t`4c4`´-H4/ô/´`4cô-4/´.ˆ4`t`´`4,4/t.4aŽˆ˜\‘ØÝÜˆ4/ô`4/´aô.4`´,4-t`ˆ4a4/´`´/´,ô`4,4a4.4.4`t,´-t`4at`È4,´/t.4-È4.´,4.ˆ4/´-4/t/ˆ4/4-t/tc‹ˆŸJKI‰šKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË[ØY[™È‹Ú[™[ŽšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË[ØY[™ËXØ\™‹Ú[™[Ž–ÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ][ÙË\Ü[›™\ˆŸJKKšœÞ
œÝ›Û™È‹ØÚ[™[Ž_JKKšœÞ
œ‹ØÚ[™[Žˆ´'ô/´`t.ô-H4`4,4`t/ô/´-ô/t,4,´,4/t.4cÈ4/ô/´cô,´.4`´`tcÈ4/´,tcô-ô,4`´-t.ôc4/t,4cÈ4`t,´-t`4.´,ˆ4%4,4/t/tbô-H4/t-H4`t/´at`4,4/tcôc´`´`tcÈ4,4,´`´/´/4,4`´.4aô-t`t.´.ˆŸJW_J_JK‰‰šKšœÞ
™Ø][\Ü™]šY]ËÙ˜Y™‹ÛÚ[™ÙN›KÛØ[˜Ù[‘ËÛÛÛ™š\›N–KØ]š[™Î—ßJK	‰šKšœÞ
™Ø]Y[QY]Ü‹Ú][NššYÚ›[Üš^›ÛŽœËšÜš^›Û‘^\ËÜ›Ý\ÎœË™Ü›Ý\ËÝX™Ü›Ý\ÎœËœÝX™Ü›Ý\ËÛÛÜÙNŠ
OO™Ê[
KÛ”Ø]™NšYKÛ“X[˜YÙTÝXÝ\™NŠ
OO™J‹Û›ÛY[˜Û]\™OÝšY]Ï]^Û›Û^Iœ™]\›•ÏXØ][ÙÈŠKÝ\œ™[˜ÞNœË˜Ý\œ™[˜Þ_Ë™[Y\Ë™š[™
ÏO“[X™\ŠËšY
OOOS[X™\ŠË˜XÝ]™U™[YRY
JOË˜Ý\œ™[˜Þ_”•Pˆ‹›ÙXÝÎœKÛ“›ÛY[˜Û]\™PÜ™X]YŠÊOOžÚYŠ\
\™]\›ŽØÛÛœÝOX™Ø]Ý]J
NÛ
JKÜÙJ™Ø][ÙÔÝÜ™RÙ^KJ__JKLI‰šKšœÞ
™Ø]ÝXÝ\™SX[˜YÙ\‹ÜÝ]NœËÛÛÜÙNŠ
OO˜™Ù]ÝXÝ\™SÜ[ŠLJKÛ”Ø]™N˜\Þ[˜ÈOžØ]ØZ]Š´(t`´`4`ô.´`´`ô`4,4/4-t/tcˆ4`t/´at`4,4/t-t/t,‹
K™Ù]ÝXÝ\™SÜ[ŠLJ__JKI‰šKšœÞ
™Ø]™XÚ\QY]Ü‹Ú][NžK™XÚ\N˜™Ø]™XÚ\Q›ÜŠKËœ™XÚ\\ÊK›ÙXÝÎœK˜[[˜Ù\ÎœËœÝØÚÐ˜[[˜Ù\ËÛÛÜÙNŠ
OOšŠ[
KÛ”Ø]™N›Ù_JK‰‰šKšœÞ
™Ø][\›˜[Y]Ü‹Ú][N‹šYÝŽ›[›ÙXÝÎœKÛÛÜÙNŠ
OO‘J[
KÛ”Ø]™NY_JKÉ‰šKšœÞ
™Ø]\›ÚY]ÛÛÛÜÙNŠ
OO“JLJKÛ”ÝX›Z]”KØY[™Î›ÛÛX[ŠJ_JW_J_B‹Êˆ™X\ÜÛÜY[XÛÛ[X[™]ŒMÌœÝ\
‹Â˜ÛÛœÝ™\ÜÛÜY[ÛÛ[X[™™\œÚ[Û•ŒMÌHŒMÌŽÂ™[˜Ý[Ûˆ™\ÜÛÜY[^ŒMÌ
KHˆŠ^Ü™]\›ˆ\[ÙˆOOOHœÝš[™È‰‰™Kš[J
OÙKš[J
NB™[˜Ý[Ûˆ™\ÜÛÜY[[X™\•ŒMÌ
KL
^ØÛÛœÝ]\[ÙˆOOOHœÝš[™ÈÓ[X™\ŠKœ™\XÙJ×ËÙËˆŠKœ™\XÙJ‹‹‹ˆŠJN“[X™\ŠJNÜ™]\›ˆ[X™\‹š\Ñš[š]JŠOÛŽB™[˜Ý[Ûˆ™\ÜÛÜY[›Ü›UŒMÌ
J^Ü™]\›ˆ™\ÜÛÜY[^ŒMÌ
JKÓØØ[SÝÙ\Ø\ÙJœHŠKœ™\XÙJÖ×˜K^´,tcôdLNWJËÙÚKˆŠKš[J
_B™[˜Ý[Ûˆ™\ÜÛÜY[\˜[ŒMÌ
K‹Š^ØÛÛœÝOSX]˜XœÊ[X™\ŠJ_
ILLÏXILLÜ™]\›ˆOŒL	‰˜OŒÜŽœÏOOLOÝœÏL‰‰œÏMÛŽœŸB™[˜Ý[Ûˆ™\ÜÛÜY[[Û™^UŒMÌ
KH”•PˆŠ^ÚYŠOO[[S[X™\‹š\Ñš[š]J[X™\ŠJJJ\™]\›ˆ´'t-t-4/´`t`´,4`´/´aô/t/ˆ4-4,4/t/tbôaHŽÜ™]\›ˆ™›ØÓ[Û™^UŒMŽ
[X™\ŠJK
_B™[˜Ý[Ûˆ™\ÜÛÜY[\˜Ù[ŒMÌ
J^Ü™]\›ˆOO[[S[X™\‹š\Ñš[š]J[X™\ŠJJOÈ´'t-t-4/´`t`´,4`´/´aô/t/ˆ4-4,4/t/tbôaHŽŠ[X™\ŠJOŒÈŠÈŽˆˆŠJÔÝš[™Ê[X™\ŠJJKœ™\XÙJ‹ˆ‹‹ŠJÈ‰HŸY[˜Ý[Ûˆ™\ÜÛÜY[[š]X™[ŒŽLÊJ^ØÛÛœÝTÝš[™Ê_ˆŠKÓÝÙ\Ø\ÙJ
NÜ™]\›ŠÛ[ˆ´/4.È‹ˆ´.È‹Îˆ´,È‹ÙÎˆ´.´,È‹ÜÎˆ´b4`‹ˆ‹Îˆ´b4`‹ˆ‹YXÙNˆ´b4`‹ˆŸJVÝ__ˆŸB™[˜Ý[Ûˆ™\ÜÛÜY[[[Ý[ŒMÌ
K
^ÚYŠOO[[
\™]\›ˆ´'t-H4/´/ô`4-t-4-t.ô-t/t/ˆŽØÛÛœÝS[X™\ŠJK]OOH›[ÛLLÞÝ˜[YN›‹ÌL[š]ˆ´.ÈŸNžÝ˜[YN›‹[š]ˆ´/4.ÈŸNOOH™ÈÛLLÞÝ˜[YN›‹ÌL[š]ˆ´.´,ÈŸNžÝ˜[YN›‹[š]ˆ´,ÈŸNžÝ˜[YN›‹[š]ˆ´b4`‹ˆŸNÜ™]\›ˆ™]È[“[X™\‘›Ü›X]
œKT•H‹ÛX^[][Qœ˜XÝ[Û‘YÚ]ÎŒŸJK™›Ü›X]
‹˜[YJJÈˆŠÜ‹[š]B™[˜Ý[Ûˆ™\ÜÛÜY[[ÛX™[ŒMÌ
J^ÚYŠK×—ÍKWÌŸIË\Ý
Ýš[™Ê_ˆŠJJ\™]\›ˆ_´'ô-t`4.4/´-ŽØÛÛœÝÝ—OYKœÜ]
‹HŠK›X\
[X™\ŠNÜ™]\›ˆ™]È[‘]U[YQ›Ü›X]
œKT•H‹Û[Ûˆ›Û™È‹YX\Žˆ›[Y\šXÈ‹[YV›Û™Nˆ•UÈŸJK™›Ü›X]
™]È]J]K•UÊ‹LKJJJ_B™[˜Ý[Ûˆ™\ÜÛÜY[]Y\žU\›ŒMÌ
O^ßJ^ØÛÛœÝ[™]ÈT“ÙX\˜Ú\˜[\ÊÚ[™ÝË›ØØ][Û‹œÙX\˜Ú
NÙ›ÜŠÛÛœÝÛ‹—[ÙˆØš™XÝ™[šY\ÊJJ\O[[OOHˆÝ™[]JŠNœÙ]
‹Ýš[™ÊŠJNØÛÛœÝ]ÔÝš[™Ê
NÜ™]\›ˆ‹ØØ][ÙÈŠÊÈÈŠÛŽˆˆŠ_B™[˜Ý[Ûˆ™\ÜÛÜY[\[™šXÙR\ÝÜžUŒMÌ
K‹‹KÊ^ØÛÛœÝX™\ÜÛÜY[[X™\•ŒMÌ
ŠKOX™\ÜÛÜY[[X™\•ŒMÌ
ŠNÚYŠJŒ
_JOL
_X]˜XœÊ]JOŒJ\™]\›ˆNÜ™]\›–ÞÚY˜Üž\Ëœ˜[™ÛUURQ

KY[R][RYÛšXÙN›™]ÔšXÙNKÝ\œ™[˜ÞN˜_”•Pˆ‹ÛÝ\˜ÙNœß›X[X[‹Ú[™ÙY]›™]È]J
KÒTÓÔÝš[™Ê
_K‹‹˜™Ø]\œ˜^JJWKœÛXÙJL
_B‹Êˆ™]XÚXØ\™XÛÜÝ[™Ë]ŒÍÍˆ
‹Â™[˜Ý[Ûˆ™XÚÛÜÝ[š]ŒÍÍŠ˜[YJ^ØÛÛœÝ[š]TÝš[™Ê˜[Y_ˆŠKš[J
KÓØØ[SÝÙ\Ø\ÙJœKT•HŠKœ™\XÙJ×‹ÙËˆŠNÚYŠÈšÙÈ‹´.´,È‹´.´.4.ô/´,ô`4,4/4/‹´.´.4.ô/´,ô`4,4/4/4bÈ—Kš[˜ÛY\Ê[š]
J\™]\›žÝ[š]ˆ™È‹˜XÝÜŽŒYLßNÚYŠÈ™È‹´,È‹´,ô`‹´,ô`4,4/4/‹´,ô`4,4/4/4bÈ—Kš[˜ÛY\Ê[š]
J\™]\›žÝ[š]ˆ™È‹˜XÝÜŽŒ_NÚYŠÈ›‹´.È‹´.ô.4`´`‹´.ô.4`´`4bÈ—Kš[˜ÛY\Ê[š]
J\™]\›žÝ[š]ˆ›[‹˜XÝÜŽŒYLßNÚYŠÈ›[‹´/4.È‹´/4.4.ô.ô.4.ô.4`´`‹´/4.4.ô.ô.4.ô.4`´`4bÈ—Kš[˜ÛY\Ê[š]
J\™]\›žÝ[š]ˆ›[‹˜XÝÜŽŒ_NÚYŠÈœÜÈ‹œÈ‹´b4`ˆ‹´b4`´`ô.´,‹´b4`´`ô.´.‹´-t-‹´-t-4.4/t.4a´,—Kš[˜ÛY\Ê[š]
J\™]\›žÝ[š]ˆœÜÈ‹˜XÝÜŽŒ_NÜ™]\›žÝ[š]ˆ[šÛ›ÝÛˆ‹˜XÝÜŽŒ__B‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ
‹Â™[˜Ý[Ûˆ™XÚÛÜÝØ[›ÛšXØ[ŒÍÍŠÝ]J^ØÛÛœÝ[X\Ù\Ï[™]ÈX\Ù›ÜŠÛÛœÝ][HÙˆË‹‹˜™Ø]\œ˜^JÝ]K˜Ø[›ÛšXØ[›ÙXÝ[X\Ù\ÊK‹‹˜™Ø]\œ˜^JÝ]Kš[™[ÜžT›ÙXÝ[X\Ù\ÊWJ^ØÛÛœÝœ›ÛOTÝš[™Ê][OË™œ›Û_ˆŠKš[J
KÏTÝš[™Ê][OËßˆŠKš[J
NÚYŠœ›ÛI‰É‰™œ›ÛHOO]ÊX[X\Ù\ËœÙ]
œ›ÛKÊ_Y›ÜŠÛÛœÝ][HÙˆË‹‹˜™Ø]\œ˜^JÝ]K››ÛY[˜Û]\™JK‹‹˜™Ø]\œ˜^JÝ]KœÝØÚÐ˜[[˜Ù\ÊWJ^ØÛÛœÝÏTÝš[™Ê][OËœ›ÙXÝÙ^_][OËšÙ^_][OËšYˆŠKš[J
NÚYŠ]ÊXÛÛ[YNÙ›ÜŠÛÛœÝ˜]ÈÙˆÚ][OËšY][OË››ÛY[˜Û]\™R][RY][OËšÙ^K][OËœ›ÙXÝÙ^WJ^ØÛÛœÝœ›ÛOTÝš[™Ê˜]ßˆŠKš[J
NÚYŠœ›ÛI‰™œ›ÛHOO]ÊX[X\Ù\ËœÙ]
œ›ÛKÊ__\™]\›ˆ[š]X[OžÛ]Ù^OTÝš[™Ê[š]X[ˆŠKš[J
KÝX\™LÝÚ[J[X\Ù\Ëš\ÊÙ^JI‰™ÝX\™
ÊÏL
ZÙ^OX[X\Ù\Ë™Ù]
Ù^JNÜ™]\›ˆÙ^__B™[˜Ý[Ûˆ™XÚÛÜÝ[[Ý[ŒÍÍŠ][J^ØÛÛœÝ›Ü›X[^™YX™\ÜÛÜY[[X™\•ŒMÌ
][OË››Ü›X[^™Y]X[]K˜SŠK›Ü›X[^™Y[š]X™XÚÛÜÝ[š]ŒÍÍŠ][OË››Ü›X[^™Y[š]
NÚYŠ[X™\‹š\Ñš[š]J›Ü›X[^™Y
I‰››Ü›X[^™YL	‰››Ü›X[^™Y[š][š]OOH[šÛ›ÝÛˆŠ\™]\›žØ[[Ý[››Ü›X[^™Y
››Ü›X[^™Y[š]™˜XÝÜ‹[š]››Ü›X[^™Y[š][š]NØÛÛœÝ˜]ÏX™\ÜÛÜY[[X™\•ŒMÌ
][OËœ]X[]K˜SŠK˜]Õ[š]X™XÚÛÜÝ[š]ŒÍÍŠ][OË[š]
NÜ™]\›ˆ[X™\‹š\Ñš[š]J˜]ÊI‰œ˜]ÏL	‰œ˜]Õ[š][š]OOH[šÛ›ÝÛˆÞØ[[Ý[œ˜]Êœ˜]Õ[š]™˜XÝÜ‹[š]œ˜]Õ[š][š]NžØ[[Ý[“[X™\‹š\Ñš[š]J˜]ÊOÜ˜]ÎŒ[š]ˆ[šÛ›ÝÛˆŸ_B™[˜Ý[Ûˆ™XÚÛÜÝXÚØYÙUŒÎ
˜[YK˜[˜XÚÕ[š]
^ØÛÛœÝX™[TÝš[™Ê˜[Y_ˆŠKÓØØ[SÝÙ\Ø\ÙJœKT•HŠKœ™\XÙJËÙË‹ˆŠKX]Ú[X™[›X]Ú
Ê
ÊÎ——
ÊOÊWÊŠ4.´,ßÙß4,ß4,ô`ß4.ß4/4.ß[4b4`ŸÜÊKÊNÚYŠX]Ú
^ØÛÛœÝ[š]X™XÚÛÜÝ[š]ŒÍÍŠX]ÚÌ—JNÜ™]\›žØ[[Ý[“[X™\ŠX]ÚÌWJJ[š]™˜XÝÜ‹[š][š][š]X™[”Ýš[™Ê˜[Y_ˆŠ__XÛÛœÝ˜[˜XÚÏX™XÚÛÜÝ[š]ŒÍÍŠ˜[˜XÚÕ[š]
NÜ™]\›ˆ˜[˜XÚË[š]OOH[šÛ›ÝÛˆÞØ[[Ý[Œ[š]ˆ[šÛ›ÝÛˆ‹X™[”Ýš[™Ê˜[Y_ˆŠ_NžØ[[Ý[ŒK[š]™˜[˜XÚË[š]X™[”Ýš[™Ê˜[Y_ˆŠ__B‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLÈ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎ
‹Â‹Êˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎÈ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎL™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLH™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLˆ™][š]\›ÙXÝXÛÜÝ[™Ë]ŒÎLÈ
‹Â™[˜Ý[Ûˆ™XÚÛÜÝ˜[YUŒÎJ˜[YJ^Ü™]\›ˆÝš[™Ê˜[Y_ˆŠKÓØØ[SÝÙ\Ø\ÙJœKT•HŠKœ™\XÙJôdKÙË´-HŠKœ™\XÙJËÙË‹ˆŠKœ™\XÙJÛZ[[]\œÏßZ[[]™\Ïß4/4.4.ô.ô.4.ô.4`´`
Î´,4/´,ŠOËÙË´/4.ÈŠKœ™\XÙJÛ]\œÏß]™\Ïß4.ô.4`´`
Î´,4/´,ŠOß‹ÙË´.ÈŠKœ™\XÙJÖ×˜K^´,tcÌNWJËÙÚKˆŠ_B™[˜Ý[Ûˆ™XÚÛÜÝY[]RÙ^\ÕŒÎŠ˜]ËXÚØYÙU˜[YJ^ØÛÛœÝÛÝ\˜ÙOTÝš[™Ê˜]ßˆŠKÓØØ[SÝÙ\Ø\ÙJœKT•HŠKœ™\XÙJôdKÙË´-HŠKœ™\XÙJËÙË‹ˆŠK^XÚ]X™XÚÛÜÝXÚØYÙUŒÎ
XÚØYÙU˜[YKˆŠK[X™YYX™XÚÛÜÝXÚØYÙUŒÎ
ÛÝ\˜ÙKˆŠKXÚÙYY^XÚ][š]OOH[šÛ›ÝÛˆÙ^XÚ]™[X™YY˜\ÙTÛÝ\˜ÙO\ÛÝ\˜ÙKœ™\XÙJ×
ÊÎ——
ÊO×ÊŠÎ´.´,ßÙß4,ß4,ô`ß4.ß4/4.ß[4b4`ŸÜÊWËÙËˆŠK›Ü›X[^™YX™XÚÛÜÝ˜[YUŒÎJ˜\ÙTÛÝ\˜ÙJKØ]\‘˜[Z[O[›Ü›X[^™Yœ™\XÙJ×ŠÎ´,´/´-4,4/4.4/t-t`4,4.ôc4/t,4cß4/4.4/t-t`4,4.ôc4/t,4cô,´/´-4,4,´/´-4,
KËˆŠKœ™\XÙJÊÎ´/4.4/t-t`4,4.ôc4/t,4cô,´/´-4,4/4.4/t-t`4,4.ôc4/t,4cß4,ô,4-ô.4`4/´,´,4/t/t,4cô,´/´-4,4/t-t,ô,4-ô.4`4/´,´,4/t/t,4cô,´/´-4,4,ô,4-ô.4`4/´,´,4/t/t,4cß4/t-t,ô,4-ô.4`4/´,´,4/t/t,4cß4,´/´-4,
IËˆŠ_›Ü›X[^™Yœ˜[™K×ŠÎœÜš]_4`t/ô`4,4.t`ŠIË\Ý
Ø]\‘˜[Z[JOÈœÜš]HŽ‹×ŠÎ˜ÛØØXÛÛ_4.´/´.´,4.´/´.ô,ÛÛ_4.´/´.ô,
IË\Ý
Ø]\‘˜[Z[JOÈ˜ÛÛHŽØ]\‘˜[Z[KÙ^\ÏV×NÚYŠXÚÙY[š]OOH[šÛ›ÝÛˆ‰‰œXÚÙY˜[[Ý[Œ	‰˜œ˜[™
ZÙ^\Ëœ\Ú
œXÚØYÙNˆŠØœ˜[™
ÈŽˆŠÜXÚÙY[š]
ÈŽˆŠÜXÚÙY˜[[Ý[
NØÛÛœÝ^XÝX™XÚÛÜÝ˜[YUŒÎJ˜]ÊNÚYŠ^XÝ
ZÙ^\Ëœ\Ú
™^XÝˆŠÙ^XÝ
NÚYŠœ˜[™
ZÙ^\Ëœ\Ú
˜˜\ÙNˆŠØœ˜[™
NÜ™]\›–Ë‹‹›™]ÈÙ]
Ù^\ÊW_B™[˜Ý[Ûˆ™XÚÛÜÝ˜[YYYŒÎJX\˜]Ë˜[YKXÚØYÙU˜[YJ^Ù›ÜŠÛÛœÝ˜[YHÙˆ™XÚÛÜÝY[]RÙ^\ÕŒÎŠ˜]ËXÚØYÙU˜[YJJ^ØÛÛœÝ\Ý[X\™Ù]
˜[YJ_×NÛ\Ýœ\Ú
˜[YJNÛX\œÙ]
˜[YK\Ý
__B™[˜Ý[Ûˆ™XÚÛÜÝ[š\]YS˜[YYŒÎJ˜[Y\Ê^ØÛÛœÝ™\Ý[[™]ÈX\Ù›ÜŠÛÛœÝ[žHÙˆ˜[Y\ß×J^ØÛÛœÝÙ^OTÝš[™Ê[žOËšÙ^_ˆŠJÈŽˆŠÔÝš[™Ê[žOË˜[YOË[š]ˆŠJÈŽˆŠÔÝš[™Ê[žOË˜[YOËœXÚØYÙTÚ^™_ˆŠJÈŽˆŠÔÝš[™Ê[žOË˜[YOË›Ü™\ŸˆŠNÜ™\Ý[œÙ]
Ù^K[žJ_\™]\›–Ë‹‹œ™\Ý[˜[Y\Ê
W_B™[˜Ý[Ûˆ™XÚÛÜÝÝšXÝ˜[YYŒÎJX\˜]ËXÚØYÙU˜[YJ^ØÛÛœÝÙ^\ÏX™XÚÛÜÝY[]RÙ^\ÕŒÎŠ˜]ËXÚØYÙU˜[YJK™š[\ŠÙ^OOˆZÙ^KœÝ\ÕÚ]
˜˜\ÙNˆŠJNÜ™]\›ˆ™XÚÛÜÝ[š\]YS˜[YYŒÎJÙ^\Ë™›]X\
Ù^OO›X\™Ù]
Ù^J_×JJ_B™[˜Ý[Ûˆ™XÚÛÜÝÜÝYŒÎJØÝ[Y[
^Ü™]\›–È˜ÛÛ™š\›YY‹œÜÝY‹˜ÛÛ™XÝY—Kš[˜ÛY\ÊÝš[™ÊØÝ[Y[ËœÝ]\ßˆŠKš[J
KÓØØ[SÝÙ\Ø\ÙJœKT•HŠJ_B™[˜Ý[Ûˆ™XÚÛÜÝÚ[Ü™\•ŒÎJØÝ[Y[ØÝ[Y[[™^[™R[™^
^ØÛÛœÝ]OTÝš[™ÊØÝ[Y[Ë™]_ØÝ[Y[Ë™ØÝ[Y[]_ˆŠKœÛXÙJL
KÛÛ™š\›YYTÝš[™ÊØÝ[Y[Ë˜ÛÛ™š\›YY]ØÝ[Y[ËœÜÝY]ØÝ[Y[Ë˜ÛÛ™XÝY]ØÝ[Y[Ë\]Y]ØÝ[Y[Ë˜Ü™X]Y]ˆŠNÜ™]\›ˆ]JÈŸŠØÛÛ™š\›YY
ÈŸŠÔÝš[™ÊØÝ[Y[[™^
KœYÝ\
ŒŠJÈŸŠÔÝš[™Ê[™R[™^
KœYÝ\
‹ŒŠ_B™[˜Ý[Ûˆ™XÚÛÜÝ]\ÝÚ[ŒÎJ[šY\Ê^Ü™]\›ˆ™XÚÛÜÝ[š\]YS˜[YYŒÎJ[šY\ÊK™š[\Š[žOO˜™\ÜÛÜY[[X™\•ŒMÌ
[žOË˜[YOË[š]šXÙK
OŒ
KœÛÜ

YšYÚ
OO”Ýš[™ÊšYÚË˜[YOË›Ü™\ŸˆŠK›ØØ[PÛÛ\\™JÝš[™ÊYË˜[YOË›Ü™\ŸˆŠJJVÌ_[B™[˜Ý[Ûˆ™XÚÛÜÝXÚØYÙRÙ^UŒÎŠ˜[YJ^ØÛÛœÝXÚÙYX™XÚÛÜÝXÚØYÙUŒÎ
˜[YKˆŠNÜ™]\›ˆXÚÙY[š]OOH[šÛ›ÝÛˆ‰‰œXÚÙY[š]OOHœÜÈ‰‰œXÚÙY˜[[Ý[ŒÜXÚÙY[š]
ÈŽˆŠÜXÚÙY˜[[Ý[ˆˆŸB™[˜Ý[Ûˆ™XÚÛÜÝÚ[XÚØYÙRÙ^\ÕŒÎŠ[™J^Ü™]\›–Ë‹‹›™]ÈÙ]
Û[™OËœXÚØYÙTÚ^™K[™OËœXÚØYÙSX™[[™OË›˜[YK[™OËœ˜]Ó˜[YK[™OË››ÛY[˜Û]\™S˜[YWK›X\
™XÚÛÜÝXÚØYÙRÙ^UŒÎŠK™š[\Š›ÛÛX[ŠJW_B™[˜Ý[Ûˆ™XÚÛÜÝY[TXÚØYÙUŒÎŠY[R][J^ØÛÛœÝØ[TÚ^™O[Y[R][OËœØ[TÚ^™NÚYŠØ[TÚ^™I‰\[ÙˆØ[TÚ^™OOOH›Øš™XÝ‰‰˜™\ÜÛÜY[[X™\•ŒMÌ
Ø[TÚ^™Kœ]X[]K
OŒ	‰œØ[TÚ^™K[š]
\™]\›ˆÝš[™ÊØ[TÚ^™Kœ]X[]JJÈˆŠÔÝš[™ÊØ[TÚ^™K[š]
NÜ™]\›ˆ\[ÙˆØ[TÚ^™OOOHœÝš[™ÈÜØ[TÚ^™N”Ýš[™ÊY[R][OËœÜ[Û”Ú^™_Y[R][OË›YØXÞTÜ[Û”Ú^™_Y[R][OËœ™XYT›ÙXÝËœXÚØYÙSX™[ˆŠ_B™[˜Ý[Ûˆ™XÚÛÜÝ[Y[œÚ[Û˜[XÚØYÙUŒÎJ˜[YJ^ØÛÛœÝXÚÙYX™XÚÛÜÝXÚØYÙUŒÎ
˜[YKˆŠNÜ™]\›ˆXÚÙY[š]OOH[šÛ›ÝÛˆ‰‰œXÚÙY[š]OOHœÜÈ‰‰œXÚÙY˜[[Ý[ŒÜXÚÙY›[B™[˜Ý[Ûˆ™XÚÛÜÝXÚØYÙTÚ[ŒÎŠ[šY\ËXÚØYÙRÙ^J^ØÛÛœÝ˜[Y\ÏX™XÚÛÜÝ[š\]YS˜[YYŒÎJ[šY\ÊNÚYŠXÚØYÙRÙ^J\™]\›ˆ™XÚÛÜÝ]\ÝÚ[ŒÎJ˜[Y\Ë™š[\Š[žOO˜™Ø]\œ˜^J[žOË˜[YOËœXÚØYÙRÙ^\ÊKš[˜ÛY\ÊXÚØYÙRÙ^JJJNØÛÛœÝY[]Y\Ï[™]ÈÙ]
˜[Y\Ë™›]X\
[žOO˜™Ø]\œ˜^J[žOË˜[YOËœXÚØYÙRÙ^\ÊJJNÜ™]\›ˆY[]Y\ËœÚ^™OŒOÛ[˜™XÚÛÜÝ]\ÝÚ[ŒÎJ˜[Y\Ê_B™[˜Ý[Ûˆ™XÚÛÜÝYÙÜ™YØ]TÚ[ŒÎLŠ[šY\ËXÚØYÙRÙ^J^ØÛÛœÝ\ÏTÝš[™ÊXÚØYÙRÙ^_ˆŠKœÜ]
ŽˆŠK[š]\\ÖÌK[[Ý[X™\ÜÛÜY[[X™\•ŒMÌ
\ÖÌWK
K˜[Y\ÏX™XÚÛÜÝ[š\]YS˜[YYŒÎJ[šY\ÊNÚYŠ][š]J[[Ý[Œ
_]˜[Y\Ë›[™Ý]˜[Y\Ë™]™\žJ[žOOžØÛÛœÝÚ[Y[žOË˜[YK˜\ÙP[[Ý[X™\ÜÛÜY[[X™\•ŒMÌ
Ú[Ë˜˜\ÙP[[Ý[
NÚYŠÚ[Ë[š]OO][š]˜\ÙP[[Ý[[[Ý[
\™]\›ˆLNØÛÛœÝXÚØYÙ\ÏX˜\ÙP[[Ý[Ø[[Ý[Ü™]\›ˆX]˜XœÊXÚØYÙ\ËSX]œ›Ý[™
XÚØYÙ\ÊJOYKMŸJJ\™]\›ˆ[Ü™]\›ˆ™XÚÛÜÝ]\ÝÚ[ŒÎJ˜[Y\Ê_B™[˜Ý[Ûˆ™XÚÛÜÝX\ÕŒÍÍŠÝ]K\˜Ú\Ù\ËØ[›ÛšXØ[
^ÂˆÛÛœÝ˜[[˜Ù\Ï[™]ÈX\šXÙ\Ï[™]ÈX\šXÙ\ÐžRÙ^O[™]ÈX\›ÙXÝÏ[™]ÈX\[™S[šÜÏ[™]ÈX\˜[[˜Ù\ÐžS˜[YO[™]ÈX\šXÙ\ÐžS˜[YO[™]ÈX\›ÙXÝÐžS˜[YO[™]ÈX\Âˆ›ÜŠÛÛœÝX\[™ÈÙˆ™Ø]\œ˜^JÝ]KœÝ\Y\”›ÙXÝX\[™ÜÊJ^ÂˆÛÛœÝÙ^OXØ[›ÛšXØ[
X\[™ÏË˜Ø[›ÛšXØ[›ÙXÝÙ^JNÚYŠZÙ^JXÛÛ[YNÂˆ›ÜŠÛÛœÝ[™RYÙˆ™Ø]\œ˜^JX\[™ÏËœ\˜Ú\ÙS[™RYÊJ^ØÛÛœÝYTÝš[™Ê[™RYˆŠKš[J
NÚYŠY
[[™S[šÜËœÙ]
YÙ^J_BˆBˆ›ÜŠÛÛœÝ›ÙXÝÙˆË‹‹˜™Ø]\œ˜^JÝ]K››ÛY[˜Û]\™JK‹‹˜™Ø]\œ˜^JÝ]KœÝØÚÐ˜[[˜Ù\ÊWJ^ÂˆÛÛœÝÙ^OXØ[›ÛšXØ[
›ÙXÝËœ›ÙXÝÙ^_›ÙXÝËšÙ^_›ÙXÝËœ\˜Ú\ÙT›ÙXÝÙ^_›ÙXÝË››ÛY[˜Û]\™R][RY›ÙXÝËšY
NÚYŠZÙ^JXÛÛ[YNÂˆ›ÙXÝËœÙ]
Ù^KË‹‹Š›ÙXÝË™Ù]
Ù^J_ßJK‹‹œ›ÙXÝJNÂˆ›ÜŠÛÛœÝ˜[YHÙˆÜ›ÙXÝË›˜[YK›ÙXÝË››ÛY[˜Û]\™S˜[YK›ÙXÝË›X]ÚY˜[YWJX™XÚÛÜÝ˜[YYYŒÎJ›ÙXÝÐžS˜[YK˜[YKÚÙ^K˜[YNœ›ÙXÝK›ÙXÝËœXÚØYÙTÚ^™_›ÙXÝË™\Ü^TXÚØYÙTÚ^™_›ÙXÝËœ\˜Ú\ÙTXÚØYÙTÚ^™JBˆBˆ›ÜŠÛÛœÝ˜[[˜ÙHÙˆ™Ø]\œ˜^JÝ]KœÝØÚÐ˜[[˜Ù\ÊJ^ÂˆÛÛœÝÙ^OXØ[›ÛšXØ[
˜[[˜ÙOËœ›ÙXÝÙ^_˜[[˜ÙOËšÙ^_˜[[˜ÙOËœ\˜Ú\ÙT›ÙXÝÙ^_˜[[˜ÙOË››ÛY[˜Û]\™R][RY˜[[˜ÙOËšY
NÚYŠZÙ^JXÛÛ[YNÂˆ˜[[˜Ù\ËœÙ]
Ù^K˜[[˜ÙJNÂˆ›ÜŠÛÛœÝ˜[YHÙˆØ˜[[˜ÙOË›˜[YK˜[[˜ÙOË››ÛY[˜Û]\™S˜[YK˜[[˜ÙOË›X]ÚY˜[YWJX™XÚÛÜÝ˜[YYYŒÎJ˜[[˜Ù\ÐžS˜[YK˜[YKÚÙ^K˜[YN˜˜[[˜Ù_K˜[[˜ÙOËœXÚØYÙTÚ^™_˜[[˜ÙOË™\Ü^TXÚØYÙTÚ^™_˜[[˜ÙOËœ\˜Ú\ÙTXÚØYÙTÚ^™JBˆBˆ›ÜŠÛÛœÝÙØÝ[Y[[™^ØÝ[Y[[Ùˆ™Ø]\œ˜^J\˜Ú\Ù\ÊK™[šY\Ê
J^ÂˆYŠX™XÚÛÜÝÜÝYŒÎJØÝ[Y[
JXÛÛ[YNÂˆ›ÜŠÛÛœÝÛ[™R[™^[™W[Ùˆ™Ø]\œ˜^JØÝ[Y[Ëš][\ÊK™[šY\Ê
J^ÂˆÛÛœÝX\YÙ^OXØ[›ÛšXØ[
[™OËœ\˜Ú\ÙT›ÙXÝÙ^_[™OËœ›ÙXÝÙ^_[™OË˜Ø[›ÛšXØ[›ÙXÝÙ^_[™S[šÜË™Ù]
Ýš[™Ê[™OËšYˆŠJ_[™OË››ÛY[˜Û]\™RY
KÚ[˜[YO[[™OË›˜[Y_[™OË››ÛY[˜Û]\™S˜[Y_[™OËœ˜]Ó˜[Y_ˆ‹Ú[XÚØYÙ\ÏX™XÚÛÜÝÚ[XÚØYÙRÙ^\ÕŒÎŠ[™JK˜[˜XÚÒY[]OX™XÚÛÜÝY[]RÙ^\ÕŒÎŠÚ[˜[YK[™OËœXÚØYÙTÚ^™_[™OËœXÚØYÙSX™[Ú[˜[YJK™š[™
˜[YOO˜[YKœÝ\ÕÚ]
œXÚØYÙNˆŠJ_™XÚÛÜÝY[]RÙ^\ÕŒÎŠÚ[˜[YK[™OËœXÚØYÙTÚ^™_[™OËœXÚØYÙSX™[Ú[˜[YJK™š[™
˜[YOO˜[YKœÝ\ÕÚ]
™^XÝˆŠJKÙ^O[X\YÙ^_
˜[˜XÚÒY[]OÈ[›X\YˆŠÙ˜[˜XÚÒY[]NˆˆŠNÚYŠZÙ^JXÛÛ[YNÂˆÛÛœÝ]X[]OX™\ÜÛÜY[[X™\•ŒMÌ
[™OËœ]X[]K
K›ÙXÝ\›ÙXÝË™Ù]
Ù^JK›ÙXÝ[š]X™XÚÛÜÝ[š]ŒÍÍŠ›ÙXÝË[š]›ÙXÝË˜˜\ÙU[š]
K[™U[š]X™XÚÛÜÝ[š]ŒÍÍŠ[™OË[š]
NÂˆ]™\ÛÛ™Y[[™U[š]˜\ÙP[[Ý[\]X[]J›[™U[š]™˜XÝÜŽÂˆYŠ[™U[š][š]OOHœÜÈ‰‰œ›ÙXÝ[š][š]OOHœÜÈŠ^ÂˆÛÛœÝXÚÙYX™XÚÛÜÝXÚØYÙUŒÎ
[™OËœXÚØYÙTÚ^™K[™OË[š]
NÂˆYŠXÚÙY[š]OOH[šÛ›ÝÛˆ‰‰œXÚÙY[š]OOHœÜÈŠ^Ü™\ÛÛ™Y^Ý[š]œXÚÙY[š]˜XÝÜŽŒ_NØ˜\ÙP[[Ý[\]X[]JœXÚÙY˜[[Ý[BˆBˆÛÛœÝÝ[SX]›X^
™\ÜÛÜY[[X™\•ŒMÌ
[™OË›[™UÝ[
_™\ÜÛÜY[[X™\•ŒMÌ
[™OË[š]šXÙK
Jœ]X[]JNÂˆYŠJ˜\ÙP[[Ý[Œ	‰Ý[Œ	‰œ™\ÛÛ™Y[š]OOH[šÛ›ÝÛˆŠJXÛÛ[YNÂˆÛÛœÝÚ[^Ý[š]œ™\ÛÛ™Y[š]˜\ÙP[[Ý[[š]šXÙNÝ[Ø˜\ÙP[[Ý[Ý\œ™[˜ÞN”Ýš[™ÊØÝ[Y[Ë˜Ý\œ™[˜Þ_”•PˆŠKÕ\\Ø\ÙJ
K]N”Ýš[™ÊØÝ[Y[Ë™]_ØÝ[Y[Ë™ØÝ[Y[]_ˆŠKÜ™\Ž˜™XÚÛÜÝÚ[Ü™\•ŒÎJØÝ[Y[ØÝ[Y[[™^[™R[™^
KÝ\Y\“˜[YN”Ýš[™ÊØÝ[Y[ËœÝ\Y\“˜[Y_ØÝ[Y[ËœÝ\Y\Ë›˜[Y_ˆŠKØÝ[Y[Y”Ýš[™ÊØÝ[Y[ËšYˆŠKØÝ[Y[[X™\Ž”Ýš[™ÊØÝ[Y[Ë™ØÝ[Y[[X™\ŸØÝ[Y[Ë›[X™\ŸˆŠK[™RY”Ýš[™Ê[™OËšYˆŠK˜[YNœÚ[˜[YK˜]Ó˜[YN›[™OËœ˜]Ó˜[Y_ˆ‹›ÛY[˜Û]\™S˜[YN›[™OË››ÛY[˜Û]\™S˜[Y_ˆ‹XÚØYÙTÚ^™N›[™OËœXÚØYÙTÚ^™_[™OËœXÚØYÙSX™[Ú[˜[Y_ˆ‹XÚØYÙRÙ^\ÎœÚ[XÚØYÙ\ßNÂˆÛÛœÝ[žO^ÚÙ^K˜[YNœÚ[KžRÙ^O\šXÙ\ÐžRÙ^K™Ù]
Ù^J_×NØžRÙ^Kœ\Ú
[žJNÜšXÙ\ÐžRÙ^KœÙ]
Ù^KžRÙ^JNÂˆ›ÜŠÛÛœÝ˜[YHÙˆÜÚ[›˜[YKÚ[œ˜]Ó˜[YKÚ[››ÛY[˜Û]\™S˜[YWJX™XÚÛÜÝ˜[YYYŒÎJšXÙ\ÐžS˜[YK˜[YK[žKÚ[œXÚØYÙTÚ^™JNÂˆÛÛœÝÝ\œ™[\šXÙ\Ë™Ù]
Ù^JNÚYŠXÝ\œ™[Ú[›Ü™\XÝ\œ™[›Ü™\Š\šXÙ\ËœÙ]
Ù^KÚ[
BˆBˆBˆ™]\›žØ˜[[˜Ù\ËšXÙ\ËšXÙ\ÐžRÙ^K›ÙXÝË˜[[˜Ù\ÐžS˜[YKšXÙ\ÐžS˜[YK›ÙXÝÐžS˜[Y_BŸB™[˜Ý[Ûˆ™XÚÛÜÝ™\ÛÛ™Y[[Ý[ŒÎJ[[Ý[[™Ü™YY[›ÙXÝÚ[
^ÚYŠ[[Ý[[š]OOHœÜÈŠ\™]\›ˆ[[Ý[ØÛÛœÝÚ[[š]X™XÚÛÜÝ[š]ŒÍÍŠÚ[Ë[š]
K[š]ÚYŠÚ[[š]OOH[šÛ›ÝÛˆŸÚ[[š]OOHœÜÈŠ\™]\›ˆ[[Ý[ØÛÛœÝ[™Ü™YY[XÚØYÙ\Ï[™]ÈX\Ù›ÜŠÛÛœÝX™[ÙˆÚ[™Ü™YY[ËœXÚØYÙTÚ^™K[™Ü™YY[ËœXÚØYÙSX™[[™Ü™YY[Ë›˜[YWK™š[\Š›ÛÛX[ŠJ^ØÛÛœÝXÚÙYX™XÚÛÜÝXÚØYÙUŒÎ
X™[ˆŠNÚYŠXÚÙY˜[[Ý[Œ	‰œXÚÙY[š]OO\Ú[[š]
Z[™Ü™YY[XÚØYÙ\ËœÙ]
XÚÙY[š]
ÈŽˆŠÜXÚÙY˜[[Ý[XÚÙY
_ZYŠ[™Ü™YY[XÚØYÙ\ËœÚ^™OOOLJ^ØÛÛœÝXÚÙYVË‹‹š[™Ü™YY[XÚØYÙ\Ë˜[Y\Ê
WVÌNÜ™]\›žØ[[Ý[˜[[Ý[˜[[Ý[
œXÚÙY˜[[Ý[[š]œXÚÙY[š]XÚØYÙSX™[œXÚÙY›X™[ÛÝ\˜ÙNˆš[™Ü™YY[Ù^XÝÜXÚØYÙHŸ_XÛÛœÝ›ÙXÝXÚØYÙ\Ï[™]ÈX\Ù›ÜŠÛÛœÝX™[ÙˆË‹‹˜™Ø]\œ˜^J›ÙXÝËœXÚØYÙSÜ[ÛœÊK›ÙXÝËœXÚØYÙTÚ^™K›ÙXÝË™\Ü^TXÚØYÙTÚ^™K›ÙXÝËœ\˜Ú\ÙTXÚØYÙTÚ^™WK›X\
][OO\[Ùˆ][OOOHœÝš[™ÈÚ][Nš][OË›X™[][OËœXÚØYÙTÚ^™_ˆŠK™š[\Š›ÛÛX[ŠJ^ØÛÛœÝXÚÙYX™XÚÛÜÝXÚØYÙUŒÎ
X™[ˆŠNÚYŠXÚÙY˜[[Ý[Œ	‰œXÚÙY[š]OO\Ú[[š]
\›ÙXÝXÚØYÙ\ËœÙ]
XÚÙY[š]
ÈŽˆŠÜXÚÙY˜[[Ý[XÚÙY
_ZYŠ›ÙXÝXÚØYÙ\ËœÚ^™HOOLJ\™]\›ˆ[[Ý[ØÛÛœÝXÚÙYVË‹‹œ›ÙXÝXÚØYÙ\Ë˜[Y\Ê
WVÌNÜ™]\›žØ[[Ý[˜[[Ý[˜[[Ý[
œXÚÙY˜[[Ý[[š]œXÚÙY[š]XÚØYÙSX™[œXÚÙY›X™[ÛÝ\˜ÙNˆœ›ÙXÝÙ^XÝÜXÚØYÙHŸ_B™[˜Ý[Ûˆ™XÚÛÜÝ›ÝÕŒÍÍŠ[™Ü™YY[X\ËØ[›ÛšXØ[Y[R][KY[TXÚØYÙR[
^ÂˆÛÛœÝ˜]Ð[[Ý[X™XÚÛÜÝ[[Ý[ŒÍÍŠ[™Ü™YY[
K™\]Y\ÝYÙ^OXØ[›ÛšXØ[
[™Ü™YY[Ëœ\˜Ú\ÙT›ÙXÝÙ^_[™Ü™YY[Ëœ›ÙXÝÙ^_[™Ü™YY[Ë˜Ø[›ÛšXØ[›ÙXÝÙ^_[™Ü™YY[Ë››ÛY[˜Û]\™R][RY
KY[TXÚØYÙOTÝš[™ÊY[TXÚØYÙR[™XÚÛÜÝY[TXÚØYÙUŒÎŠY[R][J_ˆŠK[™Ü™YY[XÚØYÙOTÝš[™Ê[™Ü™YY[ËœXÚØYÙTÚ^™_[™Ü™YY[ËœXÚØYÙSX™[ˆŠK[™Ü™YY[[Y[œÚ[Û˜[X™XÚÛÜÝ[Y[œÚ[Û˜[XÚØYÙUŒÎJ[™Ü™YY[XÚØYÙJKY[Q[Y[œÚ[Û˜[X™XÚÛÜÝ[Y[œÚ[Û˜[XÚØYÙUŒÎJY[TXÚØYÙJKXÚØYÙU˜[YOZ[™Ü™YY[[Y[œÚ[Û˜[Ú[™Ü™YY[XÚØYÙN›Y[Q[Y[œÚ[Û˜[ÛY[TXÚØYÙNš[™Ü™YY[XÚØYÙ_[™Ü™YY[Ë›˜[YK˜[YU˜[YOZ[™Ü™YY[Ë›X]ÚY˜[Y_[™Ü™YY[Ë˜Ø[›ÛšXØ[˜[Y_[™Ü™YY[Ë›˜[YKXÚØYÙRÙ^OX™XÚÛÜÝXÚØYÙRÙ^UŒÎŠXÚØYÙU˜[YJNÂˆÛÛœÝ™\]Y\ÝY[šY\Ï[X\ËœšXÙ\ÐžRÙ^K™Ù]
™\]Y\ÝYÙ^J_×K™\]Y\ÝYÚ[X™XÚÛÜÝXÚØYÙTÚ[ŒÎŠ™\]Y\ÝY[šY\ËXÚØYÙRÙ^J_™XÚÛÜÝYÙÜ™YØ]TÚ[ŒÎLŠ™\]Y\ÝY[šY\ËXÚØYÙRÙ^JNÂˆ]Ù^O\™\]Y\ÝYÙ^KÚ[\™\]Y\ÝYÚ[Ë˜[YK›ÙXÝ[X\Ëœ›ÙXÝË™Ù]
Ù^JNÂˆYŠ\Ú[
^ÂˆÛÛœÝ˜[YY[šY\ÏX™XÚÛÜÝÝšXÝ˜[YYŒÎJX\ËœšXÙ\ÐžS˜[YK˜[YU˜[YKXÚØYÙU˜[YJK]\ÝX™XÚÛÜÝXÚØYÙTÚ[ŒÎŠ˜[YY[šY\ËXÚØYÙRÙ^J_™XÚÛÜÝYÙÜ™YØ]TÚ[ŒÎLŠ˜[YY[šY\ËXÚØYÙRÙ^JNÂˆYŠ]\Ý
^ÚÙ^O[]\ÝšÙ^NÜÚ[[]\Ý˜[YNÜ›ÙXÝ[X\Ëœ›ÙXÝË™Ù]
Ù^J_›ÙXÝBˆBˆYŠ\›ÙXÝ
^ÂˆÛÛœÝØ[™Y]\ÏX™XÚÛÜÝÝšXÝ˜[YYŒÎJX\Ëœ›ÙXÝÐžS˜[YK˜[YU˜[YKXÚØYÙU˜[YJKÙ^\Ï[™]ÈX\
Ø[™Y]\Ë›X\
[žOO–ÔÝš[™Ê[žKšÙ^JK[žWJJNÂˆYŠÙ^\ËœÚ^™OOOLJ\›ÙXÝVË‹‹šÙ^\Ë˜[Y\Ê
WVÌK˜[YBˆBˆÛÛœÝY™™XÝ]™R[™Ü™YY[\XÚØYÙU˜[YI‰˜™XÚÛÜÝXÚØYÙRÙ^UŒÎŠXÚØYÙU˜[YJOÞË‹‹š[™Ü™YY[XÚØYÙTÚ^™NœXÚØYÙU˜[YKXÚØYÙSX™[œXÚØYÙU˜[Y_Nš[™Ü™YY[[[Ý[X™XÚÛÜÝ™\ÛÛ™Y[[Ý[ŒÎJ˜]Ð[[Ý[Y™™XÝ]™R[™Ü™YY[›ÙXÝÚ[
KÚ[[š]X™XÚÛÜÝ[š]ŒÍÍŠÚ[Ë[š]
K[š][š]šXÙO\Ú[[š]OOX[[Ý[[š]Ø™\ÜÛÜY[[X™\•ŒMÌ
Ú[Ë[š]šXÙK
NŒÝ\œ™[˜ÞOTÝš[™ÊÚ[Ë˜Ý\œ™[˜Þ_ˆŠKÕ\\Ø\ÙJ
K˜[YOZ[™Ü™YY[Ë›X]ÚY˜[Y_[™Ü™YY[Ë˜Ø[›ÛšXØ[˜[Y_›ÙXÝË›˜[Y_Ú[Ë›˜[Y_[™Ü™YY[Ë›˜[Y_´&4/t,ô`4-t-4.4-t/t`ˆŽÂˆYŠZÙ^J\™]\›žÚYš[™Ü™YY[ËšY˜[YK™XÚ\S˜[YNš[™Ü™YY[Ë›˜[Y_˜[YK]X[]Nš[™Ü™YY[Ëœ]X[]K[š]š[™Ü™YY[Ë[š]ÛÛ\]NˆLK™X\ÛÛŽˆ›X\[™È‹›ÙXÝÙ^Nˆˆ‹[[Ý[˜[[Ý[˜[[Ý[NÂˆYŠ[[Ý[[š]OOH[šÛ›ÝÛˆŠ\™]\›žÚYš[™Ü™YY[ËšY˜[YK™XÚ\S˜[YNš[™Ü™YY[Ë›˜[Y_˜[YK]X[]Nš[™Ü™YY[Ëœ]X[]K[š]š[™Ü™YY[Ë[š]ÛÛ\]NˆLK™X\ÛÛŽˆ[š]‹›ÙXÝÙ^NšÙ^K[[Ý[˜[[Ý[˜[[Ý[NÂˆYŠÚ[	‰œÚ[[š]OOX[[Ý[[š]
\™]\›žÚYš[™Ü™YY[ËšY˜[YK™XÚ\S˜[YNš[™Ü™YY[Ë›˜[Y_˜[YK]X[]Nš[™Ü™YY[Ëœ]X[]K[š]š[™Ü™YY[Ë[š]ÛÛ\]NˆLK™X\ÛÛŽœ˜]Ð[[Ý[[š]OOHœÜÈÈœšXÙHŽˆ[š]‹›ÙXÝÙ^NšÙ^K[[Ý[˜[[Ý[˜[[Ý[NÂˆYŠJ[š]šXÙOŒ	‰˜Ý\œ™[˜ÞJJ\™]\›žÚYš[™Ü™YY[ËšY˜[YK™XÚ\S˜[YNš[™Ü™YY[Ë›˜[Y_˜[YK]X[]Nš[™Ü™YY[Ëœ]X[]K[š]š[™Ü™YY[Ë[š]ÛÛ\]NˆLK™X\ÛÛŽˆœšXÙH‹›ÙXÝÙ^NšÙ^K[[Ý[˜[[Ý[˜[[Ý[NÂˆ™]\›žÚYš[™Ü™YY[ËšY˜[YK™XÚ\S˜[YNš[™Ü™YY[Ë›˜[Y_˜[YK]X[]Nš[™Ü™YY[Ëœ]X[]K[š]š[™Ü™YY[Ë[š]ÛÛ\]NˆL™X\ÛÛŽ›[›ÙXÝÙ^NšÙ^K[[Ý[˜[[Ý[˜[[Ý[›Ü›X[^™Y[š]˜[[Ý[[š]XÚØYÙSX™[œXÚØYÙU˜[Y_[[Ý[œXÚØYÙSX™[Ú[œXÚØYÙTÚ^™_[[š]šXÙKÛÜÝ“X]œ›Ý[™
[[Ý[˜[[Ý[
[š]šXÙJŒL
KÌLÝ\œ™[˜ÞKÛÝ\˜ÙNˆ›]\ÝØÛÛ™š\›YYÜ\˜Ú\ÙH‹\˜Ú\ÙQ]NœÚ[™]_[Ý\Y\“˜[YNœÚ[œÝ\Y\“˜[Y_[\˜Ú\ÙQØÝ[Y[YœÚ[™ØÝ[Y[Y[\˜Ú\ÙQØÝ[Y[[X™\ŽœÚ[™ØÝ[Y[[X™\Ÿ[\˜Ú\ÙTXÚØYÙTÚ^™NœÚ[œXÚØYÙTÚ^™_[BŸB™[˜Ý[Ûˆ™XÚÛÜÝ[™P[[Ý[ŒÎLÊ›ÝÊ^ØÛÛœÝXÚØYÙSX™[TÝš[™Ê›ÝÏËœXÚØYÙSX™[ˆŠKš[J
NÚYŠXÚØYÙSX™[
\™]\›ˆXÚØYÙSX™[ØÛÛœÝ[[Ý[\›ÝÏË˜[[Ý[O[[Ü›ÝË˜[[Ý[œ›ÝÏËœ]X[]HO[[Ü›ÝËœ]X[]Nˆ¸ %‹[š]\›ÝÏË››Ü›X[^™Y[š]›ÝÏË[š]Ü™]\›ˆÝš[™Ê[[Ý[
Kœ™\XÙJ‹ˆ‹‹ŠJÈˆŠØ™\ÜÛÜY[[š]X™[ŒŽLÊ[š]
_B™[˜Ý[Ûˆ™\ÜÛÜY[˜[˜XÚÐ[˜[]XÜÕŒMÌ
K\˜Ú\Ù\Ë
^ØÛÛœÝX™Ø]Ý]JJKØ[›ÛšXØ[X™XÚÛÜÝØ[›ÛšXØ[ŒÍÍŠŠKX\ÏX™XÚÛÜÝX\ÕŒÍÍŠ‹\˜Ú\Ù\ËØ[›ÛšXØ[
K[‹›Y[R][\Ë™š[\ŠOO›K˜XÝ]™HOOHLJKO\‹›X\
OOžØÛÛœÝX™Ø]™XÚ\Q›ÜŠK‹œ™XÚ\\ÊKÏX™Ø]\œ˜^JËš[™Ü™YY[ÊK›ÝÜÏYË›X\
][OO˜™XÚÛÜÝ›ÝÕŒÍÍŠ][KX\ËØ[›ÛšXØ[Ë›[™ÝOOLOÛN›[Ë›[™ÝOOLOØ™Y[TØ[TÚ^™U^ŒŽN
KœØ[TÚ^™_™Y[SYØXÞTÚ^™UŒŽN
K›YØXÞTÜ[Û”Ú^™_KœÜ[Û”Ú^™JJNˆˆŠJK\›Ý™YP›ÛÛX[Š	‰Šœ™]šY]ÔÝ]\ÏOOH˜\›Ý™YŸœÝ]\ÏOOH˜ÛÛ™š\›YYŠJKÛÛ\]OX\›Ý™Y	‰œ›ÝÜË›[™ÝŒ	‰œ›ÝÜË™]™\žJ][OOš][K˜ÛÛ\]JKÝ\œ™[˜ÚY\Ï[™]ÈÙ]
›ÝÜË™š[\Š][OOš][K˜ÛÛ\]JK›X\
][OOš][K˜Ý\œ™[˜ÞJJKÛÜÝÝ\œ™[˜ÞOXÛÛ\]I‰˜Ý\œ™[˜ÚY\ËœÚ^™OOOLOÖË‹‹˜Ý\œ™[˜ÚY\×VÌN›[™XÚ\PÛÜÝXÛÜÝÝ\œ™[˜ÞOÓX]œ›Ý[™
›ÝÜËœ™YXÙJ
Ý[K][JOOœÝ[JÊ][K˜ÛÜÝ
K
JŒL
KÌL›[Ø[TšXÙOX™\ÜÛÜY[[X™\•ŒMÌ
KœØ[TšXÙJOŒØ™\ÜÛÜY[[X™\•ŒMÌ
KœØ[TšXÙJN›[Ø[PÝ\œ™[˜ÞOTÝš[™ÊK˜Ý\œ™[˜Þ_”•PˆŠKÕ\\Ø\ÙJ
KÛÛ\\˜X›O\™XÚ\PÛÜÝO[[	‰˜ÛÜÝÝ\œ™[˜ÞOOO\Ø[PÝ\œ™[˜ÞKÝ]\Ï[K\OOOHœÙ\šXÙHÈœ™XYHŽˆZÈ›Z\ÜÚ[™×Ü™XÚ\HŽˆX\›Ý™YÈœ™]šY]ÈŽ˜ÛÛ\]OÈœ™XYHŽˆ˜][[ÛˆŽÜ™]\›žÚY›KšY˜[YN›K›˜[YKÜ›Ý\Y›K™Ü›Ý\Y[Ü›Ý\˜[YN›‹™Ü›Ý\Ë™š[™
Oš‹šYOO[K™Ü›Ý\Y
OË›˜[Y_
Ø˜\Žˆ´$t,4`‹Ú]Ú[Žˆ´&´`ôat/tcÈ‹ÛÚØZˆ´&´,4.ôc4cô/tbÈŸVÛK™\\Y[_´%4`4`ô,ô/´-HŠKÝX™Ü›Ý\Y›KœÝX™Ü›Ý\Y[Ø]YÛÜžN›K˜Ø]YÛÜž_´$t-t-È4/ô/´-4`4,4-ô-4-t.ô,‹\N›K\_˜ÛÛ\ÜÚ]H‹Ø[TÚ^™N›KœØ[TÚ^™_[Ü[Û”Ú^™N˜™Y[TØ[TÚ^™U^ŒŽN
KœØ[TÚ^™_™Y[SYØXÞTÚ^™UŒŽN
K›YØXÞTÜ[Û”Ú^™_KœÜ[Û”Ú^™JJ_[Ø[TšXÙKÝ\œ™[˜ÞNœØ[PÝ\œ™[˜ÞK™XÚ\RYšËšY[™XÚ\TÝ]\ÎšËœÝ]\ß›Z\ÜÚ[™È‹XÚØ\™Ý]\ÎšØ\›Ý™YÈ˜\›Ý™YŽšœ™]šY]ÔÝ]\ÏOOH˜ZWÙ˜YÈ˜ZWÙ˜YŽˆœ™\]Z\™\×Ü™]šY]ÈŽˆ›Z\ÜÚ[™È‹XÚØ\™ÛÝ\˜ÙNšËœÛÝ\˜Ù_[XÚØ\™™\œÚ[ÛŽšË™\œÚ[ÛŸKXÚØ\™\]Y]šË\]Y]Ë˜ÛÛ™š\›YY][Ý]\Ë[™Ü™YY[ÛÝ[™Ë›[™ÝX\Y[™Ü™YY[ÛÝ[œ›ÝÜË™š[\Š][OOš][Kœ™X\ÛÛˆOOH›X\[™ÈŠK›[™ÝšXÙY[™Ü™YY[ÛÝ[œ›ÝÜË™š[\Š][OOš][K˜ÛÛ\]JK›[™Ý[˜[Y[š]ÛÝ[œ›ÝÜË™š[\Š][OOš][Kœ™X\ÛÛOOH[š]ŠK›[™Ý[›X\Y[™Ü™YY[ÛÝ[œ›ÝÜË™š[\Š][OOš][Kœ™X\ÛÛOOH›X\[™ÈŠK›[™ÝZ\ÜÚ[™ÔšXÙPÛÝ[œ›ÝÜË™š[\Š][OOš][Kœ™X\ÛÛOOHœšXÙHŠK›[™Ý[™Ü™YY[›ÝÜÎœ›ÝÜË™XÚ\PÛÜÝÛÜÝÝ\œ™[˜ÞKÛÜÝ\˜Ù[˜ÛÛ\\˜X›I‰œØ[TšXÙOÓX]œ›Ý[™
™XÚ\PÛÜÝÜØ[TšXÙJŒYLÊKÌL›[[š]Ü›ÜÜÔ›Ùš]˜ÛÛ\\˜X›I‰œØ[TšXÙHO[[ÓX]œ›Ý[™

Ø[TšXÙK\™XÚ\PÛÜÝ
JŒL
KÌL›[ÛÜÝÚ[™ÙT\˜Ù[›[ÛÜÝ\ÝÜžN–×KØ[\Î›[[›™YØ[\Î˜™\ÜÛÜY[[X™\•ŒMÌ
Kœ[›™YØ[\ÊKšXÙR\ÝÜžN˜™Ø]\œ˜^J‹œšXÙR\ÝÜžJK™š[\ŠOš‹›Y[R][RYOO[KšY
__K
KÏXK™š[\ŠOO›KXÚØ\™Ý]\ÏOOH˜\›Ý™YŠK›[™ÝXK™š[\ŠOO›KœÝ]\ÈOOHœ™XYHŠK›[™ÝOXK™š[\ŠOO›Kœ™XÚ\TÝ]\ÏOOH›Z\ÜÚ[™ÈŠK›[™ÝXK™š[\ŠOO›KXÚØ\™Ý]\ÏOOH˜ZWÙ˜YŸKXÚØ\™Ý]\ÏOOHœ™\]Z\™\×Ü™]šY]ÈŠK›[™ÝV×NÝI‰™‹œ\Ú
ÚYˆ›Z\ÜÚ[™Ë\™XÚ\\È‹\Nˆœ™XÚ\WÛZ\ÜÚ[™È‹Û™Nˆœ™Y‹]NJÈˆŠØ™\ÜÛÜY[\˜[ŒMÌ
K´/ô/´-ô.4a´.4cÈ4,t-t-È4`´-tat.´,4`4`´bÈ‹´/ô/´-ô.4a´.4.4,t-t-È4`´-tat.´,4`4`ˆ‹´/ô/´-ô.4a´.4.H4,t-t-È4`´-tat.´,4`4`ˆŠK]Z[ˆ´'t-t.ôc4-ôcÈ4-4/´`t`´/´,´-t`4/t/ˆ4`4,4`t`taô.4`´,4`´c4`t-t,t-t`t`´/´.4/4/´`t`´c4.4/ô/´`´`4-t,t/t/´`t`´c‹XŽˆœ™XÚ\\È‹š[\Žˆ›Z\ÜÚ[™È‹][RY˜K™š[™
OO›Kœ™XÚ\TÝ]\ÏOOH›Z\ÜÚ[™ÈŠOËšY[JK	‰™‹œ\Ú
ÚYˆ™˜Y\™XÚ\\È‹\Nˆœ™XÚ\WÜ™]šY]È‹Û™Nˆ›Ü˜[™ÙH‹]N™
ÈˆŠØ™\ÜÛÜY[\˜[ŒMÌ
´`´-tat.´,4`4`´,4`´`4-t,t`ô-t`ˆ4/ô`4/´,´-t`4.´.‹´`´-tat.´,4`4`´bÈ4`´`4-t,t`ôc´`ˆ4/ô`4/´,´-t`4.´.‹´`´-tat.´,4`4`ˆ4`´`4-t,t`ôc´`ˆ4/ô`4/´,´-t`4.´.ŠK]Z[ˆ´)ô-t`4/t/´,´bô-H4`4-ta´-t/ô`´`ô`4bÈ4/t-H4`ôaô,4`t`´,´`ôc´`ˆ4,ˆ4`4,4`taôdt`´,4aH‹XŽˆœ™XÚ\\È‹š[\Žˆœ™]šY]È‹][RY˜K™š[™
OO›KXÚØ\™Ý]\ÈOOH˜\›Ý™YŠOËšY[JNØÛÛœÝ[™]ÈX\Ù›ÜŠÛÛœÝHÙˆJ^ØÛÛœÝ\™Ù]
K™Ü›Ý\YK™Ü›Ý\˜[YJ_ÚY›K™Ü›Ý\YK™Ü›Ý\˜[YK˜[YN›K™Ü›Ý\˜[YKÝ[ŒØ[Ý[]YŒ][[ÛŽŒNÚÝ[
ÊËKœÝ]\ÏOOHœ™XYHÚ˜Ø[Ý[]Y
ÊÎš˜][[ÛŠÊËœÙ]
šY
_\™]\›žÝ™\œÚ[ÛŽˆ˜\ÜÛÜY[Y˜[˜XÚË]ŒÍÍˆ‹\š[ÙžÚÙ^N™]š[Ý\ÒÙ^Nˆˆ‹ÛÛ\\š\ÛÛ˜\Ú\Îˆ››ÝØÛÛ\\˜X›HŸKÝ[[X\žNžÛY[R][\Î˜K›[™Ý™XY[™\ÜÔ\˜Ù[˜K›[™ÝÓX]œ›Ý[™
ËØK›[™Ý
ŒL
NŒ™XYT™XÚ\\ÎœË][[Û’][\Î›K™XY[™\ÜÎžÜØÛÜ™N˜K›[™ÝÓX]œ›Ý[™
ËØK›[™Ý
ŒL
NŒ›Ü›][Nˆ´&ô/´.´,4.ôc4/tbô.H4`4,4`taôdt`ˆ4/ô/ˆ4/ô/´-4`´,´-t`4-´-4dt/t/tbô/4`t.´.ô,4-4`t.´.4/4-4,4/t/tbô/‹X[™]ÜžN–×K\Ú\˜X›N–×K[˜]˜Z[X›N–×_KÛÝ[ÎžØXÝ]™R][\Î˜K›[™ÝÛÛ™š\›YY™XÚ\\ÎœËZQ˜Y™XÚ\\Î˜K™š[\ŠOO›KXÚØ\™Ý]\ÏOOH˜ZWÙ˜YŠK›[™Ý™]šY]Ô™XÚ\\Î˜K™š[\ŠOO›KXÚØ\™Ý]\ÏOOHœ™\]Z\™\×Ü™]šY]ÈŠK›[™Ý˜Y™XÚ\\Î™Z\ÜÚ[™Ô™XÚ\\ÎK][[Û’][\Î›[›X\Y[™Ü™YY[Î˜Kœ™YXÙJ
K
OO›JÚ[›X\Y[™Ü™YY[ÛÝ[
K[˜[Y[š]Î˜Kœ™YXÙJ
K
OO›JÚš[˜[Y[š]ÛÝ[
KZ\ÜÚ[™Ô\˜Ú\ÙTšXÙ\Î˜Kœ™YXÙJ
K
OO›JÚ›Z\ÜÚ[™ÔšXÙPÛÝ[
KZ\ÜÚ[™ÔØ[TšXÙ\Î˜K™š[\ŠOO›KœØ[TšXÙOO[[
K›[™ÝKÚYÛ˜[Î™‹ÛÜÝÚ[™Ù\Î–×KÙXÝ[ÛœÎ–Ë‹‹œ˜[Y\Ê
WKY[R][\Î˜K™XÚ\\Î˜K™š[\ŠOO›K\HOOHœÙ\šXÙHŠKXÛÛ›ÛZXÜÎžØ]˜Z[X›NˆLK™]™[YN›[ÛÜÝÙ‘ÛÛÙÎ›[ÛÜÝ\˜Ù[›[Ü›ÜÜÓX\™Ú[Ž›[ÛÛ\\š\ÛÛŽ›[[œÝY™šXÚY[™X\ÛÛŽˆ´%4.ôcÈ4ct.´/´/t/´/4.4.´.4/t`ô-´/tbÈ4/ô/´-4`´,´-t`4-´-4dt/t/tbô-H4/ô`4/´-4,4-´.4/ô/ˆ4/ô/´-ô.4a´.4cô/ŸK™YYÎžÚÜš^›Û‘^\Î›‹šÜš^›Û‘^\Ë›ÝÜÎ–×K\ÜÝY\Î–×KÛÛ\]T›ÝÜÎŒ›Ü™XØ\ÝÝ]\Îˆš[œÝY™šXÚY[Ù]H‹›Ü›][Nˆ´(4,4`taôdt`ˆ4/ô/´`´`4-t,t/t/´`t`´.4/´,t/t/´,´.4`´`tcÈ4/ô/´`t.ô-H4`t-t`4,´-t`4/t/´.H4`t.4/tat`4/´/t.4-ô,4a´.4.ŸKÛÝ\˜Ù\Î›‹œÛÝ\˜Ù\ß×K˜[X][ÛŽžØÝ\œ™[ÛÜÝ[Nˆ´(t`4-t-4/t-t,´-ô,´-tb4-t/t/t,4cÈ4`t.´.ô,4-4`t.´,4cÈ4`t`´/´.4/4/´`t`´cÈ4`4-t-ô-t`4,ˆ8 %4/ô/´`t.ô-t-4/tcôcÈ4/ô/´-4`´,´-t`4-´-4dt/t/t,4cÈ4-ô,4.´`ô/ô.´,‹ÛÜÝÚ[™ÙT[Nˆ´'ô/´-4`´,´-t`4-´-4dt/t/tbô-H4-ô,4.´`ô/ô/´aô/tbô-H4a´-t/tbÈŸKZPÛÛ^žØÛÛ™š\›YYY[QXÛÛ›ÛZXÜÎ–×KÚYÛ˜[Î™Ÿ__B™[˜Ý[Ûˆ™\ÜÛÜY[XY\•ŒMÌ
ÝXŽ™KÛ•XŽÛ“›ÛY[˜Û]\™N˜™Ü[“›ÛY[˜Û]\™UŒÍLË›Ùš[N›‹™[YPÛÛ^œŸJ^ØÛÛœÝO\‹™[Y\Ë™š[™
O“[X™\ŠšY
OOOS[X™\Š‹˜XÝ]™U™[YRY
J_‹™[Y\ÖÌKÏXOË›˜[Y_Ë›˜[Y_´'4/´dH4-ô,4,´-t-4-t/t.4-HŽÜ™]\›ˆKšœÞÊšXY\ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[ZXY\‹]ŒMÌ‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[]]X˜\‹]ŒMÌ‹Ú[™[Ž–ÚKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™X\ÜÛÜY[X˜XÚË]ŒMÌ‹ÛÛXÚÎŠ
OOÚ[™ÝË˜™˜]šYØ]P˜XÚÊÚ[™ÝË˜™™XY˜]šYØ][Û”]Y\žJœ™]\›•È‹ˆŠOOOH››ÛY[˜Û]\™HØ™›ÛY[˜Û]\™T™]\›•\›ŒÍŽJ
Nˆ‹Û[Ü™HŠK˜\šXK[X™[ŽÚ[™ÝË˜™™XY˜]šYØ][Û”]Y\žJœ™]\›•È‹ˆŠOOOH››ÛY[˜Û]\™HÈ´'t,4-ô,4-4,ˆ4.´,4`4`´/´aô.´`È4/t/´/4-t/t.´.ô,4`´`ô`4bÈŽˆ´'t,4-ô,4-4,ˆ4%tbtdH‹Ú[™[ŽšKšœÞ
›‹ÜÚ^™NŒNJ_JKKšœÞ
šH‹Ý]Nˆ´$4`t`t/´`4`´.4/4-t/t`ˆ4.4`´-tat.´,4`4`´bÈ‹Ú[™[Žˆ´$4`t`t/´`4`´.4/4-t/t`ˆ4.4`´-tat.´,4`4`´bÈŸJKKšœÞ
™]ˆ‹È™]KX™]™[YKZÜÝŽˆ˜\ÜÛÜY[]ŒMÌ‹Û\ÜÓ˜[YNˆ˜™X\ÜÛÜY[]™[YKZÜÝ]ŒMÌ‹Ú[™[Žœ‹™[Y\Ë›[™Ý‰‰šKšœÞÊœÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[XÝ\œ™[]™[YK]ŒMÌ‹]NœËÚ[™[Ž–ÚKšœÞ
šH‹È˜\šXKZY[ˆŽˆLJKKšœÞ
œÝ›Û™È‹ØÚ[™[ŽœßJW_J_JW_JKKšœÞ
›˜]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[]XœË]ŒMÌ‹˜\šXK[X™[Žˆ´(4,4-ô-4-t.ôbÈ4,4`t`t/´`4`´.4/4-t/t`´,‹Ú[™[Ž–ÞÚYˆ›Ý™\šY]È‹X™[ˆ´'´,t-ô/´`ŸKÚYˆ››ÛY[˜Û]\™H‹X™[ˆ´'t/´/4-t/t.´.ô,4`´`ô`4,ŸKÚYˆ›Y[H‹X™[ˆ´'4-t/tcˆŸKÚYˆœ™XÚ\\È‹X™[ˆ´(´-tat.´,4`4`´bÈŸKÚYˆ›™YYÈ‹X™[ˆ´&ˆ4-ô,4.´`ô/ô.´-HŸWK›X\
OOšKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹˜\šXK\Ù[XÝYŽ™OOOXKšYÛ\ÜÓ˜[YN™OOOXKšYÈ˜XÝ]™HŽˆˆ‹ÛÛXÚÎŠ
OO˜KšYOOH››ÛY[˜Û]\™HØ™Ü[“›ÛY[˜Û]\™UŒÍLÏËŠ
N
KšY
KÚ[™[Ž˜K›X™[KKšY
J_JW_J_B™[˜Ý[Ûˆ™\ÜÛÜY[[\UŒMÌ
ÚXÛÛŽ™K]NÛÜN›‹XÝ[ÛŽœŸJ^Ü™]\›ˆKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[Y[\K]ŒMÌ‹Ú[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÚ[™[ŽšKšœÞ
KÜÚ^™NŒŒŸJ_JKKšœÞ
œÝ›Û™È‹ØÚ[™[ŽJKKšœÞ
œ‹ØÚ[™[Ž›ŸJK—_J_B™[˜Ý[Ûˆ™\ÜÛÜY[\š[ÙŒMÌ
Ü\š[Ù™KÛ”\š[ÙÛÛ\\š\ÛÛŽ›ŸJ^ØÛÛœÝ[™]È]KOV×KÏ[™]ÈÙ]]OO›™]È[‘]U[YQ›Ü›X]
œKT•H‹Û[Ûˆ›Û™È‹YX\Žˆ›[Y\šXÈ‹[YV›Û™Nˆ•UÈŸJK™›Ü›X]
JNÙ›ÜŠ]OLÝOLÎÝJÊÊ^ØÛÛœÝ[™]È]J]K•UÊ‹™Ù]UÑ[YX\Š
K‹™Ù]UÓ[Û

K]KJJKYÒTÓÔÝš[™Ê
KœÛXÙJÊNÜËš\ÊŠ_
Ë˜Y
ŠKKœ\Ú
ÚÙ^N™‹X™[›

_JJ_ZYŠ×—ÍKWÌŸIË\Ý
JI‰ˆ\Ëš\ÊJJ^ØÛÛœÝÝKOYKœÜ]
‹HŠK›X\
[X™\ŠK[™]È]J]K•UÊKLKJJNØK[œÚY
ÚÙ^N™KX™[›
Š_J_\™]\›ˆKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[\\š[Ù]ŒMÌ‹Ú[™[Ž–ÚKšœÞÊ›X™[‹ØÚ[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÚ[™[Žˆ´'ô-t`4.4/´-ŸJKKšœÞ
œÙ[XÝ‹Ý˜[YN™KÛÚ[™ÙNOO
K\™Ù]˜[YJK˜\šXK[X™[Žˆ´'ô-t`4.4/´-4,4/t,4.ô.4-ô,‹Ú[™[Ž˜K›X\
OOšKšœÞ
›Ü[Ûˆ‹Ý˜[YNKšÙ^KÚ[™[ŽK›X™[KKšÙ^JJ_JW_JKKšœÞ
œÛX[‹ØÚ[™[Ž›Ë˜˜\Ú\ÏÈ´(t`4,4,´/t-t/t.4-NˆŠÛ‹˜˜\Ú\Îˆ´&4-ô/4-t/t-t/t.4-H4/ô/´cô,´.4`´`tcÈ4`´/´.ôc4.´/ˆ4-4.ôcÈ4`t/´/ô/´`t`´,4,´.4/4bôaH4/ô-t`4.4/´-4/´,ˆŸJW_J_B™[˜Ý[Ûˆ™\ÜÛÜY[Ý[[X\žUŒMÌ
Ø[˜[]XÜÎ™_J^ØÛÛœÝVÞÛX™[ˆ´'ô/´-ô.4a´.4.4,ˆ4/4-t/tcˆ‹˜[YN™KœÝ[[X\žK›Y[R][\ËÛ™Nˆ›™]]˜[ŸKÛX™[ˆ´$ô/´`´/´,´/t/´`t`´c4-4,4/t/tbôaH‹˜[YN™KœÝ[[X\žKœ™XY[™\ÜÔ\˜Ù[
È‰H‹Û™N™KœÝ[[X\žKœ™XY[™\ÜÔ\˜Ù[NÈ™ÛÛÙŽ™KœÝ[[X\žKœ™XY[™\ÜÔ\˜Ù[MLÈØ\›š[™ÈŽˆ™[™Ù\ˆŸKÛX™[ˆ´(´-tat.´,4`4`´bÈ4,ô/´`´/´,´bÈ‹˜[YN™KœÝ[[X\žKœ™XYT™XÚ\\ËÛ™Nˆ™ÛÛÙŸKÛX™[ˆ´(´`4-t,t`ôc´`ˆ4,´/t.4/4,4/t.4cÈ‹˜[YN™KœÝ[[X\žK˜][[Û’][\ËÛ™N™KœÝ[[X\žK˜][[Û’][\ÏÈ™[™Ù\ˆŽˆ™ÛÛÙŸWNÜ™]\›ˆKšœÞ
œÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[\Ý[[X\žK]ŒMÌ‹˜\šXK[X™[Žˆ´(t/´`t`´/´cô/t.4-H4,4`t`t/´`4`´.4/4-t/t`´,‹Ú[™[Ž›X\
OšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YN›‹Û™KÚ[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÚ[™[Ž›‹›X™[JKKšœÞ
œÝ›Û™È‹ØÚ[™[Ž›‹˜[Y_JW_K‹›X™[
J_J_B™[˜Ý[Ûˆ™\ÜÛÜY[ÚYÛ˜[›ÝÕŒMÌ
ÜÚYÛ˜[™KÛ“Ü[ŽJ^Ü™]\›ˆKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™X\ÜÛÜY[\ÚYÛ˜[]ŒMÌŠÙKÛ™KÛÛXÚÎŠ
OO
JKÚ[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆšXÛÛˆ‹˜\šXKZY[ˆŽˆLÚ[™[ŽšKšœÞ
›‹ÜÚ^™NŒMßJ_JKKšœÞÊœÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜ÛÜH‹Ú[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Ž™K]_JKKšœÞ
œÛX[‹ØÚ[™[Ž™K™]Z[JW_JKKšœÞ
œ‹ÜÚ^™NŒMË˜\šXKZY[ˆŽˆLJW_J_B™[˜Ý[Ûˆ™\ÜÛÜY[Ý™\šY]ÕŒMÌ
Ø[˜[]XÜÎ™K\š[ÙÛ”\š[Ù›‹Û”ÚYÛ˜[œ‹Û’[\Ü˜KÛ•XŽœËØ[“X[˜YÙN›Ý\œ™[˜ÞN˜™\ÜÛÜY[Ý\œ™[˜Þ_J^ØÛÛœÝOYKœÝ[[X\žK›Y[R][\ÏŒYK™XÛÛ›ÛZXÜËYK˜ÛÜÝÚ[™Ù\ß×KOYKœ™XY[™\ÜÏË›X[™]Üž_×KYKœÛÝ\˜Ù\ß×NÜ™]\›ˆKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[[Ý™\šY]Ë]ŒMÌ‹Ú[™[Ž–ÚKšœÞ
™\ÜÛÜY[\š[ÙŒMÌÜ\š[ÙÛ”\š[Ù›‹ÛÛ\\š\ÛÛŽ™Ë˜ÛÛ\\š\ÛÛŸJK]I‰šKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[[Û˜›Ø\™[™Ë]ŒMÌ‹Ú[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÚ[™[ŽšKšœÞ
ÖÜÚ^™NŒŒßJ_JKKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
œ‹ØÚ[™[Žˆ´'ô-t`4,´.4aô/t,4cÈ4/t,4`t`´`4/´.t.´,ŸJKKšœÞ
šˆ‹ØÚ[™[Žˆ´%4/´,t,4,´c4`´-H4/4-t/tcˆ8 %˜\‘ØÝÜˆ4/ô/´-4,ô/´`´/´,´.4`ˆ4`t`´`4`ô.´`´`ô`4`È4.4aô-t`4/t/´,´.4.´.4`´-tat.´,4`4`ˆŸJKKšœÞ
œÛX[‹ØÚ[™[Žˆ´(4,4`t/ô/´-ô/t,4,´,4/t.4-H4,´`t-t,ô-4,4/ô`4/´at/´-4.4`ˆ4aô-t`4-t-È4`t`4,4,´/t-t/t.4-H4.4`4`ôaô/t/´-H4/ô/´-4`´,´-t`4-´-4-t/t.4-Kˆ›ÙXÝ[ÛˆY[H4/t-H4/ô-t`4-t-ô,4/ô.4`tbô,´,4-t`´`tcÈ4,4,´`´/´/4,4`´.4aô-t`t.´.ˆŸJW_JK	‰šKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎ˜KÚ[™[Žˆ´%4/´,t,4,´.4`´c4/4-t/tcˆŸJW_JKI‰šKšœÞ
™\ÜÛÜY[Ý[[X\žUŒMÌØ[˜[]XÜÎ™_JKI‰šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[[Ý™\šY]ËYÜšY]ŒMÌ‹Ú[™[Ž–ÚKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[\[™[]ŒMÌ™XY[™\ÜÈ‹Ú[™[Ž–ÚKšœÞÊšXY\ˆ‹ØÚ[™[Ž–ÚKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
šˆ‹ØÚ[™[Žˆ´$ô/´`´/´,´/t/´`t`´c4-4,4/t/tbôaHŸJKKšœÞ
œ‹ØÚ[™[Ž™Kœ™XY[™\ÜË™›Ü›][_JW_JKKšœÞ
œÝ›Û™È‹ØÚ[™[Ž™Kœ™XY[™\ÜËœØÛÜ™JÈ‰HŸJW_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[\›ÙÜ™\ÜË]ŒMÌ‹Ú[™[ŽšKšœÞ
šH‹ÜÝ[NžÝÚY“X]›X^
X]›Z[ŠLKœ™XY[™\ÜËœØÛÜ™JJJÈ‰HŸ_J_JKK›[™ÝÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[XÚXÚÜË]ŒMÌ‹Ú[™[Ž›K›X\
OšKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OOœÊšYOOHœØ[WÜšXÙHÈ›Y[HŽˆœ™XÚ\\ÈŠKÚ[™[Ž–ÚKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÚKšœÞ
˜ÛÛ\]OOO\Ý[ÔŽ“Ù‹ÜÚ^™NŒM_JKKšœÞ
˜ˆ‹ØÚ[™[Žœ›X™[JW_JKKšœÞÊœÝ›Û™È‹ØÚ[™[Ž–Ü˜ÛÛ\]K‹È‹Ý[_JW_KšY
J_JNšKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[[]]Y]ŒMÌ‹Ú[™[Žˆ´'´,tcô-ô,4`´-t.ôc4/tbô-H4/ô`4/´,´-t`4.´.4/ô/´cô,´cô`´`tcÈ4,´/4-t`t`´-H4`H4,4`t`t/´`4`´.4/4-t/t`´/´/ˆŸJKKœ™XY[™\ÜË™\Ú\˜X›OË›[™ÝŒ	‰šKšœÞÊ™]Z[È‹ØÚ[™[Ž–ÚKšœÞ
œÝ[[X\žH‹ØÚ[™[Žˆ´%´-t.ô,4`´-t.ôc4/tbô-H4-4,4/t/tbô-H8 %4/t-H4,´.ô.4côc´`ˆ4/t,ØÛÜ™HŸJKKœ™XY[™\ÜË™\Ú\˜X›K›X\
OšKšœÞÊœ‹ØÚ[™[Ž–Ü›X™[Žˆ‹˜ÛÛ\]K‹È‹Ý[_KšY
JW_JW_JKKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[\[™[]ŒMÌ][[Ûˆ‹Ú[™[Ž–ÚKšœÞÊšXY\ˆ‹ØÚ[™[Ž–ÚKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
šˆ‹ØÚ[™[Žˆ´)ô`´/ˆ4/4-tb4,4-t`ˆ4`4,4`taôdt`´,4/ŸJKKšœÞ
œ‹ØÚ[™[Žˆ´)4,4.´`ˆ8¡¤ˆ4/ô/´`t.ô-t-4`t`´,´.4-H8¡¤ˆ4/4-t`t`´/ˆ4.4`t/ô`4,4,´.ô-t/t.4cÈŸJW_JKKœÚYÛ˜[ÏË›[™ÝŒ	‰šKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OOœÊœ™XÚ\\ÈŠKÚ[™[Žˆ´(t/4/´`´`4-t`´c4,´`t-HŸJW_JKKœÚYÛ˜[ÏË›[™ÝÚKšœÞ
™]ˆ‹ØÚ[™[Ž™KœÚYÛ˜[ËœÛXÙJJK›X\
OšKšœÞ
™\ÜÛÜY[ÚYÛ˜[›ÝÕŒMÌÜÚYÛ˜[œÛ“Ü[ŽœŸKšY
J_JNšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[XÛX\‹]ŒMÌ‹Ú[™[Ž–ÚKšœÞ
‹ÜÚ^™NŒNJKKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Žˆ´&´`4.4`´.4aô/tbôaH4/ô`4/´,t-t.ô/´,ˆ4/t-t`ˆŸJKKšœÞ
œÛX[‹ØÚ[™[Žˆ´'´,tcô-ô,4`´-t.ôc4/tbô-H4-4,4/t/tbô-H4,ô/´`´/´,´bÈ4-4.ôcÈ4`´-t.´`ôbt-t,ô/ˆ4`4,4`taôdt`´,ˆŸJW_JW_JW_JW_JKKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[\[™[]ŒMÌXÛÛ›ÛZXÜÈ‹Ú[™[Ž–ÚKšœÞÊšXY\ˆ‹ØÚ[™[Ž–ÚKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞÊšˆ‹ØÚ[™[Ž–È´+t.´/´/t/´/4.4.´,4/4-t/tcˆ0­È‹™\ÜÛÜY[[ÛX™[ŒMÌ
Kœ\š[ÙšÙ^JW_JKKšœÞ
œ‹ØÚ[™[Ž™Ëš[œÝY™šXÚY[™X\ÛÛŸ´(´/´.ôc4.´/ˆ4/ô/´-4`´,´-t`4-´-4dt/t/tbô-H4/ô`4/´-4,4-´.4.4-4/´`t`´/´,´-t`4/t,4cÈ4`t-t,t-t`t`´/´.4/4/´`t`´cŸJW_JKKšœÞ
Ù‹ÜÚ^™NŒMŸJW_JKËœ™]™[YHO[[ÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[YXÛÛ›ÛZXÜËYÜšY]ŒMÌ‹Ú[™[Ž–ÞÛX™[ˆ´$´bô`4`ôaô.´,‹˜[YN˜™\ÜÛÜY[[Û™^UŒMÌ
œ™]™[YKK›Y[R][\ÏË–ÌOË˜Ý\œ™[˜Þ_™\ÜÛÜY[Ý\œ™[˜Þ_”•PˆŠ_KÛX™[ˆ´(t-t,t-t`t`´/´.4/4/´`t`´c4/ô`4/´-4,4/t/t/´,ô/ˆ‹˜[YN™˜ÛÜÝÙ‘ÛÛÙÏO[[È´'t-t-4/´`t`´,4`´/´aô/t/ˆ4-4,4/t/tbôaHŽ˜™\ÜÛÜY[[Û™^UŒMÌ
˜ÛÜÝÙ‘ÛÛÙËK›Y[R][\ÏË–ÌOË˜Ý\œ™[˜Þ_™\ÜÛÜY[Ý\œ™[˜Þ_”•PˆŠ_KÛX™[ˆ‘›ÛÙÈ™]™\˜YÙHÛÜÝ‹˜[YN™˜ÛÜÝ\˜Ù[O[[È´'t-t-4/´`t`´,4`´/´aô/t/ˆ4-4,4/t/tbôaHŽ”Ýš[™Ê˜ÛÜÝ\˜Ù[
Kœ™\XÙJ‹ˆ‹‹ŠJÈ‰HŸKÛX™[ˆ´$´,4.ô/´,´,4cÈ4/4,4`4-´,‹˜[YN™™Ü›ÜÜÓX\™Ú[O[[È´'t-t-4/´`t`´,4`´/´aô/t/ˆ4-4,4/t/tbôaHŽ˜™\ÜÛÜY[[Û™^UŒMÌ
™Ü›ÜÜÓX\™Ú[‹K›Y[R][\ÏË–ÌOË˜Ý\œ™[˜Þ_™\ÜÛÜY[Ý\œ™[˜Þ_”•PˆŠ_WK›X\
OšKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÚ[™[Žœ›X™[JKKšœÞ
œÝ›Û™È‹ØÚ[™[Žœ˜[Y_JW_K›X™[
J_JNšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[Z[œÝY™šXÚY[]ŒMÌ‹Ú[™[Ž–ÚKšœÞ
Ù‹ÜÚ^™NŒNJKKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Žˆ´'t-t-4/´`t`´,4`´/´aô/t/ˆ4-4,4/t/tbôaH4-4.ôcÈ4ct.´/´/t/´/4.4.´.4/4-t/tcˆŸJKKšœÞ
œÛX[‹ØÚ[™[Ž™Ëš[œÝY™šXÚY[™X\ÛÛŸ´%4/´,t,4,´c4`´-H4/ô/´-4`´,´-t`4-´-4dt/t/tbô-H4/ô`4/´-4,4-´.4/ô/ˆ4/ô/´-ô.4a´.4cô/4.4-ô,4.´`ô/ô/´aô/tbô-H4a´-t/tbËˆŸJW_JW_JW_JKKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[\[™[]ŒMÌÛÜÝXÚ[™Ù\È‹Ú[™[Ž–ÚKšœÞÊšXY\ˆ‹ØÚ[™[Ž–ÚKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
šˆ‹ØÚ[™[Žˆ´&4-ô/4-t/t-t/t.4cÈ4`t-t,t-t`t`´/´.4/4/´`t`´.ŸJKKšœÞ
œ‹ØÚ[™[Žˆ´(´-t.´`ôbt,4cÈ4`´-tat.´,4`4`´,0åÈ4/ô/´-4`´,´-t`4-´-4dt/t/t,4cÈ4.4`t`´/´`4.4cÈ4-ô,4.´`ô/ô/´aô/tbôaH4a´-t/HŸJW_JK‹›[™ÝŒ	‰šKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OOœÊ›Y[HŠKÚ[™[Žˆ´(t/4/´`´`4-t`´c4,´`t-HŸJW_JK‹›[™ÝÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[XÛÜÝX˜\œË]ŒMÌ‹Ú[™[Ž™‹œÛXÙJJK›X\
OšKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OOœŠÝXŽˆ›Y[H‹š[\Žˆ˜][[Ûˆ‹][RYœšYJKÚ[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÚ[™[Žœ›˜[Y_JKKšœÞ
šH‹ØÛ\ÜÓ˜[YNŠ˜ÛÜÝÚ[™ÙT\˜Ù[
OŒÈ\Žˆ™ÝÛˆ‹Ý[NžÝÚY“X]›Z[ŠLX]›X^
X]˜XœÊ˜ÛÜÝÚ[™ÙT\˜Ù[
J
JJÈ‰HŸ_JKKšœÞ
œÝ›Û™È‹ØÚ[™[Ž˜™\ÜÛÜY[\˜Ù[ŒMÌ
˜ÛÜÝÚ[™ÙT\˜Ù[
_JW_KšY
J_JNšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[Z[œÝY™šXÚY[]ŒMÌ‹Ú[™[Ž–ÚKšœÞ
Ù‹ÜÚ^™NŒNJKKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Žˆ´&4`t`´/´`4.4.4/ô/´.´,4/t-t-4/´`t`´,4`´/´aô/t/ˆŸJKKšœÞ
œÛX[‹ØÚ[™[Žˆ´'ô/´`t.ô-H4/t-t`t.´/´.ôc4.´.4aH4/ô/´-4`´,´-t`4-´-4dt/t/tbôaH4-ô,4.´`ô/ô/´.ˆ˜\‘ØÝÜˆ4/ô/´.´,4-´-t`ˆ4a4,4.´`´.4aô-t`t.´.4-H4/ô`4.4aô.4/tbÈ4.4-ô/4-t/t-t/t.4.KˆŸJW_JW_JW_JKKšœÞ
œÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[\]ZXÚË]ŒMÌ‹Ú[™[Ž–ÚKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆœš[X\žH‹\ØX›Yˆ[ÛÛXÚÎ˜KÚ[™[Ž–ÚKšœÞ
TKÜÚ^™NŒNJKKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[ŽOÈ´'´,t/t/´,´.4`´c4/4-t/tcˆŽˆ´%4/´,t,4,´.4`´c4/4-t/tcˆŸJKKšœÞ
œÛX[‹ØÚ[™[Žˆ´&4/4/ô/´`4`ˆ4.4/´,tcô-ô,4`´-t.ôc4/tbô.HY™ˆŸJW_JW_JKKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OOœÊœ™XÚ\\ÈŠKÚ[™[Ž–ÚKšœÞ
ÖÜÚ^™NŒNJKKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Žˆ´(´-tat.´,4`4`´bÈŸJKKšœÞ
œÛX[‹ØÚ[™[Ž™K˜ÛÝ[Ë™˜Y™XÚ\\ÊÙK˜ÛÝ[Ë›Z\ÜÚ[™Ô™XÚ\\ÏÙK˜ÛÝ[Ë™˜Y™XÚ\\ÊÙK˜ÛÝ[Ë›Z\ÜÚ[™Ô™XÚ\\ÊÈˆ4`´`4-t,t`ôc´`ˆ4,´/t.4/4,4/t.4cÈŽˆ´(4,4`taôdt`´bÈ4,ô/´`´/´,´bÈŸJW_JW_JKKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OOœÊ›™YYÈŠKÚ[™[Ž–ÚKšœÞ
‹ÜÚ^™NŒNJKKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Žˆ´&ˆ4-ô,4.´`ô/ô.´-HŸJKKšœÞ
œÛX[‹ØÚ[™[Ž™K›™YYËœ›ÝÜË›[™ÝÙK›™YYËœ›ÝÜË›[™Ý
Èˆ4/ô/´-ô.4a´.4.HŽˆ´'ô`4/´,´-t`4.4`´c4/ô/´`´`4-t,t/t/´`t`´cŸJW_JW_JW_JK›[™ÝŒ	‰šKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[\[™[]ŒMÌÛÝ\˜Ù\È‹Ú[™[Ž–ÚKšœÞ
šˆ‹ØÚ[™[Žˆ´&4`t`´/´aô/t.4.´.4/4-t/tcˆŸJKKšœÞ
™]ˆ‹ØÚ[™[ŽšœÛXÙJ
K›X\
OšKšœÞÊ˜\XÛH‹ØÚ[™[Ž–ÚKšœÞ
ÖÜÚ^™NŒMŸJKKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Žœ›˜[Y_´'4-t/tcˆŸJKKšœÞ
œÛX[‹ØÚ[™[Ž–ÜœÛÝ\˜Ù_š[\Ü‹œYÙPÛÝ[Èˆ0­ÈŠÜœYÙPÛÝ[
Èˆ4`t`´`ˆŽˆˆ‹š[\ÜY]Èˆ0­ÈŠØ™›ØÑ]UŒMŽ
Ýš[™Êš[\ÜY]
KœÛXÙJL
JNˆˆ—_JW_JKœÛÝ\˜ÙU\›	‰šKšœÞ
˜H‹Ú™YŽœœÛÝ\˜ÙU\›\™Ù]ˆ—Ø›[šÈ‹™[ˆ››Ü™Y™\œ™\ˆ‹Ú[™[Žˆ´'´`4.4,ô.4/t,4.ÈŸJW_KšY
J_JW_JW_J_B™[˜Ý[Ûˆ™\ÜÛÜY[ÛÛ˜\•ŒMÌ
Ü]Y\žN™KÛ”]Y\žNÚ[™[Ž›‹XÙZÛ\ŽœŸJ^Ü™]\›ˆKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[]ÛÛ˜\‹]ŒMÌ‹Ú[™[Ž–ÚKšœÞÊ›X™[‹ØÚ[™[Ž–ÚKšœÞ
KÜÚ^™NŒMŸJKKšœÞ
š[œ]‹Ý˜[YN™KÛÚ[™ÙN˜OO
K\™Ù]˜[YJKXÙZÛ\Žœ‹˜\šXK[X™[ŽœŸJW_JK—_J_B™[˜Ý[Ûˆ™\ÜÛÜY[Ý]\ÓX™[ŒMÌ
J^Ü™]\›ˆOOOHœ™XYHÈ´(4,4`t`taô.4`´,4/t/ˆŽ™OOOH›Z\ÜÚ[™×Ü™XÚ\HÈ´'t-t`ˆ4`´-tat.´,4`4`´bÈŽ™OOOHœ™]šY]ÈÈ´(´`4-t,t`ô-t`ˆ4/ô`4/´,´-t`4.´.Žˆ´(´`4-t,t`ô-t`ˆ4/t,4`t`´`4/´.t.´.ŸB™[˜Ý[Ûˆ™\ÜÛÜY[XÚØ\™X™[ŒMÊJ^Ü™]\›ˆOOOH˜\›Ý™YÈ´(´-tat.´,4`4`´,4-t`t`´cŽ™OOOH˜ZWÙ˜YÈ´)ô-t`4/t/´,´.4.ˆRHŽ™OOOHœ™\]Z\™\×Ü™]šY]ÈÈ´(´`4-t,t`ô-t`ˆ4/ô`4/´,´-t`4.´.Ž™OOOH›[š×Ù\œ›ÜˆÈ´'´b4.4,t.´,4`t,´cô-ô.Žˆ´'t-t`ˆ4`´-tat.´,4`4`´bÈŸB™[˜Ý[Ûˆ™\ÜÛÜY[XÚØ\™ÛÝ\˜ÙUŒMÊJ^Ü™]\›ˆOOOH˜ZHÈRHŽ™OOOHš[\ÜÈ´&4/4/ô/´`4`ˆŽˆ´$´`4`ôaô/t`ôcˆŸB™[˜Ý[Ûˆ™\ÜÛÜY[Y[Q›]ŒMÌ
Ø[˜[]XÜÎ™K]Y\žNÛ”]Y\žN›‹š[\Žœ‹Û‘š[\Ž˜KÙXÝ[ÛŽœËÛ”ÙXÝ[ÛŽ›Û“Ü[ŽKÛY™Û”ÝXÝ\™N™‹Ø[“X[˜YÙN›_J^ØÛÛœÝX™\ÜÛÜY[›Ü›UŒMÌ

KÏJK›Y[R][\ß×JK™š[\ŠOŠÏOOH˜[ŸÝš[™Ê™Ü›Ý\Y™Ü›Ý\˜[YJOOOTÝš[™ÊÊJI‰ŠOOH˜[ŸOOHœ™XYH‰‰œœÝ]\ÏOOHœ™XYHŸOOH˜][[Ûˆ‰‰œœÝ]\ÈOOHœ™XYHŠI‰ŠZ™\ÜÛÜY[›Ü›UŒMÌ
Ü›˜[YK™Ü›Ý\˜[YK˜Ø]YÛÜžWKš›Ú[ŠˆŠJKš[˜ÛY\Ê
JJKO\Oœ
ÈˆŠØ™\ÜÛÜY[\˜[ŒMÌ
´/ô/´-ô.4a´.4cÈ‹´/ô/´-ô.4a´.4.‹´/ô/´-ô.4a´.4.HŠNÜ™]\›ˆKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[[Y[K]ŒMÌ‹Ú[™[Ž–ÚKšœÞ
™\ÜÛÜY[ÛÛ˜\•ŒMÌÜ]Y\žNÛ”]Y\žN›‹XÙZÛ\Žˆ´'ô/´.4`t.ˆ4/ô/ˆ4/4-t/tc¸ )ˆ‹Ú[™[ŽšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[]ÛÛ˜\‹XXÝ[ÛœË]ŒMÌ‹Ú[™[Ž–ÛI‰šKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎ™‹Ú[™[Žˆ´(4,4-ô-4-t.ôbÈŸJW_J_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[Yš[\‹\›ÝË]ŒMÌ‹Ú[™[Ž–ÞÚYˆ˜[‹X™[ˆ´$´`t-HŸKÚYˆœ™XYH‹X™[ˆ´(4,4`t`taô.4`´,4/t/ˆŸKÚYˆ˜][[Ûˆ‹X™[ˆ´(´`4-t,t`ôc´`ˆ4/t,4`t`´`4/´.t.´.ŸWK›X\
OšKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNœOO\šYÈ˜XÝ]™HŽˆˆ‹ÛÛXÚÎŠ
OO˜JšY
KÚ[™[Žœ›X™[KšY
J_JKKœÙXÝ[ÛœÏË›[™ÝŒ	‰šKšœÞ
œÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[\ÙXÝ[ÛœË]ŒMÌ‹Ú[™[Ž–ÚKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNœÏOOH˜[È˜XÝ]™HŽˆˆ‹ÛÛXÚÎŠ
OO›
˜[ŠKÚ[™[Ž–ÚKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÚKšœÞ
šH‹ßJKKšœÞ
œÝ›Û™È‹ØÚ[™[Žˆ´$´`t-H4`4,4-ô-4-t.ôbÈŸJW_JKKšœÞ
œÛX[‹ØÚ[™[ŽžJKœÝ[[X\žK›Y[R][\Ê_JW_JK‹‹™KœÙXÝ[ÛœË›X\
OšKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YN”Ýš[™ÊÊOOOTÝš[™ÊšY
OÈ˜XÝ]™HŽˆˆ‹ÛÛXÚÎŠ
OO›
šY
KÚ[™[Ž–ÚKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÚKšœÞ
šH‹ßJKKšœÞ
œÝ›Û™È‹ØÚ[™[Žœ›˜[Y_JW_JKKšœÞÊœÛX[‹ØÚ[™[Ž–ÞJÝ[
Kˆ0­È‹˜Ø[Ý[]Yˆ4`4,4`t`taô.4`´,4/t/ˆ‹˜][[ÛÈˆ0­ÈŠÜ˜][[ÛŠÈˆ4/t,4`t`´`4/´.4`´cŽˆˆ—_JKKšœÞ
œ‹ÜÚ^™NŒMŸJW_KšY
JW_JKË›[™ÝÚKšœÞ
œÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[[Y[K[\Ý]ŒMÌ‹Ú[™[Ž™Ë›X\
OšKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™X\ÜÛÜY[[Y[K\›ÝË]ŒMÌŠÜœÝ]\ËÛÛXÚÎŠ
OOJ
KÚ[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[[Y[K[X\šË]ŒMÌ‹˜\šXKZY[ˆŽˆLÚ[™[ŽšKšœÞ
ÖÜÚ^™NŒMßJ_JKKšœÞÊœÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜ÛÜH‹Ú[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Žœ›˜[Y_JKKšœÞ
œÛX[‹ØÚ[™[Žœœ™XÚ\PÛÜÝO[[È´(t-t,t-t`t`´/´.4/4/´`t`´cˆŠØ™\ÜÛÜY[[Û™^UŒMÌ
œ™XÚ\PÛÜÝ˜ÛÜÝÝ\œ™[˜Þ_˜Ý\œ™[˜ÞJJÊ˜ÛÜÝ\˜Ù[O[[Èˆ0­ÈŠÔÝš[™Ê˜ÛÜÝ\˜Ù[
Kœ™\XÙJ‹ˆ‹‹ŠJÈ‰HŽˆˆŠNœœ™XÚ\TÝ]\ÏOOH›Z\ÜÚ[™ÈÈ´'t-t`ˆ4`´-tat.´,4`4`´bÈŽœœ™XÚ\TÝ]\ÏOOH™˜YÈ´(´-tat.´,4`4`´,4/t-H4/ô/´-4`´,´-t`4-´-4-t/t,Žˆ´(t-t,t-t`t`´/´.4/4/´`t`´c4/t-H4/´/ô`4-t-4-t.ô-t/t,ŸJK˜ÛÜÝÚ[™ÙT\˜Ù[O[[	‰“X]˜XœÊ˜ÛÜÝÚ[™ÙT\˜Ù[
OMI‰šKšœÞ
™[H‹ØÚ[™[Žˆ´(t-t,t-t`t`´/´.4/4/´`t`´cŠØ™\ÜÛÜY[\˜Ù[ŒMÌ
˜ÛÜÝÚ[™ÙT\˜Ù[
_JW_JKKšœÞÊœÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜[[Ý[‹Ú[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[ŽœœØ[TšXÙHO[[Ø™\ÜÛÜY[[Û™^UŒMÌ
œØ[TšXÙK˜Ý\œ™[˜ÞJNˆ´)´-t/t,4/t-H4`ô.´,4-ô,4/t,ŸJKKšœÞ
œÛX[‹ØÛ\ÜÓ˜[YNœœÝ]\ËÚ[™[Ž˜™\ÜÛÜY[Ý]\ÓX™[ŒMÌ
œÝ]\Ê_JW_JKKšœÞ
œ‹ÜÚ^™NŒMßJW_KšY
J_JNšKšœÞ
™\ÜÛÜY[[\UŒMÌÚXÛÛŽžK]N™K›Y[R][\ÏË›[™ÝÈ´'t.4aô-t,ô/ˆ4/t-H4/t,4.t-4-t/t/ˆŽˆ´$4`t`t/´`4`´.4/4-t/t`ˆ4/ô/´.´,4/ô`ô`t`ˆ‹ÛÜN™K›Y[R][\ÏË›[™ÝÈ´&4-ô/4-t/t.4`´-H4/ô/´.4`t.ˆ4.4.ô.4a4.4.ôc4`´`ˆŽˆ´&4/4/ô/´`4`´.4`4`ô.t`´-H4/4-t/tcˆ4.4.ô.4`t/´-ô-4,4.t`´-H4/ô-t`4,´`ôcˆ4/ô/´-ô.4a´.4cˆ4,´`4`ôaô/t`ôc‹ˆ‹XÝ[ÛŽ›[JW_J_B˜ÛÛœÝ™\ÜÛÜY[\ØÛÜÝ\™RÙ^UŒMÌOH˜™Ø\ÜÛÜY[Ù\ØÛÜÝ\™WÝŒMÌHŽÂ™[˜Ý[Ûˆ™\ÜÛÜY[™XY\ØÛÜÝ\™UŒMÌJ
^Ýž^ØÛÛœÝOR”ÓÓ‹œ\œÙJØØ[ÝÜ˜YÙK™Ù]][J
™\ÜÛÜY[\ØÛÜÝ\™RÙ^UŒMÌJJ_žßHŠNÜ™]\›ˆI‰\[ÙˆOOOH›Øš™XÝ‰‰ˆP\œ˜^Kš\Ð\œ˜^JJOÙNžß_XØ]ÚÜ™]\›žß__B™[˜Ý[Ûˆ™\ÜÛÜY[Üš]Q\ØÛÜÝ\™UŒMÌJJ^Ýž^ÛØØ[ÝÜ˜YÙKœÙ]][J
™\ÜÛÜY[\ØÛÜÝ\™RÙ^UŒMÌJK”ÓÓ‹œÝš[™ÚYžJJJ_XØ]Úß_B™[˜Ý[Ûˆ™\ÜÛÜY[ÛRYŒMÌJJ^Ü™]\›ˆÝš[™Ê_››ÙHŠKœ™\XÙJÖ×˜K^KVŒNWËWJËÙË‹HŠ_B™[˜Ý[Ûˆ™\ÜÛÜY[›ÙT\™[ŒMÌJJ^Ü™]\›ˆÝš[™ÊOËœ\™[YOËœ\™[ÝX™Ü›Ý\YOËœ\™[ÙXÝ[Û’YˆŠKš[J
_B™[˜Ý[Ûˆ™\ÜÛÜY[Y]šXÜÕŒMÌJJ^ØÛÛœÝX™Ø]\œ˜^JJK]™š[\ŠOœ‹œÝ]\ÏOOHœ™XYHŠK›[™ÝÜ™]\›žÝÝ[›[™ÝØ[Ý[]Y›‹][[ÛŽ“X]›X^
›[™Ý[Š__B™[˜Ý[Ûˆ™\ÜÛÜY[Y]šXÜÕ^ŒMÌJJ^ØÛÛœÝX™\ÜÛÜY[Y]šXÜÕŒMÌJJK]Ý[
ÈˆŠØ™\ÜÛÜY[\˜[ŒMÌ
Ý[´/ô/´-ô.4a´.4cÈ‹´/ô/´-ô.4a´.4.‹´/ô/´-ô.4a´.4.HŠNÜ™]\›ˆŠÈˆ0­ÈŠÝ˜Ø[Ý[]Y
Èˆ4`4,4`t`taô.4`´,4/t/ˆŠÊ˜][[ÛÈˆ0­ÈŠÝ˜][[ÛŠÈˆ4`´`4-t,t`ôc´`ˆ4/t,4`t`´`4/´.t.´.ŽˆˆŠ_B™[˜Ý[Ûˆ™\ÜÛÜY[X]Ú\ÕŒMÌJKŠ^ØÛÛœÝYKXÚØ\™Ý]\ßKœ™XÚ\TÝ]\ÎÜ™]\›ŠOOH˜[ŸOOH›Z\ÜÚ[™È‰‰™Kœ™XÚ\TÝ]\ÏOOH›Z\ÜÚ[™ÈŸOOHœ™]šY]È‰‰œOOHœ™\]Z\™\×Ü™]šY]ÈŸOOH˜ZWÙ˜Y‰‰ŠOOH˜ZWÙ˜YŸKš\Ô[™[™Ñ˜Y
_OOHÚ]Ü™XÚ\H‰‰™Kœ™XÚ\TÝ]\ÈOOH›Z\ÜÚ[™ÈŠI‰Š]™\ÜÛÜY[›Ü›UŒMÌ
ÙK›˜[YKK™Ü›Ý\˜[YKK˜Ø]YÛÜžWKš›Ú[ŠˆŠJKš[˜ÛY\Ê
J_B™[˜Ý[Ûˆ™\ÜÛÜY[Y\˜\˜ÚUŒMÌJK
^ØÛÛœÝX™Ø]Ý]J
KX™Ø]\œ˜^JOË›Y[R][\ÊKO[™]ÈX\Ù›ÜŠÛÛœÝÈÙˆ™Ø]\œ˜^J‹™Ü›Ý\ÊJ^ØÛÛœÝOTÝš[™ÊËšY
NØKœÙ]
KË‹‹™ËYžK˜[YN™Ë›˜[Y_Ë›X™[´(4,4-ô-4-t.È‹\™XÝ][\Î–×K›ÛÝÎ–×K[][\Î–×_J_Y›ÜŠÛÛœÝÈÙˆŠ^ØÛÛœÝOTÝš[™ÊË™Ü›Ý\YË™Ü›Ý\˜[Y_›Ý\ˆŠNØKš\ÊJ_KœÙ]
KÚYžK˜[YN™Ë™Ü›Ý\˜[Y_´%4`4`ô,ô/´-H‹YØXÞQ\\Y[ˆ›Ý\ˆ‹ÛÜÜ™\Ž˜KœÚ^™K\™XÝ][\Î–×K›ÛÝÎ–×K[][\Î–×_J_XÛÛœÝÏ[™]ÈX\Ù›ÜŠÛÛœÝÈÙˆ™Ø]\œ˜^J‹œÝX™Ü›Ý\ÊJ^ØÛÛœÝOTÝš[™ÊËšY
KTÝš[™ÊË™Ü›Ý\YˆŠNÞI‰š‰‰˜Kš\ÊŠI‰œËœÙ]
KË‹‹™ËYžKÜ›Ý\Yš‹˜[YN™Ë›˜[Y_Ë›X™[´'ô/´-4`4,4-ô-4-t.È‹][\Î–×KÚ[™[Ž–×K[][\Î–×_J_Y›ÜŠÛÛœÝÈÙˆŠ^ØÛÛœÝOTÝš[™ÊËœÝX™Ü›Ý\YˆŠNÚYŠ^_Ëš\ÊJJXÛÛ[YNØÛÛœÝTÝš[™ÊË™Ü›Ý\YË™Ü›Ý\˜[Y_›Ý\ˆŠNØKš\ÊŠI‰œËœÙ]
KÚYžKÜ›Ý\Yš‹˜[YN™Ë˜Ø]YÛÜž_´$t-t-È4/ô/´-4`4,4-ô-4-t.ô,‹ÛÜÜ™\ŽŽNNNK][\Î–×KÚ[™[Ž–×K[][\Î–×_J_Y›ÜŠÛÛœÝÈÙˆŠ^ØÛÛœÝOTÝš[™ÊË™Ü›Ý\YË™Ü›Ý\˜[Y_›Ý\ˆŠKTÝš[™ÊËœÝX™Ü›Ý\YˆŠK\Ë™Ù]
ŠKXK™Ù]
JNÝ‰‰‹™Ü›Ý\YOO^OÝ‹š][\Ëœ\Ú
ÊN˜Ë™\™XÝ][\Ëœ\Ú
Ê_XÛÛœÝJËJOO˜™Ø][X™\ŠËœÛÜÜ™\ŠKX™Ø][X™\ŠKœÛÜÜ™\Š_Ýš[™ÊË›˜[YJK›ØØ[PÛÛ\\™JÝš[™ÊK›˜[YJKœHŠKOYÏOžÙË˜Ú[™[‹œÛÜ

NÙ›ÜŠÛÛœÝHÙˆË˜Ú[™[Š]JJ_KJËKŠOOžÛ]^NØÛÛœÝ[™]ÈÙ]
Ù×JNÙ›ÜŠ]LÝ‰‰“Z‹œÚ^™NÓŠÊÊ^ÚYŠ‹š\ÊŠJ\™]\›ˆLØ‹˜Y
ŠNÝZ‹™Ù]
Š_ˆŸ\™]\›ˆL_KV×NÙ›ÜŠÛÛœÝÈÙˆË‹‹˜K˜[Y\Ê
WKœÛÜ

J^ØÛÛœÝOVË‹‹œË˜[Y\Ê
WK™š[\ŠO‹™Ü›Ý\YOOYËšY
K[™]ÈX\
K›X\
O–Ý‹šY™\ÜÛÜY[›ÙT\™[ŒMÌJŠWJJNÙËœ›ÛÝÏV×NÙ›ÜŠÛÛœÝˆÙˆJ^ØÛÛœÝZ‹™Ù]
‹šY
_ˆ‹\Ë™Ù]
ŠNØ‰‰“‰‰“‹™Ü›Ý\YOOYËšY	‰ˆY
‹šY‹ŠOÓ‹˜Ú[™[‹œ\Ú
ŠN™Ëœ›ÛÝËœ\Ú
Š_YËœ›ÛÝËœÛÜ

NÙ›ÜŠÛÛœÝˆÙˆËœ›ÛÝÊ]JŠNØÛÛœÝ]OžØÛÛœÝVË‹‹‹š][\×NÙ›ÜŠÛÛœÝHÙˆ‹˜Ú[™[ŠS‹œ\Ú
‹‹˜ŠJJNÜ™]\›ˆ‹˜[][\ÏS‹ŸNÙ›ÜŠÛÛœÝˆÙˆËœ›ÛÝÊXŠŠNÙË˜[][\ÏVË‹‹™Ë™\™XÝ][\Ë‹‹™Ëœ›ÛÝË™›]X\
O‹˜[][\ÊWNÙË˜[][\Ë›[™Ý	‰™‹œ\Ú
Ê_\™]\›ˆŸB™[˜Ý[Ûˆ™\ÜÛÜY[Y[R][T›ÝÕŒMÌJÚ][N™KÛ“Ü[ŽJ^ØÛÛœÝYKXÚØ\™Ý]\ßKœ™XÚ\TÝ]\ËX™\ÜÛÜY[XÚØ\™X™[ŒMÊŠKOYKš\Ô[™[™Ñ˜YÈˆ0­È4%t`t`´cRKtaô-t`4/t/´,´.4.ˆŽˆˆŽÜ™]\›ˆKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™X\ÜÛÜY[[Y[K\›ÝË]ŒMÌŠÙKœÝ]\Ë™]K[Y[KZ][KZYŽ™KšYÛÛXÚÎŠ
OO
JKÚ[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[[Y[K[X\šË]ŒMÌ‹˜\šXKZY[ˆŽˆLÚ[™[ŽšKšœÞ
ÖÜÚ^™NŒMßJ_JKKšœÞÊœÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜ÛÜH‹Ú[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Ž™K›˜[Y_JKKšœÞ
œÛX[‹ØÚ[™[Ž™Kœ™XÚ\PÛÜÝO[[È´(t-t,t-t`t`´/´.4/4/´`t`´cˆŠØ™\ÜÛÜY[[Û™^UŒMÌ
Kœ™XÚ\PÛÜÝK˜ÛÜÝÝ\œ™[˜Þ_K˜Ý\œ™[˜ÞJJÊK˜ÛÜÝ\˜Ù[O[[Èˆ0­ÈŠÔÝš[™ÊK˜ÛÜÝ\˜Ù[
Kœ™\XÙJ‹ˆ‹‹ŠJÈ‰HŽˆˆŠNœŠØ_JKK˜ÛÜÝÚ[™ÙT\˜Ù[O[[	‰“X]˜XœÊK˜ÛÜÝÚ[™ÙT\˜Ù[
OMI‰šKšœÞ
™[H‹ØÚ[™[Žˆ´(t-t,t-t`t`´/´.4/4/´`t`´cŠØ™\ÜÛÜY[\˜Ù[ŒMÌ
K˜ÛÜÝÚ[™ÙT\˜Ù[
_JW_JKKšœÞÊœÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜[[Ý[‹Ú[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Ž™KœØ[TšXÙHO[[Ø™\ÜÛÜY[[Û™^UŒMÌ
KœØ[TšXÙKK˜Ý\œ™[˜ÞJNˆ´)´-t/t,4/t-H4/´/ô`4-t-4-t.ô-t/t,ŸJKKšœÞ
œÛX[‹ØÛ\ÜÓ˜[YNˆXÚXØ\™ŠÛ‹Ú[™[ŽœŸJW_JKKšœÞ
œ‹ÜÚ^™NŒMßJW_KKšY
_B™[˜Ý[Ûˆ™\ÜÛÜY[ÝX™Ü›Ý\ŒMÌJÛ›ÙN™K]Y\žNš[\Ž›‹›Ü˜ÙSÜ[Žœ‹\ØÛÜÝ\™N˜KÛ•ÙÙÛNœËÛ“Ü[Ž›\OL_J^ØÛÛœÝYK˜[][\Ë™š[\ŠO˜™\ÜÛÜY[X]Ú\ÕŒMÌJ‹ŠJNÚYŠY›[™Ý
\™]\›ˆ[ØÛÛœÝHœÝXœÙXÝ[ÛŽˆŠÙKšYO\ŸVÙ—OOOHLH˜™X\ÜÛÜY[\ÝX™Ü›Ý\HŠØ™\ÜÛÜY[ÛRYŒMÌJKšY
KÏYKš][\Ë™š[\ŠO˜™\ÜÛÜY[X]Ú\ÕŒMÌJ‹ŠJKOYK˜Ú[™[‹™š[\ŠO˜‹˜[][\ËœÛÛYJO˜™\ÜÛÜY[X]Ú\ÕŒMÌJ‹ŠJJNÜ™]\›ˆKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[\ÝX™Ü›Ý\]ŒMÌHŠÊOÈ›Ü[ˆŽˆˆŠK™]KX\ÜÛÜY[\ÝXœÙXÝ[Û‹ZYŽ™KšY™]KY\ŽKÝ[NžÈ‹KX™X\ÜÛÜY[Y\]ŒMÌHŽ_KÚ[™[Ž–ÚKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™X\ÜÛÜY[\ÝX™Ü›Ý\]ÙÙÛK]ŒMÌH‹ÛÛXÚÎŠ
OOœÊ‹JK˜\šXKY^[™YŽ›K˜\šXKXÛÛ›ÛÈŽšÚ[™[Ž–ÚKšœÞÊœÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜ÛÜH‹Ú[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Ž™K›˜[Y_JKKšœÞ
œÛX[‹ØÚ[™[Ž˜™\ÜÛÜY[Y]šXÜÕ^ŒMÌJK˜[][\Ê_JW_JKKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[XÚ]œ›Û‹]ŒMÌH‹˜\šXKZY[ˆŽˆLÚ[™[Ž›OÈ¸£!Žˆ¸ .ˆŸJW_JKI‰šKšœÞÊ™]ˆ‹ÚYšÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[Y^[™]ŒMÌH‹Ú[™[Ž–ÙË›[™ÝŒ	‰šKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[[Y[K[\Ý]ŒMÌ™X\ÜÛÜY[[Y[KZ][\Ë]ŒMÌH‹Ú[™[Ž™Ë›X\
OšKšœÞ
™\ÜÛÜY[Y[R][T›ÝÕŒMÌKÚ][N˜‹Û“Ü[Ž›K‹šY
J_JK‹‹žK›X\
OšKšœÞ
™\ÜÛÜY[ÝX™Ü›Ý\ŒMÌKÛ›ÙN˜‹]Y\žNš[\Ž›‹›Ü˜ÙSÜ[Žœ‹\ØÛÜÝ\™N˜KÛ•ÙÙÛNœËÛ“Ü[Ž›\JÌ_K‹šY
JW_JW_KKšY
_B™[˜Ý[Ûˆ™\ÜÛÜY[Y[UŒMÌ
Ø[˜[]XÜÎ™K]Y\žNÛ”]Y\žN›‹š[\Žœ‹Û‘š[\Ž˜KÙXÝ[ÛŽœËÛ”ÙXÝ[ÛŽ›Û“Ü[ŽKÛY™Û”ÝXÝ\™N™‹Ø[“X[˜YÙN›_J^ØÛÛœÝX™\ÜÛÜY[›Ü›UŒMÌ

KÏTÝš[™ÊØØ[ÝÜ˜YÙK™Ù]][J˜™ØXÝ]™WÝ™[YWÚYŠ_ˆŠKÞK—OTË\ÙTÝ]J

OO˜™\ÜÛÜY[™XY\ØÛÜÝ\™UŒMÌJ
JNÔË\ÙQY™™XÝ


OOšŠ™\ÜÛÜY[™XY\ØÛÜÝ\™UŒMÌJ
JKÙ×JNØÛÛœÝTË\ÙSY[[Ê

OO˜™\ÜÛÜY[Y\˜\˜ÚUŒMÌJK™Ø]Ý]JŠ™Ø][ÙÔÝÜ™RÙ^JJJKÙK×JKP›ÛÛX[ŠˆOOH˜[ŠK]‹™š[\ŠOO‘K˜[][\ËœÛÛYJÏO˜™\ÜÛÜY[X]Ú\ÕŒMÌJËŠJJKOJKÊOOžÚŠÏOžØÛÛœÝO^Ë‹‹“ËÐWNˆZßNÜ™]\›ˆ™\ÜÛÜY[Üš]Q\ØÛÜÝ\™UŒMÌJJK_J_NÜ™]\›ˆKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[[Y[K]ŒMÌ™X\ÜÛÜY[[Y[KZY\˜\˜ÚK]ŒMÌH‹Ú[™[Ž–ÚKšœÞ
™\ÜÛÜY[ÛÛ˜\•ŒMÌÜ]Y\žNÛ”]Y\žN›‹XÙZÛ\Žˆ´'ô/´.4`t.ˆ4/ô/ˆ4/4-t/tc¸ )ˆ‹Ú[™[ŽšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[]ÛÛ˜\‹XXÝ[ÛœË]ŒMÌ‹Ú[™[Ž–ÛI‰šKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎ™‹Ú[™[Žˆ´(4,4-ô-4-t.ôbÈŸJW_J_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[Yš[\‹\›ÝË]ŒMÌ‹Ú[™[Ž–ÞÚYˆ˜[‹X™[ˆ´$´`t-HŸKÚYˆ›Z\ÜÚ[™È‹X™[ˆ´$t-t-È4`´-tat.´,4`4`´bÈŸKÚYˆœ™]šY]È‹X™[ˆ´(´`4-t,t`ôc´`ˆ4/ô`4/´,´-t`4.´.ŸKÚYˆ˜ZWÙ˜Y‹X™[ˆRKtaô-t`4/t/´,´.4.´.ŸKÚYˆÚ]Ü™XÚ\H‹X™[ˆ´(H4`´-tat.´,4`4`´/´.HŸWK›X\
OOšKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNœOOPKšYÈ˜XÝ]™HŽˆˆ‹ÛÛXÚÎŠ
OO˜JKšY
KÚ[™[ŽK›X™[KKšY
J_JK‹›[™ÝÚKšœÞ
œÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[XXØÛÜ™[Û‹]ŒMÌH‹˜\šXK[X™[Žˆ´(t`´`4`ô.´`´`ô`4,4/4-t/tcˆ‹Ú[™[Ž“‹›X\

KÊOOžØÛÛœÝÏHœÙXÝ[ÛŽˆŠÐKšYOXŸÝš[™ÊÊOOOTÝš[™ÊKšY
_VÓ×OOOHLH˜™X\ÜÛÜY[\ÙXÝ[Û‹HŠØ™\ÜÛÜY[ÛRYŒMÌJKšY
KPK™\™XÝ][\Ë™š[\ŠO˜™\ÜÛÜY[X]Ú\ÕŒMÌJŠJKPKœ›ÛÝË™š[\ŠO“˜[][\ËœÛÛYJOO˜™\ÜÛÜY[X]Ú\ÕŒMÌJKŠJJNÜ™]\›ˆKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[\ÙXÝ[Û‹]ŒMÌHŠÊOÈ›Ü[ˆŽˆˆŠK™]KX\ÜÛÜY[\ÙXÝ[Û‹ZYŽKšYÚ[™[Ž–ÚKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™X\ÜÛÜY[\ÙXÝ[Û‹]ÙÙÛK]ŒMÌH‹ÛÛXÚÎŠ
OOžÔÝš[™ÊÊOOOTÝš[™ÊKšY
I‰œÈOOH˜[‰‰›
˜[ŠKJËJ_K˜\šXKY^[™YŽ“K˜\šXKXÛÛ›ÛÈŽ‘Ú[™[Ž–ÚKšœÞÊœÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ]H‹Ú[™[Ž–ÚKšœÞ
šH‹ØÛ\ÜÓ˜[YNˆÛ™HÛ™KHŠÊÉLÊK˜\šXKZY[ˆŽˆLJKKšœÞÊœÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜ÛÜH‹Ú[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[ŽK›˜[Y_JKKšœÞ
œÛX[‹ØÚ[™[Ž˜™\ÜÛÜY[Y]šXÜÕ^ŒMÌJK˜[][\Ê_JW_JW_JKKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[XÚ]œ›Û‹]ŒMÌH‹˜\šXKZY[ˆŽˆLÚ[™[Ž“OÈ¸£!Žˆ¸ .ˆŸJW_JKI‰šKšœÞÊ™]ˆ‹ÚY‘Û\ÜÓ˜[YNˆ˜™X\ÜÛÜY[Y^[™]ŒMÌH™X\ÜÛÜY[\ÙXÝ[Û‹XÛÛ[]ŒMÌH‹Ú[™[Ž–Þ‹›[™ÝŒ	‰šKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[[Y[K[\Ý]ŒMÌ™X\ÜÛÜY[[Y[KZ][\Ë]ŒMÌH\™XÝ‹Ú[™[Žž‹›X\
OšKšœÞ
™\ÜÛÜY[Y[R][T›ÝÕŒMÌKÚ][N“Û“Ü[Ž_KšY
J_JK‹‹‘‹›X\
OšKšœÞ
™\ÜÛÜY[ÝX™Ü›Ý\ŒMÌKÛ›ÙN“]Y\žNšš[\Žœ‹›Ü˜ÙSÜ[Ž˜‹\ØÛÜÝ\™NžKÛ•ÙÙÛN‘KÛ“Ü[Ž_KšY
JW_JW_KKšY
_J_JNšKšœÞ
™\ÜÛÜY[[\UŒMÌÚXÛÛŽžK]N™K›Y[R][\ÏË›[™ÝÈ´'t.4aô-t,ô/ˆ4/t-H4/t,4.t-4-t/t/ˆŽˆ´$4`t`t/´`4`´.4/4-t/t`ˆ4/ô/´.´,4/ô`ô`t`ˆ‹ÛÜN™K›Y[R][\ÏË›[™ÝÈ´&4-ô/4-t/t.4`´-H4/ô/´.4`t.ˆ4.4.ô.4a4.4.ôc4`´`ˆŽˆ´&4/4/ô/´`4`´.4`4`ô.t`´-H4/4-t/tcˆ4.4.ô.4`t/´-ô-4,4.t`´-H4/ô-t`4,´`ôcˆ4/ô/´-ô.4a´.4cˆ4,´`4`ôaô/t`ôc‹ˆ‹XÝ[ÛŽ›[JW_J_B™[˜Ý[Ûˆ™\ÜÛÜY[™XÚ\\ÕŒMÌ
Ø[˜[]XÜÎ™K]Y\žNÛ”]Y\žN›‹š[\Žœ‹Û‘š[\Ž˜KÛ“Ü[ŽœËÛÜ™X]N›Ø[“X[˜YÙN_J^ØÛÛœÝX™\ÜÛÜY[›Ü›UŒMÌ

KJKœ™XÚ\\ß×JK™š[\ŠOžØÛÛœÝÏZXÚØ\™Ý]\ßœ™XÚ\TÝ]\ËOZ[›X\Y[™Ü™YY[ÛÝ[Œš[˜[Y[š]ÛÝ[ŒÜ™]\›ŠOOH˜[ŸOOH›Z\ÜÚ[™È‰‰šœ™XÚ\TÝ]\ÏOOH›Z\ÜÚ[™ÈŸOOHœ™]šY]È‰‰™ÏOOHœ™\]Z\™\×Ü™]šY]ÈŸOOH˜ZWÙ˜Y‰‰ŠÏOOH˜ZWÙ˜YŸš\Ô[™[™Ñ˜Y
_OOHœ™XYH‰‰™ÏOOH˜\›Ý™YŸOOH˜œ›ÚÙ[ˆ‰‰žJI‰ŠY™\ÜÛÜY[›Ü›UŒMÌ
Ú›˜[YK‹‹Šš[™Ü™YY[›ÝÜß×JK›X\
Oš‹›˜[YJWKš›Ú[ŠˆŠJKš[˜ÛY\Ê
J_JNÜ™]\›ˆKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[\™XÚ\\Ë]ŒMÌ‹Ú[™[Ž–ÚKšœÞ
™\ÜÛÜY[ÛÛ˜\•ŒMÌÜ]Y\žNÛ”]Y\žN›‹XÙZÛ\Žˆ´'ô/´.4`t.ˆ4`´-tat.´,4`4`´bÈ4.4.ô.4.4/t,ô`4-t-4.4-t/t`´,8 )ˆŸJKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[Yš[\‹\›ÝË]ŒMÌ‹Ú[™[Ž–ÞÚYˆ˜[‹X™[ˆ´$´`t-HŸKÚYˆ›Z\ÜÚ[™È‹X™[ˆ´$t-t-È4`´-tat.´,4`4`´bÈŸKÚYˆœ™]šY]È‹X™[ˆ´(´`4-t,t`ôc´`ˆ4/ô`4/´,´-t`4.´.ŸKÚYˆ˜ZWÙ˜Y‹X™[ˆRKtaô-t`4/t/´,´.4.´.ŸKÚYˆœ™XYH‹X™[ˆ´$ô/´`´/´,´bÈŸKÚYˆ˜œ›ÚÙ[ˆ‹X™[ˆ´'ô`4/´,t.ô-t/4bÈ4`t,´cô-ô-t.HŸWK›X\
OšKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNœOOZšYÈ˜XÝ]™HŽˆˆ‹ÛÛXÚÎŠ
OO˜JšY
KÚ[™[Žš›X™[KšY
J_JKKšœÞ
œÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[\™XÚ\K\Ý[[X\žK]ŒMÌ‹Ú[™[Ž–ÞÛX™[ˆ´'ô/´-ô.4a´.4.‹˜[YN™K˜ÛÝ[Ë˜XÝ]™R][\ßKÛX™[ˆ´(ô`´,´-t`4-´-4-t/tbÈ‹˜[YN™K˜ÛÝ[Ë˜ÛÛ™š\›YY™XÚ\\ËÛ™Nˆ™ÛÛÙŸKÛX™[ˆRKtaô-t`4/t/´,´.4.´.‹˜[YN™K˜ÛÝ[Ë˜ZQ˜Y™XÚ\\ßÛ™NˆØ\›š[™ÈŸKÛX™[ˆ´'t,4/ô`4/´,´-t`4.´-H‹˜[YN™K˜ÛÝ[Ëœ™]šY]Ô™XÚ\\ßÛ™NˆØ\›š[™ÈŸKÛX™[ˆ´$t-t-È4`´-tat.´,4`4`´bÈ‹˜[YN™K˜ÛÝ[Ë›Z\ÜÚ[™Ô™XÚ\\ËÛ™Nˆ™[™Ù\ˆŸWK›X\
OšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNšÛ™_ˆ‹Ú[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÚ[™[Žš›X™[JKKšœÞ
œÝ›Û™È‹ØÚ[™[Žš˜[Y_JW_K›X™[
J_JK‹›[™ÝÚKšœÞ
œÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[\™XÚ\K[\Ý]ŒMÌ‹Ú[™[Ž™‹›X\
OžØÛÛœÝÏZXÚØ\™Ý]\ßœ™XÚ\TÝ]\ËOX™\ÜÛÜY[XÚØ\™X™[ŒMÊÊKZ[›X\Y[™Ü™YY[ÛÝ[
Úš[˜[Y[š]ÛÝ[Ü™]\›ˆKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™X\ÜÛÜY[\™XÚ\KXØ\™]ŒMÌŠÚœÝ]\ËÛÛXÚÎŠ
OOœÊ
KÚ[™[Ž–ÚKšœÞÊšXY\ˆ‹ØÚ[™[Ž–ÚKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÚKšœÞ
ÖÜÚ^™NŒNJKKšœÞ
œÝ›Û™È‹ØÚ[™[Žš›˜[Y_JW_JKKšœÞ
™[H‹ØÛ\ÜÓ˜[YN™ËÚ[™[Žž_JW_JKš[™Ü™YY[›ÝÜÏË›[™ÝÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆš[™Ü™YY[È‹Ú[™[Žšš[™Ü™YY[›ÝÜËœÛXÙJJK›X\
OšKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÚKšœÞ
˜ˆ‹ØÚ[™[Ž‹›˜[Y_JKKšœÞÊœÛX[‹ØÚ[™[Ž–Ø™XÚÛÜÝ[™P[[Ý[ŒÎLÊŠK‹˜ÛÛ\]OÈˆ0­ÈŠØ™\ÜÛÜY[[Û™^UŒMÌ
‹˜ÛÜÝ‹˜Ý\œ™[˜ÞJN‹œ™X\ÛÛOOH›X\[™ÈÈˆ0­È4't-H4`t,´cô-ô,4/t/ˆ4`H4/t/´/4-t/t.´.ô,4`´`ô`4/´.HŽ‹œ™X\ÛÛOOH[š]Èˆ0­È4't-t,´-t`4/t,4cÈ4-t-4.4/t.4a´,Žˆˆ0­È4(t`´/´.4/4/´`t`´c4/t-t.4-ô,´-t`t`´/t,—_JW_K‹šY
J_JNšKšœÞ
œ‹ØÚ[™[Žˆ´&4/t,ô`4-t-4.4-t/t`´bÈ4/ô/´.´,4/t-H4-4/´,t,4,´.ô-t/tbÈŸJKKšœÞÊ™›ÛÝ\ˆ‹ØÚ[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÚ[™[Žšœ™XÚ\PÛÜÝO[[È´(t-t,t-t`t`´/´.4/4/´`t`´cˆŠØ™\ÜÛÜY[[Û™^UŒMÌ
œ™XÚ\PÛÜÝ˜ÛÜÝÝ\œ™[˜Þ_˜Ý\œ™[˜ÞJNšš[™Ü™YY[ÛÝ[	‰šœšXÙY[™Ü™YY[ÛÝ[È´(t-t,t-t`t`´/´.4/4/´`t`´c4`4,4`t`taô.4`´,4/t,4/t-H4/ô/´.ô/t/´`t`´c4cˆŽˆ´(t-t,t-t`t`´/´.4/4/´`t`´c4/t-H4`4,4`t`taô.4`´,4/t,ŸJK˜ÛÜÝ\˜Ù[O[[	‰šKšœÞÊ˜ˆ‹ØÚ[™[Ž–ÔÝš[™Ê˜ÛÜÝ\˜Ù[
Kœ™\XÙJ‹ˆ‹‹ŠK‰H—_JKŒ	‰šKšœÞÊ™[H‹ØÚ[™[Ž–Ú‹ˆ4`t,´cô-ô-t.H4/ô`4/´,´-t`4.4`´c—_JKš\Ô[™[™Ñ˜Y	‰šKšœÞ
™[H‹ØÚ[™[Žˆ´%t`t`´cRKtaô-t`4/t/´,´.4.ˆŸJKKšœÞ
œ‹ÜÚ^™NŒMßJW_JW_KšY
_J_JNšKšœÞ
™\ÜÛÜY[[\UŒMÌÚXÛÛŽšÖ]N™Kœ™XÚ\\ÏË›[™ÝÈ´'t.4aô-t,ô/ˆ4/t-H4/t,4.t-4-t/t/ˆŽˆ´(´-tat.´,4`4`´bÈ4/ô/´.´,4/t-H4`t/´-ô-4,4/tbÈ‹ÛÜN™Kœ™XÚ\\ÏË›[™ÝÈ´&4-ô/4-t/t.4`´-H4/ô/´.4`t.ˆ4.4.ô.4`t`´,4`´`ô`KˆŽˆ´(t/´-ô-4,4.t`´-H4`´-tat.´,4`4`´`È4.4-È4/ô/´-ô.4a´.4.4/4-t/tcˆ8 %4/´,tcô-ô,4`´-t.ôc4/tbô-H4/ô/´.ôcÈ4/4/´-´/t/ˆ4-4/´/ô/´.ô/t.4`´c4/ô/´-ô-´-Kˆ‹XÝ[ÛŽI‰šKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎ›Ú[™[Žˆ´$´bô,t`4,4`´c4/ô/´-ô.4a´.4cˆ4,t-t-È4`´-tat.´,4`4`´bÈŸJ_JKI‰šKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™X\ÜÛÜY[]ÚYKXÝK]ŒMÌ‹ÛÛXÚÎ›Ú[™[Ž–ÚKšœÞ
ÜÚ^™NŒNJK´$´bô,t`4,4`´c4/ô/´-ô.4a´.4cˆ4,t-t-È4`´-tat.´,4`4`´bÈ—_JW_J_B™[˜Ý[Ûˆ™\ÜÛÜY[™YYÕŒMÌ
Ø[˜[]XÜÎ™KÛ’Üš^›ÛŽÛ”Ý\Y\Ž›‹Û’[\›˜[œ‹Ø[“X[˜YÙN˜_J^ØÛÛœÝÏYK›™YYË\Ëœ›ÝÜß×KO\Ëš\ÜÝY\ß×NÜ™]\›ˆKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[[™YYË]ŒMÌ‹Ú[™[Ž–ÚKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[[™YYËZXY]ŒMÌ‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
œ‹ØÚ[™[Žˆ´(4,4`taôdt`´/t,4cÈ4/ô/´`´`4-t,t/t/´`t`´cŸJKKšœÞ
šˆ‹ØÚ[™[Ž››[™ÝÛ›[™Ý
ÈˆŠØ™\ÜÛÜY[\˜[ŒMÌ
›[™Ý´/ô/´-ô.4a´.4cÈ4.ˆ4-ô,4.´`ô/ô.´-H‹´/ô/´-ô.4a´.4.4.ˆ4-ô,4.´`ô/ô.´-H‹´/ô/´-ô.4a´.4.H4.ˆ4-ô,4.´`ô/ô.´-HŠNˆ´'ô/´`´`4-t,t/t/´`t`´c4/t-H4`ta4/´`4/4.4`4/´,´,4/t,ŸJKKšœÞ
œÛX[‹ØÚ[™[ŽœË™›Ü›][_JW_JKKšœÞÊœÙ[XÝ‹Ý˜[YNœËšÜš^›Û‘^\ËÛÚ[™ÙN™O
\™Ù]˜[YJK\ØX›YˆXK˜\šXK[X™[Žˆ´$ô/´`4.4-ô/´/t`ˆ4`4,4`taôdt`´,‹Ú[™[Ž–ÚKšœÞ
›Ü[Ûˆ‹Ý˜[YNËÚ[™[ŽˆÈ4-4/t-t.HŸJKKšœÞ
›Ü[Ûˆ‹Ý˜[YNŒMÚ[™[ŽˆŒM4-4/t-t.HŸJKKšœÞ
›Ü[Ûˆ‹Ý˜[YNŒÌÚ[™[ŽˆŒÌ4-4/t-t.HŸJW_JW_JKË™›Ü™XØ\ÝÝ]\ÈOOHœ™XYH‰‰šKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[Y›Ü™XØ\Ý]Ø\›š[™Ë]ŒMÌ‹Ú[™[Ž–ÚKšœÞ
Ù‹ÜÚ^™NŒNJKKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Žˆ´'t-t-4/´`t`´,4`´/´aô/t/ˆ4-4,4/t/tbôaH4-4.ôcÈ4`´/´aô/t/´,ô/ˆ4/ô`4/´,ô/t/´-ô,ŸJKKšœÞ
œÛX[‹ØÚ[™[Žˆ˜\‘ØÝÜˆ4/ô/´.´,4-ôbô,´,4-t`ˆ4`´/´.ôc4.´/ˆ4`4,4`t`taô.4`´,4/t/tbô-H4`t`´`4/´.´.ˆ4%4.ôcÈ4/´`t`´,4.ôc4/tbôaH4/t`ô-´/tbÈ4/ô`4/´-4,4-´.4.4.ô.4/ô.ô,4/K4/ô/´-4`´,´-t`4-´-4dt/t/tbô-H4`´-tat.´,4`4`´bËX\[™Ë4/´`t`´,4`´.´.4.4a4,4`t/´,´.´,ˆŸJW_JW_JK›[™ÝÚKšœÞ
œÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[[™YYË[\Ý]ŒMÌ‹Ú[™[Ž››X\
OšKšœÞÊ˜\XÛH‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[[™YYXØ\™]ŒMÌŠÊ˜ÛÛ\]OÈœ™XYHŽˆš[˜ÛÛ\]HŠKÚ[™[Ž–ÚKšœÞÊšXY\ˆ‹ØÚ[™[Ž–ÚKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÚKšœÞ
‹ÜÚ^™NŒNJKKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Ž™›˜[Y_JKKšœÞ
œÛX[‹ØÚ[™[Ž™œÝ\Y\“˜[Y_´'ô/´`t`´,4,´bt.4.ˆ4/t-H4/´/ô`4-t-4-t.ôdt/HŸJW_JW_JKKšœÞ
™[H‹ØÚ[™[Ž™˜ÛÛ\]OÈ´(4,4`t`taô.4`´,4/t/ˆŽˆ´'t`ô-´/tbÈ4-4,4/t/tbô-HŸJW_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ›Y]šXÜÈ‹Ú[™[Ž–ÞÛX™[ˆ´'´`t`´,4`´/´.ˆ‹˜[YN˜™\ÜÛÜY[[[Ý[ŒMÌ
˜Ý\œ™[ÝØÚË[š]
_KÛX™[ˆ´'ô/´`´`4-t,t/t/´`t`´c‹˜[YN˜™\ÜÛÜY[[[Ý[ŒMÌ
œ›Ú™XÝY™YY[š]
_KÛX™[ˆ´%4-ta4.4a´.4`ˆ‹˜[YN˜™\ÜÛÜY[[[Ý[ŒMÌ
œÚÜYÙK[š]
_KÛX™[ˆ´&´`ô/ô.4`´c‹˜[YN˜™\ÜÛÜY[[[Ý[ŒMÌ
œ™XÛÛ[Y[™Y[[Ý[[š]
_WK›X\
OšKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÚKšœÞ
œÛX[‹ØÚ[™[Ž™‹›X™[JKKšœÞ
œÝ›Û™È‹ØÚ[™[Ž™‹˜[Y_JW_K‹›X™[
J_JKKšœÞÊ™›ÛÝ\ˆ‹ØÚ[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÚ[™[Ž™™\Ý[X]YÛÜÝO[[È´'´a´-t/t.´,ˆŠØ™\ÜÛÜY[[Û™^UŒMÌ
™\Ý[X]YÛÜÝ˜Ý\œ™[˜ÞJNˆ´(t`´/´.4/4/´`t`´c4/ô/´cô,´.4`´`tcÈ4/ô/´`t.ô-H4/ô/´-4`´,´-t`4-´-4dt/t/t/´.H4a4,4`t/´,´.´.4.4a´-t/tbÈŸJKœ›ÙXÝÙ^I‰šKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OO›Š
KÚ[™[Ž–È´'ô/´`t`´,4,´bt.4.´.‹KšœÞ
œ‹ÜÚ^™NŒM_JW_JW_JW_Kœ›ÙXÝÙ^JÈŸŠÙ[š]
J_JNšKšœÞ
™\ÜÛÜY[[\UŒMÌÚXÛÛŽ”‹]NœË™›Ü™XØ\ÝÝ]\ÏOOHœ™XYHÈ´'ô/´`´`4-t,t/t/´`t`´c4/ô/´.´`4bô`´,Žˆ´'t-t-4/´`t`´,4`´/´aô/t/ˆ4-4,4/t/tbôaH4-4.ôcÈ4`4,4`taôdt`´,‹ÛÜNœË™›Ü™XØ\ÝÝ]\ÏOOHœ™XYHÈ´(´-t.´`ôbt.4-H4/´`t`´,4`´.´.4.4`ô-´-H4-ô,4.´,4-ô,4/t/tbô-H4`´/´,´,4`4bÈ4/ô/´.´`4bô,´,4c´`ˆ4`4,4`t`taô.4`´,4/t/t`ôcˆ4/ô/´`´`4-t,t/t/´`t`´cˆŽˆ´%4/´,t,4,´c4`´-H4/ô.ô,4/H4.4.ô.4.4`t`´/´`4.4cˆ4/ô`4/´-4,4-‹4/ô/´-4`´,´-t`4-4.4`´-H4`´-tat.´,4`4`´bÈ4.4/´,t/t/´,´.4`´-H4/´`t`´,4`´.´.ˆŸJKK›[™ÝŒ	‰šKšœÞÊ™]Z[È‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[[™YYZ\ÜÝY\Ë]ŒMÌ‹Ú[™[Ž–ÚKšœÞÊœÝ[[X\žH‹ØÚ[™[Ž–È´)ô`´/ˆ4/4-tb4,4-t`ˆ4`4,4`taôdt`´`È0­È‹K›[™Ý_JKKšœÞ
™]ˆ‹ØÚ[™[ŽKœÛXÙJŒ
K›X\

ŠOOšKšœÞÊœ‹ØÚ[™[Ž–ÚKšœÞ
Ù‹ÜÚ^™NŒMJK_KŠJ_JW_JKKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[Z[\›˜[]ŒMÌ‹Ú[™[Ž–ÚKšœÞÊšXY\ˆ‹ØÚ[™[Ž–ÚKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
šˆ‹ØÚ[™[Žˆ´(´/´,´,4`4bÈ4,´/t-H4/4-t/tcˆŸJKKšœÞ
œ‹ØÚ[™[Žˆ´(t,4.ôa4-t`´.´.4`ô,ô/´.ôc4`ô/ô,4.´/´,´.´,4at.4/4.4cÈ4.4-4`4`ô,ô.4-H4`4,4`tat/´-4/t.4.´.ŸJW_JKI‰šKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OOœŠßJKÚ[™[Žˆ´%4/´,t,4,´.4`´cŸJW_JKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[[]]Y]ŒMÌ‹Ú[™[Žˆ´(t`ôbt-t`t`´,´`ôc´bt.4.H4.´/´/t`´`ô`4`4,4`tat/´-4/t.4.´/´,ˆ4`t/´at`4,4/tdt/Kˆ4'´/t.4`4,4`t`taô.4`´bô,´,4c´`´`tcÈ4/´`´-4-t.ôc4/t/ˆ4/´`ˆY[H][\È4.4/t-H4`t/4-tb4.4,´,4c´`´`tcÈ4`H4`´-tat.´,4`4`´,4/4.ˆŸJW_JW_J_B™[˜Ý[Ûˆ™\ÜÛÜY[ÚY]ŒMÌ
ÛX™[™K]NÛÜN›‹ÛÛÜÙNœ‹Ú[™[Ž˜K›ÛÝ\ŽœËÛ\ÜÓ˜[YN›HˆŸJ^Ü™]\›ˆKšœÞÊK‘œ˜YÛY[ØÚ[™[Ž–ÚKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™X\ÜÛÜY[\ÚY]\ØÜš[K]ŒMÌ‹˜\šXK[X™[Žˆ´%ô,4.´`4bô`´c‹ÛÛXÚÎœŸJKKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[\ÚY]]ŒMÌŠÛ›ÛNˆ™X[ÙÈ‹˜\šXK[[Ù[ŽˆL˜\šXK[X™[ŽÚ[™[Ž–ÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆš[™HŸJKKšœÞÊšXY\ˆ‹ØÚ[™[Ž–ÚKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÙI‰šKšœÞ
œÜ[ˆ‹ØÚ[™[Ž™_JKKšœÞ
šˆ‹ØÚ[™[ŽJK‰‰šKšœÞ
œ‹ØÚ[™[Ž›ŸJW_JKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎœ‹˜\šXK[X™[Žˆ´%ô,4.´`4bô`´c‹Ú[™[ŽšKšœÞ
ÜÚ^™NŒMßJ_JW_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜›ÙH‹Ú[™[Ž˜_JKÉ‰šKšœÞ
™›ÛÝ\ˆ‹ØÚ[™[ŽœßJW_JW_J_B™[˜Ý[Ûˆ™\ÜÛÜY[][Q]Z[ŒMÌ
Ú][N™KÛÛÜÙNÛ‘Y]›‹Û”™XÚ\Nœ‹Ø[“X[˜YÙN˜_J^ØÛÛœÝÏYKœØ[\ËYKš[™Ü™YY[›ÝÜß×KOYKœšXÙR\ÝÜž_×KYK˜ÛÜÝ\ÝÜž_×KYKXÚØ\™Ý]\ßKœ™XÚ\TÝ]\ËOX™\ÜÛÜY[XÚØ\™X™[ŒMÊŠKYKXÚØ\™\]Y]Ø™›ØÑ]UŒMŽ
Ýš[™ÊKXÚØ\™\]Y]
KœÛXÙJL
JNˆ´'t-H4`ô.´,4-ô,4/t/ˆŽÜ™]\›ˆKšœÞ
™\ÜÛÜY[ÚY]ŒMÌÛX™[™K™Ü›Ý\˜[YJÊK˜Ø]YÛÜžOÈˆ0­ÈŠÙK˜Ø]YÛÜžNˆˆŠK]N™K›˜[YKÛÜN™KœÜ[Û”Ú^™_™\ÜÛÜY[Ý]\ÓX™[ŒMÌ
KœÝ]\ÊKÛÛÜÙNÛ\ÜÓ˜[YNˆ™]Z[‹›ÛÝ\Ž˜I‰šKšœÞÊK‘œ˜YÛY[ØÚ[™[Ž–ÚKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆœÙXÛÛ™\žH‹ÛÛXÚÎ›‹Ú[™[Žˆ´&4-ô/4-t/t.4`´c4/ô/´-ô.4a´.4cˆŸJKK\HOOHœÙ\šXÙH‰‰šKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆœš[X\žH‹ÛÛXÚÎœ‹Ú[™[Ž™Kœ™XÚ\RYÙOOH˜\›Ý™YÈ´'´`´.´`4bô`´c4`´-tat.´,4`4`´`ÈŽˆ´'ô`4/´,´-t`4.4`´c4`´-tat.´,4`4`´`ÈŽˆ´(t/´-ô-4,4`´c4`´-tat.´,4`4`´`ÈŸJW_JKÚ[™[ŽšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[Z][KY]Z[]ŒMÌ‹Ú[™[Ž–ÚKšœÞ
œÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ™˜XÝÈ‹Ú[™[Ž–ÞÛX™[ˆ´)´-t/t,4/ô`4/´-4,4-´.‹˜[YN™KœØ[TšXÙHO[[Ø™\ÜÛÜY[[Û™^UŒMÌ
KœØ[TšXÙKK˜Ý\œ™[˜ÞJNˆ´'t-H4`ô.´,4-ô,4/t,ŸKÛX™[ˆ´(t-t,t-t`t`´/´.4/4/´`t`´c‹˜[YN™Kœ™XÚ\PÛÜÝO[[Ø™\ÜÛÜY[[Û™^UŒMÌ
Kœ™XÚ\PÛÜÝK˜ÛÜÝÝ\œ™[˜Þ_K˜Ý\œ™[˜ÞJN™KœšXÙY[™Ü™YY[ÛÝ[ŒÈ´(4,4`t`taô.4`´,4/t,4/t-H4/ô/´.ô/t/´`t`´c4cˆŽˆ´'t-t-4/´`t`´,4`´/´aô/t/ˆ4-4,4/t/tbôaHŸKÛX™[ˆÛÜÝ	H‹˜[YN™K˜ÛÜÝ\˜Ù[O[[ÔÝš[™ÊK˜ÛÜÝ\˜Ù[
Kœ™\XÙJ‹ˆ‹‹ŠJÈ‰HŽˆ´'t-t-4/´`t`´,4`´/´aô/t/ˆ4-4,4/t/tbôaHŸKÛX™[ˆ´$´,4.ô/´,´,4cÈ4/ô`4.4,tbô.ôcÈ4-t-ˆ‹˜[YN™K[š]Ü›ÜÜÔ›Ùš]O[[Ø™\ÜÛÜY[[Û™^UŒMÌ
K[š]Ü›ÜÜÔ›Ùš]K˜Ý\œ™[˜ÞJNˆ´'t-t-4/´`t`´,4`´/´aô/t/ˆ4-4,4/t/tbôaHŸWK›X\
ÏOšKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÚ[™[Ž™Ë›X™[JKKšœÞ
œÝ›Û™È‹ØÚ[™[Ž™Ë˜[Y_JW_KË›X™[
J_JKKšœÞÊœÙXÝ[Ûˆ‹ØÚ[™[Ž–ÚKšœÞ
šÈ‹ØÚ[™[Žˆ´'ô`4/´-4,4-´.4-ô,4/ô-t`4.4/´-ŸJKÏÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ™˜XÝÈÛÛ\XÝ‹Ú[™[Ž–ÞÛX™[ˆ´&´/´.ô.4aô-t`t`´,´/ˆ‹˜[YNœËœ]X[]_KÛX™[ˆ´$´bô`4`ôaô.´,‹˜[YNœËœ™]™[YHO[[Ø™\ÜÛÜY[[Û™^UŒMÌ
Ëœ™]™[YKK˜Ý\œ™[˜ÞJNˆ´'t-t`ˆ[™K[]™[4,´bô`4`ôaô.´.ŸKÛX™[ˆ´$´,4.ô/´,´,4cÈ4/ô`4.4,tbô.ôc‹˜[YNœË™Ü›ÜÜÔ›Ùš]O[[Ø™\ÜÛÜY[[Û™^UŒMÌ
Ë™Ü›ÜÜÔ›Ùš]K˜Ý\œ™[˜ÞJNˆ´'t-t-4/´`t`´,4`´/´aô/t/ˆ4-4,4/t/tbôaHŸWK›X\
ÏOšKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÚ[™[Ž™Ë›X™[JKKšœÞ
œÝ›Û™È‹ØÚ[™[Ž™Ë˜[Y_JW_KË›X™[
J_JNšKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ›]]Y‹Ú[™[Žˆ´'ô/´-4`´,´-t`4-´-4dt/t/tbôaH][K[]™[4/ô`4/´-4,4-ˆ4-ô,4/ô-t`4.4/´-4/t-t`‹ˆŸJW_JKK\HOOHœÙ\šXÙH‰‰šKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™]XÚXØ\™Y]Z[]ŒMÈ‹Ú[™[Ž–ÚKšœÞÊšXY\ˆ‹ØÚ[™[Ž–ÚKšœÞ
šÈ‹ØÚ[™[Žˆ´(´-tat.´,4`4`´,ŸJKKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆXÚXØ\™ŠÙ‹Ú[™[Ž›_JW_JKKœ™XÚ\RY	‰šKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™]XÚXØ\™[Y]K]ŒMÈ‹Ú[™[Ž–ÞÛX™[ˆ´$´-t`4`t.4cÈ‹˜[YNˆˆŠÊKXÚØ\™™\œÚ[ÛŸJ_KÛX™[ˆ´&4`t`´/´aô/t.4.ˆ‹˜[YN˜™\ÜÛÜY[XÚØ\™ÛÝ\˜ÙUŒMÊKXÚØ\™ÛÝ\˜ÙJ_KÛX™[ˆ´'´,t/t/´,´.ô-t/t,‹˜[YNšKÛX™[ˆ´&4/t,ô`4-t-4.4-t/t`´bÈ‹˜[YN”Ýš[™ÊKš[™Ü™YY[ÛÝ[
_WK›X\
ÏOšKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÚ[™[Ž™Ë›X™[JKKšœÞ
œÝ›Û™È‹ØÚ[™[Ž™Ë˜[Y_JW_KË›X™[
J_JKKš\Ô[™[™Ñ˜Y	‰šKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ˜™]XÚXØ\™\[™[™Ë]ŒMÈ‹Ú[™[Žˆ´%t`t`´c4/´`´-4-t.ôc4/tbô.HRKtaô-t`4/t/´,´.4.‹ˆ4(ô`´,´-t`4-´-4dt/t/t,4cÈ4,´-t`4`t.4cÈ4/t-H4/ô-t`4-t-ô,4/ô.4`t,4/t,ˆŸJK›[™ÝÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆš[™Ü™YY[[\Ý‹Ú[™[Ž››X\
ÏOšKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Ž™Ë›˜[Y_JKKšœÞ
œÛX[‹ØÚ[™[Ž˜™XÚÛÜÝ[™P[[Ý[ŒÎLÊÊ_JKË˜ÛÛ\]I‰™Ëœ\˜Ú\ÙQ]I‰šKšœÞÊœÛX[‹ØÛ\ÜÓ˜[YNˆ˜™XÛÜÝ\ÛÝ\˜ÙK]ŒÎˆ‹Ú[™[Ž–È´'´`t/t/´,´,4/t.4-Nˆ4/ô/´`t.ô-t-4/t.4.H4/ô`4.4at/´-‹™›ØÑ]UŒMŽ
Ëœ\˜Ú\ÙQ]JKËœÝ\Y\“˜[YOÈˆ0­ÈŠÙËœÝ\Y\“˜[YNˆˆ‹Ëœ\˜Ú\ÙQØÝ[Y[[X™\Èˆ0­È8¡%ˆŠÙËœ\˜Ú\ÙQØÝ[Y[[X™\Žˆˆ‹Ëœ\˜Ú\ÙTXÚØYÙTÚ^™OÈˆ0­ÈŠÙËœ\˜Ú\ÙTXÚØYÙTÚ^™Nˆˆ—_JW_JKKšœÞ
˜ˆ‹ØÚ[™[Ž™Ë˜ÛÛ\]OØ™\ÜÛÜY[[Û™^UŒMÌ
Ë˜ÛÜÝË˜Ý\œ™[˜ÞJN™Ëœ™X\ÛÛOOH›X\[™ÈÈ´'t-H4`t,´cô-ô,4/t/ˆ4`H4/t/´/4-t/t.´.ô,4`´`ô`4/´.HŽ™Ëœ™X\ÛÛOOH[š]È´'ô`4/´,´-t`4.4`´c4-t-4.4/t.4a´`ÈŽˆ´(t`´/´.4/4/´`t`´c4/t-t.4-ô,´-t`t`´/t,ŸJW_KËšY
J_JNšKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ›]]Y‹Ú[™[Žˆ´&4/t,ô`4-t-4.4-t/t`´bÈ4/t-H4-4/´,t,4,´.ô-t/tbËˆŸJW_JK›[™ÝL‰‰šKšœÞÊœÙXÝ[Ûˆ‹ØÚ[™[Ž–ÚKšœÞ
šÈ‹ØÚ[™[Žˆ´&4`t`´/´`4.4cÈ4`t-t,t-t`t`´/´.4/4/´`t`´.ŸJKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆš\ÝÜžH‹Ú[™[Ž™œÛXÙJ
Kœ™]™\œÙJ
K›X\
ÏOšKšœÞÊœ‹ØÚ[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÚ[™[Ž˜™›ØÑ]UŒMŽ
Ë™]J_JKKšœÞ
œÝ›Û™È‹ØÚ[™[Ž˜™\ÜÛÜY[[Û™^UŒMÌ
Ë˜ÛÜÝË˜Ý\œ™[˜ÞJ_JW_KË™]JJ_JKKšœÞ
œÛX[‹ØÛ\ÜÓ˜[YNˆ›]]Y‹Ú[™[Ž™K˜ÛÜÝÚ[™ÙP˜\Ú\ßJW_JKKšœÞÊœÙXÝ[Ûˆ‹ØÚ[™[Ž–ÚKšœÞ
šÈ‹ØÚ[™[Žˆ´&4`t`´/´`4.4cÈ4a´-t/tbÈ4/ô`4/´-4,4-´.ŸJKK›[™ÝÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆš\ÝÜžH‹Ú[™[ŽK›X\
ÏOšKšœÞÊœ‹ØÚ[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÚ[™[Ž˜™›ØÑ]UŒMŽ
Ýš[™ÊË˜Ú[™ÙY]ˆŠKœÛXÙJL
J_JKKšœÞÊœÝ›Û™È‹ØÚ[™[Ž–Ø™\ÜÛÜY[[Û™^UŒMÌ
Ë›ÛšXÙKË˜Ý\œ™[˜ÞJKˆ8¡¤ˆ‹™\ÜÛÜY[[Û™^UŒMÌ
Ë›™]ÔšXÙKË˜Ý\œ™[˜ÞJW_JW_KËšY
J_JNšKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ›]]Y‹Ú[™[Žˆ´&4-ô/4-t/t-t/t.4.H4a´-t/tbÈ4-tbtdH4/t-H4-ô,4a4.4.´`t.4`4/´,´,4/t/‹ˆŸJW_JW_J_J_B™[˜Ý[Ûˆ™\ÜÛÜY[ÛÝ\˜ÙPÚÚXÙUŒMÌ
ÛÛÛÜÙN™KÛØ[Y\˜NÛ‘Ø[\žN›‹Û‘š[Nœ‹Û•\›˜_J^ØÛÛœÝÏVÞÚXÛÛŽœØK]Nˆ´&´,4/4-t`4,‹ÛÜNˆ´(t/tcô`´c4/´-4/t`È4`t`´`4,4/t.4a´`È‹XÝ[ÛŽKÚXÛÛŽ˜TK]Nˆ´$ô,4.ô-t`4-tcÈ‹ÛÜNˆ´%4/ˆLˆ4a4/´`´/´,ô`4,4a4.4.H‹XÝ[ÛŽ›ŸKÚXÛÛŽšÖ]Nˆ”‹^Ù[4.4.ô.ÔÕˆ‹ÛÜNˆ´&4/4/ô/´`4`ˆ4a4,4.t.ô,‹XÝ[ÛŽœŸKÚXÛÛŽÔK]Nˆ´'ô`ô,t.ô.4aô/t,4cÈ4`t`tbô.ô.´,‹ÛÜNˆ´(´/´.ôc4.´/ˆ4-t`t.ô.4`t`´`4,4/t.4a´,4-4/´`t`´`ô/ô/t,‹XÝ[ÛŽ˜_WNÜ™]\›ˆKšœÞ
™\ÜÛÜY[ÚY]ŒMÌÛX™[ˆ´'´,t/t/´,´.ô-t/t.4-H4,4`t`t/´`4`´.4/4-t/t`´,‹]Nˆ´&4`t`´/´aô/t.4.ˆ4/4-t/tcˆ‹ÛÜNˆ´'ô/´`t.ô-H4`4,4`t/ô/´-ô/t,4,´,4/t.4cÈ4/´`´.´`4/´-t`´`tcÈY™‹ˆ4't.4/´-4/t/ˆ4.4-ô/4-t/t-t/t.4-H4/t-H4/ô`4.4/4-t/tcô-t`´`tcÈ4,4,´`´/´/4,4`´.4aô-t`t.´.ˆ‹ÛÛÜÙN™KÛ\ÜÓ˜[YNˆ˜ÛÛ\XÝ‹Ú[™[ŽšKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[\ÛÝ\˜ÙKYÜšY]ŒMÌ‹Ú[™[ŽœË›X\
OšKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎ›˜XÝ[Û‹Ú[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÚ[™[ŽšKšœÞ
šXÛÛ‹ÜÚ^™NŒN_J_JKKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Ž›]_JKKšœÞ
œÛX[‹ØÚ[™[Ž›˜ÛÜ_JW_JKKšœÞ
œ‹ÜÚ^™NŒMŸJW_K]JJ_J_J_B™[˜Ý[Ûˆ™\ÜÛÜY[[\ÜY™•ŒMÌ
K
^ØÛÛœÝ[™]ÈX\
™Ø]\œ˜^JË›Y[R][\ÊK›X\
ÏO–Ø™\ÜÛÜY[›Ü›UŒMÌ
Ë›˜[YJK×JJK[™]ÈX\
™Ø]\œ˜^JOË›Y[R][\ÊK›X\
ÏO–Ø™\ÜÛÜY[›Ü›UŒMÌ
Ë›˜[YJK×JJKOX™Ø]\œ˜^JOË›Y[R][\ÊK™š[\ŠÏOˆ[‹š\Ê™\ÜÛÜY[›Ü›UŒMÌ
Ë›˜[YJJJKÏX™Ø]\œ˜^JË›Y[R][\ÊK™š[\ŠOˆ\‹š\Ê™\ÜÛÜY[›Ü›UŒMÌ
›˜[YJJJKX™Ø]\œ˜^JOË›Y[R][\ÊK™š[\ŠOOžØÛÛœÝ[‹™Ù]
™\ÜÛÜY[›Ü›UŒMÌ
K›˜[YJJNÜ™]\›ˆ	‰“X]˜XœÊ™\ÜÛÜY[[X™\•ŒMÌ
œØ[TšXÙJKX™\ÜÛÜY[[X™\•ŒMÌ
KœØ[TšXÙJJOKŒ_JKOX™Ø]\œ˜^JOË›Y[R][\ÊK™š[\ŠOžØÛÛœÝ[‹™Ù]
™\ÜÛÜY[›Ü›UŒMÌ
›˜[YJJNÜ™]\›ˆ‰‰Š™\ÜÛÜY[›Ü›UŒMÌ
‹˜Ø]YÛÜžJHOOX™\ÜÛÜY[›Ü›UŒMÌ
˜Ø]YÛÜžJ_™\ÜÛÜY[›Ü›UŒMÌ
‹™\\Y[
HOOX™\ÜÛÜY[›Ü›UŒMÌ
™\\Y[
J_JNÜ™]\›žØYY˜KZ\ÜÚ[™ÎœËšXÙN›ÙXÝ[ÛŽ__B™[˜Ý[Ûˆ™\ÜÛÜY[[\Ü™]šY]ÕŒMÌ
Ù˜Y™KÝ\œ™[ÛÚ[™ÙN›‹ÛØ[˜Ù[œ‹ÛÛÛ™š\›N˜KØ]š[™ÎœßJ^ØÛÛœÝÛWOTË\ÙTÝ]J
KX™\ÜÛÜY[[\ÜY™•ŒMÌ
K
KJÊOO›ŠË‹‹™KY[R][\Î™K›Y[R][\Ë›X\
OOžKšYOOZÞË‹‹žK‹‹™ßNžJ_JKOYK›Y[R][\Ë›[™ÝŒ	‰™K›Y[R][\Ë™]™\žJ™Y[R[\ÜÚ^™U˜[YŒŽN
NÜ™]\›ˆKšœÞ
™\ÜÛÜY[ÚY]ŒMÌÛX™[ˆ´'´,t/t/´,´.ô-t/t.4-H4/4-t/tcˆ‹]Nˆ´'ô`4/´,´-t`4c4`´-H4.4-ô/4-t/t-t/t.4cÈ‹ÛÜN™K›Y[R][\Ë›[™Ý
Èˆ4/ô/´-ô.4a´.4.H4`4,4`t/ô/´-ô/t,4/t/ˆ‹ÛÛÜÙNœ‹Û\ÜÓ˜[YNˆœ™]šY]È‹›ÛÝ\ŽšKšœÞÊK‘œ˜YÛY[ØÚ[™[Ž–ÚKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆœÙXÛÛ™\žH[™Ù\ˆ‹\ØX›YœËÛÛXÚÎœ‹Ú[™[Žˆ´'t-H4`t/´at`4,4/tcô`´cŸJKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆœš[X\žH‹\ØX›Yœß[KÛÛXÚÎ˜KÚ[™[ŽœÏÈ´(t/´at`4,4/tcôc¸ )ˆŽˆ´'ô`4.4/4-t/t.4`´c4/ô`4/´,´-t`4-t/t/tbô-H4.4-ô/4-t/t-t/t.4cÈŸJW_JKÚ[™[ŽšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[Z[\Ü\™]šY]Ë]ŒMÌ‹Ú[™[Ž–ÚKšœÞ
œÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ™Y™ˆ‹Ú[™[Ž–ÞÛX™[ˆ´'t/´,´bô-H‹˜[YN™˜YY›[™ÝÛ™Nˆ™ÛÛÙŸKÛX™[ˆ´&4-ô/4-t/t-t/t.4-H4a´-t/tbÈ‹˜[YN™œšXÙK›[™ÝÛ™NˆØ\›š[™ÈŸKÛX™[ˆ´&4-ô/4-t/t-t/t.4-H4`4,4-ô-4-t.ô,‹˜[YN™œÙXÝ[Û‹›[™ÝÛ™NˆØ\›š[™ÈŸKÛX™[ˆ´'t-t`ˆ4,ˆ4/t/´,´/´/4/4-t/tcˆ‹˜[YN™›Z\ÜÚ[™Ë›[™ÝÛ™Nˆ›™]]˜[ŸWK›X\
OšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNšÛ™KÚ[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÚ[™[Žš›X™[JKKšœÞ
œÝ›Û™È‹ØÚ[™[Žš˜[Y_JW_K›X™[
J_JK›Z\ÜÚ[™Ë›[™ÝŒ	‰šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ››ÝXÙH‹Ú[™[Ž–ÚKšœÞ
Ù‹ÜÚ^™NŒMŸJKKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Žˆ´'´`´`t`ô`´`t`´,´`ôc´bt.4-H4/ô/´-ô.4a´.4.4/t-H4,t`ô-4`ô`ˆ4`ô-4,4.ô-t/tbÈŸJKKšœÞ
œÛX[‹ØÚ[™[Žˆ“ÐÔˆ4/4/´,È4/ô`4/´/ô`ô`t`´.4`´c4`t`´`4/´.´`Ëˆ4$4`4at.4,´.4`4/´,´,4/t.4-H4,´bô/ô/´.ô/tcô-t`´`tcÈ4`´/´.ôc4.´/ˆ4,´`4`ôaô/t`ôcˆ4/ô/´`t.ô-H4/ô`4/´,´-t`4.´.ˆŸJW_JW_JKKØ\›š[™ÜÏË›[™ÝŒ	‰šKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ››ÝXÙHØ\›š[™È‹Ú[™[Ž™KØ\›š[™ÜËš›Ú[ŠˆŠ_JKKœÛÝ\˜ÙU\›	‰šKšœÞ
˜H‹Ú™YŽ™KœÛÝ\˜ÙU\›\™Ù]ˆ—Ø›[šÈ‹™[ˆ››Ü™Y™\œ™\ˆ‹Ú[™[Žˆ´'´`´.´`4bô`´c4.4`tat/´-4/t/´-H4/4-t/tcˆŸJKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆš][\È‹Ú[™[Ž™K›Y[R][\ËœÛXÙJ
K›X\

ÊOOšKšœÞÊ˜\XÛH‹ØÚ[™[Ž–ÚKšœÞÊšXY\ˆ‹ØÚ[™[Ž–ÚKšœÞÊ˜ˆ‹ØÚ[™[Ž–È´'ô/´-ô.4a´.4cÈ‹ÊÌW_JKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OO›ŠË‹‹™KY[R][\Î™K›Y[R][\Ë™š[\ŠOOžKšYOOZšY
_JKÚ[™[Žˆ´&4`t.´.ôc´aô.4`´cŸJW_JKKšœÞ
™Ø]šY[ÛX™[ˆ´'t,4-ô,´,4/t.4-H‹Ú[™[ŽšKšœÞ
š[œ]‹Ý˜[YNš›˜[YKÛÚ[™ÙNžOO™ŠšYÛ˜[YNžK\™Ù]˜[Y_J_J_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™ÜšY‹Ú[™[Ž–ÚKšœÞ
™Ø]šY[ÛX™[ˆ´(4,4-ô-4-t.È‹Ú[™[ŽšKšœÞ
œÙ[XÝ‹Ý˜[YNš™\\Y[™Ø]\\Y[

KÛÚ[™ÙNžOO™ŠšYÙ\\Y[žK\™Ù]˜[Y_JKÚ[™[Ž˜™Ø]\\Y[Ë›X\
OOšKšœÞ
›Ü[Ûˆ‹Ý˜[YNžKšYÚ[™[ŽžK›X™[KKšY
J_J_JKKšœÞ
™Ø]šY[ÛX™[ˆ´'ô/´-4`4,4-ô-4-t.È‹Ú[™[ŽšKšœÞ
š[œ]‹Ý˜[YNš˜Ø]YÛÜžKÛÚ[™ÙNžOO™ŠšYØØ]YÛÜžNžK\™Ù]˜[Y_J_J_JW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™ÜšY‹Ú[™[Ž–ÚKšœÞ
™Ø]šY[ÛX™[ˆ´)´-t/t,‹Ú[™[ŽšKšœÞ
š[œ]‹Ý\Nˆ›[X™\ˆ‹Ý\ˆŒŒH‹[œ][ÙNˆ™XÚ[X[‹˜[YNšœØ[TšXÙKÛÚ[™ÙNžOO™ŠšYÜØ[TšXÙNžK\™Ù]˜[Y_J_J_JKKšœÞ
™Y[TØ[TÚ^™PÛÛ›ÛŒŽNÚ][NšÛÚ[™ÙNžOO™ŠšYJK[š]Ü[ÛœÎ™KœØ[TÚ^™U[š]ßJW_JW_KšY
J_JKK›Y[R][\Ë›[™Ý›	‰šKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ›ØY[[Ü™H‹ÛÛXÚÎŠ
OOJO“X]›Z[ŠK›Y[R][\Ë›[™Ý
Î
JKÚ[™[Žˆ´'ô/´.´,4-ô,4`´c4-tbtdHŠÓX]›Z[ŠK›Y[R][\Ë›[™Ý[
_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ››ÝXÙHÛÛÙ‹Ú[™[Ž–ÚKšœÞ
‹ÜÚ^™NŒMŸJKKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Žˆ´)ô-t`4/t/´,´.4.´/´,ˆ4`´-tat.´,4`4`ŽˆŠÊKœ™XÚ\\ÏË›[™Ý
_JKKšœÞ
œÛX[‹ØÚ[™[Žˆ´'´/t.4/t-H4/ô/´/ô,4-4`ô`ˆ4,ˆ4`t-t,t-t`t`´/´.4/4/´`t`´c4.4-ô,4.´`ô/ô/´aô/tbô.H4`4,4`taôdt`ˆ4-4/ˆ4/ô/´-4`´,´-t`4-´-4-t/t.4cÈ4/ô/´.ôc4-ô/´,´,4`´-t.ô-t/ˆŸJW_JW_JW_J_J_B™[˜Ý[Ûˆ™\ÜÛÜY[ÛYTÚYÛ˜[ÕŒMÌ

^ØÛÛœÝOX™Ø]Ý]JŠ™Ø][ÙÔÝÜ™RÙ^JJKYK›Y[R][\Ë™š[\ŠOO˜K˜XÝ]™HOOHLI‰˜K\HOOHœÙ\šXÙHŠK]™š[\ŠOOˆX™Ø]™XÚ\Q›ÜŠKKœ™XÚ\\ÊJK]™š[\ŠOO˜™Ø]™XÚ\Q›ÜŠKKœ™XÚ\\ÊOËœÝ]\ÈOOH˜ÛÛ™š\›YYŠKO]™š[\ŠÏO˜™Ø]\œ˜^J™Ø]™XÚ\Q›ÜŠËKœ™XÚ\\ÊOËš[™Ü™YY[ÊKœÛÛYJOˆ[œ\˜Ú\ÙT›ÙXÝÙ^JJNÚYŠ‹›[™Ý
\™]\›–ÞÚYˆ˜\ÜÛÜY[\™XÚ\\È‹X™[ˆ´$4`t`t/´`4`´.4/4-t/t`ˆ4`´`4-t,t`ô-t`ˆ4/t,4`t`´`4/´.t.´.‹]Z[›‹›[™Ý
ÈˆŠØ™\ÜÛÜY[\˜[ŒMÌ
‹›[™Ý´/ô/´-ô.4a´.4cÈ4,t-t-È4`´-tat.´,4`4`´bÈ‹´/ô/´-ô.4a´.4.4,t-t-È4`´-tat.´,4`4`ˆ‹´/ô/´-ô.4a´.4.H4,t-t-È4`´-tat.´,4`4`ˆŠK™YŽˆ‹ØØ][ÙÏÝX\™XÚ\\É™š[\[Z\ÜÚ[™È‹Û™Nˆœ™YŸWNÚYŠ‹›[™Ý
\™]\›–ÞÚYˆ˜\ÜÛÜY[\™]šY]È‹X™[ˆ´(´-tat.´,4`4`´bÈ4`´`4-t,t`ôc´`ˆ4/ô`4/´,´-t`4.´.‹]Z[œ‹›[™Ý
ÈˆŠØ™\ÜÛÜY[\˜[ŒMÌ
‹›[™Ý´aô-t`4/t/´,´.4.ˆ‹´aô-t`4/t/´,´.4.´,‹´aô-t`4/t/´,´.4.´/´,ˆŠJÈˆ4/t-H4`ôaô,4`t`´,´`ôc´`ˆ4,ˆ4`4,4`taôdt`´,4aH‹™YŽˆ‹ØØ][ÙÏÝX\™XÚ\\É™š[\\™]šY]È‹Û™Nˆ›Ü˜[™ÙHŸWNÚYŠK›[™Ý
\™]\›–ÞÚYˆ˜\ÜÛÜY[[X\[™È‹X™[ˆ´&4/t,ô`4-t-4.4-t/t`´bÈ4/t-H4`t,´cô-ô,4/tbÈ4`H4-ô,4.´`ô/ô.´,4/4.‹]Z[ˆ´(t-t,t-t`t`´/´.4/4/´`t`´c4-ô,4,´.4`t.4/4bôaH4/ô/´-ô.4a´.4.H4/t-t/ô/´.ô/t,‹™YŽˆ‹ØØ][ÙÏÝX\™XÚ\\É™š[\\™]šY]È‹Û™Nˆ›Ü˜[™ÙHŸWNÜ™]\›–×_B™[˜Ý[Ûˆ™\ÜÛÜY[ÛÛ[X[™YÙUŒMÌ

^ØÛÛœÝËWOX

K\ÝJ
KÚ\Ô™XYN›ŸOPZJ
KÜ›Ùš[NœŸOU[Š
KÝØ\Ý˜_O\ÛŠ
KÏX™\ÙT›ØÕ™[YPÛÛ^ŒMŽ

K[™]ÈT“ÙX\˜Ú\˜[\Ê
KO^ÛÝ™\šY]Îˆ›Ý™\šY]È‹Y[Nˆ›Y[H‹™XÚ\\Îˆœ™XÚ\\È‹™YYÎˆ›™YYÈŸVÛ™Ù]
XˆŠ_ˆ—_›Ý™\šY]È‹Ù—OTË\ÙTÝ]JJKÛKOTË\ÙTÝ]J

OO›™Ù]
œ\š[ÙŠ_™]È]J
KÒTÓÔÝš[™Ê
KœÛXÙJÊJKÙËWOTË\ÙTÝ]J

OO›™Ù]
œHŠ_ˆŠKÚ‹—OTË\ÙTÝ]J

OO›™Ù]
™š[\ˆŠ_˜[ŠKØ‹—OTË\ÙTÝ]J

OO›™Ù]
œÙXÝ[ÛˆŠ_˜[ŠKÑK×OTË\ÙTÝ]J

OO˜™Ø]Ý]JŠ™Ø][ÙÔÝÜ™RÙ^JJJKÐËOTË\ÙTÝ]J

OO˜™Ø]\œ˜^JŠ™\˜Ú\ÙTÝÜ™RÙ^JJJKÕ—OTË\ÙTÝ]J

OO˜™Ø]\œ˜^JŠ˜™ÜØ[\×ÙØÝ[Y[ÈŠJJKÐK×OTË\ÙTÝ]J[
KÓËWOTË\ÙTÝ]J[
KÑ—OTË\ÙTÝ]J[
KÓWOTË\ÙTÝ]J[
KÐ‹WOTË\ÙTÝ]J[
KÒWOTË\ÙTÝ]J[
KÕ‹WOTË\ÙTÝ]J[
KÒ‹×OTË\ÙTÝ]JLJKÒËWOTË\ÙTÝ]JˆŠKÉYWOTË\ÙTÝ]JLJKÝK™WOTË\ÙTÝ]J×JKÜ™KÙWOTË\ÙTÝ]J[
KOTË\ÙT™YŠ[
KYOTË\ÙT™YŠ[
KOTË\ÙT™YŠ[
K™OTË\ÙT™YŠ
KYOX™›ØÒ\Ô\›Z\ÜÚ[Û•ŒMŽ
š[™[ÜžK›X[˜YÙHŠNÔË\ÙQY™™XÝ


OOžÝÚ[™ÝË˜™Þ[˜Ó˜]šYØ][Û”]Y\žJÝXŽ™OOH›Ý™\šY]ÈÛ[™\š[Ù›OOO[™]È]J
KÒTÓÔÝš[™Ê
KœÛXÙJÊOÛ[›KN™ß[š[\ŽšˆOOH˜[ÚŽ›[ÙXÝ[ÛŽ™OOH›Y[H‰‰˜ˆOOH˜[ØŽ›[J_KÙKË‹—JNÔË\ÙQY™™XÝ


OOžØÛÛœÝÏ[™]ÈT“ÙX\˜Ú\˜[\Ê
K^ÛÝ™\šY]Îˆ›Ý™\šY]È‹Y[Nˆ›Y[H‹™XÚ\\Îˆœ™XÚ\\È‹™YYÎˆ›™YYÈŸVÝË™Ù]
XˆŠ_ˆ—NÔ‰‰™ŠŠKË™Ù]
œ\š[ÙŠI‰š
Ë™Ù]
œ\š[ÙŠJKË™Ù]
œHŠHO[[	‰žJË™Ù]
œHŠJKË™Ù]
™š[\ˆŠI‰ŠË™Ù]
™š[\ˆŠJKË™Ù]
œÙXÝ[ÛˆŠI‰“ŠË™Ù]
œÙXÝ[ÛˆŠJKÙJË™Ù]
š][RYŠJ_KÝJNÔË\ÙQY™™XÝ


OOžÛ]ÏHLNØÛÛœÝJ
OOž×Ê™Ø]Ý]JŠ™Ø][ÙÔÝÜ™RÙ^JJJK
™Ø]\œ˜^JŠ™\˜Ú\ÙTÝÜ™RÙ^JJJKŠ™Ø]\œ˜^JŠ˜™ÜØ[\×ÙØÝ[Y[ÈŠJJ_K[ÙOOžÊ[ÙOË™]Z[ËœÝÜ™RÙ^_Ø™Ø][ÙÔÝÜ™RÙ^K™\˜Ú\ÙTÝÜ™RÙ^K˜™ÜØ[\×ÙØÝ[Y[È—Kš[˜ÛY\ÊÙK™]Z[œÝÜ™RÙ^JJI‰”Š
_NÔŠ
KÚ[™ÝË˜Y]™[\Ý[™\Š˜™œÝÜ™K]\]Y‹
NØÛÛœÝÏSÝ

NÜ™]\›ˆË˜XÝ]™U™[YRY	‰˜É‰”›ÛZ\ÙK˜[
Ö\ÙJ™Ø][ÙÔÝÜ™RÙ^KÊK\ÙJ™\˜Ú\ÙTÝÜ™RÙ^KÊK\ÙJ˜™ÜØ[\×ÙØÝ[Y[È‹ÊWJK[Š
ÜÙKYWJOOžÝß
OO]›ÚY	‰Š›J™Ø][ÙÔÝÜ™RÙ^K
KÊ™Ø]Ý]J
JJKÙHOO]›ÚY	‰Š›J™\˜Ú\ÙTÝÜ™RÙ^KÙJK
™Ø]\œ˜^JÙJJJKYHOO]›ÚY	‰Š›J˜™ÜØ[\×ÙØÝ[Y[È‹YJKŠ™Ø]\œ˜^JYJJJJ_JK˜Ø]Ú


OOžßJK

OOžÝÏHLÚ[™ÝËœ™[[Ý™Q]™[\Ý[™\Š˜™œÝÜ™K]\]Y‹
__KÛ‹Ë˜XÝ]™U™[YRYJNÔË\ÙQY™™XÝ


OOžÚYŠ\Ë˜XÝ]™U™[YRY
\™]\›ŽØÛÛœÝÏJÊÙ™K˜Ý\œ™[[™]ÈX›ÜÛÛ›Û\ŽÙYJ›ØY[™ÈŠK™]Ú
‹Ø\KØ\ÜÛÜY[ÛÝ™\šY]ÏÜ\š[ÙHŠÙ[˜ÛÙUT’PÛÛ\Û™[
JKÜÚYÛ˜[”‹œÚYÛ˜[XY\œÎžÈž]™[YKZYŽ”Ýš[™ÊË˜XÝ]™U™[YRY
_KØXÚNˆ››Ë\ÝÜ™HŸJK[Š\Þ[˜ÈOžØÛÛœÝÏX]ØZ]šœÛÛŠ
NÚYŠT›ÚßXË›ÚÊ]›ÝÈ™]È\œ›ÜŠË™\œ›ÜŸ´'t-H4`ô-4,4.ô/´`tc4-ô,4,ô`4`ô-ô.4`´c4,4/t,4.ô.4`´.4.´`ÈŠNÚYŠÈOOY™K˜Ý\œ™[[X™\ŠË™[YRY
HOOS[X™\ŠË˜XÝ]™U™[YRY
J\™]\›ŽÖJË˜[˜[]XÜÊKYJ[
_JK˜Ø]Ú
OžÚYŠË›˜[YOOOHX›Ü\œ›ÜˆŸÈOOY™K˜Ý\œ™[
\™]\›ŽÖJ[
KYJ™\œ›ÜˆŠ_JNÜ™]\›Š
OO”‹˜X›Ü

_KÛ‹Ë˜XÝ]™U™[YRYKKËJNØÛÛœÝ™\ÜÛÜY[ØØ[X™\ÜÛÜY[˜[˜XÚÐ[˜[]XÜÕŒMÌ
KËJKOUË›Y[R][\ÏË›[™ÝÕŽ˜™\ÜÛÜY[ØØ[›Y[R][\Ë›[™ÝÞË‹‹˜™\ÜÛÜY[ØØ[XÛÛ›ÛZXÜÎ•Ë™XÛÛ›ÛZXÜÏÏØ™\ÜÛÜY[ØØ[™XÛÛ›ÛZXÜËÛÜÝÚ[™Ù\Î•Ë˜ÛÜÝÚ[™Ù\ÏÏØ™\ÜÛÜY[ØØ[˜ÛÜÝÚ[™Ù\Ë\š[Ù•Ëœ\š[ÙÏØ™\ÜÛÜY[ØØ[œ\š[ÙN•Ÿ™\ÜÛÜY[ØØ[ÙOZK›Y[R][\ÏË™š[™
ÏO”Ýš[™ÊËšY
OOOTÝš[™Ê™JJ_[YO]ÏOžÙŠÊKJˆŠKŠ˜[ŠKŠ˜[ŠK™I‰™J™\ÜÛÜY[]Y\žU\›ŒMÌ
Ú][RY›[XŽÏOOH›Ý™\šY]ÈÛ[ßJJ_K™O]ÏOžÙŠËXŸœ™XÚ\\ÈŠKË™š[\‰‰ŠË™š[\ŠKËš][RYÙJ™\ÜÛÜY[]Y\žU\›ŒMÌ
ÝXŽËXOOH›Ý™\šY]ÈÛ[ËX‹š[\ŽË™š[\Ÿ[][RYËš][RYJJN™J™\ÜÛÜY[]Y\žU\›ŒMÌ
ÝXŽËXOOH›Ý™\šY]ÈÛ[ËX‹š[\ŽË™š[\Ÿ[][RY›[JJ_K™O]ÏO™J™\ÜÛÜY[]Y\žU\›ŒMÌ
Ú][RYËšYXŽ™OOH›Ý™\šY]ÈÈ›Y[HŽ™JJK™OJ
OOžØÛÛœÝÏX™\ÜÛÜY[]Y\žU\›ŒMÌ
Ú][RY›[JNÜÙJ[
KÚ[™ÝË˜™˜]šYØ]P˜XÚÊÊ_K™OX\Þ[˜ÊËŠOOžØÛÛœÝ^Ë‹‹˜™Ø]Ý]JŠK\]Y]›™]È]J
KÒTÓÔÝš[™Ê
_N×Ê
NØÛÛœÝÏX]ØZ]\Š™Ø][ÙÔÝÜ™RÙ^K
KX™Ø]Ý]JŠ™Ø][ÙÔÝÜ™RÙ^J_
N×Ê
KÜÙJ™Ø][ÙÔÝÜ™RÙ^K
KJÝ˜\šX[˜ÏÈœÝXØÙ\ÜÈŽˆ™Y˜][‹]NË\ØÜš\[ÛŽ˜ÏÈ´%4,4/t/tbô-H4`t/´at`4,4/t-t/tbÈ4,ˆ4,4.´.´,4`ô/t`´-H4,´bô,t`4,4/t/t/´,ô/ˆ4-ô,4,´-t-4-t/t.4cËˆŽˆ´&4-ô/4-t/t-t/t.4-H4`t/´at`4,4/t-t/t/ˆ4.ô/´.´,4.ôc4/t/ˆ4.4`t.4/tat`4/´/t.4-ô.4`4`ô-t`´`tcÈ4/ô/´`t.ô-H4,´/´`t`t`´,4/t/´,´.ô-t/t.4cÈ4`t,´cô-ô.ˆŸJNÜ™]\›žÜÞ[˜ÙY˜ËÝ]Nœ_KYOX\Þ[˜ÊËH\ØYŠOOžØÛÛœÝP\œ˜^Kš\Ð\œ˜^JÊOÝÎ–Ý×NÚYŠT›[™Ý[YJ\™]\›ŽÔJOOH˜Ø[Y\˜HÈ´)ô.4`´,4cˆ4a4/´`´/´,ô`4,4a4.4cˆ4/4-t/tc¸ )ˆŽ”OOH™Ø[\žHÈ´$ô/´`´/´,´.ôcˆŠÔ›[™Ý
Èˆ4`t`´`4,4/t.4aˆ4/4-t/tc¸ )ˆŽˆ´(4,4`t/ô/´-ô/t,4cˆ4/4-t/tcˆ4.4a´-t/tbø )ˆŠNÝž^ÚYŠ™]™\žJÏO˜™ÛY[[XYÙR[™›ÊÊKš\Ò[XYÙJJ^ØÛÛœÝÏX]ØZ]™Ø][ÙÔÝYÙR[XYÙ\Ê‹JNÝž^ØÛÛœÝX]ØZ]™Ø][ÙÔ™XÛÙÛš\ÙR[XYÙ\ÊË‹JNÚÊ
_XØ]Ú

^Ø]ØZ]™Ø][ÙÑ[]Qš[\ÊË›X\
ÙOO›ÙKšY
JNÝ›ÝÈ\™]\›ŸXÛÛœÝÏTÌK[™]È›Ü›Q]NÜ˜\[™
™š[H‹Ë™\ØYš[S˜[YJË›Y[KYš[HŠJK˜\[™
œÛÝ\˜ÙH‹ŠNØÛÛœÝÙOX]ØZ]™]Ú
‹Ø\KØØ][ÙËÚ[\Ü‹ÛY]Ùˆ”ÔÕ‹›ÙNœJKYOX]ØZ]™\ØY™\ÜÛœÙRœÛÛŠÙK´'t-H4`ô-4,4.ô/´`tc4`4,4`t/ô/´-ô/t,4`´c4/4-t/tcˆŠNÚÊYK™˜Y
_XØ]Ú
Ê^ØJÝ˜\šX[ˆ™\œ›Üˆ‹]Nˆ´'4-t/tcˆ4/t-H4`4,4`t/ô/´-ô/t,4/t/ˆ‹\ØÜš\[ÛŽ˜È[œÝ[˜Ù[Ùˆ\œ›ÜØË›Y\ÜØYÙNˆ´'ô/´/ô`4/´,t`ô.t`´-H4,t/´.ô-t-H4aôdt`´.´/´-H4a4/´`´/ˆ4.4.ô.4-4`4`ô,ô/´.H4a4,4.t.ËˆŸJ_Yš[˜[^ÔJˆŠ__KÙOX\Þ[˜ÈÏOžÔJ´'´`´.´`4bô,´,4cˆ4`t`tbô.ô.´`È4.4.4-ô,´.ô-t.´,4cˆ4,4`t`t/´`4`´.4/4-t/t`¸ )ˆŠNÝž^ØÛÛœÝX]ØZ]™]Ú
‹Ø\KØØ][ÙËÚ[\Ü‹ÛY]Ùˆ”ÔÕ‹XY\œÎžÈÛÛ[U\HŽˆ˜\XØ][Û‹ÚœÛÛˆŸK›ÙN’”ÓÓ‹œÝš[™ÚYžJÝ\›ßJ_JKX]ØZ]‹šœÛÛŠ
NÚYŠT‹›ÚßT›ÚÊ]›ÝÈ™]È\œ›ÜŠ™\œ›ÜŸ´'t-H4`ô-4,4.ô/´`tc4/ô`4/´aô.4`´,4`´c4`t`tbô.ô.´`ÈŠNÚÊ™˜Y
KJ[
_XØ]Ú
Š^ØJÝ˜\šX[ˆ™\œ›Üˆ‹]Nˆ´(t`tbô.ô.´,4/t-H4/ô`4/´aô.4`´,4/t,‹\ØÜš\[ÛŽ”ˆ[œÝ[˜Ù[Ùˆ\œ›ÜÔ‹›Y\ÜØYÙNˆ´'ô`4/´,´-t`4c4`´-H4,4-4`4-t`KˆŸJ_Yš[˜[^ÔJˆŠ__KÙOX\Þ[˜ÈÏOžØÛÛœÝVË‹‹ŠË˜Ý\œ™[\™Ù]™š[\ß×JWK]Ë˜Ý\œ™[\™Ù]ÝË˜Ý\œ™[\™Ù]˜[YOHˆŽÚYŠT‹›[™Ý
\™]\›ŽÚYŠOOYK˜Ý\œ™[
^Û™JÏO–Ë‹‹˜Ë‹‹”—KœÛXÙJLŠJNÜ™]\›ŸX]ØZ]YJ‹OO[K˜Ý\œ™[È˜Ø[Y\˜HŽˆ\ØYŠ_KOX\Þ[˜Ê
OOžØÛÛœÝÏPNÚÊ[
NØÛÛœÝX™Ø]\œ˜^JÏËœÛÝ\˜ÙQš[RYÏË›[™ÝÝËœÛÝ\˜ÙQš[RYÎ–ÝÏËœÛÝ\˜ÙQš[RYJK™š[\Š›ÛÛX[ŠNÙ›ÜŠÛÛœÝÙˆŠ]ž^Ø]ØZ]™]Ú
‹Ø\KØØ][ÙËÙš[\ËÈŠÙ[˜ÛÙUT’PÛÛ\Û™[

KÛY]Ùˆ‘SUHŸJ_XØ]Úß_KOX\Þ[˜Ê
OOžÚYŠPJ\™]\›ŽÑÊL
NÝž^ØÛÛœÝÏX™Ø]Ý]JJK[™]ÈX\
Ë›Y[R][\Ë›X\
ÙOO–Ø™\ÜÛÜY[›Ü›UŒMÌ
ÙK›˜[YJKÙWJJK^ßKÏVË‹‹˜™Ø]\œ˜^JËœšXÙR\ÝÜžJWNÙ›ÜŠÛÛœÝ™˜]ÓY[R][UŒŽNÙˆK›Y[R][\Ê^ØÛÛœÝÙOX™Y[PÛX[’][UŒŽN
™˜]ÓY[R][UŒŽN
KYOT‹™Ù]
™\ÜÛÜY[›Ü›UŒMÌ
ÙK›˜[YJJKZYOËšYÙKšYÔÛÙKšYOVYI‰ŠËœÜXÙJË›[™Ý‹‹˜™\ÜÛÜY[\[™šXÙR\ÝÜžUŒMÌ
ËYKœØ[TšXÙKÙKœØ[TšXÙKÙK˜Ý\œ™[˜Þ_YK˜Ý\œ™[˜ÞK›Y[WÚ[\ÜŠJJNØÛÛœÝÙO^Ë‹‹šYK‹‹›ÙKY–[›™YØ[\ÎšYOËœ[›™YØ[\ÏÏÛÙKœ[›™YØ[\ÏÏÌÜ™X]Y]šYOË˜Ü™X]Y]™]È]J
KÒTÓÔÝš[™Ê
K\]Y]›™]È]J
KÒTÓÔÝš[™Ê
_NÔ‹œÙ]
™\ÜÛÜY[›Ü›UŒMÌ
ÙK›˜[YJKÙJ_XÛÛœÝVË‹‹Ëœ™XÚ\\×NÙ›ÜŠÛÛœÝÙHÙˆ™Ø]\œ˜^JKœ™XÚ\\ÊJ^ØÛÛœÝYOTÛÙK›Y[R][RYNÚYŠZYJXÛÛ[YNØÛÛœÝ\™š[™[™^
ÙOO”Ýš[™ÊÙK›Y[R][RYÙK›ÝÛ™\’Y
OOOTÝš[™ÊYJI‰˜ÙKœÝ]\ÏOOH˜ÛÛ™š\›YYŠKÙO\™š[™[™^
]O”Ýš[™Ê]›Y[R][RY]›ÝÛ™\’Y
OOOTÝš[™ÊYJI‰]œÝ]\ÈOOH˜ÛÛ™š\›YY‰‰]›Y™XÞXÛTÝ]\ÈOOHœÝ\\œÙYYŠKYO^Ë‹‹›ÙKY˜ÙOLÜØÙWKšY›ÙKšYÜž\Ëœ˜[™ÛUURQ

KY[R][RYšYKÝÛ™\’YšYKÝÛ™\•\Nˆ›Y[WÚ][H‹Ý]\Îˆ™˜Y‹™]šY]ÔÝ]\Îˆ˜ZWÙ˜Y‹ÛÝ\˜ÙNˆ˜ZH‹Ý\œ™[˜YˆLY[\Ý[˜ÞRÙ^N›ÙKšY[\Ý[˜ÞRÙ^_›Y[KZ[\ÜˆŠÔÝš[™ÊKšY™˜YŠJÈŽˆŠÚYK\]Y]›™]È]J
KÒTÓÔÝš[™Ê
_NÖ	‰ŠÙOLÜØÙWOTYNœœ\Ú
YJJ_XÛÛœÝÙO^Ë‹‹ËY[R][\Î–Ë‹‹”‹˜[Y\Ê
WK™XÚ\\ÎœšXÙR\ÝÜžN˜ËÛÝ\˜Ù\Î–ÞÚYKšYÛÝ\˜ÙQš[RYKœÛÝ\˜ÙQš[RYÛÝ\˜ÙQš[RYÎKœÛÝ\˜ÙQš[RYËÛÝ\˜ÙU\›KœÛÝ\˜ÙU\›˜[YNKœÛÝ\˜ÙQš[S˜[Y_K™[YS˜[Y_´'4-t/tcˆ‹ÛÝ\˜ÙNKœÛÝ\˜ÙKYÙPÛÝ[KœYÙPÛÝ[KœÛÝ\˜ÙQš[RYÏË›[™ÝKÝ]\Îˆ˜ÛÛ™š\›YY‹[\ÜY]›™]È]J
KÒTÓÔÝš[™Ê
_K‹‹ËœÛÝ\˜Ù\Ë™š[\ŠYOOšYKœÛÝ\˜ÙQš[RYOOPKœÛÝ\˜ÙQš[RY
WKœÛXÙJÌ
_NØ]ØZ]™J´'4-t/tcˆ4/´,t/t/´,´.ô-t/t/ˆ‹ÙJKÊ[
KJÝ˜\šX[ˆœÝXØÙ\ÜÈ‹]Nˆ´&4-ô/4-t/t-t/t.4cÈ4/ô`4.4/4-t/t-t/tbÈ‹\ØÜš\[ÛŽˆ´'ô`4/´/ô,4,´b4.4-H4.4-È4/t/´,´/´,ô/ˆ4a4,4.t.ô,4/ô/´-ô.4a´.4.4`t/´at`4,4/t-t/tbËˆ4't/´,´bô-H4`´-tat.´,4`4`´bÈ4/´`t`´,4.ô.4`tc4aô-t`4/t/´,´.4.´,4/4.4-4/ˆ4/ô`4/´,´-t`4.´.ˆŸJ_Yš[˜[^ÑÊLJ__KYOX\Þ[˜ÈÏOžØÛÛœÝX™Ø]Ý]JŠ™Ø][ÙÔÝÜ™RÙ^J_JKT‹›Y[R][\Ë™š[™
OœšYOO]ËšY
KÏX™\ÜÛÜY[\[™šXÙR\ÝÜžUŒMÌ
‹œšXÙR\ÝÜžKËšYËœØ[TšXÙKËœØ[TšXÙKË˜Ý\œ™[˜ÞK›X[X[ŠKT‹›Y[R][\ËœÛÛYJÙOO›ÙKšYOO]ËšY
OÔ‹›Y[R][\Ë›X\
ÙOO›ÙKšYOO]ËšYÝÎ›ÙJN–ÝË‹‹”‹›Y[R][\×KÙO]Ë\OOOHœÙ\šXÙHÔ‹œ™XÚ\\Ë™š[\ŠYOOšYK›Y[R][RYOO]ËšY
N”‹œ™XÚ\\ÎØ]ØZ]™J´'ô/´-ô.4a´.4cÈ4`t/´at`4,4/t-t/t,‹Ë‹‹”‹Y[R][\Îœ™XÚ\\Î›ÙKšXÙR\ÝÜžN˜ßJKJ[
KT	‰Ë\OOOH˜ÛÛ\ÜÚ]H‰‰ŠŠœ™XÚ\\ÈŠKŠ˜[ŠKŠÊJ_KÙOX\Þ[˜ÊËŠOOžØÛÛœÝX™Ø]Ý]JJKTœ™XÚ\\Ë™š[™
OœšYOO]ËšY
KÙOS[X™\ŠË™\œÚ[ÛŠ_KYOVËœÝ]\ÏOOH˜ÛÛ™š\›YYÞË‹‹–Ý\œ™[ˆLKY™XÞXÛTÝ]\ÎˆœÝ\\œÙYY‹™]šY]ÔÝ]\ÎˆœÝ\\œÙYYŸN›[]VËœÝ]\ÏOOH˜ÛÛ™š\›YYÞË‹‹ËY˜Üž\Ëœ˜[™ÛUURQ

K™\œÚ[ÛŽ˜ÙJÌKÝ\œ™[ËœÝ]\ÏOOH˜ÛÛ™š\›YY‹Ý\œ™[˜YËœÝ]\ÈOOH˜ÛÛ™š\›YY‹™]šY]ÔÝ]\ÎËœÝ]\ÏOOH˜ÛÛ™š\›YYÈ˜\›Ý™YŽËœÛÝ\˜ÙOOOH˜ZHÈ˜ZWÙ˜YŽˆœ™\]Z\™\×Ü™]šY]È‹ÝÛ™\’YË›Y[R][RYÝÛ™\•\Nˆ›Y[WÚ][HŸNžË‹‹Ë™\œÚ[ÛŽ˜ÙKÝ\œ™[ËœÝ]\ÏOOH˜ÛÛ™š\›YY‹Ý\œ™[˜YËœÝ]\ÈOOH˜ÛÛ™š\›YY‹™]šY]ÔÝ]\ÎËœÝ]\ÏOOH˜ÛÛ™š\›YYÈ˜\›Ý™YŽËœÛÝ\˜ÙOOOH˜ZHÈ˜ZWÙ˜YŽˆœ™\]Z\™\×Ü™]šY]È‹ÝÛ™\’YË›Y[R][RYÝÛ™\•\Nˆ›Y[WÚ][HŸKÏVËœÝ]\ÏOOH˜ÛÛ™š\›YYÖÐ]‹‹”œ™XÚ\\Ë›X\
OœšYOOVšYÔYNœ
WN”œ™XÚ\\ËœÛÛYJOœšYOO]ËšY
OÔœ™XÚ\\Ë›X\
OœšYOO]ËšYÐ]œ
N–Ð]‹‹”œ™XÚ\\×K[™]ÈX\
œÝØÚÐ˜[[˜Ù\Ë›X\
ÙOO–ÛÙKšÙ^KÙWJJNÙ›ÜŠÛÛœÝÙHÙˆŠ\œÙ]
ÙKšÙ^KË‹‹œ™Ù]
ÙKšÙ^JK‹‹›Ù_JNØÛÛœÝÙOX]ØZ]™JËœÝ]\ÏOOH˜ÛÛ™š\›YYÈ´(´-tat.´,4`4`´,4/ô/´-4`´,´-t`4-´-4-t/t,Žˆ´)ô-t`4/t/´,´.4.ˆ4`t/´at`4,4/tdt/H‹Ë‹‹”™XÚ\\Î˜ËÝØÚÐ˜[[˜Ù\Î–Ë‹‹œ˜[Y\Ê
W_JKYOX™Ø]\œ˜^JÙKœÝ]Kœ™XÚ\\ÊK™š[\ŠÙOOÙK›Y[R][RYOO]Ë›Y[R][RY	‰ÙKœ™]šY]ÔÝ]\ÏOOH˜\›Ý™YŠKœÛÜ

ÙKÙJOO”Ýš[™ÊÙK˜ÛÛ™š\›YY]ÙK\]Y]ˆŠK›ØØ[PÛÛ\\™JÝš[™ÊÙK˜ÛÛ™š\›YY]ÙK\]Y]ˆŠJJVÌNÚYŠËœÝ]\ÏOOH˜ÛÛ™š\›YY‰‰Š[ÙKœÞ[˜ÙYZYJJ^ØJÝ˜\šX[ˆ™\œ›Üˆ‹]Nˆ´(´-tat.´,4`4`´,4`´`4-t,t`ô-t`ˆ4/ô`4/´,´-t`4.´.‹\ØÜš\[ÛŽ›ÙKœÞ[˜ÙYÈ´'ô/´-4`´,´-t`4-4.4`´-H4`t,´cô-ôc4.4-t-4.4/t.4a´`È4.´,4-´-4/´,ô/ˆ4.4/t,ô`4-t-4.4-t/t`´,ˆŽˆ´(ô`´,´-t`4-´-4-t/t.4-H4,t`ô-4-t`ˆ4-4/´`t`´`ô/ô/t/ˆ4/ô/´`t.ô-H4`t.4/tat`4/´/t.4-ô,4a´.4.4`H4`t-t`4,´-t`4/´/ˆŸJNÜ™]\›ˆL_\™]\›ˆŠ[
KLKÙOX\Þ[˜ÈÏOžØÛÛœÝX™Ø]Ý]JJKT‹š[\›˜[][\ËœÛÛYJÏO˜ËšYOO]ËšY
OÔ‹š[\›˜[][\Ë›X\
ÏO˜ËšYOO]ËšYÝÎ˜ÊN–ÝË‹‹”‹š[\›˜[][\×NØ]ØZ]™J´(4,4`tat/´-4/t.4.ˆ4`t/´at`4,4/tdt/H‹Ë‹‹”‹[\›˜[][\Î”JKJ[
_KYOX\Þ[˜ÈÏOžØ]ØZ]™J´'ô-t`4.4/´-4`4,4`taôdt`´,4.4-ô/4-t/tdt/H‹Ë‹‹‘KÜš^›Û‘^\Î“[X™\ŠÊ_J_KOJ
OOžÙŠ›Y[HŠKŠ›Z\ÜÚ[™ÈŠKŠ˜[ŠKJÝ˜\šX[ˆ™Y˜][‹]Nˆ´$´bô,t-t`4.4`´-H4/ô/´-ô.4a´.4cˆ4/4-t/tcˆ‹\ØÜš\[ÛŽˆ´'´`´.´`4/´.t`´-H4/t`ô-´/t/´-H4,t.ôc´-4/ˆ4.4.ô.4/t,4/ô.4`´/´.ˆ4.4/t,4-´/4.4`´-H0ªô(t/´-ô-4,4`´c4`´-tat.´,4`4`´`ð®ËˆŸJ_K™OJ
OOžÓJßJKJ™\ÜÛÜY[]Y\žU\›ŒMÌ
ÝXŽˆ›Y[H‹][RY›[JJ_NÜ™]\›ˆKšœÞÊK‘œ˜YÛY[ØÚ[™[Ž–ÚKšœÞ
ÜÚÝÐ›ÝÛS˜]ŽˆLÚ[™[ŽšKšœÞÊ›XZ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[XÛÛ[X[™]ŒMÌ‹Ú[™[Ž–ÚKšœÞ
™\ÜÛÜY[XY\•ŒMÌÝXŽ™Û•XŽžYKÛ“›ÛY[˜Û]\™NŠ
OO™J‹Û›ÛY[˜Û]\™OÜ™]\›•ÏX\ÜÛÜY[ŠK›Ùš[Nœ‹™[YPÛÛ^œßJKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[XÛÛ[]ŒMÌ‹™]KX[˜[]XÜË\Ý]HŽ‰Ú[™[Ž–ÉOOH™\œ›Üˆ‰‰šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[[Ù™›[™K]ŒMÌ‹Ú[™[Ž–ÚKšœÞ
Ù‹ÜÚ^™NŒM_JK´'ô/´.´,4-ô,4/tbÈ4.ô/´.´,4.ôc4/tbô-H4-4,4/t/tbô-Kˆ4(t-t`4,´-t`4/t`ôcˆ4,4/t,4.ô.4`´.4.´`È4/t-H4`ô-4,4.ô/´`tc4/´,t/t/´,´.4`´cˆ—_JKOOH›Ý™\šY]È‰‰šKšœÞ
™\ÜÛÜY[Ý™\šY]ÕŒMÌØ[˜[]XÜÎšK\š[Ù›KÛ”\š[ÙšÛ”ÚYÛ˜[š™KÛ’[\ÜŠ
OO™YJL
KÛ•XŽžYKØ[“X[˜YÙN›YKÝ\œ™[˜ÞNœË˜Ý\œ™[˜Þ_Ë™[Y\Ë™š[™
ÏO“[X™\ŠËšY
OOOS[X™\ŠË˜XÝ]™U™[YRY
JOË˜Ý\œ™[˜Þ_”•PˆŸJKOOH›Y[H‰‰šKšœÞ
™\ÜÛÜY[Y[UŒMÌØ[˜[]XÜÎšK]Y\žN™ËÛ”]Y\žNžKš[\Žš‹Û‘š[\Ž‹ÙXÝ[ÛŽ˜‹Û”ÙXÝ[ÛŽ“‹Û“Ü[Ž™KÛYž™KÛ”ÝXÝ\™NŠ
OO™J‹Û›ÛY[˜Û]\™OÝšY]Ï]^Û›Û^Iœ™]\›•ÏX\ÜÛÜY[ŠKØ[“X[˜YÙN›Y_JKOOHœ™XÚ\\È‰‰šKšœÞ
™\ÜÛÜY[™XÚ\\ÕŒMÌØ[˜[]XÜÎšK]Y\žN™ËÛ”]Y\žNžKš[\Žš‹Û‘š[\Ž‹Û“Ü[Ž™KÛÜ™X]N‘KØ[“X[˜YÙN›Y_JKOOH›™YYÈ‰‰šKšœÞ
™\ÜÛÜY[™YYÕŒMÌØ[˜[]XÜÎšKÛ’Üš^›ÛŽ“YKÛ”Ý\Y\ŽÏO™J‹ÜÝ\Y\œÏÝXXÛÛ\\™IœOHŠÙ[˜ÛÙUT’PÛÛ\Û™[
Ë›˜[YJJKÛ’[\›˜[ÏO•JÊKØ[“X[˜YÙN›Y_JW_JKKšœÞ
š[œ]‹Ü™YŽ›K\Nˆ™š[H‹XØÙ\ˆš[XYÙKÊˆ‹Ø\\™Nˆ™[š\›Û›Y[‹Y[ŽˆLÛÚ[™ÙNÙ_JKKšœÞ
š[œ]‹Ü™YŽYK\Nˆ™š[H‹XØÙ\ˆ‹œ‹˜ÜÝ‹Ý‹žËžÞš[šH‹Y[ŽˆLÛÚ[™ÙNÙ_JKKšœÞ
š[œ]‹Ü™YŽ™K\Nˆ™š[H‹XØÙ\ˆš[XYÙKÊˆ‹][\NˆLY[ŽˆLÛÚ[™ÙNÙ_JKYI‰™OOH›Y[H‰‰šKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™X\ÜÛÜY[XYY˜X‹]ŒÌH‹ÛÛXÚÎž™K˜\šXK[X™[Žˆ´%4/´,t,4,´.4`´c4/ô/´-ô.4a´.4cˆ‹Ú[™[Ž–ÚKšœÞ
ÜÚ^™NŒN˜\šXKZY[ˆŽˆLJKKšœÞ
œÜ[ˆ‹ØÚ[™[Žˆ´%4/´,t,4,´.4`´c4/ô/´-ô.4a´.4cˆŸJW_JW_J_JK	OOHL	‰šKšœÞ
™\ÜÛÜY[ÛÝ\˜ÙPÚÚXÙUŒMÌÛÛÛÜÙNŠ
OO™YJLJKÛØ[Y\˜NŠ
OOžÙYJLJKK˜Ý\œ™[Ë˜ÛXÚÊ
_KÛ‘Ø[\žNŠ
OOžÙYJLJKK˜Ý\œ™[Ë˜ÛXÚÊ
_KÛ‘š[NŠ
OOžÙYJLJKYK˜Ý\œ™[Ë˜ÛXÚÊ
_KÛ•\›Š
OOžÙYJLJKJL
__JKK›[™ÝŒ	‰šKšœÞ
™ÝÔÙ[XÝ[Û‹Ùš[\ÎKÛÚ[™ÙN›™KÛØ[˜Ù[Š
OO›™J×JKÛYŠ
OO™K˜Ý\œ™[Ë˜ÛXÚÊ
KÛÛÛ™š\›NŠ
OOžØÛÛœÝÏ]NÛ™J×JKYJË™Ø[\žHŠ_K]Nˆ´(t`´`4,4/t.4a´bÈ4/4-t/tcˆ‹ÛÜNˆ´'ô`4/´,´-t`4c4`´-H4/ô/´`4cô-4/´.ˆ4`t`´`4,4/t.4a‹ˆ4'ô/´`t.ô-H4`4,4`t/ô/´-ô/t,4,´,4/t.4cÈ˜\‘ØÝÜˆ4/ô/´.´,4-´-t`ˆY™ˆ4-4/ˆ4`t/´at`4,4/t-t/t.4cËˆŸJKÉ‰šKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™X\ÜÛÜY[[ØY[™Ë]ŒMÌ‹Ú[™[ŽšKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
œÜ[ˆ‹ßJKKšœÞ
œÝ›Û™È‹ØÚ[™[Ž’ßJKKšœÞ
œ‹ØÚ[™[Žˆ´'ô/´`t.ô-H4`4,4`t/ô/´-ô/t,4,´,4/t.4cÈ4/´`´.´`4/´-t`´`tcÈ4/´,tcô-ô,4`´-t.ôc4/t,4cÈ4`t,´-t`4.´,ˆ4%4,4/t/tbô-H4/t-H4/ô`4.4/4-t/tcôc´`´`tcÈ4,4,´`´/´/4,4`´.4aô-t`t.´.ˆŸJW_J_JKI‰šKšœÞ
™\ÜÛÜY[[\Ü™]šY]ÕŒMÌÙ˜YKÝ\œ™[‘KÛÚ[™ÙNšËÛØ[˜Ù[žKÛÛÛ™š\›N•KØ]š[™Î’ŸJKÙI‰ˆSÉ‰ˆQ	‰ˆS	‰ˆP‰‰ˆPI‰šKšœÞ
™\ÜÛÜY[][Q]Z[ŒMÌÚ][N™ÙKÛÛÜÙN˜™KÛ‘Y]Š
OOžØÛÛœÝÏQK›Y[R][\Ë™š[™
O”‹šYOOYÙKšY
NÝÉ‰ŠÙJ[
KŠ[
KJ[
KJ[
KJÊKJ™\ÜÛÜY[]Y\žU\›ŒMÌ
Ú][RY›[JJJ_KÛ”™XÚ\NŠ
OOžØÛÛœÝÏQK›Y[R][\Ë™š[™
O”‹šYOOYÙKšY
NÝÉ‰ŠJ[
KJ[
KJ[
KŠÊJ_KØ[“X[˜YÙN›Y_JKÉ‰ˆQ	‰ˆP‰‰ˆS	‰šKšœÞ
™Ø]Y[QY]Ü‹Ú][N“ËšYÓÎ›[Üš^›ÛŽ‘KšÜš^›Û‘^\ËÜ›Ý\Î‘K™Ü›Ý\ËÝX™Ü›Ý\Î‘KœÝX™Ü›Ý\ËÛÛÜÙNŠ
OO“J[
KÛ”Ø]™NYKÛ“X[˜YÙTÝXÝ\™NŠ
OOžÓJ[
KJ‹Û›ÛY[˜Û]\™OÝšY]Ï]^Û›Û^Iœ™]\›•ÏX\ÜÛÜY[Š_KÝ\œ™[˜ÞNœË˜Ý\œ™[˜Þ_Ë™[Y\Ë™š[™
ÏO“[X™\ŠËšY
OOOS[X™\ŠË˜XÝ]™U™[YRY
JOË˜Ý\œ™[˜Þ_”•Pˆ‹›ÙXÝÎ˜™Ø]X]Ú[™Ô›ÙXÝÕŒN
K™Ø]\˜Ú\ÙT›ÙXÝÊÊJK[š]Ü[ÛœÎšKœØ[TÚ^™U[š]ËÛ“›ÛY[˜Û]\™PÜ™X]Y”OžÚYŠT
\™]\›ŽØÛÛœÝX™Ø]Ý]J
N×ÊŠKÜÙJ™Ø][ÙÔÝÜ™RÙ^KŠ__JKLI‰šKšœÞ
™Ø]ÝXÝ\™SX[˜YÙ\‹ÜÝ]N‘KÛÛÜÙNŠ
OO’JLJKÛ”Ø]™N˜\Þ[˜ÈÏOžØ]ØZ]™J´(t`´`4`ô.´`´`ô`4,4/4-t/tcˆ4`t/´at`4,4/t-t/t,‹ÊKJLJ__JK	‰ˆSÉ‰ˆP‰‰ˆS	‰šKšœÞ
™Ø]™XÚ\QY]Ü‹Ú][N‘™XÚ\N˜™Ø]™XÚ\Q›ÜŠKœ™XÚ\\ÊK›ÙXÝÎ˜™Ø]X]Ú[™Ô›ÙXÝÕŒN
K™Ø]\˜Ú\ÙT›ÙXÝÊÊJK˜[[˜Ù\Î‘KœÝØÚÐ˜[[˜Ù\ËÛÛÜÙNŠ
OOžŠ[
KÛ”Ø]™NšÙ_JK‰‰ˆSÉ‰ˆQ	‰ˆS	‰šKšœÞ
™Ø][\›˜[Y]Ü‹Ú][N‹šYÐŽ›[›ÙXÝÎ˜™Ø]X]Ú[™Ô›ÙXÝÕŒN
K™Ø]\˜Ú\ÙT›ÙXÝÊÊJKÛÛÜÙNŠ
OO•J[
KÛ”Ø]™N“Ù_JK	‰ˆSÉ‰ˆQ	‰ˆP‰‰šKšœÞ
™Ø]\›ÚY]ÛÛÛÜÙNŠ
OOœJ[
KÛ”ÝX›Z]—ÙKØY[™Î›ÛÛX[ŠÊ_JW_J_B‹Êˆ™X\ÜÛÜY[XÛÛ[X[™]ŒMÌ™[™
‹Â™[˜Ý[Ûˆ™X›Ý]YÙJ
^ØÛÛœÝËWOX

NÜ™]\›ˆKšœÞ
ÜÚÝÐ›ÝÛS˜]ŽˆLÚ[™[ŽšKšœÞÊ	KØÛ\ÜÓ˜[YNˆœL‹LÌˆ‹Ú[™[Ž–ÚKšœÞÊšXY\ˆ‹ØÛ\ÜÓ˜[YNˆœÝXÚÞHÜL‹LŒ™ËX˜XÚÙÜ›Ý[™ÎMH˜XÚÙ›ÜX›\‹[Y›Ü™\‹Xˆ›Ü™\‹X›Ü™\‹ÍŒMˆKM›^][\ËXÙ[\ˆØ\LÈ‹Ú[™[Ž–ÚKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OOÚ[™ÝË˜™˜]šYØ]P˜XÚÊ‹Û[Ü™HŠK˜\šXK[X™[Žˆ´'t,4-ô,4-‹Û\ÜÓ˜[YNˆËLLHLLH›Ý[™YY[™ËXØ\™›Ü™\ˆ›Ü™\‹X›Ü™\ˆ›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆXÝ]™NœØØ[KNMH‹Ú[™[ŽšKšœÞ
œËÜÚ^™NŒMŸJ_JKKšœÞ
šH‹ØÛ\ÜÓ˜[YNˆ^VÌŒH›ÛX›XÚÈ˜XÚÚ[™Ë]YÚ‹Ú[™[Žˆ´'ˆ˜\‘ØÝÜˆŸJW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆœMˆMH›^›^XÛÛØ\M‹Ú[™[Ž–ÚKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆœ›Ý[™YVÌœHMH^]Ú]H‹Ý[NžØ˜XÚÙÜ›Ý[™ˆ›[™X\‹YÜ˜YY[
MYYËÌLLMŒ‘‹ÌÌMJHŸKÚ[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLH›ÛX›XÚÈ\\˜Ø\ÙH˜XÚÚ[™ËVÌŒMY[WH^Y[Y\˜[LÌ‹Ú[™[Žˆ”™[X\ÙHØ[™Y]HŸJKKšœÞ
šˆ‹ØÛ\ÜÓ˜[YNˆ^VÌŽH›ÛX›XÚÈ]Lˆ˜XÚÚ[™Ë]YÚ‹Ú[™[Žˆ´%ô,4,´-t-4-t/t.4-H4/ô/´-4.´/´/t`´`4/´.ô-t/ŸJKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH^]Ú]KÍÌ]LÈXY[™Ë\™[^Y‹Ú[™[Žˆ˜\‘ØÝÜˆ4/´,tb´-t-4.4/tcô-t`ˆ4a4.4/t,4/t`tbË4`t/4-t/tbË4.´/´/4,4/t-4`Ë4`t.´.ô,4-4.4`ô/ô`4,4,´.ô-t/taô-t`t.´.4-H4`4-tb4-t/t.4cÈ4,ˆ4/´-4/t/´/4`4,4,t/´aô-t/4/ô`4/´`t`´`4,4/t`t`´,´-KˆŸJW_JKKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™ËXØ\™›Ý[™YLž›Ü™\ˆ›Ü™\‹XØ\™X›Ü™\ˆMH‹Ú[™[Ž–ÚKšœÞ
šÈ‹ØÛ\ÜÓ˜[YNˆ^VÌM\H›ÛX›XÚÈ‹Ú[™[Žˆ´&´,4.ˆ4/ô/´/4/´,ô,4-t`ˆRHŸJKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH^[]]YY›Ü™YÜ›Ý[™]LˆXY[™Ë\™[^Y‹Ú[™[Žˆ´(4-t.´/´/4-t/t-4,4a´.4.4`t`´`4/´cô`´`tcÈ4/ô/ˆ4a´-t/ô/´aô.´-Nˆ4a4,4.´`ˆ8¡¤ˆ4,´/´-ô/4/´-´/t,4cÈ4/ô`4.4aô.4/t,8¡¤ˆ4/ô/´`t.ô-t-4`t`´,´.4cÈ8¡¤ˆ4.´/´/t.´`4-t`´/t/´-H4-4-t.t`t`´,´.4-H8¡¤ˆ4/ô`4/´,´-t`4.´,4`4-t-ô`ô.ôc4`´,4`´,ˆRH4/ô/´/4/´,ô,4-t`ˆ4/ô`4.4/tcô`´c4`4-tb4-t/t.4-K4/t/ˆ4/t-H4-ô,4/4-t/tcô-t`ˆ4/ô`4/´,´-t`4.´`È4`ô/ô`4,4,´.ôcôc´bt-t,ô/‹ˆŸJW_JKKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™ËXØ\™›Ý[™YLž›Ü™\ˆ›Ü™\‹XØ\™X›Ü™\ˆMH‹Ú[™[Ž–ÚKšœÞ
šÈ‹ØÛ\ÜÓ˜[YNˆ^VÌM\H›ÛX›XÚÈ‹Ú[™[Žˆ´%4,4/t/tbô-H4.4-4/´`t`´`ô/ÈŸJKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH^[]]YY›Ü™YÜ›Ý[™]LˆXY[™Ë\™[^Y‹Ú[™[Žˆ´%4,4/t/tbô-H4`4,4-ô-4-t.ô-t/tbÈ4/ô/ˆ4-ô,4,´-t-4-t/t.4cô/ˆ4%4/´`t`´`ô/È4`t/´`´`4`ô-4/t.4.´/´,ˆ4/´/ô`4-t-4-t.ôcô-t`´`tcÈ4`4/´.ôc4cˆ4.4`4,4-ô`4-tb4-t/t.4cô/4.4,´.ô,4-4-t.ôc4a´,È4-ô,4.´`4bô`´bô.H4/4-t`tcôaˆ4a4.4.´`t.4`4`ô-t`ˆ4/ô/´-4`´,´-t`4-´-4dt/t/tbô.H4a4.4/t,4/t`t/´,´bô.H4`4-t-ô`ô.ôc4`´,4`‹ˆŸJW_JKKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™ËXØ\™›Ý[™YLž›Ü™\ˆ›Ü™\‹XØ\™X›Ü™\ˆMH‹Ú[™[Ž–ÚKšœÞ
šÈ‹ØÛ\ÜÓ˜[YNˆ^VÌM\H›ÛX›XÚÈ‹Ú[™[Žˆ´%4/´.´`ô/4-t/t`´bÈŸJKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ›]LÈÜšYÜšYXÛÛËLHØ\Lˆ‹Ú[™[Ž–ÚKšœÞ
˜H‹Ú™YŽˆ‹Ý\›\È‹Û\ÜÓ˜[YNˆšLLˆ›Ý[™Y^›Ü™\ˆ›Ü™\‹X›Ü™\ˆM›^][\ËXÙ[\ˆ\ÝYžKX™]ÙY[ˆ^VÌLÜH›ÛX›Û‹Ú[™[Žˆ´(ô`t.ô/´,´.4cÈ4`´-t`t`´.4`4/´,´,4/t.4cÈ8¡¤ˆŸJKKšœÞ
˜H‹Ú™YŽˆ‹Üš]˜XÞH‹Û\ÜÓ˜[YNˆšLLˆ›Ý[™Y^›Ü™\ˆ›Ü™\‹X›Ü™\ˆM›^][\ËXÙ[\ˆ\ÝYžKX™]ÙY[ˆ^VÌLÜH›ÛX›Û‹Ú[™[Žˆ´&´/´/ta4.4-4-t/ta´.4,4.ôc4/t/´`t`´c8¡¤ˆŸJW_JW_JKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌL\H^[]]YY›Ü™YÜ›Ý[™^XÙ[\ˆXY[™Ë\™[^YLÈ‹Ú[™[Ž–È´(t,t/´`4.´,‹ØÝ[Y[œ]Y\žTÙ[XÝÜŠ	ÛY]VÛ˜[YOH˜™X\]™\œÚ[Ûˆ—IÊOË˜ÛÛ[¸ %—_JW_JW_J_J_B‚‹Êˆ™\Ù][™ÜË]ŒNŽœÝ\
‹Â˜ÛÛœÝ™Ù][™ÜÕ™\œÚ[Û•ŒNHŒNˆŽÂ™[˜Ý[Ûˆ™Ù][™ÜÐZ[™\œÚ[Û•ŒNŠ
^Ü™]\›ˆØÝ[Y[œ]Y\žTÙ[XÝÜŠ	ÛY]VÛ˜[YOH˜™X\]™\œÚ[Ûˆ—IÊOË˜ÛÛ[´'t-H4/´/ô`4-t-4-t.ô-t/t,ŸB™[˜Ý[Ûˆ™Ù][™ÜÑ[˜[YUŒNŠJ^Ü™]\›–ÙOË™š\œÝ˜[YKOË›\Ý˜[YWK™š[\ŠO\[ÙˆOOHœÝš[™È‰‰š[J
JKš›Ú[ŠˆŠ_´'ô/´.ôc4-ô/´,´,4`´-t.ôcŸB™[˜Ý[Ûˆ™Ù][™ÜÔÙ\ÜÚ[Û‘]UŒNŠJ^ÚYŠYJ\™]\›ˆ´'t-t.4-ô,´-t`t`´/t/ˆŽÝž^Ü™]\›ˆ™]È[‘]U[YQ›Ü›X]
œKT•H‹Ù^Nˆ›[Y\šXÈ‹[ÛˆœÚÜ‹YX\Žˆ›[Y\šXÈ‹Ý\ŽˆŒ‹YYÚ]‹Z[]NˆŒ‹YYÚ]ŸJK™›Ü›X]
™]È]JJJ_XØ]ÚÜ™]\›ˆ´'t-t.4-ô,´-t`t`´/t/ˆŸ_B™[˜Ý[Ûˆ™Ù][™ÜÔ›ÝÕŒNŠÚXÛÛŽ™K]NÝX]N›‹˜[YNœ‹XÝ[ÛŽ˜KÛÛXÚÎœË\ÝXÝ]™N›HL_J^ØÛÛœÝO\ÏÈ˜]ÛˆŽˆ™]ˆŽÜ™]\›ˆKšœÞÊKÝ\NœÏÈ˜]ÛˆŽ›ÚYÛÛXÚÎœËÛ\ÜÓ˜[YNˆ˜™\Ù][™ÜË\›ÝË]ŒNˆŠÊÏÈˆ\ËXXÝ[ÛˆŽˆˆŠJÊÈˆ\ËY\ÝXÝ]™HŽˆˆŠKÚ[™[Ž–ÙI‰šKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\Ù][™ÜË\›ÝËZXÛÛ‹]ŒNˆ‹˜\šXKZY[ˆŽˆLÚ[™[ŽšKšœÞ
KÜÚ^™NŒN_J_JKKšœÞÊœÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\Ù][™ÜË\›ÝËXÛÜK]ŒNˆ‹Ú[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[ŽJK‰‰šKšœÞ
œÛX[‹ØÚ[™[Ž›ŸJW_JKKšœÞÊœÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\Ù][™ÜË\›ÝË]˜Z[[™Ë]ŒNˆ‹Ú[™[Ž–Ü‰‰šKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\Ù][™ÜË\›ÝË]˜[YK]ŒNˆ‹Ú[™[ŽœŸJKI‰šKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\Ù][™ÜË\›ÝËXXÝ[Û‹]ŒNˆ‹Ú[™[Ž˜_JKÉ‰ˆXI‰šKšœÞ
œ‹ÜÚ^™NŒMË˜\šXKZY[ˆŽˆLJW_JW_J_B™[˜Ý[Ûˆ™Ù][™ÜÔÙXÝ[Û•ŒNŠÝ]N™KÚ[™[Ž\ØÜš\[ÛŽ›ŸJ^Ü™]\›ˆKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™\Ù][™ÜË\ÙXÝ[Û‹]ŒNˆ‹Ú[™[Ž–ÚKšœÞ
šˆ‹ØÚ[™[Ž™_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\Ù][™ÜËXØ\™]ŒNˆ‹Ú[™[ŽJK‰‰šKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ˜™\Ù][™ÜË\ÙXÝ[Û‹[›ÝK]ŒNˆ‹Ú[™[Ž›ŸJW_J_B™[˜Ý[Ûˆ™Ù][™ÜÔÙ\ÜÚ[ÛœÔÚY]ŒNŠÛÜ[Ž™KÛÛÜÙNÝ]N›‹Û”™]žNœ‹Û”™]›ÚÙSÝ\œÎ˜K™]›ÚÚ[™ÎœßJ^ØÛÛœÝP\œ˜^Kš\Ð\œ˜^J‹œÙ\ÜÚ[ÛœÊOÛ‹œÙ\ÜÚ[ÛœÎ–×KO[™š[\ŠOˆY˜Ý\œ™[
K›[™ÝÜ™]\›ˆKšœÞ
YKØÚ[™[Ž™I‰šKšœÞÊK‘œ˜YÛY[ØÚ[™[Ž–ÚKšœÞ
Ë™]‹Ú[š]X[žÛÜXÚ]NŒK[š[X]NžÛÜXÚ]NŒ_K^]žÛÜXÚ]NŒKÛ\ÜÓ˜[YNˆ˜™\Ù][™ÜË\ÚY]X˜XÚÙ›Ü]ŒNˆ‹ÛÛXÚÎKœÙ][™ÜË\Ù\ÜÚ[ÛœËX˜XÚÙ›ÜŠKKšœÞÊË™]‹Ú[š]X[žÞNˆŒL	HŸK[š[X]NžÞNŒK^]žÞNˆŒL	HŸK˜[œÚ][ÛŽžÙ\˜][ÛŽ‹ŒËX\ÙN–ËŒŒ‹KŒÍ‹W_KÛ\ÜÓ˜[YNˆ˜™\Ù][™ÜË\ÚY]]ŒNˆ‹Ú[™[Ž–ÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\Ù][™ÜË\ÚY]Z[™K]ŒNˆ‹˜\šXKZY[ˆŽˆLJKKšœÞÊšXY\ˆ‹ØÚ[™[Ž–ÚKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
œ‹ØÚ[™[Žˆ´$t-t-ô/´/ô,4`t/t/´`t`´c4,4.´.´,4`ô/t`´,ŸJKKšœÞ
šˆ‹ØÚ[™[Žˆ´$4.´`´.4,´/tbô-H4`t-t`t`t.4.ŸJW_JKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎ˜\šXK[X™[Žˆ´%ô,4.´`4bô`´c‹Ú[™[Žˆ°åÈŸJW_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\Ù][™ÜË\ÚY]X›ÙK]ŒNˆ‹Ú[™[Ž›‹œÝ]\ÏOOH›ØY[™ÈÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ˜™\Ù][™ÜË\ÚY]\Ý]K]ŒNˆ‹Ú[™[Žˆ´%ô,4,ô`4`ô-´,4-t/4,4.´`´.4,´/tbô-H4`t-t`t`t.4.8 )ˆŸJN›‹œÝ]\ÏOOH™\œ›ÜˆÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\Ù][™ÜË\ÚY]\Ý]K]ŒNˆ\ËY\œ›Üˆ‹Ú[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Žˆ´'t-H4`ô-4,4.ô/´`tc4-ô,4,ô`4`ô-ô.4`´c4`t-t`t`t.4.ŸJKKšœÞ
œÜ[ˆ‹ØÚ[™[Žˆ´'ô`4/´,´-t`4c4`´-H4`t/´-t-4.4/t-t/t.4-H4.4/ô/´/ô`4/´,t`ô.t`´-H4-tbtdH4`4,4-ËˆŸJKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎœ‹Ú[™[Žˆ´'ô/´,´`´/´`4.4`´cŸJW_JN››[™ÝÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\Ù][™ÜË\Ù\ÜÚ[Û‹[\Ý]ŒNˆ‹Ú[™[Ž››X\

ŠOOšKšœÞÊ˜\XÛH‹ØÛ\ÜÓ˜[YNˆ˜™\Ù][™ÜË\Ù\ÜÚ[Û‹]ŒNˆŠÊ˜Ý\œ™[Èˆ\ËXÝ\œ™[ŽˆˆŠKÚ[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\Ù][™ÜË\Ù\ÜÚ[Û‹ZXÛÛ‹]ŒNˆ‹˜\šXKZY[ˆŽˆLÚ[™[ŽšKšœÞ
IÜÚ^™NŒNJ_JKKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–ÚKšœÞÊœÝ›Û™È‹ØÚ[™[Ž–È´(t-t`t`t.4cÈ˜\‘ØÝÜˆ‹˜Ý\œ™[	‰šKšœÞ
™[H‹ØÚ[™[Žˆ´(´-t.´`ôbt,4cÈŸJW_JKKšœÞÊœÛX[‹ØÚ[™[Ž–È´$´at/´-ˆ‹™Ù][™ÜÔÙ\ÜÚ[Û‘]UŒNŠ˜Ü™X]Y]
W_JKKšœÞÊœÛX[‹ØÚ[™[Ž–È´%4-t.t`t`´,´`ô-t`ˆ4-4/Žˆ‹™Ù][™ÜÔÙ\ÜÚ[Û‘]UŒNŠ™^\™\Ð]
W_JW_JW_KÝš[™Ê˜Ü™X]Y]
JÙŠJ_JNšKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ˜™\Ù][™ÜË\ÚY]\Ý]K]ŒNˆ‹Ú[™[Žˆ´$4.´`´.4,´/tbô-H4`t-t`t`t.4.4/t-H4/t,4.t-4-t/tbËˆŸJ_JKOŒ	‰›‹œÝ]\ÏOOHœ™XYH‰‰šKšœÞ
™›ÛÝ\ˆ‹ØÚ[™[ŽšKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎ˜K\ØX›YœËÚ[™[ŽœÏÈ´%ô,4,´-t`4b4,4-t/8 )ˆŽOOOLOÈ´%ô,4,´-t`4b4.4`´c4-4`4`ô,ô`ôcˆ4`t-t`t`t.4cˆŽˆ´%ô,4,´-t`4b4.4`´c4/´`t`´,4.ôc4/tbô-H4`t-t`t`t.4.ŸJ_JW_JW_J_J_B™[˜Ý[Ûˆ™Ù][™ÜÔYÙUŒNŠ
^ØÛÛœÝËWOX

KÝ\Ù\ŽOR›ÙJ
KÝØ\Ý›ŸO\ÛŠ
KX™\ÙS[Ü™U™[YPÛÛ^ŒMŠ
KØK×OTË\ÙTÝ]JÜÝ]\ÎˆšYH‹Ù\ÜÚ[ÛœÎ–×_JKÛWOTË\ÙTÝ]JLJKÙ—OTË\ÙTÝ]JLJKÛKOTË\ÙTÝ]JLJKÏX™Ù][™ÜÑ[˜[YUŒNŠ
KOT[ÙJ
K\‹™[Y\Ë™š[™
O“[X™\ŠšY
OOOS[X™\Š‹˜XÝ]™U™[YRY
J_‹™[Y\ÖÌ_[ZË›˜[Y_´(´-t.´`ôbt-t-H4-ô,4,´-t-4-t/t.4-H‹TË\ÙPØ[˜XÚÊ\Þ[˜Ê
OOžÜÊOŠË‹‹”Ý]\Îˆ›ØY[™ÈŸJJNØÛÛœÝSÝ

NÚYŠTŠ^ÜÊÜÝ]\Îˆ™\œ›Üˆ‹Ù\ÜÚ[ÛœÎ–×_JNÜ™]\›Ÿ]ž^ØÛÛœÝÏX]ØZ]™]Ú
‹Ø\KÝ\Ù\œËÜÙ\ÜÚ[ÛœÈ‹ÚXY\œÎžÐXØÙ\ˆ˜\XØ][Û‹ÚœÛÛˆ‹‹‹˜ØJŠ_KØXÚNˆ››Ë\ÝÜ™HŸJKOX]ØZ]ËšœÛÛŠ
NÚYŠPË›ÚßPOË›ÚßP\œ˜^Kš\Ð\œ˜^JKœÙ\ÜÚ[ÛœÊJ]›ÝÈ™]È\œ›ÜŠ”ÑTÔÒSÓ—ÓTÕÑRSQŠNÜÊÜÝ]\Îˆœ™XYH‹Ù\ÜÚ[ÛœÎKœÙ\ÜÚ[ÛœßJ_XØ]ÚÜÊOŠÜÝ]\Îˆ™\œ›Üˆ‹Ù\ÜÚ[ÛœÎ\œ˜^Kš\Ð\œ˜^JœÙ\ÜÚ[ÛœÊOÔœÙ\ÜÚ[ÛœÎ–×_JJ__K×JNÔË\ÙQY™™XÝ


OOžØŠ
_KØ—JNØÛÛœÝXKœÝ]\ÏOOH›ØY[™ÈÈ´%ô,4,ô`4`ô-ô.´,8 )ˆŽ˜KœÝ]\ÏOOHœ™XYHÊKœÙ\ÜÚ[ÛœË›[™ÝOOLOÈŒH4`t-t`t`t.4cÈŽ˜KœÙ\ÜÚ[ÛœË›[™ÝL‰‰˜KœÙ\ÜÚ[ÛœË›[™ÝMØKœÙ\ÜÚ[ÛœË›[™Ý
Èˆ4`t-t`t`t.4.Ž˜KœÙ\ÜÚ[ÛœË›[™Ý
Èˆ4`t-t`t`t.4.HŠNˆ´'t-H4/´/ô`4-t-4-t.ô-t/t/ˆŽØ\Þ[˜È[˜Ý[ÛˆJ
^ÙŠL
NØÛÛœÝSÝ

NÝž^ØÛÛœÝX]ØZ]™]Ú
‹Ø\KÝ\Ù\œËÜÙ\ÜÚ[ÛœÈ‹ÛY]Ùˆ‘SUH‹XY\œÎžÐXØÙ\ˆ˜\XØ][Û‹ÚœÛÛˆ‹‹‹˜ØJˆŠ_KØXÚNˆ››Ë\ÝÜ™HŸJKÏX]ØZ]‹šœÛÛŠ
NÚYŠT‹›ÚßPÏË›ÚÊ]›ÝÈ™]È\œ›ÜŠ”ÑTÔÒSÓ—Ô‘U“ÒÑWÑRSQŠNÜÊÜÝ]\Îˆœ™XYH‹Ù\ÜÚ[ÛœÎ\œ˜^Kš\Ð\œ˜^JËœÙ\ÜÚ[ÛœÊOÐËœÙ\ÜÚ[ÛœÎ–×_JKŠÝ˜\šX[ˆœÝXØÙ\ÜÈ‹]Nˆ´$ô/´`´/´,´/ˆ‹\ØÜš\[ÛŽˆ´'´`t`´,4.ôc4/tbô-H4`t-t`t`t.4.4-ô,4,´-t`4b4-t/tbËˆŸJ_XØ]ÚÛŠÝ˜\šX[ˆ™\œ›Üˆ‹]Nˆ´'t-H4`ô-4,4.ô/´`tc4-ô,4,´-t`4b4.4`´c4`t-t`t`t.4.‹\ØÜš\[ÛŽˆ´'ô/´,´`´/´`4.4`´-H4/ô/´/ôbô`´.´`È4/ô/´-ô-´-KˆŸJ_Yš[˜[^ÙŠLJ__X\Þ[˜È[˜Ý[ÛˆÊ
^Ú
L
NØÛÛœÝSÝ

NÝž^ØÛÛœÝX]ØZ]™]Ú
‹Ø\KÝ\Ù\œËÙ^Ü‹ÚXY\œÎžÐXØÙ\ˆ˜\XØ][Û‹ÚœÛÛˆ‹‹‹˜ØJˆŠ_KØXÚNˆ››Ë\ÝÜ™HŸJNÚYŠT‹›ÚÊ]›ÝÈ™]È\œ›ÜŠ‘VÔ•ÑRSQŠNØÛÛœÝÏX]ØZ]‹˜›ØŠ
KOUT“˜Ü™X]SØš™XÝT“
ÊKÏYØÝ[Y[˜Ü™X]Q[[Y[
˜HŠNÚËš™YPKË™ÝÛ›ØYH˜˜\™ØÝÜ‹\\œÛÛ˜[Y]KšœÛÛˆ‹ØÝ[Y[˜›ÙK˜\[™Ú[
ÊKË˜ÛXÚÊ
KËœ™[[Ý™J
KÙ][Y[Ý]


OO•T“œ™]›ÚÙSØš™XÝT“
JK
KŠÝ˜\šX[ˆœÝXØÙ\ÜÈ‹]Nˆ´+t.´`t/ô/´`4`ˆ4,ô/´`´/´,ˆ‹\ØÜš\[ÛŽˆ´)4,4.t.È4`H4-4,4/t/tbô/4.4,4.´.´,4`ô/t`´,4`t.´,4aô,4/KˆŸJ_XØ]ÚÛŠÝ˜\šX[ˆ™\œ›Üˆ‹]Nˆ´'t-H4`ô-4,4.ô/´`tc4ct.´`t/ô/´`4`´.4`4/´,´,4`´c4-4,4/t/tbô-H‹\ØÜš\[ÛŽˆ´'ô`4/´,´-t`4c4`´-H4`t/´-t-4.4/t-t/t.4-H4.4/ô/´/ô`4/´,t`ô.t`´-H4-tbtdH4`4,4-ËˆŸJ_Yš[˜[^Ú
LJ__X\Þ[˜È[˜Ý[Ûˆ

^Ø]ØZ]™ÙÛÝ]Ù\ÜÚ[ÛŠ
KÞŠ
K^Š
KØØ[ÝÜ˜YÙKœ™[[Ý™R][J˜™ØXÝ]™WÝ™[YWÚYŠKØØ[ÝÜ˜YÙKœ™[[Ý™R][J˜™ØXÝ]™WÝ™[YWÚ\×Üš[X\žHŠKØØ[ÝÜ˜YÙKœ™[[Ý™R][J˜™ØXÝ]™WÜ›ÛHŠKØØ[ÝÜ˜YÙKœ™[[Ý™R][J˜™ØXÝ]™WÜ\›Z\ÜÚ[ÛœÈŠKÚ[™ÝË›ØØ][Û‹œ™\XÙJ‹ÛÙÚ[ˆŠ_\™]\›ˆKšœÞ
ÜÚÝÐ›ÝÛS˜]ŽˆLÛ\ÜÓ˜[YNˆ˜™\Ù][™ÜË\Ú[]ŒNˆ‹Ú[™[ŽšKšœÞÊ›XZ[ˆ‹È™]KX™\Ù][™ÜÈŽ˜™Ù][™ÜÕ™\œÚ[Û•ŒN‹Û\ÜÓ˜[YNˆ˜™\Ù][™ÜË\YÙK]ŒNˆ‹Ú[™[Ž–ÚKšœÞÊšXY\ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\Ù][™ÜËZXY\‹]ŒNˆ‹Ú[™[Ž–ÚKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OOÚ[™ÝË˜™˜]šYØ]P˜XÚÊ‹Û[Ü™HŠK˜\šXK[X™[Žˆ´'t,4-ô,4-‹Û\ÜÓ˜[YNˆ˜™\Ù][™ÜËX˜XÚË]ŒNˆ‹Ú[™[ŽšKšœÞ
œËÜÚ^™NŒNJ_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\Ù][™ÜË]]K]ŒNˆ‹Ú[™[Ž–ÚKšœÞ
œ‹ØÚ[™[Žˆ˜\‘ØÝÜˆŸJKKšœÞ
šH‹ØÚ[™[Žˆ´'t,4`t`´`4/´.t.´.ŸJW_JKKšœÞ
™]ˆ‹È™]KX™]™[YKZÜÝŽˆœÙ][™ÜË]ŒNˆ‹Û\ÜÓ˜[YNˆ˜™\Ù][™ÜË]™[YKZÜÝ]ŒNˆ‹Ú[™[Žœ‹™[Y\Ë›[™Ý‰‰šKšœÞÊœÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\Ù][™ÜËXÝ\œ™[]™[YK]ŒNˆ‹]N‹Ú[™[Ž–ÚKšœÞ
šH‹È˜\šXKZY[ˆŽˆLJKKšœÞ
œÝ›Û™È‹ØÚ[™[ŽŸJW_J_JW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\Ù][™ÜËXÛÛ[]ŒNˆ‹Ú[™[Ž–ÚKšœÞ
™Ù][™ÜÔÙXÝ[Û•ŒN‹Ý]Nˆ´$4.´.´,4`ô/t`ˆ‹Ú[™[ŽšKšœÞÊK‘œ˜YÛY[ØÚ[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\Ù][™ÜËXXØÛÝ[]ŒNˆ‹Ú[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\Ù][™ÜËX]˜]\‹]ŒNˆ‹Ú[™[ŽžOOOHÈÚKšœÞ
˜ËÜÚ^™NŒŒŸJNž_JKKšœÞÊœÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™\Ù][™ÜËXXØÛÝ[XÛÜK]ŒNˆ‹Ú[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Ž™ßJKË™[XZ[	‰šKšœÞ
œÛX[‹ØÚ[™[Ž™[XZ[JKËœÛ™I‰šKšœÞ
œÛX[‹ØÚ[™[ŽœÛ™_JW_JW_JKKšœÞ
™Ù][™ÜÔ›ÝÕŒN‹ÚXÛÛŽž˜Ë]Nˆ´'ô`4/´a4.4.ôc4.4.´/´/t`´,4.´`´/tbô-H4-4,4/t/tbô-H‹ÝX]Nˆ´&4/4cË4`´-t.ô-ta4/´/H4.4-4,4/t/tbô-H4,4.´.´,4`ô/t`´,‹ÛÛXÚÎŠ
OO™J‹Ü›Ùš[HŠ_JW_J_JKKšœÞ
™Ù][™ÜÔÙXÝ[Û•ŒN‹Ý]Nˆ´'ô`4.4.ô/´-´-t/t.4-H‹\ØÜš\[ÛŽˆ´$´,4.ôc´`´,4.4aô,4`t/´,´/´.H4/ô/´cô`H4/t,4`t`´`4,4.4,´,4c´`´`tcÈ4-4.ôcÈ4.´,4-´-4/´,ô/ˆ4-ô,4,´-t-4-t/t.4cËˆ‹Ú[™[ŽšKšœÞÊK‘œ˜YÛY[ØÚ[™[Ž–ÚKšœÞ
™Ù][™ÜÔ›ÝÕŒN‹ÚXÛÛŽ›K]Nˆ´+ô-ôbô.ˆ4.4/t`´-t`4a4-t.t`t,‹˜[YNˆ´(4`ô`t`t.´.4.HŸJKKšœÞ
™Ù][™ÜÔ›ÝÕŒN‹ÚXÛÛŽ›I]Nˆ´(´-t/4,4.4/t`´-t`4a4-t.t`t,‹˜[YNˆ´(t,´-t`´.ô,4cÈŸJW_J_JKKšœÞ
™Ù][™ÜÔÙXÝ[Û•ŒN‹Ý]Nˆ´$t-t-ô/´/ô,4`t/t/´`t`´c‹Ú[™[ŽšKšœÞÊK‘œ˜YÛY[ØÚ[™[Ž–ÝË˜]]Ë˜Ø[Ú[™ÙT\ÜÝÛÜ™	‰šKšœÞ
™Ù][™ÜÔ›ÝÕŒN‹ÚXÛÛŽ•K]Nˆ´&4-ô/4-t/t.4`´c4/ô,4`4/´.ôc‹ÝX]Nˆ´)ô-t`4-t-È4/ô/´-4`´,´-t`4-´-4-t/t.4-H4`t,´cô-ô,4/t/t/´.H4`ôaôdt`´/t/´.H4-ô,4/ô.4`t.‹ÛÛXÚÎŠ
OOÚ[™ÝË›ØØ][Û‹˜\ÜÚYÛŠ‹Ù›Ü™ÛÝ\\ÜÝÛÜ™Š_JKKšœÞ
™Ù][™ÜÔ›ÝÕŒN‹ÚXÛÛŽ›I]Nˆ´$4.´`´.4,´/tbô-H4`t-t`t`t.4.‹ÝX]Nˆ´(ô`t`´`4/´.t`t`´,´,4/ô/´.´,4/t-H4a4.4.´`t.4`4`ôc´`´`tcÈ‹˜[YN“‹ÛÛXÚÎŠ
OOžÝJL
K
KœÝ]\ÏOOHšYHŸKœÝ]\ÏOOH™\œ›ÜˆŠI‰˜Š
__JW_J_JKKšœÞ
™Ù][™ÜÔÙXÝ[Û•ŒN‹Ý]Nˆ´&´/´/ta4.4-4-t/ta´.4,4.ôc4/t/´`t`´c4.4-4,4/t/tbô-H‹\ØÜš\[ÛŽˆ´+t.´`t/ô/´`4`ˆ4/t-H4,´.´.ôc´aô,4-t`ˆ4/´/ô-t`4,4a´.4/´/t/tbô-H4-4,4/t/tbô-H4-ô,4,´-t-4-t/t.4.Kˆ‹Ú[™[ŽšKšœÞ
™Ù][™ÜÔ›ÝÕŒN‹ÚXÛÛŽšË]Nˆ´+t.´`t/ô/´`4`ˆ4/ô-t`4`t/´/t,4.ôc4/tbôaH4-4,4/t/tbôaH‹ÝX]Nˆ’”ÓÓ‹ta4,4.t.È4`H4/ô`4/´a4.4.ô-t/4.4-4/´`t`´`ô/ô,4/4.‹XÝ[ÛŽ›OÈ´'ô/´-4,ô/´`´/´,´.´,8 )ˆŽˆ´(t.´,4aô,4`´c‹ÛÛXÚÎ›OÝ›ÚY—ßJ_JKKšœÞ
™Ù][™ÜÔÙXÝ[Û•ŒN‹Ý]Nˆ´'ˆ˜\‘ØÝÜˆ‹Ú[™[ŽšKšœÞÊK‘œ˜YÛY[ØÚ[™[Ž–ÚKšœÞ
™Ù][™ÜÔ›ÝÕŒN‹ÚXÛÛŽ“Ù‹]Nˆ´'ˆ4/ô`4.4.ô/´-´-t/t.4.‹ÛÛXÚÎŠ
OO™J‹ØX›Ý]Š_JKKšœÞ
™Ù][™ÜÔ›ÝÕŒN‹ÚXÛÛŽ“Ù‹]Nˆ´'ô/´.ô.4`´.4.´,4.´/´/ta4.4-4-t/ta´.4,4.ôc4/t/´`t`´.‹ÛÛXÚÎŠ
OO™J‹Üš]˜XÞHŠ_JKKšœÞ
™Ù][™ÜÔ›ÝÕŒN‹ÚXÛÛŽ“Ù‹]Nˆ´(ô`t.ô/´,´.4cÈ4`´-t`t`´.4`4/´,´,4/t.4cÈ‹ÛÛXÚÎŠ
OO™J‹Ý\›\ÈŠ_JKKšœÞ
™Ù][™ÜÔ›ÝÕŒN‹ÚXÛÛŽ“Ù‹]Nˆ´$´-t`4`t.4cÈ4/ô`4.4.ô/´-´-t/t.4cÈ‹˜[YN˜™Ù][™ÜÐZ[™\œÚ[Û•ŒNŠ
_JW_J_JKKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™\Ù][™ÜË[ÙÛÝ]]ŒNˆ‹ÛÛXÚÎ•Ú[™[Ž–ÚKšœÞ
ÔKÜÚ^™NŒŒ˜\šXKZY[ˆŽˆLJKKšœÞ
œÜ[ˆ‹ØÚ[™[Žˆ´$´bô.t`´.4.4-È4,4.´.´,4`ô/t`´,ŸJW_JW_JKKšœÞ
™Ù][™ÜÔÙ\ÜÚ[ÛœÔÚY]ŒN‹ÛÜ[Ž›ÛÛÜÙNŠ
OOJLJKÝ]N˜KÛ”™]žN˜‹Û”™]›ÚÙSÝ\œÎ‘K™]›ÚÚ[™Î™JW_J_J_B‹Êˆ™\Ù][™ÜË]ŒNŽ™[™
‹Â˜ÛÛœÝ—ÙO^È‹Ù[\ÞYY\ÈŽˆ´(t/´`´`4`ô-4/t.4.´.‹‹ÜÝ\Y\œÈŽˆ´'ô/´`t`´,4,´bt.4.´.‹‹ØØ][ÙÈŽˆ´$4`t`t/´`4`´.4/4-t/t`ˆ4.4`´-tat.´,4`4`´bÈ‹‹ÝØ\™ZÝ\ÙHŽˆ´(t.´.ô,4-‹‹Ü™\ÜÈŽˆ´'´`´aôdt`´bÈ‹‹Û›ÝYšXØ][ÛœÈŽˆ´(ô,´-t-4/´/4.ô-t/t.4cÈ‹‹ÜÙ][™ÜÈŽˆ´'t,4`t`´`4/´.t.´.‹‹ØX›Ý]Žˆ´'ˆ4/ô`4.4.ô/´-´-t/t.4.ŸNÙ[˜Ý[Ûˆ

^ØÛÛœÝÙKOX

K[—ÙVÙWOÏÈ´(4,4-ô-4-t.ÈŽÜ™]\›ˆKšœÞ
ÜÚÝÐ›ÝÛS˜]ŽˆLÚ[™[ŽšKšœÞÊ	KØÛ\ÜÓ˜[YNˆœMH‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆØ\LÈMˆX‹LL‹Ú[™[Ž–ÚKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OO
‹Û[Ü™HŠKÛ\ÜÓ˜[YNˆËNHNH›Ý[™YY[™ËXØ\™›Ü™\ˆ›Ü™\‹X›Ü™\ˆ›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆÝ™\Ž˜™Ë[]]YXÝ]™NœØØ[KVÌŽMH˜[œÚ][Û‹X[‹Ú[™[ŽšKšœÞ
œËÜÚ^™NŒMËÛ\ÜÓ˜[YNˆ^Y›Ü™YÜ›Ý[™ŸJ_JKKšœÞ
šH‹ØÛ\ÜÓ˜[YNˆ^VÌŒH›ÛX›Û^Y›Ü™YÜ›Ý[™˜XÚÚ[™Ë]YÚ‹Ú[™[Ž›ŸJW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆœMˆ›^›^XÛÛ][\ËXÙ[\ˆ^XÙ[\ˆLLˆ‹Ú[™[Ž–ÚKšœÞ
Ë™]‹Ú[š]X[žÜØØ[N‹ŽKÜXÚ]NŒK[š[X]NžÜØØ[NŒKÜXÚ]NŒ_K˜[œÚ][ÛŽžÙ\˜][ÛŽ‹X\ÙN–ËŒŒ‹KŒÍ‹W_KÛ\ÜÓ˜[YNˆËLŒLŒ›Ý[™YVÌH™Ë\š[X\žKÌL›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆX‹Mˆ‹Ú[™[ŽšKšœÞ
KÜÚ^™NŒÍ‹Û\ÜÓ˜[YNˆ^\š[X\žHŸJ_JKKšœÞÊË™]‹Ú[š]X[žÛÜXÚ]NŒNŒLŸK[š[X]NžÛÜXÚ]NŒKNŒK˜[œÚ][ÛŽžÙ[^N‹ŒK\˜][ÛŽ‹ŒÎX\ÙN–ËŒŒ‹KŒÍ‹W_KÚ[™[Ž–ÚKšœÞ
šˆ‹ØÛ\ÜÓ˜[YNˆ^VÌŒœH›ÛX›XÚÈ^Y›Ü™YÜ›Ý[™˜XÚÚ[™Ë]YÚX‹LÈ‹Ú[™[Žˆ´(t.´/´`4/ˆ4,t`ô-4-t`ˆ4-4/´`t`´`ô/ô/t/ˆŸJKKšœÞÊœ‹ØÛ\ÜÓ˜[YNˆ^VÌM\H^[]]YY›Ü™YÜ›Ý[™XY[™Ë\™[^YX^]ËVÌŽH‹Ú[™[Ž–È´(4,4-ô-4-t.È0ªÈ‹‹°®È4/t,4at/´-4.4`´`tcÈ4,ˆ4`4,4-ô`4,4,t/´`´.´-H4.4/ô/´cô,´.4`´`tcÈ4,ˆ4,t.ô.4-´,4.tb4-t/4/´,t/t/´,´.ô-t/t.4.˜\‘ØÝÜ‹ˆ—_JW_JKKšœÞ
Ë˜]Û‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OO
‹Û[Ü™HŠK[š]X[žÛÜXÚ]NŒNŒLK[š[X]NžÛÜXÚ]NŒKNŒK˜[œÚ][ÛŽžÙ[^N‹ŒŒ‹\˜][ÛŽ‹ŒÍ‹X\ÙN–ËŒŒ‹KŒÍ‹W_KÛ\ÜÓ˜[YNˆ›]LLMˆKLÈ™Ë\š[X\žH^]Ú]H›Ý[™YLž^VÌM\H›Û\Ù[ZX›ÛXÝ]™NœØØ[KVÌŽM×HÝ™\Ž›ÜXÚ]KNL˜[œÚ][Û‹X[ÚYÝËVÌÍÌMœÜ™Ø˜JLKL‹ŒÍKŒŽ
WH‹Ú[™[Žˆ´'t,4-ô,4-4,ˆ4/4-t/tcˆŸJW_JW_J_J_XÛÛœÝ—ÙO^Ù\]Z\Y[‘‹ÝY\ÝÎ“ËÝY\Ý^\šY[˜ÙN“Y‹ÝY™Žžœ‹Ü\˜][ÛœÎ’XËš[˜[˜ÙN‰ËXZ[[˜[˜ÙNš	\ÚÜÎšÛ_KO^ÜŽŒÞŽÞNŽÝÎŒLÚ^™NŒMŒKŽO^ÜŽŒŽÞŒÎÞNŒÎÝÎKÚ^™NÍŸNÙ[˜Ý[ÛˆUŠJ^ØÛÛœÝLŠ“X]”J™Kœ‹]
‹ÍNÜ™]\›žØÚ\˜Î\˜ÌÌ›Ÿ_Y[˜Ý[ÛˆWÙJÜØÛÜ™N™_J^ØÛÛœÝØÚ\˜Î\˜ÌÌ›ŸOTUŠJKØÞœ‹ÞN˜KŽœËÝÎ›Ú^™N_O]KYHOO[[ÛŠŠKÌL
NŒYHOO[[Ù˜ÊJN›[Ü™]\›ˆKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆœ™[]]™H›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆ‹Ý[NžÝÚYKZYÚ_KÚ[™[Ž–ÚKšœÞÊœÝ™È‹ÝÚYKZYÚKšY]Ð›Þ˜	Ý_H	Ý_Xš[ˆ››Û™H‹˜\šXKZY[ˆŽˆLÚ[™[Ž–ÚKšœÞ
˜Ú\˜ÛH‹ØÞœ‹ÞN˜KŽœËÝ›ÚÙNˆœ™Ø˜JMKMKMKŒL
H‹Ý›ÚÙUÚY›Ý›ÚÙS[™XØ\ˆœ›Ý[™‹š[ˆ››Û™H‹Ý›ÚÙQ\Ú\œ˜^N˜	ÛŸH	ÝX˜[œÙ›Ü›N˜›Ý]JLÍH	ÜŸH	Ø_JXJKHOO[[	‰šKšœÞ
Ë˜Ú\˜ÛKØÞœ‹ÞN˜KŽœËÝ›ÚÙN™‹œÝ›ÚÙKÝ›ÚÙUÚY›Ý›ÚÙS[™XØ\ˆœ›Ý[™‹š[ˆ››Û™H‹˜[œÙ›Ü›N˜›Ý]JLÍH	ÜŸH	Ø_JX[š]X[žÜÝ›ÚÙQ\Ú\œ˜^N˜	ÝXK[š[X]NžÜÝ›ÚÙQ\Ú\œ˜^N˜	ÙH	ÝXK˜[œÚ][ÛŽžÙ\˜][ÛŽŒKX\ÙN–ËŒŒ‹KŒÍ‹WK[^N‹ŒŸ_JKOOO[[	‰šKšœÞ
Ë˜Ú\˜ÛKØÞœ‹ÞN˜KŽœËÝ›ÚÙNˆœ™Ø˜JLKL‹ŒÍK
H‹Ý›ÚÙUÚY›Ý›ÚÙS[™XØ\ˆœ›Ý[™‹š[ˆ››Û™H‹Ý›ÚÙQ\Ú\œ˜^N˜	ÛŸH	ÝX˜[œÙ›Ü›N˜›Ý]JLÍH	ÜŸH	Ø_JX[š[X]NžÛÜXÚ]N–ËŒËËŒ×_K˜[œÚ][ÛŽžÙ\˜][ÛŽŒ‹Ž™\X]ŒKÌX\ÙNˆ™X\ÙR[“Ý]Ÿ_JW_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜XœÛÛ]H[œÙ]L›^›^XÛÛ][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆØ\LH‹Ú[™[Ž™HOO[[ÚKšœÞÊK‘œ˜YÛY[ØÚ[™[Ž–ÚKšœÞ
ËœÜ[‹Ú[š]X[žÛÜXÚ]NŒØØ[N‹ŽK[š[X]NžÛÜXÚ]NŒKØØ[NŒ_K˜[œÚ][ÛŽžÙ[^N‹\˜][ÛŽ‹KX\ÙN–ËŒŒ‹KŒÍ‹W_KÛ\ÜÓ˜[YNˆ^VÍœH›ÛX›XÚÈXY[™Ë[›Û™H^]Ú]H‹Ú[™[Ž™_JKKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ^VÌL\H›ÛX›Û\\˜Ø\ÙH˜XÚÚ[™Ë]ÚY\Ý^]Ú]KÍ‹Ú[™[Žˆ´,t,4.ô.ÈŸJW_JNšKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ^VÌÎH›ÛX›XÚÈXY[™Ë[›Û™H^]Ú]KÌÌ‹Ú[™[Žˆ¸ %ŸJ_JW_J_Y[˜Ý[ÛˆWÙJÜØÛÜ™N™K[^NLXÛÛŽ›ŸJ^ØÛÛœÝØÚ\˜Îœ‹\˜ÌÌ˜_OTUŠŽJKØÞœËÞN›ŽKÝÎ™Ú^™N™ŸO[ŽKOYHOO[[ØJŠKÌL
NŒYHOO[[Ù˜ÊJN›[ÏZÚ˜ÛÛÜŽˆœ™Ø˜JMKMKMKŒÊHŽÜ™]\›ˆKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆœ™[]]™H›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆ‹Ý[NžÝÚY™‹ZYÚ™ŸKÚ[™[Ž–ÚKšœÞÊœÝ™È‹ÝÚY™‹ZYÚ™‹šY]Ð›Þ˜	ÙŸH	ÙŸXš[ˆ››Û™H‹˜\šXKZY[ˆŽˆLÚ[™[Ž–ÚKšœÞ
˜Ú\˜ÛH‹ØÞœËÞN›ŽKÝ›ÚÙNˆœ™Ø˜JMKMKMKŒL
H‹Ý›ÚÙUÚY™Ý›ÚÙS[™XØ\ˆœ›Ý[™‹š[ˆ››Û™H‹Ý›ÚÙQ\Ú\œ˜^N˜	Ø_H	ÜŸX˜[œÙ›Ü›N˜›Ý]JLÍH	ÜßH	ÛJXJKHOO[[	‰šKšœÞ
Ë˜Ú\˜ÛKØÞœËÞN›ŽKÝ›ÚÙNšœÝ›ÚÙKÝ›ÚÙUÚY™Ý›ÚÙS[™XØ\ˆœ›Ý[™‹š[ˆ››Û™H‹˜[œÙ›Ü›N˜›Ý]JLÍH	ÜßH	ÛJX[š]X[žÜÝ›ÚÙQ\Ú\œ˜^N˜	ÜŸXK[š[X]NžÜÝ›ÚÙQ\Ú\œ˜^N˜	Û_H	ÜŸXK˜[œÚ][ÛŽžÙ\˜][ÛŽŒKŒ‹X\ÙN–ËŒŒ‹KŒÍ‹WK[^N
ËŒß_JKOOO[[	‰šKšœÞ
Ë˜Ú\˜ÛKØÞœËÞN›ŽKÝ›ÚÙNˆœ™Ø˜JMKMKMKŒMJH‹Ý›ÚÙUÚY™Ý›ÚÙS[™XØ\ˆœ›Ý[™‹š[ˆ››Û™H‹Ý›ÚÙQ\Ú\œ˜^N˜	Ø_H	ÜŸX˜[œÙ›Ü›N˜›Ý]JLÍH	ÜßH	ÛJX[š[X]NžÛÜXÚ]N–ËŽ_K˜[œÚ][ÛŽžÙ\˜][ÛŽŒ‹™\X]ŒKÌX\ÙNˆ™X\ÙR[“Ý]‹[^N_JW_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜XœÛÛ]H[œÙ]L›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆ‹Ú[™[ŽšKšœÞ
‹ÜÚ^™NŒM‹Ý[NžØÛÛÜŽ™ß_J_JW_J_Y[˜Ý[Ûˆ×ÙJØØ]™K[^NJ^ØÛÛœÝ\—ÙVÙKšYK\PÖÙKšYKOYKœØÛÜ™HOO[[Ù˜ÊKœØÛÜ™JN›[Ü™]\›ˆKšœÞÊË™]‹Ú[š]X[žÛÜXÚ]NŒNŒMŸK[š[X]NžÛÜXÚ]NŒKNŒK˜[œÚ][ÛŽžÙ[^N\˜][ÛŽ‹‹X\ÙN–ËŒŒ‹KŒÍ‹W_KÛ\ÜÓ˜[YNˆœ›Ý[™YVÌŒHÝ™\™›ÝËZY[ˆ›^›^XÛÛ][\ËXÙ[\ˆMH‹MLÈ‹Ý[NžØ˜XÚÙÜ›Ý[™ˆ›[™X\‹YÜ˜YY[
MŒYËÌQLŒÍ	KÌNQÍHMIKÌPLMŒÎL	JH‹›ÞÚYÝÎˆŒŒ™Ø˜JM‹ŒŒÌŠHŸKÚ[™[Ž–ÚKšœÞ
WÙKÜØÛÜ™N™KœØÛÜ™K[^NXÛÛŽ›ŸJKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ›]LHX‹LH‹Ú[™[Ž™KœØÛÜ™HOO[[ÚKšœÞ
ËœÜ[‹Ú[š]X[žÛÜXÚ]NŒK[š[X]NžÛÜXÚ]NŒ_K˜[œÚ][ÛŽžÙ[^N
Ë_KÛ\ÜÓ˜[YNˆ^VÌŒœH›ÛX›XÚÈ^]Ú]HXY[™Ë[›Û™H‹Ú[™[Ž™KœØÛÜ™_JNšKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ^VÌŒœH›ÛX›XÚÈ^]Ú]KÌHXY[™Ë[›Û™H‹Ú[™[Žˆ¸ %ŸJ_JKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌL\H›Û\Ù[ZX›Û^]Ú]KÍL^XÙ[\ˆXY[™Ë]YÚ]LH‹Ú[™[Žœ‹›X™[ÚÜJKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ›]Lˆ‹Ú[™[Ž˜OÚKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ^VÌLH›ÛX›ÛLˆKLH›Ý[™YY[‹Ý[NžØÛÛÜŽ˜K˜ÛÛÜ‹˜XÚÙÜ›Ý[™˜K˜™ßKÚ[™[Ž˜K›X™[JNšKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ^VÌLH›Û[YY][H^]Ú]KÌHLˆKLH›Ý[™YY[™Ë]Ú]KÍH‹Ú[™[Žˆ´'t-t`ˆ4-4,4/t/tbôaHŸJ_JKKš\Ñ]I‰™K›Ü[ÛÝ[Œ	‰šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆØ\LH]Lˆ‹Ú[™[Ž–ÚKšœÞ
›‹ÜÚ^™NŽKÛ\ÜÓ˜[YNˆ^]Ú]KÌÌŸJKKšœÞÊœÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ^VÎ\H^]Ú]KÌÌ›Û[YY][H‹Ú[™[Ž–ÙK›Ü[ÛÝ[ˆ4/´`´.´`4bô`ˆ‹
K›Ü[ÛÝ[OOLK´/ˆŠW_JW_JKKš\Ñ]I‰™Kœ™\ÛÛ™YÛÝ[Œ	‰™K›Ü[ÛÝ[OOL	‰šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆØ\LH]Lˆ‹Ú[™[Ž–ÚKšœÞ
ËÜÚ^™NŽKÛ\ÜÓ˜[YNˆ^VÈÌŒÍMQWKÍŒŸJKKšœÞÊœÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ^VÎ\H^VÈÌŒÍMQWKÍŒ›Û[YY][H‹Ú[™[Ž–ÙKœ™\ÛÛ™YÛÝ[ˆ4-ô,4.´`4bô`ˆ‹
Kœ™\ÛÛ™YÛÝ[OOLK´/ˆŠW_JW_JKYKš\Ñ]I‰šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆØ\LH]Lˆ‹Ú[™[Ž–ÚKšœÞ
Ù‹ÜÚ^™NŽKÛ\ÜÓ˜[YNˆ^]Ú]KÌŒŸJKKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ^VÎ\H^]Ú]KÌŒ›Û[YY][H‹Ú[™[Žˆ´%4/´,t,4,´c4`´-H4-4,4/t/tbô-HŸJW_JW_J_Y[˜Ý[Ûˆ×ÙJ
^Ü™]\›ˆKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^›^XÛÛ][\ËXÙ[\ˆ^XÙ[\ˆNKLL‹Ú[™[Ž–ÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆËLŽLŽ›Ý[™YVÌÌœH›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆX‹Mˆ‹Ý[NžØ˜XÚÙÜ›Ý[™ˆ›[™X\‹YÜ˜YY[
MŒYËÌPLQŒÎÌMŒPŒ‘JH‹›ÞÚYÝÎˆŒÌœ™Ø˜JŒ‹Ë‹ŒÌ
HŸKÚ[™[ŽšKšœÞ
Ù‹ÜÚ^™NŒÍÛ\ÜÓ˜[YNˆ^]Ú]KÌÌŸJ_JKKšœÞ
šˆ‹ØÛ\ÜÓ˜[YNˆ^VÌŒH›ÛX›XÚÈ^Y›Ü™YÜ›Ý[™˜XÚÚ[™Ë]YÚX‹LÈXY[™Ë]YÚ‹Ú[™[Žˆ´'ô/´.´,4/t-t`ˆ4-4,4/t/tbôaHŸJKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌMH^[]]YY›Ü™YÜ›Ý[™XY[™Ë\™[^YX^]ËVÌŽH‹Ú[™[Žˆ´%4/´,t,4,´c4`´-H4/ô-t`4,´/´-H4`t/´,tbô`´.4-K4-4-t.ô/ˆ4.4.ô.4,´bô`4`ôaô.´`È4-ô,4-4-t/tc8 %4,t,4.ô.È4/ô/´cô,´.4`´`tcÈ4`t`4,4-ô`È4-´-K4,t-t-È4/´-´.4-4,4/t.4cËˆŸJW_J_Y[˜Ý[ÛˆÙJÙ˜XÝÜœÎ™_J^Ü™]\›ˆK›[™ÝOOLÛ[šKšœÞÊË™]‹Ú[š]X[žÛÜXÚ]NŒK[š[X]NžÛÜXÚ]NŒ_K˜[œÚ][ÛŽžÙ[^N‹_KÛ\ÜÓ˜[YNˆ›]M™XØ\™MHKM‹Ú[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌL\H›ÛX›Û\\˜Ø\ÙH˜XÚÚ[™Ë]ÚY\Ý^[]]YY›Ü™YÜ›Ý[™X‹LÈ‹Ú[™[Žˆ´)ô`´/ˆ4,´.ô.4cô-t`ˆ4/t,4,t,4.ô.ÈŸJKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^›^XÛÛØ\L‹H‹Ú[™[Ž™K›X\

ŠOOšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\Ë\Ý\Ø\L‹H‹Ú[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH›ÛX›Û]LH›^\Úš[šËL‹Ý[NžØÛÛÜŽœÜÚ]]™OÈˆÌMLÍHŽˆˆÑÌŒˆŸKÚ[™[ŽœÜÚ]]™OÈŠÈŽˆ¸¢$ˆŸJKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH^Y›Ü™YÜ›Ý[™ÎXY[™Ë\ÛYÈ‹Ú[™[Ž^JW_KŠJ_JW_J_XÛÛœÝŽO^ÚY[ŽžÛÜXÚ]NŒNŒMŸKÚÝÎ™OOŠÛÜXÚ]NŒKNŒ˜[œÚ][ÛŽžÙ[^N™J‹ŒË\˜][ÛŽ‹‹X\ÙN–ËŒŒ‹KŒÍ‹W__J_NÙ[˜Ý[Ûˆ™X[]PØ]YÛÜžPØ\™ŒNJÙÛXZ[Ž™KÛ“˜]šYØ]N[™^›ŸJ^ØÛÛœÝYKœÝ]TØÛÜ™HOO[[Ù˜ÊKœÝ]TØÛÜ™JN›[Ü™]\›ˆKšœÞ
Ë™]‹ØÝ\ÝÛN›‹˜\šX[ÎœŽK[š]X[ˆšY[ˆ‹[š[X]NˆœÚÝÈ‹Ú[™[ŽšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™XØ\™MHKMH‹Ý[NžÛÝ™\™›ÝÎˆšY[ˆŸKÚ[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\Ë\Ý\\ÝYžKX™]ÙY[ˆØ\LÈ‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ›Z[‹]ËL‹Ú[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌMœH›ÛX›XÚÈ^Y›Ü™YÜ›Ý[™XY[™Ë]YÚ‹Ý[NžÛÝ™\™›ÝÕÜ˜\ˆ˜[ž]Ú\™HŸKÚ[™[Ž™K›X™[JKKšœÞÊœ‹ØÛ\ÜÓ˜[YNˆ^VÌL\H›Û\Ù[ZX›Û^[]]YY›Ü™YÜ›Ý[™]LH‹Ú[™[Ž–È´&´,4aô-t`t`´,´/ˆ4-4,4/t/tbôaNˆ‹Kœ]X[]T\˜Ù[‰H—_JW_JKKœÝ]TØÛÜ™HOO[[	‰šKšœÞÊœÜ[ˆ‹ØÛ\ÜÓ˜[YNˆœÚš[šËL›Ý[™YY[L‹HKLH^VÌL\H›ÛX›XÚÈ‹Ý[NžØÛÛÜŽœ‹˜ÛÛÜ‹˜XÚÙÜ›Ý[™œ‹˜™ßKÚ[™[Ž–È´(t/´`t`´/´cô/t.4-H‹KœÝ]TØÛÜ™W_JW_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆšLKH›Ý[™YY[™Ë[]]YÝ™\™›ÝËZY[ˆ]LÈ‹Ú[™[ŽšKšœÞ
Ë™]‹Ú[š]X[žÝÚYŒK[š[X]NžÝÚY™Kœ]X[]T\˜Ù[
È‰HŸK˜[œÚ][ÛŽžÙ\˜][ÛŽ‹K[^N‹Œ
›ŸKÛ\ÜÓ˜[YNˆšY[›Ý[™YY[‹Ý[NžØ˜XÚÙÜ›Ý[™™Kœ]X[]T\˜Ù[MÌÈ›[™X\‹YÜ˜YY[
LYËÍPPÑP‹ÍQLÍ
HŽ™Kœ]X[]T\˜Ù[MÈ›[™X\‹YÜ˜YY[
LYËÍPPÑP‹ÑŽŠHŽˆ›[™X\‹YÜ˜YY[
LYËÑ‘ÐŽËÑŽŠHŸ_J_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ›]MÜšYÜšYXÛÛËLHØ\LÈ‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆœ›Ý[™YLž™ËVÈÑ‘ŽH›Ü™\ˆ›Ü™\‹VÈÑŒÑNWHMKLÈ‹Ú[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLH›ÛX›XÚÈ\\˜Ø\ÙH˜XÚÚ[™Ë]ÚY\ˆ^VÈÌMNP—H‹Ú[™[Žˆ´(ôaô`´-t/t/ˆŸJKK˜XØÛÝ[Y›[™ÝÚKšœÞ
[‹ØÛ\ÜÓ˜[YNˆ›]Lˆ›^›^XÛÛØ\LKH‹Ú[™[Ž™K˜XØÛÝ[Y›X\

KÊOOšKšœÞÊ›H‹ØÛ\ÜÓ˜[YNˆ™›^][\Ë\Ý\Ø\Lˆ^VÌLœHXY[™Ë\ÛYÈ^Y›Ü™YÜ›Ý[™‹Ú[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ^VÈÌMLÍWH›ÛX›XÚÈÚš[šËL‹Ú[™[Žˆ¸§$ÈŸJKKšœÞ
œÜ[ˆ‹ÜÝ[NžÛÝ™\™›ÝÕÜ˜\ˆ˜[ž]Ú\™HŸKÚ[™[Ž˜_JW_KÊJ_JNšKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ›]Lˆ^VÌLœH^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Žˆ´'ô/´.´,4/t-t`ˆ4/ô/´-4`´,´-t`4-´-4dt/t/tbôaH4-4,4/t/tbôaKˆŸJW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆœ›Ý[™YLž™ËVÈÑ‘‘ŽŒWH›Ü™\ˆ›Ü™\‹VÈÑÑN—HMKLÈ‹Ú[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLH›ÛX›XÚÈ\\˜Ø\ÙH˜XÚÚ[™Ë]ÚY\ˆ^VÈÐÌLM—H‹Ú[™[Žˆ´'t-H4at,´,4`´,4-t`ˆŸJKK›Z\ÜÚ[™Ë›[™ÝÚKšœÞ
[‹ØÛ\ÜÓ˜[YNˆ›]Lˆ›^›^XÛÛØ\LKH‹Ú[™[Ž™K›Z\ÜÚ[™Ë›X\

KÊOOšKšœÞÊ›H‹ØÛ\ÜÓ˜[YNˆ™›^][\Ë\Ý\Ø\Lˆ^VÌLœHXY[™Ë\ÛYÈ^Y›Ü™YÜ›Ý[™‹Ú[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ^VÈÑPMÐÌNH›ÛX›XÚÈÚš[šËL‹Ú[™[ŽˆˆHŸJKKšœÞ
œÜ[ˆ‹ÜÝ[NžÛÝ™\™›ÝÕÜ˜\ˆ˜[ž]Ú\™HŸKÚ[™[Ž˜_JW_KÊJ_JNšKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ›]Lˆ^VÌLœH^VÈÌMNP—H›Û\Ù[ZX›Û‹Ú[™[Žˆ´'´,tcô-ô,4`´-t.ôc4/tbô-H4-4,4/t/tbô-H4-ô,4/ô/´.ô/t-t/tbËˆŸJW_JW_JKK›Ü[Û˜[›X\

KÊOOšKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ›]LÈ›Ý[™Y^™Ë\š[X\žKÍH›Ü™\ˆ›Ü™\‹\š[X\žKÌLLÈKLˆ^VÌL\HXY[™Ë\ÛYÈ^[]]YY›Ü™YÜ›Ý[™‹Ý[NžÛÝ™\™›ÝÕÜ˜\ˆ˜[ž]Ú\™HŸKÚ[™[Ž˜_KÊJKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ›]MM›Ü™\‹]›Ü™\‹X›Ü™\‹ÍÌ‹Ú[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLH›ÛX›XÚÈ\\˜Ø\ÙH˜XÚÚ[™Ë]ÚY\ˆ^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Žˆ´&´,4.ˆ4ct`´/ˆ4,´.ô.4cô-t`ˆŸJKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ›]LKH^VÌLœHXY[™Ë\™[^Y^Y›Ü™YÜ›Ý[™‹Ý[NžÛÝ™\™›ÝÕÜ˜\ˆ˜[ž]Ú\™HŸKÚ[™[Ž™Kš[\XÝJKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OO
K˜XÝ[Û”]
KÛ\ÜÓ˜[YNˆ›]LÈËY[Z[‹ZLLH›Ý[™Y^™Ë\š[X\žH^\š[X\žKY›Ü™YÜ›Ý[™MKL‹H^VÌLÜH›ÛX›ÛXÝ]™NœØØ[KVËŽNH˜[œÚ][Û‹]˜[œÙ›Ü›H‹Ú[™[Ž™K›Z\ÜÚ[™Ë›[™ÝÙK˜XÝ[Û“X™[ˆ´'´`´.´`4bô`´c4`4,4-ô-4-t.ÈŸJW_JW_J_J_Y[˜Ý[Ûˆ™X[]Z[›Û™T›ÝÕŒÌÍ
Þ›Û™N™KÛ˜\ÚÝ^[™Y›‹Û•ÙÙÛNœ‹Û“˜]šYØ]N˜_J^ØÛÛœÝÏX™X[ZTÝ]\ÕŒÌÌŠKœØÛÜ™KKœÝ]\ÊKX™X[›Û™PXÝ[Û•ŒÌÍ
K
NÜ™]\›ˆKšœÞÊ˜\XÛH‹ØÛ\ÜÓ˜[YNˆ˜™ZX[^›Û™K\›ÝË]ŒÌÍ\ËHŠÜËšÙ^KÚ[™[Ž–ÚKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÓ˜[YNˆ˜™ZX[^›Û™K\›ÝË]ŒÌÌˆ‹ÛÛXÚÎœ‹˜\šXKY^[™YŽ›‹Ú[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™ZX[^›Û™K\Ý]K]ŒÌÌˆ\ËHŠÜËšÙ^KÝ[NžØÛÛÜŽœË˜ÛÛÜ‹˜XÚÙÜ›Ý[™œËœÛÙKÚ[™[Ž™KœØÛÜ™OOO[[È¸ %Ž™KœØÛÜ™_JKKšœÞÊœÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™ZX[^›Û™KXÛÜK]ŒÌÌˆ‹Ú[™[Ž–ÚKšœÞÊœÝ›Û™È‹ØÚ[™[Ž–ÙK›X™[KœÝ]\ÏOOH˜][[Ûˆ‰‰šKšœÞ
™[H‹ØÚ[™[Žˆ´$´/t.4/4,4/t.4-HŸJW_JKKšœÞ
œÛX[‹ØÚ[™[Ž™Kš[\œ™]][ÛŸK™Ø\ÏË–Ì_Ë›X™[JW_JKKšœÞÊœÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™ZX[^›Û™K\ØÛÜ™K]ŒÌÌˆ‹Ú[™[Ž–ÚKšœÞ
œÝ›Û™È‹ÜÝ[NžØÛÛÜŽœË˜ÛÛÜŸKÚ[™[Ž™KœØÛÜ™OOO[[È¸ %Ž™KœØÛÜ™_JKKšœÞ
œÛX[‹ØÚ[™[Žˆ‹ÌLŸJW_JKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ˜™ZX[^›Û™KXÚ]œ›Û‹]ŒÌÌˆŠÊÈˆ\Ë[Ü[ˆŽˆˆŠKÚ^™NŒM‹˜\šXKZY[ˆŽˆLJW_JK‰‰šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™ZX[^›Û™KY^[™Y]ŒÌÍ‹Ú[™[Ž–ÙK™˜XÝÜœÏË›[™ÝÚKšœÞ
[‹ØÚ[™[Ž™K™˜XÝÜœË›X\

K
OOšKšœÞ
›H‹ØÚ[™[Ž_K
J_JNšKšœÞ
œ‹ØÚ[™[Žˆ´%4/´/ô/´.ô/t.4`´-t.ôc4/tbôaH4/ô/´-4`´,´-t`4-´-4dt/t/tbôaH4a4,4.´`´/´`4/´,ˆ4/ô/´.´,4/t-t`‹ˆŸJK	‰šKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OO˜Jœ]
KÚ[™[Ž–Û›X™[KšœÞ
œ‹ÜÚ^™NŒM˜\šXKZY[ˆŽˆLJW_JW_JW_KKšY
_B™[˜Ý[Ûˆ™X[]Z[š[Üš]UŒÌÌŠÜÛ˜\ÚÝ™KXYÛ›ÜÚ\ÎÛ“˜]šYØ]N›ŸJ^ØÛÛœÝX™X[š[Üš]UŒÌÌŠK
NÜ™]\›ˆKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™ZX[Y]Z[\š[Üš]K]ŒÌÌˆŠÊ‹š\Ò\ÜÝYOÈˆ\ËZ\ÜÝYHŽˆˆ\ËXÛX\ˆŠKÚ[™[Ž–ÚKšœÞ
œÛX[‹ØÚ[™[Žœ‹š\Ò\ÜÝYOÈ´$ô.ô,4,´/tbô.H4/ô`4.4/´`4.4`´-t`ˆŽˆ´(t/´`t`´/´cô/t.4-HŸJKKšœÞ
šˆ‹ØÚ[™[Žœ‹]_JKKšœÞ
œ‹ØÚ[™[Žœ‹™^XÝYØÛÜ™HOO[[È´'ô/´-4`´,´-t`4-´-4dt/t/tbô.H4/´-´.4-4,4-t/4bô.H4cta4a4-t.´`ŽˆX[ŠÜ‹™^XÝYØÛÜ™JÈ‹ÌLŽœ‹œ™X\ÛÛŸJK‹˜XÝ[Û‰‰œ‹˜XÝ[ÛˆOO\‹]I‰šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™ZX[\™XÛÛ[Y[™YXXÝ[Û‹]ŒÌÍ‹Ú[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Žˆ´)ô`´/ˆ4`t-4-t.ô,4`´cŸJKKšœÞ
œ‹ØÚ[™[Žœ‹˜XÝ[ÛŸJW_JK‹œ]	‰œ‹œ]OOH‹ÚX[‰‰šKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OO›Š‹œ]
KÚ[™[Ž–Ü‹˜ÝKKšœÞ
œ‹ÜÚ^™NŒMK˜\šXKZY[ˆŽˆLJW_JW_J_B‹Êˆ™X\Ú[™\ÜËZX[]Ø]ÚÙË]ŒÍÎ
‹Â™[˜Ý[Ûˆ×ÙJ
^ØÛÛœÝËWOX

KÜ›Ùš[N˜™X[›Ùš[_OU[Š
KØ™X[ØZ]^\™YÙ]™X[ØZ]^\™YOTË\ÙTÝ]JLJK™X[Ø[“ØYHHX™X[›Ùš[_™X[ØZ]^\™Y™]™RX[Ý]\ÏX™\ÙS]™P\Ú[™\ÜÒX[ŒÌÍJ™X[Ø[“ØY
KÜÛ˜\ÚÝ›‹XYÛ›ÜÚ\ÎœŸOX™\ÙP\Ú[™\ÜÒX[Û˜\ÚÝŒŽ

KØK×OTË\ÙTÝ]J[
NÔË\ÙQY™™XÝ


OOžØÛÛœÝ[Y\]Ú[™ÝËœÙ][Y[Ý]


OOœÙ]™X[ØZ]^\™Y
L
KLÊNÜ™]\›Š
OOÚ[™ÝË˜ÛX\•[Y[Ý]
[Y\Š_K×JNØÛÛœÝ[‹O[Ø™X[]Z[›Û™\ÕŒÌÌŠ
N–×K[Ø™X[ZTÝ]\ÕŒÌÌŠœØÛÜ™KœÝ]\ÊN˜™X[ZTÝ]\ÕŒÌÌŠ[
K[Ø™X[™[™ŒÌÌŠ
N›[O[Ø™X[]™T\š[ÙŒÌÍ

N›[™X[ØY[™ÏH[‰‰˜™]™RX[Ý]\ÈOOH™\œ›Üˆ‰‰ˆX™X[ØZ]^\™YÜ™]\›ˆKšœÞ
ÜÚÝÐ›ÝÛS˜]ŽˆLÚ[™[ŽšKšœÞÊ	KØÛ\ÜÓ˜[YNˆ˜™ZX[Y]Z[]ŒÌÌˆ‹LŽ‹Ú[™[Ž–ÚKšœÞÊšXY\ˆ‹ØÛ\ÜÓ˜[YNˆ˜™ZX[Y]Z[ZXY\‹]ŒÌÌˆ‹Ú[™[Ž–ÚKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OOÚ[™ÝË˜™˜]šYØ]P˜XÚÊ‹ÚÛYHŠK˜\šXK[X™[Žˆ´'t,4-ô,4-‹Ú[™[ŽšKšœÞ
›‹ÜÚ^™NŒNK˜\šXKZY[ˆŽˆLJ_JKKšœÞ
šH‹ØÚ[™[Žˆ´(t/´`t`´/´cô/t.4-H4,t.4-ô/t-t`t,ŸJKKšœÞ
œÜ[ˆ‹È˜\šXKZY[ˆŽˆLJW_JK™X[ØY[™ÏÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™ZX[Y]Z[[ØY[™Ë]ŒÌÌˆ‹˜\šXK[X™[Žˆ\Ú[™\ÜÈX[4-ô,4,ô`4`ô-´,4-t`´`tcÈ‹Ú[™[Ž–ÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™ZX[\ÚÙ[]Û‹]ŒÌÌˆ\›ÈŸJKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™ZX[\ÚÙ[]Û‹]ŒÌÌˆ[œÚYÚŸJKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™ZX[\ÚÙ[]Û‹]ŒÌÌˆ\ÝŸJW_JNˆ[ÚKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™ZX[Y]Z[][˜]˜Z[X›K]ŒÌÌˆ‹Ú[™[Ž–ÚKšœÞ
œÛX[‹ØÚ[™[Žˆ\Ú[™\ÜÈX[ŸJKKšœÞ
šˆ‹ØÚ[™[Žˆ´'´a´-t/t.´,4/ô/´.´,4/t-t-4/´`t`´`ô/ô/t,ŸJKKšœÞ
œ‹ØÚ[™[Žˆ´$4.´`´`ô,4.ôc4/tbô.HÙ\™\ˆÛ˜\ÚÝ4-tbtdH4/t-H4`ta4/´`4/4.4`4/´,´,4/Kˆ4(t`´,4`4/´-H4.ô/´.´,4.ôc4/t/´-H4-ô/t,4aô-t/t.4-H4/t-H4.4`t/ô/´.ôc4-ô`ô-t`´`tcËˆŸJKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OO˜™™Yœ™\Ú]™P\Ú[™\ÜÒX[ŒÌÍJ
KÚ[™[Žˆ´'ô/´,´`´/´`4.4`´cŸJW_JNšKšœÞÊK‘œ˜YÛY[ØÚ[™[Ž–ÚKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™ZX[Y]Z[Z\›Ë]ŒÌÌˆ\ËHŠÙšÙ^KÚ[™[Ž–ÚKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞÊœ‹ØÛ\ÜÓ˜[YNˆ˜™ZX[Y]Z[\ØÛÜ™K]ŒÌÌˆ‹Ú[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Ž›œØÛÜ™OOO[[È¸ %Ž›œØÛÜ™_JKKšœÞ
œÛX[‹ØÚ[™[Žˆ‹ÌLŸJW_JKKšœÞ
šˆ‹ÜÝ[NžØÛÛÜŽ™˜ÛÛÜŸKÚ[™[Ž™›X™[JKKšœÞ
œÝ›Û™È‹ØÛ\ÜÓ˜[YNˆ˜™ZX[Y]Z[[]™KZXY[™K]ŒÌÍ‹Ú[™[Ž›KšXY[™_JKKšœÞ
œ‹ØÚ[™[Ž›Kœ\š[ÙX™[JKK˜ÛÛ\\š\ÛÛ“X™[	‰šKšœÞ
œÛX[‹ØÛ\ÜÓ˜[YNˆ˜™ZX[Y]Z[XÛÛ\\š\ÛÛ‹]ŒÌÍ‹Ú[™[Ž›K˜ÛÛ\\š\ÛÛ“X™[JW_JK‰‰šKšœÞÊœÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ˜™ZÛYKZX[]™[™]ŒÌÌˆ\ËHŠÙ‹Û™KÚ[™[Ž–ÚKšœÞ
œÝ›Û™È‹ØÚ[™[Ž™‹˜[Y_JKKšœÞ
œÛX[‹ØÚ[™[Ž™‹œ\š[ÙJW_JW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™ZX[[Ý™\šY]Ë]ŒÌÌˆ‹Ú[™[Ž–ÚKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™ZX[[]™KXœšYYš[™Ë]ŒÌÍ‹Ú[™[Ž–ÚKšœÞ
œÛX[‹ØÚ[™[Žˆ´)ô`´/ˆ4/ô`4/´.4`tat/´-4.4`ˆ4`t-t.taô,4`HŸJKKšœÞ
šˆ‹ØÚ[™[Ž›KšXY[™_JKK™˜XÝÜœË›[™ÝÚKšœÞ
[‹ØÚ[™[Ž›K™˜XÝÜœËœÛXÙJÊK›X\

ÊOOšKšœÞ
›H‹ØÚ[™[ŽšKÊJ_JNšKšœÞ
œ‹ØÚ[™[Žˆ´'t-t-4/´`t`´,4`´/´aô/t/ˆ4.4`t`´/´`4.4.4-4.ôcÈ4-4.4/t,4/4.4.´.4/t/ˆ4`´-t.´`ôbt-t-H4`t/´`t`´/´cô/t.4-H4/´a´-t/t-t/t/ˆ4/ô/ˆ4-4/´`t`´`ô/ô/tbô/4-4,4/t/tbô/ˆŸJW_JKKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™ZX[Z[\XÝ]ŒÌÌˆ‹Ú[™[Ž–ÚKšœÞ
šˆ‹ØÚ[™[Žˆ´%ô/´/tbÈ\Ú[™\ÜÈX[ŸJKKšœÞ
™]ˆ‹ØÚ[™[ŽK›X\
OšKšœÞ
™X[]Z[›Û™T›ÝÕŒÌÍÞ›Û™NšÛ˜\ÚÝ›^[™Y˜OOOZšYÛ•ÙÙÛNŠ
OOœÊOOOZšYÛ[ššY
KÛ“˜]šYØ]N™_KšY
J_JW_JKKšœÞ
™X[]Z[š[Üš]UŒÌÌ‹ÜÛ˜\ÚÝ›XYÛ›ÜÚ\Îœ‹Û“˜]šYØ]N™_JKKšœÞÊœÙXÝ[Ûˆ‹ØÛ\ÜÓ˜[YNˆ˜™ZX[Y]K\]X[]K]ŒÌÌˆ‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
œÛX[‹ØÚ[™[Žˆ´&´,4aô-t`t`´,´/ˆ4-4,4/t/tbôaHŸJKKšœÞ
œÝ›Û™È‹ØÚ[™[Ž›™]T]X[]OË›X™[Ëœ™\XÙJ´&´,4aô-t`t`´,´/ˆ4-4,4/t/tbôaNˆ‹ˆŠ_´/t-H4/´/ô`4-t-4-t.ô-t/t/ˆŸJW_JKKšœÞ
œ‹ØÚ[™[Ž›™]T]X[]OË™Ø\ÏË›[™ÝÈ´%4.ôcÈ4,t/´.ô-t-H4/ô/´.ô/t/´,ô/ˆ4,4/t,4.ô.4-ô,4/t-H4at,´,4`´,4-t`ŽˆŠÛ™]T]X[]K™Ø\ËœÛXÙJŠKš›Ú[ŠŽÈŠJÈ‹ˆŽˆ´&´`4.4`´.4aô/tbôaH4/ô`4/´,t-t.ô/´,ˆ4-4.ôcÈ4`´-t.´`ôbt-t,ô/ˆ4,4/t,4.ô.4-ô,4/t-H4/´,t/t,4`4`ô-´-t/t/‹ˆŸJKKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OO™J‹Ù]KXÛÛ›ÛŠKÚ[™[Ž–È´'ô`4/´,´-t`4.4`´c4-4,4/t/tbô-H‹KšœÞ
œ‹ÜÚ^™NŒMK˜\šXKZY[ˆŽˆLJW_JW_JKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ˜™ZX[]\]Y]ŒÌÌˆ‹Ú[™[Ž˜™X[\]YŒÌÌŠ™Ù[™\˜]Y]
_JW_JW_JW_J_J_B™[˜Ý[ÛˆŠØÚ[™[Ž™KY[™ÎHLÝ™\˜X›N›HLKÛÛXÚÎœ‹Û\ÜÓ˜[YN˜KXY\ŽœË›ÛÝ\Ž›J^Ü™]\›ˆKšœÞÊ™]ˆ‹ÛÛÛXÚÎ›ÜŽ›ÚYÛ\ÜÓ˜[YN–
˜™XØ\™Ý™\™›ÝËZY[ˆ‹‰‰ˆ˜Ý\œÛÜ‹\Ú[\ˆÝ™\ŽœÚYÝËVÝ˜\ŠK\ÚYÝËY[]˜]Y
WHÝ™\Ž‹]˜[œÛ]K^KLH˜[œÚ][Û‹X[\˜][Û‹LŒ‹JKÚ[™[Ž–ÜÉ‰šKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆœMHMH‹M›Ü™\‹Xˆ›Ü™\‹X›Ü™\ˆ‹Ú[™[ŽœßJKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YN–
	‰ˆœMHŠKÚ[™[Ž™_JK	‰šKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆœMH‹MHM›Ü™\‹]›Ü™\‹X›Ü™\ˆ™Ë[]]YÌÌ›Ý[™YX‹VÌŒH‹Ú[™[Ž›JW_J_Y[˜Ý[ÛˆŠÛX™[™K˜\šX[H›™]]˜[‹Ý›HLKÚ^™NœH›Y‹Û\ÜÓ˜[YN˜_J^ØÛÛœÝÏ^Üš[X\žNˆ˜™Ë\š[X\žKÌL^\š[X\žH‹ÝXØÙ\ÜÎˆ˜™ËVÈÌŒÍMQWKÌL^VÈÌMLÍWH‹Ø\›š[™Îˆ˜™ËVÈÑNQL—KÌL^VÈÐLÌWH‹[™Ù\Žˆ˜™ËY\ÝXÝ]™KÌL^Y\ÝXÝ]™H‹™]]˜[ˆ˜™Ë[]]Y^[]]YY›Ü™YÜ›Ý[™‹[™›Îˆ˜™ËVÈÌÐŽ‘—KÌL^VÈÌQQHŸK^Üš[X\žNˆ˜™Ë\š[X\žH‹ÝXØÙ\ÜÎˆ˜™ËVÈÌŒÍMQWH‹Ø\›š[™Îˆ˜™ËVÈÑNQL—H‹[™Ù\Žˆ˜™ËY\ÝXÝ]™H‹™]]˜[ˆ˜™Ë[]]YY›Ü™YÜ›Ý[™‹[™›Îˆ˜™ËVÈÌÐŽ‘—HŸKO^ÜÛNˆ^VÌL\HL‹HKLH‹Yˆ^VÌLœHLÈKLHŸNÜ™]\›ˆKšœÞÊœÜ[ˆ‹ØÛ\ÜÓ˜[YN–
š[›[™KY›^][\ËXÙ[\ˆ›Ý[™YY[›Û[YY][H˜XÚÚ[™Ë]ÚYH\\˜Ø\ÙH‹ÖÝKVÜ—KJKÚ[™[Ž–Û‰‰šKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YN–
ËLKHLKH›Ý[™YY[\‹LKH‹ÝJ_JKW_J_Y[˜Ý[ÛˆWÙJJ^ØÛÛœÝTË\ÙT™YŠÝ˜[YN™K™]š[Ý\Î™_JNÜ™]\›ˆË\ÙSY[[Ê

OOŠ˜Ý\œ™[˜[YHOOYI‰Š˜Ý\œ™[œ™]š[Ý\Ï]˜Ý\œ™[˜[YK˜Ý\œ™[˜[YOYJK˜Ý\œ™[œ™]š[Ý\ÊKÙWJ_]˜\ˆ^OH”ÝÚ]Ú‹ÙÙWOUÊ^JKÙ—ÙKW×OYÙJ^JNÙ[˜Ý[ÛˆÙJJ^ØÛÛœÝ××ÜØÛÜTÝÚ]ÚÚXÚÙY›‹Ú[™[Žœ‹Y˜][ÚXÚÙY˜K\ØX›YœË›Ü›N›˜[YNKÛÚXÚÙYÚ[™ÙN™™\]Z\™Y™‹˜[YN›OH›Ûˆ‹[\›˜[Ù×Û›ÝÝ\ÙWÜ™[™\ŽšOYKÙËWOTÐJÜ›Ü›‹Y˜][›Ü˜OÏÈLKÛÚ[™ÙN™Ø[\Ž“^_JKÚ‹—OTË\ÙTÝ]J[
KØ‹—OTË\ÙTÝ]J[
KOTË\ÙT™YŠLJKÏZÈH[HZ‹˜ÛÜÙ\Ý
™›Ü›HŠNˆL^ØÚXÚÙY™ËÙ]ÚXÚÙYžK\ØX›YœËÛÛ›Ûš‹Ù]ÛÛ›Û‹˜[YNK›Ü›N›˜[YN›K\ÐÛÛœÝ[Y\”ÝÜY›ÜYØ][Û”™YŽ‘K™\]Z\™Y™‹Y˜][ÚXÚÙY˜K\Ñ›Ü›PÛÛ›Û—ËX˜›R[œ]˜‹Ù]X˜›R[œ]“ŸNÜ™]\›ˆKšœÞ
—ÙKÜØÛÜN‹‹•Ú[™[ŽšÙJ
OÚ

NœŸJ_]˜\ˆ•H”ÝÚ]ÚšYÙÙ\ˆ‹•TË™›ÜØ\™™YŠ
××ÜØÛÜTÝÚ]Ú™KÛÛXÚÎ‹‹›ŸKŠOOžØÛÛœÝÝ˜[YN˜K\ØX›YœËÚXÚÙY›™\]Z\™YKÙ]ÛÛ›Û™Ù]ÚXÚÙY™‹\ÐÛÛœÝ[Y\”ÝÜY›ÜYØ][Û”™YŽ›K\Ñ›Ü›PÛÛ›ÛšX˜›R[œ]™ßOTWÊ•‹JKOX[Š‹
NÜ™]\›ˆKšœÞ
˜]Û‹Ý\Nˆ˜]Ûˆ‹›ÛNˆœÝÚ]Ú‹˜\šXKXÚXÚÙYŽ›˜\šXK\™\]Z\™YŽK™]K\Ý]HŽ˜R

K™]KY\ØX›YŽœÏÈˆŽ›ÚY\ØX›YœË˜[YN˜K‹‹›‹™YŽžKÛÛXÚÎ—Ý
OžÙŠOˆ]ŠKÉ‰š	‰ŠK˜Ý\œ™[Z‹š\Ô›ÜYØ][Û”ÝÜY

KK˜Ý\œ™[‹œÝÜ›ÜYØ][ÛŠ
J_J_J_JNÒ•‹™\Ü^S˜[YOV•ŽÝ˜\ˆ—ÏTË™›ÜØ\™™YŠ
K
OOžØÛÛœÝ××ÜØÛÜTÝÚ]Ú›‹˜[YNœ‹ÚXÚÙY˜KY˜][ÚXÚÙYœË™\]Z\™Y›\ØX›YK˜[YN™ÛÚXÚÙYÚ[™ÙN™‹›Ü›N›K‹‹šOYNÜ™]\›ˆKšœÞ
ÙK××ÜØÛÜTÝÚ]Ú›‹ÚXÚÙY˜KY˜][ÚXÚÙYœË\ØX›YK™\]Z\™Y›ÛÚXÚÙYÚ[™ÙN™‹˜[YNœ‹›Ü›N›K˜[YN™[\›˜[Ù×Û›ÝÝ\ÙWÜ™[™\ŽŠÚ\Ñ›Ü›PÛÛ›Û™ßJOOšKšœÞÊK‘œ˜YÛY[ØÚ[™[Ž–ÚKšœÞ
•‹Ë‹‹š™YŽ×ÜØÛÜTÝÚ]Ú›ŸJKÉ‰šKšœÞ
’××ÜØÛÜTÝÚ]Ú›ŸJW_J_J_JNÖ—Ë™\Ü^S˜[YOS^NÝ˜\ˆRH”ÝÚ]Ú[Xˆ‹TË™›ÜØ\™™YŠ
K
OOžØÛÛœÝ××ÜØÛÜTÝÚ]Ú›‹‹‹œŸOYKOTWÊRŠNÜ™]\›ˆKšœÞ
œÜ[‹È™]K\Ý]HŽ˜R
K˜ÚXÚÙY
K™]KY\ØX›YŽ˜K™\ØX›YÈˆŽ›ÚY‹‹œ‹™YŽJ_JNÝ™\Ü^S˜[YOYRÝ˜\ˆ’H”ÝÚ]ÚX˜›R[œ]‹’TË™›ÜØ\™™YŠ
××ÜØÛÜTÝÚ]Ú™K‹‹KŠOOžØÛÛœÝØÛÛ›Ûœ‹\ÐÛÛœÝ[Y\”ÝÜY›ÜYØ][Û”™YŽ˜KÚXÚÙYœËY˜][ÚXÚÙY›™\]Z\™YK\ØX›Y™˜[YN™‹˜[YN›K›Ü›NšX˜›R[œ]™ËÙ]X˜›R[œ]ž_OTWÊ’JKX[Š‹JK]WÙJÊKI	
ŠNÔË\ÙQY™™XÝ


OOžØÛÛœÝOYÎÚYŠQJ\™]\›ŽØÛÛœÝÏ]Ú[™ÝË’S[œ][[Y[œ›ÝÝ\KOSØš™XÝ™Ù]ÝÛ”›Ü\Q\ØÜš\ÜŠË˜ÚXÚÙYŠKœÙ]ÏHXK˜Ý\œ™[ÚYŠˆOO\É‰J^ØÛÛœÝÏ[™]È]™[
˜ÛXÚÈ‹ØX˜›\ÎšßJNÐK˜Ø[
KÊKK™\Ü]Ú]™[
Ê__KÙË‹ËWJNØÛÛœÝTË\ÙT™YŠÊNÜ™]\›ˆKšœÞ
š[œ]Ý\Nˆ˜ÚXÚØ›Þ‹˜\šXKZY[ˆŽˆLY˜][ÚXÚÙY›ÏÓ‹˜Ý\œ™[™\]Z\™YK\ØX›Y™˜[YN™‹˜[YN›K›Ü›Nš‹‹X’[™^‹LK™YŽš‹Ý[NžË‹‹œÝ[K‹‹˜‹ÜÚ][ÛŽˆ˜XœÛÛ]H‹Ú[\‘]™[Îˆ››Û™H‹ÜXÚ]NŒX\™Ú[ŽŒ˜[œÙ›Ü›Nˆ˜[œÛ]V
LL	JHŸ_J_JNÜ’™\Ü^S˜[YO[’Ù[˜Ý[ÛˆÙJJ^Ü™]\›ˆ\[ÙˆOOH™[˜Ý[ÛˆŸY[˜Ý[ÛˆR
J^Ü™]\›ˆOÈ˜ÚXÚÙYŽˆ[˜ÚXÚÙYŸXÛÛœÝRTË™›ÜØ\™™YŠ
ØÛ\ÜÓ˜[YN™K‹‹KŠOOšKšœÞ
—ËØÛ\ÜÓ˜[YN–
œY\ˆ[›[™KY›^MHËNHÚš[šËLÝ\œÛÜ‹\Ú[\ˆ][\ËXÙ[\ˆ›Ý[™YY[›Ü™\‹Lˆ›Ü™\‹]˜[œÜ\™[ÚYÝË\ÛH˜[œÚ][Û‹XÛÛÜœÈ›ØÝ\Ë]š\ÚX›N›Ý][™K[›Û™H›ØÝ\Ë]š\ÚX›Nœš[™ËLˆ›ØÝ\Ë]š\ÚX›Nœš[™Ë\š[™È›ØÝ\Ë]š\ÚX›Nœš[™Ë[Ù™œÙ]Lˆ›ØÝ\Ë]š\ÚX›Nœš[™Ë[Ù™œÙ]X˜XÚÙÜ›Ý[™\ØX›Y˜Ý\œÛÜ‹[›ÝX[ÝÙY\ØX›Y›ÜXÚ]KML]KVÜÝ]OXÚXÚÙYN˜™Ë\š[X\žH]KVÜÝ]O][˜ÚXÚÙYN˜™ËZ[œ]‹JK‹‹™YŽ›‹Ú[™[ŽšKšœÞ
ØÛ\ÜÓ˜[YN–
œÚ[\‹Y]™[Ë[›Û™H›ØÚÈMËM›Ý[™YY[™ËX˜XÚÙÜ›Ý[™ÚYÝË[Èš[™ËL˜[œÚ][Û‹]˜[œÙ›Ü›H]KVÜÝ]OXÚXÚÙYN˜[œÛ]K^M]KVÜÝ]O][˜ÚXÚÙYN˜[œÛ]K^LŠ_J_JJNÚR™\Ü^S˜[YOV—Ë™\Ü^S˜[YNØÛÛœÝ›ÏH‹Ø\KÜ™]šY]ÜËÜÛÝ\˜Ù\ÈŽÙ[˜Ý[Ûˆ›Ê
^ØÛÛœÝOSÝ

NÜ™]\›ˆOØØJJNžß_X\Þ[˜È[˜Ý[ÛˆWÙJ
^Ýž^ØÛÛœÝX]ØZ]
]ØZ]™]Ú
›ËÚXY\œÎž›Ê
_JJKšœÛÛŠ
NÜ™]\›ˆœÝXØÙ\ÜÏÝ™]N›[XØ]ÚÜ™]\›ˆ[_X\Þ[˜È[˜Ý[ÛˆÙJ
^Ýž^ØÛÛœÝX]ØZ]
]ØZ]™]Ú
	Ð›ßKÙÛÛÙÛKØÛÛ›™XÝÚXY\œÎž›Ê
_JJKšœÛÛŠ
NÜ™]\›ˆœÝXØÙ\ÜÏÞÝ\›™]K\›NžÙ\œ›ÜŽ™\œ›ÜÏÈ´'t-H4`ô-4,4.ô/´`tc4/t,4aô,4`´c4/ô/´-4.´.ôc´aô-t/t.4-HŸ_XØ]ÚÜ™]\›ˆ[_X\Þ[˜È[˜Ý[Ûˆ×ÙJJ^Ýž^ØÛÛœÝX]ØZ]
]ØZ]™]Ú
	Ð›ßKÙÛÛÙÛKÛ[šË]\›ÛY]Ùˆ”ÔÕ‹XY\œÎžÈÛÛ[U\HŽˆ˜\XØ][Û‹ÚœÛÛˆ‹‹‹ž›Ê
_K›ÙN’”ÓÓ‹œÝš[™ÚYžJÝ\›™_J_JJKšœÛÛŠ
NÜ™]\›ˆ‹œÝXØÙ\ÜÏÛ‹™]NžÛ[šÙYˆLK\œ›ÜŽ›‹™\œ›ÜÏÈ´'t-H4`ô-4,4.ô/´`tc4`t/´at`4,4/t.4`´c4`t`tbô.ô.´`ÈŸ_XØ]ÚÜ™]\›ˆ[_X\Þ[˜È[˜Ý[ÛˆWÙJJ^Ýž^Ü™]\›ˆHJ]ØZ]
]ØZ]™]Ú
	Ð›ßKÙÛÛÙÛKØ]]Ë\Þ[˜ØÛY]Ùˆ”ÔÕ‹XY\œÎžÈÛÛ[U\HŽˆ˜\XØ][Û‹ÚœÛÛˆ‹‹‹ž›Ê
_K›ÙN’”ÓÓ‹œÝš[™ÚYžJÙ[˜X›Y™_J_JJKšœÛÛŠ
JKœÝXØÙ\ÜßXØ]ÚÜ™]\›ˆL__X\Þ[˜È[˜Ý[Ûˆ—ÙJJ^Ýž^Ü™]\›ˆHJ]ØZ]
]ØZ]™]Ú
	Ð›ßKÙÛÛÙÛKÜÙ[XÝ[ØØ][Û˜ÛY]Ùˆ”ÔÕ‹XY\œÎžÈÛÛ[U\HŽˆ˜\XØ][Û‹ÚœÛÛˆ‹‹‹ž›Ê
_K›ÙN’”ÓÓ‹œÝš[™ÚYžJÛØØ][Û’Y™_J_JJKšœÛÛŠ
JKœÝXØÙ\ÜßXØ]ÚÜ™]\›ˆL__X\Þ[˜È[˜Ý[Ûˆ—ÙJ
^Ýž^ØÛÛœÝX]ØZ]
]ØZ]™]Ú
	Ð›ßKÙÛÛÙÛKÜÞ[˜ØÛY]Ùˆ”ÔÕ‹XY\œÎž›Ê
_JJKšœÛÛŠ
NÜ™]\›ˆœÝXØÙ\ÜÏÝ™]N›[XØ]ÚÜ™]\›ˆ[_X\Þ[˜È[˜Ý[Ûˆ—ÙJ
^Ýž^Ü™]\›ˆHJ]ØZ]
]ØZ]™]Ú
	Ð›ßKÙÛÛÙÛKÙ\ØÛÛ›™XÝÛY]Ùˆ”ÔÕ‹XY\œÎž›Ê
_JJKšœÛÛŠ
JKœÝXØÙ\ÜßXØ]ÚÜ™]\›ˆL__X\Þ[˜È[˜Ý[Ûˆ×ÙJK
^Ýž^ØÛÛœÝX]ØZ]™]Ú
‹Ø\KÜ™]šY]ÜËØ[˜[^™H‹ÛY]Ùˆ”ÔÕ‹XY\œÎžÈÛÛ[U\HŽˆ˜\XØ][Û‹ÚœÛÛˆŸK›ÙN’”ÓÓ‹œÝš[™ÚYžJÜ™]šY]ÜÎ™K›X\
OOŠÚY˜KšY^˜K^˜][™Î˜Kœ˜][™ËÛÝ\˜ÙN˜KœÛÝ\˜Ù_JJK›Ùš[NJ_JNÚYŠ[‹›ÚÊ\™]\›ˆ[ØÛÛœÝX]ØZ]‹šœÛÛŠ
NÜ™]\›ˆ‹œÝXØÙ\ÜÏÜ‹™]Kœ™\Ý[Î›[XØ]ÚÜ™]\›ˆ[_Y[˜Ý[ÛˆÒ
J^Ü™]\›žÝÝ[™]šY]ÜÎ™KÝ[™]šY]ÜË]™Ô˜][™Î™K˜]™Ô˜][™ËÙ[[Y[™KœÙ[[Y[ÜÛÛ\Z[Î™KÜÛÛ\Z[Ë›X\
OŠÛX™[›X™[ÛÝ[˜ÛÝ[JJKÜÛÛ\[Y[Î™KÜÛÛ\[Y[Ë›X\
OŠÛX™[›X™[ÛÝ[˜ÛÝ[JJK™[™žÜ˜][™Ñ[T\˜Ù[™K™[™œ˜][™Ñ[T\˜Ù[™YØ]]™TÚ\™Q[TÚ[Î™K™[™›™YØ]]™TÚ\™Q[TÚ[ËÝ\œ™[]™Ô˜][™Î™K™[™˜Ý\œ™[]™Ô˜][™Ë™]š[Ý\Ð]™Ô˜][™Î™K™[™œ™]š[Ý\Ð]™Ô˜][™ß__X\Þ[˜È[˜Ý[Ûˆ×ÙJK‹Š^Ýž^ØÛÛœÝOX]ØZ]™]Ú
‹Ø\KÜ™]šY]ÜËÙØÝÜ‹\Ý[[X\žH‹ÛY]Ùˆ”ÔÕ‹XY\œÎžÈÛÛ[U\HŽˆ˜\XØ][Û‹ÚœÛÛˆŸK›ÙN’”ÓÓ‹œÝš[™ÚYžJÜ›Ùš[Nœ‹[œÚYÚÎœÒ
JKÜXÜÎ›X\
OŠÛX™[››X™[Y[[ÛÛÝ[››Y[[ÛÛÝ[]™Ô˜][™Î›˜]™Ô˜][™Ë[ÛY[[N››[ÛY[[KY[[Û•™[™››Y[[Û•™[™JJKÝY™“Y[[ÛœÎ›‹›X\
OŠÛ˜[YN››˜[YK™YØ]]™PÛÝ[››™YØ]]™PÛÝ[ÜÚ]]™PÛÝ[›œÜÚ]]™PÛÝ[Ý[ÛÝ[›Ý[ÛÝ[JJ_J_JNÚYŠXK›ÚÊ\™]\›ˆ[ØÛÛœÝÏX]ØZ]KšœÛÛŠ
NÜ™]\›ˆËœÝXØÙ\ÜÏÜË™]N›[XØ]ÚÜ™]\›ˆ[_X\Þ[˜È[˜Ý[ÛˆNJK
^Ýž^ØÛÛœÝX]ØZ]™]Ú
‹Ø\KÜ™]šY]ÜËÜ™\H‹ÛY]Ùˆ”ÔÕ‹XY\œÎžÈÛÛ[U\HŽˆ˜\XØ][Û‹ÚœÛÛˆŸK›ÙN’”ÓÓ‹œÝš[™ÚYžJÜ›Ùš[N™]šY]ÎžÝ^™K^˜][™Î™Kœ˜][™ËÙ[[Y[™KœÙ[[Y[ÜXÜÎ™KÜXÜË]]Ü“˜[YN™K˜]]Ü“˜[YKÛÝ\˜ÙN™KœÛÝ\˜Ù__J_JNÚYŠ[‹›ÚÊ\™]\›ˆ[ØÛÛœÝX]ØZ]‹šœÛÛŠ
NÜ™]\›ˆ‹œÝXØÙ\ÜÉ‰\[Ùˆ‹™]OË™˜YOHœÝš[™ÈÜ‹™]K™˜Y›[XØ]ÚÜ™]\›ˆ[_X\Þ[˜È[˜Ý[Ûˆ—ÙJKŠ^Ýž^ØÛÛœÝX]ØZ]™]Ú
‹Ø\KÜ™]šY]ÜËØÛÜœ™[]H‹ÛY]Ùˆ”ÔÕ‹XY\œÎžÈÛÛ[U\HŽˆ˜\XØ][Û‹ÚœÛÛˆŸK›ÙN’”ÓÓ‹œÝš[™ÚYžJÜ›Ùš[N›‹[œÚYÚÎœÒ
JKÜ\˜][ÛœÎJ_JNÚYŠ\‹›ÚÊ\™]\›ˆ[ØÛÛœÝOX]ØZ]‹šœÛÛŠ
NÜ™]\›ˆKœÝXØÙ\ÜÏØK™]N›[XØ]ÚÜ™]\›ˆ[_Y[˜Ý[Ûˆ—ÊJ^ÚYŠYJ\™]\›ˆ´-tbtdH4/t-H4`t.4/tat`4/´/t.4-ô.4`4/´,´,4/t/ˆŽØÛÛœÝQ]K››ÝÊ
K[™]È]JJK™Ù][YJ
KSX]œ›Ý[™
Í™M
NÚYŠJ\™]\›ˆ´`´/´.ôc4.´/ˆ4aô`´/ˆŽÚYŠŒ
\™]\›˜	ÛŸH4/4.4/Kˆ4/t,4-ô,4-ØÛÛœÝSX]œ›Ý[™
‹ÍŒ
NÜ™]\›ˆØ	ÜŸH4aËˆ4/t,4-ô,4-˜	ÓX]œ›Ý[™
‹Ì
_H4-4/Kˆ4/t,4-ô,4-Y[˜Ý[ÛˆWÙJÛÜ[Ž™KÛÛÜÙNØØ][ÛœÎ›‹Û”XÚÎœ‹XÚÚ[™Î˜_J^Ü™]\›ˆKšœÞ
ÜËÛÜ[Ž™KÛÛÜÙN]Nˆ´$´bô,t-t`4.4`´-H4-ô,4,´-t-4-t/t.4-HÛÛÙÛH‹Ú[™[ŽšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^›^XÛÛØ\Lˆ‹M‹Ú[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH^[]]YY›Ü™YÜ›Ý[™X‹LH‹Ú[™[Žˆ´&ˆ4,´,4b4-t/4`È4,4.´.´,4`ô/t`´`ÈÛÛÙÛH4/ô`4.4,´cô-ô,4/t/ˆ4/t-t`t.´/´.ôc4.´/ˆ4-ô,4,´-t-4-t/t.4.H8 %4,´bô,t-t`4.4`´-H4`´/‹4/´`´-ôbô,´bÈ4.´/´`´/´`4/´,ô/ˆ4/t`ô-´/t/ˆ4`t.4/tat`4/´/t.4-ô.4`4/´,´,4`´cˆŸJK‹›X\
ÏOšKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹\ØX›Y˜KÛÛXÚÎŠ
OOœŠËšY
KÛ\ÜÓ˜[YNˆËY[^[YMKLÈ›Ý[™Y^›Ü™\ˆ›Ü™\‹X›Ü™\ˆ™ËXØ\™^VÌMH›Û\Ù[ZX›Û^Y›Ü™YÜ›Ý[™\ØX›Y›ÜXÚ]KML‹Ú[™[ŽœË›˜[Y_KËšY
JW_J_J_Y[˜Ý[Ûˆ×ÙJÛÜ[Ž™KÛÛÜÙNÛ“[šÙY›ŸJ^ØÛÛœÝÝØ\ÝœŸO\ÛŠ
KØK×OTË\ÙTÝ]JˆŠKÛWOTË\ÙTÝ]JLJKÙ—OTË\ÙTÝ]J[
NØ\Þ[˜È[˜Ý[ÛˆJ
^ÚYŠXKš[J
J^ÙŠ´$´`t`´,4,´c4`´-H4`t`tbô.ô.´`È4/t,4-ô,4,´-t-4-t/t.4-H4,ˆÛÛÙÛH4&´,4`4`´,4aKˆŠNÜ™]\›Ÿ]JL
KŠ[
NØÛÛœÝX]ØZ]×ÙJKš[J
JNÚYŠJLJKZ
^ÙŠ´'t-H4`ô-4,4.ô/´`tc4`t/´at`4,4/t.4`´c4`t`tbô.ô.´`Ëˆ4'ô`4/´,´-t`4c4`´-H4/ô/´-4.´.ôc´aô-t/t.4-H4.ˆ4.4/t`´-t`4/t-t`´`ËˆŠNÜ™]\›ŸZYŠZ›[šÙY
^ÙŠ™\œ›ÜÏÈ´'t-H4`ô-4,4.ô/´`tc4`4,4`t/ô/´-ô/t,4`´c4-ô,4,´-t-4-t/t.4-H4/ô/ˆ4ct`´/´.H4`t`tbô.ô.´-KˆŠNÜ™]\›Ÿ\ŠÝ˜\šX[ˆœÝXØÙ\ÜÈ‹]Nˆ´(t`tbô.ô.´,4`t/´at`4,4/t-t/t,‹\ØÜš\[ÛŽš›˜[YOÏÝ›ÚYJKÊˆŠKŠ›˜[YOÏÛ[
K

_\™]\›ˆKšœÞ
ÜËÛÜ[Ž™KÛÛÜÙN]Nˆ´'ô/´-4.´.ôc´aô.4`´cÛÛÙÛH4/ô/ˆ4`t`tbô.ô.´-H‹Ú[™[ŽšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^›^XÛÛØ\LÈ‹M‹Ú[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Žˆ´'´`´.´`4/´.t`´-H4`t`´`4,4/t.4a´`È4,´,4b4-t,ô/ˆ4-ô,4,´-t-4-t/t.4cÈ4,ˆÛÛÙÛH4&´,4`4`´,4aH
4.4.ô.ÛÛÙÛH\Ú[™\ÜÈ›Ùš[JK4/t,4-´/4.4`´-H0ªô'ô/´-4-t.ô.4`´c4`tcð®È4.4,´`t`´,4,´c4`´-H4`t`tbô.ô.´`È4`tc´-4,ˆŸJKKšœÞ
™KÝ˜[YN˜KÛÚ[™ÙNšOœÊ\™Ù]˜[YJKXÙZÛ\ŽˆšÎ‹ËÛX\Ë˜\™ÛÛË™ÛË‹‹ˆ‹YXÛÛŽšKšœÞ
	ÜÚ^™NŒM_J_JK	‰šKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLœH^Y\ÝXÝ]™H‹Ú[™[Ž™JKKšœÞ
ÙKÛØY[™Î›ÛÛXÚÎ›KÚ[™[Žˆ´(t/´at`4,4/t.4`´cŸJW_J_J_Y[˜Ý[Ûˆ×ÙJÛÜ[Ž™KÛÛÜÙN\ÝÜžN›ŸJ^ØÛÛœÝ^Ý\›Û[šÙYˆ´'ô`4.4,´cô-ô.´,4/ô/ˆ4`t`tbô.ô.´-H‹Ø]]ØÛÛ›™XÝYˆ´'ô/´-4.´.ôc´aô-t/t.4-HÛÛÙÛH‹Þ[˜×ØÛÛ\]Yˆ´(t.4/tat`4/´/t.4-ô,4a´.4cÈ‹Þ[˜×Ù˜Z[Yˆ´'´b4.4,t.´,4`t.4/tat`4/´/t.4-ô,4a´.4.‹]]×ÜÞ[˜×ÝÙÙÛYˆ´$4,´`´/´`t.4/tat`4/´/t.4-ô,4a´.4cÈ‹\ØÛÛ›™XÝYˆ´'´`´.´.ôc´aô-t/t.4-HŸNÜ™]\›ˆKšœÞ
ÜËÛÜ[Ž™KÛÛÜÙN]Nˆ´&4`t`´/´`4.4cÈ4.4/4/ô/´`4`´,‹Ú[™[ŽšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^›^XÛÛØ\Lˆ‹M‹Ú[™[Ž–Û‹›[™ÝOOL	‰šKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Žˆ´'ô/´.´,4/t-t`ˆ4`t/´,tbô`´.4.KˆŸJK‹›X\

KÊOOšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^›^XÛÛØ\LHKLˆ›Ü™\‹Xˆ›Ü™\‹X›Ü™\ˆ\Ý˜›Ü™\‹X‹L‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆ\ÝYžKX™]ÙY[ˆØ\Lˆ‹Ú[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH›Û\Ù[ZX›Û^Y›Ü™YÜ›Ý[™‹Ú[™[Žœ–ØK™]™[OÏØK™]™[JKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌL\H^[]]YY›Ü™YÜ›Ý[™Úš[šËL‹Ú[™[Ž’—ÊK˜]
_JW_JKK™]Z[	‰šKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLœH^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Ž˜K™]Z[JW_KÊJW_J_J_Y[˜Ý[ÛˆWÙJÜ›ÝšY\Ž™KÛ”™Yœ™\ÚJ^ØÛÛœÝÝØ\Ý›ŸO\ÛŠ
KÜ‹WOTË\ÙTÝ]JLJKÜËOTË\ÙTÝ]JLJKÝKOTË\ÙTÝ]JLJKÙ‹WOTË\ÙTÝ]JLJKÚ×OTË\ÙTÝ]JLJKÞK—OTË\ÙTÝ]JLJKÝ‹—OTË\ÙTÝ]JLJKÓ‹WOTË\ÙTÝ]JLJKÏYKœÝ]\ÏOOH˜ÛÛ›™XÝY‹YKœÝ]\ÏOOHœ[™[™×ÛØØ][Ûˆ‹OYKœÝ]\ÏOOH\›Û[šÙY‹ÏYKœÝ]\ÏOOH™\œ›Üˆ‹ÏHYK˜Ø[“Ð]]	‰ˆYK˜Ø[“[šÕ\›Ø\Þ[˜È[˜Ý[ÛˆJ
^ØJL
NØÛÛœÝX]ØZ]ÙJ
NÚYŠJLJKPŸ™\œ›Üˆš[ˆŠ^ÛŠÝ˜\šX[ˆ™\œ›Üˆ‹]Nˆ´'t-H4`ô-4,4.ô/´`tc4/ô/´-4.´.ôc´aô.4`´cÛÛÙÛH‹\ØÜš\[ÛŽ‰‰ˆ™\œ›Üˆš[ˆÐ‹™\œ›ÜŽˆ´'ô`4/´,´-t`4c4`´-H4/ô/´-4.´.ôc´aô-t/t.4-H4.ˆ4.4/t`´-t`4/t-t`´`ËˆŸJNÜ™]\›Ÿ]Ú[™ÝË›ØØ][Û‹š™YP‹\›X\Þ[˜È[˜Ý[Ûˆ

^Û
L
NØÛÛœÝX]ØZ]—ÙJ
NÚYŠ
LJKPŠ^ÛŠÝ˜\šX[ˆ™\œ›Üˆ‹]Nˆ´'t-H4`ô-4,4.ô/´`tc4`t.4/tat`4/´/t.4-ô.4`4/´,´,4`´c‹\ØÜš\[ÛŽˆ´'ô/´/ô`4/´,t`ô.t`´-H4-tbtdH4`4,4-È4aô`ô`´c4/ô/´-ô-´-KˆŸJNÜ™]\›ŸZYŠP‹œÞ[˜ÙY
^ÛŠÝ˜\šX[ˆ™Y˜][‹]Nˆ´(t.4/tat`4/´/t.4-ô,4a´.4cÈ4/t-t-4/´`t`´`ô/ô/t,‹\ØÜš\[ÛŽ‹™\œ›ÜŸJNÜ™]\›Ÿ[ŠÝ˜\šX[ˆœÝXØÙ\ÜÈ‹]Nˆ´(t.4/tat`4/´/t.4-ô,4a´.4cÈ4-ô,4,´-t`4b4-t/t,‹\ØÜš\[ÛŽ‹˜YYØ4't/´,´bôaH4/´`´-ôbô,´/´,Žˆ	Ð‹˜YYXˆ´'t/´,´bôaH4/´`´-ôbô,´/´,ˆ4/t-t`‹ˆŸJK

_X\Þ[˜È[˜Ý[ÛˆŠ
^Ù
L
NØÛÛœÝX]ØZ]—ÙJ
NÙ
LJKÊŠÝ˜\šX[ˆœÝXØÙ\ÜÈ‹]Nˆ‘ÛÛÙÛH4/´`´.´.ôc´aôdt/HŸJK

JN›ŠÝ˜\šX[ˆ™\œ›Üˆ‹]Nˆ´'t-H4`ô-4,4.ô/´`tc4/´`´.´.ôc´aô.4`´c4.4`t`´/´aô/t.4.ˆŸJ_X\Þ[˜È[˜Ý[Ûˆ
Š^ÛJL
NØÛÛœÝOX]ØZ]—ÙJŠNÛJLJKOÊŠLJKŠÝ˜\šX[ˆœÝXØÙ\ÜÈ‹]Nˆ‘ÛÛÙÛH4/ô/´-4.´.ôc´aôdt/H‹\ØÜš\[ÛŽˆ´(t.4/tat`4/´/t.4-ô,4a´.4cÈ4-ô,4/ô`ôbt-t/t,ˆŸJK

JN›ŠÝ˜\šX[ˆ™\œ›Üˆ‹]Nˆ´'t-H4`ô-4,4.ô/´`tc4,´bô,t`4,4`´c4-ô,4,´-t-4-t/t.4-HŸJ_X\Þ[˜È[˜Ý[ÛˆJŠ^ÙÊL
NØÛÛœÝOX]ØZ]WÙJŠNÙÊLJKOÝ

N›ŠÝ˜\šX[ˆ™\œ›Üˆ‹]Nˆ´'t-H4`ô-4,4.ô/´`tc4.4-ô/4-t/t.4`´c4/t,4`t`´`4/´.t.´`È4,4,´`´/´`t.4/tat`4/´/t.4-ô,4a´.4.ŸJ_\™]\›ˆKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YN–
™›^›^XÛÛØ\LˆKLˆ‹É‰ˆ›ÜXÚ]KMLŠKÚ[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆ\ÝYžKX™]ÙY[ˆØ\LÈ‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆØ\LˆZ[‹]ËL‹Ú[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YN–
ËLˆLˆ›Ý[™YY[Úš[šËL‹ÏÈ˜™ËVÈÌŒÍMQWHŽšÏÈ˜™ËY\ÝXÝ]™HŽOÈ˜™ËX[X™\‹MLŽˆ˜™Ë[]]YY›Ü™YÜ›Ý[™ÍŠ_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ›Z[‹]ËL‹Ú[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌMH›Û\Ù[ZX›Û^Y›Ü™YÜ›Ý[™‹Ú[™[Ž™K›X™[JKÉ‰šKšœÞÊœ‹ØÛ\ÜÓ˜[YNˆ^VÌLœH^[]]YY›Ü™YÜ›Ý[™[˜Ø]H‹Ú[™[Ž–ÙK›ØØ][Û“˜[YKˆ0­È4`t.4/tat`4/´/t.4-ô.4`4/´,´,4/t/ˆ‹—ÊK›\ÝÞ[˜ÙY]
W_JK	‰šKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLœH^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Žˆ´$´bô,t-t`4.4`´-H4-ô,4,´-t-4-t/t.4-HŸJKI‰šKšœÞÊœ‹ØÛ\ÜÓ˜[YNˆ^VÌLœH^[]]YY›Ü™YÜ›Ý[™[˜Ø]H‹Ú[™[Ž–È´(t`tbô.ô.´,4`t/´at`4,4/t-t/t,‹K›ØØ][Û“˜[YOØ0­È	ÙK›ØØ][Û“˜[Y_Xˆˆ—_JKÉ‰šKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLœH^Y\ÝXÝ]™H[˜Ø]H‹Ú[™[Ž™K›\ÝÞ[˜Ñ\œ›ÜŸ´'´b4.4,t.´,4/ô/´-4.´.ôc´aô-t/t.4cÈŸJKWÉ‰ˆU	‰ˆPI‰ˆZÉ‰ˆSÉ‰šKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLœH^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Žˆ‘ÛÛÙÛH4,4.´.´,4`ô/t`ˆ4/ô/´.´,4/t-H4/ô/´-4.´.ôc´aôdt/HŸJKÉ‰šKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLœH^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Žˆ´(t.´/´`4/ˆŸJW_JW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆØ\LKHÚš[šËL‹Ú[™[Ž–ÊßJI‰šKšœÞ
˜]Ûˆ‹ÛÛÛXÚÎŠ
OO‘JL
KÛ\ÜÓ˜[YNˆËNN›Ý[™YY[™Ë[]]Y›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆ‹]Nˆ´&4`t`´/´`4.4cÈ4.4/4/ô/´`4`´,‹Ú[™[ŽšKšœÞ
IÜÚ^™NŒMJ_JKÉ‰šKšœÞ
˜]Ûˆ‹ÛÛÛXÚÎ‘\ØX›YœËÛ\ÜÓ˜[YNˆËNN›Ý[™YY[™Ë[]]Y›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆ‹]Nˆ´(t.4/tat`4/´/t.4-ô.4`4/´,´,4`´c‹Ú[™[ŽœÏÚKšœÞ
[ËÜÚ^™NŒMÛ\ÜÓ˜[YNˆ˜[š[X]K\Ü[ˆŸJNšKšœÞ
	‹ÜÚ^™NŒMJ_JK
ßJI‰šKšœÞ
˜]Ûˆ‹ÛÛÛXÚÎž‹\ØX›YKÛ\ÜÓ˜[YNˆËNN›Ý[™YY[™Ë[]]Y›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆ‹]Nˆ´'´`´.´.ôc´aô.4`´c‹Ú[™[ŽšKšœÞ
‹ÜÚ^™NŒMJ_JK	‰šKšœÞ
ÙKÜÚ^™NˆœÛH‹ÛÛXÚÎŠ
OOšŠL
KÚ[™[Žˆ´$´bô,t`4,4`´cŸJKK˜Ø[“Ð]]	‰ˆWÉ‰ˆU	‰ˆPI‰šKšœÞ
ÙKÜÚ^™NˆœÛH‹˜\šX[šÏÈ›Ý][™HŽˆœÙXÛÛ™\žH‹ØY[™Îœ‹YXÛÛŽšKšœÞ
ÔKÜÚ^™NŒLßJKÛÛXÚÎ“KÚ[™[Žˆ´'ô/´-4.´.ôc´aô.4`´cŸJKK˜Ø[“[šÕ\›	‰ˆWÉ‰ˆU	‰šKšœÞ
ÙKÜÚ^™NˆœÛH‹˜\šX[ˆ›Ý][™H‹YXÛÛŽšKšœÞ
	ÜÚ^™NŒLßJKÛÛXÚÎŠ
OO˜ŠL
KÚ[™[Žˆ´'ô/ˆ4`t`tbô.ô.´-HŸJW_JW_JK
ßJI‰šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆ\ÝYžKX™]ÙY[ˆØ\LÈM‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ›Z[‹]ËL‹Ú[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLœH›Û\Ù[ZX›Û^Y›Ü™YÜ›Ý[™‹Ú[™[Žˆ´$4,´`´/´`t.4/tat`4/´/t.4-ô,4a´.4cÈŸJKWÉ‰šKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌL\H^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Žˆ´(´`4-t,t`ô-t`´`tcÈ4/ô/´-4.´.ôc´aô-t/t.4-H4,4.´.´,4`ô/t`´,ÛÛÙÛH8 %4-4/´`t`´`ô/ô/t,4`´/´.ôc4.´/ˆ4/ô`4.4,´cô-ô.´,4/ô/ˆ4`t`tbô.ô.´-KˆŸJW_JKKšœÞ
RØÚXÚÙY—ÏÈHYK˜]]ÔÞ[˜Ñ[˜X›YˆLK\ØX›YˆWßÛÚXÚÙYÚ[™ÙNœ_JW_JKKšœÞ
WÙKÛÜ[ŽžKÛÛÜÙNŠ
OOšŠLJKØØ][ÛœÎ™Kœ[™[™ÓØØ][ÛœÏÏÖ×KÛ”XÚÎ“XÚÚ[™Î™ŸJKKšœÞ
×ÙKÛÜ[Ž‹ÛÛÜÙNŠ
OO˜ŠLJKÛ“[šÙYŠ
OO

_JKKšœÞ
×ÙKÛÜ[Ž“‹ÛÛÜÙNŠ
OO‘JLJK\ÝÜžN™Kš\ÝÜž_JW_J_Y[˜Ý[ÛˆÙJÜÝ]\Î™KÛ”™Yœ™\ÚJ^ØÛÛœÝYOËœ›ÝšY\œÏÏÖ×NÜ™]\›ˆKšœÞÊ‹ØÚ[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌMH›ÛX›Û^Y›Ü™YÜ›Ý[™X‹LÈ‹Ú[™[Žˆ´&4`t`´/´aô/t.4.´.4/´`´-ôbô,´/´,ˆŸJKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^›^XÛÛ]šYK^H]šYKX›Ü™\ˆ‹Ú[™[Ž›‹›X\
OšKšœÞ
WÙKÜ›ÝšY\Žœ‹Û”™Yœ™\ÚK‹šY
J_JW_J_Y[˜Ý[Ûˆ×ÙJÜ™]šY]Î™_J^ÚYŠK˜ZTÝ]\ÏOOHœ[™[™ÈŸK˜ZTÝ]\ÏOOH˜[˜[^š[™ÈŠ\™]\›ˆKšœÞÊœÜ[ˆ‹ØÛ\ÜÓ˜[YNˆš[›[™KY›^][\ËXÙ[\ˆØ\LH^VÌL\H›Û\Ù[ZX›Û^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Ž–ÚKšœÞ
[ËÜÚ^™NŒLKÛ\ÜÓ˜[YNˆ˜[š[X]K\Ü[ˆŸJKˆ4$4/t,4.ô.4-Ë‹‹ˆ—_JNÚYŠK˜ZTÝ]\ÏOOH™˜Z[YŠ\™]\›ˆKšœÞ
‹ÛX™[ˆ´$4/t,4.ô.4-È4/t-H4`ô-4,4.ô`tcÈ‹˜\šX[ˆ›™]]˜[‹Ú^™NˆœÛHŸJNØÛÛœÝ^ÜÜÚ]]™NžÛX™[ˆ´'ô/´-ô.4`´.4,´/tbô.H‹˜\šX[ˆœÝXØÙ\ÜÈŸK™]]˜[žÛX™[ˆ´'t-t.t`´`4,4.ôc4/tbô.H‹˜\šX[ˆ›™]]˜[ŸK™YØ]]™NžÛX™[ˆ´'t-t,ô,4`´.4,´/tbô.H‹˜\šX[ˆ™[™Ù\ˆŸ_KYKœÙ[[Y[ÝÙKœÙ[[Y[N›[Ü™]\›ˆÚKšœÞ
‹ÛX™[›‹›X™[˜\šX[›‹˜\šX[Ú^™NˆœÛHŸJN›[Y[˜Ý[Ûˆ×ÙJÜ˜][™Î™_J^Ü™]\›ˆOO[[ÚKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ^VÌLœH^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Žˆ´$t-t-È4/´a´-t/t.´.ŸJNšKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆØ\LH‹Ú[™[Ž–ÌK‹ËWK›X\
OšKšœÞ
Y‹ÜÚ^™NŒLËÛ\ÜÓ˜[YNYOÈ™š[VÈÑNQL—H^VÈÑNQL—HŽˆ^X›Ü™\ˆŸK
J_J_Y[˜Ý[ÛˆWÙJÜ™]šY]Î™KÜ[ŽÛÛÜÙN›‹Û”Ø]™Nœ‹›Ùš[N˜_J^ØÛÛœÝÜËOTË\ÙTÝ]JˆŠKÝKOTË\ÙTÝ]JLJKÙ‹WOTË\ÙTÝ]JLJKTË\ÙT™YŠ[
NÔË\ÙQY™™XÝ


OOžÈ]Y_

Kœ™\Q˜YÏÈˆŠKJLJKJKœ™\Q˜Y˜Ý\œ™[OOYKšY
I‰Š˜Ý\œ™[YKšY
L
KNJKJK[ŠOžÙ
LJKÛ
ŠN›JL
_JJJ_KÝOËšYJNÙ[˜Ý[ÛˆÊ
^ÙI‰Š
L
KJLJKNJKJK[ŠOžÙ
LJKÛ
ŠN›JL
_JJ_Y[˜Ý[ÛˆJ
^ÈY_\Ëš[J
_
ŠKšYËš[J
JKŠ
J_\™]\›ˆKšœÞ
ÜËÛÜ[ŽÛÛÜÙN›‹]Nˆ´'´`´,´-t`ˆ4,ô/´`t`´cˆ‹Û˜\Ú[ˆ™[‹Ú[™[ŽšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^›^XÛÛØ\M‹M‹Ú[™[Ž–ÙI‰šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™Ë[]]YÍL›Ý[™Y^LÈ‹Ú[™[Ž–ÚKšœÞÊœ‹ØÛ\ÜÓ˜[YNˆ^VÌLœH^[]]YY›Ü™YÜ›Ý[™X‹LH‹Ú[™[Ž–ÙÍÊKœÛÝ\˜ÙJKˆ0­È‹K™]W_JKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH^Y›Ü™YÜ›Ý[™XY[™Ë\™[^Y[™KXÛ[\M‹Ú[™[Ž™K^JW_JKOÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆØ\LˆKN^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Ž–ÚKšœÞ
[ËÜÚ^™NŒNÛ\ÜÓ˜[YNˆ˜[š[X]K\Ü[ˆŸJKKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH‹Ú[™[ŽˆRH4`t/´`t`´,4,´.ôcô-t`ˆ4aô-t`4/t/´,´.4.ˆ4/´`´,´-t`´,‹‹ˆŸJW_JN™‰‰ˆ\ÏÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ^XÙ[\ˆKN‹Ú[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH^[]]YY›Ü™YÜ›Ý[™X‹LÈ‹Ú[™[Žˆ´'t-H4`ô-4,4.ô/´`tc4`t,ô-t/t-t`4.4`4/´,´,4`´c4/´`´,´-t`‹ˆŸJKKšœÞ
ÙKÝ˜\šX[ˆ›Ý][™H‹Ú^™NˆœÛH‹ÛÛXÚÎ™ËÚ[™[Žˆ´'ô/´/ô`4/´,t/´,´,4`´c4-tbtdH4`4,4-ÈŸJW_JNšKšœÞÊK‘œ˜YÛY[ØÚ[™[Ž–ÚKšœÞ
ÛËÛX™[ˆ´(´-t.´`t`ˆ4/´`´,´-t`´,
4/4/´-´/t/ˆ4/´`´`4-t-4,4.´`´.4`4/´,´,4`´c
H‹˜[YNœËÛÚ[™ÙNšO›
‹\™Ù]˜[YJK›ÝÜÎŸJKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^Ø\Lˆ‹Ú[™[Ž–ÚKšœÞ
ÙKÝ˜\šX[ˆ›Ý][™H‹YXÛÛŽšKšœÞ
	‹ÜÚ^™NŒMJKÛÛXÚÎ™Ë\ØX›YKÚ[™[Žˆ´(t,ô-t/t-t`4.4`4/´,´,4`´c4-ô,4/t/´,´/ˆŸJKKšœÞ
ÙKÙ[ÚYˆL\ØX›Yˆ\Ëš[J
KÛÛXÚÎžKYXÛÛŽšKšœÞ
ËÜÚ^™NŒMŸJKÚ[™[Žˆ´(t/´at`4,4/t.4`´c4aô-t`4/t/´,´.4.ˆŸJW_JKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌL\H^[]]YY›Ü™YÜ›Ý[™^XÙ[\ˆ‹Ú[™[Žˆ´'´`´,´-t`ˆ4`t/´at`4,4/tcô-t`´`tcÈ4.´,4.ˆ4aô-t`4/t/´,´.4.ˆ4.4/t-H4/ô`ô,t.ô.4.´`ô-t`´`tcÈ4,4,´`´/´/4,4`´.4aô-t`t.´.8 %4/´`´/ô`4,4,´c4`´-H4-t,ô/ˆ4,´`4`ôaô/t`ôcˆ4/t,4/ô.ô/´bt,4-4.´-H4/´`´-ôbô,´,ˆŸJW_JW_J_J_Y[˜Ý[ÛˆÙJÜ™]šY]Î™KÛ”™\NJ^Ü™]\›ˆKšœÞ
Ë™]‹Ú[š]X[žÛÜXÚ]NŒNŽK[š[X]NžÛÜXÚ]NŒKNŒK˜[œÚ][ÛŽžÙ\˜][ÛŽ‹Œ_KÚ[™[ŽšKšœÞÊ‹ØÚ[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\Ë\Ý\\ÝYžKX™]ÙY[ˆØ\LÈX‹Lˆ‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆØ\LˆZ[‹]ËL‹Ú[™[Ž–ÚKšœÞ
‹ÛX™[™ÍÊKœÛÝ\˜ÙJK˜\šX[ˆœš[X\žH‹Ú^™NˆœÛHŸJKKšœÞ
×ÙKÜ˜][™Î™Kœ˜][™ßJW_JKKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ^VÌLœH^[]]YY›Ü™YÜ›Ý[™›Û[YY][HÚš[šËL‹Ú[™[Ž™K™]_JW_JKK˜]]Ü“˜[YI‰šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆØ\LˆX‹LH‹Ú[™[Ž–ÙK˜]]Ü]˜]\•\›	‰šKšœÞ
š[YÈ‹ÜÜ˜Î™K˜]]Ü]˜]\•\›[ˆˆ‹Û\ÜÓ˜[YNˆËMHMH›Ý[™YY[Øš™XÝXÛÝ™\ˆÚš[šËLŸJKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH›Û\Ù[ZX›Û^Y›Ü™YÜ›Ý[™‹Ú[™[Ž™K˜]]Ü“˜[Y_JW_JKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌMH^Y›Ü™YÜ›Ý[™XY[™Ë\™[^YÚ]\ÜXÙK\™K]Ü˜\X‹L‹H‹Ú[™[Ž™K^JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆØ\Lˆ›^]Ü˜\‹Ú[™[Ž–ÚKšœÞ
×ÙKÜ™]šY]Î™_JKKÜXÜÏË›X\
OšKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ^VÌL\H›Û[YY][H^[]]YY›Ü™YÜ›Ý[™™Ë[]]YLˆKLH›Ý[™YY[‹Ú[™[Ž•YÖÛ—_KŠJW_JKK˜ZTÝ[[X\žI‰šKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLœH^[]]YY›Ü™YÜ›Ý[™][XÈ]Lˆ‹Ú[™[Ž™K˜ZTÝ[[X\ž_JKK›ÝÛ™\”™\OÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ›]L‹H™Ë[]]YÍL›Ý[™Y^L‹H‹Ú[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌL\H›Û\Ù[ZX›Û^[]]YY›Ü™YÜ›Ý[™X‹LH‹Ú[™[Žˆ´$´,4b4/´`´,´-t`ˆ
4/´/ô`ô,t.ô.4.´/´,´,4/JHŸJKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH^Y›Ü™YÜ›Ý[™XY[™Ë\™[^Y‹Ú[™[Ž™K›ÝÛ™\”™\_JW_JNšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ›]L‹H›^][\ËXÙ[\ˆ\ÝYžKX™]ÙY[ˆØ\Lˆ‹Ú[™[Ž–ÙKœ™\Q˜YÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌL\H^[]]YY›Ü™YÜ›Ý[™›^LH[˜Ø]H‹Ú[™[Žˆ´)ô-t`4/t/´,´.4.ˆ4/´`´,´-t`´,4`t/´at`4,4/tdt/HŸJNšKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ™›^LHŸJKKšœÞ
ÙKÜÚ^™NˆœÛH‹˜\šX[ˆ›Ý][™H‹YXÛÛŽšKšœÞ
	KÜÚ^™NŒLßJKÛÛXÚÎŠ
OO
JKÚ[™[Ž™Kœ™\Q˜YÈ´'´`´.´`4bô`´c4/´`´,´-t`ˆŽˆ´'´`´,´-t`´.4`´cŸJW_JW_J_J_Y[˜Ý[ÛˆÙJÛÜ[Ž™KÛÛÜÙNÛ”ÝX›Z]›ŸJ^ØÛÛœÝÜ‹WOTË\ÙTÝ]J™ÛÛÙÛHŠKÜËOTË\ÙTÝ]JˆŠKÝKOTË\ÙTÝ]JJKÙ‹WOTË\ÙTÝ]JˆŠKÚ×OTË\ÙTÝ]J™]È]J
KÒTÓÔÝš[™Ê
KœÛXÙJL
JNÙ[˜Ý[ÛˆJ
^ØJ™ÛÛÙÛHŠK
ˆŠK
JKJˆŠKÊ™]È]J
KÒTÓÔÝš[™Ê
KœÛXÙJL
J_Y[˜Ý[ÛˆŠ
^Ù‹š[J
I‰ŠŠÜÛÝ\˜ÙNœ‹]]Ü“˜[YNœËš[J
_›ÚY˜][™ÎK^™‹š[J
K]NšJKJ
K

J_\™]\›ˆKšœÞ
ÜËÛÜ[Ž™KÛÛÜÙN]Nˆ´'t/´,´bô.H4/´`´-ôbô,ˆ‹Û˜\Ú[ˆ™[‹Ú[™[ŽšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^›^XÛÛØ\M‹M‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH›Û\Ù[ZX›Û^Y›Ü™YÜ›Ý[™X‹Lˆ‹Ú[™[Žˆ´&4`t`´/´aô/t.4.ˆŸJKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^›^]Ü˜\Ø\Lˆ‹Ú[™[Ž‘™‹›X\
OšKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OO˜J‹šY
KÛ\ÜÓ˜[YN–
^VÌLÜH›Û\Ù[ZX›ÛLÈKLKH›Ý[™YY[›Ü™\ˆ˜[œÚ][Û‹XÛÛÜœÈ‹OO]‹šYÈ˜™Ë\š[X\žH^\š[X\žKY›Ü™YÜ›Ý[™›Ü™\‹\š[X\žHŽˆ˜™ËXØ\™›Ü™\‹X›Ü™\ˆ^Y›Ü™YÜ›Ý[™ŠKÚ[™[Ž‹›X™[K‹šY
J_JW_JKKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH›Û\Ù[ZX›Û^Y›Ü™YÜ›Ý[™X‹Lˆ‹Ú[™[Žˆ´'´a´-t/t.´,ŸJKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆØ\LH‹Ú[™[Ž–ÖÌK‹ËWK›X\
OšKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OO™
ŠKÚ[™[ŽšKšœÞ
Y‹ÜÚ^™NŒ‹Û\ÜÓ˜[YNJOÏÌ
OÈ™š[VÈÑNQL—H^VÈÑNQL—HŽˆ^X›Ü™\ˆŸJ_KŠJKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OO™
[
KÛ\ÜÓ˜[YNˆ›[Lˆ^VÌLœH^[]]YY›Ü™YÜ›Ý[™[™\›[™H‹Ú[™[Žˆ´$t-t-È4/´a´-t/t.´.ŸJW_JW_JKKšœÞ
™KÛX™[ˆ´$4,´`´/´`
4/t-t/´,tcô-ô,4`´-t.ôc4/t/ŠH‹XÙZÛ\Žˆ´&4/4cÈ4,ô/´`t`´cÈ‹˜[YNœËÛÚ[™ÙNO›
‹\™Ù]˜[YJ_JKKšœÞ
™KÛX™[ˆ´%4,4`´,‹\Nˆ™]H‹˜[YNšÛÚ[™ÙNO™Ê‹\™Ù]˜[YJ_JKKšœÞ
ÛËÛX™[ˆ´(´-t.´`t`ˆ4/´`´-ôbô,´,‹XÙZÛ\Žˆ´(t.´/´/ô.4`4`ô.t`´-H4`´-t.´`t`ˆ4/´`´-ôbô,´,‹‹ˆ‹˜[YN™‹ÛÚ[™ÙNO›J‹\™Ù]˜[YJK›ÝÜÎ_JKKšœÞ
ÙKÙ[ÚYˆL\ØX›YˆY‹š[J
KÛÛXÚÎš‹Ú[™[Žˆ´%4/´,t,4,´.4`´c4/´`´-ôbô,ˆŸJW_J_J_Y[˜Ý[Ûˆ—ÙJÛÜ[Ž™KÛÛÜÙNÛ’[\Ü›ŸJ^ØÛÛœÝÜ‹WOTË\ÙTÝ]Jœ\ÝHŠKÜËOTË\ÙTÝ]J™ÛÛÙÛHŠKÝKOTË\ÙTÝ]JˆŠKÙ‹WOTË\ÙTÝ]JˆŠKÚ×OTË\ÙTÝ]J[
KOTË\ÙT™YŠ[
NÙ[˜Ý[ÛˆŠ
^ØÛÛœÝ^[JKÊNÓ‹›[™ÝOOL	‰ŠŠŠK
ˆŠKÊ[
K

J_Y[˜Ý[ÛˆŠ
^ØÛÛœÝÜ™]šY]ÜÎ“‹ÚÚ\Y‘_OP“J‹ÊNÓ‹›[™ÝOOL	‰ŠŠŠKJˆŠKÊ[
K

J_X\Þ[˜È[˜Ý[ÛˆŠŠ^ØÛÛœÝOX]ØZ]‹^

NÛJJNØÛÛœÝÜ™]šY]ÜÎ—ËÚÚ\Y•OP“JKÊNÙÊØÛÝ[—Ë›[™ÝÚÚ\Y•J_\™]\›ˆKšœÞ
ÜËÛÜ[Ž™KÛÛÜÙN]Nˆ´&4/4/ô/´`4`ˆ4/´`´-ôbô,´/´,ˆ‹Û˜\Ú[ˆ™[‹Ú[™[ŽšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^›^XÛÛØ\M‹M‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^Ø\Lˆ‹Ú[™[Ž–ÚKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OO˜Jœ\ÝHŠKÛ\ÜÓ˜[YN–
™›^LHLL›Ý[™Y^^VÌLÜH›Û\Ù[ZX›Û›Ü™\ˆ‹OOHœ\ÝHÈ˜™Ë\š[X\žH^\š[X\žKY›Ü™YÜ›Ý[™›Ü™\‹\š[X\žHŽˆ˜™ËXØ\™›Ü™\‹X›Ü™\ˆ^Y›Ü™YÜ›Ý[™ŠKÚ[™[Žˆ´$´`t`´,4,´.4`´c4`´-t.´`t`ˆŸJKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OO˜J˜ÜÝˆŠKÛ\ÜÓ˜[YN–
™›^LHLL›Ý[™Y^^VÌLÜH›Û\Ù[ZX›Û›Ü™\ˆ‹OOH˜ÜÝˆÈ˜™Ë\š[X\žH^\š[X\žKY›Ü™YÜ›Ý[™›Ü™\‹\š[X\žHŽˆ˜™ËXØ\™›Ü™\‹X›Ü™\ˆ^Y›Ü™YÜ›Ý[™ŠKÚ[™[Žˆ´%ô,4,ô`4`ô-ô.4`´cÔÕˆŸJW_JKKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH›Û\Ù[ZX›Û^Y›Ü™YÜ›Ý[™X‹Lˆ‹Ú[™[Žˆ´&4`t`´/´aô/t.4.ˆ
4/ô/ˆ4`ô/4/´.ôaô,4/t.4cŠHŸJKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^›^]Ü˜\Ø\Lˆ‹Ú[™[Ž‘™‹›X\
OšKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OO›
‹šY
KÛ\ÜÓ˜[YN–
^VÌLœH›Û\Ù[ZX›ÛL‹HKLH›Ý[™YY[›Ü™\ˆ˜[œÚ][Û‹XÛÛÜœÈ‹ÏOOS‹šYÈ˜™Ë\š[X\žH^\š[X\žKY›Ü™YÜ›Ý[™›Ü™\‹\š[X\žHŽˆ˜™ËXØ\™›Ü™\‹X›Ü™\ˆ^Y›Ü™YÜ›Ý[™ŠKÚ[™[Ž“‹›X™[K‹šY
J_JW_JKOOHœ\ÝHÚKšœÞÊK‘œ˜YÛY[ØÚ[™[Ž–ÚKšœÞ
ÛËÛX™[ˆ´'´`´-ôbô,´bÈ4aô-t`4-t-È4/ô`ô`t`´`ôcˆ4`t`´`4/´.´`È‹XÙZÛ\Ž˜4'´`´-ôbô,ˆH4`´-t.´`t`‹‹‹‚‚´'´`´-ôbô,ˆˆ4`´-t.´`t`‹‹‹˜˜[YNKÛÚ[™ÙN“O™
‹\™Ù]˜[YJK›ÝÜÎŒL[ˆ´&´,4-´-4bô.H4/´`´-ôbô,ˆ8 %4/´`´-4-t.ôc4/tbô/4,4,t-ô,4a´-t/ˆ4(4-t.t`´.4/t,È
KMJH4.4-4,4`´,4/´/ô`4-t-4-t.ôcôc´`´`tcÈ4,4,´`´/´/4,4`´.4aô-t`t.´.4-t`t.ô.4-t`t`´c4,ˆ4`´-t.´`t`´-KˆŸJKKšœÞ
ÙKÙ[ÚYˆL\ØX›Yˆ]Kš[J
KÛÛXÚÎš‹Ú[™[Žˆ´&4/4/ô/´`4`´.4`4/´,´,4`´cŸJW_JNšKšœÞÊK‘œ˜YÛY[ØÚ[™[Ž–ÚKšœÞ
š[œ]‹Ü™YŽžK\Nˆ™š[H‹XØÙ\ˆ‹˜ÜÝ‹^ØÜÝˆ‹Û\ÜÓ˜[YNˆšY[ˆ‹ÛÚ[™ÙN“O“‹\™Ù]™š[\ÏË–ÌI‰˜Š‹\™Ù]™š[\ÖÌJ_JKKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OOžK˜Ý\œ™[Ë˜ÛXÚÊ
KÛ\ÜÓ˜[YNˆËY[LM›Ý[™YLž›Ü™\‹Lˆ›Ü™\‹Y\ÚY›Ü™\‹X›Ü™\ˆ›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆØ\Lˆ^VÌMH›Û\Ù[ZX›Û^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Ž–ÚKšœÞ
‰ÜÚ^™NŒNJKˆ4$´bô,t`4,4`´cÔÕ‹ta4,4.t.È—_JKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLœH^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Žˆ´&´/´.ô/´/t.´.ˆÛÝ\˜ÙK]]Ü‹˜][™Ë]K^
4/t`ô-´/t,4`´/´.ôc4.´/ˆ^
KˆŸJK	‰šKšœÞÊœ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH›Û[YY][H^Y›Ü™YÜ›Ý[™‹Ú[™[Ž–È´'t,4.t-4-t/t/ˆ4/´`´-ôbô,´/´,Žˆ‹˜ÛÝ[œÚÚ\YŒ	‰˜4/ô`4/´/ô`ôbt-t/t/ˆ4/ô`ô`t`´bôaH4`t`´`4/´.Žˆ	ÚœÚÚ\YX_JKKšœÞ
ÙKÙ[ÚYˆL\ØX›YˆY‹š[J
KÛÛXÚÎ‹Ú[™[Žˆ´&4/4/ô/´`4`´.4`4/´,´,4`´cŸJW_JW_J_J_Y[˜Ý[ÛˆWÙJÜ™\Ý[™KÛYÔ[ŽYY[Ž›ŸJ^Ü™]\›ˆKšœÞÊ‹ØÛ\ÜÓ˜[YNˆ˜›Ü™\‹\š[X\žKÌÌ‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆØ\LˆX‹LÈ‹Ú[™[Ž–ÚKšœÞ
™ËÜÚ^™NŒM‹Û\ÜÓ˜[YNˆ^\š[X\žHŸJKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌMH›ÛX›Û^Y›Ü™YÜ›Ý[™‹Ú[™[Žˆ´(t,´cô-ô.4`H4/´/ô-t`4,4a´.4/´/t/tbô/4.4-4,4/t/tbô/4.ŸJW_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^›^XÛÛØ\LˆX‹M‹Ú[™[Ž™K˜ÛÛ˜Û\Ú[ÛœË›X\

‹JOOšKšœÞÊœ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH^Y›Ü™YÜ›Ý[™XY[™Ë\™[^Y‹Ú[™[Ž–È¸ (ˆ‹—_KJJ_JKK˜XÝ[ÛœË›[™ÝŒ	‰šKšœÞÊK‘œ˜YÛY[ØÚ[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLœH›ÛX›Û\\˜Ø\ÙH˜XÚÚ[™Ë]ÚYH^[]]YY›Ü™YÜ›Ý[™X‹Lˆ‹Ú[™[Žˆ´(4-t.´/´/4-t/t-4/´,´,4/t/tbô-H4-4-t.t`t`´,´.4cÈŸJKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^›^XÛÛØ\LˆX‹LÈ‹Ú[™[Ž™K˜XÝ[ÛœË›X\

‹JOOšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™Ë[]]YÍL›Ý[™Y^LÈ‹Ú[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH›Û\Ù[ZX›Û^Y›Ü™YÜ›Ý[™X‹LH‹Ú[™[Žœ‹]_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^›^XÛÛØ\LH‹Ú[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLœH^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Žœ‹š[\XÝJKKšœÞÊœ‹ØÛ\ÜÓ˜[YNˆ^VÌL\H^Y›Ü™YÜ›Ý[™ÍÌXY[™Ë\™[^Y‹Ú[™[Ž–È´'´`t/t/´,´,4/t.4-Nˆ‹‹˜˜\Ú\ÔÝ[[X\žOÏÈ´`´`4-t,t`ô-t`ˆ4/ô`4/´,´-t`4.´.4/ô/ˆ4-4,4/t/tbô/4-ô,4,´-t-4-t/t.4cÈ—_JK‹™]šY[˜ÙOË›[™ÝŒ	‰šKšœÞÊ™]Z[È‹ØÛ\ÜÓ˜[YNˆ›]LH^VÌL\H^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Ž–ÚKšœÞÊœÝ[[X\žH‹ØÛ\ÜÓ˜[YNˆ™›Û\Ù[ZX›ÛÝ\œÛÜ‹\Ú[\ˆ‹Ú[™[Ž–È´)4,4.´`´bÈ0­È‹‹™]šY[˜ÙK›[™Ý_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ›]LH›^›^XÛÛØ\LH‹Ú[™[Žœ‹™]šY[˜ÙK›X\

Ë
OOšKšœÞÊœ‹ØÛ\ÜÓ˜[YNˆ›XY[™Ë\™[^Y‹Ú[™[Ž–ÚKšœÞÊœÝ›Û™È‹ØÚ[™[Ž–ÜË›X™[Žˆ—_JKË™˜XÝ_KËšYÏÛ
J_JW_JW_JW_KJJ_JKKšœÞ
ÙKÙ[ÚYˆL˜\šX[›ÈœÙXÛÛ™\žHŽˆœš[X\žH‹\ØX›Y›‹ÛÛXÚÎYXÛÛŽ›ÚKšœÞ
‹ÜÚ^™NŒMŸJN›ÚYÚ[™[Ž›È´%4/´,t,4,´.ô-t/t/ˆ4,ˆ4/ô.ô,4/HŽˆ´%4/´,t,4,´.4`´c4-4-t.t`t`´,´.4cÈ4,ˆ4/ô.ô,4/HŸJW_JW_J_Y[˜Ý[Ûˆ	ÙJÚ[œÚYÚÎ™K\ÝÞ[˜ÙY]J^Ü™]\›ˆKšœÞÊ‹ØÚ[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆ\ÝYžKX™]ÙY[ˆX‹LÈ‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞÊœ‹ØÛ\ÜÓ˜[YNˆ^VÌŽH›ÛX›Û^Y›Ü™YÜ›Ý[™XY[™Ë[›Û™H‹Ú[™[Ž–ÙK˜]™Ô˜][™ÏÏÈ¸ %‹K˜]™Ô˜][™ÈO[[	‰šKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ^VÌMœH^[]]YY›Ü™YÜ›Ý[™‹Ú[™[ŽˆˆÈHŸJW_JKKšœÞÊœ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH^[]]YY›Ü™YÜ›Ý[™]LH‹Ú[™[Ž–ÙKÝ[™]šY]ÜËˆ4/´`´-ôbô,´/´,ˆ4,´`t-t,ô/ˆ—_JW_JKK™[™œ˜][™Ñ[T\˜Ù[OO[[	‰šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YN–
™›^][\ËXÙ[\ˆØ\LH^VÌLÜH›Û\Ù[ZX›Û‹K™[™œ˜][™Ñ[T\˜Ù[LÈ^VÈÌMLÍWHŽˆ^Y\ÝXÝ]™HŠKÚ[™[Ž–ÙK™[™œ˜][™Ñ[T\˜Ù[LÚKšœÞ
ËÜÚ^™NŒM_JNšKšœÞ
˜ËÜÚ^™NŒM_JKK™[™œ˜][™Ñ[T\˜Ù[ŒÈŠÈŽˆˆ‹K™[™œ˜][™Ñ[T\˜Ù[‰H4-ô,4/4-t`tcôaˆ—_JW_JKKœÙ[[Y[Ý[Œ	‰šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^Lˆ›Ý[™YY[Ý™\™›ÝËZY[ˆ™Ë[]]YX‹LÈ‹Ú[™[Ž–ÙKœÙ[[Y[œÜÚ]]™OŒ	‰šKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™ËVÈÌŒÍMQWH‹Ý[NžÝÚY˜	ÙKœÙ[[Y[œÜÚ]]™KÙKœÙ[[Y[Ý[
ŒLIX_JKKœÙ[[Y[›™]]˜[Œ	‰šKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™ËVÈÎMLÐŽH‹Ý[NžÝÚY˜	ÙKœÙ[[Y[›™]]˜[ÙKœÙ[[Y[Ý[
ŒLIX_JKKœÙ[[Y[›™YØ]]™OŒ	‰šKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™ËY\ÝXÝ]™H‹Ý[NžÝÚY˜	ÙKœÙ[[Y[›™YØ]]™KÙKœÙ[[Y[Ý[
ŒLIX_JW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆ\ÝYžKX™]ÙY[ˆ^VÌLœH^[]]YY›Ü™YÜ›Ý[™Lˆ›Ü™\‹]›Ü™\‹X›Ü™\ˆ‹Ú[™[Ž–ÚKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–È´'t/´,´bôaH4-ô,Ì4-4/t-t.Nˆ‹K™[™˜Ý\œ™[ÛÝ[_JKKšœÞÊœÜ[ˆ‹ØÚ[™[Ž–È´(t.4/tat`4/´/t.4-ô,4a´.4cÎˆ‹—Ê
W_JW_JW_J_Y[˜Ý[ÛˆÙJÝ˜[YN™_J^Ü™]\›ˆOOOH\ÚKšœÞ
ËÜÚ^™NŒL‹Û\ÜÓ˜[YNˆ^VÈÌMLÍWHŸJN™OOOH™ÝÛˆÚKšœÞ
˜ËÜÚ^™NŒL‹Û\ÜÓ˜[YNˆ^Y\ÝXÝ]™HŸJN™OOOH™›]ÚKšœÞ
PKÜÚ^™NŒL‹Û\ÜÓ˜[YNˆ^[]]YY›Ü™YÜ›Ý[™ŸJN›[Y[˜Ý[Ûˆ—ÙJÝÜXÜÎ™_J^Ü™]\›ˆK›[™ÝOOLÚKšœÞÊ‹ØÚ[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌMH›ÛX›Û^Y›Ü™YÜ›Ý[™X‹LH‹Ú[™[Žˆ´(´-t/4bÈ4/´`´-ôbô,´/´,ˆŸJKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Žˆ´'ô/´.´,4/t-t-4/´`t`´,4`´/´aô/t/ˆ4/ô`4/´,4/t,4.ô.4-ô.4`4/´,´,4/t/tbôaH4/´`´-ôbô,´/´,‹4aô`´/´,tbÈ4`4,4-ô.ô/´-´.4`´c4.4aH4/ô/ˆ4`´-t/4,4/ˆŸJW_JNšKšœÞÊ‹ØÚ[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌMH›ÛX›Û^Y›Ü™YÜ›Ý[™X‹LÈ‹Ú[™[Žˆ´(´-t/4bÈ4/´`´-ôbô,´/´,ˆŸJKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ™ÜšYÜšYXÛÛËLˆØ\L‹H‹Ú[™[Ž™K›X\
OšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™Ë[]]YÍL›Ý[™Y^LÈ‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆ\ÝYžKX™]ÙY[ˆX‹LH‹Ú[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH›Û\Ù[ZX›Û^Y›Ü™YÜ›Ý[™‹Ú[™[Ž›X™[JKKšœÞ
ÙKÝ˜[YN›[ÛY[[_JW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆØ\LKHX‹LH‹Ú[™[Ž–ÚKšœÞ
Y‹ÜÚ^™NŒLKÛ\ÜÓ˜[YNˆ™š[VÈÑNQL—H^VÈÑNQL—HŸJKKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ^VÌLœH^Y›Ü™YÜ›Ý[™›Û[YY][H‹Ú[™[Ž˜]™Ô˜][™ÏÏÈ¸ %ŸJW_JKKšœÞÊœ‹ØÛ\ÜÓ˜[YNˆ^VÌL\H^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Ž–È´(ô/ô/´/4.4/t,4/t.4.Nˆ‹›Y[[ÛÛÝ[›Y[[Û•™[™OOHœš\Ú[™È‰‰ˆˆ0­È4aô,4bt-K4aô-t/4`4,4/tc4b4-H‹›Y[[Û•™[™OOH™˜[[™È‰‰ˆˆ0­È4`4-t-´-K4aô-t/4`4,4/tc4b4-H—_JW_KÜXÊJ_JW_J_XÛÛœÝ™™]šY]Ñ]šY[˜ÙUZU™\œÚ[ÛHœ™]šY]ËY]šY[˜ÙK]ŒÈŽÙ[˜Ý[Ûˆ›
Ý]N™K][\ÎÛ™N›ŸJ^Ü™]\›ˆ›[™ÝOOLÛ[šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ›X‹LÈ‹Ú[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YN–
^VÌLœH›ÛX›Û\\˜Ø\ÙH˜XÚÚ[™Ë]ÚYHX‹LKH‹OOHœÜÚ]]™HÈ^VÈÌMLÍWHŽ›OOH›™YØ]]™HÈ^Y\ÝXÝ]™HŽˆ^[]]YY›Ü™YÜ›Ý[™ŠKÚ[™[Ž™_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^›^XÛÛØ\LH‹Ú[™[Ž›X\

‹JOOšKšœÞÊœ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH^Y›Ü™YÜ›Ý[™XY[™Ë\™[^Y‹Ú[™[Ž–È¸ (ˆ‹—_KJJ_JW_J_Y[˜Ý[Ûˆ—ÙJÜ™\Ý[™KØY[™Î˜Z[Y›‹Û”™]žNœŸJ^Ü™]\›ˆKšœÞÊ‹ØÛ\ÜÓ˜[YNˆ˜›Ü™\‹\š[X\žKÌÌ‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆØ\LˆX‹LÈ‹Ú[™[Ž–ÚKšœÞ
[ËÜÚ^™NŒM‹Û\ÜÓ˜[YNˆ^\š[X\žHŸJKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌMH›ÛX›Û^Y›Ü™YÜ›Ý[™‹Ú[™[ŽˆRHØÝÜˆ8 %4`4,4-ô,t/´`4/´`´-ôbô,´/´,ˆŸJW_JK	‰šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆØ\LˆKMˆ^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Ž–ÚKšœÞ
[ËÜÚ^™NŒM‹Û\ÜÓ˜[YNˆ˜[š[X]K\Ü[ˆŸJKKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH‹Ú[™[Žˆ´$ô/´`´/´,´.ôcˆ4`4,4-ô,t/´`‹‹ˆŸJW_JK]	‰›‰‰šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ^XÙ[\ˆKM‹Ú[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH^[]]YY›Ü™YÜ›Ý[™X‹LÈ‹Ú[™[Žˆ´'t-H4`ô-4,4.ô/´`tc4/ô/´-4,ô/´`´/´,´.4`´c4`4,4-ô,t/´`ˆŸJKKšœÞ
ÙKÝ˜\šX[ˆ›Ý][™H‹Ú^™NˆœÛH‹ÛÛXÚÎœ‹Ú[™[Žˆ´'ô/´/ô`4/´,t/´,´,4`´c4-tbtdH4`4,4-ÈŸJW_JK]	‰ˆ[‰‰™I‰šKšœÞÊK‘œ˜YÛY[ØÚ[™[Ž–ÚKšœÞ
›Ý]Nˆ´(ô.ô`ôaôb4.4.ô/´`tc‹][\Î™Kš[\›Ý™YÛ™NˆœÜÚ]]™HŸJKKšœÞ
›Ý]Nˆ´(ôat`ô-4b4.4.ô/´`tc‹][\Î™KÛÜœÙ[™YÛ™Nˆ›™YØ]]™HŸJKKšœÞ
›Ý]Nˆ´%ô,4/4-t`´/tbô-H4`´-t/4bÈ‹][\Î™KÜÜXÜßJKKšœÞ
›Ý]Nˆ´'ô/´,´`´/´`4côc´bt.4-t`tcÈ4/ô`4/´,t.ô-t/4bÈ‹][\Î™Kœ™XÝ\œš[™Ô›Ø›[\ËÛ™Nˆ›™YØ]]™HŸJKKšœÞ
›Ý]Nˆ´$´/´-ô/4/´-´/t/ˆ4,´.ô.4côc´`ˆ4/t,4/´`´-ôbô,´bÈ‹][\Î™Kš[\XØ]YÝY™‹Û™Nˆ›™YØ]]™HŸJKKšœÞ
›Ý]Nˆ´(4-t.´/´/4-t/t-4,4a´.4.‹][\Î™Kœ™XÛÛ[Y[™][ÛœßJKKš[\›Ý™Y›[™ÝOOL	‰™KÛÜœÙ[™Y›[™ÝOOL	‰™KÜÜXÜË›[™ÝOOL	‰™Kœ™XÝ\œš[™Ô›Ø›[\Ë›[™ÝOOL	‰™Kš[\XØ]YÝY™‹›[™ÝOOL	‰™Kœ™XÛÛ[Y[™][ÛœË›[™ÝLI‰šKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Žˆ´'ô/´.´,4/t-t-4/´`t`´,4`´/´aô/t/ˆ4-4,4/t/tbôaH4-4.ôcÈ4`t/´-4-t`4-´,4`´-t.ôc4/t/´,ô/ˆ4`4,4-ô,t/´`4,8 %4-4/´,t,4,´c4`´-H4,t/´.ôc4b4-H4/´`´-ôbô,´/´,‹ˆŸJW_JW_J_Y[˜Ý[ÛˆWÙJ
^ØÛÛœÝËWOX

KÝØ\ÝO\ÛŠ
KÜ›Ùš[N›ŸOU[Š
KÜ™]šY]ÜÎœ‹Y™]šY]ÜÎ˜K\]T™]šY]ÎœßOU™Ê
KÙ[\ÞYY\Î›OWÚJ
KØØ\Ù\Î_O^˜J
KÙ\]Z\Y[™OQœŠ
KÜ™]™[YN™ŸOU\Š
KØYXÝ[Û”[Ž›_OTÊ
KÚ×OTË\ÙTÝ]JLJKÞK—OTË\ÙTÝ]JLJKÝ‹—OTË\ÙTÝ]J˜[ŠKÓ‹WOTË\ÙTÝ]JLJK×ËOTË\ÙTÝ]J[
KÐK×OTË\ÙTÝ]JLJKÓËWOTË\ÙTÝ]J[
KÑ—OTË\ÙTÝ]J[
KÓWOTË\ÙTÝ]JLJKÐ‹WOTË\ÙTÝ]JLJKÒWOTË\ÙTÝ]J[
KTË\ÙPØ[˜XÚÊ

OOžÛWÙJ
K[ŠJ_K×JNÔË\ÙQY™™XÝ


OOžÕŠ
_KÕ—JKË\ÙQY™™XÝ


OOžØÛÛœÝO[™]ÈT“ÙX\˜Ú\˜[\ÊÚ[™ÝË›ØØ][Û‹œÙX\˜Ú
K™Ù]
™ÛÛÙÛPÛÛ›™XÝŠNÛI‰ŠÚ[™ÝËš\ÝÜžKœ™\XÙTÝ]JßKˆ‹Ú[™ÝË›ØØ][Û‹œ]˜[YJKOOOHœÝXØÙ\ÜÈÝ
Ý˜\šX[ˆœÝXØÙ\ÜÈ‹]Nˆ‘ÛÛÙÛH4/ô/´-4.´.ôc´aôdt/H‹\ØÜš\[ÛŽˆ´'´`´-ôbô,´bÈ4/t,4aô,4.ô.4`t.4/tat`4/´/t.4-ô.4`4/´,´,4`´c4`tcËˆŸJN›OOOHœ[™[™ÈÝ
Ý˜\šX[ˆ™Y˜][‹]Nˆ´$´bô,t-t`4.4`´-H4-ô,4,´-t-4-t/t.4-HÛÛÙÛH‹\ØÜš\[ÛŽˆ´'´`t`´,4.ô/´`tc4,´bô,t`4,4`´c4aôc4.4/´`´-ôbô,´bÈ4`t.4/tat`4/´/t.4-ô.4`4/´,´,4`´cˆŸJN›OOOH™\œ›Üˆ‰‰
Ý˜\šX[ˆ™\œ›Üˆ‹]Nˆ´'t-H4`ô-4,4.ô/´`tc4/ô/´-4.´.ôc´aô.4`´cÛÛÙÛH‹\ØÜš\[ÛŽˆ´'ô/´/ô`4/´,t`ô.t`´-H4-tbtdH4`4,4-È4.4.ô.4/ô`4/´,´-t`4c4`´-H4-4/´`t`´`ô/È4,ˆÛÛÙÛHÛÝYÛÛœÛÛKˆŸJKŠ
J_K×JNØÛÛœÝTË\ÙSY[[Ê

OO‘ÊŠKÜ—JKTË\ÙSY[[Ê

OOOOH˜[ÜŽœ‹™š[\ŠOOšKœÛÝ\˜ÙOOO]ŠKÜ‹—JKTË\ÙT™YŠLJNÔË\ÙQY™™XÝ


OOžØÛÛœÝO\‹™š[\ŠOO•K˜ZTÝ]\ÏOOHœ[™[™ÈŠNÚYŠK›[™ÝOOL‹˜Ý\œ™[
\™]\›ŽÔ‹˜Ý\œ™[HLØÛÛœÝOZKœÛXÙJJNÙ›ÜŠÛÛœÝHÙˆJ\ÊKšYØZTÝ]\Îˆ˜[˜[^š[™ÈŸJNÝ×ÙJKÞÛ˜[YN›‹›˜[YK\Ú[™\ÜÕ\N›‹˜\Ú[™\ÜÕ\_N›ÚY
K[ŠOOžÚYŠUJ^Ù›ÜŠÛÛœÝ™HÙˆJ\Ê™KšYØZTÝ]\Îˆ™˜Z[YŸJNÜ™]\›ŸY›ÜŠÛÛœÝ™HÙˆJ\Ê™KšYØZTÝ]\Îˆ™Û™H‹Ù[[Y[˜™KœÙ[[Y[ÜXÜÎ˜™KÜXÜËZTÝ[[X\žN˜™KœÝ[[X\ž_J_JK™š[˜[J

OOžÔ‹˜Ý\œ™[HL_J_KÜ—JNØÛÛœÝÏLËOTË\ÙT™YŠ[
K™O[ÞÛ˜[YN›‹›˜[YK\Ú[™\ÜÕ\N›‹˜\Ú[™\ÜÕ\_N›ÚYYOTË\ÙPØ[˜XÚÊ

OOžÑ‹˜[˜[^™YÛÝ[ß
JL
KJLJK×ÙJ‹‹ÜXÜË‹œÝY™“Y[[ÛœË™JK[ŠOOžÜJLJKOÞŠJN•JL
_JJ_KÑ‹˜[˜[^™YÛÝ[JNÔË\ÙQY™™XÝ


OOžÑ‹˜[˜[^™YÛÝ[ßK˜Ý\œ™[OOQ‹˜[˜[^™YÛÝ[	‰ŠK˜Ý\œ™[Q‹˜[˜[^™YÛÝ[YJ
J_KÑ‹˜[˜[^™YÛÝ[JNÙ[˜Ý[ÛˆÙJKJ^ÜÊKÜ™\Q˜Y›K™\Q˜YÝ]\Îˆœ™XYHŸJK
Ý˜\šX[ˆœÝXØÙ\ÜÈ‹]Nˆ´)ô-t`4/t/´,´.4.ˆ4/´`´,´-t`´,4`t/´at`4,4/tdt/HŸJ_Y[˜Ý[ÛˆÙJJ^ØJÚWJK
Ý˜\šX[ˆœÝXØÙ\ÜÈ‹]Nˆ´'´`´-ôbô,ˆ4-4/´,t,4,´.ô-t/H‹\ØÜš\[ÛŽˆ´$4/t,4.ô.4-È4`´/´/t,4.ôc4/t/´`t`´.4/t,4aô/tdt`´`tcÈ4,4,´`´/´/4,4`´.4aô-t`t.´.ˆŸJ_Y[˜Ý[ÛˆYJJ^ØJJK
Ý˜\šX[ˆœÝXØÙ\ÜÈ‹]N˜4&4/4/ô/´`4`´.4`4/´,´,4/t/ˆ4/´`´-ôbô,´/´,Žˆ	ÚK›[™ÝX\ØÜš\[ÛŽˆ´$4/t,4.ô.4-È4`´/´/t,4.ôc4/t/´`t`´.4/t,4aô/tdt`´`tcÈ4,4,´`´/´/4,4`´.4aô-t`t.´.ˆŸJ_XÛÛœÝ™OTË\ÙPØ[˜XÚÊ

OOžØÛÛœÝOQ]K››ÝÊ
KOMÌŒ
Œ
Œ
ŒYLËOY‹™š[\ŠYOOšK[™]È]JYK™]JK™Ù][YJ
OJK™OUK™š[\ŠYOOŠYKœÝY™š[™ÏË›[™ÝÏÌ
OŒ
K™OUK›[™ÝŒÖØ4%ô,4/ô/´`t.ô-t-4/t.4-HÌ4-4/t-t.H4`ôaô`´-t/t/ˆ4`t/4-t/Nˆ	ÕK›[™ÝK4.4-È4/t.4aH4`H4`ô.´,4-ô,4/t/tbô/4/ô-t`4`t/´/t,4.ô/´/ˆ	Ø™K›[™ÝH
	ÓX]œ›Ý[™
™K›[™ÝÕK›[™Ý
ŒL
_IJXN–×KÙO[™š[\ŠYOOšYKš\™Q]I‰šK[™]È]JYKš\™Q]JK™Ù][YJ
OM
Œ
Œ
ŒYLÊK›X\
YOO˜	ÚYK›˜[Y_H
	ÚYKœÜÚ][ÛŸJH8 %4/ô`4.4/tcô`Š4,
H4/t,4`4,4,t/´`´`È	ÚYKš\™Q]_X
K™O]K™š[\ŠYOOšYK\OOOH›XZ[[˜[˜ÙH‰‰ŠYKœÝ]\ÏOOH›Ü[ˆŸYKœÝ]\ÏOOHš[—Ü›ÙÜ™\ÜÈŠJK›X\
YOO˜4'´`´.´`4bô`´,4cÈ4-ô,4-4,4aô,4/´,t`t.ô`ô-´.4,´,4/t.4cÎˆ‰ÚYK]_Hˆ
4/ô`4.4/´`4.4`´-t`Žˆ	ÚYKœš[Üš]_JX
KY™š[\ŠYOOˆZYK˜\˜Ú]™Y	‰ŠYKœÝ]\ÏOOH˜œ›ÚÙ[ˆŸYKœÝ]\ÏOOH[™\—Ü™\Z\ˆŸYKœÝ]\ÏOOH›™YY×ÛXZ[[˜[˜ÙHŠJK›X\
YOO˜	ÚYK›˜[Y_H8 %4`t`´,4`´`ô`Nˆ	ÚYKœÝ]\ßX
K]XXÙJŠKOR]ÖØ4'ô/ˆ	Ò]™^SX™[H4-4/´.ôcÈ4/t-t,ô,4`´.4,´/tbôaH4/´`´-ôbô,´/´,ˆ4-ô,4/4-t`´/t/ˆ4,´bôb4-H4`t`4-t-4/t-t.H
	ÓX]œ›Ý[™
]›™YØ]]™TÚ\™JŒL
_IH4/ô`4/´`´.4,ˆ4/´,tbt-t.H4-4/´.ô.4/t,4/´`t/t/´,´-H	Ò]˜ÛÝ[H4/´`´-ôbô,´/´,ŠK˜N–×K›Q‹ÜXÜË™š[\ŠYOOšYK›[ÛY[[OOOH™ÝÛˆŠK›X\
YOOšYK›X™[
NÜ™]\›žÜÝY™š[™Ó›Ý\Î•™K™]Ò\™S›Ý\Î•ÙKÛX[š[™Õ\ÚÓ›Ý\Î”™K\]Z\Y[\ÜÝYS›Ý\Î›^SÙ•ÙYZÓ›Ý\Î“KXÛ[š[™ÕÜXÜÎ”›Ÿ_KÙ‹K‹‹ÜXÜ×JNØ\Þ[˜È[˜Ý[Ûˆ™J
^ÚYŠ‹œÙ[[Y[Ý[OOL
^Ý
Ý˜\šX[ˆ™Y˜][‹]Nˆ´'t-t-4/´`t`´,4`´/´aô/t/ˆ4-4,4/t/tbôaH‹\ØÜš\[ÛŽˆ´%4/´-´-4.4`´-t`tc4-ô,4,´-t`4b4-t/t.4cÈ4,4/t,4.ô.4-ô,4at/´`´cÈ4,tbÈ4/t-t`t.´/´.ôc4.´.4aH4/´`´-ôbô,´/´,‹ˆŸJNÜ™]\›ŸQJL
K
[
KÊLJNØÛÛœÝOX]ØZ]—ÙJ‹™J
K™JNÚYŠJLJKZJ^Ý
Ý˜\šX[ˆ™\œ›Üˆ‹]Nˆ´'t-H4`ô-4,4.ô/´`tc4/ô/´`t`´`4/´.4`´c4`t,´cô-ô.‹\ØÜš\[ÛŽˆ´'ô/´/ô`4/´,t`ô.t`´-H4-tbtdH4`4,4-È4aô`ô`´c4/ô/´-ô-´-KˆŸJNÜ™]\›ŸU
J_Y[˜Ý[ÛˆÙJ
^ÈWßË˜XÝ[ÛœË›[™ÝOOL
JÜ›Ø›[U]Nˆ´(t,´cô-ô.4/4-t-´-4`È4/´`´-ôbô,´,4/4.4,ô/´`t`´-t.H4.4/´/ô-t`4,4a´.4/´/t/tbô/4.4-4,4/t/tbô/4.‹›Ø›[PØ]YÛÜžNˆ™ÝY\Ý^\šY[˜ÙH‹›Ø›[U\™Ù[˜ÞNˆ›YY][H‹Z[QXYÛ›ÜÚ\Î—Ë˜ÛÛ˜Û\Ú[ÛœËš›Ú[ŠˆŠKZQ^[˜][ÛŽ—Ë˜ÛÛ˜Û\Ú[ÛœÖÌOÏÈˆ‹^XÝY[\XÝˆ´(ô.ô`ôaôb4-t/t.4-H4/ô/´.´,4-ô,4`´-t.ô-t.H4/ô/ˆ4/´`´-ôbô,´,4/4,ô/´`t`´-t.Kˆ‹XÝ[ÛœÎ—Ë˜XÝ[ÛœËÛ›ÝÛ‘\]Z\Y[™›X\
OOŠÚYšKšY˜[YNšK›˜[Y_JJKÛ›ÝÛ‘[\ÞYY\Î›™š[\ŠOOšKœÝ]\ÏOOH˜XÝ]™HŠK›X\
OOŠÚYšKšY˜[YNšK›˜[YK›ÛNš›ÊJKÜÚ][ÛŽšKœÜÚ][ÛŸJJ_JKÊL
K
Ý˜\šX[ˆœÝXØÙ\ÜÈ‹]Nˆ´%4/´,t,4,´.ô-t/t/ˆ4,ˆ4/ô.ô,4/H4-4-t.t`t`´,´.4.HŸJJ_\™]\›ˆKšœÞÊÜÚÝÐ›ÝÛS˜]ŽˆLÚ[™[Ž–ÚKšœÞÊ	KØÛ\ÜÓ˜[YNˆœMH‹LL‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆœMˆX‹MH›^][\ËXÙ[\ˆØ\LÈ‹Ú[™[Ž–ÚKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OOÚ[™ÝË˜™˜]šYØ]P˜XÚÊ‹Û[Ü™HŠK˜\šXK[X™[Žˆ´'t,4-ô,4-‹Û\ÜÓ˜[YNˆËLLHLLH›Ý[™YY[™ËXØ\™›Ü™\ˆ›Ü™\‹XØ\™X›Ü™\ˆ›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆ‹Ú[™[ŽšKšœÞ
›‹ÜÚ^™NŒNJ_JKKšœÞ
šH‹ØÛ\ÜÓ˜[YNˆ^VÌŒH›ÛX›Û^Y›Ü™YÜ›Ý[™˜XÚÚ[™Ë]YÚ›^LH‹Ú[™[Žˆ´'´`´-ôbô,´bÈ4,ô/´`t`´-t.HŸJW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆœMˆ›^›^XÛÛØ\M‹Ú[™[Ž–ÚKšœÞ
	ÙKÚ[œÚYÚÎ‘‹\ÝÞ[˜ÙY]“ÏËœ›ÝšY\œË™š[™
OOšKšYOOH™ÛÛÙÛHŠOË›\ÝÞ[˜ÙY]JK‹˜[˜[^™YÛÝ[RÏÚKšœÞ
—ÙKÜ™\Ý[‘ØY[™Î“˜Z[Y‹Û”™]žN˜Y_JNšKšœÞÊ‹ØÛ\ÜÓ˜[YNˆ˜›Ü™\‹\š[X\žKÌÌ‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆØ\LˆX‹LH‹Ú[™[Ž–ÚKšœÞ
[ËÜÚ^™NŒM‹Û\ÜÓ˜[YNˆ^\š[X\žHŸJKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌMH›ÛX›Û^Y›Ü™YÜ›Ý[™‹Ú[™[ŽˆRHØÝÜˆ8 %4`4,4-ô,t/´`4/´`´-ôbô,´/´,ˆŸJW_JKKšœÞÊœ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Ž–È´%4/´,t,4,´c4`´-H4-tbtdH4/t-t/4/t/´,ô/ˆ4/´`´-ôbô,´/´,ˆ
‹‹˜[˜[^™YÛÝ[‹È‹Ëˆ4/ô`4/´,4/t,4.ô.4-ô.4`4/´,´,4/t/ŠH8 %4/ô/´`t.ô-H4ct`´/´,ô/ˆ4-ô-4-t`tc4/ô/´cô,´.4`´`tcÈ4`4,4-ô,t/´`ˆ—_JW_JKKšœÞ
—ÙKÝÜXÜÎ‘‹ÜXÜßJKKšœÞ
ÙKÜÝ]\Î“ËÛ”™Yœ™\Ú•ŸJK
‹ÜÛÛ\Z[Ë›[™ÝŒ‹ÜÛÛ\[Y[Ë›[™ÝŒ
I‰šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™ÜšYÜšYXÛÛËLˆØ\LÈ‹Ú[™[Ž–Ñ‹ÜÛÛ\Z[Ë›[™ÝŒ	‰šKšœÞÊ‹ØÚ[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆØ\LKHX‹Lˆ‹Ú[™[Ž–ÚKšœÞ
‹ÜÚ^™NŒMÛ\ÜÓ˜[YNˆ^Y\ÝXÝ]™HŸJKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLœH›ÛX›Û^Y›Ü™YÜ›Ý[™‹Ú[™[Žˆ´%´,4.ô/´,tbÈŸJW_JK‹ÜÛÛ\Z[Ë›X\
OOšKšœÞÊœ‹ØÛ\ÜÓ˜[YNˆ^VÌLœH^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Ž–ÚK›X™[ˆ0­È‹K˜ÛÝ[_KKÜXÊJW_JK‹ÜÛÛ\[Y[Ë›[™ÝŒ	‰šKšœÞÊ‹ØÚ[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆØ\LKHX‹Lˆ‹Ú[™[Ž–ÚKšœÞ
Ö‹ÜÚ^™NŒMÛ\ÜÓ˜[YNˆ^VÈÌMLÍWHŸJKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLœH›ÛX›Û^Y›Ü™YÜ›Ý[™‹Ú[™[Žˆ´)t,´,4.ôcô`ˆŸJW_JK‹ÜÛÛ\[Y[Ë›X\
OOšKšœÞÊœ‹ØÛ\ÜÓ˜[YNˆ^VÌLœH^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Ž–ÚK›X™[ˆ0­È‹K˜ÛÝ[_KKÜXÊJW_JW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^Ø\Lˆ‹Ú[™[Ž–ÚKšœÞ
ÙKÙ[ÚYˆL˜\šX[ˆœÙXÛÛ™\žH‹YXÛÛŽšKšœÞ
ÜÚ^™NŒMŸJKÛÛXÚÎŠ
OO™ÊL
KÚ[™[Žˆ´%4/´,t,4,´.4`´cŸJKKšœÞ
ÙKÙ[ÚYˆL˜\šX[ˆœÙXÛÛ™\žH‹YXÛÛŽšKšœÞ
‰ÜÚ^™NŒMŸJKÛÛXÚÎŠ
OOšŠL
KÚ[™[Žˆ´&4/4/ô/´`4`ˆŸJW_JKKšœÞ
ÙKÙ[ÚYˆL˜\šX[ˆ›Ý][™H‹ØY[™Î“‹YXÛÛŽšKšœÞ
™ËÜÚ^™NŒMŸJKÛÛXÚÎ™™KÚ[™[Žˆ´'t,4.t`´.4`t,´cô-ô.4`H4/´/ô-t`4,4a´.4/´/t/tbô/4.4-4,4/t/tbô/4.ŸJKÉ‰šKšœÞ
WÙKÜ™\Ý[—ËÛYÔ[ŽÙKYY[Ž_JK‹›[™ÝŒ	‰šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^Ø\LˆÝ™\™›ÝË^X]]È‹LH[^LHLH‹Ú[™[Ž–ÚKšœÞ
˜]Ûˆ‹ÛÛÛXÚÎŠ
OO˜Š˜[ŠKÛ\ÜÓ˜[YN–
œÚš[šËL^VÌLœH›Û\Ù[ZX›ÛLÈKLKH›Ý[™YY[›Ü™\ˆ‹OOH˜[È˜™Ë\š[X\žH^\š[X\žKY›Ü™YÜ›Ý[™›Ü™\‹\š[X\žHŽˆ˜™ËXØ\™›Ü™\‹X›Ü™\ˆ^Y›Ü™YÜ›Ý[™ŠKÚ[™[Žˆ´$´`t-HŸJK™‹™š[\ŠOOœ‹œÛÛYJOO›KœÛÝ\˜ÙOOOZKšY
JK›X\
OOšKšœÞ
˜]Ûˆ‹ÛÛÛXÚÎŠ
OO˜ŠKšY
KÛ\ÜÓ˜[YN–
œÚš[šËL^VÌLœH›Û\Ù[ZX›ÛLÈKLKH›Ý[™YY[›Ü™\ˆ‹OOZKšYÈ˜™Ë\š[X\žH^\š[X\žKY›Ü™YÜ›Ý[™›Ü™\‹\š[X\žHŽˆ˜™ËXØ\™›Ü™\‹X›Ü™\ˆ^Y›Ü™YÜ›Ý[™ŠKÚ[™[ŽšK›X™[KKšY
JW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^›^XÛÛØ\LÈ‹Ú[™[Ž–Ö‹›[™ÝOOL	‰šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ^XÙ[\ˆKLLˆ‹Ú[™[Ž–ÚKšœÞ
‰ÜÚ^™NŒÌ‹Û\ÜÓ˜[YNˆ›^X]]È^[]]YY›Ü™YÜ›Ý[™ÍX‹LÈŸJKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌMH^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Žˆ´'ô/´.´,4/t-t`ˆ4/´`´-ôbô,´/´,‹ˆ4%4/´,t,4,´c4`´-H4,´`4`ôaô/t`ôcˆ4.4.ô.4.4/4/ô/´`4`´.4`4`ô.t`´-KˆŸJW_JKKšœÞ
YKØÚ[™[Ž–‹›X\
OOšKšœÞ
ÙKÜ™]šY]ÎšKÛ”™\N’_KKšY
J_JW_JW_JW_JKKšœÞ
ÙKÛÜ[ŽšÛÛÜÙNŠ
OO™ÊLJKÛ”ÝX›Z]™Ù_JKKšœÞ
—ÙKÛÜ[ŽžKÛÛÜÙNŠ
OOšŠLJKÛ’[\ÜžY_JKKšœÞ
WÙKÜ™]šY]Î’Ü[ŽˆHRÛÛÜÙNŠ
OO’J[
KÛ”Ø]™N˜ÙK›Ùš[N›™_JW_J_XÛÛœÝNO^Ù\]Z\Y[‘‹ÝY\ÝÎ“ËÝY™Žžœ‹Ü\˜][ÛœÎ’XËš[˜[˜ÙN‰ËXZ[[˜[˜ÙNš	YÚY[™Nž	Y˜][˜™ßK—ÙO^ÛÝÎˆ´%4dtb4-t,´/ˆ‹YY][Nˆ´(t`4-t-4/t-H‹YÚˆ´%4/´`4/´,ô/ˆŸNÙ[˜Ý[ÛˆWÙJ
^Ü™]\›ˆKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆœMˆKLMˆ›^›^XÛÛ][\ËXÙ[\ˆ^XÙ[\ˆ‹Ú[™[Ž–ÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆËLMLM›Ý[™YVÌNH™Ë[]]Y›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆX‹M‹Ú[™[ŽšKšœÞ
TKÜÚ^™NŒÛ\ÜÓ˜[YNˆ^[]]YY›Ü™YÜ›Ý[™ŸJ_JKKšœÞ
šÈ‹ØÛ\ÜÓ˜[YNˆ^VÌNH›ÛX›Û^Y›Ü™YÜ›Ý[™X‹Lˆ‹Ú[™[Žˆ´'ô/´.´,4/t-t`ˆ4/ô.ô,4/t,ŸJKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌMH^[]]YY›Ü™YÜ›Ý[™X^]ËVÌŒHXY[™Ë\™[^Y‹Ú[™[Žˆ´%ô,4/ô`ô`t`´.4`´-HRKt-4.4,4,ô/t/´`t`´.4.´`È4/t,4,´.´.ô,4-4.´-H0ªô$4/t,4.ô.4-ð®È8 %4-ô-4-t`tc4/ô/´cô,´.4`´`tcÈ4/ô.ô,4/H4.4-È4.´/´/t.´`4-t`´/tbôaH4-4-t.t`t`´,´.4.KˆŸJW_J_Y[˜Ý[Ûˆ—ÙJÝ\ÚÎ™KÛÞXÛTÝ]\ÎJ^ØÛÛœÝÛ‹—OTË\ÙTÝ]JLJKËWOX

KÏSÓVÙKœš[Üš]WOÏÓÓK›YY][KU[ÙVÙKœÝ]\×KOZNVÙK˜Ø]YÛÜžWOÏÚNK™Y˜][YKœÝ]\ÏOOH˜ÛÛ\]YŽÜ™]\›ˆKšœÞÊË™]‹Û^[Ý]ˆL[š]X[žÛÜXÚ]NŒNŒLK[š[X]NžÛÜXÚ]NŒKNŒKÛ\ÜÓ˜[YN–
˜™XØ\™Ý™\™›ÝËZY[ˆ‹	‰ˆ›ÜXÚ]KMMHŠKÚ[™[Ž–ÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆšLHËY[‹Ý[NžØ˜XÚÙÜ›Ý[™œËœÝš\__JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆœMLËH‹LËH‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\Ë\Ý\Ø\L‹H‹Ú[™[Ž–ÚKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎÛ\ÜÓ˜[YNˆËMÈMÈ›Ý[™YY[›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆ›^\Úš[šËL]LH›Ü™\‹Lˆ˜[œÚ][Û‹XÛÛÜœÈ‹Ý[NžØ˜XÚÙÜ›Ý[™™ÈˆÌŒÍMQHŽˆ˜[œÜ\™[‹›Ü™\ÛÛÜŽ™ÈˆÌŒÍMQHŽˆœ™Ø˜JMMŒËN
HŸKÚ[™[Ž™	‰šKšœÞ
‹ÜÚ^™NŒLËÛ\ÜÓ˜[YNˆ^]Ú]H‹Ý›ÚÙUÚYŒßJ_JKKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OOœŠOˆYŠKÛ\ÜÓ˜[YNˆ™›^LHZ[‹]ËL^[Y‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆØ\LˆX‹LH‹Ú[™[Ž–ÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YN–
ËMHMH›Ý[™YY[›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆ›^\Úš[šËL‹Ë˜™ÊKÚ[™[ŽšKšœÞ
KÜÚ^™NŒLÝ[NžØÛÛÜŽœË˜ÛÛÜŸ_J_JKKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ^VÌLH›ÛX›XÚÈ\\˜Ø\ÙH˜XÚÚ[™Ë]ÚY\ˆ‹Ý[NžØÛÛÜŽœË˜ÛÛÜŸKÚ[™[ŽœË›X™[JKKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YN–
›[X]]È^VÌLH›ÛX›ÛLˆKLH›Ý[™YY[‹˜™Ë˜ÛÛÜŠKÚ[™[Ž›œÚÜX™[JW_JKKšœÞ
œ‹ØÛ\ÜÓ˜[YN–
^VÌMH›Û\Ù[ZX›Û^Y›Ü™YÜ›Ý[™XY[™Ë\ÛYÈ‹	‰ˆ›[™K]›ÝYÚ^[]]YY›Ü™YÜ›Ý[™ŠKÚ[™[Ž™K]_JW_JKÚKšœÞ
–ÜÚ^™NŒMÛ\ÜÓ˜[YNˆ^[]]YY›Ü™YÜ›Ý[™Í›^\Úš[šËL]LHŸJNšKšœÞ
ÙËÜÚ^™NŒMÛ\ÜÓ˜[YNˆ^[]]YY›Ü™YÜ›Ý[™Í›^\Úš[šËL]LHŸJW_JKKšœÞ
YKØÚ[™[Ž›‰‰šKšœÞ
Ë™]‹Ú[š]X[žÛÜXÚ]NŒZYÚŒK[š[X]NžÛÜXÚ]NŒKZYÚˆ˜]]ÈŸK^]žÛÜXÚ]NŒZYÚŒK˜[œÚ][ÛŽžÙ\˜][ÛŽ‹Œ‹X\ÙN–ËŒŒ‹KŒÍ‹W_KÛ\ÜÓ˜[YNˆ›Ý™\™›ÝËZY[ˆ‹Ú[™[ŽšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆœNHLÈ›^›^XÛÛØ\L‹H‹Ú[™[Ž–ÙKš[\XÝ	‰šKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLœH^[]]YY›Ü™YÜ›Ý[™XY[™Ë\™[^Y‹Ú[™[Ž™Kš[\XÝJKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^›^]Ü˜\Ø\LÈ‹Ú[™[Ž–ÙK™\Ý[X]Y[YI‰šKšœÞÊœÜ[ˆ‹ØÛ\ÜÓ˜[YNˆš[›[™KY›^][\ËXÙ[\ˆØ\LH^VÌL\H^[]]YY›Ü™YÜ›Ý[™ÍÌ‹Ú[™[Ž–ÚKšœÞ
KÜÚ^™NŒL_JKˆ‹K™\Ý[X]Y[YW_JKK˜ÛÜÝY\‰‰šKšœÞÊœÜ[ˆ‹ØÛ\ÜÓ˜[YNˆš[›[™KY›^][\ËXÙ[\ˆØ\LH^VÌL\H^[]]YY›Ü™YÜ›Ý[™ÍÌ‹Ú[™[Ž–ÚKšœÞ
	ËÜÚ^™NŒL_JKˆ‹—ÙVÙK˜ÛÜÝY\—OÏÙK˜ÛÜÝY\—_JKKœ™XÛÛ[Y[™Y›ÛI‰šKšœÞÊœÜ[ˆ‹ØÛ\ÜÓ˜[YNˆš[›[™KY›^][\ËXÙ[\ˆØ\LH^VÌL\H^[]]YY›Ü™YÜ›Ý[™ÍÌ‹Ú[™[Ž–ÚKšœÞ
˜ËÜÚ^™NŒL_JKˆ‹Kœ™XÛÛ[Y[™Y›ÛW_JW_JKK™^XÝY[\XÝ	‰šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆœ›Ý[™YVÌLH™ËVÈÌŒÍMQWKÎLÈKLˆ‹Ú[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌL\H›ÛX›Û\\˜Ø\ÙH˜XÚÚ[™Ë]ÚY\ˆ^VÈÌMLÍWHX‹LH‹Ú[™[Žˆ´'´-´.4-4,4-t/4bô.H4`4-t-ô`ô.ôc4`´,4`ˆŸJKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLœH^Y›Ü™YÜ›Ý[™XY[™Ë\™[^Y‹Ú[™[Ž™K™^XÝY[\XÝJW_JKK˜Ø]YÛÜžOOOH™\]Z\Y[‰‰™K™\]Z\Y[Y	‰šKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎ™OžÙ‹œÝÜ›ÜYØ][ÛŠ
KJÙš[˜[˜ÙOÜ™\Z\‘\]Z\Y[YIÙK™\]Z\Y[YX
_KÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆØ\LKHËY[KL‹H›Ý[™YVÌLH™Ë\š[X\žKÌL^\š[X\žH^VÌL‹\H›Û\Ù[ZX›ÛÝ™\Ž˜™Ë\š[X\žKÌMˆXÝ]™NœØØ[KVÌŽNH˜[œÚ][Û‹X[‹Ú[™[Ž–ÚKšœÞ
‹ÜÚ^™NŒLßJK´%ô,4a4.4.´`t.4`4/´,´,4`´c4`4-t/4/´/t`ˆ0ªÈ‹K™\]Z\Y[˜[YK°®È—_JW_J_J_JW_JW_J_XÛÛœÝLVÈ››ÝÜÝ\Y‹š[—Ü›ÙÜ™\ÜÈ‹˜ÛÛ\]Y—NÙ[˜Ý[ÛˆÙJ
^ØÛÛœÝÜ[œÎ™K\ÚÜÎ\]U\ÚÎ›ŸOTÊ
KYK™š[™
OOKœÝ]\ÈOOHœ™\ÛÛ™YŠOÏÙVÌOÏÛ[ÏVË‹‹œÝ™š[\ŠOOœ‹\ÚÒYËš[˜ÛY\ÊKšY
JN–×WKœÛÜ

K
OOžØÛÛœÝ^ØÜš]XØ[ŒYÚŒKYY][NŒ‹ÝÎŒßNÜ™]\›Š–ÝKœš[Üš]WOÏÌÊKJ–Ùœš[Üš]WOÏÌÊ_JNÙ[˜Ý[Ûˆ
J^ØÛÛœÝUL‹š[™^ÙŠKœÝ]\ÊKUL–Ê
ÌJIUL‹›[™ÝNÛŠKšYÜÝ]\Î™‹ÛÛ\]Y]™OOH˜ÛÛ\]YÛ™]È]J
KÒTÓÔÝš[™Ê
N›ÚYJ_\™]\›ˆKšœÞ
ÜÚÝÐ›ÝÛS˜]ŽˆLÚ[™[ŽšKšœÞÊ	KØÛ\ÜÓ˜[YNˆœL‹LŽ‹Ú[™[Ž–ÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆœÝXÚÞHÜL‹LŒ™ËX˜XÚÙÜ›Ý[™ÎMH˜XÚÙ›ÜX›\‹[Y›Ü™\‹Xˆ›Ü™\‹X›Ü™\‹ÍŒMˆKM‹Ú[™[ŽšKšœÞ
šH‹ØÛ\ÜÓ˜[YNˆ^VÌMÜH›ÛX›XÚÈ^Y›Ü™YÜ›Ý[™˜XÚÚ[™Ë]YÚ‹Ú[™[Žˆ´'ô.ô,4/H4-4-t.t`t`´,´.4.HŸJ_JKË›[™ÝOOLÚKšœÞ
WÙKßJNšKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^›^XÛÛØ\LÈMˆM‹Ú[™[ŽœË›X\
OOšKšœÞ
—ÙKÝ\ÚÎKÛÞXÛTÝ]\ÎŠ
OO›
J_KKšY
J_JW_J_J_Y[˜Ý[Ûˆ×ÙJ
^Ü™]\›ˆ\[ÙˆÜž\ÏH‰‰˜Üž\Ëœ˜[™ÛUURQØÜž\Ëœ˜[™ÛUURQ

N“X]œ˜[™ÛJ
KÔÝš[™ÊÍŠKœÛXÙJŠ_Y[˜Ý[ÛˆÒ
J^Ü™]\›ˆ™]È›ÛZ\ÙJ
ŠOOžØÛÛœÝ[™]Èš[T™XY\ŽÜ‹›Û›ØYJ
OO
‹œ™\Ý[
K‹›Û™\œ›Ü[‹‹œ™XY\Ñ]UT“
J_J_Y[˜Ý[Ûˆ×ÙJJ^Ü™]\›ˆ™]È›ÛZ\ÙJ
ŠOOžØÛÛœÝ[™]Èš[T™XY\ŽÜ‹›Û›ØYJ
OO
‹œ™\Ý[
K‹›Û™\œ›Ü[‹‹œ™XY\Õ^
J_J_XÛÛœÝ[Ï^Ú[š]X[žÞˆŒL	H‹ÜXÚ]NŒK[š[X]NžÞŒÜXÚ]NŒK˜[œÚ][ÛŽžÙ\˜][ÛŽ‹ŒËX\ÙN–ËŒŒ‹KŒÍ‹W__K^]žÞˆŒL	H‹ÜXÚ]NŒ˜[œÚ][ÛŽžÙ\˜][ÛŽ‹Œ‹X\ÙNˆ™X\ÙR[ˆŸ__K×ÙO^Ú[š]X[žÛÜXÚ]NŒK[š[X]NžÛÜXÚ]NŒ_K^]žÛÜXÚ]NŒ_KÎO^ØÜš]XØ[žÛX™[ˆ´&´`4.4`´.4aô/t/ˆ‹Ýš\NˆˆÑQ‹^ÛÛÜŽˆˆÑÌŒˆ‹™Îˆœ™Ø˜JŒŒÎÎŒL
HŸKYÚžÛX™[ˆ´$´bô`t/´.´.4.H‹Ýš\NˆˆÑŽMÌÌMˆ‹^ÛÛÜŽˆˆÑPMNÈ‹™Îˆœ™Ø˜JŒÍL‹ŒL
HŸKYY][NžÛX™[ˆ´(t`4-t-4/t.4.H‹Ýš\NˆˆÑNQLˆ‹^ÛÛÜŽˆˆÑMÍÌˆ‹™Îˆœ™Ø˜JŒMËLNK‹ŒL
HŸKÝÎžÛX™[ˆ´'t.4-ô.´.4.H‹Ýš\NˆˆÌŒÍMQH‹^ÛÛÜŽˆˆÌMLÍH‹™Îˆœ™Ø˜JŒ‹MŒËÍŒL
HŸ_KWÙOVÞÚYˆ›ÚXÙH‹XÛÛŽžYËX™[ˆ´$ô/´.ô/´`H‹\ØÎˆ´'ô`4/´-4.4.´`´`ô.t`´-H4`t.4`´`ô,4a´.4cˆ‹ÛÛÜŽˆˆÍPPÑPˆ‹™Îˆœ™Ø˜JLKL‹ŒÍKŒL
H‹XÛÛÛÛÜŽˆˆÍPPÑPˆŸKÚYˆ^‹XÛÛŽžTKX™[ˆ´(´-t.´`t`ˆ‹\ØÎˆ´'´/ô.4b4.4`´-H4/ô.4`tc4/4-t/t/t/ˆ‹ÛÛÜŽˆˆÌPMQNH‹™Îˆœ™Ø˜JMMKŒÌËŒL
H‹XÛÛÛÛÜŽˆˆÌPMQNHŸKÚYˆœÝÈ‹XÛÛŽœØKX™[ˆ´)4/´`´/ˆ‹\ØÎˆ´(ta4/´`´/´,ô`4,4a4.4`4`ô.t`´-H4/ô`4/´,t.ô-t/4`È‹ÛÛÜŽˆˆÌŒÍMQH‹™Îˆœ™Ø˜JÍNMËMŒL
H‹XÛÛÛÛÜŽˆˆÌMLÍHŸKÚYˆ™ØÝ[Y[‹XÛÛŽ™ËX™[ˆ´%4/´.´`ô/4-t/t`ˆ‹\ØÎˆ´'ô`4.4.´`4-t/ô.4`´-H4a4,4.t.È4.4.ô.4,4.´`ˆ‹ÛÛÜŽˆˆÑNQLˆ‹™Îˆœ™Ø˜JKMNLKŒL
H‹XÛÛÛÛÜŽˆˆÑMÍÌˆŸWNÙ[˜Ý[ÛˆÎJÜ›ÛN™KÛÛ[J^ØÛÛœÝYOOOH\Ù\ˆŽÜ™]\›ˆKšœÞÊË™]‹Ú[š]X[žÛÜXÚ]NŒNŽK[š[X]NžÛÜXÚ]NŒKNŒK˜[œÚ][ÛŽžÙ\˜][ÛŽ‹ŒŽX\ÙN–ËŒŒ‹KŒÍ‹W_KÛ\ÜÓ˜[YN–
™›^X‹M‹Èš\ÝYžKY[™Žˆš\ÝYžK\Ý\ŠKÚ[™[Ž–È[‰‰šKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆËNN›Ý[™YY[™Ë\š[X\žKÌL›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆ\‹L‹H›^\Úš[šËL]LH‹Ú[™[ŽšKšœÞ
‹ÜÚ^™NŒMÛ\ÜÓ˜[YNˆ^\š[X\žHŸJ_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YN–
›X^]ËVÎ‰WHMKLÈ^VÌMHXY[™Ë\™[^Y›Û[YY][H‹È˜™Ë\š[X\žH^]Ú]H›Ý[™YVÌŒH›Ý[™YXœ‹VÍœHŽˆ˜™ËXØ\™›Ü™\ˆ›Ü™\‹X›Ü™\ˆ^Y›Ü™YÜ›Ý[™›Ý[™YVÌŒH›Ý[™YX›VÍœHÚYÝËVÝ˜\ŠK\ÚYÝËXØ\™
WHŠKÚ[™[ŽJW_J_Y[˜Ý[ÛˆÙJÛÝ]]\N™K^˜XÝYJ^ØÛÛœÝ\ÎVÝœš[Üš]WOÏÜÎK›YY][KYOOOH™]™[ŽÛ]OHˆ‹Ï[[Ü™]\›ˆ‰‰˜Ø]YÛÜžI‰“ØVÝ˜Ø]YÛÜžWOÊOSØVÝ˜Ø]YÛÜžWK›X™[ÏSØVÝ˜Ø]YÛÜžWKšXÛÛŠNˆ\‰‰\I‰šØVÝ\WI‰ŠOZØVÝ\WK›X™[ÏZØVÝ\WKšXÛÛŠKKšœÞÊË™]‹Ú[š]X[žÛÜXÚ]NŒNŒLK[š[X]NžÛÜXÚ]NŒKNŒK˜[œÚ][ÛŽžÙ[^N‹ŒL‹\˜][ÛŽ‹ŒßKÛ\ÜÓ˜[YNˆ˜™XØ\™Ý™\™›ÝËZY[ˆ‹Ú[™[Ž–ÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆšLHËY[‹Ý[NžØ˜XÚÙÜ›Ý[™ÛÛÜŽ›‹œÝš\__JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆœMHKM‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆØ\LˆX‹LÈ›^]Ü˜\‹Ú[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ^VÌLH›ÛX›XÚÈ\\˜Ø\ÙH˜XÚÚ[™ËVÌŒL™[WHLˆKLH›Ý[™YY[‹Ý[NžØ˜XÚÙÜ›Ý[™ÛÛÜŽ›‹˜™ËÛÛÜŽ›‹^ÛÛÜŸKÚ[™[ŽœÈ´(t/´,tbô`´.4-HŽˆ´%4-t.ô/ˆŸJKÉ‰˜I‰šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆØ\LKH‹Ú[™[Ž–ÚKšœÞ
ËÜÚ^™NŒL‹Û\ÜÓ˜[YNˆ^[]]YY›Ü™YÜ›Ý[™ŸJKKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ^VÌLœH›Û\Ù[ZX›Û^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Ž˜_JW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ›[X]]È›^][\ËXÙ[\ˆØ\LKH‹Ú[™[Ž–ÚKšœÞ
™ËÜÚ^™NŒLKÝ[NžØÛÛÜŽ›‹^ÛÛÜŸ_JKKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ^VÌL\H›ÛX›XÚÈ‹Ý[NžØÛÛÜŽ›‹^ÛÛÜŸKÚ[™[Ž›‹›X™[JW_JW_JKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌMÜH›ÛX›XÚÈ^Y›Ü™YÜ›Ý[™˜XÚÚ[™Ë]YÚX‹LˆXY[™Ë\ÛYÈ‹Ú[™[Ž]_JKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH^[]]YY›Ü™YÜ›Ý[™XY[™Ë\™[^Y‹Ú[™[Ž™\ØÜš\[ÛŸJK
œ™\ÜÛœÚX›_™YQ]_™^˜QšY[
I‰šKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ›]MLÈ›Ü™\‹]›Ü™\‹X›Ü™\‹ÍL›^›^XÛÛØ\LKH‹Ú[™[Ž–Ýœ™\ÜÛœÚX›I‰šKšœÞÊœ‹ØÛ\ÜÓ˜[YNˆ^VÌLœH^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ™›Û\Ù[ZX›Û^Y›Ü™YÜ›Ý[™ÍŒ‹Ú[™[Žˆ´'´`´,´-t`´`t`´,´-t/t/tbô.NˆŸJKˆ‹œ™\ÜÛœÚX›W_JK™YQ]I‰šKšœÞÊœ‹ØÛ\ÜÓ˜[YNˆ^VÌLœH^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ™›Û\Ù[ZX›Û^Y›Ü™YÜ›Ý[™ÍŒ‹Ú[™[Žˆ´%4-t-4.ô,4.t/NˆŸJKˆ‹™]È]J™YQ]JKÓØØ[Q]TÝš[™ÊœKT•H‹Ù^Nˆ›[Y\šXÈ‹[Ûˆ›Û™ÈŸJW_JK™^˜QšY[	‰šKšœÞÊœ‹ØÛ\ÜÓ˜[YNˆ^VÌLœH^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ™›Û\Ù[ZX›Û^Y›Ü™YÜ›Ý[™ÍŒ‹Ú[™[Žˆ´%4-t`´,4.ô.ˆŸJKˆ‹™^˜QšY[_JW_JW_JW_J_Y[˜Ý[ÛˆWÙJ
^Ü™]\›ˆKšœÞ
Ë™]‹Ë‹‹’×ÙKÛ\ÜÓ˜[YNˆ™›^›^XÛÛZ[‹ZVÌLšH‹Ú[™[ŽšKšœÞÊ	KØÛ\ÜÓ˜[YNˆ™›^›^XÛÛ›^LH][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆMˆKLMˆ‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆËY[›Ý[™YVÌŽH™[]]™HÝ™\™›ÝËZY[ˆX‹N‹Ý[NžØ˜XÚÙÜ›Ý[™ˆ›[™X\‹YÜ˜YY[
MŒYËÌPLQŒÎ	KÌMŒPŒ‘HMIKÌQML	JH‹ZYÚŒŒŒKÚ[™[Ž–ÚKšœÞ
Ë™]‹ØÛ\ÜÓ˜[YNˆ˜XœÛÛ]H[œÙ]L‹[š[X]NžØ˜XÚÙÜ›Ý[™ÜÚ][ÛŽ–ÈŒŒ	H‹‹LŒ	H—_K˜[œÚ][ÛŽžÜ™\X]ŒKÌ\˜][ÛŽŒ‹X\ÙNˆ›[™X\ˆŸKÝ[NžØ˜XÚÙÜ›Ý[™ˆ›[™X\‹YÜ˜YY[
LYË˜[œÜ\™[™Ø˜JLKL‹ŒÍKŒMŠK˜[œÜ\™[
H‹˜XÚÙÜ›Ý[™Ú^™NˆŒŒ	HL	HŸ_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜XœÛÛ]H[œÙ]L›^›^XÛÛ][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆØ\M‹Ú[™[Ž–ÚKšœÞ
Ë™]‹Ø[š[X]NžÜØØ[N–ÌKKŒL‹WKÜXÚ]N–ËËK×_K˜[œÚ][ÛŽžÜ™\X]ŒKÌ\˜][ÛŽŒ‹X\ÙNˆ™X\ÙR[“Ý]ŸKÛ\ÜÓ˜[YNˆËLMˆLMˆ›Ý[™YVÌŒH™Ë]Ú]KÌL›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆ‹Ú[™[ŽšKšœÞ
‹ÜÚ^™NŒŽÛ\ÜÓ˜[YNˆ^]Ú]KÎŸJ_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ^XÙ[\ˆM‹Ú[™[Ž–ÚKšœÞ
ËœØ[š[X]NžÛÜXÚ]N–Ë‹K—_K˜[œÚ][ÛŽžÜ™\X]ŒKÌ\˜][ÛŽŒKŽX\ÙNˆ™X\ÙR[“Ý]ŸKÛ\ÜÓ˜[YNˆ^VÌM\H›ÛX›Û^]Ú]KÎ‹Ú[™[Žˆ˜\‘ØÝÜˆ4,4/t,4.ô.4-ô.4`4`ô-t`ˆ4`t.4`´`ô,4a´.4c¸ )ˆŸJKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLœH^]Ú]KÍ]LH‹Ú[™[Žˆ´'´/ô`4-t-4-t.ôcôcˆ4.´,4`´-t,ô/´`4.4cˆ4.4/ô`4.4/´`4.4`´-t`ˆŸJW_JW_JW_JKÍÍKMKKWK›X\

K
OOšKšœÞ
Ë™]‹Ø[š[X]NžÛÜXÚ]N–ËŒÍKËŒÍW_K˜[œÚ][ÛŽžÜ™\X]ŒKÌ\˜][ÛŽŒK‹[^N
‹ŒNX\ÙNˆ™X\ÙR[“Ý]ŸKÛ\ÜÓ˜[YNˆšLÈ™Ë[]]Y›Ý[™YY[X‹LÈ‹Ý[NžÝÚY˜	Ù_IX_K
JW_J_Kœ›ØÙ\ÜÚ[™ÈŠ_Y[˜Ý[Ûˆ—ÙJÛÛ”ÝX›Z]™KÛ˜XÚÎJ^ØÛÛœÝÛ‹—OTË\ÙTÝ]JˆŠKØK×OTË\ÙTÝ]JLJKÛWOTË\ÙTÝ]JL
KÙ—OTË\ÙTÝ]JLJKOTË\ÙT™YŠ[
NÔË\ÙQY™™XÝ


OOžØÛÛœÝÏ]Ú[™ÝË”ÜYXÚ™XÛÙÛš][ÛŸÚ[™ÝËÙXšÚ]ÜYXÚ™XÛÙÛš][ÛŽÚYŠYÊ^ÝJLJNÜ™]\›ŸXÛÛœÝO[™]ÈÎÜ™]\›ˆK›[™ÏHœKT•H‹K˜ÛÛ[[Ý\ÏHLKš[\š[T™\Ý[ÏHLK›Ûœ™\Ý[ZOžØÛÛœÝP\œ˜^K™œ›ÛJ‹œ™\Ý[ÊK›X\
O˜–ÌK˜[œØÜš\
Kš›Ú[ŠˆŠNÜŠŠ_KK›Û™\œ›ÜJ
OOžÜÊLJ_KK›Û™[™J
OOžÜÊLJ_KK˜Ý\œ™[^K

OOžÞK˜X›Ü

__K×JNÙ[˜Ý[Ûˆ

^ÛK˜Ý\œ™[	‰ŠOÊK˜Ý\œ™[œÝÜ

KÊLJJNŠŠˆŠKK˜Ý\œ™[œÝ\

KÊL
JJ_\™]\›ˆ[ÚKšœÞ
Ë™]‹Ë‹‹‘[ËÛ\ÜÓ˜[YNˆ™›^›^XÛÛZ[‹ZVÌLšH‹Ú[™[ŽšKšœÞÊ	KØÛ\ÜÓ˜[YNˆ™›^›^XÛÛ›^LHMH‹LL‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆØ\LÈMˆX‹Mˆ‹Ú[™[Ž–ÚKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎ˜\šXK[X™[Žˆ´'t,4-ô,4-‹Û\ÜÓ˜[YNˆËNHNH›Ý[™YY[™ËXØ\™›Ü™\ˆ›Ü™\‹X›Ü™\ˆ›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆXÝ]™NœØØ[KNMH‹Ú[™[ŽšKšœÞ
›‹ÜÚ^™NŒNJ_JKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌMÜH›ÛX›XÚÈ˜XÚÚ[™Ë]YÚ‹Ú[™[Žˆ´$ô/´.ô/´`H8¡¤ˆ4(´-t.´`t`ˆŸJW_JK[	‰šKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ›^MˆX‹MMKLÈ›Ý[™YLž™ËVÈÑNQL—KÌL›Ü™\ˆ›Ü™\‹VÈÑNQL—KÌÌ‹Ú[™[ŽšKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH^VÈÑMÍÌ—H›Û[YY][H‹Ú[™[Žˆ´%4.4.´`´/´,´.´,4/t-t-4/´`t`´`ô/ô/t,4,ˆ4ct`´/´/4,t`4,4`ô-ô-t`4-Kˆ4't,4/ô.4b4.4`´-H4`t.4`´`ô,4a´.4cˆ4,´`4`ôaô/t`ôcŽˆŸJ_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆœMˆ›^LH‹Ú[™[ŽšKšœÞ
^\™XH‹Ý˜[YN›‹ÛÚ[™ÙN™ÏOœŠË\™Ù]˜[YJKXÙZÛ\Žˆ´'´/ô.4b4.4`´-H4`t.4`´`ô,4a´.4c¸ )ˆ‹›ÝÜÎ‹]]Ñ›ØÝ\ÎˆLÛ\ÜÓ˜[YNˆËY[™ËXØ\™›Ü™\ˆ›Ü™\‹X›Ü™\ˆ›Ý[™YLž^VÌM\H›Û[YY][H^Y›Ü™YÜ›Ý[™MKLËHXÙZÛ\Ž^[]]YY›Ü™YÜ›Ý[™Í›ØÝ\Î›Ý][™K[›Û™H›ØÝ\Î˜›Ü™\‹\š[X\žH›ØÝ\Îœš[™ËLˆ›ØÝ\Îœš[™Ë\š[X\žKÌLˆ˜[œÚ][Û‹X[™\Ú^™K[›Û™HXY[™Ë\™[^YŸJ_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆœMˆ]M‹Ú[™[ŽšKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OO™JŠK\ØX›Yˆ[‹š[J
KÛ\ÜÓ˜[YN–
ËY[LM›Ý[™YLž^VÌMœH›ÛX›Û›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆØ\Lˆ˜[œÚ][Û‹X[‹‹š[J
OÈ˜™Ë\š[X\žH^]Ú]HÚYÝËVÌÍÌŒÜ™Ø˜JLKL‹ŒÍKŒÌ
WHXÝ]™NœØØ[KVÌŽNHŽˆ˜™Ë[]]Y^[]]YY›Ü™YÜ›Ý[™Ý\œÛÜ‹[›ÝX[ÝÙYŠKÚ[™[Ž–È´'´`´/ô`4,4,´.4`´c‹KšœÞ
ËÜÚ^™NŒMŸJW_J_JW_J_K›ÚXÙKY˜[˜XÚÈŠNšKšœÞ
Ë™]‹Ë‹‹‘[ËÛ\ÜÓ˜[YNˆ™›^›^XÛÛZ[‹ZVÌLšH‹Ú[™[ŽšKšœÞÊ	KØÛ\ÜÓ˜[YNˆ™›^›^XÛÛ›^LHMH‹LL‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆ\ÝYžKX™]ÙY[ˆMˆX‹Mˆ‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆØ\LÈ‹Ú[™[Ž–ÚKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎ˜\šXK[X™[Žˆ´'t,4-ô,4-‹Û\ÜÓ˜[YNˆËNHNH›Ý[™YY[™ËXØ\™›Ü™\ˆ›Ü™\‹X›Ü™\ˆ›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆXÝ]™NœØØ[KNMH‹Ú[™[ŽšKšœÞ
›‹ÜÚ^™NŒNJ_JKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌMÜH›ÛX›XÚÈ˜XÚÚ[™Ë]YÚ‹Ú[™[Žˆ´$ô/´.ô/´`HŸJW_JKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OO™ŠL
KÛ\ÜÓ˜[YNˆ^VÌLœH›Û\Ù[ZX›Û^[]]YY›Ü™YÜ›Ý[™Ý™\Ž^Y›Ü™YÜ›Ý[™˜[œÚ][Û‹XÛÛÜœÈLˆKLH‹Ú[™[Žˆ´(´-t.´`t`´/´/ŸJW_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ›^Mˆ›^LHZ[‹ZVÌLŒHX^ZVÌŒHÝ™\™›ÝË^KX]]È›Ý[™YLž›Ü™\ˆ›Ü™\‹X›Ü™\ˆ™ËXØ\™MKLËHX‹Mˆ‹Ú[™[Ž›ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌM\H›Û[YY][H^Y›Ü™YÜ›Ý[™XY[™Ë\™[^Y‹Ú[™[Ž›ŸJNšKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌMH^[]]YY›Ü™YÜ›Ý[™ÍL][XÈ‹Ú[™[Žˆ´(´-t.´`t`ˆ4/ô/´cô,´.4`´`tcÈ4-ô-4-t`tc8 )ˆŸJ_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^›^XÛÛ][\ËXÙ[\ˆØ\MX‹N‹Ú[™[Ž–ÚKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎšÛ\ÜÓ˜[YN–
ËLL›Ý[™YY[›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆ˜[œÚ][Û‹X[XÝ]™NœØØ[KNMHÚYÝË^‹OÈ˜™ËY\ÝXÝ]™HÚYÝËVÌÌÌÎÜ™Ø˜JŒÎKŽŽŒN
KÎÌÌœÜ™Ø˜JŒÎKŽŽ
WHŽˆ˜™Ë\š[X\žHÚYÝËVÌÎÌÌœÜ™Ø˜JLKL‹ŒÍK
WHŠKÚ[™[Ž˜OÚKšœÞ
Ë™]‹Ø[š[X]NžÜØØ[N–ÌKŽKW_K˜[œÚ][ÛŽžÜ™\X]ŒKÌ\˜][ÛŽ‹ŽKÚ[™[ŽšKšœÞ
	ÜÚ^™NŒÌ‹Û\ÜÓ˜[YNˆ^]Ú]HŸJ_JNšKšœÞ
YËÜÚ^™NŒÌ‹Û\ÜÓ˜[YNˆ^]Ú]HŸJ_JKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH›Û\Ù[ZX›Û^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Ž˜OÈ´$ô/´,´/´`4.4`´-x )ˆ4/t,4-´/4.4`´-H4-tbtdH4`4,4-Ë4aô`´/´,tbÈ4/´`t`´,4/t/´,´.4`´cŽˆ´'t,4-´/4.4`´-K4aô`´/´,tbÈ4,ô/´,´/´`4.4`´cŸJKI‰šKšœÞ
Ë™]‹ØÛ\ÜÓ˜[YNˆ™›^Ø\LH][\ËXÙ[\ˆ‹Ú[™[Ž–ÌK‹ËWK›X\
ÏOšKšœÞ
Ë™]‹ØÛ\ÜÓ˜[YNˆËLH›Ý[™YY[™ËY\ÝXÝ]™H‹[š[X]NžÚZYÚ–Í‹Œ—_K˜[œÚ][ÛŽžÜ™\X]ŒKÌ\˜][ÛŽ‹‹[^N™Ê‹Œ__KÊJ_JW_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆœMˆ‹Ú[™[ŽšKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OO™JŠK\ØX›Yˆ[‹š[J
KÛ\ÜÓ˜[YN–
ËY[LM›Ý[™YLž^VÌMœH›ÛX›Û›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆØ\Lˆ˜[œÚ][Û‹X[‹‹š[J
OÈ˜™Ë\š[X\žH^]Ú]HÚYÝËVÌÍÌŒÜ™Ø˜JLKL‹ŒÍKŒÌ
WHXÝ]™NœØØ[KVÌŽNHŽˆ˜™Ë[]]Y^[]]YY›Ü™YÜ›Ý[™Ý\œÛÜ‹[›ÝX[ÝÙYŠKÚ[™[Ž–È´'´`´/ô`4,4,´.4`´c‹KšœÞ
ËÜÚ^™NŒMŸJW_J_JW_J_K›ÚXÙHŠ_Y[˜Ý[Ûˆ—ÙJÛÛ”ÝX›Z]™KÛ˜XÚÎJ^ØÛÛœÝÛ‹—OTË\ÙTÝ]JˆŠNÜ™]\›ˆKšœÞ
Ë™]‹Ë‹‹‘[ËÛ\ÜÓ˜[YNˆ™›^›^XÛÛZ[‹ZVÌLšH‹Ú[™[ŽšKšœÞÊ	KØÛ\ÜÓ˜[YNˆ™›^›^XÛÛ›^LHMH‹LL‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆØ\LÈMˆX‹Mˆ‹Ú[™[Ž–ÚKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎ˜\šXK[X™[Žˆ´'t,4-ô,4-‹Û\ÜÓ˜[YNˆËNHNH›Ý[™YY[™ËXØ\™›Ü™\ˆ›Ü™\‹X›Ü™\ˆ›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆXÝ]™NœØØ[KNMH‹Ú[™[ŽšKšœÞ
›‹ÜÚ^™NŒNJ_JKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌMÜH›ÛX›XÚÈ˜XÚÚ[™Ë]YÚ‹Ú[™[Žˆ´)ô`´/ˆ4/ô`4/´.4-ô/´b4.ô/ÈŸJW_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆœMˆ›^LH›^›^XÛÛ‹Ú[™[ŽšKšœÞ
^\™XH‹Ý˜[YN›‹ÛÚ[™ÙN˜OOœŠK\™Ù]˜[YJKXÙZÛ\Žˆ´'´/ô.4b4.4`´-H4`t.4`´`ô,4a´.4cˆ4.´`4,4`´.´/ˆ4.4.ô.4/ô/´-4`4/´,t/t/ˆ8 %RH4`4,4-ô,t-t`4dt`´`tcÈ4`t,4/ˆ4'4/´-´/t/ˆ4/t,4/ô.4`t,4`´c4.´,4.ˆ4`ô,ô/´-4/t/‹ˆ‹›ÝÜÎË]]Ñ›ØÝ\ÎˆLÛ\ÜÓ˜[YNˆËY[›^LH™ËXØ\™›Ü™\ˆ›Ü™\‹X›Ü™\ˆ›Ý[™YLž^VÌM\H›Û[YY][H^Y›Ü™YÜ›Ý[™MKMXÙZÛ\Ž^[]]YY›Ü™YÜ›Ý[™ÍXÙZÛ\Ž™›Û[›Ü›X[XÙZÛ\Ž^VÌMH›ØÝ\Î›Ý][™K[›Û™H›ØÝ\Î˜›Ü™\‹\š[X\žH›ØÝ\Îœš[™ËLˆ›ØÝ\Îœš[™Ë\š[X\žKÌLˆ˜[œÚ][Û‹X[™\Ú^™K[›Û™HXY[™Ë\™[^YŸJ_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆœMˆ]M‹Ú[™[ŽšKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OO™JŠK\ØX›Yˆ[‹š[J
KÛ\ÜÓ˜[YN–
ËY[LM›Ý[™YLž^VÌMœH›ÛX›Û›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆØ\Lˆ˜[œÚ][Û‹X[‹‹š[J
OÈ˜™Ë\š[X\žH^]Ú]HÚYÝËVÌÍÌŒÜ™Ø˜JLKL‹ŒÍKŒÌ
WHXÝ]™NœØØ[KVÌŽNHŽˆ˜™Ë[]]Y^[]]YY›Ü™YÜ›Ý[™Ý\œÛÜ‹[›ÝX[ÝÙYŠKÚ[™[Ž–È´'´`´/ô`4,4,´.4`´c‹KšœÞ
ËÜÚ^™NŒMŸJW_J_JW_J_K^Z[œ]Š_Y[˜Ý[ÛˆQYJÛÛ”ÝX›Z]™KÛ˜XÚÎJ^ØÛÛœÝÛ‹—OTË\ÙTÝ]J[
KØK×OTË\ÙTÝ]J[
KÛWOTË\ÙTÝ]J[
KÙ—OTË\ÙTÝ]JˆŠKOTË\ÙT™YŠ[
NØ\Þ[˜È[˜Ý[Ûˆ
Ê^ØÛÛœÝOYË\™Ù]™š[\ÏË–ÌNÚYŠ^J\™]\›ŽØÛÛœÝX]ØZ]Ò
JNÜŠŠKJK\_š[XYÙKÚœYÈŠKÊ‹œÜ]
‹ŠVÌW_Š_\™]\›ˆKšœÞ
Ë™]‹Ë‹‹‘[ËÛ\ÜÓ˜[YNˆ™›^›^XÛÛZ[‹ZVÌLšH‹Ú[™[ŽšKšœÞÊ	KØÛ\ÜÓ˜[YNˆ™›^›^XÛÛ›^LHMH‹LL‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆØ\LÈMˆX‹Mˆ‹Ú[™[Ž–ÚKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎ˜\šXK[X™[Žˆ´'t,4-ô,4-‹Û\ÜÓ˜[YNˆËNHNH›Ý[™YY[™ËXØ\™›Ü™\ˆ›Ü™\‹X›Ü™\ˆ›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆXÝ]™NœØØ[KNMH‹Ú[™[ŽšKšœÞ
›‹ÜÚ^™NŒNJ_JKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌMÜH›ÛX›XÚÈ˜XÚÚ[™Ë]YÚ‹Ú[™[Žˆ´)4/´`´/ˆŸJW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆœMˆ›^LH›^›^XÛÛØ\M‹Ú[™[Ž–ÚKšœÞ
š[œ]‹Ü™YŽ›K\Nˆ™š[H‹XØÙ\ˆš[XYÙKÊˆ‹Ø\\™Nˆ™[š\›Û›Y[‹Û\ÜÓ˜[YNˆšY[ˆ‹ÛÚ[™ÙNšJKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OO›K˜Ý\œ™[Ë˜ÛXÚÊ
KÛ\ÜÓ˜[YN–
ËY[›Ý[™YVÌHÝ™\™›ÝËZY[ˆ›Ü™\‹Lˆ›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆ˜[œÚ][Û‹X[XÝ]™NœØØ[KVÌŽNH‹È˜›Ü™\‹\š[X\žKÍMŽˆ˜›Ü™\‹Y\ÚY›Ü™\‹X›Ü™\ˆMLˆ™ËXØ\™Ý™\Ž˜›Ü™\‹\š[X\žKÍLÝ™\Ž˜™Ë\š[X\žKÍŠKÚ[™[Ž›ÚKšœÞ
š[YÈ‹ÜÜ˜Î›‹[ˆˆ‹Û\ÜÓ˜[YNˆËY[Y[Øš™XÝXÛÝ™\ˆŸJNšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^›^XÛÛ][\ËXÙ[\ˆØ\LÈ^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Ž–ÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆËLMLM›Ý[™YVÌNH™ËVÈÌŒÍMQWKÌL›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆ‹Ú[™[ŽšKšœÞ
ØKÜÚ^™NŒÛ\ÜÓ˜[YNˆ^VÈÌMLÍWHŸJ_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ^XÙ[\ˆ‹Ú[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌMH›ÛX›Û^Y›Ü™YÜ›Ý[™‹Ú[™[Žˆ´(ta4/´`´/´,ô`4,4a4.4`4/´,´,4`´c4/ô`4/´,t.ô-t/4`ÈŸJKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLœH^[]]YY›Ü™YÜ›Ý[™]LH‹Ú[™[Žˆ´'t,4-´/4.4`´-K4aô`´/´,tbÈ4,´bô,t`4,4`´c4.4.ô.4`t/tcô`´cŸJW_JW_J_JK‰‰šKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OO›K˜Ý\œ™[Ë˜ÛXÚÊ
KÛ\ÜÓ˜[YNˆ^VÌLÜH›Û\Ù[ZX›Û^\š[X\žH^XÙ[\ˆKLH‹Ú[™[Žˆ´&4-ô/4-t/t.4`´c4a4/´`´/ˆŸJK‰‰šKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌL\H›ÛX›XÚÈ\\˜Ø\ÙH˜XÚÚ[™Ë]ÚY\Ý^[]]YY›Ü™YÜ›Ý[™X‹LˆLH‹Ú[™[Žˆ´&´/´/4/4-t/t`´,4`4.4.H
4/t-t/´,tcô-ô,4`´-t.ôc4/t/ŠHŸJKKšœÞ
^\™XH‹Ý˜[YN™ÛÚ[™ÙN™ÏO™ŠË\™Ù]˜[YJKXÙZÛ\Žˆ´)ô`´/ˆ4.4/4-t/t/t/ˆ4/t-H4`4,4,t/´`´,4-t`È4&´/´,ô-4,4-ô,4/4-t`´.4.ô.È‹›ÝÜÎŒËÛ\ÜÓ˜[YNˆËY[™ËXØ\™›Ü™\ˆ›Ü™\‹X›Ü™\ˆ›Ý[™YLž^VÌM\H›Û[YY][H^Y›Ü™YÜ›Ý[™MKLËHXÙZÛ\Ž^[]]YY›Ü™YÜ›Ý[™ÍXÙZÛ\Ž™›Û[›Ü›X[›ØÝ\Î›Ý][™K[›Û™H›ØÝ\Î˜›Ü™\‹\š[X\žH›ØÝ\Îœš[™ËLˆ›ØÝ\Îœš[™Ë\š[X\žKÌLˆ˜[œÚ][Û‹X[™\Ú^™K[›Û™HXY[™Ë\™[^YŸJW_JW_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆœMˆ]M‹Ú[™[ŽšKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OO˜I‰›	‰™JK
K\ØX›YˆXKÛ\ÜÓ˜[YN–
ËY[LM›Ý[™YLž^VÌMœH›ÛX›Û›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆØ\Lˆ˜[œÚ][Û‹X[‹OÈ˜™Ë\š[X\žH^]Ú]HÚYÝËVÌÍÌŒÜ™Ø˜JLKL‹ŒÍKŒÌ
WHXÝ]™NœØØ[KVÌŽNHŽˆ˜™Ë[]]Y^[]]YY›Ü™YÜ›Ý[™Ý\œÛÜ‹[›ÝX[ÝÙYŠKÚ[™[Ž–È´'´`´/ô`4,4,´.4`´c‹KšœÞ
ËÜÚ^™NŒMŸJW_J_JW_J_KœÝËZ[œ]Š_Y[˜Ý[ÛˆYJÛÛ”ÝX›Z]™KÛ˜XÚÎJ^ØÛÛœÝÛ‹—OTË\ÙTÝ]J[
KØK×OTË\ÙTÝ]J[
KÛWOTË\ÙTÝ]J[
KÙ—OTË\ÙTÝ]J[
KÛKOTË\ÙTÝ]JˆŠKÏTË\ÙT™YŠ[
NØ\Þ[˜È[˜Ý[ÛˆJŠ^ØÛÛœÝ]‹\™Ù]™š[\ÏË–ÌNÚYŠXŠ\™]\›ŽÜŠ‹›˜[YJNØÛÛœÝX‹\KœÝ\ÕÚ]
š[XYÙKÈŠKOX‹\KœÝ\ÕÚ]
^ÈŠ_‹›˜[YK™[™ÕÚ]
‹Š_‹›˜[YK™[™ÕÚ]
‹›YŠ_‹›˜[YK™[™ÕÚ]
‹˜ÜÝˆŠNÚYŠŠ^ØÛÛœÝÏX]ØZ]Ò
ŠNÝJËœÜ]
‹ŠVÌW_ÊKŠ‹\JKÊ[
_Y[ÙHYŠJ^ØÛÛœÝÏX]ØZ]×ÙJŠNÜÊËœÛXÙJLÊJKJ[
KŠ[
_Y[ÙHÊ4)4,4.t.Îˆ	Ø‹›˜[Y_X
KJ[
KŠ[
_Y[˜Ý[ÛˆŠ
^ÚYŠ[Š\™]\›ŽØÛÛœÝVÛKWK™š[\Š›ÛÛX[ŠKš›Ú[Š‚˜
NÛ	‰™ÙJŸ4%4/´.´`ô/4-t/t`Žˆ	ÛŸX
N™JŸ4%4/´.´`ô/4-t/t`Žˆ	ÛŸX
_\™]\›ˆKšœÞ
Ë™]‹Ë‹‹‘[ËÛ\ÜÓ˜[YNˆ™›^›^XÛÛZ[‹ZVÌLšH‹Ú[™[ŽšKšœÞÊ	KØÛ\ÜÓ˜[YNˆ™›^›^XÛÛ›^LHMH‹LL‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆØ\LÈMˆX‹Mˆ‹Ú[™[Ž–ÚKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎ˜\šXK[X™[Žˆ´'t,4-ô,4-‹Û\ÜÓ˜[YNˆËNHNH›Ý[™YY[™ËXØ\™›Ü™\ˆ›Ü™\‹X›Ü™\ˆ›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆXÝ]™NœØØ[KNMH‹Ú[™[ŽšKšœÞ
›‹ÜÚ^™NŒNJ_JKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌMÜH›ÛX›XÚÈ˜XÚÚ[™Ë]YÚ‹Ú[™[Žˆ´%4/´.´`ô/4-t/t`ˆŸJW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆœMˆ›^LH›^›^XÛÛØ\M‹Ú[™[Ž–ÚKšœÞ
š[œ]‹Ü™YŽ™Ë\Nˆ™š[H‹XØÙ\ˆš[XYÙKÊ‹›Y˜ÜÝ‹œ‹™ØË™ØÞ‹Û\ÜÓ˜[YNˆšY[ˆ‹ÛÚ[™ÙNž_JKKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OO™Ë˜Ý\œ™[Ë˜ÛXÚÊ
KÛ\ÜÓ˜[YN–
ËY[›Ý[™YVÌH›Ü™\‹Lˆ›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆØ\LÈ˜[œÚ][Û‹X[XÝ]™NœØØ[KVÌŽNHKN‹È˜›Ü™\‹\š[X\žKÍ™Ë\š[X\žKÍŽˆ˜›Ü™\‹Y\ÚY›Ü™\‹X›Ü™\ˆ™ËXØ\™Ý™\Ž˜›Ü™\‹\š[X\žKÍLŠKÚ[™[Ž–ÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YN–
ËLLˆLLˆ›Ý[™YVÌMœH›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆ‹È˜™Ë\š[X\žKÌLŽˆ˜™ËVÈÑNQL—KÌLŠKÚ[™[ŽšKšœÞ
™ËÜÚ^™NŒŒ‹Û\ÜÓ˜[YN›È^\š[X\žHŽˆ^VÈÑMÍÌ—HŸJ_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ^[Y‹Ú[™[Ž›ÚKšœÞÊK‘œ˜YÛY[ØÚ[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌMH›ÛX›Û^\š[X\žH‹Ú[™[Ž›ŸJKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLœH^[]]YY›Ü™YÜ›Ý[™]LH‹Ú[™[Žˆ´'t,4-´/4.4`´-K4aô`´/´,tbÈ4.4-ô/4-t/t.4`´cŸJW_JNšKšœÞÊK‘œ˜YÛY[ØÚ[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌMH›ÛX›Û^Y›Ü™YÜ›Ý[™‹Ú[™[Žˆ´$´bô,t`4,4`´c4-4/´.´`ô/4-t/t`ˆŸJKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLœH^[]]YY›Ü™YÜ›Ý[™]LH‹Ú[™[Žˆ´)4/´`´/‹4`´-t.´`t`‹4`´,4,t.ô.4a´,8 )ˆŸJW_J_JW_JKKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌL\H›ÛX›XÚÈ\\˜Ø\ÙH˜XÚÚ[™Ë]ÚY\Ý^[]]YY›Ü™YÜ›Ý[™X‹LˆLH‹Ú[™[Žˆ´'ô/´cô`t/t-t/t.4-H
4/t-t/´,tcô-ô,4`´-t.ôc4/t/ŠHŸJKKšœÞ
^\™XH‹Ý˜[YN›KÛÚ[™ÙNOš
‹\™Ù]˜[YJKXÙZÛ\Žˆ´)ô`´/ˆ4.4/4-t/t/t/ˆ4,ˆ4-4/´.´`ô/4-t/t`´-H4`´`4-t,t`ô-t`ˆ4,´/t.4/4,4/t.4cÏÈ‹›ÝÜÎŒËÛ\ÜÓ˜[YNˆËY[™ËXØ\™›Ü™\ˆ›Ü™\‹X›Ü™\ˆ›Ý[™YLž^VÌM\H›Û[YY][H^Y›Ü™YÜ›Ý[™MKLËHXÙZÛ\Ž^[]]YY›Ü™YÜ›Ý[™ÍXÙZÛ\Ž™›Û[›Ü›X[›ØÝ\Î›Ý][™K[›Û™H›ØÝ\Î˜›Ü™\‹\š[X\žH›ØÝ\Îœš[™ËLˆ›ØÝ\Îœš[™Ë\š[X\žKÌLˆ˜[œÚ][Û‹X[™\Ú^™K[›Û™HXY[™Ë\™[^YŸJW_JW_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆœMˆ]M‹Ú[™[ŽšKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎš‹\ØX›Yˆ[‹Û\ÜÓ˜[YN–
ËY[LM›Ý[™YLž^VÌMœH›ÛX›Û›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆØ\Lˆ˜[œÚ][Û‹X[‹È˜™Ë\š[X\žH^]Ú]HÚYÝËVÌÍÌŒÜ™Ø˜JLKL‹ŒÍKŒÌ
WHXÝ]™NœØØ[KVÌŽNHŽˆ˜™Ë[]]Y^[]]YY›Ü™YÜ›Ý[™Ý\œÛÜ‹[›ÝX[ÝÙYŠKÚ[™[Ž–È´'´`´/ô`4,4,´.4`´c‹KšœÞ
ËÜÚ^™NŒMŸJW_J_JW_J_K™ØËZ[œ]Š_Y[˜Ý[Ûˆ‘YJ
^ØÛÛœÝËWOX

KÜ›Ùš[NOU[Š
KØY]™[›‹\]Q]™[œŸOPÚJ
KØYØ\ÙN˜K\]PØ\ÙNœßO^˜J
KÛWOTË\ÙTÝ]JœXÚÈŠKÙ—OTË\ÙTÝ]J[
KÛKOTË\ÙTÝ]J×JKÙËWOTË\ÙTÝ]J×JKÚ‹—OTË\ÙTÝ]JˆŠKØ‹—OTË\ÙTÝ]J[
KÑK×OTË\ÙTÝ]J™]™[ŠKÕWOTË\ÙTÝ]J[
KÚË×OTË\ÙTÝ]JLJKÓKOTË\ÙTÝ]J[
KTË\ÙT™YŠ[
KTË\ÙT™YŠ[
NÔË\ÙQY™™XÝ


OOŠ
OOžÞ‹˜Ý\œ™[	‰˜ÛX\•[Y[Ý]
‹˜Ý\œ™[
_K×JKË\ÙQY™™XÝ


OOžÓ˜Ý\œ™[ËœØÜ›Û[ÕšY]ÊØ™Z]š[ÜŽˆœÛ[ÛÝŸJ_KÛWJNØÛÛœÝOTË\ÙPØ[˜XÚÊ\Þ[˜ÈOOžÝJœ›ØÙ\ÜÚ[™ÈŠKÊLJNÝž^ØÛÛœÝX]ØZ]™]Ú
‹Ø\KÜÛX\Ü›ØÙ\ÜÈ‹ÛY]Ùˆ”ÔÕ‹XY\œÎžÈÛÛ[U\HŽˆ˜\XØ][Û‹ÚœÛÛˆŸK›ÙN’”ÓÓ‹œÝš[™ÚYžJÚ[œ]\N™ÏÈ^‹^’K^›ÚY[XYÙP˜\ÙM’Kš[XYÙP˜\ÙM[XYÙSYYXU\N’Kš[XYÙSYYXU\K›ÛÝÕ\[œÝÙ\œÎ’K™›ÛÝÕ\[œÝÙ\œË™\Ý]\˜[ÛÛ^žÛ˜[YNË›˜[YK\Ú[™\ÜÕ\NË˜\Ú[™\ÜÕ\KÙX]ÎËœÙX]ß_J_JNÚYŠU‹›ÚÊ]›ÝÈ™]È\œ›ÜŠ	Õ‹œÝ]\ßX
NØÛÛœÝX]ØZ]‹šœÛÛŠ
NÚYŠQ‹œÝXØÙ\ÜÊ]›ÝÈ™]È\œ›ÜŠTH˜Z[\™HŠNØÛÛœÝQ‹™]NÚYŠ‹›™YYÓ[Ü™R[™›Ê^ØÛÛœÝV‹™›ÛÝÕ\]Y\Ý[ÛœÏÏÖ×KÏV‹œ\X[Ý[[X\žOØ	Ö‹œ\X[Ý[[X\ž_B‚‰Ô‹š›Ú[Š˜
_X”‹š›Ú[Š˜
NÚ
OO–Ë‹‹–KÜ›ÛNˆ˜ZH‹ÛÛ[’ßWJKJŠKJ˜ÛÛ™\œØ][ÛˆŠ_Y[ÙH
O–Ë‹‹”‹Ü›ÛNˆ˜ZH‹ÛÛ[–‹œÝ[[X\žOÏÈ´'ô/´/tcô.Ë4a4.4.´`t.4`4`ôc‹ˆŸWJKŠ‹™^˜XÝY
KÊ‹›Ý]]\OÏÈ™]™[ŠKJ˜ÛÛ™š\›HŠ_XØ]Ú
Š^ØÛÛœÛÛK™\œ›ÜŠ–ÔÛX\[œ]H‹ŠKÊL
KJ˜ÛÛ™\œØ][ÛˆŠ__KÙJNÙ[˜Ý[ÛˆŠK‹Š^ØÛÛœÝRKš[J
_
ÈŠ4a4/´`´/ŠHŽˆˆŠNÚ
ÞÜ›ÛNˆ\Ù\ˆ‹ÛÛ[–ŸWJK‰‰‘
Ø˜\ÙM•‹YYXU\N‘ŸJKJÝ^’K[XYÙP˜\ÙM•‹[XYÙSYYXU\N‘ŸJ_Y[˜Ý[ÛˆJ
^ÚYŠZ‹š[J
J\™]\›ŽØÛÛœÝOYË›X\

‹ŠOOŠÜ]Y\Ý[ÛŽ‘‹[œÝÙ\Ž–OOLÚ‹š[J
NˆˆŸJJK™š[\ŠO‘‹˜[œÝÙ\ŠNÚ
O–Ë‹‹‘‹Ü›ÛNˆ\Ù\ˆ‹ÛÛ[š‹š[J
_WJKŠˆŠKJ×JNØÛÛœÝ[VÌOË˜ÛÛ[ÏÈˆŽÜJÝ^•‹[XYÙP˜\ÙM“OË˜˜\ÙM[XYÙSYYXU\N“OË›YYXU\K›ÛÝÕ\[œÝÙ\œÎ’_J_Y[˜Ý[Ûˆ

^ÚYŠXŠ\™]\›ŽØÛÛœÝO[™]È]J
KÒTÓÔÝš[™Ê
NÚYŠOOOH™]™[Š^ØÛÛœÝ^ÚY‘×ÙJ
KØ]YÛÜžN˜‹˜Ø]YÛÜžOÏÈ›Ü\˜][ÛœÈ‹]N˜‹]K\ØÜš\[ÛŽ˜‹™\ØÜš\[Û‹š[Üš]N˜‹œš[Üš]KÝ]\Îˆ›Ü[ˆ‹™\ÜÛœÚX›N˜‹œ™\ÜÛœÚX›OÏÈˆ‹]™[]N˜‹™]™[]OÏÒKÝÜÎ–×K›ÚXÙS›ÝN›[^˜QšY[˜‹™^˜QšY[ÏÈˆ‹Ü™X]Y]’K\]Y]’_NÛŠŠKJ‹šY
KJ™Û™HŠK‹˜Ý\œ™[\Ù][Y[Ý]


OO™J‹Ù]™[ÈŠKN
_Y[Ù^ØÛÛœÝ\YÊ
KQÛ
˜Ü™X]Y‹´%4-t.ô/ˆ4`t/´-ô-4,4/t/ˆ4aô-t`4-t-ÈÛX\[œ]ŠK^ÚY•‹\N˜‹\OÏÈ›Ý\ˆ‹]N˜‹]K\ØÜš\[ÛŽ˜‹™\ØÜš\[Û‹š[Üš]N˜‹œš[Üš]KÝ]\Îˆ›Ü[ˆ‹™\ÜÛœÚX›N˜‹œ™\ÜÛœÚX›OÏÈˆ‹YQ]N˜‹™YQ]OÏÈˆ‹ÝÜÎ–×Kš[\Î–×KÛÛ[Y[Î–×K[Y[[™N–Ñ—K™[]Y\ÚÜÎ–×K™[]Y\]Z\Y[–×KÜ™X]Y]’K\]Y]’_NØJŠKJŠKJ™Û™HŠK‹˜Ý\œ™[\Ù][Y[Ý]


OO™JØØ\Ù\ËÉÕŸX
KN
__\™]\›ˆKšœÞ
ØÚ[™[ŽšKšœÞÊYKÛ[ÙNˆØZ]‹Ú[™[Ž–ÛOOHœXÚÈ‰‰šKšœÞ
Ë™]‹Ú[š]X[žÛÜXÚ]NŒK[š[X]NžÛÜXÚ]NŒ_K^]žÛÜXÚ]NŒKÛ\ÜÓ˜[YNˆ™›^›^XÛÛZ[‹ZVÌLšH‹Ú[™[ŽšKšœÞÊ	KØÛ\ÜÓ˜[YNˆ™›^›^XÛÛ›^LHMˆ‹LL‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆœMˆX‹N‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆ\ÝYžKX™]ÙY[ˆX‹MH‹Ú[™[Ž–ÚKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OOÚ[™ÝË˜™˜]šYØ]P˜XÚÊ‹ÚÛYHŠK˜\šXK[X™[Žˆ´%ô,4.´`4bô`´c‹Û\ÜÓ˜[YNˆËLLHLLH™ËXØ\™›Ü™\ˆ›Ü™\‹X›Ü™\ˆ›Ý[™YY[›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆÚYÝËVÝ˜\ŠK\ÚYÝËXØ\™
WHXÝ]™NœØØ[KNMH‹Ú[™[ŽšKšœÞ
ÜÚ^™NŒMËÛ\ÜÓ˜[YNˆ^Y›Ü™YÜ›Ý[™ŸJ_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆËNN›Ý[™YY[™Ë\š[X\žKÌL›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆ‹Ú[™[ŽšKšœÞ
‹ÜÚ^™NŒMKÛ\ÜÓ˜[YNˆ^\š[X\žHŸJ_JW_JKKšœÞ
šH‹ØÛ\ÜÓ˜[YNˆ^VÌŽH›ÛX›XÚÈ^Y›Ü™YÜ›Ý[™˜XÚÚ[™Ë]YÚXY[™Ë]YÚX‹Lˆ‹Ú[™[Žˆ´(t/´/´,tbt.4`´c˜\‘ØÝÜˆŸJKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌMH^[]]YY›Ü™YÜ›Ý[™XY[™Ë\™[^Y‹Ú[™[Žˆ´'´/ô.4b4.4`´-H4`t.4`´`ô,4a´.4cˆ4.ôc´,tbô/4`t/ô/´`t/´,t/´/8 %RH4/´/ô`4-t-4-t.ô.4`ˆ4.´,4`´-t,ô/´`4.4c‹4/ô`4.4/´`4.4`´-t`ˆ4.4-ô,4a4.4.´`t.4`4`ô-t`ˆ4,´`tdH4`t,4/ˆŸJW_JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆœMˆÜšYÜšYXÛÛËLˆØ\LÈ›^LH‹Ú[™[Ž–WÙK›X\

ÚY’KXÛÛŽ•‹X™[‘‹\ØÎ–‹ÛÛÜŽ”‹™Î’ËXÛÛÛÛÜŽ–_K™JOOšKšœÞÊË˜]Û‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OOžÙŠJKJš[œ]Š_K[š]X[žÛÜXÚ]NŒNŒMŸK[š[X]NžÛÜXÚ]NŒKNŒK˜[œÚ][ÛŽžÙ[^N›™J‹Œ‹\˜][ÛŽ‹ŒËX\ÙN–ËŒŒ‹KŒÍ‹W_KÚ[U\žÜØØ[N‹ŽMŸKÛ\ÜÓ˜[YNˆ˜™XØ\™›^›^XÛÛ][\Ë\Ý\MHØ\LÈÝ™\ŽœÚYÝËVÝ˜\ŠK\ÚYÝËY[]˜]Y
WH˜[œÚ][Û‹X[Z[‹ZVÌLÌH‹Ú[™[Ž–ÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆËLLˆLLˆ›Ý[™YVÌMœH›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆ›^\Úš[šËL‹Ý[NžØ˜XÚÙÜ›Ý[™ÛÛÜŽ’ßKÚ[™[ŽšKšœÞ
‹ÜÚ^™NŒŒ‹Ý[NžØÛÛÜŽ–__J_JKKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌMœH›ÛX›XÚÈ^Y›Ü™YÜ›Ý[™˜XÚÚ[™Ë]YÚ‹Ú[™[Ž‘ŸJKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLœH^[]]YY›Ü™YÜ›Ý[™]LHXY[™Ë\ÛYÈ‹Ú[™[Ž–ŸJW_JW_KJJ_JW_J_KœXÚÈŠKOOHš[œ]‰‰™OOH›ÚXÙH‰‰šKšœÞ
—ÙKÛÛ”ÝX›Z]’OOŠJKÛ˜XÚÎŠ
OOžÙŠ[
KJœXÚÈŠ__K›ÚXÙHŠKOOHš[œ]‰‰™OOH^‰‰šKšœÞ
—ÙKÛÛ”ÝX›Z]’OOŠJKÛ˜XÚÎŠ
OOžÙŠ[
KJœXÚÈŠ__K^ŠKOOHš[œ]‰‰™OOHœÝÈ‰‰šKšœÞ
QYKÛÛ”ÝX›Z]ŠK‹ŠOOŠK‹ŠKÛ˜XÚÎŠ
OOžÙŠ[
KJœXÚÈŠ__KœÝÈŠKOOHš[œ]‰‰™OOH™ØÝ[Y[‰‰šKšœÞ
YKÛÛ”ÝX›Z]ŠK‹ŠOOŠK‹ŠKÛ˜XÚÎŠ
OOžÙŠ[
KJœXÚÈŠ__K™ØÝ[Y[ŠKOOHœ›ØÙ\ÜÚ[™È‰‰šKšœÞ
WÙKßKœ›ØÙ\ÜÚ[™ÈŠKOOH˜ÛÛ™\œØ][Ûˆ‰‰šKšœÞ
Ë™]‹Ë‹‹‘[ËÛ\ÜÓ˜[YNˆ™›^›^XÛÛZ[‹ZVÌLšH‹Ú[™[ŽšKšœÞÊ	KØÛ\ÜÓ˜[YNˆ™›^›^XÛÛ›^LHMH‹M‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆØ\LÈMˆX‹M‹Ú[™[Ž–ÚKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OOžÙŠ[
KJœXÚÈŠK
×J_KÛ\ÜÓ˜[YNˆËNHNH›Ý[™YY[™ËXØ\™›Ü™\ˆ›Ü™\‹X›Ü™\ˆ›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆXÝ]™NœØØ[KNMH›^\Úš[šËL‹Ú[™[ŽšKšœÞ
›‹ÜÚ^™NŒNJ_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆØ\Lˆ‹Ú[™[Ž–ÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆËMÈMÈ›Ý[™YY[™Ë\š[X\žKÌL›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆ‹Ú[™[ŽšKšœÞ
‹ÜÚ^™NŒLËÛ\ÜÓ˜[YNˆ^\š[X\žHŸJ_JKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌM\H›ÛX›XÚÈ^Y›Ü™YÜ›Ý[™‹Ú[™[Žˆ˜\‘ØÝÜˆŸJW_JW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^LHÝ™\™›ÝË^KX]]ÈMˆKLˆ‹Ú[™[Ž–ÛK›X\

KŠOOšKšœÞ
ÎKÜ›ÛN’Kœ›ÛKÛÛ[’K˜ÛÛ[KŠJKÉ‰šKšœÞÊË™]‹Ú[š]X[žÛÜXÚ]NŒNŽK[š[X]NžÛÜXÚ]NŒKNŒKÛ\ÜÓ˜[YNˆ™›^][\Ë\Ý\Ø\L‹HX‹M‹Ú[™[Ž–ÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆËNN›Ý[™YY[™ËY\ÝXÝ]™KÌL›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆ\‹LH›^\Úš[šËL‹Ú[™[ŽšKšœÞ
›‹ÜÚ^™NŒMÛ\ÜÓ˜[YNˆ^Y\ÝXÝ]™HŸJ_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ˜™ËY\ÝXÝ]™KÎ›Ü™\ˆ›Ü™\‹Y\ÝXÝ]™KÌŒ›Ý[™YVÌŒH›Ý[™YX›VÍœHMKLÈX^]ËVÎ‰WH‹Ú[™[Ž–ÚKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH^Y\ÝXÝ]™H›Û[YY][H‹Ú[™[Žˆ´'t-H4`ô-4,4.ô/´`tc4/ô/´.ô`ôaô.4`´c4/´`´,´-t`‹ˆ4'ô`4/´,´-t`4c4`´-H4`t/´-t-4.4/t-t/t.4-KˆŸJKKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OOžØÛÛœÝOVË‹‹›WKœ™]™\œÙJ
K™š[™
O•‹œ›ÛOOOH\Ù\ˆŠNÒI‰Š
O•‹œÛXÙJLJŠK›[™Ý[Kš[™^ÙŠJKLJJJKJÝ^’K˜ÛÛ[JJ_KÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆØ\LH]Lˆ^VÌLœH›Û\Ù[ZX›Û^Y\ÝXÝ]™H‹Ú[™[Ž–ÚKšœÞ
	‹ÜÚ^™NŒL_JKˆ4'ô/´/ô`4/´,t/´,´,4`´c4`t/t/´,´,—_JW_JW_JKKšœÞ
™]ˆ‹Ü™YŽ“JW_JKË›[™ÝŒ	‰ˆZÉ‰šKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆœMˆLÈ›Ü™\‹]›Ü™\‹X›Ü™\‹ÍŒ‹Ú[™[ŽšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^Ø\L‹H][\ËY[™‹Ú[™[Ž–ÚKšœÞ
^\™XH‹Ý˜[YNš‹ÛÚ[™ÙN’OOŠK\™Ù]˜[YJKÛ’Ù^QÝÛŽ’OOžÒKšÙ^OOOH‘[\ˆ‰‰ˆRKœÚYÙ^I‰ŠKœ™]™[Y˜][

KJ
J_KXÙZÛ\Žˆ´$´,4b4/´`´,´-t`¸ )ˆ‹›ÝÜÎŒ‹Û\ÜÓ˜[YNˆ™›^LH™ËXØ\™›Ü™\ˆ›Ü™\‹X›Ü™\ˆ›Ý[™YLž^VÌM\H›Û[YY][H^Y›Ü™YÜ›Ý[™MKLÈXÙZÛ\Ž^[]]YY›Ü™YÜ›Ý[™ÍXÙZÛ\Ž™›Û[›Ü›X[›ØÝ\Î›Ý][™K[›Û™H›ØÝ\Î˜›Ü™\‹\š[X\žH›ØÝ\Îœš[™ËLˆ›ØÝ\Îœš[™Ë\š[X\žKÌLˆ˜[œÚ][Û‹X[™\Ú^™K[›Û™HXY[™Ë\™[^YŸJKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎ•K\ØX›YˆZ‹š[J
KÛ\ÜÓ˜[YN–
ËLLˆLLˆ›Ý[™YY[›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆ›^\Úš[šËL˜[œÚ][Û‹X[XÝ]™NœØØ[KNMH‹‹š[J
OÈ˜™Ë\š[X\žH^]Ú]HŽˆ˜™Ë[]]Y^[]]YY›Ü™YÜ›Ý[™Ý\œÛÜ‹[›ÝX[ÝÙYŠKÚ[™[ŽšKšœÞ
ËÜÚ^™NŒNJ_JW_J_JW_J_K˜ÛÛ™\œØ][ÛˆŠKOOH˜ÛÛ™š\›H‰‰˜‰‰šKšœÞ
Ë™]‹Ë‹‹‘[ËÛ\ÜÓ˜[YNˆ™›^›^XÛÛZ[‹ZVÌLšH‹Ú[™[ŽšKšœÞÊ	KØÛ\ÜÓ˜[YNˆ™›^›^XÛÛ›^LHMH‹N‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆØ\LÈMˆX‹M‹Ú[™[Ž–ÚKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OOJ˜ÛÛ™\œØ][ÛˆŠKÛ\ÜÓ˜[YNˆËNHNH›Ý[™YY[™ËXØ\™›Ü™\ˆ›Ü™\‹X›Ü™\ˆ›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆXÝ]™NœØØ[KNMH›^\Úš[šËL‹Ú[™[ŽšKšœÞ
›‹ÜÚ^™NŒNJ_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆØ\Lˆ‹Ú[™[Ž–ÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆËMÈMÈ›Ý[™YY[™Ë\š[X\žKÌL›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆ‹Ú[™[ŽšKšœÞ
‹ÜÚ^™NŒLËÛ\ÜÓ˜[YNˆ^\š[X\žHŸJ_JKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌM\H›ÛX›XÚÈ^Y›Ü™YÜ›Ý[™‹Ú[™[Žˆ˜\‘ØÝÜˆŸJW_JW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^LHÝ™\™›ÝË^KX]]ÈMˆKLˆ‹Ú[™[Ž–ÛK›[™ÝŒ	‰šKšœÞ
ÎKÜ›ÛNˆ˜ZH‹ÛÛ[›VÛK›[™ÝLWK˜ÛÛ[JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ›]LˆX‹M‹Ú[™[ŽšKšœÞ
ÙKÛÝ]]\N‘K^˜XÝY˜ŸJ_JKKšœÞ
™]ˆ‹Ü™YŽ“JW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆœMˆ›^›^XÛÛØ\L‹H‹Ú[™[Ž–ÚKšœÞÊ˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎ’Û\ÜÓ˜[YNˆËY[LM›Ý[™YLž^VÌMœH›ÛX›Û^]Ú]H›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆØ\LˆÚYÝËVÌÍÌŒÜ™Ø˜JLKL‹ŒÍKŒÌ
WHÝ™\Ž›ÜXÚ]KNLXÝ]™NœØØ[KVÌŽNH˜[œÚ][Û‹X[‹Ý[NžØ˜XÚÙÜ›Ý[™ˆ›[™X\‹YÜ˜YY[
LÍYYËÍPPÑPˆ	KÍMÎHL	JHŸKÚ[™[Ž–ÚKšœÞ
‹ÜÚ^™NŒNJK´'ô/´-4`´,´-t`4-4.4`´c—_JKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OOžÞJ×JKJš[œ]Š_KÛ\ÜÓ˜[YNˆËY[LLˆ›Ý[™YLž^VÌMH›Û\Ù[ZX›Û^[]]YY›Ü™YÜ›Ý[™™Ë[]]YÝ™\Ž˜™ËX›Ü™\ˆ˜[œÚ][Û‹X[XÝ]™NœØØ[KVÌŽNH‹Ú[™[Žˆ´&4-ô/4-t/t.4`´c4,´,´/´-ŸJW_JW_J_K˜ÛÛ™š\›HŠKOOH™Û™H‰‰˜‰‰šKšœÞÊË™]‹Ú[š]X[žÛÜXÚ]NŒØØ[N‹ŽM_K[š[X]NžÛÜXÚ]NŒKØØ[NŒ_K^]žÛÜXÚ]NŒK˜[œÚ][ÛŽžÙ\˜][ÛŽ‹ŒÌ‹X\ÙN–ËŒŒ‹KŒÍ‹W_KÛ\ÜÓ˜[YNˆ™›^›^XÛÛ][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆ›^LHN^XÙ[\ˆKLMˆZ[‹ZVÌLšH‹Ú[™[Ž–ÚKšœÞ
Ë™]‹Ú[š]X[žÜØØ[NŒK[š[X]NžÜØØ[NŒ_K˜[œÚ][ÛŽžÙ[^N‹Œ‹\NˆœÜš[™È‹ÝY™›™\ÜÎŒŽ[\[™ÎŒŒKÛ\ÜÓ˜[YNˆËLŒLŒ›Ý[™YY[™ËVÈÌŒÍMQWKÌLˆ›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆX‹Mˆ‹Ú[™[ŽšKšœÞ
‹ÜÚ^™NŒÍ‹Ý›ÚÙUÚYŒ‹KÛ\ÜÓ˜[YNˆ^VÈÌMLÍWHŸJ_JKKšœÞ
ËœÚ[š]X[žÛÜXÚ]NŒNŽK[š[X]NžÛÜXÚ]NŒKNŒK˜[œÚ][ÛŽžÙ[^N‹ŒMŸKÛ\ÜÓ˜[YNˆ^VÌLœH›ÛX›XÚÈ\\˜Ø\ÙH˜XÚÚ[™Ë]ÚY\Ý^VÈÌMLÍWHX‹Lˆ‹Ú[™[Žˆ´%ô,4a4.4.´`t.4`4/´,´,4/t/ˆŸJKKšœÞ
Ëš‹Ú[š]X[žÛÜXÚ]NŒNŽK[š[X]NžÛÜXÚ]NŒKNŒK˜[œÚ][ÛŽžÙ[^N‹ŒŒŸKÛ\ÜÓ˜[YNˆ^VÌŒœH›ÛX›XÚÈ^Y›Ü™YÜ›Ý[™˜XÚÚ[™Ë]YÚX‹Lˆ‹Ú[™[Ž‘OOOH™]™[È´(t/´,tbô`´.4-H4-4/´,t,4,´.ô-t/t/ˆŽˆ´%4-t.ô/ˆ4/´`´.´`4bô`´/ˆŸJKKšœÞ
ËœÚ[š]X[žÛÜXÚ]NŒNŽK[š[X]NžÛÜXÚ]NŒKNŒK˜[œÚ][ÛŽžÙ[^N‹ŒŽKÛ\ÜÓ˜[YNˆ^VÌMH^[]]YY›Ü™YÜ›Ý[™X^]ËVÌHXY[™Ë\™[^Y‹Ú[™[Ž˜‹]_JW_K™Û™HŠW_J_J_Y[˜Ý[Ûˆ˜JÝ]N™KXÝ[ÛŽÛ\ÜÓ˜[YN›ŸJ^Ü™]\›ˆKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YN–
™›^][\ËXÙ[\ˆ\ÝYžKX™]ÙY[ˆX‹M]Mˆ‹ŠKÚ[™[Ž–ÚKšœÞ
šÈ‹ØÛ\ÜÓ˜[YNˆ^VÌMÜH›ÛX›Û^Y›Ü™YÜ›Ý[™˜XÚÚ[™Ë]YÚ‹Ú[™[Ž™_JK	‰šKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH^\š[X\žH›Û\Ù[ZX›Û‹Ú[™[ŽJW_J_Y[˜Ý[ÛˆJÛX™[™K˜[YNXÛÛŽ›‹™[™œ‹™[™ÜÚ]]™N˜KÛ\ÜÓ˜[YNœßJ^Ü™]\›ˆKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YN–
˜™XØ\™M›^›^XÛÛØ\LËH‹ÊKÚ[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\Ë\Ý\\ÝYžKX™]ÙY[ˆ‹Ú[™[Ž–ÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆËNHNH›Ý[™YVÌL\H™Ë\š[X\žKÌL›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆ^\š[X\žH›^\Úš[šËL‹Ú[™[Ž›ŸJK‰‰šKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YN–
^VÌLœH›ÛX›ÛLˆKLH›Ý[™YY[XY[™Ë[›Û™H›^][\ËXÙ[\ˆ‹OÈ^VÈÌMLÍWH™ËVÈÌŒÍMQWKÌLŽˆ^Y\ÝXÝ]™H™ËY\ÝXÝ]™KÌLŠKÚ[™[ŽœŸJW_JKKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ^VÌŽH›ÛX›XÚÈ^Y›Ü™YÜ›Ý[™XY[™Ë[›Û™HX‹LKH˜XÚÚ[™Ë]YÚ‹Ú[™[ŽJKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ^VÌL\H›ÛX›Û^[]]YY›Ü™YÜ›Ý[™\\˜Ø\ÙH˜XÚÚ[™Ë]ÚYH‹Ú[™[Ž™_JW_JW_J_Y[˜Ý[ÛˆJÝ˜\šX[™OHš[™›È‹]N\ØÜš\[ÛŽ›‹Û‘\ÛZ\ÜÎœ‹XÛÛŽ˜KÛ\ÜÓ˜[YNœßJ^ØÛÛœÝO^Ú[™›ÎžØÛÛZ[™\Žˆ˜›Ü™\‹[VÈÌÐŽ‘—H™ËVÈÌÐŽ‘—KÎ‹XÛÛŽšKšœÞ
Ù‹ØÛ\ÜÓ˜[YNˆËMHMH^VÈÌÐŽ‘—HŸJ_KÝXØÙ\ÜÎžØÛÛZ[™\Žˆ˜›Ü™\‹[VÈÌŒÍMQWH™ËVÈÌŒÍMQWKÎ‹XÛÛŽšKšœÞ
KØÛ\ÜÓ˜[YNˆËMHMH^VÈÌŒÍMQWHŸJ_KØ\›š[™ÎžØÛÛZ[™\Žˆ˜›Ü™\‹[VÈÑNQL—H™ËVÈÑNQL—KÎ‹XÛÛŽšKšœÞ
[‹ØÛ\ÜÓ˜[YNˆËMHMH^VÈÑNQL—HŸJ_K[™Ù\ŽžØÛÛZ[™\Žˆ˜›Ü™\‹[Y\ÝXÝ]™H™ËY\ÝXÝ]™KÎ‹XÛÛŽšKšœÞ
›‹ØÛ\ÜÓ˜[YNˆËMHMH^Y\ÝXÝ]™HŸJ__VÙWNÜ™]\›ˆKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YN–
™›^Ø\LÈ›Ý[™YVÌMœH›Ü™\‹[VÍHM™[]]™H‹K˜ÛÛZ[™\‹ÊKÚ[™[Ž–ÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆœÚš[šËL]LH‹Ú[™[Ž˜_KšXÛÛŸJKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^LH‹Mˆ‹Ú[™[Ž–ÚKšœÞ
š‹ØÛ\ÜÓ˜[YNˆ^VÌM\H›Û\Ù[ZX›Û^Y›Ü™YÜ›Ý[™XY[™Ë\ÛYÈ‹Ú[™[ŽJK‰‰šKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^VÌMH^[]]YY›Ü™YÜ›Ý[™]LHXY[™Ë\™[^Y‹Ú[™[Ž›ŸJW_JK‰‰šKšœÞ
˜]Ûˆ‹ÛÛÛXÚÎœ‹Û\ÜÓ˜[YNˆ˜XœÛÛ]HÜMšYÚM^[]]YY›Ü™YÜ›Ý[™Ý™\Ž^Y›Ü™YÜ›Ý[™˜[œÚ][Û‹XÛÛÜœÈ‹Ú[™[ŽšKšœÞ
ØÛ\ÜÓ˜[YNˆËMMŸJ_JW_J_Y[˜Ý[ÛˆÎJÚXÛÛŽ™OZKšœÞ
ØÛ\ÜÓ˜[YNˆËMˆMˆŸJKÛÛXÚÎX™[›‹ÜÚ][ÛŽœH˜›ÝÛK\šYÚ‹Û\ÜÓ˜[YN˜_J^Ü™]\›ˆKšœÞÊ˜]Ûˆ‹ÛÛÛXÚÎÛ\ÜÓ˜[YN–
˜™Ë\š[X\žH^\š[X\žKY›Ü™YÜ›Ý[™›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆÚYÝËVÝ˜\ŠK\ÚYÝËY˜XŠWHÝ™\ŽœØØ[KLLHXÝ]™NœØØ[KNMH˜[œÚ][Û‹]˜[œÙ›Ü›H\˜][Û‹LML‹M‹ÈšLMMˆ›Ý[™YY[Ø\LˆŽˆËLMLM›Ý[™YY[‹OOH˜›ÝÛK\šYÚ‰‰ˆ™š^Y›ÝÛKLšYÚMˆ‹OOH˜›ÝÛKXÙ[\ˆ‰‰ˆ™š^Y›ÝÛKLYLKÌˆ]˜[œÛ]K^LKÌˆ‹JKÚ[™[Ž–ÙK‰‰šKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ^VÌMœH›Û\Ù[ZX›Û‹Ú[™[Ž›ŸJW_J_Y[˜Ý[Ûˆ‘YJ
^ØÛÛœÝÙKOTË\ÙTÝ]JLJKÛ‹—OTË\ÙTÝ]JLJKÝØ\Ý˜_O\ÛŠ
NÜ™]\›ˆKšœÞÊØÛ\ÜÓ˜[YNˆ˜™ËX˜XÚÙÜ›Ý[™‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆœÝXÚÞHÜL‹M™ËX˜XÚÙÜ›Ý[™Î˜XÚÙ›ÜX›\‹[Y›Ü™\‹Xˆ›Ü™\‹X›Ü™\ˆMˆKM›^][\ËXÙ[\ˆ\ÝYžKX™]ÙY[ˆ‹Ú[™[Ž–ÚKšœÞ
šH‹ØÛ\ÜÓ˜[YNˆ^VÌŒH›ÛX›Û^Y›Ü™YÜ›Ý[™‹Ú[™[Žˆ‘\ÚYÛˆÞ\Ý[HŸJKKšœÞ
‹ÛX™[ˆ˜\‘ØÝÜˆ‹˜\šX[ˆœš[X\žH‹Ú^™NˆœÛHŸJW_JKKšœÞ
	KØÛ\ÜÓ˜[YNˆœ‹LLˆ‹Ú[™[ŽšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆœMˆÜXÙK^KLL]Mˆ‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
˜KÝ]Nˆ´)´,´-t`´,‹Û\ÜÓ˜[YNˆ›]LŸJKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™ÜšYÜšYXÛÛËMØ\M‹Ú[™[Ž–ÚKšœÞ
\ËÛ˜[YNˆ”š[X\žH‹Û\ÜÓ˜[YNˆ˜™Ë\š[X\žHŸJKKšœÞ
\ËÛ˜[YNˆ˜XÚÙÜ›Ý[™‹Û\ÜÓ˜[YNˆ˜™ËX˜XÚÙÜ›Ý[™›Ü™\ˆ›Ü™\‹X›Ü™\ˆŸJKKšœÞ
\ËÛ˜[YNˆØ\™‹Û\ÜÓ˜[YNˆ˜™ËXØ\™›Ü™\ˆ›Ü™\‹XØ\™X›Ü™\ˆŸJKKšœÞ
\ËÛ˜[YNˆ“]]Y‹Û\ÜÓ˜[YNˆ˜™Ë[]]YŸJKKšœÞ
\ËÛ˜[YNˆ”ÝXØÙ\ÜÈ‹Û\ÜÓ˜[YNˆ˜™Ë\ÝXØÙ\ÜÈŸJKKšœÞ
\ËÛ˜[YNˆ•Ø\›š[™È‹Û\ÜÓ˜[YNˆ˜™Ë]Ø\›š[™ÈŸJKKšœÞ
\ËÛ˜[YNˆ‘[™Ù\ˆ‹Û\ÜÓ˜[YNˆ˜™ËY\ÝXÝ]™HŸJKKšœÞ
\ËÛ˜[YNˆ’[™›È‹Û\ÜÓ˜[YNˆ˜™ËZ[™›ÈŸJW_JW_JKKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
˜KÝ]Nˆ´(´.4/ô/´,ô`4,4a4.4.´,ŸJKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆœÜXÙK^KM™XØ\™MH‹Ú[™[Ž–ÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ^VÌÌœH›ÛX›Û^Y›Ü™YÜ›Ý[™‹Ú[™[Žˆ´%ô,4,ô/´.ô/´,´/´.ˆ4`t`´`4,4/t.4a´bÈŸJKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ^VÌH›ÛX›Û^Y›Ü™YÜ›Ý[™‹Ú[™[Žˆ´%ô,4,ô/´.ô/´,´/´.ˆ4`4,4-ô-4-t.ô,ŸJKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ^VÌŒH›Û\Ù[ZX›Û^Y›Ü™YÜ›Ý[™‹Ú[™[Žˆ´'ô/´-4-ô,4,ô/´.ô/´,´/´.ˆŸJKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ^VÌMœH^Y›Ü™YÜ›Ý[™‹Ú[™[Žˆ´'´`t/t/´,´/t/´.H4`´-t.´`t`ˆŸJKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ^VÌMH^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Žˆ´$´`t/ô/´/4/´,ô,4`´-t.ôc4/tbô.H4`´-t.´`t`ˆŸJKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ^VÌLœH›Û[YY][H\\˜Ø\ÙH˜XÚÚ[™Ë]ÚYH^Y›Ü™YÜ›Ý[™‹Ú[™[Žˆ´'4%t(´&´$ŸJW_JW_JKKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
˜KÝ]Nˆ´&´/t/´/ô.´.ŸJKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆœÜXÙK^KM‹Ú[™[Ž–ÚKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^›^]Ü˜\Ø\LÈ‹Ú[™[Ž–ÚKšœÞ
ÙKÝ˜\šX[ˆœš[X\žH‹Ú[™[Žˆ”š[X\žHŸJKKšœÞ
ÙKÝ˜\šX[ˆœÙXÛÛ™\žH‹Ú[™[Žˆ”ÙXÛÛ™\žHŸJKKšœÞ
ÙKÝ˜\šX[ˆ›Ý][™H‹Ú[™[Žˆ“Ý][™HŸJKKšœÞ
ÙKÝ˜\šX[ˆ™ÚÜÝ‹Ú[™[Žˆ‘ÚÜÝŸJKKšœÞ
ÙKÝ˜\šX[ˆ™\ÝXÝ]™H‹Ú[™[Žˆ‘\ÝXÝ]™HŸJW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^›^]Ü˜\Ø\LÈ][\ËY[™‹Ú[™[Ž–ÚKšœÞ
ÙKÜÚ^™NˆœÛH‹Ú[™[Žˆ”ÛX[ŸJKKšœÞ
ÙKÜÚ^™Nˆ›Y‹Ú[™[Žˆ“YY][HŸJKKšœÞ
ÙKÜÚ^™Nˆ›È‹Ú[™[Žˆ“\™ÙHŸJW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^›^]Ü˜\Ø\LÈ‹Ú[™[Ž–ÚKšœÞ
ÙKÛØY[™ÎˆLÚ[™[Žˆ´%ô,4,ô`4`ô-ô.´,ŸJKKšœÞ
ÙKÙ\ØX›YˆLÚ[™[Žˆ´'´`´.´.ôc´aô-t/t,ŸJW_JKKšœÞ
ÙKÙ[ÚYˆLÚ[™[Žˆ´'t,4,´`tcˆ4b4.4`4.4/t`ÈŸJKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^›^]Ü˜\Ø\LÈ‹Ú[™[Ž–ÚKšœÞ
ÙKÛYXÛÛŽšKšœÞ
ØÛ\ÜÓ˜[YNˆËMHMHŸJKÚ[™[Žˆ´'t/´,´,4cÈ4-ô,4-4,4aô,ŸJKKšœÞ
ÙKÜšYÚXÛÛŽšKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆËMHMHŸJK˜\šX[ˆœÙXÛÛ™\žH‹Ú[™[Žˆ´%4,4.ô-t-HŸJW_JW_JW_JKKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
˜KÝ]Nˆ´'ô/´.ôcÈ4,´,´/´-4,ŸJKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆœÜXÙK^KM‹Ú[™[Ž–ÚKšœÞ
™KÛX™[ˆ´'t,4-ô,´,4/t.4-H4-ô,4,´-t-4-t/t.4cÈ‹XÙZÛ\Žˆ´$´,´-t-4.4`´-H4/t,4-ô,´,4/t.4-K‹‹ˆŸJKKšœÞ
™KÛYXÛÛŽšKšœÞ
KØÛ\ÜÓ˜[YNˆËMHMHŸJKXÙZÛ\Žˆ´'ô/´.4`t.‹‹‹ˆŸJKKšœÞ
™KÝ\Nˆœ\ÜÝÛÜ™‹XÙZÛ\Žˆ´'ô,4`4/´.ôc‹šYÚ[[Y[šKšœÞ
˜]Ûˆ‹ØÛ\ÜÓ˜[YNˆ^[]]YY›Ü™YÜ›Ý[™Ý™\Ž^Y›Ü™YÜ›Ý[™‹Ú[™[ŽšKšœÞ
[KØÛ\ÜÓ˜[YNˆËMHMHŸJ_J_JKKšœÞ
™KÛX™[ˆ´(t`ô/4/4,‹Y˜][˜[YNˆ˜X˜È‹\œ›ÜŽˆ´'ô/´.ô-H4/´,tcô-ô,4`´-t.ôc4/t/ˆ4-4.ôcÈ4-ô,4/ô/´.ô/t-t/t.4cÈŸJKKšœÞ
™KÛX™[ˆ´'t.4.´/t-t.t/‹[ˆ´$t`ô-4-t`ˆ4/´`´/´,t`4,4-´,4`´c4`tcÈ4,ˆ4/ô`4/´a4.4.ô-HŸJKKšœÞ
™KÙ\ØX›YˆLY˜][˜[YNˆ´'t-t,4.´`´.4,´/t/´-H4/ô/´.ô-HŸJKKšœÞ
ÛËÛX™[ˆ´'´/ô.4`t,4/t.4-H‹XÙZÛ\Žˆ´'´/ô.4`t,4/t.4-K‹‹ˆ‹›ÝÜÎŒßJW_JW_JKKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
˜KÝ]Nˆ´&´,4`4`´/´aô.´.ŸJKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆœÜXÙK^KM‹Ú[™[Ž–ÚKšœÞ
‹ØÚ[™[ŽšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆØ\LÈ‹Ú[™[Ž–ÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆËLLLL›Ý[™YY[™Ë\š[X\žKÌL^\š[X\žH›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆ‹Ú[™[ŽšKšœÞ
”KØÛ\ÜÓ˜[YNˆËMHMHŸJ_JKKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
šÈ‹ØÛ\ÜÓ˜[YNˆ™›Û\Ù[ZX›Û^Y›Ü™YÜ›Ý[™‹Ú[™[Žˆ´$t,4-ô/´,´,4cÈ4.´,4`4`´/´aô.´,ŸJKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^\ÛH^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Žˆ´(t/´-4-t`4-´.4/4/´-H4.´,4`4`´/´aô.´.ŸJW_JW_J_JKKšœÞ
‹ÚXY\ŽšKšœÞ
šÈ‹ØÛ\ÜÓ˜[YNˆ™›Û\Ù[ZX›Û^Y›Ü™YÜ›Ý[™‹Ú[™[Žˆ´(H4-ô,4,ô/´.ô/´,´.´/´/4.4/ô/´-4,´,4.ô/´/ŸJK›ÛÝ\ŽšKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^\ÝYžKY[™‹Ú[™[ŽšKšœÞ
ÙKÜÚ^™NˆœÛH‹Ú[™[Žˆ´%4-t.t`t`´,´.4-HŸJ_JKÚ[™[ŽšKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^Y›Ü™YÜ›Ý[™‹Ú[™[Žˆ´'´`t/t/´,´/t/´.H4.´/´/t`´-t/t`ˆ4.´,4`4`´/´aô.´.ŸJ_JKKšœÞÊ‹ÚÝ™\˜X›NˆLÚ[™[Ž–ÚKšœÞ
šÈ‹ØÛ\ÜÓ˜[YNˆ™›Û\Ù[ZX›Û^Y›Ü™YÜ›Ý[™‹Ú[™[Žˆ´&4/t`´-t`4,4.´`´.4,´/t,4cÈ4.´,4`4`´/´aô.´,ŸJKKšœÞ
œ‹ØÛ\ÜÓ˜[YNˆ^\ÛH^[]]YY›Ü™YÜ›Ý[™]LH‹Ú[™[Žˆ´'t,4,´-t-4.4`´-H4.4.ô.4/t,4-´/4.4`´-HŸJW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™ÜšYÜšYXÛÛËLˆØ\M‹Ú[™[Ž–ÚKšœÞ
KÛX™[ˆ´$´bô`4`ôaô.´,‹˜[YNˆŒLŒ8 ¯H‹™[™ˆŠÍIH‹™[™ÜÚ]]™NˆLJKKšœÞ
KÛX™[ˆ´'´b4.4,t.´.‹˜[YNˆŒÈ‹™[™ˆ‹LH‹™[™ÜÚ]]™NˆL_JW_JW_JW_JKKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
˜KÝ]Nˆ´$t-t.t-4-´.ŸJKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^›^]Ü˜\Ø\LÈX‹M‹Ú[™[Ž–ÚKšœÞ
‹ÛX™[ˆ”š[X\žH‹˜\šX[ˆœš[X\žHŸJKKšœÞ
‹ÛX™[ˆ”ÝXØÙ\ÜÈ‹˜\šX[ˆœÝXØÙ\ÜÈŸJKKšœÞ
‹ÛX™[ˆ•Ø\›š[™È‹˜\šX[ˆØ\›š[™ÈŸJKKšœÞ
‹ÛX™[ˆ‘[™Ù\ˆ‹˜\šX[ˆ™[™Ù\ˆŸJKKšœÞ
‹ÛX™[ˆ“™]]˜[‹˜\šX[ˆ›™]]˜[ŸJKKšœÞ
‹ÛX™[ˆ’[™›È‹˜\šX[ˆš[™›ÈŸJW_JKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^›^]Ü˜\Ø\LÈ‹Ú[™[Ž–ÚKšœÞ
‹ÛX™[ˆ”š[X\žH‹˜\šX[ˆœš[X\žH‹ÝˆLJKKšœÞ
‹ÛX™[ˆ”ÝXØÙ\ÜÈ‹˜\šX[ˆœÝXØÙ\ÜÈ‹ÝˆLJKKšœÞ
‹ÛX™[ˆ•Ø\›š[™È‹˜\šX[ˆØ\›š[™È‹ÝˆLJKKšœÞ
‹ÛX™[ˆ‘[™Ù\ˆ‹˜\šX[ˆ™[™Ù\ˆ‹ÝˆLJKKšœÞ
‹ÛX™[ˆ“™]]˜[‹˜\šX[ˆ›™]]˜[‹ÝˆLJKKšœÞ
‹ÛX™[ˆ’[™›È‹˜\šX[ˆš[™›È‹ÝˆLJW_JW_JKKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
˜KÝ]Nˆ´$4.ô-t`4`´bÈŸJKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆœÜXÙK^KM‹Ú[™[Ž–ÚKšœÞ
KÝ˜\šX[ˆš[™›È‹]Nˆ´&4/ta4/´`4/4,4a´.4cÈ‹\ØÜš\[ÛŽˆ´(t.4`t`´-t/4,4,tbô.ô,4`ô`t/ô-tb4/t/ˆ4/´,t/t/´,´.ô-t/t,ˆŸJKKšœÞ
KÝ˜\šX[ˆœÝXØÙ\ÜÈ‹]Nˆ´(ô`t/ô-tb4/t/ˆ‹\ØÜš\[ÛŽˆ´$´`t-H4-ô,4-4,4aô.4,´bô/ô/´.ô/t-t/tbËˆŸJKKšœÞ
KÝ˜\šX[ˆØ\›š[™È‹]Nˆ´$´/t.4/4,4/t.4-H‹\ØÜš\[ÛŽˆ´&4`t`´-t.´,4-t`ˆ4`t`4/´.ˆ4,ô/´-4/t/´`t`´.ˆŸJKKšœÞ
KÝ˜\šX[ˆ™[™Ù\ˆ‹]Nˆ´'´b4.4,t.´,‹\ØÜš\[ÛŽˆ´'t-H4`ô-4,4.ô/´`tc4/ô/´-4.´.ôc´aô.4`´c4`tcÈ4.ˆ4`t-t`4,´-t`4`ËˆŸJW_JW_JKKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
˜KÝ]Nˆ´%4.4,4.ô/´,ô.4.ÚY]ŸJKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™ÜšYÜšYXÛÛËLˆØ\M‹Ú[™[Ž–ÚKšœÞ
‹ÜY[™ÎˆLÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆKN‹Ú[™[ŽšKšœÞ
ÙKÛÛÛXÚÎŠ
OO
L
KÚ[™[Žˆ´'´`´.´`4bô`´c4-4.4,4.ô/´,ÈŸJ_JKKšœÞ
‹ÜY[™ÎˆLÛ\ÜÓ˜[YNˆ™›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆKN‹Ú[™[ŽšKšœÞ
ÙKÛÛÛXÚÎŠ
OOœŠL
K˜\šX[ˆœÙXÛÛ™\žH‹Ú[™[Žˆ´'´`´.´`4bô`´cÚY]ŸJ_JW_JKKšœÞ
Õ‹ÛÜ[Ž™KÛÛÜÙNŠ
OO
LJK]Nˆ´'ô/´-4`´,´-t`4-´-4-t/t.4-H4-4-t.t`t`´,´.4cÈ‹\ØÜš\[ÛŽˆ´+t`´/ˆ4-4-t.t`t`´,´.4-H4/t-t.ôc4-ôcÈ4/´`´/4-t/t.4`´cˆ4$´bÈ4`ô,´-t`4-t/tbË4aô`´/ˆ4at/´`´.4`´-H4/ô`4/´-4/´.ô-´.4`´cÈ‹›ÛÝ\ŽšKšœÞÊK‘œ˜YÛY[ØÚ[™[Ž–ÚKšœÞ
ÙKÝ˜\šX[ˆœÙXÛÛ™\žH‹[ÚYˆLÛÛXÚÎŠ
OO
LJKÚ[™[Žˆ´'´`´/4-t/t,ŸJKKšœÞ
ÙKÝ˜\šX[ˆ™\ÝXÝ]™H‹[ÚYˆLÛÛXÚÎŠ
OO
LJKÚ[™[Žˆ´(ô-4,4.ô.4`´cŸJW_J_JKKšœÞ
ÜËÛÜ[Ž›‹ÛÛÜÙNŠ
OOœŠLJK]Nˆ´'4-t/tcˆ4-4-t.t`t`´,´.4.H‹Ú[™[ŽšKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆœÜXÙK^KLH‹Ú[™[Ž–È´'ô/´-4-t.ô.4`´c4`tcÈ‹´(4-t-4,4.´`´.4`4/´,´,4`´c‹´&´/´/ô.4`4/´,´,4`´c4`t`tbô.ô.´`È‹´(ô-4,4.ô.4`´c—K›X\

Ë
OOšKšœÞ
˜]Ûˆ‹ÛÛÛXÚÎŠ
OOœŠLJKÛ\ÜÓ˜[YNˆËY[^[YMKLÈ^VÌMœH^Y›Ü™YÜ›Ý[™›Û[YY][H›Ý[™Y^Ý™\Ž˜™Ë[]]Y˜[œÚ][Û‹XÛÛÜœÈXÝ]™NœØØ[KNMH‹Ú[™[ŽœßK
J_J_JW_JKKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
˜KÝ]Nˆ´(ô,´-t-4/´/4.ô-t/t.4cÈ
Ø\Ý
HŸJKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™ÜšYÜšYXÛÛËLˆØ\LÈ‹Ú[™[Ž–ÚKšœÞ
ÙKÝ˜\šX[ˆœÙXÛÛ™\žH‹ÛÛXÚÎŠ
OO˜JÝ]Nˆ´(t/´at`4,4/t-t/t/ˆ‹\ØÜš\[ÛŽˆ´&4-ô/4-t/t-t/t.4cÈ4`ô`t/ô-tb4/t/ˆ4/ô`4.4/4-t/t-t/tbÈ‹˜\šX[ˆœÝXØÙ\ÜÈŸJKÚ[™[Žˆ”ÝXØÙ\ÜÈŸJKKšœÞ
ÙKÝ˜\šX[ˆœÙXÛÛ™\žH‹ÛÛXÚÎŠ
OO˜JÝ]Nˆ´'´b4.4,t.´,4`t/´at`4,4/t-t/t.4cÈ‹\ØÜš\[ÛŽˆ´'ô`4/´,´-t`4c4`´-H4`t/´-t-4.4/t-t/t.4-H4`H4.4/t`´-t`4/t-t`´/´/‹˜\šX[ˆ™\œ›ÜˆŸJKÚ[™[Žˆ‘\œ›ÜˆŸJKKšœÞ
ÙKÝ˜\šX[ˆœÙXÛÛ™\žH‹ÛÛXÚÎŠ
OO˜JÝ]Nˆ´%ô,4/ô,4`tbÈ4/t,4.4`tat/´-4-H‹\ØÜš\[ÛŽˆ´'´`t`´,4.ô/´`tc4/4,4.ô/ˆ4`t.4`4/´/ô/´,ˆ‹˜\šX[ˆØ\›š[™ÈŸJKÚ[™[Žˆ•Ø\›š[™ÈŸJKKšœÞ
ÙKÝ˜\šX[ˆœÙXÛÛ™\žH‹ÛÛXÚÎŠ
OO˜JÝ]Nˆ´'t/´,´/´-H4`t/´/´,tbt-t/t.4-H‹\ØÜš\[ÛŽˆ´(È4,´,4`HH4/t-t/ô`4/´aô.4`´,4/t/t/´-H4`t/´/´,tbt-t/t.4-H‹˜\šX[ˆš[™›ÈŸJKÚ[™[Žˆ’[™›ÈŸJW_JW_JKKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
˜KÝ]Nˆ‘PˆŸJKKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆœ™[]]™HLÌˆ™Ë[]]YÌÌ›Ü™\ˆ›Ü™\‹X›Ü™\ˆ›Ý[™YLžÝ™\™›ÝËZY[ˆ›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆ‹Ú[™[Ž–ÚKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ^[]]YY›Ü™YÜ›Ý[™^\ÛH‹Ú[™[Žˆ´%4-t/4/´/t`t`´`4,4a´.4/´/t/tbô.H4.´/´/t`´-t.t/t-t`ŸJKKšœÞ
ÎKÜÜÚ][ÛŽˆ˜›ÝÛK\šYÚ‹Û\ÜÓ˜[YNˆ˜XœÛÛ]H›ÝÛKMšYÚM‹ÛÛXÚÎŠ
OO˜JÝ]Nˆ‘Pˆ4't,4-´,4`ˆ‹˜\šX[ˆœÝXØÙ\ÜÈŸJ_JKKšœÞ
ÎKÜÜÚ][ÛŽˆ˜›ÝÛKXÙ[\ˆ‹X™[ˆ´'t/´,´bô.H4-ô,4.´,4-È‹Û\ÜÓ˜[YNˆ˜XœÛÛ]H›ÝÛKMYLKÌˆ]˜[œÛ]K^LKÌˆ‹ÛÛXÚÎŠ
OO˜JÝ]Nˆ‘^[™YPˆ4't,4-´,4`ˆ‹˜\šX[ˆš[™›ÈŸJ_JW_JW_JW_J_JW_J_Y[˜Ý[Ûˆ\ÊÛ˜[YN™KÛ\ÜÓ˜[YNJ^Ü™]\›ˆKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^›^XÛÛ][\ËXÙ[\ˆØ\Lˆ‹Ú[™[Ž–ÚKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YN–
ËLMˆLMˆ›Ý[™YVÌMœHÚYÝË\ÛH‹
_JKKšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ^VÌLœH›Û[YY][H^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Ž™_JW_J_X\Þ[˜È[˜Ý[ÛˆQYJ
^Ø]ØZ]™ÙÛÝ]Ù\ÜÚ[ÛŠ
NØÛÛœÝOV×NÝž^ØÛÛœÝ[ØØ[ÝÜ˜YÙK›[™ÝP\œ˜^K™œ›ÛJÛ[™ÝK
‹JOO›ØØ[ÝÜ˜YÙKšÙ^JJJK™š[\Š›ÛÛX[ŠNÛØØ[ÝÜ˜YÙK˜ÛX\Š
KKœ\Ú
ÛX™[ˆ›ØØ[ÝÜ˜YÙH‹]Z[˜	Û‹›[™ÝH4.´.ôc´aô-t.H4`ô-4,4.ô-t/t/˜J_XØ]Ú

^ÙKœ\Ú
ÛX™[ˆ›ØØ[ÝÜ˜YÙH‹]Z[˜4'´b4.4,t.´,ˆ	ÝXJ_]ž^ØÛÛœÝ\Ù\ÜÚ[Û”ÝÜ˜YÙK›[™ÝÜÙ\ÜÚ[Û”ÝÜ˜YÙK˜ÛX\Š
KKœ\Ú
ÛX™[ˆœÙ\ÜÚ[Û”ÝÜ˜YÙH‹]Z[˜	ÝH4.´.ôc´aô-t.H4`ô-4,4.ô-t/t/˜J_XØ]Ú

^ÙKœ\Ú
ÛX™[ˆœÙ\ÜÚ[Û”ÝÜ˜YÙH‹]Z[˜4'´b4.4,t.´,ˆ	ÝXJ_]ž^ØÛÛœÝYØÝ[Y[˜ÛÛÚÚYKœÜ]
ŽÈŠNÛ]LÙ›ÜŠÛÛœÝˆÙˆ
^ØÛÛœÝO\‹œÜ]
HŠVÌKš[J
NØI‰ŠØÝ[Y[˜ÛÛÚÚYOX	Ø_ONÈ^\™\ÏUKH˜[ˆNMÌŒŒÓUÈ]KØØÝ[Y[˜ÛÛÚÚYOX	Ø_ONÈ^\™\ÏUKH˜[ˆNMÌŒŒÓUÈ]KØ˜\™ØÝÜ˜ØÝ[Y[˜ÛÛÚÚYOX	Ø_ONÈ^\™\ÏUKH˜[ˆNMÌŒŒÓUŠÊÊ_YKœ\Ú
ÛX™[ˆÛÛÚÚY\È‹]Z[›ŒØ	ÛŸH4.´`ô.´.4`ô-4,4.ô-t/t/˜ˆ´'t-t`ˆ4.´`ô.´.ŸJ_XØ]Ú

^ÙKœ\Ú
ÛX™[ˆÛÛÚÚY\È‹]Z[˜4'´b4.4,t.´,ˆ	ÝXJ_]ž^ÚYŠ\[Ùˆ[™^YH‰‰š[™^Y‹™]X˜\Ù\Ê^ØÛÛœÝX]ØZ][™^Y‹™]X˜\Ù\Ê
NÝ›[™ÝOOLÙKœ\Ú
ÛX™[ˆ’[™^Yˆ‹]Z[ˆ´'t-t`ˆ4,t,4-È4-4,4/t/tbôaHŸJNŠ]ØZ]›ÛZ\ÙK˜[
›X\

Û˜[YN›ŸJOO›Û™]È›ÛZ\ÙJ
‹JOOžØÛÛœÝÏZ[™^Y‹™[]Q]X˜\ÙJŠNÜË›ÛœÝXØÙ\ÜÏJ
OOœŠ
KË›Û™\œ›ÜJ
OO˜JË™\œ›ÜŠKË›Û˜›ØÚÙYJ
OOœŠ
_JN”›ÛZ\ÙKœ™\ÛÛ™J
JJKKœ\Ú
ÛX™[ˆ’[™^Yˆ‹]Z[˜	Ý›[™ÝH4$t%4`ô-4,4.ô-t/t/˜JJ_Y[ÙHKœ\Ú
ÛX™[ˆ’[™^Yˆ‹]Z[ˆTH4/t-t-4/´`t`´`ô/ô-t/HŸJ_XØ]Ú

^ÙKœ\Ú
ÛX™[ˆ’[™^Yˆ‹]Z[˜4'´b4.4,t.´,ˆ	ÝXJ_]ž^ÚYŠ\[ÙˆØXÚ\ÏHŠ^ØÛÛœÝX]ØZ]ØXÚ\ËšÙ^\Ê
NÝ›[™ÝOOLÙKœ\Ú
ÛX™[ˆØXÚHTH‹]Z[ˆ´'t-t`ˆ4.´ctb4-t.HŸJNŠ]ØZ]›ÛZ\ÙK˜[
›X\
O˜ØXÚ\Ë™[]JŠJJKKœ\Ú
ÛX™[ˆØXÚHTH‹]Z[˜	Ý›[™ÝH4.´ctb4-t.H4`ô-4,4.ô-t/t/˜JJ_Y[ÙHKœ\Ú
ÛX™[ˆØXÚHTH‹]Z[ˆTH4/t-t-4/´`t`´`ô/ô-t/HŸJ_XØ]Ú

^ÙKœ\Ú
ÛX™[ˆØXÚHTH‹]Z[˜4'´b4.4,t.´,ˆ	ÝXJ_]ž^ÚYŠœÙ\šXÙUÛÜšÙ\ˆš[ˆ˜]šYØ]ÜŠ^ØÛÛœÝX]ØZ]˜]šYØ]Ü‹œÙ\šXÙUÛÜšÙ\‹™Ù]™YÚ\Ý˜][ÛœÊ
NØ]ØZ]›ÛZ\ÙK˜[
›X\
O›‹[œ™YÚ\Ý\Š
JJK›[™ÝŒ	‰™Kœ\Ú
ÛX™[ˆ”Ù\šXÙHÛÜšÙ\œÈ‹]Z[˜	Ý›[™ÝH4/´`´/4-t/t-t/t/˜J__XØ]Úß\™]\›ˆ_Y[˜Ý[ÛˆQYJ
^ØÛÛœÝÙKOTË\ÙTÝ]J×JKÛ‹—OTË\ÙTÝ]JLJNÜ™]\›ˆË\ÙQY™™XÝ


OOžØQYJ
K[ŠOOžÝ
JKŠL
KÙ][Y[Ý]


OOžØÛÛœÝÏH‹È‹œ™\XÙJ×ÉËˆŠOÏÈˆŽÝÚ[™ÝË›ØØ][Û‹œ™\XÙJ	ÜßKÛÙÚ[˜
_KŒŒ
_J_K×JKKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆ›Z[‹ZYš›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆ™ËX˜XÚÙÜ›Ý[™Mˆ‹Ú[™[ŽšKšœÞÊË™]‹Ú[š]X[žÛÜXÚ]NŒØØ[N‹ŽLŸK[š[X]NžÛÜXÚ]NŒKØØ[NŒ_K˜[œÚ][ÛŽžÙ\˜][ÛŽ‹X\ÙN–ËŒŒ‹KŒÍ‹W_KÛ\ÜÓ˜[YNˆ™›^›^XÛÛ][\ËXÙ[\ˆØ\MH^XÙ[\ˆËY[X^]ËVÌÍH‹Ú[™[Ž–ÚKšœÞ
Ë™]‹Ú[š]X[žÜØØ[NŒK[š[X]NžÜØØ[NŒ_K˜[œÚ][ÛŽžÙ[^N‹ŒMK\NˆœÜš[™È‹ÝY™›™\ÜÎŒŒ[\[™ÎŒNKÛ\ÜÓ˜[YNˆËLŒLŒ›Ý[™YVÌŽH™ËY\ÝXÝ]™KÌL›^][\ËXÙ[\ˆ\ÝYžKXÙ[\ˆ‹Ú[™[ŽšKšœÞ
œÝ™È‹ÝÚYˆ‹ZYÚˆ‹šY]Ð›ÞˆŒ‹š[ˆ››Û™H‹Û\ÜÓ˜[YNˆ^Y\ÝXÝ]™H‹Ú[™[ŽšKšœÞ
œ]‹Ùˆ“NŒLLˆLˆHH‹ŒH‹ŽNŒŒL“NŒMˆ‹Ý›ÚÙNˆ˜Ý\œ™[ÛÛÜˆ‹Ý›ÚÙUÚYˆŒ‹Ž‹Ý›ÚÙS[™XØ\ˆœ›Ý[™‹Ý›ÚÙS[™Z›Ú[Žˆœ›Ý[™ŸJ_J_JKKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
šH‹ØÛ\ÜÓ˜[YNˆ^VÌŒœH›ÛX›Û^Y›Ü™YÜ›Ý[™˜XÚÚ[™Ë]YÚ‹Ú[™[Ž›È´(t,t`4/´`H4,´bô/ô/´.ô/t-t/HŽˆ´(ô-4,4.ôcô-t/4-4,4/t/tbô-x )ˆŸJK‰‰šKšœÞ
ËœÚ[š]X[žÛÜXÚ]NŒNŸK[š[X]NžÛÜXÚ]NŒKNŒKÛ\ÜÓ˜[YNˆ^VÌMH^[]]YY›Ü™YÜ›Ý[™]LH‹Ú[™[Žˆ´$´`t-H4-4,4/t/tbô-H4`ô-4,4.ô-t/tbËˆ4'ô-t`4-t-ô,4/ô`ô`t.¸ )ˆŸJW_JKK›[™ÝŒ	‰šKšœÞ
Ë™]‹Ú[š]X[žÛÜXÚ]NŒNŽK[š[X]NžÛÜXÚ]NŒKNŒKÛ\ÜÓ˜[YNˆËY[™ËXØ\™›Ü™\ˆ›Ü™\‹X›Ü™\ˆ›Ý[™YLžM^[YÜXÙK^KLˆ‹Ú[™[Ž™K›X\
OOšKšœÞÊ™]ˆ‹ØÛ\ÜÓ˜[YNˆ™›^][\Ë\Ý\Ø\Lˆ‹Ú[™[Ž–ÚKšœÞÊœÝ™È‹ÝÚYˆŒM‹ZYÚˆŒM‹šY]Ð›ÞˆŒMM‹š[ˆ››Û™H‹Û\ÜÓ˜[YNˆ›]LHÚš[šËL^Y[Y\˜[ML‹Ú[™[Ž–ÚKšœÞ
˜Ú\˜ÛH‹ØÞˆÈ‹ÞNˆÈ‹Žˆˆ‹Ý›ÚÙNˆ˜Ý\œ™[ÛÛÜˆ‹Ý›ÚÙUÚYˆŒKHŸJKKšœÞ
œ]‹Ùˆ“MHÛKŽKŽËŒ‹LËˆ‹Ý›ÚÙNˆ˜Ý\œ™[ÛÛÜˆ‹Ý›ÚÙUÚYˆŒKH‹Ý›ÚÙS[™XØ\ˆœ›Ý[™‹Ý›ÚÙS[™Z›Ú[Žˆœ›Ý[™ŸJW_JKKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞÊœÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH›Û\Ù[ZX›Û^Y›Ü™YÜ›Ý[™‹Ú[™[Ž–ØK›X™[Žˆ—_JKˆ‹KšœÞ
œÜ[ˆ‹ØÛ\ÜÓ˜[YNˆ^VÌLÜH^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Ž˜K™]Z[JW_JW_KK›X™[
J_JK[‰‰šKšœÞ
™]ˆ‹ØÛ\ÜÓ˜[YNˆËNN›Ü™\‹Lˆ›Ü™\‹Y\ÝXÝ]™H›Ü™\‹]]˜[œÜ\™[›Ý[™YY[[š[X]K\Ü[ˆŸJK‰‰šKšœÞ
ËœÚ[š]X[žÛÜXÚ]NŒK[š[X]NžÛÜXÚ]NŒ_K˜[œÚ][ÛŽžÙ[^N‹KÛ\ÜÓ˜[YNˆ^VÌLÜH^[]]YY›Ü™YÜ›Ý[™‹Ú[™[Žˆ´'ô-t`4-t/t,4/ô`4,4,´.ô-t/t.4-H4/t,4ct.´`4,4/H4,´at/´-4,8 )ˆŸJW_J_J_XÛÛœÝÑYO[™]ÈÎÙ[˜Ý[Ûˆ™™[YT›Ùš[T™XÛÝ™\žUŒJ
^ØÛÛœÝOX™™[YPXØÙ\ÜÕŒJ
KÝOTË\ÙTÝ]J

OOžÝž^Ü™]\›ˆÙ\ÜÚ[Û”ÝÜ˜YÙK™Ù]][J™™[YT›Ùš[T™XÛÝ™\žRÙ^UŒJOOOYOËšYXØ]ÚÜ™]\›ˆL__JNÔË\ÙQY™™XÝ


OOžÚYŠY_
\™]\›ŽÝž^ÜÙ\ÜÚ[Û”ÝÜ˜YÙKœÙ]][J™™[YT›Ùš[T™XÛÝ™\žRÙ^UŒKKšY
_XØ]Úß]Ú[™ÝË›ØØ][Û‹˜\ÜÚYÛŠ™™[YRÛYUŒJ
J_KÙOËšYJNÜ™]\›ˆI‰ÚKšœÞ
›XZ[ˆ‹ÜÝ[NžÛZ[’ZYÚˆŒLš‹\Ü^Nˆ™ÜšY‹XÙR][\Îˆ˜Ù[\ˆ‹Y[™ÎŒ˜XÚÙÜ›Ý[™ˆˆÙÙŽ˜ÈŸKÚ[™[ŽšKšœÞÊœÙXÝ[Ûˆ‹ÜÝ[NžÝÚYˆ›Z[ŠL	KÌ
H‹Y[™ÎŒ›Ü™\ŽˆŒ\ÛÛYÙLÙM™Yˆ‹›Ü™\”˜Y]\ÎŒŒ‹˜XÚÙÜ›Ý[™ˆˆÙ™™ˆ‹^[YÛŽˆ˜Ù[\ˆŸKÚ[™[Ž–ÚKšœÞ
šH‹ÜÝ[NžÛX\™Ú[ŽŒ›ÛÚ^™NŒŒ‹ÛÛÜŽˆˆÌMLXL™ŸKÚ[™[Žˆ´'t-H4`ô-4,4.ô/´`tc4-ô,4,ô`4`ô-ô.4`´c4-ô,4,´-t-4-t/t.4-HŸJKKšœÞ
œ‹ÜÝ[NžÛX\™Ú[ŽˆŒLN‹›ÛÚ^™NŒM[™RZYÚŒKKÛÛÜŽˆˆÍÌHŸKÚ[™[Žˆ´$4.´.´,4`ô/t`ˆ4.4-ô,4,´-t-4-t/t.4-H4/t,4.t-4-t/tbËˆ4'ô/´,´`´/´`4.4`´-H4-ô,4,ô`4`ô-ô.´`È8 %4`t/´-ô-4,4,´,4`´c4/t/´,´/´-H4-ô,4,´-t-4-t/t.4-H4/t-H4/t`ô-´/t/‹ˆŸJKKšœÞ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎŠ
OOžÝž^ÜÙ\ÜÚ[Û”ÝÜ˜YÙKœ™[[Ý™R][J™™[YT›Ùš[T™XÛÝ™\žRÙ^UŒJ_XØ]Úß]Ú[™ÝË›ØØ][Û‹˜\ÜÚYÛŠ™™[YRÛYUŒJ
J_KÝ[NžÛZ[’ZYÚÚYˆŒL	H‹›Ü™\ŽŒ›Ü™\”˜Y]\ÎŒM˜XÚÙÜ›Ý[™ˆˆÍMÍLÙN‹ÛÛÜŽˆˆÙ™™ˆ‹›ÛÚ^™NŒM›ÛÙZYÚŽKÚ[™[Žˆ´'ô/´,´`´/´`4.4`´c4-ô,4,ô`4`ô-ô.´`ÈŸJW_J_JN›[Y[˜Ý[ÛˆÑYJØÛÛ\Û™[™_J^ÚYŠSÝ

J\™]\›ˆKšœÞ
ÔËÝÎˆ‹ÛÙÚ[ˆŸJNØÛÛœÝX™]]›ÛÝÝ˜\ŒÍ

NÜ™]\›ˆœÝ]OOOHœ™XYHÚKšœÞ
ÔËÝÎ˜™™[YRÛYUŒJ
_JNœÝ]OOOH›Û˜›Ø\™[™×Ü™\]Z\™YÚKšœÞ
KßJNœÝ]OOOH›ØY[™ÈÛ[šKšœÞ
™›ÛÝÝ˜\™XÛÝ™\žUŒÍßJ_Y[˜Ý[Ûˆ
ØÛÛ\Û™[™_J^ÚYŠSÝ

J\™]\›ˆKšœÞ
ÔËÝÎˆ‹ÛÙÚ[ˆŸJNØÛÛœÝX™]]›ÛÝÝ˜\ŒÍ

K]Ú[™ÝË›ØØ][Û‹œ]˜[YOOOH‹ÚÛYHŽÚYŠœÝ]OOOH›Û˜›Ø\™[™×Ü™\]Z\™YŠ\™]\›ˆKšœÞ
ÔËÝÎˆ‹ÜÙ]\ŸJNÚYŠœÝ]HOOHœ™XYHŠ\™]\›ˆœÝ]OOOH›ØY[™ÈÊÚKšœÞ
™]][XØ]YÛYP›ÛÝŒÍKßJN›[
NšKšœÞ
™›ÛÝÝ˜\™XÛÝ™\žUŒÍßJNØÛÛœÝÜ›Ùš[Nœ‹\Ô™XYN˜_OU[Š
NÜ™]\›ˆOÜÚKšœÞ
KßJNšKšœÞ
™›ÛÝÝ˜\™XÛÝ™\žUŒÍßJN›ÚKšœÞ
™]][XØ]YÛYP›ÛÝŒÍKßJN›[XÛÛœÝ™[X™YYYÙT]ÏVÈ‹ÛX\šÙ]‹‹ÛÜÜ[š]Y\È‹‹Ù]KXÛÛ›Û‹‹ÝX[KXXØÙ\ÜÈ‹‹Ú[YÜ˜][ÛœÈ‹‹Û›ÝYšXØ][ÛœÈ‹‹Ü™]šY]ÜÈ‹‹ÜØ[\ËZ[\Ü‹‹ÜÝ\Y\‹X[\›˜]]™\È‹‹Ý™[Y\ËÛ™]È—NÂ™[˜Ý[Ûˆ™™\\™Q[X™YYYÙJK
^ÂˆÛÛœÝYK˜Ý\œ™[\™Ù][‹˜ÛÛ[Ú[™ÝËO[‹˜ÛÛ[ØÝ[Y[ÂˆYŠ\ŸXJ\™]\›ŽÂˆÛÛœÝÏ\‹›ØØ][Û‹œ]˜[YK\‹›ØØ][Û‹œÙX\˜ÚO\‹›ØØ][Û‹š\ÚÂˆYŠX™[X™YYYÙT]Ëš[˜ÛY\ÊÊJ^Ý
ÊÛ
ÝJNÜ™]\›ŸBˆK™ØÝ[Y[[[Y[œÙ]]šX]J™]KX™Y[X™YY‹YHŠNÂˆYŠXK™Ù][[Y[žRY
˜™Y[X™YY\Ú[\Ý[HŠJ^ÂˆÛÛœÝXK˜Ü™X]Q[[Y[
›[šÈŠNÂˆšYH˜™Y[X™YY\Ú[\Ý[HŽÂˆœ™[HœÝ[\ÚY]ŽÂˆš™YH‹Ù[X™YY\Ú[]ŒŽK˜ÜÜÈŽÂˆKšXY˜\[™Ú[

BˆBˆYŠK™ØÝ[Y[[[Y[™]\Ù]˜™Ý]\’\ÝÜžP›Ý[™OOHYHŠ^ÂˆK™ØÝ[Y[[[Y[™]\Ù]˜™Ý]\’\ÝÜžP›Ý[™HYHŽÂˆÛÛœÝY[˜Ý[ÛŠŠ^Ü™]\›ˆ‹œ]˜[YOOOH‹Ù]KXÛÛ›Û‰‰‹œÙX\˜Ú\˜[\Ëš\Ê™]™[Š_‹œ]˜[YOOOH‹Ú[YÜ˜][ÛœÈ‰‰Š‹œÙX\˜Ú\˜[\Ëš\ÊšY]ÈŠI‰‹œÙX\˜Ú\˜[\Ë™Ù]
šY]ÈŠHOOH›Ý™\šY]ÈŸ‹œÙX\˜Ú\˜[\Ëš\Ê™›ÝÈŠI‰‹œÙX\˜Ú\˜[\Ë™Ù]
™›ÝÈŠHOOH›Ý™\šY]ÈŠ_‹œ]˜[YOOOH‹Û›ÝYšXØ][ÛœÈ‰‰‹œÙX\˜Ú\˜[\Ëš\ÊšY]ÈŠI‰‹œÙX\˜Ú\˜[\Ë™Ù]
šY]ÈŠHOOH›Ý™\šY]ÈŸKY[˜Ý[ÛŠŠ^Âˆ]ŽÂˆž^Ø[™]ÈT“
‹›ØØ][Û‹š™YŠ_XØ]ÚÜ™]\›ŸBˆ‹œÙX\˜Ú\˜[\Ë™[]J™[X™YYŠNÂˆÛÛœÝÏ[™]ÈT“
Ú[™ÝË›ØØ][Û‹š™YŠKOYËœÙX\˜Ú\˜[\Ë™Ù]
™[YHŠNÂˆI‰ˆX‹œÙX\˜Ú\˜[\Ëš\Ê™[YHŠI‰˜‹œÙX\˜Ú\˜[\ËœÙ]
™[YH‹JNÂˆÛÛœÝX‹œ]˜[YJØ‹œÙX\˜Ú
Ø‹š\ÚÏYËœ]˜[YJÙËœÙX\˜Ú
ÙËš\ÚÂˆYŠOOZÊ\™]\›ŽÂˆÛÛœÝOY
ÊKY
ŠNÂˆYŠI‰ˆ^‰‰OOHœ™\XÙHŠ^ÝÚ[™ÝËš\ÝÜžK˜˜XÚÊ
NÜ™]\›ŸBˆYŠOOHœ\ÚŸ\I‰žŠ^ÂˆYŠ\[ÙˆÚ[™ÝË˜™˜]šYØ]OOOH™[˜Ý[ÛˆŠ]Ú[™ÝË˜™˜]šYØ]JŠNÂˆ[Ù^ÝÚ[™ÝËš\ÝÜžKœ\ÚÝ]JÚ[™ÝËš\ÝÜžKœÝ]Kˆ‹ŠNÝÚ[™ÝË™\Ü]Ú]™[
™]ÈÜÝ]Q]™[
œÜÝ]H‹ÜÝ]NÚ[™ÝËš\ÝÜžKœÝ]_JJ_Bˆ™]\›‚ˆBˆÚ[™ÝËš\ÝÜžKœ™\XÙTÝ]JÚ[™ÝËš\ÝÜžKœÝ]Kˆ‹ŠNÂˆÚ[™ÝË™\Ü]Ú]™[
™]ÈÜÝ]Q]™[
œÜÝ]H‹ÜÝ]NÚ[™ÝËš\ÝÜžKœÝ]_JJBˆKO\‹š\ÝÜžKœ\ÚÝ]K˜š[™
‹š\ÝÜžJK\‹š\ÝÜžKœ™\XÙTÝ]K˜š[™
‹š\ÝÜžJNÂˆ‹š\ÝÜžKœ\ÚÝ]OY[˜Ý[ÛŠ
^ØÛÛœÝ[K˜\J[\™Ý[Y[ÊNÙŠœ\ÚŠNÜ™]\›ˆŸNÂˆ‹š\ÝÜžKœ™\XÙTÝ]OY[˜Ý[ÛŠ
^ØÛÛœÝZ˜\J[\™Ý[Y[ÊNÙŠœ™\XÙHŠNÜ™]\›ˆŸNÂˆ‹˜Y]™[\Ý[™\ŠœÜÝ]H‹[˜Ý[ÛŠ
^ÙŠœ™\XÙHŠ_JBˆBˆYŠK™ØÝ[Y[[[Y[™]\Ù]˜™˜]šYØ][Û›Ý[™OOHYHŠ\™]\›ŽÂˆK™ØÝ[Y[[[Y[™]\Ù]˜™˜]šYØ][Û›Ý[™HYHŽÂˆK˜Y]™[\Ý[™\Š˜ÛXÚÈ‹[˜Ý[ÛŠ
^ÂˆÛÛœÝY\™Ù]	‰™\™Ù]˜ÛÜÙ\ÝÙ\™Ù]˜ÛÜÙ\Ý
˜VÚ™Y—K]Û–Ù]K\›Ý]WHŠN›[ÂˆYŠYŠ\™]\›ŽÂˆYŠ‹YÓ˜[YOOOHH‰‰Š‹\™Ù]OOH—Ø›[šÈŸ‹š\Ð]šX]J™ÝÛ›ØYŠJJ\™]\›ŽÂˆÛÛœÝOY‹YÓ˜[YOOOHHÙ‹™Ù]]šX]Jš™YˆŠN™‹™Ù]]šX]J™]K\›Ý]HŠNÂˆYŠ[J\™]\›ŽÂˆ]Âˆž^Ú[™]ÈT“
K‹›ØØ][Û‹š™YŠ_XØ]ÚÜ™]\›ŸBˆYŠ›ÜšYÚ[ˆOO\‹›ØØ][Û‹›ÜšYÚ[Š\™]\›ŽÂˆYŠÏOOH‹Û›ÝYšXØ][ÛœÈ‰‰šœ]˜[YOOO\Ê^ÂˆÛÛœÝÏ[™]ÈT“
š™YŠKO[™]ÈT“
Ú[™ÝË›ØØ][Û‹š™YŠK^KœÙX\˜Ú\˜[\Ë™Ù]
™[YHŠNÂˆ‰‰ˆYËœÙX\˜Ú\˜[\Ëš\Ê™[YHŠI‰™ËœÙX\˜Ú\˜[\ËœÙ]
™[YH‹ŠNÂˆËœÙX\˜Ú\˜[\Ë™[]J™[X™YYŠNÂˆÛÛœÝYËœ]˜[YJÙËœÙX\˜Ú
ÙËš\Ú[™]ÈT“
Ëš™YŠNÂˆ‹œÙX\˜Ú\˜[\ËœÙ]
™[X™YY‹ŒHŠNÂˆœ™]™[Y˜][

NÂˆœÝÜ›ÜYØ][ÛŠ
NÂˆœÝÜ[[YYX]T›ÜYØ][ÛŠ
NÂˆÚ[™ÝËš\ÝÜžKœ™\XÙTÝ]JÚ[™ÝËš\ÝÜžKœÝ]Kˆ‹ŠNÂˆ‹š\ÝÜžKœ™\XÙTÝ]JØ™›ÝYšXØ][Û•šY]ÎˆLKˆ‹‹œ]˜[YJØ‹œÙX\˜Ú
Ø‹š\Ú
NÂˆ‹™\Ü]Ú]™[
™]È‹”ÜÝ]Q]™[
œÜÝ]H‹ÜÝ]Nœ‹š\ÝÜžKœÝ]_JJNÂˆ™]\›‚ˆBˆœ™]™[Y˜][

NÂˆœÝÜ›ÜYØ][ÛŠ
NÂˆœÝÜ[[YYX]T›ÜYØ][ÛŠ
NÂˆ
œ]˜[YJÚœÙX\˜Ú
Úš\Ú
BˆKYJBŸB™[˜Ý[Ûˆ™[X™YYYÙJÜÛÝ\˜ÙN™K]NJ^ÂˆÛÛœÝË—OX

K[™]ÈT“ÙX\˜Ú\˜[\ÊÚ[™ÝË›ØØ][Û‹œÙX\˜Ú
NÂˆ‹œÙ]
™[X™YY‹ŒHŠNÂˆÛÛœÝOYJÈÈŠÜ‹ÔÝš[™Ê
JÝÚ[™ÝË›ØØ][Û‹š\ÚÂˆ™]\›ˆKšœÞ
ÜÚÝÐ›ÝÛS˜]ŽˆLÛ\ÜÓ˜[YNˆ˜™ËVÈÑŽŽQ×H‹Ú[™[ŽšKšœÞ
šYœ˜[YH‹ÜÜ˜Î˜K]NÛ“ØYœÏO˜™™\\™Q[X™YYYÙJËŠKÝ[NžÙ\Ü^Nˆ˜›ØÚÈ‹ÚYˆŒL	H‹ZYÚˆ˜Ø[ÊLšH˜\ŠKX™ZXY\‹]Ý[
HHH[ŠØY™KX\™XKZ[œÙ]X›ÝÛJJH‹›Ü™\ŽŒ˜XÚÙÜ›Ý[™ˆˆÑŽŽQÈŸ_J_JBŸB™[˜Ý[Ûˆ™X\šÙ]YÙJ
^Ü™]\›ˆKšœÞ
™[X™YYYÙKÜÛÝ\˜ÙNˆ‹ÛX\šÙ]‹]Nˆ´$4/t,4.ô.4-È4`4bô/t.´,4.4.´/´/t.´`ô`4-t/t`´/´,ˆŸJ_B™[˜Ý[Ûˆ™ÜÜ[š]Y\ÔYÙJ
^Ü™]\›ˆKšœÞ
™[X™YYYÙKÜÛÝ\˜ÙNˆ‹ÛÜÜ[š]Y\È‹]Nˆ´&´,4.ô-t/t-4,4`4c4,´/´-ô/4/´-´/t/´`t`´-t.HŸJ_B™[˜Ý[Ûˆ™]PÛÛ›ÛYÙJ
^Ü™]\›ˆKšœÞ
™[X™YYYÙKÜÛÝ\˜ÙNˆ‹Ù]KXÛÛ›Û‹]Nˆ´&´/´/t`´`4/´.ôc4-4,4/t/tbôaHŸJ_Y[˜Ý[Ûˆ™X[PXØÙ\ÜÔYÙJ
^Ü™]\›ˆKšœÞ
™[X™YYYÙKÜÛÝ\˜ÙNˆ‹ÝX[KXXØÙ\ÜÈ‹]Nˆ´(4/´.ô.4.4-4/´`t`´`ô/ÈŸJ_B™[˜Ý[Ûˆ™[YÜ˜][ÛœÔYÙJ
^Ü™]\›ˆKšœÞ
™[X™YYYÙKÜÛÝ\˜ÙNˆ‹Ú[YÜ˜][ÛœÈ‹]Nˆ´&4/t`´-t,ô`4,4a´.4.˜\‘ØÝÜˆŸJ_B™[˜Ý[Ûˆ™›ÝYšXØ][ÛœÔYÙJ
^Ü™]\›ˆKšœÞ
™[X™YYYÙKÜÛÝ\˜ÙNˆ‹Û›ÝYšXØ][ÛœÈ‹]Nˆ´(ô,´-t-4/´/4.ô-t/t.4cÈ˜\‘ØÝÜˆŸJ_B™[˜Ý[Ûˆ™™]šY]ÜÔYÙJ
^Ü™]\›ˆKšœÞ
™[X™YYYÙKÜÛÝ\˜ÙNˆ‹Ü™]šY]ÜÈ‹]Nˆ´'´`´-ôbô,´bÈ4,ô/´`t`´-t.HŸJ_B™[˜Ý[Ûˆ™Ø[\Ò[\ÜYÙJ
^ØÛÛœÝËWOX

K[™]ÈT“ÙX\˜Ú\˜[\ÊÚ[™ÝË›ØØ][Û‹œÙX\˜Ú
NÝœÙ]
™[X™YY‹ŒHŠNØÛÛœÝH‹ÜØ[\ËZ[\ÜÈŠÝÔÝš[™Ê
JÝÚ[™ÝË›ØØ][Û‹š\ÚÜ™]\›ˆKšœÞ
šYœ˜[YH‹ÜÜ˜Î›‹]Nˆ´'ô`4/´-4,4-´.4.4`t.´.ô,4-‹Û“ØYœO˜™™\\™Q[X™YYYÙJ‹JKÝ[NžÜÜÚ][ÛŽˆ™š^Y‹[œÙ]Œ’[™^Ž\Ü^Nˆ˜›ØÚÈ‹ÚYˆŒL	H‹ZYÚˆŒLš‹›Ü™\ŽŒ˜XÚÙÜ›Ý[™ˆˆÑŽŽQÈŸ_J_B™[˜Ý[Ûˆ™Ý\Y\[\›˜]]™\ÔYÙJ
^Ü™]\›ˆKšœÞ
™[X™YYYÙKÜÛÝ\˜ÙNˆ‹ÜÝ\Y\‹X[\›˜]]™\È‹]Nˆ´'t/´,´bô-H4/ô/´`t`´,4,´bt.4.´.ŸJ_B™[˜Ý[Ûˆ™™[YPÜ™X]TYÙJ
^Ü™]\›ˆKšœÞ
™[X™YYYÙKÜÛÝ\˜ÙNˆ‹Ý™[Y\ËÛ™]È‹]Nˆ´'t/´,´/´-H4-ô,4,´-t-4-t/t.4-HŸJ_B‚™[˜Ý[Ûˆ™YØ[YÙJÝ\N™_J^ØÛÛœÝYOOOHœš]˜XÞH‹]È´&´/´/ta4.4-4-t/ta´.4,4.ôc4/t/´`t`´cŽˆ´(ô`t.ô/´,´.4cÈ4`´-t`t`´.4`4/´,´,4/t.4cÈŽÜ™]\›ˆKšœÞÊ›XZ[ˆ‹ÜÝ[NžÛZ[’ZYÚˆŒLš‹˜XÚÙÜ›Ý[™ˆˆÑQÑˆ‹ÛÛÜŽˆˆÌMLNÈ‹›Û˜[Z[Nˆ“X[œ›ÜK[\‹X\K\Þ\Ý[K›[šÓXXÔÞ\Ý[Q›ÛÙYÛÙHRKØ[œË\Ù\šYˆŸKÚ[™[Ž–ÚKšœÞÊšXY\ˆ‹ÜÝ[NžÜÜÚ][ÛŽˆœÝXÚÞH‹ÜŒ’[™^Œ‹\Ü^Nˆ™›^‹[YÛ’][\Îˆ˜Ù[\ˆ‹Ø\ŒL‹Y[™ÎˆŒMœÛ[\
N]ËÍ
H‹›Ü™\›ÝÛNˆŒ\ÛÛYÑLQMQQˆ‹˜XÚÙÜ›Ý[™ˆœ™Ø˜JMKMKMKŽMŠH‹˜XÚÙ›Üš[\Žˆ˜›\ŠN
HŸKÚ[™[Ž–ÚKšœÞ
˜H‹Ú™YŽˆ‹ÛÙÚ[ˆ‹˜\šXK[X™[Žˆ´'t,4-ô,4-‹Ý[NžÙ\Ü^Nˆ™ÜšY‹XÙR][\Îˆ˜Ù[\ˆ‹ÚYZYÚ›Ü™\ŽˆŒ\ÛÛYÑLQPÈ‹›Ü™\”˜Y]\ÎŒLËÛÛÜŽˆˆÌLŽM‹^XÛÜ˜][ÛŽˆ››Û™H‹›ÛÚ^™NŒŒ_KÚ[™[Žˆ¸¡¤ŸJKKšœÞÊ™]ˆ‹ØÚ[™[Ž–ÚKšœÞ
œ‹ÜÝ[NžÛX\™Ú[ŽŒ›ÛÚ^™NŒL›ÛÙZYÚŽL]\”ÜXÚ[™Îˆ‹ŒL™[H‹ÛÛÜŽˆˆÍPPÑPˆ‹^˜[œÙ›Ü›Nˆ\\˜Ø\ÙHŸKÚ[™[Žˆ˜\‘ØÝÜˆ0­ÈÈŸJKKšœÞ
šH‹ÜÝ[NžÛX\™Ú[ŽˆŒÜ‹›ÛÚ^™NŒŒ›ÛÙZYÚŽLKÚ[™[Ž›ŸJW_JW_JKKšœÞ
˜\XÛH‹ÜÝ[NžÝÚYˆ›Z[ŠL	HHÌœÍŒ
H‹X\™Ú[ŽˆŒ]]ÈŒ‹Y[™Îˆ˜Û[\
Œœ]Ëœ
H‹›Ü™\ŽˆŒ\ÛÛYÑLQMQQˆ‹›Ü™\”˜Y]\ÎŒ‹˜XÚÙÜ›Ý[™ˆˆÙ™™ˆ‹›ÞÚYÝÎˆŒN\™Ø˜JËÍKÌŒÊH‹›ÛÚ^™NŒM[™RZYÚŒK_KÚ[™[ŽÚKšœÞÊK‘œ˜YÛY[ØÚ[™[Ž–ÚKšœÞ
šˆ‹ÜÝ[NžÛX\™Ú[•ÜŒ›ÛÚ^™NŒŸKÚ[™[Žˆ´&´,4.ˆ4/´,t`4,4,t,4`´bô,´,4c´`´`tcÈ4-4,4/t/tbô-HŸJKKšœÞ
œ‹ØÚ[™[Žˆ´$´/ˆ4,´`4-t/4cÈ4`´-t`t`´.4`4/´,´,4/t.4cÈ˜\‘ØÝÜˆ4at`4,4/t.4`ˆ4-4,4/t/tbô-H4,4.´.´,4`ô/t`´,4/ô`4/´a4.4.ôcÈ4-ô,4,´-t-4-t/t.4cÈ4.4,´/t-t`tdt/t/tbô-H4/´/ô-t`4,4a´.4/´/t/tbô-H4-ô,4/ô.4`t.4/t-t/´,tat/´-4.4/4bô-H4-4.ôcÈ4`4,4,t/´`´bÈ4/ô`4.4.ô/´-´-t/t.4cËˆŸJKKšœÞ
šÈ‹ØÚ[™[Žˆ´%4.ôcÈ4aô-t,ô/ˆ4.4`t/ô/´.ôc4-ô`ôc´`´`tcÈ4-4,4/t/tbô-HŸJKKšœÞ
œ‹ØÚ[™[Žˆ´%4.ôcÈ4,4,´`´/´`4.4-ô,4a´.4.4`t.4/tat`4/´/t.4-ô,4a´.4.4/4-t-´-4`È4`ô`t`´`4/´.t`t`´,´,4/4.4a4.4/t,4/t`t/´,´bôaH4`4,4`taôdt`´/´,‹4/´`´aôdt`´/´,‹4.´/´/t`´`4/´.ôcÈ4-4/´`t`´`ô/ô,4.4a4/´`4/4.4`4/´,´,4/t.4cÈRKt`4-t.´/´/4-t/t-4,4a´.4.H4,´/t`ô`´`4.4,´bô,t`4,4/t/t/´,ô/ˆ4-ô,4,´-t-4-t/t.4cËˆŸJKKšœÞ
šÈ‹ØÚ[™[Žˆ´&4-ô/´.ôcôa´.4cÈ4.4-4/´`t`´`ô/ÈŸJKKšœÞ
œ‹ØÚ[™[Žˆ´%ô,4/ô.4`t.4/ô`4.4,´cô-ô,4/tbÈ4.ˆ4.´/´/t.´`4-t`´/t/´/4`È4-ô,4,´-t-4-t/t.4c‹ˆ4(t/´`´`4`ô-4/t.4.ˆ4/ô/´.ô`ôaô,4-t`ˆ4`´/´.ôc4.´/ˆ4`4,4-ô`4-tb4dt/t/tbô-H4,´.ô,4-4-t.ôc4a´-t/4`4,4-ô-4-t.ôbËˆ4't-H4/ô-t`4-t-4,4,´,4.t`´-H4/ô,4`4/´.ôc4.4/´-4/t/´`4,4-ô/´,´bô-H4.´/´-4bÈ4/ô`4.4,ô.ô,4b4-t/t.4.H4`´`4-t`´c4.4/4.ô.4a´,4/ˆŸJKKšœÞ
šÈ‹ØÚ[™[Žˆ´&ô/´.´,4.ôc4/tbô-H4-4,4/t/tbô-HŸJKKšœÞ
œ‹ØÚ[™[Žˆ´$t`4,4`ô-ô-t`4at`4,4/t.4`ˆ4`t-t`t`t.4cˆ4.4.ô/´.´,4.ôc4/tbô.H4.´ctb4/´`´-4-t.ôc4/t/ˆ4-4.ôcÈ4.´,4-´-4/´,ô/ˆ4,4.´.´,4`ô/t`´,4.4-ô,4,´-t-4-t/t.4cËˆ4&´/´/4,4/t-4,0ªô'´aô.4`t`´.4`´c4ct`´/ˆ4`ô`t`´`4/´.t`t`´,´/°®È4`ô-4,4.ôcô-t`ˆ4`´/´.ôc4.´/ˆ4.ô/´.´,4.ôc4/tbô.H4.´ctb4.4,´bô/ô/´.ô/tcô-t`ˆ4,´bôat/´-È4/´,t.ô,4aô/tbô-H4-4,4/t/tbô-H4`t/´at`4,4/tcôc´`´`tcËˆŸJKKšœÞ
šÈ‹ØÚ[™[Žˆ´(´-t`t`´/´,´bô.H4`t`´,4`´`ô`HŸJKKšœÞ
œ‹ØÚ[™[Žˆ´+t`´/ˆ4,´-t`4`t.4cÈ™[X\ÙHØ[™Y]H4-4.ôcÈ4/´,ô`4,4/t.4aô-t/t/t/´,ô/ˆ4/ô/´.ôc4-ô/´,´,4`´-t.ôc4`t.´/´,ô/ˆ4`´-t`t`´.4`4/´,´,4/t.4cËˆ4'´.´/´/taô,4`´-t.ôc4/t,4cÈ4/ô`ô,t.ô.4aô/t,4cÈ4/ô/´.ô.4`´.4.´,4.4`4-t.´,´.4-ô.4`´bÈ4/´/ô-t`4,4`´/´`4,4-4/´.ô-´/tbÈ4,tbô`´c4`ô`´,´-t`4-´-4-t/tbÈ4-4/ˆ4/´`´.´`4bô`´/´,ô/ˆ4-ô,4/ô`ô`t.´,ˆŸJW_JNšKšœÞÊK‘œ˜YÛY[ØÚ[™[Ž–ÚKšœÞ
šˆ‹ÜÝ[NžÛX\™Ú[•ÜŒ›ÛÚ^™NŒŸKÚ[™[Žˆ´'ô`4,4,´.4.ô,4`ôaô,4`t`´.4cÈ4,ˆ4`´-t`t`´.4`4/´,´,4/t.4.ŸJKKšœÞ
œ‹ØÚ[™[Žˆ˜\‘ØÝÜˆ4/ô`4-t-4/´`t`´,4,´.ôcô-t`´`tcÈ4-4.ôcÈ4/ô`4/´,´-t`4.´.4`4,4,t/´aô.4aH4`ta´-t/t,4`4.4-t,ˆ4,´.ô,4-4-t.ôc4a´,4/4.4.4`ô/ô`4,4,´.ôcôc´bt.4/4.4-ô,4,´-t-4-t/t.4.H4-4/ˆ4/ô`ô,t.ô.4aô/t/´,ô/ˆ4-ô,4/ô`ô`t.´,ˆŸJKKšœÞ
šÈ‹ØÚ[™[Žˆ´'´`´,´-t`´`t`´,´-t/t/t/´`t`´c4/ô/´.ôc4-ô/´,´,4`´-t.ôcÈŸJKKšœÞ
œ‹ØÚ[™[Žˆ´'ô/´.ôc4-ô/´,´,4`´-t.ôc4/´`´,´-taô,4-t`ˆ4-ô,4`´/´aô/t/´`t`´c4,´/t-t`tdt/t/tbôaH4`t`ô/4/4/ô`4,4,´,4`t/´`´`4`ô-4/t.4.´/´,ˆ4.4/ô`4/´,´-t`4.´`È4.4`tat/´-4/tbôaH4-4/´.´`ô/4-t/t`´/´,‹ˆ4't-H4/ô-t`4-t-4,4,´,4.t`´-H4`ôaôdt`´/tbô-H4-4,4/t/tbô-H4.4.´/´-4bÈ4/ô`4.4,ô.ô,4b4-t/t.4.H4/ô/´`t`´/´`4/´/t/t.4/ˆŸJKKšœÞ
šÈ‹ØÚ[™[Žˆ´)4.4/t,4/t`tbÈ4.RHŸJKKšœÞ
œ‹ØÚ[™[Žˆ´(4,4`taôdt`´bÈ4.RKt`4-t.´/´/4-t/t-4,4a´.4.4cô,´.ôcôc´`´`tcÈ4`ô/ô`4,4,´.ô-t/taô-t`t.´.4/4.4.4/t`t`´`4`ô/4-t/t`´,4/4.ˆ4'ô-t`4-t-4/t,4.ô/´,ô/´,´/´.K4,t`ôat,ô,4.ô`´-t`4`t.´/´.H4.4.ô.4c´`4.4-4.4aô-t`t.´/´.H4/´`´aôdt`´/t/´`t`´c4cˆ4`4-t-ô`ô.ôc4`´,4`´bÈ4/t-t/´,tat/´-4.4/4/ˆ4`t,´-t`4cô`´c4`H4/ô-t`4,´.4aô/tbô/4.4-4/´.´`ô/4-t/t`´,4/4.4.4/ô`4/´a4.4.ôc4/tbô/4.4`t/ô-ta´.4,4.ô.4`t`´,4/4.ˆŸJKKšœÞ
šÈ‹ØÚ[™[Žˆ´%ô,4.´`4bô`´.4-H4/ô-t`4.4/´-4,ŸJKKšœÞ
œ‹ØÚ[™[Žˆ´'ô/´-4`´,´-t`4-´-4,4cÈ4-ô,4.´`4bô`´.4-H4/4-t`tcôa´,4/ô/´.ôc4-ô/´,´,4`´-t.ôc4a4.4.´`t.4`4`ô-t`ˆ4/ô`4/´,´-t`4-t/t/tbô.H4`t/t.4/4/´.ˆ4`4-t-ô`ô.ôc4`´,4`´,ˆ4%4.ôcÈ4.4`t/ô`4,4,´.ô-t/t.4cÈ4-4,4/t/tbôaH4/ô-t`4.4/´-4/t`ô-´/t/ˆ4`t/t,4aô,4.ô,4/´`´.´`4bô`´c4/ô/´,´`´/´`4/t/‹ˆŸJKKšœÞ
šÈ‹ØÚ[™[Žˆ´%4/´`t`´`ô/ô/t/´`t`´cÈŸJKKšœÞ
œ‹ØÚ[™[Žˆ´$ˆ4`´-t`t`´/´,´/´.H4,´-t`4`t.4.4,´/´-ô/4/´-´/tbÈ4`´-tat/t.4aô-t`t.´.4-H4/ô-t`4-t`4bô,´bËˆ4'´,t/t,4`4`ô-´-t/t/tbô-H4/´b4.4,t.´.4`t.ô-t-4`ô-t`ˆ4/ô-t`4-t-4,4,´,4`´c4,´.ô,4-4-t.ôc4a´`È4`´-t`t`´.4`4/´,´,4/t.4cÈ4,´/4-t`t`´-H4`H4ct.´`4,4/t/´/4.4/ô/´`t.ô-t-4/´,´,4`´-t.ôc4/t/´`t`´c4cˆ4-4-t.t`t`´,´.4.KˆŸJKKšœÞ
šÈ‹ØÚ[™[Žˆ´%4/ˆ4/ô`ô,t.ô.4aô/t/´,ô/ˆ4-ô,4/ô`ô`t.´,ŸJKKšœÞ
œ‹ØÚ[™[Žˆ´'´.´/´/taô,4`´-t.ôc4/tbô-H4c´`4.4-4.4aô-t`t.´.4-H4`4-t.´,´.4-ô.4`´bË4/ô/´-4-4-t`4-´.´,4.4/ô`ô,t.ô.4aô/tbô-H4`ô`t.ô/´,´.4cÈ4-4/´.ô-´/tbÈ4,tbô`´c4`ô`´,´-t`4-´-4-t/tbÈ4/´/ô-t`4,4`´/´`4/´/4/ô`4/´-4`ô.´`´,ˆŸJW_J_JW_J_B™[˜Ý[ÛˆYJ
^Ü™]\›ˆKšœÞÊKØÚ[™[Ž–ÚKšœÞ
KÜ]ˆ‹È‹ÛÛ\Û™[—Û_JKKšœÞ
KÜ]ˆ‹ÛÙÚ[ˆ‹ÛÛ\Û™[šÛ_JKKšœÞ
KÜ]ˆ‹Ü™YÚ\Ý\ˆ‹ÛÛ\Û™[‘_JKKšœÞ
KÜ]ˆ‹Ý\›\È‹ÛÛ\Û™[Š
OOšKšœÞ
™YØ[YÙKÝ\Nˆ\›\ÈŸJ_JKKšœÞ
KÜ]ˆ‹Üš]˜XÞH‹ÛÛ\Û™[Š
OOšKšœÞ
™YØ[YÙKÝ\Nˆœš]˜XÞHŸJ_JKKšœÞ
KÜ]ˆ‹ÜÙ]\‹ÛÛ\Û™[Š
OOšKšœÞ
ÑYKØÛÛ\Û™[–[_J_JKKšœÞ
KÜ]ˆ‹ÚÛYH‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[‘Ù_J_JKKšœÞ
KÜ]ˆ‹Ø[˜[\Ú\È‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[•XÙ_J_JKKšœÞ
KÜ]ˆ‹ÜÛX\‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[›‘Y_J_JKKšœÞ
KÜ]ˆ‹ØY‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[œÝY_J_JKKšœÞ
KÜ]ˆ‹Ù]™[ËÎšY‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[’Ù_J_JKKšœÞ
KÜ]ˆ‹Ù]™[È‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[šY_J_JKKšœÞ
KÜ]ˆ‹Ý\ÚÜÈ‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[]Y_J_JKKšœÞ
KÜ]ˆ‹Ù\]Z\Y[ØØ][ÙÈ‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[–Y_J_JKKšœÞ
KÜ]ˆ‹Ù\]Z\Y[Ø[˜[]XÜÈ‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[Ù_J_JKKšœÞ
KÜ]ˆ‹Ù\]Z\Y[ÎšYÚ\ÝÜžKÛ™]È‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[™PÙ_J_JKKšœÞ
KÜ]ˆ‹Ù\]Z\Y[ÎšY‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[’Y_J_JKKšœÞ
KÜ]ˆ‹Ù\]Z\Y[‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[šÝY_J_JKKšœÞ
KÜ]ˆ‹ÜÚYÈ‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[˜™ÚYÔYÙ_J_JKKšœÞ
KÜ]ˆ‹Ùš[˜[˜ÙKÜÚYÎšYÜ^\›Û‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[”PY_J_JKKšœÞ
KÜ]ˆ‹Ùš[˜[˜ÙH‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[Y_J_JKKšœÞ
KÜ]ˆ‹ÛX\šÙ]‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[˜™X\šÙ]YÙ_J_JKKšœÞ
KÜ]ˆ‹ÛÜÜ[š]Y\È‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[˜™ÜÜ[š]Y\ÔYÙ_J_JKKšœÞ
KÜ]ˆ‹Ù]KXÛÛ›Û‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[˜™]PÛÛ›ÛYÙ_J_JKKšœÞ
KÜ]ˆ‹ÝX[KXXØÙ\ÜÈ‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[˜™X[PXØÙ\ÜÔYÙ_J_JKKšœÞ
KÜ]ˆ‹Ú[YÜ˜][ÛœÈ‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[˜™[YÜ˜][ÛœÔYÙ_J_JKKšœÞ
KÜ]ˆ‹Ü›Ùš[KÜ\œÛÛ˜[‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[˜™›Ùš[T\œÛÛ˜[ŒŽ_J_JKKšœÞ
KÜ]ˆ‹Ü›Ùš[KÝ™[YH‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[˜™›Ùš[U™[YUŒŽ_J_JKKšœÞ
KÜ]ˆ‹Ü›Ùš[KØÝ\œ™[˜ÞH‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[˜™›Ùš[PÝ\œ™[˜ÞUŒŽ_J_JKKšœÞ
KÜ]ˆ‹Ü›Ùš[H‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[™WÙ_J_JKKšœÞ
KÜ]ˆ‹Û[Ü™H‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[Ù_J_JKKšœÞ
KÜ]ˆ‹Ù[\ÞYY\ËÎšYÙY]‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[˜™[\ÞYYQY]YÙUŒŒŸJ_JKKšœÞ
KÜ]ˆ‹Ù[\ÞYY\ËÎšY‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[˜™[\ÞYYQ]Z[YÙ_J_JKKšœÞ
KÜ]ˆ‹Ù[\ÞYY\È‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[Ù_J_JKKšœÞ
KÜ]ˆ‹ÜØ[\šY\ËÎšY‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[˜™Ø[\žQ[\ÞYYTYÙ_J_JKKšœÞ
KÜ]ˆ‹ÜØ[\šY\È‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[˜™Ø[\šY\ÔYÙ_J_JKKšœÞ
KÜ]ˆ‹Ü^\›Û‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[šÙ_J_JKKšœÞ
KÜ]ˆ‹ÚX[‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[˜×Ù_J_JKKšœÞ
KÜ]ˆ‹Ü™]šY]ÜÈ‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[˜™™]šY]ÜÔYÙ_J_JKKšœÞ
KÜ]ˆ‹ØØ\Ù\ËØY‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[‘Ù_J_JKKšœÞ
KÜ]ˆ‹ØØ\Ù\ËÎšY‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[žÙ_J_JKKšœÞ
KÜ]ˆ‹ØØ\Ù\È‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[—ÐÙ_J_JKKšœÞ
KÜ]ˆ‹ØØ][ÙÈ‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[˜™\ÜÛÜY[ÛÛ[X[™YÙUŒMÌJ_JKKšœÞ
KÜ]ˆ‹ÜÝ\Y\œÈ‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[˜™›ØÝ\™[Y[ÛÛ[X[™YÙUŒMŽJ_JKKšœÞ
KÜ]ˆ‹Û›ÛY[˜Û]\™H‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[˜™›ÛY[˜Û]\™TYÙ_J_JKKšœÞ
KÜ]ˆ‹ÝØ\™ZÝ\ÙH‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[˜™Ø\™ZÝ\ÙTYÙ_J_JKKšœÞ
KÜ]ˆ‹Ü™\ÜÈ‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[˜™[ÛT™\ÜYÙ_J_JKKšœÞ
KÜ]ˆ‹Û[ÛXÛÜÚ[™È‹ÛÛ\Û™[Š
OOšKšœÞ
ÔËÝÎ“Ý

OÈ‹Ü™\ÜÏØÛÜÙS[ÛLHŽˆ‹ÛÙÚ[ˆŸJ_JKKšœÞ
KÜ]ˆ‹Ùš[˜[˜ÙKÜÙ][™ÜÈ‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[˜™š[˜[˜ÙTÙ][™ÜÔYÙ_J_JKKšœÞ
KÜ]ˆ‹Û›ÝYšXØ][ÛœÈ‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[˜™›ÝYšXØ][ÛœÔYÙ_J_JKKšœÞ
KÜ]ˆ‹ÜØ[\ËZ[\Ü‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[˜™Ø[\Ò[\ÜYÙ_J_JKKšœÞ
KÜ]ˆ‹ÜÝ\Y\‹X[\›˜]]™\È‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[˜™Ý\Y\[\›˜]]™\ÔYÙ_J_JKKšœÞ
KÜ]ˆ‹Ý™[Y\ËÛ™]È‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[˜™™[YPÜ™X]TYÙ_J_JKKšœÞ
KÜ]ˆ‹ÜÙ][™ÜÈ‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[˜™Ù][™ÜÔYÙUŒNŸJ_JKKšœÞ
KÜ]ˆ‹ØX›Ý]‹ÛÛ\Û™[Š
OOšKšœÞ
ØÛÛ\Û™[˜™X›Ý]YÙ_J_JKKšœÞ
KÜ]ˆ‹Ü™\Ù]‹ÛÛ\Û™[Š
OOšKšœÞ
ÔËÝÎ“Ý

OÈ‹ÚÛYHŽˆ‹ÛÙÚ[ˆŸJ_JKKšœÞ
KÜ]ˆ‹Ù\ÚYÛ‹\Þ\Ý[H‹ÛÛ\Û™[Š
OOšKšœÞ
ÔËÝÎ“Ý

OÈ‹ÚÛYHŽˆ‹ÛÙÚ[ˆŸJ_JKKšœÞ
KØÛÛ\Û™[[_JW_J_Y[˜Ý[Ûˆ™X[Ý\\›Ý]RÛYUŒMMJ
^ÚYŠÚ[™ÝË›ØØ][Û‹œ]˜[YHOOH‹ÈŠ\™]\›ŽÝž^ÝÚ[™ÝËš\ÝÜžKœ™\XÙTÝ]JÚ[™ÝËš\ÝÜžKœÝ]Kˆ‹‹ÚÛYHŠ_XØ]ÚÝÚ[™ÝË›ØØ][Û‹œ™\XÙJ‹ÚÛYHŠ__B™[˜Ý[Ûˆ™Ý\\š\œÝZ[ÛÛ\]UŒŒJ
^ØÛÛœÝOYØÝ[Y[™ØÝ[Y[[[Y[ÚYŠK™Ù]]šX]J™]KX™\Ý\\\[™[™ÈŠHOOHŒŒHŸÚ[™ÝË—×Ø™Ü\Ú™[X\ÙYŒÎMOOHL
\™]\›ŽØÛÛœÝYØÝ[Y[œ]Y\žTÙ[XÝÜŠ	ÖÙ]KX™ZÛYK\YÙWKÙ]KX™X]][XØ]YZÛYK\Ú[IÊNÚYŠ]
\™]\›ŽÝÚ[™ÝË—×Ø™Ü\Ú™[X\ÙYŒÎMHLØÛÛœÝYØÝ[Y[œ]Y\žTÙ[XÝÜŠ	ÖÙ]KX™\Ý]XË\Ý\\HŒŒH—IÊNÙKœ™[[Ý™P]šX]J™]KX™\Ý\\\[™[™ÈŠKKœ™[[Ý™P]šX]J™]KX™\Ý\\XÛÛ\][™ÈŠKËœ™[[Ý™J
KÚ[™ÝË™\Ü]Ú]™[
™]ÈÝ\ÝÛQ]™[
˜™œÝ\\XÛÛ\]H‹Ù]Z[žÝ™\œÚ[ÛŽˆ›˜]]™KXÛÛ[Z]K]ŒÎMˆŸ_JJ_B™[˜Ý[Ûˆ™X[Ý\\Ø]UŒMMJØÚ[™[Ž™_J^ØÛÛœÝÜ›Ùš[N\Ô™XYN›ŸOU[Š
NØ™\ÙS]™P\Ú[™\ÜÒX[ŒÌÍJ‰‰ˆH]
NØÛÛœÝÜÛ˜\ÚÝœŸOX™\ÙP\Ú[™\ÜÒX[Û˜\ÚÝŒŽ

KØWOTË\ÙTÝ]J

OOžØÛÛœÝ]Ú[™ÝË›ØØ][Û‹œ]˜[YKO[OOH‹ÈÐÛJ
N›ÚYŠHOOH‹ÚÛYHŠ\™]\›ˆLNÜ™]\›ˆ™X[][˜Ú™YÚ[•ŒMMJ
KLJNÔË\ÙS^[Ý]Y™™XÝ


OOžØ_™Ý\\š\œÝZ[ÛÛ\]UŒŒJ
_KØWJKË\ÙQY™™XÝ


OOžÚYŠXJ\™]\›ŽØ™X[Ý\\›Ý]RÛYUŒMMJ
NÛ]LOHLNØÛÛœÝQ]K››ÝÊ
KJ
OOžÚYŠJ\™]\›ŽØÛÛœÝOYØÝ[Y[œ]Y\žTÙ[XÝÜŠ	ÖÙ]KX™ZÛYK\YÙWKÙ]KX™X]][XØ]YZÛYK\Ú[IÊNÚYŠ[J\™]\›ŽÝOHLÚ[™ÝË˜ÛX\’[\˜[

K™X[XYÛ›ÜÝXÕŒMMJœÚ[\™XYH‹ÜÛ˜\ÚÝYœËœÛ˜\ÚÝYÏÛ[ØÛÜ™NœËœØÛÜ™OÏÛ[™[YT™XYN›‹\Ô›Ùš[NˆH][\ÙY\Î‘]K››ÝÊ
KYØ[Ý[][Û•™\œÚ[ÛŽœË˜Ø[Ý[][Û•™\œÚ[Û‹™[YRYœË™[YRYJK™X[][˜ÚÛÛ\]UŒMMJœÚ[\™XYHŠK™Ý\\š\œÝZ[ÛÛ\]UŒŒJ
_NÜ™]\›ˆŠ
K]Ú[™ÝËœÙ][\˜[
‹MŠK

OOžÝOHLÚ[™ÝË˜ÛX\’[\˜[

__KØWJNÜ™]\›ˆ_B™[˜Ý[ÛˆÑYJ
^Ü™]\›ˆKšœÞ
RËØÛY[œÑYKÚ[™[ŽšKšœÞ
›ÙKØÚ[™[ŽšKšœÞ
œÙKØÚ[™[ŽšKšœÞ
ÛÙKØÚ[™[ŽšKšœÞ
[KØÚ[™[ŽšKšœÞ
KØÚ[™[ŽšKšœÞ
›KØÚ[™[ŽšKšœÞ
[KØÚ[™[ŽšKšœÞ
ÛKØÚ[™[ŽšKšœÞ
ÛKØÚ[™[ŽšKšœÞ
KØÚ[™[ŽšKšœÞ
›KØÚ[™[ŽšKšœÞ
[KØÚ[™[ŽšKšœÞÊYKØÚ[™[Ž–ÚKšœÞ
™X[Ý\\Ø]UŒMMKØÚ[™[ŽšKšœÞÊœÙKØÚ[™[Ž–ÚKšœÞ
ÓØ˜\ÙNˆ‹È‹œ™\XÙJ×ÉËˆŠKÚ[™[ŽšKšœÞ
YKßJ_JKKšœÞ
œÙKßJKKšœÞ
ÙKßJW_J_JKKšœÞ
’‹ßJW_J_J_J_J_J_J_J_J_J_J_J_J_J_J_TË˜Ü™X]T›ÛÝ
ØÝ[Y[™Ù][[Y[žRY
œ›ÛÝŠJKœ™[™\ŠKšœÞ
ÑYKßJJNÂ‚˜ÛÛœÝ™\˜Ú\ÙT˜XÝXØ[XUŒŒLOHŒŒLHŽÂ‚˜ÛÛœÝ™š[˜[˜ÙT\˜Ú\ÙQÜ›Ý\ÕŒŒLHŒŒLˆŽÂ