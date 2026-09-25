// A film grade for the attic: cool shadows, warm highlights, blacks lifted a touch the way a print
// never quite reaches black, and a slight overall desaturation. Runs after tone mapping.
import { forwardRef, useMemo } from "react";
import { Effect } from "postprocessing";
import * as THREE from "three";

const FRAG = /* glsl */ `
uniform vec3 shadowTint;
uniform vec3 highlightTint;
uniform float lift;
uniform float saturation;
uniform float contrast;

vec3 toPerceptual(vec3 c) { return pow(max(c, 0.0), vec3(1.0 / 2.2)); }
vec3 toLinear(vec3 c) { return pow(max(c, 0.0), vec3(2.2)); }

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = toPerceptual(inputColor.rgb);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  // Split toning, weighted by luminance.
  c += shadowTint * (1.0 - smoothstep(0.0, 0.5, l));
  c += highlightTint * smoothstep(0.45, 1.0, l);
  // A soft S-curve around mid-grey.
  c = mix(c, c * c * (3.0 - 2.0 * c), contrast);
  // Film base: blacks sit a little above zero, whites a little below one.
  c = lift + c * (1.0 - lift * 1.6);
  c = mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, saturation);
  outputColor = vec4(toLinear(c), inputColor.a);
}
`;

class GradeEffect extends Effect {
  constructor() {
    super("GradeEffect", FRAG, {
      uniforms: new Map<string, THREE.Uniform>([
        ["shadowTint", new THREE.Uniform(new THREE.Vector3(-0.012, 0.004, 0.03))],
        ["highlightTint", new THREE.Uniform(new THREE.Vector3(0.022, 0.008, -0.02))],
        ["lift", new THREE.Uniform(0.02)],
        ["saturation", new THREE.Uniform(0.94)],
        ["contrast", new THREE.Uniform(0.12)],
      ]),
    });
  }
}

export const Grade = forwardRef<GradeEffect>(function Grade(_, ref) {
  const effect = useMemo(() => new GradeEffect(), []);
  return <primitive ref={ref} object={effect} dispose={null} />;
});
