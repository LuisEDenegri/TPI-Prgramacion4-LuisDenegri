const PESOS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
});

const FECHA_HORA = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
});

export const formatearPrecio = (valor: number): string => PESOS.format(valor);

export const formatearFecha = (iso: string): string => FECHA_HORA.format(new Date(iso));
