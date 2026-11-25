import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * Procedural 3D Smart City visualization using Three.js.
 * Follows software-WebGL detection, RoomEnvironment PBR reflections,
 * InstancedMesh architectural towers, glowing transit viaduct, and safe cleanup.
 */
export function SmartCityCanvas({ className = '' }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = containerRef.current;
    if (!mount) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = mount.clientWidth || 640;
    const height = mount.clientHeight || 420;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#07111F');
    scene.fog = new THREE.FogExp2('#07111F', 0.036);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 160);
    camera.position.set(16, 12.5, 19);
    camera.lookAt(0, 1.5, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    // Balanced 3-point + hemisphere studio rig
    const hemi = new THREE.HemisphereLight('#36C5D9', '#07111F', 0.9);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight('#F4F8FC', 1.6);
    keyLight.position.set(14, 24, 12);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#19C98A', 1.2);
    rimLight.position.set(-16, 10, -14);
    scene.add(rimLight);

    // Base ground plane + fine geospatial grid
    const groundGeo = new THREE.PlaneGeometry(80, 80);
    const groundMat = new THREE.MeshStandardMaterial({
      color: '#091526',
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    scene.add(ground);

    const grid = new THREE.GridHelper(54, 36, '#19C98A', '#142B40');
    grid.position.y = 0.02;
    scene.add(grid);

    // Instanced urban building blocks (multi-tier architectural silhouette)
    const cityGroup = new THREE.Group();
    scene.add(cityGroup);

    const gridRange = 7;
    const positions: { x: number; z: number; h: number; w: number; d: number }[] = [];
    let seed = 42;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (let gx = -gridRange; gx <= gridRange; gx++) {
      for (let gz = -gridRange; gz <= gridRange; gz++) {
        if (Math.abs(gx) <= 1 && Math.abs(gz) <= 1) continue; // central civic plaza
        if (Math.abs(gx - gz) <= 1) continue; // transit corridor avenue
        if (rand() < 0.25) continue;
        const dist = Math.hypot(gx, gz);
        const h = Math.max(0.6, (5.8 - dist * 0.48) * (0.45 + rand() * 0.95));
        positions.push({
          x: gx * 1.55 + (rand() - 0.5) * 0.25,
          z: gz * 1.55 + (rand() - 0.5) * 0.25,
          h,
          w: 0.65 + rand() * 0.45,
          d: 0.65 + rand() * 0.45,
        });
      }
    }

    const baseGeo = new THREE.BoxGeometry(1, 1, 1);
    const towerMat = new THREE.MeshStandardMaterial({
      color: '#102338',
      roughness: 0.35,
      metalness: 0.55,
    });
    const instancedTowers = new THREE.InstancedMesh(baseGeo, towerMat, positions.length);
    const capGeo = new THREE.BoxGeometry(1.04, 0.09, 1.04);
    const capMat = new THREE.MeshStandardMaterial({
      color: '#19C98A',
      emissive: '#19C98A',
      emissiveIntensity: 0.45,
      roughness: 0.25,
      metalness: 0.6,
    });
    const instancedCaps = new THREE.InstancedMesh(capGeo, capMat, positions.length);

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    positions.forEach((p, idx) => {
      dummy.position.set(p.x, p.h / 2, p.z);
      dummy.scale.set(p.w, p.h, p.d);
      dummy.updateMatrix();
      instancedTowers.setMatrixAt(idx, dummy.matrix);

      const shade = 0.85 + (idx % 5) * 0.06;
      color.setRGB(0.08 * shade, 0.17 * shade, 0.28 * shade);
      instancedTowers.setColorAt(idx, color);

      dummy.position.set(p.x, p.h + 0.045, p.z);
      dummy.scale.set(p.w * 0.88, 1, p.d * 0.88);
      dummy.updateMatrix();
      instancedCaps.setMatrixAt(idx, dummy.matrix);
    });

    instancedTowers.instanceMatrix.needsUpdate = true;
    if (instancedTowers.instanceColor) instancedTowers.instanceColor.needsUpdate = true;
    instancedTowers.computeBoundingSphere();

    instancedCaps.instanceMatrix.needsUpdate = true;
    instancedCaps.computeBoundingSphere();

    cityGroup.add(instancedTowers, instancedCaps);

    // Composite central civic landmark hub (multi-part THREE.Group)
    const civicHub = new THREE.Group();
    const plinthGeo = new THREE.CylinderGeometry(1.55, 1.8, 0.45, 32);
    const plinthMat = new THREE.MeshStandardMaterial({ color: '#142B40', roughness: 0.5, metalness: 0.3 });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.y = 0.225;

    const ringGeo = new THREE.TorusGeometry(1.25, 0.055, 16, 48);
    const ringMat = new THREE.MeshStandardMaterial({
      color: '#48E6B0',
      emissive: '#19C98A',
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.8,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.5;

    const domeGeo = new THREE.SphereGeometry(0.75, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({
      color: '#1b3854',
      roughness: 0.25,
      metalness: 0.75,
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.y = 0.45;

    const spireGeo = new THREE.CylinderGeometry(0.03, 0.08, 2.2, 12);
    const spire = new THREE.Mesh(spireGeo, ringMat);
    spire.position.y = 1.65;

    civicHub.add(plinth, ring, dome, spire);
    cityGroup.add(civicHub);

    // Elevated metro transit corridor curve (TubeGeometry)
    const transitCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-12, 1.35, -12),
      new THREE.Vector3(-4, 1.65, -4.5),
      new THREE.Vector3(0.4, 1.8, 0.4),
      new THREE.Vector3(5, 1.6, 5.2),
      new THREE.Vector3(12, 1.35, 12),
    ]);
    const transitGeo = new THREE.TubeGeometry(transitCurve, 64, 0.11, 10, false);
    const transitMat = new THREE.MeshStandardMaterial({
      color: '#36C5D9',
      emissive: '#36C5D9',
      emissiveIntensity: 0.55,
      roughness: 0.25,
      metalness: 0.7,
    });
    const transitLine = new THREE.Mesh(transitGeo, transitMat);
    cityGroup.add(transitLine);

    // Moving transit capsule along corridor
    const trainGeo = new THREE.CapsuleGeometry(0.16, 0.75, 6, 10);
    const trainMat = new THREE.MeshStandardMaterial({
      color: '#48E6B0',
      emissive: '#48E6B0',
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.5,
    });
    const trainMesh = new THREE.Mesh(trainGeo, trainMat);
    cityGroup.add(trainMesh);

    // Reusable vectors outside loop (zero GC in render loop)
    const _trainPos = new THREE.Vector3();
    const _trainAhead = new THREE.Vector3();
    const clock = new THREE.Clock();

    let frameId = 0;
    let disposed = false;

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (status === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 8);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 85);
        }
      };
      frameId = window.setTimeout(poll, 8);
    };

    const renderFrame = () => {
      if (disposed) return;
      const elapsed = clock.getElapsedTime();

      if (!prefersReducedMotion) {
        cityGroup.rotation.y = elapsed * 0.085;
        const t = (elapsed * 0.11) % 1;
        transitCurve.getPointAt(t, _trainPos);
        transitCurve.getPointAt((t + 0.01) % 1, _trainAhead);
        trainMesh.position.copy(_trainPos);
        trainMesh.lookAt(_trainAhead);
        trainMesh.rotateX(Math.PI / 2);
      } else {
        transitCurve.getPointAt(0.45, _trainPos);
        trainMesh.position.copy(_trainPos);
      }

      renderer.render(scene, camera);

      if (prefersReducedMotion) return;
      if (isSoftwareGl) {
        afterDraw(renderFrame);
      } else {
        frameId = requestAnimationFrame(renderFrame);
      }
    };

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    renderFrame();

    const handleResize = () => {
      if (!mount || disposed) return;
      const w = mount.clientWidth || 640;
      const h = mount.clientHeight || 420;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      groundGeo.dispose();
      groundMat.dispose();
      baseGeo.dispose();
      towerMat.dispose();
      capGeo.dispose();
      capMat.dispose();
      plinthGeo.dispose();
      plinthMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      domeGeo.dispose();
      domeMat.dispose();
      spireGeo.dispose();
      transitGeo.dispose();
      transitMat.dispose();
      trainGeo.dispose();
      trainMat.dispose();
      envTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} className={`w-full h-full ${className}`} aria-hidden="true" />;
}
