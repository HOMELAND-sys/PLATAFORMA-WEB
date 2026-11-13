// CC-HT8C: regresiones locales, sin sesión, red ni SQL.
module.exports = async function ({ test, load, workspace, root, renderData }) {
  const assert = require('node:assert/strict');
  const fs = require('fs');
  const path = require('path');
  const vm = require('vm');
  const ts = require('typescript');
  const actions = load(path.join(__dirname, 'tour-actions.ts'));
  const { createConfirmationController } = load(path.join(__dirname, 'confirmation.ts'));
  let state;
  let writes = 0;
  const controller = createConfirmationController(value => { state = value; });
  const active = { title: 'Valle de la Luna Half Day', active: true };
  let pending = actions.changeTourVisibility(active, controller.ask, async () => { writes++; });
  test('Desactivar: espera confirmación roja con el efecto sobre el catálogo público', () => {
    assert.equal(writes, 0);
    assert.equal(state.options.confirmLabel, 'Desactivar');
    assert.equal(state.options.destructive, true);
    assert.match(state.options.message, /Se ocultará del catálogo público/);
    assert.ok(state.options.message.includes(active.title));
  });
  controller.cancel();
  const cancelled = await pending;
  test('Cancelar la desactivación conserva el tour sin escrituras', () => {
    assert.equal(cancelled, false);
    assert.equal(writes, 0);
    assert.equal(active.active, true);
  });
  pending = actions.changeTourVisibility(active, controller.ask, async () => { writes++; });
  await controller.accept();
  const saved = await pending;
  test('Aceptar la desactivación ejecuta una sola escritura', () => {
    assert.equal(saved, true);
    assert.equal(writes, 1);
  });
  const activated = await actions.changeTourVisibility({ ...active, active: false }, () => {
    throw new Error('Activar debe seguir siendo directo');
  }, async () => { writes++; });
  test('Activar continúa sin diálogo', () => {
    assert.equal(activated, true);
    assert.equal(writes, 2);
  });
  test('Lista, menú y editor usan la misma confirmación sin interpretar cancelar como error', () => {
    const source = fs.readFileSync(path.join(root, 'components/admin/ToursTab.tsx'), 'utf8');
    assert.match(source, /await changeTourVisibility\(tour, confirm, apply\)/);
    assert.match(source, /void toggleTour\(tour, field\)/);
    assert.match(source, /void toggleTour\(menuTour, 'active'\)/);
    assert.match(source, /await toggleTour\(editingTour, 'active'\) === 'failed'/);
    const remove = source.slice(source.indexOf('const remove ='), source.indexOf('const addCategory ='));
    assert.match(remove, /if \(tour\.active\) await toggleTour\(tour, 'active'\)/);
  });
  test('Menú: se abre debajo o encima y permanece dentro de la ventana en la última fila', () => {
    const size = { width: 210, height: 220 };
    const viewport = { width: 1440, height: 800 };
    assert.equal(actions.tourMenuPosition({ top: 100, bottom: 126, right: 1300 }, size, viewport).top, 131);
    const cases = [
      [{ top: 744, bottom: 770, right: 1400 }, size, viewport],
      [{ top: 744, bottom: 770, right: 2000 }, size, viewport],
      [{ top: 100, bottom: 126, right: 8 }, size, viewport],
      [{ top: 200, bottom: 226, right: 350 }, { width: 210, height: 300 }, { width: 360, height: 220 }],
    ];
    for (const [anchor, menu, screen] of cases) {
      const result = actions.tourMenuPosition(anchor, menu, screen);
      assert.ok(result.top >= 12);
      assert.ok(result.left >= 12);
      assert.ok(result.top + Math.min(menu.height, screen.height - 24) <= screen.height - 12);
      assert.ok(result.left + Math.min(menu.width, screen.width - 24) <= screen.width - 12);
    }
    assert.ok(actions.tourMenuPosition(cases[0][0], size, viewport).top < cases[0][0].top);
  });
  test('Menú: navegación de flechas, Inicio/Fin y foco circular', () => {
    assert.equal(actions.tourMenuFocusIndex('ArrowDown', 4, 5), 0);
    assert.equal(actions.tourMenuFocusIndex('ArrowUp', 0, 5), 4);
    assert.equal(actions.tourMenuFocusIndex('Home', 3, 5), 0);
    assert.equal(actions.tourMenuFocusIndex('End', 0, 5), 4);
    assert.equal(actions.tourMenuFocusIndex('Tab', 0, 5), null);
    assert.equal(actions.tourMenuFocusIndex('ArrowDown', 0, 0), null);
  });

  const { normalizeMoney, moneyNumber, adminTourMoney } = load(path.join(__dirname, 'money.ts'));
  const { usd, bob } = load(path.join(__dirname, 'format.ts'));
  const { dashboardMoney } = load(path.join(root, 'lib/admin-dashboard.ts'));
  test('Dinero: -0 y negativos que redondean a cero se muestran como 0 en USD/BOB', () => {
    for (const value of [-0, -.0001, -.0049]) {
      assert.equal(Object.is(normalizeMoney(value), -0), false);
      assert.equal(usd(value), usd(0));
      assert.equal(bob(value), bob(0));
    }
    assert.equal(dashboardMoney(-.01), dashboardMoney(0));
    assert.equal(adminTourMoney(-0), 'Consultar');
    assert.equal(adminTourMoney(-.001), '0');
  });
  test('Dinero: los importes negativos reales y su precisión se conservan', () => {
    assert.equal(usd(-12.5), 'US$ -12,50');
    assert.equal(bob(-.01), 'Bs. -0,01');
    assert.equal(dashboardMoney(-1), 'US$ -1');
    assert.equal(adminTourMoney(1234.5), new Intl.NumberFormat('es-BO', { maximumFractionDigits: 2 }).format(1234.5));
    const source = fs.readFileSync(path.join(root, 'components/admin/ReportsTab.tsx'), 'utf8');
    const parsed = ts.createSourceFile('ReportsTab.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const fn = parsed.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'usd');
    const reportUsd = vm.runInNewContext(ts.transpileModule(fn.getText(parsed), {}).outputText + '\nusd;', { moneyNumber });
    assert.equal(reportUsd(-0), 'US$ 0.00');
    assert.equal(reportUsd(-12.5), 'US$ -12.50');
  });

  const booking = {
    id: 'local', code: 'HT-LOCAL', pax: 1, adults: 1, children: 0, tour_type: 'group',
    subtotal: 100, total: 100, offer_discount: 0, group_discount: 0, coupon_discount: 0,
    coupon_code: null, payment_method: 'efectivo', source: 'oficina', status: 'confirmada',
    client_name: 'Prueba local', client_phone: '', client_country: 'Bolivia', client_email: '',
    created_at: '2026-11-12T12:00:00Z', paid_at: '2026-11-12T12:00:00Z',
    voucher_sent_at: null, checked_in_at: null, cancelled_at: null, completed_at: null,
    refund_pending: false, passengers: [], extras: [],
    tour: { title: 'Prueba local', summary: [], included: [] },
    date_row: { date: '2026-11-14', start_time: '08:00:00' },
  };
  const detail = data => renderData('ReservationDetail', [[]], { booking: data, onClose() {}, onSaved: async () => {} });
  test('Detalle sin descuento de cupón: fila ausente y ningún importe -0,00', () => {
    for (const coupon_code of [null, 'CERO']) {
      const html = detail({ ...booking, coupon_code });
      assert.ok(!html.includes('Cupón'));
      assert.ok(!html.includes('-0,00'));
    }
  });
  test('Detalle con cupón: conserva código y descuento negativo', () => {
    const html = detail({ ...booking, coupon_discount: 10, coupon_code: 'WELCOME10', total: 90 });
    assert.ok(html.includes('Cupón WELCOME10'));
    assert.ok(html.includes('US$ -10,00'));
  });

  // Ejecuta el código del voucher con dependencias de dibujo y settings locales.
  // Se inspeccionan las filas, sin descargar PDF ni acceder a la base.
  const tables = [];
  class Pdf {
    setTextColor() {}
    setFontSize() {}
    text() {}
    addPage() {}
    addImage() {}
    link() {}
    save() {}
    splitTextToSize(text) { return [text]; }
  }
  const mocks = {
    jspdf: { jsPDF: Pdf },
    'jspdf-autotable': (doc, options) => {
      tables.push(options.body ?? []);
      doc.lastAutoTable = { finalY: 60 };
    },
    qrcode: { toDataURL: async () => 'imagen-local' },
    '@/lib/pricing': { EXCHANGE_RATE_BOB: 6.9 },
    './format': load(path.join(__dirname, 'format.ts')),
    './core': { setting: async () => null },
  };
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, 'exports.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(source, {
    module, exports: module.exports,
    window: { location: { origin: 'https://example.invalid' } },
    require: id => {
      if (!(id in mocks)) throw new Error('Dependencia no autorizada en esta prueba: ' + id);
      return mocks[id];
    },
  });
  await module.exports.openVoucher(booking);
  test('Voucher sin cupón: no exporta la fila ni ceros negativos', () => {
    const rows = tables.flat();
    assert.ok(!rows.some(row => String(row[0]).startsWith('Cupón')));
    assert.ok(!rows.some(row => String(row[1]).includes('-0,00')));
  });
  tables.length = 0;
  await module.exports.openVoucher({ ...booking, coupon_code: 'WELCOME10', coupon_discount: 10, total: 90 });
  test('Voucher con cupón: mantiene el descuento y su código', () => {
    const row = tables.flat().find(row => String(row[0]).startsWith('Cupón'));
    assert.equal(row[0], 'Cupón WELCOME10');
    assert.equal(row[1], 'US$ -10,00');
  });
};

if (require.main === module) require('./checks.cjs');
