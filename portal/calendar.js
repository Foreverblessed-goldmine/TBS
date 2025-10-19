/* TBS Calendar bootstrap with CSP-safe CDN, API fallbacks, and RBAC */

const elError = document.getElementById('cal-error');
const elCalendar = document.getElementById('tbs-calendar');

const STATUS_COLOR = {
  planned: '#60a5fa',
  active:  '#22c55e',
  blocked: '#f59e0b',
  done:    '#94a3b8'
};

// Helper: show error banner
function showError(msg) {
  if (!elError) return;
  elError.textContent = msg;
  elError.hidden = false;
}

// Helper: feature detection for FullCalendar
function hasFullCalendar() {
  return !!(window.FullCalendar && window.FullCalendar.Calendar);
}

// API helper (works with Netlify proxy: /api/*)
const api = async (path, opts = {}) => {
  const res = await fetch(path, { credentials: 'include', ...opts });
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status, res });
  return res.json();
};

// Load context with graceful fallbacks
async function loadContext() {
  // Try live API first
  try {
    const [user, projects, users] = await Promise.all([
      api('/api/me'),
      api('/api/projects'),
      api('/api/users?roles=foreman,worker,contractor')
    ]);
    return { user, projects, users, fromApi: true };
  } catch (e) {
    console.warn('Context: falling back to mock due to', e);
    const mock = await fetch('./data/calendar.mock.json', { cache: 'no-store' }).then(r => r.json());
    return { ...mock, fromApi: false };
  }
}

async function loadEvents(range, fromApi) {
  if (fromApi) {
    try {
      const url = `/api/calendar/events?from=${range.startStr}&to=${range.endStr}`;
      return await api(url);
    } catch (e) {
      console.warn('Events: API failed, falling back to mock', e);
    }
  }
  const mock = await fetch('./data/calendar.mock.json', { cache: 'no-store' }).then(r => r.json());
  return mock.events;
}

function toFCEvents(events, ctx) {
  const mapName = id => (ctx.users?.find(u => u.id === id)?.name || ''); 
  return events.map(ev => ({
    id: ev.id,
    title: `${ev.title} • ${ctx.projects?.find(p => p.id === ev.projectId)?.name || ''}`,
    start: ev.start,
    end: ev.end,
    backgroundColor: STATUS_COLOR[ev.status] || '#64748b',
    borderColor: STATUS_COLOR[ev.status] || '#64748b',
    extendedProps: {
      projectId: ev.projectId,
      assignees: ev.assignees || [],
      status: ev.status,
      notes: ev.notes || '',
      assigneeNames: (ev.assignees || []).map(mapName)
    }
  }));
}

function roleAllowsEdit(role) {
  return role === 'admin' || role === 'foreman';
}
function roleAllowsCreate(role) {
  return role === 'admin'; // foreman cannot create (per spec)
}

async function init() {
  try {
    if (!hasFullCalendar()) {
      showError('Calendar library failed to load (CSP/CDN). Refresh or contact admin.');
      return;
    }

    const ctx = await loadContext();

    const calendar = new FullCalendar.Calendar(elCalendar, {
      initialView: 'timeGridWeek',
      timeZone: 'Europe/London',
      locale: 'en-gb',
      firstDay: 1,
      nowIndicator: true,
      height: 'auto',
      slotMinTime: '07:00:00',
      slotMaxTime: '19:00:00',
      headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },

      // Lazy event source with live/mock fallback
      events: async (info, success, failure) => {
        try {
          const raw = await loadEvents(info, ctx.fromApi);
          success(toFCEvents(raw, ctx));
        } catch (e) {
          failure(e);
          showError('Failed to load events.');
        }
      },

      // RBAC
      editable: roleAllowsEdit(ctx.user.role),
      eventDurationEditable: roleAllowsEdit(ctx.user.role),
      selectable: roleAllowsCreate(ctx.user.role),

      dateClick: (arg) => {
        if (!roleAllowsCreate(ctx.user.role)) return;
        // TODO: open Create Task modal (scaffold)
        alert(`Create task at ${arg.dateStr}`);
      },

      eventClick: (arg) => {
        const ev = arg.event;
        const { status, assigneeNames, notes } = ev.extendedProps || {};
        const msg = [
          ev.title,
          `From: ${ev.start?.toLocaleString()}`,
          `To:   ${ev.end?.toLocaleString()}`,
          `Status: ${status || 'n/a'}`,
          `Assignees: ${assigneeNames?.join(', ') || '—'}`,
          notes ? `Notes: ${notes}` : ''
        ].filter(Boolean).join('\n');
        alert(msg);
      },

      eventDrop: (arg) => {
        if (!roleAllowsEdit(ctx.user.role)) { arg.revert(); return; }
        // TODO: PATCH /api/tasks/:id with new start/end if fromApi
        console.log('Moved', arg.event.id, arg.event.start, arg.event.end);
      },

      eventResize: (arg) => {
        if (!roleAllowsEdit(ctx.user.role)) { arg.revert(); return; }
        // TODO: PATCH /api/tasks/:id with new end if fromApi
        console.log('Resized', arg.event.id, arg.event.start, arg.event.end);
      }
    });

    calendar.render();

  } catch (e) {
    console.error(e);
    showError('Calendar failed to initialize.');
  }
}

init();