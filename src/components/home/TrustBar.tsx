import Icon from '@/components/ui/Icon';

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
          <span className="stars" aria-label="5 de 5 estrellas">
            {Array.from({ length: 5 }, (_, i) => (
              <Icon key={i} name="star-solid" size={15} />
            ))}
          </span>
          <span>
            <strong>4.9/5</strong> Excelente
          </span>
        </div>
        <div className="trust-bar__item">
          <Icon name="badge-check" size={20} />
          Operador local verificado
        </div>
        <div className="trust-bar__item">
          <Icon name="lock" size={20} />
          Pago seguro · Zwap
        </div>
      </div>
    </div>
  );
}
