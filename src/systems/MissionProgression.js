const STORAGE_KEY = 'night-shift-mission-progression-v1';

export class MissionProgression {
  constructor(config = {}, missions = []) {
    // Match the Spanish keys used by settings.json while retaining support
    // for callers that provide the internal English aliases.
    const roomsInitiallyUnlocked = config.habitacionesIniciales ?? config.roomsInitiallyUnlocked ?? [];
    const exitRequires = config.salidaRequiere ?? config.exitRequires ?? [];
    this.roomsInitiallyUnlocked = new Set(roomsInitiallyUnlocked);
    this.exitRequires = [...exitRequires];
    this.missions = missions.map((mission, index) => ({
      ...mission,
      status: mission.estadoInicial ?? (index === 0 ? 'activa' : 'pendiente'),
    }));
    this.onChange = null;
    this.load();
    this.syncFromNarrative();
  }

  load() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
      this.missions.forEach((mission) => {
        if (saved[mission.id] === 'completada') mission.status = 'completada';
      });
    } catch { /* Se inicializa el progreso si la sesión guardada no es válida. */ }
    this.activateAvailableMissions();
  }

  persist() {
    const state = Object.fromEntries(this.missions.map(({ id, status }) => [id, status]));
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    this.onChange?.();
  }

  activateAvailableMissions() {
    let changed = false;
    this.missions.forEach((mission, index) => {
      if (mission.status === 'completada') return;
      const prerequisites = mission.requisitos ?? [];
      const unlocked = prerequisites.every((id) => this.isMissionComplete(id));
      const nextStatus = unlocked ? 'activa' : 'pendiente';
      if (mission.status !== nextStatus) {
        mission.status = nextStatus;
        changed = true;
      }
    });
    if (changed) this.persist();
  }

  syncFromNarrative() {
    let changed = false;
    this.missions.forEach((mission) => {
      const conditions = mission.completadaCuando ?? [];
      if (mission.status === 'activa' && conditions.length
        && conditions.every((key) => sessionStorage.getItem(key) === '1')) {
        mission.status = 'completada';
        changed = true;
      }
    });
    this.activateAvailableMissions();
    if (changed) this.persist();
    return changed;
  }

  isMissionComplete(id) { return this.missions.some((mission) => mission.id === id && mission.status === 'completada'); }
  getMissions() { return this.missions.map((mission) => ({ ...mission })); }
  getCurrentMission() { return this.missions.find((mission) => mission.status === 'activa' || mission.status === 'pendiente') ?? null; }

  isRoomUnlocked(roomId) {
    if (this.roomsInitiallyUnlocked.has(roomId)) return true;
    return this.missions.some((mission) => mission.status === 'completada'
      && (mission.desbloqueaHabitaciones ?? []).includes(roomId));
  }

  canLeaveBuilding() {
    return this.exitRequires.every((missionId) => this.isMissionComplete(missionId));
  }

  lockedRoomMessage() {
    return 'Acceso restringido. Debes completar la tarea actual antes de continuar.';
  }

  exitLockedMessage() {
    return 'La salida del Edificio 04 está asegurada. Completa la tarea obligatoria antes de marcharte.';
  }
}
