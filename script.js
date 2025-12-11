const { createClient } = supabase;

const SUPABASE_URL = 'https://dkbirnicdksacmabxixk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrYmlybmljZGtzYWNtYWJ4aXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4NTg5NDksImV4cCI6MjA1OTQzNDk0OX0.dNyZ5AaXyV8rMDa_XyGYsw4oHb7WOalIW6WcZwVqPXk';
const client = createClient(SUPABASE_URL, SUPABASE_KEY);

const calendar = document.getElementById('calendar');
const eventList = document.getElementById('event-list');
const monthYearLabel = document.getElementById('month-year');
const loadingOverlay = document.getElementById('loading-overlay'); // Novo

let events = {};
let currentDate = new Date();

// --- FUNÇÕES DE CONTROLE DE LOADING ---
function showLoading() {
  if (loadingOverlay) loadingOverlay.classList.remove('hidden');
}
function hideLoading() {
  if (loadingOverlay) loadingOverlay.classList.add('hidden');
}

// --- BANCO DE DADOS ---
async function fetchEvents() {
  showLoading(); // Mostra spinner
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
  } else {
    console.error("Erro ao buscar eventos:", error);
  }
  hideLoading(); // Esconde spinner
}

async function addEvent(date, title, desc) {
  showLoading();
  await client.from('events').insert({ date, title, description: desc, done: false });
  fetchEvents();
}

async function updateEvent(id, title, desc) {
  showLoading();
  await client.from('events').update({ title, description: desc }).eq('id', id);
  fetchEvents();
}

async function deleteEvent(id) {
  if(!confirm("Tem certeza que deseja excluir?")) return; // Confirmação básica
  showLoading();
  await client.from('events').delete().eq('id', id);
  fetchEvents();
}

window.toggleDone = async function(id, status) {
  // Não bloqueia tela para checkbox, mas atualiza visual
  const { error } = await client.from('events').update({ done: status }).eq('id', id);
  if (!error) {
    // Atualiza localmente para não precisar recarregar tudo
    for (let date in events) {
      const ev = events[date].find(e => e.id == id);
      if (ev) { ev.done = status; break; }
    }
    loadCalendar(); // Redesenha apenas para aplicar estilos
  }
};

// --- NAVEGAÇÃO ---
window.changeMonth = function(offset) {
  currentDate.setMonth(currentDate.getMonth() + offset);
  loadCalendar();
};

window.goToToday = function() {
  currentDate = new Date();
  loadCalendar();
};

// --- RENDERIZAÇÃO ---
function loadCalendar() {
  calendar.innerHTML = '';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Primeira letra maiúscula no mês
  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long' });
  monthYearLabel.innerText = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;

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
    empty.style.background = 'transparent'; // Remove fundo dos dias vazios
    empty.style.cursor = 'default';
    calendar.appendChild(empty);
  }

  const today = new Date();
  
  const feriadosFixos = {
    [`${year}-01-01`]: 'Ano Novo 🥂',
    [`${year}-04-21`]: 'Tiradentes 🫡',
    [`${year}-05-01`]: 'Dia do Trabalho',
    [`${year}-09-07`]: 'Independência 🇧🇷',
    [`${year}-10-12`]: 'N. Sra. Aparecida 👸🏾',
    [`${year}-11-02`]: 'Finados 🪦',
    [`${year}-11-15`]: 'Proc. República 🫡',
    [`${year}-11-20`]: 'Consciência Negra ✊🏿',
    [`${year}-12-25`]: 'Natal 🎅',
  };

  const vesperas = {
    [`${year}-12-24`]: 'Véspera Natal 🎄',
    [`${year}-12-31`]: 'Véspera Ano Novo 🥂'
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

    // Feriados e Vésperas
    if (feriadosFixos[dateStr]) {
      addLabelToDay(dayEl, feriadosFixos[dateStr], 'holiday');
    } else if (vesperas[dateStr]) {
      addLabelToDay(dayEl, vesperas[dateStr], 'holiday');
    }

    // Eventos
    if (events[dateStr]) {
      // Recesso Manual
      const temRecesso = events[dateStr].some(ev => 
        (ev.title && ev.title.toLowerCase().includes('recesso')) || 
        (ev.desc && ev.desc.toLowerCase().includes('recesso'))
      );
      if (temRecesso) dayEl.classList.add('holiday');

      // Limitar visualização a 2 eventos para não estourar o card
      const MAX_VISIBLE = 2;
      const dayEvents = events[dateStr];
      
      dayEvents.slice(0, MAX_VISIBLE).forEach((ev) => {
        const evEl = createEventElement(ev, dateStr);
        dayEl.appendChild(evEl);
      });

      // Se tiver mais eventos, mostra aviso
      if (dayEvents.length > MAX_VISIBLE) {
        const moreDiv = document.createElement('div');
        moreDiv.className = 'more-events';
        moreDiv.innerText = `+ ${dayEvents.length - MAX_VISIBLE} evento(s)`;
        dayEl.appendChild(moreDiv);
      }
    }

    if (today.toDateString() === new Date(year, month, day).toDateString()) {
      dayEl.classList.add('today');
    }

    // Clique no dia (fundo) abre modal para criar
    dayEl.onclick = (e) => {
      if (e.target.closest('.event') || e.target.closest('input') || e.target.closest('button')) return;
      openEventModalEdit({ date: dateStr });
    };

    calendar.appendChild(dayEl);
  }
}

