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

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
