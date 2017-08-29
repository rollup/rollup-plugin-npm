import buble from 'rollup-plugin-buble';

export default {
	entry: 'src/index.js',
	plugins: [ buble() ],
	external: [ 'path', 'fs', 'builtin-modules', 'enhanced-resolve', 'is-module' ],
	targets: [
		{ dest: 'dist/rollup-plugin-node-resolve.cjs.js', format: 'cjs' },
		{ dest: 'dist/rollup-plugin-node-resolve.es.js', format: 'es' }
	]
};
