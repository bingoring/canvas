// MongoDB initialization script for Canvas AI Orchestration Platform
// This script sets up the database, collections, and indexes

// Switch to the canvas_orchestration database
db = db.getSiblingDB('canvas_orchestration');

// Create application user
db.createUser({
  user: 'canvas_app',
  pwd: 'canvas_app_password',
  roles: [
    {
      role: 'readWrite',
      db: 'canvas_orchestration'
    }
  ]
});

// Create collections with validation schemas
db.createCollection('workflows', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'type', 'status', 'createdAt'],
      properties: {
        name: { bsonType: 'string' },
        type: { enum: ['agent', 'canvas', 'hybrid'] },
        status: { enum: ['draft', 'active', 'paused', 'completed', 'failed'] },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

db.createCollection('executions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['workflowId', 'status', 'startedAt'],
      properties: {
        workflowId: { bsonType: 'objectId' },
        status: { enum: ['pending', 'running', 'completed', 'failed', 'cancelled'] },
        startedAt: { bsonType: 'date' },
        completedAt: { bsonType: 'date' }
      }
    }
  }
});

db.createCollection('agents', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'type', 'status'],
      properties: {
        name: { bsonType: 'string' },
        type: { bsonType: 'string' },
        status: { enum: ['active', 'inactive', 'error'] },
        capabilities: { bsonType: 'array' }
      }
    }
  }
});

db.createCollection('canvases', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['title', 'status', 'createdAt'],
      properties: {
        title: { bsonType: 'string' },
        status: { enum: ['draft', 'published', 'archived'] },
        createdAt: { bsonType: 'date' }
      }
    }
  }
});

db.createCollection('models', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'type', 'provider'],
      properties: {
        name: { bsonType: 'string' },
        type: { enum: ['text', 'image', 'embedding', 'multimodal'] },
        provider: { enum: ['bedrock', 'openai', 'anthropic', 'custom'] }
      }
    }
  }
});

// Create indexes for performance
// Workflows indexes
db.workflows.createIndex({ 'name': 1 });
db.workflows.createIndex({ 'status': 1 });
db.workflows.createIndex({ 'type': 1 });
db.workflows.createIndex({ 'createdAt': -1 });
db.workflows.createIndex({ 'tags': 1 });

// Executions indexes
db.executions.createIndex({ 'workflowId': 1 });
db.executions.createIndex({ 'status': 1 });
db.executions.createIndex({ 'startedAt': -1 });
db.executions.createIndex({ 'workflowId': 1, 'startedAt': -1 });

// Agents indexes
db.agents.createIndex({ 'name': 1 }, { unique: true });
db.agents.createIndex({ 'type': 1 });
db.agents.createIndex({ 'status': 1 });
db.agents.createIndex({ 'capabilities': 1 });

// Canvases indexes
db.canvases.createIndex({ 'title': 1 });
db.canvases.createIndex({ 'status': 1 });
db.canvases.createIndex({ 'createdAt': -1 });
db.canvases.createIndex({ 'tags': 1 });

// Models indexes
db.models.createIndex({ 'name': 1 }, { unique: true });
db.models.createIndex({ 'type': 1 });
db.models.createIndex({ 'provider': 1 });

// Vector search indexes (requires MongoDB Atlas or self-managed with vector search support)
// Note: These may need to be created manually in production depending on your MongoDB setup
print('Canvas AI Orchestration Platform database initialized successfully');
print('Collections created: workflows, executions, agents, canvases, models');
print('Indexes created for optimal query performance');
print('Application user "canvas_app" created with readWrite permissions');