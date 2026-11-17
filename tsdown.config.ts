import { defineConfig } from "tsdown";

export default defineConfig([
    // 1. ESM (index.js) & CJS (index.cjs) + clean index.d.ts
    {
        entry: {
            index: "src/index.ts",
        },
        format: ["esm", "cjs"],
        target: "es2022",
        dts: true,
        clean: true,
        minify: false,
        sourcemap: true,
        outExtensions({ format }) {
            if (format === "cjs") return { js: ".cjs", dts: ".d.cts" };
            return { js: ".js", dts: ".d.ts" };
        },
    },
    // 3. UMD Browser Global (index.umd.js -> globalName: "channeljs")
    {
        entry: {
            index: "src/index.ts",
        },
        format: ["umd"],
        globalName: "channeljs",
        target: "es2022",
        dts: false,
        minify: false,
        sourcemap: true,
        outExtensions() {
            return { js: ".js" };
        },
    },
    // 1. ES6 ESM (index.js) & CJS (index.cjs) + clean index.d.ts
    {
        entry: {
            index: "src/index.ts",
        },
        format: ["esm", "cjs"],
        target: "es6",
        dts: true,
        clean: true,
        minify: false,
        sourcemap: true,
        outDir: 'dist/es6/',
        outExtensions({ format }) {
            if (format === "cjs") return { js: ".cjs", dts: ".d.cts" };
            return { js: ".js", dts: ".d.ts" };
        },
    },
    // 3. UMD Browser Global (index.umd.js -> globalName: "channeljs")
    {
        entry: {
            index: "src/index.ts",
        },
        format: ["umd"],
        globalName: "channeljs",
        target: "es6",
        dts: false,
        minify: false,
        sourcemap: true,
        outDir: 'dist/es6/',
        outExtensions() {
            return { js: ".js" };
        },
    }
]);
