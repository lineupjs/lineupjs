import {detect} from 'detect-browser';

export const SUPPORTED_FIREFOX_VERSION = 57;
export const SUPPORTED_CHROME_VERSION = 64;
export const SUPPORTED_EDGE_VERSION = 16;

/**
 * @internal
 */
export function getUnsupportedBrowserError() {
  const info = detect();
  if (!info || !info.version) {
    return 'browser cannot be detected';
  }
  const prefix = `unsupported browser detected:`;
  switch (info.name) {
    case 'firefox':
      const fVersion = parseInt(info.version.slice(0, info.version.indexOf('.')), 10);
      if (fVersion <= SUPPORTED_FIREFOX_VERSION && fVersion !== 52) { // ESR
        return `${prefix} Firefox ${info.version} (&lt; ${SUPPORTED_FIREFOX_VERSION})`;
      }
      return null;
    case 'edge':
      const eVersion = parseInt(info.version.slice(0, info.version.indexOf('.')), 10);
      if (eVersion <= SUPPORTED_EDGE_VERSION) {
        return `${prefix} Edge ${info.version} (&lt; ${SUPPORTED_EDGE_VERSION})`;
      }
      return null;
    case 'chrome':
      const cVersion = parseInt(info.version.slice(0, info.version.indexOf('.')), 10);
      if (cVersion <= SUPPORTED_CHROME_VERSION) {
        return `${prefix} Chrome ${info.version} (&lt; ${SUPPORTED_CHROME_VERSION})`;
      }
      return null;
    case 'ie':
      return `${prefix} Internet Explorer`;
  }
  console.warn('unknown browser detected', info, 'assuming fine...');
  return null;
}
/**
 * checks whether the current browser is compatible with lineupjs
 * @return boolean
 */
export function isBrowserSupported() {
  return getUnsupportedBrowserError() == null;
}

