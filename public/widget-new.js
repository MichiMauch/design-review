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
        // Direkt Screenshot aufnehmen und Annotation öffnen
        createScreenshotAndAnnotate();
    }
    
    // Create selection overlay
    // Auswahl-Overlay wird nicht mehr benötigt
    
    // Remove selection overlay
    function removeSelectionOverlay() {
        if (overlay) {
            overlay.remove();
            overlay = null;
        }
        isSelecting = false;
    }
    
    async function createScreenshotAndAnnotate() {
        try {
            console.log('Widget: Starting screen capture with getDisplayMedia...');
            
            if (overlay) overlay.style.display = 'none';

            const stream = await navigator.mediaDevices.getDisplayMedia({ 
                video: { 
                    mediaSource: 'screen',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                } 
            });
            const track = stream.getVideoTracks()[0];
            const imageCapture = new ImageCapture(track);

            // Wait a bit for the overlay to hide properly
            await new Promise(resolve => setTimeout(resolve, 300));

            const bitmap = await imageCapture.grabFrame();
            track.stop();

            if (overlay) overlay.style.display = 'block';

            const canvas = document.createElement('canvas');
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bitmap, 0, 0);

            const screenshotDataUrl = canvas.toDataURL('image/png');
            console.log('Widget: Screenshot captured successfully via getDisplayMedia.');
            console.log('Screenshot dimensions:', bitmap.width, 'x', bitmap.height);

            let finalScreenshot = screenshotDataUrl;
            if (selectionArea) {
                console.log('Widget: Cropping screenshot to selected area...');
                try {
                    finalScreenshot = await cropScreenshotToSelection(screenshotDataUrl, selectionArea);
                    console.log('Widget: Screenshot cropped successfully');
                } catch (cropError) {
                    console.warn('Widget: Cropping failed, using original screenshot:', cropError);
                    // Fallback: use original screenshot if cropping fails
                    finalScreenshot = screenshotDataUrl;
                }
            }

            showAnnotationInterface(finalScreenshot);

        } catch (error) {
            console.error('Widget: Screen capture failed:', error);
            if (overlay) overlay.style.display = 'block';
            
            // Provide more helpful error messages
            let errorMessage = 'Bildschirmaufnahme wurde abgebrochen oder ist fehlgeschlagen.';
            
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Bildschirmaufnahme wurde verweigert. Bitte erlauben Sie den Zugriff und versuchen Sie es erneut.';
            } else if (error.name === 'NotSupportedError') {
                errorMessage = 'Bildschirmaufnahme wird von Ihrem Browser nicht unterstützt.';
            }
            
            showErrorModal(errorMessage);
        }
    }

    async function cropScreenshotToSelection(screenshotDataUrl, selection) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const dpr = window.devicePixelRatio || 1;
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    console.log('=== CROP DEBUG INFO ===');
                    console.log('Image dimensions:', img.width, 'x', img.height);
                    console.log('Window dimensions:', window.innerWidth, 'x', window.innerHeight);
                    console.log('Outer dimensions:', window.outerWidth, 'x', window.outerHeight);
                    console.log('Screen dimensions:', screen.width, 'x', screen.height);
                    console.log('Device pixel ratio:', dpr);
                    console.log('Selection (viewport):', selection.viewportX, selection.viewportY, selection.width, selection.height);

                    // SMART DETECTION: Figure out what getDisplayMedia actually captured
                    const isFullScreen = img.width >= screen.width * dpr * 0.9; // 90% threshold
                    const isMultiMonitor = img.width > screen.width * dpr;
                    const isBrowserOnly = Math.abs(img.width - window.outerWidth * dpr) < 50;
                    
                    console.log('🔍 Screenshot analysis:', {
                        isFullScreen,
                        isMultiMonitor, 
                        isBrowserOnly,
                        screenWidthDPR: screen.width * dpr,
                        outerWidthDPR: window.outerWidth * dpr,
                        actualScreenshotWidth: img.width
                    });

                    // Calculate browser window position in screenshot
                    let browserOffsetX = 0;
                    let browserOffsetY = 0;
                    
                    if (isFullScreen || isMultiMonitor) {
                        // Screenshot captured entire screen(s), need to find browser position
                        // Browser window could be anywhere on screen
                        browserOffsetX = window.screenX * dpr;
                        browserOffsetY = window.screenY * dpr;
                        
                        console.log('🖥️ Full screen capture detected');
                        console.log('Browser window position on screen:', {
                            screenX: window.screenX,
                            screenY: window.screenY,
                            offsetX: browserOffsetX,
                            offsetY: browserOffsetY
                        });
                    }

                    // Calculate chrome height
                    const chromeHeight = window.outerHeight - window.innerHeight;
                    console.log('Chrome height:', chromeHeight);

                    // INTELLIGENT CROP STRATEGIES based on what was actually captured
                    const strategies = [
                        {
                            name: 'smart_screen_position',
                            cropX: (browserOffsetX + selection.viewportX * dpr),
                            cropY: (browserOffsetY + chromeHeight * dpr + selection.viewportY * dpr)
                        },
                        {
                            name: 'browser_window_relative',
                            cropX: (browserOffsetX + selection.viewportX * dpr),
                            cropY: (browserOffsetY + selection.viewportY * dpr)
                        },
                        {
                            name: 'direct_with_dpr',
                            cropX: selection.viewportX * dpr,
                            cropY: selection.viewportY * dpr
                        },
                        {
                            name: 'proportional_scaling',
                            cropX: selection.viewportX * (img.width / window.innerWidth),
                            cropY: selection.viewportY * (img.height / window.innerHeight)
                        }
                    ];

                    console.log('Crop strategies to try:', strategies);

                    // Start with the smart strategy
                    const primaryStrategy = strategies[0];
                    const cropX = primaryStrategy.cropX;
                    const cropY = primaryStrategy.cropY;
                    const cropWidth = selection.width * dpr;
                    const cropHeight = selection.height * dpr;

                    console.log('Estimated chrome height:', chromeHeight);
                    console.log('Primary crop coordinates (screenshot space):', {
                        strategy: primaryStrategy.name,
                        x: cropX,
                        y: cropY,
                        width: cropWidth,
                        height: cropHeight,
                        scaleFactors: screenshotToWindowScale,
                        adjustment: coordAdjustment
                    });

                    // Ensure crop area is within image bounds with better error handling
                    const safeCropX = Math.max(0, Math.min(cropX, img.width - 1));
                    const safeCropY = Math.max(0, Math.min(cropY, img.height - 1));
                    const safeCropWidth = Math.min(cropWidth, img.width - safeCropX);
                    const safeCropHeight = Math.min(cropHeight, img.height - safeCropY);

                    // Ensure minimum dimensions
                    const finalCropWidth = Math.max(10, safeCropWidth);
                    const finalCropHeight = Math.max(10, safeCropHeight);

                    console.log('Safe crop coordinates:', {
                        x: safeCropX,
                        y: safeCropY,
                        width: finalCropWidth,
                        height: finalCropHeight
                    });

                    if (finalCropWidth <= 10 || finalCropHeight <= 10) {
                        console.warn('Widget: Crop area too small or invalid, using original image');
                        resolve(screenshotDataUrl);
                        return;
                    }

                    // Apply the crop with multiple fallback strategies
                    canvas.width = finalCropWidth;
                    canvas.height = finalCropHeight;
                    
                    let cropSuccess = false;
                    
                    // Try each strategy until one works
                    for (let i = 0; i < strategies.length && !cropSuccess; i++) {
                        const strategy = strategies[i];
                        
                        // Use consistent DPR-corrected dimensions for all strategies
                        let strategyCropWidth = selection.width * dpr;
                        let strategyCropHeight = selection.height * dpr;
                        
                        // Exception for proportional scaling
                        if (strategy.name === 'proportional_scaling') {
                            strategyCropWidth = selection.width * (img.width / window.innerWidth);
                            strategyCropHeight = selection.height * (img.height / window.innerHeight);
                        }
                            
                        const strategyCropX = Math.max(0, Math.min(strategy.cropX, img.width - strategyCropWidth));
                        const strategyCropY = Math.max(0, Math.min(strategy.cropY, img.height - strategyCropHeight));
                        
                        try {
                            console.log(`🔍 Trying strategy ${i + 1}: ${strategy.name}`, {
                                original_selection: { x: selection.viewportX, y: selection.viewportY, w: selection.width, h: selection.height },
                                calculated_crop: { x: strategy.cropX, y: strategy.cropY },
                                safe_crop: { x: strategyCropX, y: strategyCropY, width: strategyCropWidth, height: strategyCropHeight },
                                will_fit: strategyCropX + strategyCropWidth <= img.width && strategyCropY + strategyCropHeight <= img.height
                            });
                            
                            // Ensure canvas is right size
                            canvas.width = strategyCropWidth;
                            canvas.height = strategyCropHeight;
                            
                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                            ctx.drawImage(
                                img,
                                strategyCropX, strategyCropY, strategyCropWidth, strategyCropHeight,
                                0, 0, strategyCropWidth, strategyCropHeight
                            );
                            
                            console.log(`✅ Strategy ${strategy.name} SUCCESS!`);
                            cropSuccess = true;
                            break;
                            
                        } catch (strategyError) {
                            console.warn(`❌ Strategy ${strategy.name} failed:`, strategyError);
                            continue;
                        }
                    }
                    
                    // If all strategies failed, use center crop
                    if (!cropSuccess) {
                        console.warn('All strategies failed, using center crop as final fallback');
                        const centerX = Math.max(0, (img.width - finalCropWidth) / 2);
                        const centerY = Math.max(0, (img.height - finalCropHeight) / 2);
                        
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(
                            img,
                            centerX, centerY, finalCropWidth, finalCropHeight,
                            0, 0, finalCropWidth, finalCropHeight
                        );
                        console.log('Used center crop as final fallback');
                    }

                    console.log('Crop completed successfully');
                    console.log('=== END CROP DEBUG ===');

                    resolve(canvas.toDataURL('image/png'));
                } catch (error) {
                    console.error('Error during screenshot cropping:', error);
                    reject(error);
                }
            };
            img.onerror = (error) => {
                console.error('Could not load screenshot image for cropping:', error);
                reject(new Error('Image loading failed'));
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
        // Vorherige Instanz entfernen, falls noch offen
        const oldModal = document.getElementById('feedback-annotation-modal');
        if (oldModal) oldModal.remove();
        annotationModal = document.createElement('div');
        annotationModal.id = 'feedback-annotation-modal';
        annotationModal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 10001; display: flex; flex-direction: column;">
                <!-- Header -->
                <div style="background: white; padding: 15px 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); z-index: 10002;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0; color: #333; font-family: Arial, sans-serif;">Screenshot markieren und Feedback geben</h3>
                        <button id="annotation-close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">×</button>
                    </div>
                    <!-- Toolbar -->
                    <button id="tool-rectangle" class="annotation-tool active" data-tool="rectangle" style="padding: 8px 16px; border: 2px solid #007bff; background: #007bff; color: white; border-radius: 4px; cursor: pointer; font-family: Arial, sans-serif;">📱 Rechteck</button>
                    <button id="tool-circle" class="annotation-tool" data-tool="circle" style="padding: 8px 16px; border: 2px solid #007bff; background: white; color: #007bff; border-radius: 4px; cursor: pointer; font-family: Arial, sans-serif;">⭕ Kreis</button>
                    <button id="tool-line" class="annotation-tool" data-tool="line" style="padding: 8px 16px; border: 2px solid #007bff; background: white; color: #007bff; border-radius: 4px; cursor: pointer; font-family: Arial, sans-serif;">📏 Linie</button>
                    <div style="border-left: 1px solid #ddd; height: 30px; margin: 0 10px;"></div>
                    <button id="tool-clear" style="padding: 8px 16px; border: 2px solid #dc3545; background: white; color: #dc3545; border-radius: 4px; cursor: pointer; font-family: Arial, sans-serif;">🗑️ Löschen</button>
                </div>
                <!-- Screenshot Container -->
                <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 20px; overflow: auto;">
                    <div id="screenshot-container" style="position: relative; display: inline-block;">
                        <img id="screenshot-image" src="${screenshotDataURL}" style="max-width: 90vw; max-height: 70vh; border: 1px solid #ddd;" />
                        <canvas id="annotation-canvas" style="position: absolute; top: 0; left: 0; cursor: crosshair;"></canvas>
                    </div>
                </div>
                <!-- Footer -->
                <div style="background: white; padding: 20px; box-shadow: 0 -2px 4px rgba(0,0,0,0.1);">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #555; font-family: Arial, sans-serif;">Titel:</label>
                        <input id="annotation-feedback-title" placeholder="Geben Sie einen kurzen Titel ein..." style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-family: Arial, sans-serif; box-sizing: border-box;" />
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #555; font-family: Arial, sans-serif;">Beschreibung:</label>
                        <textarea id="annotation-feedback-text" placeholder="Beschreiben Sie, was Sie in den markierten Bereichen verbessern möchten..." style="width: 100%; height: 80px; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-family: Arial, sans-serif; resize: vertical; box-sizing: border-box;"></textarea>
                    </div>
                    <div style="margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" id="annotation-create-jira" style="margin-right: 8px;" />
                        <label for="annotation-create-jira" style="font-family: Arial, sans-serif; color: #007bff; font-weight: bold; cursor: pointer;">Direkt als JIRA-Task anlegen</label>
                        <span id="jira-status-message" style="margin-left: 10px; color: #28a745; font-size: 14px; display: none;"></span>
                    </div>
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button id="annotation-cancel" style="padding: 12px 24px; border: 1px solid #ddd; background: #f8f9fa; color: #666; border-radius: 6px; cursor: pointer; font-family: Arial, sans-serif;">Abbrechen</button>
                        <button id="annotation-submit" style="padding: 12px 24px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-family: Arial, sans-serif;">📤 Feedback senden</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(annotationModal);
        // Schließen-Button und Cancel-Button korrekt anbinden (vorherige Listener entfernen, falls mehrfach geladen)
        setTimeout(() => {
            const closeBtn = document.getElementById('annotation-close');
            const cancelBtn = document.getElementById('annotation-cancel');
            const submitBtn = document.getElementById('annotation-submit');
            if (closeBtn) closeBtn.onclick = closeAnnotationInterface;
            if (cancelBtn) cancelBtn.onclick = closeAnnotationInterface;
            if (submitBtn) submitBtn.onclick = submitAnnotatedFeedback;
        }, 0);
        // Initialize annotation functionality
        initializeAnnotation();
        console.log('Widget: Annotation interface shown');
    }
    // Initialize annotation functionality
    function initializeAnnotation() {
        const img = document.getElementById('screenshot-image');
        const canvas = document.getElementById('annotation-canvas');
        let isDrawing = false;
        let startX, startY;
        let annotations = [];
        let currentTool = 'rectangle';
        const ctx = canvas.getContext('2d');

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

        function drawShape(x1, y1, x2, y2, tool) {
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            switch (tool) {
                case 'rectangle':
                    ctx.rect(x1, y1, x2 - x1, y2 - y1);
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
    // Ende initializeAnnotation
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
        const title = document.getElementById('annotation-feedback-title').value.trim();
        const description = document.getElementById('annotation-feedback-text').value.trim();
        const createJira = document.getElementById('annotation-create-jira').checked;
        const jiraStatusMessage = document.getElementById('jira-status-message');

        if (!title) {
            alert('Bitte geben Sie einen Titel ein.');
            return;
        }
        if (!description) {
            alert('Bitte geben Sie eine Beschreibung ein.');
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
            // Submit feedback (DB)
            await submitFeedback(title, description, annotatedScreenshot);
            // Optional: JIRA direkt anlegen
            if (createJira) {
                jiraStatusMessage.style.display = 'inline';
                jiraStatusMessage.style.color = '#007bff';
                jiraStatusMessage.textContent = 'JIRA-Task wird erstellt...';
                try {
                    // Verschachtelung von Backticks vermeiden, daher String bauen:
                    var jiraUrl = baseUrl + '/api/jira';
                    var jiraBody = JSON.stringify({
                        project_id: projectId,
                        title: title,
                        description: description,
                        screenshot: annotatedScreenshot,
                        url: window.location.href
                    });
                    const jiraRes = await fetch(jiraUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: jiraBody
                    });
                    if (jiraRes.ok) {
                        jiraStatusMessage.style.color = '#28a745';
                        jiraStatusMessage.textContent = 'JIRA-Task erfolgreich erstellt!';
                    } else {
                        jiraStatusMessage.style.color = '#dc3545';
                        jiraStatusMessage.textContent = 'JIRA-Task konnte nicht erstellt werden.';
                    }
                } catch (jiraErr) {
                    jiraStatusMessage.style.color = '#dc3545';
                    jiraStatusMessage.textContent = 'JIRA-Task Fehler.';
                }
                setTimeout(function() { jiraStatusMessage.style.display = 'none'; }, 4000);
            }
            // Modal nach erfolgreichem Submit schließen
            closeAnnotationInterface();
        } catch (error) {
            console.error('Widget: Failed to create annotated screenshot:', error);
            await submitFeedback(title, description, null);
            closeAnnotationInterface();
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
        errorModal.innerHTML = `<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10001; display: flex; align-items: center; justify-content: center;"><div style="background: white; padding: 40px; border-radius: 12px; max-width: 400px; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,0.2);"><div style="font-size: 48px; margin-bottom: 20px;">⚠️</div><h3 style="margin: 0 0 15px 0; color: #333; font-family: Arial, sans-serif;">Screenshot-Problem</h3><p style="color: #666; margin: 0 0 25px 0; font-family: Arial, sans-serif;">${message}</p><div style="display: flex; gap: 10px; justify-content: center;"><button onclick="this.closest('div').parentElement.remove()" style="padding: 12px 24px; border: 1px solid #ddd; background: #f8f9fa; color: #666; border-radius: 6px; cursor: pointer; font-family: Arial, sans-serif;">Abbrechen</button><button onclick="this.closest('div').parentElement.remove(); window.feedbackWidget.createScreenshotAndAnnotate();" style="padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-family: Arial, sans-serif;">Erneut versuchen</button></div></div></div>`;
        
        document.body.appendChild(errorModal);
    }
    
    async function submitFeedback(title, description, screenshot) {
        if (isSubmitting) return;
        isSubmitting = true;
        
        try {
            const taskData = {
                project_id: projectId,
                title: title,
                description: description,
                screenshot: screenshot,
                url: window.location.href,
                selected_area: selectionArea ? JSON.stringify(selectionArea) : null,
                user_agent: navigator.userAgent,
                timestamp: new Date().toISOString()
            };
            
            console.log('Widget: Submitting new task...');
            
            const response = await fetch(`${baseUrl}/api/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(taskData)
            });
            
            if (response.ok) {
                console.log('Widget: Task submitted successfully');
                showSuccessMessage();
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
            
        } catch (error) {
            console.error('Widget: Task submission failed:', error);
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
        successModal.innerHTML = `<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10001; display: flex; align-items: center; justify-content: center;"><div style="background: white; padding: 40px; border-radius: 12px; max-width: 400px; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,0.2);"><div style="font-size: 48px; margin-bottom: 20px;">✅</div><h3 style="margin: 0 0 15px 0; color: #333; font-family: Arial, sans-serif;">Feedback gesendet!</h3><p style="color: #666; margin: 0 0 25px 0; font-family: Arial, sans-serif;">Vielen Dank für Ihr Feedback. Es wurde erfolgreich übermittelt.</p><button onclick="this.closest('div').parentElement.remove()" style="padding: 12px 24px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-family: Arial, sans-serif;">Schließen</button></div></div>`;
        
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
        errorModal.innerHTML = `<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10001; display: flex; align-items: center; justify-content: center;"><div style="background: white; padding: 40px; border-radius: 12px; max-width: 400px; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,0.2);"><div style="font-size: 48px; margin-bottom: 20px;">❌</div><h3 style="margin: 0 0 15px 0; color: #333; font-family: Arial, sans-serif;">Fehler beim Senden</h3><p style="color: #666; margin: 0 0 25px 0; font-family: Arial, sans-serif;">Das Feedback konnte nicht gesendet werden. Bitte versuchen Sie es später erneut.</p><button onclick="this.closest('div').parentElement.remove()" style="padding: 12px 24px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; font-family: Arial, sans-serif;">Schließen</button></div></div>`;
        
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
