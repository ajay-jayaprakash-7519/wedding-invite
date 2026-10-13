# Wedding site — Jomal & Swarna

Next.js 15 · GSAP (ScrollTrigger) · three.js via @react-three/fiber

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

- **Splash** — photo at `public/images/wedding.jpg` with the names, in `components/Experience.tsx` / `app/globals.css`.
- **3D rings** — `components/Scene.tsx`, model at `public/models/ring.glb` (exported from `blend-ring-3d.blend`).
- **Copy & sections** — `components/Experience.tsx`
- **Ring path while scrolling** — verse → linked pair in the names → one ring in each gap of the date, where they stay (`POSES` in `components/Experience.tsx`)
- **RSVPs** — `POST /api/rsvp` saves to MongoDB (`MONGODB_URI`, db `MONGODB_DB`, collection `rsvps`).
  One document per phone number: submitting again updates that guest's answer instead of duplicating it.
  Without `MONGODB_URI` it falls back to `data/rsvps.jsonl` (local dev only). View responses at
  `/invite-list` (asks for `RSVP_ADMIN_KEY`; searchable table, filters, CSV download) or `/api/rsvp?key=$RSVP_ADMIN_KEY` (JSON). See `.env.example`; set the same variables on your host (e.g. Vercel).
