# Database MCP Server

A comprehensive Model Context Protocol (MCP) server for database operations with SQLite support. This server provides structured database management capabilities including database creation, table management, CRUD operations, import/export functionality, and advanced SQL execution.

## Features

### Core Database Operations
- **Database Management**: Create, list, and drop SQLite databases
- **Default Memory Database**: Automatically creates `memory.db` in the server directory for persistent storage
- **Table Management**: Create, list, describe, and drop tables with schema support
- **CRUD Operations**: Insert, query, update, delete, and count records
- **SQL Execution**: Execute raw SQL queries with parameter support
- **Import/Export**: Import from CSV, JSON, and SQL files; export to multiple formats
- **Backup/Restore**: Create and restore database backups

### Advanced Features
- **Schema Validation**: Comprehensive input validation with Zod schemas
- **Error Handling**: Detailed error messages and graceful failure handling
- **Connection Management**: Automatic connection pooling and cleanup
- **File Integration**: Seamless integration with filesystem operations
- **Performance**: Optimized for large datasets and batch operations

### Enterprise Features
- **TypeScript**: Fully typed with comprehensive error handling
- **Input Validation**: Zod schema validation for all parameters
- **Error Recovery**: Graceful error handling with detailed error messages
- **Resource Management**: Automatic cleanup of connections and resources
- **Testing**: Comprehensive Jest test suite with high coverage

## Installation

1. **Clone the repository:**
```bash
git clone https://github.com/1999AZZAR/database-mcp-server.git
cd database-mcp-server
```

2. **Install dependencies:**
```bash
npm install
```

3. **Build the project:**
```bash
npm run build
```

4. **Test the server:**
```bash
npm start
```

## Configuration

### For Cursor IDE

Add this server to your Cursor MCP configuration (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "database-mcp": {
      "command": "node",
      "args": ["/path/to/database-mcp-server/dist/index.js"],
      "env": {}
    }
  }
}
```

### For Claude Desktop

Add this server to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "database-mcp": {
      "command": "node",
      "args": ["/path/to/database-mcp-server/dist/index.js"],
      "env": {}
    }
  }
}
```

## Available Tools

This MCP server provides **16 powerful tools** for comprehensive database management:

### 1. Database Management

#### `create_database` - Create Database
Create a new SQLite database.

**Parameters:**
- `name` (required): Database name
- `type` (optional): Database type (default: "sqlite")
- `path` (optional): Database file path (auto-generated for SQLite)

**Example:**
```json
{
  "name": "create_database",
  "arguments": {
    "name": "my_app_db",
    "type": "sqlite"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Database 'my_app_db' created successfully",
  "data": {
    "name": "my_app_db",
    "path": "./my_app_db.db"
  },
  "executionTime": 45
}
```

#### `list_databases` - List Databases
List all available databases.

**Parameters:**
- `type` (optional): Filter by database type

**Example:**
```json
{
  "name": "list_databases",
  "arguments": {}
}
```

**Response:**
```json
{
  "success": true,
  "message": "Found 2 databases",
  "data": [
    {
      "name": "my_app_db",
      "type": "sqlite",
      "path": "./my_app_db.db",
      "size": 2048,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "modifiedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "executionTime": 12
}
```

#### `drop_database` - Drop Database
Delete a database.

**Parameters:**
- `name` (required): Database name
- `type` (optional): Database type (default: "sqlite")

**Example:**
```json
{
  "name": "drop_database",
  "arguments": {
    "name": "my_app_db"
  }
}
```

### 2. Table Management

#### `create_table` - Create Table
Create a new table with schema definition.

**Parameters:**
- `database` (required): Database name
- `name` (required): Table name
- `schema` (required): Table schema definition

**Schema Structure:**
```json
{
  "columns": [
    {
      "name": "id",
      "type": "INTEGER",
      "constraints": ["PRIMARY KEY", "AUTOINCREMENT"]
    },
    {
      "name": "name",
      "type": "TEXT",
      "constraints": ["NOT NULL"]
    },
    {
      "name": "email",
      "type": "TEXT",
      "constraints": ["UNIQUE"]
    },
    {
      "name": "created_at",
      "type": "DATETIME",
      "defaultValue": "CURRENT_TIMESTAMP"
    }
  ],
  "primaryKey": ["id"],
  "indexes": [
    {
      "name": "idx_email",
      "columns": ["email"],
      "unique": true
    }
  ]
}
```

**Example:**
```json
{
  "name": "create_table",
  "arguments": {
    "database": "my_app_db",
    "name": "users",
    "schema": {
      "columns": [
        {
          "name": "id",
          "type": "INTEGER",
          "constraints": ["PRIMARY KEY", "AUTOINCREMENT"]
        },
        {
          "name": "name",
          "type": "TEXT",
          "constraints": ["NOT NULL"]
        },
        {
          "name": "email",
          "type": "TEXT",
          "constraints": ["UNIQUE"]
        }
      ]
    }
  }
}
```

