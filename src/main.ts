import { AUTO, Game, Scale } from 'phaser';
import './style.css';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';

// Configuración principal del juego
new Game({
  type: AUTO,
  parent: 'app',
  width: 1280,
  height: 720,
  backgroundColor: '#071a45',
  scale: {
    mode: Scale.FIT, // se adapta a cualquier pantalla sin deformarse
    autoCenter: Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene],
});
