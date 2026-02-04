import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SortColumn =
  | 'optionsScore'
  | 'fundamentalsScore'
  | 'technicalsScore'
  | 'liquidityScore'
  | 'price'
  | 'ror'
  | 'rsi'
  | 'bbPercent'
  | 'altmanZScore'
  | 'smaTrend';

interface FilterState {
  // Backend params (trigger refresh when changed)
  expiry: string;
  ror: number;

  // Client-side filters
  priceMin: number;
  priceMax: number;
  rsiMax: number;
  bbPercentMax: number;
  sortBy: SortColumn;
  sortDirection: 'asc' | 'desc';
  excludeExisting: boolean;
  cashAmount: number;

  // Score weighting (percentages, should sum to 100)
  fundamentalsWeight: number;
  technicalsWeight: number;
  liquidityWeight: number;

  // Exclude list (symbols from Monitor)
  excludeList: string[];

  // Actions
  setExpiry: (expiry: string) => void;
  setRor: (ror: number) => void;
  setPriceMin: (min: number) => void;
  setPriceMax: (max: number) => void;
  setRsiMax: (max: number) => void;
  setBbPercentMax: (max: number) => void;
  setSortBy: (column: SortColumn) => void;
  setSortDirection: (dir: 'asc' | 'desc') => void;
  toggleSortDirection: () => void;
  setExcludeExisting: (exclude: boolean) => void;
  setCashAmount: (amount: number) => void;
  setWeights: (fund: number, tech: number, liq: number) => void;
  setExcludeList: (symbols: string[]) => void;
  resetFilters: () => void;
}

const defaultState = {
  expiry: '',
  ror: 0.01,
  priceMin: 0,
  priceMax: 999999,
  rsiMax: 94,
  bbPercentMax: 50,
  sortBy: 'optionsScore' as SortColumn,
  sortDirection: 'desc' as const,
  excludeExisting: false,
  cashAmount: 30,
  fundamentalsWeight: 25,
  technicalsWeight: 25,
  liquidityWeight: 50,
  excludeList: [],
};

export const useFilterStore = create<FilterState>()(
  persist(
    (set) => ({
      ...defaultState,

      setExpiry: (expiry) => set({ expiry }),
      setRor: (ror) => set({ ror }),
      setPriceMin: (priceMin) => set({ priceMin }),
      setPriceMax: (priceMax) => set({ priceMax }),
      setRsiMax: (rsiMax) => set({ rsiMax }),
      setBbPercentMax: (bbPercentMax) => set({ bbPercentMax }),
      setSortBy: (sortBy) => set({ sortBy }),
      setSortDirection: (sortDirection) => set({ sortDirection }),
      toggleSortDirection: () =>
        set((state) => ({
          sortDirection: state.sortDirection === 'asc' ? 'desc' : 'asc',
        })),
      setExcludeExisting: (excludeExisting) => set({ excludeExisting }),
      setCashAmount: (cashAmount) => set({ cashAmount }),
      setWeights: (fundamentalsWeight, technicalsWeight, liquidityWeight) =>
        set({ fundamentalsWeight, technicalsWeight, liquidityWeight }),
      setExcludeList: (excludeList) => set({ excludeList }),
      resetFilters: () => set(defaultState),
    }),
    {
      name: 'proverbs-filters',
      partialize: (state) => ({
        // Only persist these fields
        priceMin: state.priceMin,
        priceMax: state.priceMax,
        rsiMax: state.rsiMax,
        bbPercentMax: state.bbPercentMax,
        sortBy: state.sortBy,
        sortDirection: state.sortDirection,
        excludeExisting: state.excludeExisting,
        cashAmount: state.cashAmount,
        fundamentalsWeight: state.fundamentalsWeight,
        technicalsWeight: state.technicalsWeight,
        liquidityWeight: state.liquidityWeight,
      }),
    }
  )
);
