/**
 * Válogatott fotók: forrásfájl → slug. A slug lesz a fájlnév a public/images/photos alatt.
 * Ide csak az kerül, ami a kurált fotóelemzésben (docs/PHOTOS.md) átment.
 */
export const SOURCE_ROOT = "/Volumes/Samsung 1TB SSD/Pictures/Képek/2026/Gyűrüs";

export const PHOTOS = [
  { src: "DJI_0719.jpg",  slug: "dron-naplemente-v",      alt: "Drónfelvétel naplementében: lovasok V-alakban a gyűrűsi versenypályán, két oldalt nézők", maxEdge: 2400 },
  { src: "DJI_0733.jpg",  slug: "dron-naplemente-sorfal", alt: "Drónfelvétel: lovas sorfal a pályán a lenyugvó nap előtt, a Zalai-dombság erdőivel", maxEdge: 2400 },
  { src: "DJI_0748.jpg",  slug: "dron-palya",             alt: "Madártávlatból a gyűrűsi pálya, felsorakozott lovasokkal és a ménes épületeivel", maxEdge: 2000 },
  { src: "_42A4702.jpg",  slug: "osveny-ugras-gyuru",     alt: "Hucul Ösvény feladat: lovas ugratás közben nyúl a gyűrűért", maxEdge: 2000 },
  { src: "_42A4658.jpg",  slug: "osveny-ugras-gyerek",     alt: "Gyerek lovas pej huculon ugrat a gyűrűs akadályon, a háttérben nézők a sátor alatt", maxEdge: 1600 },
  { src: "_42A4694.jpg",  slug: "osveny-ugras-allo",      alt: "Hucul ló és lovasa ugrás közben a Hucul Ösvény akadályán", maxEdge: 1600 },
  { src: "_42A5066.jpg",  slug: "osveny-kosar",           alt: "Lovas kosárral a kezében a Hucul Ösvény ügyességi feladatán", maxEdge: 1600 },
  { src: "_42A4842.jpg",  slug: "istallo-lofej",          alt: "Pej ló feje közelről a világos istállóban, szalmán", maxEdge: 1600 },
  { src: "_42A4903.jpg",  slug: "csiko-portre",           alt: "Fiatal csikó fejportréja, anyja mellett az istállóban", maxEdge: 1600 },
  { src: "_42A4936.jpg",  slug: "lany-es-lo",             alt: "Fiatal nő narancssárga kötőfékes pej lóval a karám mellett", maxEdge: 1600 },
  { src: "_42A4969.jpg",  slug: "palya-szalmabalak",      alt: "A versenypálya messziről: szalmabálák, lovasok és nézők a domboldal alatt", maxEdge: 2000 },
  { src: "_42A5113.jpg",  slug: "hucul-fej-gyerek",       alt: "Sötét hucul ló feje közelről, nyergében gyerek lovas", maxEdge: 1600 },
  { src: "_42A5123.jpg",  slug: "gyerek-lovas",           alt: "Gyerek lovas fakó huculon, sisakban, a pálya szélén", maxEdge: 1600 },
  { src: "_42A5141.jpg",  slug: "lovas-fako-hucul",       alt: "Fiatal nő fakó hucul lovon, a háttérben nézők", maxEdge: 1600 },
  { src: "_42A5249.jpg",  slug: "fekete-men",             alt: "Fekete hucul mén oldalról, kézen bemutatva a pályán", maxEdge: 2000 },
  { src: "_42A5260.jpg",  slug: "feher-lo-szabadon",      alt: "Fehér ló szabadon fut a bemutatón, mellette futó vezető", maxEdge: 1600 },
  { src: "_42A5300.jpg",  slug: "ket-lo-taj",             alt: "Két sötét hucul kézen vezetve, a háttérben a zalai erdős dombok", maxEdge: 2000 },
  { src: "_42A5306.jpg",  slug: "lo-es-no-bokeh",         alt: "Fekete ló feje és fiatal nő, aki a kantárt fogja, zöld háttérrel", maxEdge: 2000 },
  { src: "_42A5352.jpg",  slug: "csikos-agaskodo",        alt: "Csikósbemutató: ágaskodó hucul ló a csikós mellett", maxEdge: 1600 },
  { src: "_42A5565.jpg",  slug: "csikos-portre",          alt: "Csikós hagyományos bő gatyában, kalapban, lova nyergében", maxEdge: 2000 },
  { src: "_42A5578.jpg",  slug: "csikos-vagta-satrak",    alt: "Vágtató csikós a pályán, a háttérben sátrak és nézők", maxEdge: 1600 },
  { src: "_42A5689.jpg",  slug: "csikos-vagta-kek",       alt: "Csikós vágtában, kék kendővel a kezében", maxEdge: 2000 },
  { src: "_42A5721.jpg",  slug: "aranyfeny-lovas-gyerek", alt: "Ellenfényben lovas és gyerek a ló mellett, esti aranyfényben", maxEdge: 1600 },
  { src: "_42A5725.jpg",  slug: "aranyfeny-sorfal",       alt: "Fiatal lovasok sorban, esti ellenfényben, porban", maxEdge: 2400 },
  { src: "_BF_0833.jpg",  slug: "sorfal-eg",              alt: "Lovas sorfal a pályán, felette kék ég, mögötte erdős dombok", maxEdge: 2400 },
  { src: "_BF_0843.jpg",  slug: "lovas-feher-ruha",       alt: "Fehér ruhás nő fogja egy hucul kantárját, a lovas gyerek a nyeregben", maxEdge: 1600 },
  { src: "_BF_0809.jpg",  slug: "kozosseg-fozes",         alt: "Vendégek beszélgetnek a napernyők alatt, a háttérben bográcsok", maxEdge: 1600 },
  { src: "_42A5268.jpg",  slug: "pej-lo-vezetve",         alt: "Pej ló kézen vezetve a bemutatón, nézők a kordonnál", maxEdge: 1600 },
];
