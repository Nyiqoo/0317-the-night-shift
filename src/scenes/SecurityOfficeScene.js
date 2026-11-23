import Phaser from 'phaser';

export class SecurityOfficeScene extends Phaser.Scene {
  constructor(settings, cctv) {
    super('security-office');
    this.settings = settings;
    this.cctv = cctv;
  }

  init(data) {
    this.roomId = data?.room ?? 'security';
    this.isPaused = false;
    this.interactionTargets = [];
    this.nearestTarget = null;
  }

  create() {
    this.createTextures();
    this.blockers = this.physics.add.staticGroup();
    if (this.roomId === 'security') this.drawOffice();
    else this.drawHallway();
    this.createPlayer();
    this.createControls();
    this.interactionKeyHandler = () => this.interact();
    this.pauseKeyHandler = () => this.togglePause();
    this.input.keyboard.on(`keydown-${this.settings.controles.interactuar}`, this.interactionKeyHandler);
    this.input.keyboard.on(`keydown-${this.settings.controles.pausar}`, this.pauseKeyHandler);
    this.events.once('shutdown', () => {
      this.clearDomListeners();
      this.input.keyboard.off(`keydown-${this.settings.controles.interactuar}`, this.interactionKeyHandler);
      this.input.keyboard.off(`keydown-${this.settings.controles.pausar}`, this.pauseKeyHandler);
    });
    this.cctv.setEnabled(this.roomId === 'security');
    this.updateRoomLabel();
    if (this.roomId === 'hallway') this.showMessage('Has salido de la oficina. El pasillo principal continúa en ambas direcciones.');
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
    this.add.rectangle(x, y, width, height, Phaser.Display.Color.HexStringToColor(color).color)
      .setStrokeStyle(2, 0xc2c9b8, 0.19).setDepth(5);
    const blocker = this.blockers.create(x, y, 'pixel').setDisplaySize(width, height).refreshBody();
    blocker.setVisible(false);
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

  addTarget(kind, x, y, prompt, message) {
    this.interactionTargets.push({ kind, x, y, prompt, message });
  }

  drawOffice() {
    const { anchoLogico: width, altoLogico: height } = this.settings.pantalla;
    const colors = this.settings.visual.colores;
    this.cameras.main.setBackgroundColor(colors.fondo);
    this.drawFloor('Oficina de seguridad');
    const doorLeft = width / 2 - 82;
    const doorRight = width / 2 + 82;
    this.addWall(width / 2, 82, width - 128, 34);
    this.addWall(70, height / 2, 34, height - 96);
    this.addWall(width - 70, height / 2, 34, height - 96);
    this.addWall((70 + doorLeft) / 2, height - 52, doorLeft - 70, 34);
    this.addWall((doorRight + width - 70) / 2, height - 52, width - 70 - doorRight, 34);
    this.add.rectangle(width / 2, height - 40, 164, 7, Phaser.Display.Color.HexStringToColor(colors.puerta).color).setDepth(6);
    this.add.text(width / 2, height - 27, 'PUERTA · PASILLO PRINCIPAL', {
      fontFamily: 'monospace', fontSize: '8px', color: colors.texto, letterSpacing: 1,
    }).setOrigin(0.5, 0).setDepth(6).setAlpha(0.7);
    this.addTarget('exit', width / 2, height - 62, 'Salir al pasillo principal', 'La puerta de seguridad se abre hacia el pasillo.');

    this.add.rectangle(792, 158, 62, 62, 0x202c2a).setStrokeStyle(3, 0x748178, 0.7).setDepth(4);
    this.add.circle(792, 158, 24, 0x748178, 0.12).setStrokeStyle(1, 0xa8b29e, 0.48).setDepth(5);
    this.add.line(792, 158, 0, -20, 11, -4, 0xcbbd99, 0.8).setDepth(6);
    this.add.text(792, 198, '03:17', { fontFamily: 'monospace', fontSize: '9px', color: colors.texto }).setOrigin(0.5).setDepth(6).setAlpha(0.62);

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
    this.add.text(398, 316, 'TAREAS', { fontFamily: 'monospace', fontSize: '7px', color: '#526154' }).setOrigin(0.5).setDepth(6);
    this.add.line(372, 327, 0, 0, 52, 0, 0x59675e, 0.5).setDepth(6);
    this.add.line(372, 335, 0, 0, 43, 0, 0x59675e, 0.5).setDepth(6);
    this.add.rectangle(560, 326, 45, 36, 0x2b3632).setStrokeStyle(2, 0x9ca791, 0.7).setDepth(5);
    this.add.circle(560, 322, 9, 0x131b1a).setStrokeStyle(2, 0xb1b79b, 0.7).setDepth(6);
    this.add.text(560, 351, 'TELÉFONO', { fontFamily: 'monospace', fontSize: '6px', color: colors.texto }).setOrigin(0.5).setDepth(6).setAlpha(0.7);
    this.addTarget('tasks', 398, 393, 'Revisar lista de tareas', 'La primera tarea está activa: revisa el archivo administrativo y localiza el expediente del antiguo supervisor.');
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
    this.addWall(width / 2, 82, doorwayLeft - 70, 34);
    this.addWall((doorwayRight + width - 70) / 2, 82, width - 70 - doorwayRight, 34);
    this.addWall(70, height / 2, 34, height - 96);
    this.addWall(width - 70, height / 2, 34, height - 96);
    this.addWall((70 + doorwayLeft) / 2, height - 52, doorwayLeft - 70, 34);
    this.addWall((doorwayRight + width - 70) / 2, height - 52, width - 70 - doorwayRight, 34);

    this.add.rectangle(width / 2, 82, 170, 7, Phaser.Display.Color.HexStringToColor(colors.puerta).color).setDepth(6);
    this.add.text(width / 2, 104, 'OFICINA DE SEGURIDAD', { fontFamily: 'monospace', fontSize: '8px', color: colors.texto, letterSpacing: 1 }).setOrigin(0.5).setDepth(6);
    this.addTarget('return', width / 2, 118, 'Volver a la oficina de seguridad', 'La oficina sigue conectada al pasillo.');

    this.add.rectangle(width / 2, height - 40, 170, 7, 0x997b58).setDepth(6);
    this.add.text(width / 2, height - 28, 'ARCHIVO ADMINISTRATIVO', { fontFamily: 'monospace', fontSize: '8px', color: colors.texto, letterSpacing: 1 }).setOrigin(0.5, 0).setDepth(6);
    this.addTarget('archive', width / 2, height - 64, 'Revisar puerta del archivo', 'El archivo administrativo es el destino de tu primera tarea. El acceso estará disponible en la siguiente entrega.');

    for (const y of [185, 310, 435]) {
      this.add.rectangle(150, y, 96, 17, 0x48554e).setStrokeStyle(1, 0x78847a, 0.45).setDepth(3);
      this.add.rectangle(width - 150, y, 96, 17, 0x48554e).setStrokeStyle(1, 0x78847a, 0.45).setDepth(3);
      this.add.rectangle(150, y - 14, 78, 5, 0x9f956f, 0.65).setDepth(4);
      this.add.rectangle(width - 150, y - 14, 78, 5, 0x9f956f, 0.65).setDepth(4);
      this.add.line(width / 2, y, 0, 0, width / 2 - 202, 0, 0xd2d6c0, 0.11).setDepth(2);
    }
    this.physics.world.setBounds(76, 104, width - 152, height - 170);
  }

  createPlayer() {
    const { anchoLogico: width, altoLogico: height } = this.settings.pantalla;
    const startY = this.roomId === 'security' ? height - 116 : 143;
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
    if (this.isPaused) return;
    const target = this.nearestTarget;
    if (!target) {
      this.showMessage('No hay nada al alcance. Acércate a un objeto o a una puerta.');
      return;
    }
    if (target.kind === 'exit') {
      this.scene.restart({ room: 'hallway' });
      return;
    }
    if (target.kind === 'return') {
      this.scene.restart({ room: 'security' });
      return;
    }
    if (target.kind === 'cctv') this.cctv.next();
    this.showMessage(target.message);
  }

  togglePause() {
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

  showMessage(message) {
    this.messageElement.textContent = message;
  }

  updateRoomLabel() {
    const roomName = this.roomId === 'security' ? 'Oficina de seguridad' : 'Pasillo principal';
    document.querySelector('#room-name').textContent = roomName;
    document.body.dataset.room = this.roomId;
  }
}
