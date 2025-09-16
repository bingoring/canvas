import { Module } from '@nestjs/common';
import { PluginRegistryService } from './plugin-registry.service';
import { PluginLoaderService } from './plugin-loader.service';

/**
 * Plugin system module
 * Provides core plugin infrastructure for the application
 */
@Module({
  providers: [
    PluginRegistryService,
    PluginLoaderService,
  ],
  exports: [
    PluginRegistryService,
    PluginLoaderService,
  ],
})
export class PluginSystemModule {}