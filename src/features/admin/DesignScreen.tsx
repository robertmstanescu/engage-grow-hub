/**
 * Design — the whole site's look on one screen.
 *
 * Brand settings (identity, palette, type, outline, logos) and the site
 * defaults (footer, social links, theme defaults), each with its own
 * Save / Publish. The brand preview card inside Brand settings is the
 * one preview; the full sample page that used to sit beside the
 * controls was removed at the owner's request to save space.
 */
import BrandSettings from "./BrandSettings";
import GlobalSettings from "./GlobalSettings";


const DesignScreen = () => {
  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h2 className="admin-h2">Design</h2>
          <p className="admin-sub">The site's look, in one place. Every page inherits this; a block only deviates when you tell it to.</p>
        </div>
      </div>
      <div className="admin-design">
        <div className="admin-design-controls">
          <BrandSettings />
          <GlobalSettings />
        </div>
      </div>
    </div>
  );
};

export default DesignScreen;
