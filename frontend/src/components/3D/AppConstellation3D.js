import * as THREE from 'three';

/**
 * AppConstellation3D — Luxury Architectural 3D Artifacts & Organic Relational Filaments for OmniverseOS 2.0.
 * Replaces generic spheres with specialized 3D computational structures and curved Bezier data pathways.
 */
export class AppConstellation3D {
  constructor(scene, appsList = []) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'AppConstellationGroup';
    this.scene.add(this.group);

    this.nodes = [];
    this.connectionLines = [];
    this.hoveredAppId = null;
    this.selectedAppId = null;
    this.highlightedAppIds = new Set();

    this.apps = appsList.length > 0 ? appsList : [
      { id: "dashboard", name: "Dashboard", color: "#00F0FF", group: "core" },
      { id: "chat", name: "AI Chat", color: "#00F0FF", group: "ai" },
      { id: "image", name: "Image Gen", color: "#7B2FFF", group: "ai" },
      { id: "voice", name: "Cortex", color: "#00F0FF", group: "ai" },
      { id: "memory", name: "Memory", color: "#38BDF8", group: "ai" },
      { id: "projects", name: "Projects", color: "#00F0FF", group: "ai" },
      { id: "timeline", name: "Timeline", color: "#7B2FFF", group: "ai" },
      { id: "notes", name: "Notes", color: "#94A3B8", group: "productivity" },
      { id: "tasks", name: "Tasks", color: "#00F0FF", group: "productivity" },
      { id: "calendar", name: "Calendar", color: "#38BDF8", group: "productivity" },
      { id: "clipboard", name: "Clipboard", color: "#64748B", group: "productivity" },
      { id: "music", name: "Music", color: "#EC4899", group: "media" },
      { id: "videos", name: "Videos", color: "#EC4899", group: "media" },
      { id: "watchlist", name: "Watchlist", color: "#EC4899", group: "media" },
      { id: "files", name: "Files", color: "#38BDF8", group: "system" },
      { id: "code", name: "Code", color: "#00F0FF", group: "system" },
      { id: "browser", name: "Browser", color: "#38BDF8", group: "system" },
      { id: "settings", name: "Settings", color: "#64748B", group: "system" },
      { id: "finance", name: "Finance", color: "#38BDF8", group: "data" },
      { id: "analytics", name: "Analytics", color: "#38BDF8", group: "data" },
      { id: "nebula", name: "Nebula Chat", color: "#7B2FFF", group: "social" },
      { id: "swarm", name: "Swarm Goal", color: "#00F0FF", group: "ai" },
      { id: "faceoff", name: "Face-Off", color: "#00F0FF", group: "ai" },
      { id: "adversary", name: "The Adversary", color: "#EC4899", group: "ai" },
      { id: "warroom", name: "War Room", color: "#7B2FFF", group: "ai" },
      { id: "deadreckoning", name: "Dead Reckoning", color: "#7B2FFF", group: "ai" },
      { id: "matrix", name: "Neural Matrix", color: "#00F0FF", group: "ai" },
      { id: "mirror", name: "Omniverse Mirror", color: "#7B2FFF", group: "ai" },
      { id: "zero", name: "Omniverse Zero", color: "#00F0FF", group: "ai" },
      { id: "blackbox", name: "The Black Box", color: "#00F0FF", group: "ai" }
    ];

