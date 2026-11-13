/** Estado de carga entre páginas: esqueleto neutro, sin saltos de diseño. */
export default function SiteLoading() {
  return (
    <section className="page-loading" aria-busy="true" aria-live="polite">
      <div className="container">
        <span className="sr-only">Cargando…</span>
        <div className="ht-skel page-loading__title" />
        <div className="ht-skel page-loading__line" />
        <div className="page-loading__grid">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="ht-skel page-loading__card" />
          ))}
        </div>
      </div>
    </section>
  );
}
