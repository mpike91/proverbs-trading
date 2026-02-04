import { ScreenerRow } from './ScreenerRow';
import { useFilterStore } from '@/stores/filterStore';
import type { ScreenerRow as ScreenerRowType } from '@/api/types';

interface ScreenerTableProps {
  data: (ScreenerRowType & { weightedScore: number })[];
}

export function ScreenerTable({ data }: ScreenerTableProps) {
  const { sortBy, sortDirection, setSortBy, toggleSortDirection, earningsWeekThreshold } = useFilterStore();

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
            <SortHeader column="strike">Strike</SortHeader>
            <SortHeader column="bid">Bid</SortHeader>
            <SortHeader column="ror">ROR%</SortHeader>
            <SortHeader column="oi">OI</SortHeader>
            <SortHeader column="nextEarnings">Earnings</SortHeader>
            <th>Sector</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <ScreenerRow key={row.symbol} row={row} index={index} earningsWeekThreshold={earningsWeekThreshold} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
