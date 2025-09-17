import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { SQLiteManager } from './sqlite-manager.js';
import { ImportExportManager } from './import-export.js';
import {
  CreateDatabaseSchema,
  ListDatabasesSchema,
  DropDatabaseSchema,
  CreateTableSchema,
  ListTablesSchema,
  DescribeTableSchema,
  DropTableSchema,
  InsertDataSchema,
  QueryDataSchema,
  UpdateDataSchema,
  DeleteDataSchema,
  CountRecordsSchema,
  ExecuteSqlSchema,
  ImportFromFileSchema,
  ExportToFileSchema,
  BackupDatabaseSchema,
  RestoreDatabaseSchema,
} from './types.js';

export class DatabaseMCPServer {
  private server: Server;
  private sqliteManager: SQLiteManager;
  private importExportManager: ImportExportManager;

  constructor() {
    // Use current directory for database storage
    this.sqliteManager = new SQLiteManager('.');
    this.importExportManager = new ImportExportManager(this.sqliteManager);
    
    this.server = new Server(
      {
        name: 'database-mcp-server',
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
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // Database Management
          {
            name: 'create_database',
            description: 'Create a new database',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Database name' },
                type: { type: 'string', enum: ['sqlite'], default: 'sqlite', description: 'Database type' },
                path: { type: 'string', description: 'Database file path (optional for SQLite)' },
              },
              required: ['name'],
            },
          },
          {
            name: 'list_databases',
            description: 'List all available databases',
            inputSchema: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['sqlite'], description: 'Filter by database type' },
              },
            },
          },
          {
            name: 'drop_database',
            description: 'Drop (delete) a database',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Database name' },
                type: { type: 'string', enum: ['sqlite'], default: 'sqlite', description: 'Database type' },
              },
              required: ['name'],
            },
          },
          // Table Management
          {
            name: 'create_table',
            description: 'Create a new table in a database',
            inputSchema: {
              type: 'object',
              properties: {
                database: { type: 'string', description: 'Database name' },
                name: { type: 'string', description: 'Table name' },
                schema: {
                  type: 'object',
                  properties: {
                    columns: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          type: { type: 'string' },
                          constraints: { type: 'array', items: { type: 'string' } },
                          defaultValue: { type: 'string' },
                        },
                        required: ['name', 'type'],
                      },
                    },
                    primaryKey: { type: 'array', items: { type: 'string' } },
                    indexes: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          columns: { type: 'array', items: { type: 'string' } },
                          unique: { type: 'boolean' },
                        },
                        required: ['name', 'columns'],
                      },
                    },
                  },
                  required: ['columns'],
                },
              },
              required: ['database', 'name', 'schema'],
            },
          },
          {
            name: 'list_tables',
            description: 'List all tables in a database',
            inputSchema: {
              type: 'object',
              properties: {
                database: { type: 'string', description: 'Database name' },
              },
              required: ['database'],
            },
          },
          {
            name: 'describe_table',
            description: 'Get detailed information about a table',
            inputSchema: {
              type: 'object',
              properties: {
                database: { type: 'string', description: 'Database name' },
                table: { type: 'string', description: 'Table name' },
              },
              required: ['database', 'table'],
            },
          },
          {
            name: 'drop_table',
            description: 'Drop (delete) a table',
            inputSchema: {
              type: 'object',
              properties: {
                database: { type: 'string', description: 'Database name' },
                table: { type: 'string', description: 'Table name' },
              },
              required: ['database', 'table'],
            },
          },
          // CRUD Operations
          {
            name: 'insert_data',
            description: 'Insert records into a table',
            inputSchema: {
              type: 'object',
              properties: {
                database: { type: 'string', description: 'Database name' },
                table: { type: 'string', description: 'Table name' },
                records: {
                  type: 'array',
                  items: { type: 'object' },
                  description: 'Array of records to insert',
                },
              },
              required: ['database', 'table', 'records'],
            },
          },
          {
            name: 'query_data',
            description: 'Query data from a table',
            inputSchema: {
              type: 'object',
              properties: {
                database: { type: 'string', description: 'Database name' },
                table: { type: 'string', description: 'Table name' },
                conditions: { type: 'object', description: 'WHERE conditions' },
                limit: { type: 'number', minimum: 1, maximum: 10000, description: 'Maximum number of rows' },
                offset: { type: 'number', minimum: 0, description: 'Number of rows to skip' },
                orderBy: { type: 'string', description: 'Column to order by' },
                orderDirection: { type: 'string', enum: ['ASC', 'DESC'], description: 'Sort direction' },
              },
              required: ['database', 'table'],
            },
          },
          {
            name: 'update_data',
            description: 'Update records in a table',
            inputSchema: {
              type: 'object',
              properties: {
                database: { type: 'string', description: 'Database name' },
                table: { type: 'string', description: 'Table name' },
                conditions: { type: 'object', description: 'WHERE conditions' },
                updates: { type: 'object', description: 'Fields to update' },
              },
              required: ['database', 'table', 'conditions', 'updates'],
            },
          },
          {
            name: 'delete_data',
            description: 'Delete records from a table',
            inputSchema: {
              type: 'object',
              properties: {
                database: { type: 'string', description: 'Database name' },
                table: { type: 'string', description: 'Table name' },
                conditions: { type: 'object', description: 'WHERE conditions' },
              },
              required: ['database', 'table', 'conditions'],
            },
          },
          {
            name: 'count_records',
            description: 'Count records in a table',
            inputSchema: {
              type: 'object',
              properties: {
                database: { type: 'string', description: 'Database name' },
                table: { type: 'string', description: 'Table name' },
                conditions: { type: 'object', description: 'WHERE conditions' },
              },
              required: ['database', 'table'],
            },
          },
          // Advanced Operations
          {
            name: 'execute_sql',
            description: 'Execute raw SQL query',
            inputSchema: {
              type: 'object',
              properties: {
                database: { type: 'string', description: 'Database name' },
                query: { type: 'string', description: 'SQL query to execute' },
                parameters: { type: 'array', description: 'Query parameters' },
              },
              required: ['database', 'query'],
            },
          },
          {
            name: 'import_from_file',
            description: 'Import data from a file into a table',
            inputSchema: {
              type: 'object',
              properties: {
                database: { type: 'string', description: 'Database name' },
                table: { type: 'string', description: 'Table name' },
                filePath: { type: 'string', description: 'Path to the file' },
                format: { type: 'string', enum: ['csv', 'json', 'sql'], default: 'csv', description: 'File format' },
                options: {
                  type: 'object',
                  properties: {
                    delimiter: { type: 'string', description: 'CSV delimiter' },
                    hasHeader: { type: 'boolean', description: 'CSV has header row' },
                    encoding: { type: 'string', description: 'File encoding' },
                  },
                },
              },
              required: ['database', 'table', 'filePath'],
            },
          },
          {
            name: 'export_to_file',
            description: 'Export table data to a file',
            inputSchema: {
              type: 'object',
              properties: {
                database: { type: 'string', description: 'Database name' },
                table: { type: 'string', description: 'Table name' },
                filePath: { type: 'string', description: 'Output file path' },
                format: { type: 'string', enum: ['csv', 'json', 'sql'], default: 'csv', description: 'Output format' },
                conditions: { type: 'object', description: 'WHERE conditions' },
                options: {
                  type: 'object',
                  properties: {
                    delimiter: { type: 'string', description: 'CSV delimiter' },
                    includeHeader: { type: 'boolean', description: 'Include header in CSV' },
                    encoding: { type: 'string', description: 'File encoding' },
                  },
                },
              },
              required: ['database', 'table', 'filePath'],
            },
          },
          {
            name: 'backup_database',
            description: 'Create a backup of a database',
            inputSchema: {
              type: 'object',
              properties: {
                database: { type: 'string', description: 'Database name' },
                backupPath: { type: 'string', description: 'Backup file path' },
              },
              required: ['database', 'backupPath'],
            },
          },
          {
            name: 'restore_database',
            description: 'Restore a database from backup',
            inputSchema: {
              type: 'object',
              properties: {
                backupPath: { type: 'string', description: 'Backup file path' },
                databaseName: { type: 'string', description: 'New database name' },
              },
              required: ['backupPath', 'databaseName'],
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
          // Database Management
          case 'create_database': {
            const validated = CreateDatabaseSchema.parse(args);
            result = await this.sqliteManager.createDatabase(validated.name);
            break;
          }
          case 'list_databases': {
            const validated = ListDatabasesSchema.parse(args);
            result = await this.sqliteManager.listDatabases();
            break;
          }
          case 'drop_database': {
            const validated = DropDatabaseSchema.parse(args);
            result = await this.sqliteManager.dropDatabase(validated.name);
            break;
          }
          // Table Management
          case 'create_table': {
            const validated = CreateTableSchema.parse(args);
            result = await this.sqliteManager.createTable(
              validated.database,
              validated.name,
              validated.schema
            );
            break;
          }
          case 'list_tables': {
            const validated = ListTablesSchema.parse(args);
            result = await this.sqliteManager.listTables(validated.database);
            break;
          }
          case 'describe_table': {
            const validated = DescribeTableSchema.parse(args);
            result = await this.sqliteManager.describeTable(validated.database, validated.table);
            break;
          }
          case 'drop_table': {
            const validated = DropTableSchema.parse(args);
            result = await this.sqliteManager.dropTable(validated.database, validated.table);
            break;
          }
          // CRUD Operations
          case 'insert_data': {
            const validated = InsertDataSchema.parse(args);
            result = await this.sqliteManager.insertData(
              validated.database,
              validated.table,
              validated.records
            );
            break;
          }
          case 'query_data': {
            const validated = QueryDataSchema.parse(args);
            result = await this.sqliteManager.queryData(
              validated.database,
              validated.table,
              validated.conditions,
              validated.limit,
              validated.offset,
              validated.orderBy,
              validated.orderDirection
            );
            break;
          }
          case 'update_data': {
            const validated = UpdateDataSchema.parse(args);
            result = await this.sqliteManager.updateData(
              validated.database,
              validated.table,
              validated.conditions,
              validated.updates
            );
            break;
          }
          case 'delete_data': {
            const validated = DeleteDataSchema.parse(args);
            result = await this.sqliteManager.deleteData(
              validated.database,
              validated.table,
              validated.conditions
            );
            break;
          }
          case 'count_records': {
            const validated = CountRecordsSchema.parse(args);
            result = await this.sqliteManager.countRecords(
              validated.database,
              validated.table,
              validated.conditions
            );
            break;
          }
          // Advanced Operations
          case 'execute_sql': {
            const validated = ExecuteSqlSchema.parse(args);
            result = await this.sqliteManager.executeSql(
              validated.database,
              validated.query,
              validated.parameters
            );
            break;
          }
          case 'import_from_file': {
            const validated = ImportFromFileSchema.parse(args);
            result = await this.importExportManager.importFromFile(
              validated.database,
              validated.table,
              validated.filePath,
              validated.format,
              validated.options
            );
            break;
          }
          case 'export_to_file': {
            const validated = ExportToFileSchema.parse(args);
            result = await this.importExportManager.exportToFile(
              validated.database,
              validated.table,
              validated.filePath,
              validated.format,
              validated.conditions,
              validated.options
            );
            break;
          }
          case 'backup_database': {
            const validated = BackupDatabaseSchema.parse(args);
            result = await this.sqliteManager.backupDatabase(validated.database, validated.backupPath);
            break;
          }
          case 'restore_database': {
            const validated = RestoreDatabaseSchema.parse(args);
            result = await this.sqliteManager.restoreDatabase(validated.backupPath, validated.databaseName);
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
    console.error('Database MCP server running on stdio');
  }
}