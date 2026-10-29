import { Scene } from 'phaser';

// Escena de carga: descarga las imágenes y muestra una barra de progreso
export class BootScene extends Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const { width, height } = this.scale;
    const barWidth = 400;

    this.add
      .rectangle(width / 2, height / 2, barWidth + 8, 28, 0x0b2a6b)
      .setStrokeStyle(3, 0xffffff);
    const bar = this.add
      .rectangle(width / 2 - barWidth / 2, height / 2, 0, 20, 0xffc21a)
      .setOrigin(0, 0.5);

    this.load.on('progress', (progress: number) => {
      bar.width = barWidth * progress;
    });

    this.load.image('logo-principal', 'assets/logos/logo-principal.png');
  }

  create() {
    this.scene.start('Menu');
  }
}
