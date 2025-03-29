import {BaseMessage} from "@langchain/core/messages";
import {Document} from "langchain/document";

import {BaseChatModel} from "@langchain/core/language_models/chat_models";
import {initChatModel} from "langchain/chat_models/universal";

export function getMessageText(msg: BaseMessage): string {
    const content = msg.content;
    if (typeof content === "string") {
        return content;
    } else {
        return content.filter((c) => c.type === 'text').join("").trim();
    }
}

/**
 * Load a chat model from a fully specified name.
 * @param fullySpecifiedName - String in the format 'provider/model' or 'provider/account/provider/model'.
 * @returns A Promise that resolves to a BaseChatModel instance.
 */
export async function loadChatModel(
    fullySpecifiedName: string,
): Promise<BaseChatModel> {
    const index = fullySpecifiedName.indexOf("/");
    if (index === -1) {
        // If there's no "/", assume it's just the model
        return await initChatModel(fullySpecifiedName);
    } else {
        const provider = fullySpecifiedName.slice(0, index);
        const model = fullySpecifiedName.slice(index + 1);
        return await initChatModel(model, {modelProvider: provider});
    }
}
