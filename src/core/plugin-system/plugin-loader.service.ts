import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { IPlugin } from './interfaces/plugin.interface';
import { PluginRegistryService } from './plugin-registry.service';
import {
  PluginInstallationResult,
  PluginInstallationOptions,
  PluginMarketplaceInfo,
  PluginLoadingContext,
  PluginErrorType,
} from '@/types/plugin.types';
import {
  getPluginMetadata,
  isPlugin,
} from './decorators/plugin.decorator';

/**
 * Plugin loader service for dynamic plugin loading and management
 * Handles filesystem-based plugin discovery and installation
 */
@Injectable()
export class PluginLoaderService {
  private readonly logger = new Logger(PluginLoaderService.name);
  private readonly pluginPaths: string[] = [];

  constructor(
    private readonly pluginRegistry: PluginRegistryService,
    private readonly configService: ConfigService,
  ) {
    // Initialize plugin paths from configuration
    const registryPath = this.configService.get('PLUGIN_REGISTRY_PATH', './plugins-external');
    this.pluginPaths.push(registryPath);
  }

  /**
   * Discover and load all plugins from configured paths
   */
  async loadAllPlugins(): Promise<void> {
    this.logger.log('Loading all plugins from configured paths');

    for (const pluginPath of this.pluginPaths) {
      try {
        await this.loadPluginsFromPath(pluginPath);
      } catch (error) {
        this.logger.error(`Failed to load plugins from path ${pluginPath}:`, error);
      }
    }
  }

  /**
   * Load plugins from a specific directory path
   */
  async loadPluginsFromPath(pluginPath: string): Promise<void> {
    try {
      // Check if path exists
      const pathExists = await this.pathExists(pluginPath);
      if (!pathExists) {
        this.logger.warn(`Plugin path does not exist: ${pluginPath}`);
        return;
      }

      // Read directory contents
      const entries = await fs.readdir(pluginPath, { withFileTypes: true });
      const pluginDirs = entries.filter(entry => entry.isDirectory());

      this.logger.log(`Found ${pluginDirs.length} potential plugins in ${pluginPath}`);

      // Load each plugin directory
      for (const pluginDir of pluginDirs) {
        const fullPath = path.join(pluginPath, pluginDir.name);
        await this.loadPluginFromDirectory(fullPath);
      }
    } catch (error) {
      this.logger.error(`Error loading plugins from path ${pluginPath}:`, error);
      throw error;
    }
  }

