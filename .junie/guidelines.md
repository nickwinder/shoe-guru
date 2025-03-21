# Shoe Guru Project Overview

## Project Description
Shoe Guru is a retrieval-based question answering system built using LangGraph.js. It's designed to provide personalized responses to user queries about shoes by retrieving relevant information from indexed documents.

## Architecture
The project consists of two main components:

1. **Indexer Graph**: Takes document objects and strings, and indexes them for specific users.
   - Documents are embedded using vector embeddings
   - Documents are stored in a vector database with user ID filtering

2. **Retrieval Graph**: Manages chat history and responds to user queries based on fetched context.
   - Takes user queries as input
   - Searches for documents filtered by user ID
   - Responds using retrieved information and conversation context

## Technology Stack
- **Framework**: LangGraph.js for building and managing the agent graphs
- **Vector Stores**: 
  - Elasticsearch (default)
  - MongoDB Atlas
  - Pinecone Serverless
- **Embedding Models**:
  - OpenAI (default: text-embedding-3-small)
  - Cohere
- **Language Models**:
  - Anthropic Claude (default for responses: claude-3-5-sonnet)
  - OpenAI GPT models

## Development Environment
- LangGraph Studio for visual graph development and debugging
- Integration with LangSmith for tracing and collaboration

## Getting Started
1. Set up environment variables in `.env` file
2. Configure your preferred retriever, embedding model, and language model
3. Use the indexer graph to add documents for a specific user
4. Use the retrieval graph to ask questions about the indexed content

## Customization Options
- Change the retriever provider
- Modify the embedding model
- Adjust search parameters
- Customize response generation
- Change the language model
- Extend the graph with new nodes
- Add new tools or API integrations
- Modify prompts for query generation and response formulation

## Best Practices
- Test changes thoroughly to ensure they improve agent performance
- Use LangGraph Studio to debug specific nodes by editing past states
- Create new threads to clear previous history when needed
- Refer to LangGraph documentation for patterns and examples
