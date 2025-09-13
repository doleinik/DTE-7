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
        <div className="flex justify-center w-full h-full">
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
                                Train Section Unlocked!
                            </h1>

                            <p className="mt-2 text-[#FFFFFFCC] text-[14px] text-center">
                                Track And Grow Your Personal Skills — Now Available In Your Dashboard.
                            </p>
                        </div>
                        <div className="top-1/2 left-1/2 absolute flex justify-center items-center w-[190px] h-[190px] transform -translate-x-1/2 -translate-y-1/2">
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