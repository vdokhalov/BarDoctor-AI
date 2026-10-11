import {parse} from 'acorn';
/** Preserve calendar inputs after the stable presentation restoration. */
export function wireHomeWorkday(source){
 const node=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='bdHomeDaily');if(!node)throw Error('Home daily component missing');
 let code=source.slice(node.start,node.end);if(!code.includes('bdHomeCalendarNow'))code=code.replace('function bdHomeDaily({','function bdHomeDaily({operationalDays:bdHomeDays=[],').replace('const bdHomeReviewState=','const bdHomeCalendarNow=useHomeCalendarClock(),bdHomeReviewState=').replace('bdHomeTodayState(e,t,new Date),[e,t]','bdHomeTodayState(e,t,bdHomeCalendarNow,bdHomeDays),[e,t,bdHomeCalendarNow,bdHomeDays]');
 if(!code.includes('bdHomeTodayState(e,t,bdHomeCalendarNow,bdHomeDays),[e,t,bdHomeCalendarNow,bdHomeDays]'))throw Error('Home calendar wiring incomplete');
 return source.slice(0,node.start)+code+source.slice(node.end);
}
