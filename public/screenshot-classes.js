class ReliableScreenshot {
  constructor() {
    this.stream = null;
    this.canvas = null;
    this.context = null;
  }

  async captureWithPermission() {
    try {
      // Request screen capture permission
      this.stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      // Create video element to capture frame
      const video = document.createElement('video');
      video.srcObject = this.stream;
      video.muted = true;
      
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          video.play();
          resolve();
        };
        video.onerror = reject;
      });

      // Wait for video to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create canvas and capture frame
      this.canvas = document.createElement('canvas');
      this.canvas.width = video.videoWidth;
      this.canvas.height = video.videoHeight;
      this.context = this.canvas.getContext('2d');
      
      this.context.drawImage(video, 0, 0);
      
      // Clean up
      this.stream.getTracks().forEach(track => track.stop());
      video.remove();
      
      // Convert to base64
      return this.canvas.toDataURL('image/png', 0.95);
      
    } catch (error) {
      console.error('Screen capture failed:', error);
      
      // Clean up on error
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
      }
      
      throw new Error('Screen capture not supported or permission denied');
    }
  }

  async captureWindow() {
    try {
      // Alternative method for window capture
      return await this.captureWithPermission();
    } catch (error) {
      throw new Error('Window capture failed: ' + error.message);
    }
  }

  isSupported() {
    return 'getDisplayMedia' in navigator.mediaDevices;
  }
}

class FallbackScreenshot {
  constructor() {
    this.html2canvas = null;
    this.domtoimage = null;
  }

  async loadLibraries() {
    // Load html2canvas if not already loaded
    if (!window.html2canvas && !this.html2canvas) {
      await this.loadHtml2Canvas();
    }
    
    // Load dom-to-image if not already loaded
    if (!window.domtoimage && !this.domtoimage) {
      await this.loadDomToImage();
    }
  }

  async loadHtml2Canvas() {
    return new Promise((resolve, reject) => {
      if (window.html2canvas) {
        this.html2canvas = window.html2canvas;
        console.log('html2canvas already loaded');
        resolve();
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="html2canvas"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => {
          this.html2canvas = window.html2canvas;
          console.log('html2canvas loaded from existing script');
          resolve();
        });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      script.onload = () => {
        this.html2canvas = window.html2canvas;
        console.log('html2canvas loaded successfully');
        resolve();
      };
      script.onerror = (error) => {
        console.error('Failed to load html2canvas:', error);
        reject(error);
      };
      document.head.appendChild(script);
    });
  }

  async loadDomToImage() {
    return new Promise((resolve, reject) => {
      if (window.domtoimage) {
        this.domtoimage = window.domtoimage;
        console.log('dom-to-image already loaded');
        resolve();
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="dom-to-image"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => {
          this.domtoimage = window.domtoimage;
          console.log('dom-to-image loaded from existing script');
          resolve();
        });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/dom-to-image-more@2.8.0/dist/dom-to-image-more.min.js';
      script.onload = () => {
        this.domtoimage = window.domtoimage;
        console.log('dom-to-image loaded successfully');
        resolve();
      };
      script.onerror = (error) => {
        console.error('Failed to load dom-to-image:', error);
        reject(error);
      };
      document.head.appendChild(script);
    });
  }

