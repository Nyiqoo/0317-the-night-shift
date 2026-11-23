const POWER_KEY = 'night-shift-cctv-powered';

export class CCTVPanel {
  constructor(channels, startTime = '03:23', audio = null) {
    this.channels = channels;
    this.startTime = startTime;
    this.audio = audio;
    this.selectedIndex = 0;
    this.startedAt = performance.now();
    this.panel = document.querySelector('#cctv-panel');
    this.panel.hidden = true;
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-modal', 'true');
    document.querySelector('.stage-frame').append(this.panel);
    this.available = false;
    this.powered = sessionStorage.getItem(POWER_KEY) !== 'off';
    this.isOpen = false;
    this.feed = document.querySelector('#camera-feed');
    this.signal = document.querySelector('#cctv-signal');
    this.headerSignal = document.querySelector('#cctv-header-status');
    this.powerButton = document.querySelector('#cctv-power');
    this.buttons = [...document.querySelectorAll('.camera-button')];
    this.controls = document.querySelector('#camera-controls');
    this.onClick = (event) => {
      if (event.target.closest('#cctv-power')) { this.togglePower(); return; }
      const button = event.target.closest('[data-camera-index]');
      if (button) this.select(Number(button.dataset.cameraIndex));
    };
    this.controls.addEventListener('click', this.onClick);
    this.powerButton.addEventListener('click', this.onClick);
    this.select(0);
    this.updatePowerView();
    this.clockTimer = window.setInterval(() => this.updateClock(), 1000);
  }

  select(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.channels.length) return;
    const changed = this.selectedIndex !== index;
    this.selectedIndex = index;
    const channel = this.channels[index];
    document.querySelector('#camera-id').textContent = channel.id;
    document.querySelector('#camera-location').textContent = channel.ubicacion;
    this.feed.dataset.location = channel.vista;
    this.feed.setAttribute('aria-label', `Vista de cámara: ${channel.ubicacion}`);
    document.querySelectorAll('[data-camera-scene]').forEach((scene) => {
      scene.hidden = scene.dataset.cameraScene !== channel.vista;
    });
    this.buttons.forEach((button, buttonIndex) => {
      const selected = buttonIndex === index;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    if (changed && this.powered) this.audio?.play('cctv-change');
    this.updatePowerView();
    this.updateClock();
  }

  next() { this.select((this.selectedIndex + 1) % this.channels.length); }

  updateClock() {
    const [hours = 3, minutes = 23] = this.startTime.split(':').map(Number);
    const elapsed = Math.floor((performance.now() - this.startedAt) / 1000);
    const total = (hours * 3600 + minutes * 60 + elapsed) % 86400;
    const hour = String(Math.floor(total / 3600)).padStart(2, '0');
    const minute = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const second = String(total % 60).padStart(2, '0');
    document.querySelector('#camera-time').textContent = `${hour}:${minute}:${second}`;
    document.querySelector('#shift-clock').innerHTML = `${hour}:${minute} <small>AM</small>`;
  }

  updatePowerView() {
    const online = this.powered;
    this.feed.dataset.signal = online ? 'online' : 'offline';
    this.feed.dataset.signalLabel = online ? '' : 'SIN SEÑAL';
    this.signal.textContent = online ? `EN LÍNEA · ${this.channels[this.selectedIndex].id}` : 'SIN SEÑAL';
    this.signal.dataset.state = online ? 'online' : 'offline';
    this.headerSignal.textContent = online ? 'SEÑAL EN VIVO' : 'SISTEMA APAGADO';
    this.powerButton.textContent = online ? 'Apagar CCTV' : 'Encender CCTV';
    this.powerButton.setAttribute('aria-pressed', String(online));
  }

  setAvailable(available) {
    this.available = Boolean(available);
    if (!this.available) this.close();
  }

  togglePower() {
    if (!this.available) return;
    this.powered = !this.powered;
    sessionStorage.setItem(POWER_KEY, this.powered ? 'on' : 'off');
    this.updatePowerView();
    this.audio?.play(this.powered ? 'cctv-restore' : 'cctv-off');
  }

  open() {
    if (!this.available) return false;
    this.isOpen = true;
    this.panel.hidden = false;
    this.audio?.play('cctv-on');
    return true;
  }

  close() {
    this.isOpen = false;
    this.panel.hidden = true;
  }

  destroy() {
    window.clearInterval(this.clockTimer);
    this.controls.removeEventListener('click', this.onClick);
    this.powerButton.removeEventListener('click', this.onClick);
  }
}
