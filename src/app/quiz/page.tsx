"use client"

import Quiz from "@/components/Quiz";
import { Question } from "@/components/QuestionCard";

export default function KnowledgeCheckPage() {
  const questions: Question[] = [
    {
      id: "q1",
      text: "What's a strong first step to rebuilding belief after a tough moment?",
      answers: [
        { id: "a1", text: "Wait until you feel more confident" },
        { id: "a2", text: "Replay the mistake to avoid it next time" },
        { id: "a3", text: "Take a small recovery action you can control" },
      ],
      correctAnswerId: "a1", 
    },
  ];

  const handleQuizComplete = (score: number, total: number) => {
    console.log(`Quiz completed with score: ${score}/${total}`);
  };

  const handleFeedbackSubmit = (rating: number, feedback: string) => {
    console.log(`Feedback submitted: ${rating}/5 stars`);
    console.log(`Comments: ${feedback}`);
  };

  return (
    <div className="w-full h-full flex justify-center">
      <div className="min-h-screen max-w-md w-full relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('/quiz-bg.png')` }}
        />
        
        <div className="relative z-10 h-dvh px-4 pt-[1rem] pb-[3.125rem]">
          <div className="h-full w-full flex flex-col">
            <Quiz 
              questions={questions} 
              onComplete={handleQuizComplete} 
              onFeedbackSubmit={handleFeedbackSubmit}
            />
          </div>
        </div>
      </div>
    </div>
  );
}