/** Employment profile titles, not account/venue access roles. Matches the existing editor. */
export const EMPLOYEE_POSITION_LABELS: Record<string, string> = {
  owner:'Владелец', general_manager:'Генеральный управляющий', venue_manager:'Управляющий заведением',
  administrator:'Администратор', shift_manager:'Менеджер смены', bartender:'Бармен', barback:'Бар-бек',
  waiter:'Официант', host:'Хостес', cashier:'Кассир', cook:'Повар', chef:'Шеф-повар',
  kitchen_assistant:'Помощник повара', cleaner:'Уборщик(-ца)', security_guard:'Охранник', dj:'DJ',
  mc:'Ведущий (MC)', sound_engineer:'Звукорежиссёр', lighting_technician:'Световик',
  hookah_specialist:'Кальянщик', technician:'Технический специалист', accountant:'Бухгалтер',
  marketer:'Маркетолог/SMM', other:'Другое',
};
export function importedEmployeePosition(value: unknown, previous?: Record<string, unknown>):
  {position:string;customPositionLabel?:string} | null {
  const label=typeof value==='string'?value.trim():'';
  if(!label){
    const position=typeof previous?.position==='string'?previous.position.trim():'';
    const custom=typeof previous?.customPositionLabel==='string'?previous.customPositionLabel.trim():'';
    return position && (position!=='other'||custom) ? {position,customPositionLabel:custom||undefined} : null;
  }
  const normalized=label.toLocaleLowerCase('ru');
  const known=Object.entries(EMPLOYEE_POSITION_LABELS).find(([key,title])=>key===normalized||title.toLocaleLowerCase('ru')===normalized)?.[0];
  // "Other" is a selector option, not a supplied job title.
  if(known==='other')return null;
  return known?{position:known,customPositionLabel:undefined}:{position:'other',customPositionLabel:label};
}

/** Compatibility view only: recover a stored imported title without migrating employee history. */
export function employeePositionView(data: unknown, venueId: number): unknown {
  if (!Array.isArray(data)) return data;
  return data.map(value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    const employee = value as Record<string, unknown>;
    if (employee.venueId !== venueId || !employee.externalId || !employee.externalSystem
      || (typeof employee.position === 'string' && employee.position.trim())) return value;
    const position = importedEmployeePosition(employee.role);
    return position ? {...employee, ...position} : value;
  });
}
