This is the Maarg frontend, a Next.js 15 + React 19 + Tailwind v4 + shadcn app.

## Environment

Copy `.env.example` to `.env.local` and fill in any blanks:

- `NEXT_PUBLIC_API_BASE_URL` defaults to `http://localhost:8000` (local FastAPI).
- `NEXT_PUBLIC_MAPBOX_TOKEN` enables the live Mapbox map on `/search` and `/map`.

Use a protected, URL-restricted Mapbox token for live deployments. The local
demo can use a public token in `.env.local`, which is gitignored.

## Getting Started

From the repo root, run the FastAPI backend:

```bash
cd backend
uvicorn app.api.server:app --reload --port 8000
```

Then run the frontend:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Open [http://localhost:3000](http://localhost:3000), then use the home page
demo cockpit to launch the live catch, confidence audit, and desert map beats.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

For the hackathon demo, deploy the frontend on Vercel and point it at the
deployed FastAPI backend:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-backend-url
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-public-token
```

The backend can run in `HACKATHON_MODE=real` against Databricks Gold tables or
fall back to mock fixtures if Databricks is unavailable. The map page uses
`/api/map/facilities`, `/api/desert`, and `/api/desert/summary`; it no longer
depends on the search endpoint's `top_k` result limit.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
