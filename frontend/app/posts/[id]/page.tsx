'use client';

import useSWR from 'swr';
import { useParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';
type Post = {
    id: number; categoryName: string; title: string; content: string;
    authorNick: string; createDate: string;
};
const fetcher = (u: string) => fetch(u, { cache: 'no-store' }).then(r => r.json() as Promise<Post>);

export default function PostDetail() {
    const { id } = useParams<{ id: string }>();
    const { data: p } = useSWR(id ? `${API}/api/posts/${id}` : null, fetcher);
    if (!p) return null;

    return (
        <main className="mx-auto max-w-3xl px-4 py-8">
            <div className="mb-2 text-xs text-neutral-500">{p.categoryName} · {p.createDate}</div>
            <h1 className="text-2xl font-bold">{p.title}</h1>
            <div className="mt-1 text-sm text-neutral-500">{p.authorNick}</div>
            <article className="prose prose-neutral dark:prose-invert mt-6 whitespace-pre-wrap">{p.content}</article>
        </main>
    );
}