'use client';
import { motion } from 'framer-motion';

export default function Header() {
    const big = ['인', '망', '모'];
    const small = ['생', '한', '임'];

    return (
        <header className="relative z-10 w-full">
            <div className="mx-auto max-w-6xl px-4 pt-10 pb-8">
                {/* 상단 뱃지 / 서브카피 */}
                <div className="mb-4 flex items-center gap-2">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
            인생을 망쳐본 사람들의 솔직한 커뮤니티
          </span>
                </div>

                {/* 인터리브 로고 (배지 인라인 버전: 잘림 방지) */}
                <motion.h1
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="font-extrabold leading-none tracking-[-0.02em]"
                >
                    <div className="flex select-none items-end gap-1 text-[64px] sm:text-[88px] md:text-[112px] flex-wrap">
                        {big.map((ch, i) => (
                            <span key={i} className="flex items-end">
                <span className="bg-gradient-to-b from-[#5CC6FF] via-[#7C87FF] to-[#C06BFF] bg-clip-text text-transparent drop-shadow-[0_8px_24px_rgba(124,135,255,0.5)]">
                  {ch}
                </span>
                                {/* 인라인 배지: 절대위치 제거, 잘림/겹침 방지 */}
                                <span className="ml-1 translate-y-[8px] rounded-md bg-black/5 px-2 py-[2px] text-[14px] sm:text-[16px] md:text-[18px] font-medium text-neutral-600 backdrop-blur dark:bg-white/5 dark:text-neutral-200">
                  {small[i]}
                </span>
              </span>
                        ))}
                    </div>

                    {/* 서브 카피 */}
                    <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
                        인망모 — <span className="font-semibold">인생망한모임</span> · 인생 뭐 있나 즐기자.
                    </p>
                </motion.h1>
            </div>

            {/* 배경 글로우 */}
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute left-1/2 top-[-140px] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(124,135,255,0.35),transparent_70%)] blur-2xl" />
                <div className="absolute left-[15%] top-[40%] h-[260px] w-[260px] rounded-full bg-[radial-gradient(closest-side,rgba(92,198,255,0.25),transparent_70%)] blur-2xl" />
                <div className="absolute right-[10%] top-[55%] h-[300px] w-[300px] rounded-full bg-[radial-gradient(closest-side,rgba(192,107,255,0.25),transparent_70%)] blur-2xl" />
            </div>
        </header>
    );
}
