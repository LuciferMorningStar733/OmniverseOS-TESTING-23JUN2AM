import * as THREE from 'three';

/**
 * ScrollStorylineManager — Connects scroll progress to 7 cinematic 3D scenes.
 * Handles camera trajectory interpolation, scene stage transitions, and storytelling state.
 */
export const STORY_STAGES = [
  { id: 'omniverse', title: 'THE OMNIVERSE', subtitle: 'A TRUE 3D AI Operating Environment', camZ: 28, camY: 0, camX: 0, rotY: 0 },
  { id: 'workspace', title: 'THE WORKSPACE', subtitle: 'One unified workspace for apps, memory & context', camZ: 21, camY: 2, camX: 0, rotY: Math.PI * 0.1 },
  { id: 'context', title: 'THE CONTEXT', subtitle: 'AI sees relationships across your entire workflow', camZ: 16, camY: -1, camX: 4, rotY: -Math.PI * 0.15 },
  { id: 'cortex', title: 'THE CORTEX', subtitle: 'Living neural reasoning engine at the core', camZ: 11, camY: 0, camX: 0, rotY: 0 },
  { id: 'reasoning', title: 'THE REASONING', subtitle: 'From raw context to multi-step cognitive plans', camZ: 14, camY: 3, camX: -3, rotY: Math.PI * 0.2 },
  { id: 'action', title: 'THE ACTION', subtitle: 'Context transformed into direct workspace execution', camZ: 18, camY: -2, camX: 2, rotY: -Math.PI * 0.1 },
  { id: 'gateway', title: 'ENTER OMNIVERSEOS', subtitle: 'Initialize your spatial operating experience', camZ: 24, camY: 0, camX: 0, rotY: 0 }
];

export class ScrollStorylineManager {
  constructor(camera) {
    this.camera = camera;
    this.scrollProgress = 0;
    this.currentStageIndex = 0;
    this.targetPos = new THREE.Vector3(0, 0, 28);
    this.targetRotY = 0;
  }

  setScrollProgress(progress) {
    this.scrollProgress = Math.max(0, Math.min(1, progress));
    this._calculateStage();
  }

  _calculateStage() {
    const stageCount = STORY_STAGES.length;
    const scaledProgress = this.scrollProgress * (stageCount - 1);
    const index = Math.floor(scaledProgress);
    const fraction = scaledProgress - index;

    const currentStage = STORY_STAGES[index];
    const nextStage = STORY_STAGES[Math.min(stageCount - 1, index + 1)];

    this.currentStageIndex = index;

    // Smoothly interpolate camera target position
    this.targetPos.x = THREE.MathUtils.lerp(currentStage.camX, nextStage.camX, fraction);
    this.targetPos.y = THREE.MathUtils.lerp(currentStage.camY, nextStage.camY, fraction);
    this.targetPos.z = THREE.MathUtils.lerp(currentStage.camZ, nextStage.camZ, fraction);
    this.targetRotY = THREE.MathUtils.lerp(currentStage.rotY, nextStage.rotY, fraction);
  }

  update(delta) {
    if (!this.camera) return;

    // Eased interpolation toward target position
    this.camera.position.x += (this.targetPos.x - this.camera.position.x) * 0.08;
    this.camera.position.y += (this.targetPos.y - this.camera.position.y) * 0.08;
    this.camera.position.z += (this.targetPos.z - this.camera.position.z) * 0.08;

    this.camera.lookAt(0, 0, 0);
  }

  getCurrentStage() {
    return STORY_STAGES[this.currentStageIndex] || STORY_STAGES[0];
  }
}
