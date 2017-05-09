import { dirname, resolve, normalize, sep } from 'path';
import builtins from 'builtin-modules';
import _nodeResolve from 'resolve';
import browserResolve from 'browser-resolve';
import isModule from 'is-module';
import fs from 'fs';

const COMMONJS_BROWSER_EMPTY = _nodeResolve.sync( 'browser-resolve/empty.js', __dirname );
const ES6_BROWSER_EMPTY = resolve( __dirname, '../src/empty.js' );
const CONSOLE_WARN = ( ...args ) => console.warn( ...args ); // eslint-disable-line no-console

export default function nodeResolve ( options = {} ) {
	const useModule = options.module !== false;
	const useMain = options.main !== false;
	const useJsnext = options.jsnext === true;
	const isPreferBuiltinsSet = options.preferBuiltins === true || options.preferBuiltins === false;
	const preferBuiltins = isPreferBuiltinsSet ? options.preferBuiltins : true;
	const customResolveOptions = options.customResolveOptions || {};
	const jail = options.jail;

	const onwarn = options.onwarn || CONSOLE_WARN;
	const resolveId = options.browser ? browserResolve : _nodeResolve;

	if ( options.skip ) {
		throw new Error( 'options.skip is no longer supported — you should use the main Rollup `external` option instead' );
	}

	if ( !useModule && !useMain && !useJsnext ) {
		throw new Error( `At least one of options.module, options.main or options.jsnext must be true` );
	}

	return {
		name: 'node-resolve',

		resolveId ( importee, importer ) {
			if ( /\0/.test( importee ) ) return null; // ignore IDs with null character, these belong to other plugins

			// disregard entry module
			if ( !importer ) return null;

			const parts = importee.split( /[\/\\]/ );
			let id = parts.shift();

			if ( id[0] === '@' && parts.length ) {
				// scoped packages
				id += `/${parts.shift()}`;
			} else if ( id[0] === '.' ) {
				// an import relative to the parent dir of the importer
				id = resolve( importer, '..', importee );
			}

			return new Promise( ( fulfil, reject ) => {
				let disregardResult = false;

				resolveId(
					importee,
					Object.assign({
						basedir: dirname( importer ),
						packageFilter ( pkg ) {
							if ( useModule && pkg[ 'module' ] ) {
								pkg[ 'main' ] = pkg[ 'module' ];
							} else if ( useJsnext && pkg[ 'jsnext:main' ] ) {
								pkg[ 'main' ] = pkg[ 'jsnext:main' ];
							} else if ( ( useJsnext || useModule ) && !useMain ) {
								disregardResult = true;
							}
							return pkg;
						},
						extensions: options.extensions
					}, customResolveOptions ),
					( err, resolved ) => {
						if ( !disregardResult && !err ) {
							if ( resolved && fs.existsSync( resolved ) ) {
								resolved = fs.realpathSync( resolved );
							}

							if ( resolved === COMMONJS_BROWSER_EMPTY ) {
								fulfil( ES6_BROWSER_EMPTY );
							} else if ( ~builtins.indexOf( resolved ) ) {
								fulfil( null );
							} else if ( ~builtins.indexOf( importee ) && preferBuiltins ) {
								if ( !isPreferBuiltinsSet ) {
									onwarn(
										`preferring built-in module '${importee}' over local alternative ` +
										`at '${resolved}', pass 'preferBuiltins: false' to disable this ` +
										`behavior or 'preferBuiltins: true' to disable this warning`
									);
								}
								fulfil( null );
							} else if ( jail && resolved.indexOf( normalize( jail.trim( sep ) ) ) !== 0 ) {
								fulfil( null );
							}
						}

						if ( resolved && options.modulesOnly ) {
							fs.readFile( resolved, 'utf-8', ( err, code ) => {
								if ( err ) {
									reject( err );
								} else {
									const valid = isModule( code );
									fulfil( valid ? resolved : null );
								}
							});
						} else {
							fulfil( resolved );
						}
					}
				);
			});
		}
	};
}
