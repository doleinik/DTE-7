"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import Counter from "./Counter";
import { FlashcardsContent } from "./Flashcards";
import AudioIcon from "./icons/AudioIcon";
import BackButton from "./ui/BackButton";
import BookmarkButton from "./ui/BookmarkButton";
import TextArea from "./ui/TextArea";
import Timer from "./Timer";
import Swiper from "swiper";
import AudioWave from "./AudioWave";
import Button from "./ui/Button";
import ResetSlotGame from "./MiniGame";

type FlashCardSlideProps = {
  card: FlashcardsContent;
  isActive: boolean;
  index: number;
  cardsLength: number;
  userInput: string;
  onUserInputChange: (value: string) => void;
  swiper: Swiper | null;
  onComplete?: () => void;
};

type VideoExtras = {
  videoUrl?: string;
  posterUrl?: string;
  backgroundImage?: string;
};

// ==== SVG КНОПКИ ====
function PlayIcon() {
  return (
    <svg
      width='60'
      height='60'
      viewBox='0 0 60 60'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <g clipPath='url(#clip0_243_16)'>
        <path
          d='M30 60C46.5685 60 60 46.5685 60 30C60 13.4315 46.5685 0 30 0C13.4315 0 0 13.4315 0 30C0 46.5685 13.4315 60 30 60Z'
          fill='white'
          fillOpacity='0.5'
        />
        <path
          d='M36.3566 23.8044C40.1189 26.435 42 27.7504 42 30C42 32.2496 40.1189 33.565 36.3566 36.1956C35.3181 36.9218 34.288 37.6055 33.3414 38.1752C32.511 38.6751 31.5705 39.1921 30.5968 39.6996C26.8434 41.656 24.9667 42.6342 23.2835 41.5512C21.6003 40.4682 21.4473 38.2009 21.1413 33.6665C21.0548 32.3841 21 31.127 21 30C21 28.873 21.0548 27.6159 21.1413 26.3335C21.4473 21.7991 21.6003 19.5318 23.2835 18.4488C24.9667 17.3658 26.8434 18.344 30.5968 20.3004C31.5705 20.8079 32.511 21.3249 33.3414 21.8248C34.288 22.3945 35.3181 23.0782 36.3566 23.8044Z'
          fill='black'
        />
      </g>
      <defs>
        <clipPath id='clip0_243_16'>
          <rect width='60' height='60' fill='white' />
        </clipPath>
      </defs>
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg
      width='60'
      height='60'
      viewBox='0 0 60 60'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <g clipPath='url(#clip0_243_17)'>
        <path
          d='M30 60C46.5685 60 60 46.5685 60 30C60 13.4315 46.5685 0 30 0C13.4315 0 0 13.4315 0 30C0 46.5685 13.4315 60 30 60Z'
          fill='white'
          fillOpacity='0.5'
        />
        <path
          d='M28.05 38.25H24.45C24.1318 38.25 23.8265 38.1709 23.6014 38.0303C23.3764 37.8897 23.25 37.6989 23.25 37.5V22.5C23.25 22.3011 23.3764 22.1103 23.6014 21.9697C23.8265 21.8291 24.1318 21.75 24.45 21.75H28.05C28.3682 21.75 28.6735 21.8291 28.8985 21.9697C29.1235 22.1103 29.25 22.3011 29.25 22.5V37.5C29.25 37.6989 29.1235 37.8897 28.8985 38.0303C28.6735 38.1709 28.3682 38.25 28.05 38.25Z'
          fill='black'
        />
        <path
          d='M35.55 38.25H31.95C31.6318 38.25 31.3265 38.1709 31.1015 38.0303C30.8765 37.8897 30.75 37.6989 30.75 37.5V22.5C30.75 22.3011 30.8765 22.1103 31.1015 21.9697C31.3265 21.8291 31.6318 21.75 31.95 21.75H35.55C35.8682 21.75 36.1735 21.8291 36.3985 21.9697C36.6235 22.1103 36.75 22.3011 36.75 22.5V37.5C36.75 37.6989 36.6235 37.8897 36.3985 38.0303C36.1735 38.1709 35.8682 38.25 35.55 38.25Z'
          fill='black'
        />
      </g>
      <defs>
        <clipPath id='clip0_243_17'>
          <rect width='60' height='60' fill='white' />
        </clipPath>
      </defs>
    </svg>
  );
}

