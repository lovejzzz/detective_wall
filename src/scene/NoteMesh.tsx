import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { Note } from "../lib/types.ts";
import { NOTE_SIZE } from "../lib/geometry.ts";
import { reducedMotion } from "../lib/motion.ts";
import { photoIdOf, photoURL } from "../lib/images.ts";
import { commonsFileOf, loadCommonsImage } from "../lib/commons.ts";
import { loadPagePhoto, pagePhotoOf } from "../lib/pagephoto.ts";
import { paintKey, paintNote } from "./paint.ts";
import { PUSHPIN, TACK, binderClip, contactShadow, liftAtPin, paperGeometry, pinMaterials, sharedTextures, tapeMaterial } from "./objects.ts";

export interface NoteHandlers {
  onGrab(id: string, e: ThreeEvent<PointerEvent>): void;
  onGrabPin(id: string, e: ThreeEvent<PointerEvent>): void;
  onHover(id: string | null): void;
}

interface Props extends NoteHandlers {
  note: Note;
  index: number;
  dragging: boolean;
  dragTilt: number;
  hovered: boolean;
  fontsVersion: number;
  /** Where the timeline puts this note; absent on the free wall. */
  slot?: { x: number; y: number; rotation: number };
}

/**
 * Loads a photo note's picture: from this browser's IndexedDB, a real case photo from
 * Wikimedia Commons, or the lead picture of the page that published it. Painting doesn't wait: the sheet shows its fallback, then repaints.
 */
function usePhoto(note: Note): HTMLImageElement | undefined {
  const id = photoIdOf(note.imageUrl);
  const commons = commonsFileOf(note.imageUrl);
  const page = pagePhotoOf(note.imageUrl);
  const [img, setImg] = useState<HTMLImageElement | undefined>(undefined);
  useEffect(() => {
    setImg(undefined);
    let alive = true;
    if (id) {
      void photoURL(id).then((url) => {
        if (!url || !alive) return;
        const el = new Image();
        el.onload = () => alive && setImg(el);
        el.src = url;
      });
    } else if (commons) {
      void loadCommonsImage(commons).then((r) => alive && r && setImg(r.img));
    } else if (page) {
      void loadPagePhoto(page).then((el) => alive && el && setImg(el));
    }
    return () => {
      alive = false;
    };
  }, [id, commons, page]);
  return id || commons || page ? img : undefined;
}

function useNoteTexture(note: Note, fontsVersion: number) {
  const key = paintKey(note);
  const photo = usePhoto(note);
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(paintNote(note, undefined, photo));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fontsVersion, photo]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

function Pin({ note, onGrabPin }: { note: Note; onGrabPin: Props["onGrabPin"] }) {
  const { h } = NOTE_SIZE[note.type];
  const y = h / 2 - 18;
  const z = liftAtPin(note.type) + 0.4;
  const clip = useMemo(() => (note.type === "photo" ? binderClip() : null), [note.type]);
  const [hot, setHot] = useState(false);
  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onGrabPin(note.id, e);
  };
  // A pin is a small target: give it a generous invisible grab zone and say what it does.
  const hit = (
    <mesh
      position={[0, clip ? h / 2 - 6 : y, z + 6]}
      onPointerDown={onDown}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHot(true);
        document.body.style.cursor = "crosshair";
      }}
      onPointerOut={() => {
        setHot(false);
        document.body.style.cursor = "";
      }}
    >
      <sphereGeometry args={[clip ? 22 : 17, 12, 8]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
  if (clip)
    return (
      <>
        <primitive object={clip} position={[0, h / 2 - 4, z]} scale={hot ? 1.08 : 1} />
        {hit}
      </>
    );
  const tack = note.type === "fact";
  // Tilt the pin a touch, as if pushed in by thumb.
  const tilt = ((note.id.charCodeAt(0) % 7) - 3) * 0.03;
  return (
    <>
      <mesh
        geometry={tack ? TACK : PUSHPIN}
        material={tack ? pinMaterials.brass : pinMaterials.red}
        position={[0, y, z]}
        rotation={[tilt, -tilt * 0.6, 0]}
        scale={hot ? 1.18 : 1}
        castShadow
      />
      {hit}
    </>
  );
}

