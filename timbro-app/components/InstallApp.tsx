'use client';
import { useEffect, useRef, useState } from 'react';

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export default function InstallApp() {
  const dlg = useRef<HTMLDialogElement>(null);
  const [evt, setEvt] = useState<PromptEvent | null>(null);
  const [copiado, setCopiado] = useState(false);
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') navigator.serviceWorker.register('/sw.js').catch(() => {});
    const on = (e: Event) => { e.preventDefault(); setEvt(e as PromptEvent); };
    addEventListener('beforeinstallprompt', on);
    return () => removeEventListener('beforeinstallprompt', on);
  }, []);
  const click = async () => {
    if (evt) { await evt.prompt(); await evt.userChoice; setEvt(null); } else dlg.current?.showModal();
  };
  const copiar = async () => { try { await navigator.clipboard.writeText(location.origin); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* ignorar */ } };
  return (
    <>
      <button className="btn shine" type="button" onClick={click}>Descargar la app</button>
      <dialog className="legal small" ref={dlg} aria-label="Descarga la app de Timbro" onClick={e => e.target === dlg.current && dlg.current?.close()}>
        <div className="legal-head"><h2>Descarga la app de Timbro</h2><button className="x" type="button" aria-label="Cerrar" onClick={() => dlg.current?.close()}>×</button></div>
        <div className="legal-body">
          <p>Timbro se instala directamente desde el navegador de tu teléfono, sin pasar por una tienda de aplicaciones:</p>
          <ol className="how">
            <li><b>Abre Timbro</b> en tu teléfono (Safari en iPhone, Chrome en Android).</li>
            <li><b>iPhone:</b> toca Compartir y elige «Agregar a pantalla de inicio».<br /><b>Android:</b> toca el menú ⋮ y elige «Instalar app».</li>
            <li>Listo: tendrás el ícono de la campana y se abrirá como una app.</li>
          </ol>
          <p className="tiny">Las versiones para App Store y Google Play llegarán más adelante.</p>
          <div className="actions"><button className="btn sm" type="button" onClick={copiar}>{copiado ? '¡Copiado!' : 'Copiar enlace de Timbro'}</button><button className="btn ghost sm" type="button" onClick={() => dlg.current?.close()}>Cerrar</button></div>
        </div>
      </dialog>
    </>
  );
}
