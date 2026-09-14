"use client";

import { useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/Reveal";
import type { Dictionary, Lang } from "@/content/types";
import type { GoogleReview, GoogleReviews } from "@/lib/google-reviews";

/**
 * Google-értékelések a főoldalon — a Google szabályai szerint élőben (src/lib/google-reviews.ts).
 * A szerver csak ezt az üres vázat rendereli (és csak GOOGLE_PLACES_KEY mellett); az adatot a böngésző kéri
 * a /api/reviews-tól, de csak amikor a blokk 600 px-en belül van — aki nem görget idáig, annak nincs Google-hívás.
 * Hiba, elfogyott napi keret (429) vagy kulcs nélküli szerver (404) esetén a blokk eltűnik.
 * Megjelenés a szabály szerint: „Google Maps" jelzés (nem fordítjuk, nem törjük), szerzőnként avatar + név + profil-link,
 * lefordított véleménynél jelölés és az eredeti szöveg. Mobilon a kártyák oldalra lapozhatók, hogy a főoldal ne nőjön.
 */
const NEAR_PX = 600;
type Labels = Dictionary["reviews"];
type State = { s: "idle" } | { s: "ok"; data: GoogleReviews } | { s: "gone" };

export function Reviews({ lang, locale, d }: { lang: Lang; locale: string; d: Labels }) {
  const ref = useRef<HTMLElement>(null);
  const [st, setSt] = useState<State>({ s: "idle" });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const ctrl = new AbortController();
    let started = false;
    let io: IntersectionObserver | undefined;
    const stop = () => { io?.disconnect(); window.removeEventListener("scroll", check); window.removeEventListener("resize", check); };
    const load = () => {
      if (started) return;
      started = true; stop();
      fetch(`/api/reviews?lang=${lang}`, { cache: "no-store", signal: ctrl.signal })
        .then(async (res) => {
          const j = (await res.json().catch(() => null)) as (GoogleReviews & { ok?: boolean }) | null;
          if (!res.ok || !j?.ok || !j.rating) throw new Error(`reviews ${res.status}`);
          setSt({ s: "ok", data: j });
        })
        .catch(() => { if (!ctrl.signal.aborted) setSt({ s: "gone" }); });
    };
    /* Tartalék a megfigyelő mellé: háttérfülön és egyes automatizált böngészőkben az IntersectionObserver nem tüzel. */
    function check() {
      const r = node!.getBoundingClientRect();
      if (r.top - window.innerHeight < NEAR_PX && r.bottom > -NEAR_PX) load();
    }
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) load(); }, { rootMargin: `${NEAR_PX}px 0px ${NEAR_PX}px 0px` });
      io.observe(node);
    }
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => { stop(); ctrl.abort(); };
  }, [lang]);

  if (st.s === "gone") return null;
  const data = st.s === "ok" ? st.data : null;
  return (
    <section ref={ref} id="velemenyek" className="section on-bone-2 reviews" data-reviews={data ? "loaded" : "idle"} aria-busy={!data} aria-label={data ? undefined : d.loading}>
      {/* JS nélkül nincs mit betölteni: a váz se látszódjon. */}
      <noscript><style>{"#velemenyek{display:none}"}</style></noscript>
      <div className="wrap">{data ? <Loaded data={data} locale={locale} d={d} /> : <Skeleton />}</div>
    </section>
  );
}

function Skeleton() {
  return (
    <div className="rev-skel" aria-hidden="true">
      <span className="rev-skel-line" />
      <span className="rev-skel-line rev-skel-title" />
      <span className="rev-skel-cards"><span /><span /><span /></span>
    </div>
  );
}

function Loaded({ data, locale, d }: { data: GoogleReviews; locale: string; d: Labels }) {
  const fmt = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return (
    <>
      <div className="rev-head">
        <div>
          <Reveal as="p" className="eyebrow">{d.eyebrow}</Reveal>
          <Reveal as="h2" className="h1 mask" delay={60}>{d.title}</Reveal>
        </div>
        <Reveal className="rev-score" delay={100}>
          <span className="rev-num">{fmt.format(data.rating)}</span>
          <span>
            <Stars n={data.rating} label={d.stars.replace("{n}", fmt.format(data.rating))} />
            {data.url
              ? <a href={data.url} target="_blank" rel="noopener" className="link rev-count">{d.count.replace("{n}", String(data.count))} ↗</a>
              : <span className="rev-count">{d.count.replace("{n}", String(data.count))}</span>}
            {/* A Google-jelzés: a szabály szerint „Google Maps", változatlan írásmóddal, egy sorban, fordítás nélkül. */}
            {data.url
              ? <a href={data.url} target="_blank" rel="noopener" className="rev-attr" translate="no" data-google-attribution>Google Maps</a>
              : <span className="rev-attr" translate="no" data-google-attribution>Google Maps</span>}
          </span>
        </Reveal>
      </div>
      {data.reviews.length > 0 && (
        <ul className="rev-grid" role="list" aria-label={d.listLabel} data-reviews-list>
          {data.reviews.map((r, i) => <Card key={`${r.time}-${i}`} r={r} d={d} delay={i * 60} />)}
        </ul>
      )}
      {data.url && <p className="rev-more"><a href={data.url} target="_blank" rel="noopener" className="btn btn-outline">{d.more} <Arrow /></a></p>}
    </>
  );
}

function Card({ r, d, delay }: { r: GoogleReview; d: Labels; delay: number }) {
  const [original, setOriginal] = useState(false);
  return (
    <Reveal as="li" delay={delay} className="rev-card" data-review>
      <span className="rev-top">
        {r.author.photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- next/image a saját szerverünkön át méretezné és gyorsítótárazná a Google-avatart, azt pedig nem tárolhatjuk
          <img className="rev-avatar" src={r.author.photo} alt="" width={40} height={40} loading="lazy" decoding="async" referrerPolicy="no-referrer" data-review-avatar />
        ) : (
          <span className="rev-avatar" aria-hidden="true">{r.author.name.slice(0, 1).toUpperCase()}</span>
        )}
        <span className="rev-who">
          {r.author.url ? <a href={r.author.url} target="_blank" rel="noopener noreferrer" data-review-author>{r.author.name}</a> : <span data-review-author>{r.author.name}</span>}
          {r.relative && <small>{r.relative}</small>}
        </span>
      </span>
      <Stars n={r.rating} label={d.stars.replace("{n}", String(r.rating))} />
      <p className="rev-text">{original && r.original ? r.original : r.text}</p>
      {r.original && (
        <p className="rev-tr">
          <span>{d.translated}</span>
          <button type="button" className="rev-tr-btn" aria-pressed={original} onClick={() => setOriginal((v) => !v)}>{original ? d.showTranslation : d.showOriginal}</button>
        </p>
      )}
    </Reveal>
  );
}

const Stars = ({ n, label }: { n: number; label: string }) => (
  <span className="stars" role="img" aria-label={label}>{[1, 2, 3, 4, 5].map((i) => <svg key={i} viewBox="0 0 20 20" className={i <= Math.round(n) ? "on" : ""} aria-hidden="true"><path d="M10 1.8l2.5 5.3 5.8.7-4.3 4 1.1 5.8L10 14.8l-5.1 2.8 1.1-5.8-4.3-4 5.8-.7z" /></svg>)}</span>
);
/* A Sections.tsx nyila — itt külön példány, mert az a szerveroldali tárat is behúzná a kliens-csomagba. */
const Arrow = () => <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
