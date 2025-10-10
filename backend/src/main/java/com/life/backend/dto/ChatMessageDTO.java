package com.life.backend.dto;

import lombok.Data;

@Data
public class ChatMessageDTO {
    private String id;        // 추가
    private String sender;    // senderId 개념
    private String nickname;  // 익명 닉네임
    private String text;
    private long createdAt;
}
