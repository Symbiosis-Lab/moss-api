/**
 * Hook context types - data provided to plugins during hook execution
 *
 * Note: Paths (project_path, moss_dir, output_dir) are NOT included here.
 * Plugins should use the filesystem APIs (readFile, writeFile, etc.)
 * and plugin storage APIs (readPluginFile, writePluginFile, etc.)
 * which automatically resolve paths from the internal context.
 */

import type { ProjectInfo } from "./plugin";

/**
 * Base context shared by all hooks
 *
 * Contains only business data - no paths.
 * Use readFile(), writeFile() for project files.
 * Use readPluginFile(), writePluginFile() for plugin storage.
 */
export interface BaseContext {
  project_info: ProjectInfo;
  config: Record<string, unknown>;
}

/**
 * Context for before_build hook (process capability)
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
  site_files: string[];
}

/**
 * Context for after_deploy hook (syndicator plugins)
 */
export interface AfterDeployContext extends BaseContext {
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
