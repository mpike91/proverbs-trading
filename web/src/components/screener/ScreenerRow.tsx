import { memo } from 'react';
import { Sparkline } from '@/components/common/Sparkline';
import { ScoreBadge } from '@/components/common/ColoredMetric';
import { Tooltip } from '@/components/common/Tooltip';
import {
  getScoreColor,
  getRoicScoreColor,
  getPiotroskiScoreColor,
  getAltmanZScoreColor,
  getSmaTrendScoreColor,
  getMomentumScoreColor,
  getAvgOiScoreColor,
  getMedianRatioScoreColor,
  getDepthScoreColor,
  getRangeScoreColor,
  getTooltipTextClass,
} from '@/utils/colorThresholds';
import { formatPercent, formatCurrency, formatNumber, formatDate, formatInteger } from '@/utils/formatting';
import type { ScreenerRow as ScreenerRowType } from '@/api/types';

interface ScreenerRowProps {
  row: ScreenerRowType & { weightedScore: number };
  index: number;
  earningsWeekThreshold: number;
}

// Calculate days until earnings
function getDaysUntilEarnings(earningsDate: string | null): number | null {
  if (!earningsDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const earnings = new Date(earningsDate);
  earnings.setHours(0, 0, 0, 0);
  const diffTime = earnings.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function ScreenerRowComponent({ row, index, earningsWeekThreshold }: ScreenerRowProps) {
  const daysUntilEarnings = getDaysUntilEarnings(row.nextEarnings);
  const isEarningsNear = daysUntilEarnings !== null && daysUntilEarnings >= 0 && daysUntilEarnings <= earningsWeekThreshold * 7;

  // Tooltip content for Fundamentals (all sub-scores colored)
  const fundTooltip = (
    <div className="text-left">
      <div className="font-semibold mb-1">Fundamentals</div>
      <div className={getTooltipTextClass(getRoicScoreColor(row.roic))}>
        ROIC: {formatPercent(row.roic, 1)}
      </div>
      <div className={getTooltipTextClass(getPiotroskiScoreColor(row.piotroskiFScore))}>
        Piotroski: {row.piotroskiFScore}/9
      </div>
      <div className={getTooltipTextClass(getAltmanZScoreColor(row.altmanZScore))}>
        Altman Z: {formatNumber(row.altmanZScore, 2)}
      </div>
    </div>
  );

  // Tooltip content for Technicals
  // RSI and BB% are NOT scored in Tech score, so they remain white
  // SMA Trend and Momentum ARE scored, so they get colored
  const techTooltip = (
    <div className="text-left">
      <div className="font-semibold mb-1">Technicals</div>
      <div className="text-gray-400">RSI: {formatNumber(row.rsi, 0)}</div>
      <div className="text-gray-400">BB%: {formatPercent(row.bbPercent, 0)}</div>
      <div className={getTooltipTextClass(getSmaTrendScoreColor(row.smaTrend))}>
        SMA Trend: {row.smaTrend}/3
      </div>
      <div className={getTooltipTextClass(getMomentumScoreColor(row.momentum))}>
        Momentum: {formatPercent(row.momentum, 0)}
      </div>
    </div>
  );

  // Tooltip content for Liquidity (all sub-scores colored)
  const medianRatio = row.avgOi > 0 ? row.medianOi / row.avgOi : 0;
  const liqTooltip = (
    <div className="text-left">
      <div className="font-semibold mb-1">Liquidity</div>
      <div className={getTooltipTextClass(getAvgOiScoreColor(row.avgOi))}>
        Avg OI: {formatInteger(row.avgOi)}
      </div>
      <div className={getTooltipTextClass(getMedianRatioScoreColor(medianRatio))}>
        Median OI: {formatInteger(row.medianOi)}
      </div>
      <div className={getTooltipTextClass(getDepthScoreColor(row.depth))}>
        Depth: {row.depth}
      </div>
      <div className={getTooltipTextClass(getRangeScoreColor(row.range))}>
        Range: {formatInteger(row.range)}
      </div>
    </div>
  );

  return (
    <tr>
      {/* Index */}
      <td className="sticky left-0 bg-white z-10 text-gray-500 text-xs">
        {index + 1}
      </td>

      {/* Symbol with description tooltip */}
      <td className="font-medium">
        <Tooltip content={row.description || row.symbol} multiline>
          <span>{row.symbol}</span>
        </Tooltip>
      </td>

      {/* Sparkline */}
      <td className="p-1">
        <Sparkline data={row.priceHistory} width={100} height={24} />
      </td>

      {/* Price */}
      <td className="tabular-nums">{formatCurrency(row.price)}</td>

      {/* Scores with tooltips */}
      <td>
        <ScoreBadge score={row.weightedScore} getColor={getScoreColor} />
      </td>
      <td>
        <Tooltip content={fundTooltip} position="top">
          <span>
            <ScoreBadge score={row.fundamentalsScore} getColor={getScoreColor} />
          </span>
        </Tooltip>
      </td>
      <td>
        <Tooltip content={techTooltip} position="top">
          <span>
            <ScoreBadge score={row.technicalsScore} getColor={getScoreColor} />
          </span>
        </Tooltip>
      </td>
      <td>
        <Tooltip content={liqTooltip} position="top">
          <span>
            <ScoreBadge score={row.liquidityScore} getColor={getScoreColor} />
          </span>
        </Tooltip>
      </td>

      {/* Options Data */}
      <td className="tabular-nums">{formatCurrency(row.strike)}</td>
      <td className="tabular-nums">{formatCurrency(row.bid)}</td>
      <td className="tabular-nums">{row.ror !== null ? formatPercent(row.ror, 2) : '-'}</td>

      {/* Open Interest */}
      <td className="tabular-nums">{formatInteger(row.oi)}</td>

      {/* Earnings with threshold highlight */}
      <td className={`text-xs ${isEarningsNear ? 'bg-red-100 text-red-700 font-medium' : ''}`}>
        {formatDate(row.nextEarnings)}
      </td>

      {/* Sector with industry tooltip */}
      <td className="text-xs text-gray-600 max-w-[120px] truncate">
        <Tooltip content={row.industry || row.sector || '-'}>
          <span>{row.sector || '-'}</span>
        </Tooltip>
      </td>
    </tr>
  );
}

export const ScreenerRow = memo(ScreenerRowComponent);
