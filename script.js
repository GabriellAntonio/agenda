const { createClient } = supabase;

const SUPABASE_URL = 'https://dkbirnicdksacmabxixk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrYmlybmljZGtzYWNtYWJ4aXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4NTg5NDksImV4cCI6MjA1OTQzNDk0OX0.dNyZ5AaXyV8rMDa_XyGYsw4oHb7WOalIW6WcZwVqPXk';
const client = createClient(SUPABASE_URL, SUPABASE_KEY);

const calendar = document.getElementById('calendar');
const monthYearLabel = document.getElementById('month-year');
const loadingOverlay = document.getElementById('loading-overlay');

let events = {};
let currentDate = new Date();

// --- LOADING ---
function showLoading() { if (loadingOverlay) loadingOverlay.classList.remove('hidden'); }
function hideLoading() { if (loadingOverlay) loadingOverlay.classList.add('hidden'); }

// --- BANCO DE DADOS ---
async function fetchEvents() {
    showLoading();
    const { data, error } = await client.from('events').select('*');
    if (!error) {
        events = {};
        data.forEach(ev => {
            if (!events[ev.date]) events[ev.date] = [];
            events[ev.date].push({
                id: ev.id,
                title: ev.title,
                desc: ev.description,
                done: ev.done,
                type: ev.type || 'normal'
            });
        });
        loadCalendar();
    }
    hideLoading();
}

async function addEvent(date, title, desc, type) {
    showLoading();
    await client.from('events').insert({ date, title, description: desc, done: false, type: type });
    fetchEvents();
}

async function updateEvent(id, title, desc, type) {
    showLoading();
    await client.from('events').update({ title, description: desc, type: type }).eq('id', id);
    fetchEvents();
}

async function deleteEvent(id) {
    if (!confirm("Tem certeza que deseja excluir?")) return;
    showLoading();
    await client.from('events').delete().eq('id', id);
    fetchEvents();
}

window.toggleDone = async function (id, status) {
    const { error } = await client.from('events').update({ done: status }).eq('id', id);
    if (!error) {
        fetchEvents();
    }
};

// --- NAVEGAÇÃO ---
window.changeMonth = function (offset) {
    currentDate.setMonth(currentDate.getMonth() + offset);
    loadCalendar();
};

window.goToToday = function () {
    currentDate = new Date();
    loadCalendar();
};

// --- RENDERIZAÇÃO ---
function loadCalendar() {
    calendar.innerHTML = '';
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

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
        empty.style.background = 'transparent';
        empty.style.border = 'none';
        calendar.appendChild(empty);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

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

        // --- DRAG & DROP: ZONA DE DROP ---
        dayEl.ondragover = (e) => e.preventDefault();
        dayEl.ondragenter = () => dayEl.classList.add('drag-over');
        dayEl.ondragleave = () => dayEl.classList.remove('drag-over');
        dayEl.ondrop = async (e) => {
            e.preventDefault();
            dayEl.classList.remove('drag-over');
            const eventId = e.dataTransfer.getData("text/plain");
            const newDate = dayEl.dataset.date;
            showLoading();
            const { error } = await client.from('events').update({ date: newDate }).eq('id', eventId);
            if (!error) fetchEvents();
            else hideLoading();
        };

        if (feriadosFixos[dateStr]) addLabelToDay(dayEl, feriadosFixos[dateStr], 'holiday');
        else if (vesperas[dateStr]) addLabelToDay(dayEl, vesperas[dateStr], 'holiday');

        if (events[dateStr]) {
            events[dateStr].forEach(ev => {
                if (ev.type === 'feriado') dayEl.classList.add('feriado-manual');
                if (ev.type === 'bloqueado') dayEl.classList.add('bloqueado-manual');
            });
            events[dateStr].forEach(ev => dayEl.appendChild(createEventElement(ev, dateStr)));
        }

        if (today.toDateString() === new Date(year, month, day).toDateString()) dayEl.classList.add('today');

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
    const isDone = ev.done;
    const eventDate = new Date(dateStr + 'T00:00:00');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let bgColor = '';
    // SE PASSOU E NÃO FOI FEITO: FICA VERMELHO
    if (!isDone && eventDate < hoje) {
        bgColor = 'background-color: #fab1a0 !important;'; 
    }

    evEl.className = `event ${isDone ? 'done' : ''}`;
    evEl.draggable = true;
    evEl.ondragstart = (e) => {
        e.dataTransfer.setData("text/plain", ev.id);
        evEl.style.opacity = "0.4";
    };
    evEl.ondragend = () => evEl.style.opacity = "1";

    evEl.innerHTML = `
    <label style="${bgColor}" title="${ev.title}">
      <input type="checkbox" ${isDone ? 'checked' : ''} onchange="toggleDone('${ev.id}', this.checked)">
      <span class="event-text" style="text-decoration: ${isDone ? 'line-through' : 'none'};">${ev.title}</span>
    </label>
    <div class="actions">
      <button onclick="editEvent('${ev.id}', '${encodeURIComponent(ev.title)}', '${encodeURIComponent(ev.desc)}', '${dateStr}', '${ev.type}')">✏️</button>
      <button onclick="deleteEvent('${ev.id}')">🗑️</button>
    </div>
  `;
    return evEl;
}

// --- MODAIS ---
function openEventModalEdit({ id = null, title = "", description = "", date, type = "normal" }) {
    document.getElementById("modal-event-id").value = id || "";
    document.getElementById("modal-event-title").value = title;
    document.getElementById("modal-event-desc").value = description;
    document.getElementById("modal-event-date").value = date;
    document.getElementById("modal-event-type").value = type;
    document.getElementById("modal-title-label").textContent = id ? "Editar Evento" : "Adicionar Evento";
    document.getElementById("event-modal").classList.remove("hidden");
}

window.editEvent = function (id, title, desc, date, type) {
    openEventModalEdit({ id, title: decodeURIComponent(title), description: decodeURIComponent(desc), date, type });
};

document.getElementById("modal-event-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    const id = document.getElementById("modal-event-id").value;
    const date = document.getElementById("modal-event-date").value;
    let title = document.getElementById("modal-event-title").value.trim();
    const desc = document.getElementById("modal-event-desc").value;
    const type = document.getElementById("modal-event-type").value;

    if (type === 'normal' && !title) {
        alert("Por favor, preencha o título para eventos normais.");
        return;
    }
    if (!title) title = (type === 'feriado') ? "Feriado" : "Dia Bloqueado";

    if (id) await updateEvent(id, title, desc, type);
    else await addEvent(date, title, desc, type);

    this.reset();
    document.getElementById("event-modal").classList.add("hidden");
});

document.getElementById("close-modal").onclick = () => document.getElementById("event-modal").classList.add("hidden");

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

window.copiarRelatorio = function() {
  const container = document.getElementById("relatorio-conteudo");
  if (!container) return;
  navigator.clipboard.writeText(container.innerText).then(() => {
    const btn = document.querySelector('.btn-copy');
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = "✅ Copiado!";
    setTimeout(() => { btn.innerHTML = textoOriginal; }, 2000);
  });
};

document.getElementById("close-relatorio").onclick = () => document.getElementById("relatorio-modal").classList.add("hidden");

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    document.getElementById("event-modal").classList.add("hidden");
    document.getElementById("relatorio-modal").classList.add("hidden");
  }
});

fetchEvents();
