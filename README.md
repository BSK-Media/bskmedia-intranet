# BSK MEDIA — Intranet

Stack: Next.js (App Router) + TypeScript + Tailwind + (shadcn-like UI) + Prisma + PostgreSQL + Credentials Auth (JWT cookie, bez usług zewnętrznych).

## Start lokalnie
```bash
docker compose up -d
cp .env.example .env
# ustaw AUTH_SECRET na losowy, długi string
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

## Konta seed
- ADMIN: `xxxxxx@bskmedia.pl` / `xxxxxxxxx`
- EMPLOYEE: `xxxx@bskmedia.pl` / `xxxxxxxx`
- EMPLOYEE: `xxxxxxx@bskmedia.pl` / `xxxxxx`

## Najważniejsze moduły
- ADMIN: klienci, projekty, pracownicy, przypisania, timesheet (approve/reject), premie, cele KPI, raporty + eksport CSV, audit log, przypomnienia, czat
- EMPLOYEE: moje projekty, wpisy czasu, premie, podsumowanie, czat
