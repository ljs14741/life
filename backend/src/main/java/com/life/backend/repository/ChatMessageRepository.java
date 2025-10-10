package com.life.backend.repository;

import com.life.backend.entity.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, String> {
    List<ChatMessage> findByCreateDateLessThanEqualOrderByCreateDateDesc(
            LocalDateTime before, Pageable pageable);
}