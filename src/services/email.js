const nodemailer=require('nodemailer');
function client(){if(!process.env.SMTP_HOST)return null;return nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_SECURE==='true',auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}:undefined});}
function statusMessage(report,event){if(event==='submitted'){return `Your ${report.category} report (${report.reference}) was received and routed to ${report.office}. Current status: ${report.status}.`;}
if(report.status==='In progress'){return `Your ${report.category} report (${report.reference}) is now in progress. KeRRA has started working on it and it has been assigned to ${report.office}.`;} 
return `Your ${report.category} report (${report.reference}) is now marked: ${report.status}. KeRRA office: ${report.office}.`;} 
async function sendCitizenUpdate(report,event){if(!report.contact?.consent||!report.contact.email)return;const transporter=client();const subject=`Road Defect Reporting & Routing Platform update: ${report.reference}`;const text=statusMessage(report,event);if(!transporter){console.log(`[email disabled] To ${report.contact.email}: ${subject}`);return;}await transporter.sendMail({from:process.env.MAIL_FROM,to:report.contact.email,subject,text});}
module.exports={sendCitizenUpdate};
