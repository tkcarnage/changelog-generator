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

## Technical & Product Decisions

### 1. Developer-Facing Tool

I built a powerful developer tool that prioritizes efficiency and ease of use:

**Technical Choices:**
- **Node.js/Express Backend**: Chosen for its robust ecosystem and excellent GitHub API libraries
- **MongoDB**: Used for persistent storage of changelogs and efficient querying by date ranges
- **OpenAI Integration**: Leverages AI for intelligent change categorization and summary generation
- **Chunked Processing**: Handles large repositories efficiently by processing commits in manageable chunks
- **Progress Tracking**: Real-time progress updates during changelog generation

**Developer Experience:**
- Simple setup with clear environment variables
- Flexible date range selection for targeted changelogs
- Automatic categorization of changes (New Features, Bug Fixes, Breaking Changes, etc.)
- Progress indicators during generation
- Error handling with saved commits for retry capability

### 2. Public-Facing Website

The public changelog website focuses on clarity and accessibility:

**Technical Choices:**
- **React Frontend**: Offers component reusability and efficient rendering
- **Clean UI/UX**: Minimal, focused design that prioritizes readability
- **Responsive Design**: Works well on all device sizes
- **Fast Loading**: Optimized for quick access to changelog information

**User Experience:**
- Clear categorization of changes
- Chronological organization
- Accessible formatting

### Why These Choices?

1. **Separation of Concerns**
   - Split into distinct services (GitHub interaction, AI processing, formatting)
   - Makes the codebase maintainable and testable
   - Allows for easy addition of new features

2. **Scalability**
   - Chunk-based processing handles repositories of any size
   - MongoDB provides efficient storage and retrieval
   - Parallel processing where appropriate

3. **Developer Focus**
   - Automated categorization reduces manual work
   - Progress tracking keeps developers informed
   - Flexible date ranges for targeted updates
   - Preserved technical details for developer context

4. **Future-Proofing**
   - Modular architecture allows easy addition of new VCS providers
   - Extensible formatting system for new output formats
   - API design supports future frontend enhancements

## TODO:

1. Create retry method incase llm calls fail (saved commits for this reason)
2. Chunk dynamically, instead of set size, with tokenizer or based on context, to speed up generation latency.
3. Allow users to edit the changelog depending if they are owner?
   - need to add auth to add this feature
4. Create another llm prompt with a model thats good at recognizing code diffs
   - add the summarized code diff with the commit to give the llm more context (variable names, purpose of the function, etc)
5. Add cronjob to schedule automatically the generation of changelogs
6. Add more export formats (PDF, HTML, JSON)
7. Implement caching for better performance
   - Cache GitHub API responses
   - Cache LLM responses for similar commits
8. Add support for more VCS providers
   - GitLab integration
   - Bitbucket integration
9. Enhance breaking change detection
   - Semantic versioning support
   - API compatibility checking
10. Add customization options for different project types
    - Language-specific templates
    - Custom categorization rules
    - Project-specific filters

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
