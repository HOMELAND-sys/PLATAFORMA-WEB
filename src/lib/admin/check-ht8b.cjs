// Regresiones CC-HT8B sin red, sesión ni ejecución de SQL.
module.exports = async function ({ test, load, lexicalSql, workspace, root, React, renderToStaticMarkup, renderData, sbStub }) {
  const assert = require('node:assert/strict');
  const fs = require('fs');
  const path = require('path');
  const read = file => fs.readFileSync(path.join(workspace, file), 'utf8');
  const { createConfirmationController, trapConfirmationFocus } = load(path.join(__dirname, 'confirmation.ts'));
  const options = { title: 'Eliminar registro', message: 'Acción de prueba', destructive: true };

  let state;
  let controller = createConfirmationController(value => { state = value; });
  let answer = controller.ask(options);
  controller.cancel();
  const rejected = await answer;
  test('Confirmación: cancelar resuelve false y cierra el diálogo', () => {
    assert.equal(rejected, false);
    assert.equal(state.options, null);
  });

  let calls = 0;
  let release;
  let settled = false;
  answer = controller.ask({ ...options, onConfirm: () => {
    calls++;
    return new Promise(resolve => { release = resolve; });
  } });
  answer.then(() => { settled = true; });
  const accepting = controller.accept();
  controller.cancel();
  await controller.accept();
  const repeated = await controller.ask(options);
  test('Confirmación ocupada: no se cierra ni ejecuta dos veces y bloquea otro pedido', () => {
    assert.equal(state.busy, true);
    assert.equal(state.options.title, options.title);
    assert.equal(calls, 1);
    assert.equal(settled, false);
    assert.equal(repeated, false);
  });
  release();
  await accepting;
  const accepted = await answer;
  test('Confirmación: resuelve true después de terminar la operación', () => {
    assert.equal(accepted, true);
    assert.equal(state.options, null);
    assert.equal(state.busy, false);
  });

  let shouldFail = true;
  answer = controller.ask({ ...options, onConfirm: async () => {
    if (shouldFail) throw new Error('No se pudo guardar el registro');
  } });
  await controller.accept();
  test('Confirmación: el error permite revisar o reintentar sin anunciar éxito', () => {
    assert.equal(state.error, 'No se pudo guardar el registro');
    assert.equal(state.busy, false);
    assert.notEqual(state.options, null);
  });
  shouldFail = false;
  await controller.accept();
  assert.equal(await answer, true);

  const updates = [];
  controller = createConfirmationController(value => updates.push(value));
  answer = controller.ask({ ...options, onConfirm: () => new Promise(resolve => { release = resolve; }) });
  const pending = controller.accept();
  controller.dispose();
  const updateCount = updates.length;
  release();
  await pending;
  const disposed = await answer;
  test('Confirmación: desmontar resuelve false y evita actualizaciones tardías', () => {
    assert.equal(disposed, false);
    assert.equal(updates.length, updateCount);
  });

  const oldDocument = global.document;
  const mockDocument = { activeElement: null };
  global.document = mockDocument;
  try {
    const first = { focus() { mockDocument.activeElement = first; } };
    const last = { focus() { mockDocument.activeElement = last; } };
    let controls = [first, last];
    const dialog = {
      querySelectorAll: () => controls,
      contains: element => element === dialog || controls.includes(element),
      focus() { mockDocument.activeElement = dialog; },
    };
    function tab(shiftKey = false) {
      let prevented = false;
      trapConfirmationFocus({ key: 'Tab', shiftKey, preventDefault() { prevented = true; } }, dialog);
      return prevented;
    }
    test('Confirmación: Tab y Shift+Tab mantienen el foco en ambos extremos', () => {
      mockDocument.activeElement = last;
      assert.equal(tab(), true);
      assert.equal(mockDocument.activeElement, first);
      assert.equal(tab(true), true);
      assert.equal(mockDocument.activeElement, last);
      mockDocument.activeElement = {};
      assert.equal(tab(), true);
      assert.equal(mockDocument.activeElement, first);
    });
    test('Confirmación ocupada: el foco queda contenido aunque todos los botones estén deshabilitados', () => {
      controls = [];
      assert.equal(tab(), true);
      assert.equal(mockDocument.activeElement, dialog);
    });
  } finally {
    if (oldDocument === undefined) delete global.document;
    else global.document = oldDocument;
  }

  const { ConfirmDialog } = load(path.join(root, 'components/admin/ConfirmDialog.tsx'));
  test('Diálogo accesible: título, descripción, acción destructiva y estado ocupado', () => {
    const props = { options, busy: true, onConfirm() {}, onCancel() {} };
    const html = renderToStaticMarkup(React.createElement(ConfirmDialog, props));
    assert.match(html, /role="alertdialog"/);
    assert.match(html, /aria-modal="true"/);
    assert.match(html, /aria-labelledby="[^"]+"/);
    assert.match(html, /aria-describedby="[^"]+"/);
    assert.match(html, /aria-busy="true"/);
    assert.match(html, /admin-confirm__danger/);
    assert.equal((html.match(/disabled=""/g) || []).length, 2);
    assert.match(html, /Procesando/);
  });

  const active = {
    id: 'tour-active', code: 'UYU-03', title: 'Tour activo sin reservas', active: true,
    price_group: 45, price_child: 45, min_pax: 1, child_age_max: 11,
    default_start_times: ['08:00', '14:30'], default_cutoff_hours: 12,
  };
  const draft = { ...active, id: 'tour-draft', code: 'SAJ-01', title: 'Borrador de prueba', active: false };
  const products = [draft, active];
  const ProductOptions = load(path.join(root, 'components/admin/ProductOptions.tsx')).default;
  test('Productos: Activos antes que Borradores, con código y marca de borrador', () => {
    const html = renderToStaticMarkup(React.createElement(ProductOptions, { products }));
    assert.ok(html.indexOf('label="Activos"') < html.indexOf('label="Borradores"'));
    assert.match(html, /UYU-03 · Tour activo sin reservas/);
    assert.match(html, /SAJ-01 · Borrador de prueba \(borrador\)/);
  });
  test('Reservas: el filtro lista el catálogo aunque no exista ninguna reserva', () => {
    const html = renderData('ReservasTab', [[], products], {});
    assert.match(html, /Todos los tours/);
    assert.match(html, /Tour activo sin reservas/);
    assert.match(html, /Borrador de prueba \(borrador\)/);
    assert.ok(html.indexOf('label="Activos"') < html.indexOf('label="Borradores"'));
  });
  test('Disponibilidad: filtro y generador comparten agrupación y códigos', () => {
    const list = renderData('AvailabilityTab', [products, []], {});
    const generator = renderData('SlotGenerator', [], { products, onClose() {}, onSaved() {} });
    for (const html of [list, generator]) {
      assert.match(html, /label="Activos"/);
      assert.match(html, /label="Borradores"/);
      assert.match(html, /UYU-03/);
    }
    assert.match(generator, /<option value="tour-active" selected=""/);
  });

  const format = load(path.join(__dirname, 'format.ts'));
  test('Español: solo la inicial del encabezado de fecha lleva mayúscula', () => {
    assert.equal(format.dateLabel('2026-11-14', true), 'Sábado, 14 de noviembre de 2026');
    const css = read('src/styles/admin-operations.css');
    assert.doesNotMatch(css, /\.ops-day-group h3\s*\{[^}]*text-transform:\s*capitalize/);
  });
  const booking = {
    id: 'local-booking', code: 'HT-LOCAL', tour_id: active.id, tour_date_id: 'local-slot',
    tour_type: 'group', pax: 3, adults: 2, children: 1, source: 'oficina',
    subtotal: 135, group_discount: 7, coupon_discount: 0, offer_discount: 0, total: 128,
    status: 'confirmada', payment_method: 'efectivo', paid_at: '2026-11-12T12:00:00Z',
    created_at: '2026-11-12T11:00:00Z', checked_in_at: null, voucher_sent_at: null,
    cancelled_at: null, completed_at: null, refund_pending: false,
    client_name: 'Prueba Adulto Uno', client_email: '', client_phone: '', client_country: 'Bolivia',
    tour: { title: active.title, summary: [], included: [], meeting_point: '' },
    date_row: { date: '2026-11-14', start_time: '08:00:00' }, extras: [],
    passengers: [{ id: 'passenger', position: 1, is_lead: true, name: 'Prueba Adulto Uno', doc: '', country: 'Bolivia', meal: 'Normal' }],
  };
  test('Detalle: nombre y documento van en bloques separados y los participantes concuerdan', () => {
    const html = renderData('ReservationDetail', [[]], { booking, onClose() {}, onSaved: async () => {} });
    assert.match(html, /ops-passenger ops-wrap"><strong>Prueba Adulto Uno<\/strong><span class="cell-sub">/);
    assert.match(html, /2 adultos · 1 niño/);
    assert.equal(format.participantSummary(1, 2), '1 adulto · 2 niños');
    assert.equal(format.participantSummary(1, 1), '1 adulto · 1 niño');
  });
  test('Reserva manual: Bolivia es valor real editable y se conserva el descuento de grupo', () => {
    const html = renderData('ManualBookingForm', [{ tours: [active], partners: [] }, []], { onClose() {}, onSaved() {} });
    const country = html.match(/<label[^>]*><span>País<\/span>([\s\S]*?)<\/label>/)?.[1];
    assert.ok(country);
    assert.match(country, /value="Bolivia"/);
    assert.doesNotMatch(country, /readonly|disabled/);
    const totals = load(path.join(root, 'lib/pricing.ts')).calcBookingTotals(135, 3);
    assert.equal(totals.groupDiscountRate, .05);
    assert.equal(totals.total, 128);
  });

  const previousRpc = sbStub.rpc;
  const previousWindow = global.window;
  const slotRequest = {
    p_tour_id: active.id, p_from: '2026-11-12', p_to: '2026-11-28',
    p_weekdays: [0, 1, 2, 3, 4, 5, 6], p_start_times: ['08:00', '14:30'],
    p_capacity: 8, p_cutoff: 0,
  };
  let generated;
  try {
    global.window = { dispatchEvent() {} };
    sbStub.rpc = async (name, input) => {
      assert.equal(name, 'admin_generate_slots');
      assert.deepEqual(input, slotRequest);
      return { data: 34, error: null };
    };
    generated = await load(path.join(__dirname, 'slots.ts')).generateSlots(slotRequest);
  } finally {
    sbStub.rpc = previousRpc;
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
  }
  test('Generación: mantiene el contrato y las 34 franjas de dos horarios durante 17 días', () => {
    assert.equal((Date.parse(slotRequest.p_to) - Date.parse(slotRequest.p_from)) / 86400000 + 1, 17);
    assert.equal(slotRequest.p_start_times.length, 2);
    assert.equal(generated, 34);
  });

  const migration = read('supabase/migrations/0014_catalogo_drive.sql');
  test('0014: nueve códigos originales únicos y asignación solo cuando code es NULL', () => {
    lexicalSql(migration);
    const codes = migration.match(/update public\.tours t set code = original\.code\s*from \(values([\s\S]*?)\) as original\(slug, code\)\s*where t\.slug = original\.slug and t\.code is null;/)?.[1];
    assert.ok(codes);
    const rows = [...codes.matchAll(/\('([^']+)', '([^']+)'\)/g)].map(match => [match[1], match[2]]);
    assert.deepEqual(rows, [
      ['salar-de-uyuni-3-day-adventure', 'UYU-03'], ['laguna-colorada-uyuni-4-day-tour', 'UYU-04'],
      ['uyuni-salt-flats-day-tour', 'UYU-01'], ['copacabana-isla-del-sol', 'TIT-01'],
      ['la-paz-city-tour-valle-de-la-luna', 'LPZ-01'], ['valle-de-la-luna-half-day', 'LUN-01'],
      ['madidi-amazon-expedition', 'MAD-01'], ['rurrenabaque-pampas-jungle-3-day', 'RUR-03'],
      ['salkantay-trek-machu-picchu', 'SAL-01'],
    ]);
    assert.equal(new Set(rows.map(row => row[1])).size, 9);
    const drafts = read('supabase/migrations/0013_catalogo_real.sql');
    for (const [, code] of rows) assert.ok(!drafts.includes(`'${code}'`), code);
  });

  function filesIn(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
      const file = path.join(directory, entry.name);
      return entry.isDirectory() ? filesIn(file) : [file];
    });
  }
  test('Admin sin confirm, alert ni prompt nativos', () => {
    for (const file of [...filesIn(path.join(root, 'components/admin')), ...filesIn(path.join(root, 'app/admin'))]) {
      assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /window\.(?:confirm|alert|prompt)\b/, file);
    }
  });
  test('Componentes de la segunda ronda: JSX desplegado y sangría de dos espacios', () => {
    for (const name of ['ReservationDetail', 'AgenciesTab', 'CouponsTab', 'OffersTab', 'TransfersTab']) {
      const lines = read('src/components/admin/' + name + '.tsx').split('\n');
      assert.ok(lines.length > 100, name);
      assert.ok(Math.max(...lines.map(line => line.length)) < 800, name);
      assert.ok(lines.every(line => !/^\t/.test(line) && (line.match(/^ */)[0].length % 2 === 0)), name);
    }
  });
};
