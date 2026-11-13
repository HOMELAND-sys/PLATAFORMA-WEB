// CC-HT8D: contratos estáticos y exportaciones locales, sin ejecutar SQL.
module.exports = async function ({ test, load, lexicalSql, workspace, root, renderData }) {
  const assert = require('node:assert/strict');
  const fs = require('fs');
  const path = require('path');
  const vm = require('vm');
  const ts = require('typescript');
  const read = file => fs.readFileSync(path.join(workspace, file), 'utf8').replace(/\r\n/g, '\n');
  const sql = read('supabase/migrations/0015_reserva_ninos.sql');
  const migrationDir = path.join(workspace, 'supabase/migrations');
  const previousFiles = fs.readdirSync(migrationDir)
    .filter(file => /^00(?:0[1-9]|1[0-4])_.*\.sql$/.test(file))
    .sort();

  function definition(source, name) {
    const match = source.match(new RegExp(
      'create or replace function public\\.' + name + '\\(([\\s\\S]*?)\\)([\\s\\S]*?)\\$\\$([\\s\\S]*?)\\$\\$;', 'i',
    ));
    return match && { source: match[0], args: match[1], attributes: match[2], body: match[3] };
  }

  function previous(name) {
    let latest;
    for (const file of previousFiles) {
      const source = read('supabase/migrations/' + file);
      const fn = definition(source, name);
      if (fn) latest = { ...fn, file, migration: source };
    }
    assert.ok(latest, 'Definición anterior de ' + name);
    return latest;
  }

  const oldBooking = previous('create_booking');
  const booking = definition(sql, 'create_booking');
  const report = definition(sql, 'admin_report_bookings');
  assert.ok(booking);
  assert.ok(report);

  test('0015: transacción, cuerpos cerrados, recarga del esquema y sin cambios históricos', () => {
    assert.ok(!sql.includes('\ufeff'));
    assert.ok(!sql.includes('\ufffd'));
    assert.match(sql, /\bbegin;/i);
    assert.match(sql, /notify pgrst, 'reload schema';\s*commit;\s*$/i);
    assert.equal(lexicalSql(sql), 2);
    assert.equal((sql.match(/create or replace function/gi) || []).length, 2);
    assert.doesNotMatch(sql, /\bcascade\b|\bupdate\s+public\.reservations\b/i);
  });

  const args = booking.args.split(',').map(arg => arg.trim());
  const oldArgs = oldBooking.args.split(',').map(arg => arg.trim());
  test('0015: 11 parámetros; los diez anteriores conservan nombres, tipos y valores por defecto', () => {
    assert.equal(oldBooking.file, '0011_producto_completo.sql');
    assert.equal(oldArgs.length, 10);
    assert.equal(args.length, 11);
    assert.deepEqual(args.slice(0, 10), oldArgs);
    assert.equal(args[10], 'p_children int default 0');
    assert.equal(booking.attributes, oldBooking.attributes);
    assert.match(booking.attributes, /returns jsonb language plpgsql security definer set search_path = public as/i);
  });

  const oldSignature = 'uuid,date,text,integer,jsonb,jsonb,text,text,uuid,uuid';
  const newSignature = oldSignature + ',integer';
  test('0015: elimina solo la firma de diez argumentos antes de crear la nueva; es repetible', () => {
    const drop = 'drop function if exists public.create_booking(' + oldSignature + ');';
    assert.ok(sql.indexOf(drop) >= 0);
    assert.ok(sql.indexOf(drop) < sql.indexOf(booking.source));
    assert.equal((sql.match(/drop function/gi) || []).length, 1);
    // Reproduce únicamente el inventario de firmas de los DDL; no ejecuta SQL.
    const signatures = new Set();
    const apply = source => {
      for (const match of source.matchAll(/\b(drop function if exists|create or replace function) public\.create_booking\(([\s\S]*?)\)/gi)) {
        const types = match[2].split(',').map(arg => {
          const words = arg.trim().split(/\s+/);
          return (words[0].startsWith('p_') ? words[1] : words[0]).replace(/^int$/, 'integer');
        }).join(',');
        if (match[1].toLowerCase().startsWith('drop')) signatures.delete(types);
        else signatures.add(types);
      }
    };
    for (const file of previousFiles) apply(read('supabase/migrations/' + file));
    apply(sql);
    apply(sql);
    assert.deepEqual([...signatures], [newSignature]);
  });

  test('0015: conserva la revocación a public/anon y el permiso de authenticated en la firma nueva', () => {
    const oldPermissions = oldBooking.migration.split('\n')
      .filter(line => /^(revoke all|grant execute) on function public\.create_booking\(/i.test(line));
    assert.equal(oldPermissions.length, 2);
    for (const permission of oldPermissions) {
      assert.ok(sql.includes(permission.replace(oldSignature, newSignature)));
    }
    assert.equal((sql.match(/(?:revoke all|grant execute) on function public\.create_booking\(/gi) || []).length, 2);
  });

  const validation = /  if p_children is null or p_children < 0 or p_children > p_pax - 1 then raise exception 'invalid_passengers[^']*'; end if;\n/;
  test('0015: valida nulos, negativos y al menos un adulto antes de elegir cupo o insertar', () => {
    assert.match(booking.body, validation);
    const position = booking.body.search(validation);
    assert.ok(position > booking.body.indexOf("raise exception 'invalid_pax'"));
    assert.ok(position < booking.body.indexOf('select * into v_tour'));
    assert.ok(position < booking.body.indexOf('insert into public.reservations'));
  });

  test('0015: guarda el total en pax y el reparto en adults/children, con columnas alineadas', () => {
    const insert = booking.body.match(/insert into public\.reservations\(([\s\S]*?)\)\s*values\(([\s\S]*?)\)\s*on conflict/i);
    assert.ok(insert);
    const columns = insert[1].split(',').map(value => value.trim());
    const values = insert[2].split(',').map(value => value.trim());
    assert.equal(columns.length, values.length);
    const fields = Object.fromEntries(columns.map((column, i) => [column, values[i]]));
    assert.equal(fields.pax, 'p_pax');
    assert.equal(fields.adults, 'p_pax - p_children');
    assert.equal(fields.children, 'p_children');
  });

  test('0015: todo el resto del cuerpo es idéntico a 0011, incluidos precios, cupos, descuentos y comentarios', () => {
    const restored = booking.body.replace(validation, '')
      .replace('payment_method,adults,children,special_offer_id', 'payment_method,adults,special_offer_id')
      .replace('p_payment_method,p_pax - p_children,p_children,p_offer_id', 'p_payment_method,p_pax,p_offer_id');
    assert.equal(restored, oldBooking.body);
  });

  test('Reserva manual: ya persiste adultos y niños por separado y 0015 no la redefine', () => {
    const manual = previous('admin_create_manual_booking');
    assert.match(manual.args, /p_adults int, p_children int/);
    assert.match(manual.body, /v_pax int := p_adults\+p_children/);
    assert.match(manual.body, /pax,adults,children/);
    assert.match(manual.body, /v_pax,p_adults,p_children/);
    assert.equal(definition(sql, 'admin_create_manual_booking'), null);
  });

  test('Reporte: añade las columnas almacenadas conservando firma, permisos, filtros y totales anteriores', () => {
    const oldReport = previous('admin_report_bookings');
    assert.equal(report.args, oldReport.args);
    assert.equal(report.attributes, oldReport.attributes);
    assert.equal(
      report.body.replace("        'adults', s.adults,\n        'children', s.children,\n", ''),
      oldReport.body,
    );
    assert.match(report.body, /'adults', s\.adults,\s*'children', s\.children/);
    assert.doesNotMatch(sql, /(?:drop|grant|revoke)\s+[^;]*public\.admin_report_bookings/i);
  });

  const fixture = {
    id: 'local', code: 'HT-LOCAL', pax: 3, adults: 2, children: 1, tour_type: 'group',
    subtotal: 150, total: 150, offer_discount: 0, group_discount: 0, coupon_discount: 0,
    coupon_code: null, payment_method: 'link', source: 'web', status: 'confirmada',
    client_name: 'Prueba local', client_phone: '', client_country: 'Bolivia', client_email: '',
    created_at: '2026-11-12T12:00:00Z', paid_at: '2026-11-12T12:00:00Z',
    voucher_sent_at: null, checked_in_at: null, cancelled_at: null, completed_at: null,
    refund_pending: false, passengers: [], extras: [],
    tour: { title: 'Prueba local', summary: [], included: [] },
    date_row: { date: '2026-11-14', start_time: '08:00:00' },
  };
  test('Detalle: 2 adultos y 1 niño desde sus columnas, sin confundir el total con adultos', () => {
    const html = renderData('ReservationDetail', [[]], {
      booking: fixture, onClose() {}, onSaved: async () => {},
    });
    assert.match(html, /2 adultos · 1 niño/);
    assert.doesNotMatch(html, /3 adultos/);
  });

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
  const captureTable = (doc, options) => {
    tables.push(options);
    doc.lastAutoTable = { finalY: 60 };
  };
  const format = load(path.join(__dirname, 'format.ts'));
  const mocks = {
    jspdf: { jsPDF: Pdf },
    'jspdf-autotable': captureTable,
    qrcode: { toDataURL: async () => 'imagen-local' },
    '@/lib/pricing': { EXCHANGE_RATE_BOB: 6.9 },
    './format': format,
    './core': { setting: async () => null },
  };
  const voucherModule = { exports: {} };
  const transpile = source => ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(transpile(read('src/lib/admin/exports.ts')), {
    module: voucherModule, exports: voucherModule.exports,
    window: { location: { origin: 'https://example.invalid' } },
    require: id => {
      assert.ok(id in mocks, 'Dependencia local autorizada: ' + id);
      return mocks[id];
    },
  });
  await voucherModule.exports.openVoucher(fixture);
  test('Voucher: exporta el total y las dos columnas de participantes por separado', () => {
    const body = tables[0].body;
    for (const [label, value] of [['Participantes', '3'], ['Adultos', '2'], ['Niños', '1']]) {
      assert.equal(body.find(row => row[0] === label)?.[1], value);
    }
  });

  // Ejecuta los constructores de filas reales; las dependencias de dibujo son locales.
  const reportSource = read('src/components/admin/ReportsTab.tsx');
  const parsed = ts.createSourceFile('ReportsTab.tsx', reportSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const functions = parsed.statements.filter(node =>
    ts.isFunctionDeclaration(node) && ['bookingPartyTotals', 'buildBookingsPdf'].includes(node.name?.text),
  ).map(node => node.getText(parsed)).join('\n');
  const reportFunctions = vm.runInNewContext(
    transpile(functions) + '\n({ bookingPartyTotals, buildBookingsPdf });',
    {
      jsPDF: Pdf, autoTable: captureTable, drawPageChrome: () => 32, stampFooter() {},
      fmtDay: value => value, fmtDateTime: value => value, usd: format.usd,
      STATUS_LABELS: {}, TOUR_TYPE_LABELS: {}, GREEN_DARK: [13, 31, 22],
    },
  );
  const reportData = {
    from: '2026-11-01', to: '2026-11-30', status: null,
    rows: [
      { ...fixture, tour_title: 'Prueba local', tour_date: '2026-11-14' },
      { ...fixture, pax: 2, adults: null, children: 0 },
      { ...fixture, status: 'cancelada', pax: 6, adults: 4, children: 2 },
    ],
    totals: { reservations: 3, pax: 5, grand_total: 300, revenue: 300 },
  };
  test('Reportes: suman adultos/niños activos y conservan la compatibilidad de adultos nulos', () => {
    const totals = reportFunctions.bookingPartyTotals(reportData.rows);
    assert.equal(totals.adults, 4);
    assert.equal(totals.children, 1);
  });

  tables.length = 0;
  reportFunctions.buildBookingsPdf(reportData, null);
  test('Reporte PDF: desglose y totales alineados con las columnas de la reserva', () => {
    const table = tables[0];
    const head = table.head[0];
    assert.equal(table.body[0][head.indexOf('Adultos')], 2);
    assert.equal(table.body[0][head.indexOf('Niños')], 1);
    assert.equal(table.foot[0][head.indexOf('Adultos')], 4);
    assert.equal(table.foot[0][head.indexOf('Niños')], 1);
    for (const row of [...table.body, ...table.foot]) assert.equal(row.length, head.length);
  });

  let csvRows;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(parsed) === 'rows' &&
      node.initializer?.getText(parsed).includes("'Reporte de Reservas'")) {
      csvRows = node.initializer.getText(parsed);
    }
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  assert.ok(csvRows);
  const reportCsv = vm.runInNewContext(transpile('const rows = ' + csvRows + ';\nrows;'), {
    data: reportData, participants: reportFunctions.bookingPartyTotals(reportData.rows),
    from: reportData.from, to: reportData.to, status: '',
    fmtDateTime: value => value, usd: format.usd, STATUS_LABELS: {}, TOUR_TYPE_LABELS: {},
  });
  test('Reporte CSV: conserva adultos/niños y el mismo número de celdas en cabecera, filas y totales', () => {
    const head = reportCsv[2];
    assert.equal(reportCsv[3][head.indexOf('Adultos')], 2);
    assert.equal(reportCsv[3][head.indexOf('Niños')], 1);
    for (const row of reportCsv.slice(3)) assert.equal(row.length, head.length);
    assert.equal(reportCsv.at(-1)[head.indexOf('Adultos')], 4);
    assert.equal(reportCsv.at(-1)[head.indexOf('Niños')], 1);
  });

  const listSource = read('src/components/admin/ReservasTab.tsx');
  const listParsed = ts.createSourceFile('ReservasTab.tsx', listSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations = [];
  function listVisit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'exportRows') {
      for (const statement of node.body.statements) {
        if (!ts.isTryStatement(statement)) continue;
        for (const declaration of statement.tryBlock.statements) {
          if (ts.isVariableStatement(declaration) &&
            declaration.declarationList.declarations.some(value => ['head', 'rows', 'totals'].includes(value.name.getText(listParsed)))) {
            declarations.push(declaration.getText(listParsed));
          }
        }
      }
    }
    ts.forEachChild(node, listVisit);
  }
  listVisit(listParsed);
  assert.equal(declarations.length, 3);
  const listExport = vm.runInNewContext(
    transpile(declarations.join('\n')) + '\n({ head, rows, totals });',
    { filtered: reportData.rows, statusLabels: {}, methodLabels: {}, sourceLabels: {} },
  );
  test('Exportación del listado CSV/PDF: columnas y totales de adultos/niños desde las reservas', () => {
    const { head, rows, totals } = listExport;
    assert.equal(rows[0][head.indexOf('Adultos')], 2);
    assert.equal(rows[0][head.indexOf('Niños')], 1);
    assert.equal(totals[head.indexOf('Adultos')], 4);
    assert.equal(totals[head.indexOf('Niños')], 1);
    for (const row of [...rows, totals]) assert.equal(row.length, head.length);
  });
};

if (require.main === module) require('./checks.cjs');