function Tape() {
  const mat = useMemo(() => tapeMaterial(), []);
  const { w, h } = NOTE_SIZE.web;
  return (
    <>
      <mesh material={mat} position={[-w / 2 + 14, h / 2 - 6, 2.4]} rotation={[0, 0, 0.62]}>
        <planeGeometry args={[74, 22]} />
      </mesh>
      <mesh material={mat} position={[w / 2 - 14, h / 2 - 6, 2.4]} rotation={[0, 0, -0.58]}>
        <planeGeometry args={[74, 22]} />
      </mesh>
    </>
  );
}

export const NoteMesh = memo(function NoteMesh(p: Props) {
  const { note } = p;
  const { w, h } = NOTE_SIZE[note.type];
  const tex = useNoteTexture(note, p.fontsVersion);
  const geom = useMemo(() => paperGeometry(note.type, note.id), [note.type, note.id]);
  const { paperNormal } = sharedTextures();
  const proposed = note.status === "proposed";
  const group = useRef<THREE.Group>(null);
  const phase = useMemo(() => (note.id.charCodeAt(1) % 17) / 3, [note.id]);

  const material = useMemo(() => {
    const normalMap = paperNormal.clone();
    normalMap.needsUpdate = true;
    normalMap.repeat.set(w / 180, h / 180);
    const common = {
      map: tex,
      normalMap,
      normalScale: new THREE.Vector2(0.35, 0.35),
      alphaTest: note.type === "web" ? 0.5 : 0,
      envMapIntensity: 0.4,
    };
    // emissiveMap = the paper itself, so a glow reads as light on the sheet, not a coloured wash.
    const glow = { emissive: new THREE.Color("#ffe2b8"), emissiveMap: tex, emissiveIntensity: 0 };
    if (note.type === "photo") return new THREE.MeshPhysicalMaterial({ ...common, ...glow, roughness: 0.55, clearcoat: 0.7, clearcoatRoughness: 0.22 });
    return new THREE.MeshStandardMaterial({ ...common, ...glow, roughness: note.type === "hypothesis" ? 0.78 : 0.9 });
  }, [tex, note.type, paperNormal, w, h]);
  useEffect(() => () => material.dispose(), [material]);

  // Physical settling: lift when hovered or held, float loose while only proposed.
  const baseZ = 1.4 + p.index * 0.12;
  const target = useRef({ z: baseZ, tilt: 0, scale: 1 });
  target.current = {
    z: baseZ + (p.dragging ? 34 : proposed ? 16 : p.hovered ? 2.5 : 0),
    tilt: p.dragTilt,
    scale: p.dragging ? 1.025 : 1,
  };
  useLayoutEffect(() => {
    const g = group.current;
    if (!g) return;
    g.position.set(note.x, -note.y, target.current.z);
    g.rotation.set(0, 0, -THREE.MathUtils.degToRad(note.rotation));
    // Fresh evidence arrives from the viewer's side, as if just handed up to the wall.
    if (Date.now() - note.createdAt < 1500 && !reducedMotion()) {
      g.position.z += 150;
      g.position.y += 26;
      g.rotation.z += 0.12;
      g.scale.setScalar(1.08);
    }
    // Only on mount: afterwards the frame loop eases toward the target.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const arriving = Date.now() - note.createdAt < 1400;
    const k = reducedMotion() ? 1 : 1 - Math.exp(-dt * (arriving ? 5 : 14));
    // Dragging: x/y follow the pointer exactly. Switching views: the sheet glides to its new place.
    const tx = p.slot ? p.slot.x : note.x;
    const ty = p.slot ? -p.slot.y : -note.y;
    if (p.dragging) {
      g.position.x = tx;
      g.position.y = ty;
    } else {
      const kk = reducedMotion() ? 1 : 1 - Math.exp(-dt * 5);
      g.position.x += (tx - g.position.x) * kk;
      g.position.y += (ty - g.position.y) * kk;
      if (Math.abs(tx - g.position.x) < 0.05) g.position.x = tx;
      if (Math.abs(ty - g.position.y) < 0.05) g.position.y = ty;
    }
    const bob = proposed && !reducedMotion() ? Math.sin(state.clock.elapsedTime * 0.9 + phase) * 2.2 : 0;
    g.position.z += (target.current.z + bob - g.position.z) * k;
    const rot = -THREE.MathUtils.degToRad((p.slot ? p.slot.rotation : note.rotation) + target.current.tilt);
    g.rotation.z += (rot - g.rotation.z) * k;
    const sway = proposed && !reducedMotion() ? Math.sin(state.clock.elapsedTime * 0.6 + phase) * 0.04 : 0;
    g.rotation.x += (sway - g.rotation.x) * k;
    const s = g.scale.x + (target.current.scale - g.scale.x) * k;
    g.scale.setScalar(s);
    // New evidence warms up as it arrives, and loose sheets stay faintly lit so none hide in the dark.
    const age = (Date.now() - note.createdAt) / 1000;
    const arrival = age < 6 ? 0.45 * (1 - age / 6) ** 2 : 0;
    material.emissiveIntensity = Math.max(arrival, proposed ? 0.1 : 0);
  });

  return (
    <>
    <ContactShadow note={note} follow={group} lifted={p.dragging ? 34 : proposed ? 16 : 0} />
    <group ref={group}>
      <mesh
        geometry={geom}
        material={material}
        castShadow
        receiveShadow
        userData={{ noteId: note.id }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.stopPropagation();
          p.onGrab(note.id, e);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          p.onHover(note.id);
        }}
        onPointerOut={() => p.onHover(null)}
      />
      {!proposed && <Pin note={note} onGrabPin={p.onGrabPin} />}
      {!proposed && note.type === "web" && <Tape />}
    </group>
    </>
  );
});

