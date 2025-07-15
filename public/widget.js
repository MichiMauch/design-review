// Website Review Widget v4.0 - Robust Multiple Use
(function() {
  'use strict';

  // Complete cleanup before initialization
  function completeCleanup() {
    // Remove existing widgets
    const existingButtons = document.querySelectorAll('.feedback-widget-button');
    existingButtons.forEach(btn => btn.remove());
    
    const existingOverlays = document.querySelectorAll('.feedback-widget-overlay');
    existingOverlays.forEach(overlay => overlay.remove());
    
    const existingSelections = document.querySelectorAll('.feedback-widget-selection-overlay');
    existingSelections.forEach(selection => selection.remove());
    
    const existingBoxes = document.querySelectorAll('.feedback-widget-selection-box');
    existingBoxes.forEach(box => box.remove());
    
    // Reset global state
    window.FeedbackWidget = null;
  }

  completeCleanup();

  class FeedbackWidget {
    constructor() {
      // Reset all state variables
      this.reset();
      
      this.projectId = this.getProjectId();
      this.apiBase = this.getApiBase();
      
      this.init();
    }

    reset() {
      this.isOpen = false;
      this.isSelecting = false;
      this.isDragging = false;
      this.selectedArea = null;
      this.selectionOverlay = null;
      this.selectionBox = null;
      this.startX = 0;
      this.startY = 0;
      this.boundStartSelection = null;
      this.boundUpdateSelection = null;
      this.boundEndSelection = null;
      
      // Remove any existing elements
      this.cleanupAllElements();
    }

    cleanupAllElements() {
      // Remove all widget-related elements
      const selectors = [
        '.feedback-widget-button',
        '.feedback-widget-overlay', 
        '.feedback-widget-selection-overlay',
        '.feedback-widget-selection-box'
      ];
      
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => el.remove());
      });
    }

    getProjectId() {
      const script = document.querySelector('script[data-project-id]');
      return script ? script.getAttribute('data-project-id') : 'default';
    }

    getApiBase() {
      // Get API base from the script src URL
      const script = document.querySelector('script[src*="widget.js"]');
      if (script && script.src) {
        const url = new URL(script.src);
        return `${url.protocol}//${url.host}`;
      }
      // Fallback to current origin
      return window.location.origin;
    }

    init() {
      this.createButton();
      this.injectStyles();
      this.registerWidgetUsage();
    }

    async registerWidgetUsage() {
      try {
        console.log('Widget: Registering usage for project:', this.projectId, 'API Base:', this.apiBase);
        
        // Find project by name
        const projectResponse = await fetch(`${this.apiBase}/api/projects/by-name/${this.projectId}`);
        if (projectResponse.ok) {
          const project = await projectResponse.json();
          this.projectDbId = project.id;
          
          console.log('Widget: Found project ID:', project.id);
          
          // Register widget usage
          const statusResponse = await fetch(`${this.apiBase}/api/projects/${project.id}/widget-status`, {
            method: 'POST'
          });
          
          if (statusResponse.ok) {
            console.log('Widget: Successfully registered installation');
          } else {
            console.error('Widget: Failed to register status:', statusResponse.status);
          }
        } else {
          console.error('Widget: Project not found:', this.projectId);
        }
      } catch (error) {
        console.error('Failed to register widget usage:', error);
      }
    }

    injectStyles() {
      const style = document.createElement('style');
      style.textContent = `
        .feedback-widget-button {
          position: fixed;
          top: 50%;
          right: 20px;
          transform: translateY(-50%);
          z-index: 999999;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 50px;
          padding: 12px 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          transition: all 0.2s ease;
          writing-mode: vertical-rl;
          text-orientation: mixed;
        }

        .feedback-widget-button:hover {
          background: #2563eb;
          transform: translateY(-50%) translateX(-2px);
          box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
        }

        .feedback-widget-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1000000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          pointer-events: none;
        }

        .feedback-widget-overlay .feedback-widget-modal {
          pointer-events: all;
        }

        .feedback-widget-modal {
          background: white;
          border-radius: 12px;
          padding: 24px;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
        }

        .feedback-widget-modal.minimized {
          position: fixed;
          top: 20px;
          right: 20px;
          max-width: 300px;
          transform: none;
        }

        .feedback-widget-title {
          margin: 0 0 16px 0;
          font-size: 18px;
          font-weight: 600;
          color: #111827;
        }

        .feedback-widget-textarea {
          width: 100%;
          min-height: 100px;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          resize: vertical;
          box-sizing: border-box;
        }

        .feedback-widget-textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .feedback-widget-buttons {
          display: flex;
          gap: 12px;
          margin-top: 16px;
        }

        .feedback-widget-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .feedback-widget-btn-primary {
          background: #3b82f6;
          color: white;
        }

        .feedback-widget-btn-primary:hover {
          background: #2563eb;
        }

        .feedback-widget-btn-secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .feedback-widget-btn-secondary:hover {
          background: #e5e7eb;
        }

        .feedback-widget-loading {
          opacity: 0.6;
          pointer-events: none;
        }

        .feedback-widget-mode-selection {
          margin-bottom: 16px;
          padding: 12px;
          background: #f9fafb;
          border-radius: 6px;
        }

        .feedback-widget-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }

        .feedback-widget-checkbox input[type="checkbox"] {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .feedback-widget-help-text {
          margin: 8px 0 0 24px;
          font-size: 12px;
          color: #6b7280;
        }

        .feedback-widget-selection-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 999998;
          cursor: crosshair;
          pointer-events: none;
        }

        .feedback-widget-selection-overlay.active {
          pointer-events: all;
        }

        .feedback-widget-selection-box {
          position: absolute;
          border: 3px dashed #3b82f6;
          background: rgba(59, 130, 246, 0.15);
          pointer-events: none;
          z-index: 999999;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.8);
        }
      `;
      document.head.appendChild(style);
    }

    createButton() {
      const button = document.createElement('button');
      button.className = 'feedback-widget-button';
      button.textContent = '💬 Feedback geben';
      button.onclick = () => this.openModal();
      document.body.appendChild(button);
    }

    openModal() {
      if (this.isOpen) return;
      this.isOpen = true;

      const overlay = document.createElement('div');
      overlay.className = 'feedback-widget-overlay';

      const modal = document.createElement('div');
      modal.className = 'feedback-widget-modal';

      modal.innerHTML = `
        <h3 class="feedback-widget-title">Task erstellen</h3>
        <div class="feedback-widget-mode-selection">
          <p class="feedback-widget-help-text">Ziehen Sie mit der Maus einen Bereich auf der Seite auf, dann beschreiben Sie Ihr Anliegen</p>
        </div>
        <input 
          type="text"
          class="feedback-widget-textarea" 
          placeholder="Erst Bereich markieren, dann Titel eingeben..."
          maxlength="200"
          disabled
          style="height: auto; padding: 12px; margin-bottom: 12px;"
        />
        <textarea 
          class="feedback-widget-textarea" 
          placeholder="Beschreibung der Task..."
          maxlength="1000"
          disabled
          style="min-height: 80px;"
        ></textarea>
        <div class="feedback-widget-buttons">
          <button class="feedback-widget-btn feedback-widget-btn-secondary" onclick="window.FeedbackWidget.closeModal()">
            Abbrechen
          </button>
          <button class="feedback-widget-btn feedback-widget-btn-primary" onclick="window.FeedbackWidget.submitFeedback()" disabled>
            Task erstellen
          </button>
        </div>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      
      // Start area selection immediately
      setTimeout(() => {
        this.enableAreaSelection();
      }, 100);
    }

    closeModal() {
      const overlay = document.querySelector('.feedback-widget-overlay');
      if (overlay) {
        overlay.remove();
      }
      
      // Clean up selection state completely
      this.disableAreaSelection();
      if (this.selectionBox) {
        this.selectionBox.remove();
        this.selectionBox = null;
      }
      this.selectedArea = null;
      this.isDragging = false;
      
      // Restore page behavior
      document.body.style.overflow = '';
      document.body.style.userSelect = '';
      
      this.isOpen = false;
    }

    async submitFeedback() {
      const titleInput = document.querySelector('.feedback-widget-textarea');
      const descriptionTextarea = document.querySelectorAll('.feedback-widget-textarea')[1];
      
      const title = titleInput ? titleInput.value.trim() : '';
      const description = descriptionTextarea ? descriptionTextarea.value.trim() : '';
      
      if (!title) {
        alert('Bitte geben Sie einen Titel für die Task ein.');
        return;
      }

      const modal = document.querySelector('.feedback-widget-modal');
      if (modal) {
        modal.classList.add('feedback-widget-loading');
      }

      try {
        // Create screenshot
        const screenshot = await this.createScreenshot();
        
        // Upload screenshot to blob storage
        const screenshotUrl = await this.uploadScreenshot(screenshot);
        
        // Translate title and description to English
        const translatedTitle = await this.translateText(title);
        const translatedDescription = description ? await this.translateText(description) : '';
        
        // Create task with both German and English versions
        await this.createTask({
          title,
          description,
          title_en: translatedTitle,
          description_en: translatedDescription,
          screenshot: screenshotUrl,
          url: window.location.href,
          selected_area: this.selectedArea
        });

        this.closeModal();
        this.showSuccessMessage('Task erfolgreich erstellt!');
        
        // Trigger feedback update event for admin dashboard
        this.triggerFeedbackUpdate();
      } catch (error) {
        console.error('Task creation failed:', error.message || error);
        console.error('Full error:', error);
        alert('Fehler beim Erstellen der Task. Bitte versuchen Sie es erneut.');
        
        if (modal) {
          modal.classList.remove('feedback-widget-loading');
        }
      }
    }

    async translateText(text) {
      try {
        if (!text || !text.trim()) {
          return '';
        }
        
        const response = await fetch(`${this.apiBase}/api/translate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: text.trim(),
            from: 'de',
            to: 'en'
          })
        });
        
        if (!response.ok) {
          console.error('Translation failed:', response.status);
          return text; // Return original text if translation fails
        }
        
        const data = await response.json();
        return data.translatedText || text;
      } catch (error) {
        console.error('Translation error:', error);
        return text; // Return original text if translation fails
      }
    }

    async createScreenshot() {
      console.log('Creating screenshot - trying server-side API first');
      
      // First try server-side screenshot API (more reliable)
      try {
        const serverScreenshot = await this.createNodeHiveScreenshot();
        if (serverScreenshot && !serverScreenshot.includes('Screenshot nicht verfügbar')) {
          console.log('Successfully created server-side screenshot');
          return serverScreenshot;
        }
      } catch (error) {
        console.log('Server-side screenshot failed, falling back to client-side:', error);
      }
      
      // Fallback to client-side screenshot with simplified approach
      console.log('Using client-side fallback screenshot');
      return this.createFallbackScreenshot();
    }

    async createDirectScreenshot() {
      // Load html2canvas if not available
      if (!window.html2canvas) {
        await this.loadHtml2Canvas();
      }

      return new Promise((resolve) => {
        // Hide problematic elements before taking screenshot
        const hiddenElements = this.hideProblematicElements();
        
        const options = {
          useCORS: true,
          allowTaint: false,
          scale: 0.7,
          backgroundColor: '#ffffff',
          ignoreElements: (element) => {
            return element.classList.contains('feedback-widget-button') ||
                   element.classList.contains('feedback-widget-overlay') ||
                   element.classList.contains('feedback-widget-selection-overlay') ||
                   element.classList.contains('feedback-widget-selection-box');
          }
        };

        // If area is selected, capture only that area
        if (this.selectedArea) {
          options.x = this.selectedArea.x;
          options.y = this.selectedArea.y;
          options.width = this.selectedArea.width;
          options.height = this.selectedArea.height;
        } else {
          options.width = window.innerWidth;
          options.height = window.innerHeight;
        }

        window.html2canvas(document.body, options).then(canvas => {
          // Restore hidden elements
          this.restoreProblematicElements(hiddenElements);
          console.log('Screenshot captured:', {
            width: canvas.width,
            height: canvas.height,
            selectedArea: this.selectedArea,
            options: options
          });
          
          // Check if canvas is empty (all white)
          const ctx = canvas.getContext('2d');
          const imageData = ctx.getImageData(0, 0, Math.min(100, canvas.width), Math.min(100, canvas.height));
          const data = imageData.data;
          let isWhite = true;
          
          // Check first 100x100 pixels for non-white content
          for (let i = 0; i < data.length; i += 4) {
            if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) {
              isWhite = false;
              break;
            }
          }
          
          if (isWhite && this.selectedArea) {
            console.warn('White screenshot detected, selected area might be invalid:', this.selectedArea);
            // Reset options and try full viewport
            options.x = undefined;
            options.y = undefined;
            options.width = window.innerWidth;
            options.height = window.innerHeight;
            
            window.html2canvas(document.body, options).then(fallbackCanvas => {
              console.log('Fallback screenshot captured');
              this.restoreProblematicElements(hiddenElements);
              resolve(fallbackCanvas.toDataURL('image/png', 0.9));
            }).catch(() => {
              this.restoreProblematicElements(hiddenElements);
              resolve(this.createFallbackScreenshot());
            });
            return;
          }
          
          // Add border for selected area
          if (this.selectedArea) {
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 3;
            ctx.strokeRect(0, 0, canvas.width, canvas.height);
          }
          
          resolve(canvas.toDataURL('image/png', 0.9));
        }).catch(error => {
          console.error('Screenshot failed:', error);
          // Restore hidden elements even on error
          this.restoreProblematicElements(hiddenElements);
          resolve(this.createFallbackScreenshot());
        });
      });
    }

    async loadHtml2Canvas() {
      return new Promise((resolve) => {
        if (window.html2canvas) {
          resolve();
          return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = resolve;
        script.onerror = resolve; // Continue even if loading fails
        document.head.appendChild(script);
      });
    }

    hideProblematicElements() {
      const hiddenElements = [];
      
      // Hide ALL existing style elements and link elements completely
      const allStyleElements = document.querySelectorAll('style, link[rel="stylesheet"]');
      allStyleElements.forEach(el => {
        hiddenElements.push({
          element: el,
          originalDisplay: el.style.display || '',
          originalVisibility: el.style.visibility || '',
          wasHidden: el.style.display === 'none',
          type: 'style'
        });
        el.remove(); // Completely remove instead of hiding
      });
      
      // Find all elements and replace their styles completely
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        const originalStyle = el.getAttribute('style');
        const computedStyle = window.getComputedStyle(el);
        
        // Handle SVG elements differently (they don't have settable className)
        const isSVG = el instanceof SVGElement;
        
        // Store original data for restoration
        hiddenElements.push({
          element: el,
          originalStyle: originalStyle,
          originalClass: isSVG ? el.getAttribute('class') : el.className,
          isSVG: isSVG,
          type: 'element-style'
        });
        
        // Remove all classes that might contain problematic CSS
        if (isSVG) {
          el.removeAttribute('class');
        } else {
          el.className = '';
        }
        
        // Set safe inline styles based on element type
        let safeStyle = 'background: white !important; color: black !important; border: none !important;';
        
        if (el.tagName === 'BODY') {
          safeStyle = 'background: white !important; color: black !important; margin: 0 !important; padding: 20px !important;';
        } else if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(el.tagName)) {
          safeStyle = 'background: #f5f5f5 !important; color: black !important; font-weight: bold !important; padding: 8px !important; margin: 10px 0 !important;';
        } else if (['P', 'DIV', 'SPAN', 'A'].includes(el.tagName)) {
          safeStyle = 'background: transparent !important; color: black !important; text-decoration: none !important; margin: 4px !important; padding: 4px !important;';
        } else if (isSVG) {
          safeStyle = 'fill: black !important; stroke: black !important;';
        }
        
        // Add widget hiding
        if (el.classList.contains('feedback-widget-button') || 
            el.classList.contains('feedback-widget-overlay') || 
            el.classList.contains('feedback-widget-selection-overlay') || 
            el.classList.contains('feedback-widget-selection-box')) {
          safeStyle += ' display: none !important;';
        }
        
        el.setAttribute('style', safeStyle);
      });
      
      return hiddenElements;
    }

    restoreProblematicElements(hiddenElements) {
      hiddenElements.forEach(({element, originalDisplay, originalVisibility, wasHidden, originalStyle, originalClass, isSVG, type}) => {
        if (type === 'temporary') {
          // Remove our temporary safe stylesheet
          element.remove();
        } else if (type === 'element-style') {
          // Restore original classes and styles
          if (isSVG) {
            if (originalClass) {
              element.setAttribute('class', originalClass);
            } else {
              element.removeAttribute('class');
            }
          } else {
            element.className = originalClass || '';
          }
          
          if (originalStyle) {
            element.setAttribute('style', originalStyle);
          } else {
            element.removeAttribute('style');
          }
        } else if (type === 'style' && !wasHidden) {
          // Re-add removed style elements to document head
          document.head.appendChild(element);
        }
      });
    }

    async createNodeHiveScreenshot() {
      try {
        // Use our server-side screenshot API
        const response = await fetch(`${this.apiBase}/api/screenshot`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: window.location.href,
            selectedArea: this.selectedArea
          })
        });

        if (!response.ok) {
          throw new Error(`Screenshot API returned ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.screenshot) {
          // If we have R2 filename, use that directly
          if (data.r2Filename) {
            return data.r2Filename;
          }
          // If we have a selected area, crop the screenshot
          if (this.selectedArea && !data.screenshot.includes('svg')) {
            return this.cropScreenshot(data.screenshot, this.selectedArea);
          }
          return data.screenshot;
        } else {
          throw new Error(data.error || 'Screenshot generation failed');
        }
      } catch (error) {
        console.error('Failed to create screenshot via API:', error);
        throw error;
      }
    }

    async uploadScreenshot(screenshotDataUrl) {
      try {
        console.log('Uploading screenshot to server...');
        
        // Convert data URL to blob
        const response = await fetch(screenshotDataUrl);
        const blob = await response.blob();
        
        // Create form data
        const formData = new FormData();
        formData.append('screenshot', blob, 'screenshot.png');
        formData.append('projectId', this.projectDbId);
        
        // Upload to server
        const uploadResponse = await fetch(`${this.apiBase}/api/upload-screenshot`, {
          method: 'POST',
          body: formData
        });
        
        if (!uploadResponse.ok) {
          throw new Error(`Upload failed: ${uploadResponse.status}`);
        }
        
        const data = await uploadResponse.json();
        console.log('Screenshot uploaded successfully:', data.url);
        
        return data.filename;
      } catch (error) {
        console.error('Screenshot upload failed:', error);
        // Return the original data URL as fallback
        return screenshotDataUrl;
      }
    }

    async createTask(taskData) {
      try {
        console.log('Creating task with data:', taskData);
        
        if (!this.projectDbId) {
          throw new Error('Project ID not found. Widget not properly initialized.');
        }
        
        const response = await fetch(`${this.apiBase}/api/projects/${this.projectDbId}/tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(taskData)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Task creation failed: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('Task created successfully:', result);
        return result;
      } catch (error) {
        console.error('Error in createTask:', error);
        throw error;
      }
    }

    async cropScreenshot(screenshotUrl, area) {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Set canvas size to selected area
          canvas.width = area.width;
          canvas.height = area.height;
          
          // Draw the cropped portion
          ctx.drawImage(
            img,
            area.x, area.y, area.width, area.height, // Source rectangle
            0, 0, area.width, area.height // Destination rectangle
          );
          
          // Add a border to highlight the selected area
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 4;
          ctx.strokeRect(0, 0, area.width, area.height);
          
          resolve(canvas.toDataURL('image/png', 0.9));
        };
        
        img.onerror = () => {
          console.error('Failed to load screenshot for cropping');
          resolve(screenshotUrl); // Return original URL as fallback
        };
        
        img.src = screenshotUrl;
      });
    }

    fixCSSIssues(clonedDoc) {
      // Remove ALL stylesheets and styles to avoid OKLCH issues
      const links = clonedDoc.querySelectorAll('link[rel="stylesheet"]');
      links.forEach(link => link.remove());
      
      const styleTags = clonedDoc.querySelectorAll('style');
      styleTags.forEach(styleTag => styleTag.remove());

      // Add minimal safe styling
      const style = clonedDoc.createElement('style');
      style.textContent = `
        * {
          background: white !important;
          color: #333 !important;
          border: none !important;
          box-shadow: none !important;
          font-family: Arial, sans-serif !important;
          margin: 0 !important;
          padding: 8px !important;
        }
        body {
          background: white !important;
          margin: 0 !important;
          padding: 20px !important;
        }
        h1, h2, h3 {
          color: #000 !important;
          font-weight: bold !important;
          margin: 10px 0 !important;
        }
        p, div, span {
          color: #333 !important;
          line-height: 1.4 !important;
        }
        .feedback-widget-button,
        .feedback-widget-overlay,
        .feedback-widget-selection-overlay,
        .feedback-widget-selection-box {
          display: none !important;
        }
      `;
      clonedDoc.head.appendChild(style);
    }

    async createFallbackScreenshot() {
      return new Promise((resolve) => {
        // Create a detailed visual feedback representation
        const canvas = document.createElement('canvas');
        canvas.width = 1000;
        canvas.height = 700;
        const ctx = canvas.getContext('2d');
        
        // Gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#f8fafc');
        gradient.addColorStop(1, '#e2e8f0');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Header section
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, canvas.width, 80);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px Arial, sans-serif';
        ctx.fillText('Website Feedback Screenshot', 30, 50);
        
        // Content area
        ctx.fillStyle = '#334155';
        ctx.font = '18px Arial, sans-serif';
        
        const lines = [
          `URL: ${window.location.href}`,
          `Datum: ${new Date().toLocaleDateString('de-DE')}`,
          `Zeit: ${new Date().toLocaleTimeString('de-DE')}`,
          `Browser: ${navigator.userAgent.match(/(?:chrome|firefox|safari|edge)/i)?.[0] || 'Unknown'}`,
          `Viewport: ${window.innerWidth}x${window.innerHeight}px`
        ];
        
        lines.forEach((line, index) => {
          ctx.fillText(line, 30, 130 + (index * 30));
        });
        
        // Selected area section
        if (this.selectedArea) {
          const area = this.selectedArea;
          
          // Area info box
          ctx.fillStyle = '#3b82f6';
          ctx.fillRect(30, 300, canvas.width - 60, 200);
          
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 22px Arial, sans-serif';
          ctx.fillText('Markierter Bereich', 50, 330);
          
          ctx.font = '16px Arial, sans-serif';
          const areaLines = [
            `Position: ${Math.round(area.x)}, ${Math.round(area.y)}`,
            `Größe: ${Math.round(area.width)} × ${Math.round(area.height)} Pixel`,
            `Relative Position: ${Math.round((area.x / window.innerWidth) * 100)}% von links`,
            `${Math.round((area.y / window.innerHeight) * 100)}% von oben`
          ];
          
          areaLines.forEach((line, index) => {
            ctx.fillText(line, 50, 360 + (index * 25));
          });
          
          // Visual representation
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 4]);
          const scale = 0.3;
          const visualX = 50;
          const visualY = 520;
          const visualW = area.width * scale;
          const visualH = area.height * scale;
          
          ctx.strokeRect(visualX, visualY, visualW, visualH);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.fillRect(visualX, visualY, visualW, visualH);
          
        } else {
          ctx.fillStyle = '#64748b';
          ctx.font = '18px Arial, sans-serif';
          ctx.fillText('Vollständiger Viewport erfasst', 30, 320);
        }
        
        // Footer
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px Arial, sans-serif';
        ctx.fillText('Generiert durch Website Review Tool - Feedback Widget', 30, canvas.height - 20);
        
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      });
    }

    toggleAreaSelection(enabled) {
      if (enabled) {
        this.enableAreaSelection();
      } else {
        this.disableAreaSelection();
      }
    }

    enableAreaSelection() {
      this.isSelecting = true;
      this.isDragging = false;
      
      // Minimize modal and change overlay
      const overlay = document.querySelector('.feedback-widget-overlay');
      const modal = document.querySelector('.feedback-widget-modal');
      if (overlay && modal) {
        overlay.style.background = 'rgba(0, 0, 0, 0.1)';
        modal.classList.add('minimized');
      }
      
      // Create selection overlay
      this.selectionOverlay = document.createElement('div');
      this.selectionOverlay.className = 'feedback-widget-selection-overlay active';
      
      // Add event listeners with proper binding
      this.boundStartSelection = this.startSelection.bind(this);
      this.boundUpdateSelection = this.updateSelection.bind(this);
      this.boundEndSelection = this.endSelection.bind(this);
      
      this.selectionOverlay.addEventListener('mousedown', this.boundStartSelection);
      document.addEventListener('mousemove', this.boundUpdateSelection);
      document.addEventListener('mouseup', this.boundEndSelection);
      
      // Prevent page scrolling during selection
      document.body.style.overflow = 'hidden';
      document.body.style.userSelect = 'none';
      
      document.body.appendChild(this.selectionOverlay);
      
      // Update help text
      const helpText = document.querySelector('.feedback-widget-help-text');
      if (helpText) {
        helpText.textContent = 'Ziehen Sie mit der Maus einen Bereich auf der Seite auf';
        helpText.style.color = '#3b82f6';
      }
    }

    disableAreaSelection() {
      this.isSelecting = false;
      this.isDragging = false;
      
      // Remove event listeners
      if (this.boundStartSelection) {
        document.removeEventListener('mousedown', this.boundStartSelection);
      }
      if (this.boundUpdateSelection) {
        document.removeEventListener('mousemove', this.boundUpdateSelection);
      }
      if (this.boundEndSelection) {
        document.removeEventListener('mouseup', this.boundEndSelection);
      }
      
      // Restore page behavior
      document.body.style.overflow = '';
      document.body.style.userSelect = '';
      
      if (this.selectionOverlay) {
        this.selectionOverlay.remove();
        this.selectionOverlay = null;
      }
      
      // Keep selection box visible but ensure it's properly styled
      if (this.selectionBox) {
        this.selectionBox.style.pointerEvents = 'none';
      }
    }

    startSelection(e) {
      if (!this.isSelecting) return;
      
      // Prevent default behavior
      e.preventDefault();
      e.stopPropagation();
      
      this.isDragging = true;
      this.startX = e.clientX;
      this.startY = e.clientY;
      
      // Create selection box
      this.selectionBox = document.createElement('div');
      this.selectionBox.className = 'feedback-widget-selection-box';
      this.selectionBox.style.left = this.startX + 'px';
      this.selectionBox.style.top = this.startY + 'px';
      this.selectionBox.style.width = '0px';
      this.selectionBox.style.height = '0px';
      this.selectionBox.style.position = 'fixed';
      this.selectionBox.style.zIndex = '999999';
      
      document.body.appendChild(this.selectionBox);
      
      console.log('Selection started at:', this.startX, this.startY);
    }

    updateSelection(e) {
      if (!this.isSelecting || !this.isDragging || !this.selectionBox) return;
      
      // Prevent default behavior
      e.preventDefault();
      
      const currentX = e.clientX;
      const currentY = e.clientY;
      
      const left = Math.min(this.startX, currentX);
      const top = Math.min(this.startY, currentY);
      const width = Math.abs(currentX - this.startX);
      const height = Math.abs(currentY - this.startY);
      
      this.selectionBox.style.left = left + 'px';
      this.selectionBox.style.top = top + 'px';
      this.selectionBox.style.width = width + 'px';
      this.selectionBox.style.height = height + 'px';
      
      console.log('Selection updating:', { left, top, width, height });
    }

    endSelection() {
      if (!this.isSelecting || !this.isDragging || !this.selectionBox) return;
      
      this.isDragging = false;
      
      const rect = this.selectionBox.getBoundingClientRect();
      
      console.log('Selection ended:', rect);
      
      // Only proceed if area is large enough
      if (rect.width < 10 || rect.height < 10) {
        this.selectionBox.remove();
        this.selectionBox = null;
        console.log('Selection too small, removed');
        return;
      }
      
      // Store selected area with scroll offset
      this.selectedArea = {
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height
      };
      
      console.log('Selected area stored:', this.selectedArea);
      
      // Update UI
      const helpText = document.querySelector('.feedback-widget-help-text');
      if (helpText) {
        helpText.textContent = `✓ Bereich ausgewählt (${Math.round(rect.width)}x${Math.round(rect.height)}px) - Jetzt Kommentar eingeben`;
        helpText.style.color = '#10b981';
      }
      
      // Update modal title
      const title = document.querySelector('.feedback-widget-title');
      if (title) {
        title.textContent = 'Feedback schreiben';
      }
      
      // Restore modal and overlay
      const overlay = document.querySelector('.feedback-widget-overlay');
      const modal = document.querySelector('.feedback-widget-modal');
      if (overlay && modal) {
        overlay.style.background = 'rgba(0, 0, 0, 0.5)';
        modal.classList.remove('minimized');
      }
      
      // Enable inputs and send button
      const titleInput = document.querySelector('.feedback-widget-textarea');
      const descriptionTextarea = document.querySelectorAll('.feedback-widget-textarea')[1];
      
      if (titleInput) {
        titleInput.disabled = false;
        titleInput.placeholder = 'Titel der Task...';
        titleInput.focus();
      }
      
      if (descriptionTextarea) {
        descriptionTextarea.disabled = false;
        descriptionTextarea.placeholder = 'Beschreibung der Task für den markierten Bereich...';
      }
      
      const sendButton = document.querySelector('.feedback-widget-btn-primary');
      if (sendButton) {
        sendButton.disabled = false;
      }
      
      // Disable selection but keep the selection box visible
      this.disableAreaSelection();
    }

    async createTask(data) {
      if (!this.projectDbId) {
        throw new Error('Project ID not found');
      }

      const response = await fetch(`${this.apiBase}/api/projects/${this.projectDbId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response.json();
    }

    async sendFeedback(data) {
      const response = await fetch(`${this.apiBase}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response.json();
    }

    triggerFeedbackUpdate() {
        // Dispatch custom event to notify admin dashboard of new feedback
        const event = new CustomEvent('feedbackUpdated', {
            detail: {
                timestamp: new Date().toISOString(),
                url: window.location.href
            }
        });
        window.dispatchEvent(event);
        
        // Also try to communicate with parent window if in iframe
        try {
            if (window.parent !== window) {
                window.parent.postMessage({
                    type: 'feedbackUpdated',
                    timestamp: new Date().toISOString(),
                    url: window.location.href
                }, '*');
            }
        } catch (e) {
            console.log('Could not communicate with parent window:', e);
        }
    }

    showSuccessMessage(text = '✓ Task erfolgreich erstellt!') {
      const message = document.createElement('div');
      message.style.cssText = `
        position: fixed;
        top: 50%;
        right: 80px;
        transform: translateY(-50%);
        background: #10b981;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        z-index: 1000001;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      `;
      message.textContent = text;
      document.body.appendChild(message);

      setTimeout(() => {
        message.remove();
      }, 3000);
    }

    triggerFeedbackUpdate() {
      // Trigger custom event for admin interface updates
      const event = new CustomEvent('feedbackUpdated', {
        detail: {
          timestamp: new Date().toISOString(),
          url: window.location.href,
          projectId: this.projectId
        }
      });
      
      // Dispatch to current window
      window.dispatchEvent(event);
      
      // Also try to dispatch to parent window (if in iframe)
      try {
        if (window.parent && window.parent !== window) {
          window.parent.dispatchEvent(event);
        }
      } catch {
        // Ignore CORS errors
        console.log('Cannot access parent window for event dispatch');
      }
      
      // Also dispatch to top window
      try {
        if (window.top && window.top !== window) {
          window.top.dispatchEvent(event);
        }
      } catch {
        // Ignore CORS errors
        console.log('Cannot access top window for event dispatch');
      }
    }
  }

  // Initialize widget
  window.FeedbackWidget = new FeedbackWidget();

})();