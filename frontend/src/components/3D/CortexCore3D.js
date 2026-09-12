import * as THREE from 'three';

/**
 * CortexCore3D — Architectural 3D representation of OmniverseOS Cortex Intelligence.
 * Multi-layer computational geometry with inner neural core, glowing filaments, and dynamic reactivity.
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

    this._buildOuterShell();
    this._buildInnerCore();
    this._buildOrbitalRings();
    this._buildFilamentParticles();

    this.group.position.set(0, 0, 0);
  }

  _buildOuterShell() {
    const geometry = new THREE.IcosahedronGeometry(2.4, 2);
    const wireframeGeometry = new THREE.WireframeGeometry(geometry);
    
    const material = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });

    this.outerShell = new THREE.LineSegments(wireframeGeometry, material);
    this.group.add(this.outerShell);

    // Inner translucent shell
    const innerGeom = new THREE.IcosahedronGeometry(2.2, 1);
    const innerMat = new THREE.MeshPhongMaterial({
      color: 0x050b1a,
      emissive: 0x0a1e3f,
      specular: 0x00f0ff,
      shininess: 90,
      transparent: true,
      opacity: 0.6,
      wireframe: false,
      flatShading: true
    });
    this.innerSolidShell = new THREE.Mesh(innerGeom, innerMat);
    this.group.add(this.innerSolidShell);
  }

  _buildInnerCore() {
    const coreGeom = new THREE.OctahedronGeometry(1.2, 2);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x7b2fff,
      emissive: 0x9333ea,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.9,
      wireframe: false
    });

    this.innerCore = new THREE.Mesh(coreGeom, coreMat);
    this.group.add(this.innerCore);

    // Point light inside Cortex Core
    this.coreLight = new THREE.PointLight(0x00f0ff, 3, 20);
    this.group.add(this.coreLight);
  }

  _buildOrbitalRings() {
    this.rings = [];
    const ringConfigs = [
      { radius: 3.5, tube: 0.02, color: 0x00f0ff, rotX: Math.PI / 4, rotY: 0 },
      { radius: 4.2, tube: 0.015, color: 0xa855f7, rotX: -Math.PI / 3, rotY: Math.PI / 6 },
      { radius: 5.0, tube: 0.01, color: 0x39ff14, rotX: Math.PI / 6, rotY: -Math.PI / 4 }
    ];

    ringConfigs.forEach((cfg) => {
      const ringGeom = new THREE.TorusGeometry(cfg.radius, cfg.tube, 16, 100);
      const ringMat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.rotation.x = cfg.rotX;
      ringMesh.rotation.y = cfg.rotY;
      this.group.add(ringMesh);
      this.rings.push({ mesh: ringMesh, rotSpeedX: (Math.random() - 0.5) * 0.01, rotSpeedY: (Math.random() - 0.5) * 0.015 });
    });
  }

  _buildFilamentParticles() {
    const count = 160;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const color1 = new THREE.Color(0x00f0ff);
    const color2 = new THREE.Color(0xa855f7);

    for (let i = 0; i < count; i++) {
      const radius = 2.5 + Math.random() * 3.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const mixedColor = color1.clone().lerp(color2, Math.random());
      colors[i * 3] = mixedColor.r;
      colors[i * 3 + 1] = mixedColor.g;
      colors[i * 3 + 2] = mixedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(geometry, material);
    this.group.add(this.particles);
  }

  triggerPulse(intensity = 1.5) {
    this.activePulse = intensity;
  }

  update(time, delta, mouse, scrollProgress) {
    // Rotation logic
    this.outerShell.rotation.y += 0.003;
    this.outerShell.rotation.x += 0.001;

    this.innerSolidShell.rotation.y -= 0.002;
    this.innerCore.rotation.y += 0.01;
    this.innerCore.rotation.z += 0.005;

    this.particles.rotation.y += 0.002;

    this.rings.forEach((r) => {
      r.mesh.rotation.x += r.rotSpeedX;
      r.mesh.rotation.y += r.rotSpeedY;
    });

    // Parallax mouse interaction
    const targetRotX = mouse.y * 0.15;
    const targetRotY = mouse.x * 0.15;
    this.group.rotation.x += (targetRotX - this.group.rotation.x) * 0.05;
    this.group.rotation.y += (targetRotY - this.group.rotation.y) * 0.05;

    // Pulse decay & light pulsation
    if (this.activePulse > 0) {
      this.activePulse = Math.max(0, this.activePulse - delta * 2);
    }

    const pulseFactor = 1 + Math.sin(time * 3) * 0.08 + this.activePulse;
    this.innerCore.scale.set(pulseFactor, pulseFactor, pulseFactor);
    this.coreLight.intensity = 2.5 + Math.sin(time * 4) * 1.5 + this.activePulse * 4;

    // Scroll progress influence
    this.group.position.y = Math.sin(scrollProgress * Math.PI * 2) * 0.5;
  }

  destroy() {
    if (this.group && this.scene) {
      this.scene.remove(this.group);
    }
  }
}
