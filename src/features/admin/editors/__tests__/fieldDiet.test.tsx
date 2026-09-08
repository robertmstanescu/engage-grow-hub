/**
 * Field diet — a block's Content tab shows at most EIGHT primary fields.
 *
 * Counted: every `[data-inspector-field]` (Field, TextArea, RichField,
 * SelectField, ArrayField, ColorField) that is not inside "More"
 * (`[data-more-fields]`), not inside "Custom colours"
 * (`[data-custom-colours]`), and not inside a list editor
 * (`[data-field-group]`, which counts as one). Put secondary fields
 * behind <MoreFields>, mark list editors with <SectionBox group>.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { Suspense } from "react";
import { ROW_TYPES } from "@/types/rows";
import { getWidget } from "@/widgets";
import "@/features/widgets/contact";
import RowTypeEditor from "../RowTypeEditor";

vi.mock("@/hooks/useBrandSettings", () => ({
  useBrandColors: () => [{ id: "ink", name: "Ink", hex: "#26142E" }],
  useBrandSettings: () => ({}),
}));
vi.mock("@/features/admin/RichTextEditor", () => ({ default: () => <div data-testid="rte" /> }));
vi.mock("@/features/admin/ImagePickerField", () => ({ default: () => <div data-testid="picker" /> }));
vi.mock("@/features/admin/ImageShapeControl", () => ({ default: () => null }));
vi.mock("@/features/admin/site-editor/CoverImageField", () => ({ default: () => null, CoverImageField: () => null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ select: () => ({ order: () => Promise.resolve({ data: [] }), eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) }) } }));

const MAX_PRIMARY = 8;

const countPrimary = (root: HTMLElement) => {
  const all = Array.from(root.querySelectorAll("[data-inspector-field]"));
  const loose = all.filter((el) => !el.closest("[data-more-fields]") && !el.closest("[data-custom-colours]") && !el.closest("[data-field-group]"));
  const groups = Array.from(root.querySelectorAll("[data-field-group]")).filter((el) => !el.closest("[data-more-fields]"));
  return loose.length + groups.length;
};

describe("field diet", () => {
  for (const type of ROW_TYPES) {
    it(`${type} shows at most ${MAX_PRIMARY} primary fields`, async () => {
      const content = { ...((getWidget(type)?.defaultData as Record<string, unknown>) || {}) };
      const { container, findByText } = render(
        <Suspense fallback={<span>loading</span>}>
          <RowTypeEditor type={type} content={content} onChange={() => {}} />
        </Suspense>,
      );
      // Lazy editors resolve asynchronously; wait for the Custom colours fold that every editor renders.
      await findByText("Custom colours", undefined, { timeout: 4000 });
      const n = countPrimary(container);
      expect(n, `${type} has ${n} primary fields`).toBeLessThanOrEqual(MAX_PRIMARY);
    });
  }
});
