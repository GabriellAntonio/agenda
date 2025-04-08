const { createClient } = supabase;

// ⛅ Substitua com sua URL e chave do projeto Supabase
const SUPABASE_URL = 'https://dkbirnicdksacmabxixk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrYmlybmljZGtzYWNtYWJ4aXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4NTg5NDksImV4cCI6MjA1OTQzNDk0OX0.dNyZ5AaXyV8rMDa_XyGYsw4oHb7WOalIW6WcZwVqPXk';
const client = createClient(SUPABASE_URL, SUPABASE_KEY);

const calendar = document.getElementById('calendar');
const eventForm = document.getElementById('event-form');
const eventDateInput = document.getElementById('event-date');
const eventTitleInput = document.getElementById('event-title');
const eventDescInput = document.getElementById('event-desc');
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
      events[ev.date].push({ id: ev.id, title: ev.title, desc: ev.description });
    });
    loadCalendar();
  }
}

async function addEvent(date, title, desc) {
  await client.from('events').insert({ date, title, description: desc });
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

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const dayEl = document.createElement('div');
    dayEl.className = 'day';
    dayEl.dataset.date = dateStr;
    dayEl.innerHTML = `<div class="date">${day}</div>`;

    if (events[dateStr]) {
      events[dateStr].forEach((ev) => {
        const evEl = document.createElement('div');
evEl.className = 'event';
evEl.innerHTML = `
  <strong>${ev.title}</strong>
  <div class="actions">
    <button onclick="editEvent('${ev.id}', '${encodeURIComponent(ev.title)}', '${encodeURIComponent(ev.desc)}', '${dateStr}')">✏️</button>
    <button onclick="deleteEvent('${ev.id}')">🗑️</button>
  </div>
`;

// Adiciona clique para abrir o modal com detalhes
evEl.addEventListener("click", (e) => {
  // Evita que os botões dentro do evento disparem o modal
  if (e.target.tagName !== "BUTTON") {
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

    dayEl.onclick = () => {
      eventDateInput.value = dateStr;
      loadEventList(dateStr);
    };

    calendar.appendChild(dayEl);
  }
}

function loadEventList(date) {
  eventList.innerHTML = '';
  const evs = events[date] || [];
  if (evs.length === 0) {
    eventList.innerText = 'Sem eventos para este dia.';
  } else {
    evs.forEach((ev) => {
      const el = document.createElement('div');
      el.innerText = `${ev.title} - ${ev.desc}`;
      eventList.appendChild(el);
    });
  }
}

window.editEvent = function(id, title, desc, date) {
  editingEventId = id;
  eventDateInput.value = date;
  eventTitleInput.value = decodeURIComponent(title);
  eventDescInput.value = decodeURIComponent(desc);
};

window.changeMonth = function(offset) {
  currentDate.setMonth(currentDate.getMonth() + offset);
  loadCalendar();
};

eventForm.onsubmit = async (e) => {
  e.preventDefault();
  const date = eventDateInput.value;
  const title = eventTitleInput.value;
  const desc = eventDescInput.value;

  if (editingEventId) {
    await updateEvent(editingEventId, title, desc);
    editingEventId = null;
  } else {
    await addEvent(date, title, desc);
  }

  eventForm.reset();
};

fetchEvents();
// Abrir modal com os detalhes do evento
function openEventModal(event) {
  const modal = document.getElementById("event-modal");
  const title = document.getElementById("modal-title");
  const date = document.getElementById("modal-date");
  const description = document.getElementById("modal-description");

  title.textContent = event.title;
  date.textContent = `Data: ${event.date}`;
  description.textContent = event.description || "Sem descrição";

  modal.classList.remove("hidden");
}

// Fechar modal
document.getElementById("close-modal").addEventListener("click", () => {
  document.getElementById("event-modal").classList.add("hidden");
});
// Fechar o modal com a tecla ESC
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    document.getElementById("event-modal").classList.add("hidden");
  }
});



