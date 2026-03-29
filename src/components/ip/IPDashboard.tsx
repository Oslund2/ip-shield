import { useState } from 'react';
import { FileText, Shield, ScrollText } from 'lucide-react';
import { PatentApplication } from './PatentApplication';
import { CopyrightApplication } from './CopyrightApplication';
import { TrademarkApplication } from './TrademarkApplication';

type TabId = 'patents' | 'copyrights' | 'trademarks';

const TABS: { id: TabId; label: string; icon: typeof FileText; color: string; activeColor: string; hoverColor: string }[] = [
  { id: 'patents', label: 'Patents', icon: ScrollText, color: 'text-blue-600', activeColor: 'bg-gradient-to-r from-blue-600 to-indigo-600', hoverColor: 'hover:bg-blue-50 hover:text-blue-700' },
  { id: 'copyrights', label: 'Copyrights', icon: FileText, color: 'text-purple-600', activeColor: 'bg-gradient-to-r from-purple-600 to-violet-600', hoverColor: 'hover:bg-purple-50 hover:text-purple-700' },
  { id: 'trademarks', label: 'Trademarks', icon: Shield, color: 'text-amber-600', activeColor: 'bg-gradient-to-r from-amber-500 to-orange-500', hoverColor: 'hover:bg-amber-50 hover:text-amber-700' }
];

export function IPDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('patents');

  return (
    <div className="space-y-8">
      {/* Full-width tab bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2">
        <div className="grid grid-cols-3 gap-2">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? `${tab.activeColor} text-white shadow-md`
                    : `text-gray-500 ${tab.hoverColor}`
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                {tab.label}
                {!isActive && (
                  <span className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full opacity-0 transition-opacity ${tab.color.replace('text-', 'bg-')}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="transition-all duration-200">
        {activeTab === 'patents' && <PatentApplication />}
        {activeTab === 'copyrights' && <CopyrightApplication />}
        {activeTab === 'trademarks' && <TrademarkApplication />}
      </div>
    </div>
  );
}
