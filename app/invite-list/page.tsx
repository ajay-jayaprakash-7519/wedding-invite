import type { Metadata } from "next";
import { listRsvps, summarize, type RsvpRow } from "../../lib/rsvps";
import { describeError } from "../../lib/mongo";
import InviteTable from "./InviteTable";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Invite list — Jomal & Swarna",
  robots: { index: false, follow: false },
};

const fmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
});

function Gate({ message }: { message?: string }) {
  return (
    <main className="il il--gate">
      <form className="il__gate" method="get">
        <p className="il__eyebrow">Private</p>
        <h1 className="il__title">Invite list</h1>
        {message && <p className="il__error">{message}</p>}
        <label className="il__label" htmlFor="key">
          Access key
        </label>
        <input className="il__input" id="key" name="key" type="password" autoComplete="off" autoFocus required />
        <button className="il__btn" type="submit">
          View RSVPs
        </button>
      </form>
    </main>
  );
}

export default async function InviteListPage({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const { key } = await searchParams;
  const expected = process.env.RSVP_ADMIN_KEY;

  if (!expected) return <Gate message="No access key is configured on the server (RSVP_ADMIN_KEY)." />;
  if (!key) return <Gate />;
  if (key !== expected) return <Gate message="That key isn't right." />;

  let rows: RsvpRow[] = [];
  let failed = "";
  try {
    rows = await listRsvps();
  } catch (err) {
    console.error("invite-list: read failed", err);
    failed = describeError(err);
  }
  const stats = summarize(rows);

  return (
    <main className="il">
      <header className="il__head">
        <div>
          <p className="il__eyebrow">Jomal &amp; Swarna · 24 · 10 · 2026</p>
          <h1 className="il__title">Invite list</h1>
        </div>
        <p className="il__note">Newest first · times in IST</p>
      </header>

      <section className="il__stats" aria-label="Summary">
        <div>
          <b>{stats.responses}</b>
          <span>Responses</span>
        </div>
        <div>
          <b>{stats.attending}</b>
          <span>Attending</span>
        </div>
        <div>
          <b>{stats.declined}</b>
          <span>Declined</span>
        </div>
        <div>
          <b>{stats.totalGuests}</b>
          <span>Guests coming</span>
        </div>
      </section>

      {failed ? (
        <p className="il__error">
          Couldn&apos;t load RSVPs from the database. Check MONGODB_URI and Atlas network access.
          <br />
          <small>{failed}</small>
        </p>
      ) : (
        <InviteTable
          rows={rows.map((r) => ({
            ...r,
            submitted: fmt.format(new Date(r.createdAt)),
            updated: r.updatedAt !== r.createdAt ? fmt.format(new Date(r.updatedAt)) : "",
          }))}
        />
      )}
    </main>
  );
}
