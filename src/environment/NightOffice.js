import Phaser from 'phaser';

export class NightOffice {
  constructor(scene) {
    this.scene = scene;
    this.lamps = [];
    this.enabled = sessionStorage.getItem('night-shift-ceiling-lights') === '1';
    document.body.dataset.ceilingLights = this.enabled ? 'on' : 'off';
  }

  addCeilingLamp(x, y, { width = 112, spreadX = 200, spreadY = 210 } = {}) {
    const glow = this.scene.add.container(x, y + spreadY * 0.42).setDepth(1);
    [
      [spreadX, spreadY, 0xd6dfbf, 0.035],
      [spreadX * 0.72, spreadY * 0.68, 0xe2e9ce, 0.04],
      [spreadX * 0.38, spreadY * 0.36, 0xf0f1d7, 0.045],
    ].forEach(([w, h, color, alpha]) => {
      const layer = this.scene.add.ellipse(0, 0, w, h, color, alpha)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(0);
      glow.add(layer);
    });
    glow.setVisible(this.enabled);

    const fixture = this.scene.add.rectangle(x, y, width, 8, 0xd6ddc4, this.enabled ? 0.5 : 0.2)
      .setStrokeStyle(1, 0xe1e5d1, 0.25).setDepth(5);
    const tube = this.scene.add.rectangle(x, y, width * 0.72, 2, 0xf0f1d7, this.enabled ? 0.76 : 0.08).setDepth(6);
    this.lamps.push({ glow, fixture, tube });
    return { fixture, tube };
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    sessionStorage.setItem('night-shift-ceiling-lights', this.enabled ? '1' : '0');
    document.body.dataset.ceilingLights = this.enabled ? 'on' : 'off';
    this.lamps.forEach(({ glow, fixture, tube }) => {
      glow.setVisible(this.enabled);
      fixture.setAlpha(this.enabled ? 0.5 : 0.2);
      tube.setAlpha(this.enabled ? 0.76 : 0.08);
    });
    return this.enabled;
  }

  toggle() { return this.setEnabled(!this.enabled); }
}
