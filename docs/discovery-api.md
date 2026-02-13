# Discovery API Specification

> **Status**: Design Document (Not Implemented)
>
> This document specifies the planned Discovery APIs for moss-api SDK.
> Implementation is deferred until the recommendation algorithm is tuned in indie-reader.

## Overview

The Discovery API provides plugins with capabilities to:

1. Manage followed sites
2. Rank articles based on user content
3. Record user feedback
4. Access content from the current document

## API Reference

### Site Management

#### `getFollowedSites()`

Get the list of sites the user is following.

```typescript
interface FollowedSite {
  url: string;
  name: string | null;
  trustScore: number;
  hopCount: number | null;
  followedAt: Date;
  lastCrawledAt: Date | null;
}

export async function getFollowedSites(): Promise<FollowedSite[]>;
```

#### `addFollowedSite(url: string)`

Add a site to the user's followed list and trigger initial crawl.

```typescript
export async function addFollowedSite(url: string): Promise<void>;
```

#### `removeFollowedSite(url: string)`

Remove a site from the user's followed list.

```typescript
export async function removeFollowedSite(url: string): Promise<void>;
```

### Article Ranking

#### `rankArticles(userContent, candidates)`

Rank articles based on user content using the hybrid ranking algorithm.

```typescript
interface ArticleCandidate {
  id: string;
  url: string;
  siteUrl: string;
  title: string | null;
  description: string | null;
  content?: string | null;
  publishedAt: Date | null;
}

interface RankedArticle {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  siteUrl: string;
  siteName: string | null;
  score: number;
  signals: {
    keyword: number;
    embedding: number;
    graph: number;
    recency: number;
    diversity: number;
  };
}

export async function rankArticles(
  userContent: string,
  candidates: ArticleCandidate[],
): Promise<RankedArticle[]>;
```

### User Actions

#### `dismissArticle(id, reason?)`

Record that a user dismissed an article.

```typescript
export async function dismissArticle(
  id: string,
  reason?: string,
): Promise<void>;
```

#### `saveArticle(article)`

Save an article to the user's bookmarks.

```typescript
interface SavedArticle {
  url: string;
  title: string;
  description: string | null;
  siteUrl: string;
  savedAt: Date;
}

export async function saveArticle(article: SavedArticle): Promise<void>;
```

#### `getSavedArticles()`

Get the user's saved articles.

```typescript
export async function getSavedArticles(): Promise<SavedArticle[]>;
```

### Content Access

#### `getCurrentFileContent()`

Get the content of the currently active file.

```typescript
export async function getCurrentFileContent(): Promise<string | null>;
```

#### `getAllProjectContent()`

Get content from all markdown files in the project.

```typescript
interface ProjectContent {
  files: Array<{
    path: string;
    content: string;
    frontmatter: Record<string, unknown>;
    lastModified: Date;
  }>;
  totalWordCount: number;
}

export async function getAllProjectContent(): Promise<ProjectContent>;
```

### Firehose Connection

#### `subscribeToFirehose(url, onArticle)`

Subscribe to a firehose for real-time article updates.

```typescript
interface FirehoseArticle {
  id: string;
  url: string;
  siteUrl: string;
  title: string;
  description: string | null;
  publishedAt: Date;
}

export function subscribeToFirehose(
  url: string,
  onArticle: (article: FirehoseArticle) => void,
): () => void; // Returns unsubscribe function
```

## Events

### `discovery:content-changed`

Emitted when user's document content changes (debounced).

```typescript
interface ContentChangedEvent {
  filePath: string;
  content: string;
  contentHash: string;
}

api.on('discovery:content-changed', (event: ContentChangedEvent) => {
  // Handle content change
});
```

### `discovery:recommendations-updated`

Emitted when new recommendations are available.

```typescript
interface RecommendationsUpdatedEvent {
  articles: RankedArticle[];
  contentHash: string;
}

api.on('discovery:recommendations-updated', (event: RecommendationsUpdatedEvent) => {
  // Update UI with new recommendations
});
```

## Storage

Discovery plugins have access to plugin-specific storage:

```typescript
import { getPluginStorage } from 'moss-api';

const storage = getPluginStorage('discovery');

// Save data
await storage.set('config', { firehoseUrl: 'https://...' });

// Load data
const config = await storage.get('config');

// Delete data
await storage.delete('config');
```

## Usage Example

```typescript
import {
  rankArticles,
  getCurrentFileContent,
  subscribeToFirehose,
  addFollowedSite,
  dismissArticle,
} from 'moss-api/discovery';

// Get current content and rank articles
const content = await getCurrentFileContent();
if (content) {
  const candidates = await fetchCandidates();
  const ranked = await rankArticles(content, candidates);
  displayRecommendations(ranked);
}

// Subscribe to firehose for new articles
const unsubscribe = subscribeToFirehose(
  'https://indie-reader.example.com/sse',
  (article) => {
    console.log('New article:', article.title);
    refreshRecommendations();
  }
);

// Handle user actions
async function handleFollow(siteUrl: string) {
  await addFollowedSite(siteUrl);
}

async function handleDismiss(articleId: string) {
  await dismissArticle(articleId, 'not_relevant');
}
```

## Error Handling

All APIs throw typed errors:

```typescript
import { DiscoveryError } from 'moss-api/discovery';

try {
  await addFollowedSite(url);
} catch (error) {
  if (error instanceof DiscoveryError) {
    switch (error.code) {
      case 'INVALID_URL':
        showError('Invalid site URL');
        break;
      case 'CRAWL_FAILED':
        showError('Could not fetch site');
        break;
      default:
        showError('An error occurred');
    }
  }
}
```

## Rate Limiting

- `rankArticles`: Max 10 calls per minute
- `addFollowedSite`: Max 5 calls per minute
- Firehose reconnection: Exponential backoff (1s, 2s, 4s, ...)

## Related Documents

- [Discovery Capability](../../moss/docs/plugins/discovery-capability.md)
- [Apple Intelligence Integration](../../moss/docs/architecture/apple-intelligence.md)
