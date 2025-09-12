// src/app/api/assemblyai/start/route.ts
import { NextRequest, NextResponse } from "next/server";
import { AssemblyAI } from "assemblyai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_KEY = process.env.ASSEMBLYAI_API_KEY!;
const client = new AssemblyAI({ apiKey: API_KEY });

function getErrMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  return typeof err === "string" ? err : "Unknown error";
}

type StartBody = {
  audioUrl?: string;
  language_code?: string;
};

export async function POST(req: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json(
        { error: "ASSEMBLYAI_API_KEY is missing on server" },
        { status: 500 }
      );
    }

    const { audioUrl, language_code = "en_us" } = (await req.json()) as StartBody;
    if (!audioUrl) {
      return NextResponse.json({ error: "audioUrl is required" }, { status: 400 });
    }

    const origin = req.nextUrl.origin;
    const absUrl: string = audioUrl.startsWith("http") ? audioUrl : `${origin}${audioUrl}`;

    // 1) Скачиваем байты
    const audioRes = await fetch(absUrl, { cache: "no-store" });
    if (!audioRes.ok) {
      return NextResponse.json(
        { error: `Cannot fetch audio (${audioRes.status} ${audioRes.statusText})`, absUrl },
        { status: 502 }
      );
    }
    const buf = new Uint8Array(await audioRes.arrayBuffer());
    if (!buf.byteLength) {
      return NextResponse.json({ error: "Downloaded audio is empty", absUrl }, { status: 400 });
    }

    // 2) Upload → uploadUrl
    let uploadUrl = "";
    try {
      uploadUrl = await client.files.upload(buf);
    } catch (e: unknown) {
      return NextResponse.json(
        { error: `Upload to AssemblyAI failed: ${getErrMsg(e)}` },
        { status: 502 }
      );
    }

    // 3) Создаём транскрипт — пробуем 2 формы поля
    const basePayload = {
      punctuate: true,
      format_text: true,
      speech_model: "universal",
      language_code,
    } as const;

    type CreateParams = Parameters<typeof client.transcripts.create>[0];

    const payloads: CreateParams[] = [
      { ...basePayload, audio_url: uploadUrl } as unknown as CreateParams,
      { ...basePayload, audio: uploadUrl } as unknown as CreateParams,
    ];

    let lastErr: unknown;

    for (const p of payloads) {
      try {
        const tr = await client.transcripts.create(p);
        return NextResponse.json({ id: tr.id, status: tr.status });
      } catch (e: unknown) {
        lastErr = e;
      }
    }

    return NextResponse.json(
      { error: `Create transcript failed: ${getErrMsg(lastErr)}` },
      { status: 502 }
    );
  } catch (e: unknown) {
    console.error("assemblyai/start fatal:", e);
    return NextResponse.json(
      { error: getErrMsg(e) || "Internal Server Error" },
      { status: 500 }
    );
  }
}