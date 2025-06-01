// Tavily Search API Integration
export interface TavilySearchRequest {
  query: string;
  search_depth?: 'basic' | 'advanced';
  include_answer?: boolean;
  include_raw_content?: boolean;
  max_results?: number;
  include_domains?: string[];
  exclude_domains?: string[];
}

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

export interface TavilySearchResponse {
  answer?: string;
  query: string;
  response_time: number;
  results: TavilySearchResult[];
}

// Get Tavily API configuration
export function getTavilyConfig() {
  const apiKey = import.meta.env.VITE_TAVILY_API_KEY;
  return {
    apiKey,
    baseUrl: 'https://api.tavily.com'
  };
}

// Check if Tavily is configured
export function isTavilyConfigured(): boolean {
  const config = getTavilyConfig();
  return !!config.apiKey && config.apiKey.trim() !== '';
}

// Perform Tavily search
export async function searchWithTavily(request: TavilySearchRequest): Promise<TavilySearchResponse> {
  const config = getTavilyConfig();
  
  if (!config.apiKey) {
    throw new Error('Tavily API key not configured');
  }

  try {
    const response = await fetch(`${config.baseUrl}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        api_key: config.apiKey,
        query: request.query,
        search_depth: request.search_depth || 'basic',
        include_answer: request.include_answer ?? true,
        include_raw_content: request.include_raw_content ?? false,
        max_results: request.max_results || 10,
        include_domains: request.include_domains,
        exclude_domains: request.exclude_domains
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tavily API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Tavily search error:', error);
    throw error;
  }
}

// Search for company information using Tavily
export async function searchCompanyInfo(companyName: string, additionalContext?: string): Promise<string> {
  if (!isTavilyConfigured()) {
    throw new Error('Tavily API not configured');
  }

  try {
    const query = additionalContext 
      ? `${companyName} company information ${additionalContext} headquarters employees revenue industry`
      : `${companyName} company information headquarters employees revenue industry size founded`;

    const searchResult = await searchWithTavily({
      query,
      search_depth: 'advanced',
      include_answer: true,
      include_raw_content: true,
      max_results: 8,
      include_domains: [
        'linkedin.com',
        'crunchbase.com',
        'bloomberg.com',
        'reuters.com',
        'sec.gov',
        'forbes.com',
        'techcrunch.com'
      ]
    });

    // Format the search results for AI processing
    let formattedResults = `Search Results for "${companyName}":\n\n`;
    
    if (searchResult.answer) {
      formattedResults += `AI Summary: ${searchResult.answer}\n\n`;
    }

    formattedResults += `Detailed Sources:\n`;
    searchResult.results.forEach((result, index) => {
      formattedResults += `${index + 1}. ${result.title}\n`;
      formattedResults += `   URL: ${result.url}\n`;
      formattedResults += `   Content: ${result.content.substring(0, 500)}...\n`;
      if (result.published_date) {
        formattedResults += `   Published: ${result.published_date}\n`;
      }
      formattedResults += `   Relevance Score: ${result.score}\n\n`;
    });

    return formattedResults;
  } catch (error) {
    console.error('Error searching company info with Tavily:', error);
    throw error;
  }
}

// Search for companies list using Tavily
export async function searchCompaniesList(query: string): Promise<string> {
  if (!isTavilyConfigured()) {
    throw new Error('Tavily API not configured');
  }

  try {
    const searchResult = await searchWithTavily({
      query: `${query} companies list directory business information`,
      search_depth: 'advanced',
      include_answer: true,
      include_raw_content: true,
      max_results: 10,
      include_domains: [
        'crunchbase.com',
        'linkedin.com',
        'forbes.com',
        'inc.com',
        'techcrunch.com',
        'bloomberg.com',
        'reuters.com'
      ]
    });

    // Format the search results for AI processing
    let formattedResults = `Search Results for "${query}":\n\n`;
    
    if (searchResult.answer) {
      formattedResults += `AI Summary: ${searchResult.answer}\n\n`;
    }

    formattedResults += `Company Information Sources:\n`;
    searchResult.results.forEach((result, index) => {
      formattedResults += `${index + 1}. ${result.title}\n`;
      formattedResults += `   URL: ${result.url}\n`;
      formattedResults += `   Content: ${result.content.substring(0, 600)}...\n`;
      if (result.published_date) {
        formattedResults += `   Published: ${result.published_date}\n`;
      }
      formattedResults += `   Relevance Score: ${result.score}\n\n`;
    });

    return formattedResults;
  } catch (error) {
    console.error('Error searching companies list with Tavily:', error);
    throw error;
  }
} 