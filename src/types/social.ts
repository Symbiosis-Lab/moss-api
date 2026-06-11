/** One comment in the .moss/data/social/*.json shared standard.
 *  See moss/docs/architecture/social-data-standard.md. */
export interface SocialComment {
  id: string;
  source: string;
  content: string;
  createdAt: string;
  author: { displayName: string; url?: string };
  replyToId?: string;
  state?: "active" | "removed" | "archived" | "banned" | "collapsed";
}

export interface SocialArticleData {
  comments: SocialComment[];
}

export interface SocialDataFile {
  schemaVersion: string;
  articles: Record<string, SocialArticleData>;
}
