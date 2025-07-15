// Modern Feedback Widget - Clean Implementation
(function() {
    'use strict';
    
    console.log('Widget: Loading modern feedback widget');
    
    // Configuration
    const script = document.currentScript || document.querySelector('script[data-project-id]');
    const projectId = script?.getAttribute('data-project-id') || 'default-project';
    
    // Auto-detect baseUrl
    let baseUrl = 'http://localhost:3000';
    if (script?.src) {
        const scriptUrl = new URL(script.src);
        if (scriptUrl.hostname === 'localhost' || scriptUrl.hostname === '127.0.0.1') {
            baseUrl = `${scriptUrl.protocol}//${scriptUrl.hostname}:${scriptUrl.port}`;
        } else {
            baseUrl = scriptUrl.origin;
        }
    }
    
    console.log('Widget: Configuration loaded', { projectId, baseUrl });
    
    // State variables
    let isSelecting = false;
    let isSubmitting = false;
    let overlay = null;
    let modal = null;
    let selectionArea = null;
    
    // Load html2canvas for screenshots
    async function loadHtml2Canvas() {
        if (window.html2canvas) {
            return window.html2canvas;
        }
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
            script.onload = () => {
                console.log('Widget: html2canvas loaded');
                resolve(window.html2canvas);
            };
            script.onerror = () => {
                console.error('Widget: Failed to load html2canvas');
                reject(new Error('Failed to load html2canvas'));
            };
            document.head.appendChild(script);
        });
    }
    
    // Create feedback button
    function createFeedbackButton() {
        const button = document.createElement('button');
        button.id = 'feedback-widget-button';
        button.innerHTML = '💬';
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
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
            button.style.boxShadow = '0 6px 20px rgba(0,123,255,0.4)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 4px 12px rgba(0,123,255,0.3)';
        });
        
        button.addEventListener('click', startFeedbackProcess);
        
        document.body.appendChild(button);
        console.log('Widget: Feedback button created');
    }
    
    // Start feedback process
    function startFeedbackProcess() {
        if (isSelecting) return;
        
        console.log('Widget: Starting feedback process');
        createSelectionOverlay();
    }
    
    // Create selection overlay
    function createSelectionOverlay() {
        isSelecting = true;
        
        overlay = document.createElement('div');
        overlay.id = 'feedback-selection-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.3);
            z-index: 10000;
            cursor: crosshair;
        `;
        
        const instructions = document.createElement('div');
        instructions.innerHTML = `
            <div style="position: absolute; top: 20px; left: 50%; transform: translateX(-50%); 
                        background: white; padding: 15px 25px; border-radius: 8px; 
                        box-shadow: 0 4px 12px rgba(0,0,0,0.2); font-family: Arial, sans-serif;">
                🖱️ Ziehen Sie ein Rechteck um den Bereich, zu dem Sie Feedback geben möchten
                <br><small style="color: #666;">ESC zum Abbrechen</small>
            </div>
        `;
        overlay.appendChild(instructions);
        
        let startX, startY, selectionBox;
        
        overlay.addEventListener('mousedown', (e) => {
            if (e.target !== overlay) return;
            
            startX = e.clientX;
            startY = e.clientY;
            
            selectionBox = document.createElement('div');
            selectionBox.style.cssText = `
                position: absolute;
                border: 2px dashed #007bff;
                background: rgba(0,123,255,0.1);
                pointer-events: none;
            `;
            overlay.appendChild(selectionBox);
            
            function onMouseMove(e) {
                const width = Math.abs(e.clientX - startX);
                const height = Math.abs(e.clientY - startY);
                const left = Math.min(e.clientX, startX);
                const top = Math.min(e.clientY, startY);
                
                selectionBox.style.left = left + 'px';
                selectionBox.style.top = top + 'px';
                selectionBox.style.width = width + 'px';
                selectionBox.style.height = height + 'px';
            }
            
            function onMouseUp(e) {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                
                const width = Math.abs(e.clientX - startX);
                const height = Math.abs(e.clientY - startY);
                
                if (width > 10 && height > 10) {
                    selectionArea = {
                        x: Math.min(e.clientX, startX),
                        y: Math.min(e.clientY, startY),
                        width: width,
                        height: height
                    };
                    
                    console.log('Widget: Area selected:', selectionArea);
                    removeSelectionOverlay();
                    showFeedbackModal();
                } else {
                    removeSelectionOverlay();
                }
            }
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
        
        // ESC key to cancel
        function onKeyDown(e) {
            if (e.key === 'Escape') {
                removeSelectionOverlay();
                document.removeEventListener('keydown', onKeyDown);
            }
        }
        document.addEventListener('keydown', onKeyDown);
        
        document.body.appendChild(overlay);
        console.log('Widget: Selection overlay created');
    }
    
    // Remove selection overlay
    function removeSelectionOverlay() {
        if (overlay) {
            overlay.remove();
            overlay = null;
        }
        isSelecting = false;
    }
    
    // Show feedback modal
    function showFeedbackModal() {
        modal = document.createElement('div');
        modal.id = 'feedback-modal';
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                        background: rgba(0,0,0,0.5); z-index: 10001; 
                        display: flex; align-items: center; justify-content: center;">
                <div style="background: white; padding: 30px; border-radius: 12px; 
                            max-width: 500px; width: 90%; box-shadow: 0 8px 24px rgba(0,0,0,0.2);">
                    <h3 style="margin: 0 0 20px 0; color: #333; font-family: Arial, sans-serif;">
                        📝 Feedback senden
                    </h3>
                    
                    <div style="margin-bottom: 20px; font-family: Arial, sans-serif;">
                        <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #555;">
                            Beschreiben Sie Ihr Feedback:
                        </label>
                        <textarea id="feedback-text" placeholder="Was möchten Sie zu diesem Bereich mitteilen?"
                                style="width: 100%; height: 120px; padding: 12px; border: 1px solid #ddd; 
                                       border-radius: 6px; font-family: Arial, sans-serif; resize: vertical;
                                       box-sizing: border-box;"></textarea>
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button id="feedback-cancel" style="padding: 12px 24px; border: 1px solid #ddd; 
                                background: #f8f9fa; color: #666; border-radius: 6px; cursor: pointer;
                                font-family: Arial, sans-serif;">
                            Abbrechen
                        </button>
                        <button id="feedback-submit" style="padding: 12px 24px; background: #007bff; 
                                color: white; border: none; border-radius: 6px; cursor: pointer;
                                font-family: Arial, sans-serif;">
                            📤 Feedback senden
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Event listeners
        modal.querySelector('#feedback-cancel').addEventListener('click', closeFeedbackModal);
        modal.querySelector('#feedback-submit').addEventListener('click', submitFeedback);
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeFeedbackModal();
            }
        });
        
        // ESC key to close
        function onKeyDown(e) {
            if (e.key === 'Escape') {
                closeFeedbackModal();
                document.removeEventListener('keydown', onKeyDown);
            }
        }
        document.addEventListener('keydown', onKeyDown);
        
        document.body.appendChild(modal);
        
        // Focus textarea
        setTimeout(() => {
            modal.querySelector('#feedback-text').focus();
        }, 100);
        
        console.log('Widget: Feedback modal shown');
    }
    
    // Close feedback modal
    function closeFeedbackModal() {
        if (modal) {
            modal.remove();
            modal = null;
        }
        selectionArea = null;
    }
    
    // Create screenshot
    async function createScreenshot() {
        if (!selectionArea) {
            console.error('Widget: No selection area available');
            return null;
        }
        
        try {
            console.log('Widget: Creating screenshot...');
            
            // Load html2canvas
            const html2canvas = await loadHtml2Canvas();
            
            // Hide widget elements temporarily
            const widgetElements = document.querySelectorAll('#feedback-widget-button, #feedback-modal');
            widgetElements.forEach(el => {
                el.style.display = 'none';
            });
            
            // Capture full page
            const canvas = await html2canvas(document.body, {
                useCORS: true,
                allowTaint: false,
                scale: 1,
                logging: false,
                backgroundColor: '#ffffff',
                ignoreElements: (element) => {
                    // Skip elements that might cause issues
                    if (element.style && element.style.color && element.style.color.includes('oklab')) {
                        return true;
                    }
                    if (element.style && element.style.backgroundColor && element.style.backgroundColor.includes('oklab')) {
                        return true;
                    }
                    return false;
                },
                onclone: (clonedDoc) => {
                    // Remove problematic CSS that html2canvas can't handle
                    const elements = clonedDoc.querySelectorAll('*');
                    elements.forEach(el => {
                        if (el.style) {
                            // Replace oklab colors with fallback
                            if (el.style.color && el.style.color.includes('oklab')) {
                                el.style.color = '#000000';
                            }
                            if (el.style.backgroundColor && el.style.backgroundColor.includes('oklab')) {
                                el.style.backgroundColor = '#ffffff';
                            }
                            // Remove CSS features that might cause issues
                            el.style.colorScheme = '';
                            el.style.accentColor = '';
                        }
                    });
                }
            });
            
            // Restore widget elements
            widgetElements.forEach(el => {
                el.style.display = '';
            });
            
            // Crop to selected area
            const croppedCanvas = document.createElement('canvas');
            croppedCanvas.width = selectionArea.width;
            croppedCanvas.height = selectionArea.height;
            const ctx = croppedCanvas.getContext('2d');
            
            ctx.drawImage(
                canvas,
                selectionArea.x, selectionArea.y, selectionArea.width, selectionArea.height,
                0, 0, selectionArea.width, selectionArea.height
            );
            
            const dataURL = croppedCanvas.toDataURL('image/png', 0.9);
            console.log('Widget: Screenshot created successfully');
            return dataURL;
            
        } catch (error) {
            console.error('Widget: Screenshot creation failed:', error);
            return null;
        }
    }
    
    // Submit feedback
    async function submitFeedback() {
        if (isSubmitting) return;
        
        const feedbackText = modal.querySelector('#feedback-text').value.trim();
        if (!feedbackText) {
            alert('Bitte geben Sie Ihr Feedback ein.');
            return;
        }
        
        isSubmitting = true;
        const submitButton = modal.querySelector('#feedback-submit');
        submitButton.innerHTML = '⏳ Wird gesendet...';
        submitButton.disabled = true;
        
        try {
            // Create screenshot
            const screenshot = await createScreenshot();
            
            // Prepare feedback data
            const feedbackData = {
                project_id: projectId,
                url: window.location.href,
                text: feedbackText,
                screenshot: screenshot,
                selected_area: selectionArea ? JSON.stringify(selectionArea) : null,
                user_agent: navigator.userAgent,
                timestamp: new Date().toISOString()
            };
            
            console.log('Widget: Submitting feedback...', feedbackData);
            
            // Send to API
            const response = await fetch(`${baseUrl}/api/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(feedbackData)
            });
            
            if (response.ok) {
                console.log('Widget: Feedback submitted successfully');
                
                // Show success message
                modal.innerHTML = `
                    <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                                background: rgba(0,0,0,0.5); z-index: 10001; 
                                display: flex; align-items: center; justify-content: center;">
                        <div style="background: white; padding: 40px; border-radius: 12px; 
                                    max-width: 400px; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,0.2);">
                            <div style="font-size: 48px; margin-bottom: 20px;">✅</div>
                            <h3 style="margin: 0 0 15px 0; color: #333; font-family: Arial, sans-serif;">
                                Feedback gesendet!
                            </h3>
                            <p style="color: #666; margin: 0 0 25px 0; font-family: Arial, sans-serif;">
                                Vielen Dank für Ihr Feedback. Es wurde erfolgreich übermittelt.
                            </p>
                            <button onclick="this.closest('#feedback-modal').remove()" 
                                    style="padding: 12px 24px; background: #28a745; color: white; 
                                           border: none; border-radius: 6px; cursor: pointer;
                                           font-family: Arial, sans-serif;">
                                Schließen
                            </button>
                        </div>
                    </div>
                `;
                
                // Auto close after 3 seconds
                setTimeout(() => {
                    closeFeedbackModal();
                }, 3000);
                
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
            
        } catch (error) {
            console.error('Widget: Feedback submission failed:', error);
            
            // Show error message
            modal.innerHTML = `
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
                        <button onclick="this.closest('#feedback-modal').remove()" 
                                style="padding: 12px 24px; background: #dc3545; color: white; 
                                       border: none; border-radius: 6px; cursor: pointer;
                                       font-family: Arial, sans-serif;">
                            Schließen
                        </button>
                    </div>
                </div>
            `;
            
        } finally {
            isSubmitting = false;
        }
    }
    
    // Initialize widget
    function initWidget() {
        // Check if already initialized
        if (document.getElementById('feedback-widget-button')) {
            console.log('Widget: Already initialized');
            return;
        }
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createFeedbackButton);
        } else {
            createFeedbackButton();
        }
        
        console.log('Widget: Initialized successfully');
    }
    
    // Start the widget
    initWidget();
    
})();
