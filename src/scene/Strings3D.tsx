import { memo, useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Link, Note, Relation } from "../lib/types.ts";
import { pinPoint } from "../lib/geometry.ts";
import { paintTag } from "./paint.ts";
import { getLang } from "../lib/i18n.ts";
import { sharedTextures, stringCurve, toThree } from "./objects.ts";

const PIN_Z = 9; // strings loop around the pin's waist

const LOOK: Record<Relation, { color: string; radius: number; rough: number; twist: number }> = {
  supports: { color: "#9e1b14", radius: 1.35, rough: 0.92, twist: 5 }, // red wool
  causes: { color: "#1c1714", radius: 0.75, rough: 0.55, twist: 3 }, // waxed black thread
  contradicts: { color: "#2a5296", radius: 1.15, rough: 0.8, twist: 4 }, // blue cotton
  references: { color: "#c2a673", radius: 1.25, rough: 0.95, twist: 7 }, // jute twine
};

function endpoints(a: Note, b: Note) {
  const pa = pinPoint(a);
  const pb = pinPoint(b);
  return [toThree(pa.x, pa.y, PIN_Z), toThree(pb.x, pb.y, PIN_Z)] as const;
}

function StringTube({ from, to, relation, proposed, lit }: { from: THREE.Vector3; to: THREE.Vector3; relation: Relation; proposed: boolean; lit: boolean | null }) {
  const { stringNormal, dash } = sharedTextures();
  const look = LOOK[relation];
  const key = `${from.x},${from.y},${to.x},${to.y}`;
  const { geometry, length } = useMemo(() => {
    const curve = stringCurve(from, to);
    const radius = proposed ? 0.85 : look.radius;
    return { geometry: new THREE.TubeGeometry(curve, 64, radius, 7, false), length: curve.getLength() };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, proposed, look.radius]);
  const material = useMemo(() => {
    if (proposed) {
      // Pencil line: graphite grey, dashed.
      const alphaMap = dash.clone();
      alphaMap.needsUpdate = true;
      alphaMap.repeat.set(length / 12, 1);
      return new THREE.MeshStandardMaterial({ color: "#2a2826", roughness: 0.5, metalness: 0.35, alphaMap, alphaTest: 0.5 });
    }
    const normalMap = stringNormal.clone();
    normalMap.needsUpdate = true;
    normalMap.repeat.set(length / look.twist, 1);
    return new THREE.MeshStandardMaterial({
      color: look.color,
      roughness: look.rough,
      normalMap,
      normalScale: new THREE.Vector2(1.4, 1.4),
      emissive: look.color,
      emissiveIntensity: 0,
    });
  }, [proposed, length, look, stringNormal, dash]);
  // Hovering a note lights up its web a touch.
  material.emissiveIntensity = lit ? 0.35 : 0;
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  return <mesh geometry={geometry} material={material} castShadow />;
}

const tagCache = new Map<string, THREE.CanvasTexture>();
function tagTexture(relation: Relation, flipped: boolean) {
  const k = `${getLang()}:${relation}:${flipped}`;
  let t = tagCache.get(k);
  if (!t) {
    t = new THREE.CanvasTexture(paintTag(relation, flipped));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    tagCache.set(k, t);
  }
  return t;
}

/** A manila tag hung from the middle of a tied string. Click it for details. */
function Tag({ link, from, to, onOpen }: { link: Link; from: THREE.Vector3; to: THREE.Vector3; onOpen?: (id: string) => void }) {
  const mid = stringCurve(from, to).getPoint(0.5);
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const flipped = angle > Math.PI / 2 || angle < -Math.PI / 2;
  const readable = flipped ? angle - Math.sign(angle) * Math.PI : angle;
  const tilt = THREE.MathUtils.clamp(readable, -0.42, 0.42);
  return (
    <group position={[mid.x, mid.y - 9, mid.z + 1.2]} rotation={[0.18, 0, tilt]}>
      <mesh
        castShadow
        // No handler while hidden (timeline view), so hidden tags can't catch clicks.
        onPointerDown={
          onOpen &&
          ((e) => {
            e.stopPropagation();
            onOpen(link.id);
          })
        }
      >
        <planeGeometry args={[46, 27]} />
        <meshStandardMaterial map={tagTexture(link.relation, flipped)} roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** Where a string's midpoint sits, in world px (for DOM overlays). */
/** A point along the string from a to b (t = 0 at a's pin, 1 at b's), in wall coordinates. */
export function stringPoint(a: Note, b: Note, t: number) {
  const [from, to] = endpoints(a, b);
  // endpoints may put b first; measure t from a either way
  const flip = Math.hypot(from.x - a.x, -from.y - a.y) > Math.hypot(to.x - a.x, -to.y - a.y);
  const m = stringCurve(from, to).getPoint(flip ? 1 - t : t);
  return { x: m.x, y: -m.y };
}

export function stringMid(a: Note, b: Note) {
  const [from, to] = endpoints(a, b);
  const m = stringCurve(from, to).getPoint(0.5);
  return { x: m.x, y: -m.y, angle: Math.atan2(to.y - from.y, to.x - from.x) };
}

interface Props {
  notes: Note[];
  links: Link[];
  lit: Set<string> | null;
  draft: { from: Note; to: { x: number; y: number } } | null;
  onOpenTag?: (id: string) => void;
}

export const Strings3D = memo(function Strings3D({ notes, links, lit, draft, onOpenTag }: Props) {
  const byId = new Map(notes.map((n) => [n.id, n]));
  return (
    <group>
      {links.map((l) => {
        const a = byId.get(l.from);
        const b = byId.get(l.to);
        if (!a || !b) return null;
        const [from, to] = endpoints(a, b);
        return (
          <group key={l.id}>
            <StringTube from={from} to={to} relation={l.relation} proposed={l.status === "proposed"} lit={lit ? lit.has(l.id) : null} />
            {l.status === "pinned" && <Tag link={l} from={from} to={to} onOpen={onOpenTag} />}
          </group>
        );
      })}
      {draft && (
        <StringTube
          from={toThree(pinPoint(draft.from).x, pinPoint(draft.from).y, PIN_Z)}
          to={toThree(draft.to.x, draft.to.y, PIN_Z + 6)}
          relation="supports"
          proposed
          lit={null}
        />
      )}
    </group>
  );
});
