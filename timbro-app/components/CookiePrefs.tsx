'use client';
export default function CookiePrefs() {
  return <a href="#" onClick={e => { e.preventDefault(); dispatchEvent(new Event('timbro:cookies')); }}>Preferencias de cookies</a>;
}
