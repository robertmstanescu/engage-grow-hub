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
  blog_categories: [
    { label: "Internal Communications", bgColor: "#4D1B5E", textColor: "#F9F0C1" },
    { label: "Employee Experience", bgColor: "#E5C54F", textColor: "#2A0E33" },
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
