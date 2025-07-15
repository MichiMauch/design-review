// Feedback Widget with Real DOM Screenshots using dom-to-image
(function() {
    'use strict';
    
    console.log('Widget: Loading DOM screenshot feedback widget');
    
    // Load dom-to-image library
    let domtoimage = null;
    
    // Configuration
    const script = document.currentScript || document.querySelector('script[data-project-id]');
    const projectId = script?.getAttribute('data-project-id') || 'default-project';
    
    // Auto-detect baseUrl: if script is loaded from localhost, use localhost, otherwise use production
    let baseUrl = 'http://localhost:3000'; // Default for local development
    if (script?.src) {
        const scriptUrl = new URL(script.src);
        if (scriptUrl.hostname === 'localhost' || scriptUrl.hostname === '127.0.0.1') {
            baseUrl = `${scriptUrl.protocol}//${scriptUrl.hostname}:${scriptUrl.port}`;
        } else {
            // External deployment - we need to find the correct production URL
            // For now, let's try to use the same origin as the script
            baseUrl = scriptUrl.origin;
        }
    }
    
    console.log('Widget: Configuration loaded', { projectId, baseUrl });
    
    // State variables
    let isSelecting = false;
    let isSubmitting = false;
    let overlay = null;
    let modal = null;
    let currentHighlightedElement = null;
    let currentSelectionData = null;
    
    // Load screenshot libraries dynamically
    function loadScreenshotLibraries() {
        return new Promise((resolve, reject) => {
            // Load the hybrid screenshot classes
            const script = document.createElement('script');
            script.src = `${baseUrl}/screenshot-classes.js`;
            script.onload = () => {
                console.log('Widget: Hybrid screenshot classes loaded');
                resolve();
            };
            script.onerror = () => {
                console.error('Widget: Failed to load screenshot classes');
                // Fallback to original dom-to-image
                loadDomToImage().then(resolve).catch(reject);
            };
            document.head.appendChild(script);
        });
    }

    // Fallback: Load dom-to-image library dynamically
    function loadDomToImage() {
        return new Promise((resolve, reject) => {
            if (window.domtoimage) {
                domtoimage = window.domtoimage;
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/dom-to-image-more@2.8.0/dist/dom-to-image-more.min.js';
            script.onload = () => {
                domtoimage = window.domtoimage;
                console.log('Widget: dom-to-image loaded');
                resolve();
            };
            script.onerror = () => {
                console.error('Widget: Failed to load dom-to-image');
                reject(new Error('Failed to load dom-to-image'));
            };
            document.head.appendChild(script);
        });
    }
    
    // Initialize widget
    async function init() {
        console.log('Widget: Initializing');
        
        try {
            await loadScreenshotLibraries();
        } catch (error) {
            console.error('Widget: Failed to load screenshot libraries:', error);
        }
        
        // Ensure DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createFeedbackButton);
        } else {
            createFeedbackButton();
        }
        
        // Send ping to confirm widget installation
        sendWidgetPing();
    }
    
    // Send widget ping to server
    function sendWidgetPing() {
        // Skip ping to avoid CORS errors during development
        if (baseUrl.includes('localhost')) {
            console.log('Widget: Skipping ping for localhost');
            return;
        }
        
        fetch(`${baseUrl}/api/projects/${encodeURIComponent(projectId)}/widget-ping`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: window.location.href,
                timestamp: new Date().toISOString()
            })
        }).catch(err => {
            console.warn('Widget: Failed to send ping (non-critical):', err);
        });
    }
    
    // Create feedback button
    function createFeedbackButton() {
        // Remove existing button if any
        const existingButton = document.getElementById('feedback-widget-button');
        if (existingButton) {
            existingButton.remove();
        }
        
        const button = document.createElement('button');
        button.id = 'feedback-widget-button';
        button.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>Feedback</span>
        `;
        button.style.cssText = `
            position: fixed;
            right: 20px;
            top: 50%;
            transform: translateY(-50%);
            z-index: 100000;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 25px;
            padding: 12px 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
        `;
        
        button.addEventListener('mouseenter', () => {
            button.style.background = '#1d4ed8';
            button.style.transform = 'translateY(-50%) scale(1.05)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.background = '#2563eb';
            button.style.transform = 'translateY(-50%) scale(1)';
        });
        
        button.addEventListener('click', startNewSelectionMode);
        
        document.body.appendChild(button);
        console.log('Widget: Feedback button created');
    }
    
    // Start new hybrid selection mode
    async function startNewSelectionMode() {
        console.log('Widget: Starting new hybrid selection mode');
        
        if (isSelecting) return;
        
        // Hide feedback button
        const button = document.getElementById('feedback-widget-button');
        if (button) {
            button.style.display = 'none';
        }
        
        isSelecting = true;
        
        // Use HybridScreenshot if available, otherwise fallback to old system
        if (window.HybridScreenshot) {
            try {
                const hybridScreenshot = new window.HybridScreenshot();
                const screenshotData = await hybridScreenshot.selectAndCaptureArea();
                
                // Check if user cancelled
                if (screenshotData === null) {
                    console.log('Widget: User cancelled screenshot selection');
                    // Reset state and show button again
                    isSelecting = false;
                    const button = document.getElementById('feedback-widget-button');
                    if (button) {
                        button.style.display = 'flex';
                    }
                    return;
                }
                
                // Set selection data for the modal
                currentSelectionData = {
                    type: 'area',
                    selectedArea: hybridScreenshot.selectedArea,
                    element: null,
                    selector: null
                };
                
                console.log('Widget: Screenshot created successfully, showing modal');
                
                // Show modal directly with screenshot
                showFeedbackModalDirect(screenshotData);
                
            } catch (error) {
                console.error('Widget: Hybrid screenshot failed:', error);
                // Reset and fallback to old system
                isSelecting = false;
                const button = document.getElementById('feedback-widget-button');
                if (button) {
                    button.style.display = 'flex';
                }
                startOldSelectionMode();
            }
        } else {
            console.warn('Widget: HybridScreenshot not available, using old system');
            startOldSelectionMode();
        }
    }
    
    // Old selection mode as fallback
    function startOldSelectionMode() {
        console.log('Widget: Starting old selection mode');
        showElementSelectionOverlay();
    }
    
    // Show element selection overlay
    function showElementSelectionOverlay() {
        console.log('Widget: Showing element selection overlay');
        
        // Create overlay
        overlay = document.createElement('div');
        overlay.id = 'feedback-selection-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(37, 99, 235, 0.1);
            z-index: 99999;
            cursor: crosshair;
            pointer-events: auto;
        `;
        
        // Add instruction banner
        const banner = document.createElement('div');
        banner.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #1f2937;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 100001;
            pointer-events: none;
        `;
        banner.textContent = '�� Klicken Sie auf ein Element oder ziehen Sie einen Bereich für einen echten Screenshot. ESC zum Abbrechen.';
        
        document.body.appendChild(overlay);
        document.body.appendChild(banner);
        
        setTimeout(() => {
            if (banner.parentNode) {
                banner.remove();
            }
        }, 5000);
        
        setupOverlayEvents();
    }
    
    // Setup overlay events
    function setupOverlayEvents() {
        if (!overlay) return;
        
        let isDragging = false;
        let dragStart = null;
        let dragRect = null;
        
        // Mouse move handler for highlighting elements
        function handleMouseMove(e) {
            if (isDragging) return;
            
            // Temporarily disable pointer events on overlay to detect element below
            overlay.style.pointerEvents = 'none';
            const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
            overlay.style.pointerEvents = 'auto';
            
            if (elementBelow && elementBelow !== overlay && !elementBelow.closest('#feedback-selection-overlay')) {
                highlightElement(elementBelow);
            }
        }
        
        // Mouse down handler for starting drag
        function handleMouseDown(e) {
            e.preventDefault();
            isDragging = true;
            dragStart = { x: e.clientX, y: e.clientY };
            
            // Create drag rectangle
            dragRect = document.createElement('div');
            dragRect.style.cssText = `
                position: fixed;
                border: 2px solid #2563eb;
                background: rgba(37, 99, 235, 0.1);
                pointer-events: none;
                z-index: 100000;
            `;
            document.body.appendChild(dragRect);
        }
        
        // Mouse move handler for dragging
        function handleDragMove(e) {
            if (!isDragging || !dragRect || !dragStart) return;
            
            const rect = {
                left: Math.min(dragStart.x, e.clientX),
                top: Math.min(dragStart.y, e.clientY),
                width: Math.abs(e.clientX - dragStart.x),
                height: Math.abs(e.clientY - dragStart.y)
            };
            
            dragRect.style.left = rect.left + 'px';
            dragRect.style.top = rect.top + 'px';
            dragRect.style.width = rect.width + 'px';
            dragRect.style.height = rect.height + 'px';
        }
        
        // Mouse up handler for ending drag or clicking
        function handleMouseUp(e) {
            if (isDragging && dragRect && dragStart) {
                // Area selection
                const rect = {
                    x: Math.min(dragStart.x, e.clientX),
                    y: Math.min(dragStart.y, e.clientY),
                    width: Math.abs(e.clientX - dragStart.x),
                    height: Math.abs(e.clientY - dragStart.y)
                };
                
                if (rect.width > 10 && rect.height > 10) {
                    selectArea(rect);
                } else {
                    // Click selection - get element under cursor
                    overlay.style.pointerEvents = 'none';
                    const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
                    overlay.style.pointerEvents = 'auto';
                    
                    if (elementBelow && elementBelow !== overlay) {
                        selectElement(elementBelow);
                    }
                }
            }
            
            // Cleanup drag state
            isDragging = false;
            dragStart = null;
            if (dragRect) {
                dragRect.remove();
                dragRect = null;
            }
        }
        
        // Attach event listeners
        overlay.addEventListener('mousemove', (e) => {
            if (isDragging) {
                handleDragMove(e);
            } else {
                handleMouseMove(e);
            }
        });
        
        overlay.addEventListener('mousedown', handleMouseDown);
        overlay.addEventListener('mouseup', handleMouseUp);
        
        // ESC key handler
        function handleEscapeKey(e) {
            if (e.key === 'Escape') {
                console.log('Widget: ESC pressed, canceling selection');
                resetWidget();
            }
        }
        
        document.addEventListener('keydown', handleEscapeKey);
        
        // Store escape handler for cleanup
        overlay._escapeHandler = handleEscapeKey;
    }
    
    // Highlight element on hover
    function highlightElement(element) {
        // Remove previous highlight
        if (currentHighlightedElement) {
            currentHighlightedElement.style.outline = '';
            currentHighlightedElement.style.outlineOffset = '';
        }
        
        // Add highlight to new element
        if (element) {
            element.style.outline = '2px solid #2563eb';
            element.style.outlineOffset = '2px';
            currentHighlightedElement = element;
        }
    }
    
    // Remove element highlight
    function removeHighlight() {
        if (currentHighlightedElement) {
            currentHighlightedElement.style.outline = '';
            currentHighlightedElement.style.outlineOffset = '';
            currentHighlightedElement = null;
        }
    }
    
    // Select specific element
    function selectElement(element) {
        console.log('Widget: Element selected', element);
        
        const rect = element.getBoundingClientRect();
        const selector = generateSelector(element);
        
        currentSelectionData = {
            type: 'element',
            element: element,
            selector: selector,
            selectedArea: {
                x: rect.left + window.scrollX,
                y: rect.top + window.scrollY,
                width: rect.width,
                height: rect.height
            }
        };
        
        showFeedbackModal();
    }
    
    // Select area
    function selectArea(rect) {
        console.log('Widget: Area selected', rect);
        
        currentSelectionData = {
            type: 'area',
            selectedArea: {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
            }
        };
        
        showFeedbackModal();
    }
    
    // Generate CSS selector for element
    function generateSelector(element) {
        if (element.id) {
            return '#' + element.id;
        }
        
        if (element.className) {
            const classes = element.className.trim().split(/\s+/);
            if (classes.length > 0) {
                return element.tagName.toLowerCase() + '.' + classes.join('.');
            }
        }
        
        // Fallback to tag name with nth-child
        const parent = element.parentElement;
        if (parent) {
            const siblings = Array.from(parent.children);
            const index = siblings.indexOf(element) + 1;
            return element.tagName.toLowerCase() + ':nth-child(' + index + ')';
        }
        
        return element.tagName.toLowerCase();
    }
    
    // Create screenshot using area selection
    async function createRealScreenshot() {
        console.log('Widget: Creating screenshot with area selection');
        
        try {
            // Use HybridScreenshot for area selection if available
            if (window.HybridScreenshot) {
                const hybridScreenshot = new window.HybridScreenshot();
                
                // Always use area selection
                return await hybridScreenshot.selectAndCaptureArea();
            } else {
                console.warn('Widget: HybridScreenshot not available, using fallback');
                // Fallback to original dom-to-image implementation
                return await createOriginalScreenshot();
            }
        } catch (error) {
            console.error('Widget: Area selection screenshot failed:', error);
            // Fallback to original implementation
            return await createOriginalScreenshot();
        }
    }

    // Original screenshot implementation as fallback
    async function createOriginalScreenshot() {
        if (!domtoimage) {
            console.error('Widget: dom-to-image not loaded');
            return null;
        }
        
        if (!currentSelectionData || !currentSelectionData.selectedArea) {
            console.error('Widget: No area selected');
            return null;
        }
        
        try {
            let targetElement = null;
            let screenshotData = null;
            
            if (currentSelectionData.type === 'element' && currentSelectionData.element) {
                // Screenshot the specific element
                targetElement = currentSelectionData.element;
                console.log('Widget: Creating screenshot of element:', targetElement);
                
                screenshotData = await domtoimage.toPng(targetElement, {
                    quality: 0.95,
                    bgcolor: '#ffffff',
                    style: {
                        transform: 'scale(1)',
                        transformOrigin: 'top left'
                    }
                });
            } else {
                // Screenshot area from document body
                const area = currentSelectionData.selectedArea;
                console.log('Widget: Creating screenshot of area:', area);
                
                // Create a temporary container that covers the selected area
                const tempContainer = document.createElement('div');
                tempContainer.style.cssText = `
                    position: absolute;
                    left: ${area.x}px;
                    top: ${area.y}px;
                    width: ${area.width}px;
                    height: ${area.height}px;
                    overflow: hidden;
                    pointer-events: none;
                    z-index: -1;
                `;
                
                // Clone the body content into the container
                const bodyClone = document.body.cloneNode(true);
                
                // Remove widget elements from the clone
                const widgetElements = bodyClone.querySelectorAll('#feedback-widget-button, #feedback-selection-overlay, #feedback-modal');
                widgetElements.forEach(el => el.remove());
                
                tempContainer.appendChild(bodyClone);
                document.body.appendChild(tempContainer);
                
                try {
                    screenshotData = await domtoimage.toPng(tempContainer, {
                        quality: 0.95,
                        bgcolor: '#ffffff',
                        style: {
                            transform: 'scale(1)',
                            transformOrigin: 'top left'
                        }
                    });
                } finally {
                    tempContainer.remove();
                }
            }
            
            console.log('Widget: Screenshot created successfully');
            return screenshotData;
            
        } catch (error) {
            console.error('Widget: Failed to create screenshot:', error);
            return null;
        }
    }
    
    // Show feedback modal
    function showFeedbackModal() {
        console.log('Widget: Showing feedback modal');
        
        removeHighlight();
        
        if (overlay) {
            // Clean up escape handler
            if (overlay._escapeHandler) {
                document.removeEventListener('keydown', overlay._escapeHandler);
            }
            overlay.remove();
            overlay = null;
        }
        
        isSelecting = false;
        
        // Create modal
        modal = document.createElement('div');
        modal.id = 'feedback-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 100001;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 24px;
            width: 100%;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        `;
        
        // Show loading state first
        modalContent.innerHTML = `
            <h2 style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 600; color: #1f2937;">
                Feedback senden
            </h2>
            
            <div style="margin-bottom: 20px; padding: 40px; text-align: center; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;">
                <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #e5e7eb; border-top: 4px solid #2563eb; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="margin: 16px 0 0 0; color: #6b7280; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    📸 Erstelle echten Screenshot...
                </p>
            </div>
            
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Create screenshot and update modal
        createRealScreenshot().then(screenshotData => {
            const area = currentSelectionData?.selectedArea;
            const hasScreenshot = screenshotData && screenshotData !== null;
            
            modalContent.innerHTML = `
                <h2 style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 600; color: #1f2937;">
                    Feedback senden
                </h2>
                
                ${hasScreenshot ? `
                    <div style="margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                        <div style="background: #f3f4f6; padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; font-weight: 500; color: #374151;">
                            🔲 Screenshot des ausgewählten Bereichs
                        </div>
                        <img src="${screenshotData}" alt="Screenshot des ausgewählten Bereichs" style="width: 100%; height: auto; display: block; max-height: 300px; object-fit: contain;" />
                    </div>
                ` : `
                    <div style="margin-bottom: 20px; padding: 20px; text-align: center; border: 1px solid #fbbf24; border-radius: 8px; background: #fef3c7;">
                        <p style="margin: 0; color: #92400e; font-size: 14px;">
                            ⚠️ Screenshot konnte nicht erstellt werden, aber Koordinaten sind verfügbar.
                        </p>
                    </div>
                `}
                
                ${area ? `
                    <div style="margin-bottom: 20px; padding: 12px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; font-size: 12px; color: #1e40af;">
                        <strong>Bereich-Info:</strong> ${Math.round(area.width)} × ${Math.round(area.height)} px bei (${Math.round(area.x)}, ${Math.round(area.y)})
                        ${currentSelectionData.selector ? `<br><strong>CSS Selector:</strong> ${currentSelectionData.selector}` : ''}
                    </div>
                ` : ''}
                
                <form id="feedback-form" style="display: flex; flex-direction: column; gap: 16px;">
                    <div>
                        <label for="feedback-title" style="display: block; margin-bottom: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 500; color: #374151;">
                            Titel *
                        </label>
                        <input 
                            type="text" 
                            id="feedback-title" 
                            required
                            style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; box-sizing: border-box;"
                            placeholder="Kurze Beschreibung des Problems oder Vorschlags"
                        />
                    </div>
                    
                    <div>
                        <label for="feedback-description" style="display: block; margin-bottom: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 500; color: #374151;">
                            Beschreibung
                        </label>
                        <textarea 
                            id="feedback-description" 
                            rows="4"
                            style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; resize: vertical; box-sizing: border-box;"
                            placeholder="Detaillierte Beschreibung..."
                        ></textarea>
                    </div>
                    
                    <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px;">
                        <button 
                            type="button" 
                            id="cancel-feedback"
                            style="padding: 8px 16px; border: 1px solid #d1d5db; background: white; color: #374151; border-radius: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; cursor: pointer;"
                        >
                            Abbrechen
                        </button>
                        <button 
                            type="submit" 
                            id="submit-feedback"
                            style="padding: 8px 16px; border: none; background: #2563eb; color: white; border-radius: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 500; cursor: pointer;"
                        >
                            🔲 Bereich auswählen & senden
                        </button>
                    </div>
                </form>
            `;
            
            setupModalEvents(screenshotData);
        }).catch(error => {
            console.error('Widget: Screenshot creation failed:', error);
            modalContent.innerHTML = `
                <h2 style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 600; color: #1f2937;">
                    Feedback senden
                </h2>
                
                <div style="margin-bottom: 20px; padding: 20px; text-align: center; border: 1px solid #ef4444; border-radius: 8px; background: #fef2f2;">
                    <p style="margin: 0; color: #dc2626; font-size: 14px;">
                        ❌ Screenshot konnte nicht erstellt werden.
                    </p>
                </div>
                
                <form id="feedback-form" style="display: flex; flex-direction: column; gap: 16px;">
                    <div>
                        <label for="feedback-title" style="display: block; margin-bottom: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 500; color: #374151;">
                            Titel *
                        </label>
                        <input 
                            type="text" 
                            id="feedback-title" 
                            required
                            style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; box-sizing: border-box;"
                            placeholder="Kurze Beschreibung des Problems oder Vorschlags"
                        />
                    </div>
                    
                    <div>
                        <label for="feedback-description" style="display: block; margin-bottom: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 500; color: #374151;">
                            Beschreibung
                        </label>
                        <textarea 
                            id="feedback-description" 
                            rows="4"
                            style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; resize: vertical; box-sizing: border-box;"
                            placeholder="Detaillierte Beschreibung..."
                        ></textarea>
                    </div>
                    
                    <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px;">
                        <button 
                            type="button" 
                            id="cancel-feedback"
                            style="padding: 8px 16px; border: 1px solid #d1d5db; background: white; color: #374151; border-radius: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; cursor: pointer;"
                        >
                            Abbrechen
                        </button>
                        <button 
                            type="submit" 
                            id="submit-feedback"
                            style="padding: 8px 16px; border: none; background: #2563eb; color: white; border-radius: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 500; cursor: pointer;"
                        >
                            Senden
                        </button>
                    </div>
                </form>
            `;
            
            setupModalEvents(null);
        });
    }
    
    // Setup modal events
    function setupModalEvents(screenshotData) {
        if (!modal) return;
        
        const form = modal.querySelector('#feedback-form');
        const cancelBtn = modal.querySelector('#cancel-feedback');
        
        form.addEventListener('submit', (e) => submitFeedback(e, screenshotData));
        cancelBtn.addEventListener('click', closeModal);
        
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // ESC key handler
        function escHandler(e) {
            if (e.key === 'Escape') {
                closeModal();
            }
        }
        document.addEventListener('keydown', escHandler);
    }
    
    // Close modal and reset
    function closeModal() {
        console.log('Widget: Closing modal');
        if (modal) {
            modal.remove();
            modal = null;
        }
        resetWidget();
    }
    
    // Submit feedback
    function submitFeedback(e, screenshotData) {
        e.preventDefault();
        
        if (isSubmitting) {
            console.log('Widget: Already submitting, ignoring');
            return;
        }
        
        isSubmitting = true;
        console.log('Widget: Submitting feedback');
        
        const titleEl = modal.querySelector('#feedback-title');
        const descriptionEl = modal.querySelector('#feedback-description');
        const submitBtn = modal.querySelector('#submit-feedback');
        
        const title = titleEl.value.trim();
        const description = descriptionEl.value.trim();
        
        if (!title) {
            alert('Bitte geben Sie einen Titel ein.');
            isSubmitting = false;
            return;
        }
        
        // Disable form
        submitBtn.textContent = 'Wird gesendet...';
        submitBtn.disabled = true;
        titleEl.disabled = true;
        descriptionEl.disabled = true;
        
        const requestData = {
            title: title,
            description: description,
            url: window.location.href,
            selected_area: currentSelectionData?.selectedArea || null,
            screenshot: screenshotData || null
        };
        
        console.log('Widget: Submitting feedback with screenshot:', !!screenshotData);
        
        // Update submit button text based on screenshot availability
        if (screenshotData) {
            submitBtn.textContent = 'Wird mit Bereich-Screenshot gesendet...';
        } else {
            submitBtn.textContent = 'Wird ohne Screenshot gesendet...';
        }
        
        submitToAPI(requestData);
    }
    
    // Submit to API
    function submitToAPI(data) {
        fetch(`${baseUrl}/api/projects/${encodeURIComponent(projectId)}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            console.log('Widget: Feedback submission response:', response.status);
            if (response.ok) {
                return response.json();
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        })
        .then(data => {
            console.log('Widget: Feedback submitted successfully:', data);
            const hasScreenshot = data.screenshot !== null;
            const message = hasScreenshot 
                ? 'Feedback mit Bereich-Screenshot erfolgreich gesendet! 🔲' 
                : 'Feedback erfolgreich gesendet! ✅';
            showSuccess(message);
            setTimeout(() => {
                closeModal();
            }, 1500);
        })
        .catch(error => {
            console.error('Widget: Failed to submit feedback:', error);
            showError('Fehler beim Senden des Feedbacks: ' + error.message);
            // Re-enable form
            const submitBtn = modal.querySelector('#submit-feedback');
            const titleEl = modal.querySelector('#feedback-title');
            const descriptionEl = modal.querySelector('#feedback-description');
            
            if (submitBtn) submitBtn.textContent = '🔲 Bereich auswählen & senden';
            if (submitBtn) submitBtn.disabled = false;
            if (titleEl) titleEl.disabled = false;
            if (descriptionEl) descriptionEl.disabled = false;
            isSubmitting = false;
        });
    }
    
    // Show success message
    function showSuccess(message) {
        showToast(message, '#10b981', '#ffffff');
    }
    
    // Show error message
    function showError(message) {
        showToast(message, '#ef4444', '#ffffff');
    }
    
    // Show toast notification
    function showToast(message, backgroundColor, textColor) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${backgroundColor};
            color: ${textColor};
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 100002;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            font-weight: 500;
            max-width: 300px;
            word-wrap: break-word;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 4000);
    }
    
    // Reset widget to initial state
    function resetWidget() {
        console.log('Widget: Resetting to initial state');
        
        isSelecting = false;
        isSubmitting = false;
        currentSelectionData = null;
        
        removeHighlight();
        
        if (overlay) {
            if (overlay._escapeHandler) {
                document.removeEventListener('keydown', overlay._escapeHandler);
            }
            overlay.remove();
            overlay = null;
        }
        
        if (modal) {
            modal.remove();
            modal = null;
        }
        
        // Show feedback button again
        const button = document.getElementById('feedback-widget-button');
        if (button) {
            button.style.display = 'flex';
        }
    }
    
    // Show feedback modal directly with screenshot (new method)
    function showFeedbackModalDirect(screenshotData) {
        console.log('Widget: Showing feedback modal directly');
        
        removeHighlight();
        
        if (overlay) {
            // Clean up escape handler
            if (overlay._escapeHandler) {
                document.removeEventListener('keydown', overlay._escapeHandler);
            }
            overlay.remove();
            overlay = null;
        }
        
        // Create modal
        modal = document.createElement('div');
        modal.id = 'feedback-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            padding: 24px;
            border-radius: 12px;
            min-width: 400px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
        `;
        
        const area = currentSelectionData?.selectedArea;
        const hasScreenshot = screenshotData && screenshotData !== null;
        
        modalContent.innerHTML = `
            <h2 style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 600; color: #1f2937;">
                Feedback senden
            </h2>
            
            ${hasScreenshot ? `
                <div style="margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                    <div style="background: #f3f4f6; padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; font-weight: 500; color: #374151;">
                        🔲 Screenshot des ausgewählten Bereichs
                    </div>
                    <img src="${screenshotData}" alt="Screenshot des ausgewählten Bereichs" style="width: 100%; height: auto; display: block; max-height: 300px; object-fit: contain;" />
                </div>
            ` : `
                <div style="margin-bottom: 20px; padding: 20px; text-align: center; border: 1px solid #fbbf24; border-radius: 8px; background: #fef3c7;">
                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                        ⚠️ Screenshot konnte nicht erstellt werden, aber Koordinaten sind verfügbar.
                    </p>
                </div>
            `}
            
            ${area ? `
                <div style="margin-bottom: 20px; padding: 12px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; font-size: 12px; color: #1e40af;">
                    <strong>Bereich-Info:</strong> ${Math.round(area.width)} × ${Math.round(area.height)} px bei (${Math.round(area.x)}, ${Math.round(area.y)})
                    ${currentSelectionData.selector ? `<br><strong>CSS Selector:</strong> ${currentSelectionData.selector}` : ''}
                </div>
            ` : ''}
            
            <form id="feedback-form" style="display: flex; flex-direction: column; gap: 16px;">
                <div>
                    <label for="feedback-title" style="display: block; margin-bottom: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 500; color: #374151;">
                        Titel *
                    </label>
                    <input 
                        type="text" 
                        id="feedback-title" 
                        required
                        style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; box-sizing: border-box;"
                        placeholder="Kurze Beschreibung des Problems oder Vorschlags"
                    />
                </div>
                
                <div>
                    <label for="feedback-description" style="display: block; margin-bottom: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 500; color: #374151;">
                        Beschreibung
                    </label>
                    <textarea 
                        id="feedback-description" 
                        rows="4"
                        style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; resize: vertical; box-sizing: border-box;"
                        placeholder="Detaillierte Beschreibung..."
                    ></textarea>
                </div>
                
                <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px;">
                    <button 
                        type="button" 
                        id="cancel-feedback"
                        style="padding: 8px 16px; border: 1px solid #d1d5db; background: white; color: #374151; border-radius: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; cursor: pointer;"
                    >
                        Abbrechen
                    </button>
                    <button 
                        type="submit" 
                        id="submit-feedback"
                        style="padding: 8px 16px; border: none; background: #2563eb; color: white; border-radius: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 500; cursor: pointer;"
                    >
                        📨 Feedback senden
                    </button>
                </div>
            </form>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        setupModalEvents(screenshotData);
    }

    // Initialize widget when script loads
    init();
})();
