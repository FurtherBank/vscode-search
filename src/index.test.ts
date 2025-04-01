import { hello } from './index';

describe('hello', () => {
  it('should return greeting message', () => {
    expect(hello()).toBe('Hello from vscode-search!');
  });
}); 