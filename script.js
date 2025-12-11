const { createClient } = supabase;

const SUPABASE_URL = 'https://dkbirnicdksacmabxixk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrYmlybmljZGtzYWNtYWJ4aXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4NTg5NDksImV4cCI6MjA1OTQzNDk0OX0.dNyZ5AaXyV8rMDa_XyGYsw4oHb7WOalIW6WcZwVqPXk';
const client = createClient(SUPABASE_URL, SUPABASE_KEY);

const calendar = document.getElementById('calendar');
const eventList = document.getElementById('event-list');
const monthYearLabel = document.getElementById('month-year');

let events = {};
let editingEventId = null;
let currentDate = new Date();

async function fetchEvents() {
  const { data, error } = await client.from('events').select('*');
  if (!error) {
    events = {};
    data.forEach(ev => {
      if (!events[ev.date]) events[ev.date] = [];
      events[ev.date].push({
        id: ev.id,
        title: ev.title,
        desc: ev.description,
        done: ev.done
      });
    });
    loadCalendar();
  }
}
let relatorioDataReferencia = new Date();

async function addEvent(date, title, desc) {
  await client.from('events').insert({ date, title, description: desc, done: false });
  fetchEvents();
}

async function updateEvent(id, title, desc) {
  await client.from('events').update({ title, description: desc }).eq('id', id);
  fetchEvents();
}

async function deleteEvent(id) {
  await client.from('events').delete().eq('id', id);
  fetchEvents();
}

window.toggleDone = async function(id, status) {
  const { error } = await client.from('events').update({ done: status }).eq('id', id);
  if (!error) {
    fetchEvents();
  }
};

function openEventModalEdit({ id = null, title = "", description = "", date }) {
  document.getElementById("modal-event-id").value = id || "";
  document.getElementById("modal-event-title").value = title;
  document.getElementById("modal-event-desc").value = description;
  document.getElementById("modal-event-date").value = date;

  document.getElementById("modal-title-label").textContent = id ? "Editar Evento" : "Adicionar Evento";
  document.getElementById("event-modal").classList.remove("hidden");
}

function loadCalendar() {
  calendar.innerHTML = '';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  monthYearLabel.innerText = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  weekdays.forEach(day => {
    const header = document.createElement('div');
    header.className = 'day-header';
    header.innerText = day;
    calendar.appendChild(header);
  });

  const firstDay = new Date(year, month, 1).getDay();
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'day';
    calendar.appendChild(empty);
  }

  const today = new Date();
  
  // Feriados fixos (mantidos)
  const feriadosFixos = {
    [`${year}-01-01`]: 'Ano Novo 🥂',
    [`${year}-04-21`]: 'Tiradentes 🫡',
    [`${year}-05-01`]: 'Dia do Trabalho',
    [`${year}-09-07`]: 'Independência do Brasil 🇧🇷',
    [`${year}-10-12`]: 'Nossa Senhora Aparecida 👸🏾',
    [`${year}-11-02`]: 'Finados 🪦',
    [`${year}-11-15`]: 'Proclamação da República🫡',
    [`${year}-11-20`]: 'Dia da Consciência Negra ✊🏿',
    [`${year}-12-25`]: 'Natal 🎅',
  };

  // --- LÓGICA DE VÉSPERAS (Somente Natal e Ano Novo) ---
  // Removido o loop automático e definido manualmente:
  const vesperas = {
    [`${year}-12-24`]: 'Véspera de Natal 🎄',
    [`${year}-12-31`]: 'Véspera de Ano Novo 🥂'
  };

  for (let day = 1; day <= daysInMonth; day++) {
    const monthStr = (month + 1).toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    const dateStr = `${year}-${monthStr}-${dayStr}`;

    const dayEl = document.createElement('div');
    dayEl.className = 'day';
    dayEl.dataset.date = dateStr;

    const dateDiv = document.createElement('div');
    dateDiv.className = 'date';
    dateDiv.innerText = day;
    dayEl.appendChild(dateDiv);

    // 1. Verifica Feriado Fixo
    if (feriadosFixos[dateStr]) {
      const feriadoEl = document.createElement('div');
      feriadoEl.className = 'feriado-nome';
      feriadoEl.innerText = feriadosFixos[dateStr];
      dayEl.appendChild(feriadoEl);
      dayEl.classList.add('holiday');
    }
    // 2. Verifica Véspera (Natal e Ano Novo apenas)
    else if (vesperas[dateStr]) {
      const vesperaEl = document.createElement('div');
      vesperaEl.className = 'feriado-nome';
      vesperaEl.innerText = vesperas[dateStr];
      dayEl.appendChild(vesperaEl);
      dayEl.classList.add('holiday');
    }

    // 3. Verifica Eventos e "Recessos" Manuais
    if (events[dateStr]) {
      
      // Verifica se algum evento do dia tem "Recesso" no título ou descrição
      const temRecessoManual = events[dateStr].some(ev => 
        (ev.title && ev.title.toLowerCase().includes('recesso')) || 
        (ev.desc && ev.desc.toLowerCase().includes('recesso'))
      );

      if (temRecessoManual) {
        dayEl.classList.add('holiday'); // Pinta o dia de vermelho
      }

      events[dateStr].forEach((ev) => {
        const evEl = document.createElement('div');
        
        const eventDate = new Date(dateStr);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const isPast = eventDate < hoje;
        const isDone = ev.done;

        let eventClass = 'event';
        let textDecoration = 'none';
        let bgColor = '';

        if (isDone) {
          eventClass += ' done';
          textDecoration = 'line-through';
        } else if (isPast && !isDone) {
          bgColor = 'background-color: #ffcccc !important;'; 
          textDecoration = 'line-through';
        }

        evEl.className = eventClass;

        evEl.innerHTML = `
          <label style="display: flex; align-items: center; gap: 5px; ${bgColor}">
            <input type="checkbox" ${isDone ? 'checked' : ''} onchange="toggleDone('${ev.id}', this.checked)">
            <span style="text-decoration: ${textDecoration};">${ev.title}</span>
          </label>
          <div class="actions">
            <button onclick="editEvent('${ev.id}', '${encodeURIComponent(ev.title)}', '${encodeURIComponent(ev.desc)}', '${dateStr}')">✏️</button>
            <button onclick="deleteEvent('${ev.id}')">🗑️</button>
          </div>
        `;

        evEl.addEventListener("click", (e) => {
          if (e.target.tagName !== "BUTTON" && e.target.type !== "checkbox") {
            openEventModal({
              title: ev.title,
              description: ev.desc,
              date: dateStr
            });
          }
        });

        dayEl.appendChild(evEl);
      });
    }

    if (today.toDateString() === new Date(year, month, day).toDateString()) {
      dayEl.classList.add('today');
    }

    dayEl.onclick = (e) => {
      if (e.target.closest('.event')) return;
      openEventModalEdit({
        date: dateStr
      });
    };

    calendar.appendChild(dayEl);
  }
}

