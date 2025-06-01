
import OpenAI from 'openai';

// Only initialize OpenAI if API key is available
const getOpenAIClient = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured. Please add VITE_OPENAI_API_KEY to your environment variables.');
  }
  
  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true // Note: In production, API calls should go through your backend
  });
};

export interface ObjectionSuggestion {
  approach: string;
  text: string;
  effectiveness: number;
  reasoning: string;
}

export async function generateObjectionSuggestions(objection: string): Promise<ObjectionSuggestion[]> {
  try {
    console.log("objection", objection);
    
    // Initialize OpenAI client only when needed
    const openai = getOpenAIClient();
    
    const prompt = `You are an expert sales coach specializing in objection handling. A customer has raised the following objection:

"${objection}"

Please provide 3 different response strategies. For each strategy, provide:
1. A clear approach name (e.g., "Empathy + Value Reframe", "Question + Social Proof", etc.)
2. The exact response text (as if speaking directly to the customer)
3. An effectiveness score (70-95)
4. A brief explanation of why this approach works

Format your response as a JSON array with objects containing: approach, text, effectiveness, reasoning

Make the responses sound natural, empathetic, and professional. Focus on understanding the customer's concern while guiding them toward a positive outcome.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert sales coach. Provide practical, empathetic objection handling strategies in valid JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });

    const responseText = completion.choices[0]?.message?.content;
    console.log("response text", responseText);
    
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    const suggestions: ObjectionSuggestion[] = JSON.parse(responseText);
    
    // Validate the response structure
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      throw new Error('Invalid response format from OpenAI');
    }

    return suggestions;
  } catch (error) {
    console.error('Error generating objection suggestions:', error);
    
    // Re-throw the error so the component can handle it appropriately
    throw new Error('Failed to generate AI suggestions. Please check your OpenAI API key and try again.');
  }
}

// Export a function to check if OpenAI is configured
export const isOpenAIConfigured = () => {
  return !!import.meta.env.VITE_OPENAI_API_KEY;
};
