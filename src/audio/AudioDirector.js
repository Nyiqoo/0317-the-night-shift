const VOLUME_KEYS = {
  music: 'volumenMusica', ambience: 'volumenAmbiente', effects: 'volumenEfectos', narrative: 'volumenNarrativa',
};

const MUSIC_BEDS = {
  menu: [[55, 82.41], [0.008, 0.003]],
  security: [[55, 73.42], [0.006, 0.002]],
  hallway: [[49, 73.42], [0.005, 0.002]],
  archive: [[41.2, 61.74], [0.005, 0.002]],
};

const ROOM_BEDS = {
  security: [[60, 120, 180], [0.015, 0.004, 0.0015]],
  hallway: [[55, 110, 165], [0.013, 0.0035, 0.001]],
  archive: [[47, 94, 141], [0.013, 0.004, 0.001]],
};

export class AudioDirector {
  constructor(settings) {
    this.settings = settings;
    this.context = null;
    this.channels = {};
    this.musicBeds = new Map();
    this.roomBeds = new Map();
    this.started = false;
    this.currentRoom = 'menu';
    this.timers = new Set();
    this.controlInputs = [];
    this.controlHandlers = new Map();
    this.loadSavedVolumes();
  }

  loadSavedVolumes() {
    try {
      const saved = JSON.parse(localStorage.getItem('night-shift-audio-volumes') || '{}');
      Object.entries(VOLUME_KEYS).forEach(([channel, key]) => {
        if (Number.isFinite(saved[channel])) this.settings[key] = Math.max(0, Math.min(1, saved[channel]));
      });
    } catch { /* Se mantienen los niveles configurados en settings.json. */ }
  }

  bindControls(root = document) {
    this.controlInputs = [...root.querySelectorAll('[data-audio-volume]')];
    this.controlInputs.forEach((input) => {
      const channel = input.dataset.audioVolume;
      const key = VOLUME_KEYS[channel];
      if (!key) return;
      input.value = String(this.settings[key]);
      const handler = () => {
        this.setVolume(channel, Number(input.value));
        if (!this.started) this.start();
      };
      this.controlHandlers.set(input, handler);
      input.addEventListener('input', handler);
    });
  }

  setVolume(channel, value) {
    const key = VOLUME_KEYS[channel];
    if (!key || !Number.isFinite(value)) return;
    const level = Math.max(0, Math.min(1, value));
    this.settings[key] = level;
    if (this.channels[channel]) this.channels[channel].gain.setTargetAtTime(level, this.context.currentTime, 0.04);
    try {
      const saved = JSON.parse(localStorage.getItem('night-shift-audio-volumes') || '{}');
      localStorage.setItem('night-shift-audio-volumes', JSON.stringify({ ...saved, [channel]: level }));
    } catch { /* El control sigue funcionando aunque el navegador no permita guardar preferencias. */ }
  }

  async start() {
    if (this.started || !this.settings.activarSonido) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    try {
      this.context = new AudioContextClass();
      Object.entries(VOLUME_KEYS).forEach(([name, key]) => {
        const gain = this.context.createGain();
        gain.gain.value = this.settings[key];
        gain.connect(this.context.destination);
        this.channels[name] = gain;
      });
      await this.context.resume();
      this.started = true;
      this.createMusicBeds();
      this.createRoomBeds();
      this.setRoom(this.currentRoom);
    } catch {
      this.destroy();
    }
  }

  createBed(profile, channel, type, fadeGain = 0) {
    const [frequencies, levels] = profile;
    const master = this.context.createGain();
    master.gain.value = fadeGain;
    master.connect(this.channels[channel]);
    const oscillators = frequencies.map((frequency, index) => {
      const oscillator = this.context.createOscillator();
      const layer = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      layer.gain.value = levels[index];
      oscillator.connect(layer);
      layer.connect(master);
      oscillator.start();
      return oscillator;
    });
    return { master, oscillators };
  }

  createMusicBeds() {
    Object.entries(MUSIC_BEDS).forEach(([room, profile]) => {
      this.musicBeds.set(room, this.createBed(profile, 'music', 'sine'));
    });
  }

  createRoomBeds() {
    Object.entries(ROOM_BEDS).forEach(([room, profile]) => {
      this.roomBeds.set(room, this.createBed(profile, 'ambience', 'triangle'));
    });
  }

  fade(master, value, duration = 0.9) {
    const now = this.context.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(value, now + duration);
  }

