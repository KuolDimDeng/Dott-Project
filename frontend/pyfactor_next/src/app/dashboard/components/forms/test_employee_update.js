// Test script for employee update functionality
const testEmployeeUpdate = async () => {
  console.log('🧪 Testing Employee Update Functionality...');
  
  // Mock employee data
  const mockEmployee = {
    id: 'test-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    status: 'active'
  };
  
  // Test data for update
  const updateData = {
    first_name: 'John',
    last_name: 'Doe Updated',
    email: 'john.doe@example.com',
    status: 'inactive',
    active: false,
    department: 'Engineering',
    job_title: 'Senior Developer'
  };
  
  try {
    // Simulate API call
    console.log('📡 Sending update request...');
    console.log('Update data:', JSON.stringify(updateData, null, 2));
    
    const response = await fetch(`/api/hr/v2/employees/${mockEmployee.id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    });
    
    console.log('📡 Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Update successful:', result);
    } else {
      const error = await response.text();
      console.error('❌ Update failed:', error);
    }
  } catch (error) {
    console.error('❌ Test error:', error);
  }
};

// Export for testing
export default testEmployeeUpdate;