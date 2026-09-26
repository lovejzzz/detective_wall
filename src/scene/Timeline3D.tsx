import { memo, useEffect, useMemo } from "react";
import * as THREE from "three";
import type { TimelineLayout } from "../lib/timeline.ts";
import { TACK, pinMaterials, sharedTextures } from "./objects.ts";

const CORD_Z = 7;

/** A soft-edged wash: darker in the middle, feathered to nothing at the edges, so a band has no hard line. */
function bandTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const g = c.getContext("2d")!;
  const img = g.createImageData(c.width, c.height);
  const feather = (t: number, f: number) => Math.min(1, t / f, (1 - t) / f);
  for (let y = 0; y < c.height; y++)
    for (let x = 0; x < c.width; x++) {
      const a = feather(x / (c.width - 1), 0.06) * feather(y / (c.height - 1), 0.12);
      const i = (y * c.width + x) * 4;
      img.data[i + 3] = Math.round(255 * a * a * (3 - 2 * a));
    }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Masking tape: a little translucent, papery, with torn ends, for the line across the top of each chapter. */
function tapeTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 48;
  const g = c.getContext("2d")!;
  const img = g.createImageData(c.width, c.height);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const tear = Array.from({ length: c.height }, () => [4 + rand() * 12, 4 + rand() * 12]);
  const streak = Array.from({ length: c.height }, () => rand() * 0.08);
  for (let y = 0; y < c.height; y++)
    for (let x = 0; x < c.width; x++) {
      const i = (y * c.width + x) * 4;
      const grain = rand() * 0.06 + streak[y];
      img.data[i] = Math.round(226 * (1 - grain));
      img.data[i + 1] = Math.round(209 * (1 - grain));
      img.data[i + 2] = Math.round(163 * (1 - grain));
      const inside = x > tear[y][0] && x < c.width - tear[y][1] && y > 1 && y < c.height - 2;
      img.data[i + 3] = inside ? 222 : 0;
    }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** A pool of warm light: how a key moment stands out on the cork, as if a lamp were turned on it. */
function glowTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.45, "rgba(255,255,255,0.5)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A wax seal on the cord where a key moment hangs, in place of the plain tack. */
const SEAL = new THREE.CylinderGeometry(8.5, 9.5, 3.2, 28).rotateX(Math.PI / 2);

/**
 * The timeline as a physical thing: a band of shade behind each chapter, a taut cord across it,
 * a tack per event, a thread to each note, and short threads down to the photos hanging with them.
 */
