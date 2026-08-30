import Link from "next/link";
export default function NotFound() {
  return (
    <main className="wrap-narrow section" style={{ paddingTop: 160, minHeight: "70vh" }}>
      <p className="eyebrow">404</p>
      <h1 className="h1">Ez az oldal nincs meg.</h1>
      <p className="lead">Lehet, hogy elköltözött, vagy elgépelted a címet.</p>
      <p><Link href="/" className="btn btn-primary">Vissza a főoldalra</Link></p>
    </main>
  );
}
