import Phaser from 'phaser';
import { loadSettings } from './config.js';
import { SecurityOfficeScene } from './scenes/SecurityOfficeScene.js';
import { CCTVPanel } from './ui/CCTVPanel.js';
import { MissionBoard } from './ui/MissionBoard.js';
import { AudioDirector } from './audio/AudioDirector.js';

const { settings, issues } = await loadSettings();
document.title = settings.juego.nombre;
document.documentElement.style.setProperty('--page-background', settings.visual.colores.fondo);
document.documentElement.style.setProperty('--interface-text', settings.visual.colores.texto);
document.documentElement.style.setProperty('--interface-accent', settings.visual.colores.acento);

if (issues.length) {
  const warning = document.querySelector('#settings-warning');
  warning.textContent = issues.join(' ');
  warning.hidden = false;
  console.warn('Configuración inválida; se usaron valores predeterminados:', issues);
}

const audio = new AudioDirector(settings.audio);
const cctv = new CCTVPanel(settings.camaras.canales, settings.juego.horaDeInicio, audio);
new MissionBoard(settings.misiones);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: settings.pantalla.anchoLogico,
  height: settings.pantalla.altoLogico,
  backgroundColor: settings.visual.colores.fondo,
  scale: {
    mode: settings.pantalla.ajustarAlNavegador ? Phaser.Scale.FIT : Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: settings.depuracion.mostrarColisiones },
  },
  render: { antialias: false, pixelArt: true, roundPixels: true },
  scene: [new SecurityOfficeScene(settings, cctv, audio)],
});

const fullscreenButton = document.querySelector('#fullscreen-toggle');
const gameLayout = document.querySelector('.layout');
fullscreenButton.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await gameLayout.requestFullscreen();
  } catch (error) {
    console.warn('No se pudo activar la pantalla completa:', error);
  }
});
document.addEventListener('fullscreenchange', () => {
  const active = document.fullscreenElement === gameLayout;
  fullscreenButton.setAttribute('aria-label', active ? 'Salir de pantalla completa' : 'Activar pantalla completa');
  fullscreenButton.title = active ? 'Salir de pantalla completa' : 'Pantalla completa';
  requestAnimationFrame(() => {
    // Keep the full room, including the lower exit/player spawn, in view on wide displays.
    const mode = active ? Phaser.Scale.NONE : (settings.pantalla.ajustarAlNavegador ? Phaser.Scale.FIT : Phaser.Scale.NONE);
    game.scale.scaleMode = mode;
    if (mode !== Phaser.Scale.NONE) game.scale.displaySize.setAspectMode(mode);
    game.scale.refresh();
  });
});

window.addEventListener('beforeunload', () => {
  game.destroy(true);
  cctv.destroy();
  audio.destroy();
});
