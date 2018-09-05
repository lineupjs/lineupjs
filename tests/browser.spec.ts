import {isBrowserSupported} from '../src/browser';

it('run within valid browser', () => {
  expect(isBrowserSupported()).toBe(false);
});
