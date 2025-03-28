import {RunnableConfig} from "@langchain/core/runnables";
import {ensureConfiguration} from "../configuration";
import {Embeddings} from "@langchain/core/embeddings";
import {OpenAIEmbeddings} from "@langchain/openai";
import {SupabaseVectorStore} from "@langchain/community/vectorstores/supabase";
import {createClient} from "@supabase/supabase-js";
import { DocumentInterface } from 'node_modules/@langchain/core/documents'

const TABLE_NAME = 'brr_embeddings';

/**
 * Makes an embedding model based on the model name.
 *
 * @param modelName - The name of the embedding model
 * @returns An embedding model
 */
function makeTextEmbeddings(modelName: string): Embeddings {
    /**
     * Connect to the configured text encoder.
     */
    const index = modelName.indexOf("/");
    let provider, model;
    if (index === -1) {
        model = modelName;
        provider = "openai"; // Assume openai if no provider included
    } else {
        provider = modelName.slice(0, index);
        model = modelName.slice(index + 1);
    }
    switch (provider) {
        case "openai":
            return new OpenAIEmbeddings({model});
        default:
            throw new Error(`Unsupported embedding provider: ${provider}`);
    }
}

/**
 * Creates a Supabase client instance.
 * 
 * @returns A Supabase client
 */
function createSupabaseClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        throw new Error("Supabase URL and key must be provided in environment variables");
    }
    
    return createClient(supabaseUrl, supabaseKey);
}

/**
 * Creates a SupabaseVectorStore instance for document retrieval without triggering ingestion.
 * This function only accesses the existing vector store.
 *
 * @param config - The configuration object
 * @returns A SupabaseVectorStore instance
 */
export async function getVectorStore(
    config: RunnableConfig,
): Promise<SupabaseVectorStore> {
    const configuration = ensureConfiguration(config);
    const embeddingModel = makeTextEmbeddings(configuration.embeddingModel);
    const client = createSupabaseClient();

    // Create a SupabaseVectorStore instance
    return new SupabaseVectorStore(
        embeddingModel,
        {
            client,
            tableName: TABLE_NAME,
            queryName: "match_documents",
        }
    );
}
