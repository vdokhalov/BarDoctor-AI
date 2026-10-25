// Small deterministic prototype. Department/zone is not evidence of contents or severity.
function bdEquipmentBusinessRisk(equipment){
 if(!equipment||typeof equipment.id!=='string')return null;
 const name=String(equipment.name||'').normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g,'е');
 const has=pattern=>new RegExp('(?:^|[^\\p{L}\\p{N}])(?:'+pattern+')(?:$|[^\\p{L}\\p{N}])','u').test(name);
 const found=[];
 if(has('холодильник|холодильная витрина|холодильная камера|холодильный шкаф|морозильник|морозильная камера|refrigerator|freezer'))found.push('refrigeration');
 if(has('кондиционер|система кондиционирования|air conditioner'))found.push('comfort');
 if(has('светильник|светильники|люстра|освещение|lighting|light fixture'))found.push('lighting');
 const contradicted=has('не|без')||has('кондиционер для волос');
 const kind=!contradicted&&found.length===1?found[0]:'unknown';
 let contents='unspecified',risk='',action='';
 if(kind==='refrigeration'){
  const food=has('продуктов|продуктовый|мяса|рыбы|молочных продуктов|food'),drinks=has('напитков|пивной|пива|вина|drinks|beverage');
  if(food&&!drinks)contents='food';if(drinks&&!food)contents='drinks';
  risk=contents==='food'?'При нарушении условий хранения возможны порча продуктов, списания и сокращение доступного меню.':contents==='drinks'?'Возможны нарушение температуры подачи, сокращение доступных напитков и снижение продаж.':'Если оборудование используется для хранения, нарушение охлаждения может повлиять на качество и доступность позиций. Содержимое не указано.';
  action='Организуйте проверку условий хранения ответственным сотрудником и согласуйте с сервисом срок обслуживания.';
 }else if(kind==='comfort'){
  risk='Возможно ухудшение комфорта гостей и команды, что может повлиять на обслуживание.';
  action='Согласуйте использование доступных комфортных зон и передайте заявку обслуживающей организации.';
 }else if(kind==='lighting'){
  risk='Возможно ухудшение видимости и условий обслуживания в затронутой зоне.';
  action='Согласуйте использование зоны с ответственным за безопасность и передайте заявку обслуживающей организации.';
 }else{
  risk=found.length>1?'Название указывает на несколько назначений. Конкретные последствия не определены.':'По названию и категории назначение оборудования не определено.';
  action='Передайте в сервис название, место установки и описание неисправности.';
 }
 return {version:1,kind,contents,basis:'equipment_name',source:{equipmentId:equipment.id,name:String(equipment.name||''),category:String(equipment.category||''),zone:String(equipment.zone||equipment.area||'')},risk,action};
}
function bdEquipmentPriorityUnassessed(event){return event?.category==='equipment'&&event?.priorityBasis==='unassessed'&&!event?.aiAssessment}
