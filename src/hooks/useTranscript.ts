// src/hooks/useTranscript.ts
"use client";

import { useEffect, useRef, useState } from "react";

export type AAIWord = { text: string; start: number; end: number };

export type TranscriptState = {
  id: string | null;
  status: "idle" | "queued" | "processing" | "completed" | "error";
  words: AAIWord[];
  error: string | null;
};

type LSValue = {
  id?: string;
  words: AAIWord[];
  ts?: number;
};

const LS_PREFIX = "aai:v1:";

function storageKey(audioUrl: string) {
  return `${LS_PREFIX}${audioUrl}`;
}

function readFromLS<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeToLS<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* ignore quota errors */
  }
}

// Глобальные кэши на время жизни вкладки
declare global {

  var __AAI_MEM: Map<string, TranscriptState> | undefined;

  var __AAI_INFLIGHT: Map<string, Promise<TranscriptState>> | undefined;
}

const mem = (globalThis.__AAI_MEM ??= new Map<string, TranscriptState>());
const inflight = (globalThis.__AAI_INFLIGHT ??= new Map<string, Promise<TranscriptState>>());

// Основной помощник
async function ensureTranscript(audioUrl: string): Promise<TranscriptState> {
  const key = storageKey(audioUrl);

  // 1) Память
  const inMem = mem.get(key);
  if (inMem?.status === "completed") return inMem;

  // 2) LS
  const inLS = readFromLS<LSValue>(key);
  if (inLS?.words?.length) {
    const state: TranscriptState = {
      id: inLS.id ?? null,
      status: "completed",
      words: inLS.words,
      error: null,
    };
    mem.set(key, state);
    return state;
  }

  // 3) Уже летит?
  const infl = inflight.get(key);
  if (infl) return infl;

  // 4) Новый запрос
  const p = (async (): Promise<TranscriptState> => {
    const startRes = await fetch("/api/assemblyai/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioUrl }),
    });
    const startJson: { id?: string; status?: TranscriptState["status"]; error?: unknown } =
      await startRes.json();

    if (!startRes.ok) {
      const err = startJson?.error ?? "Start failed";
      const st: TranscriptState = { id: null, status: "error", words: [], error: String(err) };
      mem.set(key, st);
      return st;
    }

    const id = startJson.id;
    if (!id) {
      const st: TranscriptState = {
        id: null,
        status: "error",
        words: [],
        error: "No transcript id",
      };
      mem.set(key, st);
      return st;
    }

    // Поллинг
    const T_MAX = 180_000;
    const T_INTERVAL = 1_200;
    const t0 = Date.now();

    while (Date.now() - t0 < T_MAX) {
      const r = await fetch(`/api/assemblyai/result?id=${encodeURIComponent(id)}`, {
        headers: { "Cache-Control": "no-cache" },
      });
      const j: {
        status?: TranscriptState["status"];
        words?: unknown;
        error?: unknown;
      } = await r.json();

      const st: TranscriptState["status"] = j.status ?? "processing";

      if (st === "completed") {
        const words: AAIWord[] = Array.isArray(j.words) ? (j.words as AAIWord[]) : [];
        const result: TranscriptState = { id, status: "completed", words, error: null };
        mem.set(key, result);
        writeToLS<LSValue>(key, { id, words, ts: Date.now() });
        return result;
      }
      if (st === "error") {
        const err = j.error ?? "Transcription error";
        const result: TranscriptState = { id, status: "error", words: [], error: String(err) };
        mem.set(key, result);
        return result;
      }

      await new Promise((res) => setTimeout(res, T_INTERVAL));
    }

    const timeout: TranscriptState = {
      id,
      status: "error",
      words: [],
      error: "Timeout waiting for transcript",
    };
    mem.set(key, timeout);
    return timeout;
  })();

  inflight.set(key, p);
  try {
    const res = await p;
    return res;
  } finally {
    inflight.delete(key);
  }
}

/** React-хук: отдаёт транскрипт с кэшированием */
export function useTranscript(audioUrl: string) {
  const [state, setState] = useState<TranscriptState>({
    id: null,
    status: "idle",
    words: [],
    error: null,
  });

  const urlRef = useRef(audioUrl);
  urlRef.current = audioUrl;

  useEffect(() => {
    let cancelled = false;

    const key = storageKey(audioUrl);

    // 1) Показать кэш моментально
    const memState = mem.get(key);
    if (memState) {
      setState(memState);
    } else {
      const ls = readFromLS<LSValue>(key);
      if (ls?.words?.length) {
        setState({
          id: ls.id ?? null,
          status: "completed",
          words: ls.words,
          error: null,
        });
      }
    }

    // 2) ensureTranscript
    ensureTranscript(audioUrl).then((s) => {
      if (!cancelled && urlRef.current === audioUrl) setState(s);
    });

    return () => {
      cancelled = true;
    };
  }, [audioUrl]);

  return state;
}

/** Вне React */
export async function prefetchTranscript(audioUrl: string) {
  return ensureTranscript(audioUrl);
}