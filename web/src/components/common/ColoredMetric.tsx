import { type ColorLevel, getBgClass, getTextClass } from '@/utils/colorThresholds';

interface ColoredMetricProps {
  value: string | number;
  colorLevel: ColorLevel;
  variant?: 'background' | 'text' | 'both';
  className?: string;
}

export function ColoredMetric({
  value,
  colorLevel,
  variant = 'background',
  className = '',
}: ColoredMetricProps) {
  const bgClass = variant !== 'text' ? getBgClass(colorLevel) : '';
  const textClass = variant !== 'background' ? getTextClass(colorLevel) : '';

  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded text-center min-w-[3rem] ${bgClass} ${textClass} ${className}`}
    >
      {value}
    </span>
  );
}

interface ScoreBadgeProps {
  score: number | null;
  getColor: (value: number | null) => ColorLevel;
  format?: (value: number | null) => string;
  className?: string;
}

export function ScoreBadge({
  score,
  getColor,
  format = (v) => (v !== null ? v.toFixed(1) : '-'),
  className = '',
}: ScoreBadgeProps) {
  const colorLevel = getColor(score);
  const displayValue = format(score);

  return (
    <ColoredMetric
      value={displayValue}
      colorLevel={colorLevel}
      variant="background"
      className={className}
    />
  );
}
