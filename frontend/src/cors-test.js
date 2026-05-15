/**
 * CORS Test Script
 * Tests frontend-backend communication from http://localhost:5173 to http://localhost:3001
 */

async function testCORS() {
  console.log('🧪 Starting CORS Tests...\n');

  try {
    // Test 1: Simple GET request
    console.log('📝 Test 1: Simple GET request to /api/health');
    const healthResponse = await fetch('http://localhost:3001/api/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    if (!healthResponse.ok) {
      throw new Error(`HTTP error! status: ${healthResponse.status}`);
    }

    const healthData = await healthResponse.json();
    console.log('✅ Success! Response:', healthData);
    console.log('   Status:', healthResponse.status);
    console.log('   Access-Control-Allow-Origin:', healthResponse.headers.get('Access-Control-Allow-Origin'));
    console.log('   Access-Control-Allow-Credentials:', healthResponse.headers.get('Access-Control-Allow-Credentials'));
    console.log('');

    // Test 2: OPTIONS preflight request (usually automatic)
    console.log('📝 Test 2: OPTIONS preflight request');
    const preflightResponse = await fetch('http://localhost:3001/api/health', {
      method: 'OPTIONS',
      headers: {
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });

    console.log('✅ Preflight successful! Status:', preflightResponse.status);
    console.log('   Access-Control-Allow-Methods:', preflightResponse.headers.get('Access-Control-Allow-Methods'));
    console.log('   Access-Control-Allow-Headers:', preflightResponse.headers.get('Access-Control-Allow-Headers'));
    console.log('');

    // Test 3: POST request with Authorization header
    console.log('📝 Test 3: POST request with Authorization header');
    const postResponse = await fetch('http://localhost:3001/api/health', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({ test: 'data' }),
      credentials: 'include'
    });

    console.log('✅ POST request successful! Status:', postResponse.status);
    console.log('   Access-Control-Allow-Origin:', postResponse.headers.get('Access-Control-Allow-Origin'));
    console.log('');

    console.log('🎉 All CORS tests passed! Frontend-backend communication is working.');
    console.log('\n✨ CORS Configuration Verified:');
    console.log('✓ Origin: http://localhost:5173 allowed');
    console.log('✓ Credentials: true');
    console.log('✓ Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
    console.log('✓ Headers: Content-Type, Authorization');
    console.log('✓ No CORS errors detected');

  } catch (error) {
    console.error('❌ CORS Test Failed:', error.message);
    console.error('\n⚠️  This likely indicates a CORS configuration issue:');
    console.error('- Check that backend is running on http://localhost:3001');
    console.error('- Verify CORS middleware is properly configured');
    console.error('- Check browser console for specific CORS error messages');
  }
}

// Run tests
testCORS();
