import assert from 'node:assert/strict';
import { stockRuntime, type StockRow } from './stock-runtime';

/** Real purchase/count/sales handlers; one configured named warehouse. */
export async function stockRcaFixture(options: { now?: string | null } = {}) {
  const r = await stockRuntime(options);
  try {
    r.put('bd_warehouses', [{ id: 'qa-bar', name: 'QA bar', venueId: r.venueId, active: true }]);
    assert.ok((await r.confirm('x', 'pcs', 2, 20)).response.ok);
    const key = String((r.get('bd_stock_movements') as StockRow[])[0].productKey);
    const assortment = r.get('bd_assortment_v1') as StockRow;
    const nom = (assortment.nomenclature as StockRow[]).find(row => row.productKey === key)!;
    nom.kind = 'stock';
    assortment.menuItems = [{ id: 'beer', venueId: r.venueId, name: 'QA beer', active: true, type: 'ready',
      consumptionMode: 'DIRECT_ITEM', salePrice: 100, currency: 'MDL',
      readyProduct: { nomenclatureItemId: nom.id, productKey: key, packagesPerSale: 1 } }];
    r.put('bd_assortment_v1', assortment);
    const send = async (api: string, path: string, body: StockRow) => {
      const result = await r.call(api, path, 'POST', { venueId: r.venueId, ...body });
      assert.ok(result.response.ok, JSON.stringify(result.body));
      return result.body;
    };
    const created = await send('counts', '/api/inventory/counts', { action: 'create', scope: { type: 'all' } });
    const count = created.inventory as StockRow, countId = String(count.id);
    for (const body of [{ action: 'save', items: (count.items as StockRow[]).map(line => ({ productKey: line.productKey, actual: line.expected })) },
      { action: 'review' }, { action: 'finalize' }]) await send('counts', '/api/inventory/counts', { id: countId, ...body });
    await send('sales', '/api/sales-events', { action: 'open_shift', shiftId: 'qa', name: 'QA' });
    const sale = async (id: string) => {
      const command = { id, source: 'POS_API', shiftId: 'qa', lines: [{ id: id + '-line', menuItemId: 'beer', quantity: 1 }],
        payments: [{ id: id + '-payment', method: 'CASH', amount: 100 }] };
      const preview = await send('sales', '/api/sales-events', { action: 'preview', command });
      const posted = await send('sales', '/api/sales-events', { action: 'post', command, previewHash: preview.previewHash });
      const before = r.snapshot();
      await send('sales', '/api/sales-events', { action: 'post', command, previewHash: preview.previewHash });
      assert.deepEqual(r.snapshot(), before, 'Idempotent sales command makes no second movement/write');
      return posted.event as StockRow;
    };
    const historical = await sale('a'), captured = structuredClone(historical.batch);
    assert.ok((await r.confirm('y', 'pcs', 2, 40, '2026-10-02')).response.ok);
    await sale('b');
    return { ...r, key, countId, historical, captured, sale };
  } catch (error) { r.close(); throw error; }
}
