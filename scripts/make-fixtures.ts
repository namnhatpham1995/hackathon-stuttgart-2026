// Dependency-free one-page PDFs for the TradeReady demo fixtures.
// Helvetica + WinAnsi, with a hand-written xref table. No PDF library.
import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FOOTER = "FICTIONAL DEMO DOCUMENT - NOT VALID FOR COMMERCIAL USE";

type PdfOptions = {
  /** False writes a page with an empty content stream, so nothing is selectable. */
  text?: boolean;
};

/** Encodes a PDF literal string in WinAnsi. Rejects characters the encoding cannot hold. */
function pdfLiteral(text: string): string {
  let encoded = "";
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (char === "\\") encoded += "\\\\";
    else if (char === "(") encoded += "\\(";
    else if (char === ")") encoded += "\\)";
    else if (code >= 32 && code <= 126) encoded += char;
    else if (code >= 160 && code <= 255) encoded += `\\${code.toString(8).padStart(3, "0")}`;
    else throw new Error(`Cannot encode ${JSON.stringify(char)} as WinAnsi`);
  }
  return `(${encoded})`;
}

function contentStream(lines: readonly string[]): string {
  const painted = [...lines, "", FOOTER];
  const commands = ["BT", "/F1 11 Tf", "72 740 Td"];
  for (let index = 0; index < painted.length; index += 1) {
    if (index > 0) commands.push("0 -16 Td");
    const line = painted[index];
    if (line === undefined) throw new Error("missing PDF line");
    commands.push(`${pdfLiteral(line)} Tj`);
  }
  commands.push("ET");
  return commands.join("\n");
}

function xrefEntry(offset: number, kind: "n" | "f", generation: number): string {
  const entry = `${offset.toString().padStart(10, "0")} ${generation.toString().padStart(5, "0")} ${kind} \n`;
  if (entry.length !== 20) throw new Error(`xref entry must be 20 bytes, got ${entry.length}`);
  return entry;
}

function assemble(objects: readonly string[]): Buffer {
  const header = Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "latin1");
  const parts: Buffer[] = [header];
  const offsets: number[] = [];
  let cursor = header.length;
  for (const source of objects) {
    offsets.push(cursor);
    const body = Buffer.from(source, "latin1");
    parts.push(body);
    cursor += body.length;
  }

  const xrefAt = cursor;
  const size = objects.length + 1;
  let xref = `xref\n0 ${size}\n`;
  xref += xrefEntry(0, "f", 65535);
  for (const offset of offsets) xref += xrefEntry(offset, "n", 0);
  xref += `trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  const pdf = Buffer.concat([...parts, Buffer.from(xref, "latin1")]);
  assertWellFormed(pdf, offsets, xrefAt);
  return pdf;
}

function assertWellFormed(pdf: Buffer, offsets: readonly number[], xrefAt: number): void {
  if (pdf.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("PDF does not start with %PDF-");
  }
  if (pdf.subarray(xrefAt, xrefAt + 4).toString("ascii") !== "xref") {
    throw new Error("startxref does not point at the xref table");
  }
  for (let index = 0; index < offsets.length; index += 1) {
    const offset = offsets[index];
    if (offset === undefined) throw new Error("missing xref offset");
    const marker = `${index + 1} 0 obj`;
    const found = pdf.subarray(offset, offset + marker.length).toString("ascii");
    if (found !== marker) {
      throw new Error(`object ${index + 1} at ${offset} starts with ${JSON.stringify(found)}`);
    }
  }
}

/** One letter page. Text pages print every line, then the fictional-demo footer. */
export function buildOnePagePdf(lines: readonly string[], options?: PdfOptions): Buffer {
  const text = options?.text !== false;
  const stream = text ? contentStream(lines) : "";
  const resources = text ? "/Resources << /Font << /F1 5 0 R >> >> " : "/Resources << >> ";
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ${resources}/Contents 4 0 R >>\nendobj\n`,
    `4 0 obj\n<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream\nendobj\n`,
  ];
  if (text) {
    objects.push(
      "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n",
    );
  }
  return assemble(objects);
}

