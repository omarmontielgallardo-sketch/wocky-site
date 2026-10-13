// Cálculo de impuestos: giro, retenciones, estimación de IVA/ISR por régimen, simulador, calculadora y consejos.
// Funciones puras (sin DOM ni red) para poder probarlas. Es una estimación informativa: confirma con tu contador.

const LIMPIAR = (v: string) => String(v).toUpperCase().replace(/[^A-ZÑ&0-9]/g, '').slice(0, 13);
const GENERICOS = ['XAXX010101000', 'XEXX010101000'];

export type IvaTipo = '16' | '8' | '0' | 'exento';
export type ConfigImp = { iva: IvaTipo; isr: number; ivaRet: number; ieps: number; ish: number };
export type Giro = { n: string; iva: IvaTipo; ret?: 'prof' | 'arr' | 'transp'; ieps?: number; ish?: number };

export const GIROS: Record<string, Giro> = {
  general: { n: 'Otro / general', iva: '16' },
  profesional: { n: 'Servicios profesionales y honorarios', iva: '16', ret: 'prof' },
  tecnologia: { n: 'Tecnología, software y diseño', iva: '16', ret: 'prof' },
  comercio: { n: 'Comercio y venta de mercancías', iva: '16' },
  restaurante: { n: 'Restaurantes y alimentos preparados', iva: '16' },
  alimentos0: { n: 'Alimentos básicos y medicinas (tasa 0%)', iva: '0' },
  construccion: { n: 'Construcción y servicios generales', iva: '16' },
  arrendamiento: { n: 'Arrendamiento de locales y oficinas', iva: '16', ret: 'arr' },
  casahab: { n: 'Arrendamiento de casa habitación', iva: 'exento' },
  educacion: { n: 'Educación con RVOE', iva: 'exento' },
  salud: { n: 'Servicios médicos y de salud', iva: 'exento' },
  transporte: { n: 'Transporte terrestre de carga', iva: '16', ret: 'transp' },
  agro: { n: 'Agricultura, ganadería y pesca', iva: '0' },
  hospedaje: { n: 'Hospedaje y turismo', iva: '16', ish: 0.03 },
  licores: { n: 'Bebidas alcohólicas y tabaco (IEPS)', iva: '16', ieps: 0.265 },
  exportacion: { n: 'Exportación de bienes o servicios', iva: '0' },
};
export const giroDe = (k?: string | null): Giro => GIROS[k ?? 'general'] ?? GIROS.general;

export const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const pct = (n: number) => (Math.round(n * 10000) / 100).toLocaleString('es-MX') + '%';

/** Sugiere los impuestos según el giro, el régimen del emisor y el tipo de cliente. */
export function impuestosSugeridos(giroKey: string, regimen: string, rfcEmisor: string, rfcReceptor: string): { cfg: ConfigImp; nota: string } {
  const giro = giroDe(giroKey), reg = regimen.split(' ')[0];
  const emisorPF = LIMPIAR(rfcEmisor).length === 13, rc = LIMPIAR(rfcReceptor), receptorPM = rc.length === 12 && !GENERICOS.includes(rc);
  const cfg: ConfigImp = { iva: giro.iva, isr: 0, ivaRet: 0, ieps: giro.ieps ?? 0, ish: giro.ish ?? 0 };
  const motivos = [`Sugerido para «${giro.n}»`];
  if (receptorPM && giro.ret) {
    if ((giro.ret === 'prof' || giro.ret === 'arr') && emisorPF) {
      cfg.isr = reg === '626' ? 0.0125 : 0.10; cfg.ivaRet = 0.106667;
      motivos.push(`tu cliente es persona moral y tú persona física: te retiene ISR ${pct(cfg.isr)} e IVA 2/3`);
    }
    if (giro.ret === 'transp') { cfg.ivaRet = 0.04; motivos.push('tu cliente es persona moral: retiene 4% de IVA por autotransporte'); }
  }
  if (cfg.iva === 'exento') cfg.ivaRet = 0;
  if (giro.ieps) motivos.push('la tasa de IEPS depende del producto; ajústala');
  if (giro.ish) motivos.push('el impuesto sobre hospedaje varía por estado; ajústalo');
  return { cfg, nota: motivos.join(' · ') + '. Confirma con tu contador.' };
}

