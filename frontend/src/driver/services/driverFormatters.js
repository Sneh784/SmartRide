export const money = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(Number(value) || 0);

export const dateTime = (value) => {
  if (!value) return 'Not specified';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? 'Not specified'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
};

export const dateOnly = (value) => {
  if (!value) return 'Not specified';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? 'Not specified'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(parsed);
};

export const apiError = (error, fallback) => error?.response?.data?.detail
  || error?.response?.data?.message
  || fallback;
