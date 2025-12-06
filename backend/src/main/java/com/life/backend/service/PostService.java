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
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

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
    private final CommentRepository commentRepo;

    private static final DateTimeFormatter F = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private final PasswordEncoder encoder = new BCryptPasswordEncoder();

    private static final Safelist TIPTAP_SAFELIST = Safelist.relaxed()
            .addTags("img", "video", "h2", "h3", "h4")
            .addAttributes("img", "src", "alt", "style", "width")
            .addAttributes("video", "src", "controls")
            .addAttributes(":all", "style");

    @Value("${upload.dir:./uploads}")
    private String uploadDir;

    private static final Pattern SRC_OR_HREF = Pattern.compile("(?i)(?:src|href)=[\"']([^\"']+)[\"']");

    private static final Set<String> ALLOWED_IMAGE = Set.of("image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml");
    private static final Set<String> ALLOWED_VIDEO = Set.of("video/mp4", "video/webm", "video/ogg");

    // 기본 목록 (최신순)
    public List<PostDTO> list(String categoryCode, String q, int page, int size) {
        Category cat = null;
        if (categoryCode != null && !categoryCode.isBlank()) {
            cat = categoryRepo.findByCode(categoryCode).orElse(null);
        }
        var pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        return fillCommentCounts(
                postRepo.findList(cat, emptyToNull(q), pageable).stream().map(this::toDTO).toList()
        );
    }

    // 단건 조회
    @Transactional
    public PostDTO get(Long id) {
        var p = postRepo.findById(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "글을 찾을 수 없습니다."));
        if (p.isDeleted()) throw new ResponseStatusException(NOT_FOUND, "삭제된 글입니다.");
        p.setViews(p.getViews() + 1);
        return toDTO(p);
    }

    // 고급 목록 (베스트, 실시간, 최신)
    public List<PostDTO> listAdvanced(String categoryCode, String q, int page, int size,
                                      String sort, String period, int min) {
        Category cat = null;
        if (categoryCode != null && !categoryCode.isBlank()) {
            cat = categoryRepo.findByCode(categoryCode).orElse(null);
        }
        final var pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));

        List<PostDTO> results;
        sort = (sort == null ? "latest" : sort.toLowerCase());

        switch (sort) {
            case "best":
                results = listBest(cat, q, pageable, normalizePeriod(period, "30d"));
                break;
            case "trending":
                results = listTrendingWithBackfill(cat, q, pageable, min);
                break;
            case "latest":
            default:
                results = postRepo.findLatest(cat, emptyToNull(q), pageable).stream().map(this::toDTO).toList();
                break;
        }

        return fillCommentCounts(results);
    }

    // ==========================================================
    // ✅ [수정됨] 베스트: 스킵(Skip) 로직 추가 및 조회 범위 확장
    // ==========================================================
    private List<PostDTO> listBest(Category cat, String q, Pageable pageable, String period) {
        var since = sinceFromPeriod(period);

        // 중요: 요청한 페이지까지 커버할 수 있도록 넉넉하게 DB에서 가져옵니다.
        // 예를 들어 2페이지(24번째 글)를 보려면 DB에서 최소 30~40개는 가져와야 정렬 후 자를 수 있습니다.
        int limitNeeded = (pageable.getPageNumber() + 1) * pageable.getPageSize();
        // 넉넉하게 1.5배 혹은 최소 60개
        int fetchLimit = Math.max(limitNeeded + 20, 60);

        var candidates = postRepo.findCandidatesSince(cat, emptyToNull(q), since, PageRequest.of(0, fetchLimit));

        // 메모리 정렬
        candidates.sort((a, b) -> {
            int c = Integer.compare(b.getLikes(), a.getLikes());
            if (c != 0) return c;
            c = Integer.compare(b.getViews(), a.getViews());
            if (c != 0) return c;
            return b.getCreateDate().compareTo(a.getCreateDate());
        });

        // ✅ Stream API를 사용하여 페이지네이션 적용 (skip -> limit)
        return candidates.stream()
                .skip(pageable.getOffset()) // (page * size) 만큼 건너뛰기
                .limit(pageable.getPageSize()) // size 만큼 가져오기
                .map(this::toDTO)
                .toList();
    }

    // ==========================================================
    // ✅ [수정됨] 실시간: 조회 범위(limit)를 페이지에 맞춰 동적으로 확장
    // ==========================================================
    private List<PostDTO> listTrendingWithBackfill(Category cat, String q, Pageable pageable, int min) {
        // 요청한 페이지를 커버하기 위해 필요한 데이터 수
        int limitNeeded = (pageable.getPageNumber() + 1) * pageable.getPageSize();
        int need = Math.max(min, limitNeeded); // 최소 min개 혹은 페이지 커버 수량

        // 윈도우 전략: 최근 7일 -> 14일 -> ... 확장하며 후보군 수집
        var windows = List.of("7d", "14d", "30d", "all");
        List<Post> picked = new ArrayList<>();

        // fetch할 때 넉넉하게 가져옴 (필요량의 2~3배)
        int fetchSize = Math.max(need * 3, 100);

        for (String w : windows) {
            List<Post> cand;
            if ("all".equals(w)) {
                cand = postRepo.findLatest(cat, emptyToNull(q), PageRequest.of(0, fetchSize));
            } else {
                var since = sinceFromPeriod(w);
                cand = postRepo.findCandidatesSince(cat, emptyToNull(q), since, PageRequest.of(0, fetchSize));
            }

            // 점수 계산 후 정렬
            cand.sort((a, b) -> Double.compare(score(b), score(a)));

            for (Post p : cand) {
                // 이미 충분히 모았으면 중단 (여기서는 전체 풀을 모아야 하므로 중단 조건 완화)
                // 단, 중복 제거하며 수집
                if (!picked.contains(p)) picked.add(p);
            }

            // 현재 수집된 양이 요청한 페이지의 끝(offset + size)보다 많으면 충분함
            if (picked.size() >= limitNeeded + pageable.getPageSize()) break;
        }

        // 백필 (그래도 부족하면 최신순으로 채우기)
        if (picked.size() < limitNeeded + pageable.getPageSize()) {
            var latest = postRepo.findLatest(cat, emptyToNull(q), PageRequest.of(0, fetchSize));
            for (Post p : latest) {
                if (!picked.contains(p)) picked.add(p);
            }
        }

        // ✅ 메모리 페이징 처리
        return picked.stream()
                .skip(pageable.getOffset()) // 건너뛰기
                .limit(pageable.getPageSize()) // 자르기
                .map(this::toDTO)
                .toList();
    }

    // ... (이하 나머지 메서드: score, create, update, delete, verify, like 등 기존과 동일) ...

    private double score(Post p) {
        double likes = p.getLikes();
        double views = p.getViews();
        double ageHours = java.time.Duration.between(p.getCreateDate(), now()).toHours();
        double decay = Math.exp(-ageHours / 72.0);
        double recentBoost = (ageHours <= 24.0) ? 3.0 : 0.0;
        return (likes * 2.0 + views * 0.1) * decay + recentBoost;
    }

    private List<PostDTO> fillCommentCounts(List<PostDTO> postList) {
        if (postList.isEmpty()) return postList;
        List<Long> postIds = postList.stream().map(PostDTO::getId).toList();
        List<Object[]> counts = commentRepo.countActiveCommentsByPostIds(postIds);
        Map<Long, Integer> commentCountMap = new HashMap<>();
        for (Object[] row : counts) {
            commentCountMap.put((Long) row[0], ((Long) row[1]).intValue());
        }
        for (PostDTO dto : postList) {
            dto.setCommentCount(commentCountMap.getOrDefault(dto.getId(), 0));
        }
        return postList;
    }

    private String normalizePeriod(String period, String def) {
        if (period == null || period.isBlank()) return def;
        return switch (period.toLowerCase()) {
            case "7d", "14d", "30d" -> period.toLowerCase();
            default -> def;
        };
    }

    private java.time.LocalDateTime now() { return java.time.LocalDateTime.now(); }

    private java.time.LocalDateTime sinceFromPeriod(String period) {
        return switch (period) {
            case "7d" -> now().minusDays(7);
            case "14d" -> now().minusDays(14);
            default -> now().minusDays(30);
        };
    }

    // ... (create, update, delete, etc. 기존 코드 유지) ...
    // 편의상 생략된 부분은 기존 코드를 그대로 쓰시면 됩니다.
    // 주요 수정 포인트는 listBest, listTrendingWithBackfill 메서드 내부입니다.

    // (아래는 기존 코드 복붙용으로 필요하다면 사용하세요)
    @Transactional
    public PostDTO create(PostDTO in) {
        if (in.getPassword() == null || in.getPassword().trim().length() < 3)
            throw new ResponseStatusException(BAD_REQUEST, "비밀번호는 최소 3자입니다.");
        if (in.getAuthorNick() == null || in.getAuthorNick().trim().isEmpty())
            throw new ResponseStatusException(BAD_REQUEST, "닉네임을 입력해주세요.");
        var cat = categoryRepo.findByCode(in.getCategoryCode())
                .orElseThrow(() -> new ResponseStatusException(BAD_REQUEST, "잘못된 카테고리 코드"));
        String cleanHtml = Jsoup.clean(in.getContent(), TIPTAP_SAFELIST);
        var p = new Post();
        p.setClientReqId(in.getClientReqId());
        p.setCategory(cat);
        p.setTitle(in.getTitle());
        p.setContent(cleanHtml);
        p.setAuthorId("anon");
        p.setAuthorNick(in.getAuthorNick().trim());
        p.setPostPasswordHash(encoder.encode(in.getPassword()));
        p.setUpdateYn("N");
        p.setDeleteYn("N");
        try { p = postRepo.save(p); }
        catch (DataIntegrityViolationException e) {
            var dup = postRepo.findByClientReqId(in.getClientReqId());
            if (dup.isPresent()) return toDTO(dup.get());
            throw e;
        }
        return toDTO(p);
    }

    @Transactional
    public PostDTO update(Long id, PostDTO in) {
        var p = postRepo.findById(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "글을 찾을 수 없습니다."));
        if (p.isDeleted()) throw new ResponseStatusException(NOT_FOUND, "삭제된 글입니다.");
        verifyPostPassword(p, in.getPassword());
        String oldHtml = p.getContent();
        String cleanHtml = Jsoup.clean(in.getContent(), TIPTAP_SAFELIST);
        if (in.getTitle() != null) p.setTitle(in.getTitle());
        if (cleanHtml != null) {
            p.setContent(cleanHtml);
            p.setUpdateYn("Y");
            var before = extractUploadPaths(oldHtml);
            var after = extractUploadPaths(cleanHtml);
            before.removeAll(after);
            before.forEach(this::safeDelete);
        }
        return toDTO(p);
    }
    @Transactional
    public void delete(Long id, String password) {
        var p = postRepo.findById(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "글을 찾을 수 없습니다."));
        verifyPostPassword(p, password);
        extractUploadPaths(p.getContent()).forEach(this::safeDelete);
        p.setDeleteYn("Y");
    }
    public void verify(Long id, String password) {
        var p = postRepo.findById(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "글을 찾을 수 없습니다."));
        verifyPostPassword(p, password);
    }
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
        c.setContent(Jsoup.clean(in.getContent(), Safelist.none()));
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
        if (in.getContent() != null) {
            c.setContent(Jsoup.clean(in.getContent(), Safelist.none()));
            c.setUpdateYn("Y");
        }
        return toDTO(c);
    }
    @Transactional
    public void deleteComment(Long postId, Long commentId, String password) {
        var c = commentRepo.findById(commentId).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "댓글을 찾을 수 없습니다."));
        if (!c.getPost().getId().equals(postId)) throw new ResponseStatusException(BAD_REQUEST, "잘못된 요청입니다.");
        verifyCommentPassword(c, password);
        c.setDeleteYn("Y");
    }
    private void verifyPostPassword(Post p, String raw) {
        if (p.getPostPasswordHash() == null) throw new ResponseStatusException(UNAUTHORIZED, "비밀번호 미설정");
        if (raw == null || raw.isBlank() || !encoder.matches(raw, p.getPostPasswordHash()))
            throw new ResponseStatusException(UNAUTHORIZED, "비밀번호 불일치");
    }
    private void verifyCommentPassword(Comment c, String raw) {
        if (raw == null || raw.isBlank() || !encoder.matches(raw, c.getCommentPasswordHash()))
            throw new ResponseStatusException(UNAUTHORIZED, "비밀번호 불일치");
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
        if (file == null || file.isEmpty()) throw new ResponseStatusException(BAD_REQUEST, "빈 파일");
        String ct = file.getContentType();
        if (ct == null || (!ALLOWED_IMAGE.contains(ct) && !ALLOWED_VIDEO.contains(ct)))
            throw new ResponseStatusException(BAD_REQUEST, "허용되지 않는 형식");
        Path root = Path.of(uploadDir).toAbsolutePath().normalize();
        LocalDate today = LocalDate.now();
        Path dir = root.resolve(Path.of(String.valueOf(today.getYear()), String.format("%02d", today.getMonthValue()), String.format("%02d", today.getDayOfMonth())));
        Files.createDirectories(dir);
        String ext = "";
        String original = file.getOriginalFilename();
        if (original != null && original.lastIndexOf('.') >= 0) ext = original.substring(original.lastIndexOf('.')).toLowerCase();
        String stored = UUID.randomUUID().toString().replace("-", "") + ext;
        file.transferTo(dir.resolve(stored));
        return new UploadResult("/uploads/" + today.getYear() + "/" + String.format("%02d", today.getMonthValue()) + "/" + String.format("%02d", today.getDayOfMonth()) + "/" + stored, original, file.getSize(), ct);
    }
    public record UploadResult(String url, String originalName, long size, String contentType) {}
    private Path uploadsRoot() { return Path.of(uploadDir).toAbsolutePath().normalize(); }
    private Set<Path> extractUploadPaths(String html) {
        if (html == null || html.isBlank()) return Set.of();
        var m = SRC_OR_HREF.matcher(html);
        Set<Path> out = new HashSet<>();
        while (m.find()) {
            Path p = mapUrlToPath(m.group(1));
            if (p != null) out.add(p);
        }
        return out;
    }
    private Path mapUrlToPath(String url) {
        try {
            String path = url;
            if (url.startsWith("http")) path = URI.create(url).getPath();
            if (path == null || !path.startsWith("/uploads/")) return null;
            Path root = uploadsRoot();
            Path file = root.resolve(path.substring("/uploads/".length())).normalize();
            if (!file.startsWith(root)) return null;
            return file;
        } catch (Exception e) { return null; }
    }
    private void safeDelete(Path p) { try { Files.deleteIfExists(p); } catch (Exception ignored) {} }
}