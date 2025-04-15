
const { createClient } = supabase;

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
  const feriadosFixos = {
    [`${year}-01-01`]: 'Ano Novo',
    [`${year}-04-21`]: 'Tiradentes',
    [`${year}-05-01`]: 'Dia do Trabalho',
    [`${year}-09-07`]: 'Independência do Brasil',
    [`${year}-10-12`]: 'Nossa Senhora Aparecida',
    [`${year}-11-02`]: 'Finados',
    [`${year}-11-15`]: 'Proclamação da República',
    [`${year}-11-20`]: 'Dia da Consciência Negra',
    [`${year}-12-25`]: 'Natal',
    [`${year}-12-31`]: 'Véspera de Ano Novo '
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

    if (feriadosFixos[dateStr]) {
      const feriadoEl = document.createElement('div');
      feriadoEl.className = 'feriado-nome';
      feriadoEl.innerText = feriadosFixos[dateStr];
      dayEl.appendChild(feriadoEl);
      dayEl.classList.add('holiday');
    }

    if (today.toDateString() === new Date(year, month, day).toDateString()) {
      dayEl.classList.add('today');
    }

    if (events[dateStr]) {
      events[dateStr].forEach((ev) => {
        const evEl = document.createElement('div');
const isPast = new Date(dateStr) < new Date().setHours(0, 0, 0, 0);
const isDone = ev.done || isPast;
evEl.className = `event${isDone ? ' done' : ''}`;


        evEl.innerHTML = `
          <label style="display: flex; align-items: center; gap: 5px;">
            ${(() => {
  const isPast = new Date(dateStr) < new Date().setHours(0, 0, 0, 0);
  const checked = isPast || ev.done;
  return `
    <input type="checkbox" ${checked ? 'checked' : ''} disabled>
    <span style="text-decoration: ${checked ? 'line-through' : 'none'};">${ev.title}</span>
  `;
})()}

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

document.getElementById("close-modal").addEventListener("click", () => {
  document.getElementById("event-modal").classList.add("hidden");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    document.getElementById("event-modal").classList.add("hidden");
  }
});
