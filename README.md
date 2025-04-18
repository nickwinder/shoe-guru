# Wide Toe Box Web App

A Next.js web application for browsing and searching running shoes.

## Features

- Browse a list of running shoes
- Search for shoes by name, brand, or intended use
- View detailed information about specific shoe versions
- Responsive design with Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18 or later
- PostgreSQL database (configured in .env)

### Installation

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

3. Set up your environment variables in `.env`:

```
DATABASE_URL="postgresql://username:password@localhost:5432/wide_toe_box"
```

4. Generate Prisma client:

```bash
pnpm prisma:generate
```

5. Initialize the database:

```bash
pnpm db:init
```

6. Optionally, scrape shoe data:

```bash
pnpm db:scrape
```

### Running the Application

Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

Build the application:

```bash
pnpm build
```

Start the production server:

```bash
pnpm start
```

## Project Structure

- `src/app`: Next.js App Router components
  - `page.tsx`: Home page (redirects to /shoes)
  - `layout.tsx`: Root layout component
  - `globals.css`: Global styles
  - `shoes/`: Shoes list page and components
  - `shoes/versions/[id]/`: Dynamic pages for shoe versions
  - `api/`: API routes for fetching data
- `src/lib`: Utility functions and shared code
  - `prisma.ts`: Prisma client setup
- `prisma/`: Prisma schema and migrations
  - `schema.prisma`: Database schema

## Technologies Used

