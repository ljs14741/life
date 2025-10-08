'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ChatContextValue, ChatMessage } from '@/lib/chat/types';
import { maskProfanity } from '@/lib/moderation/profanity';
import { canSendNow } from '@/lib/moderation/rateLimit';

const ChatCtx = createContext<ChatContextValue | null>(null);
const STORAGE_KEY = 'imangmo_chat_v1';

export function ChatProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    // 복원
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) setMessages(JSON.parse(raw));
        } catch {}
    }, []);

    // 저장
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
        } catch {}
    }, [messages]);

    function addMessage(msg: ChatMessage) {
        setMessages((prev) => [...prev, msg]);
    }

    function send(text: string) {
        if (!text.trim()) return;
        if (!canSendNow()) {
            addMessage({
                id: crypto.randomUUID(),
                role: 'system',
                text: '메시지 전송이 너무 빠릅니다. 잠시 후 다시 시도하세요.',
                createdAt: Date.now(),
            });
            return;
        }
        const cleaned = maskProfanity(text);
        const userMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            text: cleaned,
            createdAt: Date.now(),
        };
        addMessage(userMsg);

        // 임시 에코봇 (UI 테스트용)
        setTimeout(() => {
            addMessage({
                id: crypto.randomUUID(),
                role: 'bot',
                text: `에코: ${cleaned}`,
                createdAt: Date.now(),
            });
        }, 300);
    }

    const value: ChatContextValue = useMemo(
        () => ({
            isOpen,
            messages,
            open: () => setIsOpen(true),
            close: () => setIsOpen(false),
            toggle: () => setIsOpen((v) => !v),
            send,
            clear: () => setMessages([]),
        }),
        [isOpen, messages]
    );

    return <ChatCtx.Provider value={value}>{children}</ChatCtx.Provider>;
}

export function useChat() {
    const v = useContext(ChatCtx);
    if (!v) throw new Error('useChat must be used within <ChatProvider>');
    return v;
}
