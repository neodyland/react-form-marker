import { build } from "esbuild";
import { minify } from "terser";
import { writeFile, rm, readFile } from "node:fs/promises";

await rm("dist", { recursive: true });

const shared = {
    bundle: true,
    entryPoints: ["src/index.ts"],
    packages: "external",
    logLevel: "info",
    minify: true,
    sourcemap: false,
};

await build({
    ...shared,
    outfile: "dist/index.js",
    format: "cjs",
});

await build({
    ...shared,
    outfile: "dist/index.mjs",
    format: "esm",
});

const cjs = await minify(
    await readFile("dist/index.js", { encoding: "utf-8" }),
    {
        mangle: true,
        compress: true,
        format: {
            comments: false,
        },
    },
);

const esm = await minify(
    await readFile("dist/index.mjs", { encoding: "utf-8" }),
    {
        mangle: true,
        compress: true,
        format: {
            comments: false,
        },
        module: true,
    },
);

if (cjs.code && esm.code) {
    await writeFile("dist/index.js", cjs.code);
    await writeFile("dist/index.mjs", esm.code);
}
