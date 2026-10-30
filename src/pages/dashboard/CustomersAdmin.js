import { useEffect, useState, useCallback } from 'react';
import { api } from '../../api';

export default function CustomersAdmin() {
  const [rows, setRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const customerPerPage = 10;

  const load = useCallback(() => {
    api.get('/customers').then(setRows).catch((e) => alert(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(rows.length / customerPerPage);
  const startIndex = ((currentPage - 1) * customerPerPage) + 1;
  const endIndex = customerPerPage * currentPage;
  const currentCustomers = rows.slice(startIndex - 1, endIndex);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // Narrow column, so show fewer page numbers than the orders list
  const maxVisiblePages = 3;

  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = startPage + maxVisiblePages - 1;

  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  const visiblePages = Array.from(
    { length: endPage - startPage + 1 },
    (_, index) => startPage + index
  );

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold mb-3">Customers</h3>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">No customers yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b">
              <tr>
                <th className="py-2">Customer</th>
                <th className="px-2 text-center">Mobile</th>
                <th className="px-2 text-center">Orders</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {currentCustomers.map((c) => (
                <tr key={c.id}>
                  <td className="py-2 break-words">
                    <div className="font-medium text-gray-800">{c.customer_name || '—'}</div>
                    {c.customer_email && <div className="text-xs text-gray-500 break-all">{c.customer_email}</div>}
                  </td>
                  <td className="px-2 text-center tabular-nums whitespace-nowrap">{c.customer_mobile || '—'}</td>
                  <td className="px-2 text-center tabular-nums">{c.order_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-sm text-gray-500">
            <span className="font-medium text-gray-700">{startIndex}</span>
            {' - '}
            <span className="font-medium text-gray-700">{Math.min(endIndex, rows.length)}</span>
            {' of '}
            <span className="font-medium text-gray-700">{rows.length}</span>
          </p>

          <div className="flex items-center gap-1">
            {/* Previous */}
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded-md border px-2.5 py-1.5 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ←
            </button>

            {/* First page */}
            {startPage > 1 && (
              <>
                <button
                  onClick={() => goToPage(1)}
                  className="min-w-8 rounded-md border px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                >
                  1
                </button>
                {startPage > 2 && <span className="px-1 text-gray-400">...</span>}
              </>
            )}

            {/* Visible pages */}
            {visiblePages.map((page) => (
              <button
                key={page}
                onClick={() => goToPage(page)}
                className={`min-w-8 rounded-md px-2.5 py-1.5 text-sm transition ${
                  currentPage === page ? 'bg-gray-800 text-white' : 'border text-gray-600 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}

            {/* Last page */}
            {endPage < totalPages && (
              <>
                {endPage < totalPages - 1 && <span className="px-1 text-gray-400">...</span>}
                <button
                  onClick={() => goToPage(totalPages)}
                  className="min-w-8 rounded-md border px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                >
                  {totalPages}
                </button>
              </>
            )}

            {/* Next */}
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="rounded-md border px-2.5 py-1.5 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
