import { PropsWithChildren } from "react";
import AppHeader from "./AppHeader";

type Props = {
  title?: string;
  onBack?: () => void;
  progress?: number;
  showProgress?: boolean; // ⬅️ новое
};

export default function Screen({
  title = "Discover",
  onBack,
  progress = 0,
  showProgress = true,
  children,
}: PropsWithChildren<Props>) {
  return (
    <div className='relative min-h-dvh text-white'>
      <div
        aria-hidden
        className="-z-10 absolute inset-0 bg-[url('/bg.png')] bg-cover bg-center"
      />

      <div className='mx-auto px-2 pt-12 max-w-md'>
        <AppHeader title={title} onBack={onBack} />

        {/* progress */}
        {showProgress && (
          <div className='mx-2 mt-4 mb-8'>
            <div className='bg-white/10 rounded-full w-full h-2 overflow-hidden'>
              <div
                className='bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] rounded-full h-full transition-all duration-500 ease-in-out'
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {children}
        <div className='h-24' />
      </div>
    </div>
  );
}
