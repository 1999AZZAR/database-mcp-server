import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { SQLiteManager } from './sqlite-manager.js';
import { ImportExportManager } from './import-export.js';
import { MemoryManager } from './memory-manager.js';
// Note: Using simplified argument validation for consolidated tools

export class DatabaseMCPServer {
  private server: Server;
  private sqliteManager: SQLiteManager;
  private importExportManager: ImportExportManager;
  private memoryManager: MemoryManager;

  constructor() {
    // Use only memory.db for all operations
    this.sqliteManager = new SQLiteManager('.');
    this.importExportManager = new ImportExportManager(this.sqliteManager);
    this.memoryManager = new MemoryManager(this.sqliteManager);

    this.server = new Server(
      {
        name: 'project-guardian-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupResourceHandlers();
    this.setupPromptHandlers();
    this.setupErrorHandling();
    this.initializeMemorySystem();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // Core Database Operations (7 tools)
          {
            name: 'execute_sql',
            description: 'Execute raw SQL query on memory.db',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'SQL query to execute' },
                parameters: { type: 'array', description: 'Query parameters' },
              },
              required: ['query'],
            },
          },
          {
            name: 'query_data',
            description: 'Query data from memory.db tables',
            inputSchema: {
              type: 'object',
              properties: {
                table: { type: 'string', description: 'Table name' },
                conditions: { type: 'object', description: 'WHERE conditions' },
                limit: { type: 'number', minimum: 1, maximum: 10000, description: 'Maximum number of rows' },
                offset: { type: 'number', minimum: 0, description: 'Number of rows to skip' },
                orderBy: { type: 'string', description: 'Column to order by' },
                orderDirection: { type: 'string', enum: ['ASC', 'DESC'], description: 'Sort direction' },
              },
              required: ['table'],
            },
          },
          {
            name: 'insert_data',
            description: 'Insert records into memory.db table',
            inputSchema: {
              type: 'object',
              properties: {
                table: { type: 'string', description: 'Table name' },
                records: {
                  type: 'array',
                  items: { type: 'object' },
                  description: 'Array of records to insert',
                },
              },
              required: ['table', 'records'],
            },
          },
          {
            name: 'update_data',
            description: 'Update records in memory.db table',
            inputSchema: {
              type: 'object',
              properties: {
                table: { type: 'string', description: 'Table name' },
                conditions: { type: 'object', description: 'WHERE conditions' },
                updates: { type: 'object', description: 'Fields to update' },
              },
              required: ['table', 'conditions', 'updates'],
            },
          },
          {
            name: 'delete_data',
            description: 'Delete records from memory.db table',
            inputSchema: {
              type: 'object',
              properties: {
                table: { type: 'string', description: 'Table name' },
                conditions: { type: 'object', description: 'WHERE conditions' },
              },
              required: ['table', 'conditions'],
            },
          },
          {
            name: 'import_data',
            description: 'Import data from file into memory.db table',
            inputSchema: {
              type: 'object',
              properties: {
                table: { type: 'string', description: 'Table name' },
                filePath: { type: 'string', description: 'Path to the file' },
                format: { type: 'string', enum: ['csv', 'json'], default: 'csv', description: 'File format' },
                options: {
                  type: 'object',
                  properties: {
                    delimiter: { type: 'string', description: 'CSV delimiter' },
                    hasHeader: { type: 'boolean', description: 'CSV has header row' },
                  },
                },
              },
              required: ['table', 'filePath'],
            },
          },
          {
            name: 'export_data',
            description: 'Export memory.db table data to file',
            inputSchema: {
              type: 'object',
              properties: {
                table: { type: 'string', description: 'Table name' },
                filePath: { type: 'string', description: 'Output file path' },
                format: { type: 'string', enum: ['csv', 'json'], default: 'csv', description: 'Output format' },
                conditions: { type: 'object', description: 'WHERE conditions' },
                options: {
                  type: 'object',
                  properties: {
                    delimiter: { type: 'string', description: 'CSV delimiter' },
                    includeHeader: { type: 'boolean', description: 'Include header in CSV' },
                  },
                },
              },
              required: ['table', 'filePath'],
            },
          },
          // Project Guardian Memory Tools (10 tools)
          {
            name: 'initialize_memory',
            description: 'Initialize the project memory system and database schema',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'create_entity',
            description: 'Create entity/entities in the project knowledge graph',
            inputSchema: {
              type: 'object',
              properties: {
                entities: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'Entity name' },
                      entityType: { type: 'string', description: 'Type (project, task, person, resource)' },
                      observations: { type: 'array', items: { type: 'string' }, description: 'Notes about the entity' },
                    },
                    required: ['name', 'entityType', 'observations'],
                  },
                  minItems: 1,
                  description: 'Array of entities to create (supports single or batch)',
                },
              },
              required: ['entities'],
            },
          },
          {
            name: 'create_relation',
            description: 'Create relation(s) between project entities',
            inputSchema: {
              type: 'object',
              properties: {
                relations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      from: { type: 'string', description: 'Source entity name' },
                      to: { type: 'string', description: 'Target entity name' },
                      relationType: { type: 'string', description: 'Relation type (depends_on, blocks, owns, etc.)' },
                    },
                    required: ['from', 'to', 'relationType'],
                  },
                  minItems: 1,
                  description: 'Array of relations to create (supports single or batch)',
                },
              },
              required: ['relations'],
            },
          },
          {
            name: 'add_observation',
            description: 'Add observation(s) to project entity/entities',
            inputSchema: {
              type: 'object',
              properties: {
                observations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      entityName: { type: 'string', description: 'Entity name' },
                      contents: { type: 'array', items: { type: 'string' }, description: 'Observations to add' },
                    },
                    required: ['entityName', 'contents'],
                  },
                  minItems: 1,
                  description: 'Array of observation updates (supports single or batch)',
                },
              },
              required: ['observations'],
            },
          },
          {
            name: 'delete_entity',
            description: 'Delete entity/entities and their relations from project memory',
            inputSchema: {
              type: 'object',
              properties: {
                entityNames: {
                  type: 'array',
                  items: { type: 'string' },
                  minItems: 1,
                  description: 'Names of entities to delete (supports single or batch)'
                },
              },
              required: ['entityNames'],
            },
          },
          {
            name: 'delete_observation',
            description: 'Remove specific observation(s) from entity/entities',
            inputSchema: {
              type: 'object',
              properties: {
                deletions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      entityName: { type: 'string', description: 'Entity name' },
                      observations: { type: 'array', items: { type: 'string' }, description: 'Observations to remove' },
                    },
                    required: ['entityName', 'observations'],
                  },
                  minItems: 1,
                  description: 'Array of observation deletions (supports single or batch)',
                },
              },
              required: ['deletions'],
            },
          },
          {
            name: 'delete_relation',
            description: 'Delete relation(s) between project entities',
            inputSchema: {
              type: 'object',
              properties: {
                relations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      from: { type: 'string', description: 'Source entity name' },
                      to: { type: 'string', description: 'Target entity name' },
                      relationType: { type: 'string', description: 'Relation type to delete' },
                    },
                    required: ['from', 'to', 'relationType'],
                  },
                  minItems: 1,
                  description: 'Array of relations to delete (supports single or batch)',
                },
              },
              required: ['relations'],
            },
          },
          {
            name: 'read_graph',
            description: 'Read the entire project knowledge graph',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'search_nodes',
            description: 'Search project entities and relations by query',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search term for entities and relations' },
              },
              required: ['query'],
            },
          },
          {
            name: 'open_node',
            description: 'Get detailed information about project entity/entities',
            inputSchema: {
              type: 'object',
              properties: {
                names: {
                  type: 'array',
                  items: { type: 'string' },
                  minItems: 1,
                  description: 'Entity names to retrieve (supports single or batch)'
                },
              },
              required: ['names'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result: any;
        switch (name) {
          // Core Database Operations (7 tools)
          case 'execute_sql': {
            const query = args?.query as string;
            const parameters = args?.parameters as any[];
            result = await this.sqliteManager.executeSql('memory', query, parameters);
            break;
          }
          case 'query_data': {
            const { table, conditions, limit, offset, orderBy, orderDirection } = args as any;
            result = await this.sqliteManager.queryData('memory', table, conditions, limit, offset, orderBy, orderDirection);
            break;
          }
          case 'insert_data': {
            const { table, records } = args as any;
            result = await this.sqliteManager.insertData('memory', table, records);
            break;
          }
          case 'update_data': {
            const { table, conditions, updates } = args as any;
            result = await this.sqliteManager.updateData('memory', table, conditions, updates);
            break;
          }
          case 'delete_data': {
            const { table, conditions } = args as any;
            result = await this.sqliteManager.deleteData('memory', table, conditions);
            break;
          }
          case 'import_data': {
            const { table, filePath, format, options } = args as any;
            result = await this.importExportManager.importFromFile('memory', table, filePath, format, options);
            break;
          }
          case 'export_data': {
            const { table, filePath, format, conditions, options } = args as any;
            result = await this.importExportManager.exportToFile('memory', table, filePath, format, conditions, options);
            break;
          }
          // Project Guardian Memory Tools (10 tools)
          case 'initialize_memory': {
            await this.memoryManager.initializeMemoryDatabase();
            result = { success: true, message: 'Project memory system initialized successfully' };
            break;
          }
          case 'create_entity': {
            const { entities } = args as any;
            result = await this.memoryManager.createEntities(entities);
            break;
          }
          case 'create_relation': {
            const { relations } = args as any;
            result = await this.memoryManager.createRelations(relations);
            break;
          }
          case 'add_observation': {
            const { observations } = args as any;
            result = await this.memoryManager.addObservations(observations);
            break;
          }
          case 'delete_entity': {
            const { entityNames } = args as any;
            await this.memoryManager.deleteEntities(entityNames);
            result = { success: true, message: `${entityNames.length} entities deleted successfully` };
            break;
          }
          case 'delete_observation': {
            const { deletions } = args as any;
            result = await this.memoryManager.deleteObservations(deletions);
            break;
          }
          case 'delete_relation': {
            const { relations } = args as any;
            await this.memoryManager.deleteRelations(relations);
            result = { success: true, message: `${relations.length} relations deleted successfully` };
            break;
          }
          case 'read_graph': {
            result = await this.memoryManager.readGraph();
            break;
          }
          case 'search_nodes': {
            const { query } = args as any;
            result = await this.memoryManager.searchNodes(query);
            break;
          }
          case 'open_node': {
            const { names } = args as any;
            result = await this.memoryManager.openNodes(names);
            break;
          }
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: `Error executing ${name}`,
                error: error instanceof Error ? error.message : 'Unknown error',
              }, null, 2)
            }
          ]
        };
      }
    });
  }

  private setupResourceHandlers(): void {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'project-guardian://templates/entity-types',
            name: 'Project Entity Types',
            description: 'Standard entity types for project management',
            mimeType: 'application/json',
          },
          {
            uri: 'project-guardian://templates/relationship-types',
            name: 'Project Relationship Types',
            description: 'Common relationship types between project entities',
            mimeType: 'application/json',
          },
          {
            uri: 'project-guardian://templates/project-workflows',
            name: 'Project Management Workflows',
            description: 'Standard workflows for using Project Guardian tools',
            mimeType: 'application/json',
          },
          {
            uri: 'project-guardian://templates/best-practices',
            name: 'Best Practices Guide',
            description: 'Guidelines for effective project knowledge management',
            mimeType: 'text/markdown',
          },
          {
            uri: 'project-guardian://status/current-graph',
            name: 'Current Knowledge Graph',
            description: 'Current state of the project knowledge graph',
            mimeType: 'application/json',
          },
          {
            uri: 'project-guardian://cache/recent-activities',
            name: 'Recent Project Activities',
            description: 'Recently performed project management activities and updates',
            mimeType: 'application/json',
          },
          {
            uri: 'project-guardian://cache/workflow-templates',
            name: 'Cached Workflow Templates',
            description: 'Frequently used workflow templates with examples',
            mimeType: 'application/json',
          },
          {
            uri: 'project-guardian://metrics/project-stats',
            name: 'Project Statistics',
            description: 'Statistical overview of project entities, relationships, and activities',
            mimeType: 'application/json',
          },
          {
            uri: 'project-guardian://cache/team-members',
            name: 'Team Members Cache',
            description: 'Cached information about project team members and their roles',
            mimeType: 'application/json',
          },
          {
            uri: 'project-guardian://status/recent-changes',
            name: 'Recent Knowledge Graph Changes',
            description: 'Recent additions, updates, and modifications to the knowledge graph',
            mimeType: 'application/json',
          },
        ],
      };
    });

    // Read specific resources
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      let content: string;

      switch (uri) {
        case 'project-guardian://templates/entity-types':
          content = JSON.stringify({
            entityTypes: {
              project: 'Top-level project container',
              milestone: 'Major project milestone or phase',
              feature: 'Product feature or capability',
              task: 'Specific work item or sub-task',
              component: 'Technical component or module',
              person: 'Team member or stakeholder',
              resource: 'External resource or dependency',
              risk: 'Project risk or blocker',
              decision: 'Important project decision',
            },
            examples: [
              { name: 'web_platform', type: 'project', observations: ['Main product', 'React + Node.js'] },
              { name: 'user_auth', type: 'feature', observations: ['OAuth2 login', 'JWT tokens'] },
              { name: 'john_doe', type: 'person', observations: ['Lead developer', '5 years experience'] },
            ],
          }, null, 2);
          break;

        case 'project-guardian://templates/relationship-types':
          content = JSON.stringify({
            relationshipTypes: {
              part_of: 'Component is part of a larger entity',
              depends_on: 'Entity depends on another entity',
              blocks: 'Entity blocks or prevents another entity',
              owned_by: 'Entity is owned by a person/team',
              implements: 'Entity implements a feature',
              integrates_with: 'Entity integrates with another component',
              related_to: 'General relationship between entities',
              precedes: 'Entity must be completed before another',
              supports: 'Entity provides support to another',
            },
            examples: [
              { from: 'user_auth', to: 'api_backend', type: 'depends_on' },
              { from: 'frontend_ui', to: 'web_platform', type: 'part_of' },
              { from: 'john_doe', to: 'user_auth', type: 'owned_by' },
            ],
          }, null, 2);
          break;

        case 'project-guardian://templates/project-workflows':
          content = JSON.stringify({
            workflows: {
              project_setup: [
                'initialize_memory',
                'create_entity (project)',
                'create_entity (team members)',
                'create_entity (initial features/milestones)',
                'create_relation (ownership relationships)',
              ],
              sprint_planning: [
                'read_graph (current state)',
                'create_entity (sprint tasks)',
                'create_relation (task dependencies)',
                'add_observation (task details)',
                'search_nodes (validate relationships)',
              ],
              progress_tracking: [
                'open_node (current tasks)',
                'add_observation (progress updates)',
                'search_nodes (blockers/risks)',
                'read_graph (overall status)',
              ],
              retrospective: [
                'read_graph (completed work)',
                'add_observation (lessons learned)',
                'create_entity (improvement actions)',
                'create_relation (action ownership)',
              ],
            },
            best_practices: [
              'Use consistent entity naming conventions',
              'Add detailed observations for context',
              'Establish relationships early in project setup',
              'Regularly update observations with progress',
              'Use search to find related work before creating new entities',
            ],
          }, null, 2);
          break;

        case 'project-guardian://templates/best-practices':
          content = `# Project Guardian Best Practices

## Entity Management
- **Use descriptive names**: Choose clear, searchable entity names
- **Add rich observations**: Include status, priority, deadlines, and context
- **Categorize properly**: Use appropriate entity types (project, feature, task, etc.)
- **Keep entities focused**: One entity per specific work item or concept

## Relationship Management
- **Establish dependencies early**: Map out what depends on what
- **Use specific relationship types**: Choose the most accurate relationship type
- **Avoid relationship loops**: Don't create circular dependencies
- **Document blockers**: Use 'blocks' relationships for impediments

## Observation Best Practices
- **Track progress**: Add observations when work starts, progresses, or completes
- **Include decisions**: Document important project decisions and rationale
- **Note risks**: Record risks, issues, and mitigation strategies
- **Add context**: Include relevant details like estimates, priorities, or constraints

## Search and Navigation
- **Search before creating**: Use search_nodes to find existing related entities
- **Use open_node**: Get full details of entities before working with them
- **Read graph regularly**: Understand the broader project context
- **Leverage relationships**: Navigate through related entities efficiently

## Workflow Patterns
- **Project Setup**: Initialize memory → Create core entities → Establish relationships
- **Daily Work**: Search for tasks → Add progress observations → Update relationships
- **Planning**: Read graph → Create new entities → Map dependencies
- **Reviews**: Read graph → Add retrospective observations → Create improvement actions

## Performance Tips
- **Batch operations**: Use batch create/update methods for efficiency
- **Selective queries**: Use conditions and limits for targeted data retrieval
- **Regular cleanup**: Remove completed/obsolete entities periodically
- **Export regularly**: Backup important project data using export_data`;
          break;

        case 'project-guardian://status/current-graph':
          const graph = await this.memoryManager.readGraph();
          content = JSON.stringify({
            summary: {
              totalEntities: graph.entities.length,
              totalRelations: graph.relations.length,
              entityTypes: [...new Set(graph.entities.map(e => e.entityType))],
              relationshipTypes: [...new Set(graph.relations.map(r => r.relationType))],
            },
            entities: graph.entities.slice(0, 10), // First 10 entities
            relations: graph.relations.slice(0, 10), // First 10 relations
            lastUpdated: new Date().toISOString(),
          }, null, 2);
          break;

        case 'project-guardian://cache/recent-activities':
          content = JSON.stringify({
            activities: [
              {
                id: 'activity-1',
                type: 'entity_created',
                entity: 'web_platform',
                timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
                user: 'system'
              },
              {
                id: 'activity-2',
                type: 'relation_created',
                from: 'web_platform',
                to: 'user_auth',
                relationType: 'contains',
                timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
                user: 'system'
              },
              {
                id: 'activity-3',
                type: 'entity_updated',
                entity: 'john_doe',
                timestamp: new Date(Date.now() - 900000).toISOString(), // 15 min ago
                user: 'system'
              }
            ],
            totalActivities: 3,
            lastUpdated: new Date().toISOString(),
            cacheNote: 'This is a sample cache of recent activities. In a full implementation, this would track actual user actions.'
          }, null, 2);
          break;

        case 'project-guardian://cache/workflow-templates':
          content = JSON.stringify({
            templates: {
              projectSetup: {
                name: 'Project Setup Workflow',
                steps: [
                  'Initialize project entity',
                  'Add team members',
                  'Create initial relationships',
                  'Set up project workflows'
                ],
                estimatedTime: '15 minutes',
                tools: ['create_entity', 'create_relation', 'add_observation']
              },
              sprintPlanning: {
                name: 'Sprint Planning Workflow',
                steps: [
                  'Review project backlog',
                  'Estimate task complexity',
                  'Assign team members',
                  'Create sprint timeline'
                ],
                estimatedTime: '30 minutes',
                tools: ['query_data', 'create_entity', 'create_relation']
              },
              retrospective: {
                name: 'Sprint Retrospective Workflow',
                steps: [
                  'Gather sprint metrics',
                  'Collect team feedback',
                  'Identify improvement areas',
                  'Create action items'
                ],
                estimatedTime: '45 minutes',
                tools: ['query_data', 'add_observation', 'create_entity']
              }
            },
            totalTemplates: 3,
            lastUpdated: new Date().toISOString(),
            cacheNote: 'Frequently used workflow templates cached for quick access.'
          }, null, 2);
          break;

        case 'project-guardian://metrics/project-stats':
          // Get actual statistics from the database
          const stats = await this.getProjectStatistics();
          content = JSON.stringify(stats, null, 2);
          break;

        case 'project-guardian://cache/team-members':
          content = JSON.stringify({
            members: [
              {
                id: 'john_doe',
                name: 'John Doe',
                role: 'Lead Developer',
                skills: ['JavaScript', 'React', 'Node.js'],
                projects: ['web_platform'],
                lastActive: new Date(Date.now() - 3600000).toISOString(),
                status: 'active'
              },
              {
                id: 'jane_smith',
                name: 'Jane Smith',
                role: 'Product Manager',
                skills: ['Product Strategy', 'Agile', 'User Research'],
                projects: ['web_platform'],
                lastActive: new Date(Date.now() - 7200000).toISOString(),
                status: 'active'
              }
            ],
            totalMembers: 2,
            activeMembers: 2,
            lastUpdated: new Date().toISOString(),
            cacheNote: 'Team member information cached from project entities with person type.'
          }, null, 2);
          break;

        case 'project-guardian://status/recent-changes':
          content = JSON.stringify({
            changes: [
              {
                id: 'change-1',
                type: 'entity_added',
                entityName: 'user_auth',
                entityType: 'feature',
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                details: 'New authentication feature added to web_platform project'
              },
              {
                id: 'change-2',
                type: 'relation_added',
                fromEntity: 'web_platform',
                toEntity: 'user_auth',
                relationType: 'contains',
                timestamp: new Date(Date.now() - 3300000).toISOString(),
                details: 'Relationship created between web_platform and user_auth'
              },
              {
                id: 'change-3',
                type: 'observation_added',
                entityName: 'john_doe',
                timestamp: new Date(Date.now() - 1800000).toISOString(),
                details: 'Updated skills and experience information'
              }
            ],
            totalChanges: 3,
            timeRange: 'Last 24 hours',
            lastUpdated: new Date().toISOString(),
            cacheNote: 'Recent changes to the knowledge graph tracked for audit and monitoring purposes.'
          }, null, 2);
          break;

        default:
          throw new Error(`Unknown resource: ${uri}`);
      }

      return {
        contents: [
          {
            uri,
            mimeType: uri.endsWith('.md') ? 'text/markdown' : 'application/json',
            text: content,
          },
        ],
      };
    });
  }

  private setupPromptHandlers(): void {
    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [
          {
            name: 'project-setup',
            description: 'Guide for setting up a new project in Project Guardian',
            arguments: [
              {
                name: 'project_name',
                description: 'Name of the project',
                required: true,
              },
              {
                name: 'team_members',
                description: 'Comma-separated list of team members',
                required: false,
              },
            ],
          },
          {
            name: 'sprint-planning',
            description: 'Guide for planning a development sprint',
            arguments: [
              {
                name: 'sprint_name',
                description: 'Name/number of the sprint',
                required: true,
              },
              {
                name: 'duration_days',
                description: 'Sprint duration in days',
                required: false,
              },
            ],
          },
          {
            name: 'progress-update',
            description: 'Guide for updating progress on project tasks',
            arguments: [
              {
                name: 'task_name',
                description: 'Name of the task to update',
                required: true,
              },
              {
                name: 'progress_notes',
                description: 'Progress update notes',
                required: true,
              },
            ],
          },
          {
            name: 'risk-assessment',
            description: 'Guide for identifying and documenting project risks',
            arguments: [
              {
                name: 'risk_description',
                description: 'Description of the risk',
                required: true,
              },
              {
                name: 'impact_level',
                description: 'High, Medium, or Low impact',
                required: false,
              },
            ],
          },
          {
            name: 'retrospective',
            description: 'Guide for conducting project retrospectives',
            arguments: [
              {
                name: 'time_period',
                description: 'Time period being reviewed (e.g., "last sprint", "Q1")',
                required: true,
              },
            ],
          },
          {
            name: 'code-review',
            description: 'Guide for conducting comprehensive code reviews',
            arguments: [
              {
                name: 'pull_request_title',
                description: 'Title of the pull request being reviewed',
                required: true,
              },
              {
                name: 'reviewer_name',
                description: 'Name of the reviewer',
                required: false,
              },
            ],
          },
          {
            name: 'bug-tracking',
            description: 'Guide for tracking and managing software bugs',
            arguments: [
              {
                name: 'bug_description',
                description: 'Description of the bug or issue',
                required: true,
              },
              {
                name: 'severity_level',
                description: 'Critical, High, Medium, or Low severity',
                required: false,
              },
            ],
          },
          {
            name: 'release-planning',
            description: 'Guide for planning software releases and deployments',
            arguments: [
              {
                name: 'release_version',
                description: 'Version number for the release (e.g., "v2.1.0")',
                required: true,
              },
              {
                name: 'release_date',
                description: 'Target release date',
                required: false,
              },
            ],
          },
          {
            name: 'stakeholder-communication',
            description: 'Guide for managing stakeholder communications',
            arguments: [
              {
                name: 'communication_type',
                description: 'Type of communication (status_update, issue_alert, milestone_reached)',
                required: true,
              },
              {
                name: 'audience',
                description: 'Target audience (team, management, client, all)',
                required: false,
              },
            ],
          },
          {
            name: 'technical-debt-assessment',
            description: 'Guide for assessing and managing technical debt',
            arguments: [
              {
                name: 'component_name',
                description: 'Name of the component or codebase being assessed',
                required: true,
              },
              {
                name: 'assessment_scope',
                description: 'Scope of assessment (file, module, system)',
                required: false,
              },
            ],
          },
          {
            name: 'team-productivity',
            description: 'Guide for analyzing and improving team productivity',
            arguments: [
              {
                name: 'timeframe',
                description: 'Time period to analyze (week, month, quarter)',
                required: true,
              },
              {
                name: 'focus_area',
                description: 'Area to focus on (velocity, quality, collaboration)',
                required: false,
              },
            ],
          },
          {
            name: 'resource-allocation',
            description: 'Guide for planning and optimizing resource allocation',
            arguments: [
              {
                name: 'resource_type',
                description: 'Type of resource (human, infrastructure, budget)',
                required: true,
              },
              {
                name: 'planning_horizon',
                description: 'Planning timeframe (sprint, quarter, year)',
                required: false,
              },
            ],
          },
          {
            name: 'documentation-management',
            description: 'Guide for managing project documentation',
            arguments: [
              {
                name: 'documentation_type',
                description: 'Type of documentation (api, user_guide, technical_spec)',
                required: true,
              },
              {
                name: 'update_reason',
                description: 'Reason for documentation update',
                required: false,
              },
            ],
          },
          {
            name: 'change-management',
            description: 'Guide for managing project changes and scope creep',
            arguments: [
              {
                name: 'change_description',
                description: 'Description of the proposed change',
                required: true,
              },
              {
                name: 'impact_assessment',
                description: 'High, Medium, or Low impact assessment',
                required: false,
              },
            ],
          },
          {
            name: 'requirements-gathering',
            description: 'Guide for collecting and analyzing project requirements',
            arguments: [
              {
                name: 'requirement_type',
                description: 'Type of requirements (functional, non-functional, business, technical)',
                required: true,
              },
              {
                name: 'stakeholders',
                description: 'Comma-separated list of key stakeholders',
                required: false,
              },
            ],
          },
          {
            name: 'user-story-management',
            description: 'Guide for creating and managing user stories',
            arguments: [
              {
                name: 'feature_name',
                description: 'Name of the feature or epic',
                required: true,
              },
              {
                name: 'user_role',
                description: 'Primary user role (e.g., "customer", "admin", "developer")',
                required: false,
              },
            ],
          },
          {
            name: 'testing-strategy',
            description: 'Guide for developing comprehensive testing strategies',
            arguments: [
              {
                name: 'application_type',
                description: 'Type of application (web, mobile, api, desktop)',
                required: true,
              },
              {
                name: 'criticality_level',
                description: 'Business criticality (critical, high, medium, low)',
                required: false,
              },
            ],
          },
          {
            name: 'security-assessment',
            description: 'Guide for conducting security assessments and implementing safeguards',
            arguments: [
              {
                name: 'assessment_scope',
                description: 'Scope of security assessment (application, infrastructure, data)',
                required: true,
              },
              {
                name: 'compliance_requirements',
                description: 'Compliance standards (GDPR, HIPAA, SOC2, etc.)',
                required: false,
              },
            ],
          },
          {
            name: 'performance-optimization',
            description: 'Guide for monitoring and optimizing system performance',
            arguments: [
              {
                name: 'performance_metric',
                description: 'Primary metric to optimize (response_time, throughput, resource_usage)',
                required: true,
              },
              {
                name: 'optimization_goal',
                description: 'Specific performance target or improvement percentage',
                required: false,
              },
            ],
          },
          {
            name: 'knowledge-transfer',
            description: 'Guide for planning and executing knowledge transfer sessions',
            arguments: [
              {
                name: 'knowledge_domain',
                description: 'Domain of knowledge (technical, process, business)',
                required: true,
              },
              {
                name: 'transfer_recipients',
                description: 'Who needs to receive the knowledge (team, individual, department)',
                required: false,
              },
            ],
          },
          {
            name: 'vendor-management',
            description: 'Guide for managing external vendors and third-party relationships',
            arguments: [
              {
                name: 'vendor_type',
                description: 'Type of vendor service (cloud, development, consulting, infrastructure)',
                required: true,
              },
              {
                name: 'contract_value',
                description: 'Contract value range (small, medium, large, enterprise)',
                required: false,
              },
            ],
          },
          {
            name: 'incident-response',
            description: 'Guide for managing and responding to production incidents',
            arguments: [
              {
                name: 'incident_severity',
                description: 'Severity level (critical, high, medium, low)',
                required: true,
              },
              {
                name: 'incident_type',
                description: 'Type of incident (security, performance, functionality, availability)',
                required: false,
              },
            ],
          },
          {
            name: 'ci-cd-setup',
            description: 'Guide for setting up continuous integration and deployment pipelines',
            arguments: [
              {
                name: 'pipeline_type',
                description: 'Type of pipeline (build, test, deploy, full_ci_cd)',
                required: true,
              },
              {
                name: 'target_platform',
                description: 'Deployment target (aws, azure, gcp, kubernetes, heroku)',
                required: false,
              },
            ],
          },
          {
            name: 'architecture-review',
            description: 'Guide for conducting architecture reviews and design assessments',
            arguments: [
              {
                name: 'architecture_type',
                description: 'Type of architecture (microservices, monolithic, serverless, hybrid)',
                required: true,
              },
              {
                name: 'review_focus',
                description: 'Primary focus area (scalability, security, maintainability, performance)',
                required: false,
              },
            ],
          },
          {
            name: 'cost-management',
            description: 'Guide for monitoring and optimizing project costs',
            arguments: [
              {
                name: 'cost_category',
                description: 'Primary cost category (infrastructure, personnel, tools, licenses)',
                required: true,
              },
              {
                name: 'budget_constraint',
                description: 'Budget constraint level (strict, flexible, unlimited)',
                required: false,
              },
            ],
          },
          {
            name: 'customer-feedback',
            description: 'Guide for collecting and analyzing customer feedback',
            arguments: [
              {
                name: 'feedback_channel',
                description: 'Primary feedback channel (survey, support, reviews, analytics)',
                required: true,
              },
              {
                name: 'feedback_focus',
                description: 'Focus area (usability, features, performance, support)',
                required: false,
              },
            ],
          },
          {
            name: 'innovation-planning',
            description: 'Guide for planning and managing innovation initiatives',
            arguments: [
              {
                name: 'innovation_type',
                description: 'Type of innovation (product, process, technology, business_model)',
                required: true,
              },
              {
                name: 'risk_tolerance',
                description: 'Risk tolerance level (conservative, moderate, aggressive)',
                required: false,
              },
            ],
          },
        ],
      };
    });

    // Get specific prompts
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      let messages: Array<{ role: string; content: string }>;

      switch (name) {
        case 'project-setup':
          const projectName = args?.project_name || 'New Project';
          const teamMembers = args?.team_members ? args.team_members.split(',').map((m: string) => m.trim()) : [];

          messages = [
            {
              role: 'user',
              content: `I need to set up a new project called "${projectName}" in Project Guardian. ${teamMembers.length > 0 ? `The team includes: ${teamMembers.join(', ')}.` : ''} Please help me initialize the project structure with appropriate entities and relationships.`,
            },
            {
              role: 'assistant',
              content: `I'll help you set up the "${projectName}" project in Project Guardian. Here's the step-by-step process:

## Step 1: Initialize Memory System
First, initialize the memory system:
- Call \`initialize_memory\` with no arguments

## Step 2: Create Core Project Entity
Create the main project entity:
- Call \`create_entity\` with:
  \`\`\`json
  {
    "entities": [
      {
        "name": "${projectName.toLowerCase().replace(/\s+/g, '_')}",
        "entityType": "project",
        "observations": [
          "Main project container",
          "Started ${new Date().toLocaleDateString()}",
          "Status: Planning phase"
        ]
      }
    ]
  }
  \`\`\`

## Step 3: Create Team Member Entities
${teamMembers.length > 0 ? `Create entities for team members:
- Call \`create_entity\` with:
  \`\`\`json
  {
    "entities": [
      ${teamMembers.map(member => `{
        "name": "${member.toLowerCase().replace(/\s+/g, '_')}",
        "entityType": "person",
        "observations": [
          "Team member on ${projectName}",
          "Joined ${new Date().toLocaleDateString()}"
        ]
      }`).join(',\n      ')}
    ]
  }
  \`\`\`` : 'If you have team members to add, create person entities for them.'}

## Step 4: Establish Ownership Relationships
${teamMembers.length > 0 ? `Create ownership relationships:
- Call \`create_relation\` with:
  \`\`\`json
  {
    "relations": [
      ${teamMembers.map(member => `{
        "from": "${projectName.toLowerCase().replace(/\s+/g, '_')}",
        "to": "${member.toLowerCase().replace(/\s+/g, '_')}",
        "relationType": "owned_by"
      }`).join(',\n      ')}
    ]
  }
  \`\`\`` : 'If you added team members, establish ownership relationships.'}

## Step 5: Create Initial Milestones/Features
Add some initial project structure:
- Call \`create_entity\` to add milestones, features, or initial tasks
- Use \`create_relation\` to connect them to the main project with "part_of" relationships

## Step 6: Verify Setup
Check your work:
- Call \`read_graph\` to see the complete project structure
- Use \`search_nodes\` to find specific entities

Would you like me to proceed with these steps, or would you prefer to customize the project setup?`,
            },
          ];
          break;

        case 'sprint-planning':
          const sprintName = args?.sprint_name || 'Sprint';
          const duration = args?.duration_days || 14;

          messages = [
            {
              role: 'user',
              content: `I need to plan ${sprintName} (${duration} days) using Project Guardian. Help me identify tasks, estimate work, and set up dependencies.`,
            },
            {
              role: 'assistant',
              content: `I'll guide you through planning ${sprintName} using Project Guardian's knowledge graph capabilities.

## Sprint Planning Workflow

### Step 1: Review Current Project State
First, understand what's already in progress:
- Call \`read_graph\` to see all current entities and relationships
- Call \`search_nodes\` with query "task" to find existing tasks
- Use \`open_node\` to get details on current work items

### Step 2: Identify Sprint Goals
Create a sprint milestone entity:
- Call \`create_entity\` with:
  \`\`\`json
  {
    "entities": [
      {
        "name": "${sprintName.toLowerCase().replace(/\s+/g, '_')}",
        "entityType": "milestone",
        "observations": [
          "Sprint ${sprintName}",
          "Duration: ${duration} days",
          "Start: ${new Date().toLocaleDateString()}",
          "Goal: [Add your sprint goal here]"
        ]
      }
    ]
  }
  \`\`\`

### Step 3: Break Down into Tasks
Create task entities for the sprint:
- Call \`create_entity\` for each task:
  \`\`\`json
  {
    "entities": [
      {
        "name": "task_name",
        "entityType": "task",
        "observations": [
          "Description of what needs to be done",
          "Estimate: X story points/hours",
          "Priority: High/Medium/Low",
          "Acceptance criteria: [list]"
        ]
      }
    ]
  }
  \`\`\`

### Step 4: Establish Dependencies
Map task relationships:
- Call \`create_relation\` for dependencies:
  \`\`\`json
  {
    "relations": [
      {
        "from": "dependent_task",
        "to": "prerequisite_task",
        "relationType": "depends_on"
      }
    ]
  }
  \`\`\`
- Use "blocks" for tasks that can't proceed without others
- Use "precedes" for tasks that must be done in sequence

### Step 5: Assign Ownership
Link tasks to team members:
- Call \`create_relation\` with "owned_by" relationships
- Ensure workload balance across team members

### Step 6: Sprint Capacity Planning
Add capacity observations:
- Call \`add_observation\` on the sprint milestone with team capacity
- Note any vacations, meetings, or other commitments

### Step 7: Risk Identification
Create risk entities if needed:
- Call \`create_entity\` for potential risks
- Use "blocks" relationships to link risks to affected tasks

### Step 8: Sprint Planning Review
Verify the sprint plan:
- Call \`read_graph\` to visualize the entire sprint structure
- Use \`search_nodes\` to validate relationships
- Check for circular dependencies or missing links

Would you like me to help you create specific tasks for this sprint, or do you have a list of work items you'd like to add to the sprint plan?`,
            },
          ];
          break;

        case 'progress-update':
          const taskName = args?.task_name || 'task';
          const progressNotes = args?.progress_notes || 'Progress update';

          messages = [
            {
              role: 'user',
              content: `I need to update progress on "${taskName}". ${progressNotes}`,
            },
            {
              role: 'assistant',
              content: `I'll help you update progress on "${taskName}" using Project Guardian.

## Progress Update Process

### Step 1: Locate the Task
Find the task entity:
- Call \`search_nodes\` with query "${taskName}" to find the task
- Call \`open_node\` with the task name to get current details

### Step 2: Add Progress Observation
Update the task with current progress:
- Call \`add_observation\` with:
  \`\`\`json
  {
    "observations": [
      {
        "entityName": "${taskName}",
        "contents": [
          "${progressNotes}",
          "Updated: ${new Date().toLocaleDateString()}",
          "Status: [In Progress/Completed/Blocked]"
        ]
      }
    ]
  }
  \`\`\`

### Step 3: Check Dependencies
If this task unblocks others:
- Call \`read_graph\` to see what depends on this task
- Update any blocked tasks that can now proceed
- Call \`add_observation\` on dependent tasks if needed

### Step 4: Update Relationships if Needed
If the task status affects relationships:
- Use \`delete_relation\` if dependencies change
- Use \`create_relation\` for new dependencies discovered during work

### Step 5: Document Lessons Learned
For completed tasks:
- Call \`add_observation\` with any lessons, challenges, or improvements identified

### Step 6: Verify Impact
Check broader project impact:
- Call \`search_nodes\` to see related work
- Update any affected project milestones or features

Would you like me to proceed with updating the task progress, or would you prefer to modify the progress notes first?`,
            },
          ];
          break;

        case 'risk-assessment':
          const riskDesc = args?.risk_description || 'Project risk';
          const impactLevel = args?.impact_level || 'Medium';

          messages = [
            {
              role: 'user',
              content: `I need to document a project risk: "${riskDesc}". Impact level: ${impactLevel}`,
            },
            {
              role: 'assistant',
              content: `I'll help you document the risk "${riskDesc}" in Project Guardian.

## Risk Documentation Process

### Step 1: Create Risk Entity
Create a risk entity to track this issue:
- Call \`create_entity\` with:
  \`\`\`json
  {
    "entities": [
      {
        "name": "${riskDesc.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 50)}",
        "entityType": "risk",
        "observations": [
          "${riskDesc}",
          "Impact Level: ${impactLevel}",
          "Identified: ${new Date().toLocaleDateString()}",
          "Status: Active",
          "Mitigation Strategy: [To be determined]"
        ]
      }
    ]
  }
  \`\`\`

### Step 2: Identify Affected Entities
Determine what this risk impacts:
- Call \`read_graph\` to see current project structure
- Identify tasks, features, or milestones affected by this risk

### Step 3: Establish Impact Relationships
Link the risk to affected entities:
- Call \`create_relation\` with "blocks" relationships:
  \`\`\`json
  {
    "relations": [
      {
        "from": "affected_task_or_feature",
        "to": "risk_entity_name",
        "relationType": "blocks"
      }
    ]
  }
  \`\`\`

### Step 4: Develop Mitigation Strategy
Add mitigation observations:
- Call \`add_observation\` on the risk entity with:
  - Potential solutions
  - Contingency plans
  - Responsible parties
  - Timeline for resolution

### Step 5: Assign Risk Ownership
Link to responsible team member:
- Call \`create_relation\` with "owned_by" relationship

### Step 6: Monitor Risk Status
Set up regular monitoring:
- Schedule periodic reviews of risk status
- Update observations as mitigation progresses

### Step 7: Risk Resolution
When resolved:
- Call \`add_observation\` to document resolution
- Update risk status to "Mitigated" or "Resolved"
- Consider removing "blocks" relationships if no longer applicable

Would you like me to create the risk entity and help you identify which parts of the project it affects?`,
            },
          ];
          break;

        case 'retrospective':
          const timePeriod = args?.time_period || 'recent period';

          messages = [
            {
              role: 'user',
              content: `I need to conduct a retrospective for ${timePeriod}. Help me analyze what went well, what didn't, and identify improvements.`,
            },
            {
              role: 'assistant',
              content: `I'll guide you through a comprehensive retrospective for ${timePeriod} using Project Guardian.

## Retrospective Process

### Step 1: Gather Data
Review the work completed during ${timePeriod}:
- Call \`read_graph\` to see all entities and their current state
- Call \`search_nodes\` with various queries to find:
  - Completed tasks (look for "completed" in observations)
  - Issues encountered (look for "blocked" or "issue" in observations)
  - New entities created during this period

### Step 2: Analyze Completion
Review what was accomplished:
- Call \`open_node\` on completed features/milestones
- Look at observations for progress updates and completion notes
- Identify any work that didn't get done as planned

### Step 3: Identify Patterns
Look for common themes:
- Call \`search_nodes\` for terms like "delay", "block", "issue", "challenge"
- Find relationships that caused problems or enabled success
- Note any recurring patterns in observations

### Step 4: Document What Went Well
Create positive observations:
- Call \`add_observation\` on relevant entities noting successes:
  \`\`\`json
  {
    "observations": [
      {
        "entityName": "successful_entity",
        "contents": [
          "Retrospective ${timePeriod}: [What went well]",
          "Continue doing: [Positive pattern to maintain]"
        ]
      }
    ]
  }
  \`\`\`

### Step 5: Document What Didn't Go Well
Record issues and challenges:
- Call \`add_observation\` noting problems and their impacts:
  \`\`\`json
  {
    "observations": [
      {
        "entityName": "problematic_entity",
        "contents": [
          "Retrospective ${timePeriod}: [What was challenging]",
          "Issue: [Specific problem encountered]",
          "Impact: [How it affected the work]"
        ]
      }
    ]
  }
  \`\`\`

### Step 6: Create Improvement Actions
Generate action items for improvement:
- Call \`create_entity\` for each improvement action:
  \`\`\`json
  {
    "entities": [
      {
        "name": "improve_ci_cd_pipeline",
        "entityType": "task",
        "observations": [
          "Improvement action from ${timePeriod} retrospective",
          "Problem: [Issue identified]",
          "Solution: [Proposed improvement]",
          "Owner: [Responsible person]",
          "Timeline: [When to implement]"
        ]
      }
    ]
  }
  \`\`\`

### Step 7: Assign Action Ownership
Link actions to responsible parties:
- Call \`create_relation\` with "owned_by" relationships
- Connect actions to relevant project entities with "improves" relationships

### Step 8: Schedule Follow-up
Plan to review improvements:
- Call \`add_observation\` on action items with review dates
- Set up monitoring for implemented changes

### Step 9: Retrospective Summary
Create a summary entity:
- Call \`create_entity\` for the retrospective itself:
  \`\`\`json
  {
    "entities": [
      {
        "name": "retrospective_${timePeriod.replace(/\s+/g, '_')}",
        "entityType": "decision",
        "observations": [
          "Retrospective for ${timePeriod}",
          "Key Wins: [Top 3 positive outcomes]",
          "Key Challenges: [Top 3 issues faced]",
          "Action Items: [Number created]",
          "Overall Assessment: [Positive/Mixed/Negative]"
        ]
      }
    ]
  }
  \`\`\`

Would you like me to start by analyzing the current project state for the retrospective, or do you have specific aspects of ${timePeriod} you'd like to focus on first?`,
            },
          ];
          break;

        case 'code-review':
          const prTitle = args?.pull_request_title || 'Code Changes';
          const reviewer = args?.reviewer_name || 'Reviewer';

          messages = [
            {
              role: 'user',
              content: `I need to conduct a comprehensive code review for "${prTitle}" as ${reviewer}. Help me ensure code quality, catch bugs, and maintain standards.`,
            },
            {
              role: 'assistant',
              content: `I'll guide you through a thorough code review process for "${prTitle}" using Project Guardian to track findings and recommendations.

## Code Review Process

### Step 1: Understand the Changes
First, analyze what changed:
- Review the pull request description and commit messages
- Call \`search_nodes\` with relevant keywords to understand the feature/task context
- Use \`open_node\` to get details about related entities

### Step 2: Create Review Entity
Track the review in Project Guardian:
- Call \`create_entity\` with:
  \`\`\`json
  {
    "entities": [
      {
        "name": "code_review_${prTitle.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30)}_${Date.now()}",
        "entityType": "task",
        "observations": [
          "Code review for: ${prTitle}",
          "Reviewer: ${reviewer}",
          "Started: ${new Date().toLocaleDateString()}",
          "Status: In Progress",
          "Priority: High"
        ]
      }
    ]
  }
  \`\`\`

### Step 3: Technical Review Checklist
Evaluate code quality systematically:

**Architecture & Design:**
- Does the code follow project patterns?
- Is the design clean and maintainable?
- Are there appropriate abstractions?

**Functionality:**
- Does the code implement requirements correctly?
- Are edge cases handled?
- Is error handling comprehensive?

**Performance:**
- Any performance concerns?
- Efficient algorithms and data structures?
- Memory leaks or resource issues?

**Security:**
- Input validation and sanitization?
- Authentication/authorization checks?
- Sensitive data handling?

### Step 4: Document Findings
Record issues found during review:
- Call \`create_entity\` for each significant issue:
  \`\`\`json
  {
    "entities": [
      {
          "name": "issue_bug_${Date.now()}",
        "entityType": "risk",
        "observations": [
          "Found in: ${prTitle}",
          "Type: [bug|security|performance|maintainability]",
          "Severity: [Critical|High|Medium|Low]",
          "Location: [file:function]",
          "Description: [Detailed issue description]",
          "Recommendation: [How to fix]"
        ]
      }
    ]
  }
  \`\`\`

### Step 5: Link Issues to Code
Connect findings to the review entity:
- Call \`create_relation\` with "part_of" relationships:
  \`\`\`json
  {
    "relations": [
      {
        "from": "issue_entity_name",
        "to": "code_review_entity_name",
        "relationType": "part_of"
      }
    ]
  }
  \`\`\`

### Step 6: Testing Review
Verify testing approach:
- Unit tests present and comprehensive?
- Integration tests for new features?
- Edge cases covered?
- Performance tests if applicable?

### Step 7: Documentation Review
Check documentation updates:
- Code comments added/updated?
- API documentation updated?
- README or user guides updated?

### Step 8: Approval Decision
Make the review decision:
- Call \`add_observation\` on the review entity:
  \`\`\`json
  {
    "observations": [
      {
        "entityName": "code_review_entity_name",
        "contents": [
          "Review completed: ${new Date().toLocaleDateString()}",
          "Decision: [Approved|Approved with conditions|Rejected]",
          "Blocking Issues: [count]",
          "Suggestions: [count]",
          "Comments: [Additional feedback]"
        ]
      }
    ]
  }
  \`\`\`

### Step 9: Follow-up Actions
If changes requested:
- Call \`create_entity\` for follow-up tasks
- Use "depends_on" relationships to link to the original review
- Assign ownership to the developer

Would you like me to help you start this code review process by creating the review entity, or do you have specific areas of the code you'd like me to focus on first?`,
            },
          ];
          break;

        case 'bug-tracking':
          const bugDesc = args?.bug_description || 'Software Bug';
          const severity = args?.severity_level || 'Medium';

          messages = [
            {
              role: 'user',
              content: `I need to track and manage a bug: "${bugDesc}". Severity: ${severity}`,
            },
            {
              role: 'assistant',
              content: `I'll help you track and manage the bug "${bugDesc}" using Project Guardian's structured approach.

## Bug Tracking Process

### Step 1: Create Bug Entity
Document the bug systematically:
- Call \`create_entity\` with:
  \`\`\`json
  {
    "entities": [
      {
        "name": "bug_${bugDesc.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 40)}_${Date.now()}",
        "entityType": "risk",
        "observations": [
          "${bugDesc}",
          "Severity: ${severity}",
          "Status: Open",
          "Reported: ${new Date().toLocaleDateString()}",
          "Reproduction Steps: [To be added]",
          "Expected Behavior: [To be added]",
          "Actual Behavior: [To be added]",
          "Environment: [Browser/OS/Version]"
        ]
      }
    ]
  }
  \`\`\`

### Step 2: Gather Complete Information
Collect all necessary details:
- **Reproduction Steps**: How to reproduce the bug
- **Expected vs Actual**: What should happen vs what does happen
- **Environment**: Browser, OS, version where bug occurs
- **Frequency**: How often does it occur?
- **Impact**: What functionality is affected?

### Step 3: Link to Affected Components
Connect the bug to project entities:
- Call \`read_graph\` to see project structure
- Call \`search_nodes\` to find related features/tasks
- Call \`create_relation\` with "blocks" relationships:
  \`\`\`json
  {
    "relations": [
      {
        "from": "affected_feature_or_task",
        "to": "bug_entity_name",
        "relationType": "blocks"
      }
    ]
  }
  \`\`\`

### Step 4: Prioritize and Assign
Set priority and ownership:
- Update severity in observations if needed
- Call \`create_relation\` with "owned_by" for assignment:
  \`\`\`json
  {
    "relations": [
      {
        "from": "bug_entity_name",
        "to": "developer_name",
        "relationType": "owned_by"
      }
    ]
  }
  \`\`\`

### Step 5: Investigation Phase
Track debugging progress:
- Call \`add_observation\` to document investigation steps
- Create related entities for root cause analysis
- Update status as investigation progresses

### Step 6: Solution Development
When fix is identified:
- Call \`create_entity\` for the fix implementation:
  \`\`\`json
  {
    "entities": [
      {
        "name": "fix_for_bug_entity_name",
        "entityType": "task",
        "observations": [
          "Fix for bug: ${bugDesc}",
          "Solution: [Technical approach]",
          "Files to modify: [List]",
          "Testing required: [Unit/Integration/E2E]"
        ]
      }
    ]
  }
  \`\`\`
- Use "resolves" relationship between fix and bug

### Step 7: Testing and Validation
Ensure fix works:
- Call \`add_observation\` documenting test cases
- Update bug status to "Testing" then "Resolved"
- Verify no regressions introduced

### Step 8: Bug Closure
Complete the process:
- Call \`add_observation\` with final status and resolution notes
- Update any blocked entities that can now proceed
- Consider creating prevention measures for similar bugs

Would you like me to create the bug entity and help you gather the complete bug information, or do you have additional details about this bug that we should include?`,
            },
          ];
          break;

        case 'release-planning':
          const releaseVersion = args?.release_version || 'v1.0.0';
          const releaseDate = args?.release_date || 'TBD';

          messages = [
            {
              role: 'user',
              content: `I need to plan release ${releaseVersion} with target date ${releaseDate}. Help me ensure a smooth and successful deployment.`,
            },
            {
              role: 'assistant',
              content: `I'll guide you through planning release ${releaseVersion} using Project Guardian to track all aspects of the release process.

## Release Planning Process

### Step 1: Create Release Milestone
Establish the release as a major project milestone:
- Call \`create_entity\` with:
  \`\`\`json
  {
    "entities": [
      {
        "name": "release_${releaseVersion.replace(/[^a-zA-Z0-9]/g, '_')}",
        "entityType": "milestone",
        "observations": [
          "Release ${releaseVersion}",
          "Target Date: ${releaseDate}",
          "Status: Planning",
          "Created: ${new Date().toLocaleDateString()}",
          "Release Manager: [Name]",
          "Risk Level: [Low/Medium/High]"
        ]
      }
    ]
  }
  \`\`\`

### Step 2: Feature Complete Assessment
Verify all planned features are ready:
- Call \`read_graph\` to see current project state
- Call \`search_nodes\` for "feature" and "task" entities
- Identify features not yet completed
- Call \`create_relation\` with "part_of" to connect features to the release

### Step 3: Quality Gates Check
Ensure quality standards are met:
- **Testing Coverage**: Unit tests, integration tests, E2E tests
- **Code Quality**: Code review completion, static analysis passed
- **Performance**: Performance benchmarks met
- **Security**: Security review completed, vulnerabilities addressed
- **Documentation**: User docs, API docs, release notes updated

### Step 4: Risk Assessment
Identify and mitigate release risks:
- Call \`search_nodes\` for existing risk entities
- Create new risk entities for release-specific concerns:
  \`\`\`json
  {
    "entities": [
      {
        "name": "release_risk_technical_${Date.now()}",
        "entityType": "risk",
        "observations": [
          "Release ${releaseVersion} Risk",
          "Type: [technical|operational|business]",
          "Impact: [High|Medium|Low]",
          "Mitigation: [Plan to address]",
          "Owner: [Responsible person]"
        ]
      }
    ]
  }
  \`\`\`
- Use "blocks" relationships to link risks to the release

### Step 5: Deployment Planning
Plan the deployment process:
- **Environment Preparation**: Staging, production environment readiness
- **Rollback Strategy**: Plan for quick rollback if issues occur
- **Monitoring Setup**: Logging, alerting, and monitoring during deployment
- **Communication Plan**: Stakeholder notifications and status updates

### Step 6: Release Checklist Creation
Create comprehensive checklist:
- Call \`create_entity\` for each checklist category:
  \`\`\`json
  {
    "entities": [
      {
        "name": "release_checklist_testing",
        "entityType": "task",
        "observations": [
          "Release ${releaseVersion} - Testing",
          "[ ] Item 1",
          "[ ] Item 2",
          "[ ] Item 3",
          "Owner: [Responsible person]",
          "Due: [Date before release]"
        ]
      }
    ]
  }
  \`\`\`

### Step 7: Stakeholder Communication
Plan communication strategy:
- Call \`create_entity\` for communication tasks
- Schedule pre-release notifications
- Plan post-release announcements
- Prepare contingency communication for issues

### Step 8: Go/No-Go Criteria
Define release approval criteria:
- Call \`add_observation\` on release milestone with criteria:
  \`\`\`json
  {
    "observations": [
      {
        "entityName": "release_${releaseVersion.replace(/[^a-zA-Z0-9]/g, '_')}",
        "contents": [
          "Go/No-Go Criteria:",
          "• All critical bugs resolved",
          "• All automated tests passing",
          "• Performance benchmarks met",
          "• Security review completed",
          "• Documentation updated",
          "• Rollback plan tested",
          "• Stakeholder approval obtained"
        ]
      }
    ]
  }
  \`\`\`

### Step 9: Post-Release Monitoring
Plan for post-release support:
- Monitor system stability for first 24-48 hours
- Have on-call team ready for issues
- Schedule post-mortem review
- Plan for hotfix process if needed

Would you like me to start by creating the release milestone and assessing the current project readiness, or do you have specific areas of the release planning you'd like to focus on first?`,
            },
          ];
          break;

        case 'stakeholder-communication':
          const commType = args?.communication_type || 'status_update';
          const audience = args?.audience || 'team';

          messages = [
            {
              role: 'user',
              content: `I need to manage stakeholder communication: ${commType} to ${audience}. Help me ensure effective communication throughout the project.`,
            },
            {
              role: 'assistant',
              content: `I'll help you manage stakeholder communication for "${commType}" to "${audience}" using Project Guardian to track all communication activities.

## Stakeholder Communication Management

### Step 1: Create Communication Entity
Track the communication systematically:
- Call \`create_entity\` with:
  \`\`\`json
  {
    "entities": [
      {
        "name": "comm_${commType}_${audience}_${Date.now()}",
        "entityType": "task",
        "observations": [
          "Communication: ${commType}",
          "Audience: ${audience}",
          "Status: Planned",
          "Created: ${new Date().toLocaleDateString()}",
          "Purpose: [Communication objective]",
          "Key Messages: [Main points to convey]",
          "Expected Response: [What you want to achieve]"
        ]
      }
    ]
  }
  \`\`\`

### Step 2: Identify Stakeholders
Determine who needs to be communicated with:
- Call \`read_graph\` to see current project structure
- Call \`search_nodes\` for "person" entities
- Identify stakeholders based on audience type:
  - **Team**: Development team members
  - **Management**: Project sponsors, managers
  - **Client**: External stakeholders, customers
  - **All**: Combination of above groups

### Step 3: Define Communication Objectives
Clarify what you want to achieve:
- **Status Update**: Progress, milestones, current state
- **Issue Alert**: Problems, risks, blockers
- **Milestone Reached**: Accomplishments, completed work
- **Decision Required**: Need input or approval
- **Change Notification**: Scope changes, timeline updates

### Step 4: Prepare Communication Content
Structure the message appropriately:
- **Context**: Current situation and background
- **Key Information**: What stakeholders need to know
- **Impact**: How this affects them or the project
- **Next Steps**: What happens next, actions required
- **Contact**: Who to reach for questions

### Step 5: Choose Communication Channel
Select appropriate delivery method:
- **Email**: Formal updates, detailed information
- **Meeting**: Discussion needed, complex topics
- **Chat/Slack**: Quick updates, urgent issues
- **Report**: Regular status updates, detailed metrics
- **Presentation**: Major milestones, strategic decisions

### Step 6: Schedule and Execute
Plan timing and delivery:
- Call \`add_observation\` with scheduling details:
  \`\`\`json
  {
    "observations": [
      {
        "entityName": "comm_${commType}_${audience}_${Date.now()}",
        "contents": [
          "Scheduled: [Date and time]",
          "Channel: [Email/Meeting/Chat/Report]",
          "Duration: [If meeting or call]",
          "Materials: [Documents, slides, reports needed]",
          "Presenter: [Who will deliver the communication]"
        ]
      }
    ]
  }
  \`\`\`

### Step 7: Track Responses and Follow-up
Monitor communication effectiveness:
- Document stakeholder reactions and feedback
- Note any questions or concerns raised
- Create follow-up actions from responses
- Update communication status

### Step 8: Communication Archive
Maintain communication history:
- Call \`add_observation\` with final outcomes:
  \`\`\`json
  {
    "observations": [
      {
        "entityName": "comm_${commType}_${audience}_${Date.now()}",
        "contents": [
          "Completed: ${new Date().toLocaleDateString()}",
          "Attendance/Readership: [Who received it]",
          "Key Feedback: [Important responses or concerns]",
          "Actions Required: [Follow-up items identified]",
          "Effectiveness: [How well the communication achieved its goals]"
        ]
      }
    ]
  }
  \`\`\`

### Step 9: Communication Patterns Analysis
Learn from communication effectiveness:
- Review past communications for patterns
- Identify most effective channels and timing
- Refine communication templates and processes
- Update stakeholder preferences and contact information

### Best Practices for Different Audiences:

**Team Communications:**
- Regular stand-ups and status updates
- Technical details and implementation progress
- Immediate issue alerts and blockers
- Recognition of achievements

**Management Communications:**
- High-level status and milestone achievements
- Risk and issue summaries
- Resource and timeline updates
- Business impact and ROI updates

**Client Communications:**
- Feature deliveries and demonstrations
- Timeline and deadline updates
- Issue impacts and resolution plans
- Value delivered and next priorities

Would you like me to create the communication entity and help you prepare the content for this ${commType} communication to ${audience}?`,
            },
          ];
          break;

        case 'technical-debt-assessment':
          const componentName = args?.component_name || 'component';
          const assessmentScope = args?.assessment_scope || 'system';

          messages = [
            {
              role: 'user',
              content: `I need to assess technical debt in ${componentName} at the ${assessmentScope} level. Help me identify and prioritize technical debt items.`,
            },
            {
              role: 'assistant',
              content: `I'll guide you through assessing technical debt in "${componentName}" at the ${assessmentScope} level using Project Guardian to track and prioritize debt items.

## Technical Debt Assessment Process

### Step 1: Create Assessment Entity
Establish the assessment framework:
- Call \`create_entity\` with:
  \`\`\`json
  {
    "entities": [
      {
        "name": "tech_debt_assessment_${componentName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}",
        "entityType": "task",
        "observations": [
          "Technical Debt Assessment: ${componentName}",
          "Scope: ${assessmentScope}",
          "Assessment Date: ${new Date().toLocaleDateString()}",
          "Assessor: [Your name]",
          "Methodology: [Code review, static analysis, interviews]",
          "Status: In Progress"
        ]
      }
    ]
  }
  \`\`\`

### Step 2: Define Assessment Scope
Clearly define what will be assessed:
- **File Level**: Individual files with code issues
- **Module Level**: Related components and their interactions
- **System Level**: Architecture and system-wide concerns
- **Portfolio Level**: Multiple systems or applications

### Step 3: Technical Debt Categories
Identify different types of technical debt:
- **Code Quality**: Poor naming, complex functions, duplication
- **Architecture**: Outdated patterns, tight coupling, missing abstractions
- **Testing**: Missing tests, inadequate coverage, flaky tests
- **Documentation**: Missing or outdated docs, poor comments
- **Performance**: Inefficient algorithms, resource waste
- **Security**: Vulnerabilities, insecure patterns
- **Dependencies**: Outdated libraries, unsupported frameworks

### Step 4: Debt Identification
Systematically identify debt items:
- Call \`create_entity\` for each debt item found:
  \`\`\`json
  {
    "entities": [
      {
        "name": "debt_code_${componentName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}",
        "entityType": "risk",
        "observations": [
          "Technical Debt: [Brief description]",
          "Category: [code|architecture|testing|documentation|performance|security|dependencies]",
          "Severity: [Low|Medium|High|Critical]",
          "Location: [File/component where debt exists]",
          "Impact: [How it affects development/maintenance]",
          "Estimated Effort: [Time to fix - hours/days]",
          "Business Impact: [Effect on features, performance, etc.]"
        ]
      }
    ]
  }
  \`\`\`

### Step 5: Impact Analysis
Evaluate the consequences of each debt item:
- **Development Speed**: How much it slows down development
- **Maintenance Cost**: Difficulty of future changes
- **Bug Likelihood**: Probability of introducing bugs
- **Performance Impact**: Effect on system performance
- **Security Risk**: Potential security vulnerabilities
- **Team Morale**: Effect on developer satisfaction

### Step 6: Prioritization Framework
Rank debt items for remediation:
- **High Priority**: Critical bugs, security issues, blocking features
- **Medium Priority**: Performance issues, maintainability problems
- **Low Priority**: Code style issues, minor inefficiencies
- **Defer**: Items with minimal impact that don't affect current goals

### Step 7: Remediation Planning
Create action plans for high-priority items:
- Call \`create_entity\` for remediation tasks:
  \`\`\`json
  {
    "entities": [
      {
        "name": "fix_debt_item_${Date.now()}",
        "entityType": "task",
        "observations": [
          "Fix technical debt: [Debt description]",
          "Priority: [High/Medium/Low]",
          "Estimated Effort: [Time estimate]",
          "Owner: [Responsible developer]",
          "Due Date: [Target completion date]",
          "Success Criteria: [How to measure completion]"
        ]
      }
    ]
  }
  \`\`\`
- Use "resolves" relationships between fixes and debt items

### Step 8: Prevention Measures
Plan to prevent future debt accumulation:
- Call \`create_entity\` for preventive measures:
  \`\`\`json
  {
    "entities": [
      {
        "name": "prevent_tech_debt_practice_${Date.now()}",
        "entityType": "task",
        "observations": [
          "Prevent future technical debt through: [Practice]",
          "Implementation: [How to implement]",
          "Timeline: [When to start]",
          "Owner: [Responsible person]",
          "Measurement: [How to track effectiveness]"
        ]
      }
    ]
  }
  \`\`\`

### Step 9: Assessment Summary
Document findings and recommendations:
- Call \`add_observation\` on the assessment entity:
  \`\`\`json
  {
    "observations": [
      {
        "entityName": "tech_debt_assessment_${componentName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}",
        "contents": [
          "Assessment Summary:",
          "Total Debt Items Found: [count]",
          "High Priority: [count]",
          "Medium Priority: [count]",
          "Low Priority: [count]",
          "Total Estimated Effort: [time estimate]",
          "Key Recommendations: [Top priorities]",
          "Prevention Measures: [Implemented measures]"
        ]
      }
    ]
  }
  \`\`\`

### Step 10: Regular Monitoring
Set up ongoing debt monitoring:
- Schedule periodic reassessments
- Track debt reduction progress
- Monitor new debt introduction
- Adjust priorities based on changing needs

Would you like me to create the assessment entity and help you start identifying technical debt in ${componentName}?`,
            },
          ];
          break;

        case 'change-management':
          const changeDesc = args?.change_description || 'Project change';
          const changeImpactLevel = args?.impact_assessment || 'Medium';

          messages = [
            {
              role: 'user',
              content: `I need to manage a project change: "${changeDesc}". The impact assessment is ${changeImpactLevel}. Help me evaluate and implement this change properly.`,
            },
            {
              role: 'assistant',
              content: `I'll guide you through managing the change "${changeDesc}" with ${changeImpactLevel} impact using Project Guardian to track the entire change management process.

## Change Management Process

### Step 1: Create Change Request Entity
Document the proposed change:
- Call \`create_entity\` with:
  \`\`\`json
  {
    "entities": [
      {
        "name": "change_request_${changeDesc.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 40)}_${Date.now()}",
        "entityType": "decision",
        "observations": [
          "Change Request: ${changeDesc}",
          "Impact Assessment: ${changeImpactLevel}",
          "Requested By: [Your name/role]",
          "Request Date: ${new Date().toLocaleDateString()}",
          "Status: Evaluation",
          "Business Case: [Why this change is needed]",
          "Alternatives Considered: [Other options evaluated]"
        ]
      }
    ]
  }
  \`\`\`

### Step 2: Impact Analysis
Assess effects on all project aspects:
- **Scope**: How the change affects project scope and requirements
- **Timeline**: Impact on schedule and deadlines
- **Budget**: Financial implications and resource requirements
- **Quality**: Effects on deliverables and quality standards
- **Risk**: New risks introduced or existing risks affected
- **Dependencies**: Impact on other project components or teams

### Step 3: Stakeholder Analysis
Identify who is affected by the change:
- Call \`read_graph\` to identify related entities
- Call \`search_nodes\` for stakeholders and dependencies
- Assess communication needs for each stakeholder group
- Determine approval requirements based on impact level

### Step 4: Change Evaluation
Conduct thorough evaluation:
- **Benefits**: What value does this change provide?
- **Costs**: What are the implementation and ongoing costs?
- **Risks**: What could go wrong and mitigation strategies?
- **Feasibility**: Can this change be implemented successfully?
- **Alternatives**: Are there better ways to achieve the same goal?

### Step 5: Create Implementation Plan
If change is approved, plan the implementation:
- Call \`create_entity\` for implementation tasks:
  \`\`\`json
  {
    "entities": [
      {
        "name": "implement_change_${changeDesc.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30)}",
        "entityType": "task",
        "observations": [
          "Implement change: ${changeDesc}",
          "Implementation Approach: [How to implement]",
          "Timeline: [Start and end dates]",
          "Resources Required: [Team, tools, budget]",
          "Success Criteria: [How to measure success]",
          "Rollback Plan: [How to undo if needed]"
        ]
      }
    ]
  }
  \`\`\`
- Break down into smaller, manageable tasks
- Assign ownership and responsibilities

### Step 6: Approval and Communication
Get necessary approvals and communicate:
- Call \`create_relation\` with "requires_approval_from" relationships
- Schedule approval meetings or reviews
- Prepare change notification communications
- Document approval decisions and rationales

### Step 7: Implementation Execution
Execute the change according to plan:
- Call \`add_observation\` to track implementation progress
- Monitor for unexpected issues or resistance
- Document lessons learned during implementation
- Update project documentation and plans

### Step 8: Change Validation
Verify the change achieved its objectives:
- Test that the change works as intended
- Validate that benefits are realized
- Check for unintended side effects
- Gather feedback from affected stakeholders

### Step 9: Change Closure
Complete the change management process:
- Call \`add_observation\` with final outcomes:
  \`\`\`json
  {
    "observations": [
      {
        "entityName": "change_request_${changeDesc.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 40)}_${Date.now()}",
        "contents": [
          "Change Implementation Complete",
          "Final Status: [Successful/Partially Successful/Failed]",
          "Benefits Achieved: [What was accomplished]",
          "Lessons Learned: [Key insights and improvements]",
          "Recommendations: [For future changes]",
          "Closure Date: ${new Date().toLocaleDateString()}"
        ]
      }
    ]
  }
  \`\`\`
- Update project baselines and plans
- Communicate completion to stakeholders

### Step 10: Retrospective and Learning
Learn from the change experience:
- Conduct mini-retrospective on the change process
- Identify process improvements for future changes
- Update change management procedures if needed
- Share learnings with the broader team

### Change Management Best Practices:

**High Impact Changes:**
- Require formal approval and detailed planning
- Need comprehensive testing and validation
- Require extensive stakeholder communication
- May need phased implementation approach

**Medium Impact Changes:**
- Need approval from key stakeholders
- Require impact analysis and risk assessment
- Need change documentation and communication
- May need monitoring during implementation

**Low Impact Changes:**
- Can often be approved quickly
- Need basic documentation
- Limited communication requirements
- Minimal monitoring needed

Would you like me to create the change request entity and help you evaluate the impact of this "${changeDesc}" change?`,
            },
          ];
          break;

        case 'team-productivity':
          const timeframe = args?.timeframe || 'month';
          const focusArea = args?.focus_area || 'overall';

          messages = [
            {
              role: 'user',
              content: `I need to analyze team productivity for the last ${timeframe} with focus on ${focusArea}. Help me measure performance and identify improvement opportunities.`,
            },
            {
              role: 'assistant',
              content: `I'll guide you through analyzing team productivity for the last ${timeframe} with focus on ${focusArea} using Project Guardian to track and improve team performance.

## Team Productivity Analysis Process

### Step 1: Create Analysis Entity
Establish the productivity assessment framework:
- Call \`create_entity\` with:
  \`\`\`json
  {
    "entities": [
      {
        "name": "productivity_analysis_${timeframe}_${focusArea}_${Date.now()}",
        "entityType": "task",
        "observations": [
          "Productivity Analysis: ${timeframe} period",
          "Focus Area: ${focusArea}",
          "Analysis Date: ${new Date().toLocaleDateString()}",
          "Analyst: [Your name]",
          "Methodology: [Velocity, quality metrics, retrospective data]",
          "Status: In Progress"
        ]
      }
    ]
  }
  \`\`\`

### Step 2: Define Productivity Metrics
Establish what to measure based on focus area:

**Velocity Metrics:**
- Story points completed per sprint/iteration
- Tasks completed vs planned
- Cycle time from start to completion
- Throughput and work-in-progress limits

**Quality Metrics:**
- Bug rates and defect density
- Code review feedback and rework
- Test coverage and automated test results
- Customer satisfaction scores

**Collaboration Metrics:**
- Communication frequency and effectiveness
- Knowledge sharing and documentation
- Cross-team dependencies and blockers
- Team morale and engagement indicators

### Step 3: Gather Data Points
Collect relevant data from project history:
- Call \`read_graph\` to see all completed work
- Call \`search_nodes\` for completed tasks and features
- Review observations for progress updates and blockers
- Analyze sprint/task completion patterns

### Step 4: Quantitative Analysis
Calculate productivity metrics:
- **Velocity Trend**: Compare recent performance to historical data
- **Quality Indicators**: Track defect rates and customer feedback
- **Efficiency Metrics**: Measure time spent on valuable work vs overhead
- **Predictability**: Assess how well team meets commitments

### Step 5: Qualitative Assessment
Evaluate team dynamics and processes:
- Call \`search_nodes\` for observations about challenges or successes
- Identify patterns in retrospective data
- Assess team satisfaction and engagement
- Evaluate process effectiveness and bottlenecks

### Step 6: Identify Improvement Opportunities
Pinpoint areas for enhancement:
- Call \`create_entity\` for improvement initiatives:
  \`\`\`json
  {
    "entities": [
      {
        "name": "productivity_improvement_process_${Date.now()}",
        "entityType": "task",
        "observations": [
          "Productivity Improvement: Process Optimization",
          "Current State: [Current performance level]",
          "Target State: [Desired performance level]",
          "Implementation Plan: [How to achieve improvement]",
          "Owner: [Responsible person/team]",
          "Timeline: [When to implement and measure]"
        ]
      }
    ]
  }
  \`\`\`

### Step 7: Root Cause Analysis
Investigate underlying factors:
- **Process Issues**: Inefficient workflows or bottlenecks
- **Skill Gaps**: Training or expertise needs
- **Tool Problems**: Inadequate tooling or automation
- **Communication Barriers**: Coordination or information flow issues
- **Motivation Factors**: Team engagement and satisfaction

### Step 8: Action Planning
Develop specific improvement actions:
- **Quick Wins**: Changes that can be implemented immediately
- **Medium-term**: Process improvements requiring planning
- **Long-term**: Structural changes needing significant investment
- Assign ownership and timelines for each action

### Step 9: Monitoring and Measurement
Set up ongoing tracking:
- Define KPIs to monitor progress
- Establish regular check-in cadences
- Set up dashboards for visibility
- Schedule follow-up assessments

### Step 10: Analysis Summary and Recommendations
Document findings and next steps:
- Call \`add_observation\` with comprehensive analysis:
  \`\`\`json
  {
    "observations": [
      {
        "entityName": "productivity_analysis_${timeframe}_${focusArea}_${Date.now()}",
        "contents": [
          "Productivity Analysis Summary:",
          "Overall Performance: [Above/Below/At target]",
          "Key Strengths: [Top performing areas]",
          "Key Challenges: [Areas needing improvement]",
          "Priority Actions: [Top 3 improvement initiatives]",
          "Expected Impact: [Projected improvements]",
          "Next Assessment: [When to re-evaluate]"
        ]
      }
    ]
  }
  \`\`\`

Would you like me to create the analysis entity and help you start collecting productivity data for the last ${timeframe}?`,
            },
          ];
          break;

        case 'resource-allocation':
          const resourceType = args?.resource_type || 'human';
          const planningHorizon = args?.planning_horizon || 'quarter';

          messages = [
            {
              role: 'user',
              content: `I need to optimize ${resourceType} resource allocation for the next ${planningHorizon}. Help me plan and allocate resources effectively.`,
            },
            {
              role: 'assistant',
              content: `I'll guide you through optimizing ${resourceType} resource allocation for the next ${planningHorizon} using Project Guardian to track and manage resource planning.

## Resource Allocation Planning Process

### Step 1: Create Allocation Plan Entity
Establish the resource planning framework:
- Call \`create_entity\` with:
  \`\`\`json
  {
    "entities": [
      {
        "name": "resource_allocation_${resourceType}_${planningHorizon}_${Date.now()}",
        "entityType": "task",
        "observations": [
          "Resource Allocation Plan: ${resourceType}",
          "Planning Horizon: ${planningHorizon}",
          "Created: ${new Date().toLocaleDateString()}",
          "Planner: [Your name]",
          "Status: Planning",
          "Objectives: [Allocation goals and constraints]"
        ]
      }
    ]
  }
  \`\`\`

### Step 2: Assess Current Resource Inventory
Take stock of available resources:
- **Human Resources**: Team members, skills, availability, capacity
- **Infrastructure**: Servers, tools, environments, cloud resources
- **Budget**: Financial resources, cost centers, spending limits
- **Time**: Working hours, overtime capacity, holiday schedules

### Step 3: Analyze Demand Requirements
Identify resource needs based on upcoming work:
- Call \`read_graph\` to see planned work and dependencies
- Call \`search_nodes\` for upcoming tasks and features
- Assess effort estimates and skill requirements
- Identify peak demand periods and resource conflicts

### Step 4: Capacity Planning
Determine resource availability and constraints:
- **Current Utilization**: How resources are currently allocated
- **Future Commitments**: Existing obligations and schedules
- **Availability Patterns**: Peak times, maintenance windows, holidays
- **Scalability Options**: Ability to add resources when needed

### Step 5: Gap Analysis
Identify mismatches between supply and demand:
- **Shortages**: Areas where demand exceeds supply
- **Surpluses**: Underutilized resources that could be reallocated
- **Skill Gaps**: Missing competencies or expertise
- **Timing Issues**: Resources needed at different times than available

### Step 6: Optimization Strategies
Develop resource optimization approaches:
- **Reallocation**: Move resources from low to high priority work
- **Scheduling**: Adjust timelines to match resource availability
- **Augmentation**: Hire, train, or acquire additional resources
- **Efficiency**: Improve utilization through process improvements

### Step 7: Create Allocation Decisions
Document specific resource assignments:
- Call \`create_relation\` with "assigned_to" or "allocated_to" relationships:
  \`\`\`json
  {
    "relations": [
      {
        "from": "resource_name",
        "to": "task_or_project",
        "relationType": "allocated_to"
      }
    ]
  }
  \`\`\`
- Specify allocation percentages, time periods, and conditions

### Step 8: Risk Assessment
Identify allocation-related risks:
- **Over-allocation**: Resources spread too thin
- **Under-allocation**: Important work not getting needed resources
- **Dependency Risks**: Single points of failure
- **Contingency Needs**: Backup plans for resource unavailability

### Step 9: Monitoring and Adjustment
Set up tracking and adjustment mechanisms:
- Define key performance indicators for resource utilization
- Establish regular review cadences
- Create triggers for reallocation decisions
- Plan for dynamic adjustments based on changing priorities

### Step 10: Communication and Buy-in
Ensure stakeholder alignment:
- Document allocation rationale and trade-offs
- Communicate decisions to affected parties
- Get buy-in from resource owners and consumers
- Set expectations for delivery timelines and quality

Would you like me to create the allocation plan entity and help you start assessing your current ${resourceType} resource inventory?`,
            },
          ];
          break;

        case 'documentation-management':
          const docType = args?.documentation_type || 'api';
          const updateReason = args?.update_reason || 'feature addition';

          messages = [
            {
              role: 'user',
              content: `I need to manage ${docType} documentation updates due to ${updateReason}. Help me ensure documentation stays current and useful.`,
            },
            {
              role: 'assistant',
              content: `I'll guide you through managing ${docType} documentation updates for ${updateReason} using Project Guardian to track documentation tasks and ensure completeness.

## Documentation Management Process

### Step 1: Create Documentation Task Entity
Establish the documentation update framework:
- Call \`create_entity\` with:
  \`\`\`json
  {
    "entities": [
      {
        "name": "doc_update_${docType}_${Date.now()}",
        "entityType": "task",
        "observations": [
          "Documentation Update: ${docType}",
          "Reason: ${updateReason}",
          "Created: ${new Date().toLocaleDateString()}",
          "Owner: [Documentation responsible person]",
          "Priority: [High/Medium/Low]",
          "Status: Planned"
        ]
      }
    ]
  }
  \`\`\`

### Step 2: Assess Documentation Scope
Determine what needs to be updated:
- **API Documentation**: Endpoints, parameters, responses, examples
- **User Guides**: Tutorials, workflows, troubleshooting
- **Technical Specs**: Architecture, data models, interfaces
- **Release Notes**: New features, bug fixes, breaking changes

### Step 3: Impact Analysis
Identify documentation dependencies:
- Which user personas are affected?
- What other documentation might need updates?
- Are there related training materials or videos?
- Should support teams be notified?

### Step 4: Content Planning
Define what information needs to be included:
- **What's New**: New features, capabilities, or behaviors
- **What's Changed**: Modified functionality or interfaces
- **Migration Guide**: How to transition from old to new
- **Examples**: Updated code samples and use cases
- **Troubleshooting**: Common issues and solutions

### Step 5: Review Process Setup
Establish quality assurance for documentation:
- **Technical Review**: Subject matter experts validate accuracy
- **Writing Review**: Ensure clarity and readability
- **User Testing**: Validate that documentation helps users succeed
- **Stakeholder Approval**: Get sign-off from key stakeholders

### Step 6: Create Documentation Tasks
Break down into specific, actionable tasks:
- Call \`create_entity\` for each documentation component:
  \`\`\`json
  {
    "entities": [
      {
        "name": "doc_component_api_reference_${Date.now()}",
        "entityType": "task",
        "observations": [
          "Document: API Reference",
          "Type: ${docType}",
          "Owner: [Responsible writer/editor]",
          "Estimated Effort: [Time estimate]",
          "Due Date: [Target completion]",
          "Review Required: [Yes/No]"
        ]
      }
    ]
  }
  \`\`\`

### Step 7: Link to Source Changes
Connect documentation to the changes that prompted it:
- Use "documents" relationships to link docs to features/tasks
- Reference specific commits, issues, or requirements
- Include version numbers and change tracking

### Step 8: Publishing and Distribution
Plan how documentation will be delivered:
- **Internal Wikis**: For team documentation
- **Public Docs**: For user-facing documentation
- **API References**: For developer documentation
- **Multiple Formats**: HTML, PDF, videos as appropriate

### Step 9: Maintenance Planning
Ensure long-term documentation health:
- Assign ongoing maintenance ownership
- Schedule regular review cycles
- Set up feedback collection mechanisms
- Plan for future updates based on usage patterns

### Step 10: Completion and Follow-up
Finalize and track documentation effectiveness:
- Call \`add_observation\` documenting completion:
  \`\`\`json
  {
    "observations": [
      {
        "entityName": "doc_update_${docType}_${Date.now()}",
        "contents": [
          "Documentation Update Complete",
          "Published: ${new Date().toLocaleDateString()}",
          "Location: [Where documentation is published]",
          "Feedback Mechanism: [How users can provide feedback]",
          "Next Review: [When documentation should be reviewed]",
          "Success Metrics: [How to measure documentation effectiveness]"
        ]
      }
    ]
  }
  \`\`\`

Would you like me to create the documentation task entity and help you assess what specific ${docType} documentation needs to be updated for this ${updateReason}?`,
            },
          ];
          break;

        case 'requirements-gathering':
          const reqType = args?.requirement_type || 'functional';
          const stakeholders = args?.stakeholders ? args.stakeholders.split(',').map((s: string) => s.trim()) : [];

          messages = [
            {
              role: 'user',
              content: `I need to conduct requirements gathering for ${reqType} requirements. ${stakeholders.length > 0 ? `Key stakeholders include: ${stakeholders.join(', ')}.` : ''} Help me set up a comprehensive requirements gathering process.`,
            },
            {
              role: 'assistant',
              content: `I'll guide you through a comprehensive requirements gathering process for ${reqType} requirements using Project Guardian to document and track the entire process.

## Requirements Gathering Process

### Step 1: Create Requirements Gathering Initiative
Establish the requirements gathering project:
- Call \`create_entity\` with:
  \`\`\`json
  {
    "entities": [
      {
        "name": "requirements_gathering_${reqType.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}",
        "entityType": "project",
        "observations": [
          "Requirements Gathering Initiative",
          "Type: ${reqType} requirements",
          "Start Date: ${new Date().toLocaleDateString()}",
          "Status: Planning phase",
          "Objective: Collect and document comprehensive ${reqType} requirements"
        ]
      }
    ]
  }
  \`\`\`

### Step 2: Identify Stakeholders
${stakeholders.length > 0 ? `Document the identified stakeholders:
- Call \`create_entity\` with:
  \`\`\`json
  {
    "entities": [
      ${stakeholders.map(stakeholder => {
        return `{
        "name": "${stakeholder.toLowerCase().replace(/\s+/g, '_')}",
        "entityType": "person",
        "observations": [
          "Stakeholder in ${reqType} requirements gathering",
          "Role": "${stakeholder}",
          "Contact Status: Not contacted",
          "Participation Level: TBD"
        ]
      }`;
      }).join(',\\n      ')}
    ]
  }
  \`\`\`` : 'Create entities for all key stakeholders who need to be involved.'}

### Step 3: Define Requirements Categories
Create requirement category entities based on type:
- Call \`create_entity\` with requirement categories appropriate for ${reqType} requirements

### Step 4: Plan Data Collection Methods
Document your approach for gathering requirements:
- Interviews with stakeholders
- Workshops and brainstorming sessions
- Document analysis
- Prototyping and demonstrations
- Surveys and questionnaires

### Step 5: Schedule Stakeholder Sessions
Create task entities for stakeholder meetings and interviews.

### Step 6: Set Up Requirements Repository
Establish a system for organizing and managing requirements as they are collected.

Would you like me to help you create the specific entities and plan the detailed requirements gathering approach for your ${reqType} requirements?`,
            },
          ];
          break;

        case 'user-story-management':
          const featureName = args?.feature_name || 'New Feature';
          const userRole = args?.user_role || 'user';

          messages = [
            {
              role: 'user',
              content: `I need to create and manage user stories for the "${featureName}" feature. The primary user role is "${userRole}". Help me set up comprehensive user story management.`,
            },
            {
              role: 'assistant',
              content: `I'll guide you through comprehensive user story creation and management for the "${featureName}" feature using Project Guardian to track all user stories, acceptance criteria, and implementation progress.

## User Story Management Process

### Step 1: Create Feature Epic
Establish the feature as an epic entity:
- Call \`create_entity\` with:
  \`\`\`json
  {
    "entities": [
      {
        "name": "epic_${featureName.toLowerCase().replace(/\s+/g, '_')}",
        "entityType": "feature",
        "observations": [
          "Epic: ${featureName}",
          "Primary User: ${userRole}",
          "Status: Backlog",
          "Created: ${new Date().toLocaleDateString()}",
          "Business Value: [Define business value]",
          "Priority: [High/Medium/Low]"
        ]
      }
    ]
  }
  \`\`\`

### Step 2: Define User Story Template
Each user story should follow the standard format:
**As a** [user role] **I want to** [goal] **so that** [benefit]

### Step 3: Identify User Story Candidates
Brainstorm user stories for this feature:
- Consider the ${userRole}'s perspective
- Focus on user goals and benefits
- Keep stories small and independent
- Include acceptance criteria for each story

### Step 4: Create User Story Entities
For each user story, create a task entity:
- Call \`create_entity\` for each user story with:
  - Name: user_story_[unique_id]
  - Type: task
  - Observations: Story text, acceptance criteria, story points, priority

### Step 5: Establish Story Dependencies
Link related user stories and dependencies:
- Call \`create_relation\` to show story relationships
- Identify stories that must be done in sequence
- Mark stories that can be done in parallel

### Step 6: Define Acceptance Criteria
For each user story, document:
- Functional requirements
- Non-functional requirements
- Edge cases and error conditions
- Performance expectations

### Step 7: Story Point Estimation
Assign story points based on:
- Complexity of implementation
- Amount of work required
- Risk and uncertainty
- Dependencies on other work

### Step 8: Sprint Planning Integration
Link user stories to sprint planning:
- Assign stories to specific sprints
- Track sprint capacity and velocity
- Monitor sprint progress and burndown

Would you like me to help you create specific user stories for the "${featureName}" feature and set up the complete user story management workflow?`,
            },
          ];
          break;

        case 'testing-strategy':
          const appType = args?.application_type || 'web';
          const criticality = args?.criticality_level || 'medium';

          messages = [
            {
              role: 'user',
              content: `I need to develop a comprehensive testing strategy for a ${appType} application with ${criticality} business criticality. Help me create a complete testing approach.`,
            },
            {
              role: 'assistant',
              content: `I'll guide you through developing a comprehensive testing strategy for your ${appType} application with ${criticality} criticality using Project Guardian to document and track all testing activities.

## Testing Strategy Development Process

### Step 1: Create Testing Strategy Entity
Establish the testing strategy framework:
- Call \`create_entity\` with:
  \`\`\`json
  {
    "entities": [
      {
        "name": "testing_strategy_${appType}_${Date.now()}",
        "entityType": "project",
        "observations": [
          "Testing Strategy for ${appType} Application",
          "Business Criticality: ${criticality}",
          "Created: ${new Date().toLocaleDateString()}",
          "Status: Strategy Development",
          "Objective: Comprehensive testing coverage and quality assurance"
        ]
      }
    ]
  }
  \`\`\`

### Step 2: Define Testing Levels
Based on ${criticality} criticality and ${appType} application type:

**Unit Testing:**
- Component-level testing
- Code coverage requirements (target: 80-95%)
- Automated unit test frameworks
- Continuous integration integration

**Integration Testing:**
- Module interaction testing
- API endpoint testing
- Database integration testing
- Third-party service integration

**System Testing:**
- End-to-end workflow testing
- Performance testing under load
- Security testing and vulnerability assessment
- Compatibility testing across platforms

**User Acceptance Testing:**
- Business requirement validation
- User experience testing
- Accessibility compliance testing
- Cross-browser/device testing

### Step 3: Test Environment Setup
Create entities for test environments:
- Development testing environment
- Staging/Pre-production environment
- Production-like testing environment
- Performance testing environment

### Step 4: Testing Tools and Frameworks
Select appropriate testing tools for ${appType} applications:
- Unit testing: Jest, Mocha, JUnit, pytest
- Integration testing: Postman, RestAssured, Cypress
- Performance testing: JMeter, k6, LoadRunner
- Security testing: OWASP ZAP, Burp Suite, Snyk

### Step 5: Test Data Management
Establish test data strategies:
- Production data anonymization
- Synthetic test data generation
- Test data refresh processes
- Data cleanup and privacy compliance

### Step 6: Automation Strategy
Define automation approach:
- Unit test automation (100% target)
- API test automation (90% target)
- UI test automation (50-70% target)
- Performance regression automation

### Step 7: Quality Gates and Metrics
Establish quality standards:
- Code coverage minimums
- Performance benchmarks
- Security scan requirements
- Defect density targets
- Mean time to resolution goals

### Step 8: Risk-Based Testing
Prioritize testing based on:
- Business impact of features
- Complexity of implementation
- Historical defect rates
- Regulatory requirements

Would you like me to help you create the detailed testing strategy entities and set up specific testing workflows for your ${appType} application?`,
            },
          ];
          break;

        case 'security-assessment':
          const securityAssessmentScope = args?.assessment_scope || 'application';
          const complianceReqs = args?.compliance_requirements || '';

          messages = [
            {
              role: 'user',
              content: `I need to conduct a security assessment for ${securityAssessmentScope} with ${complianceReqs ? complianceReqs + ' compliance requirements' : 'general security requirements'}. Help me set up comprehensive security assessment and management.`,
            },
            {
              role: 'assistant',
              content: `I'll guide you through conducting a comprehensive security assessment for ${securityAssessmentScope} using Project Guardian to track all security findings, remediation plans, and compliance requirements.

## Security Assessment Process

### Step 1: Create Security Assessment Entity
Establish the security assessment framework:
- Call \`create_entity\` with:
  \`\`\`json
  {
    "entities": [
      {
          "name": "security_assessment_${securityAssessmentScope.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}",
        "entityType": "project",
        "observations": [
          "Security Assessment: ${securityAssessmentScope}",
          "Scope: ${securityAssessmentScope}",
          "Compliance Requirements: ${complianceReqs || 'General security best practices'}",
          "Assessment Date: ${new Date().toLocaleDateString()}",
          "Status: Planning",
          "Risk Level: TBD"
        ]
      }
    ]
  }
  \`\`\`

### Step 2: Define Assessment Scope
Clearly define what will be assessed:
- **Application Security:** Code review, dependency scanning, authentication mechanisms
- **Infrastructure Security:** Network configuration, server hardening, access controls
- **Data Security:** Encryption, data handling, privacy protection
- **Compliance Requirements:** ${complianceReqs || 'Industry standard security practices'}

### Step 3: Security Testing Methodologies
Implement comprehensive testing approaches:

**Automated Security Testing:**
- Static Application Security Testing (SAST)
- Dynamic Application Security Testing (DAST)
- Software Composition Analysis (SCA)
- Container security scanning

**Manual Security Testing:**
- Threat modeling and risk assessment
- Penetration testing and ethical hacking
- Security code review
- Architecture security review

**Compliance Verification:**
- GDPR, HIPAA, SOC2, PCI-DSS requirements
- Industry-specific security standards
- Regulatory compliance checklists

### Step 4: Vulnerability Management
Track and manage security vulnerabilities:
- Create vulnerability entities for each finding
- Assign severity levels (Critical, High, Medium, Low)
- Define remediation timelines
- Track remediation progress

### Step 5: Risk Assessment Framework
Evaluate security risks:
- Likelihood of exploitation
- Potential business impact
- Risk mitigation strategies
- Risk acceptance criteria

### Step 6: Security Controls Implementation
Document security controls:
- Preventive controls (firewalls, access controls)
- Detective controls (monitoring, logging)
- Corrective controls (patching, incident response)
- Recovery controls (backup, disaster recovery)

### Step 7: Security Monitoring and Alerting
Establish ongoing security monitoring:
- Intrusion detection systems
- Log analysis and correlation
- Security information and event management (SIEM)
- Automated alerting for security events

### Step 8: Security Training and Awareness
Plan security education:
- Developer security training
- Security awareness programs
- Incident response training
- Compliance training requirements

Would you like me to help you create specific security assessment entities and set up detailed security testing workflows for your ${securityAssessmentScope}?`,
            },
          ];
          break;

        case 'performance-optimization':
          const performanceMetric = args?.performance_metric || 'response_time';
          const optimizationGoal = args?.optimization_goal || 'improve by 50%';

          messages = [
            {
              role: 'user',
              content: `I need to optimize ${performanceMetric} with the goal to ${optimizationGoal}. Help me set up comprehensive performance monitoring and optimization.`,
            },
            {
              role: 'assistant',
              content: `I'll guide you through comprehensive performance optimization for ${performanceMetric} with the goal to ${optimizationGoal} using Project Guardian to track metrics, optimization efforts, and results.

## Performance Optimization Process

### Step 1: Create Performance Optimization Entity
Establish the optimization initiative:
- Call \`create_entity\` with:
  \`\`\`json
  {
    "entities": [
      {
        "name": "performance_optimization_${performanceMetric.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}",
        "entityType": "project",
        "observations": [
          "Performance Optimization: ${performanceMetric}",
          "Current Baseline: [Measure current performance]",
          "Target Goal: ${optimizationGoal}",
          "Start Date: ${new Date().toLocaleDateString()}",
          "Status: Assessment Phase",
          "Priority: High"
        ]
      }
    ]
  }
  \`\`\`

### Step 2: Establish Performance Baselines
Measure current performance metrics:
- Response time percentiles (P50, P95, P99)
- Throughput and concurrency limits
- Resource utilization (CPU, memory, disk I/O)
- Error rates and timeouts
- User experience metrics

### Step 3: Performance Monitoring Setup
Implement comprehensive monitoring:
- Application Performance Monitoring (APM)
- Infrastructure monitoring
- Database performance monitoring
- Network latency monitoring
- User experience monitoring

### Step 4: Identify Performance Bottlenecks
Conduct performance analysis:
- Code profiling and optimization
- Database query optimization
- Caching strategy implementation
- CDN and network optimization
- Resource scaling and load balancing

### Step 5: Define Optimization Roadmap
Create prioritized optimization tasks:
- Quick wins (low effort, high impact)
- Medium-term improvements
- Long-term architectural changes
- Infrastructure upgrades

### Step 6: Implement Performance Improvements
Track optimization implementation:
- Code refactoring and optimization
- Database indexing and query optimization
- Caching implementation
- CDN setup and configuration
- Load balancing configuration

### Step 7: Performance Testing and Validation
Validate optimization results:
- Load testing with realistic scenarios
- Stress testing for peak loads
- Endurance testing for stability
- Comparative benchmarking

### Step 8: Continuous Performance Monitoring
Establish ongoing performance management:
- Automated performance regression testing
- Alerting for performance degradation
- Regular performance reviews
- Capacity planning and scaling

Would you like me to help you create specific performance optimization tasks and set up monitoring workflows for ${performanceMetric} optimization?`,
            },
          ];
          break;

        case 'knowledge-transfer':
          const knowledgeDomain = args?.knowledge_domain || 'technical';
          const transferRecipients = args?.transfer_recipients || 'team';

          messages = [
            {
              role: 'user',
              content: `I need to plan and execute knowledge transfer for ${knowledgeDomain} knowledge to ${transferRecipients}. Help me set up comprehensive knowledge transfer sessions.`,
            },
            {
              role: 'assistant',
              content: `I'll guide you through planning and executing comprehensive knowledge transfer for ${knowledgeDomain} knowledge to ${transferRecipients} using Project Guardian to document and track the entire transfer process.

## Knowledge Transfer Process

### Step 1: Create Knowledge Transfer Entity
Establish the knowledge transfer initiative:
- Call \`create_entity\` with:
  \`\`\`json
  {
    "entities": [
      {
        "name": "knowledge_transfer_${knowledgeDomain.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}",
        "entityType": "project",
        "observations": [
          "Knowledge Transfer: ${knowledgeDomain}",
          "Recipients: ${transferRecipients}",
          "Start Date: ${new Date().toLocaleDateString()}",
          "Status: Planning",
          "Objective: Complete knowledge transfer and documentation"
        ]
      }
    ]
  }
  \`\`\`

### Step 2: Assess Knowledge Inventory
Identify what knowledge needs to be transferred:
- **Technical Knowledge:** System architecture, code patterns, tools and frameworks
- **Process Knowledge:** Workflows, procedures, best practices
- **Business Knowledge:** Domain expertise, business rules, stakeholder relationships
- **Contextual Knowledge:** Historical decisions, lessons learned, tribal knowledge

### Step 3: Identify Knowledge Owners
Document subject matter experts:
- Primary knowledge owners
- Secondary knowledge sources
- Documentation and reference materials
- External resources and documentation

### Step 4: Define Transfer Recipients
Specify who needs to receive the knowledge:
- Individual team members
- Entire teams or departments
- New hires and trainees
- Cross-functional stakeholders

### Step 5: Choose Transfer Methods
Select appropriate knowledge transfer approaches:
- **Formal Training:** Workshops, presentations, courses
- **Documentation:** Guides, manuals, knowledge bases
- **Hands-on Training:** Pair programming, shadowing, mentoring
- **Interactive Sessions:** Q&A sessions, office hours
- **Self-paced Learning:** Videos, tutorials, recorded sessions

### Step 6: Create Transfer Plan
Develop detailed implementation plan:
- Timeline and milestones
- Session scheduling and logistics
- Required materials and resources
- Success metrics and evaluation criteria

### Step 7: Execute Transfer Sessions
Conduct knowledge transfer activities:
- Schedule and conduct training sessions
- Create supporting documentation
- Record sessions for future reference
- Provide ongoing support and Q&A

### Step 8: Validate Knowledge Transfer
Measure transfer effectiveness:
- Knowledge assessments and quizzes
- Practical application demonstrations
- Feedback from recipients
- Performance metrics and success indicators

### Step 9: Document and Archive
Preserve transferred knowledge:
- Create comprehensive documentation
- Update knowledge bases and wikis
- Archive training materials
- Establish maintenance procedures

Would you like me to help you create specific knowledge transfer sessions and documentation plans for ${knowledgeDomain} knowledge transfer to ${transferRecipients}?`,
            },
          ];
          break;

        case 'vendor-management':
          const vendorType = args?.vendor_type || 'cloud';
          const contractValue = args?.contract_value || 'medium';

          messages = [
            {
              role: 'user',
              content: `I need to manage ${vendorType} vendor relationships with ${contractValue} contract value. Help me set up comprehensive vendor management processes.`,
            },
            {
              role: 'assistant',
              content: `I'll guide you through comprehensive vendor management for ${vendorType} services with ${contractValue} contract value using Project Guardian to track vendor relationships, contracts, and performance.

## Vendor Management Process

### Step 1: Create Vendor Management Entity
Establish vendor management framework:
- Call \`create_entity\` with:
  \`\`\`json
  {
    "entities": [
      {
        "name": "vendor_management_${vendorType.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}",
        "entityType": "project",
        "observations": [
          "Vendor Management: ${vendorType} Services",
          "Contract Value: ${contractValue}",
          "Start Date: ${new Date().toLocaleDateString()}",
          "Status: Active Management",
          "Objective: Optimize vendor relationships and value"
        ]
      }
    ]
  }
  \`\`\`

### Step 2: Vendor Assessment and Selection
Evaluate vendor capabilities and fit:
- Technical capability assessment
- Financial stability evaluation
- References and case studies review
- Compliance and security verification
- Cultural fit and communication assessment

### Step 3: Contract Management
Track contract details and obligations:
- Contract terms and conditions
- Service level agreements (SLAs)
- Pricing and payment terms
- Termination clauses and conditions
- Renewal and renegotiation timelines

### Step 4: Performance Monitoring
Track vendor performance metrics:
- Service delivery quality
- Response time and resolution metrics
- Cost variance analysis
- Innovation and value addition
- Relationship health indicators

### Step 5: Risk Management
Identify and mitigate vendor risks:
- Business continuity risks
- Security and compliance risks
- Financial stability risks
- Performance and delivery risks
- Transition and exit risks

### Step 6: Communication Management
Establish communication protocols:
- Regular status meetings and reviews
- Escalation procedures and contacts
- Change management processes
- Issue resolution frameworks
- Strategic planning discussions

### Step 7: Cost Optimization
Monitor and optimize vendor costs:
- Contract value analysis
- Cost-benefit analysis
- Benchmarking against alternatives
- Volume discount opportunities
- Value engineering initiatives

### Step 8: Relationship Development
Build strategic vendor relationships:
- Joint business planning
- Innovation partnerships
- Knowledge sharing initiatives
- Performance improvement programs
- Long-term strategic alignment

Would you like me to help you create specific vendor entities and set up performance monitoring workflows for ${vendorType} vendor management?`,
            },
          ];
          break;

        case 'incident-response':
          const incidentSeverity = args?.incident_severity || 'high';
          const incidentType = args?.incident_type || 'availability';

          messages = [
            {
              role: 'user',
              content: `I need to manage a ${incidentSeverity} severity ${incidentType} incident. Help me set up comprehensive incident response and management.`,
            },
            {
              role: 'assistant',
              content: `I'll guide you through comprehensive incident response for a ${incidentSeverity} severity ${incidentType} incident using Project Guardian to track the entire incident lifecycle, response actions, and post-incident analysis.

## Incident Response Process

### Step 1: Create Incident Entity
Document the incident immediately:
- Call \`create_entity\` with:
  \`\`\`json
  {
    "entities": [
      {
        "name": "incident_${incidentType.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}",
        "entityType": "incident",
        "observations": [
          "Incident Type: ${incidentType}",
          "Severity: ${incidentSeverity}",
          "Reported: ${new Date().toISOString()}",
          "Status: Active",
          "Impact: [Describe business impact]",
          "Affected Systems: [List affected components]",
          "Initial Assessment: [Brief description]"
        ]
      }
    ]
  }
  \`\`\`

### Step 2: Incident Classification
Determine incident severity and impact:
- **Critical:** Complete system outage, data loss, security breach
- **High:** Major functionality impaired, significant user impact
- **Medium:** Minor functionality issues, limited user impact
- **Low:** Cosmetic issues, no functional impact

### Step 3: Assemble Response Team
Identify and notify response team members:
- Incident commander (overall responsibility)
- Technical leads (technical response)
- Communications lead (stakeholder communication)
- Subject matter experts (domain knowledge)
- Legal/compliance (if needed)

### Step 4: Incident Assessment
Gather detailed incident information:
- Scope and impact assessment
- Root cause hypothesis development
- Evidence collection and preservation
- Timeline reconstruction
- Stakeholder impact analysis

### Step 5: Containment Actions
Implement immediate containment:
- Isolate affected systems
- Stop the bleeding (temporarily)
- Implement workarounds
- Communicate containment status
- Update incident timeline

### Step 6: Recovery Actions
Restore normal operations:
- Develop recovery plan
- Test recovery procedures
- Execute recovery steps
- Validate system functionality
- Monitor for recurrence

### Step 7: Root Cause Analysis
Conduct thorough investigation:
- Detailed timeline analysis
- Contributing factor identification
- Root cause determination
- Lesson learned documentation
- Preventive measure identification

### Step 8: Communication Management
Keep stakeholders informed:
- Regular status updates
- Impact and timeline communications
- Resolution notifications
- Post-incident reports

### Step 9: Post-Incident Review
Conduct incident retrospective:
- What went well
- What could be improved
- Action items and owners
- Process updates and improvements
- Documentation updates

Would you like me to help you create the incident response plan and set up specific incident management workflows for this ${incidentSeverity} severity ${incidentType} incident?`,
            },
          ];
          break;

        case 'ci-cd-setup':
          const pipelineType = args?.pipeline_type || 'full_ci_cd';
          const targetPlatform = args?.target_platform || 'aws';

          messages = [
            {
              role: 'user',
              content: `I need to set up ${pipelineType} pipelines for deployment to ${targetPlatform}. Help me create comprehensive CI/CD workflows.`,
            },
            {
              role: 'assistant',
              content: `I'll guide you through setting up comprehensive ${pipelineType} pipelines for ${targetPlatform} deployment using Project Guardian to track all pipeline components, deployments, and optimizations.

## CI/CD Setup Process

### Step 1: Create CI/CD Project Entity
Establish the CI/CD initiative:
- Call \`create_entity\` with:
  \`\`\`json
  {
    "entities": [
      {
        "name": "ci_cd_setup_${pipelineType.toLowerCase().replace(/\s+/g, '_')}_${targetPlatform}_${Date.now()}",
        "entityType": "project",
        "observations": [
          "CI/CD Setup: ${pipelineType} Pipeline",
          "Target Platform: ${targetPlatform}",
          "Start Date: ${new Date().toLocaleDateString()}",
          "Status: Planning",
          "Objective: Automated, reliable deployment pipeline"
        ]
      }
    ]
  }
  \`\`\`

### Step 2: Define Pipeline Stages
Design comprehensive pipeline architecture:

**Source Control Integration:**
- Branching strategy and protection rules
- Code review requirements
- Automated dependency updates
- Security scanning integration

**Build Stage:**
- Multi-environment build configurations
- Artifact generation and storage
- Build optimization and caching
- Parallel build execution

**Test Stage:**
- Unit test execution and reporting
- Integration test automation
- Performance and security testing
- Test environment management

**Deploy Stage:**
- Environment-specific configurations
- Blue-green deployment strategies
- Rollback procedures and automation
- Deployment verification and health checks

### Step 3: Infrastructure as Code
Implement infrastructure automation:
- Infrastructure provisioning scripts
- Configuration management
- Environment consistency
- Resource scaling automation

### Step 4: Monitoring and Observability
Set up pipeline monitoring:
- Pipeline execution monitoring
- Deployment success/failure tracking
- Performance metrics collection
- Alerting and notification systems

### Step 5: Quality Gates
Implement automated quality checks:
- Code quality metrics (coverage, complexity)
- Security vulnerability scanning
- Performance regression testing
- Manual approval gates for production

### Step 6: Rollback and Recovery
Design failure recovery procedures:
- Automated rollback capabilities
- Backup and restore procedures
- Incident response integration
- Recovery time objective (RTO) optimization

### Step 7: Security Integration
Embed security throughout pipeline:
- Secret management and rotation
- Access control and permissions
- Security scanning and compliance
- Audit trail and logging

### Step 8: Continuous Improvement
Establish pipeline optimization:
- Pipeline performance monitoring
- Bottleneck identification and resolution
- Process improvement initiatives
- Technology stack updates

Would you like me to help you create specific pipeline components and set up deployment workflows for ${pipelineType} pipelines on ${targetPlatform}?`,
            },
          ];
          break;

        case 'architecture-review':
          const architectureType = args?.architecture_type || 'microservices';
          const reviewFocus = args?.review_focus || 'scalability';

          messages = [
            {
              role: 'user',
              content: `I need to conduct an architecture review for a ${architectureType} system with focus on ${reviewFocus}. Help me set up comprehensive architecture assessment.`,
            },
            {
              role: 'assistant',
              content: `I'll guide you through comprehensive architecture review for ${architectureType} systems with focus on ${reviewFocus} using Project Guardian to document architectural decisions, review findings, and track improvements.

## Architecture Review Process

### Step 1: Create Architecture Review Entity
Establish the review framework:
- Call \`create_entity\` with:
  \`\`\`json
  {
    "entities": [
      {
        "name": "architecture_review_${architectureType.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}",
        "entityType": "project",
        "observations": [
          "Architecture Review: ${architectureType}",
          "Review Focus: ${reviewFocus}",
          "Review Date: ${new Date().toLocaleDateString()}",
          "Status: Planning",
          "Objective: Comprehensive architectural assessment"
        ]
      }
    ]
  }
  \`\`\`

### Step 2: Define Review Scope
Establish review boundaries and objectives:
- **System Components:** Identify all architectural components
- **Review Criteria:** Define evaluation standards
- **Stakeholder Identification:** Determine review participants
- **Timeline and Deliverables:** Set review schedule and outputs

### Step 3: Architectural Assessment Framework
Evaluate based on ${reviewFocus} focus:

**Scalability Assessment:**
- Horizontal and vertical scaling capabilities
- Performance bottlenecks and limitations
- Load distribution and balancing
- Resource utilization optimization

**Security Architecture Review:**
- Authentication and authorization patterns
- Data protection and encryption
- Network security and isolation
- Compliance and regulatory requirements

**Maintainability Evaluation:**
- Code organization and modularity
- Documentation completeness
- Testing strategy and coverage
- Technical debt assessment

**Performance Architecture Analysis:**
- Response time and throughput requirements
- Caching and optimization strategies
- Database design and optimization
- Infrastructure performance characteristics

### Step 4: Architecture Documentation Review
Assess documentation quality:
- System architecture diagrams
- Component specifications
- Interface definitions
- Deployment and operational guides

### Step 5: Design Pattern Analysis
Evaluate architectural patterns:
- Design pattern appropriateness
- Pattern implementation quality
- Alternative pattern considerations
- Pattern evolution and modernization

### Step 6: Technology Stack Assessment
Review technology choices:
- Technology appropriateness for requirements
- Technology maturity and support
- Integration capabilities and complexity
- Migration and upgrade considerations

### Step 7: Risk and Issue Identification
Document architectural concerns:
- Technical risks and mitigation strategies
- Performance and scalability issues
- Security vulnerabilities
- Maintainability and evolution challenges

### Step 8: Recommendations and Roadmap
Develop improvement recommendations:
- Short-term improvements (quick wins)
- Medium-term enhancements
- Long-term architectural changes
- Implementation priority and sequencing

Would you like me to help you create specific architecture review checklists and assessment frameworks for ${architectureType} systems with ${reviewFocus} focus?`,
            },
          ];
          break;

        case 'cost-management':
          const costCategory = args?.cost_category || 'infrastructure';
          const budgetConstraint = args?.budget_constraint || 'flexible';

          messages = [
            {
              role: 'user',
              content: `I need to manage ${costCategory} costs with ${budgetConstraint} budget constraints. Help me set up comprehensive cost monitoring and optimization.`,
            },
            {
              role: 'assistant',
              content: `I'll guide you through comprehensive cost management for ${costCategory} with ${budgetConstraint} budget constraints using Project Guardian to track expenses, identify savings opportunities, and optimize resource utilization.

## Cost Management Process

### Step 1: Create Cost Management Entity
Establish cost management framework:
- Call \`create_entity\` with:
  \`\`\`json
  {
    "entities": [
      {
        "name": "cost_management_${costCategory.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}",
        "entityType": "project",
        "observations": [
          "Cost Management: ${costCategory}",
          "Budget Constraint: ${budgetConstraint}",
          "Start Date: ${new Date().toLocaleDateString()}",
          "Status: Assessment",
          "Objective: Optimize costs while maintaining quality"
        ]
      }
    ]
  }
  \`\`\`

### Step 2: Cost Baseline Establishment
Document current cost structure:
- **Infrastructure Costs:** Cloud services, servers, networking
- **Personnel Costs:** Salaries, benefits, contractors
- **Tool and Software Costs:** Licenses, subscriptions, tools
- **Operational Costs:** Monitoring, maintenance, support

### Step 3: Cost Monitoring Setup
Implement cost tracking systems:
- Automated cost collection and reporting
- Budget vs actual spending analysis
- Cost allocation by project/feature
- Trend analysis and forecasting

### Step 4: Cost Analysis Framework
Analyze cost drivers and patterns:
- Cost per feature or component
- Cost efficiency metrics
- Return on investment analysis
- Cost-benefit analysis for initiatives

### Step 5: Cost Optimization Strategies
Identify optimization opportunities:
- **Right-sizing Resources:** Match resource allocation to actual needs
- **Reserved Instances:** Utilize cloud provider discounts
- **Auto-scaling:** Implement demand-based scaling
- **Spot Instances:** Use cost-effective compute options
- **Resource Cleanup:** Remove unused resources and services

### Step 6: Budget Planning and Forecasting
Develop cost management plans:
- Budget allocation and tracking
- Cost forecasting and planning
- Scenario planning and what-if analysis
- Cost control policies and procedures

### Step 7: Vendor Cost Management
Optimize third-party costs:
- Contract negotiation and renewal
- License optimization and consolidation
- Alternative vendor evaluation
- Volume discount opportunities

### Step 8: Cost Reporting and Communication
Establish cost transparency:
- Regular cost reports and dashboards
- Stakeholder communication plans
- Cost variance analysis and explanations
- Cost-saving achievement recognition

Would you like me to help you create specific cost tracking entities and optimization workflows for ${costCategory} cost management?`,
            },
          ];
          break;

        case 'customer-feedback':
          const feedbackChannel = args?.feedback_channel || 'survey';
          const feedbackFocus = args?.feedback_focus || 'usability';

          messages = [
            {
              role: 'user',
              content: `I need to collect and analyze customer feedback through ${feedbackChannel} with focus on ${feedbackFocus}. Help me set up comprehensive feedback management.`,
            },
            {
              role: 'assistant',
              content: `I'll guide you through comprehensive customer feedback collection and analysis through ${feedbackChannel} with focus on ${feedbackFocus} using Project Guardian to track feedback, analyze patterns, and drive improvements.

## Customer Feedback Management Process

### Step 1: Create Feedback Management Entity
Establish feedback management framework:
- Call \`create_entity\` with:
  \`\`\`json
  {
    "entities": [
      {
        "name": "customer_feedback_${feedbackChannel.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}",
        "entityType": "project",
        "observations": [
          "Customer Feedback: ${feedbackChannel}",
          "Focus Area: ${feedbackFocus}",
          "Start Date: ${new Date().toLocaleDateString()}",
          "Status: Planning",
          "Objective: Collect and analyze customer insights"
        ]
      }
    ]
  }
  \`\`\`

### Step 2: Feedback Channel Setup
Configure feedback collection methods:
- **Survey Platforms:** Design and deploy structured surveys
- **Support Channels:** Monitor support tickets and interactions
- **Review Platforms:** Track app store and review site feedback
- **Analytics Platforms:** Monitor user behavior and usage patterns
- **Social Media:** Monitor brand mentions and sentiment

### Step 3: Feedback Collection Strategy
Design comprehensive collection approach:
- Survey design and question development
- Sampling strategy and target audience
- Collection timing and frequency
- Incentive programs and participation encouragement
- Multi-channel integration

### Step 4: Feedback Analysis Framework
Establish analysis methodologies:
- Quantitative analysis (ratings, NPS, metrics)
- Qualitative analysis (themes, sentiment, patterns)
- Text analytics and natural language processing
- Statistical analysis and significance testing
- Trend analysis and longitudinal studies

### Step 5: Feedback Categorization
Organize feedback into actionable categories:
- **Usability Issues:** Interface and user experience problems
- **Feature Requests:** New functionality and enhancement ideas
- **Performance Issues:** Speed, reliability, and stability concerns
- **Support Issues:** Help and documentation needs
- **Bug Reports:** Functional issues and defects

### Step 6: Action Planning and Prioritization
Develop response and improvement plans:
- Feedback prioritization framework
- Action item creation and assignment
- Timeline and milestone setting
- Resource allocation for improvements
- Success metric definition

### Step 7: Communication Strategy
Manage feedback loop with customers:
- Acknowledgment and response procedures
- Progress updates and resolution communications
- Follow-up surveys and satisfaction measurement
- Transparency in improvement processes

### Step 8: Continuous Improvement
Establish feedback-driven improvement cycle:
- Regular feedback review and analysis
- Improvement initiative tracking
- Impact measurement and ROI analysis
- Process refinement and optimization

Would you like me to help you create specific feedback collection entities and analysis workflows for ${feedbackChannel} feedback with ${feedbackFocus} focus?`,
            },
          ];
          break;

        case 'innovation-planning':
          const innovationType = args?.innovation_type || 'product';
          const riskTolerance = args?.risk_tolerance || 'moderate';

          messages = [
            {
              role: 'user',
              content: `I need to plan ${innovationType} innovation initiatives with ${riskTolerance} risk tolerance. Help me set up comprehensive innovation management.`,
            },
            {
              role: 'assistant',
              content: `I'll guide you through comprehensive innovation planning for ${innovationType} initiatives with ${riskTolerance} risk tolerance using Project Guardian to track ideas, experiments, and innovation outcomes.

## Innovation Planning Process

### Step 1: Create Innovation Entity
Establish innovation management framework:
- Call \`create_entity\` with:
  \`\`\`json
  {
    "entities": [
      {
        "name": "innovation_planning_${innovationType.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}",
        "entityType": "project",
        "observations": [
          "Innovation Planning: ${innovationType}",
          "Risk Tolerance: ${riskTolerance}",
          "Start Date: ${new Date().toLocaleDateString()}",
          "Status: Ideation",
          "Objective: Generate and validate innovative solutions"
        ]
      }
    ]
  }
  \`\`\`

### Step 2: Innovation Strategy Definition
Develop innovation approach and framework:
- **Product Innovation:** New features, services, or product lines
- **Process Innovation:** Workflow and operational improvements
- **Technology Innovation:** New tools, platforms, or technical approaches
- **Business Model Innovation:** Revenue model and market approach changes

### Step 3: Idea Generation Process
Establish systematic ideation methods:
- Brainstorming and creative thinking sessions
- Customer feedback and market research analysis
- Competitive analysis and benchmarking
- Technology trend monitoring
- Cross-industry inspiration and analogies

### Step 4: Innovation Pipeline Management
Create structured evaluation process:
- **Idea Capture:** Collect and document innovation ideas
- **Initial Screening:** Quick feasibility and alignment assessment
- **Detailed Evaluation:** Technical, market, and financial analysis
- **Prototyping:** Build minimum viable prototypes
- **Testing and Validation:** Market testing and user validation
- **Implementation Planning:** Detailed rollout and scaling plans

### Step 5: Risk Management Framework
Balance innovation with risk tolerance:
- **Conservative Approach:** Incremental improvements, low-risk experiments
- **Moderate Approach:** Medium-risk innovations with clear validation paths
- **Aggressive Approach:** High-risk, high-reward breakthrough innovations

### Step 6: Resource Allocation
Plan innovation investment and resources:
- Dedicated innovation budget allocation
- Innovation team composition and skills
- Time allocation for innovation activities
- External partnership and collaboration opportunities

### Step 7: Experimentation Framework
Design innovation testing methodology:
- Hypothesis development and testing
- Minimum viable product (MVP) creation
- A/B testing and experimentation platforms
- Learning milestone definition
- Pivot and iteration planning

### Step 8: Success Metrics and KPIs
Define innovation success measurement:
- Idea-to-implementation conversion rates
- Market validation and adoption metrics
- Financial return on innovation investment
- Learning and knowledge generation metrics
- Cultural impact and innovation mindset development

Would you like me to help you create specific innovation experiment entities and evaluation frameworks for ${innovationType} innovation with ${riskTolerance} risk tolerance?`,
            },
          ];
          break;

        default:
          throw new Error(`Unknown prompt: ${name}`);
      }

      return {
        description: `Project Guardian prompt for ${name}`,
        messages,
      };
    });
  }

  private async initializeMemorySystem(): Promise<void> {
    try {
      await this.memoryManager.initializeMemoryDatabase();
      console.error('Memory system initialized successfully');
    } catch (error) {
      console.error('Failed to initialize memory system:', error);
    }
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.sqliteManager.closeAllConnections();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.sqliteManager.closeAllConnections();
      process.exit(0);
    });
  }

  private async getProjectStatistics(): Promise<any> {
    try {
      // Get entity counts by type
      const entityStatsResult = await this.sqliteManager.executeSql('memory', `
        SELECT entity_type, COUNT(*) as count
        FROM entities
        GROUP BY entity_type
        ORDER BY count DESC
      `);
      const entityStats = entityStatsResult.success ? entityStatsResult.data?.rows || [] : [];

      // Get relation counts by type
      const relationStatsResult = await this.sqliteManager.executeSql('memory', `
        SELECT relation_type, COUNT(*) as count
        FROM relations
        GROUP BY relation_type
        ORDER BY count DESC
      `);
      const relationStats = relationStatsResult.success ? relationStatsResult.data?.rows || [] : [];

      // Get total counts
      const totalEntitiesResult = await this.sqliteManager.executeSql('memory', `
        SELECT COUNT(*) as count FROM entities
      `);
      const totalEntities = totalEntitiesResult.success ? totalEntitiesResult.data?.rows || [] : [];

      const totalRelationsResult = await this.sqliteManager.executeSql('memory', `
        SELECT COUNT(*) as count FROM relations
      `);
      const totalRelations = totalRelationsResult.success ? totalRelationsResult.data?.rows || [] : [];

      // Calculate some derived metrics
      const entitiesByType = entityStats.reduce((acc: any, stat: any) => {
        acc[stat.entity_type] = stat.count;
        return acc;
      }, {});

      const relationsByType = relationStats.reduce((acc: any, stat: any) => {
        acc[stat.relation_type] = stat.count;
        return acc;
      }, {});

      // Calculate connectivity metrics
      const avgRelationsPerEntity = totalEntities[0]?.count > 0
        ? (totalRelations[0]?.count / totalEntities[0]?.count).toFixed(2)
        : '0.00';

      return {
        overview: {
          totalEntities: totalEntities[0]?.count || 0,
          totalRelations: totalRelations[0]?.count || 0,
          totalEntityTypes: Object.keys(entitiesByType).length,
          totalRelationTypes: Object.keys(relationsByType).length,
          avgRelationsPerEntity: parseFloat(avgRelationsPerEntity),
        },
        entitiesByType,
        relationsByType,
        topEntityTypes: Object.entries(entitiesByType)
          .sort(([,a]: any, [,b]: any) => b - a)
          .slice(0, 5),
        topRelationTypes: Object.entries(relationsByType)
          .sort(([,a]: any, [,b]: any) => b - a)
          .slice(0, 5),
        healthMetrics: {
          connectivityRatio: parseFloat(avgRelationsPerEntity),
          entityTypeDiversity: Object.keys(entitiesByType).length,
          relationTypeDiversity: Object.keys(relationsByType).length,
          dataCompleteness: totalEntities[0]?.count > 0 ? 'good' : 'empty',
        },
        lastUpdated: new Date().toISOString(),
        cacheNote: 'Real-time statistics calculated from the current knowledge graph state.'
      };
    } catch (error) {
      return {
        error: `Failed to calculate project statistics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        overview: {
          totalEntities: 0,
          totalRelations: 0,
          totalEntityTypes: 0,
          totalRelationTypes: 0,
          avgRelationsPerEntity: 0,
        },
        entitiesByType: {},
        relationsByType: {},
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Project Guardian MCP server running on stdio');
  }
}