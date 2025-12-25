// src/app/api/tts/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import OpenAI from "openai";

// CORS (optional)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

type TTSBody = {
  text: string;
  voice?: string;
  format?: "mp3" | "wav" | "aac" | "flac" | "opus";
};

const FORMAT_MIME: Record<NonNullable<TTSBody["format"]>, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  aac: "audio/aac",
  flac: "audio/flac",
  // OpenAI returns Opus in an OGG container most commonly
  opus: "audio/ogg",
};

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    let body: TTSBody;
    try {
      body = (await req.json()) as TTSBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const text = (body?.text ?? "").toString();
    const voice = (body?.voice ?? "alloy").toString();
    const format = (body?.format ?? "mp3") as NonNullable<TTSBody["format"]>;

    if (!text.trim()) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }
    if (!(format in FORMAT_MIME)) {
      return NextResponse.json(
        { error: `Unsupported format: ${format}` },
        { status: 400 }
      );
    }

    const clean = text.trim().slice(0, 4000);

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // The SDK returns an object that exposes arrayBuffer(); it is not typed as Response.
    // Cast audio.speech to any so we can pass the format field without TS errors.
    const speech: any = await (client.audio.speech as any).create({
      model: "gpt-4o-mini-tts",
      voice,
      input: clean,
      format, // "mp3" | "wav" | "aac" | "flac" | "opus"
    });

    // Cast to any to placate TS
    const arrayBuf: ArrayBuffer =
      typeof speech?.arrayBuffer === "function"
        ? await speech.arrayBuffer()
        : await new Response(speech as any).arrayBuffer();

    return new NextResponse(arrayBuf, {
      headers: {
        "Content-Type": FORMAT_MIME[format],
        "Content-Disposition": `inline; filename="speech.${format}"`,
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e: any) {
    console.error("TTS error:", e);
    return NextResponse.json({ error: e?.message || "TTS failed" }, { status: 500 });
  }
}
