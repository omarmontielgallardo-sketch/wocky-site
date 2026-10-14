import Link from 'next/link';

export function Mark({ anim = false, gradient = true }: { anim?: boolean; gradient?: boolean }) {
  return (
    <svg className={'mark' + (anim ? ' anim' : '')} viewBox="0 0 48 48" aria-hidden="true">
      {gradient && <defs><linearGradient id="tmg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6c5cff" /><stop offset="1" stopColor="#00c2a8" /></linearGradient></defs>}
      <rect width="48" height="48" rx="13" fill="url(#tmg)" />
      <g className="bell"><circle cx="24" cy="10.5" r="2.3" fill="#fff" /><path d="M24 12.5c-6.2 0-9.8 4.5-9.8 10.2v5.6l-3.2 4.7v1.5h26v-1.5l-3.2-4.7v-5.6c0-5.7-3.6-10.2-9.8-10.2z" fill="#fff" /><path d="M20.3 36.8a3.7 3.7 0 0 0 7.4 0z" fill="#d9d5ff" /></g>
      <g className="seal"><circle cx="35.5" cy="13" r="6.3" fill="#14142b" stroke="#fff" strokeWidth="1.8" /><path className="chk" d="M32.4 13.3l2.1 2.1 3.9-4.4" fill="none" stroke="#2ff0cf" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></g>
    </svg>
  );
}

export function Logo({ anim = false, gradient = true }: { anim?: boolean; gradient?: boolean }) {
  return (
    <Link href="/" className="logo" aria-label="Timbro, inicio">
      <Mark anim={anim} gradient={gradient} />
      <span className="word">timbro</span>
    </Link>
  );
}
