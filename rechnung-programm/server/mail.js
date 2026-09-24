// E-Mail-Versand über das eigene Postfach (SMTP)
import nodemailer from 'nodemailer';

export function erstelleMail({ einstellungen, entschluessele }) {
  function config() {
    if (process.env.SMTP_HOST) {
      return {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.SMTP_FROM || process.env.SMTP_USER
      };
    }
    const s = einstellungen().email.smtp;
    return { ...s, pass: entschluessele(s.pass), from: s.from || s.user };
  }

  function transporter() {
    const c = config();
    if (!c.host || !c.user) throw Object.assign(new Error('E-Mail ist noch nicht eingerichtet (Einstellungen → E-Mail).'), { status: 400 });
    return {
      from: c.from,
      t: nodemailer.createTransport({ host: c.host, port: Number(c.port), secure: Number(c.port) === 465, auth: { user: c.user, pass: c.pass } })
    };
  }

  return {
    eingerichtet: () => {
      const c = config();
      return Boolean(c.host && c.user);
    },
    async test() {
      await transporter().t.verify();
    },
    async senden({ an, cc, betreff, text, anhaenge = [] }) {
      const { t, from } = transporter();
      const s = einstellungen();
      const firma = String(s.firma.name || '').replace(/["\r\n]/g, '');
      const info = await t.sendMail({
        from: firma ? { name: firma, address: from } : from,
        to: an,
        cc: cc || undefined,
        bcc: s.email.bcc || undefined,
        replyTo: s.firma.email || undefined,
        subject: String(betreff || '').replace(/[\r\n]+/g, ' '),
        text,
        attachments: anhaenge
      });
      return info.messageId;
    }
  };
}
