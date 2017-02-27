const path = require( 'path' );
const assert = require( 'assert' );
const rollup = require( 'rollup' );
const commonjs = require( 'rollup-plugin-commonjs' );
const buble = require( 'rollup-plugin-buble' );
const nodeResolve = require( '..' );

process.chdir( __dirname );

function executeBundle ( bundle ) {
	const generated = bundle.generate( {
		format: 'cjs'
	} );

	const fn = new Function ( 'module', 'exports', 'assert', generated.code );
	const module = { exports: {} };

	fn( module, module.exports, assert );

	return module;
}

describe( 'rollup-plugin-node-resolve', function () {
	it( 'finds a module with jsnext:main', function () {
		return rollup.rollup( {
			entry: 'samples/jsnext/main.js',
			plugins: [
				nodeResolve( { jsnext: true } )
			]
		} ).then( executeBundle ).then( module => {
			assert.equal( module.exports, '2H' );
		} );
	} );

	it( 'finds and converts a basic CommonJS module', function () {
		return rollup.rollup( {
			entry: 'samples/commonjs/main.js',
			plugins: [
				nodeResolve( { main: true } ),
				commonjs()
			]
		} ).then( executeBundle ).then( module => {
			assert.equal( module.exports, 'It works!' );
		} );
	} );

	it( 'handles a trailing slash', function () {
		return rollup.rollup( {
			entry: 'samples/trailing-slash/main.js',
			plugins: [
				nodeResolve( { main: true } ),
				commonjs()
			]
		} ).then( executeBundle ).then( module => {
			assert.equal( module.exports, 'It works!' );
		} );
	} );

	it( 'finds a file inside a package directory', function () {
		return rollup.rollup( {
			entry: 'samples/granular/main.js',
			plugins: [
				nodeResolve(),
				buble()
			]
		} ).then( executeBundle ).then( module => {
			assert.equal( module.exports, 'FOO' );
		} );
	} );

	it( 'loads local directories by finding index.js within them', function () {
		return rollup.rollup( {
			entry: 'samples/local-index/main.js',
			plugins: [
				nodeResolve()
			]
		} ).then( executeBundle ).then( module => {
			assert.equal( module.exports, 42 );
		} );
	} );

	it( 'loads package directories by finding index.js within them', function () {
		return rollup.rollup( {
			entry: 'samples/package-index/main.js',
			plugins: [
				nodeResolve()
			]
		} ).then( function ( bundle ) {
			const generated = bundle.generate( {
				format: 'cjs'
			} );

			assert.ok( ~generated.code.indexOf( 'setPrototypeOf' ) );
		} );
	} );

	it( 'allows skipping by package name', function () {
		return rollup.rollup( {
			entry: 'samples/skip/main.js',
			plugins: [
				nodeResolve( {
					main: true,
					skip: [ 'vlq' ]
				} )
			]
		} ).then( function ( bundle ) {
			const generated = bundle.generate( {
				format: 'cjs'
			} );

			assert.ok( generated.code.indexOf( 'encode' ) < 0 );
		} );
	} );

	it( 'disregards top-level browser field by default', function () {
		return rollup.rollup( {
			entry: 'samples/browser/main.js',
			plugins: [
				nodeResolve( {
					main: true,
					browser: false
				} )
			]
		} ).then( executeBundle ).then( module => {
			assert.equal( module.exports, 'node' );
		} );
	} );

	it( 'allows use of the top-level browser field', function () {
		return rollup.rollup( {
			entry: 'samples/browser/main.js',
			plugins: [
				nodeResolve( {
					main: true,
					browser: true
				} )
			]
		} ).then( executeBundle ).then( module => {
			assert.equal( module.exports, 'browser' );
		} );
	} );

	it( 'disregards object browser field by default', function () {
		return rollup.rollup( {
			entry: 'samples/browser-object/main.js',
			plugins: [
				nodeResolve( {
					main: true,
					browser: false
				} )
			]
		} ).then( executeBundle ).then( module => {
			assert.equal( module.exports.env, 'node' );
			assert.equal( module.exports.dep, 'node-dep' );
			assert.equal( module.exports.test, 42 );
		} );
	} );

	it( 'allows use of the object browser field', function () {
		return rollup.rollup( {
			entry: 'samples/browser-object/main.js',
			plugins: [
				nodeResolve( {
					main: true,
					browser: true
				} )
			]
		} ).then( executeBundle ).then( module => {
			assert.equal( module.exports.env, 'browser' );
			assert.equal( module.exports.dep, 'browser-dep' );
			assert.equal( module.exports.test, 43 );
		} );
	} );

	it( 'supports `false` in browser field', function () {
		return rollup.rollup( {
			entry: 'samples/browser-false/main.js',
			plugins: [
				nodeResolve( {
					main: true,
					browser: true
				} )
			]
		} ).then( executeBundle );
	} );

	it( 'skips builtins', function () {
		return rollup.rollup( {
			entry: 'samples/builtins/main.js',
			plugins: [ nodeResolve() ]
		} ).then( bundle => {
			const { code } = bundle.generate( { format: 'cjs' } );
			const fn = new Function ( 'module', 'exports', 'require', code );

			fn( module, module.exports, id => require( id ) );

			assert.equal( module.exports, path.sep );
		} );
	} );

	it( 'allows scoped packages to be skipped', () => {
		return rollup.rollup( {
			entry: 'samples/scoped/main.js',
			plugins: [
				nodeResolve( {
					skip: [ '@scoped/foo' ]
				} )
			]
		} ).then( bundle => {
			assert.deepEqual( bundle.imports.sort(), [ '@scoped/foo' ] );
		} );
	} );

	it( 'skip: true allows all unfound non-jsnext:main dependencies to be skipped without error', () => {
		return rollup.rollup( {
			entry: 'samples/skip-true/main.js',
			plugins: [
				nodeResolve( {
					jsnext: true,
					module: false,
					main: false,
					skip: true
				} )
			]
		} ).then( bundle => {
			assert.deepEqual( bundle.imports.sort(), [ 'legacy', 'missing', 'module' ] );
		} );
	} );

	it( 'skip: true allows all unfound non-module dependencies to be skipped without error', () => {
		return rollup.rollup( {
			entry: 'samples/skip-true/main.js',
			plugins: [
				nodeResolve( {
					jsnext: false,
					module: true,
					main: false,
					skip: true,
					preferBuiltins: false
				} )
			]
		} ).then( bundle => {
			assert.deepEqual( bundle.imports.sort(), [ 'jsnext', 'legacy', 'missing' ] );
		} );
	} );

	it( 'skip: allows for a relative file to be skipped, even if the file doesn\'t exist', () => {
		const externalFile = path.resolve( __dirname, 'samples/skip-nonexistent-relative/nonexistent-relative-dependency.js' );
		return rollup.rollup( {
			entry: 'samples/skip-nonexistent-relative/main.js',
			external: [ externalFile ],
			plugins: [
				nodeResolve( {
					jsnext: true,
					main: false,
					skip: [ externalFile ]
				} )
			]
		} ).then( bundle => {
			assert.deepEqual( bundle.imports.sort(), [ externalFile ] );
		} );
	} );

	it( 'skip: true allows all unfound dependencies to be skipped without error', () => {
		return rollup.rollup( {
			entry: 'samples/skip-true/main.js',
			plugins: [
				nodeResolve( {
					jsnext: false,
					main: false,
					module: false,
					skip: true
				} )
			]
		} ).then( bundle => {
			assert.deepEqual( bundle.imports.sort(), [ 'jsnext', 'legacy', 'missing', 'module' ] );
		} );
	} );

	it( 'preferBuiltins: true allows preferring a builtin to a local module of the same name', () => {
		return rollup.rollup( {
			entry: 'samples/prefer-builtin/main.js',
			plugins: [
				nodeResolve( {
					preferBuiltins: true
				} )
			]
		} ).then( bundle => {
			assert.deepEqual( bundle.imports.sort(), [ 'events' ] );
		} );
	} );

	it( 'preferBuiltins: false allows resolving a local module with the same name as a builtin module', () => {
		return rollup.rollup( {
			entry: 'samples/prefer-builtin/main.js',
			plugins: [
				nodeResolve( {
					preferBuiltins: false
				} )
			]
		} ).then( bundle => {
			assert.deepEqual( bundle.imports.sort(), [] );
		} );
	} );

	it( 'issues a warning when preferring a builtin module without having explicit configuration', () => {
		let warning = null;
		return rollup.rollup( {
			entry: 'samples/prefer-builtin/main.js',
			plugins: [
				nodeResolve( {
					onwarn ( message ) {
						if ( ~message.indexOf( 'prefer' ) ) {
							warning = message;
						}
					}
				} )
			]
		} ).then( () => {
			const localPath = path.join( __dirname, 'node_modules/events/index.js' );
			assert.strictEqual(
				warning,
				`preferring built-in module 'events' over local alternative ` +
				`at '${localPath}', pass 'preferBuiltins: false' to disable this behavior ` +
				`or 'preferBuiltins: true' to disable this warning`
			);
		} );
	} );

	it( 'supports non-standard extensions', () => {
		return rollup.rollup( {
			entry: 'samples/extensions/main.js',
			plugins: [
				nodeResolve( {
					extensions: [ '.js', '.wut' ]
				} )
			]
		} ).then( executeBundle );
	} );

	it( 'ignores IDs with null character', () => {
		return Promise.resolve( nodeResolve().resolveId( '\0someid', 'test.js' ) ).then( result => {
			assert.equal( result, null );
		} );
	} );

	it( 'finds a module with module field', () => {
		return rollup.rollup( {
			entry: 'samples/module/main.js',
			plugins: [
				nodeResolve( { preferBuiltins: false } )
			]
		} ).then( executeBundle ).then( module => {
			assert.equal( module.exports, 'MODULE' );
		} );
	} );

	it( 'prefers module field over jsnext:main and main', () => {
		return rollup.rollup( {
			entry: 'samples/prefer-module/main.js',
			plugins: [
				nodeResolve( { jsnext: true, preferBuiltins: false } )
			]
		} ).then( executeBundle ).then( module => {
			assert.equal( module.exports, 'MODULE-ENTRY' );
		} );
	} );

	it( 'prefers jsnext:main field over main', () => {
		return rollup.rollup( {
			entry: 'samples/prefer-jsnext/main.js',
			plugins: [
				nodeResolve( { jsnext: true, module: false, preferBuiltins: false } )
			]
		} ).then( executeBundle ).then( module => {
			assert.equal( module.exports, 'JSNEXT-ENTRY' );
		} );
	} );

	it( 'supports ./ in entry filename', () => {
		return rollup.rollup( {
			entry: './samples/jsnext/main.js',
			plugins: [
				nodeResolve( { jsnext: true } )
			]
		} ).then( executeBundle ).then( module => {
			assert.equal( module.exports, '2H' );
		} );
	} );

	it( 'throws error if local id is not resolved', () => {
		const entry = 'samples/unresolved-local/main.js';
		return rollup.rollup( {
			entry,
			plugins: [
				nodeResolve()
			]
		} ).then( () => {
			throw Error( 'test should fail' );
		}, err => {
			assert.equal( err.message, 'Could not resolve \'./foo\' from ' + path.resolve( __dirname, entry ) );
		} );
	} );

	it( 'throws error if global id is not resolved', () => {
		const entry = 'samples/unresolved-global/main.js';
		return rollup.rollup( {
			entry,
			plugins: [
				nodeResolve()
			]
		} ).then( () => {
			throw Error( 'test should fail' );
		}, err => {
			assert.equal( err.message, 'Could not resolve \'foo\' from ' + path.resolve( __dirname, entry ) );
		} );
	} );
} );
