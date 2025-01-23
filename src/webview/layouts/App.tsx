import React from "react";
import { MemoryRouter, Route, Routes } from "react-router";

import { WelcomeView } from "@webview/views/WelcomeView";

export const App = () => {
    return (
        <MemoryRouter>
            <Routes>
                <Route path="/" element={<WelcomeView/>} />
            </Routes>
        </MemoryRouter>
    );
};
