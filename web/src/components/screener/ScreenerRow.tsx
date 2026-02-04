import { memo } from 'react';
import { Sparkline } from '@/components/common/Sparkline';
import { ScoreBadge } from '@/components/common/ColoredMetric';
import { Tooltip } from '@/components/common/Tooltip';
import {
  getScoreColor,
  getRsiColor,
  getBbPercentColor,
  getAltmanZColor,
  getSmaTrendColor,
  getRorColor,
} from '@/utils/colorThresholds';
import { formatPercent, formatCurrency, formatNumber, formatDate, formatInteger } from '@/utils/formatting';
import type { ScreenerRow as ScreenerRowType } from '@/api/types';

interface ScreenerRowProps {
  row: ScreenerRowType & { weightedScore: number; maxContracts: number };
  index: number;
}

function ScreenerRowComponent({ row, index }: ScreenerRowProps) {
  return (
    <tr>
      {/* Index */}
      <td className="sticky left-0 bg-white z-10 text-gray-500 text-xs">
        {index + 1}
      </td>

      {/* Symbol */}
      <td className="font-medium">
        <Tooltip content={row.description || row.symbol}>
          <span>{row.symbol}</span>
        </Tooltip>
      </td>

      {/* Sparkline */}
      <td className="p-1">
        <Sparkline data={row.priceHistory} width={100} height={24} />
      </td>

      {/* Price */}
      <td className="tabular-nums">{formatCurrency(row.price)}</td>

      {/* Scores */}
      <td>
        <ScoreBadge score={row.weightedScore} getColor={getScoreColor} />
      </td>
      <td>
        <ScoreBadge score={row.fundamentalsScore} getColor={getScoreColor} />
      </td>
      <td>
        <ScoreBadge score={row.technicalsScore} getColor={getScoreColor} />
      </td>
      <td>
        <ScoreBadge score={row.liquidityScore} getColor={getScoreColor} />
      </td>

      {/* Options Data */}
      <td className="tabular-nums">{formatCurrency(row.strike)}</td>
      <td className="tabular-nums">{formatCurrency(row.bid)}</td>
      <td>
        <ScoreBadge
          score={row.ror}
          getColor={getRorColor}
          format={(v) => formatPercent(v, 2)}
        />
      </td>

      {/* Max Contracts */}
      <td className="tabular-nums text-center">{row.maxContracts}</td>

      {/* Technicals */}
      <td>
        <ScoreBadge
          score={row.rsi}
          getColor={getRsiColor}
          format={(v) => formatNumber(v, 0)}
        />
      </td>
      <td>
        <ScoreBadge
          score={row.bbPercent}
          getColor={getBbPercentColor}
          format={(v) => formatPercent(v, 0)}
        />
      </td>
      <td>
        <ScoreBadge
          score={row.altmanZScore}
          getColor={getAltmanZColor}
          format={(v) => formatNumber(v, 1)}
        />
      </td>
      <td>
        <ScoreBadge
          score={row.smaTrend}
          getColor={getSmaTrendColor}
          format={(v) => (v !== null ? String(v) : '-')}
        />
      </td>

      {/* Liquidity */}
      <td className="tabular-nums">{formatInteger(row.avgOi)}</td>
      <td className="tabular-nums text-center">{row.depth || '-'}</td>

      {/* Earnings */}
      <td className="text-xs">{formatDate(row.nextEarnings)}</td>

      {/* Sector */}
      <td className="text-xs text-gray-600 max-w-[120px] truncate">
        <Tooltip content={`${row.sector} / ${row.industry}`}>
          <span>{row.sector || '-'}</span>
        </Tooltip>
      </td>
    </tr>
  );
}

export const ScreenerRow = memo(ScreenerRowComponent);
