/**
 * Base plugin types shared across all Moss plugins
 */

export interface ProjectInfo {
  project_type: string;
  content_folders: string[];
  total_files: number;
  homepage_file?: string;
}

export interface PluginManifest {
  name: string;
  version: string;
  entry: string;
  category: PluginCategory;
  global_name?: string;
  icon?: string;
  domain?: string;
  config?: Record<string, unknown>;
}

export type PluginCategory =
  | "generator"
  | "deployer"
  | "syndicator"
  | "enhancer"
  | "processor";
