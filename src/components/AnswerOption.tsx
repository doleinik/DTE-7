"use client";

import { cva } from "class-variance-authority";
import { twMerge } from "tailwind-merge";
import { motion, AnimatePresence } from "framer-motion";

type AnswerOptionProps = {
  className?: string;
  marker: string;
  isSelected?: boolean;
  isCorrect?: boolean;
  isWrong?: boolean;
  onClick: () => void;
  disabled?: boolean;
  answer: string;
};

const answerOptionVariants = cva(
  [
    "relative flex gap-3 p-2.5 items-center h-[3.75rem] w-full rounded-2xl border cursor-pointer",
    "bg-white/[4%] border-white/20 active:border-white/50",
    "transition-colors",
  ],
  {
    variants: {
      isCorrect: {
        true: "border-green bg-green/10",
        false: "",
      },
      isWrong: {
        true: "border-red bg-red/10",
        false: "",
      },
      disabled: {
        true: "cursor-not-allowed",
        false: "",
      },
    },
    defaultVariants: {
      isCorrect: false,
      isWrong: false,
      disabled: false,
    },
  }
);

const markerVariants = cva(
  [
    "flex justify-center items-center h-[1.75rem] w-[1.75rem] shrink-0 rounded-full text-xs font-medium",
    "bg-white text-black",
  ],
  {
    variants: {
      isCorrect: {
        true: "bg-green text-black",
        false: "",
      },
      isWrong: {
        true: "bg-red text-black",
        false: "",
      },
      disabled: {
        true: "bg-white/50",
        false: "",
      },
    },
    defaultVariants: {
      isCorrect: false,
      isWrong: false,
      disabled: false,
    },
  }
);

const textVariants = cva(["text-base font-normal text-left", "text-white"], {
  variants: {
    isWrong: {
      true: "text-red",
      false: "",
    },
    disabled: {
      true: "text-white/50",
      false: "",
    },
  },
  defaultVariants: {
    isWrong: false,
    disabled: false,
  },
});

// простые иконки для фидбека

export default function AnswerOption({
  className,
  marker,
  isSelected,
  isCorrect,
  isWrong,
  onClick,
  disabled,
  answer,
}: AnswerOptionProps) {
  const EASE = [0.22, 1, 0.36, 1] as const;

  // shake-анимация только для выбранного неверного
  const animateShake =
    isSelected && isWrong ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : { x: 0 };

  // лёгкий pop для корректного (если выбран корректный)
  const animatePop =
    isSelected && isCorrect ? { scale: [1, 1.02, 1] } : { scale: 1 };

  return (
    <motion.button
      type='button'
      role='button'
      onClick={onClick}
      disabled={disabled}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0, ...animateShake, ...animatePop }}
      transition={{ duration: 0.35, ease: EASE }}
      whileHover={!disabled ? { scale: 1.01 } : undefined}
      whileTap={!disabled ? { scale: 0.99 } : undefined}
      className={twMerge(
        answerOptionVariants({ isCorrect, isWrong, disabled }),
        className
      )}
    >
      {/* пульс-ореол для авто-подсветки правильного (когда не выбран) */}
      <AnimatePresence>
        {isCorrect && !isSelected && (
          <motion.div
            key='pulse'
            className='pointer-events-none absolute inset-0 rounded-2xl'
            initial={{ boxShadow: "0 0 0 0 rgba(74,222,128,0)" }}
            animate={{
              boxShadow: [
                "0 0 0 0 rgba(74,222,128,0)",
                "0 0 0 12px rgba(74,222,128,0.25)",
                "0 0 0 0 rgba(74,222,128,0)",
              ],
            }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
        )}
      </AnimatePresence>

      <div
        className={twMerge(markerVariants({ isCorrect, isWrong, disabled }))}
      >
        {marker}
      </div>

      <p className={twMerge(textVariants({ isWrong, disabled }))}>{answer}</p>

      {/* индикаторы справа */}
      <div className='ml-auto flex items-center'>
        <AnimatePresence mode='wait' initial={false}>
          {isSelected && isCorrect && (
            <motion.span
              key='ok'
              initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.22, ease: EASE }}
            ></motion.span>
          )}
          {isSelected && isWrong && (
            <motion.span
              key='bad'
              initial={{ opacity: 0, scale: 0.8, rotate: 10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.22, ease: EASE }}
            ></motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
}
