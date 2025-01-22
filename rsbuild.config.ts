import { defineConfig } from "@rsbuild/core";
import { pluginPreact } from "@rsbuild/plugin-preact";

// biome-ignore lint/style/noDefaultExport: Bundler config file
export default defineConfig({
    resolve: {
        alias: {
            "@extension": "./src/extension",
            "@webview": "./src/webview"
        }
    },
    output: {
        externals: ["vscode"]
    },
    performance: {
        chunkSplit: {
            strategy: "all-in-one"
        }
    },
    environments: {
        extension: {
            source: {
                entry: {
                    index: "./src/extension/index.ts"
                }
            },
            output: {
                target: "node",
                filename: {
                    js: "extension.js"
                },
                distPath: {
                    root: "dist",
                    js: "",
                    jsAsync: "",
                    css: "css",
                    cssAsync: "css",
                    svg: "imgs",
                    font: "fonts",
                    html: "",
                    wasm: "wasm",
                    image: "imgs",
                    media: "assets",
                    assets: "assets"
                }
            }
        },
        webview: {
            source: {
                entry: {
                    index: "./src/webview/index.tsx"
                }
            },
            output: {
                emitCss: true,
                assetPrefix: ".",
                filename: {
                    js: "webview.js",
                    css: "webview.css"
                },
                distPath: {
                    root: "dist",
                    js: "",
                    jsAsync: "",
                    css: "",
                    cssAsync: "",
                    svg: "",
                    font: "",
                    html: "",
                    wasm: "",
                    image: "",
                    media: "",
                    assets: "assets"
                }
            },
            plugins: [
                pluginPreact({
                    reactAliasesEnabled: true
                })
            ],
            tools: {
                htmlPlugin: false,
                rspack: {
                    target: "electron-renderer"
                }
            }
        }
    },
    tools: {
        rspack: {
            output: {
                asyncChunks: false
            }
        },
        bundlerChain: (chain): void => {
            chain.module
                .rule("RULE.WASM")
                .test(/tree-sitter(?:-.+)?\.wasm$/)
                .type("asset/resource");
        }
    }
});
