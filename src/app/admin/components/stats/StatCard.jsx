import { memo } from 'react';

function StatCard({ icon: Icon, iconColor, label, value }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <Icon className={`h-8 w-8 ${iconColor}`} />
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">
            {label}
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

export default memo(StatCard);