// Modern Feedback Widget with Screenshot Annotation
(function() {
    'use strict';
    
    console.log('Widget: Loading modern feedback widget with annotation');
    
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
    let annotationModal = null;
    
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
                    createScreenshotAndAnnotate();
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
    
    // Create screenshot and show annotation interface
    async function createScreenshotAndAnnotate() {
        try {
            console.log('Widget: Creating screenshot for annotation...');
            
            // Show loading modal
            showLoadingModal();
            
            // Use our own backend to create screenshot
            const screenshotUrl = `${baseUrl}/api/screenshot`;
            
            console.log('Widget: Requesting screenshot from:', screenshotUrl);
            
            const response = await fetch(screenshotUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: window.location.href,
                    width: 1920,
                    height: 1080,
                    quality: 90
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Screenshot API returned ${response.status}: ${errorText}`);
            }
            
            const result = await response.json();
            
            if (!result.success || !result.screenshot) {
                throw new Error('Screenshot API did not return valid data');
            }
            
            console.log('Widget: Screenshot created successfully, showing annotation interface');
            
            // Close loading modal and show annotation interface
            closeLoadingModal();
            showAnnotationInterface(result.screenshot);
            
        } catch (error) {
            console.error('Widget: Screenshot creation failed:', error);
            closeLoadingModal();
            showFeedbackModal(null); // Show feedback modal without screenshot
        }
    }
    
    // Show loading modal
    function showLoadingModal() {
        const loadingModal = document.createElement('div');
        loadingModal.id = 'feedback-loading-modal';
        loadingModal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                        background: rgba(0,0,0,0.5); z-index: 10001; 
                        display: flex; align-items: center; justify-content: center;">
                <div style="background: white; padding: 40px; border-radius: 12px; 
                            text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,0.2);">
                    <div style="font-size: 32px; margin-bottom: 20px;">📸</div>
                    <h3 style="margin: 0 0 15px 0; color: #333; font-family: Arial, sans-serif;">
                        Screenshot wird erstellt...
                    </h3>
                    <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; 
                                border-top: 4px solid #007bff; border-radius: 50%; 
                                animation: spin 1s linear infinite; margin: 0 auto;"></div>
                    <style>
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    </style>
                </div>
            </div>
        `;
        document.body.appendChild(loadingModal);
    }
    
    // Close loading modal
    function closeLoadingModal() {
        const loadingModal = document.getElementById('feedback-loading-modal');
        if (loadingModal) {
            loadingModal.remove();
        }
    }
    
    // Show annotation interface
    function showAnnotationInterface(screenshotDataURL) {
        annotationModal = document.createElement('div');
        annotationModal.id = 'feedback-annotation-modal';
        annotationModal.innerHTML = `
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
                    
                    <!-- Toolbar -->
                    <div style="margin-top: 15px; display: flex; gap: 10px; align-items: center;">
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
                        <button id="tool-line" class="annotation-tool" data-tool="line"
                                style="padding: 8px 16px; border: 2px solid #007bff; background: white; 
                                       color: #007bff; border-radius: 4px; cursor: pointer; font-family: Arial, sans-serif;">
                            📏 Linie
                        </button>
                        <div style="border-left: 1px solid #ddd; height: 30px; margin: 0 10px;"></div>
                        <button id="tool-clear" style="padding: 8px 16px; border: 2px solid #dc3545; 
                                background: white; color: #dc3545; border-radius: 4px; cursor: pointer; 
                                font-family: Arial, sans-serif;">
                            🗑️ Löschen
                        </button>
                    </div>
                </div>
                
                <!-- Screenshot Container -->
                <div style="flex: 1; display: flex; align-items: center; justify-content: center; 
                            padding: 20px; overflow: auto;">
                    <div id="screenshot-container" style="position: relative; display: inline-block;">
                        <img id="screenshot-image" src="${screenshotDataURL}" 
                             style="max-width: 90vw; max-height: 70vh; border: 1px solid #ddd;" />
                        <canvas id="annotation-canvas" 
                                style="position: absolute; top: 0; left: 0; cursor: crosshair;"></canvas>
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
        
        document.body.appendChild(annotationModal);
        
        // Initialize annotation functionality
        initializeAnnotation();
        
        console.log('Widget: Annotation interface shown');
    }
    
    // Initialize annotation functionality
    function initializeAnnotation() {
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
        
        // If image is already loaded
        if (img.complete) {
            canvas.width = img.offsetWidth;
            canvas.height = img.offsetHeight;
            redrawAnnotations();
        }
        
        // Tool selection
        document.querySelectorAll('.annotation-tool').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Update active tool
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
            drawShape(startX, startY, currentX, currentY, currentTool, true);
        });
        
        canvas.addEventListener('mouseup', (e) => {
            if (!isDrawing) return;
            
            const rect = canvas.getBoundingClientRect();
            const endX = e.clientX - rect.left;
            const endY = e.clientY - rect.top;
            
            // Save annotation
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
        
        // Event listeners for buttons
        document.getElementById('annotation-close').addEventListener('click', closeAnnotationInterface);
        document.getElementById('annotation-cancel').addEventListener('click', closeAnnotationInterface);
        document.getElementById('annotation-submit').addEventListener('click', submitAnnotatedFeedback);
        
        // Draw shape function
        function drawShape(x1, y1, x2, y2, tool, isPreview = false) {
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
                
                case 'line':
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    break;
            }
            
            ctx.stroke();
        }
        
        // Redraw all annotations
        function redrawAnnotations() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            annotations.forEach(annotation => {
                drawShape(annotation.startX, annotation.startY, annotation.endX, annotation.endY, annotation.tool);
            });
        }
    }
    
    // Close annotation interface
    function closeAnnotationInterface() {
        if (annotationModal) {
            annotationModal.remove();
            annotationModal = null;
        }
        selectionArea = null;
    }
    
    // Submit annotated feedback
    async function submitAnnotatedFeedback() {
        const feedbackText = document.getElementById('annotation-feedback-text').value.trim();
        if (!feedbackText) {
            alert('Bitte geben Sie Ihr Feedback ein.');
            return;
        }
        
        try {
            // Get annotated screenshot
            const img = document.getElementById('screenshot-image');
            const canvas = document.getElementById('annotation-canvas');
            
            // Create final combined image
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
            
            const annotatedScreenshot = finalCanvas.toDataURL('image/jpeg', 0.9);
            
            // Submit feedback
            await submitFeedback(feedbackText, annotatedScreenshot);
            
        } catch (error) {
            console.error('Widget: Failed to create annotated screenshot:', error);
            await submitFeedback(feedbackText, null);
        }
    }
    
    // Show simple feedback modal (fallback)
    function showFeedbackModal(screenshot = null) {
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
        
        document.body.appendChild(modal);
        
        // Event listeners
        document.getElementById('feedback-cancel').addEventListener('click', () => {
            modal.remove();
            modal = null;
        });
        
        document.getElementById('feedback-submit').addEventListener('click', () => {
            const text = document.getElementById('feedback-text').value.trim();
            if (text) {
                submitFeedback(text, screenshot);
            } else {
                alert('Bitte geben Sie Ihr Feedback ein.');
            }
        });
    }
    
    // Submit feedback function
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
        closeAnnotationInterface();
        if (modal) modal.remove();
        
        const successModal = document.createElement('div');
        successModal.innerHTML = `
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
        
        document.body.appendChild(successModal);
        
        setTimeout(() => {
            if (successModal.parentElement) {
                successModal.remove();
            }
        }, 3000);
    }
    
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
    
    // Start the widget
    initWidget();
    
})();
