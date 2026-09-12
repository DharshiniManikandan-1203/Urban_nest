export class Modal {
  static show({ title, bodyHtml, footerHtml = '', size = 'md' }) {
    let backdrop = document.getElementById('global-modal-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'global-modal-backdrop';
      backdrop.className = 'modal-backdrop';
      document.body.appendChild(backdrop);
    }

    const maxWMap = {
      sm: '400px',
      md: '600px',
      lg: '800px',
      xl: '1000px'
    };

    backdrop.innerHTML = `
      <div class="modal-dialog" style="max-width: ${maxWMap[size] || '600px'};">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close-btn" id="modal-close-x"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
          ${bodyHtml}
        </div>
        ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
      </div>
    `;

    backdrop.classList.add('open');

    const closeHandler = () => {
      backdrop.classList.remove('open');
    };

    document.getElementById('modal-close-x').onclick = closeHandler;
    backdrop.onclick = (e) => {
      if (e.target === backdrop) closeHandler();
    };

    const cancelBtns = backdrop.querySelectorAll('[data-modal-close]');
    cancelBtns.forEach(btn => btn.onclick = closeHandler);

    return {
      close: closeHandler,
      element: backdrop
    };
  }

  static hide() {
    const backdrop = document.getElementById('global-modal-backdrop');
    if (backdrop) {
      backdrop.classList.remove('open');
    }
  }
}
