"use client";

import Flashcards, { FlashcardsContent } from "@/components/Flashcards";
import PrefetchTranscripts from "@/components/PrefetchTranscripts";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";

// универсальный хелпер: проверка, что у объекта есть строковое поле K
function hasString<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, string> {
  return (
    !!obj &&
    typeof obj === "object" &&
    typeof (obj as Record<K, unknown>)[key] === "string"
  );
}

// type guard для аудио-карточек (без any)
function isAudioCard(
  c: FlashcardsContent
): c is FlashcardsContent & { type: "audio"; audioUrl: string } {
  return c.type === "audio" && hasString(c, "audioUrl");
}

export default function FlashcardPage() {
  const router = useRouter();

  // Делаем массив карточек стабильным (одна и та же ссылка между рендерами)
  const flashcards = useMemo<FlashcardsContent[]>(
    () => [
      {
        id: "f1",
        type: "text",
        title: 'Mastering Focus',
        content:
          "As routines shift, your attention can start scanning in too many directions. When you’re adding new elements—more reps, different feedback, higher expectations—it’s easy for your focus to feel stretched. Athletes who stay grounded during growth phases usually return to one constant. They build around a steady focal point instead of chasing everything at once. This is what keeps your attention useful, even in the middle of change.",
        backgroundImage: "/game-bg.png",
      },

      {
        id: "f2",
        type: "input",
        title: "What part of your environment or prep feels the most different lately? Where has your attention been landing as you adjust?",
        content: "",
        backgroundImage: "/game-bg.png",
      },
      {
        id: "f4",
        type: "game",
        title: "The Reset Slot Machine",
        content: "Think of a word that helps keep you grounded on fast-moving days. Were gonna play a quick game with that word.",
        backgroundImage: "/game-bg.png",
      },

    ],
    []
  );

  // Инициализируем фон сразу из первой карточки — без useEffect
  const [currentBgImage, setCurrentBgImage] = useState<string>(
    flashcards[0]?.backgroundImage || "/video-bg.png"
  );

  const handleSlideChange = (index: number) => {
    const newBg = flashcards[index]?.backgroundImage || "/video-bg.png";
    setCurrentBgImage(newBg);
  };

  const handleComplete = () => {
    router.push("/quiz");
  };

  // Без any: фильтруем type-guard'ом и берём .audioUrl
  const audioUrls = useMemo(
    () => flashcards.filter(isAudioCard).map((c) => c.audioUrl),
    [flashcards]
  );

  return (
    <div className='flex justify-center w-full h-full'>
      <PrefetchTranscripts urls={audioUrls} />

      <div className='relative max-w-md min-h-screen overflow-hidden'>
        <div className='absolute inset-0'>
          {flashcards.map((card) => (
            <div
              key={card.id}
              className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ease-in-out ${card.backgroundImage === currentBgImage
                ? "opacity-100"
                : "opacity-0"
                }`}
              style={{
                backgroundImage: `url("${card.backgroundImage || "/video-bg.png"
                  }")`,
              }}
            />
          ))}
        </div>

        <div className='z-10'>
          <div className='flex flex-col h-screen'>
            <Flashcards
              cards={flashcards}
              onComplete={handleComplete}
              onSlideChange={handleSlideChange}
              className='flex-1'
            />
          </div>
        </div>
      </div>
    </div>
  );
}
