// components/Timer.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { twMerge } from "tailwind-merge";
import StartButton from "./ui/StartButton";

interface TimerProps {
  /** Общее время таймера в секундах */
  timer: number;
  /** Колбэк по завершении */
  onComplete?: () => void;
  /** Класс контейнера */
  className?: string;
  /** Полный цикл «вдох+выдох», сек. 0–T/2 — вдох, T/2–T — выдох */
  breathCycleSec?: number; // по умолчанию 30
  /** Границы «дыхания» в долях от радиуса дорожки */
  breathMinRatio?: number; // 0.35 по умолчанию
  breathMaxRatio?: number; // 0.55 по умолчанию
}

const Timer: React.FC<TimerProps> = ({
  timer,
  onComplete,
  className,
  breathCycleSec = 30,
  breathMinRatio = 0.6,
  breathMaxRatio = 0.9,
}) => {
  // -------- геометрия прогресс-кольца --------
  const size = 274;
  const strokeWidth = 10;
  const innerSize = 260;
  const radius = (innerSize - strokeWidth) / 2;
  const circumference = useMemo(() => radius * 2 * Math.PI, [radius]);

  // -------- refs --------
  const progressCircleRef = useRef<SVGCircleElement | null>(null);
  const progressDotRef = useRef<SVGCircleElement | null>(null);
  const breathCircleRef = useRef<SVGCircleElement | null>(null);
  const timerContainerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const breathTweenRef = useRef<gsap.core.Tween | null>(null);

  // -------- состояние --------
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [displaySeconds, setDisplaySeconds] = useState(0);

  // тайм-метки/служебные
  const startedAtRef = useRef<number | null>(null);
  const rafActiveRef = useRef(false);
  const lastWholeSecRef = useRef(0);

  // формат mm:ss
  const mmss = useMemo(() => {
    const m = Math.floor(displaySeconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (displaySeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [displaySeconds]);

  // кадр прогресса (плавно по rAF)
  const setProgressFrame = (elapsedMs: number) => {
    const totalMs = timer * 1000;
    const p = Math.min(1, Math.max(0, elapsedMs / totalMs)); // 0..1
    const angleDeg = -90 + p * 360;
    const angleRad = (angleDeg * Math.PI) / 180;

    if (progressCircleRef.current) {
      const dashOffset = circumference * (1 - p);
      gsap.set(progressCircleRef.current, { strokeDashoffset: dashOffset });
    }
    if (progressDotRef.current) {
      const cx = size / 2 + radius * Math.cos(angleRad);
      const cy = size / 2 + radius * Math.sin(angleRad);
      gsap.set(progressDotRef.current, { cx, cy });
    }
  };

  // дыхание центрального круга: r между minR ↔ maxR
  const ensureBreathTween = () => {
    const el = breathCircleRef.current;
    if (!el) return;

    const minR = radius * breathMinRatio;
    const maxR = radius * breathMaxRatio;

    breathTweenRef.current?.kill();
    // поставить стартовый радиус
    gsap.set(el, { attr: { r: minR } });

    breathTweenRef.current = gsap.to(el, {
      attr: { r: maxR },
      duration: Math.max(0.1, breathCycleSec / 2),
      ease: "power1.inOut",
      yoyo: true,
      repeat: -1,
    });
  };

  const killBreathTween = () => {
    const el = breathCircleRef.current;
    breathTweenRef.current?.kill();
    breathTweenRef.current = null;
    if (el) {
      // вернуть к «спокойному» состоянию
      const calmR = radius * ((breathMinRatio + breathMaxRatio) / 2);
      gsap.to(el, {
        attr: { r: calmR },
        duration: 0.35,
        ease: "power2.out",
      });
    }
  };

  // основной тикер
  useEffect(() => {
    if (!isRunning) return;

    // входная анимация контейнера
    if (timerContainerRef.current) {
      gsap.fromTo(
        timerContainerRef.current,
        { scale: 0.94, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.6, ease: "power3.out" }
      );
    }

    // подготовка прогресс-окружности
    if (progressCircleRef.current && progressDotRef.current) {
      gsap.set(progressCircleRef.current, {
        strokeDasharray: circumference,
        strokeDashoffset: circumference,
      });
      gsap.fromTo(
        progressDotRef.current,
        { scale: 0.85 },
        { scale: 1, duration: 0.6, ease: "power3.out" }
      );
    }

    // старт дыхания
    ensureBreathTween();

    startedAtRef.current = performance.now();
    rafActiveRef.current = true;
    lastWholeSecRef.current = 0;
    setDisplaySeconds(0);

    const tick = () => {
      if (!rafActiveRef.current || startedAtRef.current == null) return;
      const now = performance.now();
      const elapsed = Math.min(now - startedAtRef.current, timer * 1000);

      setProgressFrame(elapsed);

      const whole = Math.floor(elapsed / 1000);
      if (whole !== lastWholeSecRef.current) {
        lastWholeSecRef.current = whole;
        setDisplaySeconds(whole);
      }

      if (elapsed >= timer * 1000) {
        rafActiveRef.current = false;
        setIsRunning(false);
        setIsComplete(true);
        killBreathTween();
        onComplete?.();
        return;
      }
      requestAnimationFrame(tick);
    };

    const id = requestAnimationFrame(tick);
    return () => {
      rafActiveRef.current = false;
      cancelAnimationFrame(id);
      killBreathTween();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isRunning,
    timer,
    breathCycleSec,
    breathMinRatio,
    breathMaxRatio,
    circumference,
  ]);

  const handleStart = () => {
    if (isRunning || isComplete) return;
    if (buttonRef.current) {
      gsap.to(buttonRef.current, {
        scale: 0.96,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        ease: "power2.out",
      });
    }
    setIsRunning(true);
  };

  const state: "initial" | "running" | "complete" =
    !isRunning && displaySeconds === 0
      ? "initial"
      : isComplete
      ? "complete"
      : "running";

  return (
    <div
      className={twMerge("relative inline-block", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className='block'>
        {/* фон дорожки */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill='none'
          stroke='rgba(255,255,255,0.28)'
          strokeWidth={strokeWidth}
        />

        {/* Градиенты */}
        <defs>
          {/* прогресс (фиолетовый как раньше) */}
          <linearGradient
            id='progressGradient'
            x1='0%'
            y1='0%'
            x2='0%'
            y2='100%'
          >
            <stop offset='0%' stopColor='#7766DA' />
            <stop offset='100%' stopColor='#5241B7' />
          </linearGradient>

          {/* НОВЫЙ: градиент дыхающего круга (твой) */}
          <linearGradient id='timerGradient' x1='0%' y1='0%' x2='100%' y2='0%'>
            <stop offset='0%' stopColor='#60A5FA' /> {/* голубой */}
            <stop offset='100%' stopColor='#1E40AF' /> {/* темно-синий */}
          </linearGradient>
        </defs>

        {/* дыхание — внутренний круг с нужным градиентом */}
        {state !== "initial" && (
          <circle
            ref={breathCircleRef}
            cx={size / 2}
            cy={size / 2}
            r={radius * breathMinRatio}
            fill='url(#timerGradient)'
            opacity={0.95}
          />
        )}

        {/* активный прогресс по окружности */}
        {state !== "initial" && (
          <circle
            ref={progressCircleRef}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill='none'
            stroke='url(#progressGradient)'
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            strokeLinecap='round'
          />
        )}

        {/* метки-сектора (крест) */}
        <g fill='#FFFFFF'>
          <rect x={size / 2 - 2} y={0} width='4' height='24' rx='2' />
          <rect x={size - 24} y={size / 2 - 2} width='24' height='4' rx='2' />
          <rect x={size / 2 - 2} y={size - 24} width='4' height='24' rx='2' />
          <rect x={0} y={size / 2 - 2} width='24' height='4' rx='2' />
        </g>

        {/* бегущая точка */}
        {state !== "initial" && (
          <circle
            ref={progressDotRef}
            cx={size / 2}
            cy={size / 2 - radius}
            r='12'
            fill='#FFFFFF'
          />
        )}
      </svg>

      {/* центр: текст поверх, НЕ масштабируется */}
      <div
        ref={timerContainerRef}
        className='absolute inset-0 flex items-center justify-center'
      >
        {state === "initial" ? (
          <StartButton ref={buttonRef} onClick={handleStart} />
        ) : (
          <button
            ref={buttonRef}
            type='button'
            onClick={() => void 0}
            className='bg-transparent rounded-full w-[180px] h-[180px] grid place-items-center select-none'
          >
            <span className="text-white text-center font-['DM_Sans',sans-serif] text-[40px] leading-[52px] tracking-[2.23602px] font-bold tabular-nums">
              {mmss}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

export default Timer;
