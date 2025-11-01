# Project Guardian MCP

A focused Model Context Protocol (MCP) server designed as your project's memory system and workflow guardian. This server provides streamlined database operations and advanced knowledge graph capabilities for intelligent project management, with exactly 17 tools to maintain clarity and focus.

## Features

### Project Guardian Memory System
- **Knowledge Graph**: Maintain project entities, relationships, and observations
- **Entity Management**: Projects, tasks, people, resources with rich metadata
- **Relationship Mapping**: Dependencies, ownership, blockers, and connections
- **Observation Tracking**: Contextual notes and progress updates
- **Semantic Search**: Full-text search across all project knowledge
- **Memory Persistence**: Automatic persistence in SQLite database

### Streamlined Database Operations
- **Single Database**: Uses only `memory.db` for all operations
- **Core CRUD**: Essential database operations (query, insert, update, delete)
- **SQL Execution**: Direct SQL query execution
- **Data Transfer**: Import/export CSV and JSON files
- **17 Tools Total**: Focused toolset for maximum clarity

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

This MCP server provides **exactly 17 focused tools** for project guardianship:

### Database Operations (7 tools)

#### `execute_sql` - Execute SQL Query
Execute raw SQL queries on memory.db.

**Parameters:**
- `query` (required): SQL query string
- `parameters` (optional): Query parameters array

#### `query_data` - Query Table Data
Query data from memory.db tables with filtering and pagination.

**Parameters:**
- `table` (required): Table name
- `conditions` (optional): WHERE conditions object
- `limit` (optional): Maximum rows to return
- `offset` (optional): Number of rows to skip
- `orderBy` (optional): Column to sort by
- `orderDirection` (optional): Sort direction ("ASC" or "DESC")

#### `insert_data` - Insert Records
Insert records into memory.db table.

**Parameters:**
- `table` (required): Table name
- `records` (required): Array of record objects to insert

#### `update_data` - Update Records
Update records in memory.db table.

**Parameters:**
- `table` (required): Table name
- `conditions` (required): WHERE conditions for records to update
- `updates` (required): Fields to update

#### `delete_data` - Delete Records
Delete records from memory.db table.

**Parameters:**
- `table` (required): Table name
- `conditions` (required): WHERE conditions for records to delete

#### `import_data` - Import Data
Import data from CSV or JSON file into memory.db table.

**Parameters:**
- `table` (required): Target table name
- `filePath` (required): Path to source file
- `format` (optional): File format ("csv" or "json")
- `options` (optional): Import options (delimiter, hasHeader)

#### `export_data` - Export Data
Export memory.db table data to CSV or JSON file.

**Parameters:**
- `table` (required): Source table name
- `filePath` (required): Output file path
- `format` (optional): Output format ("csv" or "json")
- `conditions` (optional): WHERE conditions to filter export
- `options` (optional): Export options (delimiter, includeHeader)

### Project Guardian Memory Tools (10 tools)

#### `initialize_memory` - Initialize Memory System
Set up the project memory database schema and tables.

**Parameters:** None

#### `create_entity` - Create Project Entities
Create entities in the project knowledge graph (supports single or batch).

**Parameters:**
- `entities` (required): Array of entity objects
  - `name`: Entity name
  - `entityType`: Type (project, task, person, resource)
  - `observations`: Array of notes about the entity

#### `create_relation` - Create Entity Relationships
Create relationships between project entities (supports single or batch).

**Parameters:**
- `relations` (required): Array of relation objects
  - `from`: Source entity name
  - `to`: Target entity name
  - `relationType`: Relationship type (depends_on, blocks, owns, etc.)

#### `add_observation` - Add Entity Observations
Add observations/notes to project entities (supports single or batch).

**Parameters:**
- `observations` (required): Array of observation objects
  - `entityName`: Target entity name
  - `contents`: Array of observation strings to add

#### `delete_entity` - Delete Project Entities
Remove entities and their relations from project memory (supports single or batch).

**Parameters:**
- `entityNames` (required): Array of entity names to delete

#### `delete_observation` - Remove Entity Observations
Remove specific observations from entities (supports single or batch).

**Parameters:**
- `deletions` (required): Array of deletion objects
  - `entityName`: Target entity name
  - `observations`: Array of observation strings to remove

#### `delete_relation` - Delete Entity Relationships
Remove relationships between project entities (supports single or batch).

**Parameters:**
- `relations` (required): Array of relation objects to delete
  - `from`: Source entity name
  - `to`: Target entity name
  - `relationType`: Relationship type to delete

#### `read_graph` - Read Project Knowledge Graph
Retrieve the entire project knowledge graph with all entities and relationships.

**Parameters:** None

#### `search_nodes` - Search Project Knowledge
Search for entities and relations matching a query across names, types, and content.

**Parameters:**
- `query` (required): Search term

#### `open_node` - Get Entity Details
Retrieve detailed information about project entities (supports single or batch).

**Parameters:**
- `names` (required): Array of entity names to retrieve

## Usage Examples

### Project Guardian Setup

```typescript
// Initialize the project memory system
const initResult = await mcpClient.callTool('initialize_memory', {});

// Create your first project entities
const entityResult = await mcpClient.callTool('create_entity', {
  entities: [
    {
      name: 'web_platform',
      entityType: 'project',
      observations: ['Main web application platform', 'React + Node.js stack', 'Q2 2024 delivery']
    },
    {
      name: 'user_authentication',
      entityType: 'feature',
      observations: ['OAuth2 implementation', 'Google/GitHub providers', 'JWT tokens']
    }
  ]
});

// Establish project relationships
const relationResult = await mcpClient.callTool('create_relation', {
  relations: [
    {
      from: 'user_authentication',
      to: 'web_platform',
      relationType: 'part_of'
    }
  ]
});
```

### Project Management Workflow

```typescript
// Add progress observations
await mcpClient.callTool('add_observation', {
  observations: [
    {
      entityName: 'user_authentication',
      contents: [
        'Completed OAuth2 setup for Google provider',
        'JWT implementation finished',
        'Unit tests passing at 95% coverage'
      ]
    }
  ]
});

// Search project knowledge
const searchResult = await mcpClient.callTool('search_nodes', {
  query: 'authentication'
});

// Read entire project knowledge graph
const graphResult = await mcpClient.callTool('read_graph', {});

// Get detailed entity information
const entityDetails = await mcpClient.callTool('open_node', {
  names: ['user_authentication', 'web_platform']
});
```

### Database Operations

```typescript
// Execute custom SQL queries
const sqlResult = await mcpClient.callTool('execute_sql', {
  query: 'SELECT * FROM entities WHERE entity_type = ?',
  parameters: ['project']
});

// Query project data
const queryResult = await mcpClient.callTool('query_data', {
  table: 'entities',
  conditions: { entity_type: 'task' },
  limit: 10
});

// Import/export data
const importResult = await mcpClient.callTool('import_data', {
  table: 'project_data',
  filePath: './project_backup.csv',
  format: 'csv'
});
```

## Configuration

### For Cursor IDE

Add this server to your Cursor MCP configuration (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "project-guardian": {
      "command": "node",
      "args": ["/path/to/project-guardian-mcp/dist/index.js"],
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
    "project-guardian": {
      "command": "node",
      "args": ["/path/to/project-guardian-mcp/dist/index.js"],
      "env": {}
    }
  }
}
```

## Development

1. **Clone the repository:**
```bash
git clone https://github.com/1999AZZAR/project-guardian-mcp.git
cd project-guardian-mcp
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

## License

MIT License - see LICENSE file for details.
