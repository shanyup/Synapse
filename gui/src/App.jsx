import { useState, useEffect, useCallback, useRef } from "react";
import * as synapse from "./services/synapse";
import { computeDiff } from "./utils/diff";
import "./App.css";

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

// SVG Icons as inline components for ease of packaging & rendering
const Icons = {
  Repo: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
  ),
  Branch: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="3" x2="6" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 9 0 0 1-9 9"></path></svg>
  ),
  Lock: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
  ),
  Unlock: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
  ),
  Plus: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
  ),
  Refresh: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
  ),
  Check: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
  ),
  User: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
  ),
  Clock: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
  ),
  Close: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
  ),
  Folder: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
  ),
  Settings: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
  ),
  Discard: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg>
  )
};

const IGNORE_TEMPLATES = {
  unreal: `# Unreal Engine 5 - Generated by Synapse
Binaries/
Intermediate/
Saved/
DerivedDataCache/
Build/
__ExternalActors__/
__ExternalObjects__/
FileOpenOrder/
.vs/
.idea/
.vsconfig
*.sln
*.suo
*.pdb
*.lib
*.exp
*.VC.db
*.VC.opendb
*.generated.h
`,
  unity: `# Unity - Generated by Synapse
Library/
Temp/
Obj/
Logs/
Builds/
UserSettings/
MemoryCaptures/
ProjectSettings/ProjectVersion.txt
.vs/
*.sln
*.csproj
*.unityproj
*.suo
*.pdb
*.unitypackage
`,
  godot: `# Godot Engine - Generated by Synapse
.godot/
.import/
android/
ios/
.mono/
*.import
*.translation
export_presets.cfg
`,
  sbox: `# S&Box (Facepunch) - Generated by Synapse
bin/
obj/
.addon/
__compiled/
.vs/
*.cache
*.pdb
*.suo
`,
  vs: `# Visual Studio & C++ - Generated by Synapse
.vs/
out/
build/
bin/
obj/
x64/
x86/
ARM/
*.user
*.suo
*.db
*.opendb
*.pdb
*.lib
`,
  none: `# Default empty ignore file
`
};

// --- Asset Preview Helpers ---
const IMAGE_EXTENSIONS = new Set([
  'png','jpg','jpeg','gif','webp','bmp','ico','svg','tga'
]);
const SHADER_EXTENSIONS = new Set([
  'hlsl','glsl','ush','usf','shader','cginc','compute','vert','frag','metal'
]);
const MODEL_EXTENSIONS = new Set([
  'glb','gltf','obj'
]);

function getFileExtension(filePath) {
  if (!filePath) return '';
  const dot = filePath.lastIndexOf('.');
  return dot >= 0 ? filePath.slice(dot + 1).toLowerCase() : '';
}

function getAssetPreviewType(filePath) {
  const ext = getFileExtension(filePath);
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (SHADER_EXTENSIONS.has(ext)) return 'shader';
  if (MODEL_EXTENSIONS.has(ext)) return 'model';
  return 'diff';
}


// --- ImagePreview Component ---
function ImagePreview({ repoPath, filePath }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [dimensions, setDimensions] = useState(null);
  const ext = getFileExtension(filePath);

  // MIME type map for data URLs (TGA converted to PNG under the hood)
  const mimeMap = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp',
    ico: 'image/x-icon', svg: 'image/svg+xml', tga: 'image/png',
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setImageUrl(null);
    setZoom(1);

    synapse.readLocalFileAsBase64(repoPath, filePath)
      .then(b64 => {
        if (cancelled) return;
        const mime = mimeMap[ext] || 'image/png';
        setImageUrl(`data:${mime};base64,${b64}`);
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        let msg = err.message || String(err);
        if (msg.includes("FILE_TOO_LARGE:")) {
          const bytes = parseInt(msg.split(":")[1]) || 0;
          const mb = (bytes / (1024 * 1024)).toFixed(1);
          setError(`Image is too large to preview (${mb} MB). Large files are bypassed to prevent application freezing.`);
        } else {
          setError(`Failed to load image: ${msg}`);
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [repoPath, filePath]);

  const handleWheel = (e) => {
    e.preventDefault();
    setZoom(z => Math.max(0.1, Math.min(8, z - e.deltaY * 0.001)));
  };

  return (
    <div className="asset-preview-container" onWheel={handleWheel} style={{ overflow: 'hidden', position: 'relative' }}>
      <div className="asset-preview-toolbar">
        <span className="asset-preview-filename" title={filePath}>
          <span className={`asset-type-badge ext-${ext}`}>{ext.toUpperCase()}</span>
          {filePath.split('/').pop()}
        </span>
        <div className="asset-preview-controls">
          <button className="btn btn-secondary btn-sm" onClick={() => setZoom(z => Math.max(0.1, z - 0.25))}>−</button>
          <span className="zoom-label">{Math.round(zoom * 100)}%</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setZoom(z => Math.min(8, z + 0.25))}>+</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setZoom(1)}>Reset</button>
        </div>
      </div>
      <div className="asset-preview-viewport">
        {loading && (
          <div className="diff-loading">
            <span className="spinner"></span>
            <span>Loading image preview...</span>
          </div>
        )}
        {error && (
          <div className="diff-error"><span>{error}</span></div>
        )}
        {imageUrl && !loading && (
          <div className="asset-image-frame" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', padding: '24px' }}>
            <img
              src={imageUrl}
              alt={filePath}
              onDoubleClick={() => setZoom(1)}
              onLoad={e => setDimensions({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
                maxWidth: '100%',
                imageRendering: zoom > 2 ? 'pixelated' : 'auto',
                borderRadius: '4px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                transition: 'transform 0.1s ease',
                cursor: 'zoom-in',
              }}
            />
          </div>
        )}
        {dimensions && !loading && (
          <div className="asset-meta-bar">
            <span>{dimensions.w} × {dimensions.h}px</span>
            <span>·</span>
            <span>{filePath.split('.').pop().toUpperCase()}</span>
            <span>·</span>
            <span>Scroll to zoom · Double-click to reset</span>
          </div>
        )}
      </div>
    </div>
  );
}

// --- ModelPreview Component ---
function ModelPreview({ repoPath, filePath }) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ vertices: 0, triangles: 0, animationsCount: 0 });
  const [animations, setAnimations] = useState([]);
  const [currentAnimName, setCurrentAnimName] = useState("");
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);

  const mixerRef = useRef(null);
  const activeActionRef = useRef(null);
  const playingRef = useRef(true);
  const speedRef = useRef(1);

  const ext = getFileExtension(filePath);

  useEffect(() => {
    playingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setStats({ vertices: 0, triangles: 0, animationsCount: 0 });
    setAnimations([]);
    setCurrentAnimName("");

    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";

    const loadModel = async () => {
      try {
        let arrayBuffer;
        if (ext === 'glb' || ext === 'gltf') {
          const b64 = await synapse.readLocalFileAsBase64(repoPath, filePath);
          if (cancelled) return;
          const binaryString = atob(b64);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          arrayBuffer = bytes.buffer;
        } else {
          const text = await synapse.readLocalFileContent(repoPath, filePath);
          if (cancelled) return;
          arrayBuffer = new TextEncoder().encode(text).buffer;
        }

        if (cancelled) return;

        const width = container.clientWidth || 500;
        const height = container.clientHeight || 400;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#141416');

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        container.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);

        const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight1.position.set(5, 10, 7);
        dirLight1.castShadow = true;
        scene.add(dirLight1);

        const dirLight2 = new THREE.DirectionalLight(0xaaccff, 0.6);
        dirLight2.position.set(-5, 5, -5);
        scene.add(dirLight2);

        const onModelLoaded = (modelScene, animationsList = []) => {
          scene.add(modelScene);

          const box = new THREE.Box3().setFromObject(modelScene);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());

          modelScene.position.x += (modelScene.position.x - center.x);
          modelScene.position.y += (modelScene.position.y - center.y);
          modelScene.position.z += (modelScene.position.z - center.z);

          const maxDim = Math.max(size.x, size.y, size.z);
          const fov = camera.fov * (Math.PI / 180);
          let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;
          camera.position.set(0, maxDim * 0.2, cameraZ || 5);
          camera.lookAt(0, 0, 0);
          controls.target.set(0, 0, 0);
          controls.update();

          let verts = 0;
          let tris = 0;
          modelScene.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              const geom = child.geometry;
              if (geom) {
                const pos = geom.attributes.position;
                if (pos) verts += pos.count;
                if (geom.index) {
                  tris += geom.index.count / 3;
                } else if (pos) {
                  tris += pos.count / 3;
                }
              }
            }
          });

          setStats({
            vertices: verts,
            triangles: Math.round(tris),
            animationsCount: animationsList.length
          });

          if (animationsList.length > 0) {
            const mixer = new THREE.AnimationMixer(modelScene);
            mixerRef.current = mixer;
            setAnimations(animationsList);
            setCurrentAnimName(animationsList[0].name);

            const action = mixer.clipAction(animationsList[0]);
            action.play();
            activeActionRef.current = action;
          }

          setLoading(false);
        };

        if (ext === 'glb' || ext === 'gltf') {
          const loader = new GLTFLoader();
          loader.parse(arrayBuffer, '', (gltf) => {
            if (cancelled) return;
            onModelLoaded(gltf.scene, gltf.animations);
          }, (err) => {
            if (cancelled) return;
            setError(`Failed to parse 3D model: ${err.message || err}`);
            setLoading(false);
          });
        } else if (ext === 'obj') {
          try {
            const text = new TextDecoder().decode(arrayBuffer);
            const loader = new OBJLoader();
            const obj = loader.parse(text);
            onModelLoaded(obj, []);
          } catch (err) {
            setError(`Failed to parse OBJ model: ${err.message || err}`);
            setLoading(false);
          }
        }

        const clock = new THREE.Clock();
        let animationFrameId;
        const animate = () => {
          animationFrameId = requestAnimationFrame(animate);
          const delta = clock.getDelta();
          if (mixerRef.current && playingRef.current) {
            mixerRef.current.update(delta * speedRef.current);
          }
          controls.update();
          renderer.render(scene, camera);
        };
        animate();

        const resizeObserver = new ResizeObserver(entries => {
          if (cancelled || !entries || entries.length === 0) return;
          const { width: w, height: h } = entries[0].contentRect;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        });
        resizeObserver.observe(container);

        return () => {
          cancelled = true;
          cancelAnimationFrame(animationFrameId);
          resizeObserver.disconnect();
          if (renderer) {
            renderer.dispose();
          }
          if (mixerRef.current) {
            mixerRef.current.stopAllAction();
          }
          scene.traverse((object) => {
            if (!object.isMesh) return;
            object.geometry.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach((material) => material.dispose());
            } else {
              object.material.dispose();
            }
          });
        };

      } catch (err) {
        if (cancelled) return;
        let msg = err.message || String(err);
        if (msg.includes("FILE_TOO_LARGE:")) {
          const bytes = parseInt(msg.split(":")[1]) || 0;
          const mb = (bytes / (1024 * 1024)).toFixed(1);
          setError(`3D model is too large to preview (${mb} MB). Large files are bypassed to prevent application freezing.`);
        } else {
          setError(`Failed to load model: ${msg}`);
        }
        setLoading(false);
      }
    };

    let cleanupFn;
    loadModel().then(fn => { cleanupFn = fn; });

    return () => {
      cancelled = true;
      if (cleanupFn) cleanupFn();
    };
  }, [repoPath, filePath]);

  const handleAnimationChange = (animName) => {
    if (!mixerRef.current) return;
    setCurrentAnimName(animName);
    const clip = animations.find(a => a.name === animName);
    if (!clip) return;

    if (activeActionRef.current) {
      activeActionRef.current.fadeOut(0.2);
    }
    const action = mixerRef.current.clipAction(clip);
    action.reset().fadeIn(0.2).play();
    activeActionRef.current = action;
  };

  return (
    <div className="asset-preview-container" style={{ position: 'relative' }}>
      <div className="asset-preview-toolbar">
        <span className="asset-preview-filename" title={filePath}>
          <span className={`asset-type-badge ext-${ext}`}>{ext.toUpperCase()}</span>
          {filePath.split('/').pop()}
        </span>
        <div className="asset-preview-controls">
          {animations.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                className="input-text"
                style={{ padding: '2px 8px', fontSize: '0.75rem', height: '24px', cursor: 'pointer' }}
                value={currentAnimName}
                onChange={(e) => handleAnimationChange(e.target.value)}
              >
                {animations.map(a => (
                  <option key={a.name} value={a.name}>{a.name}</option>
                ))}
              </select>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setIsPlaying(p => !p)}
                style={{ height: '24px', padding: '0 8px', fontSize: '0.75rem' }}
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <select
                className="input-text"
                style={{ padding: '2px 4px', fontSize: '0.75rem', height: '24px', cursor: 'pointer' }}
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
              >
                <option value="0.25">0.25x</option>
                <option value="0.5">0.5x</option>
                <option value="1">1.0x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2.0x</option>
              </select>
            </div>
          )}
        </div>
      </div>
      <div className="asset-preview-viewport" style={{ position: 'relative', height: '400px', backgroundColor: '#141416' }}>
        {loading && (
          <div className="diff-loading" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
            <span className="spinner"></span>
            <span>Loading 3D model preview...</span>
          </div>
        )}
        {error && (
          <div className="diff-error" style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', textAlign: 'center' }}>
            <span>{error}</span>
          </div>
        )}
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </div>
      {!loading && !error && (
        <div className="asset-meta-bar">
          <span>Vertices: {stats.vertices.toLocaleString()}</span>
          <span>·</span>
          <span>Triangles: {stats.triangles.toLocaleString()}</span>
          {stats.animationsCount > 0 && (
            <>
              <span>·</span>
              <span>Animations: {stats.animationsCount}</span>
            </>
          )}
          <span>·</span>
          <span>Drag to rotate · Right-click to pan · Scroll to zoom</span>
        </div>
      )}
    </div>
  );
}

