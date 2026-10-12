import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { Color, SRGBColorSpace, Vector2 } from "three";

type HalftoneImageProps = {
  color?: string;
};

const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D uImage;
  uniform vec2 uResolution;
  uniform vec2 uImageResolution;
  uniform float uCellSize;
  uniform vec3 uColor;
  varying vec2 vUv;

  float bayer2(vec2 position) {
    vec2 cell = mod(position, 2.0);
    return mod(2.0 * cell.x + 3.0 * cell.y, 4.0);
  }

  float bayer4(vec2 position) {
    vec2 lowBits = mod(position, 2.0);
    vec2 highBits = mod(floor(position / 2.0), 2.0);
    return 4.0 * bayer2(lowBits) + bayer2(highBits);
  }

  void main() {
    vec2 pixelPosition = vUv * uResolution;
    vec2 cell = floor(pixelPosition / uCellSize);
    vec2 cellCenter = (cell + 0.5) * uCellSize;
    vec2 sampleUv = cellCenter / uResolution;

    float imageAspect = uImageResolution.x / uImageResolution.y;
    float containerAspect = uResolution.x / uResolution.y;
    if (containerAspect > imageAspect) {
      sampleUv.y = (sampleUv.y - 0.5) * containerAspect / imageAspect + 0.5;
    } else {
      sampleUv.x = (sampleUv.x - 0.5) * imageAspect / containerAspect + 0.5;
    }

    vec3 imageColor = texture2D(uImage, sampleUv).rgb;
    float luminance = dot(imageColor, vec3(0.299, 0.587, 0.114));
    float threshold = bayer4(cell) / 16.0;
    float liftedLuminance = pow(clamp(luminance * 1.5, 0.0, 1.0), 0.72);
    float quantized = floor(liftedLuminance * 15.0 + threshold) / 15.0;
    vec3 shadowColor = vec3(0.006, 0.025, 0.012);
    vec3 dithered = mix(shadowColor, uColor, quantized);
    gl_FragColor = vec4(dithered, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function HalftoneMaterial({
  src,
  color,
  onShaderReady,
}: {
  src: string;
  color: string;
  onShaderReady: () => void;
}) {
  const texture = useTexture(src, (loadedTexture) => {
    loadedTexture.colorSpace = SRGBColorSpace;
  });
  const size = useThree((state) => state.size);
  const viewport = useThree((state) => state.viewport);
  const imageSize = texture.image as { width: number; height: number };
  const hasRendered = useRef(false);
  const pendingReadyFrame = useRef<number | null>(null);

  useFrame(() => {
    if (!hasRendered.current) {
      hasRendered.current = true;
      pendingReadyFrame.current = requestAnimationFrame(() => {
        pendingReadyFrame.current = null;
        onShaderReady();
      });
    }
  });

  useEffect(
    () => () => {
      if (pendingReadyFrame.current !== null) {
        cancelAnimationFrame(pendingReadyFrame.current);
      }
    },
    [],
  );

  const uniforms = useMemo(
    () => ({
      uImage: { value: texture },
      uResolution: { value: new Vector2(size.width, size.height) },
      uImageResolution: {
        value: new Vector2(imageSize.width, imageSize.height),
      },
      uCellSize: { value: 3 },
      uColor: { value: new Color(color) },
    }),
    [
      color,
      imageSize.height,
      imageSize.width,
      size.height,
      size.width,
      texture,
    ],
  );

  return (
    <mesh>
      <planeGeometry args={[viewport.width, viewport.height]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        toneMapped={false}
      />
    </mesh>
  );
}

export default function HalftoneImage({
  color = "#3bddb5",
}: HalftoneImageProps) {
  const src = "/about/about.jpg";
  const [isShaderReady, setIsShaderReady] = useState(false);

  return (
    <div
      className={`about-page__image${isShaderReady ? " about-page__image--ready" : ""}`}
    >
      {/* <img
        className="about-page__image-source"
        src={src}
        alt="Portrait of the artist sitting at a computer"
      /> */}
      <Canvas
        className="about-page__image-canvas"
        aria-hidden="true"
        dpr={[1, 1.5]}
        frameloop={isShaderReady ? "demand" : "always"}
        camera={{ position: [0, 0, 5] }}
        fallback={null}
        style={{ opacity: isShaderReady ? 1 : 0 }}
      >
        <Suspense fallback={null}>
          <HalftoneMaterial
            src={src}
            color={color}
            onShaderReady={() => setIsShaderReady(true)}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