- [Next.js](https://nextjs.org/) - React framework
- [Prisma](https://www.prisma.io/) - Database ORM
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript

<!--
Configuration auto-generated by `langgraph template lock`. DO NOT EDIT MANUALLY.
{
  "config_schemas": {
    "indexer": {
      "type": "object",
      "properties": {
        "embeddingModel": {
          "type": "string",
          "default": "openai/text-embedding-3-small",
          "description": "Name of the embedding model to use. Must be a valid embedding model name.",
          "environment": [
            {
              "value": "cohere/embed-english-light-v2.0",
              "variables": "COHERE_API_KEY"
            },
            {
              "value": "cohere/embed-english-light-v3.0",
              "variables": "COHERE_API_KEY"
            },
            {
              "value": "cohere/embed-english-v2.0",
              "variables": "COHERE_API_KEY"
            },
            {
              "value": "cohere/embed-english-v3.0",
              "variables": "COHERE_API_KEY"
            },
            {
              "value": "cohere/embed-multilingual-light-v3.0",
              "variables": "COHERE_API_KEY"
            },
            {
              "value": "cohere/embed-multilingual-v2.0",
              "variables": "COHERE_API_KEY"
            },
            {
              "value": "cohere/embed-multilingual-v3.0",
              "variables": "COHERE_API_KEY"
            },
            {
              "value": "openai/text-embedding-3-large",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/text-embedding-3-small",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/text-embedding-ada-002",
              "variables": "OPENAI_API_KEY"
            }
          ]
        },
        "retrieverProvider": {
          "enum": [
            "elastic",
            "elastic-local",
            "mongodb",
            "pinecone"
          ],
          "default": "elastic",
          "description": "The vector store provider to use for retrieval. Options are 'elastic', 'pinecone', or 'mongodb'.",
          "environment": [
            {
              "value": "elastic",
              "variables": [
                "ELASTICSEARCH_URL",
                "ELASTICSEARCH_API_KEY"
              ]
            },
            {
              "value": "elastic-local",
              "variables": [
                "ELASTICSEARCH_URL",
                "ELASTICSEARCH_USER",
                "ELASTICSEARCH_PASSWORD"
              ]
            },
            {
              "value": "mongodb",
              "variables": [
                "MONGODB_URI"
              ]
            },
            {
              "value": "pinecone",
              "variables": [
                "PINECONE_API_KEY",
                "PINECONE_INDEX_NAME"
              ]
            }
          ],
          "type": "string"
        }
      }
    },
    "retrieval_graph": {
      "type": "object",
      "properties": {
        "embeddingModel": {
          "type": "string",
          "default": "openai/text-embedding-3-small",
          "description": "Name of the embedding model to use. Must be a valid embedding model name.",
          "environment": [
            {
              "value": "cohere/embed-english-light-v2.0",
              "variables": "COHERE_API_KEY"
            },
            {
              "value": "cohere/embed-english-light-v3.0",
              "variables": "COHERE_API_KEY"
            },
            {
              "value": "cohere/embed-english-v2.0",
              "variables": "COHERE_API_KEY"
            },
            {
              "value": "cohere/embed-english-v3.0",
              "variables": "COHERE_API_KEY"
            },
            {
              "value": "cohere/embed-multilingual-light-v3.0",
              "variables": "COHERE_API_KEY"
            },
            {
              "value": "cohere/embed-multilingual-v2.0",
              "variables": "COHERE_API_KEY"
            },
            {
              "value": "cohere/embed-multilingual-v3.0",
              "variables": "COHERE_API_KEY"
            },
            {
              "value": "openai/text-embedding-3-large",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/text-embedding-3-small",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/text-embedding-ada-002",
              "variables": "OPENAI_API_KEY"
            }
          ]
        },
        "retrieverProvider": {
          "enum": [
            "elastic",
            "elastic-local",
            "mongodb",
            "pinecone"
          ],
          "default": "elastic",
          "description": "The vector store provider to use for retrieval. Options are 'elastic', 'pinecone', or 'mongodb'.",
          "environment": [
            {
              "value": "elastic",
              "variables": [
                "ELASTICSEARCH_URL",
                "ELASTICSEARCH_API_KEY"
              ]
            },
            {
              "value": "elastic-local",
              "variables": [
                "ELASTICSEARCH_URL",
                "ELASTICSEARCH_USER",
                "ELASTICSEARCH_PASSWORD"
              ]
            },
            {
              "value": "mongodb",
              "variables": [
                "MONGODB_URI"
              ]
            },
            {
              "value": "pinecone",
              "variables": [
                "PINECONE_API_KEY",
                "PINECONE_INDEX_NAME"
              ]
            }
          ],
          "type": "string"
        },
        "responseModel": {
          "type": "string",
          "default": "anthropic/claude-3-5-sonnet-20240620",
          "description": "The language model used for generating responses. Should be in the form: provider/model-name.",
          "environment": [
            {
              "value": "anthropic/claude-1.2",
              "variables": "ANTHROPIC_API_KEY"
            },
            {
              "value": "anthropic/claude-2.0",
              "variables": "ANTHROPIC_API_KEY"
            },
            {
              "value": "anthropic/claude-2.1",
              "variables": "ANTHROPIC_API_KEY"
            },
            {
              "value": "anthropic/claude-3-5-sonnet-20240620",
              "variables": "ANTHROPIC_API_KEY"
            },
            {
              "value": "anthropic/claude-3-haiku-20240307",
              "variables": "ANTHROPIC_API_KEY"
            },
            {
              "value": "anthropic/claude-3-opus-20240229",
              "variables": "ANTHROPIC_API_KEY"
            },
            {
              "value": "anthropic/claude-3-sonnet-20240229",
              "variables": "ANTHROPIC_API_KEY"
            },
            {
              "value": "anthropic/claude-instant-1.2",
              "variables": "ANTHROPIC_API_KEY"
            },
            {
              "value": "openai/gpt-3.5-turbo",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-3.5-turbo-0125",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-3.5-turbo-0301",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-3.5-turbo-0613",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-3.5-turbo-1106",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-3.5-turbo-16k",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-3.5-turbo-16k-0613",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-4",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-4-0125-preview",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-4-0314",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-4-0613",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-4-1106-preview",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-4-32k",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-4-32k-0314",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-4-32k-0613",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-4-turbo",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-4-turbo-preview",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-4-vision-preview",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-4o",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-4o-mini",
              "variables": "OPENAI_API_KEY"
            }
          ]
        },
        "queryModel": {
          "type": "string",
          "default": "anthropic/claude-3-haiku-20240307",
          "description": "The language model used for processing and refining queries. Should be in the form: provider/model-name.",
          "environment": [
            {
              "value": "anthropic/claude-1.2",
              "variables": "ANTHROPIC_API_KEY"
            },
            {
              "value": "anthropic/claude-2.0",
              "variables": "ANTHROPIC_API_KEY"
            },
            {
              "value": "anthropic/claude-2.1",
              "variables": "ANTHROPIC_API_KEY"
            },
            {
              "value": "anthropic/claude-3-5-sonnet-20240620",
              "variables": "ANTHROPIC_API_KEY"
            },
            {
              "value": "anthropic/claude-3-haiku-20240307",
              "variables": "ANTHROPIC_API_KEY"
            },
            {
              "value": "anthropic/claude-3-opus-20240229",
              "variables": "ANTHROPIC_API_KEY"
            },
            {
              "value": "anthropic/claude-3-sonnet-20240229",
              "variables": "ANTHROPIC_API_KEY"
            },
            {
              "value": "anthropic/claude-instant-1.2",
              "variables": "ANTHROPIC_API_KEY"
            },
            {
              "value": "openai/gpt-3.5-turbo",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-3.5-turbo-0125",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-3.5-turbo-0301",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-3.5-turbo-0613",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-3.5-turbo-1106",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-3.5-turbo-16k",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-3.5-turbo-16k-0613",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-4",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-4-0125-preview",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-4-0314",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-4-0613",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-4-1106-preview",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-4-32k",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-4-32k-0314",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-4-32k-0613",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-4-turbo",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-4-turbo-preview",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-4-vision-preview",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-4o",
              "variables": "OPENAI_API_KEY"
            },
            {
              "value": "openai/gpt-4o-mini",
              "variables": "OPENAI_API_KEY"
            }
          ]
        }
      }
    }
  }
}
-->
