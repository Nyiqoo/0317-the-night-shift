import Phaser from 'phaser';
import { NightOffice } from '../environment/NightOffice.js';

const INVESTIGATION_FILES = {
  'doc-maintenance': { title: 'Libro de mantenimiento', text: '02:51 · El supervisor dibuja una habitación ausente del plano oficial. “La puerta estaba aquí ayer”.', clue: '02:51 · El supervisor registra una habitación ausente del plano.' },
  'doc-employees': { title: 'Registro de empleados', text: 'El supervisor figura ausente desde las 02:40. Una orden firmada con su nombre a las 02:51 reporta un cambio en los planos.', clue: 'Una tarea posterior a su ausencia confirma la anomalía.' },
  'doc-surveillance': { title: 'Informe de vigilancia', text: '03:08 · Solicitud administrativa para interrumpir CCTV. El campo de ejecución está arrancado.', clue: 'La solicitud administrativa antecede al corte CCTV.' },
  'doc-note': { title: 'Nota manuscrita', text: '“Están cambiando los registros. A las 03:12 se apagaron las cámaras; la solicitud llegó antes. No fui yo quien la firmó”.', clue: '03:12 · El corte llegó después de la solicitud administrativa.' },
};

export class SecurityOfficeScene extends Phaser.Scene {
  constructor(settings, cctv, audio = null) {
    super('security-office');
    this.settings = settings;
    this.cctv = cctv;
    this.audio = audio;
  }

  init(data) {
    this.roomId = data?.room ?? 'security';
    this.spawn = data?.spawn ?? 'office';
    this.transformation = Boolean(data?.transformation);
    this.isPaused = false;
    this.interactionTargets = [];
    this.nearestTarget = null;
    this.memoryTimers = [];
  }

  create() {
    this.createTextures();
    this.nightOffice = new NightOffice(this);
    this.blockers = this.physics.add.staticGroup();
    if (this.roomId === 'security') this.drawOffice();
    else if (this.roomId === 'archive') this.drawArchive();
    else this.drawHallway();
    this.nightOffice.setEnabled(this.nightOffice.enabled);
    if (this.roomId === 'archive' && this.isPuzzleSolved()) this.revealCompartment();
    this.createPlayer();
    this.lightHalo = this.add.circle(this.player.x, this.player.y, 104, 0xc4d7a2, 0.075).setBlendMode(Phaser.BlendModes.ADD).setDepth(9);
    this.lightCore = this.add.circle(this.player.x, this.player.y, 34, 0xd7e5b7, 0.06).setBlendMode(Phaser.BlendModes.ADD).setDepth(9);
    this.createControls();
    this.isPaused = !document.querySelector('#start-screen').hidden;
    if (this.isPaused) this.physics.world.pause();
    this.interactionKeyHandler = () => this.interact();
    this.pauseKeyHandler = () => this.togglePause();
    this.ceilingLightsKeyHandler = () => {
      if (this.isPaused || this.cctv.isOpen || !this.missionPopup.hidden || !this.puzzleModal.hidden || !this.documentModal.hidden || !this.clueModal.hidden) return;
      const enabled = this.nightOffice.toggle();
      this.audio?.play('interact');
      this.showMessage(enabled ? 'Las luminarias del techo se encienden.' : 'Las luminarias del techo se apagan.');
    };
    this.input.keyboard.on(`keydown-${this.settings.controles.interactuar}`, this.interactionKeyHandler);
    this.input.keyboard.on(`keydown-${this.settings.controles.pausar}`, this.pauseKeyHandler);
    this.input.keyboard.on('keydown-L', this.ceilingLightsKeyHandler);
    this.events.once('shutdown', () => {
      this.clearDomListeners();
      this.input.keyboard.off(`keydown-${this.settings.controles.interactuar}`, this.interactionKeyHandler);
      this.input.keyboard.off(`keydown-${this.settings.controles.pausar}`, this.pauseKeyHandler);
      this.input.keyboard.off('keydown-L', this.ceilingLightsKeyHandler);
      this.game.canvas.removeEventListener('pointerdown', this.boundCanvasClick);
      this.startButton?.removeEventListener('click', this.startHandler);
      this.missionOpen?.removeEventListener('click', this.openMissionHandler);
      this.fullscreenMissionOpen?.removeEventListener('click', this.openMissionHandler);
      this.missionClose?.removeEventListener('click', this.closeMissionHandler);
      this.documentClose?.removeEventListener('click', this.closeDocumentHandler);
      this.clueClose?.removeEventListener('click', this.closeClueHandler);
      this.clueToggle?.removeEventListener('click', this.openClueHandler);
      this.puzzleClose?.removeEventListener('click', this.puzzleCloseHandler);
      this.puzzleSubmit?.removeEventListener('click', this.puzzleSubmitHandler);
      window.clearTimeout(this.puzzleTimer);
      this.memoryTimers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(this.messageTimer);
    });
    this.cctv.setEnabled(this.roomId === 'security');
    this.updateRoomLabel();
    if (this.roomId === 'hallway') this.showMessage('El pasillo une la oficina de seguridad con el archivo administrativo.');
    if (this.roomId === 'archive') this.showMessage('El archivo huele a papel húmedo y polvo. Algunas cajas llevan años sin abrirse.');
    if (this.roomId === 'security') this.scheduleMessageFade();
    if (this.transformation) this.playArchitectureShift();
  }

  createTextures() {
    if (this.textures.exists('pixel')) return;
    const art = this.make.graphics({ x: 0, y: 0, add: false });
    art.fillStyle(0xffffff, 1);
    art.fillRect(0, 0, 2, 2);
    art.generateTexture('pixel', 2, 2);
    art.clear();
    art.fillStyle(0x101715, 0.65);
    art.fillEllipse(17, 29, 24, 10);
    art.fillStyle(0xd0c6a8, 1);
    art.fillCircle(17, 14, 11);
    art.fillStyle(0x829486, 1);
    art.fillTriangle(7, 22, 27, 22, 17, 36);
    art.fillStyle(0xb8a36e, 1);
    art.fillEllipse(17, 7, 21, 8);
    art.generateTexture('night-guard', 34, 40);
    art.destroy();
  }

