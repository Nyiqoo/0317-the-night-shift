export class AudioDirector {
  constructor(settings) {
    this.settings = settings;
    this.context = null;
    this.channels = {};
    this.started = false;
    this.ambientNodes = [];
  }

  async start() {
    if (this.started || !this.settings.activarSonido) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    try {
      this.context = new AudioContextClass();
      for (const [name, level] of Object.entries({
        music: this.settings.volumenMusica,
        ambience: this.settings.volumenAmbiente,
        effects: this.settings.volumenEfectos,
      })) {
        const gain = this.context.createGain();
        gain.gain.value = level;
        gain.connect(this.context.destination);
        this.channels[name] = gain;
      }
      await this.context.resume();
      this.started = true;
      this.startBed('music', [55, 82.41], 'sine', [0.018, 0.009]);
      this.startBed('ambience', [60, 120], 'triangle', [0.022, 0.006]);
    } catch {
      this.destroy();
    }
  }

  startBed(channel, frequencies, type, levels) {
    frequencies.forEach((frequency, index) => {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.value = levels[index];
      oscillator.connect(gain);
      gain.connect(this.channels[channel]);
      oscillator.start();
      this.ambientNodes.push(oscillator, gain);
    });
  }

  tone(frequency, { duration = 0.16, type = 'sine', volume = 0.05, endFrequency = frequency } = {}) {
    if (!this.started || !this.context || this.context.state !== 'running') return;
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
    envelope.connect(this.channels.effects);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  noise({ duration = 0.12, volume = 0.018, mode = 'bandpass', frequency = 1400 } = {}) {
    if (!this.started || !this.context || this.context.state !== 'running') return;
    const sampleRate = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, Math.ceil(sampleRate * duration), sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index++) {
      samples[index] = Math.sin(index * 12.9898) * Math.cos(index * 4.1414) * 0.8;
    }
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
    envelope.connect(this.channels.effects);
    source.start(now);
    source.stop(now + duration + 0.02);
  }

  play(name) {
    if (name === 'paper') { this.noise({ duration: 0.16, volume: 0.022, frequency: 1650 }); return; }
    if (name === 'cctv') {
      this.noise({ duration: 0.2, volume: 0.01, mode: 'highpass', frequency: 2600 });
      this.tone(860, { duration: 0.12, type: 'square', volume: 0.012, endFrequency: 620 });
      return;
    }
    const presets = {
      interact: [370, { duration: 0.07, volume: 0.018 }],
      error: [190, { duration: 0.18, volume: 0.04, endFrequency: 130 }],
      mechanism: [440, { duration: 0.42, type: 'triangle', volume: 0.045, endFrequency: 760 }],
      transform: [64, { duration: 1.1, type: 'sawtooth', volume: 0.035, endFrequency: 29 }],
    };
    const preset = presets[name];
    if (preset) this.tone(...preset);
  }

  destroy() {
    this.ambientNodes.forEach((node) => { try { node.stop?.(); node.disconnect(); } catch { /* Ya detenido. */ } });
    this.ambientNodes = [];
    if (this.context && this.context.state !== 'closed') this.context.close().catch(() => {});
    this.context = null;
    this.started = false;
  }
}