function addLabelToDay(element, text, className) {
  const div = document.createElement('div');
  div.className = 'feriado-nome';
  div.innerText = text;
  element.appendChild(div);
  element.classList.add(className);
}

function createEventElement(ev, dateStr) {
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
    bgColor = 'background-color: #fab1a0 !important;'; // Vermelho claro suave
  }

  evEl.className = eventClass;
  // Usando CSS Text-Overflow na classe .event-text
  evEl.innerHTML = `
    <label style="${bgColor}" title="${ev.title}">
      <input type="checkbox" ${isDone ? 'checked' : ''} onchange="toggleDone('${ev.id}', this.checked)">
      <span class="event-text" style="text-decoration: ${textDecoration};">${ev.title}</span>
    </label>
    <div class="actions">
      <button onclick="editEvent('${ev.id}', '${encodeURIComponent(ev.title)}', '${encodeURIComponent(ev.desc)}', '${dateStr}')">✏️</button>
      <button onclick="deleteEvent('${ev.id}')">🗑️</button>
    </div>
  `;
  return evEl;
}

// --- MODAIS ---
function openEventModalEdit({ id = null, title = "", description = "", date }) {
  document.getElementById("modal-event-id").value = id || "";
  document.getElementById("modal-event-title").value = title;
  document.getElementById("modal-event-desc").value = description;
  document.getElementById("modal-event-date").value = date;

  document.getElementById("modal-title-label").textContent = id ? "Editar Evento" : "Adicionar Evento";
  document.getElementById("event-modal").classList.remove("hidden");
}

window.editEvent = function(id, title, desc, date) {
  openEventModalEdit({
    id,
    title: decodeURIComponent(title),
    description: decodeURIComponent(desc),
    date
  });
};

document.getElementById("close-modal").addEventListener("click", () => {
  document.getElementById("event-modal").classList.add("hidden");
});

document.getElementById("modal-event-form").addEventListener("submit", async function (e) {
  e.preventDefault();
  const id = document.getElementById("modal-event-id").value;
  const date = document.getElementById("modal-event-date").value;
  const title = document.getElementById("modal-event-title").value;
  const desc = document.getElementById("modal-event-desc").value;

  if (id) await updateEvent(id, title, desc);
  else await addEvent(date, title, desc);

  this.reset();
  document.getElementById("event-modal").classList.add("hidden");
});

// --- RELATÓRIO ---
let relatorioDataReferencia = new Date();

window.abrirRelatorio = function() {
  relatorioDataReferencia = new Date(); 
  gerarRelatorioSemana(); 
  document.getElementById("relatorio-modal").classList.remove("hidden");
}

window.mudarSemanaRelatorio = function(offset) {
  relatorioDataReferencia.setDate(relatorioDataReferencia.getDate() + offset);
  gerarRelatorioSemana();
}

function gerarRelatorioSemana() {
  const inicioSemana = new Date(relatorioDataReferencia); 
  inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay()); 
  const fimSemana = new Date(inicioSemana);
  fimSemana.setDate(inicioSemana.getDate() + 6);

  function fmt(d) { return d.split('-').reverse().join('/'); }

  let html = `<p style="text-align:center; margin-bottom:15px;">
    <b>${fmt(inicioSemana.toISOString().split('T')[0])}</b> até <b>${fmt(fimSemana.toISOString().split('T')[0])}</b>
  </p><ul style="list-style:none; padding:0;">`;

  let encontrou = false;
  for (let d = new Date(inicioSemana); d <= fimSemana; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    if (events[dateStr] && events[dateStr].length > 0) {
      events[dateStr].forEach(ev => {
        html += `<li style="background:#f1f2f6; margin:5px 0; padding:8px; border-radius:4px; border-left: 4px solid ${ev.done ? '#00b894' : '#d63031'}">
          <b>${fmt(dateStr)}</b>: ${ev.title} <br>
          <small style="color:#636e72">${ev.desc}</small> 
          ${ev.done ? "✅" : ""}
        </li>`;
        encontrou = true;
      });
    }
  }
  if (!encontrou) html += "<li style='text-align:center; color:#888;'>Nenhum evento nesta semana.</li>";
  html += "</ul>";
  
  document.getElementById("relatorio-conteudo").innerHTML = html;
}

document.getElementById("close-relatorio").addEventListener("click", () => {
  document.getElementById("relatorio-modal").classList.add("hidden");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    document.getElementById("event-modal").classList.add("hidden");
    document.getElementById("relatorio-modal").classList.add("hidden");
  }
});

// Inicialização
fetchEvents();
