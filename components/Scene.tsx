"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { ringState } from "../lib/ringState";

const MODEL = "/models/ring.glb";

// Width of two interlocked rings relative to one ring's width
const PAIR = 1.48;

function prepare(scene: THREE.Object3D, ownMaterials: boolean) {
  const model = scene.clone(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  model.position.sub(box.getCenter(new THREE.Vector3()));
  const mats: THREE.MeshStandardMaterial[] = [];
  model.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const base = mesh.material as THREE.MeshStandardMaterial;
    const m = ownMaterials ? base.clone() : base;
    m.transparent = true;
    m.envMapIntensity = 1.5;
    mesh.material = m;
    mats.push(m);
  });
  return { model, mats, width: size.x };
}

function Rings() {
  const { scene } = useGLTF(MODEL);
  const { viewport, size } = useThree();
  const group = useRef<THREE.Group>(null!);
  const spinner = useRef<THREE.Group>(null!);
  const shift = useRef<THREE.Group>(null!);
  const second = useRef<THREE.Group>(null!);
  // The pair hierarchy only provides the "linked" pose; the visible rings follow it (or their date slot)
  const refA = useRef<THREE.Object3D>(null!);
  const refB = useRef<THREE.Object3D>(null!);
  const wrapA = useRef<THREE.Group>(null!);
  const wrapB = useRef<THREE.Group>(null!);
  const tmp = useMemo(
    () => ({
      p: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      s: new THREE.Vector3(),
      tp: new THREE.Vector3(),
      tq: new THREE.Quaternion(),
      te: new THREE.Euler(),
    }),
    [],
  );

  const a = useMemo(() => prepare(scene, false), [scene]);
  const b = useMemo(() => prepare(scene, true), [scene]);
  const width = a.width;
  // Hopf link: ring B passes through the hole of ring A, so B sits one radius to the side, turned 90°.
  const reach = (width / 2) * 0.95;

  useFrame((state, dt) => {
    const s = ringState;
    s.spin += dt * s.spinSpeed;
    spinner.current.rotation.y = s.spin + s.scrollRot;

    // Second ring turns and slides into the link as `split` goes 0 -> 1
    shift.current.position.x = -(reach / 2) * s.split;
    second.current.position.x = reach * s.split;
    second.current.rotation.x = (Math.PI / 2) * s.split;

    const fit = Math.min(1, (viewport.width * 0.62) / width);
    const pxPerUnit = size.height / viewport.height;
    const anchorScale = s.anchorPx / (width * PAIR * pxPerUnit);
    const g = group.current;
    g.position.set(
      (THREE.MathUtils.lerp(s.x, s.ax, s.anchor) * viewport.width) / 2,
      (THREE.MathUtils.lerp(s.y, s.ay, s.anchor) * viewport.height) / 2,
      0,
    );
    g.scale.setScalar(THREE.MathUtils.lerp(s.scale * fit, anchorScale, s.anchor));
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, s.tilt + state.pointer.y * 0.14, 0.05);
    g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, -state.pointer.x * 0.12, 0.05);

    g.updateMatrixWorld(true);
    const slotScale = s.dpx / (width * pxPerUnit);
    const place = (ref: THREE.Object3D, wrap: THREE.Group, sx: number, sy: number, phase: number) => {
      ref.matrixWorld.decompose(tmp.p, tmp.q, tmp.s);
      tmp.tp.set((sx * viewport.width) / 2, (sy * viewport.height) / 2, 0);
      // at rest in the date: a fixed, slightly angled pose (no spin)
      tmp.te.set(s.tilt * 0.6, phase, 0);
      tmp.tq.setFromEuler(tmp.te);
      wrap.position.lerpVectors(tmp.p, tmp.tp, s.dates);
      wrap.quaternion.copy(tmp.q).slerp(tmp.tq, s.dates);
      wrap.scale.setScalar(THREE.MathUtils.lerp(tmp.s.x, slotScale, s.dates));
    };
    place(refA.current, wrapA.current, s.d1x, s.d1y, 0.6);
    place(refB.current, wrapB.current, s.d2x, s.d2y, -0.6);
    wrapB.current.visible = s.split > 0.002;

    for (const m of a.mats) m.opacity = s.opacity;
    for (const m of b.mats) m.opacity = s.opacity * s.split;
  });

  return (
    <>
      <group ref={group}>
        <group ref={spinner}>
          <group ref={shift}>
            <object3D ref={refA} />
            <group ref={second}>
              <object3D ref={refB} />
            </group>
          </group>
        </group>
      </group>
      <group ref={wrapA}>
        <primitive object={a.model} />
      </group>
      <group ref={wrapB}>
        <primitive object={b.model} />
      </group>
    </>
  );
}

function Dust() {
  const points = useRef<THREE.Points>(null!);
  const mat = useRef<THREE.PointsMaterial>(null!);
  const COUNT = 320;

  const positions = useMemo(() => {
    const p = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      p[i * 3] = (Math.random() - 0.5) * 12;
      p[i * 3 + 1] = (Math.random() - 0.5) * 8;
      p[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1;
    }
    return p;
  }, []);

  const sprite = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(176,138,62,1)");
    g.addColorStop(0.4, "rgba(190,150,72,0.5)");
    g.addColorStop(1, "rgba(190,150,72,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }, []);

  useFrame((_, dt) => {
    const arr = points.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3 + 1] += dt * (0.05 + (i % 7) * 0.012);
      if (arr[i * 3 + 1] > 4) arr[i * 3 + 1] = -4;
    }
    points.current.geometry.attributes.position.needsUpdate = true;
    points.current.rotation.y = ringState.scrollRot * 0.04;
    mat.current.opacity = ringState.dust * 0.7;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={mat}
        map={sprite}
        size={0.09}
        sizeAttenuation
        transparent
        opacity={0}
        depthWrite={false}
      />
    </points>
  );
}

export default function Scene() {
  return (
    <div className="scene" aria-hidden="true">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 5], fov: 35 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={0.25} />
        <directionalLight position={[3, 4, 5]} intensity={1.1} color="#fff1d6" />
        <Suspense fallback={null}>
          <Environment resolution={256} frames={1}>
            <mesh scale={50}>
              <sphereGeometry args={[1, 32, 16]} />
              <meshBasicMaterial color="#3b342b" side={THREE.BackSide} />
            </mesh>
            <Lightformer form="rect" intensity={4} position={[0, 6, 2]} rotation-x={Math.PI / 2} scale={[14, 6, 1]} />
            <Lightformer form="rect" intensity={3} position={[0, 1, -6]} scale={[14, 4, 1]} />
            <Lightformer form="rect" intensity={1.5} color="#ffe2b0" position={[0, -5, 3]} rotation-x={-Math.PI / 2} scale={[10, 4, 1]} />
            <Lightformer form="rect" intensity={3} color="#ffd9a0" position={[-6, 1, 2]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} />
            <Lightformer form="rect" intensity={3} color="#ffffff" position={[6, -1, 2]} rotation-y={-Math.PI / 2} scale={[8, 3, 1]} />
            <Lightformer form="ring" intensity={2} position={[0, 0, 6]} scale={4} />
          </Environment>
          <Rings />
          <Dust />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL);
