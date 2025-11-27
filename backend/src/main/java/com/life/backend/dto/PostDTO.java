package com.life.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
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
    private Integer commentCount;
    private String updateYn;
    private String deleteYn;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String password;
}