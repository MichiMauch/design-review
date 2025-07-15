// Design Review Overlay System
(function() {
  'use strict';

  // Avoid multiple injections
  if (window.designReviewOverlay) {
    return;
  }

  window.designReviewOverlay = true;

  class DesignReviewOverlay {
    constructor() {
      this.isActive = false;
      this.isSelecting = false;
      this.comments = [];
      this.currentUrl = window.location.href;
      this.apiBase = 'http://localhost:3000'; // TODO: Configure based on environment
      this.selectionBox = null;
      this.startX = 0;
      this.startY = 0;
      
      // Bind methods to maintain context
      this.handleMouseDown = this.handleMouseDown.bind(this);
      this.handleMouseMove = this.handleMouseMove.bind(this);
      this.handleMouseUp = this.handleMouseUp.bind(this);
      this.preventClicks = this.preventClicks.bind(this);
      
      this.init();
      this.loadComments();
    }

    init() {
      this.createOverlayUI();
      this.attachEventListeners();
      this.injectStyles();
    }

    injectStyles() {
      const style = document.createElement('style');
      style.textContent = `
        .dr-overlay {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 999999;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
        }

        .dr-header {
          padding: 12px 16px;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          border-radius: 8px 8px 0 0;
          display: flex;
          justify-content: between;
          align-items: center;
        }

        .dr-title {
          font-weight: 600;
          margin: 0;
          font-size: 14px;
          color: #111827;
        }

        .dr-close {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          color: #6b7280;
          font-size: 18px;
          margin-left: auto;
        }

        .dr-content {
          padding: 16px;
          min-width: 280px;
        }

        .dr-toggle {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          margin-bottom: 12px;
          width: 100%;
        }

        .dr-toggle.active {
          background: #ef4444;
        }

        .dr-status {
          text-align: center;
          padding: 8px;
          border-radius: 4px;
          margin-bottom: 12px;
          font-size: 12px;
        }

        .dr-status.inactive {
          background: #f3f4f6;
          color: #6b7280;
        }

        .dr-status.active {
          background: #fef2f2;
          color: #dc2626;
        }

        .dr-comment-list {
          max-height: 300px;
          overflow-y: auto;
        }

        .dr-comment {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          padding: 8px;
          margin-bottom: 8px;
          font-size: 12px;
        }

        .dr-comment-text {
          margin-bottom: 4px;
          color: #111827;
        }

        .dr-comment-meta {
          color: #6b7280;
          font-size: 11px;
        }

        .dr-marker {
          position: absolute;
          width: 24px;
          height: 24px;
          background: #ef4444;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          cursor: pointer;
          z-index: 999998;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          transform: translate(-50%, -50%);
        }

        .dr-modal {
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
        }

        .dr-modal-content {
          background: white;
          border-radius: 8px;
          padding: 20px;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 20px 25px rgba(0, 0, 0, 0.1);
        }

        .dr-modal h3 {
          margin: 0 0 16px 0;
          font-size: 16px;
          color: #111827;
        }

        .dr-modal textarea {
          width: 100%;
          height: 80px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          padding: 8px;
          font-family: inherit;
          font-size: 14px;
          resize: none;
        }

        .dr-modal-actions {
          display: flex;
          gap: 8px;
          margin-top: 16px;
          justify-content: flex-end;
        }

        .dr-btn {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .dr-btn-cancel {
          background: #f3f4f6;
          color: #374151;
        }

        .dr-btn-save {
          background: #3b82f6;
          color: white;
        }

        .dr-export-btn {
          background: #10b981;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          width: 100%;
          margin-top: 8px;
        }

        body.dr-annotation-mode {
          cursor: crosshair !important;
        }

        body.dr-annotation-mode * {
          cursor: crosshair !important;
        }

        body.dr-selecting {
          cursor: crosshair !important;
        }

        body.dr-selecting * {
          cursor: crosshair !important;
          pointer-events: none !important;
        }
        
        body.dr-selecting .dr-overlay,
        body.dr-selecting .dr-overlay * {
          pointer-events: auto !important;
        }
        
        .dr-selection-box {
          box-sizing: border-box;
        }
      `;
      document.head.appendChild(style);
    }

    createOverlayUI() {
      this.overlay = document.createElement('div');
      this.overlay.className = 'dr-overlay';
      this.overlay.innerHTML = `
        <div class="dr-header">
          <h3 class="dr-title">Design Review</h3>
          <button class="dr-close" onclick="window.designReviewOverlay = null; this.parentElement.parentElement.remove();">&times;</button>
        </div>
        <div class="dr-content">
          <button class="dr-toggle" id="dr-toggle">Kommentar-Modus aktivieren</button>
          <div class="dr-status inactive" id="dr-status">Klicken Sie auf "Aktivieren" um Bereiche zu markieren und zu kommentieren</div>
          <div class="dr-comment-list" id="dr-comment-list"></div>
          <button class="dr-export-btn" id="dr-export">Kommentare exportieren</button>
          <button class="dr-export-btn" id="dr-debug" style="font-size: 10px; margin-top: 4px; background: #6b7280;">Debug Info</button>
          <div style="margin-top: 8px; font-size: 10px; color: #6b7280; text-align: center;">
            Modus: Element-Selektor (CSS-basiert)
          </div>
        </div>
      `;
      
      document.body.appendChild(this.overlay);
    }

    attachEventListeners() {
      const toggle = document.getElementById('dr-toggle');
      const exportBtn = document.getElementById('dr-export');
      const debugBtn = document.getElementById('dr-debug');
      
      toggle.addEventListener('click', () => this.toggleAnnotationMode());
      exportBtn.addEventListener('click', () => this.exportComments());
      debugBtn.addEventListener('click', () => this.showDebugInfo());
    }

    toggleAnnotationMode() {
      this.isActive = !this.isActive;
      const toggle = document.getElementById('dr-toggle');
      const status = document.getElementById('dr-status');
      
      if (this.isActive) {
        toggle.textContent = 'Kommentar-Modus deaktivieren';
        toggle.classList.add('active');
        status.textContent = 'Ziehen Sie einen Bereich auf um Elemente zu markieren und zu kommentieren';
        status.className = 'dr-status active';
        document.body.classList.add('dr-annotation-mode');
        
        // Add mouse event listeners for area selection
        document.addEventListener('mousedown', this.handleMouseDown, { passive: false });
        // Also prevent click events during annotation mode
        document.addEventListener('click', this.preventClicks, { passive: false, capture: true });
      } else {
        toggle.textContent = 'Kommentar-Modus aktivieren';
        toggle.classList.remove('active');
        status.textContent = 'Kommentar-Modus ist deaktiviert';
        status.className = 'dr-status inactive';
        document.body.classList.remove('dr-annotation-mode');
        
        // Remove mouse event listeners
        document.removeEventListener('mousedown', this.handleMouseDown);
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        document.removeEventListener('click', this.preventClicks, { capture: true });
        
        // Clean up any active selection
        this.cleanupSelection();
      }
    }

    cleanupSelection() {
      if (this.selectionBox) {
        this.selectionBox.remove();
        this.selectionBox = null;
      }
      this.isSelecting = false;
      document.body.style.userSelect = '';
      document.body.style.pointerEvents = '';
      document.body.classList.remove('dr-selecting');
    }

    handleMouseDown(e) {
      if (!this.isActive) return;
      
      // Don't handle clicks on our own overlay
      if (e.target.closest('.dr-overlay') || e.target.closest('.dr-modal') || e.target.closest('.dr-marker')) {
        return;
      }
      
      // IMPORTANT: Prevent ALL default behavior immediately
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      // Also prevent any link navigation or form submission
      if (e.target.tagName === 'A' || e.target.closest('a')) {
        e.target.style.pointerEvents = 'none';
        setTimeout(() => {
          if (e.target.style) e.target.style.pointerEvents = '';
        }, 1000);
      }
      
      // Clean up any existing selection
      this.cleanupSelection();
      
      // Start new selection
      this.selectionBox = document.createElement('div');
      this.selectionBox.className = 'dr-selection-box';
      this.selectionBox.style.position = 'absolute';
      this.selectionBox.style.border = '2px dashed #ef4444';
      this.selectionBox.style.background = 'rgba(239, 68, 68, 0.1)';
      this.selectionBox.style.zIndex = '999997';
      this.selectionBox.style.pointerEvents = 'none';
      
      document.body.appendChild(this.selectionBox);
      
      this.startX = e.pageX;
      this.startY = e.pageY;
      this.isSelecting = true;
      
      // Add selecting class
      document.body.classList.add('dr-selecting');
      
      // Add mouse move and up listeners
      document.addEventListener('mousemove', this.handleMouseMove, { passive: false });
      document.addEventListener('mouseup', this.handleMouseUp, { passive: false });
      
      // Disable text selection and interactions
      document.body.style.userSelect = 'none';
      document.body.style.pointerEvents = 'none';
      
      // Re-enable pointer events for our overlay
      if (this.overlay) {
        this.overlay.style.pointerEvents = 'auto';
      }
      
      return false;
    }

    preventClicks(e) {
      if (!this.isActive) return;
      
      // Don't prevent clicks on our overlay
      if (e.target.closest('.dr-overlay') || e.target.closest('.dr-modal')) {
        return;
      }
      
      // Prevent all other clicks during annotation mode
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }

    handleMouseMove(e) {
      if (!this.isSelecting) return;
      
      const currentX = e.pageX;
      const currentY = e.pageY;
      
      const left = Math.min(this.startX, currentX);
      const top = Math.min(this.startY, currentY);
      const width = Math.abs(currentX - this.startX);
      const height = Math.abs(currentY - this.startY);
      
      this.selectionBox.style.left = left + 'px';
      this.selectionBox.style.top = top + 'px';
      this.selectionBox.style.width = width + 'px';
      this.selectionBox.style.height = height + 'px';
    }

    handleMouseUp(e) {
      if (!this.isSelecting) return;
      
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      const currentX = e.pageX;
      const currentY = e.pageY;
      
      const left = Math.min(this.startX, currentX);
      const top = Math.min(this.startY, currentY);
      const width = Math.abs(currentX - this.startX);
      const height = Math.abs(currentY - this.startY);
      
      // Remove listeners immediately after getting coordinates
      document.removeEventListener('mousemove', this.handleMouseMove);
      document.removeEventListener('mouseup', this.handleMouseUp);
      
      // Clean up selection and restore normal behavior
      this.cleanupSelection();
      
      // Re-enable pointer events for the page
      document.body.style.pointerEvents = '';
      
      // Only proceed if area is large enough
      if (width > 20 && height > 20) {
        // Use setTimeout to ensure cleanup is complete before screenshot
        setTimeout(() => {
          this.captureAreaAndComment(left, top, width, height);
        }, 100);
      } else if (width > 5 || height > 5) {
        // Show message for too small areas
        const status = document.getElementById('dr-status');
        const originalText = status.textContent;
        status.textContent = 'Bereich zu klein - bitte größeren Bereich auswählen';
        status.style.color = '#ef4444';
        
        setTimeout(() => {
          status.textContent = originalText;
          status.style.color = '';
        }, 2000);
      }
      
      return false;
    }

    async captureAreaAndComment(left, top, width, height) {
      try {
        // Show loading message
        const status = document.getElementById('dr-status');
        const originalText = status.textContent;
        status.textContent = 'Screenshot wird erstellt...';
        status.style.color = '#3b82f6';
        
        // Instead of screenshots, create a smart element-based annotation
        const annotationData = await this.createElementAnnotation(left, top, width, height);
        
        // Reset status
        status.textContent = originalText;
        status.style.color = '';
        
        // Show comment modal with element data
        this.showCommentModal(left + width/2, top + height/2, {
          annotationData,
          area: { left, top, width, height }
        });
        
      } catch (error) {
        console.error('Screenshot capture failed completely:', error);
        
        // Reset status on error and still allow comment creation
        const status = document.getElementById('dr-status');
        status.textContent = 'Screenshot nicht möglich - Kommentar ohne Screenshot erstellen';
        status.style.color = '#f59e0b';
        
        // Still show modal but with basic data
        this.showCommentModal(left + width/2, top + height/2, {
          annotationData: { type: 'basic', url: this.currentUrl },
          area: { left, top, width, height }
        });
        
        setTimeout(() => {
          status.textContent = 'Ziehen Sie einen Bereich auf um Elemente zu markieren und zu kommentieren';
          status.style.color = '';
        }, 3000);
      }
    }

    async captureFullPageWithHighlight(left, top, width, height) {
      // Use html2canvas to capture only the viewport
      if (typeof html2canvas === 'undefined') {
        await this.loadHtml2Canvas();
      }
      
      // Convert absolute coordinates to viewport coordinates
      const viewportLeft = left - window.pageXOffset;
      const viewportTop = top - window.pageYOffset;
      
      // Create a temporary highlight overlay (positioned for viewport)
      const highlightOverlay = document.createElement('div');
      highlightOverlay.style.position = 'fixed';
      highlightOverlay.style.left = viewportLeft + 'px';
      highlightOverlay.style.top = viewportTop + 'px';
      highlightOverlay.style.width = width + 'px';
      highlightOverlay.style.height = height + 'px';
      highlightOverlay.style.border = '3px solid #ef4444';
      highlightOverlay.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
      highlightOverlay.style.zIndex = '999999';
      highlightOverlay.style.pointerEvents = 'none';
      highlightOverlay.style.borderRadius = '4px';
      highlightOverlay.style.boxShadow = '0 0 0 2px rgba(255, 255, 255, 0.8)';
      
      // Add a label (only if it fits in viewport)
      if (viewportTop > 25) {
        const label = document.createElement('div');
        label.style.position = 'absolute';
        label.style.top = '-25px';
        label.style.left = '0';
        label.style.backgroundColor = '#ef4444';
        label.style.color = 'white';
        label.style.padding = '2px 8px';
        label.style.borderRadius = '4px';
        label.style.fontSize = '12px';
        label.style.fontWeight = 'bold';
        label.style.whiteSpace = 'nowrap';
        label.textContent = 'Markiert';
        highlightOverlay.appendChild(label);
      }
      
      document.body.appendChild(highlightOverlay);
      
      try {
        // Small delay to ensure rendering
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Capture only the current viewport
        const canvas = await html2canvas(document.body, {
          useCORS: true,
          allowTaint: true,
          scale: 1,
          scrollX: window.pageXOffset,
          scrollY: window.pageYOffset,
          width: window.innerWidth,
          height: window.innerHeight,
          backgroundColor: '#ffffff',
          x: 0,
          y: 0,
          ignoreElements: (element) => {
            // Skip elements that might cause CSS parsing issues
            return element.classList.contains('dr-overlay') || 
                   element.classList.contains('dr-modal') ||
                   element.classList.contains('dr-marker');
          },
          onclone: (clonedDoc) => {
            // Remove problematic CSS that html2canvas can't handle
            const styles = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
            styles.forEach(style => {
              if (style.textContent && style.textContent.includes('color(')) {
                // Remove or replace problematic color() functions
                style.textContent = style.textContent.replace(/color\([^)]+\)/g, 'transparent');
              }
            });
            
            // Also remove our overlay elements from the clone
            const overlayElements = clonedDoc.querySelectorAll('.dr-overlay, .dr-modal, .dr-marker, .dr-selection-box');
            overlayElements.forEach(el => el.remove());
          }
        });
        
        // Remove the highlight overlay
        highlightOverlay.remove();
        
        return canvas.toDataURL('image/png');
        
      } catch (error) {
        // Make sure to remove overlay even on error
        highlightOverlay.remove();
        throw error;
      }
    }

    async createElementAnnotation(left, top, width, height) {
      // Create element-based annotation instead of screenshot
      const centerX = left + width / 2 - window.pageXOffset;
      const centerY = top + height / 2 - window.pageYOffset;
      
      // Get the element at the center of the marked area
      const element = document.elementFromPoint(centerX, centerY);
      
      if (!element) {
        return { type: 'basic', url: this.currentUrl };
      }
      
      // Generate CSS selector for this element
      const selector = this.generateSelector(element);
      
      // Get element information
      const elementInfo = this.getDetailedElementInfo(element);
      
      // Calculate relative position within the element
      const elementRect = element.getBoundingClientRect();
      const relativeX = (centerX - elementRect.left) / elementRect.width;
      const relativeY = (centerY - elementRect.top) / elementRect.height;
      
      return {
        type: 'element',
        selector: selector,
        elementInfo: elementInfo,
        relativePosition: { x: relativeX, y: relativeY },
        absolutePosition: { left, top, width, height },
        viewportPosition: { 
          left: left - window.pageXOffset, 
          top: top - window.pageYOffset, 
          width, 
          height 
        },
        url: this.currentUrl,
        timestamp: new Date().toISOString()
      };
    }

    generateSelector(element) {
      // Generate a robust CSS selector
      if (element.id) {
        return `#${element.id}`;
      }
      
      let selector = element.tagName.toLowerCase();
      
      // Add classes if available
      if (element.className && typeof element.className === 'string') {
        const classes = element.className.trim().split(/\s+/).slice(0, 3); // Max 3 classes
        if (classes.length > 0) {
          selector += '.' + classes.join('.');
        }
      }
      
      // Add nth-child if needed for uniqueness
      const parent = element.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(child => 
          child.tagName === element.tagName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(element) + 1;
          selector += `:nth-child(${index})`;
        }
      }
      
      return selector;
    }

    getDetailedElementInfo(element) {
      const info = {
        tag: element.tagName.toLowerCase(),
        text: '',
        attributes: {},
        styles: {},
        dimensions: {}
      };
      
      // Get text content
      if (element.textContent && element.textContent.trim()) {
        info.text = element.textContent.trim().substring(0, 100);
        if (element.textContent.length > 100) info.text += '...';
      }
      
      // Get important attributes
      const importantAttrs = ['id', 'class', 'href', 'src', 'alt', 'title', 'data-testid', 'aria-label'];
      importantAttrs.forEach(attr => {
        if (element.hasAttribute(attr)) {
          info.attributes[attr] = element.getAttribute(attr);
        }
      });
      
      // Get computed styles for layout info
      const computedStyle = window.getComputedStyle(element);
      info.styles = {
        display: computedStyle.display,
        position: computedStyle.position,
        backgroundColor: computedStyle.backgroundColor,
        color: computedStyle.color,
        fontSize: computedStyle.fontSize,
        fontFamily: computedStyle.fontFamily.split(',')[0].replace(/"/g, '')
      };
      
      // Get dimensions
      const rect = element.getBoundingClientRect();
      info.dimensions = {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        top: Math.round(rect.top + window.pageYOffset),
        left: Math.round(rect.left + window.pageXOffset)
      };
      
      return info;
    }

    async createSmartAnnotation(left, top, width, height) {
      // Create a smart annotation that captures the essence of what was marked
      const canvas = document.createElement('canvas');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const ctx = canvas.getContext('2d');
      
      // Try to get some visual information about the marked area
      const element = document.elementFromPoint(left - window.pageXOffset, top - window.pageYOffset);
      const elementInfo = this.getElementInfo(element);
      
      // Create a clean background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add grid pattern for reference
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let i = 0; i < canvas.height; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }
      
      // Convert absolute coordinates to viewport coordinates
      const viewportLeft = left - window.pageXOffset;
      const viewportTop = top - window.pageYOffset;
      
      // Draw marked area background
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(viewportLeft, viewportTop, width, height);
      
      // Draw border with rounded corners
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeRect(viewportLeft, viewportTop, width, height);
      
      // Add corner indicators
      const cornerSize = 12;
      ctx.fillStyle = '#ef4444';
      const corners = [
        [viewportLeft, viewportTop],
        [viewportLeft + width, viewportTop],
        [viewportLeft, viewportTop + height],
        [viewportLeft + width, viewportTop + height]
      ];
      
      corners.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, cornerSize / 2, 0, Math.PI * 2);
        ctx.fill();
      });
      
      // Add element information if available
      if (elementInfo.text || elementInfo.tag) {
        const labelY = viewportTop > 40 ? viewportTop - 10 : viewportTop + height + 25;
        
        ctx.fillStyle = '#ef4444';
        const labelText = elementInfo.text || `<${elementInfo.tag}>`;
        const textWidth = ctx.measureText(labelText).width;
        ctx.fillRect(viewportLeft, labelY - 15, textWidth + 10, 20);
        
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText(labelText, viewportLeft + 5, labelY);
      }
      
      // Add header information
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('Design Review Annotation', 20, 30);
      
      ctx.font = '12px Arial';
      ctx.fillStyle = '#6b7280';
      ctx.fillText(`${window.location.hostname}${window.location.pathname}`, 20, 50);
      ctx.fillText(`Bereich: ${width} × ${height} px | Position: ${Math.round(left)}, ${Math.round(top)}`, 20, 70);
      ctx.fillText(`Element: ${elementInfo.summary}`, 20, 90);
      
      return canvas.toDataURL('image/png');
    }

    async createBasicAnnotation(left, top, width, height) {
      // Absolute simplest fallback
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      
      // Simple white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Scale coordinates to fit canvas
      const scale = Math.min(canvas.width / window.innerWidth, canvas.height / window.innerHeight) * 0.8;
      const scaledLeft = (left - window.pageXOffset) * scale + 50;
      const scaledTop = (top - window.pageYOffset) * scale + 100;
      const scaledWidth = width * scale;
      const scaledHeight = height * scale;
      
      // Draw marked area
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.strokeRect(scaledLeft, scaledTop, scaledWidth, scaledHeight);
      
      ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
      ctx.fillRect(scaledLeft, scaledTop, scaledWidth, scaledHeight);
      
      // Add title and info
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Design Review', canvas.width / 2, 40);
      
      ctx.font = '14px Arial';
      ctx.fillText(window.location.hostname, canvas.width / 2, 65);
      ctx.fillText(`Markierter Bereich: ${width} × ${height} px`, canvas.width / 2, canvas.height - 30);
      
      return canvas.toDataURL('image/png');
    }

    getElementInfo(element) {
      if (!element) return { tag: 'unknown', text: '', summary: 'Unbekanntes Element' };
      
      const tag = element.tagName.toLowerCase();
      let text = '';
      let summary = tag;
      
      // Get meaningful text content
      if (element.textContent && element.textContent.trim()) {
        text = element.textContent.trim().substring(0, 50);
        if (element.textContent.length > 50) text += '...';
      }
      
      // Get additional context
      if (element.className) {
        summary += ` class="${element.className.substring(0, 30)}"`;
      }
      if (element.id) {
        summary += ` id="${element.id}"`;
      }
      if (tag === 'a' && element.href) {
        summary += ` → ${element.href.substring(0, 30)}...`;
      }
      if (tag === 'img' && element.alt) {
        text = element.alt;
      }
      
      return { tag, text, summary };
    }

    async captureWithNativeAPI(left, top, width, height) {
      // Use browser's native screen capture API
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            mediaSource: 'screen',
            width: { ideal: window.innerWidth },
            height: { ideal: window.innerHeight }
          }
        });

        // Create video element to capture frame
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();

        return new Promise((resolve, reject) => {
          video.onloadedmetadata = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            
            // Draw video frame
            ctx.drawImage(video, 0, 0);
            
            // Add highlight rectangle
            const scale = canvas.width / window.innerWidth;
            const viewportLeft = (left - window.pageXOffset) * scale;
            const viewportTop = (top - window.pageYOffset) * scale;
            const scaledWidth = width * scale;
            const scaledHeight = height * scale;
            
            // Draw highlight
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 3 * scale;
            ctx.setLineDash([5 * scale, 5 * scale]);
            ctx.strokeRect(viewportLeft, viewportTop, scaledWidth, scaledHeight);
            
            ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
            ctx.fillRect(viewportLeft, viewportTop, scaledWidth, scaledHeight);
            
            // Stop stream
            stream.getTracks().forEach(track => track.stop());
            video.remove();
            
            resolve(canvas.toDataURL('image/png'));
          };
          
          video.onerror = () => {
            stream.getTracks().forEach(track => track.stop());
            video.remove();
            reject(new Error('Video capture failed'));
          };
        });
        
      } catch (error) {
        throw new Error('Native capture failed: ' + error.message);
      }
    }

    async createVisualPlaceholder(left, top, width, height) {
      // Create a more realistic visual placeholder
      const canvas = document.createElement('canvas');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const ctx = canvas.getContext('2d');
      
      // Create gradient background to simulate website
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.1, '#f8fafc');
      gradient.addColorStop(1, '#e2e8f0');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add some simulated content blocks
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(50, 50, canvas.width - 100, 60); // Header
      ctx.fillRect(50, 150, canvas.width * 0.3, 200); // Sidebar
      ctx.fillRect(canvas.width * 0.35, 150, canvas.width * 0.6, 100); // Content block
      ctx.fillRect(canvas.width * 0.35, 280, canvas.width * 0.6, 60); // Content block
      
      // Convert absolute coordinates to viewport coordinates
      const viewportLeft = left - window.pageXOffset;
      const viewportTop = top - window.pageYOffset;
      
      // Draw highlight rectangle with better styling
      ctx.save();
      ctx.shadowColor = 'rgba(239, 68, 68, 0.3)';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(viewportLeft, viewportTop, width, height);
      ctx.restore();
      
      // Fill with semi-transparent red
      ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
      ctx.fillRect(viewportLeft, viewportTop, width, height);
      
      // Add corner markers
      const markerSize = 8;
      ctx.fillStyle = '#ef4444';
      // Top-left
      ctx.fillRect(viewportLeft - markerSize/2, viewportTop - markerSize/2, markerSize, markerSize);
      // Top-right
      ctx.fillRect(viewportLeft + width - markerSize/2, viewportTop - markerSize/2, markerSize, markerSize);
      // Bottom-left
      ctx.fillRect(viewportLeft - markerSize/2, viewportTop + height - markerSize/2, markerSize, markerSize);
      // Bottom-right
      ctx.fillRect(viewportLeft + width - markerSize/2, viewportTop + height - markerSize/2, markerSize, markerSize);
      
      // Add informative text
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Design Review - Markierter Bereich', canvas.width / 2, 30);
      
      ctx.font = '14px Arial';
      ctx.fillText(`URL: ${window.location.hostname}`, canvas.width / 2, canvas.height - 40);
      ctx.fillText(`Bereich: ${width}×${height}px | Position: ${Math.round(left)}, ${Math.round(top)}`, canvas.width / 2, canvas.height - 20);
      
      // Add a label near the marked area
      if (viewportTop > 30) {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(viewportLeft, viewportTop - 25, 120, 20);
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Markierter Bereich', viewportLeft + 5, viewportTop - 10);
      }
      
      return canvas.toDataURL('image/png');
    }

    async captureSimplified(left, top, width, height) {
      // Simplified html2canvas call with minimal options
      if (typeof html2canvas === 'undefined') {
        await this.loadHtml2Canvas();
      }
      
      // Create highlight without complex CSS
      const highlight = document.createElement('div');
      highlight.style.cssText = `
        position: fixed;
        left: ${left - window.pageXOffset}px;
        top: ${top - window.pageYOffset}px;
        width: ${width}px;
        height: ${height}px;
        border: 3px solid red;
        background: rgba(255, 0, 0, 0.1);
        z-index: 999999;
        pointer-events: none;
      `;
      
      document.body.appendChild(highlight);
      
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Very basic html2canvas call
        const canvas = await html2canvas(document.body, {
          useCORS: false,
          allowTaint: true,
          scale: 0.5, // Lower scale for better compatibility
          width: window.innerWidth,
          height: window.innerHeight,
          logging: false,
          letterRendering: false,
          foreignObjectRendering: false
        });
        
        highlight.remove();
        return canvas.toDataURL('image/png');
        
      } catch (error) {
        highlight.remove();
        throw error;
      }
    }

    loadHtml2Canvas() {
      return new Promise((resolve, reject) => {
        if (typeof html2canvas !== 'undefined') {
          resolve();
          return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    showCommentModal(x, y, data = null) {
      const modal = document.createElement('div');
      modal.className = 'dr-modal';
      
      let elementPreview = '';
      if (data && data.annotationData && data.annotationData.type === 'element') {
        const el = data.annotationData.elementInfo;
        elementPreview = `
          <div class="dr-element-preview" style="margin-bottom: 16px; padding: 12px; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 4px;">
            <div style="font-weight: bold; color: #374151; margin-bottom: 8px;">Markiertes Element:</div>
            <div style="font-family: monospace; font-size: 12px; color: #6b7280;">
              <div><strong>Selektor:</strong> ${data.annotationData.selector}</div>
              <div><strong>Tag:</strong> &lt;${el.tag}&gt;</div>
              ${el.text ? `<div><strong>Text:</strong> "${el.text}"</div>` : ''}
              ${el.attributes.id ? `<div><strong>ID:</strong> ${el.attributes.id}</div>` : ''}
              ${el.attributes.class ? `<div><strong>Klassen:</strong> ${el.attributes.class}</div>` : ''}
              <div><strong>Größe:</strong> ${el.dimensions.width}×${el.dimensions.height}px</div>
            </div>
          </div>
        `;
      }
      
      modal.innerHTML = `
        <div class="dr-modal-content">
          <h3>Kommentar hinzufügen</h3>
          ${elementPreview}
          <textarea id="dr-comment-text" placeholder="Beschreiben Sie das Problem oder Ihre Anmerkung..."></textarea>
          <div class="dr-modal-actions">
            <button class="dr-btn dr-btn-cancel" onclick="this.closest('.dr-modal').remove();">Abbrechen</button>
            <button class="dr-btn dr-btn-save" id="dr-save-comment">Speichern</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      const textarea = document.getElementById('dr-comment-text');
      const saveBtn = document.getElementById('dr-save-comment');
      
      textarea.focus();
      
      saveBtn.addEventListener('click', () => {
        const text = textarea.value.trim();
        if (text) {
          this.addComment(x, y, text, data);
          modal.remove();
        }
      });
      
      // Save on Enter
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          saveBtn.click();
        }
      });
    }

    addComment(x, y, text, data = null) {
      const comment = {
        id: Date.now().toString(),
        x: x,
        y: y,
        text: text,
        timestamp: new Date(),
        url: this.currentUrl,
        annotationData: data ? data.annotationData : null,
        area: data ? data.area : null
      };
      
      this.comments.push(comment);
      this.createMarker(comment);
      this.updateCommentList();
      this.saveComments();
    }

    createMarker(comment) {
      const marker = document.createElement('div');
      marker.className = 'dr-marker';
      marker.textContent = this.comments.length;
      marker.style.left = comment.x + 'px';
      marker.style.top = comment.y + 'px';
      marker.title = comment.text;
      
      marker.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showCommentDetails(comment);
      });
      
      document.body.appendChild(marker);
    }

    showCommentDetails(comment) {
      const modal = document.createElement('div');
      modal.className = 'dr-modal';
      
      const screenshotImg = (comment.screenshot_display || comment.screenshot) ? 
        `<div style="margin-bottom: 16px;">
          <img src="${comment.screenshot_display || comment.screenshot}" alt="Screenshot" style="max-width: 100%; border: 1px solid #e5e7eb; border-radius: 4px;">
        </div>` : '';
      
      modal.innerHTML = `
        <div class="dr-modal-content">
          <h3>Kommentar #${this.comments.indexOf(comment) + 1}</h3>
          ${screenshotImg}
          <p style="margin-bottom: 16px; padding: 12px; background: #f9fafb; border-radius: 4px;">${comment.text}</p>
          <p style="color: #6b7280; font-size: 12px; margin-bottom: 16px;">Erstellt: ${comment.timestamp.toLocaleString()}</p>
          ${comment.area ? `<p style="color: #6b7280; font-size: 12px; margin-bottom: 16px;">Bereich: ${comment.area.width}x${comment.area.height}px</p>` : ''}
          <div class="dr-modal-actions">
            <button class="dr-btn dr-btn-cancel" onclick="this.closest('.dr-modal').remove();">Schließen</button>
            <button class="dr-btn dr-btn-save" onclick="this.downloadScreenshot('${comment.id}');">Screenshot herunterladen</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
    }

    downloadScreenshot(commentId) {
      const comment = this.comments.find(c => c.id === commentId);
      if (comment && comment.screenshot) {
        const link = document.createElement('a');
        link.download = `design-review-${commentId}.png`;
        link.href = comment.screenshot;
        link.click();
      }
      
      // Close modal
      document.querySelector('.dr-modal').remove();
    }

    updateCommentList() {
      const list = document.getElementById('dr-comment-list');
      list.innerHTML = '';
      
      this.comments.forEach((comment, index) => {
        const item = document.createElement('div');
        item.className = 'dr-comment';
        
        // Show element info instead of screenshot
        let elementInfo = '';
        if (comment.annotationData && comment.annotationData.type === 'element') {
          const el = comment.annotationData.elementInfo;
          elementInfo = `
            <div style="float: right; margin-left: 8px; font-size: 10px; color: #6b7280; max-width: 100px;">
              <div style="font-family: monospace; background: #f3f4f6; padding: 2px 4px; border-radius: 2px;">
                ${comment.annotationData.selector}
              </div>
            </div>
          `;
        }
        
        item.innerHTML = `
          ${elementInfo}
          <div class="dr-comment-text">${comment.text}</div>
          <div class="dr-comment-meta">
            Position: ${Math.round(comment.x)}, ${Math.round(comment.y)} | 
            ${comment.timestamp.toLocaleString()}
            ${comment.area ? ` | ${comment.area.width}x${comment.area.height}px` : ''}
            ${comment.annotationData && comment.annotationData.elementInfo ? 
              ` | ${comment.annotationData.elementInfo.tag}` : ''}
          </div>
        `;
        
        item.style.cursor = 'pointer';
        item.onclick = () => this.showCommentDetails(comment);
        
        list.appendChild(item);
      });
    }

    saveComments() {
      localStorage.setItem('dr-comments-' + window.location.hostname, JSON.stringify(this.comments));
    }

    loadComments() {
      const saved = localStorage.getItem('dr-comments-' + window.location.hostname);
      if (saved) {
        try {
          this.comments = JSON.parse(saved).map(comment => ({
            ...comment,
            timestamp: new Date(comment.timestamp)
          }));
          
          this.comments.forEach(comment => {
            if (comment.url === this.currentUrl) {
              this.createMarker(comment);
            }
          });
          
          this.updateCommentList();
        } catch (e) {
          console.error('Error loading comments:', e);
        }
      }
    }

    exportComments() {
      const commentsForThisUrl = this.comments.filter(c => c.url === this.currentUrl);
      
      const exportData = {
        url: this.currentUrl,
        timestamp: new Date().toISOString(),
        comments: commentsForThisUrl.map((comment, index) => ({
          id: comment.id,
          position: `${Math.round(comment.x)}, ${Math.round(comment.y)}`,
          text: comment.text,
          timestamp: comment.timestamp.toISOString(),
          area: comment.area ? `${comment.area.width}x${comment.area.height}px` : null,
          element: comment.annotationData && comment.annotationData.type === 'element' ? {
            selector: comment.annotationData.selector,
            tag: comment.annotationData.elementInfo.tag,
            text: comment.annotationData.elementInfo.text,
            attributes: comment.annotationData.elementInfo.attributes,
            dimensions: comment.annotationData.elementInfo.dimensions,
            styles: comment.annotationData.elementInfo.styles
          } : null
        }))
      };

      // Create JSON file
      const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonLink = document.createElement('a');
      jsonLink.href = jsonUrl;
      jsonLink.download = `design-review-${window.location.hostname}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(jsonLink);
      jsonLink.click();
      document.body.removeChild(jsonLink);
      URL.revokeObjectURL(jsonUrl);

      // Show success message
      const status = document.getElementById('dr-status');
      const originalText = status.textContent;
      const elementCount = commentsForThisUrl.filter(c => c.annotationData && c.annotationData.type === 'element').length;
      status.textContent = `${commentsForThisUrl.length} Kommentare mit ${elementCount} Element-Selektoren exportiert`;
      status.style.color = '#10b981';
      
      setTimeout(() => {
        status.textContent = originalText;
        status.style.color = '';
      }, 3000);
    }

    showDebugInfo() {
      const info = {
        totalComments: this.comments.length,
        commentsWithScreenshots: this.comments.filter(c => c.screenshot).length,
        currentUrl: this.currentUrl,
        html2canvasLoaded: typeof html2canvas !== 'undefined'
      };
      
      console.log('Design Review Debug Info:', info);
      console.log('All comments:', this.comments);
      
      alert(`Debug Info:
- Kommentare gesamt: ${info.totalComments}
- Mit Screenshots: ${info.commentsWithScreenshots}
- html2canvas geladen: ${info.html2canvasLoaded}
- URL: ${info.currentUrl}

Siehe Console für Details.`);
    }
  }

  // Initialize the overlay
  const overlay = new DesignReviewOverlay();
  
  // Make download function globally available
  window.downloadScreenshot = (commentId) => overlay.downloadScreenshot(commentId);
})();