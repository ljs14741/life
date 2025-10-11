'use client';

import useSWR from 'swr';
import { ChatProvider } from './chat/ChatProvider';
import ChatDock from '@/components/chat/ChatDock';
import Header from '@/components/Header';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

type Post = {
    id: number;
    categoryCode: string;
    categoryName: string;
    title: string;
    content: string;
    authorId: string;
    authorNick: string;
    createDate: string;
    updateDate: string;
    views: number;
    likes: number;
};

const fetcher = (url: string) =>
    fetch(url, { cache: 'no-store' }).then(r => r.json() as Promise<Post[]>);

export default function Home() {
    const { data, isLoading, error } = useSWR<Post[]>(`${API}/api/posts?page=0&size=12`, fetcher);

    return (
        <ChatProvider>
            <main className="min-h-screen bg-white text-neutral-900 dark:bg-black dark:text-white">
                <Header />

                <section className="mx-auto max-w-6xl px-4 pt-6">
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

                <section className="mx-auto max-w-6xl px-4 pb-20 pt-6">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-base font-semibold">최신 글</h3>
                        <span className="text-xs text-neutral-500">
              {isLoading ? '불러오는 중…' : error ? '불러오기 실패' : `${data?.length ?? 0}개`}
            </span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {(data ?? []).map((p) => (
                            <a
                                key={p.id}
                                href={`/posts/${p.id}`}
                                className="block rounded-2xl border border-neutral-200/70 p-4 hover:bg-neutral-50
                           dark:border-neutral-800 dark:hover:bg-neutral-900"
                            >
                                <div className="text-xs flex items-center gap-2">
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">
                    {p.categoryName}
                  </span>
                                </div>
                                <h4 className="mt-2 line-clamp-1 text-lg font-semibold">{p.title}</h4>
                                <p className="mt-1 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
                                    {p.content}
                                </p>
                                <div className="mt-3 flex justify-between text-xs text-neutral-500 dark:text-neutral-400">
                                    <span>{p.authorNick}</span>
                                    <span>
                    {p.createDate} · ❤ {p.likes}
                  </span>
                                </div>
                            </a>
                        ))}
                    </div>
                </section>
            </main>

            <ChatDock />
        </ChatProvider>
    );
}