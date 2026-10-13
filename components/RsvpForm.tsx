"use client";

import { FormEvent, useState } from "react";

type Status = "idle" | "sending" | "done" | "error";

export default function RsvpForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [attending, setAttending] = useState<"yes" | "no">("yes");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="rsvp__thanks">
        <span className="ornament">✦</span>
        <h3>{attending === "yes" ? "We can’t wait to celebrate with you" : "You will be missed"}</h3>
        <p>
          {attending === "yes"
            ? "Your RSVP has been received. See you on the 24th of October."
            : "Thank you for letting us know. You will be in our hearts on the day."}
        </p>
      </div>
    );
  }

  return (
    <form className="rsvp__form" onSubmit={onSubmit} noValidate={false}>
      <div className="field">
        <input id="name" name="name" type="text" required maxLength={80} placeholder=" " autoComplete="name" />
        <label htmlFor="name">Full name</label>
      </div>

      <div className="field-row">
        <div className="field">
          <input id="phone" name="phone" type="tel" required maxLength={20} placeholder=" " autoComplete="tel" />
          <label htmlFor="phone">Phone / WhatsApp</label>
        </div>
        <div className="field">
          <input id="email" name="email" type="email" maxLength={120} placeholder=" " autoComplete="email" />
          <label htmlFor="email">Email (optional)</label>
        </div>
      </div>

      <fieldset className="choice">
        <legend>Will you be joining us?</legend>
        <label className={attending === "yes" ? "is-on" : ""}>
          <input type="radio" name="attending" value="yes" checked={attending === "yes"} onChange={() => setAttending("yes")} />
          Joyfully accept
        </label>
        <label className={attending === "no" ? "is-on" : ""}>
          <input type="radio" name="attending" value="no" checked={attending === "no"} onChange={() => setAttending("no")} />
          Regretfully decline
        </label>
      </fieldset>

      {attending === "yes" && (
        <div className="field field--select">
          <select id="guests" name="guests" defaultValue="1" aria-label="Number of guests">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "guest" : "guests"} (including you)
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="field">
        <textarea id="message" name="message" rows={3} maxLength={500} placeholder=" " />
        <label htmlFor="message">Any requests</label>
      </div>

      {/* honeypot — real people never see or fill this */}
      <input className="hp" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />

      {status === "error" && <p className="rsvp__error">{error}</p>}

      <button className="btn" type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Send RSVP"}
      </button>
    </form>
  );
}
