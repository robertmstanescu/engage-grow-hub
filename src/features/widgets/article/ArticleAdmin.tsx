/**
 * ArticleAdmin — the inspector panel for the article block. There is
 * nothing to edit here on purpose: the words are edited under Posts.
 */
const ArticleAdmin = () => (
  <div className="space-y-2" data-article-admin>
    <p className="font-body text-sm text-foreground">This block places the post's own words on the page.</p>
    <p className="font-body text-xs text-muted-foreground">
      Edit the article under Posts → Content. Here you add other blocks above or below it; the article block itself stays.
    </p>
  </div>
);

export default ArticleAdmin;
