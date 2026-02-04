import { FilterPanel } from '@/components/screener/FilterPanel';
import { ScreenerTable } from '@/components/screener/ScreenerTable';
import { LoadingOverlay } from '@/components/common/LoadingSpinner';
import { useScreenerQuery } from '@/hooks/useScreenerQuery';
import { useFilteredScreenerData } from '@/hooks/useFilteredData';

export function ScreenerPage() {
  const { data, isLoading, error } = useScreenerQuery();
  const filteredData = useFilteredScreenerData(data?.data || []);

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <h3 className="font-medium">Error loading data</h3>
          <p className="text-sm mt-1">{error.message}</p>
          <p className="text-xs mt-2 text-red-500">
            Make sure your API URL and password are configured in the .env file.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <FilterPanel isLoading={isLoading} />

      {/* Stats bar */}
      <div className="flex items-center justify-between mb-2 text-sm text-gray-600">
        <span>
          Showing {filteredData.length} of {data?.data?.length || 0} symbols
        </span>
      </div>

      {isLoading ? (
        <LoadingOverlay message="Loading screener data..." />
      ) : (
        <ScreenerTable data={filteredData} />
      )}
    </div>
  );
}