#### `list_tables` - List Tables
List all tables in a database.

**Parameters:**
- `database` (required): Database name

**Example:**
```json
{
  "name": "list_tables",
  "arguments": {
    "database": "my_app_db"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Found 3 tables",
  "data": ["users", "posts", "comments"],
  "executionTime": 8
}
```

#### `describe_table` - Describe Table
Get detailed information about a table structure.

**Parameters:**
- `database` (required): Database name
- `table` (required): Table name

**Example:**
```json
{
  "name": "describe_table",
  "arguments": {
    "database": "my_app_db",
    "table": "users"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Table 'users' described successfully",
  "data": {
    "name": "users",
    "columns": [
      {
        "name": "id",
        "type": "INTEGER",
        "nullable": false,
        "defaultValue": null,
        "constraints": ["PRIMARY KEY"]
      },
      {
        "name": "name",
        "type": "TEXT",
        "nullable": false,
        "defaultValue": null,
        "constraints": ["NOT NULL"]
      }
    ],
    "indexes": [
      {
        "name": "idx_email",
        "columns": ["email"],
        "unique": true,
        "type": "btree"
      }
    ],
    "rowCount": 150,
    "size": 8192
  },
  "executionTime": 15
}
```

#### `drop_table` - Drop Table
Delete a table.

**Parameters:**
- `database` (required): Database name
- `table` (required): Table name

**Example:**
```json
{
  "name": "drop_table",
  "arguments": {
    "database": "my_app_db",
    "table": "old_table"
  }
}
```

### 3. CRUD Operations

#### `insert_data` - Insert Data
Insert records into a table.

**Parameters:**
- `database` (required): Database name
- `table` (required): Table name
- `records` (required): Array of records to insert

**Example:**
```json
{
  "name": "insert_data",
  "arguments": {
    "database": "my_app_db",
    "table": "users",
    "records": [
      {
        "name": "John Doe",
        "email": "john@example.com",
        "age": 30
      },
      {
        "name": "Jane Smith",
        "email": "jane@example.com",
        "age": 25
      }
    ]
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "2 records inserted successfully",
  "data": {
    "insertedCount": 2
  },
  "executionTime": 25
}
```

#### `query_data` - Query Data
Query data from a table with filtering and sorting.

**Parameters:**
- `database` (required): Database name
- `table` (required): Table name
- `conditions` (optional): WHERE conditions
- `limit` (optional): Maximum number of rows (1-10000)
- `offset` (optional): Number of rows to skip
- `orderBy` (optional): Column to order by
- `orderDirection` (optional): Sort direction ("ASC" or "DESC")

**Example:**
```json
{
  "name": "query_data",
  "arguments": {
    "database": "my_app_db",
    "table": "users",
    "conditions": {
      "age": 30
    },
    "limit": 10,
    "orderBy": "name",
    "orderDirection": "ASC"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Query executed successfully",
  "data": {
    "columns": ["id", "name", "email", "age"],
    "rows": [
      {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com",
        "age": 30
      }
    ],
    "rowCount": 1
  },
  "executionTime": 18
}
```

#### `update_data` - Update Data
Update records in a table.

**Parameters:**
- `database` (required): Database name
- `table` (required): Table name
- `conditions` (required): WHERE conditions
- `updates` (required): Fields to update

**Example:**
```json
{
  "name": "update_data",
  "arguments": {
    "database": "my_app_db",
    "table": "users",
    "conditions": {
      "id": 1
    },
    "updates": {
      "age": 31,
      "email": "john.doe@example.com"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "1 records updated successfully",
  "data": {
    "changes": 1
  },
  "executionTime": 22
}
```

#### `delete_data` - Delete Data
Delete records from a table.

**Parameters:**
- `database` (required): Database name
- `table` (required): Table name
- `conditions` (required): WHERE conditions

**Example:**
```json
{
  "name": "delete_data",
  "arguments": {
    "database": "my_app_db",
    "table": "users",
    "conditions": {
      "age": 30
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "1 records deleted successfully",
  "data": {
    "changes": 1
  },
  "executionTime": 16
}
```

#### `count_records` - Count Records
Count records in a table.

**Parameters:**
- `database` (required): Database name
- `table` (required): Table name
- `conditions` (optional): WHERE conditions

**Example:**
```json
{
  "name": "count_records",
  "arguments": {
    "database": "my_app_db",
    "table": "users",
    "conditions": {
      "age": 30
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Count: 5",
  "data": {
    "count": 5
  },
  "executionTime": 12
}
```

