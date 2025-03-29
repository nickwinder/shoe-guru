import {BaseMessage} from "@langchain/core/messages";
import {Annotation, MessagesAnnotation} from "@langchain/langgraph";

/**
 * This narrows the interface with the user.
 */
export const InputStateAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[]>,
});

/**
 * The State defines three things:
 * 1. The structure of the graph's state (which "channels" are available to read/write)
 * 2. The default values for the state's channels
 * 3. The reducers for the state's channels. Reducers are functions that determine how to apply updates to the state.
 * See [Reducers](https://langchain-ai.github.io/langgraphjs/concepts/low_level/#reducers) for more information.
 */
export const StateAnnotation = Annotation.Root({
    /**
     * Stores the conversation messages.
     * @type {BaseMessage[]}
     * @reducer Default reducer that appends new messages to the existing ones.
     * @default An empty array.
     *
     * Nodes can return a list of "MessageLike" objects, which can be LangChain messages
     * or dictionaries following a common message format.
     *
     * To delete messages, use RemoveMessage.
     * @see https://langchain-ai.github.io/langgraphjs/how-tos/delete-messages/
     *
     * For more information, see:
     * @see https://langchain-ai.github.io/langgraphjs/reference/variables/langgraph.MessagesAnnotation.html
     */
    ...MessagesAnnotation.spec,
});
