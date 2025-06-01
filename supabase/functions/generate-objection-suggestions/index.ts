
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ObjectionSuggestion {
  approach: string;
  text: string;
  effectiveness: number;
  reasoning: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { objection } = await req.json();

    if (!objection || typeof objection !== 'string') {
      throw new Error('Invalid objection provided');
    }

    console.log("Processing objection:", objection);

    const prompt = `You are an expert sales coach specializing in objection handling. A customer has raised the following objection:

"${objection}"

Please provide 3 different response strategies. For each strategy, provide:
1. A clear approach name (e.g., "Empathy + Value Reframe", "Question + Social Proof", etc.)
2. The exact response text (as if speaking directly to the customer)
3. An effectiveness score (70-95)
4. A brief explanation of why this approach works

Format your response as a JSON array with objects containing: approach, text, effectiveness, reasoning

Make the responses sound natural, empathetic, and professional. Focus on understanding the customer's concern while guiding them toward a positive outcome.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const responseText = data.choices[0]?.message?.content;
    
    console.log("OpenAI response:", responseText);
    
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    const suggestions: ObjectionSuggestion[] = JSON.parse(responseText);
    
    // Validate the response structure
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      throw new Error('Invalid response format from OpenAI');
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-objection-suggestions function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
