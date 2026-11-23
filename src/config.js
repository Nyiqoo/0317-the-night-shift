export const DEFAULT_SETTINGS = {
  juego: { nombre: '03:17 — THE NIGHT SHIFT', idioma: 'es', horaDeInicio: '03:17', guardarProgresoEnNavegador: false, datosDePartidaIniciales: {} },
  pantalla: { anchoLogico: 960, altoLogico: 640, ajustarAlNavegador: true, tamanoDePixel: 1 },
  jugador: {
    velocidad: 190,
    radioDeColision: 12,
    radioDeInteraccion: 64,
    teclas: { arriba: ['W', 'UP'], abajo: ['S', 'DOWN'], izquierda: ['A', 'LEFT'], derecha: ['D', 'RIGHT'] },
  },
  controles: { interactuar: 'E', pausar: 'ESC' },
  visual: {
    colores: {
      fondo: '#0a1117', piso: '#27363a', baldosaClara: '#354346', baldosaOscura: '#2d3b3e',
      muro: '#748178', puerta: '#997b58', muebles: '#48564f', acento: '#a6c4a3', texto: '#e3e7dc',
    },
    brillo: 0.88, contraste: 1, intensidadDeVineta: 0.3, nivelDeNiebla: 0,
  },
  animacion: { duracionDeTransicionMs: 350, velocidadDeAnimacion: 1, intensidadDeParpadeo: 0.25 },
  audio: { activarSonido: false, volumenMusica: 0.25, volumenAmbiente: 0.3, volumenEfectos: 0.5 },
  entidad: { activarEventosAmbientales: false, duracionDeAnomaliaMs: 1600, probabilidadDeAnomalia: 0.12, intervaloMinimoEntreEventosMs: 14000 },
  misiones: [{ id: 'archivo-administrativo', titulo: 'Revisa el archivo administrativo y localiza el expediente de mantenimiento del antiguo supervisor', destino: 'Archivo administrativo', estadoVisible: 'Activa · pendiente de visita' }],
  camaras: {
    frecuenciaDeCambioMs: 12000,
    canales: [
      { id: 'CAM-01', ubicacion: 'Pasillo principal', vista: 'hallway' },
      { id: 'CAM-02', ubicacion: 'Archivo administrativo', vista: 'archive' },
      { id: 'CAM-03', ubicacion: 'Cafetería', vista: 'cafeteria' },
    ],
  },
  edificio: { numeroDeHabitacionesDelPrototipo: 8, activarMapasDeTransformacion: false, usarSemillaFija: true },
  puzzles: {
    archivo: { cantidadDePistas: 1, temporizadorSegundos: 0, facilidadDeInteraccion: 1 },
    comedor: { cantidadDePistas: 1, temporizadorSegundos: 0, facilidadDeInteraccion: 1 },
    servidores: { cantidadDePistas: 1, temporizadorSegundos: 0, facilidadDeInteraccion: 1 },
  },
  depuracion: { activarModoDepuracion: false, mostrarColisiones: false },
};

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isColor = (value) => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value);

function copyDefaults() {
  return structuredClone(DEFAULT_SETTINGS);
}