  async capture(element = document.body) {
    await this.loadLibraries();
    
    // Try html2canvas first
    try {
      const html2canvas = this.html2canvas || window.html2canvas;
      if (html2canvas) {
        console.log('Trying html2canvas capture...');
        const canvas = await html2canvas(element, {
          allowTaint: true,
          useCORS: false,
          scale: 1,
          logging: false,
          backgroundColor: '#ffffff',
          removeContainer: true,
          ignoreElements: (element) => {
            // Skip problematic elements
            if (element.tagName === 'IMG' && element.src && element.src.includes('_next/image')) {
              return true;
            }
            if (element.tagName === 'IFRAME') {
              return true;
            }
            return false;
          }
        });
        
        return canvas.toDataURL('image/png', 0.95);
      } else {
        console.warn('html2canvas not available');
      }
    } catch (error) {
      console.warn('html2canvas failed:', error);
    }

    // Fallback to dom-to-image
    try {
      const domtoimage = this.domtoimage || window.domtoimage;
      if (domtoimage) {
        console.log('Trying dom-to-image capture...');
        return await domtoimage.toPng(element, {
          quality: 0.95,
          bgcolor: '#ffffff',
          style: {
            transform: 'scale(1)',
            transformOrigin: 'top left'
          },
          filter: (node) => {
            // Skip problematic elements
            if (node.tagName === 'IMG' && node.src && node.src.includes('_next/image')) {
              return false;
            }
            if (node.tagName === 'IFRAME') {
              return false;
            }
            return true;
          }
        });
      } else {
        console.warn('dom-to-image not available');
      }
    } catch (error) {
      console.warn('dom-to-image failed:', error);
    }

    // Last resort: try server-side screenshot
    try {
      console.log('Trying server-side screenshot...');
      return await this.serverScreenshot();
    } catch (error) {
      console.warn('Server screenshot failed:', error);
    }

    throw new Error('All screenshot methods failed');
  }

