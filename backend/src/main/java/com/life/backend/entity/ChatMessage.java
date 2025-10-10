package com.life.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat_message",
        indexes = {
                @Index(name = "idx_create_date", columnList = "create_date"),
                @Index(name = "idx_sender",      columnList = "sender_id")
        }
)
@Getter @Setter
public class ChatMessage {

    @Id
    @Column(name = "id", length = 36, nullable = false)
    private String id;

    @Column(name = "sender_id", length = 64, nullable = false)
    private String senderId;

    @Column(name = "nickname", length = 64, nullable = false)
    private String nickname;

    @Lob
    @Column(name = "text", nullable = false)
    private String text;

    @Column(name = "create_date", nullable = false)
    private LocalDateTime createDate;
}