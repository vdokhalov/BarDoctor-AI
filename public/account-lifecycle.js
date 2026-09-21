(function () {
  'use strict';
  const byId = id => document.getElementById(id);
  const dialog = byId('confirmation'), form = byId('confirmation-form');
  let state = null, operation = null, busy = false, returnFocus = null;
  function node(tag, text, className) { const el = document.createElement(tag); if (text) el.textContent = text; if (className) el.className = className; return el; }
  function headers() { const email = localStorage.getItem('bd_session'), token = localStorage.getItem('bd_session_token'); return { 'Content-Type': 'application/json', ...(email && token ? { 'X-Session-Email': email, 'X-Session-Token': token } : {}) }; }
  async function api(path, method = 'GET', body) {
    const response = await fetch(path, { method, headers: headers(), cache: 'no-store', ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    let data; try { data = await response.json(); } catch { throw new Error('Сервер не вернул результат. Обновите список и повторите попытку.'); }
    if (response.status === 401) { clearLocal(); window.location.replace('/login'); throw new Error('Сессия завершена. Войдите снова.'); }
    if (!response.ok || !data.ok) throw new Error(data.error || 'Операция не завершена. Повторите попытку.');
    return data;
  }
  function clearLocal() {
    for (const storage of [localStorage, sessionStorage]) for (let index = storage.length - 1; index >= 0; index--) { const key = storage.key(index); if (key && (key.startsWith('bd_') || key.startsWith('bardoctor'))) storage.removeItem(key); }
  }
  function input(label, name, type = 'text') {
    const wrapper = node('label', label), field = node('input'); field.name = name; field.required = true; field.type = type; field.autocomplete = type === 'password' ? 'current-password' : 'off'; wrapper.append(field); return wrapper;
  }
  function close() { if (busy) return; dialog.close(); operation = null; returnFocus?.focus(); }
  byId('cancel').onclick = close; byId('close').onclick = close;
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  function open(kind, venue) {
    if (!state || busy) return;
    returnFocus = document.activeElement; operation = { kind, venue }; form.reset(); byId('dialog-error').textContent = '';
    const content = byId('dialog-content'); content.replaceChildren();
    byId('dialog-title').textContent = kind === 'account' ? 'Удалить мой аккаунт' : kind === 'delete' ? 'Удалить заведение' : kind === 'archive' ? 'Архивировать заведение' : 'Восстановить заведение';
    byId('confirm').textContent = kind === 'account' || kind === 'delete' ? 'Удалить безвозвратно' : kind === 'archive' ? 'Архивировать' : 'Восстановить';
    if (venue) content.append(node('h3', venue.name));
    if (kind === 'delete') {
      content.append(node('p', 'Будут удалены меню, техкарты, номенклатура, закупки, продажи, складские движения, сотрудники, финансы, история, файлы и подключения этого заведения. Данные других заведений и аккаунты участников сохранятся. Отменить удаление нельзя.'));
      content.append(input('Введите точное название: ' + venue.name, 'venueName'));
    } else if (kind === 'account') {
      content.append(node('p', 'Будут удалены профиль, пароль, фото, членства и все сессии BarDoctor. Общие заведения с другим владельцем сохранятся. Внешние Google-аккаунты и данные внешних сервисов не удаляются.'));
      content.append(node('p', 'Обезличенный технический идентификатор сохраняется для истории общих заведений и журнала безопасности. Необратимый хеш почты предотвращает повторный импорт удалённого профиля; старые права не возвращаются.'));
      for (const item of state.venues) {
        if (item.otherOwners > 0) content.append(node('p', 'Сохранится общее заведение: ' + item.name));
        else {
          content.append(node('p', 'Вы — последний владелец «' + item.name + '». Чтобы сохранить заведение, отмените удаление и передайте владение. Для удаления вместе с аккаунтом отдельно подтвердите его название. Будут удалены все связанные рабочие данные и файлы.'));
          content.append(input('Удалить заведение «' + item.name + '»: введите его название', 'venue-' + item.id));
        }
      }
      if (state.passwordRequired) content.append(input('Текущий пароль BarDoctor', 'password', 'password'));
      else content.append(node('p', 'Личность будет проверена через связанную учётную запись. Если подтверждение недоступно, сначала восстановите доступ и установите пароль.'));
      content.append(input('Введите УДАЛИТЬ АККАУНТ', 'accountConfirmation'));
    } else content.append(node('p', kind === 'archive' ? 'Заведение исчезнет из обычного переключателя. Все данные сохранятся, восстановление будет доступно в архиве.' : 'Заведение вернётся в обычный переключатель с прежними данными и связями.'));
    dialog.showModal(); byId('cancel').focus();
  }
  function renderList(target, venues, empty) {
    const parent = byId(target); parent.replaceChildren();
    if (!venues.length) parent.append(node('p', empty));
    for (const venue of venues) {
      const card = node('article', '', 'venue'); card.dataset.venueId = venue.id;
      card.append(node('h3', venue.name), node('small', venue.status === 'deleting' ? 'Удаление не завершено — повторите для завершения очистки' : venue.status === 'archived' ? 'В архиве' : 'Активно'));
      const actions = node('div', '', 'actions');
      const add = (label, kind, style) => { const button = node('button', label, style); button.type = 'button'; button.onclick = () => open(kind, venue); actions.append(button); };
      if (venue.status !== 'deleting') add(venue.status === 'archived' ? 'Восстановить' : 'Архивировать', venue.status === 'archived' ? 'restore' : 'archive');
      add(venue.status === 'deleting' ? 'Повторить удаление' : 'Удалить заведение', 'delete', 'danger'); card.append(actions); parent.append(card);
    }
  }
  async function load() {
    byId('notice').textContent = ''; byId('retry').hidden = true;
    try {
      const [lifecycle, available] = await Promise.all([api('/api/users/lifecycle'), api('/api/venues')]); state = lifecycle;
      renderList('active', state.venues.filter(v => v.status !== 'archived'), available.venues.length ? 'Здесь показаны только заведения, которыми вы владеете.' : 'Нет активных заведений. Создайте новое или восстановите заведение из архива.');
      renderList('archived', state.venues.filter(v => v.status === 'archived'), 'Архив пуст.');
      byId('delete-account').disabled = false; byId('create').hidden = !available.canCreateVenues;
      byId('home').hidden = !available.venues.length;
      if (available.venues.length) byId('home').href = '/home?venue=' + available.venues[0].id;
      byId('back').href = available.venues.length ? '/settings' : '/settings/lifecycle';
      const selected = localStorage.getItem('bd_active_venue_id');
      if (!available.venues.some(v => String(v.id) === selected)) { localStorage.removeItem('bd_active_venue_id'); localStorage.removeItem('bd_active_venue_is_primary'); }
    } catch (error) { byId('notice').textContent = error.message || 'Не удалось загрузить список'; byId('retry').hidden = false; }
  }
  byId('retry').onclick = load; byId('delete-account').onclick = () => open('account');
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || !operation) return;
    busy = true; for (const button of form.querySelectorAll('button')) button.disabled = true; byId('dialog-error').textContent = '';
    try {
      const data = new FormData(form), current = operation;
      if (current.kind === 'account') {
        const deleteVenues = {}; for (const venue of state.venues.filter(v => !v.otherOwners)) deleteVenues[venue.id] = String(data.get('venue-' + venue.id) || '');
        await api('/api/users/lifecycle', 'DELETE', { confirmation: data.get('accountConfirmation'), password: data.get('password'), deleteVenues });
        clearLocal(); window.location.replace('/register'); return;
      }
      await api('/api/venues/' + current.venue.id, current.kind === 'delete' ? 'DELETE' : 'PATCH', current.kind === 'delete' ? { confirmation: data.get('venueName') } : { status: current.kind === 'archive' ? 'archived' : 'active' });
      busy = false; close(); await load();
    } catch (error) { byId('dialog-error').textContent = error.message || 'Операция не завершена. Повторите попытку.'; }
    finally { busy = false; for (const button of form.querySelectorAll('button')) button.disabled = false; }
  });
  load();
})();
