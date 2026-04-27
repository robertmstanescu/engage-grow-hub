export interface EmailBlock {
  id: string;
  type: "text" | "image" | "blog-preview" | "hero" | "divider" | "button";
  content: string;       // HTML for text, URL for image, slug for blog-preview
  settings: {
    backgroundColor?: string;
    backgroundImage?: string;
    gradientOpacity?: number;
    textColor?: string;
    buttonUrl?: string;
    buttonText?: string;
    buttonBg?: string;
    buttonColor?: string;
    alignment?: "left" | "center" | "right";
    padding?: string;
    blogTitle?: string;
    blogExcerpt?: string;
    blogCategory?: string;
    blogUrl?: string;
  };
}

export const createBlock = (type: EmailBlock["type"]): EmailBlock => ({
  id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  type,
  content: type === "text" ? "<p>Write your content here...</p>" : "",
  settings: {
    backgroundColor: type === "hero" ? "#1a1a1a" : "#ffffff",
    gradientOpacity: 0.65,
    textColor: type === "hero" ? "#F4F0EC" : "#1B1F24",
    buttonUrl: "",
    buttonText: "Read More",
    buttonBg: "#1a1a1a",
    buttonColor: "#FFFFFF",
    alignment: "center",
    padding: "32px 20px",
  },
});

export const blocksToHtml = (blocks: EmailBlock[]): string => {
  const rows = blocks.map((block) => {
    switch (block.type) {
      case "text":
        return `<tr><td style="padding:${block.settings.padding || "32px 20px"};background:${block.settings.backgroundColor || "#ffffff"};color:${block.settings.textColor || "#1B1F24"};font-family:'Inter',Arial,sans-serif;font-size:14px;line-height:1.7;text-align:${block.settings.alignment || "left"};">${block.content}</td></tr>`;

      case "image":
        return block.content
          ? `<tr><td style="padding:0;text-align:center;background:${block.settings.backgroundColor || "#ffffff"};"><img src="${block.content}" alt="" style="max-width:100%;height:auto;display:block;margin:0 auto;" /></td></tr>`
          : "";

      case "hero":
        return `<tr><td style="padding:${block.settings.padding || "48px 32px"};background:${block.settings.backgroundColor || "#2A0E33"};${block.settings.backgroundImage ? `background-image:linear-gradient(rgba(0,0,0,${block.settings.gradientOpacity || 0.65}),rgba(0,0,0,${block.settings.gradientOpacity || 0.65})),url(${block.settings.backgroundImage});background-size:cover;background-position:center;` : ""}color:${block.settings.textColor || "#F4F0EC"};font-family:'Unbounded',sans-serif;text-align:${block.settings.alignment || "center"};">${block.content}</td></tr>`;

      case "blog-preview":
        return `<tr><td style="padding:24px 20px;background:#ffffff;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e8e0d8;border-radius:12px;overflow:hidden;">
            ${block.settings.backgroundImage ? `<tr><td style="padding:0;"><img src="${block.settings.backgroundImage}" alt="" style="width:100%;height:180px;object-fit:cover;display:block;" /></td></tr>` : ""}
            <tr><td style="padding:24px;">
              <p style="font-family:'Inter',Arial,sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:0.18em;color:#7B3A91;margin:0 0 8px 0;">${block.settings.blogCategory || ""}</p>
              <h2 style="font-family:'Unbounded',sans-serif;font-size:18px;color:#2A0E33;margin:0 0 8px 0;line-height:1.3;">${block.settings.blogTitle || ""}</h2>
              <p style="font-family:'Inter',Arial,sans-serif;font-size:13px;color:#1B1F24;opacity:0.7;line-height:1.6;margin:0 0 16px 0;">${block.settings.blogExcerpt || ""}</p>
              <a href="${block.settings.blogUrl || "#"}" style="display:inline-block;background:#4D1B5E;color:#F9F0C1;padding:10px 24px;border-radius:50px;text-decoration:none;font-family:'Unbounded',sans-serif;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:0.08em;">Read Article</a>
            </td></tr>
          </table>
        </td></tr>`;

      case "button":
        return `<tr><td style="padding:${block.settings.padding || "24px 20px"};background:${block.settings.backgroundColor || "#ffffff"};text-align:${block.settings.alignment || "center"};"><a href="${block.settings.buttonUrl || "#"}" style="display:inline-block;background:${block.settings.buttonBg || "#4D1B5E"};color:${block.settings.buttonColor || "#F9F0C1"};padding:12px 28px;border-radius:50px;text-decoration:none;font-family:'Unbounded',sans-serif;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:0.08em;">${block.settings.buttonText || "Click Here"}</a></td></tr>`;

      case "divider":
        return `<tr><td style="padding:8px 20px;background:${block.settings.backgroundColor || "#ffffff"};"><hr style="border:none;height:2px;background:linear-gradient(to right,#4D1B5E,#7B3A91);margin:0;" /></td></tr>`;

      default:
        return "";
    }
  }).join("\n");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:0;background:#F4F0EC;font-family:'Inter',Arial,sans-serif;}img{border:0;}a{color:#4D1B5E;}h1,h2,h3{font-family:'Unbounded',sans-serif;}</style></head><body style="margin:0;padding:0;background:#F4F0EC;"><center><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4F0EC;"><tr><td align="center" style="padding:20px 0;"><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">${rows}</table><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;"><tr><td style="padding:20px;text-align:center;font-family:'Inter',Arial,sans-serif;font-size:11px;color:#999;">The Magic Coffin · Internal Communications & Employee Experience<br/>You received this because you opted in to our mailing list.</td></tr></table></td></tr></table></center></body></html>`;
};
