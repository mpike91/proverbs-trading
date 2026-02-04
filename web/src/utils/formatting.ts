export function formatPercent(value: number | null, decimals = 2): string {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatNumber(value: number | null, decimals = 2): string {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return value.toFixed(decimals);
}

export function formatCurrency(value: number | null, decimals = 2): string {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return `$${value.toFixed(decimals)}`;
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function formatDateInput(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

export function formatTimestamp(isoString: string | null): string {
  if (!isoString) return 'Never';
  try {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

export function formatScore(value: number | null): string {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return value.toFixed(1);
}

export function formatInteger(value: number | null): string {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return Math.round(value).toLocaleString();
}
