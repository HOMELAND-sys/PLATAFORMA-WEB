import type { Product } from '@/lib/admin/types';
type OptionProduct = Pick<Product, 'id' | 'title' | 'code' | 'active'>;

export default function ProductOptions({ products }: {
  products: OptionProduct[];
}) {
  const sorted = [...products].sort((a, b) => a.title.localeCompare(b.title, 'es'));
  return (<>
    {[{ label: 'Activos', active: true }, { label: 'Borradores', active: false }].map(group => {
      const items = sorted.filter(product => product.active === group.active);
      return items.length > 0
        && (<optgroup key={group.label} label={group.label}>
          {items.map(product => (<option key={product.id} value={product.id}>
            {product.code ? `${product.code} · ` : ''}
            {product.title}
            {!product.active ? ' (borrador)' : ''}
          </option>))}
        </optgroup>);
    })}
  </>);
}
