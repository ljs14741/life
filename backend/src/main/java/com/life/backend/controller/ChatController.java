package com.life.backend.controller;

import com.life.backend.dto.ChatMessageDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.util.UUID;

@Controller
@Slf4j
public class ChatController {

    @MessageMapping("/chat/send")       // publish: /app/chat/send
    @SendTo("/topic/room/public")       // subscribe: /topic/room/public
    public ChatMessageDTO send(ChatMessageDTO msg) {
        if (msg.getId() == null) msg.setId(UUID.randomUUID().toString());
        log.info("Message received: {}", msg);
        msg.setCreatedAt(System.currentTimeMillis());
        return msg;
    }
}