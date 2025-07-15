// Feedback Widget with DOM-based Element Selection
(function() {
    'use strict';
    
    console.log('Widget: Loading feedback widget');
    
    // Configuration
    const script = document.currentScript || document.querySelector('script[data-project-id]');
    const projectId = script?.getAttribute('data-project-id') || 'default-project';
    const baseUrl = script?.src ? new URL(script.src).origin : 'https://design-review-self.vercel.app';
    
    console.log('Widget: Configuration loaded', { projectId, baseUrl });
    
    // State variables
    let isSelecting = false;
    let isSubmitting = false;
    let overlay = null;
    let modal = null;
    let screenshotBlob = null;
    let currentHighlightedElement = null;
    let currentSelectionData = null;
    
    // Initialize widget
    function init() {
        console.log('Widget: Initializing');
        
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
            console.warn('Widget: Failed to send ping:', err);
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
        
        button.addEventListener('click', startSelectionMode);
        
        document.body.appendChild(button);
        console.log('Widget: Feedback button created');
    }
    
    // Start element selection mode
    function startSelectionMode() {
        console.log('Widget: Starting selection mode');
        
        if (isSelecting) return;
        
        // Hide feedback button
        const button = document.getElementById('feedback-widget-button');
        if (button) {
            button.style.display = 'none';
        }
        
        isSelecting = true;
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
        banner.textContent = 'Klicken Sie auf ein Element oder ziehen Sie einen Bereich auf. ESC zum Abbrechen.';
        
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
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        `;
        
        modalContent.innerHTML = `
            <h2 style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 600; color: #1f2937;">
                Feedback senden
            </h2>
            
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
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Setup modal events
        setupModalEvents();
    }
    
    // Setup modal events
    function setupModalEvents() {
        if (!modal) return;
        
        const form = modal.querySelector('#feedback-form');
        const cancelBtn = modal.querySelector('#cancel-feedback');
        
        form.addEventListener('submit', submitFeedback);
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
    function submitFeedback(e) {
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
        
        // Prepare JSON data
        const requestData = {
            title: title,
            description: description,
            url: window.location.href,
            selected_area: currentSelectionData?.selectedArea || null
        };
        
        console.log('Widget: Submitting feedback', requestData);
        
        // Submit to API
        fetch(`${baseUrl}/api/projects/${encodeURIComponent(projectId)}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
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
            showSuccess('Feedback erfolgreich gesendet!');
            setTimeout(() => {
                closeModal();
            }, 1500);
        })
        .catch(error => {
            console.error('Widget: Failed to submit feedback:', error);
            showError('Fehler beim Senden des Feedbacks: ' + error.message);
            // Re-enable form
            submitBtn.textContent = 'Senden';
            submitBtn.disabled = false;
            titleEl.disabled = false;
            descriptionEl.disabled = false;
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
        screenshotBlob = null;
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
    
    // Initialize widget when script loads
    init();
})();
