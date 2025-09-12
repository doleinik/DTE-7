"use client"

import Image from "next/image";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

export default function ModalPage() {
    const router = useRouter();

      const handleGoToTrain = () => {
        router.push('/flashcard');
    };

    const handleButtonClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handleGoToTrain();
    };

    return (
        <div className="w-full h-full flex justify-center">
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
                                Train Section Unlocked!
                            </h1>

                            <p className="text-[#FFFFFFCC] text-center text-[14px] mt-2">
                                Track And Grow Your Personal Skills — Now Available In Your Dashboard.
                            </p>
                        </div>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[190px] h-[190px] flex items-center justify-center">
                            <Image src="/lock1.png" alt="Unlock Icon" width={190} height={190} className="object-contain" />
                        </div>

                        <Button onClick={handleButtonClick} className="w-full">
                            Go to Train
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}