import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Navigation } from '@/components/layout/Navigation';
import { ScreenerPage } from '@/pages/ScreenerPage';
import { MonitorPage } from '@/pages/MonitorPage';
import { useMetadataQuery, useRefreshMutation, useScreenerQuery } from '@/hooks/useScreenerQuery';
import { isApiConfigured } from '@/api/client';

type Tab = 'screener' | 'monitor';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('screener');

  // Initialize metadata and data
  useMetadataQuery();
  const { data: screenerData } = useScreenerQuery();
  const refreshMutation = useRefreshMutation();

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  // Show configuration warning if API is not configured
  if (!isApiConfigured()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
          <h1 className="text-xl font-bold text-gray-900 mb-4">
            Configuration Required
          </h1>
          <p className="text-gray-600 mb-4">
            Please configure your API URL and password to connect to your Google
            Sheets backend.
          </p>
          <div className="bg-gray-50 rounded p-4 text-sm font-mono">
            <p className="text-gray-700">1. Copy <code>.env.example</code> to <code>.env</code></p>
            <p className="text-gray-700 mt-2">2. Set your values:</p>
            <pre className="mt-2 text-xs text-gray-600">
              VITE_API_URL=https://script.google.com/macros/s/YOUR_ID/exec{'\n'}
              VITE_API_PASSWORD=your_password
            </pre>
            <p className="text-gray-700 mt-2">3. Restart the dev server</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        lastUpdated={screenerData?.lastUpdated || null}
        isRefreshing={refreshMutation.isPending}
        onRefresh={handleRefresh}
      />
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="max-w-[1600px] mx-auto">
        {activeTab === 'screener' && <ScreenerPage />}
        {activeTab === 'monitor' && <MonitorPage />}
      </main>
    </div>
  );
}
