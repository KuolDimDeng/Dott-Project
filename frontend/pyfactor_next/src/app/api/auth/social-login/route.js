export async function POST(req) {
    try {
      const body = await req.json();
      console.log("Social login request received:", body);
  
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/social-login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
  
      console.log("Social login response status:", response.status);
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Social login error:", errorData);
        return NextResponse.json({ error: errorData.error || 'Failed to create or update user' }, { status: response.status });
      }
  
      const data = await response.json();
      console.log("Social login successful:", data);
  
      return NextResponse.json(data);
    } catch (error) {
      console.error("Error during social login:", error);
      return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
  }