import { RGBELoader } from "three-stdlib";
import { useRef, useState } from "react";
import { Group, ShaderMaterial } from "three";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { useNavigate } from "react-router-dom";
import {
  Center,
  Text3D,
  Environment,
  Lightformer,
  OrbitControls,
  RandomizedLight,
  AccumulativeShadows,
  MeshTransmissionMaterial,
} from "@react-three/drei";
import {
  Badge,
  Box,
  Button,
  Stack,
  Text,
  TextInput,
  Group as MtGroup,
} from "@mantine/core";
import { useControls, button, Leva } from "leva";

export default function CrystalLayout() {
  const navigate = useNavigate();

  const textInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("crystalline");
  const { autoRotate, shadow, ...config } = useControls({
    backside: true,
    backsideThickness: { value: 0.15, min: 0, max: 2 },
    samples: { value: 4, min: 1, max: 32, step: 1 },
    resolution: { value: 240, min: 64, max: 2048, step: 64 },
    transmission: { value: 1, min: 0, max: 1 },
    clearcoat: { value: 1, min: 0.1, max: 1 },
    clearcoatRoughness: { value: 0.0, min: 0, max: 1 },
    thickness: { value: 0.35, min: 0, max: 5 },
    chromaticAberration: { value: 4, min: -5, max: 5 },
    anisotropy: { value: 0.25, min: 0, max: 1, step: 0.01 },
    roughness: { value: 0.2, min: 0, max: 1, step: 0.01 },
    distortion: { value: 0.05, min: 0, max: 4, step: 0.01 },
    distortionScale: { value: 0.1, min: 0.01, max: 1, step: 0.01 },
    temporalDistortion: { value: 0.18, min: 0, max: 1, step: 0.01 },
    ior: { value: 1.25, min: 0, max: 2, step: 0.01 },
    color: "white",
    shadow: "#ffffff",
    autoRotate: false,
    screenshot: button(() => {
      // Save the canvas as a *.png
      const link = document.createElement("a");
      link.setAttribute("download", "canvas.png");
      link.setAttribute(
        "href",
        document
          .querySelector("canvas")!
          .toDataURL("image/png")
          .replace("image/png", "image/octet-stream"),
      );
      link.click();
    }),
  });
  return (
    <>
      <Leva collapsed />
      <Box
        component="form"
        className="crystal-text-form"
        onSubmit={(event) => {
          event.preventDefault();
          setText(textInputRef.current?.value.slice(0, 16) ?? "");
        }}
      >
        <Stack gap={5} justify='center' align='center'>
          <Text style={{
            fontWeight: 800,
            textAlign: 'center',
            fontSize: 'clamp(8px, 2.5vw, 12px)',
          }}>TYPE ANYTHING - MAX 16 CHARACTERS</Text>
          <MtGroup gap='xs'>
            <TextInput
            size="xs"
              ref={textInputRef}
              className="crystal-text-input"
              aria-label="Crystal text"
              defaultValue={text}
              maxLength={16}
            />
            <Button type="submit" size="xs" variant="light">
              APPLY
            </Button>
          </MtGroup>
        </Stack>
      </Box>
      <Box
        className="crystal-corners"
        aria-hidden="true"
        style={{
          userSelect: "none",
        }}
      >
        <Stack className="crystal-corner crystal-corner-top-left">
          <Text
            style={{
              cursor: "pointer",
              pointerEvents: "auto",
              zIndex: 100000,
            }}
            onClick={() => navigate("/")}
            className="garden-mark"
          >
            Playground No.2: Crystal
          </Text>
          <div className="garden-kicker">
            developed using examples from{" "}
            <Badge
              variant="light"
              autoContrast
              style={{
                cursor: "pointer",
                pointerEvents: "auto",
                zIndex: 100000,
              }}
              onClick={() => window.open("https://x.com/0xca0a", "_blank")}
            >
              Paul Henschel
            </Badge>
          </div>
        </Stack>
        <Box className="crystal-corner crystal-corner-bottom-right">
          <Text component="span">Three.js</Text>
          <Text component="span">2026</Text>
        </Box>
      </Box>
      <Canvas
        className="crystal-canvas"
        dpr={[1, 1.5]}
        shadows
        orthographic
        camera={{ position: [10, 20, 20], zoom: 40 }}
        gl={{ preserveDrawingBuffer: true }}
      >
        {/** The text and the grid */}
        <CrystalText
          config={config}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -1, 2.25]}
        >
          {text.slice(0, 16)}
        </CrystalText>
        {/** Controls */}
        <OrbitControls
          autoRotate={autoRotate}
          autoRotateSpeed={-0.1}
          zoomSpeed={0.25}
          minZoom={40}
          maxZoom={400}
          enablePan={false}
          dampingFactor={0.05}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 3}
        />
        <LiquidOrb
          config={config}
          position={[4.4, -0.58, 3.8]}
          size={0.84}
          speed={1.5}
          bounceHeight={0.55}
          shape="sphere"
          spinSpeed={0.45}
        />
        <LiquidOrb
          config={config}
          position={[-4.4, -0.58, 3.8]}
          size={0.56}
          speed={1.9}
          phase={0.8}
          bounceHeight={0.75}
          shape="octahedron"
          spinSpeed={-0.65}
        />
        <LiquidOrb
          config={config}
          position={[5.4, 0.55, -2.8]}
          size={1.16}
          speed={1.2}
          phase={1.6}
          bounceHeight={1.1}
          shape="icosahedron"
          spinSpeed={0.35}
        />
        <LiquidOrb
          config={config}
          position={[-4.6, -0.58, -3.2]}
          size={0.72}
          speed={2.1}
          phase={2.4}
          bounceHeight={0.9}
          shape="box"
          spinSpeed={-0.8}
        />
        <LiquidOrb
          config={config}
          position={[0, -0.58, -4.2]}
          size={0.48}
          speed={1.7}
          phase={0.4}
          bounceHeight={0.65}
          shape="tetrahedron"
          spinSpeed={0.55}
        />
        {/** The environment is just a bunch of shapes emitting light. This is needed for the clear-coat */}
        <Environment resolution={16}>
          <group rotation={[-Math.PI / 4, -0.3, 0]}>
            <Lightformer
              intensity={20}
              rotation-x={Math.PI / 2}
              position={[0, 5, -9]}
              scale={[10, 10, 1]}
            />
            <Lightformer
              intensity={2}
              rotation-y={Math.PI / 2}
              position={[-5, 1, -1]}
              scale={[10, 2, 1]}
            />
            <Lightformer
              intensity={2}
              rotation-y={Math.PI / 2}
              position={[-5, -1, -1]}
              scale={[10, 2, 1]}
            />
            <Lightformer
              intensity={2}
              rotation-y={-Math.PI / 2}
              position={[10, 1, 0]}
              scale={[20, 2, 1]}
            />
            <Lightformer
              type="ring"
              intensity={2}
              rotation-y={Math.PI / 2}
              position={[-0.1, -1, -5]}
              scale={10}
            />
          </group>
        </Environment>
        {/** Soft shadows */}
        <AccumulativeShadows
          frames={30}
          color={shadow}
          colorBlend={6}
          toneMapped={true}
          alphaTest={0.8}
          opacity={1}
          scale={80}
          position={[0, -1.01, 0]}
        >
          <RandomizedLight
            amount={3}
            radius={10}
            ambient={0.7}
            intensity={1.2}
            position={[0, 10, -10]}
            size={15}
            mapSize={512}
            bias={0.0001}
          />
        </AccumulativeShadows>
      </Canvas>
    </>
  );
}

