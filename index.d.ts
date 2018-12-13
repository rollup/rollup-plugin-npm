import { Plugin } from "rollup";
import { AsyncOpts } from "resolve"

interface RollupNodeResolveOptions {
    /**
     * use "module" field for ES6 module if possible
     * @default true
     */
    module?: boolean;
    /**
     * use "jsnext:main" if possible
     * legacy field pointing to ES6 module in third-party libraries,
     * deprecated in favor of "pkg.module":
     * - see: https://github.com/rollup/rollup/wiki/pkg.module
     * @default false
     */
    jsnext?: boolean;
    /**
     * use "main" field or index.js, even if it's not an ES6 module
     * (needs to be converted from CommonJS to ES6)
     * – see https://github.com/rollup/rollup-plugin-commonjs
     * @default true
     */
    main?: boolean;
    /**
     * some package.json files have a `browser` field which
     * specifies alternative files to load for people bundling
     * for the browser. If that's you, use this option, otherwise
     * pkg.browser will be ignored
     * @default false
     */
    browser?: boolean;
    /**
     * not all files you want to resolve are .js files
     * @default [ '.mjs', '.js', '.json', '.node' ]
     */
    extensions?: ReadonlyArray<string>;
    /**
     * whether to prefer built-in modules (e.g. `fs`, `path`) or
     * local ones with the same names
     * @default true
     */
    preferBuiltins?: boolean;
    /**
     * Lock the module search in this path (like a chroot). Module defined
     * outside this path will be marked as external
     * @default '/'
     */
    jail?: string;
    /**
     * Set to an array of strings and/or regexps to lock the module search
     * to modules that match at least one entry. Modules not matching any
     * entry will be marked as external
     * @default null
     */
    only?: ReadonlyArray<string> | null;
    /**
     * If true, inspect resolved files to check that they are
     * ES2015 modules
     * @default false
     */
    modulesOnly?: boolean;
    /**
     * Any additional options that should be passed through
     * to node-resolve
     */
    customResolveOptions?: AsyncOpts;
}

/**
 * Convert CommonJS modules to ES6, so they can be included in a Rollup bundle
 */
export default function nodeResolve(options?: RollupNodeResolveOptions): Plugin;
