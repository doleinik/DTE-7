"use client"

import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import { Link } from "lucide-react";

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
            className="w-full h-full flex justify-center overflow-hidden"
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
            <div className="min-h-screen max-w-md w-full relative overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url('/modal-bg.png')` }}
                />

                <div className="absolute inset-0 bg-[#111111] opacity-90 z-10" />

                <div className="relative z-20 h-dvh p-[18px] flex flex-col justify-center">
                    <div className="w-full h-[282px] bg-[#FFFFFF1A] border border-[#FFFFFF4D] rounded-[24px] p-4 flex flex-col items-center justify-between backdrop-blur-[40px] relative">
                        <div>
                            <h1 className="text-[20px] font-bold text-white text-center leading-[20px]">
                                Execute Section Unlocked!
                            </h1>

                            <p className="text-[#FFFFFFCC] text-center text-[14px] mt-2">
                                Set Clear Execute To Stay Aligned And Focused Each Day.
                            </p>
                        </div>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[190px] h-[190px] flex items-center justify-center">
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