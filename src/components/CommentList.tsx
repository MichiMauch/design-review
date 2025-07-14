'use client';

import { useState } from 'react';
import { Trash2, Edit2, MessageSquare, Clock } from 'lucide-react';
import { Comment } from '@/lib/types';
import { formatTimestamp } from '@/lib/utils';

interface CommentListProps {
  comments: Comment[];
  onEditComment: (id: string, newText: string) => void;
  onDeleteComment: (id: string) => void;
  onCommentSelect?: (comment: Comment) => void;
}

export default function CommentList({
  comments,
  onEditComment,
  onDeleteComment,
  onCommentSelect,
}: CommentListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleEditStart = (comment: Comment) => {
    setEditingId(comment.id);
    setEditText(comment.text);
  };

  const handleEditSave = () => {
    if (editingId && editText.trim()) {
      onEditComment(editingId, editText.trim());
      setEditingId(null);
      setEditText('');
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleCommentClick = (comment: Comment) => {
    if (onCommentSelect) {
      onCommentSelect(comment);
    }
  };

  if (comments.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Kommentare</h3>
        <p className="text-gray-600">
          Wechseln Sie in den Comment Mode und klicken Sie auf das Preview-Bild, um Kommentare hinzuzufügen.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Kommentare ({comments.length})
        </h3>
      </div>
      
      <div className="space-y-3">
        {comments.map((comment, index) => (
          <div
            key={comment.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleCommentClick(comment)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {index + 1}
                </div>
                
                <div className="flex-1 min-w-0">
                  {editingId === comment.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditSave();
                          }}
                          className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Speichern
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditCancel();
                          }}
                          className="text-sm px-3 py-1 text-gray-600 hover:text-gray-800"
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-gray-900 text-sm leading-relaxed mb-2">
                        {comment.text}
                      </p>
                      <div className="flex items-center text-xs text-gray-500 gap-4">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimestamp(comment.timestamp)}
                        </div>
                        <div>
                          Position: {Math.round(comment.x)}%, {Math.round(comment.y)}%
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {editingId !== comment.id && (
                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditStart(comment);
                    }}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Bearbeiten"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteComment(comment.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Löschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}