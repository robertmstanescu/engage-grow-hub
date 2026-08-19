/**
 * RowNote — the small italic footnote every section can carry.
 *
 * Colour follows the row's foreground by default and honours the admin's
 * "Note colour" override (`content.color_note`) when one is set.
 */
const RowNote = ({ children, color }: { children: React.ReactNode; color?: string }) => (
  <div className="mt-rhythm-base pt-3 border-t row-border">
    <p
      className="font-body text-xs italic leading-[1.6]"
      style={{ color: color || "var(--row-fg-muted, color-mix(in srgb, var(--row-fg, hsl(var(--foreground))) 68%, transparent))" }}
    >
      {children}
    </p>
  </div>
);

export default RowNote;
