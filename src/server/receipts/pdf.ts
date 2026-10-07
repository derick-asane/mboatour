/// A very small PDF writer, enough for a one-page receipt.
///
/// A receipt is text and a few rules, and the fonts it needs — Helvetica and
/// Helvetica-Bold — are two of the fourteen every reader already has, so
/// nothing has to be embedded. That makes writing the file directly cheaper
/// than a library: no dependency, and nothing to go wrong when the bundler
/// tries to carry font files into a server build.

const PAGE_WIDTH = 595.28; // A4 at 72dpi
const PAGE_HEIGHT = 841.89;

export type Line =
  | { type: "text"; text: string; size: number; bold?: boolean; grey?: boolean; x?: number }
  | { type: "right"; text: string; size: number; bold?: boolean; grey?: boolean }
  | { type: "space"; height: number }
  | { type: "rule" };

/// PDF strings are Latin-1 here, which covers French. Anything outside it — a
/// name in another alphabet — is dropped to a question mark rather than
/// writing bytes the reader would mis-draw.
function pdfString(text: string): string {
  let out = "";

  for (const char of text) {
    const code = char.codePointAt(0) ?? 63;

    if (char === "(" || char === ")" || char === "\\") {
      out += `\\${char}`;
    } else if (code === 0x2019 || code === 0x2018) {
      out += "'";
    } else if (code === 0x201c || code === 0x201d) {
      out += '"';
    } else if (code === 0x2013 || code === 0x2014) {
      out += "-";
    } else if (code === 0x00a0 || code === 0x202f) {
      out += " ";
    } else if (code < 32) {
      out += " ";
    } else if (code < 256) {
      // Octal escapes keep the body plain ASCII, so the file is byte-exact
      // however it is written out.
      out += code > 126 ? `\\${code.toString(8).padStart(3, "0")}` : char;
    } else {
      out += "?";
    }
  }

  return out;
}

const MARGIN = 56;
const INNER = PAGE_WIDTH - MARGIN * 2;

/// Builds the page's drawing instructions and returns the whole file.
export function renderReceiptPdf(lines: Line[], title: string): Uint8Array {
  const ops: string[] = [];
  let y = PAGE_HEIGHT - MARGIN;

  for (const line of lines) {
    if (line.type === "space") {
      y -= line.height;
      continue;
    }

    if (line.type === "rule") {
      y -= 6;
      ops.push(
        "0.82 0.84 0.86 RG 0.8 w",
        `${MARGIN} ${y.toFixed(2)} m ${(MARGIN + INNER).toFixed(2)} ${y.toFixed(2)} l S`,
      );
      y -= 10;
      continue;
    }

    const font = line.bold ? "/F2" : "/F1";
    const colour = line.grey ? "0.42 0.45 0.49 rg" : "0.09 0.11 0.13 rg";

    y -= line.size + 4;

    if (line.type === "right") {
      // Helvetica's average width is close enough to place a right-aligned
      // figure on a receipt; nothing here is set in a column that would show
      // a few points of drift.
      const width = line.text.length * line.size * (line.bold ? 0.56 : 0.5);
      const x = MARGIN + INNER - width;

      ops.push(
        "BT",
        `${colour}`,
        `${font} ${line.size} Tf`,
        `1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`,
        `(${pdfString(line.text)}) Tj`,
        "ET",
      );
      continue;
    }

    ops.push(
      "BT",
      `${colour}`,
      `${font} ${line.size} Tf`,
      `1 0 0 1 ${(MARGIN + (line.x ?? 0)).toFixed(2)} ${y.toFixed(2)} Tm`,
      `(${pdfString(line.text)}) Tj`,
      "ET",
    );
  }

  const content = ops.join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      "/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Title (${pdfString(title)}) /Producer (Mboatour) >>`,
  ];

  // The cross-reference table records where every object starts, so the offsets
  // are measured as the file is assembled rather than guessed at afterwards.
  let file = "%PDF-1.4\n";
  const offsets: number[] = [];

  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(file, "latin1"));
    file += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefAt = Buffer.byteLength(file, "latin1");

  file += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

  for (const offset of offsets) {
    file += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }

  file +=
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${objects.length} 0 R >>\n` +
    `startxref\n${xrefAt}\n%%EOF\n`;

  return new Uint8Array(Buffer.from(file, "latin1"));
}