type Fixture = {
  filename: string;
  lines: readonly string[];
  text?: boolean;
  mustInclude: readonly string[];
  mustExclude?: readonly string[];
};

const SUPPLIER = "Lotus Mould Co., Ltd.";

// Section 3 of the working plan. No batch, lot, shipment or traceability wording:
// R4 stays missing because the record is absent, not because a document denies it.
const demoDocuments: readonly Fixture[] = [
  {
    filename: "01_Lotus_Material_Datasheet.pdf",
    mustInclude: [SUPPLIER, "CAP-104", "revision B", "ABS", "LM-ABS-01", "2026-10-15"],
    mustExclude: ["revision A", "ISO 9001", "PKG-07"],
    lines: [
      "Material datasheet",
      `Supplier: ${SUPPLIER}`,
      "Country: Vietnam",
      "Product: Ordinary plastic cover cap for a machine enclosure",
      "Buyer: Neckar Maschinenbau GmbH",
      "Part number: CAP-104",
      "Drawing revision: B",
      "Material: ABS",
      "Grade: LM-ABS-01",
      "Date: 2026-10-15",
      "This datasheet identifies CAP-104 revision B as ABS grade LM-ABS-01.",
    ],
  },
  {
    filename: "02_Lotus_ISO_Certificate_Demo.pdf",
    mustInclude: [
      SUPPLIER,
      "Fictional Standards Bureau",
      "ISO 9001:2015",
      "injection-moulding",
      "injection moulding",
      "2026-08-01",
    ],
    mustExclude: ["CAP-104", "LM-ABS-01", "PKG-07", "revision A", "revision B"],
    lines: [
      "Submitted certificate",
      `Supplier: ${SUPPLIER}`,
      "Issuer: Fictional Standards Bureau",
      "Standard: ISO 9001:2015",
      "Scope: injection-moulding of plastic enclosure parts",
      "The scope covers injection moulding.",
      "Valid until: 2026-08-01",
      "Certificate number: FSB-DEMO-9001-0144",
      `This demonstration certificate names ${SUPPLIER}`,
    ],
  },
  {
    filename: "03_CAP104_Inspection_RevA.pdf",
    mustInclude: [
      SUPPLIER,
      "CAP-104",
      "revision A",
      "2026-10-20",
      "Part number: CAP-104. Drawing revision: A.",
    ],
    mustExclude: ["revision B", "LM-ABS-01", "PKG-07", "2026-08-01"],
    lines: [
      "Inspection report",
      `Supplier: ${SUPPLIER}`,
      "Part number: CAP-104. Drawing revision: A.",
      "Date: 2026-10-20",
      "This inspection report identifies CAP-104 revision A.",
      "Sample measurement table",
      "Dimension            Nominal mm    Measured mm",
      "Overall diameter     42.0          42.1",
      "Height               18.0          17.9",
      "Wall thickness       2.0           2.1",
    ],
  },
  {
    filename: "04_Lotus_Packaging_Acceptance.pdf",
    mustInclude: [SUPPLIER, "PKG-07", "revision 2", "CAP-104", "revision B", "explicitly accepts"],
    mustExclude: ["revision A", "ISO 9001", "LM-ABS-01"],
    lines: [
      "Packaging acceptance",
      `Supplier: ${SUPPLIER}`,
      `${SUPPLIER} explicitly accepts PKG-07 revision 2 for CAP-104 revision B.`,
      "Packaging specification: PKG-07",
      "Packaging revision: 2",
      "Part number: CAP-104",
      "Drawing revision: B",
    ],
  },
  {
    filename: "05_CAP104_Inspection_RevB.pdf",
    mustInclude: [
      SUPPLIER,
      "CAP-104",
      "revision B",
      "2026-11-06",
      "Part number: CAP-104. Drawing revision: B.",
    ],
    mustExclude: ["revision A", "LM-ABS-01", "PKG-07", "2026-08-01"],
    lines: [
      "Inspection report",
      `Supplier: ${SUPPLIER}`,
      "Part number: CAP-104. Drawing revision: B.",
      "Date: 2026-11-06",
      "This corrective inspection report identifies CAP-104 revision B.",
      "Sample measurement table",
      "Dimension            Nominal mm    Measured mm",
      "Overall diameter     42.0          42.0",
      "Height               18.0          18.0",
      "Wall thickness       2.0           2.0",
    ],
  },
];

