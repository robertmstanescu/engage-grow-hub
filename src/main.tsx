import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Side-effect import: populates the WidgetRegistry before the first
// render. PageRows.tsx looks widgets up by type at runtime, so this
// must run BEFORE any route mounts. See src/widgets/index.tsx.
import "./widgets";

createRoot(document.getElementById("root")!).render(<App />);

