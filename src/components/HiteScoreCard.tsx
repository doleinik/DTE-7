"use client";

import Image from "next/image";


/** Карточка HITE Score. Декор не перехватывает клики и не вылезает за границы. */type Props = {
  score: number;
  level?: "Rookie" | string;
  streakDays: number;
  weekLabel: string;
  plansDone: number;
  plansTotal: number;
  timeSpent: string;
  onShowMore: () => void;
};

export default function HiteSummaryCard({
  score,
  level = "Rookie",
}: Props) {
  return (
    <div
      className="relative bg-gradient-to-b from-[#0d1b2e]/70 to-[#060a12]/70 shadow-[0_10px_30px_rgba(0,0,0,0.35)] p-4 sm:p-5 rounded-[22px] text-white overflow-hidden /* ВАЖНО: не даём декору перекрывать низ */ ring-1 ring-white/10"
      aria-label="HITE Score"
    >
      {/* декоративная подсветка, не ловит клики */}
      <div
        aria-hidden
        className="-right-16 -bottom-10 absolute w-[360px] h-[180px] pointer-events-none"
        style={{
          background:
            "radial-gradient(280px 140px at 30% 40%, rgba(180,96,255,0.18), transparent 45%)",
        }}
      />

      <div className="relative z-10 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="flex justify-center items-center bg-white/5 rounded-xl w-9 h-9 ring-1 ring-white/10">
            <Image src="/icon1.png" alt="HITE" width={22} height={22} />
          </div>
          <div className="flex items-center gap-2">
            <div className="font-medium text-[17px]">HITE Score</div>
            <span className="bg-[#2b2f6a] px-2 py-[3px] border border-white/10 rounded-full text-[#B2FF8B] text-[11px]">
              🌱 {level}
            </span>
          </div>
        </div>
        <div className="font-bold text-3xl tabular-nums">
          {score.toLocaleString()}
        </div>
      </div>
    </div>
  );
}