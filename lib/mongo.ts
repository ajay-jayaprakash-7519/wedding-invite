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

export const mongoEnabled = Boolean(process.env.MONGODB_URI);

// Reuse one connection across hot reloads (dev) and warm serverless invocations.
const g = globalThis as unknown as { _rsvpCollection?: Promise<Collection<RsvpDoc>> };

export function rsvps(): Promise<Collection<RsvpDoc>> {
  if (!g._rsvpCollection) {
    g._rsvpCollection = (async () => {
      const client = new MongoClient(process.env.MONGODB_URI!, { serverSelectionTimeoutMS: 8000 });
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
