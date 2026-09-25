// The attic: camera, lamp, focus spotlight, cork, dust, and the lens (post-processing).
import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Bloom, EffectComposer, N8AO, Noise, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import type { Camera } from "../lib/types.ts";
import { reducedMotion } from "../lib/motion.ts";
import { sharedTextures } from "./objects.ts";
import { Grade } from "./grade.tsx";

const debug = new URLSearchParams(location.search);

export const FOV = 30;
const TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2));

export interface View {
  cam: Camera;
  /** Center of the uncovered part of the screen, CSS px. */
  stage: { cx: number; cy: number; w: number; h: number };
}

/** Camera distance so that the wall plane shows exactly `zoom` CSS px per world px. */
export const distanceFor = (viewportH: number, zoom: number) => viewportH / zoom / (2 * TAN);

/** Straight-on perspective camera. The principal point is shifted to the stage center. */
export function CameraRig({ view }: { view: View }) {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const d = distanceFor(size.height, view.cam.zoom);
    cam.fov = FOV;
    cam.position.set(view.cam.x, -view.cam.y, d);
    cam.near = Math.max(1, d * 0.05);
    cam.far = d * 2 + 4000;
    cam.setViewOffset(size.width, size.height, size.width / 2 - view.stage.cx, size.height / 2 - view.stage.cy, size.width, size.height);
    cam.updateProjectionMatrix();
  }, [camera, size, view]);
  return null;
}

/** Endless cork. The texture tiles every 520 world px; the plane is far bigger than any view. */
export function Cork() {
  const { cork } = sharedTextures();
  const SIZE = 60000;
  const mat = useMemo(() => {
    const rep = SIZE / 520;
    for (const t of [cork.map, cork.normalMap, cork.roughnessMap]) t.repeat.set(rep, rep);
    const m = new THREE.MeshStandardMaterial({
      map: cork.map,
      normalMap: cork.normalMap,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughnessMap: cork.roughnessMap,
      roughness: 1,
      envMapIntensity: 0.25,
    });
    // Large-scale variation (sun-faded patches, handling) at ~2900 px, so the 520 px tile never shows.
    m.onBeforeCompile = (sh) => {
      sh.uniforms.macroMap = { value: cork.macro };
      sh.fragmentShader = sh.fragmentShader
        .replace("void main() {", "uniform sampler2D macroMap;\nvoid main() {")
        .replace(
          "#include <map_fragment>",
          "#include <map_fragment>\n  float macro = texture2D(macroMap, vMapUv * 0.179).r;\n  diffuseColor.rgb *= mix(0.8, 1.16, macro);",
        );
    };
    return m;
  }, [cork]);
  return (
    <mesh material={mat} receiveShadow>
      <planeGeometry args={[SIZE, SIZE]} />
    </mesh>
  );
}

// ───────────────────────── lighting ─────────────────────────

const TUNGSTEN = new THREE.Color("#ffcf9c"); // ≈ 2900 K
const LAMP_DECAY = 1.3;
const SPOT = new THREE.Color("#ffe0bd");
const MOON = new THREE.Color("#8ea6d4"); // cold, from the window

interface LightRig {
  lampPos: THREE.Vector3;
  lampTarget: THREE.Vector3;
  spotPos: THREE.Vector3;
  spotTarget: THREE.Vector3;
}

/**
 * Where the (unseen) lamp hangs for this view: just above the top of the frame, a fifth of the way
 * to the camera. Only its light is in the picture: a warm pool that falls off down the wall.
 */
export function lampPlacement(view: View, viewportH: number) {
  const d = distanceFor(viewportH, view.cam.zoom);
  const z = d * Number(debug.get("lampZ") ?? 0.21);
  const pxPerUnit = view.cam.zoom / 0.8; // at that depth
  const y = -view.cam.y + (view.stage.cy + 70) / pxPerUnit;
  return { pos: new THREE.Vector3(view.cam.x, y, z), scale: 1 / pxPerUnit, d };
}

