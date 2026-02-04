import { memo } from 'react';
import {
  getItmOtmColor,
  getTodayChangeColor,
  getPositionTypeClass,
  getBgClass,
} from '@/utils/colorThresholds';
import { formatPercent, formatCurrency, formatDate, formatScore } from '@/utils/formatting';
import type { MonitorPosition } from '@/api/types';

interface MonitorTableProps {
  positions: MonitorPosition[];
}

export function MonitorTable({ positions }: MonitorTableProps) {
  if (positions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No positions to display.
      </div>
    );
  }

  return (
    <div className="table-container overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>Weeks</th>
            <th>Expiry</th>
            <th>Symbol</th>
            <th>Type</th>
            <th>#</th>
            <th>Strike</th>
            <th>Price</th>
            <th>Today</th>
            <th>ITM/OTM</th>
            <th>Roll</th>
            <th>Comments</th>
            <th>Quality</th>
            <th>Fund</th>
            <th>Tech</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((position, index) => (
            <PositionRow key={`${position.symbol}-${index}`} position={position} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

const PositionRow = memo(function PositionRow({
  position,
}: {
  position: MonitorPosition;
}) {
  const typeClass = getPositionTypeClass(position.type);
  const todayColor = getTodayChangeColor(position.todayChange);
  const itmOtmColor = getItmOtmColor(position.itmOtm);

  return (
    <tr className={typeClass}>
      {/* Weeks Out */}
      <td className="text-center">
        {typeof position.weeksOut === 'number'
          ? position.weeksOut
          : position.weeksOut}
      </td>

      {/* Expiry */}
      <td>{formatDate(position.expiry)}</td>

      {/* Symbol */}
      <td className="font-medium">{position.symbol}</td>

      {/* Type */}
      <td className="text-center">{position.type}</td>

      {/* Contracts */}
      <td className="text-center tabular-nums">{position.contracts}</td>

      {/* Strike */}
      <td className="tabular-nums">{formatCurrency(position.strike)}</td>

      {/* Current Price */}
      <td className="tabular-nums">{formatCurrency(position.currentPrice)}</td>

      {/* Today Change */}
      <td
        className={`tabular-nums ${
          todayColor === 'green'
            ? 'text-text-green'
            : todayColor === 'red'
            ? 'text-text-red'
            : ''
        }`}
      >
        {formatPercent(position.todayChange)}
      </td>

      {/* ITM/OTM */}
      <td className={`tabular-nums ${getBgClass(itmOtmColor)}`}>
        {position.type === 'STOCK' ? '-' : formatPercent(position.itmOtm)}
      </td>

      {/* Roll */}
      <td>
        <RollIndicator roll={position.roll} />
      </td>

      {/* Comments */}
      <td className="text-xs text-gray-600 max-w-[150px] truncate">
        {position.comments || '-'}
      </td>

      {/* Scores */}
      <td className="tabular-nums text-center">
        {formatScore(position.qualityScore)}
      </td>
      <td className="tabular-nums text-center">
        {formatScore(position.fundamentalsScore)}
      </td>
      <td className="tabular-nums text-center">
        {formatScore(position.technicalsScore)}
      </td>
    </tr>
  );
});

function RollIndicator({ roll }: { roll: string }) {
  if (roll === 'ROLL') {
    return (
      <span className="inline-block px-2 py-0.5 text-xs font-bold text-white bg-green-500 rounded animate-pulse-slow">
        ROLL
      </span>
    );
  }

  if (roll === 'ROLL UP') {
    return (
      <span className="inline-block px-2 py-0.5 text-xs font-bold text-white bg-blue-500 rounded">
        ROLL UP
      </span>
    );
  }

  if (roll === 'LET EXPIRE') {
    return (
      <span className="inline-block px-2 py-0.5 text-xs text-white bg-gray-500 rounded">
        LET EXPIRE
      </span>
    );
  }

  return <span className="text-gray-400">-</span>;
}
