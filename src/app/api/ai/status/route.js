/**
 * OpenAI API Status Check Endpoint
 * Checks if OpenAI is properly configured and accessible
 */

import OpenAI from 'openai';

function addCorsHeaders(response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  return addCorsHeaders(new Response(null, { status: 200 }));
}

export async function GET() {
  try {
    const startTime = Date.now();

    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return addCorsHeaders(Response.json({
        status: 'error',
        configured: false,
        available: false,
        message: 'OpenAI API key not configured',
        details: {
          hasApiKey: false,
          checkedAt: new Date().toISOString()
        }
      }));
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Test API connectivity with a minimal request
    try {
      const testResponse = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a test assistant. Respond with exactly: "OK"'
          },
          {
            role: 'user',
            content: 'Test'
          }
        ],
        max_tokens: 5,
        temperature: 0
      });

      const responseTime = Date.now() - startTime;
      const responseContent = testResponse.choices[0]?.message?.content?.trim();

      return addCorsHeaders(Response.json({
        status: 'success',
        configured: true,
        available: true,
        message: 'OpenAI API is available and working',
        details: {
          hasApiKey: true,
          responseTime: responseTime,
          model: testResponse.model,
          usage: testResponse.usage,
          testResponse: responseContent === 'OK' ? 'passed' : 'unexpected',
          checkedAt: new Date().toISOString()
        }
      }));

    } catch (apiError) {
      console.error('OpenAI API Test Error:', apiError);

      let errorType = 'unknown';
      let errorMessage = apiError.message;

      // Categorize different types of API errors
      if (apiError.code === 'invalid_api_key') {
        errorType = 'authentication';
        errorMessage = 'Invalid API key';
      } else if (apiError.code === 'insufficient_quota') {
        errorType = 'quota';
        errorMessage = 'API quota exceeded';
      } else if (apiError.code === 'rate_limit_exceeded') {
        errorType = 'rate_limit';
        errorMessage = 'Rate limit exceeded';
      } else if (apiError.status >= 500) {
        errorType = 'server_error';
        errorMessage = 'OpenAI server error';
      } else if (apiError.status >= 400) {
        errorType = 'client_error';
        errorMessage = 'Client error: ' + errorMessage;
      }

      return addCorsHeaders(Response.json({
        status: 'error',
        configured: true,
        available: false,
        message: 'OpenAI API is configured but not accessible',
        details: {
          hasApiKey: true,
          errorType: errorType,
          errorMessage: errorMessage,
          errorCode: apiError.code,
          httpStatus: apiError.status,
          responseTime: Date.now() - startTime,
          checkedAt: new Date().toISOString()
        }
      }));
    }

  } catch (error) {
    console.error('OpenAI Status Check Error:', error);

    return addCorsHeaders(Response.json({
      status: 'error',
      configured: false,
      available: false,
      message: 'Failed to check OpenAI status',
      details: {
        hasApiKey: !!process.env.OPENAI_API_KEY,
        error: error.message,
        checkedAt: new Date().toISOString()
      }
    }, { status: 500 }));
  }
}