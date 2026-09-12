import * as THREE from 'three';

/**
 * CortexCore3D — Architectural 3D Engineered Intelligence Core for OmniverseOS 2.0.
 * Multi-layer computational geometry: smoked optical crystal, dual translucent shells, precision orbital rings.
 */
export class CortexCore3D {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'CortexCoreGroup';
    this.scene.add(this.group);

    this.activePulse = 0;
    this.targetScale = 1;
    this.currentScale = 1;

    this._buildCoreAssembly();
    this._buildOrbitalMechanisms();
    this._buildFilamentParticles();

    this.group.position.set(0, 0, 0);
  }

  _buildCoreAssembly() {
    // 1. Inner Smoked Crystal Core
    const coreGeom = new THREE.OctahedronGeometry(1.3, 2);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x07152c,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.9,
      wireframe: false
    });
    this.innerCore = new THREE.Mesh(coreGeom, coreMat);
    this.group.add(this.innerCore);

    // 2. Primary Translucent Glass Shell
    const shellGeom1 = new THREE.DodecahedronGeometry(2.3, 0);
    const shellMat1 = new THREE.MeshPhongMaterial({
      color: 0x050f26,
      emissive: 0x0a1e3f,
      specular: 0x00f0ff,
      shininess: 100,
      transparent: true,
      opacity: 0.55,
      flatShading: true
    });
    this.shell1 = new THREE.Mesh(shellGeom1, shellMat1);
    this.group.add(this.shell1);

    // 3. Outer Precision Wireframe Frame
    const shellGeom2 = new THREE.IcosahedronGeometry(2.7, 1);
    const wireGeom2 = new THREE.WireframeGeometry(shellGeom2);
    const wireMat2 = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    this.shell2Wire = new THREE.LineSegments(wireGeom2, wireMat2);
    this.group.add(this.shell2Wire);

    // Internal Light Source
    this.coreLight = new THREE.PointLight(0x00f0ff, 3.5, 25);
    this.group.add(this.coreLight);
  }

  _buildOrbitalMechanisms() {
    this.rings = [];
    const ringConfigs = [
      { radius: 3.6, tube: 0.018, color: 0x00f0ff, rotX: Math.PI / 4, rotY: 0, speed: 0.008 },
      { radius: 4.4, tube: 0.014, color: 0x7b2fff, rotX: -Math.PI / 3, rotY: Math.PI / 6, speed: -0.006 },
      { radius: 5.2, tube: 0.010, color: 0x38bdf8, rotX: Math.PI / 6, rotY: -Math.PI / 4, speed: 0.005 }
    ];

    ringConfigs.forEach((cfg) => {
      const ringGeom = new THREE.TorusGeometry(cfg.radius, cfg.tube, 16, 120);
      const ringMat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.rotation.x = cfg.rotX;
      ringMesh.rotation.y = cfg.rotY;
      this.group.add(ringMesh);
      this.rings.push({ mesh: ringMesh, speed: cfg.speed });
    });
  }

  _buildFilamentParticles() {
    const count = 220;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const c1 = new THREE.Color(0x00f0ff);
    const c2 = new THREE.Color(0x7b2fff);

    for (let i = 0; i < count; i++) {
      const radius = 2.8 + Math.random() * 3.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const mixed = c1.clone().lerp(c2, Math.random());
      colors[i * 3] = mixed.r;
      colors[i * 3 + 1] = mixed.g;
      colors[i * 3 + 2] = mixed.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.07,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(geometry, material);
    this.group.add(this.particles);
  }

  triggerPulse(intensity = 1.6) {
    this.activePulse = intensity;
  }

  update(time, delta, mouse, scrollProgress) {
    this.shell2Wire.rotation.y += 0.0025;
    this.shell2Wire.rotation.x += 0.001;

    this.shell1.rotation.y -= 0.002;
    this.innerCore.rotation.y += 0.008;
    this.innerCore.rotation.z += 0.004;

    this.particles.rotation.y += 0.0015;

    this.rings.forEach((r) => {
      r.mesh.rotation.z += r.speed;
    });

    // Smooth mouse parallax
    const targetRotX = mouse.y * 0.12;
    const targetRotY = mouse.x * 0.12;
    this.group.rotation.x += (targetRotX - this.group.rotation.x) * 0.04;
    this.group.rotation.y += (targetRotY - this.group.rotation.y) * 0.04;

    if (this.activePulse > 0) {
      this.activePulse = Math.max(0, this.activePulse - delta * 2);
    }

    const pulse = 1 + Math.sin(time * 2.5) * 0.06 + this.activePulse;
    this.innerCore.scale.set(pulse, pulse, pulse);
    this.coreLight.intensity = 3.0 + Math.sin(time * 3) * 1.2 + this.activePulse * 4.5;

    this.group.position.y = Math.sin(scrollProgress * Math.PI * 2) * 0.4;
  }

  destroy() {
    if (this.group && this.scene) {
      this.scene.remove(this.group);
    }
  }
}
