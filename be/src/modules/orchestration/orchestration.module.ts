import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BedrockModule } from '../bedrock/bedrock.module';
import { DatabaseModule } from '../database/database.module';
import { WorkflowEngine } from './services/workflow-engine.service';
import { AgentOrchestrator } from './services/agent-orchestrator.service';
import { StateManager } from './services/state-manager.service';
// import { WorkflowBuilder } from './builders/workflow-builder.service'; // TODO: Create this service
import { AgentFactory } from './factories/agent-factory.service';
import { ExecutionMonitor } from './services/execution-monitor.service';

/**
 * Orchestration module for managing AI workflows and agent coordination
 * Integrates with LangGraph for complex workflow execution
 */
@Module({
  imports: [
    ConfigModule,
    BedrockModule,
    DatabaseModule,
  ],
  providers: [
    WorkflowEngine,
    AgentOrchestrator,
    StateManager,
    // WorkflowBuilder, // TODO: Create this service
    AgentFactory,
    ExecutionMonitor,
  ],
  exports: [
    WorkflowEngine,
    AgentOrchestrator,
    StateManager,
    // WorkflowBuilder, // TODO: Create this service
    AgentFactory,
    ExecutionMonitor,
  ],
})
export class OrchestrationModule {}