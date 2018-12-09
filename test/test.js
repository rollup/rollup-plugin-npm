const path = require( 'path' );
const assert = require( 'assert' );
const rollup = require( 'rollup' );
const commonjs = require( 'rollup-plugin-commonjs' );
const buble = require( 'rollup-plugin-buble' );
const nodeResolve = require( '..' );
const fs = require( 'fs' );

process.chdir( __dirname );

function executeBundle ( bundle ) {
	return bundle.generate({
		format: 'cjs'
	}).then( generated => {
		const fn = new Function ( 'module', 'exports', 'assert', generated.code );
		const module = { exports: {} };

		fn( module, module.exports, assert );

		return module;
	});
}

describe( 'rollup-plugin-node-resolve', function () {
	it( 'finds a module with jsnext:main', function () {
		return rollup.rollup({
			input: 'samples/jsnext/main.js',
			plugins: [
				nodeResolve({ jsnext: true })
			]
		}).then( executeBundle ).then( module => {
			assert.equal( module.exports, '2H' );
		});
	});

	it( 'finds and converts a basic CommonJS module', function () {
		return rollup.rollup({
			input: 'samples/commonjs/main.js',
			plugins: [
				nodeResolve({ main: true }),
				commonjs()
			]
		}).then( executeBundle ).then( module => {
			assert.equal( module.exports, 'It works!' );
		});
	});

	it( 'handles a trailing slash', function () {
		return rollup.rollup({
			input: 'samples/trailing-slash/main.js',
			plugins: [
				nodeResolve({ main: true }),
				commonjs()
			]
		}).then( executeBundle ).then( module => {
			assert.equal( module.exports, 'It works!' );
		});
	});

	it( 'finds a file inside a package directory', function () {
		return rollup.rollup({
			input: 'samples/granular/main.js',
			plugins: [
				nodeResolve(),
				buble()
			]
		}).then( executeBundle ).then( module => {
			assert.equal( module.exports, 'FOO' );
		});
	});

	it( 'loads local directories by finding index.js within them', function () {
		return rollup.rollup({
			input: 'samples/local-index/main.js',
			plugins: [
				nodeResolve()
			]
		}).then( executeBundle ).then( module => {
			assert.equal( module.exports, 42 );
		});
	});

	it( 'loads package directories by finding index.js within them', function () {
		return rollup.rollup({
			input: 'samples/package-index/main.js',
			plugins: [
				nodeResolve()
			]
		}).then( function ( bundle ) {
			return bundle.generate({
				format: 'cjs'
			});
		}).then( generated => {
			assert.ok( ~generated.code.indexOf( 'setPrototypeOf' ) );
		});
	});

	it( 'disregards top-level browser field by default', function () {
		return rollup.rollup({
			input: 'samples/browser/main.js',
			plugins: [
				nodeResolve({
					main: true,
					browser: false
				})
			]
		}).then( executeBundle ).then( module => {
			assert.equal( module.exports, 'node' );
		});
	});

	it( 'allows use of the top-level browser field', function () {
		return rollup.rollup({
			input: 'samples/browser/main.js',
			plugins: [
				nodeResolve({
					main: true,
					browser: true
				})
			]
		}).then( executeBundle ).then( module => {
			assert.equal( module.exports, 'browser' );
		});
	});

	it( 'disregards object browser field by default', function () {
		return rollup.rollup({
			input: 'samples/browser-object/main.js',
			plugins: [
				nodeResolve({
					main: true,
					browser: false
				})
			]
		}).then( executeBundle ).then( module => {
			assert.equal( module.exports.env, 'node' );
			assert.equal( module.exports.dep, 'node-dep' );
			assert.equal( module.exports.test, 42 );
		});
	});

	it( 'allows use of the object browser field', function () {
		return rollup.rollup({
			input: 'samples/browser-object/main.js',
			plugins: [
				nodeResolve({
					main: true,
					browser: true
				})
			]
		}).then( executeBundle ).then( module => {
			assert.equal( module.exports.env, 'browser' );
			assert.equal( module.exports.dep, 'browser-dep' );
			assert.equal( module.exports.test, 43 );
		});
	});

	it( 'allows use of object browser field, resolving `main`', function () {
		return rollup.rollup({
			entry: 'samples/browser-object-main/main.js',
			plugins: [
				nodeResolve({
					main: true,
					browser: true
				})
			]
		}).then( executeBundle ).then( module => {
			assert.equal( module.exports.env, 'browser' );
			assert.equal( module.exports.dep, 'browser-dep' );
			assert.equal( module.exports.test, 43 );
		});
	});

	it( 'allows use of object browser field, resolving implicit `main`', function () {
		return rollup.rollup({
			entry: 'samples/browser-object/main-implicit.js',
			plugins: [
				nodeResolve({
					main: true,
					browser: true
				})
			]
		}).then( executeBundle ).then( module => {
			assert.equal( module.exports.env, 'browser' );
		});
	});

	it( 'allows use of object browser field, resolving replaced builtins', function () {
		return rollup.rollup({
			entry: 'samples/browser-object-builtin/main.js',
			plugins: [
				nodeResolve({
					main: true,
					browser: true
				})
			]
		}).then( executeBundle ).then( module => {
			assert.equal( module.exports, 'browser-fs' );
		});
	});

	it( 'allows use of object browser field, resolving nested directories', function () {
		return rollup.rollup({
			entry: 'samples/browser-object-nested/main.js',
			plugins: [
				nodeResolve({
					main: true,
					browser: true
				})
			]
		}).then( executeBundle ).then( module => {
			assert.equal( module.exports.env, 'browser' );
			assert.equal( module.exports.dep, 'browser-dep' );
			assert.equal( module.exports.test, 43 );
		});
	});

	it( 'allows use of object browser field, resolving `main`', function () {
		return rollup.rollup({
			entry: 'samples/browser-object-main/main.js',
			plugins: [
				nodeResolve({
					main: true,
					browser: true
				})
			]
		}).then( executeBundle ).then( module => {
			assert.equal( module.exports.env, 'browser' );
			assert.equal( module.exports.dep, 'browser-dep' );
			assert.equal( module.exports.test, 43 );
		});
	});

	it( 'allows use of object browser field, resolving implicit `main`', function () {
		return rollup.rollup({
			entry: 'samples/browser-object/main-implicit.js',
			plugins: [
				nodeResolve({
					main: true,
					browser: true
				})
			]
		}).then( executeBundle ).then( module => {
			assert.equal( module.exports.env, 'browser' );
		});
	});

	it( 'allows use of object browser field, resolving replaced builtins', function () {
		return rollup.rollup({
			entry: 'samples/browser-object-builtin/main.js',
			plugins: [
				nodeResolve({
					main: true,
					browser: true
				})
			]
		}).then( executeBundle ).then( module => {
			assert.equal( module.exports, 'browser-fs' );
		});
	});

	it( 'allows use of object browser field, resolving nested directories', function () {
		return rollup.rollup({
			entry: 'samples/browser-object-nested/main.js',
			plugins: [
				nodeResolve({
					main: true,
					browser: true
				})
			]
		}).then( executeBundle ).then( module => {
			assert.equal( module.exports.env, 'browser' );
			assert.equal( module.exports.dep, 'browser-dep' );
			assert.equal( module.exports.test, 43 );
		});
	});

	it( 'allows use of object browser field, resolving `main`', function () {
		return rollup.rollup({
			entry: 'samples/browser-object-main/main.js',
			plugins: [
				nodeResolve({
					main: true,
					browser: true
				})
			]
		}).then( executeBundle ).then( module => {
			assert.equal( module.exports.env, 'browser' );
			assert.equal( module.exports.dep, 'browser-dep' );
			assert.equal( module.exports.test, 43 );
		});
	});

	it( 'allows use of object browser field, resolving implicit `main`', function () {
		return rollup.rollup({
			entry: 'samples/browser-object/main-implicit.js',
			plugins: [
				nodeResolve({
					main: true,
					browser: true
				})
			]
		}).then( executeBundle ).then( module => {
			assert.equal( module.exports.env, 'browser' );
		});
	});

	it( 'allows use of object browser field, resolving replaced builtins', function () {
		return rollup.rollup({
			entry: 'samples/browser-object-builtin/main.js',
			plugins: [
				nodeResolve({
					main: true,
					browser: true
				})
			]
		}).then( executeBundle ).then( module => {
			assert.equal( module.exports, 'browser-fs' );
		});
	});

	it( 'allows use of object browser field, resolving nested directories', function () {
		return rollup.rollup({
			entry: 'samples/browser-object-nested/main.js',
			plugins: [
				nodeResolve({
					main: true,
					browser: true
				})
			]
		}).then( executeBundle ).then( module => {
			assert.equal( module.exports.env, 'browser' );
			assert.equal( module.exports.dep, 'browser-dep' );
			assert.equal( module.exports.test, 43 );
		});
	});

	it( 'supports `false` in browser field', function () {
		return rollup.rollup({
			input: 'samples/browser-false/main.js',
			plugins: [
				nodeResolve({
					main: true,
					browser: true
				})
			]
		}).then( executeBundle );
	});

	it( 'preferBuiltins: true allows preferring a builtin to a local module of the same name', () => {
		return rollup.rollup({
			input: 'samples/prefer-builtin/main.js',
			plugins: [
				nodeResolve({
					preferBuiltins: true
				})
			]
		}).then( bundle => {
			assert.deepEqual( bundle.imports.sort(), [ 'events' ] );
		});
	});

	it( 'preferBuiltins: false allows resolving a local module with the same name as a builtin module', () => {
		return rollup.rollup({
			input: 'samples/prefer-builtin/main.js',
			plugins: [
				nodeResolve({
					preferBuiltins: false
				})
			]
		}).then( bundle => {
			assert.deepEqual( bundle.imports.sort(), [] );
		});
	});

	it( 'issues a warning when preferring a builtin module without having explicit configuration', () => {
		let warning = null;
		return rollup.rollup({
			input: 'samples/prefer-builtin/main.js',
			plugins: [
				nodeResolve({
					onwarn ( message ) {
						if ( ~message.indexOf( 'prefer' ) ) {
							warning = message;
						}
					}
				})
			]
		}).then( () => {
			const localPath = path.join(__dirname, 'node_modules/events/index.js');
			assert.strictEqual(
				warning,
				`preferring built-in module 'events' over local alternative ` +
				`at '${localPath}', pass 'preferBuiltins: false' to disable this behavior ` +
				`or 'preferBuiltins: true' to disable this warning`
			);
		});
	});

	it( 'supports non-standard extensions', () => {
		return rollup.rollup({
			input: 'samples/extensions/main.js',
			plugins: [
				nodeResolve({
					extensions: [ '.js', '.wut' ]
				})
			]
		}).then( executeBundle );
	});

	it( 'ignores IDs with null character', () => {
		return Promise.resolve( nodeResolve().resolveId( '\0someid', 'test.js' ) ).then( result => {
			assert.equal( result, null );
		});
	});

	it( 'finds a module with module field', () => {
		return rollup.rollup({
			input: 'samples/module/main.js',
			plugins: [
				nodeResolve({ preferBuiltins: false })
			]
		}).then( executeBundle ).then( module => {
			assert.equal( module.exports, 'MODULE' );
		});
	});

	it( 'prefers module field over jsnext:main and main', () => {
		return rollup.rollup({
			input: 'samples/prefer-module/main.js',
			plugins: [
				nodeResolve({ jsnext: true, preferBuiltins: false })
			]
		}).then( executeBundle ).then( module => {
			assert.equal( module.exports, 'MODULE-ENTRY' );
		});
	});

	it('finds and uses an .mjs module', function () {
		return rollup.rollup({
			input: 'samples/module-mjs/main.js',
			plugins: [
				nodeResolve({ preferBuiltins: false })
			]
		}).then( executeBundle ).then( module => {
			assert.equal( module.exports, 'MODULE-MJS' );
		});
	});

	it('finds and uses a dual-distributed .js & .mjs module', function () {
		return rollup.rollup({
			input: 'samples/dual-cjs-mjs/main.js',
			plugins: [
				nodeResolve({ preferBuiltins: false })
			]
		}).then( executeBundle ).then( module => {
			assert.equal( module.exports, 'DUAL-MJS' );
		});
	});

	describe( 'symlinks', () => {
		function createMissingDirectories () {
			createDirectory( './samples/symlinked/first/node_modules' );
			createDirectory( './samples/symlinked/second/node_modules' );
			createDirectory( './samples/symlinked/third/node_modules' );
		}

		function createDirectory ( pathToDir ) {
			if ( !fs.existsSync( pathToDir ) ) {
				fs.mkdirSync( pathToDir );
			}
		}

		function linkDirectories () {
			fs.symlinkSync('../../second', './samples/symlinked/first/node_modules/second', 'dir');
			fs.symlinkSync('../../third', './samples/symlinked/first/node_modules/third', 'dir');
			fs.symlinkSync('../../third', './samples/symlinked/second/node_modules/third', 'dir');
		}

		function unlinkDirectories () {
			fs.unlinkSync('./samples/symlinked/first/node_modules/second');
			fs.unlinkSync('./samples/symlinked/first/node_modules/third');
			fs.unlinkSync('./samples/symlinked/second/node_modules/third');
		}

		beforeEach( () => {
			createMissingDirectories();
			linkDirectories();
		});

		afterEach( () => {
			unlinkDirectories();
		});

		it( 'resolves symlinked packages', () => {
			return rollup.rollup({
				input: 'samples/symlinked/first/index.js',
				plugins: [
					nodeResolve()
				]
			}).then( executeBundle ).then( module => {
				assert.equal( module.exports.number1, module.exports.number2 );
			});
		});

		it( 'preserves symlinks if `preserveSymlinks` is true', () => {
			return rollup.rollup({
				input: 'samples/symlinked/first/index.js',
				plugins: [
					nodeResolve()
				],
				preserveSymlinks: true
			}).then( executeBundle ).then( module => {
				assert.notEqual( module.exports.number1, module.exports.number2 );
			});
		});
	});

	it( 'prefers jsnext:main field over main', () => {
		return rollup.rollup({
			input: 'samples/prefer-jsnext/main.js',
			plugins: [
				nodeResolve({ jsnext: true, module: false, preferBuiltins: false })
			]
		}).then( executeBundle ).then( module => {
			assert.equal( module.exports, 'JSNEXT-ENTRY' );
		});
	});

	it( 'supports ./ in entry filename', () => {
		return rollup.rollup({
			input: './samples/jsnext/main.js',
			plugins: [
				nodeResolve({ jsnext: true })
			]
		}).then( executeBundle ).then( module => {
			assert.equal( module.exports, '2H' );
		});
	});

	it( 'throws error if local id is not resolved', () => {
		const entry = path.join( 'samples', 'unresolved-local', 'main.js' );
		return rollup.rollup({
			entry,
			plugins: [
				nodeResolve()
			]
		}).then( () => {
			throw Error( 'test should fail' );
		}, err => {
			assert.equal( err.message, `Could not resolve './foo' from ${entry}` );
		});
	});

	it( 'mark as external to module outside the jail', () => {
		return rollup.rollup({
			input: 'samples/jail/main.js',
			plugins: [ nodeResolve({
				jail: `${__dirname}/samples/`
			}) ]
		}).then( (bundle) => {
			assert.deepEqual(bundle.imports, [ 'string/uppercase.js' ]);
		});
	});

	it( 'bundle module defined inside the jail', () => {
		return rollup.rollup({
			input: 'samples/jail/main.js',
			plugins: [ nodeResolve({
				jail: `${__dirname}/`
			}) ]
		}).then( (bundle) => {
			assert.deepEqual(bundle.imports, []);
		});
	});

	it( '"only" option allows to specify the only packages to resolve', () => {
		return rollup.rollup({
			input: 'samples/only/main.js',
			plugins: [
				nodeResolve({
					only: [ 'test' ]
				})
			]
		}).then(bundle => {
			assert.deepEqual( bundle.imports.sort(), [ '@scoped/bar', '@scoped/foo' ] );
		});
	});

	it( '"only" option works with a regex', () => {
		return rollup.rollup({
			input: 'samples/only/main.js',
			plugins: [
				nodeResolve({
					only: [ /^@scoped\/.*$/ ]
				})
			]
		}).then(bundle => {
			assert.deepEqual( bundle.imports.sort(), [ 'test' ] );
		});
	});

	it( 'allows custom options', () => {
		return rollup.rollup({
			input: 'samples/custom-resolve-options/main.js',
			plugins: [ nodeResolve({
				customResolveOptions: {
					moduleDirectory: 'js_modules'
				}
			}) ]
		}).then( bundle => {
			assert.equal(
				bundle.modules[1].id,
				path.resolve( __dirname, 'samples/custom-resolve-options/js_modules/foo.js' )
			);
		});
	});

	it( 'ignores deep-import non-modules', () => {
		return rollup.rollup({
			input: 'samples/deep-import-non-module/main.js',
			plugins: [ nodeResolve({
				modulesOnly: true
			}) ]
		}).then( bundle => {
			assert.deepEqual( bundle.imports, [ 'foo/deep' ] );
		});
	});

	it( 'generates manual chunks', () => {
		const chunkName = 'mychunk';
		return rollup.rollup({
			input: 'samples/manualchunks/main.js',
			experimentalCodeSplitting: true,
			manualChunks: {
				[ chunkName ]: [ 'simple' ]
			},
			plugins: [ nodeResolve() ]
		}).then( bundle => {
			return bundle.generate({
				format: 'esm',
				chunkFileNames: '[name]',
			});
		}).then( generated => {
			assert(chunkName in generated.output);
		});
	});
});
