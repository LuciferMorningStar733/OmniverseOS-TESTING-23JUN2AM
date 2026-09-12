import * as THREE from 'three';

/**
 * AppConstellation3D — 3D Spatial Constellation of 30 OmniverseOS Applications.
 * Handles orbital physics, material responses, raycasting hover/selection, and relational connections.
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
      { id: "image", name: "Image Gen", color: "#A855F7", group: "ai" },
      { id: "voice", name: "Cortex", color: "#4A9EFF", group: "ai" },
      { id: "memory", name: "Memory", color: "#2DD4BF", group: "ai" },
      { id: "projects", name: "Projects", color: "#00F0FF", group: "ai" },
      { id: "timeline", name: "Timeline", color: "#7B2FFF", group: "ai" },
      { id: "notes", name: "Notes", color: "#F59E0B", group: "productivity" },
      { id: "tasks", name: "Tasks", color: "#39FF14", group: "productivity" },
      { id: "calendar", name: "Calendar", color: "#FB923C", group: "productivity" },
      { id: "clipboard", name: "Clipboard", color: "#818CF8", group: "productivity" },
      { id: "music", name: "Music", color: "#F472B6", group: "media" },
      { id: "videos", name: "Videos", color: "#F472B6", group: "media" },
      { id: "watchlist", name: "Watchlist", color: "#F472B6", group: "media" },
      { id: "files", name: "Files", color: "#60A5FA", group: "system" },
      { id: "code", name: "Code", color: "#39FF14", group: "system" },
      { id: "browser", name: "Browser", color: "#60A5FA", group: "system" },
      { id: "settings", name: "Settings", color: "#94A3B8", group: "system" },
      { id: "finance", name: "Finance", color: "#39FF14", group: "data" },
      { id: "analytics", name: "Analytics", color: "#39FF14", group: "data" },
      { id: "nebula", name: "Nebula Chat", color: "#A855F7", group: "social" },
      { id: "swarm", name: "Swarm Goal", color: "#00F0FF", group: "ai" },
      { id: "faceoff", name: "Face-Off", color: "#00F0FF", group: "ai" },
      { id: "adversary", name: "The Adversary", color: "#FF003C", group: "ai" },
      { id: "warroom", name: "War Room", color: "#F59E0B", group: "ai" },
      { id: "deadreckoning", name: "Dead Reckoning", color: "#7B2FFF", group: "ai" },
      { id: "matrix", name: "Neural Matrix", color: "#00F0FF", group: "ai" },
      { id: "mirror", name: "Omniverse Mirror", color: "#A855F7", group: "ai" },
      { id: "zero", name: "Omniverse Zero", color: "#00F0FF", group: "ai" },
      { id: "blackbox", name: "The Black Box", color: "#00F0FF", group: "ai" }
    ];

    this._buildConstellationNodes();
    this._buildRelationalFilaments();
  }

  _buildConstellationNodes() {
    const total = this.apps.length;
    const baseRadius = 12;

    this.apps.forEach((app, index) => {
      // Golden ratio spherical distribution for beautiful 3D spacing
      const phi = Math.acos(1 - (2 * (index + 0.5)) / total);
      const theta = Math.PI * (1 + Math.sqrt(5)) * index;
      const radius = baseRadius + (Math.random() - 0.5) * 4;

      const posX = radius * Math.sin(phi) * Math.cos(theta);
      const posY = radius * Math.sin(phi) * Math.sin(theta);
      const posZ = radius * Math.cos(phi);

      const colorHex = parseInt(app.color.replace('#', '0x'), 16) || 0x00f0ff;

      // Create 3D geometry node
      const geometry = new THREE.DodecahedronGeometry(0.7, 1);
      const material = new THREE.MeshStandardMaterial({
        color: 0x081226,
        emissive: colorHex,
        emissiveIntensity: 0.4,
        roughness: 0.2,
        metalness: 0.8,
        transparent: true,
        opacity: 0.9
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(posX, posY, posZ);
      mesh.userData = {
        appId: app.id,
        appName: app.name,
        color: app.color,
        basePos: new THREE.Vector3(posX, posY, posZ),
        orbitSpeed: (Math.random() * 0.002 + 0.001) * (index % 2 === 0 ? 1 : -1),
        orbitRadius: radius,
        phi,
        theta
      };

      // Add halo ring
      const ringGeom = new THREE.RingGeometry(0.85, 0.95, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending
      });
      const halo = new THREE.Mesh(ringGeom, ringMat);
      halo.name = 'halo';
      mesh.add(halo);

      this.group.add(mesh);
      this.nodes.push(mesh);
    });
  }

  _buildRelationalFilaments() {
    // Relational lines between nodes and central Cortex
    this.nodes.forEach((node) => {
      const lineMat = new THREE.LineBasicMaterial({
        color: node.userData.color,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending
      });
      const lineGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        node.position.clone()
      ]);
      const line = new THREE.Line(lineGeom, lineMat);
      line.userData = { targetNode: node };
      this.group.add(line);
      this.connectionLines.push(line);
    });
  }

  setHighlightedApps(appIds = []) {
    this.highlightedAppIds = new Set(appIds);
  }

  update(time, delta, raycaster, mouseCamera) {
    this.nodes.forEach((node, idx) => {
      // Gentle orbital motion
      const ud = node.userData;
      ud.theta += ud.orbitSpeed;
      const x = ud.orbitRadius * Math.sin(ud.phi) * Math.cos(ud.theta);
      const z = ud.orbitRadius * Math.cos(ud.phi);
      node.position.x = x;
      node.position.z = z;
      node.position.y = ud.basePos.y + Math.sin(time * 1.5 + idx) * 0.3;

      node.rotation.x += 0.005;
      node.rotation.y += 0.008;

      const halo = node.getObjectByName('halo');
      if (halo && mouseCamera) {
        halo.lookAt(mouseCamera.position);
      }

      // Check if highlighted or hovered
      const isHighlighted = this.highlightedAppIds.has(ud.appId);
      const isHovered = this.hoveredAppId === ud.appId;
      const isSelected = this.selectedAppId === ud.appId;

      const targetScale = isSelected ? 1.8 : isHovered ? 1.5 : isHighlighted ? 1.3 : 1.0;
      node.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);

      const targetEmissiveIntensity = isSelected ? 1.5 : isHovered ? 1.2 : isHighlighted ? 1.0 : 0.4;
      node.material.emissiveIntensity += (targetEmissiveIntensity - node.material.emissiveIntensity) * 0.1;
    });

    // Update connection filament line endpoints
    this.connectionLines.forEach((line) => {
      const targetNode = line.userData.targetNode;
      const positions = line.geometry.attributes.position.array;
      positions[3] = targetNode.position.x;
      positions[4] = targetNode.position.y;
      positions[5] = targetNode.position.z;
      line.geometry.attributes.position.needsUpdate = true;

      const isHighlighted = this.highlightedAppIds.has(targetNode.userData.appId);
      const isHovered = this.hoveredAppId === targetNode.userData.appId;
      line.material.opacity = isHovered ? 0.8 : isHighlighted ? 0.6 : 0.12;
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
