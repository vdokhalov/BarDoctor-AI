function bdCatInternalEditor({item, products, onClose, onSave}) {
  const [draft, setDraft] = S.useState(() => bdInternalConsumable.openConsumableDraft(item || {
    id: crypto.randomUUID(), name: '', unit: 'pcs', currentStock: 0,
    minimumStock: 0, onOrder: 0, packageAmount: 0, purchaseProductKey: '', active: true
  }));
  const [busy, setBusy] = S.useState(false), [error, setError] = S.useState('');
  const pending = S.useRef(false);
  const change = (key, value) => setDraft(old => ({...old, [key]: value}));
  const close = () => { if (!pending.current) onClose(); };
  async function save() {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try {
      const value = bdInternalConsumable.saveConsumableDraft(draft);
      const result = await onSave(value);
      if (result?.synced !== true) throw new Error('Сервер не подтвердил сохранение. Проверьте связь и повторите.');
      onClose();
    } catch (cause) {
      setError('Не удалось сохранить расходник. ' + (cause?.message || 'Повторите попытку.') + ' Введённые данные остались в форме.');
    } finally { pending.current = false; setBusy(false); }
  }
  function unitChange(unit) {
    try { setDraft(bdInternalConsumable.changeConsumableUnit(draft, unit)); setError(''); }
    catch (cause) { setError(cause.message); }
  }
  function productChange(key) {
    const product = products.find(row => row.key === key);
    try {
      let next = draft;
      if (product) {
        next = bdInternalConsumable.changeConsumableUnit(draft, product.unit);
        next = {...next, packageAmount: product.amount || 0};
      }
      setDraft({...next, purchaseProductKey: key}); setError('');
    } catch (cause) { setError(cause.message); }
  }
  return <div className="bd-catalog-sheet-backdrop"><section className="bd-catalog-sheet" role="dialog" aria-label="Редактор расходника" aria-busy={busy}>
    <div className="bd-catalog-sheet-handle"/><header className="bd-catalog-sheet-head"><div><h2>{item ? 'Внутренний расходник' : 'Новый расходник'}</h2><p>Для товаров вне меню: салфетки, химия, уголь, упаковка.</p></div><button type="button" disabled={busy} className="bd-catalog-close" onClick={close} aria-label="Закрыть">×</button></header>
    <form className="bd-catalog-form" onSubmit={event => {event.preventDefault(); save();}}>
      <fieldset disabled={busy} style={{border:0,padding:0,margin:0,minWidth:0}}>
        <label className="bd-catalog-field">Название<input aria-label="Название" value={draft.name} onChange={e=>change('name',e.target.value)}/></label>
        <label className="bd-catalog-field">Связь с закупочным товаром<select aria-label="Связь с закупочным товаром" value={draft.purchaseProductKey || ''} onChange={e=>productChange(e.target.value)}><option value="">Не связано</option>{products.map(p=><option key={p.key} value={p.key}>{p.name}{p.packageSize ? ' · '+p.packageSize : ''}</option>)}</select></label>
        <label className="bd-catalog-field">Единица<select aria-label="Единица" value={draft.unit} onChange={e=>unitChange(e.target.value)}>{[['pcs','шт.'],['kg','кг'],['g','г'],['l','л'],['ml','мл']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        {[['packageAmount','Фасовка'],['currentStock','Сейчас'],['minimumStock','Минимальный остаток'],['onOrder','Уже заказано']].map(([key,label])=><label className="bd-catalog-field" key={key}>{label}<input aria-label={label} type="number" step="any" inputMode="decimal" value={draft[key] ?? 0} onChange={e=>change(key,e.target.value)}/></label>)}
        <label className="bd-catalog-field">Статус<select aria-label="Статус" value={draft.active === false ? 'archived' : 'active'} onChange={e=>change('active',e.target.value === 'active')}><option value="active">Активен</option><option value="archived">В архиве</option></select></label>
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <div className="bd-catalog-sheet-actions"><button type="button" className="bd-catalog-secondary" disabled={busy} onClick={close}>Отмена</button><button type="submit" className="bd-catalog-primary" disabled={busy || !draft.name.trim()}>{busy ? 'Сохраняем…' : 'Сохранить'}</button></div>
    </form>
  </section></div>;
}
function bdInternalConsumableList({items, onEdit, canManage}) {
  const labels={pcs:'шт.',g:'г',kg:'кг',ml:'мл',l:'л'};
  return <div className="bd-catalog-list">{items.map(item=>{
    const draft=bdInternalConsumable.openConsumableDraft(item);
    return <article key={item.id} className="bd-catalog-card"><strong>{item.name}</strong><p>Сейчас {draft.currentStock} · минимум {draft.minimumStock} · уже заказано {draft.onOrder} {labels[draft.unit] || draft.unit}{item.active===false ? ' · В архиве' : ''}</p>{canManage&&<button type="button" onClick={()=>onEdit(item)} aria-label={'Редактировать '+item.name}>Редактировать</button>}</article>;
  })}</div>;
}
