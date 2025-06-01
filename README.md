# Deal Whisperer CRM AI

A comprehensive AI-powered Customer Relationship Management (CRM) system built with React, TypeScript, and Supabase.

## Features

### Core CRM Functionality
- **Pipeline Management**: Visual deal pipeline with drag-and-drop functionality
- **Contact Management**: Complete contact database with relationship tracking
- **Company Management**: Company profiles with AI-powered research capabilities
- **Lead Management**: Lead scoring and qualification system
- **Activity Tracking**: Comprehensive activity logging and management
- **Email Management**: Gmail-like email interface with AI summarization
- **Calendar Integration**: Meeting scheduling and calendar management
- **File Management**: Document storage and organization
- **Transcripts**: Audio/video transcription with AI summarization

### AI-Powered Features
- **ChatCRM**: Intelligent AI assistant with real-time CRM data analysis
- **AI Assistant**: Template-based AI tools with ChatCRM integration
- **AI Coach**: Deal-specific coaching and recommendations
- **Objection Handler**: AI-powered objection handling suggestions
- **Customer Persona Builder**: AI-generated customer personas
- **Win-Loss Analysis**: AI analysis of deal outcomes
- **Email Summarization**: AI-powered email insights and summaries
- **Company Research**: AI-powered company information gathering
- **Transcription Services**: Speech-to-text with AI summarization

### ChatCRM - Data-Driven AI Assistant

The ChatCRM feature provides an intelligent AI assistant that has access to your actual CRM data:

#### Key Capabilities:
- **Real-time Data Access**: Analyzes your actual deals, contacts, companies, activities, and emails
- **Contextual Responses**: Provides specific insights based on your real performance metrics
- **Data-Driven Recommendations**: Suggests improvements based on current data patterns
- **Performance Analysis**: Calculates conversion rates, pipeline health, and revenue metrics
- **Trend Identification**: Identifies patterns and opportunities in your data

#### Example Questions You Can Ask:
- "What's my pipeline health?"
- "Which deals need attention?"
- "How can I improve my close rate?"
- "Show me my top performing contacts"
- "Analyze my sales trends"
- "What's my average deal size?"
- "Which companies have the most contacts?"
- "What are my recent activities?"

#### Technical Implementation:
- Fetches real-time data from all CRM tables (deals, contacts, companies, activities, emails, leads)
- Calculates comprehensive statistics and trends
- Formats data context for AI analysis
- Provides specific, actionable insights based on actual numbers

### AI Assistant - Template-Based Tools with ChatCRM Integration

The AI Assistant provides pre-built templates for common sales tasks, seamlessly integrated with the ChatCRM system:

#### Available Templates:
- **Research and evaluate a company for fit**: Analyze company alignment with your offering
- **Confirm decision-maker**: Determine if a contact has decision-making authority
- **Create personalized email with PS line**: Generate tailored sales emails
- **Summarize company news**: Gather recent company developments
- **Identify relevant job openings**: Find openings that indicate need for your solution
- **Identify competitors**: Research competitive landscape

#### Integration with ChatCRM:
- Select any template to automatically open ChatCRM
- Templates provide starting points for data-driven conversations
- Access to real CRM data enhances template effectiveness
- Seamless transition from template selection to intelligent chat

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Authentication, Real-time)
- **AI Integration**: OpenAI GPT-4, Tavily Search API
- **UI Components**: shadcn/ui, Radix UI
- **State Management**: TanStack Query (React Query)
- **Build Tool**: Vite

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- OpenAI API key
- Tavily API key (optional, for enhanced company research)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd deal-whisperer-crm-ai
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Fill in your environment variables:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_TAVILY_API_KEY=your_tavily_api_key
```

4. Run database migrations:
```bash
npx supabase db push
```

5. Start the development server:
```bash
npm run dev
```

## Database Schema

The application uses a comprehensive database schema including:
- Users and authentication
- Deals pipeline management
- Contacts and companies
- Activities and tasks
- Email tracking and management
- Lead management and scoring
- File storage and transcripts

## AI Configuration

### OpenAI Integration
- Supports GPT-4 for advanced reasoning and analysis
- Configurable temperature and token limits
- Comprehensive error handling and fallbacks

### Tavily Search Integration
- Real-time web search for company research
- Business-focused domain filtering
- Fallback to simulated data when unavailable

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