// --- ShaderPreview Component ---
const SHADER_KEYWORDS = new Set([
  'void','return','if','else','for','while','do','break','continue','discard',
  'struct','cbuffer','register','sampler','SamplerState','SamplerComparisonState',
  'Texture1D','Texture2D','Texture3D','TextureCube','RWTexture2D',
  'Buffer','RWBuffer','ByteAddressBuffer','StructuredBuffer',
  'in','out','inout','uniform','const','static','inline','extern',
  'true','false','null','new','delete',
]);
const SHADER_TYPES = new Set([
  'float','float2','float3','float4','float2x2','float3x3','float4x4',
  'int','int2','int3','int4','uint','uint2','uint3','uint4',
  'bool','bool2','bool3','bool4','half','half2','half3','half4',
  'double','double2','double3','double4','matrix',
  'vec2','vec3','vec4','mat2','mat3','mat4','sampler2D','sampler3D','samplerCube',
  'ivec2','ivec3','ivec4','uvec2','uvec3','uvec4','bvec2','bvec3','bvec4',
]);
const SHADER_BUILTINS = new Set([
  'mul','dot','cross','normalize','length','reflect','refract','pow','sqrt',
  'abs','max','min','clamp','lerp','mix','step','smoothstep','saturate',
  'sin','cos','tan','asin','acos','atan','atan2','floor','ceil','round','frac','fmod',
  'tex2D','tex2DLod','texture','textureLod','Sample','SampleLevel','SampleGrad',
  'ddx','ddy','fwidth','any','all','transpose','inverse','determinant',
]);

function tokenizeShader(code) {
  const tokens = [];
  let i = 0;
  while (i < code.length) {
    // Line comment
    if (code[i] === '/' && code[i+1] === '/') {
      const end = code.indexOf('\n', i);
      const text = end === -1 ? code.slice(i) : code.slice(i, end);
      tokens.push({ type: 'comment', value: text });
      i = end === -1 ? code.length : end;
      continue;
    }
    // Block comment
    if (code[i] === '/' && code[i+1] === '*') {
      const end = code.indexOf('*/', i + 2);
      const text = end === -1 ? code.slice(i) : code.slice(i, end + 2);
      tokens.push({ type: 'comment', value: text });
      i = end === -1 ? code.length : end + 2;
      continue;
    }
    // Preprocessor directive
    if (code[i] === '#') {
      const end = code.indexOf('\n', i);
      const text = end === -1 ? code.slice(i) : code.slice(i, end);
      tokens.push({ type: 'directive', value: text });
      i = end === -1 ? code.length : end;
      continue;
    }
    // String literal
    if (code[i] === '"') {
      let j = i + 1;
      while (j < code.length && code[j] !== '"') { if (code[j] === '\\') j++; j++; }
      tokens.push({ type: 'string', value: code.slice(i, j + 1) });
      i = j + 1;
      continue;
    }
    // Number
    if (/[0-9]/.test(code[i]) || (code[i] === '.' && /[0-9]/.test(code[i+1] || ''))) {
      let j = i;
      while (j < code.length && /[0-9a-fA-FxX._eEuUfF]/.test(code[j])) j++;
      tokens.push({ type: 'number', value: code.slice(i, j) });
      i = j;
      continue;
    }
    // Identifier or keyword
    if (/[a-zA-Z_]/.test(code[i])) {
      let j = i;
      while (j < code.length && /[a-zA-Z0-9_]/.test(code[j])) j++;
      const word = code.slice(i, j);
      let type = 'ident';
      if (SHADER_KEYWORDS.has(word)) type = 'keyword';
      else if (SHADER_TYPES.has(word)) type = 'type';
      else if (SHADER_BUILTINS.has(word)) type = 'builtin';
      tokens.push({ type, value: word });
      i = j;
      continue;
    }
    // Punctuation
    tokens.push({ type: 'punct', value: code[i] });
    i++;
  }
  return tokens;
}

