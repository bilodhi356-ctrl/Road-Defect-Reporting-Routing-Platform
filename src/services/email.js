function formatKenyaTime(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return 'time unavailable';
  return new Intl.DateTimeFormat('en-KE', {
    timeZone: 'Africa/Nairobi',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function statusMessage(report, event) {
  const updatedAt = formatKenyaTime(report.updatedAt || report.createdAt || new Date());
  if (event === 'submitted') {
    return `Your ${report.category} report (${report.reference}) was received and routed to ${report.office}. Current status: ${report.status}. Updated at ${updatedAt}.`;
  }
  if (report.status === 'In progress') {
    return `Your ${report.category} report (${report.reference}) is now in progress. KeRRA has started working on it and it has been assigned to ${report.office}. Updated at ${updatedAt}.`;
  }
  return `Your ${report.category} report (${report.reference}) is now marked: ${report.status}. KeRRA office: ${report.office}. Updated at ${updatedAt}.`;
}

async function sendCitizenUpdate(report, event) {
  if (!report.contact?.consent || !report.contact.email) return;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    const subject = `Road Defect Reporting & Routing Platform update: ${report.reference}`;
    console.log(`[email disabled] To ${report.contact.email}: ${subject}`);
    return;
  }
  if (!process.env.MAIL_FROM) {
    throw new Error('MAIL_FROM is required when RESEND_API_KEY is configured.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: report.contact.email,
      subject: `Road Defect Reporting & Routing Platform update: ${report.reference}`,
      text: statusMessage(report, event),
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Resend API request failed (${response.status}): ${details}`);
  }
}

module.exports = { sendCitizenUpdate, statusMessage };
