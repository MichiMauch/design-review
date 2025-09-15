'use client';

import { useState, useEffect } from 'react';
import { Pipette } from 'lucide-react';

/**
 * Color picker component for status cards
 * Uses native HTML5 color picker with Tailwind class generation
 */
export default function StatusColorPicker({ value, onChange, isOpen, onToggle }) {
  const [hexColor, setHexColor] = useState('#6B7280'); // Default gray

  // Convert Tailwind classes to hex color (approximation)
  useEffect(() => {
    if (value) {
      // Extract color from Tailwind classes
      if (value.includes('red')) setHexColor('#DC2626');
      else if (value.includes('orange')) setHexColor('#EA580C');
      else if (value.includes('yellow')) setHexColor('#CA8A04');
      else if (value.includes('green')) setHexColor('#16A34A');
      else if (value.includes('blue')) setHexColor('#2563EB');
      else if (value.includes('indigo')) setHexColor('#4F46E5');
      else if (value.includes('purple')) setHexColor('#9333EA');
      else if (value.includes('pink')) setHexColor('#DB2777');
      else if (value.includes('gray')) setHexColor('#6B7280');
    }
  }, [value]);

  // Convert hex to Tailwind classes
  const hexToTailwind = (hex) => {
    const color = hex.toLowerCase();

    // Map common colors to Tailwind classes
    const colorMap = {
      '#dc2626': 'bg-red-100 text-red-800 border-red-200',
      '#ea580c': 'bg-orange-100 text-orange-800 border-orange-200',
      '#ca8a04': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      '#16a34a': 'bg-green-100 text-green-800 border-green-200',
      '#2563eb': 'bg-blue-100 text-blue-800 border-blue-200',
      '#4f46e5': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      '#9333ea': 'bg-purple-100 text-purple-800 border-purple-200',
      '#db2777': 'bg-pink-100 text-pink-800 border-pink-200',
      '#6b7280': 'bg-gray-100 text-gray-800 border-gray-200'
    };

    // Find closest color
    let closestColor = '#6b7280';
    let minDistance = Infinity;

    Object.keys(colorMap).forEach(mapColor => {
      const distance = colorDistance(color, mapColor);
      if (distance < minDistance) {
        minDistance = distance;
        closestColor = mapColor;
      }
    });

    return colorMap[closestColor] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Calculate color distance (simple RGB difference)
  const colorDistance = (hex1, hex2) => {
    const rgb1 = hexToRgb(hex1);
    const rgb2 = hexToRgb(hex2);

    return Math.sqrt(
      Math.pow(rgb1.r - rgb2.r, 2) +
      Math.pow(rgb1.g - rgb2.g, 2) +
      Math.pow(rgb1.b - rgb2.b, 2)
    );
  };

  // Convert hex to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  const handleColorChange = (e) => {
    const newHex = e.target.value;
    setHexColor(newHex);
    const tailwindClasses = hexToTailwind(newHex);
    onChange(tailwindClasses);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Preview */}
      <div
        className={`px-3 py-1 rounded-full border font-medium text-xs ${value}`}
      >
        Beispiel
      </div>

      {/* Color Picker */}
      <div className="relative">
        <input
          type="color"
          value={hexColor}
          onChange={handleColorChange}
          className="absolute opacity-0 w-8 h-8 cursor-pointer"
          title="Farbe wählen"
        />
        <button
          type="button"
          onClick={() => document.querySelector('input[type="color"]').click()}
          className="flex items-center gap-1 px-2 py-1 text-sm border rounded hover:bg-gray-50"
          style={{ borderColor: hexColor }}
        >
          <Pipette className="h-4 w-4" style={{ color: hexColor }} />
          <span>Farbe</span>
        </button>
      </div>
    </div>
  );
}