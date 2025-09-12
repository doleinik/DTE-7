"use client";

import { useTranscript } from "@/hooks/useTranscript";

function PrefetchOne({ url }: { url: string }) {
  // просто монтируем хук — он загрузит и закеширует
  useTranscript(url);
  return null;
}

export default function PrefetchTranscripts({ urls }: { urls: string[] }) {
  if (!urls?.length) return null;
  return (
    <>
      {urls.map((u, i) => (
        <PrefetchOne key={`${u}-${i}`} url={u} />
      ))}
    </>
  );
}
