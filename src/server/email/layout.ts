/// One plain, table-free wrapper for every message. Email clients are hostile
/// to modern CSS, so this stays deliberately simple: inline styles, system
/// fonts, and a body that still reads correctly with styles stripped out.

export type EmailBody = {
  appName: string;
  title: string;
  /// One paragraph per entry.
  paragraphs: string[];
  action?: { label: string; url: string };
  /// Label and value pairs shown as a small summary block.
  facts?: { label: string; value: string }[];
  footer: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderEmail(body: EmailBody): { html: string; text: string } {
  const facts = (body.facts ?? []).filter((fact) => fact.value.trim() !== "");

  const html = `
<div style="margin:0;padding:24px;background:#f5f6f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#14171b;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e6e1;border-radius:14px;padding:28px;">
    <p style="margin:0 0 20px;font-size:15px;font-weight:700;letter-spacing:-0.01em;color:#0d6b58;">${escapeHtml(body.appName)}</p>
    <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;font-weight:650;letter-spacing:-0.02em;">${escapeHtml(body.title)}</h1>
    ${body.paragraphs
      .map(
        (paragraph) =>
          `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#3d434b;">${escapeHtml(paragraph)}</p>`,
      )
      .join("")}
    ${
      facts.length > 0
        ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0;width:100%;border-collapse:collapse;">${facts
            .map(
              (fact) =>
                `<tr><td style="padding:7px 0;font-size:13px;color:#5c636d;border-bottom:1px solid #eceee9;">${escapeHtml(fact.label)}</td><td style="padding:7px 0;font-size:13px;font-weight:600;text-align:right;border-bottom:1px solid #eceee9;">${escapeHtml(fact.value)}</td></tr>`,
            )
            .join("")}</table>`
        : ""
    }
    ${
      body.action
        ? `<p style="margin:22px 0 6px;"><a href="${escapeHtml(body.action.url)}" style="display:inline-block;background:#0d6b58;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 20px;border-radius:8px;">${escapeHtml(body.action.label)}</a></p>
           <p style="margin:0 0 4px;font-size:12px;line-height:1.5;color:#888f99;word-break:break-all;">${escapeHtml(body.action.url)}</p>`
        : ""
    }
    <p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #eceee9;font-size:12px;line-height:1.5;color:#888f99;">${escapeHtml(body.footer)}</p>
  </div>
</div>`.trim();

  const text = [
    body.appName,
    "",
    body.title,
    "",
    ...body.paragraphs,
    ...(facts.length > 0
      ? ["", ...facts.map((fact) => `${fact.label}: ${fact.value}`)]
      : []),
    ...(body.action ? ["", `${body.action.label}: ${body.action.url}`] : []),
    "",
    body.footer,
  ].join("\n");

  return { html, text };
}