export const Timeline3D = memo(function Timeline3D({ layout }: { layout: TimelineLayout }) {
  const { stringNormal } = sharedTextures();

  // Materials live as long as the wall: rebuilding them on every layout change would recompile their shaders.
  const cordMat = useMemo(() => {
    const normalMap = stringNormal.clone();
    normalMap.needsUpdate = true;
    normalMap.wrapS = THREE.RepeatWrapping;
    return new THREE.MeshStandardMaterial({ color: "#a01c14", roughness: 0.8, normalMap, normalScale: new THREE.Vector2(1.4, 1.4) });
  }, [stringNormal]);
  const threadMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#211b17", roughness: 0.6 }), []);
  const bandMats = useMemo(() => {
    const map = bandTexture();
    return [0.3, 0.16].map((opacity) => new THREE.MeshBasicMaterial({ color: "#0c0704", map, transparent: true, opacity, depthWrite: false }));
  }, []);
  const glowMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#ffcf8f", map: glowTexture(), transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false }),
    [],
  );
  const tapeMat = useMemo(() => new THREE.MeshStandardMaterial({ map: tapeTexture(), transparent: true, roughness: 0.92, depthWrite: false }), []);
  useEffect(
    () => () => {
      cordMat.dispose();
      threadMat.dispose();
      tapeMat.map?.dispose();
      tapeMat.dispose();
      glowMat.map?.dispose();
      glowMat.dispose();
      bandMats.forEach((m) => {
        m.map?.dispose();
        m.dispose();
      });
    },
    [cordMat, threadMat, tapeMat, glowMat, bandMats],
  );

  const cords = useMemo(() => {
    const longest = Math.max(1, ...layout.cords.map((c) => c.x1 - c.x0));
    cordMat.normalMap!.repeat.set(longest / 7, 1);
    return layout.cords.map(
      (c) => new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(c.x0, -c.y, CORD_Z), new THREE.Vector3(c.x1, -c.y, CORD_Z)), 8, 3.2, 12, false),
    );
  }, [layout, cordMat]);
  useEffect(() => () => cords.forEach((g) => g.dispose()), [cords]);

  const threads = useMemo(() => {
    const out: THREE.TubeGeometry[] = [];
    const tube = (a: THREE.Vector3, b: THREE.Vector3, r: number) => out.push(new THREE.TubeGeometry(new THREE.LineCurve3(a, b), 2, r, 6, false));
    for (const s of layout.slots.values()) {
      if (s.row !== "above" && s.row !== "below") continue;
      tube(new THREE.Vector3(s.anchor.x, -s.anchor.y, CORD_Z), new THREE.Vector3(s.attach.x, -s.attach.y, 9), 0.9);
    }
    for (const t of layout.threads) tube(new THREE.Vector3(t.from.x, -t.from.y, 9), new THREE.Vector3(t.to.x, -t.to.y, 9), 0.75);
    return out;
  }, [layout]);
  useEffect(() => () => threads.forEach((g) => g.dispose()), [threads]);

  const sealed = useMemo(() => new Set(layout.moments.flatMap((m) => (m.anchor ? [`${Math.round(m.anchor.x)}:${Math.round(m.anchor.y)}`] : []))), [layout]);
  const anchors = useMemo(() => {
    const seen = new Set<string>();
    const out: [number, number][] = [];
    for (const s of layout.slots.values()) {
      if (s.row !== "above" && s.row !== "below") continue;
      const key = `${Math.round(s.anchor.x)}:${Math.round(s.anchor.y)}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push([s.anchor.x, s.anchor.y]);
      }
    }
    return out;
  }, [layout]);

  return (
    <group>
      {layout.chapters.map((c, i) => (
        <mesh key={`band-${i}`} position={[c.x + c.w / 2, -(c.y + c.h / 2), 0.6]} scale={[c.w, c.h, 1]} material={bandMats[i % 2]} renderOrder={-1}>
          <planeGeometry />
        </mesh>
      ))}
      {/* a strip of masking tape across the top of each chapter, the way you'd section off a wall */}
      {layout.chapters.map((c, i) =>
        c.continued ? null : (
          <mesh key={`tape-${i}`} position={[c.x + c.w / 2, -(c.y + 14), 1.4]} rotation={[0, 0, (i % 2 ? 1 : -1) * 0.0022]} scale={[c.w - 24, 30, 1]} material={tapeMat} receiveShadow>
            <planeGeometry />
          </mesh>
        ),
      )}
      {layout.aside && (
        <mesh position={[layout.aside.x + layout.aside.w / 2, -(layout.aside.y + 14), 1.4]} scale={[layout.aside.w - 24, 30, 1]} material={tapeMat} receiveShadow>
          <planeGeometry />
        </mesh>
      )}
      {cords.map((g, i) => (
        <group key={`cord-${i}`}>
          <mesh geometry={g} material={cordMat} castShadow />
          {/* big brass tacks hold each end of the cord */}
          {[layout.cords[i].x0, layout.cords[i].x1].map((x) => (
            <mesh key={x} geometry={TACK} material={pinMaterials.brass} position={[x, -layout.cords[i].y, 1]} scale={1.5} castShadow />
          ))}
        </group>
      ))}
      {anchors.map(([x, y]) =>
        sealed.has(`${Math.round(x)}:${Math.round(y)}`) ? (
          <mesh key={`${x}:${y}`} geometry={SEAL} material={pinMaterials.red} position={[x, -y, CORD_Z + 2]} castShadow />
        ) : (
          <mesh key={`${x}:${y}`} geometry={TACK} material={pinMaterials.brass} position={[x, -y, CORD_Z - 2.5]} scale={1.05} castShadow />
        ),
      )}
      {/* key moments stand in their own pool of light */}
      {layout.moments.map((m) => (
        <mesh key={`glow-${m.id}`} position={[m.x, -m.y, 0.9]} scale={[m.w * 2.1, m.h * 1.75, 1]} material={glowMat} renderOrder={-1}>
          <planeGeometry />
        </mesh>
      ))}
      {threads.map((g, i) => (
        <mesh key={i} geometry={g} material={threadMat} castShadow />
      ))}
    </group>
  );
});
