package com.life.backend.service;

import com.life.backend.dto.PostDTO;
import com.life.backend.entity.Category;
import com.life.backend.entity.Post;
import com.life.backend.repository.CategoryRepository;
import com.life.backend.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.*;


@Service
@RequiredArgsConstructor
public class PostService {
    private final PostRepository postRepo;
    private final CategoryRepository catRepo;

    private static final DateTimeFormatter F = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Transactional
    public PostDTO create(PostDTO in) throws Throwable {
        if (in.getClientReqId() == null || in.getClientReqId().isBlank()) {
            throw new IllegalArgumentException("missing clientReqId"); // ← 선택이지만 강력추천
        }

        // 1) 멱등키로 선조회
        var dup = postRepo.findByClientReqId(in.getClientReqId());
        if (dup.isPresent()) return toDTO(dup.get());

        Category c = catRepo.findByCode(in.getCategoryCode())
                .orElseThrow(() -> new IllegalArgumentException("invalid category"));

        Post p = new Post();
        p.setClientReqId(in.getClientReqId());  // ✅ 꼭 저장해야 함
        p.setCategory(c);
        p.setTitle(in.getTitle());
        p.setContent(in.getContent());
        p.setAuthorId(in.getAuthorId());
        p.setAuthorNick(in.getAuthorNick());

        try {
            postRepo.save(p);
        } catch (DataIntegrityViolationException e) {
            // 2) 경쟁상황에서 UNIQUE 충돌 시 기존 레코드 반환
            return postRepo.findByClientReqId(in.getClientReqId())
                    .map(this::toDTO).orElseThrow(e::getCause);
        }
        return toDTO(p);
    }

    @Transactional
    public PostDTO update(Long id, PostDTO in, String authorId) {
        Post p = postRepo.findById(id).orElseThrow();
        if (!p.getAuthorId().equals(authorId)) throw new RuntimeException("FORBIDDEN");

        if (in.getTitle()!=null)   p.setTitle(in.getTitle());
        if (in.getContent()!=null) p.setContent(in.getContent());
        if (in.getCategoryCode()!=null) {
            Category c = catRepo.findByCode(in.getCategoryCode()).orElseThrow();
            p.setCategory(c);
        }
        postRepo.save(p);
        return toDTO(p);
    }

    @Transactional
    public void delete(Long id, String authorId) {
        Post p = postRepo.findById(id).orElseThrow();
        if (!p.getAuthorId().equals(authorId)) throw new RuntimeException("FORBIDDEN");
        p.setDeleted(true);
        postRepo.save(p);
    }

    @Transactional(readOnly = true)
    public List<PostDTO> list(String categoryCode, String q, int page, int size) {
        Category c = null;
        if (categoryCode != null && !categoryCode.isBlank()) {
            c = catRepo.findByCode(categoryCode).orElse(null);
        }
        var list = postRepo.findList(c, (q==null||q.isBlank())?null:q, PageRequest.of(page, size));
        return list.stream().map(this::toDTO).toList();
    }

    @Transactional(readOnly = true)
    public PostDTO get(Long id) {
        Post p = postRepo.findById(id).orElseThrow();
        return toDTO(p);
    }

    @Transactional
    public int like(Long id) {
        Post p = postRepo.findById(id).orElseThrow();
        p.setLikes(p.getLikes()+1);
        postRepo.save(p);
        return p.getLikes();
    }

    private PostDTO toDTO(Post p) {
        PostDTO d = new PostDTO();
        d.setId(p.getId());
        d.setCategoryCode(p.getCategory().getCode());
        d.setCategoryName(p.getCategory().getName());
        d.setTitle(p.getTitle());
        d.setContent(p.getContent());
        d.setAuthorId(p.getAuthorId());
        d.setAuthorNick(p.getAuthorNick());
        d.setCreateDate(p.getCreateDate()!=null ? p.getCreateDate().format(F) : null);
        d.setUpdateDate(p.getUpdateDate()!=null ? p.getUpdateDate().format(F) : null);
        d.setViews(p.getViews());
        d.setLikes(p.getLikes());
        return d;
    }
}