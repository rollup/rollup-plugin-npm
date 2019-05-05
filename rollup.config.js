import babel from 'rollup-plugin-babel';

export default {
	input: 'src/index.js',
	plugins: [ babel() ],
	external: [ 'path', 'fs', 'builtin-modules', 'resolve', 'browser-resolve', 'is-module', 'util' ],
	output: [
		{ file: 'dist/rollup-plugin-node-resolve.cjs.js', format: 'cjs' },
		{ file: 'dist/rollup-plugin-node-resolve.es.js', format: 'es' }
	]
};
