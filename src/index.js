import { dirname, resolve, normalize, sep } from 'path';
import builtins from 'builtin-modules';
import { create as createResolver } from 'enhanced-resolve';
import isModule from 'is-module';
import fs from 'fs';

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

	if ( options.skip ) {
		throw new Error( 'options.skip is no longer supported — you should use the main Rollup `externals` option instead' );
	}

	const mainFields = [];
	if ( !useModule && !useMain && !useJsnext ) {
		throw new Error( `At least one of options.module, options.main or options.jsnext must be true` );
	}
	if (useModule) mainFields.push('module');
	if (useJsnext) mainFields.push('jsnext:main');
	if (options.browser) mainFields.push('browser');
	if (useMain) mainFields.push('main');

	const aliasFields = options.browser ? ['browser'] : [];

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
				createResolver(Object.assign({
					mainFields,
					aliasFields,
					extensions: options.extensions
				}, customResolveOptions ))({}, dirname( importer ), importee, ( err, resolved ) => {
					if ( !err ) {
						if ( resolved && fs.existsSync( resolved ) ) {
							resolved = fs.realpathSync( resolved );
						}
						if ( resolved === false ) {
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
				});
			});
		}
	};
}
