package com.life.backend.controller;

import com.life.backend.dto.PostDTO;
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

    @GetMapping
    public List<PostDTO> list(@RequestParam(required=false) String category,
                              @RequestParam(required=false) String q,
                              @RequestParam(defaultValue="0") int page,
                              @RequestParam(defaultValue="12") int size) {
        return svc.list(category, q, page, size);
    }

    @GetMapping("/{id}")
    public PostDTO get(@PathVariable Long id) {
        return svc.get(id);
    }

    @PostMapping
    public PostDTO create(@RequestBody PostDTO in) throws Throwable {
        return svc.create(in);
    }

    @PutMapping("/{id}")
    public PostDTO update(@PathVariable Long id, @RequestBody PostDTO in) {
        return svc.update(id, in, in.getAuthorId());
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id, @RequestParam String authorId) {
        svc.delete(id, authorId);
    }

    @PostMapping("/{id}/like")
    public int like(@PathVariable Long id) {
        return svc.like(id);
    }
}