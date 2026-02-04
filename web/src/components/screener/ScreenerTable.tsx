import { useMemo } from 'react';
import { ScreenerRow } from './ScreenerRow';
import { useFilterStore } from '@/stores/filterStore';
import type { ScreenerRow as ScreenerRowType } from '@/api/types';

interface ScreenerTableProps {
  data: (ScreenerRowType & { weightedScore: number })[];
  cashAmount: number;
}

export function ScreenerTable({ data, cashAmount }: ScreenerTableProps) {
  const { sortBy, sortDirection, setSortBy, toggleSortDirection } = useFilterStore();

  const handleSort = (column: string) => {
    if (sortBy === column) {
      toggleSortDirection();
    } else {
      setSortBy(column as typeof sortBy);
    }
  };

  const SortHeader = ({
    column,
    children,
    className = '',
  }: {
    column: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <th
      className={`cursor-pointer hover:bg-gray-100 select-none ${className}`}
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortBy === column && (
          <span className="text-blue-600">
            {sortDirection === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </th>
  );

  // Calculate max contracts based on cash and strike
  const dataWithContracts = useMemo(() => {
    return data.map((row) => ({
      ...row,
      maxContracts: row.strike > 0 ? Math.floor((cashAmount * 1000) / (row.strike * 100)) : 0,
    }));
  }, [data, cashAmount]);

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No results match your filters. Try adjusting the filter criteria.
      </div>
    );
  }

  return (
    <div className="table-container overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th className="sticky left-0 bg-gray-50 z-10">#</th>
            <SortHeader column="symbol">Symbol</SortHeader>
            <th>Chart</th>
            <SortHeader column="price">Price</SortHeader>
            <SortHeader column="optionsScore">Score</SortHeader>
            <SortHeader column="fundamentalsScore">Fund</SortHeader>
            <SortHeader column="technicalsScore">Tech</SortHeader>
            <SortHeader column="liquidityScore">Liq</SortHeader>
            <th>Strike</th>
            <th>Bid</th>
            <SortHeader column="ror">ROR%</SortHeader>
            <th>Contracts</th>
            <SortHeader column="rsi">RSI</SortHeader>
            <SortHeader column="bbPercent">BB%</SortHeader>
            <SortHeader column="altmanZScore">Altman</SortHeader>
            <SortHeader column="smaTrend">Trend</SortHeader>
            <th>Avg OI</th>
            <th>Depth</th>
            <th>Earnings</th>
            <th>Sector</th>
          </tr>
        </thead>
        <tbody>
          {dataWithContracts.map((row, index) => (
            <ScreenerRow key={row.symbol} row={row} index={index} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
