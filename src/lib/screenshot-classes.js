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
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      script.onload = () => {
        this.html2canvas = window.html2canvas;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async loadDomToImage() {
    return new Promise((resolve, reject) => {
      if (window.domtoimage) {
        this.domtoimage = window.domtoimage;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/dom-to-image-more@2.8.0/dist/dom-to-image-more.min.js';
      script.onload = () => {
        this.domtoimage = window.domtoimage;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async capture(element = document.body) {
    await this.loadLibraries();
    
    // Try html2canvas first
    try {
      const canvas = await this.html2canvas(element, {
        allowTaint: false,
        useCORS: true,
        scale: 1,
        logging: false,
        backgroundColor: '#ffffff',
        removeContainer: true
      });
      
      return canvas.toDataURL('image/png', 0.95);
    } catch (error) {
      console.warn('html2canvas failed:', error);
    }

    // Fallback to dom-to-image
    try {
      return await this.domtoimage.toPng(element, {
        quality: 0.95,
        bgcolor: '#ffffff',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });
    } catch (error) {
      console.warn('dom-to-image failed:', error);
    }

    // Last resort: try server-side screenshot
    try {
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
      const canvas = await this.html2canvas(element, {
        allowTaint: false,
        useCORS: true,
        scale: 1,
        logging: false,
        backgroundColor: '#ffffff',
        removeContainer: true
      });

      return canvas.toDataURL('image/png', 0.95);
    } catch (error) {
      console.warn('Element capture with html2canvas failed:', error);
      
      // Fallback to dom-to-image
      try {
        return await this.domtoimage.toPng(element, {
          quality: 0.95,
          bgcolor: '#ffffff'
        });
      } catch (domError) {
        console.warn('Element capture with dom-to-image failed:', domError);
        throw new Error('Element capture failed');
      }
    } finally {
      // Restore hidden elements
      hiddenElements.forEach(({ element, originalDisplay }) => {
        element.style.display = originalDisplay;
      });
    }
  }

  async captureArea(area) {
    // Create a temporary container for area capture
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = area.x + 'px';
    tempContainer.style.top = area.y + 'px';
    tempContainer.style.width = area.width + 'px';
    tempContainer.style.height = area.height + 'px';
    tempContainer.style.overflow = 'hidden';
    tempContainer.style.pointerEvents = 'none';
    tempContainer.style.zIndex = '-1';

    // Clone body content and remove widget elements
    const bodyClone = document.body.cloneNode(true);
    const widgetElements = bodyClone.querySelectorAll('#feedback-widget-button, #feedback-selection-overlay, #feedback-modal, [id*="feedback-"]');
    widgetElements.forEach(el => el.remove());

    tempContainer.appendChild(bodyClone);
    document.body.appendChild(tempContainer);

    try {
      const screenshot = await this.capture(tempContainer);
      return screenshot;
    } finally {
      tempContainer.remove();
    }
  }
}

class HybridScreenshot {
  constructor() {
    this.reliableScreenshot = new ReliableScreenshot();
    this.fallbackScreenshot = new FallbackScreenshot();
    this.supportsScreenCapture = this.reliableScreenshot.isSupported();
  }

  async takeScreenshot(targetElement = null) {
    const method = await this.askUserForMethod();
    
    switch (method) {
      case 'screen':
        return await this.captureScreen();
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
        <div style="background: white; padding: 30px; border-radius: 10px; max-width: 400px; 
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
          <h3 style="margin: 0 0 20px 0; color: #333; font-size: 18px;">Screenshot-Methode wählen:</h3>
          
          ${this.supportsScreenCapture ? `
            <button data-method="screen" style="display: block; width: 100%; margin: 10px 0; padding: 15px; 
                    background: #4CAF50; color: white; border: none; border-radius: 5px; 
                    cursor: pointer; font-size: 14px;">
              📺 Browser Screen Capture (Empfohlen)
            </button>
          ` : ''}
          
          <button data-method="element" style="display: block; width: 100%; margin: 10px 0; padding: 15px; 
                  background: #2196F3; color: white; border: none; border-radius: 5px; 
                  cursor: pointer; font-size: 14px;">
            🖼️ Automatisch (Website-Element)
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

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ReliableScreenshot,
    FallbackScreenshot,
    HybridScreenshot
  };
}

// Global availability
window.ReliableScreenshot = ReliableScreenshot;
window.FallbackScreenshot = FallbackScreenshot;
window.HybridScreenshot = HybridScreenshot;