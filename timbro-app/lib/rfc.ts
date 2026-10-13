export const RFC_RE = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
export const rfcOk = (v: string) => RFC_RE.test(v.trim().toUpperCase());
export const money = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0);
