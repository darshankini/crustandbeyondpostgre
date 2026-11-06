# Restro POS — Restaurant Point of Sale

A minimal full-stack POS for a small restaurant.

- **Frontend:** React 19 (CRA) + Tailwind CSS + React Router
- **Backend:** Node.js + Express + PostgreSQL (`pg`), JWT auth, bcrypt
- **Database:** PostgreSQL (hosted on Supabase)

## Features

- **Login** (username / password, JWT).
- **POS screen** — common header/footer; left **2/3** = scrollable category rail + product grid, right **1/3** = cart.
  - Product tile: image, name, price, tap to add.
  - Cart: image, name, qty +/−, line total, remove.
  - **Checkout & Print** saves the order and prints a **58mm thermal receipt** via the browser/OS print dialog.
- **Dashboard** — today's order count & sales, 7-day trend, and CRUD for **products** and **categories**.

## Setup

### 1. Database + backend

```bash
cd server
npm install
npm run migrate   # creates the tables
npm run seed      # creates admin user + sample products
npm start         # API on http://localhost:5000
```

DB credentials live in `server/.env`: set `DATABASE_URL` to the Supabase connection string
(Project → Connect → Transaction pooler, with your database password filled in).
For a local Postgres, leave it empty and set `DB_HOST` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` instead.

### 2. Frontend

```bash
npm install
npm start         # app on http://localhost:3000
```

## Deploying the API on Hostinger

hPanel → Websites → Add Website → **Node.js web app**, import the repo (or upload a zip of `server/`
without `node_modules`), then set:

| Field | Value |
|---|---|
| Framework preset | Express |
| Root directory | `server` |
| Node.js version | 22 |
| Entry file | `server.js` |

Add these under **Environment variables** (`server/.env` is not deployed): `DATABASE_URL`,
`JWT_SECRET`, `APP_TZ=Asia/Kolkata`. The frontend (https://divinex.tech) calls the API at https://crustandbeyond.divinex.tech/api;
set `REACT_APP_API` at build time to point it elsewhere, and `CORS_ORIGINS` on the API to allow other sites.

Note: uploaded product images are saved in `server/uploads` inside the deployment, so a redeploy
removes images uploaded since the last deploy.

## Deploying on Vercel (frontend + API in one project)

`vercel.json` builds the React app from the repo root and runs the Express API (`server/`) as one
serverless function (`api/index.js`). `/api/*` and `/uploads/*` go to the function, everything else
is the React app, so the frontend calls the API on the same domain (`REACT_APP_API` defaults to `/api`).

Import the repo in Vercel with the **root directory left at the repo root** (the settings come from
`vercel.json`), then add under **Settings → Environment Variables**:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Supabase **Transaction pooler** connection string (port 6543) |
| `JWT_SECRET` | a long random string |
| `APP_TZ` | `Asia/Kolkata` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `ADMIN_EMAIL` | low-stock emails (optional) |
| `REACT_APP_API` | only to call an API on another domain (default `/api`) |

Run `npm run migrate` from `server/` against the same database before the first deploy and after
schema changes. Functions run in Mumbai (`bom1`, next to the Supabase database).

Limits on Vercel:
- **Uploaded images don't last**: the function can only write to `/tmp`, which is wiped on cold
  starts. Keep image uploads on the Hostinger API, or move them to object storage.
- Rate limits are counted per function instance, so they're looser than on Hostinger.
- Expired KOT stock holds are released when a POS refreshes its stock (every 15 s), not by the
  one-minute timer in `server.js`, which doesn't run on Vercel.

## Default login

```
username: admin
password: admin123
```

## API (base `/api`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/login` | – | Login, returns JWT |
| GET | `/categories` | – | List categories |
| POST/PUT/DELETE | `/categories[/:id]` | ✔ | Category CRUD |
| GET | `/products?category=:id` | – | List products |
| POST/PUT/DELETE | `/products[/:id]` | ✔ | Product CRUD |
| POST | `/orders` | – | Create order (checkout) |
| GET | `/dashboard` | ✔ | Today's stats + 7-day trend |

## Thermal printing

The receipt component is hidden on screen and revealed only for printing (see
`src/index.css` → `.receipt-print` / `@media print`, sized `58mm`). "Checkout &
Print" calls `window.print()`; set your thermal printer as the print target
(or default printer) in the browser/OS dialog. Change `58mm` to `80mm` in
`index.css` for wider rolls.