  async serverScreenshot() {
    const response = await fetch('/api/screenshot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: window.location.href,
        fullPage: false
      })
    });

    if (!response.ok) {
      throw new Error('Server screenshot failed');
    }

    const result = await response.json();
    return result.image;
  }

  async captureElement(element) {
    if (!element) {
      throw new Error('No element provided for capture');
    }

    await this.loadLibraries();

    // Remove any widget elements from the element
    const widgetElements = element.querySelectorAll('#feedback-widget-button, #feedback-selection-overlay, #feedback-modal, [id*="feedback-"]');
    const hiddenElements = [];
    
    widgetElements.forEach(el => {
      if (el.style.display !== 'none') {
        hiddenElements.push({ element: el, originalDisplay: el.style.display });
        el.style.display = 'none';
      }
    });

    try {
      // Try html2canvas first
      const html2canvas = this.html2canvas || window.html2canvas;
      if (html2canvas) {
        console.log('Trying html2canvas element capture...');
        const canvas = await html2canvas(element, {
          allowTaint: true,
          useCORS: false,
          scale: 1,
          logging: false,
          backgroundColor: '#ffffff',
          removeContainer: true,
          ignoreElements: (element) => {
            // Skip problematic elements
            if (element.tagName === 'IMG' && element.src && element.src.includes('_next/image')) {
              return true;
            }
            if (element.tagName === 'IFRAME') {
              return true;
            }
            return false;
          }
        });

        return canvas.toDataURL('image/png', 0.95);
      } else {
        console.warn('html2canvas not available for element capture');
      }
      
      // Fallback to dom-to-image
      const domtoimage = this.domtoimage || window.domtoimage;
      if (domtoimage) {
        console.log('Trying dom-to-image element capture...');
        return await domtoimage.toPng(element, {
          quality: 0.95,
          bgcolor: '#ffffff',
          filter: (node) => {
            // Skip problematic elements
            if (node.tagName === 'IMG' && node.src && node.src.includes('_next/image')) {
              return false;
            }
            if (node.tagName === 'IFRAME') {
              return false;
            }
            return true;
          }
        });
      } else {
        console.warn('dom-to-image not available for element capture');
      }
      
      throw new Error('Element capture failed with all methods');
      
    } catch (error) {
      console.warn('Element capture failed:', error);
      throw new Error('Element capture failed with all methods');
    } finally {
      // Restore hidden elements
      hiddenElements.forEach(({ element, originalDisplay }) => {
        element.style.display = originalDisplay;
      });
    }
  }

  async captureArea(area) {
    await this.loadLibraries();
    
    try {
      // First, try to capture the full page
      const html2canvas = this.html2canvas || window.html2canvas;
      if (html2canvas) {
        console.log('Trying html2canvas area capture...');
        const fullScreenshot = await html2canvas(document.body, {
          allowTaint: true,
          useCORS: false,
          scale: 1,
          logging: false,
          backgroundColor: '#ffffff',
          removeContainer: true,
          width: window.innerWidth,
          height: window.innerHeight,
          ignoreElements: (element) => {
            // Skip problematic elements
            if (element.tagName === 'IMG' && element.src && element.src.includes('_next/image')) {
              return true;
            }
            if (element.tagName === 'IFRAME') {
              return true;
            }
            return false;
          }
        });
        
        // Create a new canvas for the cropped area
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = area.width;
        croppedCanvas.height = area.height;
        const ctx = croppedCanvas.getContext('2d');
        
        // Draw the selected area from the full screenshot
        ctx.drawImage(
          fullScreenshot,
          area.x, area.y, area.width, area.height,  // Source coordinates
          0, 0, area.width, area.height             // Destination coordinates
        );
        
        return croppedCanvas.toDataURL('image/png', 0.95);
      } else {
        console.warn('html2canvas not available for area capture');
      }
      
    } catch (error) {
      console.warn('html2canvas area capture failed:', error);
    }
    
    // Fallback to dom-to-image approach
    try {
      const domtoimage = this.domtoimage || window.domtoimage;
      if (domtoimage) {
        console.log('Trying dom-to-image area capture...');
        
        // Create a temporary container that covers the selected area
        const tempContainer = document.createElement('div');
        tempContainer.style.cssText = `
          position: fixed;
          left: 0px;
          top: 0px;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          pointer-events: none;
          z-index: -1;
        `;
        
        // Clone the body content into the container
        const bodyClone = document.body.cloneNode(true);
        
        // Remove widget elements from the clone
        const widgetElements = bodyClone.querySelectorAll('#feedback-widget-button, #feedback-selection-overlay, #feedback-modal, [id*="feedback-"], #hybrid-screenshot-highlight');
        widgetElements.forEach(el => el.remove());
        
        // Position the cloned content to show the selected area
        bodyClone.style.position = 'relative';
        bodyClone.style.left = (-area.x) + 'px';
        bodyClone.style.top = (-area.y) + 'px';
        
        tempContainer.appendChild(bodyClone);
        document.body.appendChild(tempContainer);
        
        // Set container size to match selected area
        tempContainer.style.width = area.width + 'px';
        tempContainer.style.height = area.height + 'px';
        
        try {
          const screenshot = await domtoimage.toPng(tempContainer, {
            quality: 0.95,
            bgcolor: '#ffffff',
            width: area.width,
            height: area.height,
            filter: (node) => {
              // Skip problematic elements
              if (node.tagName === 'IMG' && node.src && node.src.includes('_next/image')) {
                return false;
              }
              if (node.tagName === 'IFRAME') {
                return false;
              }
              return true;
            }
          });
          
          return screenshot;
        } finally {
          tempContainer.remove();
        }
      } else {
        console.warn('dom-to-image not available for area capture');
      }
    } catch (domError) {
      console.warn('dom-to-image area capture failed:', domError);
    }
    
    throw new Error('Area capture failed with all methods');
  }
}

class HybridScreenshot {
  constructor() {
    this.reliableScreenshot = new ReliableScreenshot();
    this.fallbackScreenshot = new FallbackScreenshot();
    this.supportsScreenCapture = this.reliableScreenshot.isSupported();
    this.selectionOverlay = null;
    this.selectedElement = null;
    this.selectedArea = null;
  }

  async takeScreenshot(targetElement = null) {
    const method = await this.askUserForMethod();
    
    switch (method) {
      case 'screen':
        return await this.captureScreen();
      case 'select-area':
        return await this.selectAndCaptureArea();
      case 'select-element':
        return await this.selectAndCaptureElement();
      case 'element':
        return await this.captureElement(targetElement || document.body);
      case 'manual':
        return await this.manualScreenshot();
      default:
        return await this.captureElement(document.body);
    }
  }

