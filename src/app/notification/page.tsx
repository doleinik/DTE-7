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
            <div className="relative flex flex-col flex-1 w-full max-w-md overflow-hidden">
                <div className="flex flex-col items-center pt-6">
                    <span className="font-medium text-[20px] text-white tracking-[-4%]">{dateStr}</span>
                    <span className="font-medium text-[80px] text-white leading-[97px] tracking-[-4%]">{timeStr}</span>
                </div>
                <div className="flex flex-col flex-1 justify-center items-center space-y-6 bg-black w-full">
                    <Image src="/logo-lock.svg" alt="Logo" width={248} height={61} className="relative z-10" />
                </div>
                <div className="relative bottom-20 flex flex-col py-6 w-full">
                    <div className="flex justify-between items-center mb-3 pr-[25px] w-full">
                        <span className="ml-6 text-[26px] text-white leading-[31px] tracking-[-1%]">Notification Centre</span>
                        <Image src="/close.svg" alt="Settings" width={34} height={34} />
                    </div><div className="z-20 flex flex-row items-center gap-4 bg-[#20201FCC] mx-auto px-4 py-3 rounded-[20px] w-full max-w-[380px] min-h-[95px]" onClick={() => router.push('/discover')}>
                        <div className="flex justify-center items-center w-[40px] h-[40px]">
                            <Image src="/logo.png" alt="logo" width={38} height={38} />
                        </div>
                        <div className="flex flex-col flex-1 justify-center">
                            <span className="mb-1 font-semibold text-[15px] text-white leading-[18px] tracking-[-1%]">You are invited to join a team!</span>
                            <span className="font-light text-[14px] text-white leading-[19px] tracking-[-1%]">Congrats! You’ve been selected to join a team. Tap to accept your spot! 💪🔥</span>
                        </div>
                    </div>
                </div>
                <div className="bottom-10 left-0 absolute flex justify-between items-center px-15 w-full">
                    <div className="flex justify-center items-center bg-[#1A1A19] rounded-full w-12 h-12"><Flashlight width={34} height={34} color="#1A1A19" fill="#FFFFFF" /></div>
                    <div className="flex justify-center items-center bg-[#1A1A19] rounded-full w-12 h-12"><Camera width={34} height={34} color="#1A1A19" fill="#FFFFFF" /></div>
                </div>
            </div>
        </div>
    );
}