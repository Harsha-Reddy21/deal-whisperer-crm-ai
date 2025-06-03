// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.3.0'

const openAiKey = Deno.env.get('OPENAI_API_KEY')

interface Activity {
  type: string;
  subject: string;
  description: string;
  status: string;
  created_at: string;
}

interface LeadWithActivities {
  id: string;
  name: string;
  email: string;
  company: string;
  activities: Activity[];
}

interface RequestBody {
  lead: LeadWithActivities;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check if OpenAI API key is available
    if (!openAiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Parse request body
    const { lead }: RequestBody = await req.json()

    // Validate request
    if (!lead || !lead.activities || lead.activities.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Lead must include activities for score calculation' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Initialize OpenAI
    const configuration = new Configuration({ apiKey: openAiKey })
    const openai = new OpenAIApi(configuration)

    // Format activities for the prompt
    const formattedActivities = lead.activities.map((activity, index) => {
      const date = new Date(activity.created_at).toLocaleDateString()
      return `${index + 1}. ${activity.type.toUpperCase()} (${date}): ${activity.subject}\n   Status: ${activity.status}\n   ${activity.description ? `Description: ${activity.description}` : ''}`
    }).join('\n\n')

    // Create the prompt for OpenAI
    const prompt = `
You are an expert lead scoring system. Analyze this lead's interaction history and assign a score from 0-100 based on engagement level and conversion potential.

LEAD INFORMATION:
Name: ${lead.name}
Company: ${lead.company}
Email: ${lead.email}

INTERACTION HISTORY:
${formattedActivities}

SCORING CRITERIA:
- Activity frequency (more interactions = higher score)
- Engagement quality (meaningful interactions > superficial ones)
- Recency (recent activities are weighted more heavily)
- Response patterns (how the lead responds to outreach)
- Activity types (meetings > calls > emails)

ANALYSIS INSTRUCTIONS:
1. Examine each interaction for signs of interest or intent
2. Consider the pattern and progression of activities
3. Evaluate how recent the interactions are
4. Assess the lead's responsiveness to outreach
5. Determine if interactions show buying intent

Return only a JSON object with:
- score: A number between 0-100 representing the lead's quality and likelihood to convert
- reasoning: Brief explanation of the score (2-3 sentences)
`

    // Make the API call to OpenAI
    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: prompt,
      max_tokens: 300,
      temperature: 0.3,
    })

    const responseText = response.data.choices[0].text?.trim() || ''
    
    // Parse the JSON response
    let scoreData
    try {
      // Extract the JSON part from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      const jsonString = jsonMatch ? jsonMatch[0] : responseText
      
      scoreData = JSON.parse(jsonString)
    } catch (error) {
      console.error('Error parsing OpenAI response:', error)
      console.log('Response text:', responseText)
      
      // Fallback: Extract score using regex if JSON parsing fails
      const scoreMatch = responseText.match(/score['"]?\s*:\s*(\d+)/)
      const reasoningMatch = responseText.match(/reasoning['"]?\s*:\s*['"]([^'"]*)['"]/s)
      
      if (scoreMatch) {
        scoreData = {
          score: parseInt(scoreMatch[1]),
          reasoning: reasoningMatch ? reasoningMatch[1] : "Score calculated based on activity patterns."
        }
      } else {
        throw new Error('Could not extract score from OpenAI response')
      }
    }

    // Return the score
    return new Response(
      JSON.stringify({
        score: Math.min(100, Math.max(0, Math.round(scoreData.score))), // Ensure score is between 0-100
        reasoning: scoreData.reasoning || "Score calculated based on activity patterns."
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
}) 