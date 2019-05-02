import {dirname, extname, join, normalize, resolve, sep} from 'path';
import builtins from 'builtin-modules';
import resolveId from 'resolve';
import isModule from 'is-module';
import fs from 'fs';

const ES6_BROWSER_EMPTY = resolve( __dirname, '../src/empty.js' );
// It is important that .mjs occur before .js so that Rollup will interpret npm modules
// which deploy both ESM .mjs and CommonJS .js files as ESM.
const DEFAULT_EXTS = [ '.mjs', '.js', '.json', '.node' ];

let readFileCache = {};
const readFileAsync = file => new Promise((fulfil, reject) => fs.readFile(file, (err, contents) => err ? reject(err) : fulfil(contents)));
const statAsync = file => new Promise((fulfil, reject) => fs.stat(file, (err, contents) => err ? reject(err) : fulfil(contents)));
function cachedReadFile (file, cb) {
	if (file in readFileCache === false) {
		readFileCache[file] = readFileAsync(file).catch(err => {
			delete readFileCache[file];
			throw err;
		});
	}
	readFileCache[file].then(contents => cb(null, contents), cb);
}

let isFileCache = {};
function cachedIsFile (file, cb) {
	if (file in isFileCache === false) {
		isFileCache[file] = statAsync(file)
			.then(
				stat => stat.isFile(),
				err => {
					if (err.code === 'ENOENT') return false;
					delete isFileCache[file];
					throw err;
				});
	}
	isFileCache[file].then(contents => cb(null, contents), cb);
}

function getMainFields (options) {
	let mainFields;
	if (options.mainFields) {
		if ('module' in options || 'main' in options || 'jsnext' in options) {
			throw new Error(`node-resolve: do not use deprecated 'module', 'main', or 'jsnext' options with 'mainFields'`);
		}
		if (options.mainFields.includes('syntax')) {
			throw new Error(`node-resolve: do not use 'syntax' as a value to 'mainFields', instead use 'options.syntax = true'`);
		}
		mainFields = options.mainFields;
	} else {
		mainFields = [];
		[['module', 'module', true], ['jsnext', 'jsnext:main', false], ['main', 'main', true]].forEach(([option, field, defaultIncluded]) => {
			if (option in options) {
				// eslint-disable-next-line no-console
				console.warn(`node-resolve: setting options.${option} is deprecated, please override options.mainFields instead`);
				if (options[option]) {
					mainFields.push(field);
				}
			} else if (defaultIncluded) {
				mainFields.push(field);
			}
		});
	}
	if (options.syntax && mainFields.filter(field => field.startsWith('syntax.')).length === 0) {
		return [`syntax.${options.syntax}`].concat(mainFields);
	}
	if (options.browser && !mainFields.includes('browser')) {
		return ['browser'].concat(mainFields);
	}
	if ( !mainFields.length ) {
		throw new Error( `Please ensure at least one 'mainFields' value is specified` );
	}
	return mainFields;
}

const resolveIdAsync = (file, opts) => new Promise((fulfil, reject) => resolveId(file, opts, (err, contents) => err ? reject(err) : fulfil(contents)));

