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
@Table(name = "category")
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable=false, unique=true, length=32)
    private String code;

    @Column(nullable=false, length=32)
    private String name;

    // DB DEFAULT CURRENT_TIMESTAMP / ON UPDATE CURRENT_TIMESTAMP 사용
    @Column(name = "create_date", insertable = false, updatable = false, nullable = false)
    @Generated(GenerationTime.INSERT)
    private LocalDateTime createDate;

    @Column(name = "update_date", insertable = false, updatable = false, nullable = false)
    @Generated(GenerationTime.ALWAYS)
    private LocalDateTime updateDate;
}