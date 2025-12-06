'use client';

import { useEffect, useState } from 'react';
import useSWRInfinite from 'swr/infinite'; // ✅ 변경: infinite 훅 import
import HomeHero from '@/components/HomeHero';

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
    commentCount?: number;
};

const fetcher = (url: string) =>
    fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } })
        .then((r) => r.json() as Promise<Post[]>);

// ---- 좋아요 로컬 상태 관리 ----
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
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const text = (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
        return text.length > max ? text.slice(0, max) + '…' : text;
    } catch {
        const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        return text.length > max ? text.slice(0, max) + '…' : text;
    }
}

export default function Home() {
    const [tab, setTab] = useState<'best' | 'trending' | 'latest'>('latest');

    // 좋아요 상태 (로컬)
    const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
    useEffect(() => {
        setLikedIds(loadLikedIds());
    }, []);

    // ✅ getKey: SWRInfinite가 각 페이지의 URL을 생성하는 함수
    const getKey = (pageIndex: number, previousPageData: Post[]) => {
        // 이전 페이지 데이터가 있는데 비어있다면(끝) null 반환 -> 요청 중단
        if (previousPageData && !previousPageData.length) return null;

        // API 요청: page는 0부터 시작, size는 12개씩
        return `${API}/api/posts?sort=${tab}&page=${pageIndex}&size=12`;
    };

    // ✅ useSWRInfinite 사용
    const { data, size, setSize, isLoading, error, mutate } = useSWRInfinite<Post[]>(getKey, fetcher);

    // ✅ 데이터 평탄화 (2차원 배열 [[page1], [page2]] -> 1차원 배열 [post, post...])
    const posts = data ? data.flat() : [];

    // 로딩 상태 계산
    const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === 'undefined');
    const isEmpty = data?.[0]?.length === 0;
    const isReachingEnd = isEmpty || (data && data[data.length - 1]?.length < 12);

    // 좋아요 토글
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

            // ✅ Infinite 데이터 구조(2차원 배열)에 맞춰서 로컬 데이터 업데이트
            mutate(
                (currentData) => {
                    if (!currentData) return [];
                    return currentData.map((pagePosts) =>
                        pagePosts.map((p) => (p.id === id ? { ...p, likes: newCount } : p))
                    );
                },
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
        <>
            <HomeHero />
            <main className="min-h-screen bg-white text-neutral-900 dark:bg-black dark:text-white">
                {/* 상단 (글쓰기 버튼 등) */}
                <section className="mx-auto max-w-6xl px-4 pt-2">
                    <div className="rounded-3xl border border-neutral-200/60 p-5 shadow-sm dark:border-neutral-800/80
                                    flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <h2 className="text-lg font-semibold">인생 망한 모임 - 인생 망한 사람들 썰 풀고 가자</h2>
                        <a
                            href="/write"
                            className="inline-block w-full sm:w-auto text-center rounded-2xl px-4 py-2 text-sm font-semibold shadow-sm ring-1 ring-black/5
                  bg-neutral-900 text-white hover:opacity-90 active:opacity-80
                  dark:bg-white dark:text-black"
                        >
                            글 쓰기
                        </a>
                    </div>
                </section>

                {/* 목록 + 탭 */}
                <section className="mx-auto max-w-6xl px-4 pb-20 pt-6">
                    <div className="mb-4 flex items-center gap-2 text-sm">
                        {[
                            { key: 'latest', label: '최신' },
                            { key: 'trending', label: '실시간' },
                            { key: 'best', label: '베스트' },
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
                            {isLoading ? '불러오는 중…' : `${posts.length}개 로딩됨`}
                        </span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {posts.map((p) => {
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
                                        <p className="mt-1 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
                                            {preview}
                                        </p>
                                    </a>
                                    <div className="mt-3 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                                        <span>{p.authorNick}</span>
                                        <div className="flex items-center gap-3">
                                            <span title="조회수">👁 {p.views ?? 0}</span>
                                            <span title="댓글 수">💬 {p.commentCount ?? 0}</span>
                                            <button
                                                onClick={() => toggleLike(p.id)}
                                                className={`inline-flex items-center gap-1 transition ${liked ? 'text-red-600 dark:text-red-500 font-bold' : ''
                                                } hover:opacity-70`}
                                                title="좋아요"
                                            >
                                                <span>{liked ? '♥' : '♡'}</span>
                                                <span>{p.likes ?? 0}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* 데이터가 아예 없을 때 */}
                        {!isLoading && posts.length === 0 && (
                            <div className="col-span-full rounded-xl border border-dashed p-6 text-center text-sm text-neutral-500 dark:border-neutral-800">
                                아직 글이 없어요. 첫 글을 남겨보세요! → <a className="underline" href="/write">글쓰기</a>
                            </div>
                        )}
                    </div>

                    {/* ✅ 더 보기 (Load More) 버튼 */}
                    <div className="mt-8 flex justify-center">
                        {!isReachingEnd && (
                            <button
                                disabled={isLoadingMore}
                                onClick={() => setSize(size + 1)}
                                className="rounded-full bg-neutral-100 px-6 py-3 text-sm font-semibold text-neutral-600 hover:bg-neutral-200 disabled:opacity-50 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                            >
                                {isLoadingMore ? '로딩 중...' : '더 보기'}
                            </button>
                        )}
                        {isReachingEnd && posts.length > 0 && (
                            <p className="text-sm text-neutral-400">마지막 글입니다.</p>
                        )}
                    </div>
                </section>
            </main>
        </>
    );
}