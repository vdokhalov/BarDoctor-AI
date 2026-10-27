import fs from 'node:fs';
import {parse} from 'acorn';
const file='public/assets/index-BQGspy0I.js';let source=fs.readFileSync(file,'utf8');
const changes=[['Ym','Math.round(e.revenue/e.receipts)','e.revenue/e.receipts'],['wn','Math.round(E/_)','E/_'],['bdFinanceKpisV160','Math.round(e.revenue/e.receipts)','e.revenue/e.receipts'],['bdDocumentDetailSheet','Mn(Math.round((Number(t.revenue)||0)/t.receipts))','Mn((Number(t.revenue)||0)/t.receipts)']];
for(const [name,before,after] of changes){const node=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);if(!node)throw Error('Missing '+name);const old=source.slice(node.start,node.end);if(!old.includes(before)&&!old.includes(after))throw Error('Unexpected '+name);source=source.slice(0,node.start)+old.replace(before,after)+source.slice(node.end);}
parse(source,{ecmaVersion:'latest',sourceType:'module'});fs.writeFileSync(file,source);console.log('Average receipt retains fractional money; aggregate remains total revenue / total receipts');
