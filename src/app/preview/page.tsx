'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, ExternalLink } from 'lucide-react';
import { Comment } from '@/lib/types';
import { captureScreenshot } from '@/lib/api';
import PreviewViewer from '@/components/PreviewViewer';
import CommentList from '@/components/CommentList';

export default function PreviewPage() {
  const [url, setUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const savedUrl = sessionStorage.getItem('previewUrl');
    if (!savedUrl) {
      router.push('/');
      return;
    }

    setUrl(savedUrl);
    loadScreenshot(savedUrl);

    // Load comments from localStorage
    const savedComments = localStorage.getItem(`comments_${savedUrl}`);
    if (savedComments) {
      try {
        const parsedComments = JSON.parse(savedComments).map((comment: Comment & { timestamp: string }) => ({
          ...comment,
          timestamp: new Date(comment.timestamp),
        }));
        setComments(parsedComments);
      } catch (err) {
      }
    }
  }, [router]);

  const loadScreenshot = async (targetUrl: string) => {
    setIsLoading(true);
    setError('');

    try {
      const result = await captureScreenshot(targetUrl);
      
      if (result.success && result.imageUrl) {
        setImageUrl(result.imageUrl);
      } else {
        setError(result.error || 'Screenshot konnte nicht erstellt werden');
      }
    } catch (err) {
      setError('Fehler beim Laden des Screenshots');
    } finally {
      setIsLoading(false);
    }
  };

  const saveComments = (updatedComments: Comment[]) => {
    localStorage.setItem(`comments_${url}`, JSON.stringify(updatedComments));
  };

  const handleAddComment = (comment: Comment) => {
    const updatedComments = [...comments, comment];
    setComments(updatedComments);
    saveComments(updatedComments);
  };

  const handleEditComment = (id: string, newText: string) => {
    const updatedComments = comments.map(comment =>
      comment.id === id ? { ...comment, text: newText } : comment
    );
    setComments(updatedComments);
    saveComments(updatedComments);
  };

  const handleDeleteComment = (id: string) => {
    const updatedComments = comments.filter(comment => comment.id !== id);
    setComments(updatedComments);
    saveComments(updatedComments);
  };

  const handleExportComments = () => {
    const exportData = {
      url,
      timestamp: new Date().toISOString(),
      comments: comments.map(comment => ({
        position: `${Math.round(comment.x)}%, ${Math.round(comment.y)}%`,
        text: comment.text,
        timestamp: comment.timestamp.toISOString(),
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url_obj = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url_obj;
    a.download = `design-review-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url_obj);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Screenshot wird erstellt...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-red-600 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Fehler</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Zurück zur Startseite
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zur Startseite
          </button>
          
          <div className="flex gap-3">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Website öffnen
            </a>
            <button
              onClick={handleExportComments}
              disabled={comments.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
              Kommentare exportieren
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Preview */}
          <div className="lg:col-span-2">
            <PreviewViewer
              imageUrl={imageUrl}
              url={url}
              comments={comments}
              onAddComment={handleAddComment}
            />
          </div>

          {/* Comments Sidebar */}
          <div className="lg:col-span-1">
            <CommentList
              comments={comments}
              onEditComment={handleEditComment}
              onDeleteComment={handleDeleteComment}
            />
          </div>
        </div>
      </div>
    </div>
  );
}