    this._buildConstellationArtifacts();
    this._buildOrganicBezierFilaments();
  }

  _createArtifactGeometry(appId) {
    switch (appId) {
      case 'memory':
        // Layered Crystalline Lattice
        return new THREE.BoxGeometry(1.2, 1.2, 1.2);
      case 'projects':
        // Interconnected Frame Structure
        return new THREE.OctahedronGeometry(1.1, 0);
      case 'calendar':
        // Precision Orbital Mechanism Ring
        return new THREE.TorusGeometry(0.9, 0.12, 16, 48);
      case 'files':
        // Volumetric Archive Box
        return new THREE.BoxGeometry(1.4, 0.8, 1.1);
      case 'voice':
        // Acoustic Waveform Deformation Sphere
        return new THREE.IcosahedronGeometry(1.0, 2);
      case 'timeline':
        // Dimensional Ribbon Segment
        return new THREE.CylinderGeometry(0.2, 0.8, 1.4, 16);
      case 'zero':
        // First-Principles Octahedron
        return new THREE.OctahedronGeometry(1.2, 1);
      case 'blackbox':
        // Mysterious Sealed Box
        return new THREE.BoxGeometry(1.1, 1.1, 1.1);
      case 'mirror':
        // Reflective Planar Surface
        return new THREE.ConeGeometry(0.9, 1.3, 4);
      default:
        // Precision Smoked Polyhedron
        return new THREE.DodecahedronGeometry(0.9, 1);
    }
  }

  _buildConstellationArtifacts() {
    const total = this.apps.length;
    const baseRadius = 14;

    this.apps.forEach((app, index) => {
      // Art-directed irregular distribution for cinematic depth
      const phi = Math.acos(1 - (2 * (index + 0.5)) / total);
      const theta = Math.PI * (1 + Math.sqrt(5)) * index;
      const radius = baseRadius + (Math.sin(index * 1.5) * 4);

      const posX = radius * Math.sin(phi) * Math.cos(theta);
      const posY = radius * Math.sin(phi) * Math.sin(theta);
      const posZ = radius * Math.cos(phi);

      const accentColorHex = parseInt(app.color.replace('#', '0x'), 16) || 0x00f0ff;

      // Create Custom Artifact Geometry
      const geometry = this._createArtifactGeometry(app.id);

      // Dark Smoked Optical Glass Material
      const material = new THREE.MeshStandardMaterial({
        color: 0x060f21,
        emissive: accentColorHex,
        emissiveIntensity: 0.35,
        roughness: 0.15,
        metalness: 0.85,
        transparent: true,
        opacity: 0.85
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(posX, posY, posZ);
      mesh.userData = {
        appId: app.id,
        appName: app.name,
        color: app.color,
        basePos: new THREE.Vector3(posX, posY, posZ),
        orbitSpeed: (0.001 + (index % 3) * 0.0005) * (index % 2 === 0 ? 1 : -1),
        orbitRadius: radius,
        phi,
        theta
      };

      // Add Fine Wireframe Emissive Overlay
      const wireGeom = new THREE.WireframeGeometry(geometry);
      const wireMat = new THREE.LineBasicMaterial({
        color: accentColorHex,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending
      });
      const wireframe = new THREE.LineSegments(wireGeom, wireMat);
      mesh.add(wireframe);

      this.group.add(mesh);
      this.nodes.push(mesh);
    });
  }

  _buildOrganicBezierFilaments() {
    // Relational curved quadratic Bezier filaments connecting app nodes to Cortex Core
    this.nodes.forEach((node) => {
      const start = new THREE.Vector3(0, 0, 0);
      const end = node.position.clone();
      
      // Control point offset for smooth organic curve
      const mid = start.clone().add(end).multiplyScalar(0.5);
      mid.x += (Math.random() - 0.5) * 5;
      mid.y += (Math.random() - 0.5) * 5;

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const points = curve.getPoints(24);
      const lineGeom = new THREE.BufferGeometry().setFromPoints(points);

      const lineMat = new THREE.LineBasicMaterial({
        color: node.userData.color,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending
      });

      const line = new THREE.Line(lineGeom, lineMat);
      line.userData = { targetNode: node, curve, mid };
      this.group.add(line);
      this.connectionLines.push(line);
    });
  }

  setHighlightedApps(appIds = []) {
    this.highlightedAppIds = new Set(appIds);
  }

  update(time, delta, raycaster, mouseCamera) {
    this.nodes.forEach((node, idx) => {
      const ud = node.userData;
      ud.theta += ud.orbitSpeed;
      const x = ud.orbitRadius * Math.sin(ud.phi) * Math.cos(ud.theta);
      const z = ud.orbitRadius * Math.cos(ud.phi);
      node.position.x = x;
      node.position.z = z;
      node.position.y = ud.basePos.y + Math.sin(time * 1.2 + idx) * 0.25;

      node.rotation.x += 0.003;
      node.rotation.y += 0.005;

      const isHighlighted = this.highlightedAppIds.has(ud.appId);
      const isHovered = this.hoveredAppId === ud.appId;
      const isSelected = this.selectedAppId === ud.appId;

      const targetScale = isSelected ? 1.6 : isHovered ? 1.4 : isHighlighted ? 1.25 : 1.0;
      node.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08);

      const targetEmissiveIntensity = isSelected ? 1.4 : isHovered ? 1.1 : isHighlighted ? 0.9 : 0.35;
      node.material.emissiveIntensity += (targetEmissiveIntensity - node.material.emissiveIntensity) * 0.08;
    });

    // Update Bezier filament curve endpoints dynamically
    this.connectionLines.forEach((line) => {
      const targetNode = line.userData.targetNode;
      const start = new THREE.Vector3(0, 0, 0);
      const end = targetNode.position.clone();
      const mid = line.userData.mid;

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const points = curve.getPoints(24);
      line.geometry.setFromPoints(points);

      const isHighlighted = this.highlightedAppIds.has(targetNode.userData.appId);
      const isHovered = this.hoveredAppId === targetNode.userData.appId;
      line.material.opacity = isHovered ? 0.75 : isHighlighted ? 0.55 : 0.1;
    });
  }

  handleRaycast(raycaster) {
    const intersects = raycaster.intersectObjects(this.nodes, false);
    if (intersects.length > 0) {
      const first = intersects[0].object;
      this.hoveredAppId = first.userData.appId;
      return first.userData;
    } else {
      this.hoveredAppId = null;
      return null;
    }
  }

  destroy() {
    if (this.group && this.scene) {
      this.scene.remove(this.group);
    }
  }
}
