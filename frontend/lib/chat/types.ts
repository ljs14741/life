export type ChatRole = 'user' | 'bot' | 'system';

export interface ChatMessage {
    id: string;          // 메시지 고유ID
    role: ChatRole;
    text: string;
    createdAt: number;
    senderId?: string;   // 보낸 사람 식별자 (익명)
    nickname?: string;   // 익명 닉네임
}

export interface ChatState {
    isOpen: boolean;
    messages: ChatMessage[];
}

export interface ChatContextValue extends ChatState {
    open: () => void;
    close: () => void;
    toggle: () => void;
    send: (text: string) => void;
    clear: () => void;
}
