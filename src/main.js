import Phaser from 'phaser';
import { loadSettings } from './config.js';
import { SecurityOfficeScene } from './scenes/SecurityOfficeScene.js';
import { CCTVPanel } from './ui/CCTVPanel.js';
import { MissionBoard } from './ui/MissionBoard.js';

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

const cctv = new CCTVPanel(settings.camaras.canales, settings.juego.horaDeInicio);
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
  render: { antialias: false, pixelArt: false, roundPixels: true },
  scene: [new SecurityOfficeScene(settings, cctv)],
});

window.addEventListener('beforeunload', () => {
  game.destroy(true);
  cctv.destroy();
});
