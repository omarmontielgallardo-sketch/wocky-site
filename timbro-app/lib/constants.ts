export const REGIMENES_USADOS: [string, string][] = [
  ['626', 'RESICO · Régimen Simplificado de Confianza'],
  ['612', 'Personas Físicas con Actividades Empresariales y Profesionales'],
  ['601', 'General de Ley Personas Morales'],
  ['603', 'Personas Morales con Fines no Lucrativos'],
  ['606', 'Arrendamiento'],
  ['625', 'Actividades Empresariales con ingresos a través de Plataformas Tecnológicas'],
  ['605', 'Sueldos y Salarios e Ingresos Asimilados a Salarios'],
  ['622', 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras'],
];
export const REGIMENES_OTROS: [string, string][] = [
  ['607', 'Enajenación o Adquisición de Bienes'],
  ['608', 'Demás ingresos'],
  ['609', 'Consolidación'],
  ['610', 'Residentes en el Extranjero sin Establecimiento Permanente en México'],
  ['611', 'Ingresos por Dividendos (socios y accionistas)'],
  ['614', 'Ingresos por intereses'],
  ['615', 'Ingresos por obtención de premios'],
  ['616', 'Sin obligaciones fiscales'],
  ['620', 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos'],
  ['621', 'Incorporación Fiscal'],
  ['623', 'Opcional para Grupos de Sociedades'],
  ['624', 'Coordinados'],
  ['628', 'Hidrocarburos'],
  ['629', 'Regímenes Fiscales Preferentes y Empresas Multinacionales'],
  ['630', 'Enajenación de acciones en bolsa de valores'],
];
export const PLANES = [
  { id: 'emprendedor', nombre: 'Emprendedor', para: 'Freelancers y RESICO', precio: 99, timbres: 40, items: ['1 RFC · 1 usuario', 'Complemento de pago', 'Cancelaciones'] },
  { id: 'negocio', nombre: 'Negocio', para: 'Pequeñas empresas', precio: 249, timbres: 150, destacado: true, items: ['3 RFC · 3 usuarios', 'Facturas recurrentes', 'Portal de autofactura'] },
  { id: 'despacho', nombre: 'Despacho', para: 'Contadores y agencias', precio: 649, timbres: 600, items: ['20 RFC · usuarios ilimitados', 'API y marca propia', 'Soporte prioritario'] },
] as const;
export const LIMITES: Record<string, number> = { emprendedor: 40, negocio: 150, despacho: 600 };
export const RFC_MAX: Record<string, number> = { emprendedor: 1, negocio: 3, despacho: 20 };
export const NOMBRE_PLAN: Record<string, string> = { emprendedor: 'Emprendedor', negocio: 'Negocio', despacho: 'Despacho' };
export const USOS_CFDI: [string, string][] = [['G03', 'G03 Gastos en general'], ['G01', 'G01 Adquisición de mercancías'], ['S01', 'S01 Sin efectos fiscales']];
