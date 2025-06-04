import { useState } from "react";
import { OpenAI } from "openai";
import { supabase } from "@/integrations/supabase/client";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

const tools = [
  {
    type: "function" as const,
    function: {
      name: "summarizeEmails",
      description: "Reads & summarizes recent unread emails, identifies critical ones, and generates replies",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "critical_deal",
      description: "Identifies deals with no activity in the last 7 days, finds the most critical one, and generates a follow-up email",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

// Simulated tool implementations
async function runTool(toolName: string, args: any): Promise<string> {
  if (toolName === "summarizeEmails") {
    const summary = await summarize_unread_message();
    return summary;
  }
  
  if (toolName === "critical_deal") {
    const result = await get_critical_deals();
    return result;
  }
  
  return "Tool executed.";
}

// Helper function to clean JSON strings that might contain markdown formatting
function cleanJsonString(jsonString) {
  // Remove markdown code block markers
  let cleaned = jsonString.replace(/```json\s*/g, '');
  cleaned = cleaned.replace(/```\s*$/g, '');
  cleaned = cleaned.replace(/```/g, '');
  
  // Remove any leading/trailing whitespace
  cleaned = cleaned.trim();
  
  // If the result still doesn't look like JSON, try to extract JSON from the string
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    const jsonMatch = cleaned.match(/({[\s\S]*})/);
    if (jsonMatch && jsonMatch[1]) {
      cleaned = jsonMatch[1];
    }
  }
  
  return cleaned;
}

// Function to identify and follow up on deals with no recent activity
async function get_critical_deals() {
  console.log("Fetching deals with no recent activity...");
  try {
    // Step 1: Calculate the date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 2);
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();
    
    console.log(`Looking for deals with no activity since ${sevenDaysAgoISO}`);
    
    // Step 2: Fetch deals from Supabase that haven't had activity in the last 7 days
    const { data: staleDeals, error } = await supabase
      .from("deals")
      .select("*")
      .lt("last_activity", sevenDaysAgoISO)
      .order("value", { ascending: false }); // Order by deal value to prioritize higher value deals
    
    if (error) {
      console.error("Error fetching stale deals:", error);
      return `Error fetching stale deals: ${error.message}`;
    }
    
    if (!staleDeals || staleDeals.length === 0) {
      console.log("No stale deals found");
      return "No deals with inactive status found in the last 2 days.";
    }
    
    console.log(`Found ${staleDeals.length} stale deals`);
    
    // Step 3: Format deals for LLM
    const dealsText = staleDeals.map(deal => 
      `Deal ID: ${deal.id}
       Title: ${deal.title || "No title"}
       Value: $${deal.value || 0}
       Stage: ${deal.stage || "Unknown"}
       Company: ${deal.company || "Unknown"}
       Contact: ${deal.contact_name || "Unknown"}
       Last Activity: ${deal.last_activity || "Never"}
       Next Step: ${deal.next_step || "None"}
       Probability: ${deal.probability || 0}%
       -------------------`
    ).join("\n\n");
    
    // Step 4: Call LLM to identify the most critical deal
    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a sales assistant. Analyze the deals with no recent activity and identify the single most critical one that needs immediate follow-up. A critical deal might be high-value, in an advanced stage, or close to closing. Your response must be valid JSON without code blocks or formatting." 
        },
        { 
          role: "user", 
          content: `Here are deals with no activity in the last 2 days. Please analyze them and identify the SINGLE most critical deal that needs immediate follow-up:\n\n${dealsText}

Please format your response as a JSON object with the following structure:
{
  "summary": "A brief summary of all stale deals",
  "total_stale_deals": number of stale deals,
  "most_critical_deal": {
    "deal_id": "the deal ID of the most critical deal",
    "title": "the deal title",
    "value": "the deal value",
    "reason": "why this deal is critical and needs immediate follow-up",
    "suggested_action": "what action should be taken for this deal"
  }
}

IMPORTANT: Return ONLY the JSON object without any markdown formatting, code blocks, or extra text.` 
        }
      ]
    });
    
    const analysisResult = analysisResponse.choices[0].message.content || "";
    console.log("Deal analysis:", analysisResult);
    
    // Clean the result to handle markdown formatting
    const cleanedResult = cleanJsonString(analysisResult);
    console.log("Cleaned analysis result:", cleanedResult);
    
    let parsedAnalysis;
    try {
      // Parse the JSON response
      parsedAnalysis = JSON.parse(cleanedResult);
    } catch (e) {
      console.error("Error parsing analysis result:", e);
      return `Error: Could not parse the analysis result. ${analysisResult}`;
    }
    
    if (!parsedAnalysis.most_critical_deal || !parsedAnalysis.most_critical_deal.deal_id) {
      return `No critical deals identified.\n\n${JSON.stringify(parsedAnalysis, null, 2)}`;
    }
    
    // Step 5: Get the critical deal details
    const criticalDealId = parsedAnalysis.most_critical_deal.deal_id;
    const criticalDeal = staleDeals.find(deal => deal.id === criticalDealId);
    
    if (!criticalDeal) {
      return `Error: Could not find the critical deal with ID ${criticalDealId}`;
    }
    
    // Step 6: Generate a follow-up email for the critical deal
    const emailResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a sales assistant that helps generate professional and effective follow-up emails for stale deals. Generate an appropriate follow-up email for the critical deal. Your response must be valid JSON without code blocks or formatting." 
        },
        { 
          role: "user", 
          content: `Please generate a professional follow-up email for this critical deal that has had no activity in the last 7 days:
          
Deal ID: ${criticalDeal.id}
Title: ${criticalDeal.title || "No title"}
Value: $${criticalDeal.value || 0}
Stage: ${criticalDeal.stage || "Unknown"}
Company: ${criticalDeal.company || "Unknown"}
Contact Name: ${criticalDeal.contact_name || "Unknown"}
Last Activity: ${criticalDeal.last_activity || "Never"}
Next Step: ${criticalDeal.next_step || "None"}
Probability: ${criticalDeal.probability || 0}%
Reason for follow-up: ${parsedAnalysis.most_critical_deal.reason}
Suggested action: ${parsedAnalysis.most_critical_deal.suggested_action}

Please provide the follow-up email in JSON format with the following structure:
{
  "to": "the contact's email (use their name + @company.com if not available)",
  "subject": "Follow-up on [Deal Title]",
  "body": "The generated email body that effectively follows up on this deal based on its status and details"
}

IMPORTANT: Return ONLY the JSON object without any markdown formatting, code blocks, or extra text.` 
        }
      ]
    });
    
    const generatedEmail = emailResponse.choices[0].message.content || "";
    console.log("Generated follow-up email:", generatedEmail);
    
    // Clean the result to handle markdown formatting
    const cleanedEmail = cleanJsonString(generatedEmail);
    console.log("Cleaned email:", cleanedEmail);
    
    let parsedEmail;
    try {
      // Parse the JSON response
      parsedEmail = JSON.parse(cleanedEmail);
    } catch (e) {
      console.error("Error parsing generated email:", e);
      return `Error: Could not parse the generated email. ${generatedEmail}`;
    }
    
    // Step 7: Store the follow-up email in Supabase
    const now = new Date().toISOString();
    const { data, error: insertError } = await supabase
      .from("email_tracking")
      .insert({
        subject: parsedEmail.subject,
        user_id: "a0954a90-39f5-4a83-bcf6-15201789dbd5", // Replace with actual user ID in production
        contact_id: criticalDeal.contact_id,
        deal_id: criticalDeal.id,
        sent_at: now,
        created_at: now,
        email_id: crypto.randomUUID(), // Generate a unique ID
      });
      
    if (insertError) {
      console.error("Error storing follow-up email in Supabase:", insertError);
      return `Error sending follow-up email: ${insertError.message}`;
    }
    
    // Step 8: Update the deal's last_activity field
    const { error: updateError } = await supabase
      .from("deals")
      .update({ 
        last_activity: now,
        next_step: parsedAnalysis.most_critical_deal.suggested_action
      })
      .eq("id", criticalDealId);
      
    if (updateError) {
      console.error("Error updating deal:", updateError);
      return `Warning: Follow-up email sent but could not update deal: ${updateError.message}`;
    }
    
    // Step 9: Return a comprehensive response
    return `
Deal Analysis Summary:
${parsedAnalysis.summary}

Most Critical Deal Identified:
Title: ${parsedAnalysis.most_critical_deal.title}
Deal ID: ${parsedAnalysis.most_critical_deal.deal_id}
Value: ${parsedAnalysis.most_critical_deal.value}
Reason: ${parsedAnalysis.most_critical_deal.reason}
Suggested Action: ${parsedAnalysis.most_critical_deal.suggested_action}

Follow-Up Email Generated and Sent:
To: ${parsedEmail.to}
Subject: ${parsedEmail.subject}
Body: 
${parsedEmail.body}

Status: Follow-up email stored in database and deal updated with new activity timestamp and next step.
`;
  } catch (error) {
    console.error("Error in get_critical_deals:", error);
    return `Error analyzing deals: ${error}`;
  }
}

// All-in-one function to handle emails: fetch, analyze, reply, and update
async function summarize_unread_message() {
  console.log("Fetching unread emails from Supabase...");
  try {
    // Step 1: Fetch unread emails from Supabase
    const { data: emailTracking, error } = await supabase
      .from("email_tracking")
      .select("*")
      .is("opened_at", null)  // Unread emails have null opened_at
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching unread emails:", error);
      return `Error fetching unread emails: ${error.message}`;
    }

    if (!emailTracking || emailTracking.length === 0) {
      console.log("No unread emails found");
      return "No unread emails found";
    }

    console.log(`Found ${emailTracking.length} unread emails`);

    // Step 2: Format emails for LLM
    const emailsText = emailTracking.map(email => 
      `From: ${email.user_id}
       Subject: ${email.subject || "No subject"}
       Date: ${email.created_at}
       Status: Unread
       Email ID: ${email.email_id}
       Contact ID: ${email.contact_id || "N/A"}
       Deal ID: ${email.deal_id || "N/A"}
       -------------------`
    ).join("\n\n");

    // Step 3: Call LLM to identify critical emails
    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are an email assistant. Analyze the unread emails and identify the most important/critical one that needs an immediate response. A critical email might be time-sensitive, from an important client, related to a critical issue, or requires immediate attention. Your response must be valid JSON without code blocks or formatting." 
        },
        { 
          role: "user", 
          content: `Here are my unread emails. Please analyze them and identify the SINGLE most critical email that needs an immediate response:\n\n${emailsText}

Please format your response as a JSON object with the following structure:
{
  "summary": "A brief summary of all unread emails",
  "total_unread": number of unread emails,
  "most_critical_email": {
    "email_id": "the email ID of the most critical email",
    "subject": "the email subject",
    "reason": "why this email is critical and needs immediate response"
  }
}

IMPORTANT: Return ONLY the JSON object without any markdown formatting, code blocks, or extra text.` 
        }
      ]
    });

    const analysisResult = analysisResponse.choices[0].message.content || "";
    console.log("Email analysis:", analysisResult);
    
    // Clean the result to handle markdown formatting
    const cleanedResult = cleanJsonString(analysisResult);
    console.log("Cleaned analysis result:", cleanedResult);
    
    let parsedAnalysis;
    try {
      // Parse the JSON response
      parsedAnalysis = JSON.parse(cleanedResult);
    } catch (e) {
      console.error("Error parsing analysis result:", e);
      return `Error: Could not parse the analysis result. ${analysisResult}`;
    }
    
    if (!parsedAnalysis.most_critical_email || !parsedAnalysis.most_critical_email.email_id) {
      return `No critical emails identified.\n\n${JSON.stringify(parsedAnalysis, null, 2)}`;
    }
    
    // Step 4: Get the critical email details
    const criticalEmailId = parsedAnalysis.most_critical_email.email_id;
    const criticalEmail = emailTracking.find(email => email.email_id === criticalEmailId);
    
    if (!criticalEmail) {
      return `Error: Could not find the critical email with ID ${criticalEmailId}`;
    }
    
    // Step 5: Generate a reply to the critical email
    const replyResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are an email assistant that helps generate professional and concise email replies. Generate an appropriate reply to the critical email. Your response must be valid JSON without code blocks or formatting." 
        },
        { 
          role: "user", 
          content: `Please generate a professional reply to this critical email:
          
Subject: ${criticalEmail.subject || "No subject"}
From: ${criticalEmail.user_id}
Email ID: ${criticalEmail.email_id}
Reason for importance: ${parsedAnalysis.most_critical_email.reason}

Please provide the reply in JSON format with the following structure:
{
  "to": "recipient email address (use the sender's address)",
  "subject": "Re: original subject",
  "body": "The generated email body that addresses the critical nature of this email"
}

IMPORTANT: Return ONLY the JSON object without any markdown formatting, code blocks, or extra text.` 
        }
      ]
    });
    
    const generatedReply = replyResponse.choices[0].message.content || "";
    console.log("Generated reply:", generatedReply);
    
    // Clean the result to handle markdown formatting
    const cleanedReply = cleanJsonString(generatedReply);
    console.log("Cleaned reply:", cleanedReply);
    
    let parsedReply;
    try {
      // Parse the JSON response
      parsedReply = JSON.parse(cleanedReply);
    } catch (e) {
      console.error("Error parsing generated reply:", e);
      return `Error: Could not parse the generated reply. ${generatedReply}`;
    }
    
    // Step 6: Store the reply in Supabase
    const now = new Date().toISOString();
    const { data, error: insertError } = await supabase
      .from("email_tracking")
      .insert({
        subject: parsedReply.subject,
        user_id: criticalEmail.user_id,
        contact_id: criticalEmail.contact_id,
        deal_id: criticalEmail.deal_id,
        sent_at: now,
        created_at: now,
        email_id: crypto.randomUUID(), // Generate a unique ID
      });
      
    if (insertError) {
      console.error("Error storing email reply in Supabase:", insertError);
      return `Error sending email reply: ${insertError.message}`;
    }
    
    // Step 7: Mark the original email as replied
    const { error: updateError } = await supabase
      .from("email_tracking")
      .update({ 
        replied_at: now,
        opened_at: now // Also mark as read
      })
      .eq("email_id", criticalEmailId);
      
    if (updateError) {
      console.error("Error updating original email:", updateError);
      return `Warning: Email reply sent but could not mark original as replied: ${updateError.message}`;
    }
    
    // Step 8: Return a comprehensive response
    return `
Email Analysis Summary:
${parsedAnalysis.summary}

Most Critical Email Identified:
Subject: ${parsedAnalysis.most_critical_email.subject}
Email ID: ${parsedAnalysis.most_critical_email.email_id}
Reason: ${parsedAnalysis.most_critical_email.reason}

Reply Generated and Sent:
To: ${parsedReply.to}
Subject: ${parsedReply.subject}
Body: 
${parsedReply.body}

Status: Email reply stored in database and original email marked as replied.
`;
  } catch (error) {
    console.error("Error in summarize_unread_message:", error);
    return `Error analyzing emails: ${error}`;
  }
}

export default function Agent() {
  const [userPrompt, setUserPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatLog, setChatLog] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userPrompt.trim()) return;

    setLoading(true);
    setChatLog("");
    let currentMessages: any[] = [
      { role: "user", content: userPrompt },
    ];

    try {
      // Check if user is asking to summarize emails
      if (userPrompt.toLowerCase().includes("summarize") && 
          userPrompt.toLowerCase().includes("email")) {
        setChatLog("Analyzing unread emails and generating replies to critical ones...");
        const summary = await summarize_unread_message();
        setChatLog(prev => prev + "\n\n" + summary);
        setLoading(false);
        return;
      }
      
      // Check if user is asking to find critical deals
      if ((userPrompt.toLowerCase().includes("critical") || userPrompt.toLowerCase().includes("stale")) && 
          userPrompt.toLowerCase().includes("deal")) {
        setChatLog("Analyzing stale deals and generating follow-up emails...");
        const dealAnalysis = await get_critical_deals();
        setChatLog(prev => prev + "\n\n" + dealAnalysis);
        setLoading(false);
        return;
      }

      while (true) {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: currentMessages,
          tools,
          tool_choice: "auto",
        });

        const message = response.choices[0].message;

        if (message.tool_calls && message.tool_calls.length > 0) {
          // Model wants to call a tool
          const toolCall = message.tool_calls[0];
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments);

          setChatLog((prev) => prev + `\n[Assistant wants to call: ${toolName} with args ${JSON.stringify(toolArgs)}]`);

          // Run the tool
          const toolResult = await runTool(toolName, toolArgs);

          setChatLog((prev) => prev + `\n[Tool result]: ${toolResult}`);

          // Append assistant tool_call message
          currentMessages.push(message);

          // Append tool response message with tool_call_id
          currentMessages.push({
            role: "tool",
            name: toolName,
            content: toolResult,
            tool_call_id: toolCall.id,
          });
        } else {
          // Normal assistant message without tool call
          setChatLog((prev) => prev + `\n[Assistant]: ${message.content || ""}`);
          break; // Exit loop, done
        }
      }
    } catch (err) {
      setChatLog((prev) => prev + `\n[Error]: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "auto" }}>
      <h2 style={{ marginBottom: 16 }}>Email & Deal Assistant</h2>
      
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button 
          onClick={() => {
            setLoading(true);
            setChatLog("Analyzing unread emails and generating replies to critical ones...");
            summarize_unread_message()
              .then(result => setChatLog(result))
              .finally(() => setLoading(false));
          }} 
          style={{ padding: "8px 16px", backgroundColor: "#f0f0f0", border: "1px solid #ccc", borderRadius: 4 }}
          disabled={loading}
        >
          Analyze & Reply to Emails
        </button>
        
        <button 
          onClick={() => {
            setLoading(true);
            setChatLog("Analyzing stale deals and generating follow-up emails...");
            get_critical_deals()
              .then(result => setChatLog(result))
              .finally(() => setLoading(false));
          }} 
          style={{ padding: "8px 16px", backgroundColor: "#f0f0f0", border: "1px solid #ccc", borderRadius: 4 }}
          disabled={loading}
        >
          Find & Follow-up Critical Deals
        </button>
      </div>
      
      <form onSubmit={handleSubmit}>
        <input
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          placeholder="Ask the AI..."
          disabled={loading}
          style={{ width: "100%", padding: 8 }}
        />
        <button type="submit" disabled={loading} style={{ marginTop: 8 }}>
          {loading ? "Processing..." : "Submit"}
        </button>
      </form>

      <pre style={{ whiteSpace: "pre-wrap", marginTop: 20, background: "#eee", padding: 10 }}>
        {chatLog}
      </pre>
    </div>
  );
}
