import React, { type FC, type JSX } from "react";

export const WelcomeView: FC = (): JSX.Element => {
    return (
        <div className="view">
            <h1>Recline</h1>
            <p>
                The AI assistant that seamlessly integrates with VSCode to
                autonomously create, edit, and run terminal commands; redefining
                how you code.
            </p>
        </div>
    );
};