function Grid() {
  const materialRef = useRef<ShaderMaterial>(null);

  useFrame(({ clock }) => {
    if (materialRef.current)
      materialRef.current.uniforms.time.value = clock.elapsedTime;
  });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.025, 0]}>
        <planeGeometry args={[100, 100]} />
        <shaderMaterial
          ref={materialRef}
          transparent
          depthWrite={false}
          uniforms={{ time: { value: 0 } }}
          vertexShader={topographicVertexShader}
          fragmentShader={topographicFragmentShader}
        />
      </mesh>
      <gridHelper
        args={[100, 100, "#b1b1b1", "#b1b1b1"]}
        position={[0, -1.01, 0]}
      />
    </group>
  );
}

const topographicVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const topographicFragmentShader = /* glsl */ `
  uniform float time;
  varying vec2 vUv;

  float terrain(vec2 point) {
    float value = 0.0;
    value += sin(point.x * 1.25 + sin(point.y * 1.7)) * 0.50;
    value += sin(point.y * 2.10 + sin(point.x * 1.15)) * 0.25;
    value += sin((point.x + point.y) * 3.40) * 0.125;
    return value * 0.5 + 0.5;
  }

  void main() {
    vec2 point = vUv * 12.0;
    point += vec2(time * 0.08, -time * 0.05);

    float height = terrain(point);
    float contourDistance = abs(fract(height * 18.0) - 0.5);
    float contourLine = 1.0 - smoothstep(0.032, 0.075, contourDistance);
    float dash = step(0.18, fract(point.x * 0.15 + point.y * 0.12));
    float alpha = contourLine * mix(0.72, 1.0, dash);

    gl_FragColor = vec4(vec3(0.42), alpha);
  }
`;

