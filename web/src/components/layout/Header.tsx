import { RefreshCw } from 'lucide-react';
import { formatTimestamp } from '@/utils/formatting';

interface HeaderProps {
  lastUpdated: string | null;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function Header({ lastUpdated, isRefreshing, onRefresh }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-[1600px] mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900">
              Proverbs Trading
            </h1>
            <span className="text-sm text-gray-500">Options Screener</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">
              Last updated: {formatTimestamp(lastUpdated)}
            </span>
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="btn btn-secondary flex items-center gap-2"
              title="Refresh data from Google Sheets"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
