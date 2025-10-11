package com.life.backend.repository;

import com.life.backend.entity.Category;
import com.life.backend.entity.Post;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, Long> {
    @Query("""
        select p
          from Post p
         where p.deleteYn = 'N'
           and (:cat is null or p.category = :cat)
           and (:q is null or
                lower(p.title) like concat('%', lower(:q), '%')
                 or p.content    like concat('%', :q, '%'))
         order by p.createDate desc
    """)
    List<Post> findList(@Param("cat") Category cat,
                        @Param("q") String q,
                        Pageable pageable);

    Optional<Post> findByClientReqId(String clientReqId);
}