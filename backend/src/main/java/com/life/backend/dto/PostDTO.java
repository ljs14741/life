package com.life.backend.dto;

import lombok.Getter; import lombok.Setter;

@Getter @Setter
public class PostDTO {
    private Long id;
    private String clientReqId;
    private String categoryCode;
    private String categoryName;
    private String title;
    private String content;
    private String authorId;
    private String authorNick;
    private String createDate;
    private String updateDate;
    private Integer views;
    private Integer likes;
}