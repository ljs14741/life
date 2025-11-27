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

    @Query("""
        SELECT c.post.id, COUNT(c)
        FROM Comment c
        WHERE c.post.id IN :postIds AND c.deleteYn = 'N'
        GROUP BY c.post.id
    """)
    List<Object[]> countActiveCommentsByPostIds(List<Long> postIds);
}