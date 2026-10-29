# CafePOS — Restaurant & Café Billing System

A portfolio-ready MERN-style POS starter using React, Vite, Node.js, Express, MongoDB/Mongoose, native `fetch()`, JWT authentication, and Socket.IO live events.

## Features
- Admin and staff login (JWT; passwords hashed with bcrypt)
- Menu item CRUD (admin only)
- Create restaurant orders with table/order type, quantities, discounts and configurable GST
- Server-side price/tax calculation (client totals are never trusted)
- Invoice number generation, order history, dashboard totals
- Socket.IO broadcasts new/updated orders to connected authenticated users
- Basic input validation, role checks, Helmet, rate limiting, CORS allowlist
- Automated backend tests for tax calculations and validation
- Responsive frontend with dashboard, POS, menu and orders views

## Requirements
- Node.js 20+
- MongoDB local or MongoDB Atlas

## 1. Configure backend
```bash
cd server
cp .env.example .env
# Set MONGO_URI, JWT_SECRET, CLIENT_ORIGIN and ADMIN_EMAIL/ADMIN_PASSWORD
npm install
npm run seed
npm run dev
```
Backend defaults to `http://localhost:5000`.

The seed script creates an admin account and sample menu items. Set a strong `ADMIN_PASSWORD` in `.env` first.

## 2. Configure frontend
In another terminal:
```bash
cd client
cp .env.example .env
npm install
npm run dev
```
Open the Vite URL shown in the terminal. The default API URL is `http://localhost:5000`.

Demo credentials are the values you set in `server/.env`, not hard-coded credentials.

## 3. Run tests
```bash
cd server
npm test
```

## Tax configuration
Set `GST_RATE=5` for the demo default. This is configurable, not legal/tax advice. Confirm the correct GST classification/rate and invoice requirements with a qualified Indian tax professional before production use. The application models intra-state tax as CGST + SGST and inter-state tax as IGST. Prices are treated as tax-exclusive.

## Production checklist
- Use HTTPS and a strong random `JWT_SECRET` (at least 32 random bytes).
- Set exact `CLIENT_ORIGIN` to your deployed frontend origin.
- Use MongoDB Atlas network restrictions and backups.
- Use a persistent backend host; configure health checks to `/api/health`.
- Deploy the Vite `client` folder to Vercel; deploy `server` to Render or another Node host.
- Configure `VITE_API_URL` to the deployed backend URL.
- Socket.IO needs a host that supports WebSockets. For multiple backend instances, configure a shared Socket.IO adapter (e.g. Redis) and ensure sticky sessions where required.
- This starter is not a certified fiscal/POS product. Before real business use, add audit trails, idempotency keys, invoice sequence handling suitable for your jurisdiction, backup/restore drills, payment-provider integration, and accountant-reviewed tax logic.

## Deploy
### Backend (Render)
- Create a Web Service from the repository, root directory `server`.
- Build command: `npm install`
- Start command: `npm start`
- Add all values from `.env.example` as environment variables. Set `NODE_ENV=production`.
- Set `CLIENT_ORIGIN` to your Vercel site origin.

### Frontend (Vercel)
- Import repository and set root directory `client`.
- Framework preset: Vite
- Add `VITE_API_URL=https://YOUR-BACKEND-HOST`
- Redeploy after setting environment variables.

## Structure
```text
cafe-pos/
  server/
    src/
      config/db.js
      middleware/auth.js
      models/User.js
      models/MenuItem.js
      models/Order.js
      routes/auth.js
      routes/menu.js
      routes/orders.js
      routes/dashboard.js
      utils/tax.js
      app.js
      server.js
    scripts/seed.js
    tests/tax.test.js
  client/
    src/
      components/
      pages/
      api.js
      App.jsx
      main.jsx
      styles.css
```
