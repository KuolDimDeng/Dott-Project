// Test script to debug admin login issue
// Run this in the browser console on the admin page

async function testAdminLogin() {
    console.log('🔍 Testing Admin Login Endpoints...');
    
    const testData = {
        username: 'test',
        password: 'test'
    };
    
    console.log('1. Testing /api/admin/login (old endpoint):');
    try {
        const response1 = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData),
        });
        console.log('   Status:', response1.status);
        console.log('   Content-Type:', response1.headers.get('content-type'));
        const text1 = await response1.text();
        console.log('   Response:', text1.substring(0, 200));
    } catch (error) {
        console.error('   Error:', error.message);
    }
    
    console.log('2. Testing /api/notifications/admin/login/ (correct endpoint):');
    try {
        const response2 = await fetch('/api/notifications/admin/login/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData),
        });
        console.log('   Status:', response2.status);
        console.log('   Content-Type:', response2.headers.get('content-type'));
        const text2 = await response2.text();
        console.log('   Response:', text2.substring(0, 200));
    } catch (error) {
        console.error('   Error:', error.message);
    }
}

// Run the test
testAdminLogin();