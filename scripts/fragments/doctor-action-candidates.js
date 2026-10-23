function bdDoctorActionCandidates(value){
 if(!Array.isArray(value))return [];
 return value.filter(action=>{
  if(!action||typeof action!=='object'||Array.isArray(action)||typeof action.title!=='string')return false;
  const title=action.title.trim();
  return !!title&&!/^(?:нет\s+(?:подтвержд[её]нных\s+)?(?:управленческих\s+)?действий|действий\s+нет)[.!\s]*$/iu.test(title);
 });
}