/**
 * The soft shadow a sheet leaves on the cork. The lamp is overhead, so it falls a little
 * downward, and it spreads and fades as the sheet lifts away from the wall.
 */
function ContactShadow({ note, lifted, follow }: { note: Note; lifted: number; follow: React.RefObject<THREE.Group | null> }) {
  const { w, h } = NOTE_SIZE[note.type];
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#000", alphaMap: contactShadow(), transparent: true, opacity: 0.5, depthWrite: false }),
    [],
  );
  const cur = useRef(lifted);
  useFrame((_, dt) => {
    const m = mesh.current;
    if (!m) return;
    cur.current += (lifted - cur.current) * (reducedMotion() ? 1 : 1 - Math.exp(-dt * 10));
    const L = cur.current;
    const spread = 1 + L * 0.012;
    // Follow the sheet itself, so the shadow travels with it when it moves between views.
    const g = follow.current;
    const gx = g ? g.position.x : note.x;
    const gy = g ? g.position.y : -note.y;
    m.position.set(gx + L * 0.25, gy - 3 - L * 0.55, 0.25);
    m.rotation.z = g ? g.rotation.z : -THREE.MathUtils.degToRad(note.rotation);
    // The blurred rect fills 208/256 of the texture; size it to the sheet plus a few px.
    m.scale.set(((w - 2) / 208) * spread, ((h - 2) / 208) * spread, 1);
    mat.opacity = 0.3 / (1 + L * 0.04);
  });
  return (
    <mesh ref={mesh} material={mat} renderOrder={-1}>
      <planeGeometry args={[256, 256]} />
    </mesh>
  );
}
