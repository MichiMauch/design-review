// Website Review Widget v5.0 - Production Ready for Vercel
(function() {
  'use strict';

  // Complete cleanup before initialization
  function completeCleanup() {
    const existingButtons = document.querySelectorAll('.feedback-widget-button');
    existingButtons.forEach(btn => btn.remove());
    
    const existingOverlays = document.querySelectorAll('.feedback-widget-overlay');
    existingOverlays.forEach(overlay => overlay.remove());
    
    const existingSelections = document.querySelectorAll('.feedback-widget-selection-overlay, .feedback-widget-selection-box');
    existingSelections.forEach(selection => selection.remove());
    
    window.FeedbackWidget = null;
  }

  completeCleanup();

  class FeedbackWidget {
    constructor() {
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
    }

    getProjectId() {
      const script = document.querySelector('script[data-project-id]');
      return script ? script.getAttribute('data-project-id') : 'default';
    }

    getApiBase() {
      if (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1')) {
        return 'http://localhost:3000';
      }
      return 'https://design-review-phi.vercel.app';
    }

    init() {
      this.createButton();
      this.createOverlay();
      console.log('✅ Feedback Widget v5.0 initialized successfully');
    }

    createButton() {
      if (document.querySelector('.feedback-widget-button')) return;

      const button = document.createElement('div');
      button.className = 'feedback-widget-button';
      button.innerHTML = `
        <div class="feedback-widget-button-content">
          📝 Feedback
        </div>
      `;
      button.addEventListener('click', () => this.toggleOverlay());
      
      // Enhanced styles for better visibility
      button.style.cssText = `
        position: fixed;
        top: 50%;
        right: 20px;
        transform: translateY(-50%);
        z-index: 999999;
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: white;
        padding: 12px 16px;
        border-radius: 25px;
        cursor: pointer;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        transition: all 0.3s ease;
        user-select: none;
        border: none;
        backdrop-filter: blur(10px);
      `;

      // Hover effects
      button.addEventListener('mouseenter', () => {
        button.style.transform = 'translateY(-50%) scale(1.05)';
        button.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
      });

      button.addEventListener('mouseleave', () => {
        button.style.transform = 'translateY(-50%) scale(1)';
        button.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
      });

      document.body.appendChild(button);
    }

    createOverlay() {
      if (document.querySelector('.feedback-widget-overlay')) return;

      const overlay = document.createElement('div');
      overlay.className = 'feedback-widget-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.7);
        z-index: 1000000;
        display: none;
        backdrop-filter: blur(5px);
      `;

      const modal = document.createElement('div');
      modal.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 16px;
        padding: 32px;
        width: 90%;
        max-width: 500px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;

      modal.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <h2 style="margin: 0; color: #1f2937; font-size: 24px; font-weight: 600;">Feedback senden</h2>
          <button class="feedback-widget-close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #6b7280; padding: 4px;">×</button>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; color: #374151; font-weight: 500;">Titel</label>
          <input type="text" class="feedback-widget-title" placeholder="Kurze Beschreibung des Problems..." style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; box-sizing: border-box;">
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; color: #374151; font-weight: 500;">Beschreibung (optional)</label>
          <textarea class="feedback-widget-description" placeholder="Detaillierte Beschreibung..." style="width: 100%; height: 100px; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; resize: vertical; box-sizing: border-box;"></textarea>
        </div>

        <div style="margin-bottom: 20px;">
          <button class="feedback-widget-select-area" style="background: #f3f4f6; color: #374151; border: 2px dashed #d1d5db; padding: 12px 16px; border-radius: 8px; cursor: pointer; width: 100%; font-size: 14px; transition: all 0.2s;">
            📷 Bereich auswählen (optional)
          </button>
          <div class="feedback-widget-selected-info" style="margin-top: 8px; color: #059669; font-size: 12px; display: none;">✓ Bereich ausgewählt</div>
        </div>

        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button class="feedback-widget-cancel" style="background: #f3f4f6; color: #374151; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 500;">Abbrechen</button>
          <button class="feedback-widget-submit" style="background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 500;">Senden</button>
        </div>

        <div class="feedback-widget-loading" style="display: none; text-align: center; margin-top: 16px;">
          <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #e5e7eb; border-radius: 50%; border-top-color: #3b82f6; animation: spin 1s ease-in-out infinite;"></div>
          <div style="margin-top: 8px; color: #6b7280; font-size: 14px;">Feedback wird gesendet...</div>
        </div>
      `;

      // Add CSS animation for loading spinner
      const style = document.createElement('style');
      style.textContent = `
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `;
      document.head.appendChild(style);

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      this.attachEventListeners();
    }

    attachEventListeners() {
      // Close overlay
      document.querySelector('.feedback-widget-close').addEventListener('click', () => this.closeOverlay());
      document.querySelector('.feedback-widget-cancel').addEventListener('click', () => this.closeOverlay());
      
      // Close on overlay click
      document.querySelector('.feedback-widget-overlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) this.closeOverlay();
      });

      // Area selection
      document.querySelector('.feedback-widget-select-area').addEventListener('click', () => this.startAreaSelection());

      // Submit feedback
      document.querySelector('.feedback-widget-submit').addEventListener('click', () => this.submitFeedback());

      // Enter key to submit
      document.querySelector('.feedback-widget-title').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.submitFeedback();
      });
    }

    toggleOverlay() {
      const overlay = document.querySelector('.feedback-widget-overlay');
      if (overlay.style.display === 'none') {
        this.openOverlay();
      } else {
        this.closeOverlay();
      }
    }

    openOverlay() {
      const overlay = document.querySelector('.feedback-widget-overlay');
      overlay.style.display = 'block';
      this.isOpen = true;
      
      // Focus title input
      setTimeout(() => {
        document.querySelector('.feedback-widget-title').focus();
      }, 100);
    }

    closeOverlay() {
      const overlay = document.querySelector('.feedback-widget-overlay');
      overlay.style.display = 'none';
      this.isOpen = false;
      this.clearSelection();
      this.resetForm();
    }

    resetForm() {
      document.querySelector('.feedback-widget-title').value = '';
      document.querySelector('.feedback-widget-description').value = '';
      document.querySelector('.feedback-widget-selected-info').style.display = 'none';
      this.selectedArea = null;
    }

    startAreaSelection() {
      this.closeOverlay();
      this.isSelecting = true;
      this.createSelectionOverlay();
    }

    createSelectionOverlay() {
      // Remove existing selection elements
      this.clearSelection();

      // Create selection overlay
      const overlay = document.createElement('div');
      overlay.className = 'feedback-widget-selection-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 1000001;
        cursor: crosshair;
        background: rgba(0, 0, 0, 0.3);
      `;

      // Instructions
      const instructions = document.createElement('div');
      instructions.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #1f2937;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        z-index: 1000002;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      `;
      instructions.textContent = 'Ziehen Sie, um einen Bereich auszuwählen. ESC zum Abbrechen.';

      document.body.appendChild(overlay);
      document.body.appendChild(instructions);

      this.selectionOverlay = overlay;

      // Event listeners for area selection
      overlay.addEventListener('mousedown', this.startSelection.bind(this));
      document.addEventListener('keydown', this.cancelSelection.bind(this));
    }

    startSelection(e) {
      e.preventDefault();
      this.isDragging = true;
      this.startX = e.clientX;
      this.startY = e.clientY;

      // Create selection box
      const box = document.createElement('div');
      box.className = 'feedback-widget-selection-box';
      box.style.cssText = `
        position: fixed;
        border: 2px solid #3b82f6;
        background: rgba(59, 130, 246, 0.2);
        z-index: 1000003;
        pointer-events: none;
      `;

      document.body.appendChild(box);
      this.selectionBox = box;

      document.addEventListener('mousemove', this.updateSelection.bind(this));
      document.addEventListener('mouseup', this.endSelection.bind(this));
    }

    updateSelection(e) {
      if (!this.isDragging || !this.selectionBox) return;

      const x = Math.min(e.clientX, this.startX);
      const y = Math.min(e.clientY, this.startY);
      const width = Math.abs(e.clientX - this.startX);
      const height = Math.abs(e.clientY - this.startY);

      this.selectionBox.style.left = x + 'px';
      this.selectionBox.style.top = y + 'px';
      this.selectionBox.style.width = width + 'px';
      this.selectionBox.style.height = height + 'px';
    }

    endSelection(e) {
      if (!this.isDragging) return;

      this.isDragging = false;
      document.removeEventListener('mousemove', this.updateSelection);
      document.removeEventListener('mouseup', this.endSelection);

      const x = Math.min(e.clientX, this.startX);
      const y = Math.min(e.clientY, this.startY);
      const width = Math.abs(e.clientX - this.startX);
      const height = Math.abs(e.clientY - this.startY);

      if (width > 10 && height > 10) {
        this.selectedArea = { x, y, width, height };
        console.log('Area selected:', this.selectedArea);
      }

      this.clearSelection();
      this.isSelecting = false;
      this.openOverlay();

      // Update UI to show selection
      if (this.selectedArea) {
        document.querySelector('.feedback-widget-selected-info').style.display = 'block';
      }
    }

    cancelSelection(e) {
      if (e.key === 'Escape' && this.isSelecting) {
        this.clearSelection();
        this.isSelecting = false;
        this.openOverlay();
      }
    }

    clearSelection() {
      // Remove selection overlay
      const overlay = document.querySelector('.feedback-widget-selection-overlay');
      if (overlay) overlay.remove();

      // Remove selection box
      const box = document.querySelector('.feedback-widget-selection-box');
      if (box) box.remove();

      // Remove instructions
      const instructions = document.querySelector('[style*="transform: translateX(-50%)"]');
      if (instructions && instructions.textContent.includes('Ziehen Sie')) {
        instructions.remove();
      }

      // Clean up event listeners
      document.removeEventListener('mousemove', this.updateSelection);
      document.removeEventListener('mouseup', this.endSelection);
      document.removeEventListener('keydown', this.cancelSelection);

      this.selectionOverlay = null;
      this.selectionBox = null;
    }

    async submitFeedback() {
      const title = document.querySelector('.feedback-widget-title').value.trim();
      const description = document.querySelector('.feedback-widget-description').value.trim();

      if (!title) {
        alert('Bitte geben Sie einen Titel ein.');
        return;
      }

      this.showLoading(true);

      try {
        // Create screenshot
        const screenshot = await this.createScreenshot();
        
        // Translate text
        const titleEn = await this.translateText(title);
        const descriptionEn = description ? await this.translateText(description) : '';

        // Create task
        const taskData = {
          title,
          description,
          title_en: titleEn,
          description_en: descriptionEn,
          screenshot,
          url: window.location.href,
          selected_area: this.selectedArea
        };

        await this.createTask(taskData);
        
        this.showSuccess();
        setTimeout(() => this.closeOverlay(), 2000);

      } catch (error) {
        console.error('Error submitting feedback:', error);
        this.showError('Fehler beim Senden des Feedbacks. Bitte versuchen Sie es erneut.');
      } finally {
        this.showLoading(false);
      }
    }

    async createScreenshot() {
      console.log('🖼️ Creating screenshot...');
      
      try {
        // Try server-side screenshot first
        const serverResult = await this.tryServerScreenshot();
        if (serverResult.success) {
          console.log('✅ Server-side screenshot successful');
          return serverResult.screenshot;
        }
      } catch (error) {
        console.log('❌ Server-side failed:', error.message);
      }

      try {
        // Try client-side screenshot
        const clientResult = await this.tryClientScreenshot();
        if (clientResult) {
          console.log('✅ Client-side screenshot successful');
          return clientResult;
        }
      } catch (error) {
        console.log('❌ Client-side failed:', error.message);
      }

      // Return placeholder
      console.log('📝 Using placeholder screenshot');
      return this.generatePlaceholderScreenshot();
    }

    async tryServerScreenshot() {
      const response = await fetch(`${this.apiBase}/api/screenshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: window.location.href,
          selectedArea: this.selectedArea
        }),
        signal: AbortSignal.timeout(10000) // Reduced to 10 seconds
      });

      if (!response.ok) {
        throw new Error(`Server screenshot failed: ${response.status}`);
      }

      const data = await response.json();
      if (data.fallback) {
        throw new Error('Server returned fallback instruction');
      }

      // Prefer R2 URL over base64 for storage efficiency
      const screenshotToUse = data.r2Url || data.screenshot;
      console.log('📸 Screenshot stored at:', data.r2Url ? 'R2 URL' : 'Base64');
      
      return { success: true, screenshot: screenshotToUse, isR2Url: !!data.r2Url };
    }

    async tryClientScreenshot() {
      // Load html2canvas
      if (!window.html2canvas) {
        await this.loadHtml2Canvas();
      }

      // Hide widget elements
      const elements = document.querySelectorAll('.feedback-widget-button, .feedback-widget-overlay');
      elements.forEach(el => el.style.display = 'none');

      try {
        const options = {
          useCORS: false,
          allowTaint: true,
          scale: 0.5,
          backgroundColor: '#ffffff',
          logging: false,
          ignoreElements: (element) => {
            // Ignore widget elements and problematic CSS
            const classList = element.classList || [];
            if (classList.contains('feedback-widget-button') || 
                classList.contains('feedback-widget-overlay')) {
              return true;
            }

            // Check for problematic CSS
            try {
              const style = window.getComputedStyle(element);
              const colorProps = ['color', 'backgroundColor', 'borderColor'];
              for (let prop of colorProps) {
                const value = style[prop];
                if (value && (value.includes('oklab') || value.includes('oklch') || 
                            value.includes('color-mix') || value.includes('lch'))) {
                  return true;
                }
              }
            } catch {
              // Ignore style check errors
            }

            return false;
          }
        };

        if (this.selectedArea) {
          options.x = this.selectedArea.x;
          options.y = this.selectedArea.y;
          options.width = this.selectedArea.width;
          options.height = this.selectedArea.height;
        }

        const canvas = await window.html2canvas(document.body, options);
        return canvas.toDataURL('image/png');

      } finally {
        // Restore widget elements
        elements.forEach(el => el.style.display = '');
      }
    }

    async loadHtml2Canvas() {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    generatePlaceholderScreenshot() {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = 400;
      canvas.height = 300;
      
      // Gradient background
      const gradient = ctx.createLinearGradient(0, 0, 400, 300);
      gradient.addColorStop(0, '#f0f9ff');
      gradient.addColorStop(1, '#e0e7ff');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 400, 300);
      
      // Add text
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('📸 Screenshot Placeholder', 200, 120);
      
      ctx.font = '14px Arial';
      ctx.fillText(window.location.hostname, 200, 150);
      ctx.fillText(new Date().toLocaleString('de-DE'), 200, 180);
      
      return canvas.toDataURL('image/png');
    }

    async translateText(text) {
      if (!text.trim()) return '';
      
      try {
        const response = await fetch(`${this.apiBase}/api/translate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: text.trim(), from: 'de', to: 'en' }),
          signal: AbortSignal.timeout(5000)
        });
        
        if (!response.ok) return text;
        
        const data = await response.json();
        return data.translatedText || text;
      } catch {
        console.error('Translation failed');
        return text;
      }
    }

    async createTask(taskData) {
      const response = await fetch(`${this.apiBase}/api/projects/${this.projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Task creation failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Task created successfully:', result);
      return result;
    }

    showLoading(show) {
      const loading = document.querySelector('.feedback-widget-loading');
      const submit = document.querySelector('.feedback-widget-submit');
      
      if (show) {
        loading.style.display = 'block';
        submit.disabled = true;
        submit.style.opacity = '0.5';
      } else {
        loading.style.display = 'none';
        submit.disabled = false;
        submit.style.opacity = '1';
      }
    }

    showSuccess() {
      const loading = document.querySelector('.feedback-widget-loading');
      loading.innerHTML = `
        <div style="color: #059669; font-size: 16px;">✅ Feedback erfolgreich gesendet!</div>
        <div style="margin-top: 8px; color: #6b7280; font-size: 14px;">Vielen Dank für Ihr Feedback.</div>
      `;
      loading.style.display = 'block';
    }

    showError(message) {
      const loading = document.querySelector('.feedback-widget-loading');
      loading.innerHTML = `
        <div style="color: #dc2626; font-size: 16px;">❌ ${message}</div>
      `;
      loading.style.display = 'block';
      this.showLoading(false);
    }
  }

  // Initialize widget
  window.FeedbackWidget = new FeedbackWidget();

})();
