export class MissionBoard {
  constructor(missions) {
    this.missions = missions;
    this.render();
  }

  render() {
    const current = this.missions[0];
    document.querySelector('#mission-title').textContent = current.titulo;
    document.querySelector('#mission-destination').textContent = current.destino;
    document.querySelector('#mission-status').textContent = current.estadoVisible;

    const list = document.querySelector('#pending-objectives');
    list.replaceChildren();
    const currentTask = document.createElement('li');
    const title = document.createElement('span');
    title.textContent = current.titulo;
    const status = document.createElement('small');
    status.textContent = 'PENDIENTE · OBJETIVO ACTUAL';
    currentTask.append(title, status);
    list.append(currentTask);

    const nextTask = document.createElement('li');
    nextTask.className = 'locked-objective';
    const nextTitle = document.createElement('span');
    nextTitle.textContent = 'Próximas asignaciones';
    const nextStatus = document.createElement('small');
    nextStatus.textContent = 'Se habilitan al completar esta revisión.';
    nextTask.append(nextTitle, nextStatus);
    list.append(nextTask);
  }
}