export function Lights({ view, focus, rig }: { view: View; focus: { x: number; y: number } | null; rig: React.MutableRefObject<LightRig> }) {
  const { size } = useThree();
  const lamp = useRef<THREE.SpotLight>(null);
  const spot = useRef<THREE.SpotLight>(null);
  const moon = useRef<THREE.SpotLight>(null);
  const moonTarget = useMemo(() => new THREE.Object3D(), []);
  const { blinds } = sharedTextures();
  const lampTarget = useMemo(() => new THREE.Object3D(), []);
  const spotTarget = useMemo(() => new THREE.Object3D(), []);
  const spotAim = useRef(new THREE.Vector3(focus?.x ?? view.cam.x, -(focus?.y ?? view.cam.y), 0));

  useFrame((state, dt) => {
    const { pos, d } = lampPlacement(view, size.height);
    const L = lamp.current;
    const S = spot.current;
    if (!L || !S) return;
    // The lamp still hangs on its cord out of shot: a slow sway keeps the shadows faintly alive.
    const sway = reducedMotion() ? 0 : Math.sin(state.clock.elapsedTime * 0.55) * 7 * (0.8 / view.cam.zoom);
    L.position.set(pos.x + sway, pos.y - 10 * (0.8 / view.cam.zoom), pos.z);
    lampTarget.position.set(view.cam.x, pos.y - (size.height / view.cam.zoom) * 0.42, 0);
    // Light falls off with distance from the bulb: brightest just under the lamp.
    // Normalised to the lamp's distance from the wall so it looks the same at any zoom.
    L.intensity = 3.4 * Math.pow(pos.z * 1.25, LAMP_DECAY);
    lampTarget.updateMatrixWorld();

    // The spotlight glides to the focused note (SPEC §7).
    const goal = new THREE.Vector3(focus ? focus.x : view.cam.x, -(focus ? focus.y : view.cam.y), 0);
    const k = reducedMotion() ? 1 : 1 - Math.exp(-dt * 4.2);
    spotAim.current.lerp(goal, k);
    const a = spotAim.current;
    // High and to the left, so every pin and curl throws a shadow down and to the right.
    S.position.set(a.x - 240, a.y + 430, 560);
    spotTarget.position.copy(a);
    spotTarget.updateMatrixWorld();
    // Moonlight through the blinds, from high on the left, laying cold stripes across the wall.
    // Placed relative to the view (like the lamp) so the stripes keep their size at any zoom.
    const M = moon.current;
    if (M) {
      const W = size.width / view.cam.zoom;
      const H = size.height / view.cam.zoom;
      const cx = view.cam.x;
      const cy = -view.cam.y;
      M.position.set(cx - W * 0.9, cy + H * 0.45, d * 0.55);
      moonTarget.position.set(cx - W * 0.18, cy - H * 0.02, 0);
      moonTarget.updateMatrixWorld();
    }
    rig.current = { lampPos: L.position.clone(), lampTarget: lampTarget.position.clone(), spotPos: S.position.clone(), spotTarget: a.clone() };
    void d;
  });

  return (
    <>
      {/* Fill: cool, like moonlight from a skylight, so shadows go blue-grey against the tungsten. */}
      <ambientLight color="#394560" intensity={debug.get("fill") === "0" ? 0 : 0.42} />
      <hemisphereLight color="#43506a" groundColor="#1a120c" intensity={debug.get("fill") === "0" ? 0 : 0.35} />
      <spotLight
        ref={lamp}
        color={TUNGSTEN}
        decay={LAMP_DECAY}
        angle={1.3}
        penumbra={1}
        target={lampTarget}
        castShadow
        shadow-mapSize={[SHADOW_SIZE, SHADOW_SIZE]}
        shadow-bias={-0.00002}
        shadow-normalBias={0.02}
        shadow-radius={6}
        shadow-camera-near={150}
        shadow-camera-far={6000}
      />
      <spotLight
        ref={spot}
        color={SPOT}
        intensity={2.3}
        decay={0}
        angle={0.42}
        penumbra={1}
        target={spotTarget}
        castShadow
        shadow-mapSize={[SHADOW_SIZE, SHADOW_SIZE]}
        shadow-bias={-0.00002}
        shadow-normalBias={0.02}
        shadow-radius={4}
        shadow-camera-near={300}
        shadow-camera-far={2500}
      />
      {!LITE && debug.get("moon") !== "0" && (
        <spotLight
          ref={moon}
          color={MOON}
          intensity={Number(debug.get("moonI") ?? 4.2)}
          decay={0}
          angle={0.36}
          penumbra={0.3}
          map={debug.get("moonmap") === "0" ? null : blinds}
          target={moonTarget}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.00005}
          shadow-normalBias={0.02}
          shadow-radius={6}
          shadow-camera-near={300}
          shadow-camera-far={20000}
        />
      )}
      <primitive object={moonTarget} />
      <primitive object={lampTarget} />
      <primitive object={spotTarget} />
      {/* Reflections for brass, steel and clearcoat: a warm softbox where the lamp is, a dim bounce below. */}
      <Environment resolution={128} environmentIntensity={debug.get("fill") === "0" ? 0 : 0.3}>
        <Lightformer form="rect" intensity={4} color="#ffcf96" position={[0, 6, 4]} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#8a6040" position={[0, -6, 3]} scale={[12, 4, 1]} />
        <Lightformer form="ring" intensity={2} color="#ffe2b8" position={[-5, 3, 6]} scale={2} />
      </Environment>
    </>
  );
}

// ───────────────────────── dust ─────────────────────────

