// Enhanced Admin Widget - Shows existing feedback areas
(function() {
  'use strict';

  // Check if we're in admin mode
  const urlParams = new URLSearchParams(window.location.search);
  const isAdminMode = urlParams.has('admin') || window.location.pathname.includes('admin');

  if (!isAdminMode) {
    // Load normal widget
    const script = document.createElement('script');
    script.src = '/widget.js';
    document.head.appendChild(script);
    return;
  }

  // Admin mode - enhanced widget with feedback visualization
  class AdminFeedbackWidget {
    constructor() {
      this.feedbackAreas = [];
      this.init();
    }

    async init() {
      await this.loadExistingFeedback();
      this.createAdminOverlay();
      this.highlightFeedbackAreas();
    }

    async loadExistingFeedback() {
      try {
        const response = await fetch('/api/feedback');
        const data = await response.json();
        
        if (data.success) {
          // Filter feedback for current page
          const currentPath = window.location.pathname;
          this.feedbackAreas = data.feedback.filter(item => {
            try {
              const feedbackUrl = new URL(item.url);
              return feedbackUrl.pathname === currentPath && item.selected_area;
            } catch {
              return false;
            }
          });
        }
      } catch (error) {
        console.error('Failed to load feedback:', error);
      }
    }

    createAdminOverlay() {
      const overlay = document.createElement('div');
      overlay.id = 'admin-feedback-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 999990;
      `;
      
      document.body.appendChild(overlay);
    }

    highlightFeedbackAreas() {
      const overlay = document.getElementById('admin-feedback-overlay');
      if (!overlay) return;

      this.feedbackAreas.forEach((feedback) => {
        try {
          const area = JSON.parse(feedback.selected_area);
          
          // Create highlight element
          const highlight = document.createElement('div');
          highlight.className = 'admin-feedback-highlight';
          highlight.style.cssText = `
            position: absolute;
            left: ${area.x}px;
            top: ${area.y}px;
            width: ${area.width}px;
            height: ${area.height}px;
            border: 3px solid #ef4444;
            background: rgba(239, 68, 68, 0.1);
            pointer-events: all;
            cursor: pointer;
            z-index: 999991;
            border-radius: 4px;
            box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8);
            transition: all 0.2s ease;
          `;
          
          // Add hover effect
          highlight.addEventListener('mouseenter', () => {
            highlight.style.background = 'rgba(239, 68, 68, 0.2)';
            highlight.style.borderColor = '#dc2626';
          });
          
          highlight.addEventListener('mouseleave', () => {
            highlight.style.background = 'rgba(239, 68, 68, 0.1)';
            highlight.style.borderColor = '#ef4444';
          });

          // Create feedback label
          const label = document.createElement('div');
          label.style.cssText = `
            position: absolute;
            top: -30px;
            left: 0;
            background: #ef4444;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            white-space: nowrap;
            z-index: 999992;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          `;
          label.textContent = `Feedback #${feedback.id}`;
          
          // Show feedback details on click
          highlight.addEventListener('click', () => {
            this.showFeedbackDetails(feedback);
          });
          
          highlight.appendChild(label);
          overlay.appendChild(highlight);
          
        } catch (error) {
          console.error('Error highlighting feedback area:', error);
        }
      });

      // Add legend
      this.createLegend();
    }

    createLegend() {
      const legend = document.createElement('div');
      legend.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 12px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 999995;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
      `;
      
      legend.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 8px; color: #374151;">
          Admin Mode - Feedback Areas
        </div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <div style="width: 16px; height: 16px; background: rgba(239, 68, 68, 0.1); border: 2px solid #ef4444; border-radius: 2px;"></div>
          <span style="color: #6b7280; font-size: 12px;">Bereiche mit Feedback (${this.feedbackAreas.length})</span>
        </div>
        <div style="color: #6b7280; font-size: 11px; margin-top: 8px;">
          Klicken Sie auf markierte Bereiche für Details
        </div>
      `;
      
      document.body.appendChild(legend);
    }

    showFeedbackDetails(feedback) {
      // Remove existing modal
      const existingModal = document.getElementById('admin-feedback-modal');
      if (existingModal) {
        existingModal.remove();
      }

      const modal = document.createElement('div');
      modal.id = 'admin-feedback-modal';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;

      const modalContent = document.createElement('div');
      modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
      `;

      const area = JSON.parse(feedback.selected_area);
      modalContent.innerHTML = `
        <div style="display: flex; justify-content: between; align-items: start; margin-bottom: 16px;">
          <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">
            Feedback #${feedback.id}
          </h3>
          <button id="close-modal" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #6b7280; margin-left: auto;">&times;</button>
        </div>
        
        <div style="margin-bottom: 16px;">
          <strong style="color: #374151;">Feedback:</strong>
          <div style="background: #f9fafb; padding: 12px; border-radius: 6px; margin-top: 4px; color: #374151; white-space: pre-wrap;">
            ${feedback.text}
          </div>
        </div>
        
        <div style="margin-bottom: 16px;">
          <strong style="color: #374151;">Markierter Bereich:</strong>
          <div style="background: #f3f4f6; padding: 8px; border-radius: 4px; margin-top: 4px; font-size: 12px; color: #6b7280;">
            Position: ${Math.round(area.x)}, ${Math.round(area.y)}<br>
            Größe: ${Math.round(area.width)} × ${Math.round(area.height)} px
          </div>
        </div>
        
        <div style="margin-bottom: 16px;">
          <strong style="color: #374151;">Erstellt am:</strong>
          <div style="color: #6b7280; margin-top: 4px; font-size: 14px;">
            ${new Date(feedback.created_at).toLocaleString('de-DE')}
          </div>
        </div>
        
        ${feedback.screenshot ? `
          <div style="margin-bottom: 16px;">
            <strong style="color: #374151;">Screenshot:</strong>
            <div style="margin-top: 8px;">
              <img src="${feedback.screenshot_display || feedback.screenshot}" alt="Feedback Screenshot" style="max-width: 100%; border-radius: 6px; border: 1px solid #e5e7eb;">
            </div>
          </div>
        ` : ''}
        
        <div style="display: flex; gap: 12px; margin-top: 20px;">
          <button id="create-jira-ticket" style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; flex: 1;">
            JIRA Ticket erstellen
          </button>
          <button id="mark-resolved" style="background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; flex: 1;">
            Als erledigt markieren
          </button>
        </div>
      `;

      modal.appendChild(modalContent);
      document.body.appendChild(modal);

      // Add event listeners
      document.getElementById('close-modal').addEventListener('click', () => {
        modal.remove();
      });

      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove();
        }
      });

      document.getElementById('create-jira-ticket').addEventListener('click', () => {
        this.createJiraTicket(feedback);
      });

      document.getElementById('mark-resolved').addEventListener('click', () => {
        this.markAsResolved(feedback.id);
      });
    }

    createJiraTicket(feedback) {
      // Placeholder for JIRA integration
      alert('JIRA Integration wird in den Settings konfiguriert.\n\nFeedback Details:\n' + feedback.text);
    }

    async markAsResolved(feedbackId) {
      try {
        // Add resolved status to feedback (would need API endpoint)
        console.log('Marking feedback as resolved:', feedbackId);
        
        // Remove highlight from UI
        const highlights = document.querySelectorAll('.admin-feedback-highlight');
        highlights.forEach(highlight => {
          if (highlight.querySelector('div').textContent === `Feedback #${feedbackId}`) {
            highlight.style.opacity = '0.3';
            highlight.style.border = '3px solid #10b981';
            highlight.querySelector('div').style.background = '#10b981';
            highlight.querySelector('div').textContent = `#${feedbackId} ✓`;
          }
        });

        // Close modal
        const modal = document.getElementById('admin-feedback-modal');
        if (modal) modal.remove();
        
        // Trigger update event
        this.triggerFeedbackUpdate();
        
      } catch (error) {
        console.error('Error marking as resolved:', error);
      }
    }

    triggerFeedbackUpdate() {
      // Trigger custom event for admin interface updates
      const event = new CustomEvent('feedbackUpdated', {
        detail: {
          timestamp: new Date().toISOString(),
          url: window.location.href,
          source: 'admin-widget'
        }
      });
      
      // Dispatch to current window
      window.dispatchEvent(event);
      
      // Also try to send message to parent window (if in iframe)
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: 'feedbackUpdated',
            timestamp: new Date().toISOString(),
            url: window.location.href,
            source: 'admin-widget'
          }, '*');
        }
      } catch (e) {
        console.log('Cannot access parent window for message:', e);
      }
    }
  }

  // Initialize admin widget
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new AdminFeedbackWidget();
    });
  } else {
    new AdminFeedbackWidget();
  }

})();