  async askUserForMethod() {
    return new Promise((resolve) => {
      const modal = this.createMethodModal();
      document.body.appendChild(modal);
      
      modal.addEventListener('click', (e) => {
        if (e.target.dataset.method) {
          resolve(e.target.dataset.method);
          modal.remove();
        }
      });

      // Close modal with Escape key
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          resolve('element'); // Default to element capture
          modal.remove();
          document.removeEventListener('keydown', handleEscape);
        }
      };
      document.addEventListener('keydown', handleEscape);
    });
  }

  createMethodModal() {
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                  background: rgba(0,0,0,0.8); z-index: 10000; 
                  display: flex; align-items: center; justify-content: center;">
        <div style="background: white; padding: 30px; border-radius: 10px; max-width: 450px; 
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
          <h3 style="margin: 0 0 20px 0; color: #333; font-size: 18px;">Screenshot-Methode wählen:</h3>
          
          ${this.supportsScreenCapture ? `
            <button data-method="screen" style="display: block; width: 100%; margin: 10px 0; padding: 15px; 
                    background: #4CAF50; color: white; border: none; border-radius: 5px; 
                    cursor: pointer; font-size: 14px;">
              📺 Browser Screen Capture (Empfohlen)
            </button>
          ` : ''}
          
          <button data-method="select-area" style="display: block; width: 100%; margin: 10px 0; padding: 15px; 
                  background: #9C27B0; color: white; border: none; border-radius: 5px; 
                  cursor: pointer; font-size: 14px;">
            🔲 Bereich auswählen & markieren
          </button>
          
          <button data-method="select-element" style="display: block; width: 100%; margin: 10px 0; padding: 15px; 
                  background: #2196F3; color: white; border: none; border-radius: 5px; 
                  cursor: pointer; font-size: 14px;">
            🎯 Element auswählen & markieren
          </button>
          
          <button data-method="element" style="display: block; width: 100%; margin: 10px 0; padding: 15px; 
                  background: #607D8B; color: white; border: none; border-radius: 5px; 
                  cursor: pointer; font-size: 14px;">
            🖼️ Automatisch (Gesamte Seite)
          </button>
          
          <button data-method="manual" style="display: block; width: 100%; margin: 10px 0; padding: 15px; 
                  background: #FF9800; color: white; border: none; border-radius: 5px; 
                  cursor: pointer; font-size: 14px;">
            📋 Manuell hochladen
          </button>

          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee; 
                      font-size: 12px; color: #666;">
            Drücke ESC für automatische Auswahl
          </div>
        </div>
      </div>
    `;

    // Add hover effects
    const buttons = modal.querySelectorAll('button');
    buttons.forEach(button => {
      button.addEventListener('mouseenter', () => {
        button.style.opacity = '0.9';
        button.style.transform = 'translateY(-1px)';
      });
      button.addEventListener('mouseleave', () => {
        button.style.opacity = '1';
        button.style.transform = 'translateY(0)';
      });
    });

    return modal;
  }

  async captureScreen() {
    try {
      return await this.reliableScreenshot.captureWithPermission();
    } catch (error) {
      console.warn('Screen capture failed, falling back to element capture:', error);
      return await this.fallbackScreenshot.capture();
    }
  }

  async captureElement(element) {
    return await this.fallbackScreenshot.capture(element);
  }

  async selectAndCaptureArea() {
    return new Promise((resolve) => {
      this.createAreaSelectionOverlay((selectedArea) => {
        if (selectedArea) {
          this.selectedArea = selectedArea;
          this.highlightSelectedArea(selectedArea);
          
          // Take screenshot after a brief delay to ensure highlight is visible
          setTimeout(async () => {
            try {
              const screenshot = await this.fallbackScreenshot.captureArea(selectedArea);
              this.removeHighlight();
              resolve(screenshot);
            } catch (error) {
              console.error('Area screenshot failed:', error);
              this.removeHighlight();
              resolve(null);
            }
          }, 100);
        } else {
          resolve(null);
        }
      });
    });
  }

  async selectAndCaptureElement() {
    return new Promise((resolve) => {
      this.createElementSelectionOverlay((selectedElement) => {
        if (selectedElement) {
          this.selectedElement = selectedElement;
          this.highlightSelectedElement(selectedElement);
          
          // Take screenshot after a brief delay to ensure highlight is visible
          setTimeout(async () => {
            try {
              const screenshot = await this.fallbackScreenshot.captureElement(selectedElement);
              this.removeHighlight();
              resolve(screenshot);
            } catch (error) {
              console.error('Element screenshot failed:', error);
              this.removeHighlight();
              resolve(null);
            }
          }, 100);
        } else {
          resolve(null);
        }
      });
    });
  }

  createAreaSelectionOverlay(callback) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.3);
      z-index: 10001;
      cursor: crosshair;
    `;

    let isSelecting = false;
    let startX, startY;
    let selectionBox = null;

    const instructions = document.createElement('div');
    instructions.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      padding: 15px 20px;
      border-radius: 5px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      z-index: 10002;
      font-family: Arial, sans-serif;
      font-size: 14px;
      color: #333;
    `;
    instructions.innerHTML = `
      <div style="text-align: center;">
        <strong>Bereich auswählen</strong><br>
        Klicken und ziehen Sie, um einen Bereich auszuwählen<br>
        <small>ESC zum Abbrechen</small>
      </div>
    `;

    overlay.appendChild(instructions);

    // Mouse events for area selection
    overlay.addEventListener('mousedown', (e) => {
      if (e.target === instructions) return;
      
      isSelecting = true;
      startX = e.clientX;
      startY = e.clientY;
      
      selectionBox = document.createElement('div');
      selectionBox.style.cssText = `
        position: fixed;
        border: 2px dashed #ff6b6b;
        background: rgba(255, 107, 107, 0.2);
        z-index: 10002;
        pointer-events: none;
      `;
      overlay.appendChild(selectionBox);
    });

    overlay.addEventListener('mousemove', (e) => {
      if (!isSelecting || !selectionBox) return;
      
      const currentX = e.clientX;
      const currentY = e.clientY;
      
      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);
      
      selectionBox.style.left = left + 'px';
      selectionBox.style.top = top + 'px';
      selectionBox.style.width = width + 'px';
      selectionBox.style.height = height + 'px';
    });

    overlay.addEventListener('mouseup', (e) => {
      if (!isSelecting || !selectionBox) return;
      
      const currentX = e.clientX;
      const currentY = e.clientY;
      
      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);
      
      overlay.remove();
      
      if (width > 10 && height > 10) {
        callback({
          x: left,
          y: top,
          width: width,
          height: height
        });
      } else {
        callback(null);
      }
    });

    // ESC to cancel
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
        callback(null);
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    document.body.appendChild(overlay);
  }

  createElementSelectionOverlay(callback) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.1);
      z-index: 10001;
      cursor: pointer;
    `;

    const instructions = document.createElement('div');
    instructions.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      padding: 15px 20px;
      border-radius: 5px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      z-index: 10002;
      font-family: Arial, sans-serif;
      font-size: 14px;
      color: #333;
    `;
    instructions.innerHTML = `
      <div style="text-align: center;">
        <strong>Element auswählen</strong><br>
        Bewegen Sie die Maus über Elemente und klicken Sie zum Auswählen<br>
        <small>ESC zum Abbrechen</small>
      </div>
    `;

    overlay.appendChild(instructions);

    let currentHighlight = null;

    // Mouse events for element selection
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);

    function handleMouseMove(e) {
      if (e.target === overlay || e.target === instructions) return;
      
      // Remove previous highlight
      if (currentHighlight) {
        currentHighlight.remove();
      }
      
      // Create new highlight
      const rect = e.target.getBoundingClientRect();
      currentHighlight = document.createElement('div');
      currentHighlight.style.cssText = `
        position: fixed;
        left: ${rect.left}px;
        top: ${rect.top}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        border: 2px solid #4CAF50;
        background: rgba(76, 175, 80, 0.2);
        z-index: 10002;
        pointer-events: none;
      `;
      document.body.appendChild(currentHighlight);
    }

    function handleClick(e) {
      e.preventDefault();
      e.stopPropagation();
      
      if (e.target === overlay || e.target === instructions) {
        cleanup();
        callback(null);
        return;
      }
      
      cleanup();
      callback(e.target);
    }

    function cleanup() {
      if (currentHighlight) {
        currentHighlight.remove();
      }
      overlay.remove();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleEscape);
    }

    // ESC to cancel
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        cleanup();
        callback(null);
      }
    };
    document.addEventListener('keydown', handleEscape);

    document.body.appendChild(overlay);
  }

  highlightSelectedArea(area) {
    this.removeHighlight();
    
    const highlight = document.createElement('div');
    highlight.id = 'hybrid-screenshot-highlight';
    highlight.style.cssText = `
      position: fixed;
      left: ${area.x}px;
      top: ${area.y}px;
      width: ${area.width}px;
      height: ${area.height}px;
      border: 3px solid #ff6b6b;
      background: rgba(255, 107, 107, 0.1);
      z-index: 9999;
      pointer-events: none;
      box-shadow: 0 0 0 2px rgba(255, 107, 107, 0.3);
    `;
    
    document.body.appendChild(highlight);
    this.selectionOverlay = highlight;
  }

  highlightSelectedElement(element) {
    this.removeHighlight();
    
    const rect = element.getBoundingClientRect();
    const highlight = document.createElement('div');
    highlight.id = 'hybrid-screenshot-highlight';
    highlight.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 3px solid #4CAF50;
      background: rgba(76, 175, 80, 0.1);
      z-index: 9999;
      pointer-events: none;
      box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.3);
    `;
    
    document.body.appendChild(highlight);
    this.selectionOverlay = highlight;
  }

  removeHighlight() {
    if (this.selectionOverlay) {
      this.selectionOverlay.remove();
      this.selectionOverlay = null;
    }
    
    // Remove any existing highlights
    const existingHighlights = document.querySelectorAll('#hybrid-screenshot-highlight');
    existingHighlights.forEach(highlight => highlight.remove());
  }

  async manualScreenshot() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(file);
        } else {
          resolve(null);
        }
      };
      
      // Handle cancel
      input.oncancel = () => resolve(null);
      
      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);
    });
  }

  // Compatibility method for existing code
  async createScreenshot(targetElement = null) {
    return await this.takeScreenshot(targetElement);
  }
}

