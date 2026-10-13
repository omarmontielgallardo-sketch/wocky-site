// Pruebas de lib/impuestos.ts (ejecutar con: npm run test:impuestos)
import * as I from './impuestos.ts';
let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++; console.log(`${c ? 'OK  ' : 'FALLA'} ${n}${c ? '' : ' ' + x}`); };
const eq = (n, a, b) => ok(n, JSON.stringify(a) === JSON.stringify(b), `→ ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`);

// Sugerencias por giro y régimen
const a = I.impuestosSugeridos('profesional', '612 Personas Físicas', 'GAMJ800101AB8', 'EAU200101AB6').cfg;
eq('612 profesional → persona moral: ISR 10% + IVA 2/3', [a.iva, a.isr, a.ivaRet], ['16', 0.10, 0.106667]);
const b = I.impuestosSugeridos('profesional', '626 RESICO', 'GAMJ800101AB8', 'EAU200101AB6').cfg;
eq('RESICO PF → ISR 1.25%', b.isr, 0.0125);
const c = I.impuestosSugeridos('profesional', '612', 'GAMJ800101AB8', 'XAXX010101000').cfg;
eq('público en general no retiene', [c.isr, c.ivaRet], [0, 0]);
const d = I.impuestosSugeridos('profesional', '601', 'EAU200101AB6', 'EAU200101AB6').cfg;
eq('persona moral emisora no sufre retención de ISR', [d.isr, d.ivaRet], [0, 0]);
eq('transporte → retención IVA 4%', I.impuestosSugeridos('transporte', '601', 'EAU200101AB6', 'EAU200101AB6').cfg.ivaRet, 0.04);
eq('educación exenta', I.impuestosSugeridos('educacion', '601', 'EAU200101AB6', 'XAXX010101000').cfg.iva, 'exento');

// Desglose y calculadora
eq('desglose con retenciones', I.desglosar(10000, a).total, 9533.33);
eq('hospedaje', I.desglosar(10000, { iva: '16', isr: 0, ivaRet: 0, ieps: 0, ish: 0.03 }).total, 11900);
eq('IEPS 26.5%: IVA sobre subtotal + IEPS', I.desglosar(10000, { iva: '16', isr: 0, ivaRet: 0, ieps: 0.265, ish: 0 }).total, 14674);
const cn = I.calculadora('neto', 10000, a, 16);
eq('calculadora: neto 10,000 → subtotal', cn.sub, 10489.51);
eq('calculadora: el total recibido es el neto pedido', I.desglosar(cn.sub, a).total, 10000);
eq('desglosar IVA de 11,600', I.calculadora('desglosar', 11600, a, 16).sub, 10000);

// Tarifa 2026
eq('tarifa por 10 meses: 20,000', I.isrTarifa(20000, 10), 901.66);
eq('tarifa por 10 meses: 25,000', I.isrTarifa(25000, 10), 1221.66);
eq('tarifa de 1 mes sobre 10,000 (420.95 + 10.88% del excedente)', I.isrTarifa(10000, 1), 729.02);

// Estimación 612: dos facturas del mes, un gasto deducible
const hoy = new Date().toISOString();
const per = I.claveMes(hoy);
const fac = [
  { estatus: 'timbrada', fecha: hoy, subtotal: 10000, iva: 1600, isr_retenido: 1000, iva_retenido: 1066.67 },
  { estatus: 'timbrada', fecha: hoy, subtotal: 10000, iva: 1600, isr_retenido: 0, iva_retenido: 0 },
  { estatus: 'cancelada', fecha: hoy, subtotal: 99999, iva: 0, isr_retenido: 0, iva_retenido: 0 },
];
const rec = [{ fecha: hoy, subtotal: 5000, iva: 800, deducible: true }, { fecha: hoy, subtotal: 3000, iva: 480, deducible: false }];
const e = I.estimarImpuestos(per, '612 Personas Físicas', 'GAMJ800101AB8', fac, rec, {});
eq('IVA neto = 3,200 − 1,066.67 − 800', e.ivaNeto, 1333.33);
const mm = +per.slice(5);
eq('ISR 612 = tarifa acumulada − retenciones', e.isrPagar, Math.max(Math.round((I.isrTarifa(20000 - 5000, mm) - 1000) * 100) / 100, 0));
const s = I.estimarImpuestos(per, '612 Personas Físicas', 'GAMJ800101AB8', fac, rec, {}, { ing: 0, ivaIng: '16', gas: 50000, ivaGas: '16' });
eq('simulación de un gasto grande da IVA a favor', s.ivaNeto < 0 && s.ivaFavor, true);
const rs = I.estimarImpuestos(per, '626 RESICO', 'GAMJ800101AB8', fac, rec, {});
eq('RESICO PF: 1% sobre ingresos del mes (20,000) menos retención', rs.isrPagar, Math.max(200 - 1000, 0));
const pm = I.estimarImpuestos(per, '601 General', 'EAU200101AB6', fac, rec, { coef: 0.25 });
eq('601: coeficiente × ingresos × 30%', pm.isr[3][1], 1500);
eq('régimen sin cálculo de ISR', I.estimarImpuestos(per, '630 Acciones', 'GAMJ800101AB8', fac, rec, {}).isrPagar, null);
ok('consejos incluyen advertencia de efectivo cuando aplica', I.consejos(e, [{ metodo: 'efectivo', total: 3480 }], n => '$' + n).some(t => t[0].includes('efectivo')));

console.log(`\n${pass} correctas, ${fail} con falla`);
process.exit(fail ? 1 : 0);
