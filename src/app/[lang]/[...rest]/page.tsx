import { notFound } from "next/navigation";
/** Minden ismeretlen útvonal a nyelv alatt → 404 (a nyelvi not-found lappal). */
export default function CatchAll() { notFound(); }