class RobustScreenshot {
  constructor() {
    this.reliableScreenshot = new ReliableScreenshot();
    this.fallbackScreenshot = new FallbackScreenshot();
    this.methods = [
      { name: 'html2canvas-modern', func: () => this.tryHtml2CanvasModern() },
      { name: 'html2canvas-legacy', func: () => this.tryHtml2CanvasLegacy() },
      { name: 'dom-to-image', func: () => this.tryDomToImage() },
      { name: 'screen-capture', func: () => this.tryScreenCapture() },
      { name: 'server-side', func: () => this.tryServerSide() }
    ];
  }

  async captureWithFallbacks(element = document.body, area = null) {
    console.log('RobustScreenshot: Starting capture with fallbacks');
    
    for (const method of this.methods) {
      try {
        console.log(`RobustScreenshot: Trying ${method.name}...`);
        const result = await method.func();
        
        if (result) {
          console.log(`RobustScreenshot: Success with ${method.name}`);
          return result;
        }
      } catch (error) {
        console.warn(`RobustScreenshot: ${method.name} failed:`, error.message);
        continue;
      }
    }
    
    console.error('RobustScreenshot: All methods failed');
    return null;
  }

  async tryHtml2CanvasModern() {
    await this.fallbackScreenshot.loadLibraries();
    const html2canvas = this.fallbackScreenshot.html2canvas || window.html2canvas;
    
    if (!html2canvas) {
      throw new Error('html2canvas not available');
    }

    // Modern approach with CSS3 support
    const canvas = await html2canvas(document.body, {
      allowTaint: true,
      useCORS: false,
      scale: 1,
      logging: false,
      backgroundColor: '#ffffff',
      removeContainer: true,
      foreignObjectRendering: true, // Better for modern CSS
      ignoreElements: (element) => {
        // Skip problematic elements
        if (element.tagName === 'IMG' && element.src && element.src.includes('_next/image')) {
          return true;
        }
        if (element.tagName === 'IFRAME' || element.tagName === 'VIDEO') {
          return true;
        }
        // Skip elements with oklab/oklch colors
        const computedStyle = window.getComputedStyle(element);
        if (computedStyle.color && (computedStyle.color.includes('oklab') || computedStyle.color.includes('oklch'))) {
          return true;
        }
        return false;
      }
    });

    return canvas.toDataURL('image/png', 0.95);
  }

