export default function TrustBar() {
  return (
    <div className="trust-bar">
      <div className="container trust-bar__inner">
        <div className="trust-bar__item">
          <div className="avatar-group">
            <span className="avatar" style={{ backgroundImage: "url('https://i.pravatar.cc/60?img=12')" }}></span>
            <span className="avatar" style={{ backgroundImage: "url('https://i.pravatar.cc/60?img=32')" }}></span>
            <span className="avatar" style={{ backgroundImage: "url('https://i.pravatar.cc/60?img=45')" }}></span>
            <span className="avatar" style={{ backgroundImage: "url('https://i.pravatar.cc/60?img=8')" }}></span>
          </div>
          <span>
            Confianza de <strong>12.000+</strong> viajeros
          </span>
        </div>
        <div className="trust-bar__item rating">
          <span className="stars">★ ★ ★ ★ ★</span>
          <span>
            <strong>4.9/5</strong> Excelente
          </span>
        </div>
        <div className="trust-bar__item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 12l2 2 4-4" />
            <path d="M21 12c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          </svg>
          Operador local verificado
        </div>
        <div className="trust-bar__item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2 4 6v6c0 5 4 9 8 10 4-1 8-5 8-10V6l-8-4z" />
          </svg>
          Pago seguro · Zwap
        </div>
      </div>
    </div>
  );
}
