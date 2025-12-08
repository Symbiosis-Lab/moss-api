/**
 * Hook context types - data provided to plugins during hook execution
 */

import type { ProjectInfo } from "./plugin";

/**
 * Base context shared by all hooks
 */
export interface BaseContext {
  project_path: string;
  moss_dir: string;
  project_info: ProjectInfo;
  config: Record<string, unknown>;
}

/**
 * Context for before_build hook
 */
export interface BeforeBuildContext extends BaseContext {}

/**
 * Context for on_build hook (generator plugins)
 */
export interface OnBuildContext extends BaseContext {
  source_files: SourceFiles;
}

/**
 * Context for on_deploy hook (deployer plugins)
 */
export interface OnDeployContext extends BaseContext {
  output_dir: string;
  site_files: string[];
}

/**
 * Context for after_deploy hook (syndicator plugins)
 */
export interface AfterDeployContext extends BaseContext {
  output_dir: string;
  site_files: string[];
  articles: ArticleInfo[];
  deployment?: DeploymentInfo;
}

/**
 * Source files categorized by type
 */
export interface SourceFiles {
  markdown: string[];
  pages: string[];
  docx: string[];
  other: string[];
}

/**
 * Article information for syndication
 */
export interface ArticleInfo {
  source_path: string;
  title: string;
  content: string;
  frontmatter: Record<string, unknown>;
  url_path: string;
  date?: string;
  tags: string[];
}

/**
 * Deployment result information
 */
export interface DeploymentInfo {
  method: string;
  url: string;
  deployed_at: string;
  metadata: Record<string, string>;
}
