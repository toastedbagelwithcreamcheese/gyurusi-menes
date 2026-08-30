/** Futószalag: a ménes hucul vérvonalai és lovai — a sajtóban név szerint szereplő állatok. */
const ITEMS: Array<[string, string]> = [
  ["Pietrosu", "ménvonal"], ["Goral", "ménvonal"], ["Hroby", "ménvonal"], ["Ousor", "ménvonal"], ["Prislop", "ménvonal"],
  ["Goral Csellengő", "hucul"], ["Hroby Luna", "hucul"], ["Pietrosu Picúr", "hucul"], ["Ousor Csóka", "hucul"], ["Prislop Csermely", "hucul"],
  ["Gidran Bohém", "gidrán mén"], ["Gidran Fahéj", "gidrán kanca"], ["Gidran Rachel", "gidrán kanca"],
];
export function Marquee() {
  const row = [...ITEMS, ...ITEMS];
  return (
    <div className="marquee" aria-label="A ménes vérvonalai és lovai">
      <div className="marquee-track">
        {row.map(([n, k], i) => <span key={i} className="marquee-item" aria-hidden={i >= ITEMS.length}>{n}<small>{k}</small></span>)}
      </div>
    </div>
  );
}
