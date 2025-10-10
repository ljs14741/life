package com.life.backend.service;

import com.life.backend.dto.ChatMessageDTO;
import com.life.backend.entity.ChatMessage;
import com.life.backend.repository.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatService {
    private final ChatMessageRepository repo;
    private static final ZoneId ZONE = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter F = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public ChatMessage saveIncoming(ChatMessageDTO dto) {
        ChatMessage m = new ChatMessage();
        m.setId(dto.getId() != null ? dto.getId() : UUID.randomUUID().toString());
        m.setSenderId(dto.getSender());
        m.setNickname(dto.getNickname());
        m.setText(dto.getText());
        m.setCreateDate(LocalDateTime.now(ZONE));
        return repo.save(m);
    }

    public List<ChatMessage> history(LocalDateTime before, int limit) {
        LocalDateTime b = (before != null) ? before : LocalDateTime.now(ZONE);
        return repo.findByCreateDateLessThanEqualOrderByCreateDateDesc(
                b, PageRequest.of(0, Math.max(1, Math.min(limit, 200))));
    }

    public static ChatMessageDTO toDTO(ChatMessage m) {
        ChatMessageDTO d = new ChatMessageDTO();
        d.setId(m.getId());
        d.setSender(m.getSenderId());
        d.setNickname(m.getNickname());
        d.setText(m.getText());
        d.setCreateDate(m.getCreateDate().format(F)); // 원하는 포맷으로 내려줌
        return d;
    }
}