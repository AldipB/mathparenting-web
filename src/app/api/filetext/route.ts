// src/app/api/filetext/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";

// pdf-parse and mammoth don't ship types; use dynamic import + any
type PdfParseResult = { text: string };

// Helper: Blob -> Node Buffer
async function blobToBuffer(b: Blob): Promise<Buffer> {
  const ab = await b.arrayBuffer();
  return Buffer.from(ab);
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const name = file.name || "upload";
    const type = file.type || "application/octet-stream";
    const buf = await blobToBuffer(file);

    let text = "";
    const lower = name.toLowerCase();

    // Images: we do NOT OCR here; tell client to send to vision via image_url
    if (type.startsWith("image/")) {
      return NextResponse.json({
        kind: "image",
        name,
        mime: type,
        note: "Send as image_url to the chat model.",
      });
    }

    // PDF
    else if (type === "application/pdf" || lower.endsWith(".pdf")) {
      // dynamic import to avoid type issues / ESM-CJS mismatch
      const pdfParseMod: any = await import("pdf-parse");
      const pdfParse: (b: Buffer) => Promise<PdfParseResult> =
        (pdfParseMod?.default || pdfParseMod) as any;

      const data = await pdfParse(buf);
      text = data?.text || "";
    }

    // DOCX (mammoth only supports .docx)
    else if (
      type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      lower.endsWith(".docx")
    ) {
      const mammothMod: any = await import("mammoth");
      const mammoth = mammothMod?.default || mammothMod;

      // mammoth.extractRawText({ buffer })
      const result = await mammoth.extractRawText({ buffer: buf });
      text = (result && result.value) || "";
    }

    // Plain text or CSV
    else if (
      type.startsWith("text/") ||
      lower.endsWith(".txt") ||
      lower.endsWith(".csv")
    ) {
      text = buf.toString("utf8");
    }

    // Unsupported docs (e.g., .doc)
    else {
      return NextResponse.json({
        kind: "unsupported",
        name,
        mime: type,
        note:
          "Unsupported file type for server-side text extraction. Convert to PDF, DOCX, TXT, or CSV.",
      });
    }

    // Trim/sanitize a bit
    const trimmed = text.replace(/\u0000/g, "").trim();

    return NextResponse.json({
      kind: "text",
      name,
      mime: type,
      text: trimmed.slice(0, 20000), // safety cap
    });
  } catch (e: any) {
    console.error("/api/filetext error:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to extract text" },
      { status: 500 }
    );
  }
}
