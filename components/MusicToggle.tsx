"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SRC = "/bg-music.mp3";
const VOLUME = 0.45;
const FADE_MS = 1200;
const STORAGE_KEY = "wedding-sound"; // "off" once a guest has muted it themselves

// "on"      – playing with sound
// "pending" – music is meant to be on, but the browser won't allow sound until the visitor
//             interacts; the next click / tap / key press starts it
// "off"     – the guest turned it off
type Mode = "on" | "pending" | "off";

// Everything a browser may treat as a "real" gesture (Safari and Chrome disagree on which events count)
const GESTURES = ["pointerdown", "pointerup", "mousedown", "mouseup", "click", "touchstart", "touchend", "keydown"] as const;

export default function MusicToggle() {
  const audio = useRef<HTMLAudioElement>(null);
  const raf = useRef(0);
  const wanted = useRef(true); // music is on by default; false only after the guest mutes it
  const starting = useRef(false);
  const attempt = useRef(0); // newest play attempt wins; older ones must not touch state
  const ourPause = useRef(false); // distinguishes our own pause() from the browser pausing it behind our back
  const resumeOnShow = useRef(false);
  const [mode, setMode] = useState<Mode>("pending");

  const rampTo = useCallback((target: number, done?: () => void) => {
    const el = audio.current;
    if (!el) return;
    cancelAnimationFrame(raf.current);
    const from = el.volume;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / FADE_MS);
      try {
        el.volume = from + (target - from) * k; // read-only on iOS Safari — plays at full volume there
      } catch {
        /* ignore */
      }
      if (k < 1) raf.current = requestAnimationFrame(step);
      else done?.();
    };
    raf.current = requestAnimationFrame(step);
  }, []);

  const pauseOurselves = useCallback(() => {
    const el = audio.current;
    if (!el || el.paused) return;
    ourPause.current = true;
    el.pause();
  }, []);

  /** Start playing with sound. Browsers that require a gesture reject this unless it runs inside one. */
  const makeAudible = useCallback(async () => {
    const el = audio.current;
    if (!el) return false;
    const id = ++attempt.current;
    try {
      el.volume = 0;
    } catch {
      /* ignore */
    }
    starting.current = true;
    try {
      if (el.paused) await el.play();
      if (id !== attempt.current) return false; // superseded by a newer attempt
      setMode("on");
      rampTo(VOLUME);
      return true;
    } catch {
      return false; // blocked — needs a gesture
    } finally {
      starting.current = false;
    }
  }, [rampTo]);

  useEffect(() => {
    try {
      wanted.current = localStorage.getItem(STORAGE_KEY) !== "off";
    } catch {
      /* private mode */
    }
    const el = audio.current;
    if (!el) return;
    let cancelled = false; // React runs effects twice in dev — the first run's callbacks must do nothing

    // Fetch the track once the page itself has settled, so it never competes with the photo / 3D model.
    const idle = window.setTimeout(() => {
      if (!el.paused || starting.current) return; // already playing — load() would reset it
      el.preload = "auto";
      el.load();
    }, 2500);

    const onGesture = (e: Event) => {
      if ((e.target as Element | null)?.closest?.("[data-sound-toggle]")) return; // the button handles itself
      if (!wanted.current || cancelled) return;
      void makeAudible().then((ok) => ok && !cancelled && detach()); // keeps retrying on later gestures until it works
    };
    const attach = () => GESTURES.forEach((n) => window.addEventListener(n, onGesture, true));
    const detach = () => GESTURES.forEach((n) => window.removeEventListener(n, onGesture, true));

    // Some browsers pause media on their own (autoplay rules) even after play() succeeded
    const onPause = () => {
      if (ourPause.current) {
        ourPause.current = false;
        return;
      }
      if (cancelled || !wanted.current || document.hidden) return;
      setMode("pending");
      attach();
    };
    el.addEventListener("pause", onPause);

    // Don't keep playing in a hidden tab
    const onVisibility = () => {
      if (document.hidden) {
        resumeOnShow.current = !el.paused;
        pauseOurselves();
      } else if (resumeOnShow.current && wanted.current) {
        resumeOnShow.current = false;
        void el.play().catch(() => {
          setMode("pending");
          attach();
        });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    // On by default: try straight away; if the browser says no, wait for the first gesture
    if (wanted.current) {
      attach();
      void makeAudible().then((ok) => {
        if (cancelled) return;
        if (ok) detach();
        else setMode("pending");
      });
    } else {
      setMode("off");
    }

    return () => {
      cancelled = true;
      window.clearTimeout(idle);
      cancelAnimationFrame(raf.current);
      detach();
      el.removeEventListener("pause", onPause);
      document.removeEventListener("visibilitychange", onVisibility);
      pauseOurselves();
    };
  }, [makeAudible, pauseOurselves]);

  const toggle = () => {
    if (mode === "on") {
      wanted.current = false;
      try {
        localStorage.setItem(STORAGE_KEY, "off");
      } catch {
        /* ignore */
      }
      setMode("off");
      rampTo(0, pauseOurselves);
    } else {
      wanted.current = true;
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      void makeAudible().then((ok) => !ok && setMode("pending"));
    }
  };

  const on = mode === "on";
  return (
    <>
      <audio ref={audio} src={SRC} loop preload="none" />
      {mode === "pending" && (
        <span className="sound__hint" aria-hidden="true">
          Tap for sound
        </span>
      )}
      <button
        type="button"
        className={`sound is-${mode}`}
        data-sound-toggle
        onClick={toggle}
        aria-pressed={on}
        aria-label={on ? "Turn sound off" : "Turn sound on"}
        title={on ? "Sound on — click to mute" : "Sound off — click to turn on"}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 9.5v5h3.6L12.5 19V5L7.6 9.5H4Z" fill="currentColor" stroke="none" />
          {on ? (
            <>
              <path className="sound__w1" d="M15.6 9.2a4 4 0 0 1 0 5.6" />
              <path className="sound__w2" d="M18.2 6.8a7.4 7.4 0 0 1 0 10.4" />
            </>
          ) : (
            <path d="M16 9.5l5 5M21 9.5l-5 5" />
          )}
        </svg>
      </button>
    </>
  );
}
