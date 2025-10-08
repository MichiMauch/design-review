'use client';

import { Info } from 'lucide-react';

export default function InfoTooltip({ content, position = 'top', className = '' }) {
  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-2';
      default:
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'top':
        return 'top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-900';
      case 'bottom':
        return 'bottom-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-900';
      case 'left':
        return 'left-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-900';
      case 'right':
        return 'right-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-900';
      default:
        return 'top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-900';
    }
  };

  return (
    <div className={`group relative inline-flex ${className}`}>
      <Info 
        className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors cursor-help" 
        aria-label="Mehr Informationen"
      />
      
      {/* Tooltip */}
      <div className={`absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap max-w-xs ${getPositionClasses()}`}>
        {content}
        
        {/* Arrow */}
        <div className={`absolute w-0 h-0 border-4 ${getArrowClasses()}`}></div>
      </div>
    </div>
  );
}

// Für längere Texte mit besserer Formatierung
export function InfoTooltipMultiline({ title, content, items = [], position = 'top', className = '' }) {
  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-2';
      default:
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'top':
        return 'top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-900';
      case 'bottom':
        return 'bottom-full left-1/2 transform -translate-y-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-900';
      case 'left':
        return 'left-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-900';
      case 'right':
        return 'right-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-900';
      default:
        return 'top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-900';
    }
  };

  return (
    <div className={`group relative inline-flex ${className}`}>
      <Info 
        className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors cursor-help" 
        aria-label="Mehr Informationen"
      />
      
      {/* Tooltip */}
      <div className={`absolute z-50 p-3 text-sm text-white bg-gray-900 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none w-80 ${getPositionClasses()}`}>
        {title && (
          <div className="font-semibold mb-2">{title}</div>
        )}
        
        {content && (
          <div className="mb-2 whitespace-normal">{content}</div>
        )}
        
        {items.length > 0 && (
          <ul className="list-disc list-inside space-y-1 text-xs">
            {items.map((item, index) => (
              <li key={index} className="whitespace-normal">{item}</li>
            ))}
          </ul>
        )}
        
        {/* Arrow */}
        <div className={`absolute w-0 h-0 border-4 ${getArrowClasses()}`}></div>
      </div>
    </div>
  );
}