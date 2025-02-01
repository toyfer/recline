import React, { type FC, type JSX } from "react";
import { useChat } from 'ai/react';
import { VscodeButton, VscodeTextarea } from "@vscode-elements/react-elements";

export const ChatView: FC = (): JSX.Element => {
    const { messages, input, handleInputChange, handleSubmit } = useChat();
    return (
        <div className="chat view">
            <h2>Chat</h2>
            <div>
                {messages.map(message => (
                    <div key={message.id}>
                        {/* <div>{message.role === 'user' ? 'User: ' : 'AI: '}</div> */}
                        <div>{message.content}</div>
                    </div>
                ))}

                <form className="chat-input-row" onSubmit={handleSubmit}>
                    <VscodeTextarea
                        className="chat-input" value={input}
                        onChange={(e: Event) => handleInputChange(e as any)}
                        placeholder="Type a message..."
                    />
                    <VscodeButton className="chat-button" type="submit">Send</VscodeButton>
                </form>
            </div>
        </div>
    );
};
