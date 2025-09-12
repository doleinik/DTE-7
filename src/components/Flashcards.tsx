"use client";

import { useEffect, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Mousewheel, Keyboard } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { twMerge } from "tailwind-merge";

import "swiper/css";
import "swiper/css/pagination";
import FlashCardSlide from "./FlashCardSlide";
import SwipeIcon from "./icons/SwipeIcon";

export type FlashcardsContent = {
  id: string;
  type: "video" | "timer" | "text" | "input" | "audio" | "game";
  title?: string;
  content?: string;
  videoUrl?: string;
  audioUrl?: string;
  posterUrl?: string;
  backgroundImage?: string;
};

type FlashcardsProps = {
  cards: FlashcardsContent[];
  onComplete?: () => void;
  onSlideChange?: (index: number) => void;
  className?: string;
};

export default function Flashcards({
  cards,
  onComplete,
  onSlideChange,
  className,
}: FlashcardsProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [swiperInstance, setSwiperInstance] = useState<SwiperType | null>(null);

  // ===== SFX swipe =====
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sfxRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);
  const skipFirstSlideChangeRef = useRef(true);

  useEffect(() => {
    // подгружаем короткий звук свайпа (положи файл в /public/swipe.mp3)
    const a = new Audio("/swipe.mp3");
    a.preload = "auto";
    a.volume = 0.45;
    sfxRef.current = a;
    return () => {
      if (sfxRef.current) {
        // на всякий случай останавливаем
        try {
          sfxRef.current.pause();
        } catch { }
        sfxRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const unlockOnce = async () => {
      if (audioUnlockedRef.current || !sfxRef.current) return;
      try {
        // короткий «тихий» запуск для разблокировки в iOS
        sfxRef.current.muted = true;
        await sfxRef.current.play();
        sfxRef.current.pause();
        sfxRef.current.currentTime = 0;
        sfxRef.current.muted = false;
        audioUnlockedRef.current = true;
      } catch {
        // ignore — попробуем ещё на следующий жест
      }
    };

    const onPointerDown = () => unlockOnce();
    const onWheel = () => unlockOnce();
    const onKeyDown = () => unlockOnce();

    root.addEventListener("pointerdown", onPointerDown, { passive: true });
    root.addEventListener("wheel", onWheel, { passive: true });
    root.addEventListener("keydown", onKeyDown);

    return () => {
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("wheel", onWheel);
      root.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const playSwipeSfx = () => {
    const a = sfxRef.current;
    if (!a) return;
    try {
      a.currentTime = 0;
      // не используем await, чтобы не блокировать UI
      void a.play().catch(() => { });
    } catch {
      // ignore
    }
  };

  const handleSlideChange = (swiper: SwiperType) => {
    setCurrentCardIndex(swiper.activeIndex);
    onSlideChange?.(swiper.activeIndex);

    // Пропускаем первый вызов, чтобы не сыграть звук на инициализации
    if (skipFirstSlideChangeRef.current) {
      skipFirstSlideChangeRef.current = false;
      return;
    }
    playSwipeSfx();
  };

  if (!cards.length) return null;

  const activeCard = cards[currentCardIndex];
  // если на input-карточке виден Submit, приподнимем иконку
  const showSubmit =
    activeCard?.type === "input" && userInput.trim().length > 0;

  return (
    <section
      ref={containerRef}
      className={twMerge("h-full outline-none", className)}
      // чтобы ловить keydown для разблокировки — делаем контейнер focusable
      tabIndex={0}
    >
      <Swiper
        direction='vertical'
        slidesPerView={1}
        spaceBetween={0}
        mousewheel={{ enabled: true, forceToAxis: true }}
        keyboard={{ enabled: true }}
        modules={[Pagination, Mousewheel, Keyboard]}
        onSwiper={setSwiperInstance}
        onSlideChange={handleSlideChange}
        className='h-full'
        style={
          {
            "--swiper-pagination-color": "#ffffff",
            "--swiper-pagination-bullet-inactive-color": "#ffffff40",
          } as React.CSSProperties
        }
      >
        {cards.map((card, index) => (
          <SwiperSlide key={card.id} className='px-4 h-full'>
            <FlashCardSlide
              card={card}
              isActive={index === currentCardIndex}
              index={index}
              cardsLength={cards.length}
              userInput={userInput}
              onUserInputChange={setUserInput}
              swiper={swiperInstance}
              onComplete={onComplete}
            />
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Глобальная свайп-иконка: всегда поверх, центр по ширине */}
      {currentCardIndex <= 1 && (
        <div
          className='right-0 left-0 z-[1001] fixed flex justify-center pointer-events-none'
          style={{
            bottom: `calc(env(safe-area-inset-bottom, 0px) + ${showSubmit ? 86 : 18
              }px)`,
          }}
        >
          <SwipeIcon />
        </div>
      )}
    </section>
  );
}
