import React from "react";
import reactDom from "react-dom";

import { App } from "./layouts/App";
import "./index.css";

const root = document.getElementById("root");

if (root) {
    reactDom.render(<App />, root);
}
