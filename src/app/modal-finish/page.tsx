"use client"

import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";

export default function ModalPage() {
    const router = useRouter();

    const handleGoToTrain = () => {
        // Немедленный переход без задержек
        router.push('/quiz');
    };

    const handleButtonClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handleGoToTrain();
    };

    return (
        <motion.div
            className="flex justify-center w-full h-full overflow-hidden"
            initial={{
                y: 100,
                opacity: 0,
                filter: "blur(4px)"
            }}
            animate={{
                y: 0,
                opacity: 1,
                filter: "blur(0px)"
            }}
            transition={{
                duration: 0.2,
                ease: "easeOut"
            }}
        >
            <div className="relative w-full max-w-md min-h-screen overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url('/modal-bg.png')` }}
                />

                <div className="z-10 absolute inset-0 bg-[#111111] opacity-90" />

                <div className="relative z-20 flex flex-col justify-center p-[18px] h-dvh">
                    <div className="relative flex flex-col justify-between items-center bg-[#FFFFFF1A] backdrop-blur-[40px] p-4 border border-[#FFFFFF4D] rounded-[24px] w-full h-[282px]">
                        <div>
                            <h1 className="font-bold text-[20px] text-center text-white leading-[20px]">
                                Execute Section Unlocked!
                            </h1>

                            <p className="mt-2 text-[#FFFFFFCC] text-[14px] text-center">
                                Set Clear Execute To Stay Aligned And Focused Each Day.
                            </p>
                        </div>
                        <div className="top-1/2 left-1/2 absolute flex justify-center items-center w-[190px] h-[190px] transform -translate-x-1/2 -translate-y-1/2">
                            <Image src="/lock1.png" alt="Unlock Icon" width={190} height={190} className="object-contain" />
                        </div>

                        <Button
                            onClick={handleButtonClick}
                            onMouseDown={handleGoToTrain}
                            onTouchStart={handleGoToTrain}
                            style={{ touchAction: 'manipulation' }}
                        >
                            Go to Execute
                        </Button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}