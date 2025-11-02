'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_BASE || '';
const RichEditor = dynamic(() => import('@/components/RichEditor'), { ssr: false });

type Post = { id: number; title: string; content: string };

const getErrorMessageFromResponse = async (r: Response): Promise<string> => {
    if (r.status === 401) return '비밀번호가 올바르지 않습니다.';
    try {
        const ct = r.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
            const j = await r.json();
            return j.detail || j.message || j.error || JSON.stringify(j);
        }
        const txt = await r.text();
        return txt || r.statusText || '요청 처리 중 오류가 발생했습니다.';
    } catch {
        return '요청 처리 중 오류가 발생했습니다.';
    }
};

function getErrorMessage(e: unknown) {
    if (e instanceof Error) return e.message;
    try { return JSON.stringify(e); } catch { return String(e); }
}

const isHtmlEmpty = (html: string) =>
    !html || !html.replace(/<[^>]*>/g, '').trim();

export default function PostEdit() {
    const { id } = useParams<{ id: string }>();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('<p></p>');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const pw = sessionStorage.getItem(`edit_pw_${id}`);
                if (!pw) {
                    alert('수정 권한이 없습니다. 상세 화면에서 비밀번호 확인 후 들어와 주세요.');
                    window.location.href = `/posts/${id}`;
                    return;
                }

                const r = await fetch(`${API}/api/posts/${id}`, {
                    headers: { Accept: 'application/json' },
                });
                if (!r.ok) throw new Error(await getErrorMessageFromResponse(r));
                const data: Post = await r.json();
                setTitle(data.title);
                setContent(data.content || '<p></p>');
            } catch (e) {
                alert(getErrorMessage(e));
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return alert('제목을 입력하세요.');
        if (isHtmlEmpty(content)) return alert('내용을 입력하세요.');

        const password = sessionStorage.getItem(`edit_pw_${id}`);
        if (!password) {
            alert('수정 권한이 만료되었습니다. 다시 비밀번호를 확인해 주세요.');
            window.location.href = `/posts/${id}`;
            return;
        }

        setSubmitting(true);
        try {
            const r = await fetch(`${API}/api/posts/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({ title, content, password }), // ✅ HTML 전송
            });
            if (!r.ok) throw new Error(await getErrorMessageFromResponse(r));

            sessionStorage.removeItem(`edit_pw_${id}`);
            alert('수정되었습니다.');
            window.location.href = `/posts/${id}`;
        } catch (e) {
            alert(getErrorMessage(e) || '수정 실패');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-4 dark:text-white">로딩 중…</div>;

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-black">
            <main className="max-w-3xl mx-auto p-4">
                <h1 className="text-2xl font-bold mb-4 dark:text-white">글 수정</h1>
                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium dark:text-neutral-300">제목</label>
                        <input
                            className="mt-1 w-full border rounded p-2 bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:placeholder:text-neutral-500"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={120}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium dark:text-neutral-300">내용</label>
                        <div className="mt-1">
                            <RichEditor value={content} onChange={setContent}/>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
                        >
                            {submitting ? '수정 중…' : '저장'}
                        </button>
                        <button
                            type="button"
                            onClick={() => (window.location.href = `/posts/${id}`)}
                            className="border rounded px-4 py-2"
                        >
                            취소
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}
