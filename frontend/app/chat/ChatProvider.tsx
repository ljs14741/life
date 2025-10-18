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
import { maskProfanity } from '@/lib/moderation/profanity';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { createChatClient } from '@/lib/ws/client'; // SockJS로 `${API_BASE}/ws-chat` 접속

// ===== 타입 =====
export type ChatRole = 'user' | 'bot' | 'system';
export interface ChatMessage {
    id: string;
    role: ChatRole;
    text: string;
    createdAt: number;    // 프론트 내부 표시에 쓰는 epoch ms
    senderId?: string;
    nickname?: string;
}

type Profile = { senderId: string; nickname: string };

type ChatContextValue = {
    isOpen: boolean;
    connected: boolean;            // ✅ ChatDock에서 배지로 사용
    messages: ChatMessage[];
    profile: Profile | null;

    open: () => void;
    close: () => void;
    toggle: () => void;

    send: (text: string) => void;
    clear: () => void;
    setNickname: (nickname: string) => void;
};

// ===== 유틸/상수 =====
const PROFILE_KEY = 'imangmo_profile_v1';
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

function uuid() {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
function hashStr(s: string) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
}
function makeNicknameDeterministic(senderId: string) {
    const adj = ['절망의','희망의','근성의','눈물의','개미지옥','불굴의','추락한','부활한'];
    const ani = ['돌고래','사자','두더지','너구리','펭귄','두루미','고양이','강아지'];
    const h = hashStr(senderId);
    const a = adj[h % adj.length];
    const b = ani[(h >>> 8) % ani.length];
    const tag = (h % 100000).toString().padStart(5, '0'); // 5자리
    return `${a} ${b}#${tag}`;
}

// ===== 컨텍스트 =====
const ChatContext = createContext<ChatContextValue | null>(null);
export const useChat = () => {
    const ctx = useContext(ChatContext);
    if (!ctx) throw new Error('useChat must be used within ChatProvider');
    return ctx;
};

