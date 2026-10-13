"use client";

import { useMemo, useState } from "react";

type Row = {
  name: string;
  phone: string;
  email: string;
  attending: "yes" | "no";
  guests: number;
  message: string;
  submitted: string;
  updated: string;
};

type Filter = "all" | "yes" | "no";

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

export default function InviteTable({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (filter === "all" || r.attending === filter) &&
        (!needle || `${r.name} ${r.phone} ${r.email} ${r.message}`.toLowerCase().includes(needle)),
    );
  }, [rows, q, filter]);

  function download() {
    const head = ["Name", "Phone", "Email", "Attending", "Guests", "Message", "Submitted"];
    const body = shown.map((r) =>
      [r.name, r.phone, r.email, r.attending === "yes" ? "Yes" : "No", r.guests, r.message, r.submitted].map(csvCell).join(","),
    );
    const blob = new Blob([[head.map(csvCell).join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "invite-list.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <section>
      <div className="il__tools">
        <input
          className="il__input il__search"
          type="search"
          placeholder="Search name, phone, email, message…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search RSVPs"
        />
        <div className="il__chips" role="group" aria-label="Filter by response">
          {(["all", "yes", "no"] as const).map((f) => (
            <button key={f} type="button" className={filter === f ? "is-on" : ""} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f === "yes" ? "Attending" : "Declined"}
            </button>
          ))}
        </div>
        <button className="il__btn il__btn--ghost" type="button" onClick={download} disabled={!shown.length}>
          Download CSV
        </button>
      </div>

      <div className="il__wrap">
        <table className="il__table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Response</th>
              <th className="il__num">Guests</th>
              <th>Message</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={r.phone + i}>
                <td className="il__idx">{i + 1}</td>
                <td className="il__name">{r.name}</td>
                <td>
                  <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`}>{r.phone}</a>
                </td>
                <td>{r.email ? <a href={`mailto:${r.email}`}>{r.email}</a> : <span className="il__dash">—</span>}</td>
                <td>
                  <span className={`il__badge il__badge--${r.attending}`}>{r.attending === "yes" ? "Attending" : "Declined"}</span>
                </td>
                <td className="il__num">{r.attending === "yes" ? r.guests : <span className="il__dash">—</span>}</td>
                <td className="il__msg">{r.message || <span className="il__dash">—</span>}</td>
                <td className="il__when">
                  {r.submitted}
                  {r.updated && <small>edited {r.updated}</small>}
                </td>
              </tr>
            ))}
            {!shown.length && (
              <tr>
                <td className="il__empty" colSpan={8}>
                  {rows.length ? "No RSVPs match your search." : "No RSVPs yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="il__count">
        Showing {shown.length} of {rows.length}
      </p>
    </section>
  );
}