  drawFloor(label) {
    const { anchoLogico: width, altoLogico: height } = this.settings.pantalla;
    const palette = this.settings.visual.colores;
    const art = this.add.graphics();
    art.fillStyle(Phaser.Display.Color.HexStringToColor(palette.piso).color, 1);
    art.fillPoints([
      { x: 70, y: 84 }, { x: width - 70, y: 84 },
      { x: width - 70, y: height - 52 }, { x: 70, y: height - 52 },
    ], true);
    for (let row = 0, y = 99; y < height - 62; row++, y += 43) {
      for (let col = 0, x = 84; x < width - 80; col++, x += 54) {
        const color = (row + col) % 2 ? palette.baldosaClara : palette.baldosaOscura;
        art.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 0.46);
        art.fillPoints([
          { x, y }, { x: x + 49, y: y + 1 },
          { x: x + 51, y: y + 39 }, { x: x + 2, y: y + 41 },
        ], true);
      }
    }
    this.add.text(96, 122, label.toUpperCase(), {
      fontFamily: 'monospace', fontSize: '11px', color: palette.acento, letterSpacing: 2,
    }).setAlpha(0.86);
    this.add.line(96, 142, 0, 0, 230, 0, 0xced5c4, 0.18).setOrigin(0, 0);
  }

  addWall(x, y, width, height, color = this.settings.visual.colores.muro) {
    const horizontal = width >= height;
    const face = Phaser.Display.Color.HexStringToColor(color).color;
    this.add.rectangle(x, y + 5, width + 4, height + 5, 0x05090b, 0.48).setDepth(4);
    this.add.rectangle(x, y, width, height, face).setDepth(5);
    if (horizontal) {
      this.add.rectangle(x, y - height * 0.32, width - 4, 2, 0xd4d8c8, 0.22).setDepth(6);
      this.add.rectangle(x, y + height * 0.32, width - 4, 4, 0x26302e, 0.62).setDepth(6);
    } else {
      this.add.rectangle(x - width * 0.32, y, 4, height - 4, 0xd4d8c8, 0.2).setDepth(6);
      this.add.rectangle(x + width * 0.32, y, 4, height - 4, 0x26302e, 0.62).setDepth(6);
    }
    const blocker = this.blockers.create(x, y, 'pixel').setDisplaySize(width, height).refreshBody();
    blocker.setVisible(false);
  }

  drawDoorFrame(x, y, { width = 172, opensDown = true } = {}) {
    const outsideY = y + (opensDown ? 16 : -16);
    const insideY = y + (opensDown ? -16 : 16);
    const frame = 7;
    this.add.rectangle(x - width / 2, y, frame, 38, 0x927b57).setStrokeStyle(1, 0xc3ad82, 0.65).setDepth(7);
    this.add.rectangle(x + width / 2, y, frame, 38, 0x927b57).setStrokeStyle(1, 0xc3ad82, 0.65).setDepth(7);
    this.add.rectangle(x, outsideY, width + frame, 6, 0xb49a6c).setDepth(7);
    this.add.rectangle(x, insideY, width - 10, 3, 0xc1a675, 0.78).setDepth(7);
    this.add.rectangle(x, insideY, width - 14, 1, 0xe3d3aa, 0.28).setDepth(8);
  }

  addObstacle(x, y, width, height, color, label = '') {
    this.add.rectangle(x, y + 4, width + 10, height + 10, 0x0a1110, 0.35).setDepth(2);
    this.add.rectangle(x, y, width, height, Phaser.Display.Color.HexStringToColor(color).color)
      .setStrokeStyle(2, 0x101715, 0.82).setDepth(3);
    if (label) {
      this.add.text(x, y + height / 2 + 8, label.toUpperCase(), {
        fontFamily: 'monospace', fontSize: '8px', color: this.settings.visual.colores.texto, letterSpacing: 1,
      }).setOrigin(0.5, 0).setDepth(4).setAlpha(0.6);
    }
    const blocker = this.blockers.create(x, y, 'pixel').setDisplaySize(width, height).refreshBody();
    blocker.setVisible(false);
    return blocker;
  }

  drawWallClock(x, y, textColor) {
    this.add.rectangle(x, y, 78, 82, 0x29322f).setStrokeStyle(2, 0x79847a, 0.68).setDepth(4);
    this.add.circle(x, y - 3, 31, 0x111917).setStrokeStyle(3, 0x9ca58e, 0.84).setDepth(5);
    this.add.circle(x, y - 3, 26, 0xb6b69d, 0.96).setStrokeStyle(1, 0x313a33, 0.86).setDepth(6);
    const faceY = y - 3;
    for (let tick = 0; tick < 12; tick++) {
      const angle = (tick * Math.PI) / 6;
      const outer = 22;
      const inner = tick % 3 === 0 ? 17 : 19;
      this.add.line(
        x + Math.sin(angle) * inner, faceY - Math.cos(angle) * inner,
        0, 0,
        Math.sin(angle) * (outer - inner), -Math.cos(angle) * (outer - inner),
        0x364039, 0.85,
      ).setLineWidth(tick % 3 === 0 ? 2 : 1).setDepth(7);
    }
    // 03:23: the minute hand points to 23 and the hour hand sits just past 3.
    const minuteAngle = (23 * Math.PI) / 30;
    const hourAngle = (3 * Math.PI) / 6 + (23 * Math.PI) / 360;
    this.add.line(x, faceY, 0, 0, Math.sin(hourAngle) * 12, -Math.cos(hourAngle) * 12, 0x28332d, 1)
      .setLineWidth(3).setDepth(8);
    this.add.line(x, faceY, 0, 0, Math.sin(minuteAngle) * 21, -Math.cos(minuteAngle) * 21, 0x3b483e, 1)
      .setLineWidth(2).setDepth(8);
    this.add.circle(x, faceY, 3, 0x8d6747).setDepth(9);
    this.add.text(x, y + 38, '03:23', { fontFamily: 'monospace', fontSize: '9px', color: textColor })
      .setOrigin(0.5).setDepth(6).setAlpha(0.85);
  }

  addTarget(kind, x, y, prompt, message) {
    this.interactionTargets.push({ kind, x, y, prompt, message });
    if (this.roomId !== 'security') {
      this.add.circle(x, y - 24, 9, 0x111916, 0.88).setStrokeStyle(1, 0xc5b585, 0.88).setDepth(12);
      this.add.text(x, y - 24, 'E', {
        fontFamily: 'monospace', fontSize: '9px', color: '#e6d8ad', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(13);
    }
  }

  drawOffice() {
    const { anchoLogico: width, altoLogico: height } = this.settings.pantalla;
    const colors = this.settings.visual.colores;
    this.cameras.main.setBackgroundColor(colors.fondo);
    this.drawFloor('Oficina de seguridad');
    const doorLeft = width / 2 - 82;
    const doorRight = width / 2 + 82;
    const wallLeft = 53;
    const wallRight = width - 53;
    const wallTop = 82;
    const wallBottom = height - 52;
    const sideHeight = wallBottom - wallTop + 34;
    const sideCenterY = (wallTop + wallBottom) / 2;
    this.addWall(width / 2, wallTop, wallRight - wallLeft, 34);
    this.addWall(70, sideCenterY, 34, sideHeight);
    this.addWall(width - 70, sideCenterY, 34, sideHeight);
    this.addWall((wallLeft + doorLeft) / 2, wallBottom, doorLeft - wallLeft, 34);
    this.addWall((doorRight + wallRight) / 2, wallBottom, wallRight - doorRight, 34);
    this.drawDoorFrame(width / 2, height - 52, { width: 164, opensDown: true });
    this.add.text(width / 2, height - 27, 'PUERTA · PASILLO PRINCIPAL', {
      fontFamily: 'monospace', fontSize: '8px', color: colors.texto, letterSpacing: 1,
    }).setOrigin(0.5, 0).setDepth(6).setAlpha(0.7);
    this.addTarget('office-exit', width / 2, height - 62, 'Salir al pasillo principal', 'La puerta de seguridad se abre hacia el pasillo.');

    this.drawWallClock(792, 158, colors.texto);
    this.nightOffice.addCeilingLamp(330, 145, { spreadX: 230, spreadY: 180 });
    this.nightOffice.addCeilingLamp(650, 145, { spreadX: 230, spreadY: 180 });

    this.addObstacle(174, 220, 122, 132, '#45544c', 'Archivador');
    this.add.rectangle(174, 215, 96, 7, 0xb29b72).setDepth(4);
    this.add.text(174, 227, 'MANTENIMIENTO', { fontFamily: 'monospace', fontSize: '7px', color: '#d6c49f' }).setOrigin(0.5).setDepth(5);
    this.addObstacle(800, 420, 70, 92, '#415047', 'Planta');
    this.add.ellipse(800, 382, 70, 48, 0x586d55).setDepth(4);
    this.add.line(800, 382, 0, 0, 0, 53, 0x9aa37c, 0.7).setDepth(5);

    this.add.rectangle(width / 2, 210, 380, 84, 0x111b1a).setStrokeStyle(3, 0x728378, 0.72).setDepth(4);
    for (const [index, x] of [width / 2 - 112, width / 2, width / 2 + 112].entries()) {
      this.add.rectangle(x, 204, 94, 55, 0x182723).setStrokeStyle(2, index === this.cctv.selectedIndex ? 0xb5c8a9 : 0x66786e, 0.8).setDepth(5);
      this.add.rectangle(x, 204, 80, 41, index === this.cctv.selectedIndex ? 0x557062 : 0x405b51, 0.92).setDepth(6);
      this.add.line(x - 34, 204, 0, 0, 68, 0, 0xc8d2b4, 0.2).setDepth(7);
      this.add.text(x, 239, `CAM-${String(index + 1).padStart(2, '0')}`, { fontFamily: 'monospace', fontSize: '7px', color: '#c3d5bc' }).setOrigin(0.5).setDepth(7);
    }
    this.addTarget('cctv', width / 2, 260, 'Consultar monitores CCTV', 'El selector del monitor cambia entre las tres cámaras disponibles. Pulsa E para pasar al canal siguiente.');

    this.addObstacle(width / 2, 344, 430, 100, colors.muebles, 'Escritorio de seguridad');
    this.add.rectangle(width / 2, 298, 416, 8, 0xa38c66).setDepth(4);
    this.add.rectangle(398, 322, 76, 48, 0xd6d2bf).setStrokeStyle(1, 0x536158, 0.8).setDepth(5);
    this.add.text(398, 317, 'Tarea para la casa\ny tarea se fué', {
      fontFamily: 'monospace', fontSize: '6px', color: '#526154', align: 'center', lineSpacing: 1,
    }).setOrigin(0.5).setDepth(6);
    this.add.line(372, 327, 0, 0, 52, 0, 0x59675e, 0.5).setDepth(6);
    this.add.line(372, 335, 0, 0, 43, 0, 0x59675e, 0.5).setDepth(6);
    this.add.rectangle(560, 326, 45, 36, 0x2b3632).setStrokeStyle(2, 0x9ca791, 0.7).setDepth(5);
    this.add.circle(560, 322, 9, 0x131b1a).setStrokeStyle(2, 0xb1b79b, 0.7).setDepth(6);
    this.add.text(560, 351, 'TELÉFONO', { fontFamily: 'monospace', fontSize: '6px', color: colors.texto }).setOrigin(0.5).setDepth(6).setAlpha(0.7);
    this.add.ellipse(482, 319, 34, 13, 0xb99d70).setStrokeStyle(1, 0xdbc99b, 0.75).setDepth(5);
    this.add.ellipse(482, 319, 23, 7, 0x874d3c).setDepth(6);
    this.add.ellipse(476, 318, 7, 5, 0x81966b).setDepth(7);
    this.add.ellipse(484, 318, 7, 5, 0x8ea576).setDepth(7);
    this.add.ellipse(491, 318, 6, 4, 0x81966b).setDepth(7);
    this.add.line(474, 316, 0, 0, 16, 2, 0xe5dec1, 0.94).setLineWidth(2).setDepth(8);
    this.addTarget('tasks', 398, 393, 'Revisar la nota de la tarea', 'La primera tarea está activa: revisa el archivo administrativo y localiza el expediente del antiguo supervisor.');
    this.addTarget('phone', 560, 393, 'Escuchar el teléfono', 'Mensaje de contratación: “Gracias por aceptar el turno. La tarea de esta noche es sencilla: revisa la oficina y reporta cualquier falla”.');

    this.addObstacle(width / 2, 463, 68, 52, '#56635a', 'Silla');
    this.add.rectangle(width / 2, 437, 78, 13, 0x839080).setDepth(4);
    this.add.line(width / 2, 488, 0, 0, 0, 17, 0x7b8777, 0.9).setDepth(5);
    this.physics.world.setBounds(76, 104, width - 152, height - 170);
  }

  drawHallway() {
    const { anchoLogico: width, altoLogico: height } = this.settings.pantalla;
    const colors = this.settings.visual.colores;
    this.cameras.main.setBackgroundColor(colors.fondo);
    this.drawFloor('Pasillo principal');
    const doorwayLeft = width / 2 - 86;
    const doorwayRight = width / 2 + 86;
    const wallLeft = 53;
    const wallRight = width - 53;
    const wallTop = 82;
    const wallBottom = height - 52;
    const sideHeight = wallBottom - wallTop + 34;
    const sideCenterY = (wallTop + wallBottom) / 2;
    this.addWall((wallLeft + doorwayLeft) / 2, wallTop, doorwayLeft - wallLeft, 34);
    this.addWall((doorwayRight + wallRight) / 2, wallTop, wallRight - doorwayRight, 34);
    this.addWall(70, sideCenterY, 34, sideHeight);
    this.addWall(width - 70, sideCenterY, 34, sideHeight);
    this.addWall((wallLeft + doorwayLeft) / 2, wallBottom, doorwayLeft - wallLeft, 34);
    this.addWall((doorwayRight + wallRight) / 2, wallBottom, wallRight - doorwayRight, 34);

    this.drawDoorFrame(width / 2, 82, { width: 172, opensDown: false });
    this.add.text(width / 2, 104, 'OFICINA DE SEGURIDAD', { fontFamily: 'monospace', fontSize: '8px', color: colors.texto, letterSpacing: 1 }).setOrigin(0.5).setDepth(6);
    this.addTarget('hall-office', width / 2, 118, 'Volver a la oficina de seguridad', 'La oficina sigue conectada al pasillo.');

    this.drawDoorFrame(width / 2, height - 52, { width: 172, opensDown: true });
    this.add.text(width / 2, height - 28, 'ARCHIVO ADMINISTRATIVO', { fontFamily: 'monospace', fontSize: '8px', color: colors.texto, letterSpacing: 1 }).setOrigin(0.5, 0).setDepth(6);
    this.addTarget('hall-archive', width / 2, height - 64, 'Entrar al archivo administrativo', 'La puerta cede con un quejido. El polvo del otro lado lleva tiempo sin moverse.');

    for (const [index, y] of [185, 310, 435].entries()) {
      this.add.rectangle(150, y, 96, 17, 0x48554e).setStrokeStyle(1, 0x78847a, 0.45).setDepth(3);
      this.add.rectangle(width - 150, y, 96, 17, 0x48554e).setStrokeStyle(1, 0x78847a, 0.45).setDepth(3);
      this.add.rectangle(150, y - 14, 78, 5, 0x9f956f, 0.65).setDepth(4);
      this.add.rectangle(width - 150, y - 14, 78, 5, 0x9f956f, 0.65).setDepth(4);
      this.add.line(width / 2, y, 0, 0, width / 2 - 202, 0, 0xd2d6c0, 0.11).setDepth(2);
      this.add.text(150, y - 34, ['CONTABILIDAD', 'SALA DE DESCANSO', 'SERVIDORES'][index], {
        fontFamily: 'monospace', fontSize: '7px', color: colors.texto, letterSpacing: 1,
      }).setOrigin(0.5).setDepth(4).setAlpha(0.54);
    }
    this.drawFluorescent(480, 164);
    this.drawFluorescent(480, 340);
    this.addObstacle(250, 348, 74, 34, '#4b5149', 'Carro de limpieza');
    this.add.rectangle(250, 326, 40, 5, 0xc1c5b4, 0.72).setDepth(4);
    this.addTarget('hall-cart', 278, 398, 'Revisar carro de limpieza', 'Un registro de rondas quedó atrapado bajo el carro. Las últimas dos casillas están vacías.');
    this.add.rectangle(690, 465, 56, 12, 0xc9c3ac).setAngle(-8).setDepth(3);
    this.add.text(690, 465, 'RONDA 04', { fontFamily: 'monospace', fontSize: '6px', color: '#39423b' }).setOrigin(0.5).setDepth(4);
    this.addTarget('hall-log', 690, 430, 'Leer registro de ronda', 'El registro termina a mitad de una frase. La última firma no coincide con las anteriores.');
    this.physics.world.setBounds(76, 104, width - 152, height - 170);
  }

  drawFluorescent(x, y) {
    this.nightOffice.addCeilingLamp(x, y, { width: 126, spreadX: 320, spreadY: 120 });
  }

  drawArchive() {
    const { anchoLogico: width, altoLogico: height } = this.settings.pantalla;
    const colors = this.settings.visual.colores;
    this.cameras.main.setBackgroundColor(colors.fondo);
    this.drawFloor('Archivo administrativo');
    this.nightOffice.addCeilingLamp(330, 145, { spreadX: 250, spreadY: 185 });
    this.nightOffice.addCeilingLamp(660, 145, { spreadX: 250, spreadY: 185 });

    const doorLeft = width / 2 - 86;
    const doorRight = width / 2 + 86;
    const wallLeft = 53;
    const wallRight = width - 53;
    const wallTop = 82;
    const wallBottom = height - 52;
    const sideHeight = wallBottom - wallTop + 34;
    const sideCenterY = (wallTop + wallBottom) / 2;
    this.addWall((wallLeft + doorLeft) / 2, wallTop, doorLeft - wallLeft, 34);
    this.addWall((doorRight + wallRight) / 2, wallTop, wallRight - doorRight, 34);
    this.addWall(70, sideCenterY, 34, sideHeight);
    this.addWall(width - 70, sideCenterY, 34, sideHeight);
    this.addWall(width / 2, wallBottom, wallRight - wallLeft, 34);
    this.drawDoorFrame(width / 2, 82, { width: 172, opensDown: false });
    this.add.text(width / 2, 102, 'PASILLO PRINCIPAL', {
      fontFamily: 'monospace', fontSize: '8px', color: colors.texto, letterSpacing: 1,
    }).setOrigin(0.5).setDepth(6).setAlpha(0.72);
    this.addTarget('archive-exit', width / 2, 122, 'Volver al pasillo principal', 'La puerta del archivo se abre al pasillo.');

    const papers = [
      ['doc-maintenance', 322, 344, 'Libro de mantenimiento'],
      ['doc-employees', 800, 310, 'Registro de empleados'],
      ['doc-surveillance', 580, 500, 'Informe de vigilancia'],
      ['doc-note', 700, 150, 'Nota manuscrita'],
    ];
    for (const [kind, x, y, title] of papers) {
      this.add.rectangle(x, y, 35, 22, 0xc4b99b).setAngle((x % 5) - 2).setDepth(5);
      this.add.text(x, y, title.split(' ').map((word) => word[0]).join('').slice(0, 3), { fontFamily: 'monospace', fontSize: '6px', color: '#33382f' }).setOrigin(0.5).setDepth(6);
      this.addTarget(kind, x, y + 34, `Leer ${title.toLowerCase()}`, '');
    }

    // Rows stay beside the walking lanes; each drawer can be inspected from the open side.
    this.addObstacle(170, 225, 84, 112, '#48564d', 'Archivador A');
    this.addObstacle(790, 225, 84, 112, '#48564d', 'Archivador B');
    this.addObstacle(170, 438, 84, 112, '#48564d', 'Archivador C');
    this.addTarget('cabinet-a', 230, 225, 'Revisar archivador A', 'Carpetas por año. Varias etiquetas están raspadas; el índice salta de 2012 a 2015.');
    this.addTarget('cabinet-b', 730, 225, 'Revisar archivador B', 'Una ficha de personal anota: “Supervisor nocturno — no localizado tras la última guardia”. La casilla de reemplazo está vacía.');
    this.addTarget('cabinet-c', 230, 438, 'Revisar archivador C', 'Los cajones están atascados por el peso del papel. Una carpeta asoma unos centímetros, sin rótulo legible.');

    this.addObstacle(480, 266, 68, 104, '#4e5b50', 'Módulo mecánico');
    this.add.rectangle(480, 216, 52, 12, 0x7b8671).setStrokeStyle(1, 0xc0c6ad, 0.6).setDepth(5);
    for (let i = 0; i < 3; i++) {
      this.add.rectangle(466 + i * 14, 216, 9, 9, 0x222b28).setStrokeStyle(1, 0xb3aa8d, 0.52).setDepth(6);
    }
    this.addTarget('mechanical-cabinet', 480, 337, 'Inspeccionar archivador mecánico', 'Tres ruedas numeradas y una cerradura sin llave. El mecanismo no cede; habrá que volver con más información.');

    this.addObstacle(656, 372, 182, 60, '#48534a', 'Escritorio');
    this.add.rectangle(635, 355, 38, 22, 0xd0cbb7).setAngle(4).setDepth(5);
    this.add.line(623, 352, 0, 0, 20, 0, 0x62675b, 0.68).setDepth(6);
    this.add.line(623, 358, 0, 0, 17, 0, 0x62675b, 0.68).setDepth(6);
    this.add.rectangle(679, 350, 25, 17, 0xc1b18e).setAngle(-5).setDepth(5);
    this.add.text(635, 357, 'REPORTE 04', { fontFamily: 'monospace', fontSize: '5px', color: '#3f493f' }).setOrigin(0.5).setDepth(6);
    this.addTarget('documents', 656, 420, 'Leer documentos del escritorio', 'El reporte de mantenimiento está incompleto. En el margen: “consultar al supervisor anterior”; la línea siguiente está arrancada.');

    this.add.rectangle(360, 454, 78, 42, 0x3a4038).setStrokeStyle(2, 0x8c907d, 0.62).setDepth(4);
    this.add.rectangle(360, 448, 66, 30, 0xc0b899).setDepth(5);
    this.add.text(360, 448, 'EXP. 14', { fontFamily: 'monospace', fontSize: '7px', color: '#3b443d' }).setOrigin(0.5).setDepth(6);
    this.addTarget('folder', 360, 494, 'Abrir carpeta sin rótulo', 'La mitad del texto está corrida por la humedad. Solo se alcanza a leer “turno nocturno” y un número de expediente borrado.');

    this.addObstacle(690, 492, 92, 44, '#3d4841', 'Terminal antiguo');
    this.add.rectangle(690, 474, 60, 22, 0x192321).setStrokeStyle(2, 0x849080, 0.68).setDepth(5);
    this.add.rectangle(690, 474, 49, 13, 0x91a38a, 0.3).setDepth(6);
    this.add.text(690, 474, 'SIN SEÑAL', { fontFamily: 'monospace', fontSize: '5px', color: '#c9d1b8' }).setOrigin(0.5).setDepth(7);
    this.addTarget('terminal', 690, 536, 'Examinar terminal antiguo', 'El terminal muestra un índice de registros incompleto. El último acceso local figura como “usuario desconocido”.');

    this.add.text(350, 169, 'CAJAS PENDIENTES DE CATALOGAR', {
      fontFamily: 'monospace', fontSize: '7px', color: colors.texto, letterSpacing: 1,
    }).setOrigin(0.5).setDepth(4).setAlpha(0.5);
    this.add.rectangle(350, 189, 118, 30, 0x5b5b4b, 0.64).setStrokeStyle(1, 0x92917a, 0.5).setDepth(3);
    this.add.rectangle(350, 189, 99, 5, 0xb9ae90, 0.66).setDepth(4);
    this.addTarget('old-records', 350, 230, 'Revisar caja de registros antiguos', 'Las hojas están fuera de orden. Una lista de guardias se corta después de la entrada del supervisor anterior.');
    this.physics.world.setBounds(76, 104, width - 152, height - 170);
  }

  createPlayer() {
    const { anchoLogico: width, altoLogico: height } = this.settings.pantalla;
    const startY = this.roomId === 'security'
      ? height - 116
      : this.roomId === 'hallway' && this.spawn === 'archive' ? height - 116 : 143;
    this.player = this.physics.add.sprite(width / 2, startY, 'night-guard');
    this.player.setDepth(10).setCollideWorldBounds(true);
    this.player.setCircle(this.settings.jugador.radioDeColision, 17 - this.settings.jugador.radioDeColision, 20 - this.settings.jugador.radioDeColision);
    this.player.setDrag(1200, 1200).setMaxVelocity(this.settings.jugador.velocidad);
    this.physics.add.collider(this.player, this.blockers);
  }

  createControls() {
    const keyNames = Object.values(this.settings.jugador.teclas).flat();
    this.keys = this.input.keyboard.addKeys([...new Set(keyNames)].join(','));
    this.messageElement = document.querySelector('#game-message');
    this.promptElement = document.querySelector('#interaction-prompt');
    this.pauseElement = document.querySelector('#pause-overlay');
    this.startScreen = document.querySelector('#start-screen');
    this.missionPopup = document.querySelector('#mission-popup');
    this.startButton = document.querySelector('#start-button');
    this.missionOpen = document.querySelector('#mission-open');
    this.fullscreenMissionOpen = document.querySelector('#fullscreen-mission-open');
    this.missionClose = document.querySelector('#mission-close');
    this.playerLight = document.querySelector('.player-light');
    this.documentModal = document.querySelector('#document-modal');
    this.documentTitle = document.querySelector('#document-title');
    this.documentText = document.querySelector('#document-text');
    this.documentProgress = document.querySelector('#document-progress');
    this.documentClose = document.querySelector('#document-close');
    this.clueToggle = document.querySelector('#clue-toggle');
    this.clueModal = document.querySelector('#clue-modal');
    this.clueList = document.querySelector('#clue-list');
    this.clueCount = document.querySelector('#clue-count');
    this.clueClose = document.querySelector('#clue-close');
    this.puzzleModal = document.querySelector('#puzzle-modal');
    this.puzzleClose = document.querySelector('#puzzle-close');
    this.puzzleFeedback = document.querySelector('#puzzle-feedback');
    this.puzzleSlots = [1, 2, 3].map((n) => document.querySelector(`#slot-${n}`));
    this.memoryOverlay = document.querySelector('#memory-overlay');
    this.startHandler = () => { this.startScreen.hidden = true; this.isPaused = false; this.physics.world.resume(); this.audio?.start(); this.game.canvas.focus(); };
    this.openMissionHandler = () => { this.missionPopup.hidden = false; this.game.canvas.focus(); };
    this.closeMissionHandler = () => { this.missionPopup.hidden = true; this.game.canvas.focus(); };
    this.startButton.addEventListener('click', this.startHandler);
    this.missionOpen.addEventListener('click', this.openMissionHandler);
    this.fullscreenMissionOpen.addEventListener('click', this.openMissionHandler);
    this.missionClose.addEventListener('click', this.closeMissionHandler);
    this.documentCloseHandler = () => this.closeReading();
    this.clueCloseHandler = () => { this.clueModal.hidden = true; this.physics.world.resume(); this.game.canvas.focus(); };
    this.openClueHandler = () => { this.clueModal.hidden = false; this.physics.world.pause(); this.game.canvas.focus(); };
    this.documentClose.addEventListener('click', this.documentCloseHandler);
    this.clueClose.addEventListener('click', this.clueCloseHandler);
    this.clueToggle.addEventListener('click', this.openClueHandler);
    this.puzzleCloseHandler = () => { this.puzzleModal.hidden = true; this.physics.world.resume(); this.game.canvas.focus(); };
    this.puzzleClose.addEventListener('click', this.puzzleCloseHandler);
    this.puzzleSubmit = document.querySelector('#puzzle-submit');
    this.puzzleSubmitHandler = () => this.checkPuzzle();
    this.puzzleSubmit.addEventListener('click', this.puzzleSubmitHandler);
    const cards = ['Anomalía en los planos', 'Solicitud administrativa de corte CCTV', 'Registro de desactivación del sistema'];
    this.puzzleSlots.forEach((select) => { select.replaceChildren(new Option('Seleccionar tarjeta…', '')); cards.forEach((label, i) => select.add(new Option(label, String(i + 1)))); });
    this.clueToggle.hidden = this.roomId !== 'archive';
    this.refreshClues();
    this.boundCanvasClick = () => this.game.canvas.focus();
    this.game.canvas.setAttribute('tabindex', '0');
    this.game.canvas.setAttribute('aria-label', 'Juego cenital. Usa WASD o flechas para moverte.');
    this.game.canvas.addEventListener('pointerdown', this.boundCanvasClick);
  }

  clearDomListeners() {
    if (this.boundCanvasClick) this.game.canvas.removeEventListener('pointerdown', this.boundCanvasClick);
  }

  update() {
    if (!this.player || this.isPaused) return;
    const speed = this.settings.jugador.velocidad;
    let x = 0;
    let y = 0;
    const pressed = (names) => names.some((name) => this.keys[name]?.isDown);
    if (pressed(this.settings.jugador.teclas.izquierda)) x -= 1;
    if (pressed(this.settings.jugador.teclas.derecha)) x += 1;
    if (pressed(this.settings.jugador.teclas.arriba)) y -= 1;
    if (pressed(this.settings.jugador.teclas.abajo)) y += 1;
    const length = Math.hypot(x, y) || 1;
    this.player.setVelocity((x / length) * speed, (y / length) * speed);
    this.lightHalo?.setPosition(this.player.x, this.player.y);
    this.lightCore?.setPosition(this.player.x, this.player.y);
    if (this.playerLight) {
      const sx = this.game.canvas.clientWidth / this.settings.pantalla.anchoLogico;
      const sy = this.game.canvas.clientHeight / this.settings.pantalla.altoLogico;
      this.playerLight.style.left = `${this.player.x * sx}px`;
      this.playerLight.style.top = `${this.player.y * sy}px`;
      this.playerLight.style.setProperty('--halo-size', `${224 * Math.max(sx, sy)}px`);
      this.playerLight.style.setProperty('--light-x', `${this.player.x * sx}px`);
      this.playerLight.style.setProperty('--light-y', `${this.player.y * sy}px`);
    }

    this.nearestTarget = null;
    let nearestDistance = this.settings.jugador.radioDeInteraccion;
    for (const target of this.interactionTargets) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        this.nearestTarget = target;
      }
    }
    if (this.nearestTarget) {
      this.promptElement.textContent = `${this.nearestTarget.prompt} · ${this.settings.controles.interactuar}`;
      this.promptElement.hidden = false;
    } else this.promptElement.hidden = true;
  }

  interact() {
    if (this.isPaused || this.cctv.isOpen || !this.puzzleModal.hidden || !this.documentModal.hidden || !this.clueModal.hidden) return;
    const target = this.nearestTarget;
    if (!target) {
      this.showMessage('No hay nada al alcance. Acércate a un objeto o a una puerta.');
      return;
    }
    if (INVESTIGATION_FILES[target.kind]) {
      this.audio?.play('paper');
      this.openReading(target.kind);
      return;
    }
    this.audio?.play('interact');
    if (target.kind === 'office-exit') {
      this.scene.restart({ room: 'hallway', spawn: 'office' });
      return;
    }
    if (target.kind === 'hall-office') {
      this.scene.restart({ room: 'security' });
      return;
    }
    if (target.kind === 'hall-archive') {
      this.scene.restart({ room: 'archive' });
      return;
    }
    if (target.kind === 'archive-exit') {
      const transform = sessionStorage.getItem('night-shift-manifestation') === '1'
        && sessionStorage.getItem('night-shift-transformation') !== '1';
      if (transform) sessionStorage.setItem('night-shift-transformation', '1');
      this.scene.restart({ room: 'hallway', spawn: 'archive', transformation: transform });
      return;
    }
    if (target.kind === 'mechanical-cabinet') { this.openPuzzle(); return; }
    if (target.kind === 'hidden-compartment') { this.openOriginalReport(); return; }
    if (target.kind === 'cctv') { this.cctv.open(); this.physics.world.pause(); return; }
    this.showMessage(target.message);
  }

  togglePause() {
    if (this.puzzleModal && !this.puzzleModal.hidden) { this.puzzleCloseHandler(); return; }
    if (this.cctv.isOpen) { this.cctv.close(); this.physics.world.resume(); return; }
    if (!this.documentModal?.hidden) { this.closeReading(); return; }
    if (!this.clueModal?.hidden) { this.clueCloseHandler(); return; }
    if (!this.missionPopup?.hidden) { this.closeMissionHandler(); return; }
    if (!this.startScreen?.hidden) return;
    this.isPaused = !this.isPaused;
    if (this.isPaused) this.physics.world.pause();
    else this.physics.world.resume();
    this.pauseElement.hidden = !this.isPaused;
    if (this.isPaused) {
      this.player.setVelocity(0, 0);
      this.promptElement.hidden = true;
      this.showMessage('El turno está en pausa.');
    } else this.showMessage('El turno continúa.');
    this.game.canvas.focus();
  }

  openReading(id) {
    const record = INVESTIGATION_FILES[id];
    const found = this.getFoundClues();
    if (!found[id]) {
      found[id] = record.clue;
      sessionStorage.setItem('night-shift-clues', JSON.stringify(found));
      this.refreshClues();
    }
    this.documentTitle.textContent = record.title;
    this.documentText.textContent = id === 'doc-note' && sessionStorage.getItem('night-shift-manifestation') === '1'
      ? `${record.text}\n\n«Todavía recuerdas cómo apagar las cámaras. ¿Recuerdas por qué lo hiciste?»`
      : record.text;
    this.documentProgress.textContent = `Documento examinado · ${Object.keys(found).length}/4 pistas`;
    this.documentModal.hidden = false;
    this.physics.world.pause();
    this.game.canvas.focus();
  }

  closeReading() { this.documentModal.hidden = true; this.physics.world.resume(); this.game.canvas.focus(); }

  getFoundClues() {
    try { return JSON.parse(sessionStorage.getItem('night-shift-clues') || '{}'); } catch { return {}; }
  }

  refreshClues() {
    if (!this.clueList) return;
    const found = this.getFoundClues();
    this.clueList.replaceChildren();
    Object.values(found).forEach((clue) => { const item = document.createElement('li'); item.textContent = clue; this.clueList.append(item); });
    this.clueCount.textContent = `${Object.keys(found).length}/4`;
  }

  isPuzzleSolved() { return sessionStorage.getItem('night-shift-puzzle-solved') === '1'; }

  openPuzzle() {
    if (this.isPuzzleSolved()) { this.showMessage('El mecanismo ya está abierto.'); return; }
    if (Object.keys(this.getFoundClues()).length < 4) { this.showMessage('El archivador requiere las cuatro pistas del archivo.'); return; }
    this.puzzleFeedback.textContent = '';
    this.puzzleModal.hidden = false;
    this.physics.world.pause();
  }

  puzzleSound(success) {
    this.audio?.play(success ? 'mechanism' : 'error');
  }

  checkPuzzle() {
    const order = this.puzzleSlots.map((slot) => slot.value);
    if (order.includes('')) { this.puzzleFeedback.textContent = 'Coloca una tarjeta en cada espacio.'; return; }
    if (order.join(',') !== '1,2,3') {
      this.puzzleFeedback.textContent = 'Ese orden contradice las horas registradas. Puedes volver a intentarlo.';
      this.puzzleSound(false); return;
    }
    sessionStorage.setItem('night-shift-puzzle-solved', '1');
    this.puzzleSound(true);
    this.puzzleFeedback.textContent = 'Las ruedas encajan. El mecanismo se abre…';
    this.puzzleModal.classList.add('mechanism-opening');
    this.puzzleTimer = window.setTimeout(() => {
      this.puzzleModal.classList.remove('mechanism-opening');
      this.puzzleModal.hidden = true;
      this.physics.world.resume();
      this.revealCompartment();
    }, 520);
  }

  revealCompartment() {
    if (!this.interactionTargets.some((target) => target.kind === 'hidden-compartment')) {
      this.addTarget('hidden-compartment', 562, 337, 'Abrir compartimento oculto', '');
    }
    const compartment = this.add.rectangle(562, 290, 34, 18, 0xb6a174).setStrokeStyle(1, 0xe1d3aa).setDepth(7).setScale(1, 0.08);
    this.tweens.add({ targets: compartment, scaleY: 1, duration: 360, ease: 'Sine.easeOut' });
    this.add.text(562, 290, 'ORIG.', { fontFamily: 'monospace', fontSize: '6px', color: '#252a21' }).setOrigin(0.5).setDepth(8);
  }

  openOriginalReport() {
    if (!this.isPuzzleSolved()) return;
    this.documentTitle.textContent = 'Informe original de vigilancia';
    this.documentText.textContent = 'Fecha: 14/06/2014.\nDesactivación: 03:12–03:26.\nUsuario asociado: credencial local del protagonista.';
    this.documentProgress.textContent = 'Informe recuperado del compartimento oculto.';
    this.audio?.play('paper');
    this.documentModal.hidden = false;
    this.physics.world.pause();
    if (sessionStorage.getItem('night-shift-memory') !== '1') this.playFragmentedMemory();
  }

  playFragmentedMemory() {
    sessionStorage.setItem('night-shift-memory', '1');
    const frames = [
      ['Una mano sobre el panel de vigilancia.', 'hand'],
      ['«Desactiva las cámaras. Es la única manera de protegerlo».', 'voice'],
      ['El sistema CCTV pierde la señal.', 'static'],
      ['Un pasillo vacío.', 'hall'],
    ];
    let index = 0;
    this.documentModal.hidden = true;
    this.memoryOverlay.hidden = false;
    const next = () => {
      if (index === frames.length) {
        this.memoryOverlay.hidden = true;
        sessionStorage.setItem('night-shift-manifestation', '1');
        this.documentModal.hidden = false;
        return;
      }
      const [caption, scene] = frames[index++];
      document.querySelector('#memory-caption').textContent = caption;
      this.memoryOverlay.dataset.scene = scene;
      this.memoryTimers.push(window.setTimeout(next, 950));
    };
    next();
  }

  showMessage(message) {
    this.messageElement.textContent = message;
    this.messageElement.classList.remove('message-fade');
    this.scheduleMessageFade();
  }

  scheduleMessageFade() {
    clearTimeout(this.messageTimer);
    if (this.messageElement) this.messageElement.style.opacity = '1';
    this.messageTimer = setTimeout(() => this.messageElement?.classList.add('message-fade'), 4200);
  }

  updateRoomLabel() {
    const roomName = this.roomId === 'security'
      ? 'Oficina de seguridad'
      : this.roomId === 'archive' ? 'Archivo administrativo' : 'Pasillo principal';
    document.querySelector('#room-name').textContent = roomName;
    document.body.dataset.room = this.roomId;
  }

  playArchitectureShift() {
    const { anchoLogico: width, altoLogico: height } = this.settings.pantalla;
    const seam = this.add.rectangle(width / 2, 210, width - 180, 3, 0xcbd4b0, 0.72).setDepth(14).setScale(0.02, 1).setAlpha(0);
    const shadow = this.add.rectangle(width / 2, height / 2, width - 140, height - 150, 0x020405, 0.38).setDepth(13).setAlpha(0);
    let beat = 0;
    this.audio?.play('transform');
    this.tweens.add({ targets: [seam, shadow], alpha: { from: 0, to: 0.74 }, duration: 180, yoyo: true, repeat: 2,
      onYoyo: () => { beat++; seam.y = 210 + beat * 38; seam.scaleX = beat === 1 ? 0.42 : 0.78; },
      onComplete: () => {
        seam.destroy();
        shadow.destroy();
        this.showMessage('El zumbido se corta. Cuando vuelve la luz, el pasillo parece más largo.');
      },
    });
  }
}