export default function FlashCardSlide({
  card,
  isActive,
  index,
  cardsLength,
  userInput,
  onUserInputChange,
  swiper,
  onComplete,
}: FlashCardSlideProps) {
  const vCard = card as FlashcardsContent & VideoExtras;

  // ---------- VIDEO state/refs ----------
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [paused, setPaused] = useState(true);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused || v.ended) {
      v.play()
        .then(() => setPaused(false))
        .catch(() => { });
    } else {
      v.pause();
      setPaused(true);
    }
  };

  const stopAndReset = () => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
    setPaused(true);
  };

  // События видео для индикации паузы
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setPaused(false);
    const onPause = () => setPaused(true);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, []);

  // При уходе со слайда — останавливаем и сбрасываем видео
  useEffect(() => {
    if (card.type !== "video") return;
    if (!isActive) {
      stopAndReset();
    }
  }, [isActive, card.type]);

  // ---------- общая логика карточки ----------
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isLast = index === cardsLength - 1;
  const hasTyped = useMemo(
    () => card.type === "input" && userInput.trim().length > 0,
    [card.type, userInput]
  );
  const isActiveNow = isActive || swiper?.activeIndex === index;

  // флаг наличия фиксированной кнопки Submit (под неё поднимаем свайп-иконку)
  // const showSubmit =
  //   card.type === "input" && hasTyped && isActiveNow && mounted;

  return (
    <div className='relative flex flex-col h-full'>
      <BackButton
        onClick={() => {
          if (index > 0) swiper?.slidePrev();
        }}
        className={
          card.type === "video"
            ? "fixed left-4 top-[calc(env(safe-area-inset-top)+12px)] z-30"
            : "z-20 mt-[1.75rem] mb-6"
        }
      />

      <div className='relative flex flex-col flex-1 justify-start items-center'>
        {/* ===== VIDEO ===== */}
        {card.type === "video" && isActive && (
          <>
            <div className='z-0 fixed inset-0'>
              <video
                ref={videoRef}
                src={vCard.videoUrl}
                poster={vCard.posterUrl}
                playsInline
                loop
                className='bg-black w-screen h-[100dvh] object-cover'
              />
            </div>

            {/* Градиент */}
            <div className='z-10 fixed inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40 pointer-events-none' />

            {/* Верхний текст */}
            <div className='right-0 left-0 z-20 fixed top-[calc(env(safe-area-inset-top)+64px)] flex flex-col gap-3 px-4 pointer-events-none'>
              <Counter count={index} length={cardsLength} />
              {card.title && (
                <h1 className='font-medium text-2xl text-white leading-tight'>
                  {card.title}
                </h1>
              )}
            </div>

            {/* Центральная кнопка Play/Pause */}
            <div className='z-30 fixed inset-0 flex justify-center items-center pointer-events-none'>
              <button
                type='button'
                onClick={togglePlay}
                aria-label={paused ? "Play video" : "Pause video"}
                className='pointer-events-auto'
              >
                {paused ? <PlayIcon /> : <PauseIcon />}
              </button>
            </div>

            {/* Bookmark */}
            <BookmarkButton
              className='right-4 bottom-[2.375rem] z-30 fixed'
              active={bookmarked}
              onClick={() => setBookmarked((b) => !b)}
              aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
            />
          </>
        )}

        {/* ===== AUDIO ===== */}
        {card.type === "audio" && (
          <div className='absolute inset-0'>
            {/* верх: счётчик + текст */}
            <div className='right-0 left-0 z-10 absolute top-[calc(env(safe-area-inset-top)+64px)] flex flex-col gap-3 px-4 pointer-events-none'>
              <Counter count={index} length={cardsLength} />
              {card.title && (
                <h1 className='font-medium text-2xl text-white leading-tight'>
                  {card.title}
                </h1>
              )}
              {card.content && <p className='text-white/90'>{card.content}</p>}
            </div>
            <div className='top-1/2 left-1/2 z-10 absolute w-[100vw] -translate-x-1/2 -translate-y-1/2'>
              {isActive ? (
                <AudioWave
                  bgClass='bg-transparent !rounded-none'
                  minFill={0.4}
                  maxFill={0.7}
                  samples={130}
                  roundness={2.8}
                  height={120}
                />
              ) : (
                <svg
                  viewBox='0 0 390 80'
                  className='w-full'
                  style={{ height: 120 }}
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M433.191 37.5939C431.369 37.0603 429.192 36.7045 426.281 36.7045C414.593 36.7045 414.593 24.4652 402.904 24.4652C391.239 24.4652 391.239 36.7045 379.574 36.7045C367.908 36.7045 367.908 16.3042 356.254 16.3042C344.589 16.3042 344.589 32.6218 332.923 32.6218C321.235 32.6218 321.235 24.4608 309.547 24.4608C297.858 24.4608 297.858 36.7 286.181 36.7C274.505 36.7 274.505 0 262.839 0C251.151 0 251.151 24.4785 239.474 24.4785C227.774 24.4785 227.774 8.16101 216.086 8.16101C204.409 8.16101 204.409 48.8993 192.721 48.8993C181.021 48.8993 181.021 24.4608 169.333 24.4608C157.644 24.4608 157.644 36.7 145.956 36.7C134.256 36.7 134.256 16.2998 122.556 16.2998C110.891 16.2998 110.891 32.6173 99.2255 32.6173C87.5601 32.6173 87.56 24.4385 75.8946 24.4385C64.1834 24.4385 64.1834 48.8993 52.4836 48.8993C40.7953 48.8993 40.7952 24.4608 29.1069 24.4608C17.4071 24.4608 17.4071 36.7 5.70734 36.7C-6.00391 36.7 -6.00389 16.2998 -17.7266 16.2998C-29.4264 16.2998 -29.4264 36.7 -41.1262 36.7C-44.0483 36.7 -46.2369 37.0558 -48.0704 37.5895C-50.2935 38.2388 -52.0009 39.1416 -53.8 40C-52.0009 40.8583 -50.2935 41.7612 -48.0704 42.4105C-46.1617 42.5566 -43.9512 42.7674 -41.1262 42.7674C-29.4264 42.7674 -29.4264 54.8419 -17.7266 54.8419C-5.53988 54.8419 -5.53991 42.7674 6.29945 42.7674C18.1157 42.7674 18.1157 50.0131 29.9319 50.0131C41.7365 50.0131 41.7365 35.5463 53.5411 35.5463C65.3689 35.5463 65.3689 50.0229 77.1851 50.0229C88.9666 50.0229 88.9666 45.1843 100.748 45.1843C112.53 45.1843 112.53 54.8419 124.311 54.8419C136.127 54.8419 136.127 42.7674 147.943 42.7674C159.748 42.7674 159.748 50.0131 171.553 50.0131Z'
                    fill='white'
                  />
                </svg>
              )}
            </div>
          </div>
        )}

        {/* ===== TIMER ===== */}
        {card.type === "timer" && (
          <div className='w-full h-full'>
            <div className='flex flex-col space-y-4 mb-12'>
              <Counter count={index} length={cardsLength} />
              {card.title && (
                <h1 className='font-medium text-2xl text-white leading-tight'>
                  {card.title}
                </h1>
              )}
              {card.content && <p className='text-white'>{card.content}</p>}
            </div>
            <div className='flex justify-center'>
              <Timer timer={60} className='mx-auto' />
            </div>
          </div>
        )}

        {/* ===== TEXT ===== */}
        {card.type === "text" && (
          <div className='w-full h-full'>
            <div className='flex flex-col space-y-4 mt-24 w-full'>
              <Counter count={index} length={cardsLength} />
              {card.title && (
                <h1 className='font-medium text-2xl text-white leading-tight'>
                  {card.title}
                </h1>
              )}
              {card.content && <p className='text-white'>{card.content}</p>}
              {card.audioUrl && (
                <div className='flex justify-center -mx-4'>
                  <AudioIcon />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== INPUT ===== */}
        {card.type === "input" && (
          <div className='pb-[calc(env(safe-area-inset-bottom)+90px)] flex flex-col space-y-4 w-full h-full'>
            <Counter count={index} length={cardsLength} />
            {card.title && (
              <h1 className='font-medium text-2xl text-white leading-tight'>
                {card.title}
              </h1>
            )}
            {card.content && <p className='text-white'>{card.content}</p>}
            <TextArea
              value={userInput}
              onChange={(e) => onUserInputChange(e.target.value)}
            />
          </div>
        )}

        {/* ===== GAME ===== */}
        {card.type === "game" && (
          <ResetSlotGame card={card} index={index} cardsLength={cardsLength} />
        )}
      </div>

      {/* ===== Сабмит (портал) ===== */}
      {card.type === "input" && hasTyped && isActiveNow && mounted
        ? createPortal(
          <div className='bottom-[calc(env(safe-area-inset-bottom,0px)+18px)] z-[1000] fixed inset-x-0'>
            <div className='mx-auto px-4 w-full max-w-md'>
              <Button
                type='button'
                onClick={() => {
                  if (isLast) {
                    onComplete?.();
                  } else {
                    swiper?.slideTo(index + 1, 300);
                  }
                }}
                variant='button'
                aria-label='Submit'
                className='w-full'
              >
                Submit
              </Button>
            </div>
          </div>,
          document.body
        )
        : null}
    </div>
  );
}