  async tryHtml2CanvasLegacy() {
    await this.fallbackScreenshot.loadLibraries();
    const html2canvas = this.fallbackScreenshot.html2canvas || window.html2canvas;
    
    if (!html2canvas) {
      throw new Error('html2canvas not available');
    }

    // Legacy approach - more conservative
    const canvas = await html2canvas(document.body, {
      allowTaint: false,
      useCORS: true,
      scale: 0.8, // Lower scale for performance
      logging: false,
      backgroundColor: '#ffffff',
      removeContainer: true,
      foreignObjectRendering: false,
      imageTimeout: 5000,
      ignoreElements: (element) => {
        // More aggressive filtering
        if (element.tagName === 'IMG' || element.tagName === 'VIDEO' || element.tagName === 'IFRAME') {
          return true;
        }
        if (element.classList.contains('widget') || element.id.includes('feedback')) {
          return true;
        }
        return false;
      }
    });

    return canvas.toDataURL('image/png', 0.8);
  }

  async tryDomToImage() {
    await this.fallbackScreenshot.loadLibraries();
    const domtoimage = this.fallbackScreenshot.domtoimage || window.domtoimage;
    
    if (!domtoimage) {
      throw new Error('dom-to-image not available');
    }

    return await domtoimage.toPng(document.body, {
      quality: 0.8,
      bgcolor: '#ffffff',
      style: {
        transform: 'scale(0.8)',
        transformOrigin: 'top left'
      },
      filter: (node) => {
        // Conservative filtering
        if (node.tagName === 'IMG' || node.tagName === 'VIDEO' || node.tagName === 'IFRAME') {
          return false;
        }
        if (node.classList && node.classList.contains('widget')) {
          return false;
        }
        return true;
      }
    });
  }

