import Image from "next/image";
import { Reveal } from "@/components/Reveal";
import { Paragraphs } from "./Sections";
import { ZoomButton, ZoomProvider } from "./Zoom";
import { resolveImage, type ImageMeta } from "@/lib/images";
import { placeholderStyle } from "@/lib/placeholder";
import { sortRoutes, t, type SiteContent, type TrailRoute } from "@/lib/store";
import type { Dictionary, Lang } from "@/content/types";

/** A Túrák lapon megjelenő útvonalak: közzétett, van magyar neve, az admin sorrendjében. Üres lista → a lap az illusztrációt adja. */
export function visibleRoutes(site: Pick<SiteContent, "routes">): TrailRoute[] {
  return sortRoutes(site.routes).filter((r) => r.published && r.name?.hu?.trim());
}

/**
 * Útvonal-kártyák a Túrák lapon (az illusztrált térkép helyén): nagy térképkép, mellette név, leírás és a fotósáv.
 * Minden kép nagyítható (a meglévő Zoom); kártyánként saját nagyító, így a lapozás az útvonal képein belül marad.
 * A nagyító rétege (position: fixed) a Reveal-en KÍVÜL áll, hogy a belépő animáció transzformja ne zárja be.
 */
export function TrailRoutes({ routes, site, lang, d }: { routes: TrailRoute[]; site: SiteContent; lang: Lang; d: Dictionary }) {
  return (
    <section className="trails" data-trails>
      <div className="route-head">
        <Reveal as="p" className="eyebrow">{d.trails.eyebrow}</Reveal>
        <Reveal as="h2" className="h1 mask" delay={60}>{d.trails.title}</Reveal>
        <Reveal as="p" className="lead" delay={100}>{d.trails.lead}</Reveal>
      </div>
      <ol className="trail-list" role="list">
        {routes.map((r, i) => <TrailCard key={r.id} route={r} n={i + 1} site={site} lang={lang} d={d} />)}
      </ol>
    </section>
  );
}

const Pic = ({ im, sizes, quality }: { im: ImageMeta; sizes: string; quality: number }) => (
  <Image src={im.src} alt={im.alt} width={im.width} height={im.height} sizes={sizes} quality={quality} style={placeholderStyle(im)} />
);

function TrailCard({ route, n, site, lang, d }: { route: TrailRoute; n: number; site: SiteContent; lang: Lang; d: Dictionary }) {
  const name = t(route.name, lang);
  const summary = t(route.summary, lang);
  const map = resolveImage(route.mapImage, site, lang);
  const photos = route.photos.map((id) => resolveImage(id, site, lang)).filter((x): x is ImageMeta => !!x);
  /* Térképkép nélkül az első fotó kerül a nagy helyre. */
  const main = map ?? photos[0] ?? null;
  const strip = map ? photos : photos.slice(1);
  const items = main ? [main, ...strip] : [];
  /* Nem „trail” osztály: az a Huculösvény-szekció meglévő, 90vh magas rácsa (globals.css). */
  return (
    <li className="trail-item" data-trail={route.id}>
      <ZoomProvider items={items} labels={d.zoom}>
        <Reveal className={`trail-card${main ? "" : " trail-card-text"}`}>
          {main && (
            <ZoomButton index={0} label={`${d.zoom.open}: ${name}${map ? ` (${d.trails.map})` : ""}`} className="trail-map">
              <Pic im={main} sizes="(max-width: 900px) 100vw, 58vw" quality={70} />
            </ZoomButton>
          )}
          <div className="trail-body">
            <p className="eyebrow">{d.trails.number.replace("{n}", String(n))}</p>
            <h3 className="h2">{name}</h3>
            {summary && <div className="trail-summary"><Paragraphs text={summary} /></div>}
            {strip.length > 0 && (
              <div className="trail-photos" role="group" aria-label={d.trails.photos} data-trail-photos>
                {strip.map((im, k) => (
                  <ZoomButton key={k} index={k + 1} label={`${d.zoom.open}: ${im.alt}`} className="trail-photo">
                    <Pic im={im} sizes="(max-width: 900px) 50vw, 20vw" quality={62} />
                  </ZoomButton>
                ))}
              </div>
            )}
          </div>
        </Reveal>
      </ZoomProvider>
    </li>
  );
}
