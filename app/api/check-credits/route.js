import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.API;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'N1N API key not configured' },
        { status: 500 }
      );
    }

    // Try to get account/billing info from n1n API
    // First, try the billing/usage endpoint
    let response = await fetch('https://api.n1n.ai/v1/dashboard/billing/usage', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('N1N Billing Data:', data);
      
      // Extract useful information
      const formattedData = {
        status: 'active',
        totalUsage: data.total_usage || 0,
        // Add more fields as they appear in the response
        ...data
      };
      
      return NextResponse.json(formattedData);
    }

    // If billing endpoint doesn't work, try subscription endpoint
    response = await fetch('https://api.n1n.ai/v1/dashboard/billing/subscription', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('N1N Subscription Data:', data);
      return NextResponse.json({
        status: 'active',
        ...data
      });
    }

    // If both fail, try a simple test call to verify API key
    const testResponse = await fetch('https://api.n1n.ai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
    });

    if (testResponse.ok) {
      return NextResponse.json({ 
        status: 'active',
        message: 'API key is valid. Visit https://n1n.ai/dashboard for detailed credit information.',
        note: 'Credit balance not available via API'
      });
    } else {
      const errorData = await testResponse.json();
      console.error('N1N API Error:', errorData);
      return NextResponse.json(
        { error: 'API key may be invalid or expired', details: errorData },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error checking credits:', error);
    return NextResponse.json(
      { 
        error: 'Could not check credits',
        message: 'Please visit https://n1n.ai/dashboard to check your credits manually'
      },
      { status: 500 }
    );
  }
}
