// Script to update user profile attributes
// Run this with: node scripts/update-user-profile.js 

const http = require('http');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to prompt for input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function updateUserProfile() {
  try {
    console.log("User Profile Update Helper");
    console.log("==========================");
    
    // Get user inputs
    const firstName = await prompt("Enter your first name: ");
    const lastName = await prompt("Enter your last name: ");
    const email = await prompt("Enter your email (optional, press Enter to skip): ");
    
    // Create the request payload
    const payload = {
      attributes: {
        given_name: firstName,
        family_name: lastName,
        name: `${firstName} ${lastName}`,
        first_name: firstName,  // Include alternative format
        last_name: lastName,    // Include alternative format
      }
    };
    
    // Only add email if provided
    if (email && email.includes('@')) {
      payload.attributes.email = email;
    }
    
    console.log("\nSending update request with attributes:", payload.attributes);
    
    // Prepare the request options
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/user/update-attributes',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    // Make the request
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.success) {
            console.log("\n✅ Profile updated successfully!");
            console.log("Please refresh your browser to see the changes.");
          } else {
            console.log("\n❌ Update failed:", response.error || response.message || "Unknown error");
          }
        } catch (e) {
          console.log("\n❌ Error parsing response:", e.message);
          console.log("Raw response:", data);
        }
        rl.close();
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
      if (error.code === 'ECONNREFUSED') {
        console.log("Make sure your Next.js application is running on http://localhost:3000");
      }
      rl.close();
    });
    
    // Write data to request body
    req.write(JSON.stringify(payload));
    req.end();
    
  } catch (error) {
    console.error("Error:", error.message);
    rl.close();
  }
}

// Run the function
updateUserProfile(); 