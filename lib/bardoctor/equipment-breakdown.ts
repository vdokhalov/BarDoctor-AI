import { getD1 } from '../../db';
import { type AuthenticatedAccount, hasPermission } from './access-control';
import { readStoreSnapshots, runStoreCasBatch } from './store-cas';
import { equipmentBreakdownRisk } from './equipment-breakdown-risk';
type Row = Record<string, any>;
const keys = ['bd_equipment', 'bd_equipment_history', 'bd_equipment_work_orders', 'bd_events', 'bd_employees'];
const str = (x: unknown, max = 3000) => typeof x === 'string' ? x.trim().slice(0, max) : '';
const error = (message: string, status = 422) => Response.json({ok: false, error: message}, {status});
/** Explicit, non-AI breakdown flow. Uses existing stores in one CAS transaction. */
export async function saveEquipmentBreakdown(account: AuthenticatedAccount, body: Row): Promise<Response> {
  if (!hasPermission(account, 'incidents.manage')) return error('Нет права сохранять происшествия', 403);
  const action = body.breakdownAction;
  if (!['create', 'plan', 'restore'].includes(action)) return error('Неизвестное действие');
  if (action === 'restore' && !['owner', 'manager', 'shift_manager'].includes(account.role)) return error('Подтвердить ремонт может руководитель или администратор', 403);
  const request = body.incident && typeof body.incident === 'object' ? body.incident : {};
  const id = str(request.id, 100);
  if (!id || !/^[\w:-]+$/.test(id)) return error('Не указан идентификатор события');
  const db = getD1(), snapshots = await readStoreSnapshots(db, account.id, keys);
  const stores = new Map(snapshots.map(s => {const value = s.dataJson ? JSON.parse(s.dataJson) : []; return [s.key, Array.isArray(value) ? value as Row[] : []] as const}));
  const equipment = stores.get('bd_equipment')!, history = stores.get('bd_equipment_history')!, orders = stores.get('bd_equipment_work_orders')!, events = stores.get('bd_events')!;
  const old = events.find(e => e.id === id), orderId = `incident:${id}`, previous = orders.find(e => e.id === orderId);
  if (old && (old.venueId !== account.venueId || old.equipmentWorkOrderId !== orderId)) return error('Событие недоступно', 404);
  if (previous && !old) return error('Идентификатор уже занят другой записью', 409);
  if (previous && previous.venueId !== account.venueId) return error('Работа недоступна', 404);
  const equipmentId = action === 'create' ? str(request.equipmentId, 100) : old?.equipmentId;
  const item = equipment.find(e => e.id === equipmentId && (e.venueId == null || Number(e.venueId) === account.venueId));
  if (!item || item.archived || ['replaced', 'decommissioned'].includes(item.status)) return error('Оборудование недоступно в этом заведении', 404);
  const response = (status = 200) => Response.json({ok: true, events, workOrders: orders, equipment, history}, {status});
  const plan = body.plan && typeof body.plan === 'object' ? body.plan : {};
  const employeeId = str(plan.responsibleEmployeeId, 100);
  const employee = employeeId ? stores.get('bd_employees')!.find(e => e.id === employeeId && (e.venueId == null || Number(e.venueId) === account.venueId) && e.status === 'active') : null;
  if (employeeId && !employee) return error('Сотрудник недоступен в этом заведении');
  const dueDate = str(plan.dueDate, 10);
  if (dueDate && (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !Number.isFinite(Date.parse(dueDate)) || new Date(dueDate).toISOString().slice(0,10) !== dueDate)) return error('Проверьте срок ремонта');
  const newPlan = { responsibleEmployeeId: employeeId || undefined, responsibleName: employee ? str(employee.name, 180) : str(plan.responsibleName, 180) || undefined, dueDate: dueDate || undefined };
  const eventDate = str(request.eventDate, 40);
  let timezone = 'UTC'; try {const value = JSON.parse(account.restaurantJson || '{}').timezone; new Intl.DateTimeFormat('en', {timeZone: value}).format(); timezone = value || 'UTC';} catch {}
  const now = new Date().toISOString(), actor = [account.firstName, account.lastName].filter(Boolean).join(' ') || account.appEmail;
  const source = {equipmentId, eventDate, description: str(request.description), ...newPlan};
  if (action === 'create' && old) {
    if (!previous || JSON.stringify(previous.creationInput) !== JSON.stringify(source)) return error('Запись уже сохранена с другими данными. Откройте её в событиях.', 409);
    return response(); // A lost acknowledgement must not recreate or reopen a restored event.
  }
  if (action !== 'create' && (!old || !previous || previous.flow !== 'breakdown_v2')) return error('Запись ремонта не найдена', 404);
  if (action === 'create' && (!eventDate || !Number.isFinite(Date.parse(eventDate)) || Date.parse(eventDate) > Date.parse(now))) return error('Укажите время поломки не позднее текущего');
  if (action !== 'create' && previous!.status === 'verified') return action === 'restore' ? response() : error('Ремонт уже подтверждён', 409);
  if (action === 'plan' && Object.entries(newPlan).every(([key, value]) => previous![key] === value)) return response();
  if (action === 'plan' && body.expectedUpdatedAt !== previous!.updatedAt) return error('Запись изменилась. Откройте её заново.', 409);
  const work: Row = action === 'create' ? {id: orderId, equipmentId, venueId: account.venueId, flow: 'breakdown_v2', incidentId: id, kind: 'problem', status: 'detected', equipmentStatus: 'broken', title: `${item.name} не работает`, problem: `${item.name} не работает`, description: source.description, priority: 'unassessed', priorityBasis: 'unassessed', creationInput: source, ...newPlan, detectedAt: eventDate, createdAt: now, updatedAt: now, createdBy: actor, createdById: account.actorAccountId, timeline: []} : {...previous};
  const event: Row = action === 'create' ? {id, category: 'equipment', photos: [], participantIds: [], title: work.title, description: source.description, status: 'open', priority: 'unassessed', priorityBasis: 'unassessed', equipmentId, equipmentWorkOrderId: orderId, equipmentBusinessRisk: equipmentBreakdownRisk(item), extraField: item.name, venueId: account.venueId, eventDate, createdAt: now, updatedAt: now} : {...old};
  if (action === 'plan') Object.assign(work, newPlan, {updatedAt: now});
  if (action === 'restore') {
    Object.assign(work, {status: 'verified', verifiedAt: now, verifiedBy: actor, verifiedById: account.actorAccountId, updatedAt: now});
    Object.assign(event, {status: 'resolved', resolvedAt: now, resolvedBy: actor});
  }
  Object.assign(event, {repair: {timezone: old?.repair?.timezone || timezone, status: work.status, responsibleName: work.responsibleName, responsibleEmployeeId: work.responsibleEmployeeId, dueDate: work.dueDate, detectedAt: work.detectedAt, verifiedAt: work.verifiedAt, verifiedBy: work.verifiedBy}, responsible: work.responsibleName || '', responsibleId: work.responsibleEmployeeId, updatedAt: now});
  if (action !== 'plan') {
    const entry = {id: `${orderId}:${work.status}`, equipmentId, workOrderId: orderId, type: action === 'create' ? 'breakdown' : 'inspection', workflowStatus: work.status, date: now.slice(0,10), problem: work.title, description: action === 'restore' ? 'Работа оборудования восстановлена' : source.description, performedBy: actor, actorId: account.actorAccountId, createdAt: now, updatedAt: now};
    history.unshift(entry); work.timeline = [...work.timeline, {id: entry.id, status: work.status, label: action === 'restore' ? 'Отремонтировано' : 'Не работает', at: now, actorName: actor, actorId: account.actorAccountId}];
    const other = orders.find(o => o.id !== orderId && o.equipmentId === equipmentId && o.status !== 'verified');
    item.status = action === 'create' ? 'broken' : other ? (['in_progress','fixed'].includes(other.status) ? 'under_repair' : other.equipmentStatus === 'broken' ? 'broken' : 'needs_maintenance') : 'working';
    item.updatedAt = now;
  }
  if (old) events[events.indexOf(old)] = event; else events.unshift(event);
  if (previous) orders[orders.indexOf(previous)] = work; else orders.unshift(work);
  const statements = keys.filter(key => key !== 'bd_employees').map(key => db.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at').bind(account.id, key, JSON.stringify(stores.get(key)), now));
  statements.push(db.prepare('INSERT INTO audit_log(account_id,store_key,action,entity_id,entity_label,before_json,after_json,changed_fields_json,actor_name,actor_role,reason,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(account.id,'bd_equipment_work_orders',action === 'create' ? 'create':'update',orderId,work.title,previous?JSON.stringify(previous):null,JSON.stringify(work),JSON.stringify(['status','responsibleName','dueDate']),actor,account.role,action === 'restore' ? 'Подтверждено восстановление оборудования' : 'Запись поломки без AI',now));
  await runStoreCasBatch(db, account.id, snapshots, statements, now);
  return response(action === 'create' ? 201 : 200);
}
