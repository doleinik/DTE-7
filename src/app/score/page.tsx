"use client";

import { AnimatePresence, motion, animate } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Button from "@/components/ui/Button";
import PopperCrackerIcon from "@/components/icons/PopperCrackerIcon";
import Link from "next/link";
import HITEIcon from "@/components/icons/HITEIcon";

// ===== helpers =====
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function CountUp({
  from = 0,
  to,
  duration = 0.8,
  format = (v: number) => v.toLocaleString(),
  delay = 0,
  onComplete,
}: {
  from?: number;
  to: number;
  duration?: number;
  delay?: number;
  format?: (v: number) => string;
  onComplete?: () => void;
}) {
  const [val, setVal] = useState(from);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const controls = animate(from, to, {
      duration,
      delay,
      ease: "easeOut",
      onUpdate: (v) => setVal(Math.round(v)),
      onComplete: () => onCompleteRef.current?.(),
    });
    return () => controls.stop();
  }, [from, to, duration, delay]);

  return <span className='tabular-nums'>{format(val)}</span>;
}

// ===== small icons  =====
function FireIcon() {
  return (
    <svg width='18' height='20' viewBox='0 0 18 20' fill='none'>
      <path
        d='M10.1123 19.796C13.3272 19.1516 17.484 16.8389 17.484 10.8584C17.484 5.41618 13.5004 1.79219 10.636 0.127007C10.0003 -0.242492 9.25623 0.243445 9.25623 0.978654V2.8592C9.25623 4.3421 8.63275 7.04889 6.90034 8.17474C6.01585 8.74955 5.06061 7.88923 4.95311 6.83987L4.86484 5.97818C4.76223 4.97644 3.742 4.36833 2.94138 4.97908C1.50307 6.07629 0 7.99764 0 10.8584C0 18.172 5.43947 20.0004 8.1592 20.0004C8.31739 20.0004 8.48364 19.9957 8.6567 19.9857C7.31377 19.8709 5.14235 19.0377 5.14235 16.3433C5.14235 14.2357 6.67999 12.8098 7.84828 12.1167C8.16249 11.9303 8.53025 12.1723 8.53025 12.5377V13.1436C8.53025 13.6074 8.70961 14.3323 9.13655 14.8286C9.61968 15.3901 10.3288 14.8019 10.386 14.0633C10.4041 13.8303 10.6384 13.6818 10.8402 13.7997C11.4997 14.1852 12.3416 15.0087 12.3416 16.3433C12.3416 18.4496 11.1805 19.4185 10.1123 19.796Z'
        fill='#E4782A'
      />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width='16' height='17' viewBox='0 0 16 17' fill='none'>
      <path
        d='M14.666 8.5A6.667 6.667 0 1 1 1.333 8.5a6.667 6.667 0 0 1 13.333 0Z'
        fill='white'
        fillOpacity='.8'
      />
      <path
        d='M8 5.333V8.293l1.52 1.52'
        stroke='#060502'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
}

// Минимальный тип для чтения answers из localStorage
type StoredAnswer = {
  questionId?: string | number;
  gradable?: boolean;
  isCorrect?: boolean;
};

export default function ScorePage() {
  const HITE_BASE = 952;

  const completedVal = 100;
  const streakVal = 7;

  // ==== KC bonus (+15 if last gradable isCorrect, else 0), либо из kcCorrectBonus ====
  const [kcBonus, setKcBonus] = useState(0);

  useEffect(() => {
    try {
      // 1) если заранее записали kcCorrectBonus — используем его
      const raw = localStorage.getItem("kcCorrectBonus");
      if (raw !== null) {
        const v = Number(raw);
        if (!Number.isNaN(v)) {
          setKcBonus(v);
          return;
        }
      }
      // 2) fallback: берём последний gradable ответ и проверяем isCorrect
      const stored: StoredAnswer[] = JSON.parse(
        localStorage.getItem("answers") || "[]"
      );
      const gradable = stored.filter((a) => a?.gradable);
      if (gradable.length > 0) {
        const last = gradable[gradable.length - 1];
        setKcBonus(last?.isCorrect ? 15 : 0);
      } else {
        setKcBonus(0);
      }
    } catch {
      setKcBonus(0);
    }
  }, []);

  const totalVal = useMemo(() => completedVal + streakVal + kcBonus, [kcBonus]);
  const hiteDeltaVal = totalVal;

  const daysFrom = 5;
  const daysTo = 6;

  const [showFeedback, setShowFeedback] = useState(false);
  const xpLevel: "Rookie" | "Starter" = showFeedback ? "Starter" : "Rookie";

  // success sound
  const successAudioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const a = new Audio("/success.mp3");
    a.preload = "auto";
    a.volume = 0.8;
    // @ts-expect-error safari inline
    a.playsInline = true;
    successAudioRef.current = a;
    return () => {
      if (successAudioRef.current) {
        try {
          successAudioRef.current.pause();
        } catch {}
        successAudioRef.current.src = "";
        successAudioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const baseDelay = 0.35;

    const soundTimer = window.setTimeout(() => {
      const a = successAudioRef.current;
      if (a) {
        try {
          a.currentTime = 0;
          a.play().catch(() => {});
        } catch {}
      }
    }, (baseDelay + 0.6) * 1000);

    const headlineTimer = window.setTimeout(() => setShowFeedback(true), 1400);

    return () => {
      clearTimeout(soundTimer);
      clearTimeout(headlineTimer);
    };
  }, []);

  // Пишем актуальные значения (не перетираем kcCorrectBonus нулём)
  useEffect(() => {
    if (!showFeedback) return;
    try {
      const newScore = HITE_BASE + hiteDeltaVal;
      localStorage.setItem("hiteBase", String(newScore));
      localStorage.setItem("dteCompletedPoints", String(completedVal));
      localStorage.setItem("dteStreakPoints", String(streakVal));
      localStorage.setItem("kcCorrectBonus", String(kcBonus)); // <-- сохраняем фактический бонус
      localStorage.setItem("streakDays", String(daysTo));
      localStorage.setItem("xpLevel", xpLevel);
      window.dispatchEvent(new Event("planprogress:updated"));
    } catch {}
  }, [hiteDeltaVal, showFeedback, xpLevel, kcBonus]);

  const [scoreCardReady, setScoreCardReady] = useState(false);
  const [runScoreAnim, setRunScoreAnim] = useState(false);
  const [scoreAnimDone, setScoreAnimDone] = useState(false);

  useEffect(() => {
    if (showFeedback && scoreCardReady && !runScoreAnim) {
      setRunScoreAnim(true);
    }
  }, [showFeedback, scoreCardReady, runScoreAnim]);

  return (
    <div className='min-h-dvh relative text-white'>
      <div className='absolute inset-0 -z-10'>
        <Image src='/bg.png' alt='' fill priority className='object-cover' />
      </div>

      <div className='max-w-md mx-auto px-6 pt-3 pb-10 flex flex-col min-h-dvh'>
        <AnimatePresence mode='wait'>
          {!showFeedback ? (
            <motion.div
              key='headline-1'
              className='text-center mb-10 mt-8'
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <p className='text-white/85'>
                You’ve completed today’s DTE. Your
                <br />
                metrics have now changed!
              </p>
            </motion.div>
          ) : (
            <motion.div
              key='headline-2'
              className='text-center mb-10'
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <div className='w-fit mx-auto mb-3'>
                <PopperCrackerIcon />
              </div>
              <h1 className='text-[32px] font-bold mb-2'>You Did It!</h1>
              <p className='text-white/85'>
                You’ve completed today’s DTE. Your
                <br />
                metrics have now changed!
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== STATS CARD  ===== */}
        <motion.div
          className='w-full mb-3 p-4 bg-black/30 border border-white/20 rounded-2xl'
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <div className='flex items-center justify-between'>
            <span className='font-semibold'>Active Streak</span>
            <div className='flex items-center gap-1.5'>
              <FireIcon />
              <span className='text-[22px] font-medium'>
                <CountUp from={daysFrom} to={daysTo} duration={0.9} /> days
              </span>
            </div>
          </div>
          <div className='mt-1 flex items-center justify-between text-sm text-white/80'>
            <span>Time spent today:</span>
            <div className='flex items-center gap-1'>
              <ClockIcon />
              <span>15m</span>
            </div>
          </div>
        </motion.div>

        {/* ===== HITE SCORE CARD ===== */}
        <motion.div
          className='w-full relative overflow-hidden rounded-2xl border'
          style={{ borderColor: "rgba(124,44,255,0.5)" }}
          initial={{ opacity: 0, y: 16, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
          onAnimationComplete={() => setScoreCardReady(true)}
        >
          <div
            aria-hidden
            className='absolute inset-0 opacity-90'
            style={{
              backgroundImage: "url('/hite-score-bg.png')",
              backgroundSize: "290px 140px",
              backgroundPosition: "right bottom",
              backgroundRepeat: "no-repeat",
            }}
          />
          <div className='relative z-10 p-4'>
            <div className='flex items-center justify-between mb-2'>
              <div className='flex items-center gap-2'>
                <HITEIcon />
                <span className='font-medium text-lg'>HITE Score</span>

                <span
                  className='ml-1 text-[10px] px-2 py-1 rounded-4xl font-medium'
                  style={{
                    backgroundColor:
                      xpLevel === "Rookie" ? "#363391" : "#924AAB",
                    color: xpLevel === "Rookie" ? "#B2FF8B" : "#FFFF00",
                  }}
                >
                  {xpLevel === "Rookie" ? "🌱 Rookie" : "🐤 Starter"}
                </span>
              </div>
              <span className='font-semibold text-2xl'>
                {!runScoreAnim ? (
                  <span className='tabular-nums'>
                    {HITE_BASE.toLocaleString()}
                  </span>
                ) : (
                  <CountUp
                    key={`hite-${HITE_BASE}-${hiteDeltaVal}`}
                    from={HITE_BASE}
                    to={HITE_BASE + hiteDeltaVal}
                    duration={1.0}
                    delay={0}
                    onComplete={() => setScoreAnimDone(true)}
                  />
                )}
              </span>
            </div>

            <AnimatePresence initial={false}>
              {showFeedback && scoreAnimDone && (
                <motion.div
                  key='breakdown'
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className='mt-1 pt-2 border-t border-white/20 text-sm'
                >
                  <div className='flex items-center justify-between py-0.5 text-white/85'>
                    <span>Completed DTE</span>
                    <span className='tabular-nums'>+{completedVal}</span>
                  </div>
                  <div className='flex items-center justify-between py-0.5 text-white/85'>
                    <span>DTE Streak Multiplier</span>
                    <span className='tabular-nums'>+{streakVal}</span>
                  </div>
                  <div className='flex items-center justify-between py-0.5 text-white/85'>
                    <span>Correct Knowledge Check Answer</span>
                    <span className='tabular-nums'>+{kcBonus}</span>
                  </div>

                  <div className='mt-1 flex items-center justify-between'>
                    <span>Total</span>
                    <span className='font-medium text-green-400 tabular-nums'>
                      +{totalVal} points
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <div className='mt-auto pt-8'>
          <Link href='/feedback' className='block'>
            <Button variant='text' className='w-full'>
              Next
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
