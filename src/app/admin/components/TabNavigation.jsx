import { memo } from 'react';
import { BarChart3, Users, MessageSquare, Settings } from 'lucide-react';

const TABS = [
  { id: 'stats', label: 'Statistiken', icon: BarChart3 },
  { id: 'users', label: 'Benutzer', icon: Users },
  { id: 'feedback', label: 'Tasks', icon: MessageSquare },
  { id: 'settings', label: 'Einstellungen', icon: Settings }
];

function TabNavigation({ activeTab, onTabChange }) {
  return (
    <div className="bg-white rounded-lg shadow mb-8">
      <div className="flex border-b">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-6 py-3 flex items-center gap-2 font-medium ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-5 w-5" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default memo(TabNavigation);