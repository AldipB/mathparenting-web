export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type PdfParseResult = { text: string };

async function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Missing Supabase env vars");
  const cookieStore = await cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {}
      },
    },
  });
}

async function blobToBuffer(b: Blob): Promise<Buffer> {
  const ab = await b.arrayBuffer();
  return Buffer.from(ab);
}

export async function POST(req: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    if (type.startsWith("image/")) {
      return NextResponse.json({ kind: "image", name, mime: type, note: "Send as image_url to the chat model." });
    } else if (type === "application/pdf" || lower.endsWith(".pdf")) {
      const pdfParseMod: any = await import("pdf-parse");
      const pdfParse: (b: Buffer) => Promise<PdfParseResult> = (pdfParseMod?.default || pdfParseMod) as any;
      const data = await pdfParse(buf);
      text = data?.text || "";
    } else if (type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || lower.endsWith(".docx")) {
      const mammothMod: any = await import("mammoth");
      const mammoth = mammothMod?.default || mammothMod;
      const result = await mammoth.extractRawText({ buffer: buf });
      text = (result && result.value) || "";
    } else if (type.startsWith("text/") || lower.endsWith(".txt") || lower.endsWith(".csv")) {
      text = buf.toString("utf8");
    } else {
      return NextResponse.json({ kind: "unsupported", name, mime: type, note: "Unsupported file type. Convert to PDF, DOCX, TXT, or CSV." });
    }

    const trimmed = text.replace(/\u0000/g, "").trim();
    return NextResponse.json({ kind: "text", name, mime: type, text: trimmed.slice(0, 20000) });
  } catch (e: any) {
    console.error("/api/filetext error:", e);
    return NextResponse.json({ error: e?.message || "Failed to extract text" }, { status: 500 });
  }
}