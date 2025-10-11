'use client';

import { useEffect, useRef, useState } from 'react';
import Header from '@/components/Header';
import ChatDock from '@/components/chat/ChatDock';
import { ChatProvider } from '@/app/chat/ChatProvider';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

type Profile = { senderId: string; nickname: string };

const MAX_CONTENT = 20000;
const MAX_TITLE = 120;

function genUuid(): string {
    if (typeof crypto !== 'undefined' && typeof (crypto as Crypto).randomUUID === 'function') {
        return (crypto as Crypto).randomUUID();
    }
    const b = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(b);
    else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, x => x.toString(16).padStart(2, '0'));
    return `${h.slice(0,4).join('')}-${h.slice(4,6).join('')}-${h.slice(6,8).join('')}-${h.slice(8,10).join('')}-${h.slice(10).join('')}`;
}

function loadProfile(): Profile {
    try {
        const raw = localStorage.getItem('imangmo_profile_v1');
        if (!raw) return { senderId: 'anon', nickname: '익명' };
        const p = JSON.parse(raw) as Partial<Profile>;
        if (typeof p?.senderId === 'string' && typeof p?.nickname === 'string') {
            return { senderId: p.senderId, nickname: p.nickname };
        }
    } catch {}
    return { senderId: 'anon', nickname: '익명' };
}

export default function WritePage() {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('MISTAKE');
    const [profile, setProfile] = useState<Profile>({ senderId: 'anon', nickname: '익명' });
    const [pending, setPending] = useState(false);

    // 🔒 즉시 차단용 락
    const lockRef = useRef(false);
    // ♻️ 멱등키: 컴포넌트가 살아있는 동안 고정
    const clientReqIdRef = useRef<string>(genUuid());

    useEffect(() => { setProfile(loadProfile()); }, []);

    const submit = async () => {
        if (lockRef.current) return;
        lockRef.current = true;
        try {
            if (!title.trim() || !content.trim()) { alert('제목/본문을 입력해 주세요.'); return; }
            if (title.length > MAX_TITLE) { alert(`제목은 ${MAX_TITLE}자 이하`); return; }
            if (content.length > MAX_CONTENT) { alert(`본문은 ${MAX_CONTENT.toLocaleString()}자 이하`); return; }

            setPending(true);

            const body = {
                clientReqId: clientReqIdRef.current,   // 항상 같은 값
                title,
                content,
                categoryCode: category,
                authorId: profile.senderId,
                authorNick: profile.nickname,
            };

            const res = await fetch(`${API}/api/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const msg = await res.text().catch(() => '');
                alert('작성 실패: ' + msg);
                return;
            }

            const p: { id: number } = await res.json();
            location.href = `/posts/${p.id}`;
        } finally {
            setPending(false);
            lockRef.current = false;
        }
    };

    return (
        <ChatProvider>
            <main className="min-h-screen bg-white text-neutral-900 dark:bg-black dark:text-white">
                <Header />
                <section className="mx-auto max-w-3xl px-4 py-8">
                    <h1 className="text-2xl font-bold mb-4">글 쓰기</h1>

                    <div className="space-y-4">
                        <input className="w-full rounded-xl border p-3" placeholder="제목"
                               value={title} onChange={(e) => setTitle(e.target.value)} maxLength={MAX_TITLE} />

                        <select className="w-full rounded-xl border p-3"
                                value={category} onChange={(e) => setCategory(e.target.value)}>
                            <option value="MISTAKE">실수담</option>
                            <option value="REVIEW">실패 분석</option>
                            <option value="CAREER">커리어/학업</option>
                            <option value="RELATION">인간관계</option>
                            <option value="MONEY">돈/재정</option>
                            <option value="FREE">기타/잡담</option>
                        </select>

                        <textarea className="w-full min-h-[280px] rounded-xl border p-3"
                                  placeholder="본문"
                                  value={content} onChange={(e) => setContent(e.target.value)} />
                        <div className="flex justify-end text-xs text-neutral-500">
                            {content.length.toLocaleString()} / {MAX_CONTENT.toLocaleString()}
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={submit}
                                disabled={pending}
                                aria-disabled={pending}
                                className={`rounded-xl px-4 py-2 transition ${
                                    pending
                                        ? 'bg-neutral-400 text-white cursor-not-allowed pointer-events-none'
                                        : 'bg-neutral-900 text-white dark:bg-white dark:text-black'
                                }`}
                            >
                                {pending ? '등록 중…' : '등록'}
                            </button>
                            <Link href="/" className="rounded-xl border px-4 py-2">취소</Link>
                        </div>
                    </div>
                </section>
            </main>
            <ChatDock />
        </ChatProvider>
    );
}