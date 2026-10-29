import { Scene } from 'phaser';

// Pantalla de inicio de Garage LAB
export class MenuScene extends Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const logoY = 285;

    // Fondo con degradado azul
    const background = this.add.graphics();
    background.fillGradientStyle(0x2f7bff, 0x2f7bff, 0x071a45, 0x071a45, 1);
    background.fillRect(0, 0, width, height);

    // Rayos de luz que giran lentamente detrás del logo
    const rays = this.add.graphics({ x: centerX, y: logoY });
    rays.fillStyle(0xffffff, 0.07);
    const rayCount = 16;
    for (let i = 0; i < rayCount; i++) {
      const a1 = (i / rayCount) * Math.PI * 2;
      const a2 = a1 + Math.PI / rayCount;
      rays.fillTriangle(
        0, 0,
        Math.cos(a1) * 1000, Math.sin(a1) * 1000,
        Math.cos(a2) * 1000, Math.sin(a2) * 1000,
      );
    }
    this.tweens.add({ targets: rays, angle: 360, duration: 60000, repeat: -1 });

    // Logo con una animación suave de "flotar"
    const logo = this.add.image(centerX, logoY, 'logo-principal');
    this.tweens.add({
      targets: logo,
      y: logoY - 10,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Botón JUGAR
    this.createButton(centerX, 600, 'JUGAR', () => {
      this.showMessage('¡Pronto! Aquí se abrirá tu taller.');
    });
  }

  // Crea un botón cartoon reutilizable
  private createButton(x: number, y: number, label: string, onClick: () => void) {
    const w = 300;
    const h = 84;
    const r = 24;

    const shadow = this.add.graphics();
    shadow.fillStyle(0x020a1f, 0.45);
    shadow.fillRoundedRect(-w / 2, -h / 2 + 8, w, h, r);

    const body = this.add.graphics();
    body.fillStyle(0xff8a00, 1);
    body.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    body.fillStyle(0xffc21a, 1);
    body.fillRoundedRect(-w / 2, -h / 2, w, h * 0.55, { tl: r, tr: r, bl: 10, br: 10 });
    body.lineStyle(6, 0x1a1a2e, 1);
    body.strokeRoundedRect(-w / 2, -h / 2, w, h, r);

    const text = this.add
      .text(0, 0, label, {
        fontFamily: '"Arial Black", Arial, sans-serif',
        fontSize: '42px',
        color: '#ffffff',
        stroke: '#1a1a2e',
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    const button = this.add.container(x, y, [shadow, body, text]);
    button.setSize(w, h).setInteractive({ useHandCursor: true });

    button.on('pointerover', () => this.tweens.add({ targets: button, scale: 1.06, duration: 120 }));
    button.on('pointerout', () => this.tweens.add({ targets: button, scale: 1, duration: 120 }));
    button.on('pointerdown', () => button.setScale(0.95));
    button.on('pointerup', () => {
      button.setScale(1.06);
      onClick();
    });

    return button;
  }

  // Muestra un mensaje temporal en la parte de abajo
  private showMessage(message: string) {
    const toast = this.add
      .text(this.scale.width / 2, 690, message, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#ffffff',
        backgroundColor: '#1a1a2e',
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({
      targets: toast,
      alpha: 1,
      duration: 200,
      yoyo: true,
      hold: 1800,
      onComplete: () => toast.destroy(),
    });
  }
}
