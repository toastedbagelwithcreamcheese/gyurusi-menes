import { readSite } from "@/lib/store";
import { LField } from "../LField";
import { saveLegal } from "../actions";

export default async function LegalAdmin() {
  const site = await readSite(); const i = site.legal.imprint;
  /* Sima segédfüggvény (nem komponens): egy impresszum-mező. */
  const field = (k: keyof typeof i, label: string, hint?: string) => (
    <div className="field" key={k}><label htmlFor={`imprint.${k}`}>{label}</label><input id={`imprint.${k}`} name={`imprint.${k}`} className="input" defaultValue={i[k]} />{hint && <p className="hint">{hint}</p>}</div>
  );
  return (
    <>
      <div className="adm-head"><div><h1>Impresszum és adatkezelés</h1><p>A lábléc jogi oldalai. Ami üres, az nem jelenik meg — az adószámot és a nyilvántartási számot ide írd be, ha megvan.</p></div></div>
      <form action={saveLegal} className="form">
        <div className="card form">
          <h2>Impresszum</h2>
          <div className="form-row">{field("operator", "Üzemeltető")}{field("person", "Képviselő")}</div>
          {field("address", "Cím")}
          <div className="form-row">{field("email", "E-mail")}{field("phone", "Telefon")}</div>
          <div className="form-row">{field("taxId", "Adószám", "Ha van — csak akkor jelenik meg.")}{field("regNo", "Nyilvántartási szám", "Egyesületnél a bírósági nyilvántartási szám.")}</div>
          {field("hosting", "Tárhelyszolgáltató")}
        </div>
        <div className="card form">
          <h2>Adatkezelési tájékoztató</h2>
          <LField name="privacy" label="Szöveg" value={site.legal.privacy} textarea rows={14} hint="Üres sor = új bekezdés. A szöveg azt írja le, ami az oldalon valóban történik: űrlap, jelentkezés, egy nyelvi süti, Netlify tárhely." />
        </div>
        <div className="actions"><button className="btn btn-primary">Mentés</button></div>
      </form>
    </>
  );
}
