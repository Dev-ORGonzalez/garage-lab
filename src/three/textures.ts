import * as THREE from 'three';

// Texturas generadas con canvas (sin archivos de imagen)

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function toTexture(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function backgroundGradient(): THREE.CanvasTexture {
  const [c, g] = canvas(4, 512);
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#4b95ff');
  grad.addColorStop(0.55, '#1f5fd6');
  grad.addColorStop(1, '#0a2364');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 512);
  return toTexture(c);
}

// Piso a cuadros (2x2 baldosas) con brillo
export function checkerFloor(light = '#e3e7ee', dark = '#a9b1bf'): THREE.CanvasTexture {
  const [c, g] = canvas(512, 512);
  const tile = (x: number, y: number, color: string) => {
    g.fillStyle = '#8a93a3';
    g.fillRect(x, y, 256, 256);
    g.fillStyle = color;
    g.fillRect(x + 4, y + 4, 248, 248);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(x + 4, y + 4, 248, 5);
    g.fillRect(x + 4, y + 4, 5, 248);
  };
  tile(0, 0, light);
  tile(256, 256, light);
  tile(256, 0, dark);
  tile(0, 256, dark);
  const t = toTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Fachada de edificio: una celda con ventana (se repite)
export function facade(wall: string, glass = '#7fc8ff', shop = false): THREE.CanvasTexture {
  const [c, g] = canvas(128, 128);
  g.fillStyle = wall;
  g.fillRect(0, 0, 128, 128);
  if (shop) {
    g.fillStyle = '#2a3550';
    g.fillRect(8, 20, 112, 108);
    const gr = g.createLinearGradient(0, 24, 0, 128);
    gr.addColorStop(0, '#bfe6ff');
    gr.addColorStop(1, '#5aa8e0');
    g.fillStyle = gr;
    g.fillRect(14, 26, 100, 102);
  } else {
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillRect(26, 30, 80, 74);
    const gr = g.createLinearGradient(0, 26, 0, 100);
    gr.addColorStop(0, '#e6f6ff');
    gr.addColorStop(0.5, glass);
    gr.addColorStop(1, '#3d7fbf');
    g.fillStyle = gr;
    g.fillRect(30, 26, 72, 72);
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.fillRect(64, 26, 3, 72);
    g.fillStyle = 'rgba(0,0,0,0.15)';
    g.fillRect(24, 98, 84, 8);
  }
  const t = toTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Baldosa de piso con bisel suave
export function floorTile(): THREE.CanvasTexture {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#b9c1cd';
  g.fillRect(0, 0, 256, 256);
  const grad = g.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, '#eef1f6');
  grad.addColorStop(1, '#d6dce5');
  g.fillStyle = grad;
  g.fillRect(6, 6, 244, 244);
  g.fillStyle = 'rgba(255,255,255,0.6)';
  g.fillRect(6, 6, 244, 4);
  g.fillRect(6, 6, 4, 244);
  const t = toTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Franjas de seguridad amarillas y negras
export function hazardStripes(): THREE.CanvasTexture {
  const [c, g] = canvas(256, 64);
  g.fillStyle = '#ffc21a';
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = '#1a1a2e';
  for (let x = -64; x < 320; x += 48) {
    g.beginPath();
    g.moveTo(x, 64);
    g.lineTo(x + 24, 64);
    g.lineTo(x + 88, 0);
    g.lineTo(x + 64, 0);
    g.closePath();
    g.fill();
  }
  const t = toTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Puerta enrollable
export function shutter(): THREE.CanvasTexture {
  const [c, g] = canvas(256, 256);
  for (let y = 0; y < 256; y += 16) {
    const grad = g.createLinearGradient(0, y, 0, y + 16);
    grad.addColorStop(0, '#c9d0da');
    grad.addColorStop(0.7, '#a7b0bd');
    grad.addColorStop(1, '#7f8896');
    g.fillStyle = grad;
    g.fillRect(0, y, 256, 16);
  }
  return toTexture(c);
}

// Rótulo con el nombre del taller
export function sign(text: string): THREE.CanvasTexture {
  const [c, g] = canvas(1024, 256);
  g.fillStyle = '#0b1d4a';
  g.beginPath();
  g.roundRect(0, 0, 1024, 256, 40);
  g.fill();
  g.strokeStyle = '#ffc21a';
  g.lineWidth = 14;
  g.beginPath();
  g.roundRect(18, 18, 988, 220, 28);
  g.stroke();

  let size = 150;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  do {
    g.font = `${size}px "Lilita One", "Arial Black", sans-serif`;
    size -= 6;
  } while (g.measureText(text).width > 900 && size > 40);
  g.lineJoin = 'round';
  g.lineWidth = 18;
  g.strokeStyle = '#1a1a2e';
  g.strokeText(text, 512, 138);
  const grad = g.createLinearGradient(0, 70, 0, 200);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, '#bfe0ff');
  g.fillStyle = grad;
  g.fillText(text, 512, 138);
  return toTexture(c);
}

// Tablero perforado para herramientas
export function pegboard(): THREE.CanvasTexture {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#d9a066';
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#a8743f';
  for (let x = 16; x < 256; x += 24) for (let y = 16; y < 256; y += 24) {
    g.beginPath();
    g.arc(x, y, 3, 0, Math.PI * 2);
    g.fill();
  }
  return toTexture(c);
}

// Sombra suave de contacto bajo objetos
export function softShadow(): THREE.CanvasTexture {
  const [c, g] = canvas(128, 128);
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return toTexture(c);
}

// Placa del vehículo
export function plate(text: string): THREE.CanvasTexture {
  const [c, g] = canvas(256, 96);
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.roundRect(0, 0, 256, 96, 12);
  g.fill();
  g.fillStyle = '#1f6fff';
  g.fillRect(0, 0, 256, 20);
  g.fillStyle = '#1a1a2e';
  g.font = '60px "Lilita One", "Arial Black", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 128, 60);
  return toTexture(c);
}
