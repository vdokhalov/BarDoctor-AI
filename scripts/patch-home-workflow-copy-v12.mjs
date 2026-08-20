import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");
const marker = 'const bdWorkflowCopyVersion="clear-v12";';

if (source.includes(marker)) {
  console.log("Home workflow copy v12 is already applied.");
  process.exit(0);
}

function replaceOnce(search, replacement) {
  const index = source.indexOf(search);
  if (index === -1) throw new Error(`Marker not found: ${search.slice(0, 180)}`);
  source =
    source.slice(0, index) +
    replacement +
    source.slice(index + search.length);
}

replaceOnce(
  'const bdWorkflowVersion="clear-v12";',
  'const bdWorkflowVersion="clear-v12";' + marker,
);

replaceOnce(
  'children:"Два рабочих сценария без дублирующих «дел» и «задач»."',
  'children:"Зафиксируйте факт или назначьте работу сотруднику."',
);

const taskStart = source.indexOf("function wue(");
const taskEnd = source.indexOf("function So(", taskStart);
if (taskStart === -1 || taskEnd === -1) throw new Error("Task section not found.");

const taskSection = source
  .slice(taskStart, taskEnd)
  .replaceAll("Задач на сегодня нет", "Поручений на сегодня нет")
  .replaceAll(
    "Добавьте первую задачу — она сразу появится здесь.",
    "Создайте первое поручение и назначьте ответственного.",
  )
  .replaceAll("На этой неделе всё спокойно", "На этой неделе поручений нет")
  .replaceAll(
    "Нет задач на ближайшие дни. Самое время спланировать.",
    "Можно заранее назначить сотрудника и срок выполнения.",
  )
  .replaceAll("Просроченных задач нет", "Просроченных поручений нет")
  .replaceAll("Выполненных задач пока нет", "Выполненных поручений пока нет")
  .replaceAll(
    "Здесь будут отмечены завершённые задачи.",
    "Здесь появятся завершённые поручения.",
  )
  .replaceAll('cta:"Добавить задачу"', 'cta:"Создать поручение"')
  .replaceAll('d.overdue===1?"задача просрочена":"задачи просрочены"', 'd.overdue===1?"поручение просрочено":"поручения просрочены"');

source = source.slice(0, taskStart) + taskSection + source.slice(taskEnd);

replaceOnce(
  'children:"Возможно, оно было удалено или ссылка устарела."',
  'children:"Возможно, запись была удалена или ссылка устарела."',
);

await writeFile(bundlePath, source);
console.log("Home workflow language is consistent and outcome-oriented.");
