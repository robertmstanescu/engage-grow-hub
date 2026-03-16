import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Type, ImageIcon, Newspaper, Star, Minus, MousePointerClick,
  Trash2, ChevronUp, ChevronDown, Upload, Palette,
} from "lucide-react";
import RichTextEditor from "./RichTextEditor";
import { EmailBlock, createBlock, blocksToHtml } from "./email-blocks";

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string | null;
  category: string;
  published_at: string | null;
}

interface EmailBlockEditorProps {
  blocks: EmailBlock[];
  onChange: (blocks: EmailBlock[]) => void;
}

const EmailBlockEditor = ({ blocks, onChange }: EmailBlockEditorProps) => {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const blogImageInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{ blockId: string; field: "content" | "backgroundImage" } | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("slug, title, excerpt, category, published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false });
      if (data) setBlogPosts(data);
    };
    fetchPosts();
  }, []);

  const updateBlock = (id: string, updates: Partial<EmailBlock>) => {
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const updateSettings = (id: string, settings: Partial<EmailBlock["settings"]>) => {
    onChange(
      blocks.map((b) =>
        b.id === id ? { ...b, settings: { ...b.settings, ...settings } } : b
      )
    );
  };

  const removeBlock = (id: string) => {
    onChange(blocks.filter((b) => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const moveBlock = (id: string, dir: -1 | 1) => {
    const idx = blocks.findIndex((b) => b.id === id);
    if ((dir === -1 && idx === 0) || (dir === 1 && idx === blocks.length - 1)) return;
    const newBlocks = [...blocks];
    [newBlocks[idx], newBlocks[idx + dir]] = [newBlocks[idx + dir], newBlocks[idx]];
    onChange(newBlocks);
  };

  const addBlock = (type: EmailBlock["type"]) => {
    const block = createBlock(type);
    onChange([...blocks, block]);
    setSelectedBlockId(block.id);
  };

  const addBlogPreview = (post: BlogPost) => {
    const block = createBlock("blog-preview");
    block.content = post.slug;
    block.settings.blogTitle = post.title;
    block.settings.blogExcerpt = post.excerpt || "";
    block.settings.blogCategory = post.category;
    block.settings.blogUrl = `https://themagiccoffin.com/blog/${post.slug}`;
    onChange([...blocks, block]);
    setSelectedBlockId(block.id);
  };

  const handleImageUpload = useCallback(async (file: File, blockId: string, field: "content" | "backgroundImage") => {
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }

    const ext = file.name.split(".").pop();
    const path = `emails/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("editor-images").upload(path, file);
    if (error) { toast.error("Upload failed"); return; }

    const { data: { publicUrl } } = supabase.storage.from("editor-images").getPublicUrl(path);

    if (field === "content") {
      updateBlock(blockId, { content: publicUrl });
    } else {
      updateSettings(blockId, { backgroundImage: publicUrl });
    }
    toast.success("Image uploaded");
  }, [blocks, onChange]);

  const blockTypes = [
    { type: "text" as const, icon: Type, label: "Text" },
    { type: "image" as const, icon: ImageIcon, label: "Image" },
    { type: "hero" as const, icon: Star, label: "Hero" },
    { type: "button" as const, icon: MousePointerClick, label: "Button" },
    { type: "divider" as const, icon: Minus, label: "Divider" },
  ];

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
      {/* Main editor area */}
      <div className="space-y-3">
        {/* Add block toolbar */}
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border" style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--muted) / 0.2)" }}>
          <span className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mr-1">Add:</span>
          {blockTypes.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              onClick={() => addBlock(type)}
              className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded-md border transition-colors hover:opacity-80"
              style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}>
              <Icon size={13} /> {label}
            </button>
          ))}

          {/* Blog previews dropdown */}
          {blogPosts.length > 0 && (
            <div className="relative group">
              <button
                className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded-md border transition-colors hover:opacity-80"
                style={{ borderColor: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))", backgroundColor: "hsl(var(--accent) / 0.1)" }}>
                <Newspaper size={13} /> Blog Post
              </button>
              <div className="absolute left-0 top-full mt-1 w-72 rounded-lg shadow-lg border z-10 hidden group-hover:block"
                style={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
                {blogPosts.map((post) => (
                  <button
                    key={post.slug}
                    onClick={() => addBlogPreview(post)}
                    className="block w-full text-left px-3 py-2 font-body text-xs hover:opacity-70 transition-opacity border-b last:border-b-0"
                    style={{ borderColor: "hsl(var(--border) / 0.3)", color: "hsl(var(--foreground))" }}>
                    <span className="font-medium">{post.title}</span>
                    <span className="block text-[10px] text-muted-foreground">{post.category}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Block list */}
        {blocks.length === 0 ? (
          <div className="py-16 text-center rounded-lg border border-dashed" style={{ borderColor: "hsl(var(--border))" }}>
            <p className="font-body text-sm text-muted-foreground">Add blocks to build your email</p>
          </div>
        ) : (
          blocks.map((block, idx) => (
            <div
              key={block.id}
              onClick={() => setSelectedBlockId(block.id)}
              className="relative rounded-lg border transition-all cursor-pointer"
              style={{
                borderColor: selectedBlockId === block.id ? "hsl(var(--primary))" : "hsl(var(--border) / 0.5)",
                boxShadow: selectedBlockId === block.id ? "0 0 0 2px hsl(var(--primary) / 0.15)" : "none",
              }}>
              {/* Block controls */}
              <div className="absolute -right-2 -top-2 flex gap-0.5 z-10 opacity-0 hover:opacity-100 transition-opacity"
                style={{ opacity: selectedBlockId === block.id ? 1 : undefined }}>
                <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, -1); }}
                  className="p-1 rounded bg-card border shadow-sm" style={{ borderColor: "hsl(var(--border))" }}>
                  <ChevronUp size={12} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 1); }}
                  className="p-1 rounded bg-card border shadow-sm" style={{ borderColor: "hsl(var(--border))" }}>
                  <ChevronDown size={12} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}
                  className="p-1 rounded border shadow-sm" style={{ backgroundColor: "hsl(var(--destructive) / 0.1)", borderColor: "hsl(var(--destructive) / 0.3)", color: "hsl(var(--destructive))" }}>
                  <Trash2 size={12} />
                </button>
              </div>

              {/* Block label */}
              <div className="px-3 py-1.5 border-b flex items-center gap-1.5" style={{ borderColor: "hsl(var(--border) / 0.3)", backgroundColor: "hsl(var(--muted) / 0.2)" }}>
                <span className="font-body text-[9px] uppercase tracking-wider text-muted-foreground">
                  {block.type === "blog-preview" ? "Blog Preview" : block.type}
                </span>
              </div>

              {/* Block content */}
              <div className="p-3">
                {block.type === "text" && (
                  <RichTextEditor
                    content={block.content}
                    onChange={(html) => updateBlock(block.id, { content: html })}
                  />
                )}

                {block.type === "image" && (
                  <div className="text-center">
                    {block.content ? (
                      <img src={block.content} alt="" className="max-w-full h-auto rounded mx-auto max-h-[200px] object-contain" />
                    ) : (
                      <button
                        onClick={() => { setUploadTarget({ blockId: block.id, field: "content" }); fileInputRef.current?.click(); }}
                        className="w-full py-8 rounded-lg border-2 border-dashed flex flex-col items-center gap-2 hover:opacity-70 transition-opacity"
                        style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>
                        <Upload size={20} />
                        <span className="font-body text-xs">Upload image</span>
                      </button>
                    )}
                    {block.content && (
                      <button
                        onClick={() => { setUploadTarget({ blockId: block.id, field: "content" }); fileInputRef.current?.click(); }}
                        className="mt-2 font-body text-[10px] uppercase tracking-wider text-muted-foreground hover:opacity-70">
                        Replace image
                      </button>
                    )}
                  </div>
                )}

                {block.type === "hero" && (
                  <div
                    className="rounded-lg p-6 text-center"
                    style={{
                      backgroundColor: block.settings.backgroundColor || "#2A0E33",
                      backgroundImage: block.settings.backgroundImage
                        ? `linear-gradient(rgba(0,0,0,${block.settings.gradientOpacity || 0.65}),rgba(0,0,0,${block.settings.gradientOpacity || 0.65})),url(${block.settings.backgroundImage})`
                        : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}>
                    <RichTextEditor
                      content={block.content || "<h1>Your headline</h1><p>Supporting text here</p>"}
                      onChange={(html) => updateBlock(block.id, { content: html })}
                    />
                  </div>
                )}

                {block.type === "blog-preview" && (
                  <div className="rounded-lg border overflow-hidden" style={{ borderColor: "hsl(var(--border))" }}>
                    {block.settings.backgroundImage && (
                      <img src={block.settings.backgroundImage} alt="" className="w-full h-32 object-cover" />
                    )}
                    <div className="p-4">
                      <span className="font-body text-[9px] uppercase tracking-wider" style={{ color: "hsl(var(--valentino))" }}>
                        {block.settings.blogCategory}
                      </span>
                      <h3 className="font-display text-sm font-bold mt-1" style={{ color: "hsl(var(--secondary))" }}>
                        {block.settings.blogTitle}
                      </h3>
                      <p className="font-body text-xs text-foreground/60 mt-1 line-clamp-2">{block.settings.blogExcerpt}</p>
                    </div>
                  </div>
                )}

                {block.type === "button" && (
                  <div className="text-center py-4">
                    <span
                      className="inline-block px-6 py-2.5 rounded-full font-display text-[11px] uppercase tracking-wider font-bold"
                      style={{
                        backgroundColor: block.settings.buttonBg || "#4D1B5E",
                        color: block.settings.buttonColor || "#F9F0C1",
                      }}>
                      {block.settings.buttonText || "Click Here"}
                    </span>
                  </div>
                )}

                {block.type === "divider" && (
                  <div className="py-2">
                    <hr className="border-none h-0.5" style={{ background: "linear-gradient(to right, hsl(var(--violet)), hsl(var(--valentino)))" }} />
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Settings sidebar */}
      <div className="space-y-3">
        <div className="rounded-lg border p-3" style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--card))" }}>
          <h3 className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Block Settings</h3>

          {!selectedBlock ? (
            <p className="font-body text-xs text-muted-foreground">Select a block to edit its settings</p>
          ) : (
            <div className="space-y-3">
              {/* Background color */}
              <div>
                <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Background</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={selectedBlock.settings.backgroundColor || "#ffffff"}
                    onChange={(e) => updateSettings(selectedBlock.id, { backgroundColor: e.target.value })}
                    className="w-8 h-8 rounded border cursor-pointer"
                    style={{ borderColor: "hsl(var(--border))" }}
                  />
                  <input
                    type="text"
                    value={selectedBlock.settings.backgroundColor || "#ffffff"}
                    onChange={(e) => updateSettings(selectedBlock.id, { backgroundColor: e.target.value })}
                    className="flex-1 px-2 py-1 rounded border font-mono text-xs"
                    style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}
                  />
                </div>
              </div>

              {/* Text color */}
              {(selectedBlock.type === "text" || selectedBlock.type === "hero") && (
                <div>
                  <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Text Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedBlock.settings.textColor || "#1B1F24"}
                      onChange={(e) => updateSettings(selectedBlock.id, { textColor: e.target.value })}
                      className="w-8 h-8 rounded border cursor-pointer"
                      style={{ borderColor: "hsl(var(--border))" }}
                    />
                    <input
                      type="text"
                      value={selectedBlock.settings.textColor || "#1B1F24"}
                      onChange={(e) => updateSettings(selectedBlock.id, { textColor: e.target.value })}
                      className="flex-1 px-2 py-1 rounded border font-mono text-xs"
                      style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}
                    />
                  </div>
                </div>
              )}

              {/* Hero background image */}
              {(selectedBlock.type === "hero" || selectedBlock.type === "blog-preview") && (
                <div>
                  <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
                    {selectedBlock.type === "hero" ? "Background Image" : "Cover Image"}
                  </label>
                  {selectedBlock.settings.backgroundImage && (
                    <img src={selectedBlock.settings.backgroundImage} alt="" className="w-full h-20 object-cover rounded mb-2" />
                  )}
                  <button
                    onClick={() => {
                      setUploadTarget({ blockId: selectedBlock.id, field: "backgroundImage" });
                      heroFileInputRef.current?.click();
                    }}
                    className="w-full font-body text-[10px] uppercase tracking-wider px-3 py-2 rounded border hover:opacity-80 transition-opacity flex items-center justify-center gap-1"
                    style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}>
                    <Upload size={12} /> {selectedBlock.settings.backgroundImage ? "Replace" : "Upload"} Image
                  </button>
                </div>
              )}

              {/* Gradient opacity for hero */}
              {selectedBlock.type === "hero" && selectedBlock.settings.backgroundImage && (
                <div>
                  <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
                    Overlay Darkness: {Math.round((selectedBlock.settings.gradientOpacity || 0.65) * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={(selectedBlock.settings.gradientOpacity || 0.65) * 100}
                    onChange={(e) => updateSettings(selectedBlock.id, { gradientOpacity: parseInt(e.target.value) / 100 })}
                    className="w-full"
                  />
                </div>
              )}

              {/* Alignment */}
              <div>
                <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Alignment</label>
                <div className="flex gap-1">
                  {(["left", "center", "right"] as const).map((align) => (
                    <button
                      key={align}
                      onClick={() => updateSettings(selectedBlock.id, { alignment: align })}
                      className="flex-1 font-body text-[10px] uppercase tracking-wider py-1.5 rounded transition-colors"
                      style={{
                        backgroundColor: selectedBlock.settings.alignment === align ? "hsl(var(--primary) / 0.1)" : "transparent",
                        color: selectedBlock.settings.alignment === align ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                        border: `1px solid ${selectedBlock.settings.alignment === align ? "hsl(var(--primary) / 0.3)" : "hsl(var(--border))"}`,
                      }}>
                      {align}
                    </button>
                  ))}
                </div>
              </div>

              {/* Button settings */}
              {selectedBlock.type === "button" && (
                <>
                  <div>
                    <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Button Text</label>
                    <input
                      value={selectedBlock.settings.buttonText || ""}
                      onChange={(e) => updateSettings(selectedBlock.id, { buttonText: e.target.value })}
                      className="w-full px-2 py-1.5 rounded border font-body text-xs"
                      style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}
                    />
                  </div>
                  <div>
                    <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Button URL</label>
                    <input
                      value={selectedBlock.settings.buttonUrl || ""}
                      onChange={(e) => updateSettings(selectedBlock.id, { buttonUrl: e.target.value })}
                      className="w-full px-2 py-1.5 rounded border font-body text-xs"
                      style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Btn BG</label>
                      <input type="color" value={selectedBlock.settings.buttonBg || "#4D1B5E"}
                        onChange={(e) => updateSettings(selectedBlock.id, { buttonBg: e.target.value })}
                        className="w-full h-8 rounded border cursor-pointer" style={{ borderColor: "hsl(var(--border))" }} />
                    </div>
                    <div>
                      <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Btn Text</label>
                      <input type="color" value={selectedBlock.settings.buttonColor || "#F9F0C1"}
                        onChange={(e) => updateSettings(selectedBlock.id, { buttonColor: e.target.value })}
                        className="w-full h-8 rounded border cursor-pointer" style={{ borderColor: "hsl(var(--border))" }} />
                    </div>
                  </div>
                </>
              )}

              {/* Blog preview URL */}
              {selectedBlock.type === "blog-preview" && (
                <div>
                  <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Article URL</label>
                  <input
                    value={selectedBlock.settings.blogUrl || ""}
                    onChange={(e) => updateSettings(selectedBlock.id, { blogUrl: e.target.value })}
                    className="w-full px-2 py-1.5 rounded border font-body text-xs"
                    style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadTarget) handleImageUpload(file, uploadTarget.blockId, uploadTarget.field);
          e.target.value = "";
        }} />
      <input ref={heroFileInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadTarget) handleImageUpload(file, uploadTarget.blockId, uploadTarget.field);
          e.target.value = "";
        }} />
    </div>
  );
};

export default EmailBlockEditor;
