// Pequeña ayuda para crear elementos HTML
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  html = '',
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (html) e.innerHTML = html;
  return e;
}

export function money(n: number): string {
  return `$${n.toLocaleString('en-US')}`;
}

let toastTimer = 0;
let toastEl: HTMLElement | null = null;

// Mensaje temporal en la parte de abajo
export function showToast(message: string): void {
  if (!toastEl) {
    toastEl = el('div', 'toast');
    document.getElementById('app')!.appendChild(toastEl);
  }
  toastEl.textContent = message;
  toastEl.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl?.classList.remove('show'), 2400);
}
