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
@Table(
        name = "post",
        indexes = {
                @Index(name = "idx_cat_date", columnList = "category_id,create_date"),
                @Index(name = "idx_date",     columnList = "create_date"),
                @Index(name = "idx_author",   columnList = "author_id")
        }
)
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="client_req_id", length=36, unique = true)
    private String clientReqId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable=false)
    private Category category;

    @Column(nullable=false, length=120)
    private String title;

    @Lob
    @Column(name = "content", columnDefinition = "MEDIUMTEXT", nullable = false)
    private String content;

    @Column(name="author_id", nullable=false, length=64)
    private String authorId;

    @Column(name="author_nick", nullable=false, length=64)
    private String authorNick;

    @Column(nullable=false)
    private int views = 0;

    @Column(nullable=false)
    private int likes = 0;

    @Column(name="is_deleted", nullable=false)
    private boolean deleted = false;

    @Column(name = "create_date", insertable = false, updatable = false, nullable = false)
    @Generated(GenerationTime.INSERT)
    private LocalDateTime createDate;

    @Column(name = "update_date", insertable = false, updatable = false, nullable = false)
    @Generated(GenerationTime.ALWAYS)
    private LocalDateTime updateDate;
}