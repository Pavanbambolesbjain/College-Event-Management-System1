// API Verification Script - CampusConnect
const http = require('http');

const PORT = 5000;
const BASE_URL = `http://localhost:${PORT}`;

// Helper to make HTTP Requests
function makeRequest(path, method = 'GET', body = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (cookie) {
      headers['Cookie'] = cookie;
    }

    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: headers
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('==================================================');
  console.log(' STARTING API VERIFICATION FOR CAMPUSCONNECT');
  console.log('==================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passedCount++;
    } else {
      console.log(`[FAIL] ${message}`);
      failedCount++;
    }
  }

  try {
    // Test 1: Get Public Events
    console.log('Test 1: Fetching public events list...');
    const eventsRes = await makeRequest('/api/events');
    assert(eventsRes.status === 200, 'Events API returns status 200');
    assert(eventsRes.body.success === true, 'Events API returns success:true');
    assert(Array.isArray(eventsRes.body.data), 'Events API data contains an array');
    assert(eventsRes.body.data.length >= 8, 'Events database contains at least 8 events');

    // Test 2: Invalid Student Login
    console.log('\nTest 2: Submitting invalid student login...');
    const badLoginRes = await makeRequest('/api/auth/student/login', 'POST', {
      email: 'nonexistent@college.edu',
      password: 'wrongpassword'
    });
    assert(badLoginRes.status === 401, 'Invalid login returns status 401');
    assert(badLoginRes.body.success === false, 'Invalid login success is false');

    // Test 3: Admin Login
    console.log('\nTest 3: Log in as Admin...');
    const adminLoginRes = await makeRequest('/api/auth/admin/login', 'POST', {
      email: 'admin@campusconnect.com',
      password: 'admin123'
    });
    assert(adminLoginRes.status === 200, 'Admin login returns status 200');
    assert(adminLoginRes.body.success === true, 'Admin login success is true');
    assert(adminLoginRes.body.user.role === 'admin', 'Returned role is admin');

    const adminCookie = adminLoginRes.headers['set-cookie'] 
      ? adminLoginRes.headers['set-cookie'][0].split(';')[0] 
      : null;
    assert(adminCookie !== null, 'Received auth token cookie');

    // Test 4: Fetch Admin Dashboard Stats
    console.log('\nTest 4: Access Admin Dashboard Stats...');
    const adminDashRes = await makeRequest('/api/dashboard/admin', 'GET', null, adminCookie);
    assert(adminDashRes.status === 200, 'Admin dashboard returns status 200');
    assert(adminDashRes.body.data.stats.totalStudents === 5, 'Stats show exactly 5 students');
    assert(adminDashRes.body.data.stats.totalRegistrations === 10, 'Stats show exactly 10 registrations');

    // Test 5: Verify capacity and duplicate prevention as a Student
    console.log('\nTest 5: Log in as Aarav Patel (Student)...');
    const studentLoginRes = await makeRequest('/api/auth/student/login', 'POST', {
      email: 'aarav.patel@college.edu',
      password: 'password123'
    });
    assert(studentLoginRes.status === 200, 'Student login returns status 200');
    
    const studentCookie = studentLoginRes.headers['set-cookie']
      ? studentLoginRes.headers['set-cookie'][0].split(';')[0]
      : null;

    console.log('Attempting duplicate event registration...');
    const dupRegRes = await makeRequest('/api/registrations', 'POST', {
      eventId: 'EVT001' // Aarav Patel is already registered for EVT001
    }, studentCookie);
    assert(dupRegRes.status === 400, 'Duplicate registration returns status 400');
    assert(dupRegRes.body.message.includes('already registered'), 'Message correctly flags duplicate registration');

    console.log('\n==================================================');
    console.log(` VERIFICATION COMPLETE: Passed ${passedCount}, Failed ${failedCount}`);
    console.log('==================================================');
    
    process.exit(failedCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('Test Execution Error:', error);
    process.exit(1);
  }
}

runTests();
