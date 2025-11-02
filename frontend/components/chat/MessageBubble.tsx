'use client';

import { ChatMessage } from '@/lib/chat/types';
import clsx from 'clsx';

function formatChatTimestamp(epochMs?: number): string {
    if (!epochMs) return '';

    const d = new Date(epochMs);

    // YYYY-MM-DD
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');

    // 오후/오전 H:MM:SS
    const hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');

    const ampm = hours >= 12 ? '오후' : '오전';
    const displayHours = (hours % 12 || 12).toString(); // 12시 형식

    return `${year}-${month}-${day} ${ampm} ${displayHours}:${minutes}:${seconds}`;
}

export default function MessageBubble({ msg }: { msg: ChatMessage }) {
    const isUser = msg.role === 'user';
    const isSystem = msg.role === 'system';

    return (
        <div className={clsx('flex', isUser ? 'justify-end' : 'justify-start')}>
            <div
                className={clsx(
                    'max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words',
                    isSystem
                        ? 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100'
                        : isUser
                            ? 'bg-blue-600 text-white'
                            : 'bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50'
                )}
            >
                {/* 닉네임 */}
                {!isSystem && (
                    <div className="text-[10px] opacity-80 mb-1">
                        {msg.nickname ?? '익명'}{isUser ? ' (나)' : ''}
                    </div>
                )}
                {msg.text}
                <div className="mt-1 text-[10px] opacity-70">
                    {formatChatTimestamp(msg.createdAt)}
                </div>
            </div>
        </div>
    );
}