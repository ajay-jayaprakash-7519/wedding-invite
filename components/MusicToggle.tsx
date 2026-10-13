"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SRC = "/bg-music.mp3";
const VOLUME = 0.45;
const FADE_MS = 1200;
const STORAGE_KEY = "wedding-sound"; // "off" once the guest has muted it

export default function MusicToggle() {
  const audio = useRef<HTMLAudioElement>(null);
  const raf = useRef(0);
  const wanted = useRef(true); // does the guest want sound? (false once they switch it off)
  const resumeOnShow = useRef(false);
  const starting = useRef(false); // a play() call is in flight
  const [playing, setPlaying] = useState(false);

  const rampTo = useCallback((target: number, done?: () => void) => {
    const el = audio.current;
    if (!el) return;
    cancelAnimationFrame(raf.current);
    const from = el.volume;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / FADE_MS);
      try {
        el.volume = from + (target - from) * k; // read-only on iOS Safari — just plays at full volume there
      } catch {
        /* ignore */
      }
      if (k < 1) raf.current = requestAnimationFrame(step);
      else done?.();
    };
    raf.current = requestAnimationFrame(step);
  }, []);

  const start = useCallback(async () => {
    const el = audio.current;
    if (!el) return false;
    try {
      el.volume = 0;
    } catch {
      /* ignore */
    }
    starting.current = true;
    try {
      await el.play();
      setPlaying(true);
      rampTo(VOLUME);
      return true;
    } catch {
      setPlaying(false); // blocked until the guest interacts with the page
      return false;
    } finally {
      starting.current = false;
    }
  }, [rampTo]);

  const stop = useCallback(() => {
    setPlaying(false);
    rampTo(0, () => audio.current?.pause());
  }, [rampTo]);

  useEffect(() => {
    try {
      wanted.current = localStorage.getItem(STORAGE_KEY) !== "off";
    } catch {
      /* private mode */
    }
    const el = audio.current;
    if (!el) return;

    // Fetch the track once the page itself has settled, so it never competes with the photo / 3D model.
    const preload = () => {
      if (!el.paused || starting.current) return; // already playing (or about to) — load() would reset it
      el.preload = "auto";
      el.load();
    };
    const idle = window.setTimeout(preload, 2500);

    // Browsers only allow sound after a real gesture, so start on the first one (unless it was muted).
    const events = ["pointerdown", "keydown", "touchend"] as const;
    const onGesture = (e: Event) => {
      if ((e.target as Element | null)?.closest?.("[data-sound-toggle]")) return; // the button handles itself
      if (wanted.current && el.paused) void start();
      cleanup();
    };
    const cleanup = () => events.forEach((n) => window.removeEventListener(n, onGesture, true));
    events.forEach((n) => window.addEventListener(n, onGesture, true));
    // Some browsers (and returning visitors) allow it straight away
    if (wanted.current) void start().then((ok) => ok && cleanup());

    // Don't keep playing in a hidden tab
    const onVisibility = () => {
      if (document.hidden) {
        resumeOnShow.current = !el.paused;
        el.pause();
      } else if (resumeOnShow.current && wanted.current) {
        resumeOnShow.current = false;
        void el.play().catch(() => setPlaying(false));
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearTimeout(idle);
      cancelAnimationFrame(raf.current);
      cleanup();
      document.removeEventListener("visibilitychange", onVisibility);
      el.pause();
    };
  }, [start]);

  const toggle = () => {
    if (playing) {
      wanted.current = false;
      try {
        localStorage.setItem(STORAGE_KEY, "off");
      } catch {
        /* ignore */
      }
      stop();
    } else {
      wanted.current = true;
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      void start();
    }
  };

  return (
    <>
      <audio ref={audio} src={SRC} loop preload="none" />
      <button
        type="button"
        className={`sound ${playing ? "is-on" : "is-off"}`}
        data-sound-toggle
        onClick={toggle}
        aria-pressed={playing}
        aria-label={playing ? "Turn sound off" : "Turn sound on"}
        title={playing ? "Sound on — click to mute" : "Sound off — click to play"}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 9.5v5h3.6L12.5 19V5L7.6 9.5H4Z" fill="currentColor" stroke="none" />
          {playing ? (
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
