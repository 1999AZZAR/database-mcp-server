import { SQLiteManager } from '../src/sqlite-manager';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

describe('SQLiteManager', () => {
  let sqliteManager: SQLiteManager;
  const testDbPath = './test-databases';

  beforeEach(() => {
    sqliteManager = new SQLiteManager(testDbPath);
  });

  afterEach(async () => {
    await sqliteManager.closeAllConnections();
    // Clean up test databases
    if (existsSync(testDbPath)) {
      const fs = require('fs');
      const files = fs.readdirSync(testDbPath);
      for (const file of files) {
        if (file.endsWith('.db')) {
          unlinkSync(join(testDbPath, file));
        }
      }
    }
  });

  describe('Database Management', () => {
    test('should create a new database', async () => {
      const result = await sqliteManager.createDatabase('test_db');
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('created successfully');
      expect(result.data).toHaveProperty('name', 'test_db');
      expect(result.data).toHaveProperty('path');
    });

    test('should not create duplicate database', async () => {
      await sqliteManager.createDatabase('test_db');
      const result = await sqliteManager.createDatabase('test_db');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('already exists');
    });

    test('should list databases', async () => {
      await sqliteManager.createDatabase('test_db1');
      await sqliteManager.createDatabase('test_db2');
      
      const result = await sqliteManager.listDatabases();
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toHaveProperty('name');
      expect(result.data[0]).toHaveProperty('type', 'sqlite');
    });

    test('should drop database', async () => {
      await sqliteManager.createDatabase('test_db');
      
      const result = await sqliteManager.dropDatabase('test_db');
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('dropped successfully');
    });

    test('should not drop non-existent database', async () => {
      const result = await sqliteManager.dropDatabase('non_existent');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('does not exist');
    });
  });

  describe('Table Management', () => {
    beforeEach(async () => {
      await sqliteManager.createDatabase('test_db');
    });

    test('should create table', async () => {
      const schema = {
        columns: [
          { name: 'id', type: 'INTEGER', constraints: ['PRIMARY KEY'] },
          { name: 'name', type: 'TEXT', constraints: ['NOT NULL'] },
          { name: 'email', type: 'TEXT' }
        ]
      };

      const result = await sqliteManager.createTable('test_db', 'users', schema);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('created successfully');
    });

    test('should list tables', async () => {
      const schema = {
        columns: [
          { name: 'id', type: 'INTEGER', constraints: ['PRIMARY KEY'] },
          { name: 'name', type: 'TEXT' }
        ]
      };
      
      await sqliteManager.createTable('test_db', 'users', schema);
      
      const result = await sqliteManager.listTables('test_db');
      
      expect(result.success).toBe(true);
      expect(result.data).toContain('users');
    });

    test('should describe table', async () => {
      const schema = {
        columns: [
          { name: 'id', type: 'INTEGER', constraints: ['PRIMARY KEY'] },
          { name: 'name', type: 'TEXT', constraints: ['NOT NULL'] },
          { name: 'email', type: 'TEXT' }
        ]
      };
      
      await sqliteManager.createTable('test_db', 'users', schema);
      
      const result = await sqliteManager.describeTable('test_db', 'users');
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('name', 'users');
      expect(result.data).toHaveProperty('columns');
      expect(result.data.columns).toHaveLength(3);
    });

    test('should drop table', async () => {
      const schema = {
        columns: [
          { name: 'id', type: 'INTEGER', constraints: ['PRIMARY KEY'] },
          { name: 'name', type: 'TEXT' }
        ]
      };
      
      await sqliteManager.createTable('test_db', 'users', schema);
      
      const result = await sqliteManager.dropTable('test_db', 'users');
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('dropped successfully');
    });
  });

  describe('CRUD Operations', () => {
    beforeEach(async () => {
      await sqliteManager.createDatabase('test_db');
      const schema = {
        columns: [
          { name: 'id', type: 'INTEGER', constraints: ['PRIMARY KEY'] },
          { name: 'name', type: 'TEXT', constraints: ['NOT NULL'] },
          { name: 'email', type: 'TEXT' },
          { name: 'age', type: 'INTEGER' }
        ]
      };
      await sqliteManager.createTable('test_db', 'users', schema);
    });

    test('should insert data', async () => {
      const records = [
        { id: 1, name: 'John Doe', email: 'john@example.com', age: 30 },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25 }
      ];

      const result = await sqliteManager.insertData('test_db', 'users', records);
      
      expect(result.success).toBe(true);
      expect(result.data.insertedCount).toBe(2);
    });

    test('should query data', async () => {
      const records = [
        { id: 1, name: 'John Doe', email: 'john@example.com', age: 30 },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25 }
      ];
      
      await sqliteManager.insertData('test_db', 'users', records);
      
      const result = await sqliteManager.queryData('test_db', 'users');
      
      expect(result.success).toBe(true);
      expect(result.data.rows).toHaveLength(2);
      expect(result.data.columns).toContain('id');
      expect(result.data.columns).toContain('name');
    });

    test('should query data with conditions', async () => {
      const records = [
        { id: 1, name: 'John Doe', email: 'john@example.com', age: 30 },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25 }
      ];
      
      await sqliteManager.insertData('test_db', 'users', records);
      
      const result = await sqliteManager.queryData('test_db', 'users', { age: 30 });
      
      expect(result.success).toBe(true);
      expect(result.data.rows).toHaveLength(1);
      expect(result.data.rows[0].name).toBe('John Doe');
    });

    test('should update data', async () => {
      const records = [
        { id: 1, name: 'John Doe', email: 'john@example.com', age: 30 }
      ];
      
      await sqliteManager.insertData('test_db', 'users', records);
      
      const result = await sqliteManager.updateData(
        'test_db', 
        'users', 
        { id: 1 }, 
        { age: 31, email: 'john.doe@example.com' }
      );
      
      expect(result.success).toBe(true);
      expect(result.data.changes).toBe(1);
    });

    test('should delete data', async () => {
      const records = [
        { id: 1, name: 'John Doe', email: 'john@example.com', age: 30 },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25 }
      ];
      
      await sqliteManager.insertData('test_db', 'users', records);
      
      const result = await sqliteManager.deleteData('test_db', 'users', { age: 30 });
      
      expect(result.success).toBe(true);
      expect(result.data.changes).toBe(1);
    });

    test('should count records', async () => {
      const records = [
        { id: 1, name: 'John Doe', email: 'john@example.com', age: 30 },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25 }
      ];
      
      await sqliteManager.insertData('test_db', 'users', records);
      
      const result = await sqliteManager.countRecords('test_db', 'users');
      
      expect(result.success).toBe(true);
      expect(result.data.count).toBe(2);
    });

    test('should count records with conditions', async () => {
      const records = [
        { id: 1, name: 'John Doe', email: 'john@example.com', age: 30 },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25 }
      ];
      
      await sqliteManager.insertData('test_db', 'users', records);
      
      const result = await sqliteManager.countRecords('test_db', 'users', { age: 30 });
      
      expect(result.success).toBe(true);
      expect(result.data.count).toBe(1);
    });
  });

  describe('SQL Execution', () => {
    beforeEach(async () => {
      await sqliteManager.createDatabase('test_db');
      const schema = {
        columns: [
          { name: 'id', type: 'INTEGER', constraints: ['PRIMARY KEY'] },
          { name: 'name', type: 'TEXT' }
        ]
      };
      await sqliteManager.createTable('test_db', 'users', schema);
    });

    test('should execute SELECT query', async () => {
      const records = [
        { id: 1, name: 'John Doe' },
        { id: 2, name: 'Jane Smith' }
      ];
      
      await sqliteManager.insertData('test_db', 'users', records);
      
      const result = await sqliteManager.executeSql('test_db', 'SELECT * FROM users WHERE id = ?', [1]);
      
      expect(result.success).toBe(true);
      expect(result.data.rows).toHaveLength(1);
      expect(result.data.rows[0].name).toBe('John Doe');
    });

    test('should execute INSERT query', async () => {
      const result = await sqliteManager.executeSql(
        'test_db', 
        'INSERT INTO users (id, name) VALUES (?, ?)', 
        [1, 'John Doe']
      );
      
      expect(result.success).toBe(true);
      expect(result.data.changes).toBe(1);
    });
  });

  describe('Backup and Restore', () => {
    test('should backup database', async () => {
      await sqliteManager.createDatabase('test_db');
      
      const result = await sqliteManager.backupDatabase('test_db', './test_backup.db');
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('backed up successfully');
      expect(existsSync('./test_backup.db')).toBe(true);
      
      // Clean up
      if (existsSync('./test_backup.db')) {
        unlinkSync('./test_backup.db');
      }
    });

    test('should restore database', async () => {
      await sqliteManager.createDatabase('test_db');
      await sqliteManager.backupDatabase('test_db', './test_backup.db');
      
      const result = await sqliteManager.restoreDatabase('./test_backup.db', 'restored_db');
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('restored successfully');
      
      // Clean up
      if (existsSync('./test_backup.db')) {
        unlinkSync('./test_backup.db');
      }
    });
  });
});