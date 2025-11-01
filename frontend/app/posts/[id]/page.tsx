'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_BASE || '';

type Post = {
    id: number;
    title: string;
    content: string;
    authorNick: string;
    categoryName?: string;
    createDate?: string;
    updateYn?: 'Y' | 'N';
    views?: number;
    likes?: number;
};

type Comment = {
    id: number;
    postId: number;
    nickname: string;
    content: string;
    createDate?: string;
    updateYn?: 'Y' | 'N';
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
const getErrorMessage = (e: unknown) =>
    e instanceof Error ? e.message : (() => { try { return JSON.stringify(e); } catch { return String(e); } })();

// 좋아요 로컬 상태
function getLikedSet(): Set<number> {
    try {
        const raw = localStorage.getItem('liked_posts');
        const arr = raw ? (JSON.parse(raw) as number[]) : [];
        return new Set(arr);
    } catch {
        return new Set<number>();
    }
}
function saveLikedSet(set: Set<number>) {
    localStorage.setItem('liked_posts', JSON.stringify(Array.from(set)));
}

export default function PostDetail() {
    const { id } = useParams<{ id: string }>();

    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [liked, setLiked] = useState(false);

    // 글 삭제/수정 모달
    const [showDelete, setShowDelete] = useState(false);
    const [pwForDelete, setPwForDelete] = useState('');
    const [showEdit, setShowEdit] = useState(false);
    const [pwForEdit, setPwForEdit] = useState('');

    // 댓글 상태
    const [comments, setComments] = useState<Comment[]>([]);
    const [cNickname, setCNickname] = useState('');
    const [cPassword, setCPassword] = useState('');
    const [cContent, setCContent] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);

    // 댓글 수정/삭제 모달
    const [editCommentId, setEditCommentId] = useState<number | null>(null);
    const [editCommentPw, setEditCommentPw] = useState('');
    const [editCommentContent, setEditCommentContent] = useState('');
    const [deleteCommentId, setDeleteCommentId] = useState<number | null>(null);
    const [deleteCommentPw, setDeleteCommentPw] = useState('');

    // 초기 로드
    useEffect(() => {
        (async () => {
            try {
                const r = await fetch(`${API}/api/posts/${id}`, { headers: { Accept: 'application/json' } });
                if (!r.ok) throw new Error(await getErrorMessageFromResponse(r));
                const data: Post = await r.json();
                setPost(data);

                const likedSet = getLikedSet();
                setLiked(likedSet.has(Number(id)));

                // 닉네임 자동채움
                const savedNick = localStorage.getItem('im_nickname');
                if (savedNick) setCNickname(savedNick);

                // 댓글 목록
                await loadComments();
            } catch (e) {
                alert(getErrorMessage(e));
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const loadComments = async () => {
        const r = await fetch(`${API}/api/posts/${id}/comments`, { headers: { Accept: 'application/json' } });
        if (!r.ok) throw new Error(await getErrorMessageFromResponse(r));
        const list: Comment[] = await r.json();
        setComments(list);
    };

    // 좋아요 토글
    const toggleLike = async () => {
        if (!post) return;
        const pid = Number(id);
        const set = getLikedSet();
        const was = set.has(pid);
        const url = was ? `${API}/api/posts/${id}/unlike` : `${API}/api/posts/${id}/like`;

        try {
            const r = await fetch(url, { method: 'POST', headers: { Accept: 'application/json' } });
            if (!r.ok) throw new Error(await getErrorMessageFromResponse(r));
            const newCount: number = await r.json();
            setPost({ ...post, likes: newCount });

            if (was) { set.delete(pid); setLiked(false); } else { set.add(pid); setLiked(true); }
            saveLikedSet(set);
        } catch (e) {
            alert(getErrorMessage(e));
        }
    };

    // 글 수정 진입
    const verifyThenGoEdit = async () => {
        try {
            const r = await fetch(`${API}/api/posts/${id}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
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

    // 글 삭제
    const doDelete = async () => {
        try {
            const r = await fetch(`${API}/api/posts/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
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

    // 댓글 등록
    const submitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cNickname.trim()) return alert('닉네임을 입력하세요.');
        if (!cPassword || cPassword.trim().length < 3) return alert('비밀번호는 최소 3자입니다.');
        if (!cContent.trim()) return alert('내용을 입력하세요.');

        setSubmittingComment(true);
        try {
            const r = await fetch(`${API}/api/posts/${id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ nickname: cNickname, password: cPassword, content: cContent }),
            });
            if (!r.ok) throw new Error(await getErrorMessageFromResponse(r));
            // 닉네임 저장
            localStorage.setItem('im_nickname', cNickname);
            setCContent('');
            await loadComments();
        } catch (e) {
            alert(getErrorMessage(e));
        } finally {
            setSubmittingComment(false);
        }
    };

    // 댓글 수정 열기
    const openEditComment = (c: Comment) => {
        setEditCommentId(c.id);
        setEditCommentPw('');
        setEditCommentContent(c.content);
    };

    const doEditComment = async () => {
        if (!editCommentId) return;
        try {
            const r = await fetch(`${API}/api/posts/${id}/comments/${editCommentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ content: editCommentContent, password: editCommentPw }),
            });
            if (!r.ok) throw new Error(await getErrorMessageFromResponse(r));
            setEditCommentId(null);
            setEditCommentPw('');
            setEditCommentContent('');
            await loadComments();
        } catch (e) {
            alert(getErrorMessage(e));
        }
    };

    // 댓글 삭제
    const openDeleteComment = (c: Comment) => {
        setDeleteCommentId(c.id);
        setDeleteCommentPw('');
    };
    const doDeleteComment = async () => {
        if (!deleteCommentId) return;
        try {
            const r = await fetch(`${API}/api/posts/${id}/comments/${deleteCommentId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ password: deleteCommentPw }),
            });
            if (!r.ok) throw new Error(await getErrorMessageFromResponse(r));
            setDeleteCommentId(null);
            setDeleteCommentPw('');
            await loadComments();
        } catch (e) {
            alert(getErrorMessage(e));
        }
    };

    if (loading) return <div className="p-4">로딩 중…</div>;
    if (!post) return <div className="p-4">글을 찾을 수 없습니다.</div>;

    return (
        <div className="min-h-screen bg-neutral-50">
            <main className="max-w-3xl mx-auto p-4">
                {/* 제목 + 우측 액션 */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">{post.title}</h1>
                        <div className="text-sm text-neutral-500 mt-1 flex flex-wrap items-center gap-x-2">
                            <span>{post.categoryName}</span>
                            <span>· {post.authorNick}</span>
                            <span>· {post.createDate}</span>
                            {post.updateYn === 'Y' && <span>· (수정됨)</span>}
                            <span className="ml-2">· 👁 {post.views ?? 0}</span>
                            <button
                                onClick={toggleLike}
                                className={`ml-2 inline-flex items-center gap-1 ${liked ? 'text-red-600' : 'text-neutral-500'}`}
                                aria-label="좋아요"
                                title="좋아요"
                            >
                                <span>♥</span>
                                <span>{post.likes ?? 0}</span>
                            </button>
                        </div>
                    </div>

                    <div className="shrink-0 flex gap-2">
                        <button onClick={() => setShowEdit(true)} className="px-3 py-2 rounded bg-neutral-800 text-white">
                            수정
                        </button>
                        <button onClick={() => setShowDelete(true)} className="px-3 py-2 rounded bg-red-600 text-white">
                            삭제
                        </button>
                    </div>
                </div>

                <article
                    className="mt-6 prose prose-neutral max-w-none
                                 [&_video]:max-w-[640px]
                                 [&_video]:w-full
                                 [&_video]:mx-auto
                                 [&_video]:max-h-[360px]
                                 [&_video]:object-contain"
                    dangerouslySetInnerHTML={{__html: post.content}}
                />

                {/* ---------- 댓글 작성 ---------- */}
                <section className="mt-10">
                    <h2 className="text-lg font-semibold mb-3">댓글</h2>
                    <form onSubmit={submitComment} className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <input
                                className="border rounded p-2"
                                placeholder="닉네임"
                                value={cNickname}
                                onChange={(e) => setCNickname(e.target.value)}
                                maxLength={64}
                                required
                            />
                            <input
                                type="password"
                                className="border rounded p-2"
                                placeholder="비밀번호 (최소 3자)"
                                value={cPassword}
                                onChange={(e) => setCPassword(e.target.value)}
                                minLength={3}
                                required
                            />
                            <div />
                        </div>
                        <textarea
                            className="w-full border rounded p-2 min-h-[100px]"
                            placeholder="댓글 내용을 입력하세요."
                            value={cContent}
                            onChange={(e) => setCContent(e.target.value)}
                            maxLength={5000}
                            required
                        />
                        <div>
                            <button
                                type="submit"
                                disabled={submittingComment}
                                className="rounded bg-neutral-900 text-white px-4 py-2 disabled:opacity-50"
                            >
                                {submittingComment ? '등록 중…' : '댓글 등록'}
                            </button>
                        </div>
                    </form>

                    {/* ---------- 댓글 목록 ---------- */}
                    <ul className="mt-6 space-y-4">
                        {comments.map((c) => (
                            <li key={c.id} className="rounded border border-neutral-200 bg-white p-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="text-sm text-neutral-600">
                                        <span className="font-semibold text-neutral-900">{c.nickname}</span>{' '}
                                        <span className="text-neutral-400">{c.createDate}</span>
                                        {c.updateYn === 'Y' && <span className="ml-1 text-neutral-400">(수정됨)</span>}
                                    </div>
                                    <div className="shrink-0 flex gap-2">
                                        <button
                                            onClick={() => openEditComment(c)}
                                            className="px-2 py-1 rounded border text-sm"
                                        >
                                            수정
                                        </button>
                                        <button
                                            onClick={() => openDeleteComment(c)}
                                            className="px-2 py-1 rounded border text-sm text-red-600 border-red-300"
                                        >
                                            삭제
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-2 whitespace-pre-wrap text-sm">{c.content}</div>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* -------- 모달들 -------- */}

                {/* 글 수정 비번 */}
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
                                <button onClick={() => setShowEdit(false)} className="px-3 py-2 rounded border">취소</button>
                                <button onClick={verifyThenGoEdit} className="px-3 py-2 rounded bg-neutral-800 text-white">확인</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 글 삭제 비번 */}
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
                                <button onClick={() => setShowDelete(false)} className="px-3 py-2 rounded border">취소</button>
                                <button onClick={doDelete} className="px-3 py-2 rounded bg-red-600 text-white">삭제</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 댓글 수정 모달 */}
                {editCommentId !== null && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
                        <div className="bg-white rounded p-4 w-full max-w-md">
                            <h2 className="text-lg font-bold mb-3">댓글 수정</h2>
                            <textarea
                                className="w-full border rounded p-2 min-h-[120px]"
                                value={editCommentContent}
                                onChange={(e) => setEditCommentContent(e.target.value)}
                            />
                            <input
                                type="password"
                                className="w-full border rounded p-2 mt-3"
                                placeholder="비밀번호"
                                value={editCommentPw}
                                onChange={(e) => setEditCommentPw(e.target.value)}
                            />
                            <div className="mt-4 flex justify-end gap-2">
                                <button onClick={() => setEditCommentId(null)} className="px-3 py-2 rounded border">취소</button>
                                <button onClick={doEditComment} className="px-3 py-2 rounded bg-neutral-800 text-white">저장</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 댓글 삭제 모달 */}
                {deleteCommentId !== null && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
                        <div className="bg-white rounded p-4 w-full max-w-sm">
                            <h2 className="text-lg font-bold mb-3">댓글 삭제</h2>
                            <input
                                type="password"
                                className="w-full border rounded p-2"
                                placeholder="비밀번호"
                                value={deleteCommentPw}
                                onChange={(e) => setDeleteCommentPw(e.target.value)}
                            />
                            <div className="mt-4 flex justify-end gap-2">
                                <button onClick={() => setDeleteCommentId(null)} className="px-3 py-2 rounded border">취소</button>
                                <button onClick={doDeleteComment} className="px-3 py-2 rounded bg-red-600 text-white">삭제</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