export default function nodeResolve ( options = {} ) {
	const mainFields = getMainFields(options);
	const useBrowserOverrides = mainFields.includes('browser');
	const useSyntaxOverrides = mainFields.filter(field => field.startsWith('syntax.')).length > 0;
	const dedupe = options.dedupe || [];
	const isPreferBuiltinsSet = options.preferBuiltins === true || options.preferBuiltins === false;
	const preferBuiltins = isPreferBuiltinsSet ? options.preferBuiltins : true;
	const customResolveOptions = options.customResolveOptions || {};
	const jail = options.jail;
	const only = Array.isArray(options.only)
		? options.only.map(o => o instanceof RegExp
			? o
			: new RegExp('^' + String(o).replace(/[\\^$*+?.()|[\]{}]/g, '\\$&') + '$')
		)
		: null;
	const overrideMapCache = {};

	if ( options.skip ) {
		throw new Error( 'options.skip is no longer supported — you should use the main Rollup `external` option instead' );
	}

	let preserveSymlinks;

	return {
		name: 'node-resolve',

		options ( options ) {
			preserveSymlinks = options.preserveSymlinks;
		},

		generateBundle () {
			isFileCache = {};
			readFileCache = {};
		},

		resolveId ( importee, importer ) {
			if ( /\0/.test( importee ) ) return null; // ignore IDs with null character, these belong to other plugins

			const basedir = importer ? dirname( importer ) : process.cwd();

			if (dedupe.indexOf(importee) !== -1) {
				importee = join(process.cwd(), 'node_modules', importee);
			}

			// https://github.com/defunctzombie/package-browser-field-spec
			// Also now supports `syntax` proposal.
			if ((useSyntaxOverrides || useBrowserOverrides) && overrideMapCache[importer]) {
				const resolvedImportee = resolve(basedir, importee);
				const cached = overrideMapCache[importer];
				if (cached[importee] === false || cached[resolvedImportee] === false) {
					return ES6_BROWSER_EMPTY;
				}
				if (cached[importee] || cached[resolvedImportee] || cached[resolvedImportee + '.js'] || cached[resolvedImportee + '.json']) {
					importee = cached[importee] || cached[resolvedImportee] || cached[resolvedImportee + '.js'] || cached[resolvedImportee + '.json'];
				}
			}

			const parts = importee.split( /[/\\]/ );
			let id = parts.shift();

			if ( id[0] === '@' && parts.length ) {
				// scoped packages
				id += `/${parts.shift()}`;
			} else if ( id[0] === '.' ) {
				// an import relative to the parent dir of the importer
				id = resolve( basedir, importee );
			}

			if (only && !only.some(pattern => pattern.test(id))) return null;

			let disregardResult = false;
			let packageOverrideField = false;
			const extensions = options.extensions || DEFAULT_EXTS;

			const resolveOptions = {
				basedir,
				moduleDirectory: basedir.includes('node_modules') ? ['', 'node_modules'] : ['node_modules'],
				packageFilter ( pkg, pkgPath ) {
					const pkgRoot = dirname( pkgPath );
					if (useSyntaxOverrides || useBrowserOverrides) {
						const packageKey = useSyntaxOverrides ? 'syntax' : 'browser';
						if (typeof pkg[packageKey] === 'object') {
							packageOverrideField = Object.keys(pkg[[packageKey]]).reduce((name, key) => {
								let resolved = pkg[packageKey][key];
								if (resolved && resolved[0] === '.') {
									resolved = resolve(pkgRoot, resolved);
								}
								name[key] = resolved;
								if ( key[0] === '.' ) {
									const absoluteKey = resolve( pkgRoot, key );
									name[absoluteKey] = resolved;
									if ( !extname(key) ) {
										extensions.reduce( ( name, ext ) => {
											name[ absoluteKey + ext ] = name[ key ];
											return name;
										}, name );
									}
								}
								return name;
							}, {});
						}
					}

					let overriddenMain = false;
					for ( let i = 0; i < mainFields.length; i++ ) {
						const field = mainFields[i];
						const potential = field.startsWith('syntax.') ? pkg.syntax[field.split('.')[1]] : pkg[field];

						if ( typeof potential === 'string' ) {
							pkg['main'] = potential;
							overriddenMain = true;
							break;
						}
					}
					if ( overriddenMain === false && !mainFields.includes( 'main' ) ) {
						disregardResult = true;
					}
					return pkg;
				},
				readFile: cachedReadFile,
				isFile: cachedIsFile,
				extensions: extensions,
			};

			if (preserveSymlinks !== undefined) {
				resolveOptions.preserveSymlinks = preserveSymlinks;
			}

			return resolveIdAsync(
				importee, 
				Object.assign( resolveOptions, customResolveOptions )
			)
				.then(resolved => {
					if ( resolved && (useSyntaxOverrides || useBrowserOverrides) && packageOverrideField ) {
						if ( packageOverrideField.hasOwnProperty(resolved) ) {
							if (!packageOverrideField[resolved]) {
								overrideMapCache[resolved] = packageOverrideField;
								return ES6_BROWSER_EMPTY;
							}
							resolved = packageOverrideField[resolved];
						}
						overrideMapCache[resolved] = packageOverrideField;
					}

					if ( !disregardResult ) {
						if ( !preserveSymlinks && resolved && fs.existsSync( resolved ) ) {
							resolved = fs.realpathSync( resolved );
						}

						if ( ~builtins.indexOf( resolved ) ) {
							return null;
						} else if ( ~builtins.indexOf( importee ) && preferBuiltins ) {
							if ( !isPreferBuiltinsSet ) {
								this.warn(
									`preferring built-in module '${importee}' over local alternative ` +
									`at '${resolved}', pass 'preferBuiltins: false' to disable this ` +
									`behavior or 'preferBuiltins: true' to disable this warning`
								);
							}
							return null;
						} else if ( jail && resolved.indexOf( normalize( jail.trim( sep ) ) ) !== 0 ) {
							return null;
						}
					}

					if ( resolved && options.modulesOnly ) {
						return readFileAsync( resolved, 'utf-8').then(code => isModule(code) ? resolved : null);
					} else {
						return resolved;
					}
				})
				.catch(() => null);
		},
	};
}
