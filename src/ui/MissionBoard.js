const LABELS = { activa: 'ACTIVA · OBJETIVO ACTUAL', pendiente: 'PENDIENTE · BLOQUEADA', completada: 'COMPLETADA' };

export class MissionBoard {
  constructor(progression) {
    this.progression = progression;
    this.title = document.querySelector('#mission-title');
    this.destination = document.querySelector('#mission-destination');
    this.status = document.querySelector('#mission-status');
    this.list = document.querySelector('#pending-objectives');
    this.progression.onChange = () => this.render();
    this.render();
  }

  render() {
    const current = this.progression.getCurrentMission();
    this.title.textContent = current?.titulo ?? 'Todas las tareas obligatorias están completas.';
    this.destination.textContent = current?.destino ?? 'Salida del Edificio 04';
    this.status.textContent = current ? (current.status === 'activa' ? 'Activa · en curso' : 'Pendiente') : 'Completada';

    this.list.replaceChildren();
    this.progression.getMissions().forEach((mission) => {
      const item = document.createElement('li');
      if (mission.status === 'pendiente') item.className = 'locked-objective';
      const name = document.createElement('span');
      name.textContent = mission.titulo;
      const state = document.createElement('small');
      state.textContent = LABELS[mission.status] ?? 'PENDIENTE';
      item.append(name, state);
      this.list.append(item);
    });
    if (!current) {
      const exit = document.createElement('li');
      const text = document.createElement('span');
      text.textContent = 'La salida del edificio está disponible.';
      const status = document.createElement('small');
      status.textContent = 'OBJETIVO FINAL';
      exit.append(text, status);
      this.list.append(exit);
    }
  }
}
