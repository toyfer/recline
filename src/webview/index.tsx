import React from "react";
import ReactDOM from "react-dom";

import { App } from "./layouts/App";
import "./index.css";

const root = document.getElementById("root");

if (root) {
    ReactDOM.render(<App />, root);
}
