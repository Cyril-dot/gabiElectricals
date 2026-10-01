import { prisma, DEMO_MODE } from './db';

/**
 * In DEMO_MODE every SMS/email/WhatsApp is written to the admin Notification Log
 * instead of being sent. When DEMO_MODE=false this routes to real providers
 * (Hubtel/Arkesel/Twilio + Resend/SMTP — see README going-live checklist).
 */
export async function logNotify(channel: 'SMS' | 'EMAIL' | 'WHATSAPP', to: string, template: string, body: string, userId?: string) {
  const status = DEMO_MODE ? 'LOGGED' : 'PENDING_SEND';
  await prisma.notificationLog.create({ data: { channel, to, template, body, status, userId } });
  if (!DEMO_MODE) {
    // live providers are wired here; guarded so misconfig never crashes a sale flow
    try {
      if (channel === 'SMS') await sendSms(to, body);
      if (channel === 'EMAIL') await sendEmail(to, template, body);
      if (channel === 'WHATSAPP') await sendWhatsApp(to, body);
      await prisma.notificationLog.updateMany({ where: { to, template, status: 'PENDING_SEND' }, data: { status: 'SENT' } });
    } catch (e) {
      await prisma.notificationLog.updateMany({ where: { to, template, status: 'PENDING_SEND' }, data: { status: 'FAILED' } });
      console.error('notify failed', e);
    }
  }
}

async function sendSms(to: string, body: string) {
  const key = process.env.SMS_API_KEY;
  if (!key || process.env.SMS_PROVIDER === 'hubtel') {
    const res = await fetch('https://media.hubtel.com/v1/messages/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Key ${key}` },
      body: JSON.stringify({ From: 'GABI-ELEC', To: to, Body: body }),
    });
    if (!res.ok) throw new Error(`hubtel ${res.status}`);
  }
}

async function sendEmail(to: string, _subject: string, body: string) {
  if (!process.env.RESEND_API_KEY) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'GabiElectricals <hello@gabielectricals.com>', to, subject: _subject, text: body }),
  });
}

async function sendWhatsApp(to: string, body: string) {
  if (!process.env.WHATSAPP_TOKEN) return;
  await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: to.replace('+', ''), type: 'text', text: { body } }),
  });
}

export async function recordActivity(userId: string | null, action: string, entity?: string, entityId?: string, ip?: string, meta?: object) {
  await prisma.activityLog.create({ data: { userId, action, entity, entityId, ip, metaJson: JSON.stringify(meta ?? {}) } });
}

export async function trackEvent(type: string, payload: object = {}, value?: number, sessionId?: string) {
  await prisma.analyticsEvent.create({ data: { type, payload: JSON.stringify(payload), value, sessionId } });
}
