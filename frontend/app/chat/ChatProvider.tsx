'use client';

import type { PropsWithChildren } from 'react';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ChatContextValue, ChatMessage } from '@/lib/chat/types';
import { maskProfanity } from '@/lib/moderation/profanity';
import { canSendNow } from '@/lib/moderation/rateLimit';
import { Client, IMessage } from '@stomp/stompjs';
import { createChatClient } from '@/lib/ws/client';

const ChatCtx = createContext<ChatContextValue | null>(null);
const STORAGE_KEY = 'imangmo_chat_v1';

export function ChatProvider({ children }: PropsWithChildren) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const clientRef = useRef<Client | null>(null);

    // 1) 로컬 복원
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) setMessages(JSON.parse(raw));
        } catch {/* noop */}
    }, []);

    // 2) 로컬 저장
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
        } catch {/* noop */}
    }, [messages]);

    const add = (m: ChatMessage) => setMessages(prev => [...prev, m]);

    // 3) STOMP 연결  (※ async/await 사용하지 않기)
    useEffect(() => {
        const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';
        const client = createChatClient(base);

        client.onConnect = () => {
            client.subscribe('/topic/room/public', (frame: IMessage) => {
                try {
                    const p = JSON.parse(frame.body) as { sender: string; text: string; createdAt: number };
                    add({ id: crypto.randomUUID(), role: 'bot', text: p.text, createdAt: p.createdAt });
                } catch {
                    add({ id: crypto.randomUUID(), role: 'system', text: '수신 파싱 오류', createdAt: Date.now() });
                }
            });
        };

        client.onStompError = () => {
            add({ id: crypto.randomUUID(), role: 'system', text: '서버 STOMP 에러', createdAt: Date.now() });
        };

        client.onWebSocketClose = () => {
            add({ id: crypto.randomUUID(), role: 'system', text: '연결 종료', createdAt: Date.now() });
        };

        client.activate();
        clientRef.current = client;

        // cleanup은 함수만 반환
        return () => {
            client.deactivate(); // Promise를 반환하지만 여기서 결과를 사용하지 않아도 됨
        };
    }, []);

    // 4) 전송
    function send(text: string) {
        if (!text.trim()) return;

        if (!canSendNow()) {
            add({ id: crypto.randomUUID(), role: 'system', text: '잠시 후 다시 시도하세요.', createdAt: Date.now() });
            return;
        }

        const cleaned = maskProfanity(text);
        add({ id: crypto.randomUUID(), role: 'user', text: cleaned, createdAt: Date.now() });

        const c = clientRef.current;
        if (c?.connected) {
            c.publish({
                destination: '/app/chat/send',
                body: JSON.stringify({ sender: 'user1', text: cleaned }),
            });
        } else {
            add({ id: crypto.randomUUID(), role: 'system', text: '서버 연결 대기중…', createdAt: Date.now() });
        }
    }

    const value: ChatContextValue = useMemo(() => ({
        isOpen,
        messages,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen(v => !v),
        send,
        clear: () => setMessages([]),
    }), [isOpen, messages]);

    return <ChatCtx.Provider value={value}>{children}</ChatCtx.Provider>;
}

export function useChat() {
    const v = useContext(ChatCtx);
    if (!v) throw new Error('useChat must be used within <ChatProvider>');
    return v;
}
