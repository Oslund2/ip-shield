import { useState } from 'react';
import { FileText, Shield, ScrollText } from 'lucide-react';
import { PatentApplication } from './PatentApplication';
import { CopyrightApplication } from './CopyrightApplication';
import { TrademarkApplication } from './TrademarkApplication';

type TabId = 'patents' | 'copyrights' | 'trademarks';

const TABS: { id: TabId; label: string; icon: typeof FileText }[] = [
  { id: 'patents', label: 'Patents', icon: ScrollText },
  { id: 'copyrights', label: 'Copyrights', icon: FileText },
  { id: 'trademarks', label: 'Trademarks', icon: Shield }
];

export function IPDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('patents');

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-1.5 inline-flex gap-1">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-shield-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-shield-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'patents' && <PatentApplication />}
        {activeTab === 'copyrights' && <CopyrightApplication />}
        {activeTab === 'trademarks' && <TrademarkApplication />}
      </div>
    </div>
  );
}
