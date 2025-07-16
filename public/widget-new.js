// Modern Feedback Widget with Screenshot Annotation using html-to-image
(function() {
    'use strict';
    
    console.log('Widget: Loading modern feedback widget with html-to-image');
    
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
            // Use clientX/clientY since we're taking viewport screenshots
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
                    // Use viewport-relative coordinates and add scroll offset
                    const left = Math.min(e.clientX, startX);
                    const top = Math.min(e.clientY, startY);
                    
                    // Add scroll offset to get absolute coordinates from page top
                    const scrollElement = document.scrollingElement || document.documentElement;
                    const scrollX = scrollElement.scrollLeft;
                    const scrollY = scrollElement.scrollTop;
                    const absoluteX = left + scrollX;
                    const absoluteY = top + scrollY;
                    
                    // Ensure coordinates are within bounds
                    const clampedLeft = Math.max(0, absoluteX);
                    const clampedTop = Math.max(0, absoluteY);
                    const clampedWidth = Math.min(width, window.innerWidth - left);
                    const clampedHeight = Math.min(height, window.innerHeight - top);
                    
                    selectionArea = {
                        x: clampedLeft,
                        y: clampedTop,
                        width: clampedWidth,
                        height: clampedHeight,
                        // Store viewport coordinates too for debugging
                        viewportX: left,
                        viewportY: top
                    };
                    
                    console.log('=== SELECTION DEBUG ===');
                    console.log('Widget: Area selected (viewport coordinates):', {x: left, y: top, width, height});
                    console.log('Widget: Area selected (absolute coordinates):', selectionArea);
                    console.log('Widget: Viewport size:', window.innerWidth, 'x', window.innerHeight);
                    console.log('Widget: Scroll position:', scrollX, 'x', scrollY);
                    console.log('=== END SELECTION DEBUG ===');
                    
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
        overlay.tabIndex = -1;
        overlay.style.outline = 'none';
        overlay.style.userSelect = 'none';
        overlay.style.pointerEvents = 'auto';
        setTimeout(() => overlay.focus(), 0); // Fokus nach Einfügen setzen
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
            console.log('=== SCREENSHOT DEBUG START ===');
            console.log('Widget: Creating client-side screenshot for annotation...');
            console.log('Selection area:', selectionArea);
            console.log('Current viewport:', {
                width: window.innerWidth,
                height: window.innerHeight
            });
            console.log('Current scroll position (window):', { x: window.scrollX, y: window.scrollY });
            const scrollElement = document.scrollingElement || document.documentElement;
            console.log('Current scroll position (scrollingElement):', { x: scrollElement.scrollLeft, y: scrollElement.scrollTop });
            console.log('Document dimensions (documentElement):', {
                width: document.documentElement.scrollWidth,
                height: document.documentElement.scrollHeight
            });
            console.log('Document dimensions (body):', {
                width: document.body.scrollWidth,
                height: document.body.scrollHeight
            });
            
            // Show loading modal
            showLoadingModal();
            

            // Import html-to-image dynamisch
            const { toPng } = await import('https://unpkg.com/html-to-image@1.11.11/es/index.js');
            console.log('Widget: html-to-image loaded successfully');
            // Warte kurz, damit Animationen abgeschlossen sind
            await new Promise(resolve => setTimeout(resolve, 100));

            // Screenshot von der gesamten Seite machen
            console.log('Widget: Taking screenshot of the entire page...');
            // Temporär Feedback-Overlays ausblenden
            const overlays = document.querySelectorAll('[id*="feedback"], [id*="annotation"]');
            const prevDisplay = [];
            overlays.forEach(el => {
                prevDisplay.push(el.style.display);
                el.style.display = 'none';
            });

            // Screenshot von der gesamten Seite machen
            const screenshotDataUrl = await toPng(document.documentElement, {
                quality: 0.9,
                pixelRatio: 2, // Using a pixelRatio for better quality on high-res screens
                backgroundColor: '#ffffff'
            });

            // Overlays wieder einblenden
            overlays.forEach((el, i) => {
                el.style.display = prevDisplay[i];
            });

            console.log('Widget: Screenshot captured successfully, data URL length:', screenshotDataUrl.length);
            
            // Crop screenshot to selected area if we have one
            let finalScreenshot = screenshotDataUrl;
            if (selectionArea) {
                console.log('Widget: Cropping screenshot to selected area...');
                finalScreenshot = await cropScreenshotToSelection(screenshotDataUrl, selectionArea);
                console.log('Widget: Screenshot cropped successfully');
            }
            
            // Close loading modal and show annotation interface
            closeLoadingModal();
            showAnnotationInterface(finalScreenshot);
            
            console.log('=== SCREENSHOT DEBUG END ===');
            
        } catch (error) {
            console.error('Widget: Client-side screenshot creation failed:', error);
            closeLoadingModal();
            
            // Show error and fallback to placeholder
            showErrorModal('Screenshot konnte nicht erstellt werden. Sie können trotzdem Feedback hinterlassen.');
        }
    }
    
    // Crop screenshot to selected area using canvas
    async function cropScreenshotToSelection(screenshotDataUrl, selectionArea) {
        return new Promise((resolve) => {
            console.log('=== CROP DEBUG START ===');
            console.log('Cropping with selection area:', selectionArea);
            
            const img = new Image();
            img.onload = () => {
                console.log('Original image dimensions:', {
                    width: img.width,
                    height: img.height
                });
                
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calculate scale factors based on the body size
                const scaleX = img.width / document.body.scrollWidth;
                const scaleY = img.height / document.body.scrollHeight;
                
                console.log('Scale factors:', { scaleX, scaleY });
                
                // Verwenden Sie die absoluten Koordinaten für den Zuschnitt
                const cropX = selectionArea.x * scaleX;
                const cropY = selectionArea.y * scaleY;
                const cropWidth = selectionArea.width * scaleX;
                const cropHeight = selectionArea.height * scaleY;
                
                console.log('Using ABSOLUTE coordinates for cropping:');
                console.log('Absolute coords:', {
                    x: selectionArea.x,
                    y: selectionArea.y,
                    width: selectionArea.width,
                    height: selectionArea.height
                });
                console.log('Crop coordinates (in image space):', {
                    x: cropX,
                    y: cropY,
                    width: cropWidth,
                    height: cropHeight
                });
                
                // Ensure crop coordinates are within image bounds
                const finalCropX = Math.max(0, Math.min(cropX, img.width));
                const finalCropY = Math.max(0, Math.min(cropY, img.height));
                const finalCropWidth = Math.min(cropWidth, img.width - finalCropX);
                const finalCropHeight = Math.min(cropHeight, img.height - finalCropY);
                
                console.log('Final bounded crop coordinates:', {
                    x: finalCropX,
                    y: finalCropY,
                    width: finalCropWidth,
                    height: finalCropHeight
                });
                
                // Set canvas size to the selected area
                canvas.width = finalCropWidth;
                canvas.height = finalCropHeight;
                
                // Draw the cropped portion of the image
                ctx.drawImage(
                    img,
                    finalCropX, finalCropY, finalCropWidth, finalCropHeight, // Source area
                    0, 0, finalCropWidth, finalCropHeight // Destination area
                );
                
                const croppedDataUrl = canvas.toDataURL('image/png', 0.9);
                console.log('Cropped image data URL length:', croppedDataUrl.length);
                console.log('=== CROP DEBUG END ===');
                
                resolve(croppedDataUrl);
            };
            img.src = screenshotDataUrl;
        });
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
            drawShape(startX, startY, currentX, currentY, currentTool);
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
    
    // Create client-side placeholder when screenshot fails
    function createClientPlaceholder() {
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');
        
        // Create a simple placeholder
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(50, 50, canvas.width - 100, canvas.height - 100);
        
        ctx.fillStyle = '#64748b';
        ctx.font = '24px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Screenshot nicht verfügbar', canvas.width / 2, canvas.height / 2 - 20);
        
        ctx.font = '16px Arial, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Sie können trotzdem Feedback hinterlassen', canvas.width / 2, canvas.height / 2 + 20);
        
        return canvas.toDataURL('image/png');
    }
    
    // Show error modal with custom message
    function showErrorModal(message) {
        const errorModal = document.createElement('div');
        errorModal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                        background: rgba(0,0,0,0.5); z-index: 10001; 
                        display: flex; align-items: center; justify-content: center;">
                <div style="background: white; padding: 40px; border-radius: 12px; 
                            max-width: 400px; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,0.2);">
                    <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                    <h3 style="margin: 0 0 15px 0; color: #333; font-family: Arial, sans-serif;">
                        Screenshot-Problem
                    </h3>
                    <p style="color: #666; margin: 0 0 25px 0; font-family: Arial, sans-serif;">
                        ${message}
                    </p>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button onclick="this.closest('div').parentElement.remove()" 
                                style="padding: 12px 24px; border: 1px solid #ddd; background: #f8f9fa; 
                                       color: #666; border-radius: 6px; cursor: pointer;
                                       font-family: Arial, sans-serif;">
                            Abbrechen
                        </button>
                        <button onclick="this.closest('div').parentElement.remove(); 
                                         window.feedbackWidget.createScreenshotAndAnnotate();" 
                                style="padding: 12px 24px; background: #007bff; color: white; 
                                       border: none; border-radius: 6px; cursor: pointer;
                                       font-family: Arial, sans-serif;">
                            Erneut versuchen
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(errorModal);
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
    
    // Start the widget and expose global reference for error modal
    window.feedbackWidget = {
        createScreenshotAndAnnotate: createScreenshotAndAnnotate
    };
    
    initWidget();
    
})();
