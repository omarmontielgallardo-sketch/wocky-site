import type { Resultado } from '@/app/panel/actions';

export type Empresa = { id: string; razon_social: string; rfc: string; regimen: string; giro: string; plan: string };
export type Linea = { descripcion: string; cantidad: number; precio: number };
export type Factura = {
  id: string; folio: string; cliente_nombre: string; cliente_rfc: string; uso_cfdi: string; metodo_pago: string; lineas: Linea[];
  subtotal: number; iva_tipo: string; ieps: number; ish: number; iva: number; isr_retenido: number; iva_retenido: number; total: number;
  estatus: 'borrador' | 'timbrada' | 'cancelada'; uuid_demo: string | null; timbrada_en: string | null; creada_en: string;
};
export type Recibida = {
  id: string; fecha: string; proveedor: string; rfc: string; concepto: string; categoria: string; metodo: string; iva_tasa: string;
  subtotal: number; iva: number; total: number; deducible: boolean; motivo: string;
};
export type Cliente = { id: string; nombre: string; rfc: string };
export type Concepto = { descripcion: string; precio: number };
export type ResumenEmpresa = { id: string; razon_social: string; rfc: string; regimen: string; giro: string; plan: string; creada_en: string; facturas: number; timbradas: number; borradores: number; canceladas: number; facturado: number; timbres_mes: number };
export type Tab = 'res' | 'fact' | 'rec' | 'tax' | 'emp';

export type Opciones = { celebrar?: boolean; flash?: string };
export type Ctx = {
  empresa: Empresa; email: string; empresas: ResumenEmpresa[]; facturas: Factura[]; recibidas: Recibida[]; clientes: Cliente[]; conceptos: Concepto[];
  usados: number; limite: number; rfcMax: number; pending: boolean; flash: string | null;
  toast: (t: string, err?: boolean) => void;
  run: (p: Promise<Resultado>, despues?: () => void, o?: Opciones) => void;
  ir: (t: Tab) => void;
};
