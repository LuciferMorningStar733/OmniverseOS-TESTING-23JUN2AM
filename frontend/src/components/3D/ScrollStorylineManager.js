import * as THREE from 'three';

/**
 * ScrollStorylineManager — Luxury 3D Camera Storytelling Controller for OmniverseOS 2.0.
 * Smoothly dollies camera through 7 cinematic scene stages as visitor scrolls through space.
 */
export const STORY_STAGES = [
  { id: 'omniverse', title: 'THE OMNIVERSE', subtitle: 'AN OPERATING ENVIRONMENT FOR INTELLIGENCE', camZ: 28, camY: 0, camX: 0, rotY: 0 },
  { id: 'workspace', title: 'THE WORKSPACE', subtitle: '30 Specialized Instruments in One Spatial Orbit', camZ: 22, camY: 2, camX: 0, rotY: Math.PI * 0.08 },
  { id: 'context', title: 'THE CONTEXT', subtitle: 'AI Sees Relationships Across Your Entire Workflow', camZ: 17, camY: -1, camX: 4, rotY: -Math.PI * 0.12 },
  { id: 'cortex', title: 'THE CORTEX', subtitle: 'First-Principles Cognitive Synthesis Core', camZ: 12, camY: 0, camX: 0, rotY: 0 },
  { id: 'reasoning', title: 'THE REASONING', subtitle: 'Multi-Step Cognitive Execution Pipeline', camZ: 15, camY: 3, camX: -3, rotY: Math.PI * 0.15 },
  { id: 'action', title: 'THE ACTION', subtitle: 'Context Synthesized into Autonomous Work', camZ: 19, camY: -2, camX: 2, rotY: -Math.PI * 0.08 },
  { id: 'gateway', title: 'ENTER OMNIVERSEOS', subtitle: 'Initialize Your Spatial Gateway', camZ: 25, camY: 0, camX: 0, rotY: 0 }
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

    this.targetPos.x = THREE.MathUtils.lerp(currentStage.camX, nextStage.camX, fraction);
    this.targetPos.y = THREE.MathUtils.lerp(currentStage.camY, nextStage.camY, fraction);
    this.targetPos.z = THREE.MathUtils.lerp(currentStage.camZ, nextStage.camZ, fraction);
    this.targetRotY = THREE.MathUtils.lerp(currentStage.rotY, nextStage.rotY, fraction);
  }

  update(delta) {
    if (!this.camera) return;

    this.camera.position.x += (this.targetPos.x - this.camera.position.x) * 0.06;
    this.camera.position.y += (this.targetPos.y - this.camera.position.y) * 0.06;
    this.camera.position.z += (this.targetPos.z - this.camera.position.z) * 0.06;

    this.camera.lookAt(0, 0, 0);
  }

  getCurrentStage() {
    return STORY_STAGES[this.currentStageIndex] || STORY_STAGES[0];
  }
}
