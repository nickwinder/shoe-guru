import { NextRequest, NextResponse } from 'next/server';
import { LangChainAdapter } from 'ai';
import { graph } from '../lib/retrieval_graph/graph';
import { getMessageText } from "../lib/retrieval_graph/utils";
import { HumanMessage } from '@langchain/core/messages'

export async function POST(request: NextRequest) {
  try {
    // Parse the request body to get the user's query
    const body = await request.json();
    const { show_intermediate_steps, prompt } = body;

    if (show_intermediate_steps) {
      // If intermediate steps are requested, use the standard invoke method
      const result = await graph.invoke({ 
        messages: [new HumanMessage(prompt)]
      });

      // Extract the assistant's response from the result
      // The response is the last message in the messages array
      const messages = result.messages;
      const assistantResponse = messages[messages.length - 1];
      const responseText = getMessageText(assistantResponse);

      return NextResponse.json({ responseText });
    } else {
      // Stream the response
      const eventStream = graph.streamEvents(
        { messages: [new HumanMessage(prompt)] },
        { version: "v2" }
      );

      return LangChainAdapter.toDataStreamResponse(eventStream);
    }
  } catch (error) {
    console.error("Error asking the expert:", error);
    return NextResponse.json(
      { error: 'Failed to get expert response' },
      { status: 500 }
    );
  }
}
