/**
 * Groq AI Service for Orbital IDE
 * Provides AI-powered code completion, generation, explanation, and debugging
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Groq models - using llama3 for speed and quality
const MODELS = {
  FAST: 'llama-3.1-8b-instant', // For completions
  SMART: 'llama-3.3-70b-versatile', // For generation and explanations
};

/**
 * Get Groq API key from localStorage or environment
 */
export function getApiKey() {
  return localStorage.getItem('groq_api_key') || '';
}

/**
 * Set Groq API key in localStorage
 */
export function setApiKey(apiKey) {
  localStorage.setItem('groq_api_key', apiKey);
}

/**
 * Check if API key is configured
 */
export function isConfigured() {
  return !!getApiKey();
}

/**
 * Make a request to Groq API
 */
async function groqRequest(messages, model = MODELS.SMART, options = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Groq API key not configured. Add your key in Settings.');
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2000,
      stream: options.stream || false,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Groq API error: ${response.status}`);
  }

  return response.json();
}

/**
 * AI Chat Assistant - Answer questions about Soroban/Rust
 */
export async function chatWithAI(userMessage, conversationHistory = []) {
  const systemPrompt = `You are an expert Soroban smart contract developer assistant. You help developers write, debug, and understand Soroban contracts in Rust.

Key knowledge:
- Soroban SDK for Stellar blockchain
- Rust programming language
- Smart contract best practices
- Common Soroban patterns and idioms

Keep answers concise, practical, and code-focused. Provide code examples when relevant.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  const result = await groqRequest(messages, MODELS.SMART);
  return result.choices[0].message.content;
}

/**
 * Generate smart contract code from description
 */
export async function generateContract(description, difficulty = 'intermediate') {
  const systemPrompt = `You are an expert Soroban smart contract code generator. Generate complete, production-ready Soroban smart contracts in Rust based on user requirements.

Requirements:
- Use Soroban SDK 21.0.0 conventions
- Include proper error handling
- Add comprehensive comments
- Follow Rust best practices
- Include storage, events, and proper types
- Make code secure and efficient

Difficulty level: ${difficulty}

Output ONLY the Rust code, no explanations before or after.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Generate a Soroban smart contract for: ${description}` },
  ];

  const result = await groqRequest(messages, MODELS.SMART, { temperature: 0.3 });
  return result.choices[0].message.content;
}

/**
 * Explain code - what does this code do?
 */
export async function explainCode(code, focusArea = null) {
  const focusText = focusArea ? `\n\nFocus on explaining: ${focusArea}` : '';
  
  const systemPrompt = `You are an expert code explainer for Soroban smart contracts. Explain code clearly and concisely, focusing on:
- What the code does
- Key Soroban patterns used
- Potential issues or improvements
- How it interacts with the blockchain

Keep explanations practical and beginner-friendly.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Explain this Soroban contract code:${focusText}\n\n\`\`\`rust\n${code}\n\`\`\`` },
  ];

  const result = await groqRequest(messages, MODELS.SMART);
  return result.choices[0].message.content;
}

/**
 * Inline code completion - suggest next lines
 */
export async function completeCode(codeBefore, codeAfter = '') {
  const systemPrompt = `You are an expert Soroban code completion assistant. Given code context, suggest the next 1-3 lines of code that would logically follow.

Rules:
- Output ONLY the code to insert, no explanations
- Match the existing code style and indentation
- Be concise - suggest only what's immediately needed
- Follow Soroban SDK patterns
- Don't repeat code that's already there`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Complete this Soroban code:\n\n\`\`\`rust\n${codeBefore}[CURSOR]${codeAfter}\n\`\`\`\n\nSuggest code for [CURSOR] position:` },
  ];

  const result = await groqRequest(messages, MODELS.FAST, { 
    temperature: 0.2,
    maxTokens: 200,
  });
  
  return result.choices[0].message.content.trim();
}

/**
 * Debug and fix code issues
 */
export async function debugCode(code, errorMessage = null) {
  const errorText = errorMessage ? `\n\nError message: ${errorMessage}` : '';
  
  const systemPrompt = `You are an expert Soroban smart contract debugger. Analyze code for issues and suggest fixes.

Focus on:
- Syntax errors
- Type mismatches
- Soroban SDK misuse
- Security vulnerabilities
- Logic errors
- Performance issues

Provide:
1. What's wrong
2. Why it's wrong
3. How to fix it (with corrected code if needed)`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Debug this Soroban contract:${errorText}\n\n\`\`\`rust\n${code}\n\`\`\`` },
  ];

  const result = await groqRequest(messages, MODELS.SMART);
  return result.choices[0].message.content;
}

/**
 * Improve code - suggest refactoring and optimizations
 */
export async function improveCode(code, focusArea = 'general') {
  const focusMap = {
    general: 'overall code quality and best practices',
    performance: 'performance and gas optimization',
    security: 'security vulnerabilities and safe patterns',
    readability: 'code clarity and maintainability',
  };

  const systemPrompt = `You are an expert Soroban code reviewer. Analyze the code and suggest improvements focusing on ${focusMap[focusArea] || focusMap.general}.

Provide:
1. What could be improved
2. Why it matters
3. Suggested changes (with code examples)`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Review and improve this Soroban contract:\n\n\`\`\`rust\n${code}\n\`\`\`` },
  ];

  const result = await groqRequest(messages, MODELS.SMART);
  return result.choices[0].message.content;
}

/**
 * Stream chat response (for real-time updates)
 */
export async function* streamChatResponse(userMessage, conversationHistory = []) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Groq API key not configured');
  }

  const systemPrompt = `You are an expert Soroban smart contract developer assistant. You help developers write, debug, and understand Soroban contracts in Rust.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODELS.SMART,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(line => line.trim() !== '');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices[0]?.delta?.content;
          if (content) {
            yield content;
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }
}

export default {
  getApiKey,
  setApiKey,
  isConfigured,
  chatWithAI,
  generateContract,
  explainCode,
  completeCode,
  debugCode,
  improveCode,
  streamChatResponse,
};
