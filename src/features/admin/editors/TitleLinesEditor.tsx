/**
 * TitleLinesEditor — the title field every row editor uses.
 *
 * Kept as the single entry point (Hero, Text, Boxed, Grid, Image + Text,
 * Profile, the legacy RowsManager) so the storage shape stays
 * `title_lines: string[]`, one HTML paragraph per visual line. The UI is
 * `TitleEditor`: one box, one line per row, formatting only on
 * selection. Legacy `{ text, type }` lines are converted on the way in.
 */
import TitleEditor from "../site-editor/TitleEditor";
import { toTitleHtmlLine } from "../site-editor/titleHtml";

interface Props {
  /** HTML strings (or legacy objects) — one per visual line. */
  titleLines: unknown[];
  onChange: (lines: string[]) => void;
  /** Live row background so the box shows the real contrast. */
  bgColor?: string;
  label?: string;
}

const TitleLinesEditor = ({ titleLines, onChange, bgColor, label }: Props) => (
  <TitleEditor lines={(titleLines || []).map(toTitleHtmlLine)} onChange={onChange} bgColor={bgColor} label={label} />
);

export default TitleLinesEditor;
