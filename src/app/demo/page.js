'use client';

import { useEffect } from 'react';
import { ArrowLeft, Star, Users, Zap } from 'lucide-react';
import Link from 'next/link';

export default function DemoPage() {
  useEffect(() => {
    // Force complete cleanup
    const cleanup = () => {
      const existingWidget = document.querySelector('.feedback-widget-button');
      if (existingWidget) existingWidget.remove();
      
      const overlay = document.querySelector('.feedback-widget-overlay');
      if (overlay) overlay.remove();
      
      const selection = document.querySelector('.feedback-widget-selection-overlay');
      if (selection) selection.remove();
      
      const selectionBox = document.querySelector('.feedback-widget-selection-box');
      if (selectionBox) selectionBox.remove();
      
      // Remove html2canvas scripts that might still be loading
      const html2canvasScripts = document.querySelectorAll('script[src*="html2canvas"]');
      html2canvasScripts.forEach(script => script.remove());
      
      window.FeedbackWidget = null;
      if (window.html2canvas) delete window.html2canvas;
    };

    cleanup();

    // Load the feedback widget with strong cache busting
    const script = document.createElement('script');
    script.src = `/widget.js?v=${Date.now()}&nocache=true`;
    script.setAttribute('data-project-id', 'demo-website');
    script.defer = true;
    
    script.onload = () => {
    };
    
    document.head.appendChild(script);

    return cleanup;
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück zur Startseite
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Demo Website</span>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-600">Widget aktiv</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Willkommen zur Demo Website
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Dies ist eine Beispiel-Website zum Testen des Feedback-Widgets. 
            Schauen Sie unten rechts - dort finden Sie den Feedback-Button!
          </p>
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg">
            <Zap className="h-5 w-5" />
            Das Feedback-Widget ist aktiv
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Unsere Features
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Erstklassige Qualität
              </h3>
              <p className="text-gray-600">
                Wir bieten nur die beste Qualität für unsere Kunden. 
                Jedes Detail wird sorgfältig durchdacht und umgesetzt.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Kundenorientiert
              </h3>
              <p className="text-gray-600">
                Unsere Kunden stehen im Mittelpunkt. Wir hören zu und 
                entwickeln Lösungen, die wirklich helfen.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Schnell & Effizient
              </h3>
              <p className="text-gray-600">
                Zeit ist wertvoll. Deshalb arbeiten wir schnell und 
                effizient, ohne Kompromisse bei der Qualität.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Testen Sie das Feedback-Widget!
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Klicken Sie auf den Feedback-Button unten rechts und geben Sie uns Ihr Feedback zu dieser Demo-Seite.
            Das Widget erstellt automatisch einen Screenshot und sendet Ihr Feedback an unser System.
          </p>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="bg-white bg-opacity-10 backdrop-blur rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-2">
                1. Feedback-Button klicken
              </h3>
              <p className="text-blue-100 text-sm">
                Unten rechts auf der Seite finden Sie den Button &quot;💬 Feedback geben&quot;
              </p>
            </div>
            <div className="bg-white bg-opacity-10 backdrop-blur rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-2">
                2. Kommentar schreiben
              </h3>
              <p className="text-blue-100 text-sm">
                Schreiben Sie Ihr Feedback und klicken Sie auf &quot;Senden&quot;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="prose max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Lorem Ipsum Content
            </h2>
            <p className="text-gray-600 mb-4">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod 
              tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, 
              quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </p>
            <p className="text-gray-600 mb-4">
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore 
              eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, 
              sunt in culpa qui officia deserunt mollit anim id est laborum.
            </p>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Unterabschnitt
            </h3>
            <p className="text-gray-600 mb-4">
              Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium 
              doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore 
              veritatis et quasi architecto beatae vitae dicta sunt explicabo.
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>Erstes Listenelement mit wichtigen Informationen</li>
              <li>Zweites Element für weitere Details</li>
              <li>Drittes Element zur Vervollständigung</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-gray-400">
            © 2024 Demo Website - Feedback Widget Test
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Dies ist eine Demo-Seite zum Testen des Website Review Tools
          </p>
        </div>
      </footer>
    </div>
  );
}