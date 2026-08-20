import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "@/services/sanitize";

/**
 * sanitizeHtml() wraps DOMPurify and is the app's only defense against
 * stored/reflected XSS from admin-authored rich text (blog posts, CMS
 * rows, site_content) that gets rendered via `dangerouslySetInnerHTML`
 * on the public site. These tests lock in the specific attack vectors
 * it must neutralize, plus the legitimate markup it must leave usable.
 */
describe("sanitizeHtml", () => {
  describe("XSS defense", () => {
    it("strips <script> tags entirely, including their contents", () => {
      const out = sanitizeHtml('<p>hello</p><script>alert("pwned")</script>');
      expect(out).not.toContain("<script");
      expect(out).not.toContain("alert(");
      expect(out).toContain("hello");
    });

    it("strips inline event-handler attributes like onerror", () => {
      const out = sanitizeHtml('<img src="x.png" onerror="alert(1)">');
      expect(out).not.toContain("onerror");
      expect(out).not.toContain("alert(1)");
    });

    it("strips inline event-handler attributes like onclick", () => {
      const out = sanitizeHtml('<div onclick="alert(1)">click me</div>');
      expect(out).not.toContain("onclick");
      expect(out).toContain("click me");
    });

    it("strips onload handlers from svg elements", () => {
      const out = sanitizeHtml('<svg onload="alert(1)"><circle r="1"/></svg>');
      expect(out).not.toContain("onload");
      expect(out).not.toContain("alert(1)");
    });

    it("neutralizes javascript: URIs in href attributes", () => {
      const out = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
      expect(out.toLowerCase()).not.toContain("javascript:");
      expect(out).toContain("click");
    });

    it("neutralizes javascript: URIs in img src attributes", () => {
      const out = sanitizeHtml('<img src="javascript:alert(1)">');
      expect(out.toLowerCase()).not.toContain("javascript:");
    });

    it("strips <iframe> elements (not on DOMPurify's default allow-list)", () => {
      const out = sanitizeHtml('<iframe src="https://evil.example/"></iframe><p>safe</p>');
      expect(out).not.toContain("<iframe");
      expect(out).toContain("safe");
    });

    it("strips <object> and <embed> elements", () => {
      const out = sanitizeHtml('<object data="evil.swf"></object><embed src="evil.swf">');
      expect(out).not.toContain("<object");
      expect(out).not.toContain("<embed");
    });

    it("neutralizes a malformed tag used to smuggle a script (mXSS-style payload)", () => {
      const out = sanitizeHtml('<img src=x onerror=alert(1)//><svg><script>alert(2)</script></svg>');
      expect(out).not.toContain("onerror");
      expect(out).not.toContain("<script");
      expect(out).not.toContain("alert(");
    });
  });

  describe("legitimate content passthrough", () => {
    it("preserves plain text unchanged", () => {
      expect(sanitizeHtml("Hello world")).toBe("Hello world");
    });

    it("returns an empty string for empty input", () => {
      expect(sanitizeHtml("")).toBe("");
    });

    it("preserves safe formatting tags", () => {
      const out = sanitizeHtml("<p>Some <strong>bold</strong> and <em>italic</em> text.</p>");
      expect(out).toContain("<strong>bold</strong>");
      expect(out).toContain("<em>italic</em>");
    });

    it("preserves safe links with their href", () => {
      const out = sanitizeHtml('<a href="https://example.com">visit</a>');
      expect(out).toContain('href="https://example.com"');
      expect(out).toContain("visit");
    });

    it("preserves images with safe src and alt text", () => {
      const out = sanitizeHtml('<img src="https://example.com/photo.jpg" alt="A description">');
      expect(out).toContain('src="https://example.com/photo.jpg"');
      expect(out).toContain('alt="A description"');
    });

    it("preserves the style, class, and face attributes explicitly allow-listed via ADD_ATTR", () => {
      const out = sanitizeHtml('<span style="color: red" class="highlight" face="Arial">styled</span>');
      expect(out).toContain('style="color: red"');
      expect(out).toContain('class="highlight"');
      expect(out).toContain('face="Arial"');
    });
  });

  describe("rich-text font-size normalization", () => {
    it("converts a browser keyword font-size to an exact pixel value", () => {
      const out = sanitizeHtml('<span style="font-size: xx-large">big</span>');
      expect(out).toContain("font-size: 32px");
      expect(out).not.toContain("xx-large");
    });

    it("converts a legacy text-size class to an inline pixel font-size", () => {
      const out = sanitizeHtml('<span class="text-XXL">big</span>');
      expect(out).toContain("font-size: 32px");
      expect(out).not.toContain("text-XXL");
    });
  });
});
