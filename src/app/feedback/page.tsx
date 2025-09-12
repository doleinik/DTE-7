"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import BackButton from "@/components/ui/BackButton";
import Button from "@/components/ui/Button";
import StarButton from "@/components/ui/StarButton";
import ChatIcon from "@/components/icons/ChatIcon";
import Link from "next/link";
import { useRouter } from "next/navigation";

const DRAFT_KEY = "FEEDBACK_DRAFT";

export default function FeedbackPage() {
  const router = useRouter();
  const [helpful, setHelpful] = useState(0);
  const [engaging, setEngaging] = useState(0);

  // Чистим старый драфт при входе
  useEffect(() => {
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {}
  }, []);

  const overall: number = useMemo(() => {
    const arr = [helpful, engaging].filter((n) => n > 0);
    if (!arr.length) return 0;
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    return Math.min(5, Math.max(1, Math.round(avg)));
  }, [helpful, engaging]);

  const handleNext = () => {
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ helpful, engaging, overall })
      );
    } catch {}
  };

  const handleBack = () => router.back();

  return (
    <div className='min-h-dvh relative text-white'>
      <div className='absolute inset-0 -z-10'>
        <Image src='/bg.png' alt='' fill priority className='object-cover' />
      </div>

      <section className='flex flex-col flex-1 relative max-w-md mx-auto px-4 py-6 h-screen'>
        <BackButton onClick={handleBack} className='mt-2 mb-2' />

        <div className='mx-auto mb-6'>
          <ChatIcon />
        </div>

        <div className='text-center mb-10'>
          <h1 className='font-bold text-[32px] leading-tight'>
            How would you rate this <br className='hidden sm:block' />
            training?
          </h1>
        </div>

        {/* Helpful */}
        <div className='mb-8'>
          <p className='text-center text-white/80 mb-3'>
            How helpful was the information?
          </p>
          <div className='flex justify-center items-center gap-4'>
            {[1, 2, 3, 4, 5].map((i) => (
              <StarButton
                key={`h-${i}`}
                size={44}
                active={i <= helpful}
                onClick={() => setHelpful(i)}
              />
            ))}
          </div>
        </div>

        {/* Engaging */}
        <div className='mb-12'>
          <p className='text-center text-white/80 mb-3'>
            How engaging was the presentation of the content?
          </p>
          <div className='flex justify-center items-center gap-4'>
            {[1, 2, 3, 4, 5].map((i) => (
              <StarButton
                key={`e-${i}`}
                size={44}
                active={i <= engaging}
                onClick={() => setEngaging(i)}
              />
            ))}
          </div>
        </div>

        <Link
          href='/feedback/form'
          onClick={handleNext}
          className='block mt-auto'
        >
          <Button
            variant='button'
            className='w-full rounded-[999px] py-4 text-lg flex items-center text-center justify-center px-5'
          >
            Next
          </Button>
        </Link>
      </section>
    </div>
  );
}
