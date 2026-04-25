import React, { useEffect, useRef } from 'react';
import createGlobe from 'cobe';

const CobeGlobe = () => {
  const canvasRef = useRef(null);
  const globeRef = useRef(null);
  const phiRef   = useRef(0);
  const rafRef   = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const dpr  = Math.min(window.devicePixelRatio, 2);
    const size = 600;

    globeRef.current = createGlobe(canvasRef.current, {
      devicePixelRatio: dpr,
      width:  size * dpr,
      height: size * dpr,
      phi:    0,
      theta:  0.25,
      dark:   1,
      diffuse: 1.6,
      mapSamples: 20000,
      mapBrightness: 5,
      mapBaseBrightness: 0.04,
      baseColor:   [0.04, 0.12, 0.14],
      markerColor: [0.1, 0.85, 0.75],
      glowColor:   [0.05, 0.45, 0.42],
      scale: 1.05,
      markers: [
        { location: [37.78,  -122.44], size: 0.05 },
        { location: [51.51,   -0.13],  size: 0.05 },
        { location: [35.68,  139.65],  size: 0.04 },
        { location: [28.61,   77.21],  size: 0.06 },
        { location: [-23.55, -46.63],  size: 0.04 },
        { location: [25.20,   55.27],  size: 0.04 },
        { location: [1.35,   103.82],  size: 0.03 },
        { location: [48.85,    2.35],  size: 0.04 },
        { location: [-33.87, 151.21],  size: 0.04 },
        { location: [55.75,   37.62],  size: 0.04 },
        { location: [19.43,  -99.13],  size: 0.04 },
        { location: [31.23,  121.47],  size: 0.05 },
      ],
    });

    const animate = () => {
      phiRef.current += 0.003;
      globeRef.current?.update({ phi: phiRef.current });
      rafRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafRef.current);
      globeRef.current?.destroy();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: 600, height: 600 }}
    />
  );
};

export default CobeGlobe;
