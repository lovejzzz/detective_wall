import { memo, useEffect, useMemo } from "react";
import * as THREE from "three";
import type { TimelineLayout } from "../lib/timeline.ts";
import { TACK, pinMaterials, sharedTextures } from "./objects.ts";

const CORD_Z = 7;

/** The timeline as a physical thing: a taut cord across the cork, a tack per event, a thread to each note. */
export const Timeline3D = memo(function Timeline3D({ layout }: { layout: TimelineLayout }) {
  const { stringNormal } = sharedTextures();
  const { x0, x1 } = layout.cord;

  // One material for the life of the wall: rebuilding it on every layout change would recompile its shader.
  const cordMat = useMemo(() => {
    const normalMap = stringNormal.clone();
    normalMap.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ color: "#a01c14", roughness: 0.8, normalMap, normalScale: new THREE.Vector2(1.4, 1.4) });
  }, [stringNormal]);
  useEffect(() => () => cordMat.dispose(), [cordMat]);
  const cord = useMemo(() => {
    const curve = new THREE.LineCurve3(new THREE.Vector3(x0, 0, CORD_Z), new THREE.Vector3(x1, 0, CORD_Z));
    cordMat.normalMap!.repeat.set((x1 - x0) / 7, 1);
    return { geometry: new THREE.TubeGeometry(curve, 8, 3.2, 12, false), material: cordMat };
  }, [x0, x1, cordMat]);
  useEffect(() => () => cord.geometry.dispose(), [cord]);

  const threads = useMemo(() => {
    const out: THREE.TubeGeometry[] = [];
    for (const s of layout.slots.values()) {
      if (s.row === "aside") continue;
      const a = new THREE.Vector3(s.anchor.x, 0, CORD_Z);
      const b = new THREE.Vector3(s.attach.x, -s.attach.y, 9);
      out.push(new THREE.TubeGeometry(new THREE.LineCurve3(a, b), 2, 0.9, 6, false));
    }
    return out;
  }, [layout]);
  useEffect(() => () => threads.forEach((g) => g.dispose()), [threads]);
  const threadMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#211b17", roughness: 0.6 }), []);

  const anchors = useMemo(() => {
    const xs = new Set<number>();
    for (const s of layout.slots.values()) if (s.row !== "aside") xs.add(Math.round(s.anchor.x));
    return [...xs];
  }, [layout]);

  return (
    <group>
      <mesh geometry={cord.geometry} material={cord.material} castShadow />
      {/* big brass tacks hold each end of the cord */}
      {[x0, x1].map((x) => (
        <mesh key={x} geometry={TACK} material={pinMaterials.brass} position={[x, 0, 1]} scale={1.5} castShadow />
      ))}
      {anchors.map((x) => (
        <mesh key={x} geometry={TACK} material={pinMaterials.brass} position={[x, 0, CORD_Z - 2.5]} scale={1.05} castShadow />
      ))}
      {threads.map((g, i) => (
        <mesh key={i} geometry={g} material={threadMat} castShadow />
      ))}
    </group>
  );
});
