import { memo } from 'react';
import Link from 'next/link';
import { Eye } from 'lucide-react';

function AdminHeader() {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold text-gray-900">
          Feedback Dashboard
        </h1>
        <div className="flex gap-2">
          <Link
            href="/admin"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/admin-review"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            Live Review
          </Link>
        </div>
      </div>
      <p className="text-gray-600">
        Übersicht aller eingegangenen Website-Feedbacks
      </p>
    </div>
  );
}

export default memo(AdminHeader);