import fs from "node:fs";

const bundlePath = "public/assets/index-BQGspy0I.js";
let source = fs.readFileSync(bundlePath, "utf8");
let replacements = 0;

function replaceOnce(label, before, after) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Back-control patch target not found: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Back-control patch target is not unique: ${label}`);
  }
  source = source.slice(0, first) + after + source.slice(first + before.length);
  replacements += 1;
}

replaceOnce(
  "shift payroll Back",
  'onClick:()=>t("/finance"),"aria-label":"Назад",className:"w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center active:scale-95"',
  'onClick:()=>window.bdNavigateBack("/finance"),"aria-label":"Назад",className:"w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center active:scale-95"',
);
replaceOnce(
  "equipment catalog Back",
  'onClick:g,"aria-label":"Назад к оборудованию",className:"w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"',
  'onClick:()=>window.bdNavigateBack("/equipment"),"aria-label":"Назад к оборудованию",className:"w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"',
);
replaceOnce(
  "equipment detail Back",
  'onClick:()=>t("/equipment"),"aria-label":"Назад к оборудованию",className:"w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"',
  'onClick:()=>window.bdNavigateBack("/equipment"),"aria-label":"Назад к оборудованию",className:"w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"',
);
replaceOnce(
  "equipment history create Back",
  'onClick:()=>t(`/equipment/${l}`),"aria-label":"Назад к оборудованию",className:"w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"',
  'onClick:()=>window.bdNavigateBack(`/equipment/${l}`),"aria-label":"Назад к карточке оборудования",className:"w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"',
);
replaceOnce(
  "equipment analytics Back",
  'onClick:()=>e("/equipment"),"aria-label":"Назад к оборудованию",className:"w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"',
  'onClick:()=>window.bdNavigateBack("/equipment"),"aria-label":"Назад к оборудованию",className:"w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"',
);

replaceOnce(
  "case detail Back",
  'onClick:()=>t("/cases"),className:"w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center shadow-[var(--shadow-card)] active:scale-95 flex-shrink-0",children:i.jsx(Nn,{size:18,className:"text-foreground"})',
  'onClick:()=>window.bdNavigateBack("/cases"),"aria-label":"Назад",className:"w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center shadow-[var(--shadow-card)] active:scale-95 flex-shrink-0",children:i.jsx(Nn,{size:18,className:"text-foreground"})',
);
replaceOnce(
  "event detail Back",
  'onClick:()=>t("/events"),className:"w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center shadow-[var(--shadow-card)] active:scale-95 flex-shrink-0",children:i.jsx(Nn,{size:18,className:"text-foreground"})',
  'onClick:()=>window.bdNavigateBack("/events"),"aria-label":"Назад",className:"w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center shadow-[var(--shadow-card)] active:scale-95 flex-shrink-0",children:i.jsx(Nn,{size:18,className:"text-foreground"})',
);

replaceOnce(
  "Suppliers Back",
  'className:"bd-procurement-back",onClick:()=>e("/more"),"aria-label":"Назад"',
  'className:"bd-procurement-back",onClick:()=>window.bdNavigateBack("/more"),"aria-label":"Назад"',
);
replaceOnce(
  "Catalog Back",
  'className:"bd-catalog-back",onClick:()=>e("/more"),"aria-label":"Назад"',
  'className:"bd-catalog-back",onClick:()=>window.bdNavigateBack("/more"),"aria-label":"Назад"',
);
replaceOnce(
  "About Back",
  'onClick:()=>e("/more"),"aria-label":"Назад",className:"w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center active:scale-95"',
  'onClick:()=>window.bdNavigateBack("/more"),"aria-label":"Назад",className:"w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center active:scale-95"',
);
replaceOnce(
  "Health Back",
  'onClick:()=>e("/home"),"aria-label":"Назад на главную",className:"w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"',
  'onClick:()=>window.bdNavigateBack("/home"),"aria-label":"Назад",className:"w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"',
);
replaceOnce(
  "Reviews Back",
  'onClick:()=>e("/health"),"aria-label":"Назад к диагностике",className:"w-9 h-9 rounded-full bg-card border border-card-border flex items-center justify-center"',
  'onClick:()=>window.bdNavigateBack("/more"),"aria-label":"Назад",className:"w-11 h-11 rounded-full bg-card border border-card-border flex items-center justify-center"',
);

replaceOnce(
  "Add flow close",
  'onClick:()=>e("/home"),"aria-label":"Закрыть",className:"w-10 h-10 bg-card border border-border rounded-full flex items-center justify-center shadow-[var(--shadow-card)] active:scale-95 flex-shrink-0"',
  'onClick:()=>window.bdNavigateBack("/home"),"aria-label":"Закрыть",className:"w-11 h-11 bg-card border border-border rounded-full flex items-center justify-center shadow-[var(--shadow-card)] active:scale-95 flex-shrink-0"',
);
replaceOnce(
  "Smart flow close",
  'onClick:()=>e("/home"),"aria-label":"Закрыть",className:"w-10 h-10 bg-card border border-border rounded-full flex items-center justify-center shadow-[var(--shadow-card)] active:scale-95"',
  'onClick:()=>window.bdNavigateBack("/home"),"aria-label":"Закрыть",className:"w-11 h-11 bg-card border border-border rounded-full flex items-center justify-center shadow-[var(--shadow-card)] active:scale-95"',
);
replaceOnce(
  "case create close",
  'n==="pick"&&i.jsx(OCe,{onPick:f,onClose:()=>e("/cases")}',
  'n==="pick"&&i.jsx(OCe,{onPick:f,onClose:()=>window.bdNavigateBack("/cases")}',
);

fs.writeFileSync(bundlePath, source);
console.log(`Applied ${replacements} route Back-control replacements.`);
