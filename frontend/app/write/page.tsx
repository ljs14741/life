'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_BASE || '';
const RichEditor = dynamic(() => import('@/components/RichEditor'), { ssr: false });

type Category = { id: number; code: string; name: string };

function getErrorMessage(e: unknown) {
    if (e instanceof Error) return e.message;
    try { return JSON.stringify(e); } catch { return String(e); }
}

// HTML 안의 텍스트가 비어있는지 간단 체크
const isHtmlEmpty = (html: string) =>
    !html || !html.replace(/<[^>]*>/g, '').trim();

export default function WritePage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoryCode, setCategoryCode] = useState<string>('MISTAKE');

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('<p></p>'); // HTML
    const [nickname, setNickname] = useState('');
    const [password, setPassword] = useState('');
    const [password2, setPassword2] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('im_nickname');
        if (saved) setNickname(saved);

        fetch(`${API}/api/posts/categories`)
            .then(async (r) => {
                if (!r.ok) throw new Error(await r.text());
                return r.json();
            })
            .then((data: Category[]) => {
                setCategories(data);
                if (data.length && !data.some((c) => c.code === categoryCode)) {
                    setCategoryCode(data[0].code);
                }
            })
            .catch((e) => console.warn('카테고리 로드 실패:', e));
    }, []);

    const validate = () => {
        if (!nickname.trim()) return '닉네임을 입력하세요.';
        if (!password || password.trim().length < 3) return '비밀번호는 최소 3자입니다.';
        if (password !== password2) return '비밀번호 확인이 일치하지 않습니다.';
        return null;
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const v = validate();
        if (v) { alert(v); return; }
        setSubmitting(true);

        const clientReqId = crypto.randomUUID();

        try {
            const res = await fetch(`${API}/api/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientReqId,
                    categoryCode,
                    title,
                    content,               // ✅ HTML로 전송
                    authorNick: nickname,
                    password,
                }),
            });

            if (!res.ok) {
                const t = await res.text();
                throw new Error(t || '등록 실패');
            }

            localStorage.setItem('im_nickname', nickname);
            window.location.href = '/';
            return;
        } catch (e) {
            alert(getErrorMessage(e) || '오류가 발생했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    const inputCls =
        'mt-1 w-full rounded border p-2 text-[16px] ' +
        'bg-white text-neutral-900 placeholder:text-neutral-400 ' +
        'dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 ' +
        'border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ' +
        'dark:border-neutral-700';

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-black">
            <main className="relative z-10 max-w-3xl mx-auto p-4">
                <h1 className="text-2xl font-bold mb-4 dark:text-white">글쓰기</h1>

                <form onSubmit={onSubmit} className="space-y-4">
                    {/* 카테고리 */}
                    <div>
                        <label className="block text-sm font-medium dark:text-neutral-300">카테고리</label>

                        <div className="relative mt-1">
                            <select
                                className={inputCls + ' appearance-none pr-10'} // appearance-none과 pr-10 추가
                                value={categoryCode}
                                onChange={(e) => setCategoryCode(e.target.value)}
                            >
                                {categories.length > 0
                                    ? categories.map((c) => (
                                        <option key={c.id} value={c.code}>{c.name}</option>
                                    ))
                                    : <option value="free">기타/잡담</option>}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-neutral-500 dark:text-neutral-400">
                                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7.5 7.5l5 5 5-5" />
                                </svg>
                            </div>
                        </div>
                        {/* ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ */}
                    </div>

                    {/* 닉네임 */}
                    <div>
                        <label className="block text-sm font-medium dark:text-neutral-300">닉네임</label>
                        <input
                            className={inputCls}
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="익명고래1234"
                            maxLength={32}
                            required
                        />
                    </div>

                    {/* 비밀번호/확인 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium dark:text-neutral-300">비밀번호(최소 3자)</label>
                            <input
                                type="password"
                                className={inputCls}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                minLength={3}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium dark:text-neutral-300">비밀번호 확인</label>
                            <input
                                type="password"
                                className={inputCls}
                                value={password2}
                                onChange={(e) => setPassword2(e.target.value)}
                                minLength={3}
                                required
                            />
                        </div>
                    </div>

                    {/* 제목 */}
                    <div>
                        <label className="block text-sm font-medium dark:text-neutral-300">제목</label>
                        <input
                            className={inputCls}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={120}
                            required
                        />
                    </div>

                    {/* 내용 (리치 에디터) */}
                    <div>
                        <label className="block text-sm font-medium dark:text-neutral-300">내용</label>
                        <div className="mt-1">
                            <RichEditor value={content} onChange={setContent} />
                        </div>
                    </div>

                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        글을 등록하면{' '}
                        <a href="/legal/guideline" target="_blank" className="underline font-semibold">
                            커뮤니티 가이드라인
                        </a>
                        에 동의하는 것으로 간주합니다. (욕설, 비난 자제)
                    </p>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="bg-black text-white rounded px-4 py-2 disabled:opacity-50 dark:bg-white dark:text-black"
                    >
                        {submitting ? '등록 중…' : '등록'}
                    </button>
                </form>
            </main>
        </div>
    );
}
