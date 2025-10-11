package com.life.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Generated;
import org.hibernate.annotations.GenerationTime;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "comment", indexes = {
        @Index(name="idx_post_date", columnList = "post_id, create_date")
})
public class Comment {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name="post_id", nullable = false)
    private Post post;

    @Column(nullable=false, length=64)
    private String nickname;

    @Column(name="comment_password_hash", nullable=false, length=255)
    private String commentPasswordHash;

    @Lob
    @Column(nullable=false)
    private String content;

    @Column(name="update_yn", nullable=false, columnDefinition = "char(1) default 'N'")
    private String updateYn = "N";

    @Column(name="delete_yn", nullable=false, columnDefinition = "char(1) default 'N'")
    private String deleteYn = "N";

    @Column(name = "create_date", insertable = false, updatable = false, nullable = false)
    @Generated(GenerationTime.INSERT)
    private LocalDateTime createDate;

    @Column(name = "update_date", insertable = false, updatable = false, nullable = false)
    @Generated(GenerationTime.ALWAYS)
    private LocalDateTime updateDate;

    public boolean isDeleted() { return "Y".equalsIgnoreCase(deleteYn); }
}
