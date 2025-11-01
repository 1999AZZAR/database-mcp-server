import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
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
        },
      }
    );

    this.setupToolHandlers();
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