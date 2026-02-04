// Color utilities for metrics
// Returns Tailwind CSS classes based on value thresholds

export type ColorLevel = 'green' | 'yellow' | 'red' | 'neutral';

export function getScoreColor(value: number | null): ColorLevel {
  if (value === null || isNaN(value)) return 'neutral';
  if (value >= 4) return 'green';
  if (value >= 3) return 'yellow';
  return 'red';
}

export function getRsiColor(value: number | null): ColorLevel {
  if (value === null || isNaN(value)) return 'neutral';
  // Lower RSI is better (oversold = buying opportunity)
  if (value <= 30) return 'green';
  if (value <= 50) return 'yellow';
  return 'red';
}

export function getBbPercentColor(value: number | null): ColorLevel {
  if (value === null || isNaN(value)) return 'neutral';
  // Lower BB% is better (price near lower band)
  if (value <= 0.35) return 'green';
  if (value <= 0.50) return 'yellow';
  return 'red';
}

export function getAltmanZColor(value: number | null): ColorLevel {
  if (value === null || isNaN(value)) return 'neutral';
  if (value >= 3) return 'green';
  if (value >= 1.8) return 'yellow';
  return 'red';
}

export function getSmaTrendColor(value: number | null): ColorLevel {
  if (value === null || isNaN(value)) return 'neutral';
  if (value === 3) return 'green';
  if (value === 2) return 'yellow';
  return 'red';
}

export function getRorColor(value: number | null): ColorLevel {
  if (value === null || isNaN(value)) return 'neutral';
  if (value >= 0.015) return 'green';
  if (value >= 0.01) return 'yellow';
  return 'red';
}

export function getItmOtmColor(value: number | null): ColorLevel {
  if (value === null || isNaN(value)) return 'neutral';
  // Positive = OTM (good), Negative = ITM (bad)
  if (value > 0) return 'green';
  if (value >= -0.05) return 'yellow';
  return 'red';
}

export function getTodayChangeColor(value: number | null): ColorLevel {
  if (value === null || isNaN(value)) return 'neutral';
  if (value > 0) return 'green';
  if (value < 0) return 'red';
  return 'neutral';
}

// Background color classes
export function getBgClass(level: ColorLevel): string {
  switch (level) {
    case 'green':
      return 'bg-score-green';
    case 'yellow':
      return 'bg-score-yellow';
    case 'red':
      return 'bg-score-red';
    default:
      return '';
  }
}

// Text color classes
export function getTextClass(level: ColorLevel): string {
  switch (level) {
    case 'green':
      return 'text-text-green';
    case 'red':
      return 'text-text-red';
    default:
      return '';
  }
}

// Position type colors
export function getPositionTypeClass(type: string): string {
  switch (type.toUpperCase()) {
    case 'STOCK':
      return 'bg-score-blue';
    case 'C':
      return 'bg-score-grey';
    default:
      return '';
  }
}
