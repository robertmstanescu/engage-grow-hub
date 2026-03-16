import { useSiteContent } from "./useSiteContent";

interface ServiceTagType {
  label: string;
  value: string;
  bgColor: string;
  textColor: string;
}

interface TagsConfig {
  service_tag_types: ServiceTagType[];
  blog_categories: string[];
}

const DEFAULT_TAGS: TagsConfig = {
  service_tag_types: [
    { label: "Fixed project", value: "fixed", bgColor: "#4D1B5E", textColor: "#F9F0C1" },
    { label: "Monthly retainer", value: "retainer", bgColor: "#E5C54F", textColor: "#2A0E33" },
  ],
  blog_categories: [],
};

export const useTagColors = () => {
  const config = useSiteContent<TagsConfig>("tags_config", DEFAULT_TAGS);
  
  const getTagColors = (tagType: string) => {
    const match = config.service_tag_types.find((t) => t.value === tagType);
    if (match) {
      return { bgColor: match.bgColor, textColor: match.textColor };
    }
    // Fallback to first tag type or defaults
    return { bgColor: "#4D1B5E", textColor: "#F9F0C1" };
  };

  return { getTagColors, tagTypes: config.service_tag_types };
};