### 4. Advanced Operations

#### `execute_sql` - Execute SQL
Execute raw SQL queries.

**Parameters:**
- `database` (required): Database name
- `query` (required): SQL query to execute
- `parameters` (optional): Query parameters

**Example:**
```json
{
  "name": "execute_sql",
  "arguments": {
    "database": "my_app_db",
    "query": "SELECT u.name, COUNT(p.id) as post_count FROM users u LEFT JOIN posts p ON u.id = p.user_id GROUP BY u.id, u.name",
    "parameters": []
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "SQL query executed successfully",
  "data": {
    "columns": ["name", "post_count"],
    "rows": [
      {
        "name": "John Doe",
        "post_count": 5
      },
      {
        "name": "Jane Smith",
        "post_count": 3
      }
    ],
    "rowCount": 2
  },
  "executionTime": 35
}
```

#### `import_from_file` - Import from File
Import data from CSV, JSON, or SQL files.

**Parameters:**
- `database` (required): Database name
- `table` (required): Table name
- `filePath` (required): Path to the file
- `format` (optional): File format ("csv", "json", "sql", default: "csv")
- `options` (optional): Import options

**CSV Options:**
- `delimiter`: CSV delimiter (default: ",")
- `hasHeader`: Whether CSV has header row (default: true)
- `encoding`: File encoding (default: "utf8")

**Example:**
```json
{
  "name": "import_from_file",
  "arguments": {
    "database": "my_app_db",
    "table": "users",
    "filePath": "/path/to/users.csv",
    "format": "csv",
    "options": {
      "delimiter": ",",
      "hasHeader": true,
      "encoding": "utf8"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Imported 100 records from CSV file",
  "data": {
    "importedCount": 100,
    "format": "csv",
    "filePath": "/path/to/users.csv"
  },
  "executionTime": 150
}
```

#### `export_to_file` - Export to File
Export table data to CSV, JSON, or SQL files.

**Parameters:**
- `database` (required): Database name
- `table` (required): Table name
- `filePath` (required): Output file path
- `format` (optional): Output format ("csv", "json", "sql", default: "csv")
- `conditions` (optional): WHERE conditions
- `options` (optional): Export options

**CSV Options:**
- `delimiter`: CSV delimiter (default: ",")
- `includeHeader`: Include header in CSV (default: true)
- `encoding`: File encoding (default: "utf8")

**Example:**
```json
{
  "name": "export_to_file",
  "arguments": {
    "database": "my_app_db",
    "table": "users",
    "filePath": "/path/to/users_export.csv",
    "format": "csv",
    "conditions": {
      "age": 30
    },
    "options": {
      "delimiter": ",",
      "includeHeader": true,
      "encoding": "utf8"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Exported 25 records to CSV file",
  "data": {
    "exportedCount": 25,
    "format": "csv",
    "filePath": "/path/to/users_export.csv",
    "columns": 4
  },
  "executionTime": 45
}
```

#### `backup_database` - Backup Database
Create a backup of a database.

**Parameters:**
- `database` (required): Database name
- `backupPath` (required): Backup file path

**Example:**
```json
{
  "name": "backup_database",
  "arguments": {
    "database": "my_app_db",
    "backupPath": "/path/to/backup/my_app_db_backup.db"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Database 'my_app_db' backed up successfully",
  "data": {
    "backupPath": "/path/to/backup/my_app_db_backup.db"
  },
  "executionTime": 200
}
```

#### `restore_database` - Restore Database
Restore a database from backup.

**Parameters:**
- `backupPath` (required): Backup file path
- `databaseName` (required): New database name

**Example:**
```json
{
  "name": "restore_database",
  "arguments": {
    "backupPath": "/path/to/backup/my_app_db_backup.db",
    "databaseName": "restored_db"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Database 'restored_db' restored successfully",
  "data": {
    "databaseName": "restored_db",
    "path": "./restored_db.db"
  },
  "executionTime": 180
}
```

## Usage Examples

### Basic Database Operations

```typescript
// Create a database
const createResult = await mcpClient.callTool('create_database', {
  name: 'my_app_db'
});

// Create a table
const tableResult = await mcpClient.callTool('create_table', {
  database: 'my_app_db',
  name: 'users',
  schema: {
    columns: [
      { name: 'id', type: 'INTEGER', constraints: ['PRIMARY KEY', 'AUTOINCREMENT'] },
      { name: 'name', type: 'TEXT', constraints: ['NOT NULL'] },
      { name: 'email', type: 'TEXT', constraints: ['UNIQUE'] }
    ]
  }
});

// Insert data
const insertResult = await mcpClient.callTool('insert_data', {
  database: 'my_app_db',
  table: 'users',
  records: [
    { name: 'John Doe', email: 'john@example.com' },
    { name: 'Jane Smith', email: 'jane@example.com' }
  ]
});

// Query data
const queryResult = await mcpClient.callTool('query_data', {
  database: 'my_app_db',
  table: 'users',
  conditions: { name: 'John Doe' }
});
```

