// CC-HT8E: contrato SQL y contacto del reservante; sin red, SQL ni credenciales.
module.exports = async function ({ test, load, lexicalSql, workspace, root, sbStub, renderData }) {
  const assert = require('node:assert/strict');
  const fs = require('fs');
  const path = require('path');
  const vm = require('vm');
  const ts = require('typescript');
  const read = file => fs.readFileSync(path.join(workspace, file), 'utf8').replace(/\r\n/g, '\n');
  const sql = read('supabase/migrations/0016_contacto_reserva.sql');
  const previous = read('supabase/migrations/0015_reserva_ninos.sql');
  const definition = source => {
    const match = source.match(/create or replace function public\.create_booking\(([\s\S]*?)\)([\s\S]*?)\$\$([\s\S]*?)\$\$;/i);
    assert.ok(match, 'Definición de create_booking');
    return { args: match[1].split(',').map(arg => arg.trim()), attributes: match[2], body: match[3] };
  };
  const booking = definition(sql), oldBooking = definition(previous);
  const oldSignature = 'uuid,date,text,integer,jsonb,jsonb,text,text,uuid,uuid,integer';
  const newSignature = oldSignature + ',text,text';

  test('0016: transacción cerrada, recarga del esquema y solo redefine create_booking', () => {
    assert.ok(!sql.includes('\ufeff') && !sql.includes('\ufffd'));
    assert.match(sql, /\bbegin;/i);
    assert.match(sql, /notify pgrst, 'reload schema';\s*commit;\s*$/i);
    assert.equal(lexicalSql(sql), 2);
    assert.equal((sql.match(/create or replace function/gi) || []).length, 1);
    assert.doesNotMatch(sql, /\bcascade\b|\bdelete\s+from\b|\b(?:create|drop)\s+policy\b|\b(?:enable|disable)\s+row level security\b/i);
  });
  test('0016: 13 parámetros, los once anteriores intactos y contacto opcional', () => {
    assert.equal(booking.args.length, 13);
    assert.deepEqual(booking.args.slice(0, 11), oldBooking.args);
    assert.deepEqual(booking.args.slice(11), ['p_contact_name text default null', 'p_contact_phone text default null']);
    assert.equal(booking.attributes, oldBooking.attributes);
    assert.match(booking.attributes, /security definer set search_path = public/i);
    assert.ok(sql.includes('drop function if exists public.create_booking(' + oldSignature + ');'));
    assert.equal((sql.match(/drop function/gi) || []).length, 1);
  });
  test('0016: toda la secuencia y su repetición dejan una única firma de 13 argumentos', () => {
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
    const files = fs.readdirSync(path.join(workspace, 'supabase/migrations'))
      .filter(file => /^\d{4}_.*\.sql$/.test(file) && Number(file.slice(0, 4)) <= 16).sort();
    for (const file of files) apply(read('supabase/migrations/' + file));
    apply(sql);
    assert.deepEqual([...signatures], [newSignature]);
  });
  test('0016: revoke a public/anon y execute a authenticated solo sobre la firma nueva', () => {
    assert.ok(sql.includes('revoke all on function public.create_booking(' + newSignature + ') from public, anon;'));
    assert.ok(sql.includes('grant execute on function public.create_booking(' + newSignature + ') to authenticated;'));
    assert.equal((sql.match(/(?:revoke all|grant execute) on function/gi) || []).length, 2);
  });

  // Separa los valores reales del INSERT, incluidos SELECT y NULLIF anidados.
  function expressions(source) {
    const result = []; let start = 0, depth = 0, quote = false;
    for (let i = 0; i < source.length; i++) {
      const char = source[i];
      if (char === "'") { if (quote && source[i + 1] === "'") i++; else quote = !quote; continue; }
      if (quote) continue;
      if (char === '(') depth++;
      if (char === ')') depth--;
      if (char === ',' && depth === 0) { result.push(source.slice(start, i).trim()); start = i + 1; }
    }
    result.push(source.slice(start).trim());
    return result;
  }
  const insert = body => {
    const match = body.match(/insert into public\.reservations\(([\s\S]*?)\)\s*values\(([\s\S]*?)\)\s*on conflict/i);
    assert.ok(match);
    const columns = match[1].split(',').map(column => column.trim()), values = expressions(match[2]);
    assert.equal(columns.length, values.length);
    return { source: match[0], fields: Object.fromEntries(columns.map((column, i) => [column, values[i]])) };
  };
  const inserted = insert(booking.body), oldInserted = insert(oldBooking.body);
  const contactValidation = booking.body.match(/  if char_length\([\s\S]*?raise exception 'invalid_contact[^']*';\n  end if;\n/);
  test('0016: conserva exactamente el cuerpo de 0015 salvo validación y columnas del INSERT', () => {
    assert.ok(contactValidation);
    assert.equal(booking.body.replace(contactValidation[0], '').replace(inserted.source, oldInserted.source), oldBooking.body);
    for (const [column, value] of Object.entries(oldInserted.fields)) assert.equal(inserted.fields[column], value, column);
  });
  test('0016: guarda nombre explícito o pasajero 1, teléfono limpio, email autenticado y país', () => {
    assert.equal(inserted.fields.contact_name, "coalesce(nullif(btrim(p_contact_name),''),nullif(btrim(p_passengers->0->>'name'),''))");
    assert.equal(inserted.fields.contact_phone, "nullif(btrim(p_contact_phone),'')");
    assert.equal(inserted.fields.contact_email, '(select u.email from auth.users u where u.id=auth.uid())');
    assert.equal(inserted.fields.contact_country, "nullif(btrim(p_passengers->0->>'country'),'')");
    assert.equal(Object.keys(inserted.fields).length, Object.keys(oldInserted.fields).length + 4);
  });
  test('0016: limita nombre efectivo a 120 y teléfono a 40 antes de bloquear cupos', () => {
    assert.ok(contactValidation);
    assert.ok(contactValidation[0].includes('char_length(' + inserted.fields.contact_name + ') > 120'));
    assert.match(contactValidation[0], /char_length\(btrim\(p_contact_phone\)\) > 40/);
    assert.ok(booking.body.indexOf(contactValidation[0]) < booking.body.indexOf('select * into v_tour'));
  });

  const fillMatch = sql.match(/execute format\(\$fill\$([\s\S]*?)\$fill\$,v_phone_sql\);/);
  assert.ok(fillMatch);
  const fill = fillMatch[1];
  test('0016: backfill solo web con usuario, no pisa contactos y evita actualizaciones vacías', () => {
    assert.match(fill, /where r\.source='web' and r\.user_id is not null/);
    for (const field of ['name', 'phone', 'email', 'country']) {
      assert.ok(fill.includes('r.contact_' + field + ' is null'));
      assert.ok(fill.includes('coalesce(r.contact_' + field + ','));
    }
    assert.match(fill, /is distinct from \(c\.contact_name,c\.contact_phone,c\.contact_email,c\.contact_country\)/);
    assert.match(fill, /order by bp\.is_lead desc,bp\.position,bp\.id limit 1/);
    assert.match(fill, /left join auth\.users u on u\.id=r\.user_id/);
    assert.equal((fill.match(/\bupdate public\./g) || []).length, 1);
  });
  test('0016: profiles.phone se consulta solo si existe; el resto funciona sin la columna', () => {
    assert.match(sql, /v_phone_sql text := 'null::text'/);
    assert.match(sql, /information_schema\.columns[\s\S]*table_schema='public' and table_name='profiles' and column_name='phone'/);
    assert.match(sql, /then\s*v_phone_sql := \$phone\$nullif\(btrim\(p\.phone\),''\)\$phone\$;/);
    assert.doesNotMatch(fill, /p\.phone/);
    assert.match(fill, /coalesce\(r\.contact_phone,%s\)/);
  });
  test('0016: backfill bloqueado restaura el modo de la guarda y conserva las demás protecciones', () => {
    assert.ok(sql.indexOf('lock table public.reservations in share row exclusive mode;') < sql.indexOf('disable trigger reservations_fields_guard'));
    assert.ok(sql.indexOf('disable trigger reservations_fields_guard') < sql.indexOf('execute format('));
    assert.match(sql, /select t\.tgenabled into v_guard_mode/);
    assert.match(sql, /if v_guard_mode in \('O','R','A'\)/);
    for (const [mode, command] of [['O', 'enable'], ['R', 'enable replica'], ['A', 'enable always']]) {
      assert.ok(sql.includes("v_guard_mode='" + mode + "' then\n    alter table public.reservations " + command + ' trigger reservations_fields_guard;'));
    }
    assert.doesNotMatch(sql, /disable trigger (?:all|user|reservations_(?:audit|capacity_guard|status_guard|offer_seats))\b|session_replication_role/i);
    assert.doesNotMatch(sql, /create or replace function public\.guard_/i);
  });

  const fixture = {
    id: 'local-contact', code: 'HT-LOCAL', user_id: 'user-local', source: 'web',
    contact_name: 'Reservante web', contact_phone: '+59170000001', contact_email: 'reservante@example.invalid', contact_country: 'Bolivia',
    profile: { full_name: 'Nombre del perfil antiguo', phone: '999999999' },
    passengers: [
      { id: 'second', position: 2, is_lead: false, name: 'Segundo pasajero', country: 'Perú', doc: '', meal: 'Normal' },
      { id: 'lead', position: 1, is_lead: true, name: 'Pasajero titular', country: 'Chile', doc: '', meal: 'Normal' },
    ],
    pax: 2, adults: 1, children: 1, tour_type: 'group', status: 'confirmada', payment_method: 'link',
    subtotal: 100, total: 100, group_discount: 0, coupon_discount: 0, offer_discount: 0, coupon_code: null,
    created_at: '2026-11-13T12:00:00Z', paid_at: '2026-11-13T12:00:00Z',
    checked_in_at: null, voucher_sent_at: null, cancelled_at: null, completed_at: null, refund_pending: false,
    extras: [], tour: { title: 'Tour local', summary: [], included: [] }, date_row: { date: '2026-11-20', start_time: '08:00:00' },
  };
  const repository = load(path.join(root, 'lib/admin/bookings.ts'));
  const oldFrom = sbStub.from;
  let records = [fixture], queries = [], normalized;
  sbStub.from = table => {
    assert.ok(['reservations', 'v_user_emails'].includes(table), 'Solo consultas simuladas autorizadas');
    queries.push(table);
    let from = 0, to = Infinity;
    const result = () => ({ error: null, data: (table === 'reservations' ? records : [{ id: 'user-local', email: 'cuenta@example.invalid' }]).slice(from, to + 1) });
    const query = {
      then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject); },
      maybeSingle() { const response = result(); return Promise.resolve({ ...response, data: response.data[0] ?? null }); },
    };
    for (const method of ['select', 'order', 'eq', 'in']) query[method] = () => query;
    query.range = (a, b) => { from = a; to = b; return query; };
    return query;
  };
  try {
    [normalized] = await repository.bookings();
    test('Contacto admin: columnas de la reserva prevalecen sin depender de v_user_emails', () => {
      for (const field of ['name', 'phone', 'email', 'country']) assert.equal(normalized['client_' + field], fixture['contact_' + field]);
      assert.deepEqual(normalized.passengers.map(passenger => passenger.id), ['lead', 'second']);
      assert.ok(!queries.includes('v_user_emails'));
    });
    const ticket = await repository.ticketByCode(fixture.code);
    test('Ticket: aplica la misma prioridad del contacto almacenado', () => {
      for (const field of ['name', 'phone', 'email', 'country']) assert.equal(ticket['client_' + field], fixture['contact_' + field]);
    });
    records = [{ ...fixture, contact_name: null, contact_phone: null, contact_email: null, contact_country: null }];
    const [historical] = await repository.bookings();
    test('Contacto histórico: titular ordenado y datos de cuenta solo cuando faltan columnas', () => {
      assert.equal(historical.client_name, 'Pasajero titular');
      assert.equal(historical.client_country, 'Chile');
      assert.equal(historical.client_phone, fixture.profile.phone);
      assert.equal(historical.client_email, 'cuenta@example.invalid');
    });
  } finally { sbStub.from = oldFrom; }

  test('Detalle y listado web muestran nombre, email, teléfono y país del reservante', () => {
    for (const [component, data, props] of [
      ['ReservationDetail', [[]], { booking: normalized, onClose() {}, onSaved: async () => {} }],
      ['ReservasTab', [[normalized]], {}],
    ]) {
      const html = renderData(component, data, props);
      for (const field of ['name', 'phone', 'email', 'country']) assert.ok(html.includes(fixture['contact_' + field]), component + ': ' + field);
      assert.ok(!html.includes(fixture.profile.full_name));
    }
  });

  const tables = [];
  class Pdf {
    setTextColor() {} setFontSize() {} text() {} addPage() {} addImage() {} link() {} save() {}
    splitTextToSize(text) { return [text]; }
  }
  const format = load(path.join(root, 'lib/admin/format.ts'));
  const mocks = {
    jspdf: { jsPDF: Pdf }, 'jspdf-autotable': (doc, options) => { tables.push(options); doc.lastAutoTable = { finalY: 60 }; },
    qrcode: { toDataURL: async () => 'imagen-local' }, '@/lib/pricing': { EXCHANGE_RATE_BOB: 6.9 },
    './format': format, './core': { setting: async () => null },
  };
  const transpile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const voucher = { exports: {} };
  vm.runInNewContext(transpile(read('src/lib/admin/exports.ts')), {
    module: voucher, exports: voucher.exports, window: { location: { origin: 'https://example.invalid' } },
    require: id => { assert.ok(id in mocks); return mocks[id]; },
  });
  await voucher.exports.openVoucher(normalized);
  test('Voucher incluye los cuatro datos del contacto de la reserva web', () => {
    for (const [label, field] of [['Viajero', 'name'], ['Email', 'email'], ['Teléfono', 'phone'], ['País', 'country']]) {
      assert.equal(tables[0].body.find(row => row[0] === label)?.[1], fixture['contact_' + field]);
    }
  });

  // Ejecuta las filas usadas por ambas exportaciones del listado, sin dibujar PDF.
  const parsed = ts.createSourceFile('ReservasTab.tsx', read('src/components/admin/ReservasTab.tsx'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations = [];
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'exportRows') {
      for (const statement of node.body.statements) if (ts.isTryStatement(statement)) {
        for (const declaration of statement.tryBlock.statements) {
          if (ts.isVariableStatement(declaration) && declaration.declarationList.declarations.some(value => ['head', 'rows', 'totals'].includes(value.name.getText(parsed)))) declarations.push(declaration.getText(parsed));
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  assert.equal(declarations.length, 3);
  const exported = vm.runInNewContext(transpile(declarations.join('\n')) + '\n({ head, rows });', {
    filtered: [normalized], statusLabels: format.statusLabels, methodLabels: format.methodLabels, sourceLabels: format.sourceLabels,
  });
  test('Exportaciones CSV/PDF conservan los cuatro datos del reservante y columnas alineadas', () => {
    assert.equal(exported.rows[0].length, exported.head.length);
    for (const [label, field] of [['Viajero', 'name'], ['Email', 'email'], ['Teléfono', 'phone'], ['País', 'country']]) {
      assert.equal(exported.rows[0][exported.head.indexOf(label)], fixture['contact_' + field]);
    }
  });
};

if (require.main === module) require('./checks.cjs');
