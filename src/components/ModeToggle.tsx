'use client';

import { Eye, MessageSquare } from 'lucide-react';
import { Mode } from '@/lib/types';

interface ModeToggleProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
}

export default function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => onModeChange('browse')}
        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 ${
          mode === 'browse'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-800'
        }`}
      >
        <Eye className="h-4 w-4" />
        Browse Mode
      </button>
      
      <button
        onClick={() => onModeChange('comment')}
        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 ${
          mode === 'comment'
            ? 'bg-white text-red-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-800'
        }`}
      >
        <MessageSquare className="h-4 w-4" />
        Comment Mode
      </button>
    </div>
  );
}