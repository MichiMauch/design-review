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
                    // Use viewport-relative coordinates
                    const left = Math.min(e.clientX, startX);
                    const top = Math.min(e.clientY, startY);

                    // Store both viewport and page coordinates for better debugging
                    const scrollX = window.scrollX || window.pageXOffset;
                    const scrollY = window.scrollY || window.pageYOffset;

                    selectionArea = {
                        // Viewport coordinates (relative to visible area)
                        viewportX: left,
                        viewportY: top,
                        width: width,
                        height: height,
                        // Page coordinates (absolute from document top)
                        pageX: left + scrollX,
                        pageY: top + scrollY,
                        // Additional context for debugging
                        scroll: { x: scrollX, y: scrollY },
                        viewport: { width: window.innerWidth, height: window.innerHeight },
                        screen: { width: window.screen.width, height: window.screen.height },
                        devicePixelRatio: window.devicePixelRatio || 1
                    };
                    
                    console.log('=== SELECTION DEBUG ===');
                    console.log('Selection area (all coordinates):', selectionArea);
                    console.log('Browser info:', {
                        innerWidth: window.innerWidth,
                        innerHeight: window.innerHeight,
                        outerWidth: window.outerWidth,
                        outerHeight: window.outerHeight,
                        scrollX: scrollX,
                        scrollY: scrollY,
                        devicePixelRatio: window.devicePixelRatio
                    });
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
                    console.log('Device pixel ratio:', dpr);
                    console.log('Selection (viewport):', selection.viewportX, selection.viewportY, selection.width, selection.height);

                    // CRITICAL: Calculate the scaling factor between screenshot and actual window
                    const screenshotToWindowScale = {
                        x: img.width / window.innerWidth,
                        y: img.height / window.innerHeight
                    };
                    
                    console.log('Screenshot to window scale factors:', screenshotToWindowScale);
                    
                    // If screenshot is smaller than window, we need to adjust our coordinates
                    let coordAdjustment = { x: 0, y: 0 };
                    
                    if (img.width < window.innerWidth || img.height < window.innerHeight) {
                        console.log('⚠️  Screenshot is smaller than window - adjusting coordinates');
                        
                        // Calculate the offset - screenshot might be centered or positioned differently
                        coordAdjustment.x = Math.max(0, (window.outerWidth - img.width) / 2);
                        coordAdjustment.y = Math.max(0, (window.outerHeight - img.height) / 2);
                        
                        console.log('Coordinate adjustment needed:', coordAdjustment);
                    }

                    // Calculate browser chrome height with multiple detection methods
                    const methods = {
                        // Method 1: Standard calculation
                        standard: window.outerHeight - window.innerHeight,
                        
                        // Method 2: Based on actual screenshot size
                        screenshot_based: Math.max(0, window.outerHeight - img.height),
                        
                        // Method 3: Conservative estimate
                        conservative: Math.max(window.outerHeight - window.innerHeight, 80),
                        
                        // Method 4: Minimal for cases where screenshot captures differently
                        minimal: img.height < window.innerHeight ? 0 : window.outerHeight - window.innerHeight
                    };

                    // Choose the most appropriate chrome height based on screenshot dimensions
                    let chromeHeight;
                    if (img.height < window.innerHeight) {
                        // Screenshot doesn't include full browser chrome
                        chromeHeight = methods.minimal;
                        console.log('Using minimal chrome height (screenshot excludes chrome)');
                    } else {
                        chromeHeight = methods.standard;
                        console.log('Using standard chrome height calculation');
                    }

                    console.log('Chrome height detection methods:', methods);
                    console.log('Selected chrome height:', chromeHeight);

                    // SIMPLE FIX: Try direct 1:1 mapping first but with DPR correction
                    const strategies = [
                        {
                            name: 'direct_with_dpr',
                            cropX: selection.viewportX * dpr,
                            cropY: selection.viewportY * dpr
                        },
                        {
                            name: 'direct_1to1_mapping',
                            cropX: selection.viewportX,
                            cropY: selection.viewportY
                        },
                        {
                            name: 'scaled_proportional',
                            cropX: selection.viewportX * screenshotToWindowScale.x,
                            cropY: selection.viewportY * screenshotToWindowScale.y
                        },
                        {
                            name: 'center_based_estimation',
                            cropX: selection.viewportX * (img.width / window.innerWidth),
                            cropY: selection.viewportY * (img.height / window.innerHeight)
                        }
                    ];

                    console.log('Crop strategies to try:', strategies);

                    // Start with the first strategy (direct 1:1)
                    const primaryStrategy = strategies[0];
                    const cropX = primaryStrategy.cropX;
                    const cropY = primaryStrategy.cropY;
                    const cropWidth = selection.width;
                    const cropHeight = selection.height;

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
                        
                        // Use different crop dimensions for different strategies
                        let strategyCropWidth, strategyCropHeight;
                        
                        if (strategy.name === 'direct_1to1_mapping') {
                            strategyCropWidth = selection.width;
                            strategyCropHeight = selection.height;
                        } else if (strategy.name === 'direct_with_dpr') {
                            strategyCropWidth = selection.width * dpr;
                            strategyCropHeight = selection.height * dpr;
                        } else {
                            strategyCropWidth = selection.width * screenshotToWindowScale.x;
                            strategyCropHeight = selection.height * screenshotToWindowScale.y;
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
