package com.life.backend.service;

import com.life.backend.dto.PostDTO;
import com.life.backend.entity.Category;
import com.life.backend.entity.Post;
import com.life.backend.repository.CategoryRepository;
import com.life.backend.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.format.DateTimeFormatter;
import java.util.*;

import static org.springframework.http.HttpStatus.*;


@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PostService {

    private final PostRepository postRepo;
    private final CategoryRepository categoryRepo;

    private static final DateTimeFormatter F = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private final PasswordEncoder encoder = new BCryptPasswordEncoder();

    // 목록
    public List<PostDTO> list(String categoryCode, String q, int page, int size) {
        Category cat = null;
        if (categoryCode != null && !categoryCode.isBlank()) {
            cat = categoryRepo.findByCode(categoryCode).orElse(null);
        }
        var pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size,1), 100));
        return postRepo.findList(cat, emptyToNull(q), pageable).stream()
                .map(this::toDTO)
                .toList();
    }

    // 단건 조회 (+조회수 증가)
    @Transactional
    public PostDTO get(Long id) {
        var p = postRepo.findById(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "글을 찾을 수 없습니다."));
        if (p.isDeleted()) throw new ResponseStatusException(NOT_FOUND, "삭제된 글입니다.");
        p.setViews(p.getViews() + 1);
        return toDTO(p);
    }

    // 생성
    @Transactional
    public PostDTO create(PostDTO in) {
        if (in.getPassword() == null || in.getPassword().trim().length() < 3) {
            throw new ResponseStatusException(BAD_REQUEST, "비밀번호는 최소 3자입니다.");
        }
        if (in.getAuthorNick() == null || in.getAuthorNick().trim().isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "닉네임을 입력해주세요.");
        }

        var cat = categoryRepo.findByCode(in.getCategoryCode())
                .orElseThrow(() -> new ResponseStatusException(BAD_REQUEST, "잘못된 카테고리 코드"));

        var p = new Post();
        p.setClientReqId(in.getClientReqId());
        p.setCategory(cat);
        p.setTitle(in.getTitle());
        p.setContent(in.getContent());
        p.setAuthorId("anon");
        p.setAuthorNick(in.getAuthorNick().trim());
        p.setPostPasswordHash(encoder.encode(in.getPassword()));
        p.setUpdateYn("N");
        p.setDeleteYn("N");

        try {
            p = postRepo.save(p);
        } catch (DataIntegrityViolationException e) {
            var dup = postRepo.findByClientReqId(in.getClientReqId());
            if (dup.isPresent()) return toDTO(dup.get());
            throw e;
        }
        return toDTO(p);
    }

    // 수정 (비번 확인 → update_yn='Y')
    @Transactional
    public PostDTO update(Long id, PostDTO in) {
        var p = postRepo.findById(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "글을 찾을 수 없습니다."));
        if (p.isDeleted()) throw new ResponseStatusException(NOT_FOUND, "삭제된 글입니다.");

        verifyPassword(p, in.getPassword());

        if (in.getTitle() != null)   p.setTitle(in.getTitle());
        if (in.getContent() != null) p.setContent(in.getContent());
        p.setUpdateYn("Y");
        return toDTO(p);
    }

    // 삭제 (비번 확인 → delete_yn='Y')
    @Transactional
    public void delete(Long id, String password) {
        var p = postRepo.findById(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "글을 찾을 수 없습니다."));
        verifyPassword(p, password);
        p.setDeleteYn("Y");
    }

    // ✨ 비밀번호 사전검증 (수정 화면 진입 전에 사용)
    public void verify(Long id, String password) {
        var p = postRepo.findById(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "글을 찾을 수 없습니다."));
        verifyPassword(p, password); // 통과하면 아무 예외 없이 끝
    }

    // 좋아요
    @Transactional
    public int like(Long id) {
        Post p = postRepo.findById(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "글을 찾을 수 없습니다."));
        if (p.isDeleted()) throw new ResponseStatusException(NOT_FOUND, "삭제된 글입니다.");
        p.setLikes(p.getLikes() + 1);
        return p.getLikes();
    }

    // --------- 내부 유틸 ---------

    private void verifyPassword(Post p, String raw) {
        if (p.getPostPasswordHash() == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "이 글은 비밀번호가 없어 수정/삭제할 수 없습니다.");
        }
        if (raw == null || raw.isBlank() || !encoder.matches(raw, p.getPostPasswordHash())) {
            throw new ResponseStatusException(UNAUTHORIZED, "비밀번호가 올바르지 않습니다.");
        }
    }

    private String emptyToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }

    private PostDTO toDTO(Post p) {
        PostDTO d = new PostDTO();
        d.setId(p.getId());
        d.setClientReqId(p.getClientReqId());
        d.setCategoryCode(p.getCategory() != null ? p.getCategory().getCode() : null);
        d.setCategoryName(p.getCategory() != null ? p.getCategory().getName() : null);
        d.setTitle(p.getTitle());
        d.setContent(p.getContent());
        d.setAuthorId(p.getAuthorId());
        d.setAuthorNick(p.getAuthorNick());
        d.setCreateDate(p.getCreateDate() != null ? p.getCreateDate().format(F) : null);
        d.setUpdateDate(p.getUpdateDate() != null ? p.getUpdateDate().format(F) : null);
        d.setViews(p.getViews());
        d.setLikes(p.getLikes());
        d.setUpdateYn(p.getUpdateYn());
        d.setDeleteYn(p.getDeleteYn());
        return d;
    }
}