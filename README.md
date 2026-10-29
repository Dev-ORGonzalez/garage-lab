# Garage LAB — Build Your Dream Garage

Videojuego web de gestión de taller automotriz y tuning, en 3D cartoon con cámara isométrica.

## Tecnologías
- **Three.js** (3D), **TypeScript** y **Vite**
- Interfaz en HTML/CSS con tipografías Lilita One y Nunito, e íconos Lucide
- Guardado local en el navegador (localStorage)

## Cómo correrlo
```bash
npm install
npm run dev      # modo desarrollo (http://localhost:5173)
npm run build    # versión para publicar (carpeta dist/)
```

## Lo que incluye este prototipo
- Taller isométrico en una esquina de la ciudad: calles, semáforos funcionando y tráfico que se detiene en rojo
- 7 vehículos ficticios originales (sedanes compactos, medianos, fastback, SUV y lujo)
- Concesionario para comprar carros y elegir cuál está en el elevador
- Personalización en vivo: pintura (12 colores, 4 acabados), aros, suspensión, tintado y sonido
- Economía, XP y niveles, con guardado automático

## Estructura
```
src/
  core/    estado del juego, economía, audio
  data/    catálogos (carros, piezas, precios)
  three/   mundo 3D: ciudad, taller, carros, personajes
  ui/      interfaz HTML (barra superior, menús, paneles)
  game/    controlador de la vista del taller
```

Todos los vehículos, personajes y marcas del juego son ficticios.
