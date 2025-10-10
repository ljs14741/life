'use client';

import { ChatProvider } from './chat/ChatProvider';
import ChatDock from '@/components/chat/ChatDock';
import Header from '@/components/Header';

export default function Home() {
    return (
        <ChatProvider>
            <main className="min-h-screen bg-white text-neutral-900 dark:bg-black dark:text-white">
                <Header />

                {/* 본문 카드: 글쓰기 버튼만 남김 */}
                <section className="mx-auto max-w-6xl px-4 pb-20 pt-6">
                    <div className="rounded-3xl border border-neutral-200/60 p-6 shadow-sm dark:border-neutral-800/80">
                        <h2 className="text-lg font-semibold">인망모 MVP</h2>
                        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                            채팅부터 시작해요. 우측 하단의 버튼을 눌러 대화를 시작하세요!
                        </p>

                        <div className="mt-4">
                            <a
                                href="/write"
                                className="inline-block rounded-2xl px-4 py-2 text-sm font-semibold shadow-sm ring-1 ring-black/5
                           bg-neutral-900 text-white hover:opacity-90 active:opacity-80
                           dark:bg-white dark:text-black"
                            >
                                글 쓰기
                            </a>
                        </div>
                    </div>
                </section>
            </main>

            {/* 우하단 채팅 플로팅 */}
            <ChatDock />
        </ChatProvider>
    );
}
