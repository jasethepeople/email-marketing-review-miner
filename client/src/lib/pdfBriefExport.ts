import { buildFeatureGapBrief, type ExportableFeatureGapSummary } from "./briefExport";

const encoder = new TextEncoder();

function sanitize(value: string): string {
  return value.replace(/[\\()]/g, "\\$&").replace(/[^\x20-\x7E\n]/g, " ");
}

function wrapLine(line: string, width = 88): string[] {
  if (line.length <= width) return [line];
  const words = line.split(/\s+/);
  const output: string[] = [];
  let current = "";
  words.forEach(word => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width && current) { output.push(current); current = word; }
    else current = next;
  });
  if (current) output.push(current);
  return output;
}

/** Builds a portable, single-page PDF from the exact same current-filter content as the Markdown brief. */
export function buildFeatureGapPdf(input: { filter: string; sampleSize: number; summary: ExportableFeatureGapSummary }): Uint8Array {
  const brief = buildFeatureGapBrief(input).split("\n");
  const contentLines = brief.flatMap(line => wrapLine(line));
  let y = 772;
  const commands = ["BT", "/F1 10 Tf", "14 TL", "50 772 Td"];
  contentLines.forEach((line, index) => {
    const header = line.startsWith("# ") || line.startsWith("## ") || line.startsWith("### ");
    if (header) commands.push(index ? "0 -7 Td" : "", "/F1 13 Tf", `(${sanitize(line.replace(/^#+\s*/, ""))}) Tj`, "/F1 10 Tf", "0 -15 Td");
    else {
      commands.push(`(${sanitize(line)}) Tj`, "0 -14 Td");
      y -= 14;
    }
  });
  commands.push("ET");
  const content = commands.filter(Boolean).join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(encoder.encode(pdf).length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return encoder.encode(pdf);
}
