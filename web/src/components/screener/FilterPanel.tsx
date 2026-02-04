import { useState } from 'react';
import { ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { useFilterStore, type SortColumn } from '@/stores/filterStore';
import { useSetParamsMutation } from '@/hooks/useScreenerQuery';
import { getSortLabel } from '@/hooks/useFilteredData';
import { formatDateInput } from '@/utils/formatting';

interface FilterPanelProps {
  isLoading?: boolean;
}

export function FilterPanel({ isLoading }: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const setParamsMutation = useSetParamsMutation();

  const {
    expiry,
    ror,
    priceMin,
    priceMax,
    rsiMax,
    bbPercentMax,
    sortBy,
    sortDirection,
    excludeExisting,
    cashAmount,
    earningsWeekThreshold,
    fundamentalsWeight,
    technicalsWeight,
    liquidityWeight,
    setExpiry,
    setRor,
    setPriceMin,
    setPriceMax,
    setRsiMax,
    setBbPercentMax,
    setSortBy,
    toggleSortDirection,
    setExcludeExisting,
    setCashAmount,
    setEarningsWeekThreshold,
    setWeights,
  } = useFilterStore();

  const handleExpiryChange = async (newExpiry: string) => {
    setExpiry(newExpiry);
    if (newExpiry) {
      await setParamsMutation.mutateAsync({ expiry: newExpiry });
    }
  };

  const handleRorChange = async (newRor: number) => {
    setRor(newRor);
    await setParamsMutation.mutateAsync({ ror: newRor });
  };

  const sortOptions: SortColumn[] = [
    'optionsScore',
    'fundamentalsScore',
    'technicalsScore',
    'liquidityScore',
    'price',
    'ror',
    'rsi',
    'bbPercent',
    'altmanZScore',
    'smaTrend',
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-4">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-gray-500" />
          <span className="font-medium text-gray-900">Filters</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {/* Filter Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 pt-4">
            {/* Backend Params Section */}
            <div className="col-span-full">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Data Parameters
              </h3>
              <div className="flex flex-wrap gap-4">
                {/* Expiry Date */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formatDateInput(expiry)}
                    onChange={(e) => handleExpiryChange(e.target.value)}
                    disabled={setParamsMutation.isPending || isLoading}
                    className="w-36"
                  />
                </div>

                {/* ROR Min */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    ROR Min (%)
                  </label>
                  <input
                    type="number"
                    value={ror * 100}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) / 100;
                      setRor(val);
                    }}
                    onBlur={() => handleRorChange(ror)}
                    step="0.1"
                    min="0"
                    max="10"
                    disabled={setParamsMutation.isPending || isLoading}
                    className="w-20"
                  />
                </div>

                {setParamsMutation.isPending && (
                  <div className="flex items-center text-xs text-blue-600">
                    Updating & refreshing...
                  </div>
                )}
              </div>
            </div>

            {/* Client Filters Section */}
            <div className="col-span-full">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Display Filters
              </h3>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Price Min
              </label>
              <input
                type="number"
                value={priceMin}
                onChange={(e) => setPriceMin(parseFloat(e.target.value) || 0)}
                min="0"
                className="w-24"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Price Max
              </label>
              <input
                type="number"
                value={priceMax}
                onChange={(e) => setPriceMax(parseFloat(e.target.value) || 999999)}
                min="0"
                className="w-24"
              />
            </div>

            {/* RSI Max */}
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                RSI Max
              </label>
              <input
                type="number"
                value={rsiMax}
                onChange={(e) => setRsiMax(parseFloat(e.target.value) || 100)}
                min="0"
                max="100"
                className="w-20"
              />
            </div>

            {/* BB% Max */}
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                BB% Max
              </label>
              <input
                type="number"
                value={bbPercentMax}
                onChange={(e) => setBbPercentMax(parseFloat(e.target.value) || 100)}
                min="0"
                max="100"
                className="w-20"
              />
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-xs text-gray-600 mb-1">Sort By</label>
              <div className="flex gap-1">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortColumn)}
                  className="flex-1"
                >
                  {sortOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {getSortLabel(opt)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={toggleSortDirection}
                  className="btn btn-ghost px-2"
                  title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                >
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>

            {/* Cash Amount */}
            <div>
              <label className="block text-xs text-gray-600 mb-1">Cash ($K)</label>
              <input
                type="number"
                value={cashAmount}
                onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
                min="0"
                step="5"
                className="w-20"
              />
            </div>

            {/* Earnings Threshold */}
            <div>
              <label className="block text-xs text-gray-600 mb-1">Earnings (wks)</label>
              <input
                type="number"
                value={earningsWeekThreshold}
                onChange={(e) => setEarningsWeekThreshold(parseInt(e.target.value) || 0)}
                min="0"
                max="12"
                className="w-16"
                title="Highlight stocks with earnings within this many weeks"
              />
            </div>

            {/* Exclude Existing */}
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={excludeExisting}
                  onChange={(e) => setExcludeExisting(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-xs text-gray-600">Exclude Positions</span>
              </label>
            </div>
          </div>

          {/* Score Weighting */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Score Weighting
            </h3>
            <div className="flex flex-wrap gap-4">
              <WeightInput
                label="Fundamentals"
                value={fundamentalsWeight}
                onChange={(val) =>
                  setWeights(val, technicalsWeight, liquidityWeight)
                }
              />
              <WeightInput
                label="Technicals"
                value={technicalsWeight}
                onChange={(val) =>
                  setWeights(fundamentalsWeight, val, liquidityWeight)
                }
              />
              <WeightInput
                label="Liquidity"
                value={liquidityWeight}
                onChange={(val) =>
                  setWeights(fundamentalsWeight, technicalsWeight, val)
                }
              />
              <div className="flex items-end text-xs text-gray-500">
                Total: {fundamentalsWeight + technicalsWeight + liquidityWeight}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WeightInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-600 mb-1">{label} %</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        min="0"
        max="100"
        step="5"
        className="w-16"
      />
    </div>
  );
}
