import toast from "react-hot-toast";

const API_URLS = {
  production: 'https://crustandbeyond.divinex.tech/api',     // Hostinger
  staging: 'https://crustandbeyondpostgre.vercel.app/api',   // Vercel + Prisma Postgres
  development: 'http://localhost:5000/api',                  // local server/
};
export const APP_ENV = process.env.REACT_APP_ENV
  || (process.env.NODE_ENV === 'production' ? 'production' : 'development');
const BASE = process.env.REACT_APP_API || API_URLS[APP_ENV] || API_URLS.development;

export function getToken() {
  return localStorage.getItem('pos_token');
}

let handleUnauthorized = false;

function handleSessionExpired(){
  if(handleUnauthorized) return;
  handleUnauthorized = true;

  localStorage.removeItem('pos_token');
  localStorage.removeItem('pos_user');

  toast.error('Session logged out.Please log in again',{position:'top-center'});

  setTimeout(()=>{
    window.location.href = '/login';
  },1200)
}

// Error carrying the server's per-field messages (e.g. { 'items[0].product_qty': '...' }) when it sent any.
function apiError(data, fallback) {
  const err = new Error(data.error || fallback);
  if (data.errors) err.errors = data.errors;
  return err;
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if(res.status === 401 && !path.startsWith('/auth/login')){
    handleSessionExpired();
    throw new Error('Session Expired');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw apiError(data, `Request failed (${res.status})`);
  return data;
}

// Multipart upload: send a FormData body. Don't set Content-Type — the browser
// adds the multipart boundary itself.
async function upload(path, formData) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(BASE + path, { method: 'POST', headers, body: formData });

  if(res.status === 401 && !path.startsWith('/auth/login')){
    handleSessionExpired();
    throw new Error('Session Expired');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw apiError(data, `Upload failed (${res.status})`);
  return data;
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: 'POST', body }),
  put: (p, body) => request(p, { method: 'PUT', body }),
  del: (p) => request(p, { method: 'DELETE' }),
  upload,
};
