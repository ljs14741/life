'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

type Post = {
    id: number;
    title: string;
    content: string;
    authorNick: string;
    categoryName?: string;
    createDate?: string;
    updateDate?: string;
    updateYn?: 'Y'|'N';
    deleteYn?: 'Y'|'N';
};

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

export default function PostDetail() {
    const { id } = useParams<{ id: string }>();
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);

    const [showDelete, setShowDelete] = useState(false);
    const [pwForDelete, setPwForDelete] = useState('');

    const [showEdit, setShowEdit] = useState(false);
    const [pwForEdit, setPwForEdit] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const r = await fetch(`${API}/api/posts/${id}`, {
                    headers: { 'Accept': 'application/json' },
                });
                if (!r.ok) throw new Error(await getErrorMessageFromResponse(r));
                const data = await r.json();
                setPost(data);
            } catch (e) {
                alert(getErrorMessage(e));
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    const verifyThenGoEdit = async () => {
        try {
            const r = await fetch(`${API}/api/posts/${id}/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ password: pwForEdit }),
            });
            if (!r.ok) throw new Error(await getErrorMessageFromResponse(r));

            sessionStorage.setItem(`edit_pw_${id}`, pwForEdit);
            window.location.href = `/posts/${id}/edit`;
        } catch (e) {
            alert(getErrorMessage(e));
        } finally {
            setShowEdit(false);
            setPwForEdit('');
        }
    };

    const doDelete = async () => {
        try {
            const r = await fetch(`${API}/api/posts/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ password: pwForDelete }),
            });
            if (!r.ok) throw new Error(await getErrorMessageFromResponse(r));
            alert('삭제되었습니다.');
            window.location.href = '/';
        } catch (e) {
            alert(getErrorMessage(e));
        } finally {
            setShowDelete(false);
            setPwForDelete('');
        }
    };

    if (loading) return <div className="p-4">로딩 중…</div>;
    if (!post) return <div className="p-4">글을 찾을 수 없습니다.</div>;

    return (
        <div className="min-h-screen bg-neutral-50">
            <Header />
            <main className="max-w-3xl mx-auto p-4">
                <h1 className="text-2xl font-bold">{post.title}</h1>
                <div className="text-sm text-neutral-500 mt-1">
                    {post.categoryName} · {post.authorNick} · {post.createDate}
                    {post.updateYn === 'Y' ? ' · (수정됨)' : null}
                </div>

                <article className="mt-6 whitespace-pre-wrap">
                    {post.content}
                </article>

                <div className="mt-8 flex gap-2">
                    <button
                        onClick={() => setShowEdit(true)}
                        className="px-3 py-2 rounded bg-neutral-800 text-white"
                    >
                        수정
                    </button>
                    <button
                        onClick={() => setShowDelete(true)}
                        className="px-3 py-2 rounded bg-red-600 text-white"
                    >
                        삭제
                    </button>
                </div>

                {/* 수정 비밀번호 모달 */}
                {showEdit && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
                        <div className="bg-white rounded p-4 w-full max-w-sm">
                            <h2 className="text-lg font-bold mb-3">비밀번호 확인</h2>
                            <input
                                type="password"
                                className="w-full border rounded p-2"
                                placeholder="비밀번호"
                                value={pwForEdit}
                                onChange={(e) => setPwForEdit(e.target.value)}
                            />
                            <div className="mt-4 flex justify-end gap-2">
                                <button onClick={() => setShowEdit(false)} className="px-3 py-2 rounded border">
                                    취소
                                </button>
                                <button onClick={verifyThenGoEdit} className="px-3 py-2 rounded bg-neutral-800 text-white">
                                    확인
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 삭제 비밀번호 모달 */}
                {showDelete && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
                        <div className="bg-white rounded p-4 w-full max-w-sm">
                            <h2 className="text-lg font-bold mb-3">비밀번호 확인</h2>
                            <input
                                type="password"
                                className="w-full border rounded p-2"
                                placeholder="비밀번호"
                                value={pwForDelete}
                                onChange={(e) => setPwForDelete(e.target.value)}
                            />
                            <div className="mt-4 flex justify-end gap-2">
                                <button onClick={() => setShowDelete(false)} className="px-3 py-2 rounded border">
                                    취소
                                </button>
                                <button onClick={doDelete} className="px-3 py-2 rounded bg-red-600 text-white">
                                    삭제
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
