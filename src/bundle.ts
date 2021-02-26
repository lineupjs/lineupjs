// eslint-disable-next-line import/no-webpack-loader-syntax
import '!file-loader?name=schema.4.0.0.json!./provider/schema.json';
import './style.scss';
export * from './';
export { default } from './';

declare const __VERSION__: string;
declare const __BUILD_ID__: string;
declare const __LICENSE__: string;

/**
 * LineUp version
 * @type {string}
 */
export const version = __VERSION__;
/**
 * LineUp unique build id
 * @type {string}
 */
export const buildId = __BUILD_ID__;
/**
 * LineUp license type
 * @type {string}
 */
export const license = __LICENSE__;
