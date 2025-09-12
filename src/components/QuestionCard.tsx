"use client";

import { useEffect, useState } from "react";
import AnswerOption from "./AnswerOption";

export type Answer = {
  id: string;
  text: string;
};

export type Question = {
  id: string;
  text: string;
  answers: Answer[];
  correctAnswerId: string;
};

type QuestionCardProps = {
  question: Question;
  onAnswered: (
    questionId: string,
    answerId: string,
    isCorrect: boolean
  ) => void;
  className?: string;
  disabled?: boolean;
};

export default function QuestionCard({
  question,
  onAnswered,
  className,
  disabled = false,
}: QuestionCardProps) {
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [revealCorrect, setRevealCorrect] = useState(false);

  const isAnswered = selectedAnswerId !== null;

  // сбрасываем состояние при смене вопроса
  useEffect(() => {
    setSelectedAnswerId(null);
    setRevealCorrect(false);
  }, [question.id]);

  const handleSelectAnswer = (answerId: string) => {
    if (isAnswered || disabled) return;

    setSelectedAnswerId(answerId);
    const isCorrect = answerId === question.correctAnswerId;
    onAnswered(question.id, answerId, isCorrect);

    // если неверно — подсветим правильный вариант чуть позже
    if (!isCorrect) {
      setTimeout(() => setRevealCorrect(true), 500);
    }
  };

  return (
    <div className={`${className || ""}`}>
      <h3 className='text-xl font-medium text-white mb-[1.875rem]'>
        {question.text}
      </h3>

      <div className='space-y-3'>
        {question.answers.map((answer, index) => {
          const isSelected = selectedAnswerId === answer.id;
          const isRightOption = answer.id === question.correctAnswerId;

          // показываем зелёную подсветку:
          // 1) если выбран верный; 2) если выбран неверный и надо подсветить правильный
          const showAsCorrect =
            (isSelected && isRightOption) ||
            (!isSelected && isRightOption && revealCorrect);

          // красную подсветку + shake — только на выбранном неверном
          const showAsWrong = isSelected && !isRightOption;

          const isOptionDisabled = (isAnswered && !isSelected) || disabled;

          return (
            <AnswerOption
              key={answer.id}
              marker={String.fromCharCode(65 + index)}
              answer={answer.text}
              isSelected={isSelected}
              isCorrect={showAsCorrect}
              isWrong={showAsWrong}
              onClick={() => handleSelectAnswer(answer.id)}
              disabled={isOptionDisabled}
            />
          );
        })}
      </div>
    </div>
  );
}
