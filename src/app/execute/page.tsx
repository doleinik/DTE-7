"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion, cubicBezier } from "framer-motion";

import Screen from "@/components/Screen";
import TextArea from "@/components/ui/TextArea";
import Button from "@/components/ui/Button";
import BackButton from "@/components/ui/BackButton";
import { completeExecute } from "@/lib/planProgress";

type RevealState = { clicked: number; isCorrect: boolean } | null;

interface StoredAnswer {
  questionId: string | number;
  score: number;
  score_type: string;
  answer: string | null;
  isCorrect?: boolean;
  gradable?: boolean;
}

const EASE = cubicBezier(0.22, 1, 0.36, 1);

// --- Конфиг вопроса (можете позже подменить данными из Strapi) ---
const qId = "exec-q1";
const qText =
  "What does a reset help you do during intense training or competition?";
const answers = [
  "Pause your effort completely",
  "Come back to your focus with more clarity",
  "Avoid doing too much",
];
const correctIndex = 1;
const scoreType = "confidence";

export default function ExecutePage() {
  const router = useRouter();

  const [step, setStep] = useState<0 | 1>(0);
  const [answerText, setAnswerText] = useState("");
  const [locked, setLocked] = useState(false);
  const [reveal, setReveal] = useState<RevealState>(null);

  const progress = useMemo(() => (step === 0 ? 50 : 100), [step]);
  const canSubmit = answerText.trim().length > 0;

  useEffect(() => {
    if (step === 0) {
      setLocked(false);
      setReveal(null);
    }
  }, [step]);

  const finish = () => {
    completeExecute();
    router.push("/score");
  };

  const recomputeKCBonus = () => {
    let kcTotal = 0;
    let kcCorrectCount = 0;
    try {
      const stored: StoredAnswer[] = JSON.parse(
        localStorage.getItem("answers") || "[]"
      );
      for (const a of stored) {
        if (a?.gradable) {
          kcTotal += 1;
          if (a?.isCorrect) kcCorrectCount += 1;
        }
      }
    } catch {
      // ignore
    }
    const kcAllCorrect = kcTotal > 0 && kcCorrectCount === kcTotal;
    const kcCorrectBonus = kcAllCorrect ? 15 : 0;

    try {
      localStorage.setItem("kcTotal", String(kcTotal));
      localStorage.setItem("kcCorrectCount", String(kcCorrectCount));
      localStorage.setItem("kcAllCorrect", String(kcAllCorrect));
      localStorage.setItem("kcCorrectBonus", String(kcCorrectBonus));
    } catch {
      // ignore
    }
  };

  const persistAnswer = (idx: number) => {
    const pointsForChoice = Math.max(answers.length - 1 - idx, 0);
    const entry: StoredAnswer = {
      questionId: qId,
      score: pointsForChoice,
      score_type: scoreType,
      answer: answers[idx] ?? null,
      isCorrect: idx === correctIndex,
      gradable: true,
    };

    try {
      const stored: StoredAnswer[] = JSON.parse(
        localStorage.getItem("answers") || "[]"
      );
      // защита от повторной записи того же вопроса
      const already = stored.some((a) => a.questionId === qId);
      const next = already
        ? stored.map((a) => (a.questionId === qId ? entry : a))
        : [...stored, entry];

      localStorage.setItem("answers", JSON.stringify(next));
    } catch {
      localStorage.setItem("answers", JSON.stringify([entry]));
    }
  };

  const handleClick = (idx: number) => {
    if (locked) return;
    const isCorrect = idx === correctIndex;

    setLocked(true);
    setReveal({ clicked: idx, isCorrect });

    persistAnswer(idx);
    recomputeKCBonus();

    setTimeout(() => setStep(1), 720); // дать анимации отыграть
  };

  // --- ШАГ 0: Викторина с анимацией ---
  if (step === 0) {
    return (
      <Screen title='Execute' progress={progress} onBack={() => router.back()}>
        <p className='mt-6 mb-5 text-lg'>{qText}</p>

        <div className='flex flex-col items-center gap-3 mt-4'>
          {answers.map((txt, i) => {
            const isCorrectBtn = i === correctIndex;
            let visual: "idle" | "correct" | "wrong" | "muted" = "idle";
            if (reveal) {
              if (isCorrectBtn) visual = "correct";
              else if (reveal.clicked === i) visual = "wrong";
              else visual = "muted";
            }

            return (
              <motion.button
                key={txt}
                onClick={() => handleClick(i)}
                disabled={locked}
                className='group relative flex justify-start items-center px-6 rounded-[999px] w-full max-w-md h-[68px] focus:outline-none'
                aria-label={txt}
                aria-pressed={reveal?.clicked === i}
                initial={false}
                animate={
                  visual === "correct"
                    ? {
                      scale: [1, 1.04, 1],
                      transition: { duration: 0.36, ease: EASE },
                    }
                    : visual === "wrong"
                      ? {
                        x: [0, -6, 6, -4, 4, 0],
                        transition: { duration: 0.38, ease: EASE },
                      }
                      : { scale: 1, x: 0 }
                }
              >
                {/* base */}
                <div
                  className='absolute inset-0 rounded-[999px]'
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.00))",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.03), 0 6px 30px rgba(0,0,0,0.6)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    opacity: visual === "muted" ? 0.6 : 1,
                  }}
                />
                {/* overlays */}
                <AnimatePresence>
                  {visual === "correct" && (
                    <motion.div
                      key='ok'
                      className='absolute inset-0 bg-green-400/15 rounded-[999px] ring-1 ring-green-400/60'
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3, ease: EASE }}
                    />
                  )}
                  {visual === "wrong" && (
                    <motion.div
                      key='bad'
                      className='absolute inset-0 bg-red-400/15 rounded-[999px] ring-1 ring-red-400/60'
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3, ease: EASE }}
                    />
                  )}
                </AnimatePresence>
                {/* inner border */}
                <div
                  className='absolute inset-0 rounded-[999px] pointer-events-none'
                  style={{
                    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.03)",
                  }}
                />
                <span className='relative z-10 font-medium text-base text-left text-white leading-snug'>
                  {txt}
                </span>
              </motion.button>
            );
          })}
        </div>
      </Screen>
    );
  }

  // --- ШАГ 1: Текстовый ответ + Submit, с фоном ---
  return (
    <div className='relative min-h-[100dvh] text-white overflow-hidden'>
      {/* ФОН */}
      <div className='z-0 absolute inset-0 pointer-events-none' aria-hidden>
        <Image
          src='/bg.png'
          alt=''
          fill
          priority
          sizes='100vw'
          className='blur-[10px] object-cover scale-110'
        />
      </div>

      {/* КОНТЕНТ */}
      <div className='relative z-10 mx-auto px-4 max-w-md'>
        <BackButton onClick={() => setStep(0)} className='mt-[1.5rem] mb-6' />

        <div className='pb-[calc(env(safe-area-inset-bottom)+96px)] flex flex-col gap-4'>
          <h1 className='font-medium text-2xl leading-tight'>
            Why do you think mental resets help gain more control?
          </h1>

          <TextArea
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            placeholder='Type your answer…'
          />
        </div>
      </div>

      {/* Submit — только если есть ввод */}
      {canSubmit && (
        <div className='bottom-[calc(env(safe-area-inset-bottom,0px)+18px)] z-20 fixed inset-x-0'>
          <div className='mx-auto px-4 w-full max-w-md'>
            <Button
              onClick={finish}
              variant='button'
              aria-label='Submit'
              className='w-full'
            >
              Submit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
