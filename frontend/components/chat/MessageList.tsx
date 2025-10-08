'use client';

import { useEffect, useRef } from 'react';
import { useChat } from '@/app/chat/ChatProvider';
import MessageBubble from './MessageBubble';

export default function MessageList() {
    const { messages } = useChat();
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
    }, [messages]);

    return (
        <div
            ref={ref}
            className="flex-1 overflow-y-auto px-3 py-2 space-y-2 bg-neutral-50 dark:bg-neutral-950"
        >
            {messages.map((m) => (
                <MessageBubble key={m.id} msg={m} />
            ))}
        </div>
    );
}
