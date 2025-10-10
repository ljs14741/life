package com.life.backend.dto;

import lombok.Data;

@Data
public class ChatMessageDTO {
    private String sender;
    private String text;
    private long createdAt;
}
