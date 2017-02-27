import { dirname, resolve, normalize } from 'path';
import builtins from 'builtin-modules';
import _nodeResolve from 'resolve';
import browserResolve from 'browser-resolve';

const COMMONJS_BROWSER_EMPTY = _nodeResolve.sync( 'browser-resolve/empty.js', __dirname );
const ES6_BROWSER_EMPTY = resolve( __dirname, '../src/empty.js' );
const CONSOLE_WARN = ( ...args ) => console.warn( ...args ); // eslint-disable-line no-console

export default function nodeResolve ( options = {} ) {
	const skip = options.skip || [];

	let useFields = options.useFields;
	if ( ! useFields ) {
		useFields = []; // 'es2015', 'module', 'jsnext:main', 'main' ];
		if ( options.es2015 === true ) useFields.push( 'es2015' );
		if ( options.module !== false ) useFields.push( 'module' );
		if ( options.jsnext === true ) useFields.push( 'jsnext:main' );
		if ( options.main !== false ) useFields.push( 'main' );
	}

	const isPreferBuiltinsSet = options.preferBuiltins === true || options.preferBuiltins === false;
	const preferBuiltins = isPreferBuiltinsSet ? options.preferBuiltins : true;

	const onwarn = options.onwarn || CONSOLE_WARN;
	const resolveId = options.browser ? browserResolve : _nodeResolve;

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

			if ( skip !== true && ~skip.indexOf( id ) ) return null;

			return new Promise( ( accept, reject ) => {
				resolveId(
					importee,
					{
						basedir: dirname( importer ),
						packageFilter ( pkg ) {
							if ( useFields.length == 0 ) {
								if ( skip === true ) accept( false );
								else reject( Error( `To import from a package in node_modules (${importee}), options.useFields must contain at least one entry` ) );
							} else {
								let entryFile = '';
								let allowedMain = false;
								useFields.forEach( function ( f ) {
									allowedMain = allowedMain || ( f == 'main' );
									if ( pkg[f] && !entryFile ) {
										entryFile = pkg[f];
									}
								} );
								if ( !entryFile && !allowedMain ) {
									if ( skip === true ) accept( false );
									reject( Error( `Package ${importee} (imported by ${importer}) does not match any of your useFields entries. You should either allow legacy modules with 'main', or skip it with options.skip = ['${importee}'])` ) );
								}
								pkg['main'] = entryFile;
							}
							return pkg;
						},
						extensions: options.extensions
					},
					( err, resolved ) => {
						if ( err ) {
							if ( skip === true ) accept( false );
							else reject( Error( `Could not resolve '${importee}' from ${normalize( importer )}` ) );
						} else {
							if ( resolved === COMMONJS_BROWSER_EMPTY ) {
								accept( ES6_BROWSER_EMPTY );
							} else if ( ~builtins.indexOf( resolved ) ) {
								accept( null );
							} else if ( ~builtins.indexOf( importee ) && preferBuiltins ) {
								if ( !isPreferBuiltinsSet ) {
									onwarn(
										`preferring built-in module '${importee}' over local alternative ` +
										`at '${resolved}', pass 'preferBuiltins: false' to disable this ` +
										`behavior or 'preferBuiltins: true' to disable this warning`
									);
								}
								accept( null );
							} else {
								accept( resolved );
							}
						}
					}
				);
			} );
		}
	};
}
