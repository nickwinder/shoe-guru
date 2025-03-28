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
        { 
          version: "v2",
        }
      );

      // Filter the event stream to only include events with the 'respond' tag
      const filteredStream = new ReadableStream({
        async start(controller) {
          const reader = eventStream.getReader();

          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                controller.close();
                break;
              }

              // Only pass through events with the 'respond' tag
              if (value.tags && value.tags.includes('respond')) {
                controller.enqueue(value);
              }
            }
          } catch (error) {
            controller.error(error);
          }
        }
      });

      return LangChainAdapter.toDataStreamResponse(filteredStream);
    }
  } catch (error) {
    console.error("Error asking the expert:", error);
    return NextResponse.json(
      { error: 'Failed to get expert response' },
      { status: 500 }
    );
  }
}