const DUST_VERT = /* glsl */ `
uniform float uTime;
uniform vec3 uBox;
uniform vec3 uCenter;
uniform vec3 uSpotPos; uniform vec3 uSpotDir; uniform float uSpotCos;
uniform vec3 uLampPos; uniform vec3 uLampDir; uniform float uLampCos;
uniform float uSize;
attribute vec3 aSeed;
varying float vLight;
varying float vTw;
void main() {
  vec3 p = aSeed * uBox;
  float t = uTime;
  p.x += sin(t * 0.07 + aSeed.y * 20.0) * 30.0 + t * 4.0 * (aSeed.z - 0.5);
  p.y += -t * (2.0 + aSeed.x * 3.0) + cos(t * 0.05 + aSeed.x * 30.0) * 24.0;
  p.z += sin(t * 0.06 + aSeed.z * 10.0) * 18.0;
  vec3 origin = uCenter - 0.5 * uBox;
  p = origin + mod(p - origin, uBox);
  float s = dot(normalize(p - uSpotPos), uSpotDir);
  float l = dot(normalize(p - uLampPos), uLampDir);
  vLight = smoothstep(uSpotCos, uSpotCos + 0.05, s) * 0.9 + smoothstep(uLampCos, uLampCos + 0.2, l) * 0.35;
  vTw = 0.55 + 0.45 * sin(t * 1.7 + aSeed.y * 60.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize * (0.5 + aSeed.x * aSeed.x * 2.2) / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const DUST_FRAG = /* glsl */ `
varying float vLight;
varying float vTw;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = pow(smoothstep(0.5, 0.0, d), 1.6);
  gl_FragColor = vec4(vec3(1.0, 0.86, 0.66) * vLight * vTw * a * 0.45, 1.0);
}`;

export function Dust({ view, rig }: { view: View; rig: React.MutableRefObject<LightRig> }) {
  const { size, gl } = useThree();
  const count = 1100;
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const seeds = new Float32Array(count * 3);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 3));
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    return g;
  }, []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: DUST_VERT,
        fragmentShader: DUST_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uBox: { value: new THREE.Vector3() },
          uCenter: { value: new THREE.Vector3() },
          uSpotPos: { value: new THREE.Vector3() },
          uSpotDir: { value: new THREE.Vector3(0, 0, -1) },
          uSpotCos: { value: Math.cos(0.4) },
          uLampPos: { value: new THREE.Vector3() },
          uLampDir: { value: new THREE.Vector3(0, 0, -1) },
          uLampCos: { value: Math.cos(0.62) },
          uSize: { value: 3000 },
        },
      }),
    [],
  );
  useFrame((state) => {
    const u = material.uniforms;
    const d = distanceFor(size.height, view.cam.zoom);
    const visW = size.width / view.cam.zoom;
    const visH = size.height / view.cam.zoom;
    u.uTime.value = reducedMotion() ? 0 : state.clock.elapsedTime;
    u.uBox.value.set(visW * 1.15, visH * 1.15, d * 0.55);
    u.uCenter.value.set(view.cam.x, -view.cam.y, d * 0.33);
    const r = rig.current;
    u.uSpotPos.value.copy(r.spotPos);
    u.uSpotDir.value.copy(r.spotTarget).sub(r.spotPos).normalize();
    u.uLampPos.value.copy(r.lampPos);
    u.uLampDir.value.copy(r.lampTarget).sub(r.lampPos).normalize();
    u.uSize.value = 5200 * gl.getPixelRatio() * (d / 2500);
  });
  if (reducedMotion()) return null;
  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

// ───────────────────────── lens ─────────────────────────

/** Phones and small screens get a lighter render: no AO, smaller shadow maps. */
/** Lighter rendering for small or low-core devices. `?lite=0` / `?lite=1` forces it either way. */
export const LITE =
  debug.get("lite") === "0"
    ? false
    : debug.get("lite") === "1" || (typeof window !== "undefined" && (window.innerWidth < 760 || (navigator.hardwareConcurrency ?? 8) <= 4));
const SHADOW_SIZE = LITE ? 1024 : 2048;

export function Lens() {
  if (debug.get("fx") === "0") return null;
  return (
    <EffectComposer multisampling={LITE ? 0 : 4}>
      {debug.get("ao") === "0" || LITE ? <></> : <N8AO aoRadius={18} distanceFalloff={0.6} intensity={1.6} quality="medium" halfRes />}
      <Bloom mipmapBlur intensity={0.45} luminanceThreshold={0.78} luminanceSmoothing={0.3} />
      <ToneMapping mode={debug.get("tm") === "agx" ? ToneMappingMode.AGX : ToneMappingMode.NEUTRAL} />
      {debug.get("grade") === "0" ? <></> : <Grade />}
      <Vignette offset={0.42} darkness={0.46} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.18} />
    </EffectComposer>
  );
}

export type { LightRig };
