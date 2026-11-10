import { useSiteContent } from "./useSiteContent";

interface ServiceTagType {
  label: string;
  value: string;
  bgColor: string;
  textColor: string;
}

interface BlogCategory {
  label: string;
  bgColor: string;
  textColor: string;
}

interface TagsConfig {
  service_tag_types: ServiceTagType[];
  blog_categories: BlogCategory[];
}

const DEFAULT_TAGS: TagsConfig = {
  service_tag_types: [
    { label: "Fixed project", value: "fixed", bgColor: "#4D1B5E", textColor: "#F9F0C1" },
    { label: "Monthly retainer", value: "retainer", bgColor: "#E5C54F", textColor: "#2A0E33" },
  ],
  // Brand colors for the 4 service pillars — kept in sync with the
  // per-pillar page palette assigned in PillarEditor (see the
  // "pillar branding" migration that seeds/updates this same set into
  // the live `tags_config` site_content row).
  blog_categories: [
    { label: "Internal Communications", bgColor: "#3D348B", textColor: "#FFFFFF" },
    { label: "Employee Experience", bgColor: "#0047AB", textColor: "#FFFFFF" },
    { label: "People Operations", bgColor: "#B11226", textColor: "#FFFFFF" },
    { label: "Fractional HRBP", bgColor: "#005C42", textColor: "#FFFFFF" },
    { label: "Pay Transparency", bgColor: "#E36414", textColor: "#FFFFFF" },
    { label: "Manager Enablement", bgColor: "#702963", textColor: "#FFFFFF" },
    { label: "General", bgColor: "#7B3A91", textColor: "#FFFFFF" },
  ],
};

export const useTagColors = () => {
  const config = useSiteContent<TagsConfig>("tags_config", DEFAULT_TAGS);

  // Handle migration: old blog_categories may be strings
  const blogCategories: BlogCategory[] = config.blog_categories.map((cat: any) =>
    typeof cat === "string" ? { label: cat, bgColor: "#4D1B5E", textColor: "#F9F0C1" } : cat
  );

  const getTagColors = (tagType: string) => {
    const match = config.service_tag_types.find((t) => t.value === tagType);
    if (match) {
      return { bgColor: match.bgColor, textColor: match.textColor };
    }
    return { bgColor: "#4D1B5E", textColor: "#F9F0C1" };
  };

  const getCategoryColors = (categoryLabel: string) => {
    const match = blogCategories.find((c) => c.label === categoryLabel);
    if (match) {
      return { bgColor: match.bgColor, textColor: match.textColor };
    }
    return { bgColor: "#4D1B5E", textColor: "#F9F0C1" };
  };

  return {
    getTagColors,
    getCategoryColors,
    tagTypes: config.service_tag_types,
    blogCategories,
  };
};
