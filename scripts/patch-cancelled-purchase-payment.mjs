import fs from 'node:fs';
import {parse} from 'acorn';
const changes=[
 ['children:bdProcPaymentStatusLabelV186(B)','children:D?"Документ отменён":bdProcPaymentStatusLabelV186(B)'],
 ['label:"Оплачено",value:bdProcMoneyV168(L,e?.currency||"RUB"),tone:L>0?"good":"neutral"','label:D?"Платежи без сторно":"Оплачено",value:D&&!_.length&&L>0?"Нет записей":bdProcMoneyV168(D?T.reduce((sum,payment)=>sum+bdProcNumberV168(payment?.amount),0):L,e?.currency||"RUB"),tone:D?T.length?"warn":"neutral":L>0?"good":"neutral"'],
 ['label:"Осталось",value:bdProcMoneyV168(q,e?.currency||"RUB"),tone:q>.005?"warn":"good"','label:D?"К оплате":"Осталось",value:D?"Не требуется":bdProcMoneyV168(q,e?.currency||"RUB"),tone:D?"neutral":q>.005?"warn":"good"'],
 ['Проведение отменено, но платежи сохранены. Они требуют финансовой сверки и не удалены из истории.','Есть платежи без сторно. Нужна сверка.']
];
for(const file of ['public/assets/index-BQGspy0I.js','scripts/fragments/procurement-command-v168.fragment.txt']){
 const source=fs.readFileSync(file,'utf8');const node=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='bdProcPurchaseDetailV168');
 if(!node)throw Error('Missing purchase detail');let block=source.slice(node.start,node.end);
 block=block.replace('value:bdProcMoneyV168(D?T.reduce((sum,payment)=>sum+bdProcNumberV168(payment?.amount),0):L,e?.currency||"RUB")','value:D&&!_.length&&L>0?"Нет записей":bdProcMoneyV168(D?T.reduce((sum,payment)=>sum+bdProcNumberV168(payment?.amount),0):L,e?.currency||"RUB")');
 for(const [before,after]of changes){if(block.includes(after))continue;if(block.split(before).length!==2)throw Error('Missing unique cancelled payment presentation anchor');block=block.replace(before,after);}
 fs.writeFileSync(file,source.slice(0,node.start)+block+source.slice(node.end));
}
console.log('Cancelled document: no payable balance; payment history retained');
