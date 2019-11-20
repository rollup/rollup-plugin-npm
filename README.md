# rollup-plugin-node-resolve

*This plugin used to be called rollup-plugin-npm*

Locate modules using the [Node resolution algorithm](https://nodejs.org/api/modules.html#modules_all_together), for using third party modules in `node_modules`

## Installation

```bash
npm install --save-dev rollup-plugin-node-resolve
```

## Usage

```js
// rollup.config.js
import resolve from 'rollup-plugin-node-resolve';

export default {
  input: 'main.js',
  output: {
    file: 'bundle.js',
    format: 'iife',
    name: 'MyModule'
  },
  plugins: [
    resolve({

      // the fields to scan in a package.json to determine the entry point
      // if this list contains "browser", overrides specified in "pkg.browser"
      // will be used
      mainFields: ['module', 'main'], // Default: ['module', 'main']

      // DEPRECATED: use "mainFields" instead
      // use "module" field for ES6 module if possible
      module: true, // Default: true

      // DEPRECATED: use "mainFields" instead
      // use "jsnext:main" if possible
      // legacy field pointing to ES6 module in third-party libraries,
      // deprecated in favor of "pkg.module":
      // - see: https://github.com/rollup/rollup/wiki/pkg.module
      jsnext: true,  // Default: false

      // DEPRECATED: use "mainFields" instead
      // use "main" field or index.js, even if it's not an ES6 module
      // (needs to be converted from CommonJS to ES6)
      // – see https://github.com/rollup/rollup-plugin-commonjs
      main: true,  // Default: true

      // some package.json files have a "browser" field which specifies
      // alternative files to load for people bundling for the browser. If
      // that's you, either use this option or add "browser" to the
      // "mainfields" option, otherwise pkg.browser will be ignored
      browser: true,  // Default: false

      // not all files you want to resolve are .js files
      extensions: [ '.mjs', '.js', '.jsx', '.json' ],  // Default: [ '.mjs', '.js', '.json', '.node' ]

      // whether to prefer built-in modules (e.g. `fs`, `path`) or
      // local ones with the same names
      preferBuiltins: false,  // Default: true

      // Lock the module search in this path (like a chroot). Module defined
      // outside this path will be marked as external
      jail: '/my/jail/path', // Default: '/'

      // Set to an array of strings and/or regexps to lock the module search
      // to modules that match at least one entry. Modules not matching any
      // entry will be marked as external
      only: [ 'some_module', /^@some_scope\/.*$/ ], // Default: null

      // If true, inspect resolved files to check that they are
      // ES2015 modules
      modulesOnly: true, // Default: false

      // Force resolving for these modules to root's node_modules that helps
      // to prevent bundling the same package multiple times if package is
      // imported from dependencies.
      dedupe: [ 'react', 'react-dom' ], // Default: []

      // Any additional options that should be passed through
      // to node-resolve
      customResolveOptions: {
        moduleDirectory: 'js_modules'
      }
    })
  ]
};
```

## Using with rollup-plugin-commonjs

Since most packages in your node_modules folder are probably legacy CommonJS rather than JavaScript modules, you may need to use [rollup-plugin-commonjs](https://github.com/rollup/rollup-plugin-commonjs):

```js
// rollup.config.js
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default {
  input: 'main.js',
  output: {
    file: 'bundle.js',
    format: 'iife',
    name: 'MyModule'
  },
  plugins: [
    resolve(),
    commonjs()
  ]
};
```

## Resolving Built-Ins (like `fs`)

This plugin won't resolve any builtins (e.g. `fs`). If you need to resolve builtins you can install local modules and set `preferBuiltins` to `false`, or install a plugin like [rollup-plugin-node-builtins](https://github.com/calvinmetcalf/rollup-plugin-node-builtins) which provides stubbed versions of these methods.

If you want to silence warnings about builtins, you can add the list of builtins to the `externals` option; like so:

```js
import resolve from 'rollup-plugin-node-resolve';
import builtins from 'builtin-modules'
export default ({
  input: ...,
  plugins: [resolve()],
  external: builtins,
  output: ...
})
```

## Additional Plugin APIs

In addition to the standard hooks used by Rollup, this plugin exposes additional functionality useful for other plugins.

## getPackageInfoForId (moduleId: string) => PackageInfo

Returns an object with metadata about the package containing the specified module. PackageInfo has the following fields:

* **packageJson**: The package.json file for the package
* **packageJsonPath**: The path to the package.json file
* **root**: The root directory of the package
* **resolvedMainField**: Which main field was used during resolution (see the mainFields option)
* **browserMappedMain**: Whether the browser map was used to resolve the module's entry point
* **resolvedEntrypoint**: The resolved entry point to the module with respect to the mainFields configuration and browser mappings.

This object is populated during the `resolve` hook, so plugins should only depend on this information being present in hooks that run after `resolve`.


## Usage from Other Plugins

`getPackageInfoForId` is exposed as a method on the plugin object along side the other hooks expected of a Rollup plugin.

```js
import resolve from 'rollup-plugin-node-resolve';
const resolve = resolve();

export default ({
  input: ...,
  plugins: [
    resolve(),
    // custom plugin
    {
      transform(code, id) {
        // get package info for this module id
        const info = resolve.getPackageInfoForId(id);

        // if it's the buffer shim, return nothing.
        if (info.packageJson.name === 'buffer') {
          return '';
        }

        return code;
      }
    }
  ],
  output: ...
})
```

If you're writing a standalone plugin, you can get access to the plugin object by pulling it out of the config provided to the `buildStart` hook:

```js

export default function {
  let nodeResolvePlugin;

  function getPackageInfoForId(id) {
    // user config isn't using this plugin
    if (!nodeResolvePlugin) return;

    // user config has an older version without this API
    if (!nodeResolvePlugin.getPackageInfoForId) return;

    return nodeResolvePlugin.getPackageInfoForId(id);
  }

  return {
    buildStart (options) {
      nodeResolvePlugin = options.plugins && options.plugins.filter(p => p.name === 'node-resolve')[0];
    },
    transform (code, id) {
      const info = getPackageInfoForId(id);
      // ...
    }
  }
}
```

## License

MIT
