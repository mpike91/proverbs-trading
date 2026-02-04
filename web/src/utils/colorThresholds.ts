// Color utilities for metrics
// Returns Tailwind CSS classes based on value thresholds

export type ColorLevel = 'green' | 'yellow' | 'red' | 'neutral';

export function getScoreColor(value: number | null): ColorLevel {
  if (value === null || isNaN(value)) return 'neutral';
  if (value >= 3.5) return 'green';
  if (value >= 2.5) return 'yellow';
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

// ============================================
// Sub-score coloring for tooltips
// Based on Apps Script 1-5 scoring thresholds
// ============================================

// ROIC scoring: ≥15% → 5, ≥5% → 4, ≥-5% → 3, ≥-15% → 2, else 1
export function getRoicScoreColor(roic: number | null): ColorLevel {
  if (roic === null || isNaN(roic)) return 'neutral';
  if (roic >= 0.05) return 'green'; // Score 4-5
  if (roic >= -0.05) return 'yellow'; // Score 3
  return 'red'; // Score 1-2
}

// Piotroski scoring: ≥7 → 5, 6 → 4, 5 → 3, 4 → 2, else 1
export function getPiotroskiScoreColor(pio: number | null): ColorLevel {
  if (pio === null || isNaN(pio)) return 'neutral';
  if (pio >= 6) return 'green'; // Score 4-5
  if (pio >= 5) return 'yellow'; // Score 3
  return 'red'; // Score 1-2
}

// Altman Z scoring: ≥5 → 5, ≥3 → 4, ≥1.8 → 3, ≥1.2 → 2, else 1
export function getAltmanZScoreColor(alt: number | null): ColorLevel {
  if (alt === null || isNaN(alt)) return 'neutral';
  if (alt >= 3) return 'green'; // Score 4-5
  if (alt >= 1.8) return 'yellow'; // Score 3
  return 'red'; // Score 1-2
}

// SMA Trend scoring: 3 → 5, 2 → 4, 1 → 2, else 1
export function getSmaTrendScoreColor(sma: number | null): ColorLevel {
  if (sma === null || isNaN(sma)) return 'neutral';
  if (sma === 3) return 'green'; // Score 5
  if (sma === 2) return 'yellow'; // Score 4
  return 'red'; // Score 1-2
}

// Momentum scoring: 0.05-0.15 → 5, >0.15 && ≤0.20 → 4, >0.20 → 3, 0-0.05 → 4, ≥-0.05 → 2, else 1
export function getMomentumScoreColor(mom: number | null): ColorLevel {
  if (mom === null || isNaN(mom)) return 'neutral';
  if (mom >= 0.05 && mom <= 0.15) return 'green'; // Score 5 (ideal range)
  if (mom >= 0 && mom <= 0.20) return 'yellow'; // Score 3-4
  if (mom >= -0.05) return 'yellow'; // Score 2
  return 'red'; // Score 1
}

// Avg OI scoring: ≥1000 → 5, ≥250 → 4, ≥100 → 3, ≥50 → 2, else 1
export function getAvgOiScoreColor(avgOi: number | null): ColorLevel {
  if (avgOi === null || isNaN(avgOi)) return 'neutral';
  if (avgOi >= 250) return 'green'; // Score 4-5
  if (avgOi >= 50) return 'yellow'; // Score 2-3
  return 'red'; // Score 1
}

// Median/Avg Ratio scoring: ≥0.75 → 5, ≥0.50 → 4, ≥0.35 → 3, ≥0.20 → 2, else 1
export function getMedianRatioScoreColor(ratio: number | null): ColorLevel {
  if (ratio === null || isNaN(ratio)) return 'neutral';
  if (ratio >= 0.50) return 'green'; // Score 4-5
  if (ratio >= 0.20) return 'yellow'; // Score 2-3
  return 'red'; // Score 1
}

// Depth scoring: ≥4 → 5, 3 → 4, 2 → 3, 1 → 2, else 1
export function getDepthScoreColor(depth: number | null): ColorLevel {
  if (depth === null || isNaN(depth)) return 'neutral';
  if (depth >= 3) return 'green'; // Score 4-5
  if (depth >= 2) return 'yellow'; // Score 3
  return 'red'; // Score 1-2
}

// Range scoring: ≥10 → 5, ≥7 → 4, ≥5 → 3, ≥3 → 2, else 1
export function getRangeScoreColor(range: number | null): ColorLevel {
  if (range === null || isNaN(range)) return 'neutral';
  if (range >= 5) return 'green'; // Score 3-5
  if (range >= 3) return 'yellow'; // Score 2
  return 'red'; // Score 1
}

// Tooltip text color helper
export function getTooltipTextClass(level: ColorLevel): string {
  switch (level) {
    case 'green':
      return 'text-green-400';
    case 'yellow':
      return 'text-yellow-400';
    case 'red':
      return 'text-red-400';
    default:
      return ''; // White by default in dark tooltip
  }
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
