import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Layers, Info, ExternalLink, X } from 'lucide-react';

let THREE;
try {
  THREE = require('three');
} catch (e) {
  THREE = null;
}

let CortexCore3D, AppConstellation3D, ScrollStorylineManager;
if (THREE) {
  CortexCore3D = require('./CortexCore3D').CortexCore3D;
  AppConstellation3D = require('./AppConstellation3D').AppConstellation3D;
  ScrollStorylineManager = require('./ScrollStorylineManager').ScrollStorylineManager;
}

/**
 * Omniverse3DEngine — Master 3D Spatial Experience Engine for OmniverseOS 2.0.
 * Operates high-performance Three.js WebGL rendering, scroll-driven storytelling, interactive app picking, and particle fields.
 */
export function Omniverse3DEngine({ scrollProgress = 0, onActiveAppSelect, highlightedAppIds = [] }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const [webGLError, setWebGLError] = useState(false);
  const [hoveredApp, setHoveredApp] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [currentStage, setCurrentStage] = useState({ title: 'THE OMNIVERSE', subtitle: 'A TRUE 3D AI Operating Environment' });

  useEffect(() => {
    if (!canvasRef.current || !THREE) {
      setWebGLError(true);
      return;
    }

    // WebGL Context Check
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setWebGLError(true);
        return;
      }
    } catch (e) {
      setWebGLError(true);
      return;
    }

    // Initialize Three.js Engine
    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030712, 0.025);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 0, 28);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x050f26, 1.5);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x00f0ff, 2.0);
    dirLight1.position.set(10, 20, 15);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x7b2fff, 1.5);
    dirLight2.position.set(-10, -10, -10);
    scene.add(dirLight2);

    // 3D Modules
    const cortexCore = new CortexCore3D(scene);
    const appConstellation = new AppConstellation3D(scene);
    const storylineManager = new ScrollStorylineManager(camera);

    // Dynamic 3D Spatial Particle Field (1000 items)
    const particleCount = 1000;
    const particleGeom = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePos[i] = (Math.random() - 0.5) * 80;
      particlePos[i + 1] = (Math.random() - 0.5) * 80;
      particlePos[i + 2] = (Math.random() - 0.5) * 80;
    }
    particleGeom.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.1,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    });
    const spaceParticles = new THREE.Points(particleGeom, particleMat);
    scene.add(spaceParticles);

    // Mouse & Raycasting
    const mouse = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();

    const handleMouseMove = (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    const handleClick = () => {
      raycaster.setFromCamera(mouse, camera);
      const appData = appConstellation.handleRaycast(raycaster);
      if (appData) {
        setSelectedApp(appData);
        cortexCore.triggerPulse(2.0);
        if (onActiveAppSelect) onActiveAppSelect(appData);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);

    // Window Resize Handoff
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    const clock = new THREE.Clock();
    let animId;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      const delta = clock.getDelta();

      // Raycasting check for hover
      raycaster.setFromCamera(mouse, camera);
      const hoverData = appConstellation.handleRaycast(raycaster);
      setHoveredApp(hoverData);

      // Update modules
      cortexCore.update(time, delta, mouse, scrollProgress);
      appConstellation.update(time, delta, raycaster, camera);
      storylineManager.update(delta);

      spaceParticles.rotation.y = time * 0.02;

      renderer.render(scene, camera);
    };

    animate();

    engineRef.current = {
      cortexCore,
      appConstellation,
      storylineManager,
      scene,
      camera,
      renderer,
      cleanup: () => {
        cancelAnimationFrame(animId);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('click', handleClick);
        window.removeEventListener('resize', handleResize);
        cortexCore.destroy();
        appConstellation.destroy();
        renderer.dispose();
      }
    };

    return () => {
      if (engineRef.current) engineRef.current.cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync scroll progress to storyline manager
  useEffect(() => {
    if (engineRef.current && engineRef.current.storylineManager) {
      engineRef.current.storylineManager.setScrollProgress(scrollProgress);
      setCurrentStage(engineRef.current.storylineManager.getCurrentStage());
    }
  }, [scrollProgress]);

  // Sync highlighted app IDs from command surface
  useEffect(() => {
    if (engineRef.current && engineRef.current.appConstellation) {
      engineRef.current.appConstellation.setHighlightedApps(highlightedAppIds);
      if (highlightedAppIds.length > 0 && engineRef.current.cortexCore) {
        engineRef.current.cortexCore.triggerPulse(1.8);
      }
    }
  }, [highlightedAppIds]);

  if (webGLError) {
    return (
      <div className="webgl-fallback-container" style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(circle at center, #0b1d3a 0%, #030712 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFFFFF'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '24px' }}>
          <Sparkles className="w-12 h-12" style={{ color: '#00F0FF', margin: '0 auto 16px' }} />
          <h2>OMNIVERSEOS 2.0</h2>
          <p style={{ color: '#94A3B8', fontSize: '14px', marginTop: '8px' }}>
            Interactive 2D mode active. Accelerate WebGL in browser settings for full 3D spatial experience.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', pointerEvents: 'auto' }} />

      {/* Story Stage HUD Overlay */}
      <div style={{
        position: 'absolute',
        top: '100px',
        left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center',
        pointerEvents: 'none',
        transition: 'all 0.5s ease'
      }}>
        <div style={{
          fontSize: '11px',
          fontWeight: '700',
          letterSpacing: '0.25em',
          color: '#00F0FF',
          marginBottom: '6px',
          textTransform: 'uppercase'
        }}>
          {currentStage.title}
        </div>
        <h1 style={{
          fontSize: 'clamp(24px, 4vw, 42px)',
          fontWeight: '800',
          background: 'linear-gradient(180deg, #FFFFFF 0%, #94A3B8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: 0,
          lineHeight: 1.1
        }}>
          {currentStage.subtitle}
        </h1>
      </div>

      {/* Hovered App Floating Label */}
      {hoveredApp && (
        <div style={{
          position: 'absolute',
          bottom: '120px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(8, 18, 38, 0.9)',
          backdropFilter: 'blur(12px)',
          border: `1px solid ${hoveredApp.color || '#00F0FF'}`,
          borderRadius: '20px',
          padding: '8px 20px',
          color: '#FFFFFF',
          fontSize: '14px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: `0 0 20px ${hoveredApp.color}40`,
          pointerEvents: 'none'
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: hoveredApp.color || '#00F0FF' }} />
          <span>{hoveredApp.appName}</span>
          <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '400' }}>[Click to Inspect]</span>
        </div>
      )}

      {/* Selected App Inspection Modal */}
      {selectedApp && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(3, 7, 18, 0.75)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          pointerEvents: 'auto'
        }}>
          <div style={{
            background: '#081226',
            border: `1px solid ${selectedApp.color || '#00F0FF'}`,
            borderRadius: '24px',
            padding: '32px',
            maxWidth: '480px',
            width: '90%',
            color: '#FFFFFF',
            position: 'relative',
            boxShadow: `0 0 40px ${selectedApp.color}30`
          }}>
            <button 
              onClick={() => setSelectedApp(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer'
              }}
            >
              <X className="w-5 h-5" />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: `${selectedApp.color}20`,
                border: `1px solid ${selectedApp.color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Layers className="w-5 h-5" style={{ color: selectedApp.color }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>{selectedApp.appName}</h3>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>Spatial App Entity • ID: {selectedApp.appId}</span>
              </div>
            </div>

            <p style={{ color: '#CBD5E1', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
              OmniverseOS application entity seamlessly connected into the Cortex neural reasoning matrix. Maintains persistent state, workspace memory, and cross-application context.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setSelectedApp(null)}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #00F0FF 0%, #7B2FFF 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px',
                  color: '#030712',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
