"use client";

import Image from "next/image";

type Props = { score: number; level?: "Rookie" | string };

/** Карточка HITE Score. Декор не перехватывает клики и не вылезает за границы. */
export default function HiteScoreCard({ score, level = "Rookie" }: Props) {
  return (
    <div
      className="
        relative overflow-hidden  /* ВАЖНО: не даём декору перекрывать низ */
        rounded-[22px] p-4 sm:p-5
        ring-1 ring-white/10
        bg-gradient-to-b from-[#0d1b2e]/70 to-[#060a12]/70
        shadow-[0_10px_30px_rgba(0,0,0,0.35)]
        text-white
      "
      aria-label="HITE Score"
    >
      {/* декоративная подсветка, не ловит клики */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -bottom-10 w-[360px] h-[180px]"
        style={{
          background:
            "radial-gradient(280px 140px at 30% 40%, rgba(180,96,255,0.18), transparent 45%)",
        }}
      />

      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center ring-1 ring-white/10">
            <Image src="/icon1.png" alt="HITE" width={22} height={22} />
          </div>
          <div className="flex items-center gap-2">
            <div className="text-[17px] font-medium">HITE Score</div>
            <span className="text-[11px] px-2 py-[3px] rounded-full bg-[#2b2f6a] text-[#B2FF8B] border border-white/10">
              🌱 {level}
            </span>
          </div>
        </div>
        <div className="text-3xl font-bold tabular-nums">
          {score.toLocaleString()}
        </div>
      </div>
    </div>
  );
}