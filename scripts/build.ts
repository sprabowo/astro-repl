import esbuild from 'esbuild';
import path from 'path';
import globby from 'globby';
import { WEB_WORKER } from './plugins/worker';
import { rm, mkdir, copyFile } from 'fs/promises';

const ESBUILD_OPTS: esbuild.BuildOptions = {
    target: ["es2018"],
    platform: "browser",
    outdir: "dist/play",

    mainFields: ['esbuild', 'browser', 'module', 'main'],

    assetNames: "[name]",
    entryNames: '[name].min',

    bundle: true,
    minify: true,
    color: true,
    format: "esm",
    sourcemap: true,
    splitting: true,
    keepNames: true,

    loader: {
        '.ttf': 'file',
        '.wasm': 'file'
    },

    inject: ["./scripts/shims/node.js"],

    plugins: [
        WEB_WORKER(),
    ]
};

async function build() {
    const isWatch = !!process.argv.find(arg => arg === '--watch');
    try {
        await rm('dist', { recursive: true });
    } catch (e) {}
    try {
        await mkdir('dist/play', { recursive: true });
    } catch (e) {}
    try {
        const pub = await globby('public/**/*');
        const wasm = ['node_modules/esbuild-wasm/esbuild.wasm', 'node_modules/@astrojs/compiler/astro.wasm'];
        await Promise.all(wasm.map(src => {
            const dest = `dist/play/${path.basename(src)}`;
            return copyFile(src, dest);
        }));
        await Promise.all(pub.map(src => copyFile(src, src.replace(/^public/, path.join('dist', 'play')))))
    } catch (e) {}
    const entryPoints = await globby([
        `src/index.ts`,
        `src/editor/*.ts`,
        `src/@astro/*.ts`,
        `!src/editor/**/*.d.ts`
    ], { absolute: true })

    entryPoints.push(path.resolve(`node_modules/esbuild-wasm/esbuild.wasm`));
    await esbuild.build({
        ...ESBUILD_OPTS,
        entryPoints,
        watch: isWatch,
    });

    await esbuild.build({ 
        ...ESBUILD_OPTS,
        entryPoints: [
            "src/@astro/internal/index.ts"
        ],
        outdir: undefined,
        splitting: false,
        outfile: "dist/play/@astro/internal.js",
    });
}


// Run the build
build();
