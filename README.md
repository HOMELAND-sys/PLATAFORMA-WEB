# Homeland Tours — Next.js + TypeScript

Operador turístico local en Bolivia. Migración del sitio estático (HTML/CSS/JS vanilla) a **Next.js 15 (App Router) + TypeScript**, manteniendo el diseño visual idéntico.

## Requisitos

- Node.js 18+

## Desarrollo

```bash
npm install
npm run dev
# http://localhost:3001
```

También podés usar `start.bat` (Windows) o `start.sh` (Mac/Linux).

## Producción

```bash
npm run build
npm start
```

## Arquitectura

```
src/
├── app/                  # Rutas (App Router)
│   ├── layout.tsx        # Shell global: fuentes, CSS, Header, Footer, FAB
│   ├── page.tsx          # Home
│   ├── tours/page.tsx    # Listado con filtros
│   ├── tours/[slug]/     # Detalle dinámico por slug
│   ├── booking/          # Checkout
│   ├── confirmation/     # Voucher post-pago
│   ├── business/         # Aliados comerciales
│   └── customize/        # Viaje personalizado
├── components/
│   ├── layout/           # Header, Footer, WhatsAppFab, Breadcrumbs
│   ├── ui/               # TourCard, Reveal
│   ├── home/             # Hero, TrustBar, Why, Categorías, Destacados, Diff, Reviews
│   ├── tours/            # ToursContent, FilterPanel
│   ├── tour-detail/      # TourDetailContent, AvailabilityModal
│   ├── booking/          # BookingContent, SummaryCard
│   ├── forms/            # BusinessContent, CustomizeContent, CalendarScheduler
│   └── confirmation/     # ConfirmationContent
├── data/                 # Mock data tipada (tours, reviews, coupons, categories)
├── lib/
│   ├── types.ts          # Tipos de dominio
│   ├── pricing.ts        # Cálculos de precios y totales
│   └── services/
│       └── bookingService.ts  # Interfaz + mock — swap a API real aquí
├── context/
│   └── BookingContext.tsx     # Estado de reserva (persiste en localStorage)
└── styles/               # CSS del diseño original (sin cambios)
```

## Cómo conectar un backend real

1. Reemplazar `src/lib/services/bookingService.ts` con llamadas `fetch` a tu API manteniendo la interfaz `BookingService`.
2. Opcional: añadir API routes en `src/app/api/` para proxy seguro.
3. Sustituir los archivos de `src/data/` por carga desde API (SSR en las páginas).

## Flujo de reserva (prototipo)

Detalle → Modal de disponibilidad → `/booking` (cupones, pasajeros dinámicos) → mock service → `/confirmation` (voucher con datos reales).

## Notas

- `legacy/` conserva el sitio original como referencia.
- Cupones de prueba: `WELCOME10`, `BOLIVIA15`, `SUMMER20`.
- Los 12 tours tienen datos completos (itinerario, incluidos, qué llevar, info).
