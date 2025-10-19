// TBS Generic Modal Component
// Reusable modal system for all TBS portal features

export class Modal {
  constructor() {
    this.modal = null;
    this.overlay = null;
    this.resolve = null;
  }

  open({ title, bodyNode, actions = [], size = 'medium', closable = true }) {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.createModal({ title, bodyNode, actions, size, closable });
      this.show();
    });
  }

  createModal({ title, bodyNode, actions, size, closable }) {
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    // Create modal
    this.modal = document.createElement('div');
    this.modal.className = 'modal-content';
    
    const sizeStyles = {
      small: 'max-width: 400px;',
      medium: 'max-width: 600px;',
      large: 'max-width: 800px;',
      xlarge: 'max-width: 1000px;'
    };

    this.modal.style.cssText = `
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 12px;
      width: 90%;
      ${sizeStyles[size] || sizeStyles.medium}
      max-height: 90vh;
      overflow-y: auto;
      transform: scale(0.9);
      transition: transform 0.3s ease;
    `;

    // Create header
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid var(--line);
    `;

    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    titleEl.style.cssText = `
      margin: 0;
      color: var(--text);
      font-size: 1.25rem;
      font-weight: 600;
    `;

    header.appendChild(titleEl);

    if (closable) {
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '&times;';
      closeBtn.className = 'modal-close';
      closeBtn.style.cssText = `
        background: none;
        border: none;
        color: var(--muted);
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.3s ease;
      `;
      closeBtn.addEventListener('click', () => this.close());
      header.appendChild(closeBtn);
    }

    // Create body
    const body = document.createElement('div');
    body.className = 'modal-body';
    body.style.cssText = 'padding: 1.5rem;';
    body.appendChild(bodyNode);

    // Create footer
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    footer.style.cssText = `
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1.5rem;
      border-top: 1px solid var(--line);
    `;

    actions.forEach(action => {
      const button = document.createElement('button');
      button.textContent = action.label;
      button.className = `btn btn-${action.kind || 'secondary'}`;
      button.style.cssText = `
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
      `;

      // Apply button styles based on kind
      switch (action.kind) {
        case 'primary':
          button.style.cssText += `
            background: var(--accent);
            color: white;
          `;
          break;
        case 'danger':
          button.style.cssText += `
            background: #dc3545;
            color: white;
          `;
          break;
        default:
          button.style.cssText += `
            background: transparent;
            color: var(--text);
            border: 1px solid var(--line);
          `;
      }

      button.addEventListener('click', () => {
        if (action.onClick) {
          action.onClick();
        }
        this.close();
      });

      footer.appendChild(button);
    });

    // Assemble modal
    this.modal.appendChild(header);
    this.modal.appendChild(body);
    this.modal.appendChild(footer);
    this.overlay.appendChild(this.modal);

    // Add to document
    document.body.appendChild(this.overlay);

    // Close on overlay click
    if (closable) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) {
          this.close();
        }
      });
    }

    // Close on escape key
    if (closable) {
      this.escapeHandler = (e) => {
        if (e.key === 'Escape') {
          this.close();
        }
      };
      document.addEventListener('keydown', this.escapeHandler);
    }
  }

  show() {
    // Trigger animation
    requestAnimationFrame(() => {
      this.overlay.style.opacity = '1';
      this.modal.style.transform = 'scale(1)';
    });
  }

  close() {
    if (!this.overlay) return;

    // Animate out
    this.overlay.style.opacity = '0';
    this.modal.style.transform = 'scale(0.9)';

    setTimeout(() => {
      if (this.overlay && this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
      if (this.escapeHandler) {
        document.removeEventListener('keydown', this.escapeHandler);
      }
      if (this.resolve) {
        this.resolve();
      }
    }, 300);
  }
}

// Global modal instance
export const modal = new Modal();

// Helper function for quick modal creation
export function openModal(options) {
  return modal.open(options);
}
