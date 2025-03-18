# Changelog Generator

A modern web application that generates beautiful changelogs from your GitHub repository commits using AI.

## Features

- AI-powered changelog generation
- Real-time progress updates
- Date range selection
- Beautiful UI with modern components
- Fast and responsive

## Prerequisites

- Node.js (v18 or higher)
- Docker and Docker Compose
- GitHub Personal Access Token ([Create one here](https://github.com/settings/tokens))
- OpenAI API Key ([Get one here](https://platform.openai.com/account/api-keys))

## Quick Start

1. **Clone the repository**

   ```bash
   git clone https://github.com/tkcarnage/changelog-generator.git
   cd changelog-generator
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your:

   - GitHub token
   - OpenAI API key

3. **Start MongoDB with Docker**

   ```bash
   docker compose up -d
   ```

   This will automatically:

   - Start MongoDB on port 27017
   - Set up the database and user
   - The MongoDB URI will be: `mongodb://localhost:27017/changelog-generator`

4. **Install dependencies and start the application**

   ```bash
   # Install dependencies
   npm install

   # Start the development server
   npm run dev
   ```

5. **Open the application**
   Visit [http://localhost:5173](http://localhost:5173) in your browser

## Development

### Project Structure

```
changelog-generator/
├── backend/           # Node.js/Express backend
├── frontend/         # React/Vite frontend
├── docker/           # Docker configuration
└── docker-compose.yml
```

### Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build the frontend for production
- `npm run preview` - Preview the production build locally

## Environment Variables

The following environment variables are required:

```env
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/changelog-generator
PORT=3000
OPENAI_API_KEY=your_openai_api_key_here
GITHUB_TOKEN=your_github_token_here
```

## TODO:

1. Create retry method incase llm calls fail (saved commits for this reason)
2. Chunk dynamically, instead of set size, with tokenizer, to speed up generation latency.
3. Allow users to edit the changelog depending if they are owner?

- need to add auth to add this feature

4. Create another llm prompt with a model thats good at recognizing code diffs.

- add the summarized code diff with the commit to give the llm more context (variable names, purpose of the function, etc)

5. Add cronjob to schedule automatically the generation of changelogs

## AI USAGE:

Copilot
Windsurf

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