function CrystalText({
  children,
  config,
  font = "https://threejs.org/examples/fonts/helvetiker_regular.typeface.json",
  ...props
}: any) {
  const texture = useLoader(RGBELoader, "/models/aerodynamics_workshop_1k.hdr");
  const { position = [0, 0, 0], rotation = [0, 0, 0], ...centerProps } = props;

  return (
    <>
      <group>
        <group position={position} rotation={rotation}>
          <Center key={children} scale={[0.8, 1, 1]} front top {...centerProps}>
            <Text3D
              castShadow
              bevelEnabled
              font={font}
              scale={4}
              letterSpacing={-0.03}
              height={0.25}
              bevelSize={0.01}
              bevelSegments={4}
              curveSegments={56}
              bevelThickness={0.01}
            >
              {children}
              <MeshTransmissionMaterial {...config} background={texture} />
            </Text3D>
          </Center>
        </group>
        <Grid />
      </group>
    </>
  );
}

function LiquidOrb({
  config,
  position,
  size,
  speed,
  phase = 0,
  bounceHeight,
  shape,
  spinSpeed,
}: {
  config: Record<string, unknown>;
  position: [number, number, number];
  size: number;
  speed: number;
  phase?: number;
  bounceHeight: number;
  shape: "sphere" | "tetrahedron" | "box" | "octahedron" | "icosahedron";
  spinSpeed: number;
}) {
  const orbRef = useRef<Group>(null);
  const texture = useLoader(RGBELoader, "/models/aerodynamics_workshop_1k.hdr");

  useFrame(({ clock }) => {
    if (!orbRef.current) return;

    orbRef.current.position.y =
      position[1] +
      Math.abs(Math.sin(clock.elapsedTime * speed + phase)) * bounceHeight;
    orbRef.current.rotation.x = clock.elapsedTime * spinSpeed * 0.7;
    orbRef.current.rotation.y = clock.elapsedTime * spinSpeed;
  });

  return (
    <group ref={orbRef} position={position}>
      <mesh castShadow>
        {shape === "sphere" && <sphereGeometry args={[size, 16, 10]} />}
        {shape === "tetrahedron" && <tetrahedronGeometry args={[size, 0]} />}
        {shape === "box" && (
          <boxGeometry args={[size * 1.6, size * 1.6, size * 1.6]} />
        )}
        {shape === "octahedron" && <octahedronGeometry args={[size, 0]} />}
        {shape === "icosahedron" && <icosahedronGeometry args={[size, 0]} />}
        <MeshTransmissionMaterial {...config} background={texture} />
      </mesh>
    </group>
  );
}
