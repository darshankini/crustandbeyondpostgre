import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

const DEBOUNCE_MS = 300;

// Product search box in the header. The term lives in the POS URL (`/?q=...`) and is written
// there only after typing pauses for DEBOUNCE_MS, so the POS fetches once per pause rather than
// on every keystroke. Searching from another page (e.g. Dashboard) jumps to the POS.
export default function HeaderSearch({ className = '' }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const urlQ = pathname === '/' ? params.get('q') || '' : '';
  const [q, setQ] = useState(urlQ);

  // Follow the URL when it changes from elsewhere (back button, clicking the POS link),
  // but don't touch what's being typed (e.g. a trailing space) when it already matches.
  useEffect(() => {
    setQ((cur) => (cur.trim() === urlQ ? cur : urlQ));
  }, [urlQ]);

  useEffect(() => {
    const term = q.trim();
    if (term === urlQ) return;
    const t = setTimeout(() => {
      // replace while already on the POS so each pause doesn't add a history entry.
      navigate(term ? `/?q=${encodeURIComponent(term)}` : '/', { replace: pathname === '/' });
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q, urlQ, pathname, navigate]);

  return (
    <div className={'relative ' + className}>
      <svg
        viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && setQ('')}
        placeholder="Search products…"
        aria-label="Search products"
        className="w-full h-9 rounded-md bg-white pl-8 pr-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-white/60"
      />
    </div>
  );
}
