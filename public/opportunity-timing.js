(function(root){
  'use strict';
  var DAY=86400000;
  function day(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;var n=Date.parse(value+'T00:00:00Z');return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===value?n:null;}
  function today(zone,now){try{return new Intl.DateTimeFormat('en-CA',{timeZone:zone||'UTC',year:'numeric',month:'2-digit',day:'2-digit'}).format(now||new Date());}catch{return null;}}
  function project(event,zone,now){
    var current=day(today(zone,now)),start=day(event.startDate),end=day(event.endDate||event.startDate),preparation=day(event.activationDate||event.startDate);
    var remaining=current!==null&&start!==null?Math.round((start-current)/DAY):null;
    var deadline=day(event.recommendation&&event.recommendation.decisionDeadline);
    var deadlineState=current===null||deadline===null?'':deadline<current?'Срок прошёл':deadline===current?'Сегодня':'';
    return {remaining:remaining,preparationRemaining:current!==null&&preparation!==null?Math.round((preparation-current)/DAY):null,past:current!==null&&end!==null&&end<current,deadlineState:deadlineState};
  }
  function advice(text,timing){
    if(typeof text!=='string'||!text.trim())return [{text:'—',status:''}];
    // Presentation only: retain original words and offsets; never reschedule a saved plan.
    return ( /за\s+\d+/i.test(text)?text.split(/[,;]\s*/):[text]).map(function(part){
      var match=part.match(/за\s+(\d+)(?:\s*[–—-]\s*(\d+))?\s*(дней|дня|день|часов|часа|час)(?=\s|[.!?]|$)/i);
      var status=timing.past?'Событие прошло':'';
      if(!status&&match&&timing.preparationRemaining!==null){var scale=match[3].indexOf('час')===0?24:1,min=Number(match[2]||match[1])/scale,max=Number(match[1])/scale;
        status=timing.preparationRemaining<Math.min(min,max)?'Срок прошёл':timing.preparationRemaining<=Math.max(min,max)?'Сегодня':'';
      }
      return {text:part,status:status};
    });
  }
  root.bdOpportunityTiming={day:day,today:today,project:project,advice:advice};
})(typeof window==='undefined'?globalThis:window);
