'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import ChatDock from '@/components/chat/ChatDock';
import { ChatProvider } from './chat/ChatProvider';

const API = process.env.NEXT_PUBLIC_API_BASE || '';

type Post = {
    id: number;
    categoryCode: string;
    categoryName: string;
    title: string;
    content: string;     // HTML
    authorId: string;
    authorNick: string;
    createDate: string;
    updateDate: string;
    views: number;
    likes: number;
};

const fetcher = (url: string) =>
    fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } })
        .then((r) => r.json() as Promise<Post[]>);

// ---- 좋아요 로컬 상태 ----
function loadLikedIds(): Set<number> {
    try {
        const raw = localStorage.getItem('liked_posts');
        const arr = raw ? (JSON.parse(raw) as number[]) : [];
        return new Set(arr);
    } catch {
        return new Set<number>();
    }
}
function saveLikedIds(set: Set<number>) {
    localStorage.setItem('liked_posts', JSON.stringify(Array.from(set)));
}

/** HTML을 텍스트 미리보기로 (태그 제거 + 엔티티 해제) */
function htmlToPlainPreview(html: string, max = 120): string {
    try {
        // 브라우저 환경에서 DOMParser로 가장 정확하게 처리
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const text = (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
        return text.length > max ? text.slice(0, max) + '…' : text;
    } catch {
        // 혹시 모듈 환경에서 실패하면 간단한 폴백
        const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        return text.length > max ? text.slice(0, max) + '…' : text;
    }
}

export default function Home() {
    const [tab, setTab] = useState<'best' | 'trending' | 'latest'>('best');

    // 좋아요 상태 (로컬)
    const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
    useEffect(() => {
        setLikedIds(loadLikedIds());
    }, []);

    const { data, isLoading, error, mutate } = useSWR<Post[]>(
        `${API}/api/posts?sort=${tab}&page=0&size=12`,
        fetcher
    );

    const toggleLike = async (id: number) => {
        const wasLiked = likedIds.has(id);
        const url = wasLiked ? `${API}/api/posts/${id}/unlike` : `${API}/api/posts/${id}/like`;
        try {
            const r = await fetch(url, { method: 'POST', headers: { Accept: 'application/json' } });
            if (!r.ok) {
                const msg = await r.text();
                alert(msg || r.statusText);
                return;
            }
            const newCount: number = await r.json();

            mutate(
                (prev) => (prev ?? []).map((p) => (p.id === id ? { ...p, likes: newCount } : p)),
                { revalidate: false }
            );

            const next = new Set(likedIds);
            if (wasLiked) next.delete(id);
            else next.add(id);
            setLikedIds(next);
            saveLikedIds(next);
        } catch (e) {
            alert(e instanceof Error ? e.message : String(e));
        }
    };

    return (
        <ChatProvider>
            <main className="min-h-screen bg-white text-neutral-900 dark:bg-black dark:text-white">
                {/* 상단 */}
                <section className="mx-auto max-w-6xl px-4 pt-6">
                    <div className="rounded-3xl border border-neutral-200/60 p-5 shadow-sm dark:border-neutral-800/80 flex items-center justify-between">
                        <h2 className="text-lg font-semibold">인생망한모임</h2>
                        <a
                            href="/write"
                            className="inline-block rounded-2xl px-4 py-2 text-sm font-semibold shadow-sm ring-1 ring-black/5
              bg-neutral-900 text-white hover:opacity-90 active:opacity-80
              dark:bg-white dark:text-black"
                        >
                            글 쓰기
                        </a>
                    </div>
                </section>

                {/* 목록 + 탭 */}
                <section className="mx-auto max-w-6xl px-4 pb-20 pt-6">
                    {/* 탭 */}
                    <div className="mb-4 flex items-center gap-2 text-sm">
                        {[
                            { key: 'best', label: '베스트' },
                            { key: 'trending', label: '실시간' },
                            { key: 'latest', label: '최신' },
                        ].map((t) => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key as 'best' | 'trending' | 'latest')}
                                className={`rounded-full px-3 py-1 ring-1 ring-black/10 dark:ring-white/10 transition
                  ${tab === t.key
                                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-black'
                                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-900'}`}
                            >
                                {t.label}
                            </button>
                        ))}
                        <span className="ml-auto text-xs text-neutral-500">
              {isLoading ? '불러오는 중…' : error ? '불러오기 실패' : `${data?.length ?? 0}개`}
            </span>
                    </div>

                    {/* 카드 그리드 */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {(data ?? []).map((p) => {
                            const liked = likedIds.has(p.id);
                            const preview = htmlToPlainPreview(p.content, 140);
                            return (
                                <div
                                    key={p.id}
                                    className="rounded-2xl border border-neutral-200/70 p-4 hover:bg-neutral-50
                    dark:border-neutral-800 dark:hover:bg-neutral-900"
                                >
                                    <a href={`/posts/${p.id}`} className="block">
                                        <div className="text-xs flex items-center gap-2">
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">
                        {p.categoryName}
                      </span>
                                        </div>
                                        <h4 className="mt-2 line-clamp-1 text-lg font-semibold">{p.title}</h4>
                                        {/* ✅ HTML을 텍스트로 바꾼 미리보기 */}
                                        <p className="mt-1 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
                                            {preview}
                                        </p>
                                    </a>

                                    <div className="mt-3 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                                        <span>{p.authorNick}</span>
                                        <div className="flex items-center gap-3">
                                            <span title="조회수">👁 {p.views ?? 0}</span>
                                            <button
                                                onClick={() => toggleLike(p.id)}
                                                className={`inline-flex items-center gap-1 transition ${
                                                    liked ? 'text-red-600' : 'text-neutral-500'
                                                }`}
                                                aria-label="좋아요"
                                                title="좋아요"
                                            >
                                                <span>♥</span>
                                                <span>{p.likes ?? 0}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Empty state */}
                        {!isLoading && !error && (data?.length ?? 0) === 0 && (
                            <div className="col-span-full rounded-xl border border-dashed p-6 text-center text-sm text-neutral-500 dark:border-neutral-800">
                                아직 글이 없어요. 첫 글을 남겨보세요! → <a className="underline" href="/write">글쓰기</a>
                            </div>
                        )}
                    </div>
                </section>
            </main>

            <ChatDock />
        </ChatProvider>
    );
}
