import { Collection, MongoClient } from "mongodb";

export type RsvpDoc = {
  name: string;
  phone: string;
  phoneKey: string; // digits only — one RSVP per phone number
  email: string;
  attending: "yes" | "no";
  guests: number;
  message: string;
  createdAt: Date;
  updatedAt: Date;
};

// Hosts like Vercel don't strip quotes the way a local .env file does, so tolerate them (and stray spaces).
const uri = (process.env.MONGODB_URI ?? "").trim().replace(/^["']+|["']+$/g, "").trim();

export const mongoEnabled = Boolean(uri);

/** Short, credential-free description of a connection error — only ever shown behind the admin key. */
export function describeError(err: unknown): string {
  const e = err as { name?: string; message?: string };
  return `${e?.name ?? "Error"}: ${(e?.message ?? String(err)).split("\n")[0].slice(0, 300)}`;
}

// Reuse one connection across hot reloads (dev) and warm serverless invocations.
const g = globalThis as unknown as { _rsvpCollection?: Promise<Collection<RsvpDoc>> };

export function rsvps(): Promise<Collection<RsvpDoc>> {
  if (!g._rsvpCollection) {
    g._rsvpCollection = (async () => {
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
      await client.connect();
      const col = client.db(process.env.MONGODB_DB || "wedding").collection<RsvpDoc>("rsvps");
      await col.createIndex({ phoneKey: 1 }, { unique: true });
      return col;
    })().catch((err) => {
      g._rsvpCollection = undefined; // retry on the next request
      throw err;
    });
  }
  return g._rsvpCollection;
}
