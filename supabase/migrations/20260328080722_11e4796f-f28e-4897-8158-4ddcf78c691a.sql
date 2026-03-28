
UPDATE site_content
SET content = jsonb_set(
  content,
  '{rows}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN elem->>'type' = 'service' AND elem->>'strip_title' = 'Internal Communications'
        THEN elem #- '{content,color_carousel_btn_bg}'
                #- '{content,color_carousel_btn_fg}'
                #- '{content,color_dot_active}'
                #- '{content,color_dot_inactive}'
                #- '{content,color_label}'
                #- '{content,color_card_bg}'
                #- '{content,color_heading}'
                #- '{content,color_meta_bg}'
                #- '{content,color_meta_fg}'
                #- '{content,color_primary}'
                #- '{content,color_cta_text}'
                #- '{content,color_cta_time}'
                #- '{content,color_subtitle}'
                #- '{content,color_card_title}'
                #- '{content,color_divider_to}'
                #- '{content,color_section_bg}'
                #- '{content,color_heading_sub}'
                #- '{content,color_note_border}'
                #- '{content,color_divider_from}'
                #- '{content,color_deliverables_bg}'
                #- '{content,color_card_description}'
                #- '{content,color_deliverables_label}'
        ELSE elem
      END
    )
    FROM jsonb_array_elements(content->'rows') elem
  )
)
WHERE section_key = 'page_rows';
