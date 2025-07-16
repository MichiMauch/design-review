// Proxy: Lädt immer die aktuelle Widget-Logik aus widget-new.js
// Dies stellt sicher, dass /public/widget.js immer die aktuelle Version verwendet
(function() {
  var script = document.createElement('script');
  script.src = (document.currentScript && document.currentScript.src.replace(/widget\.js$/, 'widget-new.js')) || '/public/widget-new.js';
  script.async = false;
  // Attribute wie data-project-id übernehmen
  if (document.currentScript) {
    Array.from(document.currentScript.attributes).forEach(function(attr) {
      if (attr.name.startsWith('data-')) {
        script.setAttribute(attr.name, attr.value);
      }
    });
  }
  document.currentScript.parentNode.insertBefore(script, document.currentScript.nextSibling);
})();
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: #007bff;
            color: white;
            border: none;
            font-size: 24px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,123,255,0.3);
            z-index: 9999;
            transition: all 0.3s ease;
        `;
        
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';

// Proxy: Lädt immer die aktuelle Widget-Logik aus widget-new.js
// Dies stellt sicher, dass /public/widget.js immer die aktuelle Version verwendet
(function() {
  var script = document.createElement('script');
  script.src = (document.currentScript && document.currentScript.src.replace(/widget\.js$/, 'widget-new.js')) || '/public/widget-new.js';
  script.async = false;
  // Attribute wie data-project-id übernehmen
  if (document.currentScript) {
    Array.from(document.currentScript.attributes).forEach(function(attr) {
      if (attr.name.startsWith('data-')) {
        script.setAttribute(attr.name, attr.value);
      }
    });
  }
  document.currentScript.parentNode.insertBefore(script, document.currentScript.nextSibling);
})();
    // Show error message
    function showErrorMessage() {
        const errorModal = document.createElement('div');
        errorModal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                        background: rgba(0,0,0,0.5); z-index: 10001; 
                        display: flex; align-items: center; justify-content: center;">
                <div style="background: white; padding: 40px; border-radius: 12px; 
                            max-width: 400px; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,0.2);">
                    <div style="font-size: 48px; margin-bottom: 20px;">❌</div>
                    <h3 style="margin: 0 0 15px 0; color: #333; font-family: Arial, sans-serif;">
                        Fehler beim Senden
                    </h3>
                    <p style="color: #666; margin: 0 0 25px 0; font-family: Arial, sans-serif;">
                        Das Feedback konnte nicht gesendet werden. Bitte versuchen Sie es später erneut.
                    </p>
                    <button onclick="this.closest('div').parentElement.remove()" 
                            style="padding: 12px 24px; background: #dc3545; color: white; 
                                   border: none; border-radius: 6px; cursor: pointer;
                                   font-family: Arial, sans-serif;">
                        Schließen
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(errorModal);
    }
    
    // Initialize widget
    function initWidget() {
        if (document.getElementById('feedback-widget-button')) {
            console.log('Widget: Already initialized');
            return;
        }
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createFeedbackButton);
        } else {
            createFeedbackButton();
        }
        
        console.log('Widget: Initialized successfully');
    }
    
    // Start the widget and expose global reference for error modal
    window.feedbackWidget = {
        createScreenshotAndAnnotate: createScreenshotAndAnnotate
    };
    
    initWidget();
    
})();
