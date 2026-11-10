import { describe, expect, it } from "vitest";
import { safeCss } from "./safeCss";

describe("safeCss", () => {
  it("keeps ordinary CSS, child selectors included", () => {
    const css = "& > p { color: red; } & a:hover { opacity: .8 }";
    expect(safeCss(css)).toBe(css);
  });
  it("removes a closing style tag and anything tag-shaped after it", () => {
    const out = safeCss("& { color: red } </style><script>alert(1)</script><img src=x onerror=alert(1)>");
    expect(out).not.toMatch(/<\/?(style|script|img)/i);
  });
  it("removes an unterminated tag", () => {
    expect(safeCss("a{}</style")).toBe("a{}");
  });
  it("answers an empty string for anything that is not text", () => {
    expect(safeCss(null)).toBe("");
    expect(safeCss(42)).toBe("");
  });
});
