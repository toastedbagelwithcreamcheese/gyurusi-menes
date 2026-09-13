import { Reveal } from "@/components/Reveal";
import type { Dictionary } from "@/content/types";

/**
 * Illusztratív túratérkép — amíg a bejárt útvonalak pontos térképei megérkeznek. Tisztán SVG:
 * szintvonalak, erdőfoltok, a ménes mint kiindulópont, három jellemző kör. A vonalak görgetésre
 * „rajzolódnak" (CSS stroke-dashoffset a Reveal data-in állapotára). Nem valós útvonal — a felirat kimondja.
 */
const CONTOURS = [
  "M0 420 C 120 380, 200 470, 330 430 S 520 360, 640 410 S 860 470, 1000 400",
  "M0 350 C 110 320, 190 390, 300 360 S 500 300, 620 340 S 830 400, 1000 330",
  "M0 290 C 100 260, 180 320, 280 300 S 470 250, 590 280 S 800 330, 1000 270",
  "M0 230 C 90 210, 170 260, 260 240 S 450 200, 560 220 S 770 270, 1000 210",
  "M0 170 C 90 150, 160 200, 250 180 S 430 150, 540 165 S 750 210, 1000 150",
  "M0 110 C 80 95, 150 135, 230 120 S 400 100, 510 110 S 730 150, 1000 100",
  "M0 490 C 140 460, 220 530, 350 500 S 560 440, 680 480 S 880 540, 1000 470",
];
const FORESTS = [
  "M60 120 C 120 70, 230 80, 260 140 S 200 240, 120 220 S 20 190, 60 120 Z",
  "M700 70 C 780 40, 900 60, 940 130 S 880 220, 790 210 S 640 150, 700 70 Z",
  "M520 300 C 590 270, 690 300, 700 370 S 640 460, 560 440 S 450 360, 520 300 Z",
  "M160 420 C 220 390, 320 400, 330 460 S 270 540, 200 530 S 110 470, 160 420 Z",
];
const ROUTES = [
  { key: "forest", d: "M430 335 C 380 300, 300 280, 250 230 S 230 150, 300 150 S 400 230, 430 335 Z", color: "var(--color-moss)", dash: 1200 },
  { key: "ridge", d: "M430 335 C 500 300, 560 240, 640 200 S 800 140, 880 190 S 820 300, 700 300 S 520 340, 430 335 Z", color: "var(--color-straw)", dash: 1600 },
  { key: "long", d: "M430 335 C 420 400, 350 470, 240 500 S 80 520, 60 440 S 120 330, 200 360 S 380 380, 430 335 Z", color: "var(--color-sky)", dash: 1500 },
];

export function RouteMap({ d }: { d: Dictionary["route"] }) {
  return (
    <section className="route" data-route-map>
      <div className="route-head">
        <Reveal as="p" className="eyebrow">{d.eyebrow}</Reveal>
        <Reveal as="h2" className="h1 mask" delay={60}>{d.title}</Reveal>
        <Reveal as="p" className="lead" delay={100}>{d.lead}</Reveal>
      </div>
      <Reveal className="route-map" delay={120}>
        <svg viewBox="0 0 1000 560" role="img" aria-label={d.title} preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="rm-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="rgb(29 27 23 / 0.05)" strokeWidth="1" /></pattern>
            <filter id="rm-soft"><feGaussianBlur stdDeviation="14" /></filter>
          </defs>
          <rect width="1000" height="560" fill="var(--color-bone-2)" />
          <rect width="1000" height="560" fill="url(#rm-grid)" />
          {FORESTS.map((f, i) => <path key={i} d={f} fill="rgb(45 74 55 / 0.16)" filter="url(#rm-soft)" />)}
          {FORESTS.map((f, i) => <path key={`f${i}`} d={f} fill="none" stroke="rgb(45 74 55 / 0.35)" strokeWidth="1.2" strokeDasharray="3 5" />)}
          {CONTOURS.map((c, i) => <path key={i} d={c} className="route-contour" fill="none" stroke="rgb(29 27 23 / 0.16)" strokeWidth={i % 3 === 0 ? 1.4 : 0.8} />)}
          {ROUTES.map((r) => <path key={r.key} d={r.d} className="route-line" fill="none" stroke={r.color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: r.dash, strokeDashoffset: r.dash }} />)}
          {ROUTES.map((r) => <path key={`${r.key}-s`} d={r.d} fill="none" stroke="rgb(247 244 238 / 0.9)" strokeWidth="1.5" strokeDasharray="10 12" strokeLinecap="round" className="route-line route-line-dash" style={{ strokeDasharray: `10 12`, opacity: 0 }} />)}
          {[["forest", 295, 138], ["ridge", 862, 178], ["long", 78, 428]].map(([k, x, y]) => {
            const r = ROUTES.find((q) => q.key === k)!; const i = ROUTES.indexOf(r);
            return <g key={String(k)} className="route-label" style={{ transitionDelay: `${900 + i * 250}ms` }}><circle cx={Number(x)} cy={Number(y)} r="7" fill={r.color} stroke="var(--color-bone)" strokeWidth="3" /><text x={Number(x) + 14} y={Number(y) + 5} fontSize="15" fontWeight="600" fill="var(--color-ink)">{d.legend[i].name}</text></g>;
          })}
          <g className="route-start">
            <circle cx="430" cy="335" r="26" fill="var(--color-forest)" opacity="0.18" className="route-pulse" />
            <circle cx="430" cy="335" r="9" fill="var(--color-forest)" stroke="var(--color-bone)" strokeWidth="4" />
            <text x="446" y="322" fontSize="15" fontWeight="600" fill="var(--color-forest)">{d.start}</text>
            <text x="446" y="342" fontSize="12" fill="var(--color-dust)">8932 Gyűrűs</text>
          </g>
          <g fontSize="11" fill="var(--color-dust)" letterSpacing="2"><text x="24" y="540">N ↑</text><text x="900" y="540" textAnchor="end">ZALAI-DOMBSÁG</text></g>
        </svg>
      </Reveal>
      <div className="route-legend">
        {d.legend.map((l, i) => (
          <Reveal key={l.name} delay={160 + i * 80} className="route-item">
            <span className="route-swatch" style={{ background: ROUTES[i].color }} aria-hidden="true" />
            <span><b>{l.name}</b><span>{l.text}</span></span>
          </Reveal>
        ))}
      </div>
      <p className="route-note">{d.note}</p>
    </section>
  );
}
