import { scaleToMaxEdge, isAllowedAvatarSourceMime } from './avatar-image.util';

describe('avatar-image.util', () => {
  it('accepts jpeg/png/webp only', () => {
    expect(isAllowedAvatarSourceMime('image/jpeg')).toBe(true);
    expect(isAllowedAvatarSourceMime('image/png')).toBe(true);
    expect(isAllowedAvatarSourceMime('image/webp')).toBe(true);
    expect(isAllowedAvatarSourceMime('image/gif')).toBe(false);
    expect(isAllowedAvatarSourceMime('image/svg+xml')).toBe(false);
  });

  it('scaleToMaxEdge keeps small images', () => {
    expect(scaleToMaxEdge(200, 100, 512)).toEqual({ width: 200, height: 100 });
  });

  it('scaleToMaxEdge shrinks the longest side to maxEdge', () => {
    expect(scaleToMaxEdge(2048, 1024, 512)).toEqual({ width: 512, height: 256 });
    expect(scaleToMaxEdge(1024, 2048, 512)).toEqual({ width: 256, height: 512 });
  });
});