  async tryScreenCapture() {
    if (!this.reliableScreenshot.isSupported()) {
      throw new Error('Screen capture not supported');
    }

    return await this.reliableScreenshot.captureWithPermission();
  }

  async tryServerSide() {
    return await this.fallbackScreenshot.serverScreenshot();
  }

  // Convenience method for area capture
  async captureArea(area) {
    const fullScreenshot = await this.captureWithFallbacks();
    
    if (!fullScreenshot) {
      return null;
    }

    // Crop the area from the full screenshot
    const img = new Image();
    return new Promise((resolve) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = area.width;
        canvas.height = area.height;
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(
          img,
          area.x, area.y, area.width, area.height,
          0, 0, area.width, area.height
        );
        
        resolve(canvas.toDataURL('image/png', 0.95));
      };
      img.src = fullScreenshot;
    });
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ReliableScreenshot,
    FallbackScreenshot,
    HybridScreenshot,
    RobustScreenshot
  };
}

// Global availability - ensure window object exists
if (typeof window !== 'undefined') {
  window.ReliableScreenshot = ReliableScreenshot;
  window.FallbackScreenshot = FallbackScreenshot;
  window.HybridScreenshot = HybridScreenshot;
  window.RobustScreenshot = RobustScreenshot;
  
  // Debug logging
  console.log('Screenshot classes loaded:', {
    ReliableScreenshot: typeof ReliableScreenshot,
    FallbackScreenshot: typeof FallbackScreenshot,
    HybridScreenshot: typeof HybridScreenshot,
    RobustScreenshot: typeof RobustScreenshot
  });
}