// ===== Provider =====
export function ChatProvider({ children }: PropsWithChildren) {
    const [isOpen, setIsOpen] = useState(false);
    const [connected, setConnected] = useState(false);              // ✅
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [profileState, setProfileState] = useState<Profile | null>(null);

    const clientRef = useRef<Client | null>(null);
    const subRef = useRef<StompSubscription | null>(null);
    const messagesRef = useRef<ChatMessage[]>([]);
    const profileRef = useRef<Profile | null>(null);
    const activatedRef = useRef(false);                             // ✅ StrictMode 중복 방지

    useEffect(() => { messagesRef.current = messages; }, [messages]);

    // 프로필 초기화 (senderId/nickname만 로컬에 유지)
    useEffect(() => {
        try {
            const saved = localStorage.getItem(PROFILE_KEY);
            if (saved) {
                profileRef.current = JSON.parse(saved) as Profile;
            } else {
                const senderId = uuid();
                const nickname = makeNicknameDeterministic(senderId);
                const p: Profile = { senderId, nickname };
                profileRef.current = p;
                localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
            }
            setProfileState(profileRef.current);
        } catch {
            // 무시
        }
    }, []);

    const add = (m: ChatMessage) => setMessages(prev => [...prev, m]);

    // 히스토리 로딩 (최근 N개)
    const loadHistory = async (limit = 50) => {
        try {
            const res = await fetch(`${API_BASE}/api/chat/messages?limit=${limit}`, { cache: 'no-store' });
            const arr = await res.json() as Array<{
                id: string; sender: string; nickname: string; text: string; createDate: string;
            }>;
            // 서버가 최신→과거 순이면 시간순으로 뒤집기
            const ordered = arr.reverse().map(p => {
                const createdAt = parseCreateDate(p.createDate);
                const me = profileRef.current;
                const isMine = !!(me && p.sender === me.senderId);
                return {
                    id: p.id,
                    role: isMine ? 'user' : 'bot',
                    text: maskProfanity(p.text),
                    createdAt,
                    senderId: p.sender,
                    nickname: p.nickname,
                } as ChatMessage;
            });
            setMessages(ordered);
        } catch (e) {
            // 히스토리 로드 실패해도 UI는 계속 동작하도록 조용히 처리
            // console.error('history load failed', e);
        }
    };

    // "yyyy-MM-dd HH:mm:ss" → epoch ms
    function parseCreateDate(s?: string): number {
        if (!s) return Date.now();
        const iso = s.replace(' ', 'T');      // "yyyy-MM-ddTHH:mm:ss"
        const d = new Date(iso + '+09:00');   // KST
        return isNaN(d.getTime()) ? Date.now() : d.getTime();
        // 서버가 UTC로 내려주면 그냥 new Date(s).getTime()로 바꾸면 됨
    }

    // 메시지 수신 콜백
    const onMessage = (frame: IMessage) => {
        try {
            const p = JSON.parse(frame.body) as {
                id?: string; sender?: string; nickname?: string; text?: string; createDate?: string;
            };
            const id = p.id ?? uuid();
            if (messagesRef.current.some(m => m.id === id)) return; // 중복 방지

            const me = profileRef.current;
            const isMine = !!(p.sender && me && p.sender === me.senderId);
            const createdAt = parseCreateDate(p.createDate);

            add({
                id,
                role: isMine ? 'user' : 'bot',
                text: maskProfanity(p.text ?? ''),
                createdAt,
                senderId: p.sender,
                nickname: p.nickname ?? '익명',
            });
        } catch (e) {
            // console.error('WS parse error', e, frame.body);
        }
    };

    // STOMP 연결 (시스템 메시지는 목록에 넣지 않음)
    useEffect(() => {
        if (activatedRef.current) return;       // ✅ StrictMode 중복 방지
        activatedRef.current = true;

        const client = createChatClient(API_BASE); // SockJS 클라이언트
        client.reconnectDelay = 5000;
        client.debug = () => {}; // 콘솔 스팸 방지(선택)

        client.onConnect = async () => {
            setConnected(true);

            // 1) DB에서 최근 히스토리 먼저
            await loadHistory(50);

            // 2) 실시간 구독
            if (subRef.current) { try { subRef.current.unsubscribe(); } catch {} }
            subRef.current = client.subscribe('/topic/public', onMessage);
        };

        client.onStompError = () => { setConnected(false); };
        client.onWebSocketClose = () => { setConnected(false); };

        client.activate();
        clientRef.current = client;

        return () => {
            try { if (subRef.current) subRef.current.unsubscribe(); } catch {}
            try { client.deactivate(); } catch {}
            clientRef.current = null;
        };
    }, []);

    // 전송 (서버가 저장 → 방송 → 수신으로 렌더)
    const send = (text: string) => {
        const t = text.trim();
        if (!t) return;

        const c = clientRef.current;
        const me = profileRef.current;
        if (!c || !c.connected || !me) return;

        const id = uuid();
        c.publish({
            destination: '/app/chat/send',
            body: JSON.stringify({
                id,
                sender: me.senderId,
                nickname: me.nickname,
                text: t,
            }),
        });

        // 즉시 표시가 필요하면 아래를 주석 해제 (수신 시 같은 id는 무시)
        // add({ id, role: 'user', text: t, createdAt: Date.now(), senderId: me.senderId, nickname: me.nickname });
    };

    const clear = () => setMessages([]);
    const open = () => setIsOpen(true);
    const close = () => setIsOpen(false);
    const toggle = () => setIsOpen(v => !v);

    const setNickname = (nickname: string) => {
        const cur = profileRef.current; if (!cur) return;
        const next = { ...cur, nickname: nickname.trim() || cur.nickname };
        profileRef.current = next;
        setProfileState(next);
        try { localStorage.setItem(PROFILE_KEY, JSON.stringify(next)); } catch {}
    };

    const value = useMemo<ChatContextValue>(() => ({
        isOpen, connected, messages, profile: profileState,
        open, close, toggle, send, clear, setNickname,
    }), [isOpen, connected, messages, profileState]);

    return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