export type Desglose = { sub: number; ieps: number; ish: number; iva: number; isr: number; ivaRet: number; total: number };
export function desglosar(sub: number, c: ConfigImp): Desglose {
  sub = r2(sub);
  const ieps = r2(sub * c.ieps), ish = r2(sub * c.ish), tasa = c.iva === 'exento' ? 0 : Number(c.iva) / 100;
  const iva = r2((sub + ieps) * tasa), isr = r2(sub * c.isr), ivaRet = r2(sub * c.ivaRet);
  return { sub, ieps, ish, iva, isr, ivaRet, total: r2(sub + ieps + ish + iva - isr - ivaRet) };
}
export const subtotalLineas = (ls: { cantidad: number; precio: number }[]) => r2(ls.reduce((t, l) => t + r2(l.cantidad * l.precio), 0));

/** Calculadora: lo que debes facturar para recibir un neto, o quitar el IVA a un total. */
export type ModoCalc = 'neto' | 'desglosar' | 'agregar';
export function calculadora(modo: ModoCalc, valor: number, c: ConfigImp, ivaDesglose: number): { filas: [string, number, string?][]; sub: number } {
  const v = Math.max(valor || 0, 0);
  if (!v) return { filas: [], sub: 0 };
  if (modo === 'desglosar') {
    const sub = r2(v / (1 + ivaDesglose / 100));
    return { filas: [['Subtotal', sub], [`IVA ${ivaDesglose}%`, r2(v - sub)], ['Total', v, 'grand']], sub };
  }
  const tasa = c.iva === 'exento' ? 0 : Number(c.iva) / 100;
  const factor = 1 + c.ieps + c.ish + (1 + c.ieps) * tasa - c.isr - c.ivaRet;
  const sub = modo === 'neto' ? r2(v / factor) : r2(v);
  const d = desglosar(sub, c);
  const filas: [string, number, string?][] = [[modo === 'neto' ? 'Subtotal a facturar' : 'Subtotal', d.sub]];
  if (d.ieps) filas.push(['IEPS', d.ieps]);
  if (d.ish) filas.push(['Impuesto sobre hospedaje', d.ish]);
  filas.push([c.iva === 'exento' ? 'IVA (exento)' : `IVA ${c.iva}%`, d.iva]);
  if (d.isr) filas.push([`Retención ISR ${pct(c.isr)}`, -d.isr]);
  if (d.ivaRet) filas.push([`Retención IVA ${pct(c.ivaRet)}`, -d.ivaRet]);
  filas.push([modo === 'neto' ? 'Total que recibes' : 'Total', d.total, 'grand']);
  return { filas, sub: d.sub };
}

// ---------- Estimación mensual de IVA e ISR ----------
// Tarifa mensual del art. 96 LISR (Anexo 8 RMF 2026): [límite inferior, cuota fija, % sobre el excedente]. Verifica el Anexo 8 vigente.
export const TARIFA_2026: [number, number, number][] = [[0.01, 0, 1.92], [844.60, 16.22, 6.40], [7168.52, 420.95, 10.88], [12598.03, 1011.68, 16.00], [14644.65, 1339.14, 17.92], [17533.65, 1856.84, 21.36],
  [35362.84, 5665.16, 23.52], [55736.69, 10457.09, 30.00], [106410.51, 25659.23, 32.00], [141880.67, 37009.69, 34.00], [425642.00, 133488.54, 35.00]];
