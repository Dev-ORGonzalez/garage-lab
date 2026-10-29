import '@fontsource/lilita-one';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/800.css';
import './style.css';
import { showMenu } from './ui/Menu';
import { GarageView } from './game/GarageView';

const app = document.getElementById('app')!;
const worldEl = document.createElement('div');
worldEl.id = 'world';
app.appendChild(worldEl);

async function startGarage(): Promise<void> {
  // Esperamos la tipografía para que el rótulo del taller se dibuje con ella
  await document.fonts.load('64px "Lilita One"').catch(() => undefined);
  new GarageView(worldEl, () => menu.classList.remove('hidden'));
}

const menu = showMenu(() => startGarage());
