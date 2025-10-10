package com.life.backend.controller;

import com.life.backend.dto.ChatMessageDTO;
import com.life.backend.service.ChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Slf4j
@RestController                 // ★ REST + STOMP 둘 다 가능
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    // ====== STOMP (소켓) ======
    // publish:   /app/chat/send
    // subscribe: /topic/public
    @MessageMapping("/chat/send")
    @SendTo("/topic/public")
    public ChatMessageDTO onSocketMessage(ChatMessageDTO msg) {
        if (msg.getId() == null) msg.setId(UUID.randomUUID().toString());
        log.info("WS message in: {}", msg);

        // DB 저장 후 저장값을 브로드캐스트 (createdAt 확정)
        var saved = chatService.saveIncoming(msg);
        return ChatService.toDTO(saved);
    }

    // ====== REST (HTTP) ======
    // 히스토리: 최초 진입/무한스크롤 로딩
    // GET /api/chat/messages?before=timestamp&limit=50
    @GetMapping("/api/chat/messages")
    public List<ChatMessageDTO> history(
            @RequestParam(required = false)
            @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") String before,
            @RequestParam(defaultValue = "50") int limit) {

        LocalDateTime b = (before != null && !before.isBlank())
                ? LocalDateTime.parse(before, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
                : null;

        return chatService.history(b, limit).stream().map(ChatService::toDTO).toList();
    }
}