### Advanced Operations

```typescript
// Execute complex SQL
const sqlResult = await mcpClient.callTool('execute_sql', {
  database: 'my_app_db',
  query: `
    SELECT u.name, COUNT(p.id) as post_count 
    FROM users u 
    LEFT JOIN posts p ON u.id = p.user_id 
    GROUP BY u.id, u.name 
    ORDER BY post_count DESC
  `
});

// Import from CSV
const importResult = await mcpClient.callTool('import_from_file', {
  database: 'my_app_db',
  table: 'users',
  filePath: '/path/to/users.csv',
  format: 'csv',
  options: { hasHeader: true }
});

// Export to JSON
const exportResult = await mcpClient.callTool('export_to_file', {
  database: 'my_app_db',
  table: 'users',
  filePath: '/path/to/users_export.json',
  format: 'json'
});

// Backup database
const backupResult = await mcpClient.callTool('backup_database', {
  database: 'my_app_db',
  backupPath: '/path/to/backup/my_app_db.db'
});
```

### Integration with Other MCP Servers

```typescript
// Use with filesystem server to manage database files
const fsResult = await filesystemClient.callTool('list_directory', {
  path: './databases'
});

// Use with chaining server to orchestrate complex workflows
const chainResult = await chainingClient.callTool('generate_route_suggestions', {
  task: 'Import user data from CSV and create analytics report',
  criteria: {
    prioritizeReliability: true,
    maxComplexity: 5
  }
});
```

## Development

### Project Structure

```
database-mcp-server/
├── src/
│   ├── index.ts              # Main entry point
│   ├── server.ts             # MCP server implementation
│   ├── sqlite-manager.ts     # SQLite database operations
│   ├── import-export.ts      # Import/export functionality
│   └── types.ts              # Type definitions and schemas
├── dist/                     # Compiled JavaScript output
├── __tests__/               # Test files
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── jest.config.js           # Jest testing configuration
└── README.md                # This documentation
```

### Development Commands

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode with hot reload
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Clean build directory
npm run clean

# Start production server
npm start
```

### Testing

The server includes comprehensive Jest tests:

```bash
npm test
```

**Test Coverage:**
- Database management (create, list, drop)
- Table management (create, list, describe, drop)
- CRUD operations (insert, query, update, delete, count)
- Advanced operations (SQL execution, import/export, backup/restore)
- Error handling and edge cases
- Input validation and schema validation

### Error Handling

The server includes comprehensive error handling:

- **Input Validation**: All parameters validated with Zod schemas
- **Database Errors**: Graceful handling of SQL errors, constraint violations, and connection issues
- **File Operations**: Proper error handling for import/export operations
- **Resource Cleanup**: Automatic cleanup of database connections and resources
- **Process Management**: Proper signal handling for graceful shutdown

### Performance Considerations

- **Connection Pooling**: Efficient database connection management
- **Batch Operations**: Optimized for large dataset operations
- **Memory Management**: Automatic cleanup prevents memory leaks
- **Query Optimization**: Support for prepared statements and parameterized queries

## Security Considerations

- **Input Sanitization**: All inputs validated and sanitized
- **SQL Injection Prevention**: Parameterized queries prevent SQL injection
- **File Path Validation**: Import/export paths validated to prevent directory traversal
- **Error Information**: Error messages don't expose sensitive information
- **Resource Limits**: Query limits prevent resource exhaustion

## Integration with MCP Ecosystem

This database server integrates seamlessly with other MCP servers:

### Filesystem Integration
- Import/export operations work with filesystem server
- Database files can be managed through filesystem operations
- Backup/restore operations integrate with file management

### Chaining Integration
- Database operations can be orchestrated through chaining server
- Complex workflows involving data processing and analysis
- Integration with other data sources and processing tools

### Research Integration
- Store research results from Google Search and Wikipedia servers
- Build knowledge bases from external data sources
- Create persistent storage for analysis results

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run the test suite: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## Support

For issues and questions:
- **GitHub Issues**: [Open an issue](https://github.com/1999AZZAR/database-mcp-server/issues)
- **Documentation**: Check this README for comprehensive usage examples
- **Examples**: See the examples section above for common use cases

---

**Database MCP Server** - Comprehensive database operations for the Model Context Protocol ecosystem.