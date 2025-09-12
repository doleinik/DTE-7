"use client";

import { useTranscript } from "@/hooks/useTranscript";
import { useEffect, useMemo, useRef, useState } from "react";

interface AudioWaveProps {
  src?: string;
  height?: number;
  color?: string;
  outerColor?: string | null;
  outerScale?: number;
  bgClass?: string;
  samples?: number;
  roundness?: number;
  minFill?: number;
  maxFill?: number;
  fftSize?: 1024 | 2048 | 4096;
}

export default function AudioWave({
  src = "/audio.m4a",
  height = 120,
  color = "#FFFFFF",
  outerColor = "rgba(255,255,255,0.30)",
  outerScale = 1.18,
  bgClass = "bg-transparent",
  samples = 140,
  roundness = 2.3,
  minFill = 0.3,
  maxFill = 0.56,
  fftSize = 2048,
}: AudioWaveProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  // WebAudio
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // транскрипт
  const { status, words, error } = useTranscript(src);

  // ---- Karaoke state ----
  const [activeIdx, setActiveIdx] = useState<number>(-1); // текущее слово, -1 в паузах
  const [displayWinIdx, setDisplayWinIdx] = useState(0); // окно, которое реально показано
  const [fadePair, setFadePair] = useState<{
    from: number;
    to: number;
    started: boolean;
  } | null>(null);

  // refs для стабильных расчётов в rAF
  const wordsRef = useRef(words);
  const windowsRef = useRef<
    {
      startIdx: number;
      endIdx: number;
      startMs: number;
      lastStart: number;
      endMs: number;
    }[]
  >([]);
  const displayWinIdxRef = useRef(0);
  const currentMsRef = useRef(0);
  const transitionLockRef = useRef(false);
  const hasStartedRef = useRef(false);

  const timeBufRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const shapeNowRef = useRef<Float32Array | null>(null);
  const shapeSmoothRef = useRef<Float32Array | null>(null);
  const frozenRef = useRef<{
    shape: Float32Array;
    inner: number;
    outer?: number;
  } | null>(null);
  const rafRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const energyRef = useRef(0);

  // --- utils ---
  const clamp = (v: number, a: number, b: number) =>
    Math.max(a, Math.min(b, v));
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  // ===== ПАРАМЕТРЫ =====
  const PHRASE_GAP_MS = 600;
  const MAX_WINDOW_MS = 3000;
  const MAX_WINDOW_WORDS = 12;
  const FADE_MS = 160; // длительность кросс-фейда

  // ===== Helpers =====
  const resizeCanvas = () => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const rect = c.getBoundingClientRect();
    c.width = Math.floor(rect.width * dpr);
    c.height = Math.floor(height * dpr);
    c.style.width = "100%";
    c.style.height = `${height}px`;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxRef.current = ctx;
    redrawFrozen();
  };

  const drawBand = (
    ctx: CanvasRenderingContext2D,
    shape: Float32Array,
    w: number,
    h: number,
    halfThickness: number,
    fill: string
  ) => {
    const n = shape.length;
    const stepX = w / (n - 1);
    const mid = h / 2;

    // верх
    let xPrev = 0;
    let yPrev = mid - shape[0] * halfThickness;
    ctx.beginPath();
    ctx.moveTo(0, yPrev);
    for (let i = 1; i < n; i++) {
      const x = i * stepX;
      const y = mid - shape[i] * halfThickness;
      const xc = (xPrev + x) / 2;
      const yc = (yPrev + y) / 2;
      ctx.quadraticCurveTo(xPrev, yPrev, xc, yc);
      xPrev = x;
      yPrev = y;
    }

    // низ
    xPrev = (n - 1) * stepX;
    yPrev = mid + shape[n - 1] * halfThickness;
    ctx.lineTo(xPrev, yPrev);
    for (let i = n - 2; i >= 0; i--) {
      const x = i * stepX;
      const y = mid + shape[i] * halfThickness;
      const xc = (xPrev + x) / 2;
      const yc = (yPrev + y) / 2;
      ctx.quadraticCurveTo(xPrev, yPrev, xc, yc);
      xPrev = x;
      yPrev = y;
    }

    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };

  const drawFrame = (shape: Float32Array, inner: number, outer?: number) => {
    const c = canvasRef.current,
      ctx = ctxRef.current;
    if (!c || !ctx) return;
    const w = c.clientWidth || c.width;
    const h = height;
    ctx.clearRect(0, 0, w, h);

    if (outer && outerColor) drawBand(ctx, shape, w, h, outer, outerColor);
    drawBand(ctx, shape, w, h, inner, color);
  };

  const redrawFrozen = () => {
    const f = frozenRef.current;
    if (!f) return;
    drawFrame(f.shape, f.inner, f.outer);
  };

  // ======= ВОЛНА =======
  const computeShape = () => {
    const analyser = analyserRef.current;
    const time = timeBufRef.current;
    const now = shapeNowRef.current;
    const smooth = shapeSmoothRef.current;
    if (!analyser || !time || !now || !smooth) return;

    analyser.getFloatTimeDomainData(time);

    // RMS
    let sumSqAll = 0;
    for (let i = 0; i < time.length; i++) sumSqAll += time[i] * time[i];
    const rms = Math.sqrt(sumSqAll / time.length);
    energyRef.current = energyRef.current * 0.85 + rms * 0.15;

    // форма по бакетам
    const n = now.length;
    const bucket = Math.max(1, Math.floor(time.length / n));
    let ptr = 0;
    for (let i = 0; i < n; i++) {
      let sumSq = 0,
        cnt = 0;
      const end = Math.min(ptr + bucket, time.length);
      for (let j = ptr; j < end; j++) {
        const v = time[j];
        sumSq += v * v;
        cnt++;
      }
      ptr += bucket;
      let r = Math.sqrt(sumSq / Math.max(1, cnt));
      r = Math.pow(r, roundness);
      now[i] = r;
    }

    // сглаживание
    for (let pass = 0; pass < 8; pass++) {
      for (let i = 1; i < n - 1; i++) {
        now[i] = (now[i - 1] + 2 * now[i] + now[i + 1]) / 4;
      }
    }

    // нормализация
    let mx = 0;
    for (let i = 0; i < n; i++) if (now[i] > mx) mx = now[i];
    const kn = mx > 0.0001 ? 1 / mx : 1;
    for (let i = 0; i < n; i++) now[i] *= kn;

    // инерция
    for (let i = 0; i < n; i++) smooth[i] = smooth[i] * 0.7 + now[i] * 0.3;
  };

  // ======= ОКНА =======
  type Win = {
    startIdx: number;
    endIdx: number;
    startMs: number;
    lastStart: number;
    endMs: number;
  };

  const windows: Win[] = useMemo(() => {
    if (!words?.length) return [];
    const res: Win[] = [];
    let s = 0;
    while (s < words.length) {
      let e = s;
      const startMs = words[s].start;
      while (e + 1 < words.length) {
        const cur = words[e];
        const next = words[e + 1];
        const gap = next.start - cur.end;
        const span = next.end - startMs;
        const punct = /[.!?]/.test((cur.text || "").slice(-1));
        if (gap > PHRASE_GAP_MS) break;
        if (punct) break;
        if (span > MAX_WINDOW_MS) break;
        if (e - s + 1 >= MAX_WINDOW_WORDS) break;
        e++;
      }
      res.push({
        startIdx: s,
        endIdx: e,
        startMs,
        lastStart: words[e].start,
        endMs: words[e].end,
      });
      s = e + 1;
    }
    return res;
  }, [words]);

  // актуализируем рефы
  useEffect(() => {
    wordsRef.current = words;
  }, [words]);
  useEffect(() => {
    windowsRef.current = windows;
  }, [windows]);
  useEffect(() => {
    displayWinIdxRef.current = displayWinIdx;
  }, [displayWinIdx]);

  // бинпоиск по ms -> индекс «логического» окна (по старту)
  const findIdxByMs = (ms: number) => {
    const arr = windowsRef.current;
    if (!arr.length) return 0;
    if (ms <= arr[0].startMs) return 0;
    let lo = 0,
      hi = arr.length - 1,
      ans = hi;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid].startMs <= ms) {
        ans = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    return ans; // между окнами вернёт предыдущий — то, что и нужно
  };

  // ======= rAF main loop (волна + стабильная караоке-логика) =======
  const loop = () => {
    // волна
    computeShape();

    // рендер волны
    const shape = shapeSmoothRef.current;
    if (shape) {
      const h = height;
      const e = clamp((energyRef.current - 0.005) / 0.06, 0, 1);
      const halfInner = (h * lerp(minFill, maxFill, e)) / 2;
      const halfOuter = outerColor ? halfInner * outerScale : undefined;
      drawFrame(shape, halfInner, halfOuter);
      frozenRef.current = {
        shape: Float32Array.from(shape),
        inner: halfInner,
        outer: halfOuter,
      };
    }

    // ---- Караоке-часть ----
    const audio = audioRef.current;
    if (audio && (wordsRef.current?.length ?? 0) > 0) {
      const nowMs = (audio.currentTime * 1000) | 0;
      if (nowMs !== currentMsRef.current) {
        currentMsRef.current = nowMs;

        // активное слово (−1 в паузах)
        const wordsArr = wordsRef.current!;
        let newActive = -1;
        for (let i = 0; i < wordsArr.length; i++) {
          const w = wordsArr[i];
          if (nowMs >= w.start && nowMs < w.end) {
            newActive = i;
            break;
          }
        }
        setActiveIdx((prev) => (prev === newActive ? prev : newActive));

        // окно, показанное на экране
        const curIdx = displayWinIdxRef.current;
        const curWin = windowsRef.current[curIdx];
        const nextWin = windowsRef.current[curIdx + 1];

        // держим текущее окно, пока НЕ начнётся следующее.
        if (
          nextWin &&
          !transitionLockRef.current &&
          nowMs >= nextWin.startMs &&
          !fadePair
        ) {
          transitionLockRef.current = true;
          setFadePair({ from: curIdx, to: curIdx + 1, started: false });

          // в след. тике включим анимацию opacity
          setTimeout(
            () => setFadePair((p) => (p ? { ...p, started: true } : p)),
            0
          );

          // по завершении — зафиксируем новое окно и отпустим замок
          setTimeout(() => {
            displayWinIdxRef.current = curIdx + 1;
            setDisplayWinIdx(curIdx + 1);
            setFadePair(null);
            transitionLockRef.current = false;
          }, FADE_MS);
        }

        // страховка: если случайно оказались на «будущем» окне — вернёмся к логическому
        if (
          curWin &&
          nowMs < curWin.startMs &&
          !transitionLockRef.current &&
          !fadePair
        ) {
          const logical = findIdxByMs(nowMs);
          if (logical !== curIdx) {
            displayWinIdxRef.current = logical;
            setDisplayWinIdx(logical);
          }
        }
      }
    }

    rafRef.current = requestAnimationFrame(loop);
  };

  const start = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  };
  const stop = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const ensureAnalyser = async () => {
    if (analyserRef.current) return;
    const audio = audioRef.current;
    if (!audio) return;

    const AC =
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext || AudioContext;
    const ac = new AC();
    audioCtxRef.current = ac;

    const srcNode = ac.createMediaElementSource(audio);
    const an = ac.createAnalyser();
    an.fftSize = fftSize;
    an.smoothingTimeConstant = 0.7;

    srcNode.connect(an);
    an.connect(ac.destination);

    analyserRef.current = an;

    // строго типизированный буфер
    const ab = new ArrayBuffer(an.fftSize * Float32Array.BYTES_PER_ELEMENT);
    timeBufRef.current = new Float32Array(ab) as Float32Array<ArrayBuffer>;

    shapeNowRef.current = new Float32Array(samples);
    shapeSmoothRef.current = new Float32Array(samples);
  };

  const drawOneNowIfNeeded = () => {
    if (frozenRef.current) return;
    computeShape();
    const shape = shapeSmoothRef.current;
    if (!shape) return;
    const h = height;
    const e = clamp((energyRef.current - 0.005) / 0.06, 0, 1);
    const halfInner = (h * lerp(minFill, maxFill, e)) / 2;
    const halfOuter = outerColor ? halfInner * outerScale : undefined;
    drawFrame(shape, halfInner, halfOuter);
    frozenRef.current = {
      shape: Float32Array.from(shape),
      inner: halfInner,
      outer: halfOuter,
    };
  };

  const onToggle = async () => {
    await ensureAnalyser();
    const audio = audioRef.current!;
    if (audioCtxRef.current?.state === "suspended")
      await audioCtxRef.current.resume();

    if (audio.paused) {
      await audio.play();
      hasStartedRef.current = true;
      setIsPlaying(true);
      start();
    } else {
      audio.pause();
      setIsPlaying(false);
      stop();
      drawOneNowIfNeeded();
      redrawFrozen();
    }
  };

  // ===== effects =====
  useEffect(() => {
    resizeCanvas();
    const onResize = () => resizeCanvas();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height]);

  useEffect(() => {
    shapeNowRef.current = new Float32Array(samples);
    shapeSmoothRef.current = new Float32Array(samples);
    if (!isPlaying) redrawFrozen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [samples]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => {
      setIsPlaying(false);
      stop();
      drawOneNowIfNeeded();
      redrawFrozen();
    };
    const onSeeked = () => {
      // на перемотке мгновенно вычисляем «логическое» окно по nowMs
      const ms = (audio.currentTime * 1000) | 0;
      currentMsRef.current = ms;
      const logicalIdx = findIdxByMs(ms);
      displayWinIdxRef.current = logicalIdx;
      setDisplayWinIdx(logicalIdx);
      setFadePair(null);
      transitionLockRef.current = false;
    };
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("seeked", onSeeked);
    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("seeked", onSeeked);
      stop();
      audioCtxRef.current?.close().catch(() => void 0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // компонент окна
  const WindowText = ({
    idx,
    extraClass = "",
  }: {
    idx: number;
    extraClass?: string;
  }) => {
    const w = windows[idx];
    const slice = !w ? [] : words!.slice(w.startIdx, w.endIdx + 1);
    return (
      <div
        className={
          `
          absolute inset-0
          mx-auto max-w-[min(92vw,320px)]
          text-center uppercase font-extrabold
          leading-[1.08] tracking-wide
          text-[clamp(18px,6vw,28px)]
          whitespace-normal break-words hyphens-auto
          text-white
          ` +
          " " +
          extraClass
        }
        style={{
          textShadow: "0 2px 6px rgba(0,0,0,0.45), 0 0 1px rgba(0,0,0,0.6)",
        }}
      >
        {slice.map((word, i) => {
          const globalIdx = (w?.startIdx ?? 0) + i;
          const isOn = globalIdx === activeIdx; // -1 в паузе -> ни одно слово не подсвечено
          return (
            <span
              key={`${word.start}-${i}`}
              className={`inline-block my-1 mr-[0.35ch] ${
                isOn ? "relative px-1.5 py-0.5 rounded-md" : ""
              }`}
              style={
                isOn
                  ? {
                      background: "rgba(146, 74, 171, 0.9)",
                      boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
                    }
                  : undefined
              }
            >
              {word.text}
            </span>
          );
        })}
      </div>
    );
  };

  // ===== render =====
  return (
    <>
      <div className={`relative w-full ${bgClass} overflow-visible`}>
        {/* ВОЛНА */}
        <div className='relative left-1/2 -translate-x-1/2 w-screen'>
          <canvas
            ref={canvasRef}
            className={`block w-full mt-26 ${
              !hasStartedRef.current ? "opacity-0" : "opacity-100"
            }`}
            style={{ height }}
          />
        </div>

        {/* SVG заглушка до первого старта (вернул) */}
        {!hasStartedRef.current && (
          <div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
            <svg
              width='616'
              height='127'
              viewBox='0 0 616 127'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                d='M736.196 59.3984C733.318 58.5553 729.88 57.9931 725.282 57.9931C706.821 57.9931 706.821 38.655 688.358 38.655C669.933 38.655 669.933 57.9931 651.509 57.9931C633.082 57.9931 633.082 25.7606 614.675 25.7606C596.25 25.7606 596.25 51.5424 577.824 51.5424C559.363 51.5424 559.363 38.6481 540.902 38.6481C522.439 38.6481 522.439 57.986 503.996 57.986C485.553 57.986 485.553 0 467.127 0C448.666 0 448.666 38.676 430.222 38.676C411.742 38.676 411.742 12.8944 393.281 12.8944C374.838 12.8944 374.838 77.2609 356.377 77.2609C337.897 77.2609 337.897 38.6481 319.436 38.6481C300.973 38.6481 300.973 57.986 282.512 57.986C264.032 57.986 264.032 25.7537 245.552 25.7537C227.127 25.7537 227.127 51.5353 208.702 51.5353C190.276 51.5353 190.276 38.6128 171.851 38.6128C153.353 38.6128 153.353 77.2609 134.874 77.2609C116.412 77.2609 116.412 38.6481 97.9504 38.6481C79.4707 38.6481 79.4707 57.986 60.9911 57.986C42.4933 57.986 42.4933 25.7537 23.9775 25.7537C5.49778 25.7537 5.49778 57.986 -12.9819 57.986C-17.5973 57.986 -21.0542 58.5482 -23.9502 59.3914C-27.4615 60.4173 -30.1583 61.8437 -33 63.2C-30.1583 64.5561 -27.4615 65.9827 -23.9502 67.0086C-21.0542 67.8518 -17.5973 68.414 -12.9819 68.414C5.49778 68.414 5.49778 100.646 23.9775 100.646C42.4752 100.646 42.4752 68.414 60.9911 68.414C79.4707 68.414 79.4707 87.7521 97.9504 87.7521C116.412 87.7521 116.412 49.1391 134.874 49.1391C153.371 49.1391 153.371 87.7872 171.851 87.7872C190.276 87.7872 190.276 74.8647 208.702 74.8647C227.127 74.8647 227.127 100.646 245.552 100.646C264.032 100.646 264.032 68.414 282.512 68.414C300.973 68.414 300.973 87.7521 319.436 87.7521C337.914 87.7521 337.914 49.1391 356.377 49.1391C374.82 49.1391 374.82 113.506 393.281 113.506C411.761 113.506 411.761 87.724 430.222 87.724C448.666 87.724 448.666 126.4 467.127 126.4C485.571 126.4 485.571 68.414 503.996 68.414C522.458 68.414 522.458 87.7521 540.902 87.7521C559.363 87.7521 559.363 74.8577 577.824 74.8577C596.25 74.8577 596.25 100.639 614.675 100.639C633.101 100.639 633.101 68.4069 651.509 68.4069C669.933 68.4069 669.933 87.745 688.358 87.745C706.821 87.745 706.821 68.4069 725.282 68.4069C729.88 68.4069 733.318 67.8447 736.196 67.0015C739.707 65.9756 742.386 64.5492 745.21 63.1929C742.386 61.8508 739.707 60.4244 736.196 59.3984Z'
                fill='white'
                fillOpacity='0.3'
              />
              <path
                d='M743.85 62.2358C740.942 61.74 737.471 61.4071 732.827 61.4071C714.181 61.4071 714.181 49.9589 695.537 49.9589C676.927 49.9589 676.927 61.4071 658.319 61.4071C639.71 61.4071 639.71 42.3292 621.119 42.3292C602.511 42.3292 602.511 57.5884 583.902 57.5884C565.258 57.5884 565.258 49.9589 546.612 49.9589C527.966 49.9589 527.966 61.4071 509.339 61.4071C490.712 61.4071 490.712 27.0857 472.104 27.0857C453.458 27.0857 453.458 49.9744 434.831 49.9744C416.168 49.9744 416.168 34.7152 397.522 34.7152C378.895 34.7152 378.895 72.8164 360.251 72.8164C341.586 72.8164 341.586 49.9589 322.942 49.9589C304.296 49.9589 304.296 61.4071 285.65 61.4071C266.987 61.4071 266.987 42.3292 248.324 42.3292C229.716 42.3292 229.716 57.5884 211.107 57.5884C192.498 57.5884 192.498 49.9434 173.889 49.9434C155.207 49.9434 155.207 72.8164 136.544 72.8164C117.899 72.8164 117.899 49.9589 99.2535 49.9589C80.5899 49.9589 80.5899 61.4071 61.9263 61.4071C43.2445 61.4071 43.2445 42.3292 24.5443 42.3292C5.88081 42.3292 5.88081 61.4071 -12.7827 61.4071C-17.4439 61.4071 -20.9354 61.74 -23.8601 62.2358C-27.4064 62.84 -30.1301 63.6919 -33 64.4898C-30.1301 65.2953 -27.4064 66.1397 -23.8601 66.7439C-20.9354 67.2395 -17.4439 67.5726 -12.7827 67.5726C5.88081 67.5726 5.88081 86.6503 24.5443 86.6503C43.2262 86.6503 43.2262 67.5726 61.9263 67.5726C80.5899 67.5726 80.5899 79.0208 99.2535 79.0208C117.899 79.0208 117.899 56.1632 136.544 56.1632C155.226 56.1632 155.226 79.0362 173.889 79.0362C192.498 79.0362 192.498 71.3913 211.107 71.3913C229.716 71.3913 229.716 86.6503 248.324 86.6503C266.987 86.6503 266.987 67.5726 285.65 67.5726C304.296 67.5726 304.296 79.0208 322.942 79.0208C341.605 79.0208 341.605 56.1632 360.251 56.1632C378.878 56.1632 378.878 94.2643 397.522 94.2643C416.186 94.2643 416.186 79.0053 434.831 79.0053C453.458 79.0053 453.458 101.894 472.104 101.894C490.731 101.894 490.731 67.5726 509.339 67.5726C527.985 67.5726 527.985 79.0208 546.612 79.0208C565.258 79.0208 565.258 71.3913 583.902 71.3913C602.511 71.3913 602.511 86.6503 621.119 86.6503C639.729 86.6503 639.729 67.5726 658.319 67.5726C676.927 67.5726 676.927 79.0208 695.537 79.0208C714.181 79.0208 714.181 67.5726 732.827 67.5726C737.471 67.5726 740.942 67.2395 743.85 66.7439C747.396 66.1397 750.102 65.2876 752.953 64.4898C750.102 63.6842 747.396 62.84 743.85 62.2358Z'
                fill='white'
              />
            </svg>
          </div>
        )}

        {/* Play/Pause */}
        <button
          type='button'
          onClick={onToggle}
          className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-white shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition z-20'
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          <div className='relative w-8 h-8'>
            {/* Play */}
            <span
              className={`absolute inset-0 m-auto flex items-center justify-center pl-1 ${
                isPlaying ? "opacity-0 scale-75" : "opacity-100 scale-100"
              } transition`}
            >
              <svg
                width='22'
                height='24'
                viewBox='0 0 22 24'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  d='M15.571 5.80451C19.3332 8.43514 21.2144 9.75046 21.2144 12.0001C21.2144 14.2497 19.3332 15.5651 15.571 18.1957C14.5324 18.9219 13.5023 19.6056 12.5557 20.1753C11.7253 20.6752 10.7848 21.1922 9.81113 21.6997C6.05771 23.6561 4.18101 24.6343 2.49781 23.5513C0.814609 22.4683 0.661636 20.201 0.35569 15.6666C0.269168 14.3842 0.214355 13.1271 0.214355 12.0001C0.214355 10.8731 0.269168 9.616 0.35569 8.33364C0.661637 3.79916 0.81461 1.53192 2.49781 0.448893C4.18101 -0.634136 6.05771 0.344066 9.81112 2.30047C10.7848 2.808 11.7253 3.32502 12.5557 3.82485C13.5023 4.39459 14.5324 5.07831 15.571 5.80451Z'
                  fill='black'
                />
              </svg>
            </span>
            {/* Pause */}
            <span
              className={`absolute inset-0 flex items-center justify-center gap-1 ${
                isPlaying ? "opacity-100 scale-100" : "opacity-0 scale-75"
              } transition`}
            >
              <i className='block w-[6px] h-6 bg-black rounded-sm' />
              <i className='block w-[6px] h-6 bg-black rounded-sm' />
            </span>
          </div>
        </button>

        {/* audio */}
        <audio
          ref={audioRef}
          src={src}
          preload='auto'
          crossOrigin='anonymous'
          className='hidden'
        />
      </div>

      {/* ===== СУБТИТРЫ НИЖЕ ВОЛНЫ ===== */}
      <div className='mt-4 w-full px-4 flex justify-center'>
        {status !== "completed" ? (
          <div className='text-white/10 text-sm'>
            {status === "error"
              ? error || "Transcription error"
              : "Preparing the transcript..."}
          </div>
        ) : hasStartedRef.current && windows.length > 0 ? (
          <div
            className='relative w-full'
            style={{ minHeight: "3.2em", maxWidth: "min(92vw,700px)" }}
            aria-live='off'
          >
            {!fadePair && <WindowText idx={displayWinIdx} />}
            {fadePair && (
              <>
                <WindowText
                  idx={fadePair.from}
                  extraClass={`transition-opacity duration-[${FADE_MS}ms] ${
                    fadePair.started ? "opacity-0" : "opacity-100"
                  }`}
                />
                <WindowText
                  idx={fadePair.to}
                  extraClass={`transition-opacity duration-[${FADE_MS}ms] ${
                    fadePair.started ? "opacity-100" : "opacity-0"
                  }`}
                />
              </>
            )}
          </div>
        ) : (
          <div className='text-white/60 text-center text-sm'>&nbsp;</div>
        )}
      </div>
    </>
  );
}
