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
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.beans.factory.annotation.Value;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Pattern;

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

    @Value("${upload.dir:./uploads}")
    private String uploadDir;

    private static final Pattern SRC_OR_HREF = Pattern.compile("(?i)(?:src|href)=[\"']([^\"']+)[\"']");


    // 허용 MIME
    private static final Set<String> ALLOWED_IMAGE = Set.of(
            "image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml");
    private static final Set<String> ALLOWED_VIDEO = Set.of(
            "video/mp4", "video/webm", "video/ogg");

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

    @Transactional(readOnly = true)
    public List<PostDTO> listAdvanced(String categoryCode, String q, int page, int size,
                                      String sort, String period, int min) {
        Category cat = null;
        if (categoryCode != null && !categoryCode.isBlank()) {
            cat = categoryRepo.findByCode(categoryCode).orElse(null);
        }
        final var pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size,1), 100));

        sort = (sort == null ? "latest" : sort.toLowerCase());
        switch (sort) {
            case "best":
                return listBest(cat, q, pageable, normalizePeriod(period, "30d"));
            case "trending":
                return listTrendingWithBackfill(cat, q, pageable, min);
            case "latest":
            default:
                return postRepo.findLatest(cat, emptyToNull(q), pageable).stream().map(this::toDTO).toList();
        }
    }

    private String normalizePeriod(String period, String def) {
        if (period == null || period.isBlank()) return def;
        return switch (period.toLowerCase()) {
            case "7d", "14d", "30d" -> period.toLowerCase();
            default -> def;
        };
    }

    private java.time.LocalDateTime now() {
        return java.time.LocalDateTime.now();
    }

    private java.time.LocalDateTime sinceFromPeriod(String period) {
        return switch (period) {
            case "7d"  -> now().minusDays(7);
            case "14d" -> now().minusDays(14);
            default    -> now().minusDays(30);
        };
    }

    // 베스트: 기간 내 좋아요 desc → 조회수 desc → 최신순
    private List<PostDTO> listBest(Category cat, String q, Pageable pageable, String period) {
        var since = sinceFromPeriod(period);
        // 후보를 넉넉히 가져와서 메모리 정렬 (DB 정렬도 가능하지만 가중/타이브레이크 일관성 위해)
        var candidates = postRepo.findCandidatesSince(cat, emptyToNull(q), since, PageRequest.of(0, Math.max(pageable.getPageSize()*3, 60)));
        candidates.sort((a, b) -> {
            int c = Integer.compare(b.getLikes(), a.getLikes());
            if (c != 0) return c;
            c = Integer.compare(b.getViews(), a.getViews());
            if (c != 0) return c;
            return b.getCreateDate().compareTo(a.getCreateDate());
        });
        return candidates.stream().limit(pageable.getPageSize()).map(this::toDTO).toList();
    }

    // 실시간: 점수 + 백필(윈도우 확장 → 최신 백필)로 항상 N개 이상 반환
    private List<PostDTO> listTrendingWithBackfill(Category cat, String q, Pageable pageable, int min) {
        int need = Math.max(min, pageable.getPageSize());
        var windows = List.of("7d", "14d", "30d", "all");
        List<Post> picked = new ArrayList<>();

        for (String w : windows) {
            List<Post> cand;
            if ("all".equals(w)) {
                cand = postRepo.findLatest(cat, emptyToNull(q), PageRequest.of(0, Math.max(need*3, 60)));
            } else {
                var since = sinceFromPeriod(w);
                cand = postRepo.findCandidatesSince(cat, emptyToNull(q), since, PageRequest.of(0, Math.max(need*3, 60)));
            }
            // 점수 계산 정렬
            cand.sort((a, b) -> Double.compare(score(b), score(a)));
            for (Post p : cand) {
                if (picked.size() >= need) break;
                if (!picked.contains(p)) picked.add(p);
            }
            if (picked.size() >= need) break;
        }

        // 그래도 부족하면 최신으로 백필
        if (picked.size() < need) {
            var latest = postRepo.findLatest(cat, emptyToNull(q), PageRequest.of(0, need*2));
            for (Post p : latest) {
                if (picked.size() >= need) break;
                if (!picked.contains(p)) picked.add(p);
            }
        }

        return picked.stream()
                .skip((long) pageable.getPageNumber() * pageable.getPageSize()) // 간단 페이지네이션
                .limit(pageable.getPageSize())
                .map(this::toDTO)
                .toList();
    }

    private double score(Post p) {
        // likes/views는 int, ageHours는 double
        double likes = p.getLikes();
        double views = p.getViews();
        double ageHours = java.time.Duration.between(p.getCreateDate(), now()).toHours();
        double decay = Math.exp(-ageHours / 72.0); // half-life ~3일 느낌
        double recentBoost = (ageHours <= 24.0) ? 3.0 : 0.0;
        return (likes * 2.0 + views * 0.1) * decay + recentBoost;
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
        var p = postRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "글을 찾을 수 없습니다."));
        if (p.isDeleted()) throw new ResponseStatusException(NOT_FOUND, "삭제된 글입니다.");
        verifyPostPassword(p, in.getPassword());

        String oldHtml = p.getContent();
        String newHtml = in.getContent();

        if (in.getTitle() != null) p.setTitle(in.getTitle());

        // ✅ content를 실제로 바꿀 때만 diff/삭제 수행
        if (newHtml != null) {
            p.setContent(newHtml);
            p.setUpdateYn("Y");

            var before = extractUploadPaths(oldHtml);
            var after  = extractUploadPaths(newHtml);
            before.removeAll(after);     // 수정 전엔 있었는데, 수정 후엔 없는 파일만
            before.forEach(this::safeDelete);
        }

        return toDTO(p);
    }

    // 삭제
    @Transactional
    public void delete(Long id, String password) {
        var p = postRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "글을 찾을 수 없습니다."));

        verifyPostPassword(p, password);

        // ✨ 본문에 있는 업로드 파일들 삭제
        extractUploadPaths(p.getContent()).forEach(this::safeDelete);

        // 소프트 삭제 유지(현 구조)
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

    @Transactional
    public UploadResult upload(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "빈 파일입니다.");
        }
        String ct = file.getContentType();
        boolean ok = (ct != null) && (ALLOWED_IMAGE.contains(ct) || ALLOWED_VIDEO.contains(ct));
        if (!ok) {
            throw new ResponseStatusException(BAD_REQUEST, "허용되지 않는 파일 형식입니다: " + ct);
        }

        // /{uploadDir}/YYYY/MM/DD
        Path root = Path.of(uploadDir).toAbsolutePath().normalize();
        LocalDate today = LocalDate.now();
        Path dir = root.resolve(Path.of(
                Integer.toString(today.getYear()),
                String.format("%02d", today.getMonthValue()),
                String.format("%02d", today.getDayOfMonth())
        ));
        Files.createDirectories(dir);

        // 저장 파일명: uuid + 원본 확장자
        String ext = "";
        String original = file.getOriginalFilename();
        if (original != null && original.lastIndexOf('.') >= 0) {
            ext = original.substring(original.lastIndexOf('.')).toLowerCase();
        }
        String stored = UUID.randomUUID().toString().replace("-", "") + ext;
        Path target = dir.resolve(stored);

        file.transferTo(target);

        // 브라우저가 접근할 URL (/uploads/** 는 WebMvcConfig에서 매핑)
        String url = "/uploads/" + today.getYear()
                + "/" + String.format("%02d", today.getMonthValue())
                + "/" + String.format("%02d", today.getDayOfMonth())
                + "/" + stored;

        return new UploadResult(url, original, file.getSize(), ct);
    }

    public record UploadResult(String url, String originalName, long size, String contentType) {}

    private Path uploadsRoot() {
        return Path.of(uploadDir).toAbsolutePath().normalize();
    }

    /** HTML 본문에 들어있는 /uploads/... URL들을 파일 경로로 매핑해서 반환 */
    private Set<Path> extractUploadPaths(String html) {
        if (html == null || html.isBlank()) return Set.of();
        var m = SRC_OR_HREF.matcher(html);
        Set<Path> out = new java.util.HashSet<>();
        while (m.find()) {
            String url = m.group(1);
            Path p = mapUrlToPath(url);
            if (p != null) out.add(p);
        }
        return out;
    }

    /** 절대/상대 URL 모두 처리하여 업로드 실제 파일 경로로 변환 (경로 이탈 방지 포함) */
    private Path mapUrlToPath(String url) {
        try {
            String path = url;
            // 절대 URL이면 path만 뽑기
            if (url.startsWith("http://") || url.startsWith("https://")) {
                path = URI.create(url).getPath();
            }
            if (path == null) return null;
            // 업로드 경로만 허용
            if (!path.startsWith("/uploads/")) return null;

            Path root = uploadsRoot();
            Path file = root.resolve(path.substring("/uploads/".length())).normalize();

            // 경로 이탈 방지: 반드시 root 하위여야 함
            if (!file.startsWith(root)) return null;

            return file;
        } catch (Exception ignore) {
            return null;
        }
    }

    private void safeDelete(Path p) {
        try {
            Files.deleteIfExists(p);
        } catch (Exception ignore) {
            // 로그 원하면 추가
        }
    }

}