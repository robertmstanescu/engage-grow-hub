/**
 * RowNote — the small italic footnote every section can carry.
 *
 * Colour follows the row's foreground by default and honours the admin's
 * "Note colour" override (`content.color_note`) when one is set.
 */
const RowNote = ({ children, color, handwritten }: { children: React.ReactNode; color?: string; handwritten?: boolean }) => (
  <div className="mt-rhythm-base pt-3 border-t row-border">
    <p
      className={handwritten ? "leading-[1.4]" : "font-body text-xs italic leading-[1.6]"}
      style={{
        color: color || (handwritten ? "hsl(var(--link))" : "var(--row-fg-muted, color-mix(in srgb, var(--row-fg, hsl(var(--foreground))) 68%, transparent))"),
        ...(handwritten ? { fontFamily: "'Playwrite CU', cursive", fontSize: 20 } : {}),
      }}
    >
      {children}
    </p>
  </div>
);

export default RowNote;