// RESICO personas físicas (art. 113-E LISR): ingresos cobrados del mes hasta [tope, tasa].
export const RESICO_PF: [number, number][] = [[25000, 0.01], [50000, 0.011], [83333.33, 0.015], [208333.33, 0.02], [291666.67, 0.025]];
export function isrTarifa(base: number, meses: number): number {
  if (base <= 0) return 0;
  let f = TARIFA_2026[0];
  for (const r of TARIFA_2026) if (base >= r[0] * meses) f = r;
  return r2(f[1] * meses + (base - f[0] * meses) * f[2] / 100);
}
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** 'YYYY-MM' de una fecha, en hora de la Ciudad de México. */
export function claveMes(d: string | number | Date): string {
  return new Date(d).toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }).slice(0, 7);
}

export type FacturaImp = { estatus: string; fecha: string | number | Date; subtotal: number; iva: number; isr_retenido: number; iva_retenido: number };
export type RecibidaImp = { fecha: string | number | Date; subtotal: number; iva: number; deducible: boolean };
export type EntradaImp = { gastos?: number; ivaAc?: number; prev?: number; coef?: number; ded35?: boolean };
export type Simulacion = { ing: number; ivaIng: IvaTipo; gas: number; ivaGas: IvaTipo };
export type Fila = [string, number | string, string?];
export type Estimacion = {
  iva: Fila[]; isr: Fila[]; ivaNeto: number; isrPagar: number | null; total: number; nota: string; clave: string; vence: string; ivaFavor: boolean;
  gastosRec: number; ivaRec: number; ingMes: number; ivaTr: number;
};
export const REG_TXT: Record<string, [string, string]> = {
  '626': ['RESICO persona física', 'ISR sobre los ingresos cobrados del mes, sin deducciones, con la tabla del art. 113-E. Te retienen 1.25% de ISR cuando facturas a personas morales.'],
  '626m': ['RESICO persona moral', '30% sobre la utilidad de flujo de efectivo acumulada del año (ingresos menos gastos).'],
  '612': ['Actividades empresariales y profesionales', 'Pago provisional acumulado: (ingresos − deducciones) con la tarifa del art. 96 por los meses transcurridos, menos pagos previos y retenciones.'],
  '606': ['Arrendamiento', 'Ingresos acumulados menos deducciones (o la deducción opcional del 35%) con la tarifa del art. 96, menos pagos previos y retenciones.'],
  '601': ['General de Ley Personas Morales', 'Pago provisional: coeficiente de utilidad × ingresos acumulados × 30%, menos pagos previos y retenciones.'],
  '603': ['Personas morales con fines no lucrativos', 'No hay pago provisional de ISR por ingresos propios de la actividad; sí aplica IVA cuando hay actos gravados.'],
};
export const claveRegimen = (regimen: string, rfc: string) => { const reg = regimen.split(' ')[0]; return reg === '626' && LIMPIAR(rfc).length === 12 ? '626m' : reg; };

