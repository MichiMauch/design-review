'use client';

import { useState, useEffect, useRef } from 'react';
import { ExternalLink, CheckCircle, XCircle, AlertCircle, RefreshCw, Smartphone, Image, Search, Wand2, Upload, Copy, Download, X, Code, ImageIcon } from 'lucide-react';
import InfoTooltip, { InfoTooltipMultiline } from './shared/InfoTooltip';

export default function IconsAnalysis({ projectId, projectUrl, showHeader = true }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Favicon Generator State
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const [generatorLoading, setGeneratorLoading] = useState(false);
  const [generatorError, setGeneratorError] = useState(null);
  const [generatedFavicons, setGeneratedFavicons] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const fileInputRef = useRef(null);

  const fetchAnalysis = async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      // Build URL with optional custom URL parameter
      let apiUrl = `/api/projects/${projectId}/icons-analysis`;
      if (projectUrl) {
        const urlParam = encodeURIComponent(projectUrl);
        apiUrl += `?url=${urlParam}`;
      }

      const response = await fetch(apiUrl);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch analysis');
      }

      setAnalysis(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectUrl) {
      fetchAnalysis();
    }
  }, [projectId, projectUrl]);

  // Favicon Generator Functions
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      setGeneratorError('Bitte wähle eine Bilddatei aus (PNG, JPG, SVG)');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setGeneratorError('Die Datei ist zu gross (max. 5MB)');
      return;
    }

    setUploadedImage(file);
    setGeneratorError(null);
    setGeneratedFavicons(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const generateFavicons = async () => {
    if (!uploadedImage && !imagePreview) {
      setGeneratorError('Bitte wähle zuerst ein Bild aus');
      return;
    }

    setGeneratorLoading(true);
    setGeneratorError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/generate-favicons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: imagePreview,
          appName: new URL(projectUrl).hostname.replace('www.', '')
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Favicon-Generierung fehlgeschlagen');
      }

      setGeneratedFavicons(data);
    } catch (err) {
      setGeneratorError(err.message);
    } finally {
      setGeneratorLoading(false);
    }
  };

  const copyHtmlToClipboard = () => {
    if (!generatedFavicons?.html) return;

    const htmlCode = generatedFavicons.html.join('\n');
    navigator.clipboard.writeText(htmlCode);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  const downloadAsZip = async () => {
    if (!generatedFavicons) return;

    // Dynamic import for JSZip
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    // Add images
    generatedFavicons.images.forEach((image) => {
      const base64Data = image.contents.replace(/^data:image\/\w+;base64,/, '');
      zip.file(image.name, base64Data, { base64: true });
    });

    // Add HTML as a file
    zip.file('favicon-tags.html', generatedFavicons.html.join('\n'));

    // Add manifest and other files
    generatedFavicons.files.forEach((file) => {
      zip.file(file.name, file.contents);
    });

    // Generate and download
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'favicons.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetGenerator = () => {
    setUploadedImage(null);
    setImagePreview(null);
    setGeneratedFavicons(null);
    setGeneratorError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const closeModal = () => {
    setShowGeneratorModal(false);
    resetGenerator();
  };

  const StatusIcon = ({ exists, found }) => {
    if (!found) return <XCircle className="h-4 w-4 text-gray-400" />;
    if (exists) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <AlertCircle className="h-4 w-4 text-orange-500" />;
  };

  const getStatusText = ({ exists, found }) => {
    if (!found) return 'Nicht gefunden';
    if (exists) return 'Verfügbar';
    return 'Definiert aber nicht erreichbar';
  };

  const renderIconSection = (title, icons, tooltipContent) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Image className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {tooltipContent && (
          <InfoTooltip
            content={tooltipContent}
            className="ml-2"
          />
        )}
      </div>

      {icons.length === 0 ? (
        <p className="text-gray-500 text-sm">Keine Icons gefunden</p>
      ) : (
        <div className="space-y-3">
          {icons.map((icon, index) => {
            let finalImageUrl = null;
            let absoluteIconUrl = null;

            if (icon.url) {
              if (icon.url.startsWith('data:')) {
                finalImageUrl = icon.url;
                absoluteIconUrl = null; // No external link for data URIs
              } else {
                absoluteIconUrl = new URL(icon.url, projectUrl).href;
                finalImageUrl = `/api/image-proxy?url=${encodeURIComponent(
                  absoluteIconUrl
                )}`;
              }
            }

            return (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <StatusIcon exists={icon.exists} found={icon.found} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{icon.name}</div>
                        {icon.sizes && (
                          <div className="text-xs text-gray-500">Größe: {icon.sizes}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">
                          {getStatusText(icon)}
                        </span>
                        {absoluteIconUrl && (
                          <a
                            href={absoluteIconUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    {/* Icon preview */}
                    {icon.exists && finalImageUrl && (
                      <div className="mt-2">
                        <img
                          src={finalImageUrl}
                          alt={icon.name}
                          className="w-8 h-8 rounded border border-gray-200 bg-white"
                          style={{ objectFit: 'contain' }}
                          onError={(e) => {
                            const img = e.currentTarget;
                            if (img.dataset.fallbackAttempted) {
                              img.style.display = 'none';
                              const errorSpan = img.nextElementSibling;
                              if (errorSpan) errorSpan.style.display = 'inline-block';
                              return;
                            }
                            
                            try {
                              const siteUrl = new URL(projectUrl);
                              const fallbackUrl = `${siteUrl.origin}/favicon.ico`;
                              const proxiedFallbackUrl = `/api/image-proxy?url=${encodeURIComponent(fallbackUrl)}`;
                              
                              img.setAttribute('data-fallback-attempted', 'true');
                              img.src = proxiedFallbackUrl;
                            } catch (error) {
                              img.style.display = 'none';
                              const errorSpan = img.nextElementSibling;
                              if (errorSpan) errorSpan.style.display = 'inline-block';
                            }
                          }}
                        />
                        <span style={{ display: 'none' }} className="text-xs text-red-600">
                          Bild nicht ladbar
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (!projectUrl) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <p className="text-yellow-800">Keine Projekt-URL konfiguriert. Icons-Analyse nicht verfügbar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Favicons Analyse</h2>
              <p className="text-sm text-gray-600">
                Analyse von: <a href={projectUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{projectUrl}</a>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGeneratorModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <Wand2 className="h-4 w-4" />
              Favicons generieren
            </button>
            <button
              onClick={fetchAnalysis}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Aktualisieren
            </button>
          </div>
        </div>
      )}

      {/* Refresh Button - wenn kein Header gezeigt wird */}
      {!showHeader && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              Analyse von: <a href={projectUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{projectUrl}</a>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGeneratorModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <Wand2 className="h-4 w-4" />
              Favicons generieren
            </button>
            <button
              onClick={fetchAnalysis}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Aktualisieren
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Analysiere Icons...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-800">Fehler beim Laden der Analyse: {error}</p>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && !loading && (
        <>
          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Search className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900">Zusammenfassung</h3>
              <InfoTooltipMultiline
                title="Icons Übersicht"
                content="Schnellübersicht aller wichtigen Icons:"
                items={[
                  "Favicon: Website-Icon im Browser-Tab",
                  "Apple Icons: Icons für iOS Geräte (Homescreen)",
                  "Android Icons: Icons für Android & PWA",
                  "Microsoft Tiles: Windows Start-Menü Icons"
                ]}
                className="ml-2"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                {analysis.summary.hasFavicon ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Favicon</span>
              </div>
              <div className="flex items-center gap-2">
                {analysis.summary.hasAppleIcons ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Apple Icons</span>
              </div>
              <div className="flex items-center gap-2">
                {analysis.summary.hasAndroidIcons ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Android Icons</span>
              </div>
              <div className="flex items-center gap-2">
                {analysis.summary.hasMicrosoftIcons ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Microsoft Tiles</span>
              </div>
            </div>
            <div className="mt-3 text-sm text-blue-800">
              Icons gefunden: {analysis.summary.totalIconsFound} | Verfügbar: {analysis.summary.totalIconsExist}
            </div>
          </div>

          {/* Icons Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {renderIconSection(
              'Favicon',
              analysis.icons.favicon,
              'Das kleine Icon das im Browser-Tab, Lesezeichen und Favoriten angezeigt wird'
            )}
            {renderIconSection(
              'Apple Touch Icons',
              analysis.icons.apple,
              'Spezielle Icons für iOS Geräte wenn die Website zum Homescreen hinzugefügt wird'
            )}
            {renderIconSection(
              'Android Icons',
              analysis.icons.android,
              'Icons für Android Geräte und Progressive Web Apps (PWA)'
            )}
          </div>

          {/* Microsoft Tiles (optional 4th column on full width) */}
          {analysis.icons.microsoft && analysis.icons.microsoft.length > 0 && (
            <div className="grid grid-cols-1 gap-6">
              {renderIconSection(
                'Microsoft Tiles',
                analysis.icons.microsoft,
                'Spezielle Kacheln für Windows Start-Menü'
              )}
            </div>
          )}
        </>
      )}

      {/* Favicon Generator Modal */}
      {showGeneratorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Wand2 className="h-6 w-6 text-purple-600" />
                <h2 className="text-xl font-semibold text-gray-900">Favicon Generator</h2>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Upload Section */}
              {!generatedFavicons && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Bild hochladen</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Lade ein quadratisches Bild hoch (mindestens 512x512px empfohlen).
                      Am besten eignet sich ein PNG mit transparentem Hintergrund.
                    </p>
                  </div>

                  <div className="flex items-start gap-6">
                    {/* Upload Area */}
                    <div className="flex-1">
                      <label
                        className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors"
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <Upload className="h-10 w-10 text-gray-400 mb-3" />
                        <span className="text-sm text-gray-600">Klicken oder Datei hierher ziehen</span>
                        <span className="text-xs text-gray-400 mt-1">PNG, JPG, SVG (max. 5MB)</span>
                      </label>
                    </div>

                    {/* Preview */}
                    {imagePreview && (
                      <div className="flex-shrink-0">
                        <p className="text-sm font-medium text-gray-700 mb-2">Vorschau</p>
                        <div className="w-32 h-32 border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <button
                          onClick={resetGenerator}
                          className="mt-2 text-sm text-red-600 hover:text-red-700"
                        >
                          Bild entfernen
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Error */}
                  {generatorError && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <XCircle className="h-5 w-5 text-red-500" />
                      <span className="text-sm text-red-700">{generatorError}</span>
                    </div>
                  )}

                  {/* Generate Button */}
                  <button
                    onClick={generateFavicons}
                    disabled={!imagePreview || generatorLoading}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
                  >
                    {generatorLoading ? (
                      <>
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        Generiere Favicons...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-5 w-5" />
                        Favicons generieren
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Results Section */}
              {generatedFavicons && (
                <div className="space-y-6">
                  {/* Success Message */}
                  <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-green-700">
                      {generatedFavicons.summary.totalImages} Icons erfolgreich generiert!
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={downloadAsZip}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Als ZIP herunterladen
                    </button>
                    <button
                      onClick={copyHtmlToClipboard}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                      <Copy className="h-4 w-4" />
                      {copiedHtml ? 'Kopiert!' : 'HTML kopieren'}
                    </button>
                    <button
                      onClick={resetGenerator}
                      className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Neues Bild
                    </button>
                  </div>

                  {/* Icons Preview */}
                  <div>
                    <h3 className="flex items-center gap-2 font-medium text-gray-900 mb-3">
                      <ImageIcon className="h-5 w-5 text-purple-600" />
                      Generierte Icons
                    </h3>
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 p-4 bg-gray-50 rounded-lg">
                      {generatedFavicons.images.slice(0, 16).map((image, index) => (
                        <div key={index} className="flex flex-col items-center">
                          <div className="w-12 h-12 border border-gray-200 rounded bg-white flex items-center justify-center overflow-hidden">
                            <img
                              src={image.contents}
                              alt={image.name}
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                          <span className="text-xs text-gray-500 mt-1 truncate max-w-full" title={image.name}>
                            {image.name.replace(/\.\w+$/, '').slice(0, 10)}
                          </span>
                        </div>
                      ))}
                      {generatedFavicons.images.length > 16 && (
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-sm text-gray-500">
                            +{generatedFavicons.images.length - 16} mehr
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* HTML Code */}
                  <div>
                    <h3 className="flex items-center gap-2 font-medium text-gray-900 mb-3">
                      <Code className="h-5 w-5 text-purple-600" />
                      HTML-Code für &lt;head&gt;
                    </h3>
                    <div className="relative">
                      <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm">
                        <code>{generatedFavicons.html.join('\n')}</code>
                      </pre>
                      <button
                        onClick={copyHtmlToClipboard}
                        className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                        title="HTML kopieren"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Files Info */}
                  {generatedFavicons.files.length > 0 && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Zusätzliche Dateien</h3>
                      <p className="text-sm text-gray-600">
                        Im ZIP enthalten: {generatedFavicons.files.map(f => f.name).join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
