update site_content
set content = jsonb_set(content::jsonb, '{meta_title}', '"Internal Comms Consulting | The Magic Coffin"'),
    draft_content = case when draft_content is null then null else jsonb_set(draft_content::jsonb, '{meta_title}', '"Internal Comms Consulting | The Magic Coffin"') end
where section_key = 'main_page_seo';

update site_content
set content = jsonb_set(jsonb_set(content::jsonb, '{meta_title}', '"Internal Comms Insights | The Magic Coffin"'), '{meta_description}', '"Sharp thinking on internal communications and employee experience: practical articles to help you bury the culture vampires draining your teams."'),
    draft_content = case when draft_content is null then null else jsonb_set(jsonb_set(draft_content::jsonb, '{meta_title}', '"Internal Comms Insights | The Magic Coffin"'), '{meta_description}', '"Sharp thinking on internal communications and employee experience: practical articles to help you bury the culture vampires draining your teams."') end
where section_key = 'blog_page';

update cms_pages set meta_title = 'Privacy Policy | The Magic Coffin' where slug = 'privacy-policy';
update cms_pages set meta_title = 'About Us | The Magic Coffin' where slug = 'about-us';
update cms_pages set meta_description = 'Meet The Magic Coffin: a boutique consultancy helping startups and scaleups fix internal communications and employee experience.' where slug = 'about-us' and coalesce(meta_description, '') = '';