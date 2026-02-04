interface NavigationProps {
  activeTab: 'screener' | 'monitor';
  onTabChange: (tab: 'screener' | 'monitor') => void;
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-[1600px] mx-auto px-4">
        <div className="flex gap-1">
          <TabButton
            isActive={activeTab === 'screener'}
            onClick={() => onTabChange('screener')}
          >
            Screener
          </TabButton>
          <TabButton
            isActive={activeTab === 'monitor'}
            onClick={() => onTabChange('monitor')}
          >
            Monitor
          </TabButton>
        </div>
      </div>
    </nav>
  );
}

interface TabButtonProps {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ isActive, onClick, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        isActive
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
      }`}
    >
      {children}
    </button>
  );
}