function validateSettings(input) {
  const issues = [];
  if (!isRecord(input)) return { settings: copyDefaults(), issues: ['El archivo debe contener un objeto JSON.'] };
  const settings = copyDefaults();

  const copyString = (section, key, label) => {
    const value = input[section]?.[key];
    if (typeof value === 'string' && value.trim()) settings[section][key] = value;
    else issues.push(`${label}: se usará el valor predeterminado.`);
  };
  const copyNumber = (section, key, label, min, max, integer = false) => {
    const value = input[section]?.[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value))) {
      settings[section][key] = value;
    } else issues.push(`${label}: se usará el valor predeterminado.`);
  };
  const copyBoolean = (section, key, label) => {
    const value = input[section]?.[key];
    if (typeof value === 'boolean') settings[section][key] = value;
    else issues.push(`${label}: se usará el valor predeterminado.`);
  };

  copyString('juego', 'nombre', 'juego.nombre');
  copyString('juego', 'idioma', 'juego.idioma');
  if (typeof input.juego?.horaDeInicio === 'string' && /^\d{2}:\d{2}$/.test(input.juego.horaDeInicio) && Number(input.juego.horaDeInicio.slice(0, 2)) < 24 && Number(input.juego.horaDeInicio.slice(3)) < 60) settings.juego.horaDeInicio = input.juego.horaDeInicio;
  else issues.push('juego.horaDeInicio: se usará la hora predeterminada.');
  if (isRecord(input.juego?.datosDePartidaIniciales)) settings.juego.datosDePartidaIniciales = { ...input.juego.datosDePartidaIniciales };
  else issues.push('juego.datosDePartidaIniciales: se usarán datos de partida vacíos.');
  copyBoolean('pantalla', 'ajustarAlNavegador', 'pantalla.ajustarAlNavegador');
  copyNumber('pantalla', 'anchoLogico', 'pantalla.anchoLogico', 640, 1920, true);
  copyNumber('pantalla', 'altoLogico', 'pantalla.altoLogico', 400, 1200, true);
  copyNumber('pantalla', 'tamanoDePixel', 'pantalla.tamanoDePixel', 1, 8, true);
  copyNumber('jugador', 'velocidad', 'jugador.velocidad', 40, 500);
  copyNumber('jugador', 'radioDeColision', 'jugador.radioDeColision', 6, 36);
  copyNumber('jugador', 'radioDeInteraccion', 'jugador.radioDeInteraccion', 20, 180);

  if (isRecord(input.controles)) {
    for (const key of Object.keys(settings.controles)) {
      if (typeof input.controles[key] === 'string' && input.controles[key].trim()) settings.controles[key] = input.controles[key].toUpperCase();
      else issues.push(`controles.${key}: se usará el valor predeterminado.`);
    }
  } else issues.push('controles: se usarán los controles predeterminados.');

  if (isRecord(input.jugador?.teclas)) {
    for (const key of Object.keys(settings.jugador.teclas)) {
      const value = input.jugador.teclas[key];
      if (Array.isArray(value) && value.length && value.every((item) => typeof item === 'string' && item.trim())) {
        settings.jugador.teclas[key] = value.map((item) => item.toUpperCase());
      } else issues.push(`jugador.teclas.${key}: se usarán las teclas predeterminadas.`);
    }
  } else issues.push('jugador.teclas: se usarán las teclas predeterminadas.');

  if (isRecord(input.visual?.colores)) {
    for (const key of Object.keys(settings.visual.colores)) {
      if (isColor(input.visual.colores[key])) settings.visual.colores[key] = input.visual.colores[key];
      else issues.push(`visual.colores.${key}: se usará el color predeterminado.`);
    }
  } else issues.push('visual.colores: se usará la paleta predeterminada.');
  for (const [key, min, max] of [['brillo', 0, 2], ['contraste', 0.5, 2], ['intensidadDeVineta', 0, 1], ['nivelDeNiebla', 0, 1]]) {
    const value = input.visual?.[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max) settings.visual[key] = value;
    else issues.push(`visual.${key}: se usará el valor predeterminado.`);
  }

  for (const [section, key, min, max] of [
    ['audio', 'volumenMusica', 0, 1], ['audio', 'volumenAmbiente', 0, 1], ['audio', 'volumenEfectos', 0, 1],
    ['entidad', 'duracionDeAnomaliaMs', 100, 30000], ['entidad', 'probabilidadDeAnomalia', 0, 1],
    ['entidad', 'intervaloMinimoEntreEventosMs', 1000, 300000], ['camaras', 'frecuenciaDeCambioMs', 1000, 300000],
    ['animacion', 'duracionDeTransicionMs', 0, 10000], ['animacion', 'velocidadDeAnimacion', 0.1, 4],
    ['animacion', 'intensidadDeParpadeo', 0, 1],
  ]) {
    const value = input[section]?.[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max) settings[section][key] = value;
    else issues.push(`${section}.${key}: se usará el valor predeterminado.`);
  }
  for (const [section, key] of [['juego', 'guardarProgresoEnNavegador'], ['audio', 'activarSonido'], ['entidad', 'activarEventosAmbientales'], ['edificio', 'activarMapasDeTransformacion'], ['edificio', 'usarSemillaFija'], ['depuracion', 'activarModoDepuracion'], ['depuracion', 'mostrarColisiones']]) {
    copyBoolean(section, key, `${section}.${key}`);
  }
  copyNumber('edificio', 'numeroDeHabitacionesDelPrototipo', 'edificio.numeroDeHabitacionesDelPrototipo', 1, 32, true);
  for (const puzzleId of Object.keys(settings.puzzles)) {
    const puzzle = input.puzzles?.[puzzleId];
    if (!isRecord(puzzle)) {
      issues.push(`puzzles.${puzzleId}: se usarán los valores predeterminados.`);
      continue;
    }
    for (const [key, min, max, integer] of [['cantidadDePistas', 0, 10, true], ['temporizadorSegundos', 0, 3600, true], ['facilidadDeInteraccion', 0.25, 2, false]]) {
      const value = puzzle[key];
      if (typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value))) settings.puzzles[puzzleId][key] = value;
      else issues.push(`puzzles.${puzzleId}.${key}: se usará el valor predeterminado.`);
    }
  }
  const mission = input.misiones?.[0];
  if (isRecord(mission) && ['id', 'titulo', 'destino', 'estadoVisible'].every((key) => typeof mission[key] === 'string' && mission[key].trim())) {
    settings.misiones = [{ ...settings.misiones[0], ...mission }];
  } else issues.push('misiones: se usará la primera misión predeterminada.');
  if (Array.isArray(input.camaras?.canales) && input.camaras.canales.length === 3 && input.camaras.canales.every((channel) => isRecord(channel) && ['id', 'ubicacion', 'vista'].every((key) => typeof channel[key] === 'string' && channel[key].trim()))) {
    settings.camaras.canales = input.camaras.canales.map((channel) => ({ ...channel }));
  } else issues.push('camaras.canales: se usarán los tres canales predeterminados.');
  return { settings, issues };
}

export async function loadSettings() {
  try {
    const response = await fetch('/settings.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`settings.json respondió ${response.status}`);
    return validateSettings(await response.json());
  } catch (error) {
    return { settings: copyDefaults(), issues: [`No se pudo cargar settings.json (${error.message}). Se aplicaron los valores predeterminados.`] };
  }
}
