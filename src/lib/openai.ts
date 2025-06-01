
import { supabase } from '@/integrations/supabase/client';

export interface ObjectionSuggestion {
  approach: string;
  text: string;
  effectiveness: number;
  reasoning: string;
}

export async function generateObjectionSuggestions(objection: string): Promise<ObjectionSuggestion[]> {
  try {
    console.log("objection", objection);

    const { data, error } = await supabase.functions.invoke('generate-objection-suggestions', {
      body: { objection }
    });

    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(`Failed to generate suggestions: ${error.message}`);
    }

    if (!data || !data.suggestions) {
      throw new Error('Invalid response from AI service');
    }

    return data.suggestions;
  } catch (error) {
    console.error('Error generating objection suggestions:', error);
    throw new Error('Failed to generate AI suggestions. Please check your connection and try again.');
  }
}

export function isOpenAIConfigured(): boolean {
  // Since we're using Supabase edge functions, we'll assume it's configured
  // The edge function will handle the actual API key validation
  return true;
}
