// TBS iCal Export Component
// Generates and downloads .ics files for calendar events

export function exportToICS(events, filename = 'tbs-calendar') {
  const now = new Date();
  const timestamp = formatDateForICS(now);
  
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TBS//TBS Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `DTSTAMP:${timestamp}`
  ];
  
  events.forEach(event => {
    const startDate = formatDateForICS(new Date(event.start));
    const endDate = formatDateForICS(new Date(event.end));
    const uid = `tbs-${event.id}@tbs.local`;
    
    icsContent.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART:${startDate}`,
      `DTEND:${endDate}`,
      `SUMMARY:${escapeICS(event.title)}`,
      `DESCRIPTION:${escapeICS(buildEventDescription(event))}`,
      `STATUS:${event.status ? event.status.toUpperCase() : 'CONFIRMED'}`,
      `CREATED:${timestamp}`,
      `LAST-MODIFIED:${timestamp}`,
      'END:VEVENT'
    );
  });
  
  icsContent.push('END:VCALENDAR');
  
  // Download file
  const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${now.toISOString().split('T')[0]}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatDateForICS(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeICS(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

function buildEventDescription(event) {
  const parts = [];
  
  if (event.project) {
    parts.push(`Project: ${event.project.name || event.project.ref || 'Unknown'}`);
  }
  
  if (event.status) {
    parts.push(`Status: ${event.status.charAt(0).toUpperCase() + event.status.slice(1)}`);
  }
  
  if (event.assignees && event.assignees.length > 0) {
    const assigneeNames = event.assignees.map(a => a.name || a).join(', ');
    parts.push(`Assignees: ${assigneeNames}`);
  }
  
  if (event.notes) {
    parts.push(`Notes: ${event.notes}`);
  }
  
  return parts.join('\\n');
}