  setRoom(room) {
    this.currentRoom = room;
    if (!this.started || !this.context) return;
    for (const [name, bed] of this.musicBeds) this.fade(bed.master, name === room ? 1 : 0);
    for (const [name, bed] of this.roomBeds) this.fade(bed.master, name === room ? 1 : 0);
  }

  tone(frequency, { duration = 0.16, type = 'sine', volume = 0.05, endFrequency = frequency, channel = 'effects' } = {}) {
    if (!this.started || !this.context || this.context.state !== 'running' || !this.channels[channel]) return;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    const now = this.context.currentTime;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(volume, now + 0.018);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(envelope);
    envelope.connect(this.channels[channel]);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  noise({ duration = 0.12, volume = 0.018, mode = 'bandpass', frequency = 1400, channel = 'effects' } = {}) {
    if (!this.started || !this.context || this.context.state !== 'running' || !this.channels[channel]) return;
    const sampleRate = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, Math.ceil(sampleRate * duration), sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index++) samples[index] = Math.sin(index * 12.9898) * Math.cos(index * 4.1414) * 0.8;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const envelope = this.context.createGain();
    const now = this.context.currentTime;
    source.buffer = buffer;
    filter.type = mode;
    filter.frequency.value = frequency;
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(volume, now + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.channels[channel]);
    source.start(now);
    source.stop(now + duration + 0.02);
  }

  motif(notes, channel = 'narrative', interval = 520) {
    notes.forEach((frequency, index) => {
      const timer = window.setTimeout(() => this.tone(frequency, { duration: 0.68, type: 'sine', volume: 0.035, channel }), index * interval);
      this.timers.add(timer);
    });
  }

  play(name) {
    if (name === 'paper') { this.noise({ duration: 0.16, volume: 0.022, frequency: 1650 }); return; }
    if (name === 'step') { this.noise({ duration: 0.07, volume: 0.008, mode: 'lowpass', frequency: 240 }); return; }
    if (name === 'cctv-change') { this.noise({ duration: 0.1, volume: 0.009, mode: 'highpass', frequency: 2400 }); this.tone(860, { duration: 0.1, type: 'square', volume: 0.01, endFrequency: 620 }); return; }
    if (name === 'cctv-on') { this.tone(430, { duration: 0.24, type: 'triangle', volume: 0.018, endFrequency: 720 }); return; }
    if (name === 'cctv-off' || name === 'cctv-loss') { this.noise({ duration: 0.32, volume: 0.012, mode: 'highpass', frequency: 2200 }); this.tone(620, { duration: 0.22, volume: 0.012, endFrequency: 180 }); return; }
    if (name === 'cctv-restore') { this.noise({ duration: 0.18, volume: 0.008, mode: 'highpass', frequency: 1900 }); this.tone(260, { duration: 0.34, volume: 0.014, endFrequency: 680 }); return; }
    if (name === 'door') { this.noise({ duration: 0.22, volume: 0.025, mode: 'lowpass', frequency: 520 }); this.tone(110, { duration: 0.28, type: 'triangle', volume: 0.026, endFrequency: 70 }); return; }
    if (name === 'time-motif') { this.motif([110, 164.81, 123.47], 'narrative', 680); return; }
    if (name === 'discovery') { this.motif([196, 146.83, 110], 'narrative', 420); return; }
    if (name === 'memory') { this.tone(73.42, { duration: 1.8, type: 'sine', volume: 0.035, endFrequency: 55, channel: 'narrative' }); return; }
    const presets = {
      interact: [370, { duration: 0.07, volume: 0.018 }],
      error: [190, { duration: 0.18, volume: 0.04, endFrequency: 130 }],
      mechanism: [440, { duration: 0.42, type: 'triangle', volume: 0.045, endFrequency: 760 }],
      transform: [64, { duration: 1.1, type: 'sawtooth', volume: 0.035, endFrequency: 29, channel: 'narrative' }],
    };
    const preset = presets[name];
    if (preset) this.tone(...preset);
  }

  destroy() {
    this.timers.forEach((timer) => window.clearTimeout(timer));
    this.timers.clear();
    [...this.musicBeds.values(), ...this.roomBeds.values()].forEach(({ master, oscillators }) => {
      oscillators.forEach((oscillator) => { try { oscillator.stop(); oscillator.disconnect(); } catch { /* Ya detenido. */ } });
      master.disconnect();
    });
    this.musicBeds.clear();
    this.roomBeds.clear();
    this.controlHandlers.forEach((handler, input) => input.removeEventListener('input', handler));
    this.controlHandlers.clear();
    if (this.context && this.context.state !== 'closed') this.context.close().catch(() => {});
    this.context = null;
    this.channels = {};
    this.started = false;
  }
}
