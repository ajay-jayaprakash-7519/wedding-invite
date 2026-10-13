"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ringState } from "../lib/ringState";
import Countdown from "./Countdown";
import MusicToggle from "./MusicToggle";
import RsvpForm from "./RsvpForm";

gsap.registerPlugin(ScrollTrigger);

const Scene = dynamic(() => import("./Scene"), { ssr: false });

const VERSE =
  "So they are no longer two but one flesh. What therefore God has joined together, let not man separate.";

const START_FALLBACK_MS = 4000; // start the intro even if the photo is slow to arrive

// Where the ring sits for each section. x / y are fractions of half the viewport.
// `split` 1 = two rings (linked); `anchor` 1 = linked pair locked onto the slot between the names;
// `dates` 1 = the pair has come apart and each ring sits in a gap of the date.
type Pose = { x: number; y: number; scale: number; opacity: number; split: number; anchor: number; dates: number };
const HERO: Pose = { x: 0, y: 0, scale: 0.85, opacity: 1, split: 0, anchor: 0, dates: 0 };
// Ring eases up to this once the verse starts to appear underneath it
const HERO_READ: Pose = { x: 0, y: 0.3, scale: 0.75, opacity: 1, split: 0, anchor: 0, dates: 0 };
const POSES: Record<string, { desktop: Pose; mobile: Pose }> = {
  names: {
    desktop: { x: 0, y: 0, scale: 0.6, opacity: 1, split: 1, anchor: 1, dates: 0 },
    mobile: { x: 0, y: 0, scale: 0.6, opacity: 1, split: 1, anchor: 1, dates: 0 },
  },
  // The two rings come to rest in the date and stay there — nothing follows after this.
  countdown: {
    desktop: { x: 0, y: 0, scale: 0.35, opacity: 1, split: 1, anchor: 1, dates: 1 },
    mobile: { x: 0, y: 0, scale: 0.4, opacity: 1, split: 1, anchor: 1, dates: 1 },
  },
};

