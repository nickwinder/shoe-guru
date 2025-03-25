import {RunnableConfig} from "@langchain/core/runnables";
import {StateGraph} from "@langchain/langgraph";
import {ConfigurationAnnotation, ensureConfiguration,} from "./configuration";
import {InputStateAnnotation, StateAnnotation} from "./state";
import {formatDocs, getMessageText, loadChatModel} from "./utils";
import {z} from "zod";
import {getVectorStore} from "./retrieval";
import * as events from "node:events";

events.EventEmitter.defaultMaxListeners = 1000;

const SearchQuery = z.object({
    query: z.string().describe("Search the indexed documents for a query."),
});

async function generateQuery(
    state: typeof StateAnnotation.State,
    config?: RunnableConfig,
): Promise<typeof StateAnnotation.Update> {
    const messages = state.messages;
    if (messages.length === 1) {
        // It's the first user question. We will use the input directly to search.
        const humanInput = getMessageText(messages[messages.length - 1]);
        return {queries: [humanInput]};
    } else {
        const configuration = ensureConfiguration(config);
        // Feel free to customize the prompt, model, and other logic!
        const systemMessage = configuration.querySystemPromptTemplate
            .replace("{queries}", (state.queries || []).join("\n- "))
            .replace("{systemTime}", new Date().toISOString());

        const messageValue = [
            {role: "system", content: systemMessage},
            ...state.messages,
        ];
        const model = (
            await loadChatModel(configuration.responseModel)
        ).withStructuredOutput(SearchQuery);

        const generated = await model.invoke(messageValue);
        return {
            queries: [generated.query],
        };
    }
}

async function retrieve(
    state: typeof StateAnnotation.State,
    config: RunnableConfig,
): Promise<typeof StateAnnotation.Update> {
    const query = state.queries[state.queries.length - 1];
    const configuration = ensureConfiguration(config);

    // Get the HNSWLib vector store
    const vectorStore = await getVectorStore(config);

    // Perform similarity search
    let docs = await vectorStore.similaritySearch(query, 10);

    // Apply recency bias if configured
    if (configuration.recencyWeight > 0) {
        console.log(`Applying recency bias with weight: ${configuration.recencyWeight}`);
        const {applyRecencyBias} = await import("./retrieval.js");
        docs = await applyRecencyBias(docs, configuration.recencyWeight);
    }

    return {retrievedDocs: docs};
}

async function respond(
    state: typeof StateAnnotation.State,
    config: RunnableConfig,
): Promise<typeof StateAnnotation.Update> {
    /**
     * Call the LLM powering our "agent".
     */
    const configuration = ensureConfiguration(config);

    const model = await loadChatModel(configuration.responseModel);

    const retrievedDocs = formatDocs(state.retrievedDocs);
    // Feel free to customize the prompt, model, and other logic!
    const systemMessage = configuration.responseSystemPromptTemplate
        .replace("{retrievedDocs}", retrievedDocs)
        .replace("{systemTime}", new Date().toISOString());
    const messageValue = [
        {role: "system", content: systemMessage},
        ...state.messages,
    ];
    const response = await model.invoke(messageValue);
    // We return a list, because this will get added to the existing list
    return {messages: [response]};
}

// Lay out the nodes and edges to define a graph
const builder = new StateGraph(
    {
        stateSchema: StateAnnotation,
        // The only input field is the user
        input: InputStateAnnotation,
    },
    ConfigurationAnnotation,
)
    .addNode("generateQuery", generateQuery)
    .addNode("retrieve", retrieve)
    .addNode("respond", respond)
    .addEdge("__start__", "generateQuery")
    .addEdge("generateQuery", "retrieve")
    .addEdge("retrieve", "respond");

// Finally, we compile it!
// This compiles it into a graph you can invoke and deploy.
export const graph = builder.compile({
    interruptBefore: [], // if you want to update the state before calling the tools
    interruptAfter: [],
});

graph.name = "Wide Toe Box Graph"; // Customizes the name displayed in LangSmith
