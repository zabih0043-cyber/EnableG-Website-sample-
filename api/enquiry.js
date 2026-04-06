const CONTACT_PAGE_PATH = "/contact.html";
const DEFAULT_CONTACT_EMAIL = "info@enableg.net";
const DEFAULT_FROM_EMAIL = "onboarding@resend.dev";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function wantsJson(request) {
  const accept = request.headers.get("accept") || "";
  const requestedWith = request.headers.get("x-requested-with") || "";

  return accept.includes("application/json") || requestedWith === "fetch";
}

function redirectToContact(request, state, message) {
  const url = new URL(CONTACT_PAGE_PATH, request.url);
  url.searchParams.set("form", state);

  if (message) {
    url.searchParams.set("message", message);
  }

  return Response.redirect(url, 303);
}

function respond(request, state, message, status = 200) {
  if (wantsJson(request)) {
    return json({ ok: state === "success", message }, status);
  }

  return redirectToContact(request, state, message);
}

function getField(formData, name) {
  return String(formData.get(name) || "").trim();
}

async function sendWithResend(payload) {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    throw new Error(
      "The contact form is not configured yet. Add RESEND_API_KEY in your Vercel project settings."
    );
  }

  const toAddress = process.env.CONTACT_EMAIL || DEFAULT_CONTACT_EMAIL;
  const fromAddress = process.env.ENABLEG_FROM_EMAIL || DEFAULT_FROM_EMAIL;
  const subject = `Enable G enquiry: ${payload.topic}`;
  const replyTo = payload.email;

  const text = [
    "New enquiry from the Enable G website",
    "",
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Support area: ${payload.topic}`,
    "",
    "Message:",
    payload.message,
  ].join("\n");

  const html = [
    "<h2>New enquiry from the Enable G website</h2>",
    "<p><strong>Name:</strong> " + escapeHtml(payload.name) + "</p>",
    "<p><strong>Email:</strong> " + escapeHtml(payload.email) + "</p>",
    "<p><strong>Support area:</strong> " + escapeHtml(payload.topic) + "</p>",
    "<p><strong>Message:</strong></p>",
    "<p>" + escapeHtml(payload.message).replace(/\n/g, "<br />") + "</p>",
  ].join("");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "enableg-site/1.0",
    },
    body: JSON.stringify({
      from: `Enable G Website <${fromAddress}>`,
      to: [toAddress],
      subject,
      html,
      text,
      replyTo,
    }),
  });

  if (!response.ok) {
    let detail = "";

    try {
      const data = await response.json();
      detail = data?.message || data?.error?.message || "";
    } catch {
      detail = "";
    }

    throw new Error(
      detail || "We could not send your enquiry right now. Please try again."
    );
  }
}

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        Allow: "POST, OPTIONS",
      },
    });
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: {
        Allow: "POST, OPTIONS",
      },
    });
  }

  let formData;

  try {
    formData = await request.formData();
  } catch {
    return respond(
      request,
      "error",
      "We could not read your enquiry. Please refresh and try again.",
      400
    );
  }

  const payload = {
    name: getField(formData, "name"),
    email: getField(formData, "email"),
    topic: getField(formData, "topic"),
    message: getField(formData, "message"),
    website: getField(formData, "website"),
  };

  if (payload.website) {
    return respond(
      request,
      "success",
      "Thanks. Your enquiry has been received."
    );
  }

  if (!payload.name || !payload.email || !payload.topic || !payload.message) {
    return respond(
      request,
      "error",
      "Please complete all fields before sending your enquiry.",
      400
    );
  }

  if (!EMAIL_PATTERN.test(payload.email)) {
    return respond(
      request,
      "error",
      "Please enter a valid email address.",
      400
    );
  }

  try {
    await sendWithResend(payload);
  } catch (error) {
    return respond(
      request,
      "error",
      error instanceof Error
        ? error.message
        : "We could not send your enquiry right now. Please try again.",
      500
    );
  }

  return respond(
    request,
    "success",
    "Thank you. Your enquiry has been sent and Enable G will be in touch soon."
  );
}
