import { MessageSquare } from 'lucide-react';

export default function EmptyTaskState() {
  return (
    <div className="bg-white rounded-lg shadow p-8 text-center">
      <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Keine Tasks
      </h3>
      <p className="text-gray-600">
        Sobald Tasks erstellt werden, erscheinen sie hier.
      </p>
    </div>
  );
}