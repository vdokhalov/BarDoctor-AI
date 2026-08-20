import fs from "node:fs";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = fs.readFileSync(bundlePath, "utf8");

function replaceRequired(before, after, expected = 1) {
  const count = source.split(before).length - 1;
  if (count !== expected) {
    throw new Error(`Expected ${expected} occurrence(s), found ${count}: ${before.slice(0, 120)}`);
  }
  source = source.split(before).join(after);
}

replaceRequired(
  'T={name:h&&!t.name?"Введите имя":"",surname:h&&!t.surname?"Введите фамилию":"",phone:h&&!t.localPhone.trim()?"Введите номер телефона":"",email:h&&!t.email?"Введите email":"",password:h&&t.password.length<6?"Минимум 6 символов":"",repeatPassword:_?"Пароли не совпадают":h&&!t.repeatPassword?"Повторите пароль":""}',
  'T={name:h&&!t.name.trim()?"Введите имя":"",surname:"",phone:"",email:h&&!t.email.trim()?"Введите email":"",password:h&&t.password.length<6?"Минимум 6 символов":"",repeatPassword:_?"Пароли не совпадают":h&&!t.repeatPassword?"Повторите пароль":""}',
);
replaceRequired(
  '!!(t.name&&t.surname&&t.localPhone.trim()&&t.email&&t.password&&t.repeatPassword&&t.password===t.repeatPassword&&f)',
  '!!(t.name.trim()&&t.email.trim()&&t.password&&t.repeatPassword&&t.password===t.repeatPassword&&f)',
);
replaceRequired(
  'firstName:t.name,lastName:t.surname||void 0,phone:N||void 0,role:"owner"',
  'firstName:t.name.trim(),lastName:t.surname.trim()||void 0,phone:N||void 0,role:"owner"',
);
replaceRequired(
  'Fg({firstName:t.name,lastName:t.surname||void 0,email:O.email,phone:N||void 0,role:"owner"})',
  'Fg({firstName:t.name.trim(),lastName:t.surname.trim()||void 0,email:O.email,phone:N||void 0,role:"owner"})',
);
replaceRequired('label:"Имя",placeholder:"Алексей"', 'label:"Имя *",placeholder:"Алексей"');
replaceRequired('label:"Фамилия",placeholder:"Иванов"', 'label:"Фамилия (необязательно)",placeholder:"Иванов"');
replaceRequired('children:"Телефон"}),i.jsxs("div",{className:"bd-auth-phone-row"', 'children:"Телефон (необязательно)"}),i.jsxs("div",{className:"bd-auth-phone-row"');
replaceRequired('label:"Email",type:"email",placeholder:"name@company.ru",value:t.email', 'label:"Email *",type:"email",placeholder:"name@company.ru",value:t.email');
replaceRequired('id:"bd-register-password",label:"Пароль",type:', 'id:"bd-register-password",label:"Пароль *",type:');
replaceRequired('id:"bd-register-repeat",label:"Повторите пароль",type:', 'id:"bd-register-repeat",label:"Повторите пароль *",type:');
replaceRequired(
  'disabled:y||!t.name.trim()||!t.surname.trim()||!t.localPhone.trim()||!t.email.trim()||t.password.length<6||t.password!==t.repeatPassword||!f',
  'disabled:y',
);

replaceRequired(
  'i.jsx("button",{type:"button",onClick:()=>f(!0),className:"w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 active:bg-muted/60 transition-colors",children:i.jsx(rS,{size:15,className:"text-muted-foreground"})})',
  'i.jsx("button",{type:"button",onClick:()=>f(!0),"aria-label":"Редактировать личные данные",className:"w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 active:bg-muted/60 transition-colors",children:i.jsx(rS,{size:15,className:"text-muted-foreground"})})',
);
replaceRequired(
  'i.jsx("button",{type:"button",onClick:()=>h(!0),className:"w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 active:bg-muted/60 transition-colors",children:i.jsx(rS,{size:15,className:"text-muted-foreground"})})',
  'i.jsx("button",{type:"button",onClick:()=>h(!0),"aria-label":"Редактировать данные заведения",className:"w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 active:bg-muted/60 transition-colors",children:i.jsx(rS,{size:15,className:"text-muted-foreground"})})',
);

replaceRequired("rc-v63", "rc-v64");

fs.writeFileSync(bundlePath, source);
console.log("applied release candidate v64");
