import { NextResponse } from "next/server";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { mongoEnabled, rsvps } from "../../../lib/mongo";
import { listRsvps, summarize } from "../../../lib/rsvps";

export const runtime = "nodejs";

const FILE = path.join(process.cwd(), "data", "rsvps.jsonl");

const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : "";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: pretend success so bots move on.
  if (clean(body.website, 50)) return NextResponse.json({ ok: true });

  const name = clean(body.name, 80);
  const phone = clean(body.phone, 20);
  const email = clean(body.email, 120);
  const attending = body.attending === "no" ? "no" : "yes";
  const guests = attending === "yes" ? Math.min(6, Math.max(1, Number(body.guests) || 1)) : 0;
  const message = clean(body.message, 500);

  if (!name) return NextResponse.json({ error: "Please tell us your name." }, { status: 400 });
  if (!/^[+\d][\d\s()-]{6,19}$/.test(phone))
    return NextResponse.json({ error: "Please enter a valid phone number." }, { status: 400 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: "That email doesn't look right." }, { status: 400 });

  const phoneKey = phone.replace(/\D/g, "");
  const now = new Date();
  let saved = false;

  // 1) MongoDB — one document per phone number; resubmitting updates the guest's answer.
  if (mongoEnabled) {
    try {
      const col = await rsvps();
      await col.updateOne(
        { phoneKey },
        {
          $set: { name, phone, phoneKey, email, attending, guests, message, updatedAt: now },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true },
      );
      saved = true;
    } catch (err) {
      console.error("RSVP: MongoDB write failed", err);
    }
  }

  // 2) Local file — only when MongoDB isn't configured (handy in development)
  if (!mongoEnabled) {
    try {
      await mkdir(path.dirname(FILE), { recursive: true });
      await appendFile(FILE, JSON.stringify({ name, phone, email, attending, guests, message, at: now.toISOString() }) + "\n");
      saved = true;
    } catch {
      /* read-only filesystem */
    }
  }

  // 3) Optional webhook copy (Google Sheet, Zapier, ...)
  const hook = process.env.RSVP_WEBHOOK_URL;
  if (hook) {
    try {
      const r = await fetch(hook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, attending, guests, message, at: now.toISOString() }),
      });
      saved = saved || r.ok;
    } catch {
      /* ignore */
    }
  }

  if (!saved) return NextResponse.json({ error: "We couldn't save your RSVP. Please try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Private view of responses: /api/rsvp?key=<RSVP_ADMIN_KEY>
export async function GET(req: Request) {
  const key = process.env.RSVP_ADMIN_KEY;
  if (!key || new URL(req.url).searchParams.get("key") !== key)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  try {
    const rows = await listRsvps();
    return NextResponse.json({ ...summarize(rows), rows });
  } catch (err) {
    console.error("RSVP: read failed", err);
    return NextResponse.json({ error: "Could not read RSVPs." }, { status: 500 });
  }
}
