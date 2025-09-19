// ==========================
// script.js (corregido)
// ==========================

let numTeams = 0;
let jugadores = []; // { id, nombre, posicion, capitan }

// --------------------------
// Utilidades
// --------------------------
function showStep(step) {
  document.querySelectorAll(".step").forEach((el) => el.classList.add("hidden"));
  const target = document.querySelector(`.step[data-step="${step}"]`);
  if (target) target.classList.remove("hidden");
  document.querySelectorAll("#stepIndicators li").forEach((li, idx) => {
    li.classList.toggle("active", idx === step - 1);
  });
}

function uuid() { return "_" + Math.random().toString(36).substr(2, 9); }

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// --------------------------
// Paso 1: Configuración
// --------------------------
document.getElementById("toStep2").addEventListener("click", () => {
  const n = parseInt(document.getElementById("numTeams").value, 10);
  if (isNaN(n) || n < 2) { alert("Debes indicar al menos 2 equipos."); return; }
  numTeams = n;
  showStep(2);
});
document.getElementById("cancelBtn").addEventListener("click", () => location.reload());

// --------------------------
// Paso 2: Agregar jugadores
// --------------------------
document.getElementById("addBatch").addEventListener("click", () => {
  const textarea = document.getElementById("batchTextarea");
  const names = textarea.value.split("\n").map(s => s.trim()).filter(Boolean);
  const position = document.getElementById("batchPosition").value;
  const isCaptain = document.getElementById("batchIsCaptain").checked;
  if (names.length === 0) { alert("Debes ingresar al menos un nombre."); return; }

  names.forEach(nombre => {
    jugadores.push({ id: uuid(), nombre, posicion: position, capitan: isCaptain });
  });
  textarea.value = "";
  document.getElementById("batchIsCaptain").checked = false;
  renderPlayersList();
});

function renderPlayersList() {
  const list = document.getElementById("playersList");
  list.innerHTML = "";
  jugadores.forEach(j => {
    const li = document.createElement("li");
    li.innerHTML = `${j.nombre} (${j.posicion}) ${j.capitan ? "⭐" : ""} <button class="removePlayer" data-id="${j.id}">❌</button>`;
    list.appendChild(li);
  });
  document.querySelectorAll(".removePlayer").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.target.getAttribute("data-id");
      jugadores = jugadores.filter(x => x.id !== id);
      renderPlayersList();
    });
  });
}

document.getElementById("toStep1").addEventListener("click", () => showStep(1));
document.getElementById("toStep3").addEventListener("click", () => {
  if (jugadores.length < numTeams) { alert("No hay jugadores suficientes para los equipos."); return; }
  renderReviewTable();
  showStep(3);
});