const TOKEN_COLORS = {
  comment:  'var(--shader-comment, #6a9955)',
  directive: 'var(--shader-directive, #c586c0)',
  string:   'var(--shader-string, #ce9178)',
  number:   'var(--shader-number, #b5cea8)',
  keyword:  'var(--shader-keyword, #569cd6)',
  type:     'var(--shader-type, #4ec9b0)',
  builtin:  'var(--shader-builtin, #dcdcaa)',
  ident:    'inherit',
  punct:    'var(--text-muted)',
};

function ShaderPreview({ filePath, content }) {
  const tokens = content ? tokenizeShader(content) : [];
  const lines = content ? content.split('\n') : [];

  return (
    <div className="shader-preview-container">
      <div className="asset-preview-toolbar">
        <span className="asset-preview-filename" title={filePath}>
          <span className="asset-type-badge ext-shader">SHADER</span>
          {filePath.split('/').pop()}
        </span>
        <div className="asset-preview-controls">
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lines.length} lines · Syntax Highlighted</span>
        </div>
      </div>
      <div className="shader-code-viewport">
        <div className="shader-line-numbers">
          {lines.map((_, idx) => (
            <div key={idx} className="shader-line-num">{idx + 1}</div>
          ))}
        </div>
        <pre className="shader-code-body">
          {tokens.map((token, idx) => (
            <span key={idx} style={{ color: TOKEN_COLORS[token.type] || 'inherit' }}>
              {token.value}
            </span>
          ))}
        </pre>
      </div>
    </div>
  );
}

