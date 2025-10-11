package com.life.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CommentDTO {
    private Long id;
    private Long postId;
    private String nickname;
    private String content;
    private String createDate;
    private String updateDate;
    private String updateYn;
    private String deleteYn;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String password;
}