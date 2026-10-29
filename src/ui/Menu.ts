import { el } from './dom';

// Pantalla de inicio
export function showMenu(onPlay: () => void): HTMLElement {
  const menu = el('div', 'menu');
  const logo = el('img');
  logo.src = 'assets/logos/logo-principal.png';
  logo.alt = 'Garage LAB — Build Your Dream Garage';
  const play = el('button', 'btn', 'JUGAR');
  play.addEventListener('click', () => {
    menu.classList.add('hidden');
    onPlay();
  });
  menu.append(logo, play, el('div', 'credits', 'Versión prototipo · Garage LAB'));
  document.getElementById('app')!.appendChild(menu);
  return menu;
}
