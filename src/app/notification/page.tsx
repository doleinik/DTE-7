"use client"
import { Camera, Flashlight } from "lucide-react";
import { Inter } from "next/font/google";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";

const inter = Inter({ subsets: ["latin"] });

export default function NotificationPage() {
    const router = useRouter();
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const dayName = days[now.getDay()];
    const monthName = months[now.getMonth()];
    const dateStr = `${dayName}, ${now.getDate()} ${monthName}`;
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    return (
        <div className={"w-full h-full flex justify-center min-h-screen flex-col items-center select-none " + inter.className}>
            <div className="max-w-md w-full flex flex-col flex-1 relative overflow-hidden">
                <div className="flex flex-col items-center pt-6">
                    <span className="text-[20px] text-white font-medium tracking-[-4%]">{dateStr}</span>
                    <span className="text-[80px] text-white font-medium leading-[97px] tracking-[-4%]">{timeStr}</span>
                </div>
                <div className="bg-black flex flex-col items-center justify-center space-y-6 w-full flex-1">
                    <Image src="/logo-lock.svg" alt="Logo" width={248} height={61} className="relative z-10" />
                </div>
                <div className="flex flex-col w-full py-6 relative bottom-20">
                    <div className="flex items-center w-full justify-between pr-[25px] mb-3 ">
                        <span className="text-white text-[26px] tracking-[-1%] leading-[31px] ml-6">Notification Centre</span>
                        <Image src="/close.svg" alt="Settings" width={34} height={34} />
                    </div><div className="flex flex-row items-center gap-4 z-20 bg-[#20201FCC] w-full max-w-[380px] rounded-[20px] min-h-[95px] px-4 py-3 mx-auto" onClick={() => router.push('/questions')}>
                        <div className="flex items-center justify-center w-[40px] h-[40px]">
                            <Image src="/logo.png" alt="logo" width={38} height={38} />
                        </div>
                        <div className="flex flex-col justify-center flex-1">
                            <span className="text-white text-[15px] font-semibold tracking-[-1%] leading-[18px] mb-1">You are invited to join a team!</span>
                            <span className="text-white text-[14px] font-light tracking-[-1%] leading-[19px]">Congrats! You’ve been selected to join a team. Tap to accept your spot! 💪🔥</span>
                        </div>
                    </div>
                </div>
                <div className="absolute bottom-10 left-0 w-full flex items-center justify-between px-15">
                    <div className="rounded-full bg-[#1A1A19] w-12 h-12 flex items-center justify-center"><Flashlight width={34} height={34} color="#1A1A19" fill="#FFFFFF"/></div>
                    <div className="rounded-full bg-[#1A1A19] w-12 flex items-center justify-center h-12"><Camera width={34} height={34} color="#1A1A19" fill="#FFFFFF" /></div>
                </div>
            </div>
        </div>
    );
}