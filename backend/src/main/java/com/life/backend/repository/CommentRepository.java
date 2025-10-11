package com.life.backend.repository;

import com.life.backend.entity.Comment;
import com.life.backend.entity.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    @Query("""
        select c from Comment c
        where c.post = :post and c.deleteYn = 'N'
        order by c.createDate asc
    """)
    List<Comment> findActiveByPost(Post post);
}