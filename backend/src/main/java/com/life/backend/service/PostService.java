package com.life.backend.service;

import com.life.backend.dto.CommentDTO;
import com.life.backend.dto.PostDTO;
import com.life.backend.entity.Category;
import com.life.backend.entity.Comment;
import com.life.backend.entity.Post;
import com.life.backend.repository.CategoryRepository;
import com.life.backend.repository.CommentRepository;
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
    private final CommentRepository commentRepo; // ✅

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

    // 단건 조회(+조회수)
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
        if (in.getPassword() == null || in.getPassword().trim().length() < 3)
            throw new ResponseStatusException(BAD_REQUEST, "비밀번호는 최소 3자입니다.");
        if (in.getAuthorNick() == null || in.getAuthorNick().trim().isEmpty())
            throw new ResponseStatusException(BAD_REQUEST, "닉네임을 입력해주세요.");

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

    // 수정
    @Transactional
    public PostDTO update(Long id, PostDTO in) {
        var p = postRepo.findById(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "글을 찾을 수 없습니다."));
        if (p.isDeleted()) throw new ResponseStatusException(NOT_FOUND, "삭제된 글입니다.");
        verifyPostPassword(p, in.getPassword());
        if (in.getTitle() != null)   p.setTitle(in.getTitle());
        if (in.getContent() != null) p.setContent(in.getContent());
        p.setUpdateYn("Y");
        return toDTO(p);
    }

    // 삭제
    @Transactional
    public void delete(Long id, String password) {
        var p = postRepo.findById(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "글을 찾을 수 없습니다."));
        verifyPostPassword(p, password);
        p.setDeleteYn("Y");
    }

    // 사전검증
    public void verify(Long id, String password) {
        var p = postRepo.findById(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "글을 찾을 수 없습니다."));
        verifyPostPassword(p, password);
    }

    // 좋아요
    @Transactional
    public int like(Long id) {
        var p = postRepo.findById(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "글을 찾을 수 없습니다."));
        if (p.isDeleted()) throw new ResponseStatusException(NOT_FOUND, "삭제된 글입니다.");
        p.setLikes(p.getLikes() + 1);
        return p.getLikes();
    }
    @Transactional
    public int unlike(Long id) {
        var p = postRepo.findById(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "글을 찾을 수 없습니다."));
        if (p.isDeleted()) throw new ResponseStatusException(NOT_FOUND, "삭제된 글입니다.");
        p.setLikes(Math.max(0, p.getLikes() - 1));
        return p.getLikes();
    }

    // ===== Comments =====

    public List<CommentDTO> listComments(Long postId) {
        var p = postRepo.findById(postId).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "글을 찾을 수 없습니다."));
        return commentRepo.findActiveByPost(p).stream().map(this::toDTO).toList();
    }

    @Transactional
    public CommentDTO createComment(Long postId, CommentDTO in) {
        if (in.getPassword() == null || in.getPassword().trim().length() < 3)
            throw new ResponseStatusException(BAD_REQUEST, "비밀번호는 최소 3자입니다.");
        if (in.getNickname() == null || in.getNickname().trim().isEmpty())
            throw new ResponseStatusException(BAD_REQUEST, "닉네임을 입력해주세요.");

        var p = postRepo.findById(postId).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "글을 찾을 수 없습니다."));
        var c = new Comment();
        c.setPost(p);
        c.setNickname(in.getNickname().trim());
        c.setCommentPasswordHash(encoder.encode(in.getPassword()));
        c.setContent(in.getContent());
        c.setUpdateYn("N");
        c.setDeleteYn("N");
        c = commentRepo.save(c);
        return toDTO(c);
    }

    @Transactional
    public CommentDTO updateComment(Long postId, Long commentId, CommentDTO in) {
        var c = commentRepo.findById(commentId).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "댓글을 찾을 수 없습니다."));
        if (c.isDeleted()) throw new ResponseStatusException(NOT_FOUND, "삭제된 댓글입니다.");
        if (!c.getPost().getId().equals(postId)) throw new ResponseStatusException(BAD_REQUEST, "잘못된 요청입니다.");

        verifyCommentPassword(c, in.getPassword());
        if (in.getContent() != null) c.setContent(in.getContent());
        c.setUpdateYn("Y");
        return toDTO(c);
    }

    @Transactional
    public void deleteComment(Long postId, Long commentId, String password) {
        var c = commentRepo.findById(commentId).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "댓글을 찾을 수 없습니다."));
        if (!c.getPost().getId().equals(postId)) throw new ResponseStatusException(BAD_REQUEST, "잘못된 요청입니다.");
        verifyCommentPassword(c, password);
        c.setDeleteYn("Y");
    }

    // ===== Utils =====

    private void verifyPostPassword(Post p, String raw) {
        if (p.getPostPasswordHash() == null) throw new ResponseStatusException(UNAUTHORIZED, "비밀번호가 설정되지 않았습니다.");
        if (raw == null || raw.isBlank() || !encoder.matches(raw, p.getPostPasswordHash()))
            throw new ResponseStatusException(UNAUTHORIZED, "비밀번호가 올바르지 않습니다.");
    }
    private void verifyCommentPassword(Comment c, String raw) {
        if (raw == null || raw.isBlank() || !encoder.matches(raw, c.getCommentPasswordHash()))
            throw new ResponseStatusException(UNAUTHORIZED, "비밀번호가 올바르지 않습니다.");
    }

    private String emptyToNull(String s) { return (s == null || s.isBlank()) ? null : s; }

    private PostDTO toDTO(Post p) {
        var d = new PostDTO();
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

    private CommentDTO toDTO(Comment c) {
        var d = new CommentDTO();
        d.setId(c.getId());
        d.setPostId(c.getPost().getId());
        d.setNickname(c.getNickname());
        d.setContent(c.getContent());
        d.setCreateDate(c.getCreateDate() != null ? c.getCreateDate().format(F) : null);
        d.setUpdateDate(c.getUpdateDate() != null ? c.getUpdateDate().format(F) : null);
        d.setUpdateYn(c.getUpdateYn());
        d.setDeleteYn(c.getDeleteYn());
        return d;
    }
}