export function estimarImpuestos(periodo: string, regimen: string, rfc: string, facturas: FacturaImp[], recibidas: RecibidaImp[], inp: EntradaImp, sim?: Simulacion | null): Estimacion {
  const [yy, mm] = periodo.split('-').map(Number), reg = regimen.split(' ')[0], clave = claveRegimen(regimen, rfc);
  const emit = facturas.filter(f => f.estatus === 'timbrada');
  const mes = emit.filter(f => claveMes(f.fecha) === periodo);
  const ytd = emit.filter(f => { const k = claveMes(f.fecha); return k.slice(0, 4) === String(yy) && +k.slice(5) <= mm; });
  const sum = <T,>(a: T[], f: (x: T) => number) => r2(a.reduce((t, x) => t + f(x), 0));
  let ingMes = sum(mes, f => f.subtotal), ivaTr = sum(mes, f => f.iva), ingAcum = sum(ytd, f => f.subtotal);
  const ivaRet = sum(mes, f => f.iva_retenido), isrRetMes = sum(mes, f => f.isr_retenido), isrRetAcum = sum(ytd, f => f.isr_retenido);
  const rec = recibidas.filter(r => r.deducible);
  const recMes = rec.filter(r => claveMes(r.fecha) === periodo), recYtd = rec.filter(r => { const k = claveMes(r.fecha); return k.slice(0, 4) === String(yy) && +k.slice(5) <= mm; });
  const gastosRec = sum(recYtd, r => r.subtotal), ivaRec = sum(recMes, r => r.iva);
  let gastos = (inp.gastos || 0) + gastosRec, ivaAc = (inp.ivaAc || 0) + ivaRec;
  const prev = inp.prev || 0;
  if (sim) {
    const ti = sim.ivaIng === 'exento' ? 0 : Number(sim.ivaIng) / 100, tg = sim.ivaGas === 'exento' ? 0 : Number(sim.ivaGas) / 100;
    ingMes = r2(ingMes + sim.ing); ingAcum = r2(ingAcum + sim.ing); ivaTr = r2(ivaTr + sim.ing * ti);
    gastos = r2(gastos + sim.gas); ivaAc = r2(ivaAc + sim.gas * tg);
  }
  const ivaNeto = r2(ivaTr - ivaRet - ivaAc);
  const iva: Fila[] = [['Ingresos del mes (sin IVA)', ingMes], ['IVA trasladado en tus facturas', ivaTr], ['(−) IVA que te retuvieron', -ivaRet],
    [`(−) IVA acreditable de tus gastos${ivaRec ? ' (incluye facturas recibidas)' : ''}`, -ivaAc], [ivaNeto >= 0 ? 'IVA por pagar' : 'IVA a favor', Math.abs(ivaNeto), 'sum']];
  let isr: Fila[] = [], isrPagar: number | null = null, nota = '';
  const final = (isrPer: number) => {
    const neto = r2(isrPer - prev - isrRetAcum);
    isr.push(['(−) Pagos provisionales anteriores', -prev], ['(−) ISR que te retuvieron en el año', -isrRetAcum], [neto > 0 ? 'ISR a pagar' : 'ISR a favor / sin pago', Math.abs(neto), 'sum']);
    isrPagar = Math.max(neto, 0);
  };
  if (clave === '626') {
    const fila = RESICO_PF.find(r => ingMes <= r[0]) ?? RESICO_PF[RESICO_PF.length - 1], isrM = r2(ingMes * fila[1]), neto = r2(isrM - isrRetMes);
    isr = [['Ingresos cobrados del mes', ingMes], ['Tasa RESICO', pct(fila[1])], ['ISR del mes', isrM], ['(−) ISR que te retuvieron (1.25%)', -isrRetMes], [neto > 0 ? 'ISR a pagar' : 'ISR retenido a tu favor', Math.abs(neto), 'sum']];
    isrPagar = Math.max(neto, 0);
    if (ingMes > RESICO_PF[RESICO_PF.length - 1][0]) nota = 'Tus ingresos del mes superan el tope de la tabla mensual de RESICO; revisa tu situación con tu contador.';
    if (ingAcum > 3500000) nota = 'Tus ingresos del año superan 3.5 millones de pesos, el límite para tributar en RESICO.';
  } else if (clave === '626m') {
    const util = Math.max(r2(ingAcum - gastos), 0), isrP = r2(util * 0.30);
    isr = [['Ingresos acumulados del año', ingAcum], ['(−) Gastos deducibles acumulados', -gastos], ['Utilidad estimada', util], ['ISR al 30%', isrP]]; final(isrP);
  } else if (clave === '612' || clave === '606') {
    const ded = clave === '606' && inp.ded35 ? r2(ingAcum * 0.35) : gastos, base = Math.max(r2(ingAcum - ded), 0), isrP = isrTarifa(base, mm);
    isr = [['Ingresos acumulados del año', ingAcum], [clave === '606' && inp.ded35 ? '(−) Deducción opcional 35%' : '(−) Gastos deducibles acumulados', -ded], ['Base del pago provisional', base], [`ISR con tarifa 2026 por ${mm} ${mm === 1 ? 'mes' : 'meses'}`, isrP]]; final(isrP);
  } else if (clave === '601') {
    const coef = (inp.coef || 0) > 0 ? (inp.coef as number) : 0.2, util = r2(ingAcum * coef), isrP = r2(util * 0.30);
    isr = [['Ingresos acumulados del año', ingAcum], ['Coeficiente de utilidad', coef.toFixed(4)], ['Utilidad fiscal estimada', util], ['ISR al 30%', isrP]]; final(isrP);
    if (!((inp.coef || 0) > 0)) nota = 'Usé un coeficiente de 0.2000 de ejemplo. Captura el de tu última declaración anual.';
  } else if (clave === '603') { isr = [['ISR por ingresos de la actividad', 'No aplica']]; isrPagar = 0; }
  else { isr = [['ISR', 'Sin cálculo automático']]; nota = `Para el régimen ${reg} todavía no calculamos el ISR automáticamente; el IVA sí. ${reg === '625' ? 'Las plataformas tecnológicas retienen ISR e IVA por tus ingresos.' : 'Consulta a tu contador.'}`; }
  const due = new Date(yy, mm, 17);
  return { iva, isr, ivaNeto, isrPagar, total: r2(Math.max(ivaNeto, 0) + (isrPagar ?? 0)), nota, clave, ivaFavor: ivaNeto < 0, gastosRec, ivaRec, ingMes, ivaTr,
    vence: `Se presenta a más tardar el 17 de ${MESES[due.getMonth()]} de ${due.getFullYear()} (si es inhábil, el siguiente día hábil).` };
}

