const { getConnection } = require('./db/connection');

async function seedData() {
  try {
    const pool = await getConnection();
    
    console.log('Seeding database with initial data...');
    
    // Check if data already exists
    const existingDepts = await pool.request().query('SELECT COUNT(*) as count FROM Departments');
    if (existingDepts.recordset[0].count > 0) {
      console.log('Data already exists, skipping seed...');
      return;
    }
    
    // Insert departments
    console.log('Adding departments...');
    await pool.request().query(`
      INSERT INTO Departments (name) VALUES 
      ('Human Resources'),
      ('Information Technology'),
      ('Finance'),
      ('Marketing')
    `);
    
    // Get department IDs
    const depts = await pool.request().query('SELECT * FROM Departments');
    const hrDept = depts.recordset.find(d => d.name === 'Human Resources');
    const itDept = depts.recordset.find(d => d.name === 'Information Technology');
    const financeDept = depts.recordset.find(d => d.name === 'Finance');
    const marketingDept = depts.recordset.find(d => d.name === 'Marketing');
    
    // Insert sections
    console.log('Adding sections...');
    await pool.request().query(`
      INSERT INTO Sections (name, dept_id) VALUES 
      ('Recruitment', ${hrDept.dept_id}),
      ('Employee Relations', ${hrDept.dept_id}),
      ('Software Development', ${itDept.dept_id}),
      ('IT Support', ${itDept.dept_id}),
      ('Network Administration', ${itDept.dept_id}),
      ('Accounts Payable', ${financeDept.dept_id}),
      ('Budgeting & Planning', ${financeDept.dept_id}),
      ('Audit', ${financeDept.dept_id}),
      ('Digital Marketing', ${marketingDept.dept_id}),
      ('Content Creation', ${marketingDept.dept_id})
    `);
    
    // Insert roles
    console.log('Adding roles...');
    await pool.request().query(`
      INSERT INTO Roles (name) VALUES 
      ('Employee'),
      ('Team Lead'),
      ('Manager'),
      ('Senior Employee'),
      ('Junior Employee')
    `);
    
    // Insert designations
    console.log('Adding designations...');
    await pool.request().query(`
      INSERT INTO Designations (title) VALUES 
      ('Software Engineer'),
      ('Senior Software Engineer'),
      ('Full Stack Developer'),
      ('Backend Developer'),
      ('Frontend Developer'),
      ('DevOps Engineer'),
      ('System Administrator'),
      ('Network Engineer'),
      ('HR Manager'),
      ('Recruitment Specialist'),
      ('HR Coordinator'),
      ('Finance Manager'),
      ('Accountant'),
      ('Financial Analyst'),
      ('Auditor'),
      ('Marketing Manager'),
      ('Digital Marketing Specialist'),
      ('Content Writer'),
      ('Social Media Manager'),
      ('SEO Specialist')
    `);
    
    console.log('Database seeded successfully!');
    
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    process.exit();
  }
}

seedData();
