import { Fragment } from 'react';
import { money, itemTotal, discountAmount } from './Layout';
import { SHOP } from '../printer/escpos';
import { upiQr } from '../printer/upi';

// UPI payment QR as crisp SVG (one path of dark modules, 2-module quiet zone).
function UpiQr() {
  const { size, dark } = upiQr();
  let d = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) if (dark(r, c)) d += `M${c} ${r}h1v1h-1z`;
  }
  return (
    <svg viewBox={`-2 -2 ${size + 4} ${size + 4}`} shapeRendering="crispEdges"
      style={{ display: 'block', width: '38mm', height: '38mm', margin: '4mm auto 0' }}>
      <rect x={-2} y={-2} width={size + 4} height={size + 4} fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  );
}

// Hidden on screen; shown only when printing (see .receipt-print in index.css).
// Sized for a 58mm thermal roll.
export default function Receipt({ order, items, customer }) {
  const hasCustomer = customer && (customer.name || customer.mobile || customer.email);
  const total = items.reduce((s, i) => s + itemTotal(i), 0);
  const discountAmt = order?.discount_amount ?? discountAmount(total, order?.discount_type, order?.discount);
  const finalTotal = order?.final_total ?? total - discountAmt;
  return (
    <div className="receipt-print">
      <div style={{ textAlign: 'center' }}>
        <strong>{SHOP.name}</strong><br />
        {SHOP.tagline}<br />
        --------------------------------
      </div>
      <div>
        Order #: {order?.id ?? '—'}<br />
        {new Date(order?.created_at || Date.now()).toLocaleString()}
      </div>
      {hasCustomer && (
        <div>
          --------------------------------<br />
          {customer.name && <>Name: {customer.name}<br /></>}
          {customer.mobile && <>Mobile: {customer.mobile}<br /></>}
          {customer.email && <>Email: {customer.email}<br /></>}
        </div>
      )}
      <div>--------------------------------</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {items.map((i) => (
            <Fragment key={i.key || i.id}>
              <tr>
                <td>{i.qty} x {i.name}</td>
                <td style={{ textAlign: 'right' }}>{money(itemTotal(i))}</td>
              </tr>
              {(i.subitems || []).map((s) => (
                <tr key={s.id}>
                  <td colSpan={2}>&nbsp;&nbsp;+ {s.name}{Number(s.price) > 0 ? ` (${money(s.price)})` : ''}</td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
      <div>--------------------------------</div>
      <table style={{ width: '100%' }}>
        <tbody>
          {discountAmt > 0 && (
            <>
              <tr>
                <td>Total</td>
                <td style={{ textAlign: 'right' }}>{money(total)}</td>
              </tr>
              <tr>
                <td>Discount{order.discount_type === 'percent' ? ` (${order.discount}%)` : ''}</td>
                <td style={{ textAlign: 'right' }}>-{money(discountAmt)}</td>
              </tr>
            </>
          )}
          <tr>
            <td><strong>{discountAmt > 0 ? 'FINAL TOTAL' : 'TOTAL'}</strong></td>
            <td style={{ textAlign: 'right' }}>
              <strong>{money(finalTotal)}</strong>
            </td>
          </tr>
        </tbody>
      </table>
      <div style={{ textAlign: 'center', marginTop: 6,marginBottom: 6 }}>
        Thank you! Visit again <br/>
        
       Pay using any UPI app 
      </div>
      <div style={{ textAlign: 'center', marginTop: 3 }}>
        
        <UpiQr />
      </div>
    </div>
  );
}