function App() {
  // Persistence States
  const [repositories, setRepositories] = useState(() => {
    const saved = localStorage.getItem("synapse_repos");
    return saved ? JSON.parse(saved) : [];
  });
  
  const [selectedRepoPath, setSelectedRepoPath] = useState(() => {
    return localStorage.getItem("synapse_selected_repo") || "";
  });

  // UI Navigation States
  const [activeTab, setActiveTab] = useState("changes"); // changes, history, locks
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Repository Data States
  const [activeBranch, setActiveBranch] = useState("");
  const [branches, setBranches] = useState([]);
  const [changedFiles, setChangedFiles] = useState([]);
  const [commits, setCommits] = useState([]);
  const [locks, setLocks] = useState({});
  const [username, setUsername] = useState("");

  // Dropdown & UI States
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showRepoDropdown, setShowRepoDropdown] = useState(false);
  const [showSettingsOverlay, setShowSettingsOverlay] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [selectedCommit, setSelectedCommit] = useState(null);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRepoPath, setNewRepoPath] = useState("");
  
  
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");

  const [tempUsername, setTempUsername] = useState("");
  const [selectedIgnoreTemplate, setSelectedIgnoreTemplate] = useState("unreal");

  // Settings States
  const [ignoreContent, setIgnoreContent] = useState("");
  const [ignoreLoading, setIgnoreLoading] = useState(false);
  const [customTemplates, setCustomTemplates] = useState(() => {
    try {
      const saved = localStorage.getItem("synapse_custom_templates");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  const [newTemplateName, setNewTemplateName] = useState("");

  // Input lock form state
  const [lockInputPath, setLockInputPath] = useState("");

  // Commit Form States (split like GitHub Desktop)
  const [commitSummary, setCommitSummary] = useState("");
  const [commitDescription, setCommitDescription] = useState("");

  // Selected File Diff States (Changes Tab)
  const [selectedFilePath, setSelectedFilePath] = useState(null);
  const [selectedFileStatus, setSelectedFileStatus] = useState(null);
  const [diffData, setDiffData] = useState([]);
  const [diffLoading, setDiffLoading] = useState(false);
  const [shaderContent, setShaderContent] = useState(null);
  const [diffError, setDiffError] = useState(null);

  // Commit Expansion & Inspector States (History Tab)
  const [expandedCommitHash, setExpandedCommitHash] = useState(null);
  const [commitFiles, setCommitFiles] = useState({}); // commitHash -> file list
  const [commitFilesLoading, setCommitFilesLoading] = useState(false);
  
  const [selectedCommitFile, setSelectedCommitFile] = useState(null); // { commitHash, path, status }
  const [commitFileDiff, setCommitFileDiff] = useState([]);
  const [commitFileDiffLoading, setCommitFileDiffLoading] = useState(false);
  const [commitFileDiffError, setCommitFileDiffError] = useState(null);
  const [showCommitFileDiffModal, setShowCommitFileDiffModal] = useState(false);

  // Helper to trigger notifications
  const notify = useCallback((message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  }, []);

  // Fetch all repository information
  const refreshRepositoryData = useCallback(async (path = selectedRepoPath) => {
    if (!path) return;
    setIsLoading(true);
    try {
      // 1. Get branch info
      const branchInfo = await synapse.getBranches(path);
      setActiveBranch(branchInfo.activeBranch);
      setBranches(branchInfo.branches);

      // 2. Get status / changes
      const files = await synapse.getStatus(path);
      setChangedFiles(files);

      // 3. Get history / commits
      const logCommits = await synapse.getHistory(path);
      setCommits(logCommits);

      // 4. Get active locks
      const activeLocks = await synapse.getLocks(path);
      setLocks(activeLocks);

      // 5. Get active username (resolved by backend config or system username env)
      const user = await synapse.getActiveUsername(path);
      setUsername(user || "system-user");
    } catch (error) {
      console.error(error);
      notify(`Failed to refresh repository data: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  }, [selectedRepoPath, notify]);

  // Save repositories list to local storage
  useEffect(() => {
    localStorage.setItem("synapse_repos", JSON.stringify(repositories));
  }, [repositories]);

  // Save selected repo to local storage
  useEffect(() => {
    localStorage.setItem("synapse_selected_repo", selectedRepoPath);
    // Reset selection and UI state when repo changes
    setShowRepoDropdown(false);
    setShowBranchDropdown(false);
    setShowSettingsOverlay(false);
    setSelectedFilePath(null);
    setSelectedFileStatus(null);
    setSelectedCommit(null);
    setSelectedCommitFile(null);
    setDiffData([]);
    setFilterText("");

    if (!selectedRepoPath) {
      // Clear repo specific states
      setActiveBranch("");
      setBranches([]);
      setChangedFiles([]);
      setCommits([]);
      setLocks({});
      setUsername("");
    } else {
      refreshRepositoryData(selectedRepoPath);
    }
  }, [selectedRepoPath, refreshRepositoryData]);

  // Load local file diff against index/staged version
  const loadDiffForFile = useCallback(async (filePath, status) => {
    if (!selectedRepoPath) return;
    setDiffLoading(true);
    setDiffError(null);
    setSelectedFilePath(filePath);
    setSelectedFileStatus(status);
    setDiffData([]);
    setShaderContent(null);

    const previewType = getAssetPreviewType(filePath);

    try {
      if (previewType === 'image') {
        // ImagePreview component handles its own loading — nothing to do here
        setDiffLoading(false);
        return;
      }

      if (previewType === 'model') {
        // ModelPreview component handles its own loading — nothing to do here
        setDiffLoading(false);
        return;
      }

      if (previewType === 'shader') {
        // Load shader text content for syntax highlighting
        let content = '';
        if (status === 'deleted') {
          content = await synapse.getStagedFileContent(selectedRepoPath, filePath);
        } else {
          content = await synapse.readLocalFileContent(selectedRepoPath, filePath);
        }
        setShaderContent(content || '');
        setDiffLoading(false);
        return;
      }

      // Default: text diff
      let baseText = '';
      let localText = '';

      if (status === 'modified') {
        localText = await synapse.readLocalFileContent(selectedRepoPath, filePath);
        baseText = await synapse.getStagedFileContent(selectedRepoPath, filePath);
      } else if (status === 'untracked') {
        localText = await synapse.readLocalFileContent(selectedRepoPath, filePath);
      } else if (status === 'deleted') {
        baseText = await synapse.getStagedFileContent(selectedRepoPath, filePath);
      }

      const calculated = computeDiff(baseText, localText);
      setDiffData(calculated);
    } catch (err) {
      console.error(err);
      setDiffError(`Failed to load diff: ${err.message || err}`);
    } finally {
      setDiffLoading(false);
    }
  }, [selectedRepoPath]);

  // Load historical file diff (base vs head)
  const loadHistoricalFileDiff = useCallback(async (commitHash, filePath, status) => {
    if (!selectedRepoPath) return;
    setCommitFileDiffLoading(true);
    setCommitFileDiffError(null);
    setCommitFileDiff([]);
    setSelectedCommitFile({ commitHash, path: filePath, status });

    try {
      const content = await synapse.getHistoricalFileContent(
        selectedRepoPath,
        commitHash,
        filePath,
        status
      );

      const calculated = computeDiff(content.base_content, content.head_content);
      setCommitFileDiff(calculated);
    } catch (err) {
      console.error(err);
      setCommitFileDiffError(`Failed to load historical diff: ${err.message || err}`);
    } finally {
      setCommitFileDiffLoading(false);
    }
  }, [selectedRepoPath]);

  // Select a commit from the history list and automatically display its first file's diff
  const handleSelectCommit = useCallback(async (commit) => {
    if (!selectedRepoPath) return;
    setSelectedCommit(commit);
    setSelectedCommitFile(null);
    setCommitFileDiff([]);
    
    if (!commitFiles[commit.hash]) {
      setCommitFilesLoading(true);
      try {
        const files = await synapse.getCommitFileList(selectedRepoPath, commit.hash);
        setCommitFiles(prev => ({ ...prev, [commit.hash]: files }));
        
        // Auto select first file
        if (files && files.length > 0) {
          const firstFile = files[0];
          setSelectedCommitFile({ commitHash: commit.hash, path: firstFile.path, status: firstFile.status });
          
          setCommitFileDiffLoading(true);
          const content = await synapse.getHistoricalFileContent(
            selectedRepoPath,
            commit.hash,
            firstFile.path,
            firstFile.status
          );
          const calculated = computeDiff(content.base_content, content.head_content);
          setCommitFileDiff(calculated);
        }
      } catch (error) {
        console.error("Failed to load commit files:", error);
        notify(`Failed to load commit files: ${error.message}`, "error");
      } finally {
        setCommitFileDiffLoading(false);
        setCommitFilesLoading(false);
      }
    } else {
      const files = commitFiles[commit.hash];
      if (files && files.length > 0) {
        const firstFile = files[0];
        setSelectedCommitFile({ commitHash: commit.hash, path: firstFile.path, status: firstFile.status });
        setCommitFileDiffLoading(true);
        try {
          const content = await synapse.getHistoricalFileContent(
            selectedRepoPath,
            commit.hash,
            firstFile.path,
            firstFile.status
          );
          const calculated = computeDiff(content.base_content, content.head_content);
          setCommitFileDiff(calculated);
        } catch (e) {
          console.error("Failed to load historical diff:", e);
        } finally {
          setCommitFileDiffLoading(false);
        }
      }
    }
  }, [selectedRepoPath, commitFiles, notify]);

  // Watch changedFiles: clear selected file if it's no longer modified/untracked/deleted
  useEffect(() => {
    if (selectedFilePath) {
      const exists = changedFiles.some(f => f.path === selectedFilePath);
      if (!exists) {
        setSelectedFilePath(null);
        setSelectedFileStatus(null);
        setDiffData([]);
      } else {
        const file = changedFiles.find(f => f.path === selectedFilePath);
        if (file && file.status !== selectedFileStatus) {
          loadDiffForFile(file.path, file.status);
        }
      }
    }
  }, [changedFiles, selectedFilePath, selectedFileStatus, loadDiffForFile]);

  // Auto-refresh when app window gains focus
  useEffect(() => {
    const handleFocus = () => {
      if (selectedRepoPath) {
        console.log("Auto-refreshing repository...");
        refreshRepositoryData();
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [selectedRepoPath, refreshRepositoryData]);

  // Block web browser default right-click context menu
  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault();
    };
    window.addEventListener("contextmenu", handleContextMenu, { capture: true });
    document.addEventListener("contextmenu", handleContextMenu, { capture: true });
    return () => {
      window.removeEventListener("contextmenu", handleContextMenu, { capture: true });
      document.removeEventListener("contextmenu", handleContextMenu, { capture: true });
    };
  }, []);


  // Open native directory picker dialog
  const handleBrowseDirectory = async () => {
    try {
      const selected = await synapse.selectDirectory();
      if (selected) {
        setNewRepoPath(selected);
      }
    } catch (err) {
      notify(`Failed to select directory: ${err.message}`, "error");
    }
  };

  // Helper to add repository
  const handleAddRepository = async (e) => {
    if (e) e.preventDefault();
    if (!newRepoPath.trim()) return;

    const targetPath = newRepoPath.trim();
    setIsLoading(true);

    try {
      // Check if repository exists by attempting to get the branches
      try {
        await synapse.getBranches(targetPath);
        
        // If it succeeds, it's a valid repo!
        if (!repositories.some(r => r.path === targetPath)) {
          const repoName = targetPath.split(/[\\/]/).filter(Boolean).pop() || "Repo";
          const newRepoList = [...repositories, { name: repoName, path: targetPath }];
          setRepositories(newRepoList);
          setSelectedRepoPath(targetPath);
          notify(`Repository registered: ${repoName}`);
        } else {
          setSelectedRepoPath(targetPath);
        }
        setShowAddModal(false);
        setNewRepoPath("");
      } catch (error) {
        // If it is not a Synapse repository, auto-initialize it!
        if (error.message.includes("not a synapse repository") || error.message.includes("fatal: not a synapse repository")) {
          // 1. Init repository
          await synapse.initRepository(targetPath);
          
          // 2. Write selected ignore template to .synapseignore
          let ignoreContent = "";
          if (selectedIgnoreTemplate.startsWith("custom_")) {
            const templateName = selectedIgnoreTemplate.substring("custom_".length);
            ignoreContent = customTemplates[templateName] || "";
          } else {
            ignoreContent = IGNORE_TEMPLATES[selectedIgnoreTemplate] || "";
          }
          if (ignoreContent) {
            await synapse.writeLocalFileContent(targetPath, ".synapseignore", ignoreContent);
          }

          const repoName = targetPath.split(/[\\/]/).filter(Boolean).pop() || "Repo";
          const newRepoList = [...repositories, { name: repoName, path: targetPath }];
          setRepositories(newRepoList);
          setSelectedRepoPath(targetPath);
          notify(`Repository initialized and registered: ${repoName}`);
          
          setShowAddModal(false);
          setNewRepoPath("");
        } else {
          notify(`Failed to open path: ${error.message}`, "error");
        }
      }
    } catch (error) {
      notify(`Failed to register or initialize repository: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Remove repository from UI registration
  const handleRemoveRepository = (path, e) => {
    e.stopPropagation();
    const updated = repositories.filter(r => r.path !== path);
    setRepositories(updated);
    if (selectedRepoPath === path) {
      setSelectedRepoPath(updated.length > 0 ? updated[0].path : "");
    }
    notify("Repository unregistered");
  };

  // Set Username config
  const handleSaveUsername = async (e) => {
    if (e) e.preventDefault();
    if (!tempUsername.trim() || !selectedRepoPath) return;
    setIsLoading(true);
    try {
      await synapse.setConfigUsername(selectedRepoPath, tempUsername.trim());
      setUsername(tempUsername.trim());
      notify(`Username updated: ${tempUsername.trim()}`);
    } catch (error) {
      notify(`Failed to update username: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Load .synapseignore content when Settings overlay is open
  useEffect(() => {
    let active = true;
    const loadIgnore = async () => {
      if (showSettingsOverlay && selectedRepoPath) {
        setIgnoreLoading(true);
        try {
          const content = await synapse.readLocalFileContent(selectedRepoPath, ".synapseignore");
          if (active) {
            setIgnoreContent(content || "");
          }
        } catch (error) {
          console.error("Failed to read .synapseignore:", error);
        } finally {
          if (active) {
            setIgnoreLoading(false);
          }
        }
      }
    };
    loadIgnore();
    return () => { active = false; };
  }, [showSettingsOverlay, selectedRepoPath]);

  // Save ignore file
  const handleSaveIgnore = async (e) => {
    if (e) e.preventDefault();
    if (!selectedRepoPath) return;
    setIsLoading(true);
    try {
      await synapse.writeLocalFileContent(selectedRepoPath, ".synapseignore", ignoreContent);
      notify(".synapseignore saved successfully");
    } catch (error) {
      notify(`Failed to save .synapseignore: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };
  const handleAddCustomTemplate = () => {
    const name = newTemplateName.trim();
    if (!name) return;
    if (customTemplates[name]) {
      notify("A template with this name already exists", "error");
      return;
    }
    const updated = { ...customTemplates, [name]: ignoreContent };
    setCustomTemplates(updated);
    localStorage.setItem("synapse_custom_templates", JSON.stringify(updated));
    setNewTemplateName("");
    notify(`Created custom template "${name}" with current editor contents.`);
  };

  const handleSaveFromEditorAsTemplate = (name) => {
    const updated = { ...customTemplates, [name]: ignoreContent };
    setCustomTemplates(updated);
    localStorage.setItem("synapse_custom_templates", JSON.stringify(updated));
    notify(`Saved current editor contents to template "${name}".`);
  };

  const handleRemoveCustomTemplate = (name) => {
    const updated = { ...customTemplates };
    delete updated[name];
    setCustomTemplates(updated);
    localStorage.setItem("synapse_custom_templates", JSON.stringify(updated));
    notify(`Removed custom template "${name}".`);
  };


  // Commit changes (Stages automatically, then commits)
  const handleCommit = async (e) => {
    if (e) e.preventDefault();
    if (!commitSummary.trim() || !selectedRepoPath) return;
    setIsLoading(true);
    try {
      // 1. Stage everything
      await synapse.stageAll(selectedRepoPath);
      // 2. Commit
      const summaryText = commitSummary.trim();
      const descText = commitDescription.trim();
      const fullMessage = descText ? `${summaryText}\n\n${descText}` : summaryText;
      const result = await synapse.commit(selectedRepoPath, fullMessage);
      notify("Changes committed successfully!");
      setCommitSummary("");
      setCommitDescription("");
      refreshRepositoryData();
    } catch (error) {
      notify(`Commit failed: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Checkout branch or commit
  const handleCheckout = async (target) => {
    if (!selectedRepoPath) return;
    setIsLoading(true);
    try {
      await synapse.checkout(selectedRepoPath, target);
      notify(`Checked out: ${target}`);
      refreshRepositoryData();
    } catch (error) {
      notify(`Checkout failed: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Merge branch
  const handleMerge = async (branchName) => {
    if (!selectedRepoPath) return;
    setIsLoading(true);
    try {
      const output = await synapse.mergeBranch(selectedRepoPath, branchName);
      notify(output);
      refreshRepositoryData();
    } catch (error) {
      notify(error.message, "error");
      refreshRepositoryData();
    } finally {
      setIsLoading(false);
    }
  };

  // Create new branch
  const handleCreateBranch = async (e) => {
    e.preventDefault();
    if (!newBranchName.trim() || !selectedRepoPath) return;
    setIsLoading(true);
    try {
      await synapse.createBranch(selectedRepoPath, newBranchName.trim());
      notify(`Created branch: ${newBranchName.trim()}`);
      // Auto checkout the newly created branch
      await synapse.checkout(selectedRepoPath, newBranchName.trim());
      
      setNewBranchName("");
      setShowBranchModal(false);
      refreshRepositoryData();
    } catch (error) {
      notify(`Failed to create branch: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Lock file
  const handleLockFile = async (filePath) => {
    if (!filePath || !selectedRepoPath) return;
    setIsLoading(true);
    try {
      await synapse.lockFile(selectedRepoPath, filePath);
      notify(`Locked: ${filePath}`);
      refreshRepositoryData();
    } catch (error) {
      notify(`Lock failed: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Unlock file
  const handleUnlockFile = async (filePath) => {
    if (!filePath || !selectedRepoPath) return;
    setIsLoading(true);
    try {
      await synapse.unlockFile(selectedRepoPath, filePath);
      notify(`Unlocked: ${filePath}`);
      refreshRepositoryData();
    } catch (error) {
      notify(`Unlock failed: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscardFileChange = async (filePath, status, e) => {
    if (e) e.stopPropagation();
    const confirmMessage = `"${filePath}" dosyasındaki yerel değişiklikleri geri almak (discard) istediğinize emin misiniz?\nBu işlem geri alınamaz.`;
    if (!window.confirm(confirmMessage)) return;
    setIsLoading(true);
    try {
      await synapse.discardFileChange(selectedRepoPath, filePath, status);
      notify(`Değişiklikler başarıyla geri alındı: ${filePath}`);
      refreshRepositoryData();
      if (selectedFilePath === filePath) {
        setSelectedFilePath(null);
        setSelectedFileStatus(null);
        setDiffData([]);
      }
    } catch (error) {
      notify(`Geri alma hatası: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const activeRepo = repositories.find(r => r.path === selectedRepoPath);

  return (
    <div className="app-container">
      {/* 1. TOP MENU BAR */}
      <div className="menu-bar">
        <div className="menu-group">
          <div className="menu-item">
            <span>File</span>
            <div className="menu-dropdown">
              <button onClick={() => { setShowAddModal(true); }}>Add Repository...</button>
              <button onClick={() => { setTempUsername(username); setShowSettingsOverlay(true); }}>Settings...</button>
              <hr className="menu-separator" />
              <button onClick={() => alert("Close the window to exit.")}>Exit</button>
            </div>
          </div>
          <div className="menu-item">
            <span>Edit</span>
            <div className="menu-dropdown">
              <button disabled>Undo</button>
              <button disabled>Redo</button>
              <hr className="menu-separator" />
              <button onClick={() => navigator.clipboard.writeText(selectedRepoPath || "")}>Copy Repository Path</button>
            </div>
          </div>
          <div className="menu-item">
            <span>View</span>
            <div className="menu-dropdown">
              <button onClick={() => refreshRepositoryData()}>Refresh Status</button>
              <button onClick={() => {
                setActiveTab(activeTab === "changes" ? "history" : "changes");
              }}>Toggle Changes/History</button>
            </div>
          </div>
          <div className="menu-item">
            <span>Repository</span>
            <div className="menu-dropdown">
              <button onClick={() => { setShowAddModal(true); }}>Initialize Repository...</button>
              <button onClick={() => { setTempUsername(username); setShowSettingsOverlay(true); }}>Show Ignore Rules</button>
              <button onClick={() => refreshRepositoryData()}>Refresh Status</button>
            </div>
          </div>
          <div className="menu-item">
            <span>Branch</span>
            <div className="menu-dropdown">
              <button onClick={() => setShowBranchModal(true)}>Create Branch...</button>
              {branches.map(b => (
                <button key={b} onClick={() => handleCheckout(b)}>{b}</button>
              ))}
            </div>
          </div>
          <div className="menu-item">
            <span>Help</span>
            <div className="menu-dropdown">
              <button onClick={() => alert("Synapse Version Control - Premium Game Developer client built with Tauri and C++ Core.")}>About Synapse</button>
            </div>
          </div>
        </div>
        <div className="app-title">Synapse Desktop - {activeRepo?.name || "No workspace"}</div>
      </div>

      {/* 2. MAIN HEADER (DROPDOWNS & ACTION BUTTONS) */}
      <header className="main-header">
        <div className="header-left">
          {/* Repository Selector Dropdown */}
          <div className={`header-selector repo-selector ${showRepoDropdown ? "active" : ""}`} onClick={() => { setShowRepoDropdown(!showRepoDropdown); setShowBranchDropdown(false); }}>
            <div className="selector-icon">
              <Icons.Repo />
            </div>
            <div className="selector-info">
              <span className="selector-label">Current repository</span>
              <span className="selector-value">{activeRepo?.name || "Select Repository"}</span>
            </div>
            <span className="selector-arrow">▼</span>
            
            {showRepoDropdown && (
              <div className="header-dropdown repo-dropdown" onClick={(e) => e.stopPropagation()}>
                <div className="dropdown-header">
                  <span>Workspaces</span>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => {
                      setShowAddModal(true);
                      setShowRepoDropdown(false);
                    }}
                  >
                    Add New
                  </button>
                </div>
                <div className="dropdown-list">
                  {repositories.length === 0 ? (
                    <div className="dropdown-empty">No registered repositories.</div>
                  ) : (
                    repositories.map((repo) => (
                      <div
                        key={repo.path}
                        className={`dropdown-item ${selectedRepoPath === repo.path ? "active" : ""}`}
                        onClick={() => {
                          setSelectedRepoPath(repo.path);
                          setShowRepoDropdown(false);
                        }}
                      >
                        <Icons.Repo />
                        <div className="dropdown-item-info">
                          <span className="repo-name">{repo.name}</span>
                          <span className="repo-path" title={repo.path}>{repo.path}</span>
                        </div>
                        <button
                          className="btn-icon-sm repo-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveRepository(repo.path, e);
                          }}
                          title="Unregister Repository"
                        >
                          <Icons.Trash />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Branch Selector Dropdown */}
          {selectedRepoPath && (
            <div className={`header-selector branch-selector ${showBranchDropdown ? "active" : ""}`} onClick={() => { setShowBranchDropdown(!showBranchDropdown); setShowRepoDropdown(false); }}>
              <div className="selector-icon">
                <Icons.Branch />
              </div>
              <div className="selector-info">
                <span className="selector-label">Current branch</span>
                <span className="selector-value">{activeBranch || "Detached HEAD"}</span>
              </div>
              <span className="selector-arrow">▼</span>
              
              {showBranchDropdown && (
                <div className="header-dropdown branch-dropdown" onClick={(e) => e.stopPropagation()}>
                  <div className="dropdown-header">
                    <span>Branches</span>
                    <button 
                      className="btn-icon-sm"
                      onClick={() => {
                        setShowBranchDropdown(false);
                        setShowBranchModal(true);
                      }}
                      title="New Branch"
                    >
                      <Icons.Plus />
                    </button>
                  </div>
                  <div className="dropdown-list">
                    {branches.map(branchName => (
                      <div
                        key={branchName}
                        className={`dropdown-item ${activeBranch === branchName ? "active" : ""}`}
                        onClick={() => {
                          handleCheckout(branchName);
                          setShowBranchDropdown(false);
                        }}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: "10px" }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Icons.Branch />
                          <span>{branchName}</span>
                        </div>
                        {activeBranch !== branchName && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (window.confirm(`Are you sure you want to merge branch "${branchName}" into "${activeBranch}"?`)) {
                                setShowBranchDropdown(false);
                                await handleMerge(branchName);
                              }
                            }}
                            style={{ padding: "2px 8px", fontSize: "0.7rem", height: "20px" }}
                          >
                            Merge
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="dropdown-footer">
                    <button 
                      className="btn btn-secondary btn-sm btn-full"
                      onClick={() => {
                        setShowBranchDropdown(false);
                        setShowBranchModal(true);
                      }}
                    >
                      Create New Branch
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="header-right">
          {selectedRepoPath && (
            <>
              {/* Fetch/Refresh Action Button */}
              <button 
                className={`header-action-btn ${isLoading ? "loading" : ""}`}
                onClick={() => refreshRepositoryData()}
                title="Refresh workspace status"
              >
                {isLoading ? <span className="spinner"></span> : <Icons.Refresh />}
                <div className="action-btn-info">
                  <span className="action-btn-label">Fetch origin</span>
                  <span className="action-btn-value">Refreshed just now</span>
                </div>
              </button>

              {/* Top Settings Tab/Button */}
              <button
                className={`header-action-btn settings-btn ${showSettingsOverlay ? "active" : ""}`}
                onClick={() => {
                  setTempUsername(username);
                  setShowSettingsOverlay(!showSettingsOverlay);
                }}
                title="Configure Settings"
              >
                <Icons.Settings />
                <div className="action-btn-info">
                  <span className="action-btn-label">Settings</span>
                  <span className="action-btn-value">Open panel</span>
                </div>
              </button>
            </>
          )}
        </div>
      </header>

      {/* 3. SLIDING TOP SETTINGS OVERLAY TAB PANEL */}
      {showSettingsOverlay && (
        <div className="settings-overlay-wrapper" onClick={() => setShowSettingsOverlay(false)}>
          <div className="settings-overlay-panel" onClick={(e) => e.stopPropagation()}>
            <div className="settings-overlay-header">
              <div className="settings-title-group">
                <Icons.Settings />
                <h3>Repository Settings Panel</h3>
              </div>
              <button className="btn-icon-sm" onClick={() => setShowSettingsOverlay(false)} title="Close Settings">
                <Icons.Close />
              </button>
            </div>
            
            <div className="settings-overlay-content">
              <div className="settings-grid">
                {/* Profile Card */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <Icons.User />
                    <span>Sync Identity</span>
                  </div>
                  <div className="settings-card-body">
                    <div className="settings-avatar-preview">
                      <div className="avatar-large">
                        {tempUsername ? tempUsername.charAt(0).toUpperCase() : (username ? username.charAt(0).toUpperCase() : "?")}
                      </div>
                      <div className="avatar-info">
                        <h4>{username || "system-user"}</h4>
                        <p>Active Commit Profile</p>
                      </div>
                    </div>
                    <form onSubmit={handleSaveUsername} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                      <div className="form-group">
                        <label className="form-label">Active Username</label>
                        <input
                          type="text"
                          className="input-text"
                          placeholder="e.g. Alice"
                          value={tempUsername}
                          onChange={(e) => setTempUsername(e.target.value)}
                          required
                        />
                      </div>
                      <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
                        Save Profile
                      </button>
                    </form>
                  </div>
                </div>

                {/* Details Card */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <Icons.Repo />
                    <span>Workspace Directory</span>
                  </div>
                  <div className="settings-card-body">
                    <div className="meta-details-list">
                      <div className="meta-detail-row">
                        <span className="meta-detail-label">Repository Name</span>
                        <span className="meta-detail-value">{activeRepo?.name}</span>
                      </div>
                      <div className="meta-detail-row">
                        <span className="meta-detail-label">Local Path</span>
                        <span className="meta-detail-value" title={selectedRepoPath}>{selectedRepoPath}</span>
                      </div>
                      <div className="meta-detail-row">
                        <span className="meta-detail-label">Current Branch</span>
                        <span className="meta-detail-value">{activeBranch || "Detached HEAD"}</span>
                      </div>
                      <div className="meta-detail-row">
                        <span className="meta-detail-label">Status</span>
                        <span className="meta-detail-value" style={{ color: "var(--color-untracked)", fontWeight: "600" }}>Initialized</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Custom Ignore Templates Manager */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <Icons.Settings />
                    <span>Custom Ignore Presets</span>
                  </div>
                  <div className="settings-card-body" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        type="text"
                        className="input-text"
                        placeholder="Template name (e.g. Node)"
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        style={{ flexGrow: 1 }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleAddCustomTemplate}
                        style={{ whiteSpace: "nowrap" }}
                      >
                        Add
                      </button>
                    </div>

                    <div style={{ maxHeight: "150px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                      {Object.keys(customTemplates).length === 0 ? (
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center", padding: "10px" }}>
                          No custom templates yet.
                        </span>
                      ) : (
                        Object.entries(customTemplates).map(([name, content]) => (
                          <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-card)", padding: "6px 10px", borderRadius: "4px", border: "1px solid var(--border-color)", gap: "6px" }}>
                            <span style={{ fontSize: "0.85rem", fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                            <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setIgnoreContent(content);
                                  notify(`Loaded template "${name}" into editor below`);
                                }}
                                style={{ padding: "2px 6px", fontSize: "0.75rem" }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleSaveFromEditorAsTemplate(name)}
                                title="Overwrite template with text from rules list below"
                                style={{ padding: "2px 6px", fontSize: "0.75rem" }}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => handleRemoveCustomTemplate(name)}
                                style={{ display: "flex", alignItems: "center", padding: "2px 6px" }}
                              >
                                <Icons.Trash />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Ignore File Editor */}
                <div className="settings-card settings-card-wide">
                  <div className="settings-card-header">
                    <Icons.Close />
                    <span>Ignored Assets (.synapseignore)</span>
                  </div>
                  <div className="settings-card-body">
                    <form onSubmit={handleSaveIgnore} style={{ display: "flex", flexDirection: "column", gap: "14px", height: "100%" }}>
                      <div className="form-group" style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
                        <label className="form-label">Rules list (one path/glob per line)</label>
                        {ignoreLoading ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "20px 0" }}>
                            <span className="spinner"></span>
                            <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading ignore file...</span>
                          </div>
                        ) : (
                          <textarea
                            className="textarea-ignore"
                            placeholder="e.g.&#10;Binaries/&#10;Intermediate/&#10;Saved/&#10;*.log"
                            value={ignoreContent}
                            onChange={(e) => setIgnoreContent(e.target.value)}
                            style={{ flexGrow: 1, minHeight: "150px" }}
                          />
                        )}
                      </div>
                      <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
                        Save Ignore Rules
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. TWO-COLUMN SPLIT WORKSPACE PANEL */}
      {selectedRepoPath ? (
        <div className="workspace-split-layout">
          {/* LEFT COLUMN: Sidebar (Tabs, Files List, Commit Panel) */}
          <aside className="workspace-sidebar">
            {/* Sidebar Navigation Tabs */}
            <div className="sidebar-tabs">
              <button 
                className={`sidebar-tab-btn ${activeTab === "changes" ? "active" : ""}`}
                onClick={() => { setActiveTab("changes"); setSelectedFilePath(null); setDiffData([]); }}
              >
                Changes
                {changedFiles.length > 0 && (
                  <span className="sidebar-tab-badge">{changedFiles.length}</span>
                )}
              </button>
              <button 
                className={`sidebar-tab-btn ${activeTab === "history" ? "active" : ""}`}
                onClick={() => { setActiveTab("history"); setSelectedCommit(null); setSelectedCommitFile(null); }}
              >
                History
              </button>
              <button 
                className={`sidebar-tab-btn ${activeTab === "locks" ? "active" : ""}`}
                onClick={() => { setActiveTab("locks"); }}
              >
                Locks
                {Object.keys(locks).length > 0 && (
                  <span className="sidebar-tab-badge pink">{Object.keys(locks).length}</span>
                )}
              </button>
            </div>

            {/* Filter Bar */}
            <div className="sidebar-filter-container">
              <div className="filter-input-wrapper">
                <span className="filter-icon">🔍</span>
                <input 
                  type="text" 
                  className="filter-input"
                  placeholder="Filter files" 
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                />
                {filterText && (
                  <button className="filter-clear-btn" onClick={() => setFilterText("")}>×</button>
                )}
              </div>
            </div>

            {/* Tab-Specific Sidebar Content */}
            <div className="sidebar-list-pane">
              {/* CHANGES TAB */}
              {activeTab === "changes" && (
                <div className="sidebar-files-list">
                  <div className="list-group-header">
                    <input type="checkbox" checked={changedFiles.length > 0} readOnly />
                    <span>{changedFiles.length} changed files</span>
                  </div>
                  
                  <div className="list-items-container">
                    {changedFiles.length === 0 ? (
                      <div className="clean-workspace-placeholder">
                        <Icons.Check />
                        <span>Working directory clean</span>
                        <p>No changes detected in files.</p>
                      </div>
                    ) : (
                      changedFiles
                        .filter(f => f.path.toLowerCase().includes(filterText.toLowerCase()))
                        .map((file) => {
                          const isFileLocked = locks[file.path];
                          const isLockedByMe = isFileLocked && isFileLocked.owner === username;
                          const isSelected = selectedFilePath === file.path;
                          return (
                            <div 
                              key={file.path} 
                              className={`file-item-row ${isSelected ? "selected" : ""}`}
                              onClick={() => loadDiffForFile(file.path, file.status)}
                            >
                              <div className="file-item-info">
                                <span className={`file-status-badge ${file.status}`}>
                                  {file.status === "modified" && "M"}
                                  {file.status === "deleted" && "D"}
                                  {file.status === "untracked" && "U"}
                                </span>
                                <span className="file-path-label" title={file.path}>
                                  {file.path}
                                </span>
                              </div>
                              <div className="file-row-actions" onClick={(e) => e.stopPropagation()}>
                                <button 
                                  className="btn-discard-action"
                                  onClick={(e) => handleDiscardFileChange(file.path, file.status, e)}
                                  title="Discard changes"
                                >
                                  <Icons.Discard />
                                </button>
                                {isFileLocked ? (
                                  <span 
                                    className={`lock-icon-badge ${isLockedByMe ? "me" : "other"}`} 
                                    onClick={() => isLockedByMe && handleUnlockFile(file.path)}
                                    title={isLockedByMe ? "Unlock this asset" : `Locked by ${isFileLocked.owner}`}
                                  >
                                    <Icons.Lock />
                                  </span>
                                ) : (
                                  <button 
                                    className="btn-lock-action"
                                    onClick={() => handleLockFile(file.path)}
                                    title="Lock this asset"
                                  >
                                    <Icons.Unlock />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              )}

              {/* HISTORY TAB */}
              {activeTab === "history" && (
                <div className="sidebar-commits-list">
                  {commits.length === 0 ? (
                    <div className="clean-workspace-placeholder">
                      <Icons.Clock />
                      <span>No commit history</span>
                    </div>
                  ) : (
                    commits
                      .filter(c => c.message.toLowerCase().includes(filterText.toLowerCase()) || c.hash.toLowerCase().includes(filterText.toLowerCase()))
                      .map((c) => {
                        const isSelected = selectedCommit?.hash === c.hash;
                        return (
                          <div 
                            key={c.hash} 
                            className={`commit-row-item ${isSelected ? "selected" : ""}`}
                            onClick={() => handleSelectCommit(c)}
                          >
                            <div className="commit-row-top">
                              <span className="commit-msg-summary">{c.message.split("\n")[0]}</span>
                              <span className="commit-hash-short">{c.hash.substring(0, 7)}</span>
                            </div>
                            <div className="commit-row-bottom">
                              <span className="commit-author-name">{c.author}</span>
                              <span className="commit-date-label">{c.date.split(",")[0]}</span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              )}

              {/* LOCKS TAB */}
              {activeTab === "locks" && (
                <div className="sidebar-locks-pane">
                  {/* Lock Input Form */}
                  <div className="lock-manual-input">
                    <input 
                      type="text" 
                      className="input-text"
                      placeholder="Manually lock a file path..."
                      value={lockInputPath}
                      onChange={(e) => setLockInputPath(e.target.value)}
                    />
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        handleLockFile(lockInputPath.trim());
                        setLockInputPath("");
                      }}
                      disabled={!lockInputPath.trim()}
                    >
                      Lock Path
                    </button>
                  </div>
                  
                  <div className="list-items-container" style={{ marginTop: "12px" }}>
                    {Object.keys(locks).length === 0 ? (
                      <div className="clean-workspace-placeholder">
                        <Icons.Unlock />
                        <span>No active asset locks</span>
                      </div>
                    ) : (
                      Object.entries(locks)
                        .filter(([path]) => path.toLowerCase().includes(filterText.toLowerCase()))
                        .map(([filePath, lockInfo]) => {
                          const isMyLock = lockInfo.owner === username;
                          return (
                            <div key={filePath} className={`lock-sidebar-row ${isMyLock ? "mine" : ""}`}>
                              <div className="lock-sidebar-info">
                                <div className="lock-sidebar-path" title={filePath}>{filePath}</div>
                                <div className="lock-sidebar-meta">
                                  <span>{lockInfo.owner}</span> • <span>{lockInfo.timestamp.split(",")[0]}</span>
                                </div>
                              </div>
                              {isMyLock && (
                                <button 
                                  className="btn-release-lock"
                                  onClick={() => handleUnlockFile(filePath)}
                                  title="Release lock"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Permanent Commit Box (GitHub Desktop Style) */}
            {activeTab === "changes" && (
              <div className="sidebar-commit-panel">
                <form onSubmit={handleCommit} className="commit-panel-form">
                  <div className="commit-avatar-row">
                    <div className="user-avatar-circle">
                      {username ? username.charAt(0).toUpperCase() : "?"}
                    </div>
                    <div className="commit-input-group">
                      <input
                        type="text"
                        placeholder="Summary (required)"
                        className="input-text commit-summary-input"
                        value={commitSummary}
                        onChange={(e) => setCommitSummary(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <textarea
                    placeholder="Description"
                    className="textarea-commit-desc"
                    value={commitDescription}
                    onChange={(e) => setCommitDescription(e.target.value)}
                    rows={3}
                  />
                  <div className="commit-actions-row">
                    <div className="profile-shortcuts">
                      <span className="active-user-badge" title={`Committing as ${username}`}>
                        👤 {username}
                      </span>
                    </div>
                    <button
                      type="submit"
                      className={`btn btn-primary commit-btn ${!commitSummary.trim() || changedFiles.length === 0 ? "btn-disabled" : ""}`}
                      disabled={!commitSummary.trim() || changedFiles.length === 0}
                    >
                      Commit {changedFiles.length} file{changedFiles.length !== 1 && "s"} to {activeBranch || "main"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </aside>

          {/* RIGHT COLUMN: MAIN VIEW PANE (Diffs and Commit Details) */}
          <main className="workspace-main-view">
            {/* CHANGES MODE: File Diff / Asset Preview */}
            {activeTab === "changes" && (
              selectedFilePath ? (
                (() => {
                  const previewType = getAssetPreviewType(selectedFilePath);
                  return (
                    <div className="diff-viewer-container">
                      {previewType !== 'image' && previewType !== 'shader' && previewType !== 'model' && (
                        <div className="diff-viewer-header">
                          <div className="diff-file-info">
                            <span className={`file-status-badge ${selectedFileStatus}`}>
                              {selectedFileStatus === "modified" && "M"}
                              {selectedFileStatus === "deleted" && "D"}
                              {selectedFileStatus === "untracked" && "U"}
                            </span>
                            <span className="diff-file-path" title={selectedFilePath}>{selectedFilePath}</span>
                          </div>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setSelectedFilePath(null);
                              setSelectedFileStatus(null);
                              setDiffData([]);
                              setShaderContent(null);
                            }}
                          >
                            Close
                          </button>
                        </div>
                      )}

                      <div className="diff-viewer-content">
                        {previewType === 'image' ? (
                          <ImagePreview repoPath={selectedRepoPath} filePath={selectedFilePath} />
                        ) : previewType === 'shader' ? (
                          <ShaderPreview filePath={selectedFilePath} content={shaderContent || ''} />
                        ) : previewType === 'model' ? (
                          <ModelPreview repoPath={selectedRepoPath} filePath={selectedFilePath} />
                        ) : diffLoading ? (
                          <div className="diff-loading">
                            <span className="spinner"></span>
                            <span>Loading file differences...</span>
                          </div>
                        ) : diffError ? (
                          <div className="diff-error">
                            <span>{diffError}</span>
                          </div>
                        ) : diffData.length === 0 ? (
                          <div className="diff-empty">
                            <span>No text changes detected or binary asset.</span>
                          </div>
                        ) : (
                          <div className="diff-lines">
                            {diffData.map((line, idx) => {
                              const isAdded = line.type === "added";
                              const isRemoved = line.type === "removed";
                              return (
                                <div
                                  key={idx}
                                  className={`diff-line-row ${line.type}`}
                                >
                                  <div className="diff-line-num base-num">
                                    {line.baseLine || ""}
                                  </div>
                                  <div className="diff-line-num head-num">
                                    {line.headLine || ""}
                                  </div>
                                  <div className="diff-line-marker">
                                    {isAdded ? "+" : isRemoved ? "-" : " "}
                                  </div>
                                  <div className="diff-line-text">
                                    {line.value}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="workspace-welcome-pane">
                  <div className="welcome-graphic-circle">
                    <Icons.Repo />
                  </div>
                  <h3>No file selected</h3>
                  <p>Select a changed asset file from the left sidebar to view visual line-by-line diffs.</p>
                </div>
              )
            )}

            {/* HISTORY MODE: Commit Details + Files + Diffs */}
            {activeTab === "history" && (
              selectedCommit ? (
                <div className="history-details-layout">
                  {/* Left Column: Metadata & Changed Files List */}
                  <div className="history-commit-info-pane">
                    <div className="history-commit-header">
                      <h3 className="commit-summary-title">{selectedCommit.message.split("\n")[0]}</h3>
                      {selectedCommit.message.split("\n").slice(2).join("\n") && (
                        <p className="commit-desc-text">{selectedCommit.message.split("\n").slice(2).join("\n")}</p>
                      )}
                      <span className="commit-hash-badge">{selectedCommit.hash}</span>
                    </div>
                    
                    <div className="commit-meta-details">
                      <div className="meta-item">
                        <strong>Author:</strong> <span>{selectedCommit.author}</span>
                      </div>
                      <div className="meta-item">
                        <strong>Date:</strong> <span>{selectedCommit.date}</span>
                      </div>
                    </div>

                    <div className="history-commit-files">
                      <h4>Files Changed ({commitFiles[selectedCommit.hash] ? commitFiles[selectedCommit.hash].length : 0})</h4>
                      {commitFilesLoading && !commitFiles[selectedCommit.hash] ? (
                        <div className="loading-files">
                          <span className="spinner"></span>
                          <span>Loading files...</span>
                        </div>
                      ) : (
                        <div className="history-files-list">
                          {commitFiles[selectedCommit.hash]?.map(file => {
                            const isSelected = selectedCommitFile?.path === file.path;
                            return (
                              <div
                                key={file.path}
                                className={`history-file-row ${isSelected ? "selected" : ""}`}
                                onClick={() => loadHistoricalFileDiff(selectedCommit.hash, file.path, file.status)}
                              >
                                <span className={`file-status-badge ${file.status}`}>
                                  {file.status === "modified" && "M"}
                                  {file.status === "untracked" && "A"}
                                  {file.status === "deleted" && "D"}
                                </span>
                                <span className="file-path-label" title={file.path}>{file.path}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    
                    <div className="commit-checkout-footer">
                      <button 
                        className="btn btn-secondary btn-sm btn-full"
                        onClick={() => handleCheckout(selectedCommit.hash)}
                      >
                        Checkout Commit State
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Historical File Diff Viewer */}
                  <div className="history-commit-diff-pane">
                    {selectedCommitFile ? (
                      <div className="diff-viewer-container">
                        <div className="diff-viewer-header">
                          <div className="diff-file-info">
                            <span className={`file-status-badge ${selectedCommitFile.status}`}>
                              {selectedCommitFile.status === "modified" && "M"}
                              {selectedCommitFile.status === "untracked" && "A"}
                              {selectedCommitFile.status === "deleted" && "D"}
                            </span>
                            <span className="diff-file-path" title={selectedCommitFile.path}>{selectedCommitFile.path}</span>
                          </div>
                        </div>
                        <div className="diff-viewer-content">
                          {commitFileDiffLoading ? (
                            <div className="diff-loading">
                              <span className="spinner"></span>
                              <span>Loading differences...</span>
                            </div>
                          ) : commitFileDiffError ? (
                            <div className="diff-error">
                              <span>{commitFileDiffError}</span>
                            </div>
                          ) : commitFileDiff.length === 0 ? (
                            <div className="diff-empty">
                              <span>No text changes or binary asset in this version.</span>
                            </div>
                          ) : (
                            <div className="diff-lines">
                              {commitFileDiff.map((line, idx) => {
                                const isAdded = line.type === "added";
                                const isRemoved = line.type === "removed";
                                return (
                                  <div 
                                    key={idx} 
                                    className={`diff-line-row ${line.type}`}
                                  >
                                    <div className="diff-line-num base-num">
                                      {line.baseLine || ""}
                                    </div>
                                    <div className="diff-line-num head-num">
                                      {line.headLine || ""}
                                    </div>
                                    <div className="diff-line-marker">
                                      {isAdded ? "+" : isRemoved ? "-" : " "}
                                    </div>
                                    <div className="diff-line-text">
                                      {line.value}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="workspace-welcome-pane">
                        <h3>No file selected</h3>
                        <p>Select a file from the changed files list on the left to inspect its detailed diff at this point in history.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="workspace-welcome-pane">
                  <div className="welcome-graphic-circle">
                    <Icons.Clock />
                  </div>
                  <h3>No commit selected</h3>
                  <p>Select a commit node from the history timeline in the sidebar to review its metadata and diffs.</p>
                </div>
              )
            )}

            {/* LOCKS MODE: Information panel */}
            {activeTab === "locks" && (
              <div className="workspace-welcome-pane">
                <div className="welcome-graphic-circle" style={{ color: "var(--color-locked)", borderColor: "var(--color-locked)" }}>
                  <Icons.Lock />
                </div>
                <h3>Synapse Local File Locking Console</h3>
                <p>Locks prevent merge conflicts on binary assets (textures, meshes, code). Locked assets are set to Read-Only on disk for other users.</p>
                <div style={{ maxWidth: "450px", marginTop: "24px", color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "left", lineHeight: "1.6" }}>
                  <h4 style={{ color: "var(--text-main)", marginBottom: "8px" }}>Usage Instructions:</h4>
                  <ul style={{ paddingLeft: "20px" }}>
                    <li>To lock an asset manually, type its relative path in the input box on the sidebar and click "Lock Path".</li>
                    <li>To release an asset lock, locate it in the sidebar list under "Locks" and click the release button (×) next to it.</li>
                    <li>Staging changes in the Changes tab automatically checks locks against the C++ sidecar database.</li>
                  </ul>
                </div>
              </div>
            )}
          </main>
        </div>
      ) : (
        <div className="welcome-container">
          <div className="welcome-logo">S</div>
          <h1 className="welcome-title">Synapse Version Control</h1>
          <p className="welcome-subtitle">
            Sleek, lightweight, and local version control with built-in asset locking, designed for game developers and Unreal Engine integrations.
          </p>
          <div className="welcome-card">
            <h3>Get Started</h3>
            <button 
              className="btn btn-primary btn-full"
              onClick={() => {
                setShowAddModal(true);
              }}
            >
              Register or Initialize a Repository
            </button>
          </div>
        </div>
      )}

      {/* MODAL: ADD REPOSITORY */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add Workspace Repository</h3>
              <button className="btn-icon-sm" onClick={() => setShowAddModal(false)}>
                <Icons.Close />
              </button>
            </div>
            <form onSubmit={handleAddRepository}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Local Repository Path</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      className="input-text"
                      placeholder="e.g. C:\Projects\MyGame"
                      value={newRepoPath}
                      onChange={(e) => setNewRepoPath(e.target.value)}
                      required
                      autoFocus
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleBrowseDirectory}
                      style={{ gap: "6px", whiteSpace: "nowrap", flexShrink: 0 }}
                    >
                      <Icons.Folder />
                      <span>Browse...</span>
                    </button>
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    Paste or browse the path to your folder. If the folder is not yet a Synapse workspace, it will be initialized automatically.
                  </p>
                </div>

                <div className="form-group" style={{ marginTop: "16px" }}>
                  <label className="form-label">Ignore Preset Template</label>
                  <select 
                    className="input-text" 
                    value={selectedIgnoreTemplate}
                    onChange={(e) => setSelectedIgnoreTemplate(e.target.value)}
                    style={{ width: "100%", cursor: "pointer" }}
                  >
                    <option value="unreal">Unreal Engine 5 (Recommended)</option>
                    <option value="unity">Unity</option>
                    <option value="godot">Godot Engine</option>
                    <option value="sbox">S&amp;Box (Facepunch)</option>
                    <option value="vs">Visual Studio / C++</option>
                    {Object.keys(customTemplates).map(name => (
                      <option key={name} value={`custom_${name}`}>Custom: {name}</option>
                    ))}
                    <option value="none">None (Empty ignore file)</option>
                  </select>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: "1.4" }}>
                    If the folder needs to be initialized, this preset will pre-fill your <code style={{ color: "var(--text-bright)" }}>.synapseignore</code>.
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowAddModal(false);
                    setNewRepoPath("");
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Open Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE BRANCH */}
      {showBranchModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Create Branch</h3>
              <button className="btn-icon-sm" onClick={() => setShowBranchModal(false)}>
                <Icons.Close />
              </button>
            </div>
            <form onSubmit={handleCreateBranch}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Branch Name</label>
                  <input
                    type="text"
                    className="input-text"
                    placeholder="e.g. feature-combat-system"
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    required
                    autoFocus
                  />
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    Branches allow you to work on separate features without affecting the main timeline. The new branch will branch off the current branch: <strong style={{ color: "var(--text-main)" }}>{activeBranch}</strong>.
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowBranchModal(false);
                    setNewBranchName("");
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create & Checkout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notification Banner */}
      {notification && (
        <div className={`notification-banner ${notification.type}`}>
          <span>{notification.message}</span>
        </div>
      )}
    </div>
  );
}

export default App;
