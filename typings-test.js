// @ts-check
import resolve from '.';

/** @type {import("rollup").RollupOptions} */
const config = {
	input: 'main.js',
	output: {
		file: 'bundle.js',
		format: 'iife',
		name: 'MyModule',
	},
	plugins: [
		resolve({
			module: true,
			jsnext: true,
			main: true,
			browser: true,
			extensions: [ '.mjs', '.js', '.jsx', '.json' ],
			preferBuiltins: false,
			jail: '/my/jail/path',
			only: [ 'some_module', /^@some_scope\/.*$/ ],
			modulesOnly: true,
			customResolveOptions: {
				moduleDirectory: 'js_modules'
			}
		})
	]
};

export default config;
