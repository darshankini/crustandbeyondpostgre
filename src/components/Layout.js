import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../api';
import { PLATFORMS } from '../aggregators';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import PrinterButton from './PrinterButton';
import HeaderSearch from './HeaderSearch';

export const money = (n) => '₹ ' + Number(n).toFixed(2);
export const formattedDate = (n) => new Date(n).toLocaleString('en-IN',{
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).replace(/\//g, '-').replace(',', '');

// Products are priced per unit and sold by quantity.
// Sub-items (bread, sauce, toppings...) add to the unit price, so they're charged once per unit.
export const subitemsTotal = (subitems) => (subitems || []).reduce((s, x) => s + Number(x.price || 0), 0);
// Price of one unit including its sub-items.
export const unitTotal = (item) => Number(item.price) + subitemsTotal(item.subitems);
// Full line amount: (unit price + sub-items) x qty, rounded to the paisa (matches server/pricing.js).
export const itemTotal = (item) => Math.round(unitTotal(item) * Number(item.qty) * 100) / 100;
// Rupees taken off `total` for a 'flat' (Rs.) or 'percent' (%) discount, rounded to the nearest
// whole rupee and never more than the total (matches server/pricing.js).
export const discountAmount = (total, type, value) => {
  const v = Number(value);
  if ((type !== 'flat' && type !== 'percent') || !Number.isFinite(v) || v <= 0) return 0;
  const off = type === 'percent' ? (total * Math.min(v, 100)) / 100 : v;
  return Math.min(Math.round(off), total);
};

// Short two-tone chime for a new online order (Web Audio, no sound file needed).
function chime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 1175].forEach((f, n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const at = ctx.currentTime + n * 0.25;
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.25, at);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.4);
    });
  } catch {}
}

// New-order counts per aggregator, polled so a Zomato / Swiggy order is noticed from any page.
// Chimes and toasts when a platform's count goes up.
function useOnlineOrderCounts() {
  const [counts, setCounts] = useState({});
  const prev = useRef(null);
  useEffect(() => {
    const poll = () =>
      api.get('/aggregators/summary').then((s) => {
        if (prev.current) {
          for (const [p, c] of Object.entries(s)) {
            if (c.new > (prev.current[p]?.new || 0)) {
              chime();
              toast(`New ${PLATFORMS[p]?.label || p} order`, { icon: '🔔' });
            }
          }
        }
        prev.current = s;
        setCounts(s);
      }).catch(() => {});
    poll();
    const t = setInterval(poll, 20000);
    return () => clearInterval(t);
  }, []);
  return counts;
}

function Header() {
  const { user, logout } = useAuth();
  const cart = useCart();
  const online = useOnlineOrderCounts();
  const linkCls = ({ isActive }) =>
    'px-3 py-1.5 rounded-md text-sm font-medium ' +
    (isActive ? 'bg-white text-brand' : 'text-white/90 hover:bg-white/10');

  // Phones: search drops to a full-width second row. From md up it sits inline between nav and actions.
  return (
    <header className="shrink-0 bg-brand text-white flex flex-wrap md:flex-nowrap items-center px-3 sm:px-4 py-2 md:py-0 md:h-14 gap-x-2 sm:gap-x-4 gap-y-2 shadow">
      <Link to="/" className="text-lg font-bold tracking-tight whitespace-nowrap">
        🍽️<span className="hidden lg:inline"> Crust & Beyond</span>
      </Link>
      <nav className="flex gap-1">
        <NavLink to="/" end className={linkCls}>POS</NavLink>
        {Object.entries(PLATFORMS).map(([key, p]) => (
          <NavLink key={key} to={`/online/${key}`} className={linkCls}>
            {p.label}
            {online[key]?.new > 0 && (
              <span className="ml-1.5 inline-flex min-w-[1.25rem] justify-center rounded-full bg-white px-1 text-xs font-bold animate-pulse" style={{ color: p.color }}>
                {online[key].new}
              </span>
            )}
          </NavLink>
        ))}
        <NavLink to="/dashboard" className={linkCls}>Dashboard</NavLink>
      </nav>
      <HeaderSearch className="order-last w-full md:order-none md:w-auto md:flex-1 md:max-w-md" />
      <div className="ml-auto flex items-center gap-2 sm:gap-3 text-sm">
        {cart && <span className="hidden sm:inline">🛒 {cart.count}</span>}
        <PrinterButton />
        <span className="hidden md:inline opacity-90 truncate max-w-[10rem]">{user?.name || user?.username}</span>
        <button onClick={logout} className="px-3 py-1.5 rounded-md bg-white/15 hover:bg-white/25">
          Logout
        </button>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="h-8 shrink-0 bg-gray-800 text-gray-300 text-xs flex items-center justify-center">
      Crust & Beyond &copy; {new Date().getFullYear()}
    </footer>
  );
}

// Protected shell: header + routed content + footer, full-height flex column.
export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  return (
    <div className="h-full flex flex-col">
      <Header />
      <main className="flex-1 min-h-0">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
