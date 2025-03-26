import {RunnableConfig} from "@langchain/core/runnables";
import {StateGraph} from "@langchain/langgraph";
import {ConfigurationAnnotation, ensureConfiguration,} from "./configuration";
import {InputStateAnnotation, StateAnnotation} from "./state";
import {formatDocs, getMessageText, loadChatModel} from "./utils";
import {z} from "zod";
import {getVectorStore} from "./retrieval";
import * as events from "node:events";
import {PrismaClient, Shoe, ShoeGender, ShoeReview, Prisma} from "@prisma/client";

events.EventEmitter.defaultMaxListeners = 1000;

// Initialize Prisma client
const prisma = new PrismaClient();

const SearchQuery = z.object({
    query: z.string().describe("Search the indexed documents for a query."),
});

async function generateQuery(
    state: typeof StateAnnotation.State,
    config?: RunnableConfig,
): Promise<typeof StateAnnotation.Update> {
    const messages = state.messages;

    // Check if there are any messages
    if (!messages || messages.length === 0) {
        console.log("No messages found, returning empty query");
        return { queries: [] };
    }

    if (messages.length === 1) {
        // It's the first user question. We will use the input directly to search.
        const humanInput = getMessageText(messages[messages.length - 1]);
        return {queries: [humanInput]};
    } else {
        const configuration = ensureConfiguration(config);

        // Format the shoe data for inclusion in the prompt
        const shoeData = formatShoeData(state.relevantShoes || []);

        // Feel free to customize the prompt, model, and other logic!
        let systemMessage = configuration.querySystemPromptTemplate
            .replace("{queries}", (state.queries || []).join("\n- "))
            .replace("{systemTime}", new Date().toISOString());

        // Add shoe data to the system message
        systemMessage += "\n\n<shoe_data>\n" + shoeData + "\n</shoe_data>";

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

async function fetchShoeData(
    state: typeof StateAnnotation.State,
    config: RunnableConfig,
): Promise<typeof StateAnnotation.Update> {
    // Use the last user message instead of a generated query
    const messages = state.messages;

    // Check if there are any messages
    if (!messages || messages.length === 0) {
        console.log("No messages found, returning empty shoe data");
        return { relevantShoes: [] };
    }

    const query = getMessageText(messages[messages.length - 1]);
    console.log(`Fetching shoe data for user message: ${query}`);

    // Extract potential keywords from the query
    const keywords = query.toLowerCase().split(/\s+/).filter(word => 
        word.length > 3 && 
        !['what', 'which', 'where', 'when', 'how', 'that', 'this', 'with', 'from', 'have', 'your'].includes(word)
    );

    // Create search conditions for each keyword
    const searchConditions: Prisma.ShoeWhereInput[] = keywords.map(keyword => ({
        OR: [
            { model: { contains: keyword, mode: 'insensitive' } },
            { brand: { contains: keyword, mode: 'insensitive' } },
            { intendedUse: { contains: keyword, mode: 'insensitive' } },
            { ShoeGender: { some: { gender: { contains: keyword, mode: 'insensitive' } } } },
            { reviews: { some: { 
                OR: [
                    { fit: { contains: keyword, mode: 'insensitive' } },
                    { feel: { contains: keyword, mode: 'insensitive' } },
                    { durability: { contains: keyword, mode: 'insensitive' } }
                ]
            } } }
        ]
    }));

    // Only search if we have keywords
    let shoes: Array<Shoe & { ShoeGender: ShoeGender[], reviews: ShoeReview[] }> = [];
    if (searchConditions.length > 0) {
        // Query the database for shoes that match any of the search conditions
            shoes = await prisma.shoe.findMany({
                where: { OR: searchConditions },
                include: {
                    ShoeGender: true,
                    reviews: true
                },
                take: 5 // Limit to 5 most relevant shoes
            });
    }

    console.log(`Found ${shoes.length} relevant shoes`);
    return { relevantShoes: shoes as Array<Shoe & { ShoeGender: ShoeGender[], reviews: ShoeReview[] }> };
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

/**
 * Format shoe data for inclusion in the prompt
 * @param shoes Array of shoes with related data
 * @returns Formatted string representation of the shoes
 */
function formatShoeData(shoes: Array<any>): string {
    if (!shoes || shoes.length === 0) {
        return "No relevant shoes found in the database.";
    }

    return shoes.map(shoe => {
        // Format basic shoe info
        let shoeInfo = `## ${shoe.brand} ${shoe.model}\n`;

        // Add specifications if available
        const specs = [];
        if (shoe.stackHeightMm) specs.push(`Stack Height: ${shoe.stackHeightMm}mm`);
        if (shoe.heelToToeDropMm) specs.push(`Drop: ${shoe.heelToToeDropMm}mm`);
        if (shoe.width) specs.push(`Width: ${shoe.width}`);
        if (shoe.depth) specs.push(`Depth: ${shoe.depth}`);
        if (shoe.intendedUse) specs.push(`Intended Use: ${shoe.intendedUse}`);

        if (specs.length > 0) {
            shoeInfo += "### Specifications\n";
            shoeInfo += specs.map(spec => `- ${spec}`).join("\n") + "\n";
        }

        // Add gender-specific information
        if (shoe.ShoeGender && shoe.ShoeGender.length > 0) {
            shoeInfo += "### Available Versions\n";
            shoe.ShoeGender.forEach((version: ShoeGender) => {
                shoeInfo += `- ${version.gender} version`;
                if (version.price) shoeInfo += `, Price: $${version.price}`;
                if (version.weightGrams) shoeInfo += `, Weight: ${version.weightGrams}g`;
                shoeInfo += `\n`;
            });
        }

        // Add reviews if available
        if (shoe.reviews && shoe.reviews.length > 0) {
            shoeInfo += "### Reviews\n";
            shoe.reviews.forEach((review: ShoeReview) => {
                if (review.fit) shoeInfo += `- Fit: ${review.fit}\n`;
                if (review.feel) shoeInfo += `- Feel: ${review.feel}\n`;
                if (review.durability) shoeInfo += `- Durability: ${review.durability}\n`;
            });
        }

        return shoeInfo;
    }).join("\n\n");
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

    // Format the shoe data
    const shoeData = formatShoeData(state.relevantShoes || []);

    // Feel free to customize the prompt, model, and other logic!
    let systemMessage = configuration.responseSystemPromptTemplate
        .replace("{retrievedDocs}", retrievedDocs)
        .replace("{systemTime}", new Date().toISOString());

    // Add shoe data to the system message
    systemMessage = systemMessage.replace("</retrieved_docs>", "</retrieved_docs>\n\n<shoe_data>\n" + shoeData + "\n</shoe_data>");

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
    .addNode("fetchShoeData", fetchShoeData)
    .addNode("generateQuery", generateQuery)
    .addNode("retrieve", retrieve)
    .addNode("respond", respond)
    .addEdge("__start__", "fetchShoeData")
    .addEdge("fetchShoeData", "generateQuery")
    .addEdge("generateQuery", "retrieve")
    .addEdge("retrieve", "respond");

// Finally, we compile it!
// This compiles it into a graph you can invoke and deploy.
export const graph = builder.compile({
    interruptBefore: [], // if you want to update the state before calling the tools
    interruptAfter: [],
});

graph.name = "Wide Toe Box Graph"; // Customizes the name displayed in LangSmith
