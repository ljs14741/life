import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export function createChatClient(baseUrl: string): Client {
    return new Client({
        webSocketFactory: () => new SockJS(`${baseUrl}/ws-chat`),
        reconnectDelay: 2000,
    });
}