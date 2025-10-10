'use client';

import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    PropsWithChildren,
} from 'react';
import type { ChatMessage, ChatContextValue } from '@/lib/chat/types';
import { canSendNow } from '@/lib/moderation/rateLimit';
import { maskProfanity } from '@/lib/moderation/profanity';
import { Client, IMessage } from '@stomp/stompjs';
import { createChatClient } from '@/lib/ws/client'; // SockJS로 ${BASE}/ws-chat

// --- 유틸/상수 ---
const MSGS_KEY = 'imangmo_chat_msgs_v1';
const PROFILE_KEY = 'imangmo_profile_v1';

type Profile = { senderId: string; nickname: string };
type Payload = { id?: string; sender?: string; nickname?: string; text: string; createdAt?: number };

function makeNickname() {
    const adj = ['절망의', '희망의', '근성의', '눈물의', '개미지옥', '불굴의', '추락한', '부활한'];
    const ani = ['돌고래', '사자', '두더지', '너구리', '펭귄', '두루미', '고양이', '강아지'];
    const tag = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `${adj[Math.floor(Math.random()*adj.length)]} ${ani[Math.floor(Math.random()*ani.length)]}#${tag}`;
}
const uuid = () =>
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = (Math.random()*16)|0, v = c==='x'?r:(r&0x3)|0x8; return v.toString(16);
        });

// --- 컨텍스트 ---
const ChatCtx = createContext<ChatContextValue | null>(null);
export const useChat = () => {
    const v = useContext(ChatCtx);
    if (!v) throw new Error('useChat must be used within ChatProvider');
    return v;
};

// --- Provider ---
export function ChatProvider({ children }: PropsWithChildren) {
    const [isOpen, setIsOpen] = useState(false);
    const [connected, setConnected] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [profileState, setProfileState] = useState<Profile | null>(null);

    const clientRef = useRef<Client | null>(null);
    const messagesRef = useRef<ChatMessage[]>([]);
    const profileRef = useRef<Profile | null>(null);

    useEffect(() => { messagesRef.current = messages; }, [messages]);

    // 1) 프로필/메시지 초기화
    useEffect(() => {
        try {
            const pSaved = localStorage.getItem(PROFILE_KEY);
            if (pSaved) {
                profileRef.current = JSON.parse(pSaved) as Profile;
            } else {
                const p = { senderId: uuid(), nickname: makeNickname() };
                profileRef.current = p;
                localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
            }
            setProfileState(profileRef.current);
        } catch {/* noop */}

        try {
            const raw = localStorage.getItem(MSGS_KEY);
            if (raw) setMessages(JSON.parse(raw));
        } catch {/* noop */}
    }, []);

    // 2) 메시지 영속화
    useEffect(() => {
        try { localStorage.setItem(MSGS_KEY, JSON.stringify(messages)); } catch {/* noop */}
    }, [messages]);

    const add = (m: ChatMessage) => setMessages(prev => [...prev, m]);

    // 3) STOMP(SockJS) 연결
    useEffect(() => {
        const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';
        const client = createChatClient(base); // ✅ SockJS로 `${base}/ws-chat` 사용
        client.onConnect = () => {
            setConnected(true);

            client.subscribe('/topic/room/public', (frame: IMessage) => {
                try {
                    const p = JSON.parse(frame.body) as Payload;

                    const id = p.id ?? uuid(); // 서버에서 id 안 주면 생성
                    if (messagesRef.current.some(m => m.id === id)) return; // 중복 방지

                    const me = profileRef.current;
                    const isMine = !!(p.sender && me && p.sender === me.senderId);

                    add({
                        id,
                        role: isMine ? 'user' : 'bot',
                        text: p.text,
                        createdAt: p.createdAt ?? Date.now(),
                        senderId: p.sender,
                        nickname: p.nickname ?? (isMine ? me?.nickname : '익명'),
                    });
                } catch {
                    add({ id: uuid(), role: 'system', text: '수신 파싱 오류', createdAt: Date.now() });
                }
            });

            add({ id: uuid(), role: 'system', text: '연결됨', createdAt: Date.now() });
        };

        client.onStompError = () => {
            setConnected(false);
            add({ id: uuid(), role: 'system', text: '서버 STOMP 에러', createdAt: Date.now() });
        };
        client.onWebSocketClose = () => {
            setConnected(false);
            add({ id: uuid(), role: 'system', text: '연결 종료', createdAt: Date.now() });
        };

        client.activate();
        clientRef.current = client;

        return () => { client.deactivate(); clientRef.current = null; };
    }, []);

    // 4) 닉네임 변경
    const setNickname = (nickname: string) => {
        const cur = profileRef.current; if (!cur) return;
        const next = { ...cur, nickname: nickname.trim() || cur.nickname };
        profileRef.current = next; setProfileState(next);
        try { localStorage.setItem(PROFILE_KEY, JSON.stringify(next)); } catch {/* noop */}
    };

    // 5) 전송
    const send = (text: string) => {
        const t = maskProfanity(text).trim();
        if (!t) return;

        const c = clientRef.current;
        const me = profileRef.current;
        if (!c || !c.connected || !me) {
            add({ id: uuid(), role: 'system', text: '서버 연결 대기중…', createdAt: Date.now() });
            return;
        }

        const id = uuid();
        if (!canSendNow()) {
            add({ id, role: 'system', text: '잠시 후 다시 시도해주세요.', createdAt: Date.now() });
            return;
        }

        c.publish({
            destination: '/app/chat/send',
            body: JSON.stringify({
                id,                 // 서버가 그대로 브로드캐스트해주면 중복 방지에 사용
                sender: me.senderId,
                nickname: me.nickname,
                text: t,
                // createdAt는 서버에서 채워도 OK
            }),
        });

        // 즉시 보이고 싶다면 아래 주석 해제(서버 수신 시 같은 id로 들어오므로 중복 무시)
        // add({ id, role: 'user', text: t, createdAt: Date.now(), senderId: me.senderId, nickname: me.nickname });
    };

    // 6) 창/클리어
    const open = () => setIsOpen(true);
    const close = () => setIsOpen(false);
    const toggle = () => setIsOpen(v => !v);
    const clear = () => setMessages([]);

    const value = useMemo<ChatContextValue>(() => ({
        isOpen, connected, messages, profile: profileState,
        open, close, toggle, send, clear, setNickname,
    }), [isOpen, connected, messages, profileState]);

    return <ChatCtx.Provider value={value}>{children}</ChatCtx.Provider>;
}
