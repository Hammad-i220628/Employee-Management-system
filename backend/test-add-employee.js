const { getConnection } = require('./db/connection');
const { addEmployee } = require('./controllers/employeeController');

// Mock request and response objects
function createMockResponse() {
  let statusCode = 200;
  let responseData = null;
  
  return {
    status: (code) => {
      statusCode = code;
      return {
        json: (data) => {
          responseData = data;
          console.log(`Response Status: ${statusCode}`);
          console.log('Response Data:', JSON.stringify(responseData, null, 2));
          return { statusCode, data: responseData };
        }
      };
    },
    json: (data) => {
      responseData = data;
      console.log(`Response Status: ${statusCode}`);
      console.log('Response Data:', JSON.stringify(responseData, null, 2));
      return { statusCode, data: responseData };
    }
  };
}

async function testAddEmployee() {
  try {
    console.log('🧪 Testing employee creation API...\n');
    
    // Test 1: Create a new employee with unique data
    console.log('Test 1: Creating new employee with unique data');
    console.log('=====================================');
    
    const req1 = {
      body: {
        name: 'John Doe',
        cnic: '12345-6789012-3',
        start_date: '2025-01-01',
        email: 'john.doe@company.com',
        section_id: 1,
        desig_id: 1,
        type: 'editable',
        salary: 60000,
        bonus: 5000
      }
    };
    
    const res1 = createMockResponse();
    await addEmployee(req1, res1);
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 2: Try to create employee with same data (should fail)
    console.log('Test 2: Attempting to create duplicate employee');
    console.log('===============================================');
    
    const req2 = {
      body: {
        name: 'John Doe Duplicate',
        cnic: '12345-6789012-3', // Same CNIC
        start_date: '2025-01-02',
        email: 'john.doe.duplicate@company.com',
        section_id: 1,
        desig_id: 1,
        type: 'editable',
        salary: 60000,
        bonus: 5000
      }
    };
    
    const res2 = createMockResponse();
    await addEmployee(req2, res2);
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 3: Try to create employee with same email (should fail)
    console.log('Test 3: Attempting to create employee with duplicate email');
    console.log('========================================================');
    
    const req3 = {
      body: {
        name: 'Jane Smith',
        cnic: '99999-8888888-7',
        start_date: '2025-01-03',
        email: 'john.doe@company.com', // Same email as first employee
        section_id: 1,
        desig_id: 1,
        type: 'editable',
        salary: 55000,
        bonus: 3000
      }
    };
    
    const res3 = createMockResponse();
    await addEmployee(req3, res3);
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 4: Create another unique employee (should succeed)
    console.log('Test 4: Creating another unique employee');
    console.log('=====================================');
    
    const req4 = {
      body: {
        name: 'Jane Smith',
        cnic: '99999-8888888-7',
        start_date: '2025-01-03',
        email: 'jane.smith@company.com', // Unique email
        section_id: 2,
        desig_id: 2,
        type: 'editable',
        salary: 55000,
        bonus: 3000
      }
    };
    
    const res4 = createMockResponse();
    await addEmployee(req4, res4);
    
    console.log('\n🏁 All tests completed!');
    
    // Show final employee count
    const pool = await getConnection();
    const result = await pool.request().query('SELECT COUNT(*) as total FROM TblEmpS');
    console.log(`\n📊 Total employees in database: ${result.recordset[0].total}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testAddEmployee();
