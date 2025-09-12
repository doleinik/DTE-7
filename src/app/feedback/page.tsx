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
    } catch { }
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
    } catch { }
  };

  const handleBack = () => router.back();

  return (
    <div className='relative min-h-dvh text-white'>
      <div className='-z-10 absolute inset-0'>
        <Image src='/bg.png' alt='' fill priority className='object-cover' />
      </div>

      <section className='relative flex flex-col flex-1 mx-auto px-4 py-6 max-w-md h-screen'>
        <BackButton onClick={handleBack} className='mt-2 mb-2' />

        <div className='mx-auto mb-6'>
          <ChatIcon />
        </div>

        <div className='mb-10 text-center'>
          <h1 className='font-bold text-[32px] leading-tight'>
            How would you rate this <br className='sm:block hidden' />
            training?
          </h1>
        </div>

        {/* Helpful */}
        <div className='mb-8'>
          <p className='mb-3 text-center text-white/80'>
            How helpful was the information?
          </p>
          <div className='flex justify-center items-center gap-4'>
            {[1, 2, 3, 4, 5].map((i) => (
              <StarButton
                key={`h-${i}`}
                active={i <= helpful}
                onClick={() => setHelpful(i)}
              />
            ))}
          </div>
        </div>

        {/* Engaging */}
        <div className='mb-12'>
          <p className='mb-3 text-center text-white/80'>
            How engaging was the presentation of the content?
          </p>
          <div className='flex justify-center items-center gap-4'>
            {[1, 2, 3, 4, 5].map((i) => (
              <StarButton
                key={`e-${i}`}
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
            className='flex justify-center items-center px-5 py-4 rounded-[999px] w-full text-center text-lg'
          >
            Next
          </Button>
        </Link>
      </section>
    </div>
  );
}
