// SIMPLE Feedback Widget - No Complex Cropping
(function() {
    'use strict';
    
    console.log('Widget: Loading SIMPLE feedback widget');
    
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
    let selectionArea = null;
    
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
    
    // Start feedback process - Two options
    function startFeedbackProcess() {
        if (isSelecting) return;
        
        showFeedbackOptionsModal();
    }
    
    // Show options: With or without screenshot
    function showFeedbackOptionsModal() {
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                        background: rgba(0,0,0,0.5); z-index: 10001; 
                        display: flex; align-items: center; justify-content: center;">
                <div style="background: white; padding: 40px; border-radius: 12px; 
                            max-width: 500px; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,0.2);">
                    <h3 style="margin: 0 0 20px 0; color: #333; font-family: Arial, sans-serif;">
                        Wie möchten Sie Feedback geben?
                    </h3>
                    
                    <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 30px;">
                        <button id="feedback-with-screenshot" style="padding: 20px; border: 2px solid #007bff; 
                                background: #007bff; color: white; border-radius: 8px; cursor: pointer;
                                font-family: Arial, sans-serif; min-width: 180px;">
                            📸 Mit Screenshot<br>
                            <small style="opacity: 0.9;">Ganzer Bildschirm + Markierungen</small>
                        </button>
                        
                        <button id="feedback-text-only" style="padding: 20px; border: 2px solid #28a745; 
                                background: #28a745; color: white; border-radius: 8px; cursor: pointer;
                                font-family: Arial, sans-serif; min-width: 180px;">
                            ✍️ Nur Text<br>
                            <small style="opacity: 0.9;">Schnelles Textfeedback</small>
                        </button>
                    </div>
                    
                    <button onclick="this.closest('div').parentElement.remove()" 
                            style="padding: 10px 20px; border: 1px solid #ddd; background: #f8f9fa; 
                                   color: #666; border-radius: 6px; cursor: pointer;
                                   font-family: Arial, sans-serif;">
                        Abbrechen
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners
        document.getElementById('feedback-with-screenshot').addEventListener('click', () => {
            modal.remove();
            takeSimpleScreenshot();
        });
        
        document.getElementById('feedback-text-only').addEventListener('click', () => {
            modal.remove();
            showTextOnlyFeedback();
        });
    }
    
    // Text-only feedback (simple and fast)
    function showTextOnlyFeedback() {
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                        background: rgba(0,0,0,0.5); z-index: 10001; 
                        display: flex; align-items: center; justify-content: center;">
                <div style="background: white; padding: 40px; border-radius: 12px; 
                            max-width: 600px; width: 90%; box-shadow: 0 8px 24px rgba(0,0,0,0.2);">
                    <h3 style="margin: 0 0 20px 0; color: #333; font-family: Arial, sans-serif;">
                        📝 Feedback zur Seite
                    </h3>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: bold; 
                                      color: #555; font-family: Arial, sans-serif;">
                            Ihr Feedback:
                        </label>
                        <textarea id="text-feedback" 
                                  placeholder="Beschreiben Sie, was verbessert werden sollte..."
                                  style="width: 100%; height: 120px; padding: 15px; border: 1px solid #ddd; 
                                         border-radius: 6px; font-family: Arial, sans-serif; resize: vertical;
                                         box-sizing: border-box;"></textarea>
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button onclick="this.closest('div').parentElement.remove()" 
                                style="padding: 12px 24px; border: 1px solid #ddd; background: #f8f9fa; 
                                       color: #666; border-radius: 6px; cursor: pointer;
                                       font-family: Arial, sans-serif;">
                            Abbrechen
                        </button>
                        <button id="submit-text-feedback" style="padding: 12px 24px; background: #28a745; 
                                color: white; border: none; border-radius: 6px; cursor: pointer;
                                font-family: Arial, sans-serif;">
                            📤 Feedback senden
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('submit-text-feedback').addEventListener('click', () => {
            const feedbackText = document.getElementById('text-feedback').value.trim();
            if (!feedbackText) {
                alert('Bitte geben Sie Ihr Feedback ein.');
                return;
            }
            
            modal.remove();
            submitFeedback(feedbackText, null);
        });
        
        // Focus textarea
        setTimeout(() => document.getElementById('text-feedback').focus(), 100);
    }
    
    // Take screenshot - USE FULL SCREENSHOT, let user annotate
    async function takeSimpleScreenshot() {
        try {
            console.log('Widget: Taking screenshot...');
            
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const track = stream.getVideoTracks()[0];
            const imageCapture = new ImageCapture(track);

            await new Promise(resolve => setTimeout(resolve, 300));

            const bitmap = await imageCapture.grabFrame();
            track.stop();

            const canvas = document.createElement('canvas');
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bitmap, 0, 0);

            const screenshotDataUrl = canvas.toDataURL('image/png');
            console.log('Widget: Screenshot captured successfully');
            
            // Show annotation interface with FULL screenshot
            showAnnotationInterface(screenshotDataUrl);

        } catch (error) {
            console.error('Widget: Screenshot failed:', error);
            
            let errorMessage = 'Bildschirmaufnahme fehlgeschlagen.';
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Bildschirmaufnahme wurde verweigert. Bitte erlauben Sie den Zugriff.';
            }
            
            showErrorModal(errorMessage);
        }
    }
    
    // Show annotation interface - SIMPLE VERSION
    function showAnnotationInterface(screenshotDataURL) {
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                        background: rgba(0,0,0,0.9); z-index: 10001; 
                        display: flex; flex-direction: column;">
                
                <!-- Header -->
                <div style="background: white; padding: 15px 20px; 
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1); z-index: 10002;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0; color: #333; font-family: Arial, sans-serif;">
                            Screenshot markieren und Feedback geben
                        </h3>
                        <button id="annotation-close" style="background: none; border: none; 
                                font-size: 24px; cursor: pointer; color: #666;">×</button>
                    </div>
                    
                    <div style="margin-top: 10px; color: #666; font-family: Arial, sans-serif;">
                        💡 <strong>Einfacher Ansatz:</strong> Verwenden Sie die Zeichen-Tools, um wichtige Bereiche zu markieren
                    </div>
                </div>
                
                <!-- Screenshot Container -->
                <div style="flex: 1; display: flex; align-items: center; justify-content: center; 
                            padding: 20px; overflow: auto;">
                    <div id="screenshot-container" style="position: relative; display: inline-block;">
                        <img id="screenshot-image" src="${screenshotDataURL}" 
                             style="max-width: 90vw; max-height: 60vh; border: 1px solid #ddd;" />
                        <canvas id="annotation-canvas" 
                                style="position: absolute; top: 0; left: 0; cursor: crosshair;"></canvas>
                    </div>
                </div>
                
                <!-- Toolbar -->
                <div style="background: white; padding: 15px 20px; border-top: 1px solid #ddd;">
                    <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 15px;">
                        <button id="tool-rectangle" class="annotation-tool active" data-tool="rectangle"
                                style="padding: 8px 16px; border: 2px solid #007bff; background: #007bff; 
                                       color: white; border-radius: 4px; cursor: pointer; font-family: Arial, sans-serif;">
                            📱 Rechteck
                        </button>
                        <button id="tool-circle" class="annotation-tool" data-tool="circle"
                                style="padding: 8px 16px; border: 2px solid #007bff; background: white; 
                                       color: #007bff; border-radius: 4px; cursor: pointer; font-family: Arial, sans-serif;">
                            ⭕ Kreis
                        </button>
                        <div style="border-left: 1px solid #ddd; height: 30px; margin: 0 10px;"></div>
                        <button id="tool-clear" style="padding: 8px 16px; border: 2px solid #dc3545; 
                                background: white; color: #dc3545; border-radius: 4px; cursor: pointer; 
                                font-family: Arial, sans-serif;">
                            🗑️ Löschen
                        </button>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="background: white; padding: 20px; 
                            box-shadow: 0 -2px 4px rgba(0,0,0,0.1);">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: bold; 
                                      color: #555; font-family: Arial, sans-serif;">
                            Beschreiben Sie Ihr Feedback:
                        </label>
                        <textarea id="annotation-feedback-text" 
                                  placeholder="Beschreiben Sie, was Sie in den markierten Bereichen verbessern möchten..."
                                  style="width: 100%; height: 80px; padding: 12px; border: 1px solid #ddd; 
                                         border-radius: 6px; font-family: Arial, sans-serif; resize: vertical;
                                         box-sizing: border-box;"></textarea>
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button id="annotation-cancel" style="padding: 12px 24px; border: 1px solid #ddd; 
                                background: #f8f9fa; color: #666; border-radius: 6px; cursor: pointer;
                                font-family: Arial, sans-serif;">
                            Abbrechen
                        </button>
                        <button id="annotation-submit" style="padding: 12px 24px; background: #28a745; 
                                color: white; border: none; border-radius: 6px; cursor: pointer;
                                font-family: Arial, sans-serif;">
                            📤 Feedback senden
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Initialize simple annotation
        initializeSimpleAnnotation();
        
        // Event listeners
        document.getElementById('annotation-close').addEventListener('click', () => modal.remove());
        document.getElementById('annotation-cancel').addEventListener('click', () => modal.remove());
        document.getElementById('annotation-submit').addEventListener('click', () => {
            const feedbackText = document.getElementById('annotation-feedback-text').value.trim();
            if (!feedbackText) {
                alert('Bitte geben Sie Ihr Feedback ein.');
                return;
            }
            
            // Create final annotated screenshot
            createFinalAnnotatedScreenshot().then(annotatedScreenshot => {
                modal.remove();
                submitFeedback(feedbackText, annotatedScreenshot);
            });
        });
        
        console.log('Widget: Annotation interface shown');
    }
    
    // Simple annotation system
    function initializeSimpleAnnotation() {
        const img = document.getElementById('screenshot-image');
        const canvas = document.getElementById('annotation-canvas');
        const ctx = canvas.getContext('2d');
        
        let currentTool = 'rectangle';
        let isDrawing = false;
        let startX, startY;
        let annotations = [];
        
        // Wait for image to load
        img.onload = () => {
            canvas.width = img.offsetWidth;
            canvas.height = img.offsetHeight;
            redrawAnnotations();
        };
        
        if (img.complete) {
            canvas.width = img.offsetWidth;
            canvas.height = img.offsetHeight;
            redrawAnnotations();
        }
        
        // Tool selection
        document.querySelectorAll('.annotation-tool').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.annotation-tool').forEach(b => {
                    b.style.background = 'white';
                    b.style.color = '#007bff';
                });
                e.target.style.background = '#007bff';
                e.target.style.color = 'white';
                
                currentTool = e.target.dataset.tool;
            });
        });
        
        // Clear annotations
        document.getElementById('tool-clear').addEventListener('click', () => {
            annotations = [];
            redrawAnnotations();
        });
        
        // Drawing events
        canvas.addEventListener('mousedown', (e) => {
            const rect = canvas.getBoundingClientRect();
            startX = e.clientX - rect.left;
            startY = e.clientY - rect.top;
            isDrawing = true;
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (!isDrawing) return;
            
            const rect = canvas.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;
            
            redrawAnnotations();
            drawShape(startX, startY, currentX, currentY, currentTool);
        });
        
        canvas.addEventListener('mouseup', (e) => {
            if (!isDrawing) return;
            
            const rect = canvas.getBoundingClientRect();
            const endX = e.clientX - rect.left;
            const endY = e.clientY - rect.top;
            
            annotations.push({
                tool: currentTool,
                startX: startX,
                startY: startY,
                endX: endX,
                endY: endY
            });
            
            redrawAnnotations();
            isDrawing = false;
        });
        
        function drawShape(x1, y1, x2, y2, tool) {
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            
            switch (tool) {
                case 'rectangle':
                    const width = x2 - x1;
                    const height = y2 - y1;
                    ctx.rect(x1, y1, width, height);
                    break;
                
                case 'circle':
                    const centerX = (x1 + x2) / 2;
                    const centerY = (y1 + y2) / 2;
                    const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) / 2;
                    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                    break;
            }
            
            ctx.stroke();
        }
        
        function redrawAnnotations() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            annotations.forEach(annotation => {
                drawShape(annotation.startX, annotation.startY, annotation.endX, annotation.endY, annotation.tool);
            });
        }
        
        // Store annotations for later use
        window.currentAnnotations = annotations;
    }
    
    // Create final annotated screenshot
    async function createFinalAnnotatedScreenshot() {
        const img = document.getElementById('screenshot-image');
        const canvas = document.getElementById('annotation-canvas');
        
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = img.naturalWidth;
        finalCanvas.height = img.naturalHeight;
        const finalCtx = finalCanvas.getContext('2d');
        
        // Draw original image
        finalCtx.drawImage(img, 0, 0);
        
        // Scale and draw annotations
        const scaleX = img.naturalWidth / img.offsetWidth;
        const scaleY = img.naturalHeight / img.offsetHeight;
        
        finalCtx.drawImage(canvas, 0, 0, canvas.width * scaleX, canvas.height * scaleY);
        
        return finalCanvas.toDataURL('image/jpeg', 0.9);
    }
    
    // Show error modal
    function showErrorModal(message) {
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                        background: rgba(0,0,0,0.5); z-index: 10001; 
                        display: flex; align-items: center; justify-content: center;">
                <div style="background: white; padding: 40px; border-radius: 12px; 
                            max-width: 400px; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,0.2);">
                    <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                    <h3 style="margin: 0 0 15px 0; color: #333; font-family: Arial, sans-serif;">
                        Problem
                    </h3>
                    <p style="color: #666; margin: 0 0 25px 0; font-family: Arial, sans-serif;">
                        ${message}
                    </p>
                    <button onclick="this.closest('div').parentElement.remove()" 
                            style="padding: 12px 24px; background: #007bff; color: white; 
                                   border: none; border-radius: 6px; cursor: pointer;
                                   font-family: Arial, sans-serif;">
                        OK
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    // Submit feedback
    async function submitFeedback(feedbackText, screenshot) {
        if (isSubmitting) return;
        isSubmitting = true;
        
        try {
            const feedbackData = {
                project_id: projectId,
                url: window.location.href,
                text: feedbackText,
                screenshot: screenshot,
                selected_area: selectionArea ? JSON.stringify(selectionArea) : null,
                user_agent: navigator.userAgent,
                timestamp: new Date().toISOString()
            };
            
            console.log('Widget: Submitting feedback...');
            
            const response = await fetch(`${baseUrl}/api/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(feedbackData)
            });
            
            if (response.ok) {
                console.log('Widget: Feedback submitted successfully');
                showSuccessMessage();
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
            
        } catch (error) {
            console.error('Widget: Feedback submission failed:', error);
            showErrorMessage();
        } finally {
            isSubmitting = false;
        }
    }
    
    // Show success message
    function showSuccessMessage() {
        const modal = document.createElement('div');
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
                    <button onclick="this.closest('div').parentElement.remove()" 
                            style="padding: 12px 24px; background: #28a745; color: white; 
                                   border: none; border-radius: 6px; cursor: pointer;
                                   font-family: Arial, sans-serif;">
                        Schließen
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        setTimeout(() => {
            if (modal.parentElement) modal.remove();
        }, 3000);
    }
    
    // Show error message
    function showErrorMessage() {
        const modal = document.createElement('div');
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
                    <button onclick="this.closest('div').parentElement.remove()" 
                            style="padding: 12px 24px; background: #dc3545; color: white; 
                                   border: none; border-radius: 6px; cursor: pointer;
                                   font-family: Arial, sans-serif;">
                        Schließen
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
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
    
    // Start the widget
    initWidget();
    
})();
