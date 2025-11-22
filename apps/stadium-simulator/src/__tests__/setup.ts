/**
 * Vitest setup file
 * Global test configuration and mocks
 */

// Mock canvas and its context for happy-dom environment
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function (contextType: string) {
    if (contextType === '2d') {
      return {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        globalAlpha: 1,
        fillRect: () => {},
        strokeRect: () => {},
        clearRect: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        arc: () => {},
        fill: () => {},
        stroke: () => {},
        save: () => {},
        restore: () => {},
        scale: () => {},
        rotate: () => {},
        translate: () => {},
        transform: () => {},
        setTransform: () => {},
        drawImage: () => {},
        createImageData: () => ({ data: [] }),
        getImageData: () => ({ data: [], width: 0, height: 0 }),
        putImageData: () => {},
        measureText: () => ({ width: 0 }),
      } as any;
    }
    return null;
  };
}

// Mock performance API if not available
if (typeof global.performance === 'undefined') {
  global.performance = {
    now: () => Date.now(),
  } as any;
}
