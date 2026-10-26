// Kitchen Order Ticket for the browser print fallback: what to make, no prices.
// Hidden on screen; shown only when printing (see .receipt-print in index.css).
export default function KotTicket({ label, items }) {
  return (
    <div className="receipt-print">
      <div style={{ textAlign: 'center', fontSize: 16 }}>
        <strong>KOT</strong>
      </div>
      <div>--------------------------------</div>
      <div>
        {label && <>{label}<br /></>}
        {new Date().toLocaleString()}
      </div>
      <div>--------------------------------</div>
      {items.map((i) => (
        <div key={i.key || i.id}>
          <strong>{i.qty} x {i.name}</strong>
          {(i.subitems || []).map((s) => (
            <div key={s.id}>&nbsp;&nbsp;&nbsp;&nbsp;+ {s.name}</div>
          ))}
        </div>
      ))}
      <div>--------------------------------</div>
    </div>
  );
}
