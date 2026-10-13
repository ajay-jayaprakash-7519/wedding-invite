import { readFile } from "node:fs/promises";
import path from "node:path";
import { mongoEnabled, rsvps } from "./mongo";

export type RsvpRow = {
  name: string;
  phone: string;
  email: string;
  attending: "yes" | "no";
  guests: number;
  message: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

const FILE = path.join(process.cwd(), "data", "rsvps.jsonl");

/** All RSVPs, newest first — from MongoDB, or the local dev file when MongoDB isn't configured. */
export async function listRsvps(): Promise<RsvpRow[]> {
  if (mongoEnabled) {
    const docs = await (await rsvps()).find({}, { projection: { _id: 0, phoneKey: 0 } }).sort({ createdAt: -1 }).toArray();
    return docs.map((d) => ({
      name: d.name,
      phone: d.phone,
      email: d.email,
      attending: d.attending,
      guests: d.guests,
      message: d.message,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }));
  }
  try {
    return (await readFile(FILE, "utf8"))
      .split("\n")
      .filter(Boolean)
      .map((l) => {
        const r = JSON.parse(l);
        return { ...r, createdAt: r.at, updatedAt: r.at } as RsvpRow;
      })
      .reverse();
  } catch {
    return [];
  }
}

export function summarize(rows: RsvpRow[]) {
  const yes = rows.filter((r) => r.attending === "yes");
  return {
    responses: rows.length,
    attending: yes.length,
    declined: rows.length - yes.length,
    totalGuests: yes.reduce((n, r) => n + r.guests, 0),
  };
}
