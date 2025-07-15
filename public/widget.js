(function() {
    'use strict';
    
    console.log('Widget: Loading feedback widget - DOM-based version 8.1');
    
    // Configuration
    const config = {
        baseUrl: 'https://design-review-self.vercel.app',
        projectId: window.feedbackProjectId || 'default-project'
    };
    
    // Widget state
    let isSelecting = false;
    let overlay = null;
    let modal = null;
    let selectedElement = null;
    let selectedArea = null;
    let highlightBox = null;
    let instructions = null;
    
    // Initialize widget when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWidget);
    } else {
        initWidget();
    }
    
    function initWidget() {
        console.log('Widget: Initializing DOM-based feedback widget');
        
        if (document.getElementById('feedback-widget-button')) {
            console.log('Widget: Already initialized');
            return;
        }
        
        createFeedbackButton();
        console.log('Widget: Initialization complete');
    }
    
    function createFeedbackButton() {
        const button = document.createElement('button');
        button.id = 'feedback-widget-button';
        button.innerHTML = '💬';
        button.title = 'Feedback senden';
        button.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            font-size: 24px;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
            z-index: 99999;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';
            button.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.4)';
        });
        
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Widget: Feedback button clicked');
            startSelectionMode();
        });
        
        document.body.appendChild(button);
        console.log('Widget: Feedback button created');
    }
    
    function startSelectionMode() {
        if (isSelecting) return;
        
        console.log('Widget: Starting element selection mode');
        isSelecting = true;
        
        const button = document.getElementById('feedback-widget-button');
        if (button) button.style.display = 'none';
        
        showElementSelectionOverlay();
    }
    
    function showElementSelectionOverlay() {
        console.log('Widget: Showing element selection overlay');
        
        // Create overlay
        overlay = document.createElement('div');
        overlay.id = 'feedback-selection-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.1);
            z-index: 100000;
            cursor: crosshair;
        `;
        
        // Create instructions
        instructions = document.createElement('div');
        instructions.id = 'feedback-instructions';
        instructions.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #1f2937;
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 100001;
            pointer-events: none;
        `;
        instructions.innerHTML = `
            <div style="text-align: center;">
                <div style="font-weight: 600; margin-bottom: 8px;">📍 Element auswählen</div>
                <div style="font-size: 12px; opacity: 0.8;">Klicken Sie auf ein Element oder ziehen Sie einen Bereich</div>
                <div style="font-size: 11px; opacity: 0.6; margin-top: 4px;">ESC zum Abbrechen</div>
            </div>
        `;
        
        // Add event listeners
        setupOverlayEvents();
        
        // Add to DOM
        document.body.appendChild(overlay);
        document.body.appendChild(instructions);
        
        // Setup ESC handler
        document.addEventListener('keydown', handleEscapeKey);
    }
    
    function setupOverlayEvents() {
        if (!overlay) return;
        
        let isDrawing = false;
        let startX = 0;
        let startY = 0;
        let selectionBox = null;
        
        // Mouse move for highlighting elements
        overlay.addEventListener('mousemove', (e) => {
            if (isDrawing) return;
            
            // Temporarily hide overlay to get element below
            overlay.style.pointerEvents = 'none';
            const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
            overlay.style.pointerEvents = 'auto';
            
            if (elementBelow && elementBelow !== overlay && elementBelow !== instructions) {
                highlightElement(elementBelow);
            } else {
                removeHighlight();
            }
        });
        
        // Click to select element
        overlay.addEventListener('click', (e) => {
            if (isDrawing) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            overlay.style.pointerEvents = 'none';
            const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
            overlay.style.pointerEvents = 'auto';
            
            if (elementBelow && elementBelow !== overlay && elementBelow !== instructions) {
                console.log('Widget: Element clicked:', elementBelow);
                selectElement(elementBelow, e.clientX, e.clientY);
            }
        });
        
        // Mouse down for area selection
        overlay.addEventListener('mousedown', (e) => {
            if (e.target !== overlay) return;
            
            console.log('Widget: Starting area selection');
            isDrawing = true;
            startX = e.clientX;
            startY = e.clientY;
            
            // Remove element highlight during drawing
            removeHighlight();
            
            // Create selection box
            selectionBox = document.createElement('div');
            selectionBox.style.cssText = `
                position: fixed;
                border: 2px solid #ef4444;
                background: rgba(239, 68, 68, 0.1);
                pointer-events: none;
                z-index: 100003;
                border-radius: 4px;
            `;
            document.body.appendChild(selectionBox);
            
            e.preventDefault();
        });
        
        // Mouse move during drawing
        document.addEventListener('mousemove', (e) => {
            if (!isDrawing || !selectionBox) return;
            
            const currentX = e.clientX;
            const currentY = e.clientY;
            
            const left = Math.min(startX, currentX);
            const top = Math.min(startY, currentY);
            const width = Math.abs(currentX - startX);
            const height = Math.abs(currentY - startY);
            
            selectionBox.style.left = left + 'px';
            selectionBox.style.top = top + 'px';
            selectionBox.style.width = width + 'px';
            selectionBox.style.height = height + 'px';
        });
        
        // Mouse up to complete area selection
        document.addEventListener('mouseup', (e) => {
            if (!isDrawing || !selectionBox) return;
            
            console.log('Widget: Finishing area selection');
            isDrawing = false;
            
            const currentX = e.clientX;
            const currentY = e.clientY;
            
            const left = Math.min(startX, currentX);
            const top = Math.min(startY, currentY);
            const width = Math.abs(currentX - startX);
            const height = Math.abs(currentY - startY);
            
            // Remove selection box
            if (selectionBox) {
                selectionBox.remove();
                selectionBox = null;
            }
            
            if (width > 20 && height > 20) {
                selectArea(left, top, width, height);
            } else {
                console.log('Widget: Area too small, ignoring');
            }
        });
    }
    
    function highlightElement(element) {
        if (!element) return;
        
        // Remove previous highlight
        removeHighlight();
        
        const rect = element.getBoundingClientRect();
        highlightBox = document.createElement('div');
        highlightBox.style.cssText = `
            position: fixed;
            top: ${rect.top}px;
            left: ${rect.left}px;
            width: ${rect.width}px;
            height: ${rect.height}px;
            border: 2px solid #3b82f6;
            background: rgba(59, 130, 246, 0.1);
            pointer-events: none;
            z-index: 100002;
            border-radius: 4px;
        `;
        document.body.appendChild(highlightBox);
    }
    
    function removeHighlight() {
        if (highlightBox) {
            highlightBox.remove();
            highlightBox = null;
        }
    }
    
    function selectElement(element, clickX, clickY) {
        console.log('Widget: Element selected:', element);
        
        selectedElement = element;
        const rect = element.getBoundingClientRect();
        
        selectedArea = {
            type: 'element',
            selector: getElementSelector(element),
            text: element.textContent?.substring(0, 50) || '',
            tagName: element.tagName.toLowerCase(),
            rect: {
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width,
                height: rect.height
            },
            clickPosition: {
                x: clickX,
                y: clickY
            }
        };
        
        removeOverlayAndShowModal();
    }
    
    function selectArea(left, top, width, height) {
        console.log('Widget: Area selected:', { left, top, width, height });
        
        selectedArea = {
            type: 'area',
            rect: {
                top: top + window.scrollY,
                left: left + window.scrollX,
                width: width,
                height: height
            }
        };
        
        removeOverlayAndShowModal();
    }
    
    function getElementSelector(element) {
        if (element.id) {
            return `#${element.id}`;
        }
        
        if (element.className) {
            const classes = element.className.split(' ').filter(c => c && !c.startsWith('feedback-'));
            if (classes.length > 0) {
                return `${element.tagName.toLowerCase()}.${classes[0]}`;
            }
        }
        
        const parent = element.parentElement;
        if (parent) {
            const siblings = Array.from(parent.children);
            const index = siblings.indexOf(element) + 1;
            return `${element.tagName.toLowerCase()}:nth-child(${index})`;
        }
        
        return element.tagName.toLowerCase();
    }
    
    function removeOverlayAndShowModal() {
        console.log('Widget: Removing overlay and showing modal');
        
        // Remove event listeners
        document.removeEventListener('keydown', handleEscapeKey);
        
        // Remove overlay elements
        if (overlay) {
            overlay.remove();
            overlay = null;
        }
        
        if (instructions) {
            instructions.remove();
            instructions = null;
        }
        
        removeHighlight();
        
        showFeedbackModal();
    }
    
    function handleEscapeKey(e) {
        if (e.key === 'Escape') {
            console.log('Widget: Cancelled via ESC key');
            resetWidget();
        }
    }
    
    function showFeedbackModal() {
        console.log('Widget: Showing feedback modal');
        
        modal = document.createElement('div');
        modal.id = 'feedback-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            z-index: 110000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 16px;
            padding: 32px;
            max-width: 520px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            position: relative;
        `;
        
        let selectedElementInfo = '';
        if (selectedElement && selectedArea) {
            selectedElementInfo = `
                <div style="margin-bottom: 24px;">
                    <label style="display: block; font-weight: 600; color: #374151; margin-bottom: 8px; font-size: 14px;">🎯 Ausgewähltes Element</label>
                    <div style="border: 2px solid #e5e7eb; border-radius: 12px; padding: 16px; background: #f9fafb;">
                        <div style="font-size: 13px; color: #6b7280; margin-bottom: 8px;">
                            <strong>Element:</strong> ${selectedArea.tagName || 'unbekannt'}
                        </div>
                        ${selectedArea.selector ? `<div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px; font-family: monospace; background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${selectedArea.selector}</div>` : ''}
                        ${selectedArea.text ? `<div style="font-size: 12px; color: #6b7280;">"${selectedArea.text}${selectedArea.text.length >= 50 ? '...' : ''}"</div>` : ''}
                    </div>
                </div>
            `;
        } else if (selectedArea && selectedArea.type === 'area') {
            selectedElementInfo = `
                <div style="margin-bottom: 24px;">
                    <label style="display: block; font-weight: 600; color: #374151; margin-bottom: 8px; font-size: 14px;">📐 Ausgewählter Bereich</label>
                    <div style="border: 2px solid #e5e7eb; border-radius: 12px; padding: 16px; background: #f9fafb; text-align: center;">
                        <div style="font-size: 13px; color: #6b7280;">
                            Bereich: ${Math.round(selectedArea.rect.width)} × ${Math.round(selectedArea.rect.height)} px
                        </div>
                    </div>
                </div>
            `;
        }
        
        modalContent.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 24px;">
                <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-right: 16px; font-size: 24px;">
                    💬
                </div>
                <div>
                    <h2 style="margin: 0; font-size: 24px; font-weight: 700; color: #1f2937;">Feedback senden</h2>
                    <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">Ihr Feedback wird an das Entwicklungsteam gesendet</p>
                </div>
            </div>
            
            ${selectedElementInfo}
            
            <div style="margin-bottom: 24px;">
                <label for="feedback-text" style="display: block; font-weight: 600; color: #374151; margin-bottom: 8px; font-size: 14px;">✍️ Beschreibung *</label>
                <textarea 
                    id="feedback-text" 
                    placeholder="Beschreiben Sie Ihr Feedback, gefundene Probleme oder Verbesserungsvorschläge..."
                    style="width: 100%; height: 120px; padding: 16px; border: 2px solid #e5e7eb; border-radius: 12px; font-size: 14px; font-family: inherit; resize: vertical; box-sizing: border-box;"
                    required
                ></textarea>
            </div>
            
            <div style="margin-bottom: 24px;">
                <label for="feedback-type" style="display: block; font-weight: 600; color: #374151; margin-bottom: 8px; font-size: 14px;">🏷️ Kategorie</label>
                <select id="feedback-type" style="width: 100%; padding: 12px 16px; border: 2px solid #e5e7eb; border-radius: 12px; font-size: 14px; background: white;">
                    <option value="bug">🐛 Bug / Fehler</option>
                    <option value="improvement">💡 Verbesserungsvorschlag</option>
                    <option value="feature">✨ Feature-Wunsch</option>
                    <option value="design">🎨 Design-Feedback</option>
                    <option value="other">📝 Sonstiges</option>
                </select>
            </div>
            
            <div style="margin-bottom: 32px;">
                <label for="feedback-email" style="display: block; font-weight: 600; color: #374151; margin-bottom: 8px; font-size: 14px;">📧 E-Mail (optional)</label>
                <input 
                    type="email" 
                    id="feedback-email" 
                    placeholder="ihre.email@example.com"
                    style="width: 100%; padding: 12px 16px; border: 2px solid #e5e7eb; border-radius: 12px; font-size: 14px; box-sizing: border-box;"
                />
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">Nur angeben, wenn Sie eine Rückmeldung wünschen</p>
            </div>
            
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button 
                    id="feedback-cancel" 
                    style="padding: 12px 24px; border: 2px solid #e5e7eb; background: white; color: #374151; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s;"
                >
                    Abbrechen
                </button>
                <button 
                    id="feedback-submit" 
                    style="padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; min-width: 120px;"
                >
                    <span id="submit-text">Senden</span>
                    <span id="submit-loading" style="display: none;">Wird gesendet...</span>
                </button>
            </div>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Focus on textarea
        const textarea = document.getElementById('feedback-text');
        if (textarea) {
            setTimeout(() => textarea.focus(), 100);
        }
        
        // Add event listeners
        document.getElementById('feedback-cancel').addEventListener('click', () => {
            modal.remove();
            resetWidget();
        });
        
        document.getElementById('feedback-submit').addEventListener('click', () => {
            submitFeedback();
        });
        
        // ESC key to close modal
        const modalEscHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                resetWidget();
                document.removeEventListener('keydown', modalEscHandler);
            }
        };
        document.addEventListener('keydown', modalEscHandler);
    }
    
    function submitFeedback() {
        const text = document.getElementById('feedback-text').value.trim();
        const type = document.getElementById('feedback-type').value;
        const email = document.getElementById('feedback-email').value.trim();
        
        if (!text) {
            showError('Bitte geben Sie eine Beschreibung ein');
            return;
        }
        
        console.log('Widget: Submitting feedback', { text, type, email, selectedArea });
        
        const submitBtn = document.getElementById('feedback-submit');
        const submitText = document.getElementById('submit-text');
        const submitLoading = document.getElementById('submit-loading');
        
        if (submitBtn && submitText && submitLoading) {
            submitBtn.disabled = true;
            submitText.style.display = 'none';
            submitLoading.style.display = 'inline';
        }
        
        const feedback = {
            title: `${type.charAt(0).toUpperCase() + type.slice(1)}: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
            description: text,
            type: type,
            email: email || null,
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            selectedElement: selectedArea || null,
            pageInfo: {
                title: document.title,
                url: window.location.href,
                referrer: document.referrer,
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            }
        };
        
        fetch(`${config.baseUrl}/api/projects/${encodeURIComponent(config.projectId)}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(feedback)
        })
        .then(response => {
            console.log('Widget: Server response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Widget: Feedback submitted successfully:', data);
            showSuccess('Feedback erfolgreich gesendet! Vielen Dank für Ihre Rückmeldung.');
            modal.remove();
            resetWidget();
        })
        .catch(error => {
            console.error('Widget: Failed to submit feedback:', error);
            showError('Fehler beim Senden des Feedbacks: ' + error.message);
            
            if (submitBtn && submitText && submitLoading) {
                submitBtn.disabled = false;
                submitText.style.display = 'inline';
                submitLoading.style.display = 'none';
            }
        });
    }
    
    function showError(message) {
        console.error('Widget Error:', message);
        showNotification(message, 'error');
    }
    
    function showSuccess(message) {
        console.log('Widget Success:', message);
        showNotification(message, 'success');
    }
    
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 110001;
            max-width: 400px;
            word-wrap: break-word;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
    
    function resetWidget() {
        console.log('Widget: Resetting to initial state');
        
        isSelecting = false;
        selectedElement = null;
        selectedArea = null;
        
        // Remove event listeners
        document.removeEventListener('keydown', handleEscapeKey);
        
        // Remove overlay elements
        if (overlay) {
            overlay.remove();
            overlay = null;
        }
        
        if (instructions) {
            instructions.remove();
            instructions = null;
        }
        
        if (modal) {
            modal.remove();
            modal = null;
        }
        
        removeHighlight();
        
        // Show feedback button again
        const button = document.getElementById('feedback-widget-button');
        if (button) {
            button.style.display = 'flex';
        }
    }
    
    window.feedbackWidget = {
        reset: resetWidget
    };
    
})();
