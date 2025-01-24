import React, { type JSX, type FC } from "react";
import { MemoryRouter, Route, Routes } from "react-router";

import { WelcomeView } from "@webview/views/WelcomeView";

export const App: FC = (): JSX.Element => {
    return (
        <MemoryRouter>
            <Routes>
                <Route path="/" element={<WelcomeView />} />
            </Routes>
        </MemoryRouter>
    );
};
