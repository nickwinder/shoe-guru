import { RunnableConfig } from '@langchain/core/runnables'
import { StateAnnotation } from './state'
import { ensureConfiguration } from './configuration'
import { getVectorStore as getPgVectorStore } from './retrievers/pgvector-retrieval'
import { getVectorStore as getSupabaseVectorStore } from './retrievers/supabase-retrieval'
import { getVectorStore as getMemoryVectorStore } from './retrievers/retrieval'
import { ScoreThresholdRetriever } from 'langchain/retrievers/score_threshold'
import { applyRecencyBias } from './retrievers/utils'

/**
 * Retrieves relevant documents based on the generated query
 */
export async function retrieve(
  state: typeof StateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof StateAnnotation.Update> {
  const query = state.queries[state.queries.length - 1]
  const configuration = ensureConfiguration(config)

  // Get the vector store based on the configured provider
  let vectorStore
  if (configuration.retrieverProvider === 'pgvector') {
    vectorStore = await getPgVectorStore(config)
  } else if (configuration.retrieverProvider === 'supabase') {
    vectorStore = await getSupabaseVectorStore(config)
  } else if (configuration.retrieverProvider === 'local-file') {
    vectorStore = await getMemoryVectorStore(config)
  } else {
    throw new Error('Unsupported retriever provider: ' + configuration.retrieverProvider)
  }

  // Perform similarity search
  let docs = await ScoreThresholdRetriever.fromVectorStore(vectorStore, {
    minSimilarityScore: 0.3,
    kIncrement: 2,
    maxK: 4,
  }).getRelevantDocuments(query)

  // Apply recency bias if configured
  if (configuration.recencyWeight > 0) {
    docs = applyRecencyBias(docs, configuration.recencyWeight)
  }

  return { retrievedDocs: docs }
}