export const fmtIva = (n: number, money: (x: number) => string) => n >= 0 ? `${money(n)} por pagar` : `${money(-n)} a favor`;

/** Consejos legales para pagar menos, según tu situación. */
export function consejos(e: Estimacion, recibidas: { metodo: string; total: number }[], money: (n: number) => string): [string, string][] {
  const t: [string, string][] = [];
  const efec = recibidas.filter(x => x.metodo === 'efectivo' && x.total > 2000).length;
  if (!recibidas.length) t.push(['Registra tus facturas recibidas', 'En la pestaña Recibidas captura las facturas de tus proveedores: el IVA que pagaste se acredita contra el IVA que cobras y tus gastos pueden bajar el ISR.']);
  else if (e.ivaRec > 0) t.push(['Ya estás acreditando IVA', `Este periodo acreditas ${money(e.ivaRec)} de IVA por tus facturas recibidas. Entre más gastos del negocio facturados, menos IVA pagas.`]);
  if (efec) t.push(['Evita el efectivo en gastos grandes', `Tienes ${efec} ${efec === 1 ? 'factura pagada' : 'facturas pagadas'} en efectivo por más de $2,000: no ${efec === 1 ? 'es deducible ni acreditable' : 'son deducibles ni acreditables'}. Paga con transferencia, tarjeta o cheque.`]);
  if (e.ivaFavor) t.push(['Tienes IVA a favor', 'No lo pierdes: puedes acreditarlo contra tus siguientes pagos de IVA o pedir su devolución ante el SAT.']);
  if (e.clave === '626') t.push(['RESICO: el IVA sí se acredita', 'En RESICO de personas físicas los gastos no reducen el ISR (se calcula sobre ingresos cobrados), pero el IVA acreditable de tus gastos sí baja el IVA que pagas.']);
  else if (['612', '606', '601', '626m'].includes(e.clave)) t.push(['Pide factura de todo gasto del negocio', 'Solicita el CFDI a tus proveedores con tu RFC y el uso correcto (por ejemplo, G03 gastos en general). Un gasto sin factura no se puede deducir ni acreditar.']);
  if (e.clave === '606') t.push(['Compara tus deducciones', 'En arrendamiento puedes deducir tus gastos reales o usar la deducción opcional del 35%. Marca la opción en este panel y compara cuál te conviene.']);
  if (['612', '606', '601', '626m'].includes(e.clave)) t.push(['Captura tus pagos previos y retenciones', 'Los pagos provisionales anteriores y el ISR que te retuvieron se restan del periodo. Regístralos para no pagar de más.']);
  t.push(['Haz pruebas antes de facturar', 'Usa el simulador para ver cómo cambia tu IVA y tu ISR con una factura emitida o un gasto más.']);
  return t;
}
