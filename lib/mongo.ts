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
  const msg = (e?.message ?? String(err)).split("\n")[0].slice(0, 300);
  let hint = "";
  if (/SSL alert number 80|whitelist|not allowed|IP that isn't/i.test(msg))
    hint = " → Atlas is rejecting this server's IP. In Atlas: Network Access → Add IP Address → Allow access from anywhere (0.0.0.0/0), in the same project as this cluster.";
  else if (/bad auth|authentication failed/i.test(msg))
    hint = " → Wrong database username/password in MONGODB_URI (special characters in the password must be URL-encoded).";
  else if (/ENOTFOUND|querySrv/i.test(msg)) hint = " → The cluster host in MONGODB_URI can't be found; re-copy the connection string from Atlas.";
  return `${e?.name ?? "Error"}: ${msg}${hint}`;
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
