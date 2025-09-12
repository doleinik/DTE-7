"use client";
import { useState, useEffect, ReactElement, useRef } from "react";
import { cubicBezier, motion } from "framer-motion";
import Button from "@/components/ui/Button";
import PopperCrackerIcon from "./icons/PopperCrackerIcon";
import { FlashcardsContent } from "./Flashcards";
import Counter from "@/components/Counter";
import Image from "next/image";
import Link from "next/link";

const EASE = cubicBezier(0.22, 1, 0.36, 1);
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const SYMBOL_HEIGHT = 86;

const ICONS = ["lime", "star", "cherry", "claver"].map(name => (
    <div key={name}>
        <Image
            src={`/${name}.png`}
            alt={name}
            width={80}
            height={86} // всі символи мають однакову висоту
            style={{ objectFit: "contain" }}
        />
    </div>
));
type LockedCell = { char: string; status: "correct" | "wrong" | null } | null;

type ReelSymbol = string | ReactElement;

const WORDS = [
    "FOCUS",
    "CALM",
    "MIND",
    "THINK",
    "CLEAR",
    "STILL",
    "PAUSE",
    "AWARE",
    "QUIET",
    "CENTER",
    "BREATH",
    "ATTEND",
    "NOTICE",
    "ALERT",
    "MENTAL",
    "OBSERVE",
    "STRENGTH",
    "ENERGY",
    "CONCENTRATE",
    "FLOW"
];


const generateReel = (word: string, total = 20) =>
    Array.from({ length: total }, () => {
        const rand = Math.random();

        if (rand < 0.7) {
            // 70% шанс вибрати літеру з потрібного слова
            return word[Math.floor(Math.random() * word.length)];
        } else if (rand < 0.85) {
            // 15% шанс вибрати іконку
            return ICONS[Math.floor(Math.random() * ICONS.length)];
        } else {
            // 15% шанс вибрати випадкову літеру
            return LETTERS[Math.floor(Math.random() * LETTERS.length)];
        }
    }).sort(() => Math.random() - 0.5);



type ResetSlotGameProps = {
    card: FlashcardsContent;
    index: number;
    cardsLength: number;
};

