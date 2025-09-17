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

## Available Tools

This MCP server provides **16 powerful tools** for comprehensive database management:

### Database Management
- `create_database` - Create a new database
- `list_databases` - List all available databases  
- `drop_database` - Drop (delete) a database

### Table Management
- `create_table` - Create a new table with schema definition
- `list_tables` - List all tables in a database
- `describe_table` - Get detailed information about a table
- `drop_table` - Drop (delete) a table

### CRUD Operations
- `insert_data` - Insert records into a table
- `query_data` - Query data from a table with filtering and sorting
- `update_data` - Update records in a table
- `delete_data` - Delete records from a table
- `count_records` - Count records in a table

### Advanced Operations
- `execute_sql` - Execute raw SQL queries with parameters
- `import_from_file` - Import data from CSV, JSON, or SQL files
- `export_to_file` - Export table data to CSV, JSON, or SQL files
- `backup_database` - Create a backup of a database
- `restore_database` - Restore a database from backup

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

---

**Database MCP Server** - Comprehensive database operations for the Model Context Protocol ecosystem.