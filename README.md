# 03:17 — THE NIGHT SHIFT

Juego de terror psicológico 2D para navegador. En el turno inicial, un guardia contratado para una noche aparentemente normal recorre la oficina de seguridad, recibe su primera tarea y consulta tres cámaras del edificio.

## Requisitos

- Node.js 20.19 o posterior.
- pnpm 11.
- Conexión a internet durante la instalación inicial, salvo que Phaser y Vite ya estén en la caché local.

## Instalación y ejecución local

```bash
pnpm install
pnpm dev
```

Vite muestra una URL local enlazada solo a `127.0.0.1`. Abre esa dirección en el navegador. Para compilar y revisar la distribución estática:

```bash
pnpm build
pnpm preview
```

## Probar esta entrega

1. Recorre la oficina y confirma que los muros, escritorio, silla y archivador bloquean el paso.
2. Acércate a la lista de tareas del escritorio y pulsa `E`.
3. Acércate a los monitores o usa los botones del panel CCTV para cambiar entre CAM-01, CAM-02 y CAM-03. Comprueba que cambian la imagen, el identificador y la ubicación.
4. Acércate al teléfono y pulsa `E` para escuchar el mensaje de contratación.
5. Ve a la puerta al sur de la oficina, pulsa `E` y confirma que puedes salir al pasillo principal. En el pasillo puedes volver a la oficina; el archivo queda reservado para el siguiente paso.
6. Pulsa `Esc` para pausar y reanudar el movimiento.

## Controles

| Tecla | Acción |
| --- | --- |
| `W A S D` o flechas | Moverse en cuatro direcciones |
| `E` | Interactuar con un objeto o puerta cercana; junto al CCTV avanza el canal |
| `Esc` | Pausar o reanudar |
| Ratón | Seleccionar un canal CCTV |

## Ajustes (`public/settings.json`)

La aplicación carga este archivo antes de crear el juego. Si está ausente o un valor no es válido, utiliza los valores predeterminados y muestra un aviso en la interfaz.

| Sección | Control | Rango o unidades |
| --- | --- | --- |
| `juego` | Título, idioma, hora inicial y guardado futuro | Hora `HH:MM` |
| `pantalla` | Resolución lógica y ajuste al navegador | 640–1920 × 400–1200 px |
| `jugador` | Velocidad, colisión, radio de interacción y teclas | 40–500 px/s; radios en píxeles |
| `controles` | Teclas para interactuar y pausar | Nombres de tecla de Phaser |
| `visual` | Paleta, brillo, contraste, viñeta y niebla | Colores `#RRGGBB`; intensidades 0–1 |
| `animacion` | Transiciones y velocidad de animación | Milisegundos; velocidad 0.1–4 |
| `audio` | Activación y volúmenes de música, ambiente y efectos | Volumen 0–1 |
| `entidad` | Probabilidad, duración e intervalo de eventos futuros | Probabilidad 0–1; tiempos en ms |
| `misiones` | Texto, destino y estado visible de la misión inicial | Lista de objetivos |
| `camaras` | Identificador, ubicación e imagen de cada canal | Tres canales definidos |
| `edificio` | Cantidad prevista de habitaciones y mapas de transformación | Booleanos; conteo de habitaciones |
| `puzzles` | Pistas, temporizador y facilidad previstos por puzle | Pistas ≥ 0; segundos; facilidad 0–1 |
| `depuracion` | Visualización de colisiones y controles de desarrollo | Booleanos |

Los ajustes de anomalías, puzles y transformaciones están preparados para ampliaciones; no activan contenido aún no implementado.

## Estructura del proyecto

- `src/main.js`: carga de configuración y arranque de Phaser.
- `src/config.js`: valores predeterminados y validación.
- `src/scenes/SecurityOfficeScene.js`: oficina, pasillo, movimiento, colisiones y puertas.
- `src/ui/MissionBoard.js`: tarea actual y asignaciones pendientes.
- `src/ui/CCTVPanel.js`: selección de cámaras y reloj de vigilancia.
- `public/settings.json`: ajustes y contenido editable.

El progreso de esta entrega no se guarda. La tarea del archivo aparece como pendiente; no hay todavía acceso al archivo ni puzles. Esta entrega no incluye anomalías complejas ni grabaciones del pasado.

## Créditos y licencia

Los gráficos de habitaciones, guardia, mobiliario y CCTV están dibujados con formas originales; no se incorporaron recursos gráficos o de audio descargados. Consulta [CREDITS.md](CREDITS.md). El código se publica bajo licencia MIT; el titular aparece como marcador por completar en [LICENSE](LICENSE).
