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
];

// Simulated tool implementations
async function runTool(toolName: string, args: any): Promise<string> {
  if (toolName === "summarizeEmails") {
    const summary = await summarize_unread_message();
    return summary;
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
      <h2 style={{ marginBottom: 16 }}>Email Assistant</h2>
      
      <button 
        onClick={() => {
          setLoading(true);
          setChatLog("Analyzing unread emails and generating replies to critical ones...");
          summarize_unread_message()
            .then(result => setChatLog(result))
            .finally(() => setLoading(false));
        }} 
        style={{ padding: "8px 16px", backgroundColor: "#f0f0f0", border: "1px solid #ccc", borderRadius: 4, marginBottom: 16 }}
        disabled={loading}
      >
        Analyze & Reply to Critical Emails
      </button>
      
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
