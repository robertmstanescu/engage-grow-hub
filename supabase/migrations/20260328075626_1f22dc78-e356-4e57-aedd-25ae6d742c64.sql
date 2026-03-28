UPDATE site_content
SET content = jsonb_set(
  content::jsonb,
  '{rows,1,content}',
  (content::jsonb->'rows'->1->'content')
    - 'color_label' - 'color_card_bg' - 'color_heading' - 'color_meta_bg' - 'color_meta_fg'
    - 'color_primary' - 'color_cta_text' - 'color_cta_time' - 'color_subtitle' - 'color_card_title'
    - 'color_divider_to' - 'color_dot_active' - 'color_section_bg' - 'color_heading_sub'
    - 'color_note_border' - 'color_divider_from' - 'color_dot_inactive' - 'color_carousel_btn_bg'
    - 'color_carousel_btn_fg' - 'color_deliverables_bg' - 'color_card_description'
    - 'color_deliverables_label'
),
updated_at = now()
WHERE section_key = 'page_rows';