export default function ResetSlotGame({
    card,
    index,
    cardsLength,
}: ResetSlotGameProps) {
    const [resetWord, setResetWord] = useState("");
    const [inputWord, setInputWord] = useState("");
    const [started, setStarted] = useState(false);
    const [stopped, setStopped] = useState(false);
    const [reels, setReels] = useState<ReelSymbol[][]>([]);
    const [spinOffsets, setSpinOffsets] = useState([0, 0, 0]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [locked, setLocked] = useState<LockedCell[]>([]);
    const [lives, setLives] = useState(4);
    const [timer, setTimer] = useState(30);
    const [won, setWon] = useState(false);
    const [lost, setLost] = useState(false);
    const [failed, setFailed] = useState(false);
    const [autoSpin, setAutoSpin] = useState(false);
    const [highlightedSymbolIndex, setHighlightedSymbolIndex] = useState<number | null>(null);


    const spinRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!autoSpin || !reels.length || stopped) return;

        let spinCount = 0;
        const totalSpins = 20;
        const middleIndex = 1;

        const cycle = () => {
            if (stopped) return;

            setSpinOffsets((prev) =>
                prev.map((o, i) => {
                    if (i === middleIndex) {
                        if (spinCount < totalSpins) return (o + 1) % reels[i].length;
                        return o;
                    }
                    return (o + 1) % reels[i].length;
                })
            );

            if (spinCount < totalSpins) {
                spinCount++;
                spinRef.current = setTimeout(cycle, 50);
            } else {
                spinRef.current = setTimeout(() => {
                    if (!stopped) {
                        spinCount = 0;
                        cycle();
                    }
                }, 800);
            }
        };

        cycle();

        // повертаємо функцію, яка точно void
        return () => {
            if (spinRef.current) {
                clearTimeout(spinRef.current);
                spinRef.current = null;
            }
        };
    }, [autoSpin, reels, stopped]);


    // --- Таймер ---
    useEffect(() => {
        if (!started || stopped || won || lost || timer <= 0) return;
        const t = setTimeout(() => setTimer(timer - 1), 1000);
        return () => clearTimeout(t);
    }, [timer, started, stopped, won, lost]);

    useEffect(() => {
        if (timer <= 0 && started && !stopped && !won && !lost) {
            setLives((prev) => {
                const next = prev - 1;
                if (next <= 0) setLost(true);
                return next;
            });
            setStopped(true);
            setFailed(true);
        }
    }, [timer, started, stopped, won, lost]);

    const startGame = () => {
        const word = (inputWord.trim() || "FOCUS").toUpperCase();
        setResetWord(word);
        setLocked(Array(word.length).fill(null));
        setSpinOffsets([0, 0, 0]);
        setActiveIndex(0);
        setLives(4);
        setTimer(30);
        setStopped(false);
        setStarted(true);
        setWon(false);
        setLost(false);
        setFailed(false);
        setReels([generateReel(word), generateReel(word), generateReel(word)]);
        setAutoSpin(true);
        setHighlightedSymbolIndex(null); // <--- додаємо цю строку

    };

    // --- Ручна зупинка ---
    const handleLock = () => {
        if (!started || stopped) return;

        setAutoSpin(false);
        setStopped(true);
        spinRef.current && clearTimeout(spinRef.current);

        const middleReel = reels[1];
        if (!middleReel || middleReel.length === 0) return;

        const len = middleReel.length;
        // позитивний модуль
        const currentIndex = ((spinOffsets[1] % len) + len) % len;
        // індекс символа, який фактично видно (твоя логіка +1)
        const displayIndex = (currentIndex + 1) % len;
        const currentSymbol = middleReel[displayIndex];
        // зберігаємо base-index (не індекс doubled масиву)
        setHighlightedSymbolIndex(displayIndex);

        const targetSymbol = resetWord[activeIndex];

        if (typeof currentSymbol === "string") {
            setLocked((prev) => {
                const copy = prev.slice();
                copy[activeIndex] = {
                    char: currentSymbol,
                    status: currentSymbol === targetSymbol ? "correct" : "wrong",
                } as LockedCell;
                return copy;
            });

            if (currentSymbol === targetSymbol) {
                setFailed(false);
                // невелика пауза, щоб користувач побачив зелений підсвіт
                setTimeout(() => {
                    // якщо ще є наступна літера — переходимо
                    if (activeIndex < resetWord.length - 1) {
                        handleNext();
                    } else {
                        setWon(true);
                    }
                }, 600);
            } else {
                setLives((prev) => {
                    const next = prev - 1;
                    if (next <= 0) setLost(true);
                    return next;
                });
                setFailed(true);
            }
        }

        // фіксуємо поточні offsets (зупиняємо анімацію)
        setSpinOffsets((prev) => prev.map((o) => o));
    };



    // --- Наступний символ ---
    const handleNext = () => {
        setStopped(false);
        setHighlightedSymbolIndex(null);

        setSpinOffsets([0, 0, 0]);

        // очищаємо лише wrong у поточній клітинці (якщо була помилка)
        setLocked((prev) => prev.map((v, i) => (i === activeIndex && v?.status === "wrong" ? null : v)));

        if (activeIndex < resetWord.length - 1) {
            setActiveIndex((prev) => prev + 1);
            setReels([
                generateReel(resetWord),
                generateReel(resetWord),
                generateReel(resetWord),
            ]);
            setAutoSpin(true);
        } else {
            setWon(true);
        }
    };


    const handleRetry = () => {
        setHighlightedSymbolIndex(null);
        setFailed(false);
        setStopped(false);
        setTimer(30);
        setSpinOffsets([0, 0, 0]);

        // стираємо лише невдалу (wrong) спробу для поточної клітинки
        setLocked((prev) => prev.map((v, i) => (i === activeIndex && v?.status === "wrong" ? null : v)));

        setAutoSpin(true);
    };



    const renderReels = () =>
        reels.map((reel, i) => (
            <div
                key={i}
                className={`h-[230px] w-[80px] flex justify-center mt-[-30px] ${i === 1
                    ? "bg-black border-l border-r border-white/70"
                    : "border-gray-300"
                    }`}
            >
                <motion.div
                    animate={{ y: spinOffsets[i] * -SYMBOL_HEIGHT }}
                    transition={{ type: "tween", duration: 0.08, ease: "linear" }}
                    className="flex flex-col"
                    style={{ height: `${reel.length * SYMBOL_HEIGHT}px` }}
                >
                    {[...reel, ...reel].map((sym, j) => {
                        const isHighlighted = i === 1 && j === highlightedSymbolIndex;

                        // --- визначаємо клас правильності ---
                        let correctnessClass = "";
                        if (
                            isHighlighted &&
                            typeof sym === "string" &&
                            resetWord[activeIndex]
                        ) {
                            correctnessClass =
                                sym === resetWord[activeIndex] ? "correct" : "wrong";
                        }

                        return (
                            <div
                                key={j}
                                className={`flex justify-center items-center w-full h-[86px] font-bold text-[64px] text-white 
                                ${isHighlighted ? "active-reel-border z-10 rounded-lg" : ""} 
                                ${correctnessClass}`}
                                style={{ minHeight: 86 }}
                            >
                                {typeof sym === "string" ? (
                                    sym
                                ) : (
                                    <div className="flex justify-center items-center w-[80px] h-[86px]">
                                        {sym}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </motion.div>
            </div>
        ));

    if (!started || lost) {
        return (
            <div className="flex flex-col gap-4 mb-auto p-6 text-left">
                <Counter count={index} length={cardsLength} />
                <h1 className="w-full font-bold text-2xl">{card?.title}</h1>
                <p>{card?.content}</p>
                <label htmlFor="word-game" className="mb-[40px] w-full">
                    Enter your Reset word or use the default one
                    <input
                        id="word-game"
                        className="bg-transparent mt-2 px-[12px] py-[14px] pr-4 border border-white/40 rounded w-full placeholder:text-white/60 appearance-none focus:outline-none custom-scrollbar"
                        placeholder="Enter your word"
                        value={inputWord}
                        onChange={(e) => setInputWord(e.target.value)}
                    />
                </label>
                <Button onClick={startGame}>Start</Button>
                <div
                    className="mx-auto border-white/50 border-b w-fit font-dmSans text-center text-underline cursor-pointer select-none"
                    onClick={() => {
                        const randomWord = WORDS[Math.floor(Math.random() * WORDS.length)];
                        setInputWord(randomWord);
                    }}
                >
                    Generate Random Word
                </div>
            </div >
        );
    }

    return (
        <div className="flex flex-col items-center gap-6 p-6 w-full">
            <div className="flex flex-col gap-2 w-full font-mono text-3xl">
                <div className="flex justify-between items-center mb-[24px] w-full">
                    <div className="mt-2 font-dmSans text-xl">
                        00:{timer}
                        <span className="opacity-50">/00:30</span>
                    </div>
                    <div className="flex gap-2 bg-black/50 backdrop-blur-[20px] px-[15px] py-[5px] rounded-full">
                        {Array.from({ length: lives }).map((_, i) => (
                            <Image key={i} src="/heart.png" alt="life" width={24} height={24} />
                        ))}
                    </div>
                </div>
                <div className="flex justify-center items-center gap-[10px] mb-[10px]">
                    {resetWord.split("").map((_, i) => {
                        const cell = locked[i]; // LockedCell | null

                        const statusClass =
                            cell?.status === "correct"
                                ? " !border-green-400"
                                : cell?.status === "wrong"
                                    ? " !border-red-400 text-red-400"
                                    : " !border-gray-400";

                        return (
                            <span
                                key={i}
                                className={`w-[48px] bg-white/10 border-[1px] h-[48px] flex items-center justify-center text-[48px] text-center rounded-[4px] leading-[1] 
          ${i === activeIndex ? "border-white/70" : "border-gray-400"} ${statusClass}`}
                            >
                                {cell?.char ?? ""}
                            </span>
                        );
                    })}
                </div>

                <div className="font-dmSans text-[14px] text-center">
                    Target Word: <span className="font-bold"> {resetWord}</span>
                </div>
            </div>

            {won ? (
                <div className="w-full">
                    <motion.div
                        className="mb-[3.75rem] text-center"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: EASE }}
                    >
                        <motion.div
                            className="mx-auto w-fit"
                            initial={{ scale: 0.9, rotate: -6 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ duration: 0.7, ease: EASE }}
                        >
                            <PopperCrackerIcon />
                        </motion.div>
                        <motion.h1
                            className="mb-4 font-bold text-[32px]"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
                        >
                            You Did It!
                        </motion.h1>
                        <motion.p
                            className="text-white/80"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
                        >
                            You’ve completed right word!
                        </motion.p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: EASE, delay: 0.6 }}
                        className="mt-auto"
                    >
                        <Link href={'/'} onClick={handleNext} className="flex justify-center items-center bg-white disabled:bg-white/50 rounded-[30px] w-full h-[3.75rem] active:font-bold text-black text-center">
                            Next
                        </Link>
                    </motion.div>
                </div>
            ) : (
                <div className="relative flex justify-center bg-black/40 mt-4 px-[20px] rounded-[24px] w-[304px] overflow-hidden gradient-custom">
                    {renderReels()}
                </div>
            )
            }

            {
                stopped ? (
                    failed ? (
                        <Button onClick={handleRetry}>Try again!</Button>
                    ) : (
                        !won && <Button onClick={handleNext}>Next</Button>
                    )
                ) : (
                    !won && <Button onClick={handleLock}>Reel Lock</Button>
                )
            }
        </div >
    );
}
