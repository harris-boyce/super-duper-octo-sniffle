import type { VercelRequest, VercelResponse } from '@vercel/node';

// Rate limiting store (in-memory for now)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limit configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute per IP

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  rateLimitStore.forEach((value, key) => {
    if (now > value.resetTime) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach((key) => rateLimitStore.delete(key));
}, RATE_LIMIT_WINDOW_MS);

/**
 * Rate limiter middleware
 */
function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetTime) {
    // Create new record or reset expired one
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Serverless function handler for Claude API proxy
 * Provides secure API access with rate limiting
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Rate limiting based on IP address
  const identifier = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
  
  if (!checkRateLimit(identifier)) {
    res.status(429).json({ 
      error: 'Rate limit exceeded',
      message: `Maximum ${RATE_LIMIT_MAX_REQUESTS} requests per minute allowed`
    });
    return;
  }

  // Validate API key exists in environment
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not configured');
    res.status(500).json({ error: 'API key not configured' });
    return;
  }

  // Validate request body
  const { gameContext } = req.body;
  if (!gameContext || typeof gameContext !== 'string') {
    res.status(400).json({ error: 'Invalid request: gameContext is required' });
    return;
  }

  // Validate context length (prevent abuse)
  if (gameContext.length > 500) {
    res.status(400).json({ error: 'gameContext too long (max 500 characters)' });
    return;
  }

  try {
    const apiUrl = process.env.ANTHROPIC_API_URL || 'https://api.anthropic.com/v1/messages';
    
    // Make request to Claude API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 150,
        messages: [
          {
            role: 'user',
            content: `You are an energetic 8-bit stadium announcer. Give exciting commentary for: ${gameContext}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Claude API error:', response.status, errorData);
      res.status(response.status).json({ 
        error: 'Failed to fetch commentary',
        details: errorData
      });
      return;
    }

    const data = await response.json();
    
    // Extract and return the commentary text
    const commentary = data.content?.[0]?.text || 'The crowd goes wild!';
    res.status(200).json({ commentary });

  } catch (error) {
    console.error('Announcer API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
