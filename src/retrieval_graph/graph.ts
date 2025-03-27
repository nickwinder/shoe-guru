import {RunnableConfig} from "@langchain/core/runnables";
import {StateGraph} from "@langchain/langgraph";
import {ConfigurationAnnotation, ensureConfiguration,} from "./configuration";
import {InputStateAnnotation, StateAnnotation} from "./state";
import {formatDocs, getMessageText, loadChatModel} from "./utils";
import {z} from "zod";
import {getVectorStore as getHNSWVectorStore} from "./retrievers/retrieval";
import {getVectorStore as getPgVectorStore} from "./retrievers/pgvector-retrieval";
import * as events from "node:events";
import {Prisma, PrismaClient, Shoe, ShoeGender, ShoeReview} from "@prisma/client";
import {ScoreThresholdRetriever} from "langchain/retrievers/score_threshold";
import {applyRecencyBias} from "./retrievers/utils";

events.EventEmitter.defaultMaxListeners = 1000;

const prisma = new PrismaClient();

const SearchQuery = z.object({
    query: z.string().describe("Search the indexed documents for a query."),
});

// Define a schema for structured output of shoe search conditions
const ShoeSearchConditions = z.object({
    // Basic text search
    keywords: z.array(z.string()).describe("Keywords to search for in shoe names, brands, etc.").optional(),

    // Specific numeric filters
    forefootStackHeightMm: z.union([z.object({
        min: z.number().optional(),
        max: z.number().optional(),
        sort: z.enum(["asc", "desc"]).optional(),
    }), z.literal('empty')]),

    heelStackHeightMm: z.union([z.object({
        min: z.number().optional(),
        max: z.number().optional(),
        sort: z.enum(["asc", "desc"]).optional(),
    }), z.literal('empty')]),

    drop: z.union([z.object({
        min: z.number().optional(),
        max: z.number().optional(),
        sort: z.enum(["asc", "desc"]).optional(),
    }), z.literal('empty')]),

    // String filters
    width: z.union([z.string(), z.literal('empty')]),
    depth: z.union([z.string(), z.literal('empty')]),
    intendedUse: z.union([z.enum(['road', 'trail']), z.literal('empty')]),
    gender: z.union([z.string(), z.literal('empty')]),

    // Sorting
    sortBy: z.enum(["forefootStackHeightMm", "heelStackHeightMm"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),

    // Limit
    limit: z.number().optional()
});

async function generateQuery(
    state: typeof StateAnnotation.State,
    config?: RunnableConfig,
): Promise<typeof StateAnnotation.Update> {
    const messages = state.messages;

    // Check if there are any messages
    if (!messages || messages.length === 0) {
        console.log("No messages found, returning empty query");
        return {queries: []};
    }

    const configuration = ensureConfiguration(config);

    let queries = state.queries || [];
    if (messages.length === 1) {
        const humanInput = getMessageText(messages[messages.length - 1]);
        queries = [humanInput];
    }

    // Format the shoe data for inclusion in the prompt
    const shoeData = formatShoeData(state.relevantShoes || []);

    // Feel free to customize the prompt, model, and other logic!
    let systemMessage = configuration.querySystemPromptTemplate
        .replace("{queries}", queries.join("\n- "))
        .replace("{systemTime}", new Date().toISOString())
        .replace("{shoes}", shoeData);

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

async function fetchShoeData(
    state: typeof StateAnnotation.State,
    config: RunnableConfig,
): Promise<typeof StateAnnotation.Update> {
    // Use the last user message instead of a generated query
    const messages = state.messages;

    // Check if there are any messages
    if (!messages || messages.length === 0) {
        console.log("No messages found, returning empty shoe data");
        return {relevantShoes: []};
    }

    const query = getMessageText(messages[messages.length - 1]);
    console.log(`Fetching shoe data for user message: ${query}`);

    // Get configuration
    const configuration = ensureConfiguration(config);

    try {
        // Use a language model to parse the natural language query
        const systemPrompt = `
You are a shoe search assistant that converts natural language queries into structured search parameters.
Your task is to extract search conditions from the user's query about shoes.

Available shoe attributes:
- forefootStackHeightMm: The height of the shoe's sole at the forefoot in millimeters. (optional)
- heelStackHeightMm: The height of the shoe's sole at the heel in millimeters. (optional)
- drop: The difference between heel and forefoot stack heights. (optional)
- width: The width of the shoe (narrow, standard, wide) (optional)
- depth: The depth of the shoe (low, medium, high) (optional)
- intendedUse: What the shoe is designed for (road, trail, race, etc.) (optional)
- gender: The gender the shoe is designed for (men, women, unisex) (optional)

Examples:
- "Show me shoes with zero drop" → heelStackHeightMm and forefootStackHeightMm are equal
- "What are the highest stack height shoes?" → heelStackHeightMm.sort = "desc"
- "Find trail running shoes" → intendedUse = "trail"
- "Show me women's shoes with forefoot stack height under 20mm" → gender = "women", forefootStackHeightMm.max = 20
- "What are the lowest stack height shoes?" → forefootStackHeightMm.sort = "asc"

Extract only the parameters that are explicitly mentioned or implied in the query.
`;

        // Create a chat model with structured output
        const model = (await loadChatModel(configuration.responseModel))
            .withStructuredOutput(ShoeSearchConditions);

        // Invoke the model with the user's query
        const searchConditions = await model.invoke([
            {role: "system", content: systemPrompt},
            {role: "user", content: query}
        ]);

        // Build Prisma query from the structured output
        let whereConditions: Prisma.ShoeWhereInput[] = [];
        const orderBy: any[] = [];

        // Process keywords for text search
        if (searchConditions.keywords && searchConditions.keywords.length > 0) {
            const keywordConditions = searchConditions.keywords.map(keyword => ({
                OR: [
                    {model: {contains: keyword, mode: 'insensitive' as Prisma.QueryMode}},
                    {brand: {contains: keyword, mode: 'insensitive' as Prisma.QueryMode}},
                    {intendedUse: {contains: keyword, mode: 'insensitive' as Prisma.QueryMode}},
                    {ShoeGender: {some: {gender: {contains: keyword, mode: 'insensitive' as Prisma.QueryMode}}}},
                    {
                        reviews: {
                            some: {
                                OR: [
                                    {fit: {contains: keyword, mode: 'insensitive' as Prisma.QueryMode}},
                                    {feel: {contains: keyword, mode: 'insensitive' as Prisma.QueryMode}},
                                    {durability: {contains: keyword, mode: 'insensitive' as Prisma.QueryMode}}
                                ]
                            }
                        }
                    }
                ]
            }));
            whereConditions.push({OR: keywordConditions});
        }

        // Process forefoot stack height conditions
        if (typeof searchConditions.forefootStackHeightMm !== 'string') {
            const forefootStackHeight = searchConditions.forefootStackHeightMm;
            const forefootStackHeightCondition: any = {};

            if (forefootStackHeight.min !== undefined) {
                forefootStackHeightCondition.gte = forefootStackHeight.min;
            }
            if (forefootStackHeight.max !== undefined) {
                forefootStackHeightCondition.lte = forefootStackHeight.max;
            }

            if (Object.keys(forefootStackHeightCondition).length > 0) {
                whereConditions.push({forefootStackHeightMm: forefootStackHeightCondition});
            }

            if (forefootStackHeight.sort) {
                orderBy.push({forefootStackHeightMm: forefootStackHeight.sort});
            }
        }

        // Process heel stack height conditions
        if (typeof searchConditions.heelStackHeightMm !== 'string') {
            const heelStackHeight = searchConditions.heelStackHeightMm;
            const heelStackHeightCondition: any = {};

            if (heelStackHeight.min !== undefined) {
                heelStackHeightCondition.gte = heelStackHeight.min;
            }
            if (heelStackHeight.max !== undefined) {
                heelStackHeightCondition.lte = heelStackHeight.max;
            }

            if (Object.keys(heelStackHeightCondition).length > 0) {
                whereConditions.push({heelStackHeightMm: heelStackHeightCondition});
            }

            if (heelStackHeight.sort) {
                orderBy.push({heelStackHeightMm: heelStackHeight.sort});
            }
        }

        // Process drop conditions
        if (typeof searchConditions.drop !== 'string') {
            const drop = searchConditions.drop;

            // Since drop is calculated as heelStackHeightMm - forefootStackHeightMm,
            // we need to use appropriate Prisma queries to filter by drop
            if (drop.min !== undefined || drop.max !== undefined || drop.sort) {
                // Add conditions to filter out null values
                whereConditions.push({
                    AND: [
                        {heelStackHeightMm: {not: null}},
                        {forefootStackHeightMm: {not: null}}
                    ]
                });

                // Create a subquery for each shoe to filter by drop value
                if (drop.min !== undefined) {
                    // For a minimum drop of X, we need shoes where heelStackHeightMm - forefootStackHeightMm >= X
                    // We can use multiple OR conditions to cover different forefoot stack height ranges
                    const minDropConditions: Prisma.ShoeWhereInput[] = [];
                    const forefootMin = typeof searchConditions.forefootStackHeightMm !== 'string' && searchConditions.forefootStackHeightMm.min ? searchConditions.forefootStackHeightMm.min : 10
                    const forefootMax = typeof searchConditions.forefootStackHeightMm !== 'string' && searchConditions.forefootStackHeightMm.max ? searchConditions.forefootStackHeightMm.max : 40
                    let dropDiff = (drop.max || drop.min) - drop.min;
                    if (dropDiff === 0) dropDiff = 1;

                    // For forefoot stack heights from 0-50mm (covering typical range)
                    // Create conditions for each possible forefoot stack height
                    for (let forefoot = forefootMin; forefoot <= forefootMax; forefoot += dropDiff) {
                        minDropConditions.push({
                            AND: [
                                {forefootStackHeightMm: {equals: forefoot}},
                                {heelStackHeightMm: {gte: forefoot + drop.min}}
                            ]
                        });
                    }

                    whereConditions.push({OR: minDropConditions});
                }

                if (drop.max !== undefined) {
                    // For a maximum drop of Y, we need shoes where heelStackHeightMm - forefootStackHeightMm <= Y
                    // We can use multiple OR conditions to cover different forefoot stack height ranges
                    const maxDropConditions: Prisma.ShoeWhereInput[] = [];
                    const forefootMin = typeof searchConditions.forefootStackHeightMm !== 'string' && searchConditions.forefootStackHeightMm.min ? searchConditions.forefootStackHeightMm.min : 10
                    const forefootMax = typeof searchConditions.forefootStackHeightMm !== 'string' && searchConditions.forefootStackHeightMm.max ? searchConditions.forefootStackHeightMm.max : 40
                    let dropDiff = drop.max - (drop.min || 0);
                    if (dropDiff === 0) dropDiff = 1;

                    // For forefoot stack heights from 0-50mm (covering typical range)
                    // Create conditions for each possible forefoot stack height
                    for (let forefoot = forefootMin; forefoot <= forefootMax; forefoot += dropDiff) {
                        maxDropConditions.push({
                            AND: [
                                {forefootStackHeightMm: {equals: forefoot}},
                                {heelStackHeightMm: {lte: forefoot + drop.max}}
                            ]
                        });
                    }

                    whereConditions.push({OR: maxDropConditions});
                }
            }
        }

        // Process string filters
        if (searchConditions.width && searchConditions.width !== 'empty') {
            whereConditions.push({width: {contains: searchConditions.width, mode: 'insensitive' as Prisma.QueryMode}});
        }

        if (searchConditions.depth && searchConditions.depth !== 'empty') {
            whereConditions.push({depth: {contains: searchConditions.depth, mode: 'insensitive' as Prisma.QueryMode}});
        }

        if (searchConditions.intendedUse && searchConditions.intendedUse !== 'empty') {
            whereConditions.push({
                intendedUse: {
                    contains: searchConditions.intendedUse,
                    mode: 'insensitive' as Prisma.QueryMode
                }
            });
        }

        if (searchConditions.gender && searchConditions.gender !== 'empty') {
            whereConditions.push({
                ShoeGender: {
                    some: {
                        gender: {
                            contains: searchConditions.gender,
                            mode: 'insensitive' as Prisma.QueryMode
                        }
                    }
                }
            });
        }

        // Add global sorting if specified
        if (searchConditions.sortBy && searchConditions.sortOrder) {
            orderBy.push({[searchConditions.sortBy]: searchConditions.sortOrder});
        }

        // Query the database with the constructed conditions
        let shoes: Array<Shoe & { ShoeGender: ShoeGender[], reviews: ShoeReview[] }> = [];

        // Only search if we have conditions
        if (whereConditions.length > 0) {
            const limit = Math.min(searchConditions.limit || 5, 5);

            // Query the database for shoes that match the search conditions
            shoes = await prisma.shoe.findMany({
                where: whereConditions.length > 0 ? {AND: whereConditions} : undefined,
                orderBy: orderBy.length > 0 ? orderBy : undefined,
                include: {
                    ShoeGender: true,
                    reviews: true
                },
                take: limit
            });
        }

        // Apply drop sorting if needed
        if (searchConditions.drop && typeof searchConditions.drop !== 'string' && searchConditions.drop.sort && shoes.length > 0) {
            console.log(`Applying drop sorting: ${searchConditions.drop.sort}`);
            const sort = searchConditions.drop.sort;

            // Sort by drop if requested
            shoes.sort((a, b) => {
                const dropA = a.heelStackHeightMm! - a.forefootStackHeightMm!;
                const dropB = b.heelStackHeightMm! - b.forefootStackHeightMm!;

                return sort === 'asc' ? dropA - dropB : dropB - dropA;
            });

            console.log(`Shoes sorted by drop: ${searchConditions.drop.sort}`);
        }

        console.log(`Found ${shoes.length} relevant shoes`);
        if (shoes.length > 0) {
            console.log("Shoes:", shoes.map(shoe => shoe.model));
        }
        return {relevantShoes: shoes};
    } catch (error) {
        console.error("Error parsing natural language query:", error);

        // Fallback to the original keyword-based approach
        // Extract potential keywords from the query
        const keywords = query.toLowerCase().split(/\s+/).filter(word =>
            word.length > 3 &&
            !['what', 'which', 'where', 'when', 'how', 'that', 'this', 'with', 'from', 'have', 'your'].includes(word)
        );

        // Create search conditions for each keyword
        const searchConditions: Prisma.ShoeWhereInput[] = keywords.map(keyword => ({
            OR: [
                {model: {contains: keyword, mode: 'insensitive' as Prisma.QueryMode}},
                {brand: {contains: keyword, mode: 'insensitive' as Prisma.QueryMode}},
                {intendedUse: {contains: keyword, mode: 'insensitive' as Prisma.QueryMode}},
                {ShoeGender: {some: {gender: {contains: keyword, mode: 'insensitive' as Prisma.QueryMode}}}},
                {
                    reviews: {
                        some: {
                            OR: [
                                {fit: {contains: keyword, mode: 'insensitive' as Prisma.QueryMode}},
                                {feel: {contains: keyword, mode: 'insensitive' as Prisma.QueryMode}},
                                {durability: {contains: keyword, mode: 'insensitive' as Prisma.QueryMode}}
                            ]
                        }
                    }
                }
            ]
        }));

        // Only search if we have keywords
        let shoes: Array<Shoe & { ShoeGender: ShoeGender[], reviews: ShoeReview[] }> = [];
        if (searchConditions.length > 0) {
            // Query the database for shoes that match any of the search conditions
            shoes = await prisma.shoe.findMany({
                where: {OR: searchConditions},
                include: {
                    ShoeGender: true,
                    reviews: true
                },
                take: 5 // Limit to 5 most relevant shoes
            });
        }

        console.log(`Found ${shoes.length} relevant shoes (using fallback method)`);
        return {relevantShoes: shoes};
    }
}

async function retrieve(
    state: typeof StateAnnotation.State,
    config: RunnableConfig,
): Promise<typeof StateAnnotation.Update> {
    const query = state.queries[state.queries.length - 1];
    const configuration = ensureConfiguration(config);

    // Get the vector store based on the configured provider
    let vectorStore;
    if (configuration.retrieverProvider === "pgvector") {
        vectorStore = await getPgVectorStore(config);
    } else {
        // Default to HNSWLib
        vectorStore = await getHNSWVectorStore(config);
    }

    // Perform similarity search
    let docs = await ScoreThresholdRetriever
        .fromVectorStore(vectorStore, { minSimilarityScore: 0.3 })
        .getRelevantDocuments(query);

    // Apply recency bias if configured
    if (configuration.recencyWeight > 0) {
        docs = applyRecencyBias(docs, configuration.recencyWeight);
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
        if (shoe.forefootStackHeightMm) specs.push(`Forefoot Stack Height: ${shoe.forefootStackHeightMm}mm`);
        if (shoe.heelStackHeightMm) specs.push(`Heel Stack Height: ${shoe.heelStackHeightMm}mm`);
        if (shoe.forefootStackHeightMm && shoe.heelStackHeightMm) {
            const drop = shoe.heelStackHeightMm - shoe.forefootStackHeightMm;
            specs.push(`Drop: ${drop}mm`);
        }
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
        .replace("{systemTime}", new Date().toISOString())
        .replace("{shoes}", shoeData);

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
export const graph = builder.compile({});

graph.name = "Wide Toe Box Graph"; // Customizes the name displayed in LangSmith
