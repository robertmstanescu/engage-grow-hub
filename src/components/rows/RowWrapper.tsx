import type { RowLayout } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/types/rows";

interface Props {
  layout?: RowLayout;
  bgColor?: string;
  children: React.ReactNode;
}

const RowWrapper = ({ layout, bgColor, children }: Props) => {
  const l = { ...DEFAULT_ROW_LAYOUT, ...layout };

  const sectionStyle: React.CSSProperties = {
    backgroundColor: bgColor || "hsl(var(--background))",
    paddingTop: `${l.paddingTop}px`,
    paddingBottom: `${l.paddingBottom}px`,
    marginTop: l.marginTop ? `${l.marginTop}px` : undefined,
    marginBottom: l.marginBottom ? `${l.marginBottom}px` : undefined,
    ...(l.bgImage ? {
      backgroundImage: `url(${l.bgImage})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    } : {}),
  };

  const maxW = l.fullWidth ? "max-w-none" : "max-w-[1100px]";

  return (
    <section style={sectionStyle}>
      <div className={`${maxW} mx-auto px-6`}>
        {l.columns > 1 ? (
          <div className={`grid gap-6 ${getGridCols(l.columns)}`}>
            {children}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
};

const getGridCols = (cols: number) => {
  switch (cols) {
    case 2: return "grid-cols-1 md:grid-cols-2";
    case 3: return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
    case 4: return "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";
    default: return "grid-cols-1";
  }
};

export default RowWrapper;
