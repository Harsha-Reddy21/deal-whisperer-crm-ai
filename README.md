# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/2732b526-c2f2-43bf-b2fd-9646d027ef17

## OpenAI Integration

This project includes an AI-powered objection handler that uses OpenAI's GPT-4 model to generate intelligent sales objection responses.

### Setup

1. Create a `.env` file in the root directory
2. Add your OpenAI API key:
   ```
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   ```

### Features

- **AI Objection Handler**: Paste any customer objection and get 3 AI-generated response strategies
- **Smart Responses**: Each response includes approach type, effectiveness score, and reasoning
- **Copy to Clipboard**: Easily copy responses for use in your sales conversations
- **Fallback Handling**: Graceful fallback responses if the API is unavailable

### Usage

Navigate to the Objection Handler component and:
1. Enter a customer objection in the text area
2. Click "Get AI Suggestions"
3. Review the generated response strategies
4. Copy or use the responses in your sales conversations

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/2732b526-c2f2-43bf-b2fd-9646d027ef17) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/2732b526-c2f2-43bf-b2fd-9646d027ef17) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