function loadEventList(date) {
  if (!eventList) return; 
  eventList.innerHTML = '';
  const evs = events[date] || [];
  if (evs.length === 0) {
    eventList.innerText = 'Sem eventos para este dia.';
  } else {
    evs.forEach((ev) => {
      const el = document.createElement('div');
      el.innerText = `${ev.title} - ${ev.desc} (${formatarDataBrasileira(date)})`;
      eventList.appendChild(el);
    });
  }
}

function formatarDataBrasileira(dataISO) {
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}

window.editEvent = function(id, title, desc, date) {
  openEventModalEdit({
    id,
    title: decodeURIComponent(title),
    description: decodeURIComponent(desc),
    date
  });
};

window.changeMonth = function(offset) {
  currentDate.setMonth(currentDate.getMonth() + offset);
  loadCalendar();
};

fetchEvents();

function openEventModal(event) {
  editEvent(null, event.title, event.description, event.date);
}

document.getElementById("close-modal").addEventListener("click", () => {
  document.getElementById("event-modal").classList.add("hidden");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    document.getElementById("event-modal").classList.add("hidden");
    document.getElementById("relatorio-modal").classList.add("hidden");
  }
});

document.getElementById("modal-event-form").addEventListener("submit", async function (e) {
  e.preventDefault();

  const id = document.getElementById("modal-event-id").value;
  const date = document.getElementById("modal-event-date").value;
  const title = document.getElementById("modal-event-title").value;
  const desc = document.getElementById("modal-event-desc").value;

  if (id) {
    await updateEvent(id, title, desc);
  } else {
    await addEvent(date, title, desc);
  }

  document.getElementById("modal-event-form").reset();
  document.getElementById("event-modal").classList.add("hidden");
});

function abrirRelatorio() {
  relatorioDataReferencia = new Date(); 
  gerarRelatorioSemana(); 
  document.getElementById("relatorio-modal").classList.remove("hidden");
}

document.getElementById("close-relatorio").addEventListener("click", () => {
  document.getElementById("relatorio-modal").classList.add("hidden");
});

function mudarSemanaRelatorio(offset) {
  relatorioDataReferencia.setDate(relatorioDataReferencia.getDate() + offset);
  gerarRelatorioSemana();
}

function gerarRelatorioSemana() {
  const inicioSemana = new Date(relatorioDataReferencia); 
  inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay()); // Domingo
  const fimSemana = new Date(inicioSemana);
  fimSemana.setDate(inicioSemana.getDate() + 6); // Sábado

  let html = `<p><b>Período:</b> ${formatarDataBrasileira(inicioSemana.toISOString().split('T')[0])} a ${formatarDataBrasileira(fimSemana.toISOString().split('T')[0])}</p>`;
  html += "<ul>";

  let encontrou = false;
  for (let d = new Date(inicioSemana); d <= fimSemana; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    if (events[dateStr] && events[dateStr].length > 0) {
      events[dateStr].forEach(ev => {
        html += `<li><b>${formatarDataBrasileira(dateStr)}</b>: ${ev.title} - ${ev.desc} ${ev.done ? "(✔ Concluído)" : ""}</li>`;
        encontrou = true;
      });
    }
  }

  if (!encontrou) {
    html += "<li>Nenhum evento agendado nesta semana.</li>";
  }

  html += "</ul>";
  document.getElementById("relatorio-conteudo").innerHTML = html;
}
