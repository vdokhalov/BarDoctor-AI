(function(){
  "use strict";
  var API="/api/purchases/hybrid-production-qa";
  var INTENT="validate-koln-hybrid-v2-read-only";
  var state={surface:null,document:null,ocrRuns:[],first:null,repeat:null,confirmation:null};
  var $=function(id){return document.getElementById(id)};
  var esc=function(value){return String(value==null?"—":value).replace(/[&<>"']/g,function(char){return({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]})};
  var number=function(value){return Number.isFinite(Number(value))?Number(value):0};
  var pct=function(value){return Math.round(number(value)*100)+"%"};
  var statusText={available:"AI доступен",not_used:"AI не использовался",fallback_unavailable:"AI fallback недоступен"};

  async function request(stage,documentId){
    var params=new URLSearchParams({intent:INTENT,stage:stage});
    if(documentId)params.set("document",documentId);
    var response=await fetch(API+"?"+params.toString(),{credentials:"include",cache:"no-store"});
    var body=await response.json().catch(function(){return{ok:false,code:"INVALID_DIAGNOSTIC_RESPONSE"}});
    if(!response.ok||!body.ok)throw new Error(body.code||"DIAGNOSTIC_UNAVAILABLE");
    return body;
  }
  function setStatus(message,error){var node=$("diag-status");node.hidden=!message;node.className="diag-status"+(error?" is-error":"");node.textContent=message||""}
  function metric(label,value,tone){return'<div class="diag-metric '+(tone||"")+'"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></div>'}
  function fact(label,value){return'<div class="diag-fact"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></div>'}

  function renderContext(){
    var c=state.surface.productionContext;
    $("diag-context").innerHTML=[
      ["Заведение",c.venue,"venueId "+c.venueId+" · account "+c.dataAccountId],
      ["Canonical",c.searchableCandidates+" searchable",c.canonicalPositions+" positions · "+c.canonicalSource],
      ["Learning memory",c.supplierMappings+" mappings",c.suppliers+" suppliers · "+c.purchases+" purchases"],
      ["Режим","Legacy · Primary OFF","Production version "+c.productionVersion]
    ].map(function(row){return'<div><span>'+esc(row[0])+'</span><strong>'+esc(row[1])+'</strong><small>'+esc(row[2])+'</small></div>'}).join("");
    var select=$("diag-document");
    select.innerHTML=state.surface.documents.map(function(doc){return'<option value="'+esc(doc.id)+'">'+esc(doc.supplier)+" · №"+esc(doc.documentNumber||"—")+" · "+esc(doc.date||"без даты")+" · "+doc.lineCount+" строк"+'</option>'}).join("");
    select.disabled=!state.surface.documents.length;
    $("diag-run").disabled=!state.surface.documents.length;
    state.document=state.surface.documents[0]||null;
  }
  function selectedDocument(){return state.surface.documents.find(function(doc){return doc.id===$("diag-document").value})||null}
  function parsedIdentity(item){return[item.normalizedRawName||item.rawName,item.quantity,item.unit,item.packageSize,item.unitPrice,item.lineTotal].join("|")}
  function ocrDiagnostic(run){return run&&run.diagnostics&&run.diagnostics[0]}
  function differentRows(){
    if(state.ocrRuns.length<2)return[];
    var byRun=state.ocrRuns.map(function(run){var d=ocrDiagnostic(run);return new Map(((d&&d.trace&&d.trace.parsedItems)||[]).map(function(item){return[item.normalizedRawName||item.rawName,parsedIdentity(item)]}))});
    var names=new Set;byRun.forEach(function(map){map.forEach(function(_,key){names.add(key)})});
    return Array.from(names).filter(function(name){return new Set(byRun.map(function(map){return map.get(name)||"missing"})).size>1});
  }
  function stableRows(){
    if(!state.ocrRuns.length)return 0;
    var sets=state.ocrRuns.map(function(run){var d=ocrDiagnostic(run);return new Set(((d&&d.trace&&d.trace.parsedItems)||[]).map(function(item){return item.normalizedRawName||item.rawName}))});
    return Array.from(sets[0]).filter(function(name){return sets.every(function(set){return set.has(name)})}).length;
  }
  function renderDeterminism(){
    var panel=$("diag-determinism");
    if(!state.ocrRuns.length){panel.hidden=true;return}
    var rows=state.ocrRuns.map(function(run,index){var d=ocrDiagnostic(run)||{},p=d.parser||{},c=d.commercialFields||{},trace=d.trace||{};return'<tr class="'+(number(p.detectedLines)<number(p.expectedLines)?"is-row-loss":"")+'"><td>Run '+(index+1)+'</td><td>'+number(p.detectedLines)+'/'+number(p.expectedLines)+'</td><td>'+stableRows()+'</td><td>'+number(c.quantityCorrect)+'/'+number(c.pairedLines)+'</td><td>'+number(c.unitCorrect)+'/'+number(c.pairedLines)+'</td><td>'+number(c.packageCorrect)+'/'+number(c.pairedLines)+'</td><td>'+number(c.unitPriceCorrect)+'/'+number(c.pairedLines)+'</td><td>'+number(c.lineTotalCorrect)+'/'+number(c.pairedLines)+'</td><td>'+number(trace.overlayBlocks&&trace.overlayBlocks.length)+'</td></tr>'}).join("");
    var diffs=differentRows();
    panel.hidden=false;
    var rawBlocks=state.ocrRuns.map(function(run,index){var d=ocrDiagnostic(run)||{},trace=d.trace||{},blocks=trace.overlayBlocks||[];return'<details><summary>Run '+(index+1)+' · raw OCR blocks ('+blocks.length+')</summary><pre>'+esc(blocks.map(function(block){var b=block.bounds||{};return'['+(block.page==null?"?":block.page)+':'+(b.x==null?"?":b.x)+','+(b.y==null?"?":b.y)+'] '+block.text+(block.rejectedBecause?' · rejected: '+block.rejectedBecause:'')}).join("\n"))+'</pre></details>'}).join("");
    panel.innerHTML='<header><div><p class="diag-kicker">OCR / parser determinism</p><h2>3-run comparison</h2><p>Одинаковый production source, независимые OCR reads.</p></div><span class="diag-badge '+(diffs.length?"conflict":"high")+'">'+(diffs.length?diffs.length+" различий":"Структура стабильна")+'</span></header><div class="diag-table-wrap"><table class="diag-table"><thead><tr><th>Run</th><th>Строки</th><th>Stable rows</th><th>Quantity</th><th>Unit</th><th>Package</th><th>Price</th><th>Total</th><th>OCR blocks</th></tr></thead><tbody>'+rows+'</tbody></table></div><div class="diag-diff">'+(diffs.length?'<strong>Отличаются:</strong> '+esc(diffs.join(", ")):'Silent row loss и parser drift между runs не обнаружены.')+'</div><div class="diag-ocr-blocks">'+rawBlocks+'</div>';
  }
  function matchingResult(){return state.first&&state.first.learning&&state.first.learning[0]}
  function repeatResult(){return state.repeat&&state.repeat.learning&&state.repeat.learning[0]}
  function renderSummary(){
    var result=repeatResult()||matchingResult();
    if(!result){$("diag-summary").innerHTML="";return}
    var lines=result.lineTrace||[],automatic=lines.filter(function(line){return !line.requiresReview&&line.selectedCandidate}).length;
    var confirm=lines.filter(function(line){return line.requiresReview&&line.selectedCandidate}).length;
    var noMatch=lines.filter(function(line){return !line.selectedCandidate}).length;
    $("diag-summary").innerHTML=metric("Всего",result.totalLines)+metric("Автоматически",automatic,"good")+metric("Подтвердить",confirm,confirm?"warn":"good")+metric("NO_MATCH",noMatch,noMatch?"bad":"good")+metric("AI lines",result.aiLines,result.aiLines?"warn":"good")+metric("Tokens",result.actualUsage&&result.actualUsage.totalTokens||0);
  }
  function reduction(first,repeat,key){var before=number(first&&first[key]),after=number(repeat&&repeat[key]);return before?Math.round((before-after)/before*100)+"%":"—"}
  function renderLearning(){
    var first=matchingResult(),repeat=repeatResult(),panel=$("diag-learning");
    if(!first){panel.hidden=true;return}
    panel.hidden=false;
    var usage=first.actualUsage||{},firstTokens=usage.totalTokens||0,repeatTokens=repeat&&repeat.actualUsage&&repeat.actualUsage.totalTokens||0;
    panel.innerHTML='<header><div><p class="diag-kicker">Persisted Supplier Mapping Memory</p><h2>'+(repeat?'First → independent repeat':'First persisted-state run')+'</h2><p>Источник: server storage. In-memory confirmation не считается proof.</p></div><span class="diag-badge '+(repeat?"high":"review")+'">'+(repeat?'Repeat получен':'Ожидает подтверждения mapping')+'</span></header><div class="diag-learning-grid">'+
      fact("Historical",first.historicalHits+(repeat?' → '+repeat.historicalHits:""))+fact("AI lines",first.aiLines+(repeat?' → '+repeat.aiLines:""))+fact("Batches / requests",first.aiRequests+(repeat?' → '+repeat.aiRequests:""))+fact("Tokens",firstTokens+(repeat?' → '+repeatTokens:""))+fact("Input / output",number(usage.inputTokens)+" / "+number(usage.outputTokens))+fact("AI latency",number(usage.providerLatencyMs)+" ms")+fact("Provider",statusText[usage.providerStatus]||usage.providerStatus||"—")+fact("Classification",(usage.errors||[]).join(", ")||"без ошибок")+fact("Manual confirm",first.manualConfirmation+(repeat?' → '+repeat.manualConfirmation:""))+fact("Manual search",first.manualSearch+(repeat?' → '+repeat.manualSearch:""))+
      '</div>'+(repeat?'<p class="diag-reduction">Reduction: AI lines '+reduction(first,repeat,"aiLines")+' · requests '+reduction(first,repeat,"aiRequests")+' · tokens '+(firstTokens?Math.round((firstTokens-repeatTokens)/firstTokens*100)+"%":"—")+' · manual '+reduction(first,repeat,"manualConfirmation")+'</p>':'');
  }
  function candidates(line){var list=[];if(line.selectedCandidate)list.push(line.selectedCandidate);(line.topCandidates||[]).forEach(function(item){list.push(item)});return Array.from(new Map(list.filter(Boolean).map(function(item){return[item.key||item.id,item]})).values())}
  function arithmeticOk(parsed){return Math.abs(number(parsed.quantity)*number(parsed.unitPrice)-number(parsed.lineTotal))<=Math.max(.05,number(parsed.lineTotal)*.025)}
  function confidenceClass(line){if(!line.selectedCandidate)return"no-match";if((line.identityConflicts||[]).length)return"conflict";if(!arithmeticOk(line.parsed||{}))return"anomaly";return line.confidenceLevel==="high"&&!line.requiresReview?"high":"medium"}
  function renderLines(){
    var result=repeatResult()||matchingResult(),root=$("diag-lines");
    if(!result){root.innerHTML="";return}
    root.innerHTML=(result.lineTrace||[]).map(function(line,index){
      var parsed=line.parsed||{},choice=candidates(line),history=line.historicalMapping||{},klass=confidenceClass(line);
      var selected=state.confirmation&&state.confirmation.lineId===line.lineId?state.confirmation.candidateKey:"";
      return'<article class="diag-line '+klass+'" data-line-id="'+esc(line.lineId)+'"><div class="diag-line-head"><div><h3>'+(index+1)+'. '+esc(line.rawSupplierLine)+'</h3><p>'+esc(parsed.normalizedIdentity||"")+'</p></div><div class="diag-badges"><span class="diag-badge '+klass+'">'+esc(line.matchMethod||"NO_MATCH")+'</span><span class="diag-badge '+(line.requiresReview?"review":"high")+'">'+(line.requiresReview?"validation required":"safe")+'</span>'+(!arithmeticOk(parsed)?'<span class="diag-badge conflict">arithmetic anomaly</span>':'')+(line.identityConflicts||[]).map(function(value){return'<span class="diag-badge conflict">'+esc(value)+'</span>'}).join("")+'</div></div><div class="diag-line-body"><div class="diag-facts">'+fact("Quantity",parsed.quantity)+fact("Unit",parsed.unit)+fact("Package",parsed.package)+fact("Unit price",parsed.unitPrice)+fact("Line total",parsed.lineTotal)+fact("Arithmetic",arithmeticOk(parsed)?"PASS":"validation required")+fact("Confidence",line.confidenceLevel+" · "+pct(line.confidence))+'</div><div class="diag-candidate"><h4>Canonical proposal</h4><p><strong>'+esc(line.selectedCandidate&&line.selectedCandidate.name||"NO_MATCH")+'</strong></p><p>'+esc(line.reason||"Нет безопасного match reason")+'</p>'+(choice.length?'<label class="diag-field"><span>Однозначный target для confirmation</span><select class="diag-candidate-select" data-candidate-select="'+esc(line.lineId)+'"><option value="">Выберите позицию…</option>'+choice.map(function(item){return'<option value="'+esc(item.key||item.id)+'"'+(selected===(item.key||item.id)?" selected":"")+'>'+esc(item.name)+' · '+esc(item.packageSize||item.package||item.unit||"—")+'</option>'}).join("")+'</select></label>':'')+'</div><div class="diag-history"><h4>Persisted history</h4><p>'+(history.found?(history.compatible?"Найдено · compatible":"Найдено · отклонено safety gate"):"Не найдено")+'</p><code>'+esc(history.mappingKey||"—")+'</code><p>'+esc(history.reason||"—")+'</p></div>'+(choice.length?'<div class="diag-confirm-box"><p>Сохранение доступно только после выбора: <strong>'+esc(line.rawSupplierLine)+'</strong> → <strong data-confirm-target="'+esc(line.lineId)+'">не выбрано</strong></p><div class="diag-confirm-actions"><button type="button" class="diag-secondary" data-prepare="'+esc(line.lineId)+'">Проверить выбранное соответствие</button><button type="button" class="diag-confirm" data-confirm="'+esc(line.lineId)+'" hidden>Подтвердить и сохранить mapping</button></div></div>':'')+'</div></article>'
    }).join("")||'<div class="diag-empty">Строки не получены.</div>';
    bindLineActions();
  }
  function findLine(lineId){var result=repeatResult()||matchingResult();return result&&(result.lineTrace||[]).find(function(line){return line.lineId===lineId})}
  function bindLineActions(){
    document.querySelectorAll("[data-prepare]").forEach(function(button){button.addEventListener("click",function(){var lineId=button.getAttribute("data-prepare"),select=document.querySelector('[data-candidate-select="'+CSS.escape(lineId)+'"]'),line=findLine(lineId),candidate=candidates(line).find(function(item){return(item.key||item.id)===select.value});if(!candidate){setStatus("Сначала выберите однозначную canonical позицию.",true);return}state.confirmation={lineId:lineId,candidateKey:candidate.key||candidate.id,candidate:candidate};document.querySelector('[data-confirm-target="'+CSS.escape(lineId)+'"]').textContent=candidate.name+" · "+(candidate.packageSize||candidate.unit||"—");document.querySelector('[data-confirm="'+CSS.escape(lineId)+'"]').hidden=false;setStatus("Проверьте пару supplier item → canonical item и нажмите финальное подтверждение.",false)})});
    document.querySelectorAll("[data-confirm]").forEach(function(button){button.addEventListener("click",function(){confirmMapping(button.getAttribute("data-confirm"))})});
  }
  async function confirmMapping(lineId){
    var line=findLine(lineId),doc=state.document,confirmation=state.confirmation;
    if(!line||!doc||!confirmation||confirmation.lineId!==lineId)return;
    buttonLock(true);setStatus("Сохраняем только Supplier Mapping через application flow…",false);
    try{
      var p=line.parsed||{},response=await fetch("/api/purchases/mappings",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({supplierId:matchingResult().supplierId,supplierName:doc.supplier,documentId:doc.id,lineId:line.lineId,rawName:line.rawSupplierLine,unit:p.unit,packageSize:p.package,supplierArticle:p.supplierArticle,barcode:p.barcode,purchaseProductKey:confirmation.candidate.key,nomenclatureId:confirmation.candidate.id})});
      var body=await response.json();if(!response.ok||!body.ok)throw new Error(body.code||"MAPPING_CONFIRMATION_FAILED");
      setStatus("Supplier Mapping сохранён и audit-logged. Теперь запустите новый независимый repeat run.",false);$("diag-repeat").hidden=false;state.confirmation=null;
    }catch(error){setStatus("Mapping не сохранён: "+(error&&error.message||"ошибка application flow"),true)}finally{buttonLock(false)}
  }
  function buttonLock(locked){$("diag-run").disabled=locked;$("diag-repeat").disabled=locked;$("diag-document").disabled=locked}
  function stripSecrets(value){if(Array.isArray(value))return value.map(stripSecrets);if(value&&typeof value==="object"){return Object.keys(value).reduce(function(out,key){if(!/(api.?key|authorization|secret|rawProviderPayload)/i.test(key))out[key]=stripSecrets(value[key]);return out},{})}return value}
  function exportPayload(){return stripSecrets({schemaVersion:"bardoctor.invoice-diagnostic.v1",exportedAt:new Date().toISOString(),runId:(repeatResult()||matchingResult()||{}).correlationId||null,document:state.document,productionContext:state.surface&&state.surface.productionContext,ocrParserRuns:state.ocrRuns.map(function(run){return{runId:run.runId,diagnostics:run.diagnostics}}),firstPersistedRun:matchingResult()||null,repeatPersistedRun:repeatResult()||null,safety:{featureFlag:"legacy",v2Primary:false,purchaseWrites:0,stockMovementWrites:0,expenseWrites:0,supplierDebtWrites:0}})}
  function openExport(){var text=JSON.stringify(exportPayload(),null,2);$("diag-export-text").value=text;$("diag-export-dialog").showModal()}
  async function runFull(){
    state.document=selectedDocument();if(!state.document)return;
    state.ocrRuns=[];state.first=null;state.repeat=null;state.confirmation=null;$("diag-repeat").hidden=true;buttonLock(true);$("diag-export").disabled=true;renderSummary();renderLines();renderLearning();
    try{
      for(var index=1;index<=3;index++){setStatus("OCR/parser run "+index+" из 3…",false);state.ocrRuns.push(await request("ocr_parser",state.document.id));renderDeterminism()}
      setStatus("Запускаем persisted Hybrid Matching shadow run…",false);state.first=await request("persisted_learning",state.document.id);renderSummary();renderLearning();renderLines();$("diag-export").disabled=false;setStatus("Shadow validation завершён. Business writes = 0.",false)
    }catch(error){setStatus("Диагностика не завершена: "+(error&&error.message||"неизвестная ошибка"),true)}finally{buttonLock(false)}
  }
  async function runRepeat(){
    if(!state.document)return;buttonLock(true);setStatus("Новый независимый request: загружаем mapping из persistent storage…",false);
    try{state.repeat=await request("persisted_learning",state.document.id);renderSummary();renderLearning();renderLines();$("diag-export").disabled=false;setStatus("Repeat run завершён. Historical/AI reduction показаны ниже.",false)}catch(error){setStatus("Repeat run не завершён: "+(error&&error.message||"ошибка"),true)}finally{buttonLock(false)}
  }
  async function init(){
    try{state.surface=await request("surface");renderContext();setStatus("Готово к controlled shadow validation. Feature flag legacy, Primary OFF.",false)}catch(error){setStatus("Owner diagnostic surface недоступен: "+(error&&error.message||"ошибка доступа"),true)}
  }
  $("diag-document").addEventListener("change",function(){state.document=selectedDocument();state.ocrRuns=[];state.first=null;state.repeat=null;renderSummary();renderDeterminism();renderLearning();renderLines();$("diag-repeat").hidden=true;$("diag-export").disabled=true});
  $("diag-run").addEventListener("click",runFull);$("diag-repeat").addEventListener("click",runRepeat);$("diag-export").addEventListener("click",openExport);$("diag-copy").addEventListener("click",async function(){await navigator.clipboard.writeText($("diag-export-text").value);$("diag-copy").textContent="Скопировано";setTimeout(function(){$("diag-copy").textContent="Копировать JSON"},1500)});
  init();
})();
