export default {
	input: 'src/index.js',
	external: [ 'path', 'fs', 'builtin-modules', 'resolve', 'browser-resolve', 'is-module' ],
	output: [
		{ file: 'dist/rollup-plugin-node-resolve.cjs.js', format: 'cjs' },
		{ file: 'dist/rollup-plugin-node-resolve.es.js', format: 'es' }
	]
};
