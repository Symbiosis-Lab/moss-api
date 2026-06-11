/** One comment in the .moss/data/social/*.json shared standard.
 *  See moss/docs/architecture/social-data-standard.md. */
export interface SocialComment {
  id: string;
  source: string;
  content: string;
  createdAt: string;
  author: { displayName: string; url?: string };
  replyToId?: string;
  /**
   * Moderation state. Absent or "active" = visible; anything else is filtered
   * at read time. Well-known values: "active" | "removed" | "archived" |
   * "banned" | "collapsed". The Rust side treats this as an open string so
   * future states do not require a client update.
   */
  state?: string;
}

export interface SocialArticleData {
  comments: SocialComment[];
}

export interface SocialDataFile {
  schemaVersion: string;
  articles: Record<string, SocialArticleData>;
}