// --------------------------
// Paso 3: Revisión
// --------------------------
function renderReviewTable() {
  const tbody = document.querySelector("#reviewTable tbody");
  tbody.innerHTML = "";
  jugadores.forEach(j => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${j.nombre}</td><td>${j.posicion}</td><td>${j.capitan ? "Sí" : "No"}</td><td><button class="deleteBtn" data-id="${j.id}">Eliminar</button></td>`;
    tbody.appendChild(tr);
  });
  document.querySelectorAll(".deleteBtn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.target.getAttribute("data-id");
      jugadores = jugadores.filter(x => x.id !== id);
      renderReviewTable();
      renderPlayersList();
    });
  });
}

document.getElementById("toStep2b").addEventListener("click", () => showStep(2));
document.getElementById("toStep4").addEventListener("click", () => {
  const equipos = sortearEquiposBalanceados();
  mostrarResultados(equipos);
  showStep(4);
});

// --------------------------
// Sorteo balanceado por posición (corregido)
// --------------------------
function sortearEquiposBalanceados() {
  const equipos = Array.from({ length: numTeams }, (_, i) => ({ nombre: `Equipo ${i+1}`, jugadores: [] }));

  // Separar capitanes y resto
  const capitanes = jugadores.filter(j => j.capitan).slice(); // copia
  const resto = jugadores.filter(j => !j.capitan).slice();
  if (capitanes.length < numTeams) { alert("Debe haber al menos un capitán por equipo."); return equipos; }

  shuffle(capitanes);
  shuffle(resto);

  // 1) Asignar 1 capitán por equipo
  for (let i = 0; i < numTeams; i++) {
    equipos[i].jugadores.push(capitanes[i]);
  }

  // Pool = resto + capitanes sobrantes (si los hay)
  let pool = resto.concat(capitanes.slice(numTeams));
  shuffle(pool);

  // Agrupar pool por posición
  const posiciones = ["ARQ","DFC","DFL","MED","DEL"];
  const poolByPos = {};
  posiciones.forEach(p => poolByPos[p] = pool.filter(x => x.posicion === p));

  // Calcular conteos iniciales por equipo y por posición (incluyendo capitán asignado)
  const teamPosCounts = equipos.map(team => {
    const map = {}; posiciones.forEach(p => map[p]=0);
    team.jugadores.forEach(pl => { map[pl.posicion] = (map[pl.posicion]||0) + 1; });
    return map;
  });

  // Para cada posición, calcular total y distribuir equitativamente
  posiciones.forEach(pos => {
    // total de esta posición = ya asignados en equipos (captains) + poolByPos[pos].length
    const assignedInTeams = teamPosCounts.reduce((s, m) => s + (m[pos] || 0), 0);
    const available = poolByPos[pos].slice(); // copia local
    const totalPos = assignedInTeams + available.length;

    // Si no hay jugadores de esta posición, saltar
    if (totalPos === 0) return;

    const base = Math.floor(totalPos / numTeams);
    let remainder = totalPos % numTeams;

    // Ordenar equipos por menor cantidad actual de esta posición (priorizar quien tiene menos)
    const teamsOrder = Array.from({length: numTeams}, (_,i) => i).sort((a,b) => teamPosCounts[a][pos] - teamPosCounts[b][pos]);

    // Desired count por equipo para esta posición
    const desired = Array(numTeams).fill(base);
    for (let k = 0; k < remainder; k++) desired[teamsOrder[k]]++;

    // Ahora asignar desde available para cumplir desired - current
    for (let teamIdx = 0; teamIdx < numTeams; teamIdx++) {
      const need = Math.max(0, desired[teamIdx] - (teamPosCounts[teamIdx][pos] || 0));
      for (let c = 0; c < need; c++) {
        if (available.length === 0) break;
        const jugador = available.shift();
        equipos[teamIdx].jugadores.push(jugador);
        teamPosCounts[teamIdx][pos] = (teamPosCounts[teamIdx][pos] || 0) + 1;
        // También remove from global poolByPos (we'll sync by shifting from poolByPos)
      }
    }

    // Update poolByPos[pos] to remaining ones (if any)
    poolByPos[pos] = available;
  });

  // Si quedó algún jugador en pool (por si no entraron por redondeos), repartir por balance total
  let remaining = [].concat(...Object.values(poolByPos));
  shuffle(remaining);
  if (remaining.length > 0) {
    // repartir round-robin intentando balancear tamaño total
    let idx = 0;
    remaining.forEach(j => {
      // elegir equipo con menor tamaño actual (para más balance)
      const sizes = equipos.map(e => e.jugadores.length);
      const minIdx = sizes.indexOf(Math.min(...sizes));
      equipos[minIdx].jugadores.push(j);
    });
  }

  // Balance final: mover no-capitanes hasta que la diferencia máxima sea 1
  balancearEquipos(equipos);

  return equipos;
}

function balancearEquipos(equipos) {
  let iter = 0;
  while (iter < 500) {
    const sizes = equipos.map(e => e.jugadores.length);
    const maxSize = Math.max(...sizes);
    const minSize = Math.min(...sizes);
    if (maxSize - minSize <= 1) break;

    const fromIdx = sizes.indexOf(maxSize);
    const toIdx = sizes.indexOf(minSize);

    // buscar jugador no-capitán del equipo grande que al mover no rompa el balance por posición severamente
    const candidate = equipos[fromIdx].jugadores.find(j => !j.capitan);
    if (!candidate) break; // no se puede mover
    // mover
    equipos[fromIdx].jugadores = equipos[fromIdx].jugadores.filter(j => j.id !== candidate.id);
    equipos[toIdx].jugadores.push(candidate);
    iter++;
  }
}

// --------------------------
// Mostrar resultados
// --------------------------
function mostrarResultados(equipos) {
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";
  let totalJugadores = 0;
  equipos.forEach(eq => {
    const card = document.createElement("div");
    card.className = "team-card";
    const capitan = eq.jugadores.find(j => j.capitan);
    const numJugadores = eq.jugadores.length;
    totalJugadores += numJugadores;
    card.innerHTML = `
      <h4>${eq.nombre}</h4>
      <p><strong>Capitán:</strong> ${capitan ? capitan.nombre : "Ninguno"}</p>
      <p><strong>Número de jugadores:</strong> ${numJugadores}</p>
      <ul>
        ${eq.jugadores.map(j => `<li>${j.nombre} (${j.posicion}) ${j.capitan ? "⭐" : ""}</li>`).join("")}
      </ul>
    `;
    resultsDiv.appendChild(card);
  });
  const resumen = document.createElement("p");
  resumen.innerHTML = `<strong>Total de jugadores:</strong> ${totalJugadores}`;
  resultsDiv.appendChild(resumen);
}

// --------------------------
// Extras: export / imprimir
// --------------------------
document.getElementById("restart").addEventListener("click", () => location.reload());
document.getElementById("printBtn").addEventListener("click", () => window.print());
document.getElementById("downloadJson").addEventListener("click", () => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jugadores, null, 2));
  const dlAnchor = document.createElement("a");
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", "jugadores.json");
  dlAnchor.click();
});

// Inicializar vista
showStep(1);
