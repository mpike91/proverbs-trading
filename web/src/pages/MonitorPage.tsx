import { MonitorTable } from '@/components/monitor/MonitorTable';
import { LoadingOverlay } from '@/components/common/LoadingSpinner';
import { useMonitorQuery } from '@/hooks/useScreenerQuery';
import { formatTimestamp } from '@/utils/formatting';

export function MonitorPage() {
  const { data, isLoading, error } = useMonitorQuery();

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <h3 className="font-medium">Error loading monitor data</h3>
          <p className="text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Stats bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600">
          {data?.count || 0} active position{(data?.count || 0) !== 1 ? 's' : ''}
        </div>
        {data?.lastUpdated && (
          <div className="text-xs text-gray-500">
            Monitor updated: {formatTimestamp(data.lastUpdated)}
          </div>
        )}
      </div>

      {isLoading ? (
        <LoadingOverlay message="Loading positions..." />
      ) : (
        <MonitorTable positions={data?.positions || []} />
      )}
    </div>
  );
}
