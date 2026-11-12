# Back-office CC-HT7A

Las migraciones `0011_producto_completo.sql`, `0012_compatibilidad_operativa.sql` y `0013_catalogo_real.sql` se revisan y aplican en ese orden. No se modificaron 0001–0010 ni se ejecutó SQL durante este trabajo.

## Contrato para el sitio público

- `v_tour_dates_free` mantiene `id`, `tour_id`, `date`, `capacity`, `occupied` y `free`, y añade `start_time`, `blocked`, `cutoff_hours` efectivo, `bookable` y `booked`. Las salidas sin hora usan medianoche de Bolivia para el límite.
- `create_booking` conserva los ocho argumentos originales y admite `p_tour_date_id uuid default null` y `p_offer_id uuid default null`. Solo queda una firma, de diez argumentos. La llamada actual de ocho argumentos elige la primera franja reservable con cupo suficiente, bajo bloqueo. Un consumidor que permita elegir hora puede enviar la franja exacta. Se solicita recargar la caché de PostgREST al aplicar la migración.
- Enviar `p_offer_id` aplica la oferta en servidor, después del descuento de grupo y antes del cupón. La reserva guarda `special_offer_id` y `offer_discount`. Sin ese argumento conserva la fórmula anterior.
- `seats_sold` cuenta plazas comprometidas de reservas pendientes, confirmadas y completadas; una cancelación libera sus plazas. La contabilidad es transaccional. El frontend debe tomar el precio definitivo de la respuesta de la RPC.
- La vista de cupos agrega todas las reservas mediante su propietario, intencionadamente: un agregado con RLS del cliente sobreestimaría los cupos. Solo publica el resumen de plazas; no publica contactos, notas ni pasajeros.

## Operación

Las reservas, incluidas las manuales, conservan importes en USD para mantener el dashboard. La equivalencia a Bs. usa `EXCHANGE_RATE_BOB` existente y se identifica como referencia. Los pases y endosos se registran por defecto en BOB; sus saldos se separan por moneda y dirección de la deuda. Una reserva manual mantiene el límite existente de 1–8 pasajeros.

Configuración guarda `settings.company` (name, phones, whatsapp, email, address, facebook, instagram, tiktok, website, license) y `settings.policies` (free_cancellation_hours, default_cutoff_hours, policy_text). Las políticas por defecto se aplican a productos nuevos. Pago conserva las claves anteriores y los cupones siguen en `coupons`.

El voucher del admin se descarga como PDF e incluye el QR que usa `/confirmation?code=HT-XXXXX`. Para reenviarlo se adjunta el PDF por WhatsApp o email; el botón de registrar envío se usa después de entregarlo. No se incorporó ningún proveedor de correo. El check-in consulta el ticket actualizado y la RPC vuelve a validar fecha, pago y uso bajo bloqueo de fila.

## Verificación realizada y pendiente

`npm run typecheck` y `node src/lib/admin/checks.cjs` no necesitan credenciales. El segundo comprueba fechas, tickets, CSV, paginación, permisos de cancelación, compatibilidad del checkout, fotografías del catálogo, delimitadores SQL y renderizado con datos sintéticos. El análisis léxico no es un parser de PostgreSQL ni valida la ejecución de las funciones.

Queda pendiente aplicar las migraciones revisadas, comprobar las RPC y la concurrencia sobre una base de prueba, y revisar visualmente a 390 px. El acceso de la herramienta a Chrome fue rechazado, por lo que no se declara validación visual móvil. La vista temporal de pruebas se compiló sin errores y sus archivos se retiraron.

## Segunda ronda CC-HT7B

La cancelación propia de pendientes o confirmadas permite comparar solo status, cancellation_reason, cancelled_at y refund_pending. El trigger determina la fecha y el reembolso; el cliente no puede cambiar importes, franja, pago ni reservas ajenas. La RPC aplica la misma restricción y confirmar/completar sigue siendo exclusivo del admin. La ocupación conserva los estados de 0001 (pendiente_pago y confirmada); completar libera plazas y conserva el historial.

0013 coteja 90 rutas de fotografías con el manifest indicado, sin sustituciones: actualiza diez slugs y prepara doce destinos inactivos, omitiendo los productos dedicados ya existentes. No copia ni modifica el manifest o las imágenes. Los precios son nulos, no se asignan reseñas, y la dificultad es provisional hasta la revisión de los dueños. El filtro Inactivos se conserva y los textos marcados [BORRADOR] muestran el badge Borrador.
