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

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Project Guardian MCP server running on stdio');
  }
}