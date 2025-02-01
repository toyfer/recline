import React, { type JSX, type FC } from "react";
import { MemoryRouter, Route, Routes } from "react-router";

import { ChatView } from "@webview/views/ChatView";
import { WelcomeView } from "@webview/views/WelcomeView";

export const App: FC = (): JSX.Element => {
    return (
        <MemoryRouter>
            <Routes>
                <Route path="/" element={<ChatView />} />
                <Route path="/welcome" element={<WelcomeView />} />
            </Routes>
        </MemoryRouter>
    );
};
