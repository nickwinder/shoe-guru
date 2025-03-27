import { NextResponse } from 'next/server';
import { graph } from '../../../retrieval_graph/graph';
import { HumanMessage } from "@langchain/core/messages";
import { getMessageText } from "../../../retrieval_graph/utils";

export async function POST(request: Request) {
  try {
    // Parse the request body to get the user's query
    const body = await request.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Create a user message with the query
    const userMessage = new HumanMessage(query);

    // Invoke the graph with the user message
    const result = await graph.invoke({ 
      messages: [userMessage]
    });

    // Extract the assistant's response from the result
    // The response is the last message in the messages array
    const messages = result.messages;
    const assistantResponse = messages[messages.length - 1];
    const responseText = getMessageText(assistantResponse);

    return NextResponse.json({ response: responseText });
  } catch (error) {
    console.error("Error asking the expert:", error);
    return NextResponse.json(
      { error: 'Failed to get expert response' },
      { status: 500 }
    );
  }
}