function Words({ text }: { text: string }) {
  return (
    <>
      {text.split(" ").map((w, i, arr) => (
        <span className="word" key={i}>
          {w}
          {i < arr.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}

function Chars({ text }: { text: string }) {
  return (
    <span aria-label={text}>
      {text.split("").map((c, i) => (
        <span className="char" aria-hidden="true" key={i}>
          {c}
        </span>
      ))}
    </span>
  );
}

export default function Experience() {
  const root = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  const splashImg = useRef<HTMLImageElement>(null);

  // No loading screen: the photo is the first thing you see. Start the intro once it has loaded.
  useEffect(() => {
    const img = splashImg.current;
    if (img?.complete && img.naturalWidth) setLive(true);
    const t = setTimeout(() => setLive(true), START_FALLBACK_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle("is-locked", !live);
    return () => html.classList.remove("is-locked");
  }, [live]);

  useEffect(() => {
    if (!live || !root.current) return;
    const q = gsap.utils.selector(root);
    const mm = gsap.matchMedia();
    const tickers: (() => void)[] = [];
    const cleanups: (() => void)[] = [];

    const ctx = gsap.context(() => {
      // ---- Intro: the photo settles in and the names come in ----
      html().classList.add("is-locked");
      const stage = gsap.timeline({ defaults: { ease: "power3.out" } });
      stage
        .to(ringState, { dust: 1, duration: 3, ease: "power3.inOut" }, 0.6)
        // photo settles in from a slow, soft zoom
        .fromTo(q(".splash__img"), { scale: 1.22, filter: "brightness(0.55) blur(6px)" }, { scale: 1.04, filter: "brightness(1) blur(0px)", duration: 4.2, ease: "power2.out" }, 0)
        .fromTo(q(".splash__shade"), { opacity: 0 }, { opacity: 1, duration: 2.4, ease: "power2.inOut" }, 0.4)
        .fromTo(q(".petals i"), { opacity: 0 }, { opacity: 1, duration: 2.5, stagger: 0.15, ease: "none" }, 1.2)
        // "THE WEDDING OF"
        .fromTo(q(".splash__eyebrow"), { opacity: 0, letterSpacing: "0.9em", y: 10 }, { opacity: 1, letterSpacing: "0.42em", y: 0, duration: 2.2, ease: "power3.out" }, 1.3)
        // names rise letter by letter
        .fromTo(
          q(".splash__name .char"),
          { opacity: 0, yPercent: 70, rotateX: -60, filter: "blur(10px)" },
          { opacity: 1, yPercent: 0, rotateX: 0, filter: "blur(0px)", duration: 1.7, stagger: 0.085, ease: "power3.out" },
          1.7,
        )
        .fromTo(q(".splash__amp"), { opacity: 0, scale: 0.3, rotate: -25, filter: "blur(8px)" }, { opacity: 1, scale: 1, rotate: 0, filter: "blur(0px)", duration: 1.8, ease: "back.out(1.7)" }, 2.5)
        // ornament draws itself
        .fromTo(q(".splash__ornament .draw"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2, ease: "power2.inOut", stagger: 0.1 }, 3.1)
        .fromTo(q(".splash__ornament .gem"), { opacity: 0, scale: 0.2, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 1.2, ease: "back.out(2)" }, 3.6)
        .fromTo(q(".splash__date"), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 1.6 }, 4)
        .fromTo(q(".splash .cue"), { opacity: 0 }, { opacity: 1, duration: 1.4, ease: "none" }, 4.6)
        .fromTo(q(".hero .cue"), { opacity: 0 }, { opacity: 1, duration: 1.4, ease: "none" }, 1.6);
      gsap.delayedCall(3.4, () => {
        html().classList.remove("is-locked");
        ScrollTrigger.refresh();
      });

      // Splash drifts and fades as you scroll into the page
      gsap.to(q(".splash__img"), {
        yPercent: 14,
        scale: 1.16,
        ease: "none",
        scrollTrigger: { trigger: "#splash", start: "top top", end: "bottom top", scrub: true },
      });
      gsap.to(q(".splash__content"), {
        yPercent: -22,
        opacity: 0,
        ease: "none",
        scrollTrigger: { trigger: "#splash", start: "top top", end: "bottom 35%", scrub: true },
      });

      // Gentle pointer parallax on the photo (desktop)
      const onMove = (e: PointerEvent) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;
        gsap.to(q(".splash__media"), { x: x * -14, y: y * -10, duration: 1.2, ease: "power2.out" });
      };
      window.addEventListener("pointermove", onMove);
      cleanups.push(() => window.removeEventListener("pointermove", onMove));

      // ---- Verse: the hero pins and the words appear as you scroll ----
      gsap
        .timeline({
          scrollTrigger: { trigger: "#hero", start: "top top", end: "+=170%", pin: true, scrub: 0.8 },
        })
        .to(q(".hero .cue"), { opacity: 0, duration: 0.15, ease: "none" }, 0)
        .to(ringState, { ...HERO_READ, duration: 1, ease: "none" }, 0)
        .fromTo(
          q(".verse .word"),
          { opacity: 0, y: 14, filter: "blur(10px)" },
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.5, stagger: 0.12, ease: "none" },
          0.1,
        )
        .fromTo(q(".verse__q"), { opacity: 0 }, { opacity: 0.8, duration: 0.5, stagger: 3.6, ease: "none" }, 0.1)
        .fromTo(q(".verse__cite"), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: "none" }, ">0.05")
        .to({}, { duration: 0.6 }); // hold the finished verse for a beat

      // ---- Scroll: ring travels between sections and turns with the page ----
      mm.add("(min-width: 900px)", () => buildScroll("desktop"));
      mm.add("(max-width: 899px)", () => buildScroll("mobile"));

      function buildScroll(kind: "desktop" | "mobile") {
        let prev: Pose = HERO_READ;
        for (const id of Object.keys(POSES)) {
          const next = POSES[id][kind];
          gsap.fromTo(
            ringState,
            { ...prev },
            {
              ...next,
              ease: "none",
              immediateRender: false,
              scrollTrigger: {
                trigger: `#${id}`,
                start: "top bottom",
                end: "top 35%",
                scrub: 1,
              },
            },
          );
          prev = next;
        }
        gsap.fromTo(
          ringState,
          { scrollRot: 0 },
          {
            scrollRot: Math.PI * 8,
            ease: "none",
            immediateRender: false,
            scrollTrigger: { trigger: root.current, start: "top top", end: "bottom bottom", scrub: 1.2 },
          },
        );
      }

      // ---- Generic reveals ----
      gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 46 },
          {
            opacity: 1,
            y: 0,
            duration: 1.3,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          },
        );
      });
      gsap.utils.toArray<HTMLElement>(".arch").forEach((card) => {
        const frame = card.querySelector(".arch__frame");
        const img = card.querySelector(".arch__img");
        const lines = card.querySelectorAll(".arch__inner > *");
        gsap
          .timeline({ scrollTrigger: { trigger: card, start: "top 80%", once: true } })
          .fromTo(frame, { clipPath: "inset(100% 0% 0% 0%)", y: 40 }, { clipPath: "inset(0% 0% 0% 0%)", y: 0, duration: 1.6, ease: "power3.inOut" }, 0)
          .fromTo(img, { scale: 1.18 }, { scale: 1, duration: 2.2, ease: "power3.out" }, 0)
          .fromTo(lines, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1, stagger: 0.12, ease: "power2.out" }, 0.9);
      });
      const rsvpCard = q(".rsvp__card")[0];
      if (rsvpCard) {
        const parts = rsvpCard.querySelectorAll(".rsvp__form > *");
        gsap
          .timeline({ scrollTrigger: { trigger: rsvpCard, start: "top 82%", once: true } })
          .fromTo(rsvpCard, { clipPath: "inset(100% 0% 0% 0%)", y: 40 }, { clipPath: "inset(0% 0% 0% 0%)", y: 0, duration: 1.6, ease: "power3.inOut" }, 0)
          .fromTo(parts, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1, stagger: 0.1, ease: "power2.out" }, 0.9);
      }
      gsap.utils.toArray<HTMLElement>(".rule").forEach((el) => {
        gsap.fromTo(
          el,
          { scaleX: 0 },
          { scaleX: 1, duration: 1.6, ease: "power3.inOut", scrollTrigger: { trigger: el, start: "top 90%", once: true } },
        );
      });
      gsap.utils.toArray<HTMLElement>(".names__name").forEach((el) => {
        gsap.fromTo(
          el.querySelectorAll(".char"),
          { opacity: 0, yPercent: 60, rotateX: -50, filter: "blur(6px)" },
          {
            opacity: 1,
            yPercent: 0,
            rotateX: 0,
            filter: "blur(0px)",
            duration: 1.5,
            stagger: 0.09,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 85%", once: true },
          },
        );
      });
      gsap.utils.toArray<HTMLElement>(".parallax").forEach((el) => {
        gsap.to(el, {
          yPercent: -18,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
        });
      });
      // Keep the ring locked onto the slot between the two names (it moves with the page)
      const slot = q(".names__link")[0];
      const dateSlots = q(".date__slot");
      const trackSlot = () => {
        const r = slot.getBoundingClientRect();
        const vw = document.documentElement.clientWidth;
        ringState.ax = ((r.left + r.width / 2) / vw) * 2 - 1;
        ringState.ay = -(((r.top + r.height / 2) / window.innerHeight) * 2 - 1);
        ringState.anchorPx = r.width * 0.95;
        const [d1, d2] = dateSlots;
        const r1 = d1.getBoundingClientRect();
        const r2 = d2.getBoundingClientRect();
        ringState.d1x = ((r1.left + r1.width / 2) / vw) * 2 - 1;
        ringState.d1y = -(((r1.top + r1.height / 2 + r1.height * 0.08) / window.innerHeight) * 2 - 1);
        ringState.d2x = ((r2.left + r2.width / 2) / vw) * 2 - 1;
        ringState.d2y = -(((r2.top + r2.height / 2 + r2.height * 0.08) / window.innerHeight) * 2 - 1);
        ringState.dpx = r1.width * 0.55;
      };
      gsap.ticker.add(trackSlot);
      tickers.push(trackSlot);
    }, root);

    return () => {
      cleanups.forEach((c) => c());
      tickers.forEach((t) => gsap.ticker.remove(t));
      mm.revert();
      ctx.revert();
    };
  }, [live]);

  return (
    <div ref={root} className={`experience ${live ? "is-live" : ""}`}>
      <Scene />
      <MusicToggle />

      <main className="page">
        {/* 0 — Splash */}
        <section id="splash" className="splash">
          <div className="splash__media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={splashImg}
              className="splash__img"
              src="/images/wedding.jpg"
              alt=""
              fetchPriority="high"
              onLoad={() => setLive(true)}
              onError={() => setLive(true)}
            />
          </div>
          <div className="splash__shade" aria-hidden="true" />
          <div className="petals" aria-hidden="true">
            {Array.from({ length: 16 }, (_, i) => (
              <i key={i} style={{ ["--i" as string]: i } as React.CSSProperties} />
            ))}
          </div>
          <div className="splash__content">
            <p className="splash__eyebrow">The Wedding of</p>
            <h1 className="splash__names" aria-label="Jomal and Swarna">
              <span className="splash__name">
                <Chars text="Jomal" />
              </span>
              <span className="splash__amp" aria-hidden="true">
                &amp;
              </span>
              <span className="splash__name">
                <Chars text="Swarna" />
              </span>
            </h1>
            <svg className="splash__ornament" viewBox="0 0 320 40" fill="none" aria-hidden="true">
              <path className="draw" pathLength="1" d="M8 22 C 40 22 52 8 84 16 S 126 30 140 20" />
              <path className="draw" pathLength="1" d="M312 22 C 280 22 268 8 236 16 S 194 30 180 20" />
              <g className="gem">
                <rect x="150" y="10" width="20" height="20" transform="rotate(45 160 20)" />
                <rect x="156" y="16" width="8" height="8" fill="currentColor" stroke="none" transform="rotate(45 160 20)" />
              </g>
            </svg>
            <p className="splash__date">24 · 10 · 2026 &nbsp;—&nbsp; Fort Kochi</p>
          </div>
          <div className="cue cue--light" aria-hidden="true">
            <span>Scroll</span>
            <i />
          </div>
        </section>

        {/* 1 — Scripture */}
        <section id="hero" className="hero">
          <div className="hero__inner">
            <blockquote className="verse">
              <p>
                <span className="verse__q">“</span>
                <Words text={VERSE} />
                <span className="verse__q">”</span>
              </p>
              <cite className="verse__cite">— Mark 10:9</cite>
            </blockquote>
          </div>
          <div className="cue" aria-hidden="true">
            <span>Scroll to begin</span>
            <i />
          </div>
        </section>

        {/* 2 — Names & families */}
        <section id="names" className="section names">
          <p className="eyebrow reveal">The families of</p>
          <h2 className="names__title">
            <span className="names__name">
              <Chars text="Jomal" />
            </span>
            <span className="names__link" role="img" aria-label="and">
              <span className="sr-only">and</span>
            </span>
            <span className="names__name">
              <Chars text="Swarna" />
            </span>
          </h2>
          <div className="rule" />
          <p className="eyebrow reveal">request the honour of your presence at their wedding</p>

          <div className="families">
            <article className="family reveal">
              <h2>Jomal George</h2>
              <p className="family__rel">S/o Joise George and George KS</p>
              <p className="family__home">Kaippanplackal House</p>
            </article>
            <span className="family__join ornament" aria-hidden="true">
              ✦
            </span>
            <article className="family reveal">
              <h2>Swarna Joseph</h2>
              <p className="family__rel">D/o Melsy Joseph and (Late) Thomas Joseph</p>
              <p className="family__home">Puthenpurackal</p>
            </article>
          </div>

          <p className="wishes reveal">
            With love &amp; best wishes
            <strong>
              Joshila George <em>·</em> Varna Joseph
            </strong>
          </p>
        </section>

        {/* 3 — Countdown */}
        <section id="countdown" className="section countdown-section">
          <p className="eyebrow reveal">Counting down to</p>
          <p className="bigdate reveal">
            <span className="sr-only">24 October 2026</span>
            <span aria-hidden="true">24</span>
            <span className="date__slot" aria-hidden="true" />
            <span aria-hidden="true">10</span>
            <span className="date__slot" aria-hidden="true" />
            <span aria-hidden="true">2026</span>
          </p>
          <div className="reveal">
            <Countdown />
          </div>
        </section>

        {/* 4 — Details */}
        <section id="details" className="section details">
          <p className="eyebrow reveal">You are cordially invited</p>
          <h2 className="heading reveal">The Celebration</h2>
          <div className="rule" />
          <p className="lede reveal">
            Join us for our wedding party following the wedding ceremony, as we celebrate our new beginning with love,
            joy, and togetherness.
          </p>

          <div className="arches">
            {/* Card 1 — when & where */}
            <article className="arch">
              <div className="arch__frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="arch__img" src="/images/arch.jpg" width={1024} height={1536} alt="" loading="lazy" />
                <div className="arch__inner">
                  <p className="arch__eyebrow">Invitation for Wedding</p>
                  <span className="arch__rule" />
                  <p className="arch__day">Saturday</p>
                  <p className="arch__num">24</p>
                  <p className="arch__month">October 2026</p>
                  <span className="arch__rule" />
                  <p className="arch__place">Fort Kochi</p>
                </div>
              </div>
            </article>

            {/* Card 2 — the venue */}
            <article className="arch">
              <div className="arch__frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="arch__img" src="/images/arch.jpg" width={1024} height={1536} alt="" loading="lazy" />
                <div className="arch__inner">
                  <p className="arch__eyebrow">Wedding Party</p>
                  <span className="arch__rule" />
                  <h3 className="arch__venue">George Hall</h3>
                  <p className="arch__addr">Thouppumpadi</p>
                  <span className="arch__rule" />
                  <p className="arch__time">6:30 pm</p>
                  <p className="arch__note">Following the ceremony</p>
                  <a
                    className="arch__btn"
                    href="https://www.google.com/maps/search/?api=1&query=George+Hall+Thouppumpadi+Kochi"
                    target="_blank"
                    rel="noreferrer"
                  >
                    View on map
                  </a>
                </div>
              </div>
            </article>
          </div>
        </section>

        {/* 5 — RSVP */}
        <section id="rsvp" className="section rsvp">
          <p className="eyebrow reveal">Kindly reply</p>
          <h2 className="heading reveal">RSVP</h2>
          <div className="rule" />
          <p className="lede reveal">
            Let us know if you can make it so we can save you a seat. Your presence is the greatest gift we could ask
            for.
          </p>
          <div className="rsvp__card">
            <RsvpForm />
          </div>
        </section>
      </main>
    </div>
  );
}

function html() {
  return document.documentElement;
}
