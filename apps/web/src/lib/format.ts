export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
  }).format(new Date(value));
}