  /**
   * Load a single plugin from a directory
   */
  async loadPluginFromDirectory(pluginDir: string): Promise<IPlugin | null> {
    const context: PluginLoadingContext = {
      pluginName: path.basename(pluginDir),
      pluginPath: pluginDir,
      dependencies: [],
      environment: this.configService.get('NODE_ENV', 'development') as any,
      loadingStartTime: new Date(),
    };

    try {
      this.logger.debug(`Loading plugin from directory: ${pluginDir}`);

      // Check for package.json
      const packageJsonPath = path.join(pluginDir, 'package.json');
      const packageJsonExists = await this.pathExists(packageJsonPath);

      if (!packageJsonExists) {
        this.logger.warn(`Plugin directory ${pluginDir} missing package.json`);
        return null;
      }

      // Read package.json
      const packageJson = await this.readPackageJson(packageJsonPath);

      // Find main entry point
      const mainFile = packageJson.main || 'index.js';
      const pluginFilePath = path.join(pluginDir, mainFile);

      // Check if main file exists
      const mainFileExists = await this.pathExists(pluginFilePath);
      if (!mainFileExists) {
        this.logger.warn(`Plugin main file not found: ${pluginFilePath}`);
        return null;
      }

      // Load the plugin module
      const plugin = await this.loadPluginModule(pluginFilePath, context);

      if (plugin) {
        // Register the plugin
        await this.pluginRegistry.registerPlugin(plugin);
        this.logger.log(`Successfully loaded plugin: ${plugin.name}`);
        return plugin;
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to load plugin from ${pluginDir}:`, error);
      return null;
    }
  }

  /**
   * Install a plugin from marketplace or file
   */
  async installPlugin(
    pluginName: string,
    version?: string,
    options?: PluginInstallationOptions
  ): Promise<PluginInstallationResult> {
    try {
      this.logger.log(`Installing plugin: ${pluginName}${version ? `@${version}` : ''}`);

      // Check if plugin already exists
      const existingPlugin = this.pluginRegistry.getPlugin(pluginName);
      if (existingPlugin && !options?.force) {
        return {
          success: false,
          pluginName,
          version: version || 'unknown',
          message: `Plugin ${pluginName} is already installed. Use force option to reinstall.`,
        };
      }

      // For demo purposes, we'll simulate marketplace installation
      // In a real implementation, this would download from a marketplace
      const installationResult = await this.simulateMarketplaceInstallation(
        pluginName,
        version,
        options
      );

      if (installationResult.success) {
        this.logger.log(`Plugin ${pluginName} installed successfully`);
      } else {
        this.logger.error(`Failed to install plugin ${pluginName}: ${installationResult.message}`);
      }

      return installationResult;
    } catch (error) {
      this.logger.error(`Error installing plugin ${pluginName}:`, error);
      return {
        success: false,
        pluginName,
        version: version || 'unknown',
        message: error.message,
        errors: [error.stack],
      };
    }
  }

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(pluginName: string): Promise<void> {
    try {
      this.logger.log(`Uninstalling plugin: ${pluginName}`);

      // Unregister from registry first
      await this.pluginRegistry.unregisterPlugin(pluginName);

      // Remove plugin files (in a real implementation)
      // For now, we'll just log the action
      this.logger.log(`Plugin ${pluginName} files would be removed from filesystem`);

      this.logger.log(`Plugin ${pluginName} uninstalled successfully`);
    } catch (error) {
      this.logger.error(`Error uninstalling plugin ${pluginName}:`, error);
      throw error;
    }
  }

  /**
   * Get available plugins from marketplace
   */
  async getAvailablePlugins(): Promise<PluginMarketplaceInfo[]> {
    // In a real implementation, this would query a marketplace API
    // For demo purposes, return some sample plugins
    return [
      {
        name: 'canvas-plugin',
        version: '1.0.0',
        description: 'AI Canvas image generation plugin',
        author: 'Canvas Team',
        license: 'MIT',
        keywords: ['image', 'generation', 'ai'],
        downloads: 1000,
        rating: 4.8,
        verified: true,
        publishDate: new Date('2024-01-01'),
        lastUpdate: new Date('2024-01-15'),
      },
      {
        name: 'game-development-plugin',
        version: '1.0.0',
        description: 'AI-powered game development assistance',
        author: 'Game Dev Team',
        license: 'MIT',
        keywords: ['game', 'development', 'ai'],
        downloads: 500,
        rating: 4.5,
        verified: true,
        publishDate: new Date('2024-01-10'),
        lastUpdate: new Date('2024-01-20'),
      },
      {
        name: 'content-creation-plugin',
        version: '1.0.0',
        description: 'Content creation and optimization tools',
        author: 'Content Team',
        license: 'MIT',
        keywords: ['content', 'creation', 'optimization'],
        downloads: 750,
        rating: 4.6,
        verified: true,
        publishDate: new Date('2024-01-05'),
        lastUpdate: new Date('2024-01-18'),
      },
    ];
  }

  /**
   * Validate plugin structure and dependencies
   */
  async validatePlugin(pluginPath: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Check package.json exists
      const packageJsonPath = path.join(pluginPath, 'package.json');
      const packageJsonExists = await this.pathExists(packageJsonPath);

      if (!packageJsonExists) {
        errors.push('Missing package.json file');
        return { valid: false, errors };
      }

      // Read and validate package.json
      const packageJson = await this.readPackageJson(packageJsonPath);

      if (!packageJson.name) {
        errors.push('Missing plugin name in package.json');
      }

      if (!packageJson.version) {
        errors.push('Missing plugin version in package.json');
      }

      if (!packageJson.main) {
        errors.push('Missing main entry point in package.json');
      }

      // Check main file exists
      if (packageJson.main) {
        const mainFilePath = path.join(pluginPath, packageJson.main);
        const mainFileExists = await this.pathExists(mainFilePath);

        if (!mainFileExists) {
          errors.push(`Main file not found: ${packageJson.main}`);
        }
      }

      return { valid: errors.length === 0, errors };
    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
      return { valid: false, errors };
    }
  }

  // Private helper methods

  private async pathExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async readPackageJson(packageJsonPath: string): Promise<any> {
    const content = await fs.readFile(packageJsonPath, 'utf8');
    return JSON.parse(content);
  }

  private async loadPluginModule(
    pluginFilePath: string,
    context: PluginLoadingContext
  ): Promise<IPlugin | null> {
    try {
      // In a real implementation, we would use dynamic imports or require
      // For now, we'll simulate plugin loading
      this.logger.debug(`Loading plugin module from: ${pluginFilePath}`);

      // Simulate module loading delay
      await new Promise(resolve => setTimeout(resolve, 100));

      // This would be replaced with actual module loading:
      // const pluginModule = await import(pluginFilePath);
      // const PluginClass = pluginModule.default || pluginModule;

      // For now, return null to indicate no plugin loaded
      // In implementation, this would instantiate and validate the plugin
      return null;
    } catch (error) {
      this.logger.error(`Error loading plugin module ${pluginFilePath}:`, error);
      throw error;
    }
  }

  private async simulateMarketplaceInstallation(
    pluginName: string,
    version?: string,
    options?: PluginInstallationOptions
  ): Promise<PluginInstallationResult> {
    // Simulate installation process
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate success for known plugins
    const knownPlugins = ['canvas-plugin', 'game-development-plugin', 'content-creation-plugin'];

    if (knownPlugins.includes(pluginName)) {
      return {
        success: true,
        pluginName,
        version: version || '1.0.0',
        message: `Plugin ${pluginName} installed successfully from marketplace`,
      };
    }

    return {
      success: false,
      pluginName,
      version: version || 'unknown',
      message: `Plugin ${pluginName} not found in marketplace`,
      errors: ['Plugin not available'],
    };
  }
}