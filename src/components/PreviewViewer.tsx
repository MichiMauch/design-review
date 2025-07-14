'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Comment, Mode } from '@/lib/types';
import { generateId } from '@/lib/utils';
import ModeToggle from './ModeToggle';

interface PreviewViewerProps {
  imageUrl: string;
  url: string;
  comments: Comment[];
  onAddComment: (comment: Comment) => void;
  onCommentClick?: (comment: Comment) => void;
}

export default function PreviewViewer({
  imageUrl,
  url,
  comments,
  onAddComment,
  onCommentClick,
}: PreviewViewerProps) {
  const [mode, setMode] = useState<Mode>('browse');
  const [showModal, setShowModal] = useState(false);
  const [, setModalPosition] = useState({ x: 0, y: 0 });
  const [clickPosition, setClickPosition] = useState({ x: 0, y: 0 });
  const [commentText, setCommentText] = useState('');
  const imageRef = useRef<HTMLImageElement>(null);

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (mode !== 'comment') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate relative position as percentage
    const relativeX = (x / rect.width) * 100;
    const relativeY = (y / rect.height) * 100;

    setClickPosition({ x: relativeX, y: relativeY });
    setModalPosition({ x: e.clientX, y: e.clientY });
    setShowModal(true);
    setCommentText('');
  };

  const handleSaveComment = () => {
    if (!commentText.trim()) return;

    const newComment: Comment = {
      id: generateId(),
      x: clickPosition.x,
      y: clickPosition.y,
      text: commentText.trim(),
      timestamp: new Date(),
    };

    onAddComment(newComment);
    setShowModal(false);
    setCommentText('');
  };

  const handleCancel = () => {
    setShowModal(false);
    setCommentText('');
  };

  const handleCommentMarkerClick = (comment: Comment, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCommentClick) {
      onCommentClick(comment);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with URL and Mode Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-600 mb-1">Preview für:</p>
          <p className="text-lg font-medium truncate">{url}</p>
        </div>
        <ModeToggle mode={mode} onModeChange={setMode} />
      </div>

      {/* Mode Indicator */}
      <div className="text-center">
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            mode === 'browse'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {mode === 'browse' ? '👁️ Browse Mode' : '💬 Comment Mode - Klicken Sie auf das Bild um Kommentare hinzuzufügen'}
        </span>
      </div>

      {/* Preview Image Container */}
      <div className="relative bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="relative">
          <Image
            ref={imageRef}
            src={imageUrl}
            alt="Website Preview"
            width={1200}
            height={800}
            className={`w-full h-auto ${mode === 'comment' ? 'cursor-crosshair' : 'cursor-default'}`}
            onClick={handleImageClick}
            unoptimized
          />
          
          {/* Comment Markers */}
          {comments.map((comment, index) => (
            <div
              key={comment.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              style={{
                left: `${comment.x}%`,
                top: `${comment.y}%`,
              }}
              onClick={(e) => handleCommentMarkerClick(comment, e)}
            >
              <div className="relative">
                <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg hover:bg-red-600 transition-colors">
                  {index + 1}
                </div>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                  {comment.text.length > 30 ? comment.text.substring(0, 30) + '...' : comment.text}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium mb-4">Kommentar hinzufügen</h3>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Beschreiben Sie das Problem oder Ihre Anmerkung..."
              className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveComment}
                disabled={!commentText.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
              >
                Kommentar speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}