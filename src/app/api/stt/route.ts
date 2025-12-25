// src/app/api/stt/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("audio");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No audio file" }, { status: 400 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const transcription = await client.audio.transcriptions.create({
      file, // File from the Web API is supported
      model: "whisper-1",
      // language: "en" // optional
    });

    return NextResponse.json({ text: transcription.text ?? "" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "STT failed" }, { status: 500 });
  }
}
