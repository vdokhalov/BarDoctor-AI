(function(root){
  "use strict";
  function canonical(value){try{return typeof value==="string"&&/^(UTC|[A-Za-z_]+\/[A-Za-z0-9_+\-/]+)$/.test(value)?new Intl.DateTimeFormat("en",{timeZone:value}).resolvedOptions().timeZone:null;}catch{return null;}}
  function dateKey(value,zone){var parts=new Intl.DateTimeFormat("en-GB",{timeZone:canonical(zone)||"UTC",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(value));var p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return p.year+"-"+p.month+"-"+p.day;}
  var zone="UTC", serverTime=null, receivedAt=0;
  function context(data){if(Number.isFinite(Date.parse(data.serverNow))){serverTime=Date.parse(data.serverNow);receivedAt=performance.now();}zone=canonical(data.timezone)||"UTC";var notice=document.getElementById("notice");if(notice){var label=document.getElementById("venue-timezone-label");if(!label){label=document.createElement("p");label.id="venue-timezone-label";label.className="journal-help";notice.before(label);}label.textContent="Время заведения: "+zone+(data.timezoneConfigured?"":" · часовой пояс не задан");}}
  root.bdVenueTime={canonical:canonical,dateKey:dateKey,context:context,zone:()=>zone,now:()=>serverTime===null?new Date():new Date(serverTime+performance.now()-receivedAt)};
  if(!root.customElements||root.customElements.get("bd-venue-timezone"))return;
  class VenueTimezone extends HTMLElement{
    constructor(){super();this._value="";}
    set value(value){var next=canonical(value)||"";if(next===this._value&&this.children.length)return;this._value=next;if(this.isConnected)this.render();}
    get value(){return this._value;}
    connectedCallback(){if(this.hasAttribute("suggest")&&!this._value)this._value=canonical(Intl.DateTimeFormat().resolvedOptions().timeZone)||"UTC";this.render();}
    render(){var label=document.createElement("label");label.className="bd-venue-schedule-time";label.textContent="Часовой пояс заведения";var select=document.createElement("select");select.setAttribute("aria-label","Часовой пояс заведения");select.name="timezone";select.style.cssText="width:100%;min-width:0;min-height:48px;font:inherit;padding:8px;border:1px solid #dfe2e9;border-radius:12px;background:white;color:#171b2d";
      var values=["UTC",...(Intl.supportedValuesOf?Intl.supportedValuesOf("timeZone"):[]),"Europe/Chisinau","America/New_York","America/Los_Angeles",...(this._value?[this._value]:[])];
      var empty=document.createElement("option");empty.value="";empty.disabled=Boolean(this._value);empty.textContent="Не задано — пока используется UTC";select.append(empty);
      [...new Set(values)].sort().forEach(v=>{var option=document.createElement("option");option.value=v;option.textContent=v.replaceAll("_"," ");select.append(option);});select.value=this._value;select.onchange=()=>{this._value=select.value;this.dispatchEvent(new CustomEvent("timezonechange",{bubbles:true,detail:this._value}));};label.append(select);
      var note=document.createElement("p");note.className="bd-venue-schedule-summary";note.textContent="Выберите пояс, где находится заведение. Он действует на всех устройствах. Даты проведённых операций и открытых смен сохраняются.";this.style.cssText="display:block;min-width:0;margin:16px 0";this.replaceChildren(label,note);
    }
  }
  root.customElements.define("bd-venue-timezone",VenueTimezone);
})(window);
