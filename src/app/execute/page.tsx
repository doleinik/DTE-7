"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
// import Arrow from "@/public/arrow.svg";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, cubicBezier } from "framer-motion";

const EASE = cubicBezier(0.22, 1, 0.36, 1);

// ---- Types ----
interface Question {
  id: number;
  question: string;
  position: number;
  use_common_answer: boolean;
  score_type:
  | "composure"
  | "confidence"
  | "competitiveness"
  | "commitment"
  | string;
  reverse_scoring: boolean;
  assessment: number;
  answers?: string[];
  correctIndex?: number;
}

type StoredAnswer = {
  questionId: number;
  score: number;
  score_type: string;
  answer: string | null;
  isCorrect?: boolean;
  gradable?: boolean;
};

export default function Assessment() {
  const router = useRouter();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [textVisible, setTextVisible] = useState(true);
  const [fillPercentage, setFillPercentage] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({
    composure: 0,
    confidence: 0,
    competitiveness: 0,
    commitment: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [finalScore, setFinalScore] = useState<number>(0);
  const [finalLevel, setFinalLevel] = useState<string>("");

  const [textAnswer, setTextAnswer] = useState("");

  const [locked, setLocked] = useState(false);
  const [reveal, setReveal] = useState<{
    clicked: number;
    isCorrect: boolean;
  } | null>(null);

  const updateProgress = (index: number) => {
    const total = questions.length || 1;
    setFillPercentage(Math.floor(((index + 1) / total) * 100));
  };

  useEffect(() => {
    const sample: Question[] = [
      {
        id: 1,
        question:
          "What’s one of the best ways to interrupt a self-doubt spiral?",
        position: 1,
        use_common_answer: true,
        score_type: "confidence",
        reverse_scoring: false,
        assessment: 1,
        answers: [
          "Push through until it fades.",
          "Make one small commitment you can follow through on.",
          "Wait for a good performance to feel better.",
        ],
        correctIndex: 1,
      },
      {
        id: 2,
        question:
          "Why do you think following through on small commitments helps interrupt doubt?",
        position: 2,
        use_common_answer: true,
        score_type: "composure",
        reverse_scoring: false,
        assessment: 1,
        answers: [
          "My self-belief is on fire today.",
          "I’m feeling more confident in myself lately.",
          "Some belief is there, but it’s not steady.",
          "I’ve been second-guessing myself a lot.",
          "I’m barely trusting my abilities right now.",
        ],
      },
    ];

    const t = setTimeout(() => {
      setQuestions(sample);
      setLoading(false);
    }, 120);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (questions.length > 0) {
      setSelectedIndex(0);
      setTextVisible(true);
      setFillPercentage(Math.floor((1 / questions.length) * 100));
      try {
        localStorage.setItem("answers", "[]");
      } catch { }
    }
  }, [questions]);

  useEffect(() => {
    if (questions.length === 0) return;
    setTextVisible(false);
    const t = setTimeout(() => {
      setTextVisible(true);
      updateProgress(selectedIndex);
    }, 60);
    return () => clearTimeout(t);
  }, [selectedIndex, questions.length]);

  const computeAndPersistResults = (aggregate: Record<string, number>) => {
    let maxPoints = 0;
    for (const q of questions) {
      const answersLen = q.answers?.length ?? 1;
      const qMax = Math.max(answersLen - 1, 0);
      maxPoints += qMax;
    }
    const totalPoints = Object.values(aggregate).reduce(
      (a, b) => a + (b || 0),
      0
    );
    const denom = maxPoints || 1;
    const scaled = Math.round((totalPoints / denom) * 1000);
    setFinalScore(scaled);

    let level = "Rookie";
    if (scaled >= 750) level = "Elite";
    else if (scaled >= 500) level = "Pro";
    setFinalLevel(level);

    let kcTotal = 0;
    let kcCorrectCount = 0;
    try {
      const stored: StoredAnswer[] = JSON.parse(
        localStorage.getItem("answers") || "[]"
      );
      for (const a of stored) {
        if (a.gradable) {
          kcTotal += 1;
          if (a.isCorrect) kcCorrectCount += 1;
        }
      }
    } catch { }
    const kcAllCorrect = kcTotal > 0 && kcCorrectCount === kcTotal;
    const kcCorrectBonus = kcAllCorrect ? 15 : 0;

    try {
      localStorage.setItem("hiteScores", JSON.stringify(aggregate));
      localStorage.setItem("answers", localStorage.getItem("answers") || "[]");
      localStorage.setItem("showDiscoverPopup", "true");
      localStorage.setItem("level", level);
      localStorage.setItem("finalScore", String(scaled));

      localStorage.setItem("kcTotal", String(kcTotal));
      localStorage.setItem("kcCorrectCount", String(kcCorrectCount));
      localStorage.setItem("kcAllCorrect", String(kcAllCorrect));
      localStorage.setItem("kcCorrectBonus", String(kcCorrectBonus));

      // можно параметризовать
      localStorage.setItem("dteCompletedPoints", "100");
      localStorage.setItem("dteStreakPoints", "7");
    } catch { }

    return { scaled, level, kcAllCorrect, kcCorrectBonus };
  };

  const goNext = () => {
    const next = selectedIndex + 1;
    if (next >= questions.length) {
      try {
        const stored: StoredAnswer[] = JSON.parse(
          localStorage.getItem("answers") || "[]"
        );
        const aggregate: Record<string, number> = {};
        for (const s of stored) {
          aggregate[s.score_type] =
            (aggregate[s.score_type] || 0) + Number(s.score || 0);
        }
        aggregate.composure = aggregate.composure || 0;
        aggregate.confidence = aggregate.confidence || 0;
        aggregate.competitiveness = aggregate.competitiveness || 0;
        aggregate.commitment = aggregate.commitment || 0;
        computeAndPersistResults(aggregate);
      } catch {
        computeAndPersistResults(scores);
      }

      localStorage.setItem(
        "planProgress",
        JSON.stringify({
          discover: "completed",
          train: "completed",
          execute: "completed",
        })
      );
      router.push("/score");
    } else {
      setSelectedIndex(next);
      setTextAnswer("");
      setReveal(null);
      setLocked(false);
    }
  };

  const handleAnswer = (answerIndex: number) => {
    if (locked) return;
    const current = questions[selectedIndex];
    if (!current) return;

    const answers = current.answers ?? [];
    const pointsForChoice = Math.max(answers.length - 1 - answerIndex, 0);

    const gradable = typeof current.correctIndex === "number";
    const isCorrect = gradable ? answerIndex === current.correctIndex : false;

    setLocked(true);
    setReveal({ clicked: answerIndex, isCorrect });

    setScores((prev) => {
      const copy = { ...prev };
      copy[current.score_type] =
        (copy[current.score_type] || 0) + pointsForChoice;
      return copy;
    });

    try {
      const stored: StoredAnswer[] = JSON.parse(
        localStorage.getItem("answers") || "[]"
      );
      stored.push({
        questionId: current.id,
        score: pointsForChoice,
        score_type: current.score_type,
        answer: answers[answerIndex] ?? null,
        isCorrect,
        gradable,
      });
      localStorage.setItem("answers", JSON.stringify(stored));
    } catch { }

    // тайминг как в референсе — мягкий, с тем же EASE
    setTimeout(goNext, 720);
  };

  const handleTextSubmit = () => {
    const current = questions[selectedIndex];
    if (!current) return;

    const pointsForChoice = 0;
    try {
      const stored: StoredAnswer[] = JSON.parse(
        localStorage.getItem("answers") || "[]"
      );
      stored.push({
        questionId: current.id,
        score: pointsForChoice,
        score_type: current.score_type,
        answer: textAnswer || null,
        isCorrect: undefined,
        gradable: false,
      });
      localStorage.setItem("answers", JSON.stringify(stored));
    } catch { }

    setScores((prev) => {
      const copy = { ...prev };
      copy[current.score_type] =
        (copy[current.score_type] || 0) + pointsForChoice;
      return copy;
    });

    goNext();
  };

  const handleBack = () => {
    if (selectedIndex > 0) {
      try {
        const stored: StoredAnswer[] = JSON.parse(
          localStorage.getItem("answers") || "[]"
        );
        const last = stored.pop();
        localStorage.setItem("answers", JSON.stringify(stored));
        if (last) {
          setScores((s) => {
            const copy = { ...s };
            const t = last.score_type;
            const val = Number(last.score) || 0;
            copy[t] = Math.max(0, (copy[t] || 0) - val);
            return copy;
          });
        }
      } catch { }
      setSelectedIndex((i) => Math.max(0, i - 1));
      setReveal(null);
      setLocked(false);
    } else {
      router.back();
    }
  };

  // --- UI states ---
  if (loading) {
    return (
      <div className='absolute inset-0 flex justify-center items-center text-2xl text-white'>
        Loading assessment...
      </div>
    );
  }
  if (error) {
    return (
      <div className='absolute inset-0 flex flex-col justify-center items-center px-4 text-center text-red-500'>
        <p className='text-xl'>Error: {error}</p>
        <p className='mt-2 text-sm'>Please try refreshing the page.</p>
      </div>
    );
  }
  if (questions.length === 0) {
    return (
      <div className='absolute inset-0 flex justify-center items-center text-2xl text-white'>
        No HITE Assessment Questions Found
      </div>
    );
  }

  const current = questions[selectedIndex];

  return (
    <div className='absolute inset-0 flex justify-center items-center'>
      <div className='flex flex-col w-full max-w-md h-screen overflow-hidden'>
        {/* decor */}
        <div
          className='-top-8 absolute inset-x-0 rounded-t-[22px] h-48 pointer-events-none'
          style={{
            background:
              "radial-gradient(800px 120px at 10% 0%, rgba(60,80,140,0.12), transparent 20%), linear-gradient(90deg, rgba(40,50,90,0.06), transparent 40%)",
            transform: "translateY(-6%)",
          }}
          aria-hidden
        />

        {/* content */}
        <div className='flex-1 overflow-auto'>
          <div className='px-2 py-6'>
            {/* Header */}
            <div className='flex items-center gap-4'>
              <button
                className='bg-transparent hover:bg-white/6 p-1 rounded-full transition'
                onClick={handleBack}
                aria-label='Back'
              >
                <Image src='/arrow.svg' alt='Arrow' width={28} height={28} />
              </button>
              <h2 className='font-bold text-[20px] text-white'>Execute</h2>
            </div>

            {/* progress */}
            <div className='mt-4'>
              <div className='bg-white/10 rounded-full w-full h-2 overflow-hidden'>
                <div
                  className='bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] rounded-full h-full transition-all duration-500 ease-in-out'
                  style={{ width: `${fillPercentage}%` }}
                />
              </div>
            </div>

            {/* question */}
            <div className='mt-6'>
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: EASE }}
                className={`h-28 overflow-y-auto px-1`}
              >
                <p className='text-[20px] text-white leading-snug'>
                  {current.question}
                </p>
              </motion.div>
            </div>

            {/* answers */}
            <div className='flex flex-col flex-none items-center gap-4 mx-1 mt-6 py-2 h-[50%] overflow-y-auto'>
              {current.id === 2 ? (
                <div className='flex flex-col w-full max-w-md h-[64%]'>
                  <textarea
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    placeholder='Type your response here...'
                    className='bg-white/5 p-4 border border-white/6 rounded-lg w-full h-full min-h-[160px] max-h-[320px] text-white placeholder:text-white/40 resize-none focus:outline-none'
                  />
                </div>
              ) : (
                (current.answers ?? []).map((txt, i) => {
                  const isCorrectIndex =
                    typeof current.correctIndex === "number" &&
                    i === current.correctIndex;
                  let visualState: "idle" | "correct" | "wrong" | "muted" =
                    "idle";
                  if (reveal) {
                    if (isCorrectIndex) visualState = "correct";
                    else if (reveal.clicked === i) visualState = "wrong";
                    else visualState = "muted";
                  }

                  return (
                    <motion.button
                      key={i}
                      onClick={() => handleAnswer(i)}
                      disabled={locked}
                      className='group relative flex justify-start items-center px-6 rounded-[999px] w-full max-w-md h-[64px] focus:outline-none'
                      aria-label={txt}
                      aria-pressed={reveal?.clicked === i}
                      initial={false}
                      animate={
                        visualState === "correct"
                          ? {
                            scale: [1, 1.04, 1],
                            transition: { duration: 0.36, ease: EASE },
                          }
                          : visualState === "wrong"
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
                          opacity: visualState === "muted" ? 0.6 : 1,
                        }}
                      />
                      {/* overlays */}
                      <AnimatePresence>
                        {visualState === "correct" && (
                          <motion.div
                            key='ok'
                            className='absolute inset-0 bg-green-400/15 rounded-[999px] ring-1 ring-green-400/60'
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3, ease: EASE }}
                          />
                        )}
                        {visualState === "wrong" && (
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
                })
              )}
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className='px-6 pb-6'>
          {current.id === 2 && textAnswer.trim().length > 0 && (
            <div className='mt-4'>
              <button
                onClick={handleTextSubmit}
                className='block bg-white mx-auto px-6 py-3 rounded-3xl w-full max-w-[420px] font-medium text-black text-lg'
              >
                Submit
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
