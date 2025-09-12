"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import HiteSummaryCard from "@/components/HiteScoreCard"

type StepState = "locked" | "available" | "completed";
type XpLevel = "Rookie" | "Starter";

const DEFAULT_SCORE = 952;
const DEFAULT_LEVEL: XpLevel = "Rookie";

export default function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showDiscoverOnly = searchParams.get("view") === "discover";

  const [hiteScore, setHiteScore] = useState<number>(DEFAULT_SCORE);
  const [level, setLevel] = useState<XpLevel>(DEFAULT_LEVEL);
  const [activeStreak] = useState(5);

  const [discoverState, setDiscoverState] =
    useState<Exclude<StepState, "locked">>("available");
  const [trainState, setTrainState] = useState<StepState>("locked");
  const [executeState, setExecuteState] = useState<StepState>("locked");

  const prevDiscoverRef = useRef<string | null>(null);
  const prevTrainRef = useRef<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalFor, setModalFor] = useState<"train" | "execute" | null>(null);

  const readHiteScore = useCallback(() => {
    try {
      const scoreStr = localStorage.getItem("hiteScore");
      const parsed = scoreStr ? parseInt(scoreStr, 10) : NaN;
      setHiteScore(Number.isFinite(parsed) ? parsed : DEFAULT_SCORE);
    } catch {
      setHiteScore(DEFAULT_SCORE);
    }
  }, []);

  const readXpLevel = useCallback(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("planProgress") || "{}");
      const allDone =
        stored?.discover === "completed" &&
        stored?.train === "completed" &&
        stored?.execute === "completed";
      setLevel(allDone ? "Starter" : "Rookie");
    } catch {
      setLevel("Rookie");
    }
  }, []);

  const syncFromStorage = useCallback(() => {
    if (showDiscoverOnly) {
      setDiscoverState("available");
      setTrainState("locked");
      setExecuteState("locked");
      readHiteScore();
      readXpLevel();
      return;
    }

    try {
      readHiteScore();
      readXpLevel();

      const stored = JSON.parse(localStorage.getItem("planProgress") || "{}");

      const prevT = prevTrainRef.current;

      const d: Exclude<StepState, "locked"> =
        stored.discover === "completed" ? "completed" : "available";
      const t: StepState =
        stored.discover === "completed"
          ? stored.train === "completed"
            ? "completed"
            : "available"
          : "locked";
      const e: StepState =
        stored.execute === "completed"
          ? "completed"
          : stored.execute === "available"
            ? "available"
            : "locked";

      setDiscoverState(d);
      setTrainState(t);
      setExecuteState(e);

      const skipExecOnce =
        typeof window !== "undefined" &&
        localStorage.getItem("__skipExecutePopupOnce") === "1";

      if (prevT !== "completed" && t === "completed" && e !== "completed") {
        if (!skipExecOnce) {
          setModalFor("execute");
          setModalVisible(true);
        } else {
          localStorage.removeItem("__skipExecutePopupOnce");
        }
      }

      prevDiscoverRef.current = d;
      prevTrainRef.current = t;
    } catch {
      setDiscoverState("available");
      setTrainState("locked");
      setExecuteState("locked");
    }
  }, [readHiteScore, readXpLevel, showDiscoverOnly]);

  useEffect(() => {
    readHiteScore();
    readXpLevel();
  }, [readHiteScore, readXpLevel]);

  useEffect(() => {
    syncFromStorage();

    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === "planProgress" || e.key === "hiteScore") {
        syncFromStorage();
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") syncFromStorage();
    };

    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [syncFromStorage]);

  useEffect(() => {
    if (!showDiscoverOnly) return;

    try {
      const p = JSON.parse(localStorage.getItem("planProgress") || "{}");
      const shouldShow =
        p?.discover === "completed" && p?.train === "available";

      const SEEN_KEY = "__train_popup_once";
      const JUST_COMPLETED_KEY = "__justCompletedDiscover";

      const justCompleted = localStorage.getItem(JUST_COMPLETED_KEY) === "1";
      const notShownThisSession = sessionStorage.getItem(SEEN_KEY) !== "1";

      if (shouldShow && (justCompleted || notShownThisSession)) {
        setTimeout(() => {
          setModalFor("train");
          setModalVisible(true);
          sessionStorage.setItem(SEEN_KEY, "1");
          localStorage.removeItem(JUST_COMPLETED_KEY);
        }, 60);
      }
    } catch { }
  }, [showDiscoverOnly]);

  useEffect(() => {
    const allDone =
      discoverState === "completed" &&
      trainState === "completed" &&
      executeState === "completed";

    if (!allDone) return;

    if (sessionStorage.getItem("__cleared_local_storage_today") === "1") return;
    sessionStorage.setItem("__cleared_local_storage_today", "1");

    const t = setTimeout(() => {
      try {
        localStorage.clear();
      } catch {
        /* noop */
      }
    }, 600);

    return () => clearTimeout(t);
  }, [discoverState, trainState, executeState]);

  const onStartDiscover = () => router.push("/discover");
  const onStartTrain = () => {
    if (trainState !== "available") return;
    router.push("/train");
  };
  const onStartExecute = () => {
    if (executeState !== "available") return;
    router.push("/execute");
  };

  const onModalAction = () => {
    setModalVisible(false);
    if (modalFor === "train") router.push("/train");
    if (modalFor === "execute") router.push("/execute");
    setModalFor(null);
  };

  return (
    <div className='absolute inset-0 flex justify-center items-center'>
      <div
        className='flex flex-col py-6 w-full max-w-[520px] sm:max-w-[560px] h-full overflow-hidden'
      >
        <div className='flex-1'>
          <div className='px-2 text-white'>
            <header className='flex justify-between items-center mb-6'>
              <h1 className='font-extrabold text-4xl'>Hi there!</h1>
              <div className='flex items-center gap-4'>
                <button
                  aria-label='notifications'
                  className='flex justify-center items-center bg-white/6 rounded-full w-10 h-10'
                >
                  <svg
                    width='30'
                    height='30'
                    viewBox='0 0 30 30'
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                  >
                    <circle cx='20.294' cy='6.887' r='3.287' fill='#FD521B' />
                    <path
                      d='M15.5986 4.77417L15.5987 4.06982H15.5986V4.77417ZM21.7812 10.9568L22.4856 10.9568L22.4856 10.9568L21.7812 10.9568ZM23.3457 17.5906L24.0501 17.5906L24.0501 17.5906L23.3457 17.5906ZM20.1885 21.2937L20.2883 21.9909L20.2883 21.9909L20.1885 21.2937ZM15.5977 21.699L15.5976 22.4033L15.5977 22.4033L15.5977 21.699ZM11.0078 21.2937L10.908 21.9909L10.908 21.9909L11.0078 21.2937ZM7.85059 17.5906L7.14624 17.5906L7.14624 17.5906L7.85059 17.5906ZM9.41602 10.9568L8.71167 10.9568V10.9568H9.41602ZM8.44763 15.536L7.85348 15.1577L8.44763 15.536ZM22.749 15.5367L22.1548 15.9149L22.749 15.5367ZM15.5986 4.77417L15.5986 5.47852C18.624 5.47874 21.0769 7.93146 21.0769 10.9568L21.7812 10.9568L22.4856 10.9568C22.4855 7.15337 19.4019 4.0701 15.5987 4.06982L15.5986 4.77417ZM21.7812 10.9568H21.0769V13.0767H21.7812H22.4856V10.9568H21.7812ZM22.749 15.5367L22.1548 15.9149C22.4628 16.3989 22.6414 16.9727 22.6414 17.5906L23.3457 17.5906L24.0501 17.5906C24.0501 16.6968 23.7907 15.8617 23.3432 15.1585L22.749 15.5367ZM23.3457 17.5906L22.6414 17.5905C22.6412 19.0929 21.5742 20.3838 20.0887 20.5965L20.1885 21.2937L20.2883 21.9909C22.5044 21.6737 24.0499 19.756 24.0501 17.5906L23.3457 17.5906ZM20.1885 21.2937L20.0887 20.5965C18.686 20.7972 16.959 20.9946 15.5977 20.9946L15.5977 21.699L15.5977 22.4033C17.0638 22.4033 18.8727 22.1936 20.2883 21.9909L20.1885 21.2937ZM15.5977 21.699L15.5977 20.9946C14.2364 20.9946 12.5101 20.7972 11.1076 20.5965L11.0078 21.2937L10.908 21.9909C12.3234 22.1935 14.1315 22.4033 15.5976 22.4033L15.5977 21.699ZM11.0078 21.2937L11.1077 20.5965C9.62217 20.3838 8.55506 19.0928 8.55493 17.5905L7.85059 17.5906L7.14624 17.5906C7.14641 19.756 8.69197 21.6736 10.908 21.9909L11.0078 21.2937ZM7.85059 17.5906L8.55493 17.5906C8.55493 16.9725 8.73358 16.3984 9.04179 15.9143L8.44763 15.536L7.85348 15.1577C7.40567 15.8611 7.14624 16.6965 7.14624 17.5906L7.85059 17.5906ZM9.41602 13.0751H10.1204V10.9568H9.41602H8.71167V13.0751H9.41602ZM9.41602 10.9568L10.1204 10.9568C10.1204 7.93126 12.5731 5.47852 15.5986 5.47852V4.77417V4.06982C11.7951 4.06982 8.71172 7.15327 8.71167 10.9568L9.41602 10.9568ZM8.44763 15.536L9.04179 15.9143C9.50773 15.1824 10.1204 14.2067 10.1204 13.0751H9.41602H8.71167C8.71167 13.7361 8.35026 14.3774 7.85348 15.1577L8.44763 15.536ZM21.7812 13.0767H21.0769C21.0769 14.2079 21.6891 15.1832 22.1548 15.9149L22.749 15.5367L23.3432 15.1585C22.8467 14.3785 22.4856 13.7374 22.4856 13.0767H21.7812Z'
                      fill='white'
                      fillOpacity='0.8'
                    />
                    <path
                      d='M17.5552 23.166C17.1346 23.8261 16.4153 24.2612 15.5987 24.2612C14.782 24.2612 14.0628 23.8261 13.6421 23.166'
                      stroke='white'
                      strokeOpacity='.8'
                      strokeWidth='1.41'
                      strokeLinecap='round'
                    />
                  </svg>
                </button>

                <button
                  aria-label='profile'
                  className='flex justify-center items-center bg-white/6 rounded-full w-12 h-12'
                >
                  <svg
                    width='30'
                    height='30'
                    viewBox='0 0 30 30'
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                  >
                    <circle cx='15.3' cy='7.5' r='5.3' fill='#CFD2D9' />
                    <rect
                      x='4.2'
                      y='13.8'
                      width='22.5'
                      height='14.2'
                      rx='7'
                      fill='#CFD2D9'
                    />
                  </svg>
                </button>
              </div>
            </header>

            {/* ===== Top score card ===== */}
            <section className='relative mb-8'>
              <HiteSummaryCard
                score={hiteScore}
                level={level}
                streakDays={activeStreak}
                weekLabel='This week'
                plansDone={2}
                plansTotal={4}
                timeSpent='1h 15m'
                onShowMore={() => console.log("show more")}
              />
            </section>

            {/* ===== Today's Plan ===== */}
            <section className='mb-8'>
              <h3 className='mb-4 font-bold text-2xl'>Today&apos;s Plan</h3>

              {discoverState === "completed" &&
                trainState === "completed" &&
                executeState === "completed" ? (
                <div
                  className='flex flex-col justify-center items-center p-8 rounded-2xl text-center'
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.00))",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <p className='mb-4 text-white/80'>
                    You&apos;re All Done For Today
                  </p>
                  <div className='flex justify-center items-center w-20 h-20'>
                    <Image src='/check.png' alt='Done' width={80} height={80} />
                  </div>
                </div>
              ) : (
                <div className='relative'>
                  <div
                    className='top-0 bottom-0 left-1 absolute bg-white/10 rounded-full w-1'
                    style={{ transform: "translateX(-50%)" }}
                  />
                  <div className='space-y-4 pl-3'>
                    {/* Discover */}
                    <div
                      className='relative flex items-center gap-4 px-4 py-3 rounded-[999px]'
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.00))",
                        border: "1px solid rgba(120,72,255,0.25)",
                      }}
                    >
                      <div className='flex justify-center items-center bg-gradient-to-br from-[#14223f] to-[#2a1a36] rounded-full w-14 h-14'>
                        <Image
                          src='/Discover.png'
                          alt='discover'
                          width={44}
                          height={44}
                        />
                      </div>

                      <div className='flex-1'>
                        <div className='flex justify-between items-center'>
                          <div className='font-medium text-lg'>Discover</div>
                        </div>
                        <div className='flex items-center gap-2 text-sm text-white/60'>
                          <svg
                            width='16'
                            height='17'
                            viewBox='0 0 16 17'
                            fill='none'
                            xmlns='http://www.w3.org/2000/svg'
                          >
                            <path
                              d='M14.6663 8.49967C14.6663 12.1816 11.6816 15.1663 7.99967 15.1663C4.31778 15.1663 1.33301 12.1816 1.33301 8.49967C1.33301 4.81778 4.31778 1.83301 7.99967 1.83301C11.6816 1.83301 14.6663 4.81778 14.6663 8.49967Z'
                              fill='white'
                              fillOpacity='0.8'
                            />
                            <path
                              fillRule='evenodd'
                              clipRule='evenodd'
                              d='M7.99967 5.33301C8.27582 5.33301 8.49967 5.55687 8.49967 5.83301V8.29257L10.0199 9.81279C10.2152 10.008 10.2152 10.3246 10.0199 10.5199C9.82463 10.7152 9.50805 10.7152 9.31279 10.5199L7.64612 8.85323C7.55235 8.75946 7.49967 8.63228 7.49967 8.49967V5.83301C7.49967 5.55687 7.72353 5.33301 7.99967 5.33301Z'
                              fill='#060502'
                            />
                          </svg>
                          2 minutes
                        </div>
                      </div>

                      <div>
                        {discoverState === "available" ? (
                          <button
                            onClick={onStartDiscover}
                            className='flex justify-center items-center bg-white shadow rounded-full w-12 h-12'
                            aria-label='Start discover'
                          >
                            <svg
                              width='12'
                              height='12'
                              viewBox='0 0 24 24'
                              fill='none'
                            >
                              <path
                                d='M8 5l8 7-8 7'
                                stroke='#000'
                                strokeWidth='2'
                                strokeLinecap='round'
                                strokeLinejoin='round'
                              />
                            </svg>
                          </button>
                        ) : discoverState === "completed" ? (
                          <div className='flex justify-center items-center bg-green-500/90 rounded-full w-12 h-12 text-white'>
                            ✓
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Train */}
                    <div
                      className={`relative rounded-[999px] px-4 py-3 flex items-center gap-4 ${trainState === "locked" ? "opacity-60" : ""
                        }`}
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.00))",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div className='flex justify-center items-center bg-gradient-to-br from-[#0b1720] to-[#161122] rounded-full w-14 h-14'>
                        <Image
                          src='/Train.png'
                          alt='train'
                          width={44}
                          height={44}
                        />
                      </div>

                      <div className='flex-1'>
                        <div className='flex justify-between items-center'>
                          <div
                            className={`${trainState === "locked"
                              ? "text-white/60"
                              : "text-white"
                              } text-lg font-medium`}
                          >
                            Train
                          </div>
                          <div className='flex items-center gap-2 text-sm text-white/60'>
                            <svg
                              width='16'
                              height='17'
                              viewBox='0 0 16 17'
                              fill='none'
                              xmlns='http://www.w3.org/2000/svg'
                            >
                              <path
                                d='M14.6663 8.49967C14.6663 12.1816 11.6816 15.1663 7.99967 15.1663C4.31778 15.1663 1.33301 12.1816 1.33301 8.49967C1.33301 4.81778 4.31778 1.83301 7.99967 1.83301C11.6816 1.83301 14.6663 4.81778 14.6663 8.49967Z'
                                fill='white'
                                fillOpacity='0.8'
                              />
                              <path
                                fillRule='evenodd'
                                clipRule='evenodd'
                                d='M7.99967 5.33301C8.27582 5.33301 8.49967 5.55687 8.49967 5.83301V8.29257L10.0199 9.81279C10.2152 10.008 10.2152 10.3246 10.0199 10.5199C9.82463 10.7152 9.50805 10.7152 9.31279 10.5199L7.64612 8.85323C7.55235 8.75946 7.49967 8.63228 7.49967 8.49967V5.83301C7.49967 5.55687 7.72353 5.33301 7.99967 5.33301Z'
                                fill='#060502'
                              />
                            </svg>
                            2 minutes
                          </div>
                        </div>
                      </div>

                      <div>
                        {trainState === "locked" ? (
                          <div className='flex justify-center items-center bg-[#28354EB2] rounded-full w-12 h-12 text-white/60'>
                            <svg
                              width='14'
                              height='15'
                              viewBox='0 0 14 15'
                              fill='none'
                              xmlns='http://www.w3.org/2000/svg'
                            >
                              <path
                                fillRule='evenodd'
                                clipRule='evenodd'
                                d='M2.49967 6.70275V5.33301C2.49967 2.84773 4.51439 0.833008 6.99967 0.833008C9.48496 0.833008 11.4997 2.84773 11.4997 5.33301V6.70275C12.2428 6.75825 12.7268 6.89837 13.0806 7.25213C13.6663 7.83791 13.6663 8.78072 13.6663 10.6663C13.6663 12.552 13.6663 13.4948 13.0806 14.0806C12.4948 14.6663 11.552 14.6663 9.66634 14.6663H4.33301C2.44739 14.6663 1.50458 14.6663 0.918794 14.0806C0.333008 13.4948 0.333008 12.552 0.333008 10.6663C0.333008 8.78072 0.333008 7.83791 0.918794 7.25213C1.27255 6.89837 1.7565 6.75825 2.49967 6.70275ZM3.49967 5.33301C3.49967 3.40001 5.06668 1.83301 6.99967 1.83301C8.93267 1.83301 10.4997 3.40001 10.4997 5.33301V6.66872C10.2443 6.66634 9.96735 6.66634 9.66634 6.66634H4.33301C4.032 6.66634 3.75502 6.66634 3.49967 6.66872V5.33301Z'
                                fill='black'
                                fillOpacity='0.8'
                              />
                            </svg>
                          </div>
                        ) : trainState === "available" ? (
                          <button
                            onClick={onStartTrain}
                            className='flex justify-center items-center bg-white shadow rounded-full w-12 h-12'
                            aria-label='Start train'
                          >
                            <svg
                              width='12'
                              height='12'
                              viewBox='0 0 24 24'
                              fill='none'
                            >
                              <path
                                d='M8 5l8 7-8 7'
                                stroke='#000'
                                strokeWidth='2'
                                strokeLinecap='round'
                                strokeLinejoin='round'
                              />
                            </svg>
                          </button>
                        ) : (
                          <div className='flex justify-center items-center bg-green-500/90 rounded-full w-12 h-12 text-white'>
                            ✓
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Execute */}
                    <div
                      className={`relative rounded-[999px] px-4 py-3 flex items-center gap-4 ${executeState === "locked" ? "opacity-60" : ""
                        }`}
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.00))",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div className='flex justify-center items-center bg-gradient-to-br from-[#0b1720] to-[#161122] rounded-full w-14 h-14'>
                        <Image
                          src='/Execute.png'
                          alt='execute'
                          width={44}
                          height={44}
                        />
                      </div>

                      <div className='flex-1'>
                        <div className='flex justify-between items-center'>
                          <div
                            className={`${executeState === "locked"
                              ? "text-white/60"
                              : "text-white"
                              } text-lg font-medium`}
                          >
                            Execute
                          </div>
                          <div className='flex items-center gap-2 text-sm text-white/60'>
                            <svg
                              width='16'
                              height='17'
                              viewBox='0 0 16 17'
                              fill='none'
                              xmlns='http://www.w3.org/2000/svg'
                            >
                              <path
                                d='M14.6663 8.49967C14.6663 12.1816 11.6816 15.1663 7.99967 15.1663C4.31778 15.1663 1.33301 12.1816 1.33301 8.49967C1.33301 4.81778 4.31778 1.83301 7.99967 1.83301C11.6816 1.83301 14.6663 4.81778 14.6663 8.49967Z'
                                fill='white'
                                fillOpacity='0.8'
                              />
                              <path
                                fillRule='evenodd'
                                clipRule='evenodd'
                                d='M7.99967 5.33301C8.27582 5.33301 8.49967 5.55687 8.49967 5.83301V8.29257Л10.0199 9.81279C10.2152 10.008 10.2152 10.3246 10.0199 10.5199C9.82463 10.7152 9.50805 10.7152 9.31279 10.5199L7.64612 8.85323C7.55235 8.75946 7.49967 8.63228 7.49967 8.49967V5.83301C7.49967 5.55687 7.72353 5.33301 7.99967 5.33301Z'
                                fill='#060502'
                              />
                            </svg>
                            2 minutes
                          </div>
                        </div>
                      </div>

                      <div>
                        {executeState === "locked" ? (
                          <div className='flex justify-center items-center bg-[#28354EB2] rounded-full w-12 h-12 text-white/60'>
                            <svg
                              width='14'
                              height='15'
                              viewBox='0 0 14 15'
                              fill='none'
                              xmlns='http://www.w3.org/2000/svg'
                            >
                              <path
                                fillRule='evenodd'
                                clipRule='evenodd'
                                d='M2.49967 6.70275V5.33301C2.49967 2.84773 4.51439 0.833008 6.99967 0.833008C9.48496 0.833008 11.4997 2.84773 11.4997 5.33301V6.70275C12.2428 6.75825 12.7268 6.89837 13.0806 7.25213C13.6663 7.83791 13.6663 8.78072 13.6663 10.6663C13.6663 12.552 13.6663 13.4948 13.0806 14.0806C12.4948 14.6663 11.552 14.6663 9.66634 14.6663H4.33301C2.44739 14.6663 1.50458 14.6663 0.918794 14.0806C0.333008 13.4948 0.333008 12.552 0.333008 10.6663C0.333008 8.78072 0.333008 7.83791 0.918794 7.25213C1.27255 6.89837 1.7565 6.75825 2.49967 6.70275ZM3.49967 5.33301C3.49967 3.40001 5.06668 1.83301 6.99967 1.83301C8.93267 1.83301 10.4997 3.40001 10.4997 5.33301V6.66872C10.2443 6.66634 9.96735 6.66634 9.66634 6.66634H4.33301C4.032 6.66634 3.75502 6.66634 3.49967 6.66872V5.33301Z'
                                fill='black'
                                fillOpacity='0.8'
                              />
                            </svg>
                          </div>
                        ) : executeState === "available" ? (
                          <button
                            onClick={onStartExecute}
                            className='flex justify-center items-center bg-white shadow rounded-full w-12 h-12'
                            aria-label='Start execute'
                          >
                            <svg
                              width='12'
                              height='12'
                              viewBox='0 0 24 24'
                              fill='none'
                            >
                              <path
                                d='M8 5l8 7-8 7'
                                stroke='#000'
                                strokeWidth='2'
                                strokeLinecap='round'
                                strokeLinejoin='round'
                              />
                            </svg>
                          </button>
                        ) : (
                          <div className='flex justify-center items-center bg-green-500/90 rounded-full w-12 h-12 text-white'>
                            ✓
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* ===== Coach's Corner ===== */}
            <section style={{ marginBottom: 32 }}>
              <h3 className='mb-4 font-bold text-2xl'>Coach&apos;s Corner</h3>
              <div
                className='bg-gradient-to-br from-[#151029] to-[#2a1630] shadow-lg p-6 border border-white/6 rounded-2xl'
                style={{ minHeight: 160 }}
              >
                <h4 className='mb-2 font-semibold text-lg'>
                  Composure Under Pressure
                </h4>
                <p className='mb-4 text-white/70 leading-relaxed'>
                  Staying calm in tough moments helps you think clearly, make
                  smart decisions, and avoid mistakes. When you&apos;re
                  composed, pressure doesn&apos;t shake you — it sharpens you.
                </p>

                <div className='flex items-center gap-3'>
                  <button className='bg-white px-4 py-2 rounded-full text-black'>
                    Coach Check-ins
                  </button>
                  <button className='bg-transparent px-4 py-2 border border-white/10 rounded-full text-white/80'>
                    Show more
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* МОДАЛКА */}
      {modalVisible && modalFor && (
        <div className='z-[999] fixed inset-0 flex justify-center items-center px-4'>
          <div
            className='absolute inset-0 bg-black/60'
            onClick={() => setModalVisible(false)}
          />
          <div className='relative bg-[#1b1b1b] shadow-2xl p-6 border border-white/6 rounded-2xl w-full max-w-md'>
            <h3 className='mb-3 font-bold text-2xl text-center'>
              {modalFor === "train"
                ? "Train Section Unlocked!"
                : "Execute Section Unlocked!"}
            </h3>
            <p className='text-center text-white/70'>
              {modalFor === "train"
                ? "Track And Grow Your Personal Skills — Now Available In Your Dashboard."
                : "Put your skills to the test — Execute is now available in your dashboard."}
            </p>

            <div className='flex justify-center'>
              <Image src='/lock1.png' alt='lock' width={200} height={200} />
            </div>

            <button
              onClick={onModalAction}
              className='bg-white py-3 rounded-full w-full font-medium text-black'
            >
              {modalFor === "train" ? "Go to Train" : "Go to Execute"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
