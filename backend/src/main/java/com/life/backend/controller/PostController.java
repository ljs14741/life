package com.life.backend.controller;

import com.life.backend.dto.CategoryDTO;
import com.life.backend.dto.CommentDTO;
import com.life.backend.dto.PostDTO;
import com.life.backend.repository.CategoryRepository;
import com.life.backend.service.PostService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class PostController {

    private final PostService svc;
    private final CategoryRepository categoryRepo;

    // 카테고리 목록
    @GetMapping("/categories")
    public List<CategoryDTO> categories() {
        return categoryRepo.findAllByOrderByIdAsc()
                .stream()
                .map(c -> new CategoryDTO(c.getId(), c.getCode(), c.getName()))
                .toList();
    }

    // 목록
    @GetMapping
    public List<PostDTO> list(@RequestParam(required = false) String categoryCode,
                              @RequestParam(required = false) String q,
                              @RequestParam(defaultValue = "0") int page,
                              @RequestParam(defaultValue = "20") int size) {
        return svc.list(categoryCode, q, page, size);
    }

    // 단건
    @GetMapping("/{id}")
    public PostDTO get(@PathVariable Long id) {
        return svc.get(id);
    }

    // 생성
    @PostMapping
    public PostDTO create(@RequestBody PostDTO in) {
        return svc.create(in);
    }

    // 수정
    @PutMapping("/{id}")
    public PostDTO update(@PathVariable Long id, @RequestBody PostDTO in) {
        return svc.update(id, in);
    }

    // 삭제
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id,
                       @RequestParam(required = false) String password,
                       @RequestBody(required = false) PostDTO body) {
        String pw = password != null ? password : (body != null ? body.getPassword() : null);
        svc.delete(id, pw);
    }

    // ✨ 비밀번호 사전검증 (수정 진입)
    @PostMapping("/{id}/verify")
    public void verify(@PathVariable Long id, @RequestBody PostDTO in) {
        svc.verify(id, in.getPassword()); // 통과 시 200 OK, 실패 시 401
    }

    // 좋아요 +1
    @PostMapping("/{id}/like")
    public int like(@PathVariable Long id) {
        return svc.like(id);
    }

    // ✅ 좋아요 -1
    @PostMapping("/{id}/unlike")
    public int unlike(@PathVariable Long id) {
        return svc.unlike(id);
    }

    @GetMapping("/{id}/comments")
    public List<CommentDTO> listComments(@PathVariable Long id) {
        return svc.listComments(id);
    }

    @PostMapping("/{id}/comments")
    public CommentDTO createComment(@PathVariable Long id, @RequestBody CommentDTO in) {
        return svc.createComment(id, in);
    }

    @PutMapping("/{postId}/comments/{commentId}")
    public CommentDTO updateComment(@PathVariable Long postId,
                                    @PathVariable Long commentId,
                                    @RequestBody CommentDTO in) {
        return svc.updateComment(postId, commentId, in);
    }

    @DeleteMapping("/{postId}/comments/{commentId}")
    public void deleteComment(@PathVariable Long postId,
                              @PathVariable Long commentId,
                              @RequestParam(required = false) String password,
                              @RequestBody(required = false) CommentDTO body) {
        String pw = password != null ? password : (body != null ? body.getPassword() : null);
        svc.deleteComment(postId, commentId, pw);
    }
}