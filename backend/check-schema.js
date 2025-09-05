const { getConnection, sql } = require('./db/connection.js');

async function checkSchema() {
  try {
    console.log('🔍 Checking database schema...\n');
    const pool = await getConnection();
    
    // Check table structure
    console.log('📋 TblEmpS table structure:');
    console.log('============================');
    const columns = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'TblEmpS'
      ORDER BY ORDINAL_POSITION
    `);
    
    columns.recordset.forEach(col => {
      console.log(`${col.COLUMN_NAME}: ${col.DATA_TYPE}${col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : ''} | Nullable: ${col.IS_NULLABLE} | Default: ${col.COLUMN_DEFAULT || 'None'}`);
    });
    
    // Check constraints
    console.log('\n🔒 Unique constraints on TblEmpS:');
    console.log('=================================');
    const constraints = await pool.request().query(`
      SELECT 
        tc.CONSTRAINT_NAME,
        tc.CONSTRAINT_TYPE,
        ccu.COLUMN_NAME
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
      JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu 
        ON tc.CONSTRAINT_NAME = ccu.CONSTRAINT_NAME
      WHERE tc.TABLE_NAME = 'TblEmpS' 
        AND tc.CONSTRAINT_TYPE IN ('UNIQUE', 'PRIMARY KEY')
      ORDER BY tc.CONSTRAINT_TYPE, tc.CONSTRAINT_NAME
    `);
    
    constraints.recordset.forEach(constraint => {
      console.log(`${constraint.CONSTRAINT_TYPE}: ${constraint.CONSTRAINT_NAME} on column ${constraint.COLUMN_NAME}`);
    });
    
    // Check indexes
    console.log('\n📊 Indexes on TblEmpS:');
    console.log('=======================');
    const indexes = await pool.request().query(`
      SELECT 
        i.name as INDEX_NAME,
        i.is_unique,
        c.name as COLUMN_NAME,
        i.type_desc
      FROM sys.indexes i
      JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
      JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
      JOIN sys.tables t ON i.object_id = t.object_id
      WHERE t.name = 'TblEmpS'
      ORDER BY i.name, ic.key_ordinal
    `);
    
    indexes.recordset.forEach(idx => {
      console.log(`${idx.INDEX_NAME} (${idx.type_desc}): ${idx.COLUMN_NAME} | Unique: ${idx.is_unique}`);
    });
    
    // Check current data
    console.log('\n📊 Current data in TblEmpS:');
    console.log('============================');
    const data = await pool.request().query('SELECT * FROM TblEmpS');
    
    if (data.recordset.length === 0) {
      console.log('No data found.');
    } else {
      data.recordset.forEach((row, index) => {
        console.log(`Row ${index + 1}:`, JSON.stringify(row, null, 2));
      });
    }
    
    // Check the specific constraint that's failing
    console.log('\n🚨 Constraint UQ__TblEmpS__C16E36F87470F923 details:');
    console.log('===================================================');
    const specificConstraint = await pool.request().query(`
      SELECT 
        tc.CONSTRAINT_NAME,
        tc.CONSTRAINT_TYPE,
        ccu.COLUMN_NAME,
        cc.CHECK_CLAUSE
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
      LEFT JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu 
        ON tc.CONSTRAINT_NAME = ccu.CONSTRAINT_NAME
      LEFT JOIN INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc
        ON tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
      WHERE tc.CONSTRAINT_NAME LIKE '%C16E36F87470F923%'
    `);
    
    if (specificConstraint.recordset.length > 0) {
      specificConstraint.recordset.forEach(constraint => {
        console.log(`Constraint: ${constraint.CONSTRAINT_NAME}`);
        console.log(`Type: ${constraint.CONSTRAINT_TYPE}`);
        console.log(`Column: ${constraint.COLUMN_NAME}`);
        console.log(`Check Clause: ${constraint.CHECK_CLAUSE || 'N/A'}`);
      });
    } else {
      console.log('Could not find details for this constraint.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Schema check failed:', error.message);
    process.exit(1);
  }
}

checkSchema();
