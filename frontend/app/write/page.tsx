'use client';

import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_BASE || '';

type Category = { id: number; code: string; name: string };

function getErrorMessage(e: unknown) {
    if (e instanceof Error) return e.message;
    try { return JSON.stringify(e); } catch { return String(e); }
}

export default function WritePage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoryCode, setCategoryCode] = useState<string>('MISTAKE');

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
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
        if (!title.trim()) return '제목을 입력하세요.';
        if (!content.trim()) return '내용을 입력하세요.';
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
                    content,
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

    // 공통 입력 클래스 (iOS 대응: text-[16px], 명시적 배경/색 지정)
    const inputCls =
        'mt-1 w-full rounded border p-2 text-[16px] ' +
        'bg-white text-neutral-900 placeholder:text-neutral-400 ' +
        'dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500 ' +
        'border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ' +
        'dark:border-neutral-700';

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-black">
            {/* 메인 컨텐츠가 장식보다 위에 오도록 */}
            <main className="relative z-10 max-w-3xl mx-auto p-4">
                <h1 className="text-2xl font-bold mb-4">글쓰기</h1>

                <form onSubmit={onSubmit} className="space-y-4">
                    {/* 카테고리 */}
                    <div>
                        <label className="block text-sm font-medium">카테고리</label>
                        <select
                            className={inputCls + ' appearance-none'}
                            value={categoryCode}
                            onChange={(e) => setCategoryCode(e.target.value)}
                        >
                            {categories.length > 0
                                ? categories.map((c) => (
                                    <option key={c.id} value={c.code}>{c.name}</option>
                                ))
                                : <option value="MISTAKE">실수담</option>}
                        </select>
                    </div>

                    {/* 닉네임 */}
                    <div>
                        <label className="block text-sm font-medium">닉네임</label>
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
                            <label className="block text-sm font-medium">비밀번호(최소 3자)</label>
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
                            <label className="block text-sm font-medium">비밀번호 확인</label>
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
                        <label className="block text-sm font-medium">제목</label>
                        <input
                            className={inputCls}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={120}
                            required
                        />
                    </div>

                    {/* 내용 */}
                    <div>
                        <label className="block text-sm font-medium">내용</label>
                        <textarea
                            className={inputCls + ' min-h-[200px]'}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            maxLength={20000}
                            required
                        />
                    </div>

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
