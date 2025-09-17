import { z } from 'zod';

// Database types
export const DatabaseTypeSchema = z.enum(['sqlite', 'postgresql', 'mysql', 'mongodb']);
export type DatabaseType = z.infer<typeof DatabaseTypeSchema>;

// Database operations schemas
export const CreateDatabaseSchema = z.object({
  name: z.string().min(1).max(255),
  type: DatabaseTypeSchema.default('sqlite'),
  path: z.string().optional(), // For SQLite file path
});

export const ListDatabasesSchema = z.object({
  type: DatabaseTypeSchema.optional(),
});

export const DropDatabaseSchema = z.object({
  name: z.string().min(1),
  type: DatabaseTypeSchema.default('sqlite'),
});

// Table operations schemas
export const CreateTableSchema = z.object({
  database: z.string().min(1),
  name: z.string().min(1).max(255),
  schema: z.object({
    columns: z.array(z.object({
      name: z.string().min(1),
      type: z.string().min(1),
      constraints: z.array(z.string()).optional(),
      defaultValue: z.string().optional(),
    })),
    primaryKey: z.array(z.string()).optional(),
    indexes: z.array(z.object({
      name: z.string(),
      columns: z.array(z.string()),
      unique: z.boolean().optional(),
    })).optional(),
  }),
});

export const ListTablesSchema = z.object({
  database: z.string().min(1),
});

export const DescribeTableSchema = z.object({
  database: z.string().min(1),
  table: z.string().min(1),
});

export const DropTableSchema = z.object({
  database: z.string().min(1),
  table: z.string().min(1),
});

// CRUD operations schemas
export const InsertDataSchema = z.object({
  database: z.string().min(1),
  table: z.string().min(1),
  records: z.array(z.record(z.any())).min(1),
});

export const QueryDataSchema = z.object({
  database: z.string().min(1),
  table: z.string().min(1),
  conditions: z.record(z.any()).optional(),
  limit: z.number().min(1).max(10000).optional(),
  offset: z.number().min(0).optional(),
  orderBy: z.string().optional(),
  orderDirection: z.enum(['ASC', 'DESC']).optional(),
});

export const UpdateDataSchema = z.object({
  database: z.string().min(1),
  table: z.string().min(1),
  conditions: z.record(z.any()),
  updates: z.record(z.any()),
});

export const DeleteDataSchema = z.object({
  database: z.string().min(1),
  table: z.string().min(1),
  conditions: z.record(z.any()),
});

export const CountRecordsSchema = z.object({
  database: z.string().min(1),
  table: z.string().min(1),
  conditions: z.record(z.any()).optional(),
});

// Advanced operations schemas
export const ExecuteSqlSchema = z.object({
  database: z.string().min(1),
  query: z.string().min(1),
  parameters: z.array(z.any()).optional(),
});

export const ImportFromFileSchema = z.object({
  database: z.string().min(1),
  table: z.string().min(1),
  filePath: z.string().min(1),
  format: z.enum(['csv', 'json', 'sql']).default('csv'),
  options: z.object({
    delimiter: z.string().optional(),
    hasHeader: z.boolean().optional(),
    encoding: z.string().optional(),
  }).optional(),
});

export const ExportToFileSchema = z.object({
  database: z.string().min(1),
  table: z.string().min(1),
  filePath: z.string().min(1),
  format: z.enum(['csv', 'json', 'sql']).default('csv'),
  conditions: z.record(z.any()).optional(),
  options: z.object({
    delimiter: z.string().optional(),
    includeHeader: z.boolean().optional(),
    encoding: z.string().optional(),
  }).optional(),
});

export const BackupDatabaseSchema = z.object({
  database: z.string().min(1),
  backupPath: z.string().min(1),
});

export const RestoreDatabaseSchema = z.object({
  backupPath: z.string().min(1),
  databaseName: z.string().min(1),
});

// Response types
export interface DatabaseInfo {
  name: string;
  type: DatabaseType;
  path?: string;
  size?: number;
  createdAt: string;
  modifiedAt: string;
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  indexes: IndexInfo[];
  rowCount: number;
  size: number;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  constraints: string[];
}

export interface IndexInfo {
  name: string;
  columns: string[];
  unique: boolean;
  type: string;
}

export interface QueryResult {
  columns: string[];
  rows: any[];
  rowCount: number;
  executionTime: number;
}

export interface DatabaseOperationResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  executionTime?: number;
}