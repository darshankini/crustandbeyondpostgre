import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

// Loads a list on mount; reload() fetches it again (after add / edit / delete).
export function useList(fetchList) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    return fetchList()
      .then(setRows)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [fetchList]);

  useEffect(() => { reload(); }, [reload]);

  return { rows, loading, reload };
}

let rowSeq = 0;

// Repeating item rows (raw product / qty / unit ...) whose inputs are uncontrolled:
// bind(key, field) gives each input a ref, read(fields) collects every row's values on submit.
export function useItemRows(initial) {
  const [rows, setRows] = useState(() =>
    (initial && initial.length ? initial : [{}]).map((defaults) => ({ key: ++rowSeq, defaults }))
  );
  const refs = useRef({});

  const bind = (key, field) => (el) => {
    if (!refs.current[key]) refs.current[key] = {};
    refs.current[key][field] = el;
  };
  const input = (key, field) => refs.current[key]?.[field] || null;
  const add = () => setRows((r) => [...r, { key: ++rowSeq, defaults: {} }]);
  const remove = (key) => {
    setRows((r) => (r.length > 1 ? r.filter((x) => x.key !== key) : r));
  };
  const read = (fields) =>
    rows.map((r) => Object.fromEntries(fields.map((f) => [f, (input(r.key, f)?.value ?? '').trim()])));

  return { rows, bind, input, add, remove, read };
}

// Page of `rows` plus the page numbers to show (at most 5, centred on the current page).
export function usePagination(rows, perPage = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(rows.length / perPage);
  // Stay in range when a delete empties the last page
  const page = Math.min(currentPage, Math.max(totalPages, 1));
  const start = (page - 1) * perPage;

  let startPage = Math.max(1, page - 2);
  const endPage = Math.min(totalPages, startPage + 4);
  startPage = Math.max(1, endPage - 4);

  return {
    page,
    totalPages,
    offset: start,
    pageRows: rows.slice(start, start + perPage),
    from: start + 1,
    to: Math.min(start + perPage, rows.length),
    total: rows.length,
    pages: Array.from({ length: Math.max(0, endPage - startPage + 1) }, (_, i) => startPage + i),
    goToPage: (p) => p >= 1 && p <= totalPages && setCurrentPage(p),
  };
}
