"use client";

/** Admin hibaképernyő. Read-only hoszton (Netlify demó) a fájlba írás bukik — ezt mondjuk ki. */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const readOnly = /EROFS|read-only|ENOENT|EACCES/i.test(error.message);
  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <h2>{readOnly ? "Ezen a demó-hoszton a mentés nem lehetséges" : "Nem sikerült a művelet"}</h2>
      <p>
        {readOnly
          ? "A demó Netlify-on fut, ahol a fájlrendszer csak olvasható: az admin minden felülete kipróbálható, de a mentés nem marad meg. Az éles verzióban a tartalomtár adatbázisra kerül, és a mentés működik."
          : error.message}
      </p>
      <div className="actions"><button className="btn btn-outline btn-sm" onClick={reset}>Vissza</button></div>
    </div>
  );
}