// The filename says RevB. The body identifies revision A, and never says revision B.
const trapDocuments: readonly Fixture[] = [
  {
    filename: "trap_CAP104_Inspection_RevB.pdf",
    mustInclude: [SUPPLIER, "CAP-104", "revision A", "Part number: CAP-104. Drawing revision: A."],
    mustExclude: ["revision B", "RevB", "LM-ABS-01", "PKG-07"],
    lines: [
      "Inspection report",
      `Supplier: ${SUPPLIER}`,
      "Part number: CAP-104. Drawing revision: A.",
      "Date: 2026-10-20",
      "This inspection report identifies CAP-104 revision A.",
      "Sample measurement table",
      "Dimension            Nominal mm    Measured mm",
      "Overall diameter     42.0          41.7",
      "Height               18.0          18.2",
      "Wall thickness       2.0           1.9",
    ],
  },
  {
    filename: "empty.pdf",
    text: false,
    lines: [],
    mustInclude: [],
  },
];

const TRACEABILITY = /\b(batch|batches|lot|lots|shipment|shipments|traceability|resin)\b/i;

function assertFixture(fixture: Fixture): void {
  const text = fixture.lines.join("\n");
  for (const phrase of fixture.mustInclude) {
    if (!text.includes(phrase))
      throw new Error(`${fixture.filename} is missing ${JSON.stringify(phrase)}`);
  }
  for (const phrase of fixture.mustExclude ?? []) {
    if (text.includes(phrase)) {
      throw new Error(`${fixture.filename} must not contain ${JSON.stringify(phrase)}`);
    }
  }
  if (TRACEABILITY.test(text)) {
    throw new Error(`${fixture.filename} contains traceability wording`);
  }
}

function writeFixtures(fixtures: readonly Fixture[]): string[] {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const dir = path.join(repoRoot, "fixtures", "exportready");
  mkdirSync(dir, { recursive: true });
  const written: string[] = [];
  for (const fixture of fixtures) {
    assertFixture(fixture);
    const pdf = buildOnePagePdf(fixture.lines, { text: fixture.text !== false });
    const file = path.join(dir, fixture.filename);
    writeFileSync(file, pdf);
    const raw = pdf.toString("latin1");
    if (!raw.startsWith("%PDF-")) {
      throw new Error(`${fixture.filename} does not start with %PDF-`);
    }
    if (fixture.text === false && (raw.includes("Tj") || raw.includes(FOOTER))) {
      throw new Error(`${fixture.filename} has selectable text`);
    }
    written.push(file);
  }
  return written;
}

function selfCheck(): string {
  const sample = "Sample line for the demo writer.";
  const pdf = buildOnePagePdf([sample]);
  const file = path.join(os.tmpdir(), "exportready-pdf-writer-check.pdf");
  writeFileSync(file, pdf);
  const raw = pdf.toString("latin1");
  if (!raw.includes(sample) || !raw.includes(FOOTER)) {
    throw new Error("self-check PDF is missing its line or footer");
  }
  const empty = buildOnePagePdf([], { text: false });
  if (empty.toString("latin1").includes("Tj")) {
    throw new Error("empty PDF contains a text operator");
  }
  return file;
}

const isDirectRun =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const sample = selfCheck();
  console.log(`self-check wrote ${sample}`);
  for (const file of writeFixtures([...demoDocuments, ...trapDocuments])) {
    console.log(`wrote ${file}`);
  }
}
