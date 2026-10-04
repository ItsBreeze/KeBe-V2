import { EmailMessage } from "cloudflare:email";

// POST { subject, text, replyTo? } with "Authorization: Bearer <ORDER_MAIL_SECRET>"
// sends a plain-text email from orders@grounders.app to every address in
// MAIL_TO. The recipients are a secret, not in this public repo: each must be
// a verified destination in grounders.app's Email Routing (the ones
// support@grounders.app forwards to), or Cloudflare refuses to send.

const FROM = "orders@grounders.app";

const b64 = (s) => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};

const header = (s) => `=?UTF-8?B?${b64(s)}?=`;

const raw = ({ to, subject, text, replyTo }) =>
  [
    `From: ${header("KeBe orders")} <${FROM}>`,
    `To: <${to}>`,
    ...(replyTo ? [`Reply-To: <${replyTo}>`] : []),
    `Subject: ${header(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@grounders.app>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    b64(text).replace(/.{1,76}/g, "$&\r\n"),
  ].join("\r\n");

export default {
  async fetch(request, env) {
    if (request.method !== "POST") return new Response("POST only", { status: 405 });
    if (!env.ORDER_MAIL_SECRET || request.headers.get("authorization") !== `Bearer ${env.ORDER_MAIL_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response("Bad JSON", { status: 400 });
    }
    const subject = String(body.subject ?? "").replace(/[\r\n]+/g, " ").slice(0, 200);
    const text = String(body.text ?? "").slice(0, 20000);
    const replyTo = /^[^\s<>@]+@[^\s<>@]+$/.test(String(body.replyTo ?? "")) ? body.replyTo : undefined;
    if (!subject || !text) return new Response("subject and text are required", { status: 400 });

    const to = String(env.MAIL_TO ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (!to.length) return new Response("MAIL_TO is not set", { status: 500 });
    const failed = [];
    for (const addr of to) {
      try {
        await env.MAIL.send(new EmailMessage(FROM, addr, raw({ to: addr, subject, text, replyTo })));
      } catch (e) {
        failed.push(String(e?.message ?? e));
      }
    }
    return Response.json({ sent: to.length - failed.length, failed }, { status: failed.length === to.length ? 502 : 200 });
  },
};
