# member check-in system

a membership check-in and rewards management system for **Vlocity Arena** sport center, built with Next.js 15 and Cloudflare.

live at [checkin.vlocityarena.com](https://checkin.vlocityarena.com)

## features

- **customer portal**: mobile-optimized check-in flow — select sport, pick courts, earn points.
- **rewards & redemptions**: customers redeem points for rewards, staff approves/rejects.
- **admin dashboard**: manage members, courts, rewards, check-ins, redemptions, and staff.
- **role-based access**: admin, cashier, and customer roles with route protection.
- **audit logs**: track all staff actions for accountability.
- **Cloudflare native**: powered by Cloudflare D1 (SQL), R2 (image storage), and Workers.
- **dark mode**: full support for light and dark themes.

## tech stack

- **frontend**: Next.js 15 (App Router), React 19, Tailwind CSS v4, Shadcn UI
- **backend**: Hono (Cloudflare Workers)
- **database**: Cloudflare D1 (SQLite) with Drizzle ORM
- **storage**: Cloudflare R2 (reward images)
- **auth**: JWT (phone + DOB for customers, username + password for staff)
- **deployment**: OpenNext for Cloudflare

## development

### prerequisites

- node.js and npm
- cloudflare account with d1 and r2 enabled

### installation

```bash
npm install
cd api && npm install
```

### local development

```bash
# frontend (localhost:3000)
npm run dev

# api (localhost:8787)
cd api && npm run dev
```

### deployment

```bash
# frontend
npm run deploy

# api
npm run deploy-api
```

### secrets

the api worker requires a `JWT_SECRET` environment variable:

```bash
cd api && npx wrangler secret put JWT_SECRET
```

## database

the project uses drizzle orm with cloudflare d1.

```bash
# generate migrations
cd api && npm run db:generate

# apply migrations (local)
cd api && npm run db:migrate

# apply migrations (production)
cd api && npm run db:migrate:prod

# seed local database
cd api && npm run db:seed
```
