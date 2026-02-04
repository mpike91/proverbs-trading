import { useMemo } from 'react';
import { useFilterStore, type SortColumn } from '@/stores/filterStore';
import type { ScreenerRow } from '@/api/types';

export function useFilteredScreenerData(data: ScreenerRow[]) {
  const {
    priceMin,
    priceMax,
    rsiMax,
    bbPercentMax,
    ror: rorMin,
    sortBy,
    sortDirection,
    excludeExisting,
    excludeList,
    fundamentalsWeight,
    technicalsWeight,
    liquidityWeight,
  } = useFilterStore();

  return useMemo(() => {
    if (!data || data.length === 0) return [];

    // Calculate custom weighted score
    const calculateWeightedScore = (row: ScreenerRow): number => {
      const total = fundamentalsWeight + technicalsWeight + liquidityWeight;
      if (total === 0) return row.optionsScore;

      return (
        (row.fundamentalsScore * fundamentalsWeight +
          row.technicalsScore * technicalsWeight +
          row.liquidityScore * liquidityWeight) /
        total
      );
    };

    // Filter
    let filtered = data.filter((row) => {
      // Price range
      if (row.price < priceMin || row.price > priceMax) return false;

      // RSI max
      if (row.rsi > rsiMax) return false;

      // BB% max (stored as 0-100 in UI, data is 0-1)
      if (row.bbPercent > bbPercentMax / 100) return false;

      // ROR min
      if (row.ror === null || row.ror < rorMin) return false;

      // Exclude existing positions
      if (excludeExisting && excludeList.includes(row.symbol)) return false;

      return true;
    });

    // Add weighted score to each row
    const withWeightedScore = filtered.map((row) => ({
      ...row,
      weightedScore: calculateWeightedScore(row),
    }));

    // Sort
    const sortKey =
      sortBy === 'optionsScore' ? 'weightedScore' : (sortBy as keyof ScreenerRow);

    withWeightedScore.sort((a, b) => {
      const aVal = a[sortKey as keyof typeof a];
      const bVal = b[sortKey as keyof typeof b];

      // Handle null/empty values - push to end
      const aEmpty = aVal === null || aVal === undefined || aVal === '';
      const bEmpty = bVal === null || bVal === undefined || bVal === '';
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;
      if (bEmpty) return -1;

      // Handle date sorting for nextEarnings
      if (sortBy === 'nextEarnings') {
        const aDate = new Date(aVal as string).getTime();
        const bDate = new Date(bVal as string).getTime();
        return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
      }

      // Handle string comparison
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      // Numeric comparison
      const numA = Number(aVal);
      const numB = Number(bVal);
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    });

    return withWeightedScore;
  }, [
    data,
    priceMin,
    priceMax,
    rsiMax,
    bbPercentMax,
    rorMin,
    sortBy,
    sortDirection,
    excludeExisting,
    excludeList,
    fundamentalsWeight,
    technicalsWeight,
    liquidityWeight,
  ]);
}

export function getSortLabel(column: SortColumn): string {
  const labels: Record<SortColumn, string> = {
    optionsScore: 'Options Score',
    fundamentalsScore: 'Fundamentals',
    technicalsScore: 'Technicals',
    liquidityScore: 'Liquidity',
    price: 'Price',
    ror: 'ROR %',
    rsi: 'RSI',
    bbPercent: 'BB %',
    altmanZScore: 'Altman Z',
    smaTrend: 'SMA Trend',
    strike: 'Strike',
    bid: 'Bid',
    oi: 'Open Interest',
    nextEarnings: 'Earnings',
    symbol: 'Symbol',
  };
  return labels[column] || column;
}
