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
    this.enabled = false;
    this.isOpen = false;
    this.feed = document.querySelector('#camera-feed');
    this.buttons = [...document.querySelectorAll('.camera-button')];
    this.onClick = (event) => {
      const button = event.target.closest('[data-camera-index]');
      if (button) this.select(Number(button.dataset.cameraIndex));
    };
    document.querySelector('#camera-controls').addEventListener('click', this.onClick);
    this.select(0);
    this.clockTimer = window.setInterval(() => this.updateClock(), 1000);
  }

  select(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.channels.length) return;
    if (this.enabled && this.selectedIndex !== index) this.audio?.play('cctv');
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
      const buttonChannel = this.channels[buttonIndex];
      if (buttonChannel) {
        button.querySelector('span').textContent = buttonChannel.id;
        button.querySelector('small').textContent = buttonChannel.ubicacion;
      }
    });
    this.updateClock();
  }

  next() {
    this.select((this.selectedIndex + 1) % this.channels.length);
  }

  updateClock() {
    const [hours = 3, minutes = 17] = this.startTime.split(':').map(Number);
    const elapsed = Math.floor((performance.now() - this.startedAt) / 1000);
    const total = (hours * 3600 + minutes * 60 + elapsed) % 86400;
    const hour = String(Math.floor(total / 3600)).padStart(2, '0');
    const minute = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const second = String(total % 60).padStart(2, '0');
    document.querySelector('#camera-time').textContent = `${hour}:${minute}:${second}`;
    document.querySelector('#shift-clock').innerHTML = `${hour}:${minute} <small>AM</small>`;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.close();
  }

  open() {
    if (!this.enabled) return;
    this.isOpen = true;
    this.panel.hidden = false;
    this.audio?.play('cctv');
  }

  close() {
    this.isOpen = false;
    this.panel.hidden = true;
  }

  destroy() {
    window.clearInterval(this.clockTimer);
    document.querySelector('#camera-controls').removeEventListener('click', this.onClick);
  }
}
