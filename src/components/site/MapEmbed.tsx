"use client";

import { useState } from "react";

type Labels = { title: string; load: string; note: string; route: string; loaded: string };

/**
 * Google-térkép a kapcsolat alatt — kattintásra töltődik be. Az iframe Google-kéréseket és sütiket hoz,
 * ezért nem automatikusan: előtte egy címes kártya áll, gombbal; a betöltésről a felirat tájékoztat.
 * Nem kell API-kulcs: a klasszikus `maps?q=…&output=embed` beágyazás.
 */
export function MapEmbed({ query, address, mapUrl, lang, labels }: { query: string; address: string; mapUrl?: string; lang: string; labels: Labels }) {
  const [on, setOn] = useState(false);
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&hl=${lang}&output=embed`;
  return (
    <div className="map" data-map={on ? "loaded" : "idle"}>
      {on ? (
        <iframe className="map-frame" src={src} title={labels.title} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" />
      ) : (
        <div className="map-ph">
          <div className="map-ph-grid" aria-hidden="true" />
          <div className="map-ph-in">
            <span className="map-pin" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg></span>
            <p className="h3">{labels.title}</p>
            <p className="map-addr">{address}</p>
            <div className="map-actions">
              <button type="button" className="btn btn-primary" onClick={() => setOn(true)}>{labels.load}</button>
              {mapUrl && <a href={mapUrl} target="_blank" rel="noopener" className="btn btn-outline">{labels.route} ↗</a>}
            </div>
            <p className="map-note">{labels.note}</p>
          </div>
        </div>
      )}
      {on && mapUrl && <a href={mapUrl} target="_blank" rel="noopener" className="map-route">{labels.route} ↗</a>}
    </div>
  );
}
