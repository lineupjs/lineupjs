import {detect} from 'detect-browser';

export const SUPPORTED_FIREFOX_VERSION = 57;
export const SUPPORTED_CHROME_VERSION = 64;
export const SUPPORTED_EDGE_VERSION = 16;

/**
 * @internal
 */
export function getUnsupportedBrowserError() {
  const info = detect();
  if (!info) {
    return 'browser cannot be detected';
  }
  console.log(info);
  switch(info.name) {
    case 'firefox':
      const fVersion = parseInt(info.version.slice(0, info.version.indexOf('.')), 10);
      if(fVersion <= SUPPORTED_FIREFOX_VERSION && fVersion !== 52) { // ESR
        return `unsupported Firefox version detected: ${info.version} (minimal: ${SUPPORTED_FIREFOX_VERSION}`;
      }
      return 'test';
  }
  return 'test';
}
/**
 * checks whether the current browser is compatible with lineupjs
 * @return boolean
 */
export function isBrowserSupported() {
  return getUnsupportedBrowserError() == null;
}

