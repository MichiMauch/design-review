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
    let projectConfig = null;
    let jiraConfigModal = null;
    let jiraUsers = [];
    let jiraSprints = [];
    let jiraSwimlanes = [];
    let jiraBoardColumns = [];
    let jiraIssueTypes = [];
    let currentFeedbackData = null;
    let selectedBoardId = null;
    
    // Show toast notification
    function showToast(message, type = 'success', duration = 3000) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 10003;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            max-width: 300px;
            word-wrap: break-word;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        // Set background color based on type
        if (type === 'success') {
            toast.style.backgroundColor = '#28a745';
        } else if (type === 'error') {
            toast.style.backgroundColor = '#dc3545';
        } else if (type === 'warning') {
            toast.style.backgroundColor = '#ffc107';
            toast.style.color = '#212529';
        } else {
            toast.style.backgroundColor = '#007bff';
        }
        
        toast.innerHTML = message;
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto remove
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }
    
    // Create feedback button
    function createFeedbackButton() {
        const button = document.createElement('button');
        button.id = 'feedback-widget-button';
        button.innerHTML = 'Feedback';
        button.style.cssText = `
            position: fixed;
            top: 50%;
            right: -36px; /* Adjusted to make it fully visible after rotation */
            transform: translateY(-50%) rotate(-90deg);
            transform-origin: 100% 50%;
            background: #28a745;
            color: white;
            border: none;
            padding: 10px 16px;
            border-top-left-radius: 8px;
            border-top-right-radius: 8px;
            border-bottom-left-radius: 0;
            border-bottom-right-radius: 0;
            font-family: Arial, sans-serif;
            font-size: 16px;
            cursor: pointer;
            box-shadow: -2px 2px 8px rgba(0,0,0,0.3);
            z-index: 9999;
            transition: all 0.2s ease;
        `;
        
        button.addEventListener('mouseenter', () => {
            button.style.background = '#218838';
            button.style.boxShadow = '-2px 4px 12px rgba(0,0,0,0.4)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.background = '#28a745';
            button.style.boxShadow = '-2px 2px 8px rgba(0,0,0,0.3)';
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
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 10001; display: flex;">
                <!-- Sidebar -->
                <div class="sidebar" style="width: 320px; background: white; display: flex; flex-direction: column; box-shadow: 2px 0 8px rgba(0,0,0,0.2);">
                    <!-- Sidebar Header -->
                    <div style="padding: 16px; border-bottom: 1px solid #e0e0e0;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <h3 style="margin: 0; color: #333; font-family: Arial, sans-serif; font-size: 18px;">Feedback-Tool</h3>
                            <button id="annotation-close" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #666; padding: 4px; border-radius: 3px; transition: background 0.2s;">×</button>
                        </div>
                        <!-- Toolbar -->
                        <div style="margin-bottom: 12px;">
                            <label style="display: block; margin-bottom: 6px; font-weight: bold; color: #555; font-family: Arial, sans-serif; font-size: 13px;">Zeichenwerkzeuge:</label>
                            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                                <button id="tool-rectangle" class="annotation-tool active" data-tool="rectangle" style="padding: 8px 12px; border: 2px solid #007bff; background: #007bff; color: white; border-radius: 4px; cursor: pointer; font-family: Arial, sans-serif; font-size: 12px; transition: all 0.2s;">📱 Rechteck</button>
                                <button id="tool-circle" class="annotation-tool" data-tool="circle" style="padding: 8px 12px; border: 2px solid #007bff; background: white; color: #007bff; border-radius: 4px; cursor: pointer; font-family: Arial, sans-serif; font-size: 12px; transition: all 0.2s;">⭕ Kreis</button>
                                <button id="tool-line" class="annotation-tool" data-tool="line" style="padding: 8px 12px; border: 2px solid #007bff; background: white; color: #007bff; border-radius: 4px; cursor: pointer; font-family: Arial, sans-serif; font-size: 12px; transition: all 0.2s;">📏 Linie</button>
                                <button id="tool-freehand" class="annotation-tool" data-tool="freehand" style="padding: 8px 12px; border: 2px solid #007bff; background: white; color: #007bff; border-radius: 4px; cursor: pointer; font-family: Arial, sans-serif; font-size: 12px; transition: all 0.2s;">✏️ Stift</button>
                                <button id="tool-clear" title="Alles löschen" style="width: 38px; height: 38px; border: 2px solid #dc3545; background: white; color: #dc3545; border-radius: 4px; cursor: pointer; font-size: 16px; transition: all 0.2s; display: flex; align-items: center; justify-content: center; padding: 0;">🗑️</button>
                            </div>
                        </div>
                        <div style="margin-bottom: 12px;">
                            <label style="display: block; margin-bottom: 6px; font-weight: bold; color: #555; font-family: Arial, sans-serif; font-size: 13px;">Farbe:</label>
                            <div style="display: flex; gap: 6px;">
                                <button class="color-tool" data-color="#ff0000" style="width: 24px; height: 24px; border-radius: 50%; background: #ff0000; border: 2px solid #000; cursor: pointer;"></button>
                                <button class="color-tool" data-color="#0000ff" style="width: 24px; height: 24px; border-radius: 50%; background: #0000ff; border: 2px solid #fff; cursor: pointer;"></button>
                                <button class="color-tool" data-color="#00ff00" style="width: 24px; height: 24px; border-radius: 50%; background: #00ff00; border: 2px solid #fff; cursor: pointer;"></button>
                                <button class="color-tool" data-color="#00ff00" style="width: 24px; height: 24px; border-radius: 50%; background: #00ff00; border: 2px solid #fff; cursor: pointer;"></button>
                            </div>
                        </div>
                        <div style="display: flex; gap: 12px; margin-bottom: 12px;">
                            <div>
                                <label style="display: block; margin-bottom: 6px; font-weight: bold; color: #555; font-family: Arial, sans-serif; font-size: 13px;">Farbe:</label>
                                <div style="display: flex; gap: 6px;">
                                    <button class="color-tool" data-color="#ff0000" style="width: 24px; height: 24px; border-radius: 50%; background: #ff0000; border: 2px solid #000; cursor: pointer;"></button>
                                    <button class="color-tool" data-color="#0000ff" style="width: 24px; height: 24px; border-radius: 50%; background: #0000ff; border: 2px solid #fff; cursor: pointer;"></button>
                                    <button class="color-tool" data-color="#00ff00" style="width: 24px; height: 24px; border-radius: 50%; background: #00ff00; border: 2px solid #fff; cursor: pointer;"></button>
                                </div>
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 6px; font-weight: bold; color: #555; font-family: Arial, sans-serif; font-size: 13px;">Liniendicke:</label>
                                <div style="display: flex; gap: 6px;">
                                    <button class="thickness-tool" data-thickness="2" style="width: 24px; height: 24px; border-radius: 50%; background: #ccc; border: 2px solid #000; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 10px;">2</button>
                                    <button class="thickness-tool" data-thickness="4" style="width: 24px; height: 24px; border-radius: 50%; background: #ccc; border: 2px solid #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 10px;">4</button>
                                    <button class="thickness-tool" data-thickness="6" style="width: 24px; height: 24px; border-radius: 50%; background: #ccc; border: 2px solid #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 10px;">6</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Sidebar Content -->
                    <div style="flex: 1; padding: 16px; overflow-y: auto;">
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 6px; font-weight: bold; color: #555; font-family: Arial, sans-serif; font-size: 13px;">Titel:</label>
                            <input id="annotation-feedback-title" placeholder="Kurzer, aussagekräftiger Titel..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-family: Arial, sans-serif; box-sizing: border-box; font-size: 14px;" />
                        </div>
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 6px; font-weight: bold; color: #555; font-family: Arial, sans-serif; font-size: 13px;">Beschreibung:</label>
                            <textarea id="annotation-feedback-text" placeholder="Beschreiben Sie detailliert, was Sie in den markierten Bereichen verbessern möchten..." style="width: 100%; height: 120px; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-family: Arial, sans-serif; resize: vertical; box-sizing: border-box; font-size: 14px;"></textarea>
                        </div>
                        <div style="margin-bottom: 20px; padding: 12px; background: #f8f9fa; border-radius: 6px; border: 1px solid #e9ecef;" id="jira-section">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                <input type="checkbox" id="annotation-create-jira" style="margin: 0;" />
                                <label for="annotation-create-jira" style="font-family: Arial, sans-serif; color: #007bff; font-weight: bold; cursor: pointer; font-size: 14px;">Direkt als JIRA-Task anlegen</label>
                            </div>
                            <span id="jira-status-message" style="color: #28a745; font-size: 12px; display: none;"></span>
                        </div>
                    </div>
                    
                    <!-- Sidebar Footer -->
                    <div style="padding: 16px; border-top: 1px solid #e0e0e0; background: #f8f9fa;">
                        <div style="display: flex; gap: 8px;">
                            <button id="annotation-cancel" style="flex: 1; padding: 12px; border: 1px solid #ddd; background: white; color: #666; border-radius: 6px; cursor: pointer; font-family: Arial, sans-serif; font-size: 14px; transition: all 0.2s;">Abbrechen</button>
                            <button id="annotation-submit" style="flex: 2; padding: 12px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                <span id="submit-text">📤 Feedback senden</span>
                                <div id="submit-spinner" style="display: none; width: 16px; height: 16px; border: 2px solid #ffffff80; border-top: 2px solid #fff; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Screenshot Container (Full Height) -->
                <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 20px; overflow: auto;">
                    <div id="screenshot-container" style="position: relative; display: inline-block;">
                        <img id="screenshot-image" src="${screenshotDataURL}" style="max-width: calc(100vw - 360px); max-height: calc(100vh - 40px); border: 2px solid #007bff; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);" />
                        <canvas id="annotation-canvas" style="position: absolute; top: 0; left: 0; cursor: crosshair;"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- Mobile Toggle Button -->
            <button id="sidebar-toggle" style="display: none; position: absolute; top: 16px; left: 16px; z-index: 10003; background: white; border: 1px solid #ddd; border-radius: 6px; padding: 8px 12px; cursor: pointer; font-family: Arial, sans-serif; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">☰ Tools</button>
            
            <style>
                @media (max-width: 768px) {
                    #feedback-annotation-modal .sidebar { 
                        position: absolute !important; 
                        z-index: 10004 !important; 
                        transform: translateX(-100%) !important; 
                        transition: transform 0.3s ease !important;
                    }
                    #feedback-annotation-modal .sidebar.open { 
                        transform: translateX(0) !important; 
                    }
                    #sidebar-toggle { 
                        display: block !important; 
                    }
                    #screenshot-image { 
                        max-width: calc(100vw - 40px) !important; 
                    }
                }
                
                /* Hover-Effekte */
                #annotation-close:hover { background: #f0f0f0 !important; }
                .annotation-tool:hover { transform: translateY(-1px) !important; box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important; }
                #annotation-cancel:hover { background: #e9ecef !important; }
                #annotation-submit:hover { background: #218838 !important; transform: translateY(-1px) !important; }
            </style>
        `;
        document.body.appendChild(annotationModal);
        // Schließen-Button und Cancel-Button korrekt anbinden (vorherige Listener entfernen, falls mehrfach geladen)
        setTimeout(() => {
            const closeBtn = document.getElementById('annotation-close');
            const cancelBtn = document.getElementById('annotation-cancel');
            const submitBtn = document.getElementById('annotation-submit');
            const jiraSection = document.getElementById('jira-section');
            
            if (closeBtn) closeBtn.onclick = closeAnnotationInterface;
            if (cancelBtn) cancelBtn.onclick = closeAnnotationInterface;
            if (submitBtn) submitBtn.onclick = submitAnnotatedFeedback;
            
            // Mobile Sidebar Toggle
            const sidebarToggle = document.getElementById('sidebar-toggle');
            const sidebar = document.querySelector('.sidebar');
            if (sidebarToggle && sidebar) {
                sidebarToggle.onclick = () => {
                    sidebar.classList.toggle('open');
                    sidebarToggle.textContent = sidebar.classList.contains('open') ? '✕ Schließen' : '☰ Tools';
                };
            }
            
            // JIRA-Checkbox nur anzeigen, wenn JIRA konfiguriert ist
            if (jiraSection) {
                console.log('Widget: Setting JIRA section visibility:', {
                    projectConfig: projectConfig,
                    jiraServerUrl: projectConfig?.jira_server_url,
                    shouldShow: !!projectConfig?.jira_server_url
                });
                jiraSection.style.display = projectConfig?.jira_server_url ? 'block' : 'none';
            }
        }, 0);
        // Initialize annotation functionality
        initializeAnnotation();
        console.log('Widget: Annotation interface shown');
    }
    
    // Show JIRA configuration modal
    function showJiraConfigModal(feedbackData) {
        currentFeedbackData = feedbackData;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('jira-config-modal');
        if (existingModal) existingModal.remove();
        
        jiraConfigModal = document.createElement('div');
        jiraConfigModal.id = 'jira-config-modal';
        jiraConfigModal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10002; display: flex; align-items: center; justify-content: center;">
                <div style="background: white; border-radius: 8px; padding: 20px; max-width: 450px; width: 90%; max-height: 85vh; overflow-y: auto; box-shadow: 0 8px 24px rgba(0,0,0,0.3);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <h4 style="margin: 0; color: #333; font-family: Arial, sans-serif; font-size: 18px;">JIRA-Task konfigurieren</h4>
                        <button id="jira-config-close" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #666; padding: 0; width: 24px; height: 24px;">×</button>
                    </div>
                    
                    <div id="jira-loading" style="text-align: center; padding: 20px;">
                        <div style="display: inline-block; width: 20px; height: 20px; border: 3px solid #f3f3f3; border-top: 3px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                        <p style="margin-top: 10px; color: #666; font-family: Arial, sans-serif;">Lade JIRA-Daten...</p>
                    </div>
                    
                    <div id="jira-form" style="display: none;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                            <div>
                                <label style="display: block; margin-bottom: 4px; font-weight: bold; color: #555; font-family: Arial, sans-serif; font-size: 12px;">Issue-Typ:</label>
                                <select id="jira-issue-type" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-family: Arial, sans-serif; box-sizing: border-box; font-size: 14px;">
                                    <option value="">Issue-Typ...</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 4px; font-weight: bold; color: #555; font-family: Arial, sans-serif; font-size: 12px;">Zuständig:</label>
                                <select id="jira-assignee" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-family: Arial, sans-serif; box-sizing: border-box; font-size: 14px;">
                                    <option value="">Nicht zugewiesen</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 4px; font-weight: bold; color: #555; font-family: Arial, sans-serif; font-size: 12px;">Sprint:</label>
                                <select id="jira-sprint" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-family: Arial, sans-serif; box-sizing: border-box; font-size: 14px;">
                                    <option value="">Kein Sprint</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 4px; font-weight: bold; color: #555; font-family: Arial, sans-serif; font-size: 12px;">Board-Spalte:</label>
                                <select id="jira-column" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-family: Arial, sans-serif; box-sizing: border-box; font-size: 14px;">
                                    <option value="">Standard (To Do)</option>
                                </select>
                            </div>
                            <div style="grid-column: span 2;">
                                <label style="display: block; margin-bottom: 4px; font-weight: bold; color: #555; font-family: Arial, sans-serif; font-size: 12px;">Labels:</label>
                                <input id="jira-labels" placeholder="bug, frontend, ui (durch Komma getrennt)" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-family: Arial, sans-serif; box-sizing: border-box; font-size: 14px;" />
                            </div>
                        </div>
                        
                        <div style="display: flex; gap: 8px; justify-content: flex-end;">
                            <button id="jira-config-cancel" style="padding: 8px 16px; border: 1px solid #ddd; background: #f8f9fa; color: #666; border-radius: 4px; cursor: pointer; font-family: Arial, sans-serif; font-size: 13px;">Abbrechen</button>
                            <button id="jira-config-create" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-family: Arial, sans-serif; display: flex; align-items: center; gap: 6px; font-size: 13px;">
                                <span id="jira-create-text">JIRA-Task erstellen</span>
                                <div id="jira-create-spinner" style="display: none; width: 14px; height: 14px; border: 2px solid #ffffff40; border-top: 2px solid #ffffff; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
        
        document.body.appendChild(jiraConfigModal);
        
        // Event listeners
        setTimeout(() => {
            const closeBtn = document.getElementById('jira-config-close');
            const cancelBtn = document.getElementById('jira-config-cancel');
            const createBtn = document.getElementById('jira-config-create');
            
            if (closeBtn) closeBtn.onclick = closeJiraConfigModal;
            if (cancelBtn) cancelBtn.onclick = closeJiraConfigModal;
            if (createBtn) createBtn.onclick = createJiraTaskFromModal;
        }, 0);
        
        // Load JIRA data
        loadJiraData();
    }
    
    // Close JIRA configuration modal
    function closeJiraConfigModal() {
        if (jiraConfigModal) {
            jiraConfigModal.remove();
            jiraConfigModal = null;
        }
        currentFeedbackData = null;
    }
    
    // Load JIRA data (users, sprints, issue types)
    async function loadJiraData() {
        try {
            console.log('Widget: Loading JIRA data...');
            
            // Load users
            const usersResponse = await fetch(`${baseUrl}/api/jira`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'getUsers',
                    jiraConfig: {
                        serverUrl: projectConfig.jira_server_url,
                        username: projectConfig.jira_username,
                        apiToken: projectConfig.jira_api_token,
                        projectKey: projectConfig.jira_project_key
                    }
                })
            });
            
            if (usersResponse.ok) {
                const usersResult = await usersResponse.json();
                if (usersResult.success) {
                    jiraUsers = usersResult.data || [];
                    console.log('Widget: Loaded JIRA users:', jiraUsers.length);
                }
            }
            
            // Load boards first, then sprints
            const boardsResponse = await fetch(`${baseUrl}/api/jira`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'getBoards',
                    jiraConfig: {
                        serverUrl: projectConfig.jira_server_url,
                        username: projectConfig.jira_username,
                        apiToken: projectConfig.jira_api_token,
                        projectKey: projectConfig.jira_project_key
                    }
                })
            });
            
            if (boardsResponse.ok) {
                const boardsResult = await boardsResponse.json();
                console.log('Widget: Boards result:', boardsResult);
                
                if (boardsResult.success && boardsResult.data && boardsResult.data.length > 0) {
                    selectedBoardId = boardsResult.data[0].id; // Use first board
                    console.log('Widget: Using board ID:', selectedBoardId);
                    
                    // Now load sprints for this board
                    const sprintsResponse = await fetch(`${baseUrl}/api/jira`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'getSprints',
                            jiraConfig: {
                                serverUrl: projectConfig.jira_server_url,
                                username: projectConfig.jira_username,
                                apiToken: projectConfig.jira_api_token,
                                projectKey: projectConfig.jira_project_key
                            },
                            boardId: selectedBoardId
                        })
                    });
                    
                    if (sprintsResponse.ok) {
                        const sprintsResult = await sprintsResponse.json();
                        if (sprintsResult.success) {
                            jiraSprints = sprintsResult.data || [];
                            console.log('Widget: Loaded JIRA sprints:', jiraSprints.length);
                        }
                    }
                    
                    // Load board columns for this board
                    const columnsResponse = await fetch(`${baseUrl}/api/jira`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'getBoardColumns',
                            jiraConfig: {
                                serverUrl: projectConfig.jira_server_url,
                                username: projectConfig.jira_username,
                                apiToken: projectConfig.jira_api_token,
                                projectKey: projectConfig.jira_project_key
                            },
                            boardId: selectedBoardId
                        })
                    });
                    
                    if (columnsResponse.ok) {
                        const columnsResult = await columnsResponse.json();
                        if (columnsResult.success) {
                            jiraBoardColumns = columnsResult.data || [];
                            console.log('Widget: Loaded JIRA board columns:', jiraBoardColumns.length);
                        }
                    }
                }
            }
            
            // Set default issue types
            jiraIssueTypes = [
                { id: 'Bug', name: 'Bug' },
                { id: 'Task', name: 'Task' },
                { id: 'Story', name: 'Story' },
                { id: 'Improvement', name: 'Improvement' }
            ];
            
            // Populate form
            populateJiraForm();
            
        } catch (error) {
            console.error('Widget: Failed to load JIRA data:', error);
            // Show form anyway with limited options
            populateJiraForm();
        }
    }
    
    // Populate JIRA form with loaded data
    function populateJiraForm() {
        const loadingDiv = document.getElementById('jira-loading');
        const formDiv = document.getElementById('jira-form');
        
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (formDiv) formDiv.style.display = 'block';
        
        // Populate issue types
        const issueTypeSelect = document.getElementById('jira-issue-type');
        if (issueTypeSelect) {
            jiraIssueTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type.id;
                option.textContent = type.name;
                if (type.id === 'Bug') option.selected = true; // Default to Bug
                issueTypeSelect.appendChild(option);
            });
        }
        
        // Populate users
        const assigneeSelect = document.getElementById('jira-assignee');
        if (assigneeSelect) {
            jiraUsers.forEach(user => {
                const option = document.createElement('option');
                option.value = user.accountId || user.name;
                option.textContent = `${user.displayName} (${user.emailAddress || user.name})`;
                if (user.emailAddress === projectConfig.jira_username) {
                    option.selected = true; // Default to current user
                }
                assigneeSelect.appendChild(option);
            });
        }
        
        // Populate sprints
        const sprintSelect = document.getElementById('jira-sprint');
        if (sprintSelect) {
            jiraSprints.forEach(sprint => {
                const option = document.createElement('option');
                option.value = sprint.id;
                option.textContent = sprint.name;
                if (sprint.state === 'active') option.selected = true; // Default to active sprint
                sprintSelect.appendChild(option);
            });
        }
        
        // Populate board columns
        const columnSelect = document.getElementById('jira-column');
        if (columnSelect) {
            jiraBoardColumns.forEach(column => {
                const option = document.createElement('option');
                option.value = column.statusId || column.id;
                option.textContent = column.name;
                // Default to first column (usually "To Do")
                if (column.statusCategory === 'new') option.selected = true;
                columnSelect.appendChild(option);
            });
        }
        
        console.log('Widget: JIRA form populated');
    }
    
    // Create JIRA task from modal
    async function createJiraTaskFromModal() {
        const createBtn = document.getElementById('jira-config-create');
        const buttonText = document.getElementById('jira-create-text');
        const spinner = document.getElementById('jira-create-spinner');
        
        // Show spinner and disable button
        if (createBtn) createBtn.disabled = true;
        if (buttonText) buttonText.textContent = 'Erstelle Task...';
        if (spinner) spinner.style.display = 'block';
        
        try {
            // Get form values (no title/description anymore)
            const issueType = document.getElementById('jira-issue-type')?.value || 'Bug';
            const assignee = document.getElementById('jira-assignee')?.value || '';
            const sprint = document.getElementById('jira-sprint')?.value || '';
            const column = document.getElementById('jira-column')?.value || '';
            const labelsInput = document.getElementById('jira-labels')?.value || '';
            
            // Parse labels
            const labels = labelsInput.split(',').map(label => label.trim()).filter(label => label);
            
            console.log('Widget: Creating JIRA task with config:', {
                title: currentFeedbackData.title,
                description: currentFeedbackData.description,
                issueType, assignee, sprint, column, labels
            });
            
            // Create JIRA payload
            const jiraPayload = {
                action: 'createTicket',
                feedback: {
                    title: currentFeedbackData.title,
                    description: currentFeedbackData.description,
                    screenshot: currentFeedbackData.screenshot,
                    url: currentFeedbackData.url
                },
                jiraConfig: {
                    serverUrl: projectConfig.jira_server_url,
                    username: projectConfig.jira_username,
                    apiToken: projectConfig.jira_api_token,
                    projectKey: projectConfig.jira_project_key,
                    issueType: issueType,
                    defaultAssignee: assignee,
                    defaultLabels: labels,
                    selectedSprint: sprint,
                    selectedBoardId: selectedBoardId,
                    selectedColumn: column
                }
            };
            
            console.log('Widget: Sending JIRA payload:', jiraPayload);
            
            const jiraRes = await fetch(`${baseUrl}/api/jira`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(jiraPayload)
            });
            
            console.log('Widget: JIRA response status:', jiraRes.status);
            
            const jiraResult = await jiraRes.json();
            console.log('Widget: JIRA response:', jiraResult);
            
            if (jiraRes.ok && jiraResult.success) {
                // Success - show toast notification with JIRA link
                if (jiraResult.ticket && jiraResult.ticket.key) {
                    const jiraKey = jiraResult.ticket.key;
                    const jiraUrl = jiraResult.ticket.url;
                    showToast(`✅ JIRA-Task erstellt: <a href="${jiraUrl}" target="_blank" style="color: #fff; text-decoration: underline; font-weight: bold;">${jiraKey}</a>`, 'success', 6000);
                } else {
                    showToast('✅ JIRA-Task erfolgreich erstellt!', 'success', 4000);
                }
                
                // Close modals
                closeJiraConfigModal();
                closeAnnotationInterface();
                
            } else {
                // Error
                throw new Error(jiraResult.error || 'Unbekannter Fehler');
            }
            
        } catch (error) {
            console.error('Widget: JIRA task creation failed:', error);
            
            // Show error message
            const errorMessage = document.createElement('div');
            errorMessage.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #dc3545;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                z-index: 10003;
                font-family: Arial, sans-serif;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            `;
            errorMessage.textContent = `❌ JIRA-Task konnte nicht erstellt werden: ${error.message}`;
            document.body.appendChild(errorMessage);
            
            // Remove error message after 5 seconds
            setTimeout(() => {
                errorMessage.remove();
            }, 5000);
            
        } finally {
            // Re-enable button and hide spinner
            if (createBtn) createBtn.disabled = false;
            if (buttonText) buttonText.textContent = 'JIRA-Task erstellen';
            if (spinner) spinner.style.display = 'none';
        }
    }
    
    // Initialize annotation functionality
    function initializeAnnotation() {
        const img = document.getElementById('screenshot-image');
        const canvas = document.getElementById('annotation-canvas');
        let isDrawing = false;
        let startX, startY;
        let annotations = [];
        let currentPath = [];
        let currentTool = 'rectangle';
        let currentColor = '#ff0000';
        let currentThickness = 3;
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

        // Color selection
        document.querySelectorAll('.color-tool').forEach(btn => {
            btn.addEventListener('click', (e) => {
                currentColor = e.target.dataset.color;
                // Update active color
                document.querySelectorAll('.color-tool').forEach(b => {
                    b.style.border = '2px solid #fff';
                });
                e.target.style.border = '2px solid #000';
            });
        });

        // Thickness selection
        document.querySelectorAll('.thickness-tool').forEach(btn => {
            btn.addEventListener('click', (e) => {
                currentThickness = parseInt(e.target.dataset.thickness);
                // Update active thickness
                document.querySelectorAll('.thickness-tool').forEach(b => {
                    b.style.border = '2px solid #fff';
                });
                e.target.style.border = '2px solid #000';
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
            if (currentTool === 'freehand') {
                currentPath = [{x: startX, y: startY}];
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!isDrawing) return;
            const rect = canvas.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;
            if (currentTool === 'freehand') {
                currentPath.push({x: currentX, y: currentY});
            }
            redrawAnnotations();
            if (currentTool === 'freehand') {
                drawFreehand(currentPath, currentColor);
            } else {
                drawShape(startX, startY, currentX, currentY, currentTool, currentColor);
            }
        });

        canvas.addEventListener('mouseup', (e) => {
            if (!isDrawing) return;
            const rect = canvas.getBoundingClientRect();
            const endX = e.clientX - rect.left;
            const endY = e.clientY - rect.top;
            // Save annotation
            if (currentTool === 'freehand') {
                annotations.push({
                    tool: 'freehand',
                    color: currentColor,
                    thickness: currentThickness,
                    path: currentPath
                });
            } else {
                annotations.push({
                    tool: currentTool,
                    color: currentColor,
                    thickness: currentThickness,
                    startX: startX,
                    startY: startY,
                    endX: endX,
                    endY: endY
                });
            }
            redrawAnnotations();
            isDrawing = false;
        });

        function drawShape(x1, y1, x2, y2, tool, color, thickness) {
            ctx.strokeStyle = color || '#ff0000';
            ctx.lineWidth = thickness || 3;
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

        function drawFreehand(path, color, thickness) {
            ctx.strokeStyle = color || '#ff0000';
            ctx.lineWidth = thickness || 3;
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            for (let i = 1; i < path.length; i++) {
                ctx.lineTo(path[i].x, path[i].y);
            }
            ctx.stroke();
        }

        // Redraw all annotations
        function redrawAnnotations() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            annotations.forEach(annotation => {
                if (annotation.tool === 'freehand') {
                    drawFreehand(annotation.path, annotation.color, annotation.thickness);
                } else {
                    drawShape(annotation.startX, annotation.startY, annotation.endX, annotation.endY, annotation.tool, annotation.color, annotation.thickness);
                }
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
                color: currentColor,
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
        const submitBtn = document.getElementById('annotation-submit');
        const submitText = document.getElementById('submit-text');
        const submitSpinner = document.getElementById('submit-spinner');

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

        // Show spinner and disable button
        submitBtn.disabled = true;
        submitText.style.display = 'none';
        submitSpinner.style.display = 'block';

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
            
            // Optional: JIRA-Konfiguration-Modal anzeigen
            if (createJira && projectConfig?.jira_server_url) {
                const feedbackData = {
                    title: title,
                    description: description,
                    screenshot: annotatedScreenshot,
                    url: window.location.href
                };
                
                // Show JIRA configuration modal
                showJiraConfigModal(feedbackData);
            } else if (createJira && !projectConfig?.jira_server_url) {
                jiraStatusMessage.style.display = 'inline';
                jiraStatusMessage.style.color = '#ffc107';
                jiraStatusMessage.textContent = 'JIRA ist nicht konfiguriert.';
                setTimeout(function() { jiraStatusMessage.style.display = 'none'; }, 8000);
                
                // Close annotation interface
                closeAnnotationInterface();
            } else {
                // No JIRA - just close annotation interface
                closeAnnotationInterface();
            }
        } catch (error) {
            console.error('Widget: Failed to create annotated screenshot:', error);
            await submitFeedback(title, description, null);
            closeAnnotationInterface();
        } finally {
            // Hide spinner and re-enable button
            submitBtn.disabled = false;
            submitText.style.display = 'inline';
            submitSpinner.style.display = 'none';
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
    
    async function loadProjectConfig() {
        try {
            console.log('Widget: Loading project config for project ID:', projectId);
            // Try to load by name first (for backward compatibility)
            const response = await fetch(`${baseUrl}/api/projects/by-name/${encodeURIComponent(projectId)}`);
            console.log('Widget: Project config response status:', response.status);
            if (response.ok) {
                projectConfig = await response.json();
                console.log('Widget: Project config loaded:', projectConfig);
                console.log('Widget: JIRA enabled:', !!projectConfig?.jira_server_url);
            } else {
                console.error('Widget: Failed to load project config, status:', response.status);
            }
        } catch (error) {
            console.error('Widget: Failed to load project config:', error);
        }
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
                showToast('Feedback erfolgreich in der Datenbank gespeichert!', 'success', 2000);
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
    async function initWidget() {
        if (document.getElementById('feedback-widget-button')) {
            console.log('Widget: Already initialized');
            return;
        }
        
        // Load project configuration first
        await loadProjectConfig();
        
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
