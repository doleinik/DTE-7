// app/api/assemblyai/result/route.ts (или ваш путь)
import { NextRequest, NextResponse } from "next/server";
import { AssemblyAI } from "assemblyai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error";
  }
}

function getClient(): AssemblyAI {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) throw new Error("ASSEMBLYAI_API_KEY is missing on server");
  return new AssemblyAI({ apiKey });
}

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const client = getClient();
    const t = await client.transcripts.get(id);

    return NextResponse.json({
      status: t.status,
      words: Array.isArray(t.words) ? t.words : [],
      text: typeof t.text === "string" ? t.text : "",
      error: t.error ?? null,
    });
  } catch (err: unknown) {
    const msg = getErrorMessage(err);

    console.error("assemblyai/result fatal:", msg);

    // 500 — если проблема с конфигом сервера, 502 — проксируем внешний сбой
    const status = msg.includes("ASSEMBLYAI_API_KEY") ? 500 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}