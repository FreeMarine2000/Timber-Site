// src/components/LogConfigurator.jsx
'use client';

import { useRef, useState, useMemo, Suspense, useEffect } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Center, Grid, RoundedBox, Html, Text, Outlines } from '@react-three/drei';
import { Physics, useBox, usePlane } from '@react-three/cannon';
import * as THREE from 'three';
import { Truck, Ruler, RefreshCw, Calculator, Sliders, Navigation, AlertTriangle, Layers, Trash2, MousePointer2, Download, Box, Table2 } from 'lucide-react';
import { useTheme } from '@/components/Providers';

// --- UTILS ---
const calculateBoardFeet = (l_ft, w_in, t_in) => (l_ft * w_in * t_in) / 12;

// --- 1. PROCEDURAL TRUCK ---
function IndianTruck({ children, physicsEnabled }) {
  const TruckBedCollider = () => {
    useBox(() => ({ args: [2.4, 0.2, 6], position: [0, 1.6, -1.5], type: 'Static' }));
    useBox(() => ({ args: [0.1, 1, 6], position: [1.15, 2.1, -1.5], type: 'Static' })); 
    useBox(() => ({ args: [0.1, 1, 6], position: [-1.15, 2.1, -1.5], type: 'Static' })); 
    useBox(() => ({ args: [2.4, 1, 0.1], position: [0, 2.1, -4.5], type: 'Static' })); 
    return null;
  };

  return (
    <group>
      {physicsEnabled && <TruckBedCollider />}
      <group position={[0, -1.5, 0]} scale={0.8}>
        <mesh position={[0, 0.5, 0]}><boxGeometry args={[2.5, 0.5, 8]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
        <Wheel position={[-1.3, 0.5, 2.5]} /><Wheel position={[1.3, 0.5, 2.5]} />
        <Wheel position={[-1.3, 0.5, -2]} /><Wheel position={[1.3, 0.5, -2]} />
        <Wheel position={[-1.3, 0.5, -3.2]} /><Wheel position={[1.3, 0.5, -3.2]} />
        <group position={[0, 1.8, 2.8]}>
            <mesh><boxGeometry args={[2.4, 2.2, 2]} /><meshStandardMaterial color="#FF9933" /></mesh>
            <mesh position={[0, 0.2, 1.01]}><planeGeometry args={[2.2, 0.8]} /><meshStandardMaterial color="#88CCFF" roughness={0.2} /></mesh>
        </group>
        <group position={[0, 1.6, -1.5]}>
            <mesh position={[0, 0, 0]}><boxGeometry args={[2.4, 0.2, 6]} /><meshStandardMaterial color="#5C4033" /></mesh>
            <group position={[0, 0.5, -3]}>
                <mesh><boxGeometry args={[2.4, 1, 0.1]} /><meshStandardMaterial color="#FFD700" /></mesh>
                <Text position={[0, 0, -0.06]} rotation={[0, Math.PI, 0]} fontSize={0.4} color="red">HORN OK PLEASE</Text>
            </group>
        </group>
        <group position={[0, 2, -1.5]}>{children}</group>
      </group>
    </group>
  );
}

function Wheel({ position }) {
  return (
    <mesh position={position} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.5, 0.5, 0.4, 16]} /><meshStandardMaterial color="#111" />
        <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[0.2, 0.2, 0.42, 16]} /><meshStandardMaterial color="#ddd" /></mesh>
    </mesh>
  );
}

// --- 2. PHYSICS FLOOR ---
function Floor() {
  const [ref] = usePlane(() => ({ rotation: [-Math.PI / 2, 0, 0], position: [0, -2, 0] }));
  return <mesh ref={ref} receiveShadow><shadowMaterial opacity={0.2} /></mesh>;
}

// --- 3. RC DRIVING SAW ---
function RCDrivingSaw({ active, onUpdatePos, onClickToCut }) {
  const sawRef = useRef();
  const bladeRef = useRef();
  const mousePlane = useRef(null);
  const targetPos = useRef(new THREE.Vector3(0, 1, 0));
  
  useEffect(() => {
    mousePlane.current = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.0);
  }, []);

  useFrame((state, delta) => {
    if (!active || !sawRef.current || !mousePlane.current) return;
    state.raycaster.ray.intersectPlane(mousePlane.current, targetPos.current);
    
    const currentPos = sawRef.current.position;
    currentPos.x = THREE.MathUtils.lerp(currentPos.x, targetPos.current.x, delta * 5);
    currentPos.z = THREE.MathUtils.lerp(currentPos.z, targetPos.current.z, delta * 5);

    const dx = targetPos.current.x - currentPos.x;
    const dz = targetPos.current.z - currentPos.z;
    if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
        sawRef.current.rotation.y = THREE.MathUtils.lerp(sawRef.current.rotation.y, Math.atan2(dx, dz), delta * 10);
    }
    if (bladeRef.current) bladeRef.current.rotation.y -= delta * 30;
    
    onUpdatePos({ x: currentPos.x, z: currentPos.z });
  });

  return (
    <>
      {active && (
         <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 1, 0]} onClick={onClickToCut} visible={false}>
            <planeGeometry args={[100, 100]} /><meshBasicMaterial color="pink" wireframe />
         </mesh>
      )}
      {active && (
        <group ref={sawRef} position={[0, 1, 0]}>
            <mesh position={[0, 0.3, 0]} castShadow><boxGeometry args={[0.3, 0.4, 0.6]} /><meshStandardMaterial color="#222" /></mesh>
            <mesh position={[0, 0.6, -0.2]} rotation={[-Math.PI/4, 0, 0]}><capsuleGeometry args={[0.05, 0.4]} /><meshStandardMaterial color="#ff6600" /></mesh>
            <mesh ref={bladeRef} position={[0, 0, 0]} rotation={[0, 0, Math.PI/2]}>
                <cylinderGeometry args={[0.5, 0.5, 0.02, 32]} /><meshStandardMaterial color="#ccc" metalness={0.8} roughness={0.2} />
                <mesh><cylinderGeometry args={[0.52, 0.52, 0.02, 24]} /><meshStandardMaterial color="#555" wireframe /></mesh>
            </mesh>
            <Html position={[0, 1, 0]} center>
                <div className="bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none">CLICK TO CUT</div>
            </Html>
        </group>
      )}
    </>
  );
}

// --- 4. PARTICLE SYSTEM ---
function WoodExplosion({ position }) {
  const count = 30;
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useRef([]); 

  useEffect(() => {
    particles.current = new Array(count).fill(0).map(() => ({
      pos: new THREE.Vector3(position[0], position[1], position[2]),
      vel: new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 3, (Math.random() - 0.5) * 2),
      rot: new THREE.Vector3(Math.random(), Math.random(), Math.random()),
      life: 1.0
    }));
  }, [position]);

  useFrame((state, delta) => {
    if (!meshRef.current || particles.current.length === 0) return;
    particles.current.forEach((p, i) => {
      if (p.life > 0) {
          p.vel.y -= delta * 10;
          p.pos.addScaledVector(p.vel, delta);
          p.rot.x += delta * 5;
          p.life -= delta * 1.5;
          dummy.position.copy(p.pos);
          dummy.rotation.set(p.rot.x, p.rot.y, p.rot.z);
          dummy.scale.setScalar(p.life * 0.5);
          dummy.updateMatrix();
          meshRef.current.setMatrixAt(i, dummy.matrix);
      } else {
          dummy.scale.set(0,0,0);
          dummy.updateMatrix();
          meshRef.current.setMatrixAt(i, dummy.matrix);
      }
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
        <boxGeometry args={[0.08, 0.08, 0.08]} />
        <meshStandardMaterial color="#C19A6B" />
    </instancedMesh>
  );
}

// --- 5. PLANK COMPONENT ---
function Plank({ data, isSelected, onSelect, onUpdate, sawActive, physicsMode }) {
  const meshRef = useRef();
  const baseTexture = useLoader(THREE.TextureLoader, '/wood_texture.jpg');
  const texture = useMemo(() => {
    const t = baseTexture.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.rotation = Math.PI / 2; 
    t.center.set(0.5, 0.5); 
    t.colorSpace = THREE.SRGBColorSpace; 
    t.repeat.set(data.length * 0.5, data.width * 0.5);
    return t;
  }, [baseTexture, data.length, data.width]);

  const [physRef] = useBox(() => ({
    mass: 5, 
    position: [data.x, 2, data.z], 
    args: [data.width, data.length, data.thickness],
    type: 'Dynamic'
  }), useRef(null)); 

  const dragging = useRef(false);
  const mousePlane = useRef(null);
  useEffect(() => { mousePlane.current = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); }, []);

  useFrame((state) => {
    if (!physicsMode && dragging.current && !sawActive && mousePlane.current) {
        const target = new THREE.Vector3();
        state.raycaster.ray.intersectPlane(mousePlane.current, target);
        onUpdate(data.id, { x: target.x, z: target.z });
    }
  });

  if (physicsMode) {
      return (
        <RoundedBox ref={physRef} args={[1, 1, 1]} scale={[data.width, data.length, data.thickness]} radius={0.02} smoothness={4} castShadow receiveShadow>
            <meshStandardMaterial map={texture} color="#C19A6B" roughness={0.5} />
        </RoundedBox>
      );
  }

  return (
    <RoundedBox 
        ref={meshRef}
        args={[1, 1, 1]} 
        scale={[data.width, data.length, data.thickness]}
        position={[data.x, 0, data.z]} 
        radius={0.02} smoothness={4} rotation={[Math.PI / 2, 0, 0]}
        castShadow receiveShadow
        onPointerDown={(e) => {
            if (sawActive) return;
            e.stopPropagation();
            onSelect(data.id);
            dragging.current = true;
            document.body.style.cursor = 'grabbing';
        }}
        onPointerUp={() => { dragging.current = false; document.body.style.cursor = 'auto'; }}
        onPointerOver={() => !sawActive && (document.body.style.cursor = 'grab')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
    >
        <meshStandardMaterial map={texture} color={isSelected ? "#ffb347" : "#C19A6B"} emissive={isSelected ? "#aa4400" : "#000000"} emissiveIntensity={isSelected ? 0.2 : 0} roughness={0.5} />
        {isSelected && <Outlines thickness={0.05} color="orange" />}
    </RoundedBox>
  );
}

function LoadingFallback() {
  return <Html center><div className="text-stone-500 font-bold animate-pulse">Loading Assets...</div></Html>;
}

// --- MAIN COMPONENT ---
export default function LogConfigurator() {
  const [viewMode, setViewMode] = useState('studio'); 
  const [inputMode, setInputMode] = useState('sliders'); 
  const [masterDims, setMasterDims] = useState({ width: 1.5, length: 7.0, thickness: 0.2 });
  const [physicsEnabled, setPhysicsEnabled] = useState(false);
  
  const [planks, setPlanks] = useState([{ id: 'master', width: 1.5, length: 7.0, thickness: 0.2, x: 0, z: 0 }]);
  const [selectedId, setSelectedId] = useState(null);
  
  const [sawActive, setSawActive] = useState(false);
  const [sawPos, setSawPos] = useState({ x: 0, z: 0 });
  const [explosions, setExplosions] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  const { darkMode } = useTheme();

  const totalVolume = planks.reduce((acc, p) => acc + (p.width * p.length * p.thickness), 0);
  const totalBF = planks.reduce((acc, p) => acc + calculateBoardFeet(p.length*2, p.width*12, p.thickness*10), 0);
  const price = Math.floor(totalVolume * 300);
  const activeDims = selectedId ? planks.find(p => p.id === selectedId) || masterDims : masterDims;

  const handleDimChange = (key, value) => {
      const val = parseFloat(value);
      if (selectedId) {
          setPlanks(prev => prev.map(p => {
              if (p.id === selectedId) {
                  let newVal = val;
                  if (key === 'length') newVal = val / 2;
                  if (key === 'width') newVal = val / 12;
                  if (key === 'thickness') newVal = val / 10;
                  return { ...p, [key]: newVal };
              }
              return p;
          }));
      } else {
          let newDims = { ...masterDims };
          if (key === 'length') newDims.length = val / 2;     
          if (key === 'width') newDims.width = val / 12;      
          if (key === 'thickness') newDims.thickness = val / 10;
          setMasterDims(newDims);
          setPlanks([{ ...newDims, id: 'master', x: 0, z: 0 }]);
          setSelectedId(null);
      }
  };

  const handlePlankUpdate = (id, newPos) => setPlanks(prev => prev.map(p => p.id === id ? { ...p, ...newPos } : p));
  const deleteSelected = () => { if (!selectedId) return; setPlanks(prev => prev.filter(p => p.id !== selectedId)); setSelectedId(null); };

  const downloadCSV = () => {
      const headers = ["ID", "Length (ft)", "Width (in)", "Thickness (in)", "Board Feet"].join(",");
      const rows = planks.map((p, i) => {
          const l = (p.length * 2).toFixed(2);
          const w = (p.width * 12).toFixed(2);
          const t = (p.thickness * 10).toFixed(2);
          const bf = calculateBoardFeet(l, w, t).toFixed(2);
          return [`Piece #${i+1}`, l, w, t, bf].join(",");
      });
      const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "timber_cut_list.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const attemptCut = () => {
    const { x, z } = sawPos;
    let hitIndex = -1;
    for (let i = 0; i < planks.length; i++) {
        const p = planks[i];
        if (x > p.x - p.width/2 && x < p.x + p.width/2 && z > p.z - p.length/2 && z < p.z + p.length/2) {
            hitIndex = i; break;
        }
    }
    if (hitIndex === -1) { setErrorMsg("Missed!"); setTimeout(() => setErrorMsg(''), 1000); return; }

    const target = planks[hitIndex];
    const localCutZ = z - target.z;
    const leftLen = localCutZ - (-target.length / 2);
    const rightLen = (target.length / 2) - localCutZ;

    if (leftLen < 0.2 || rightLen < 0.2) { setErrorMsg("Too close to edge!"); setTimeout(() => setErrorMsg(''), 1000); return; }

    const newLeft = { ...target, id: Math.random().toString(36), length: leftLen, z: target.z - (target.length/2) + (leftLen/2) - 0.05 };
    const newRight = { ...target, id: Math.random().toString(36), length: rightLen, z: target.z + (target.length/2) - (rightLen/2) + 0.05 };

    const newPlanks = [...planks];
    newPlanks.splice(hitIndex, 1, newLeft, newRight);
    setPlanks(newPlanks);
    setExplosions(prev => [...prev, { id: Date.now(), pos: [x, 0.5, z] }]);
  };

  return (
    <div className={`flex flex-col lg:flex-row h-[750px] rounded-3xl overflow-hidden shadow-2xl border transition-colors duration-500 ${darkMode ? 'bg-stone-900 border-stone-800' : 'bg-stone-100 border-stone-200'}`}>
      
      {/* LEFT: 3D VIEWPORT */}
      <div className={`relative flex-1 ${darkMode ? 'bg-stone-800' : 'bg-[#f0f0f0]'}`}>
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none">
            <div className="flex gap-2 pointer-events-auto">
                <button onClick={() => setViewMode(m => m === 'truck' ? 'studio' : 'truck')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all ${viewMode === 'truck' ? 'bg-orange-600 text-white' : 'bg-white text-stone-800'}`}><Truck className="w-4 h-4" /> {viewMode === 'truck' ? 'Studio' : 'Truck'}</button>
                <button onClick={() => setPhysicsEnabled(!physicsEnabled)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all ${physicsEnabled ? 'bg-purple-600 text-white' : 'bg-white text-stone-800'}`}><Box className="w-4 h-4" /> {physicsEnabled ? 'Gravity ON' : 'Gravity OFF'}</button>
            </div>
        </div>
        {errorMsg && <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-red-600 text-white px-4 py-2 rounded-full font-bold shadow-lg animate-bounce flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> {errorMsg}</div>}
        
        <Canvas shadows camera={{ position: [6, 8, 8], fov: 45 }} onPointerMissed={() => setSelectedId(null)}>
          <ambientLight intensity={darkMode ? 0.4 : 0.8} />
          <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
          <pointLight position={[-10, 5, -10]} intensity={0.5} />
          <Suspense fallback={<LoadingFallback />}>
            <Physics gravity={[0, -9.8, 0]} isPaused={!physicsEnabled}>
                <Center top={viewMode === 'studio'}> 
                    <group>
                        {!physicsEnabled && <RCDrivingSaw active={sawActive} onUpdatePos={setSawPos} onClickToCut={attemptCut} />}
                        {explosions.map(ex => <WoodExplosion key={ex.id} position={ex.pos} />)}
                        <group>
                            {viewMode === 'truck' ? (
                                <IndianTruck physicsEnabled={physicsEnabled}>{planks.map(p => <Plank key={p.id} data={p} isSelected={selectedId === p.id} onSelect={setSelectedId} onUpdate={handlePlankUpdate} sawActive={sawActive} physicsMode={physicsEnabled} />)}</IndianTruck>
                            ) : (
                                <>{physicsEnabled && <Floor />}{planks.map(p => <Plank key={p.id} data={p} isSelected={selectedId === p.id} onSelect={setSelectedId} onUpdate={handlePlankUpdate} sawActive={sawActive} physicsMode={physicsEnabled} />)}</>
                            )}
                        </group>
                    </group>
                </Center>
            </Physics>
          </Suspense>
          <Grid position={[0, -2, 0]} args={[20, 20]} cellSize={0.5} cellThickness={0.5} cellColor={darkMode ? "#444" : "#ccc"} sectionSize={3} fadeDistance={30} infiniteGrid />
          <OrbitControls makeDefault enabled={!sawActive} minPolarAngle={0} maxPolarAngle={Math.PI / 2.1} target={[0, 0, 0]} />
        </Canvas>
      </div>

      {/* RIGHT: CONTROLS */}
      <div className={`w-full lg:w-96 p-6 flex flex-col border-l overflow-hidden ${darkMode ? 'bg-stone-900 border-stone-800 text-white' : 'bg-white border-stone-200'}`}>
        
        {/* HEADER */}
        <div className="mb-6 flex-shrink-0">
            <h3 className="text-2xl font-serif mb-1">{selectedId ? "Edit Piece" : "Master Log"}</h3>
            <p className={`text-sm ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>{selectedId ? "Drag to move. Sliders resize selected." : "Define main dimensions. We mill to order."}</p>
        </div>

        {/* CONTROLS SCROLL AREA */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
            <div className={`flex p-1 rounded-lg ${darkMode ? 'bg-stone-800' : 'bg-stone-100'}`}>
                <button onClick={() => setInputMode('sliders')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-all ${inputMode === 'sliders' ? (darkMode ? 'bg-stone-700 text-white' : 'bg-white text-stone-900 shadow-sm') : 'text-stone-400'}`}><Sliders className="w-4 h-4" /> Standard</button>
                <button onClick={() => setInputMode('manual')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-all ${inputMode === 'manual' ? (darkMode ? 'bg-stone-700 text-white' : 'bg-white text-stone-900 shadow-sm') : 'text-stone-400'}`}><Calculator className="w-4 h-4" /> Manual</button>
            </div>

            {/* INPUTS */}
            <div className={`space-y-6 pb-6 border-b ${darkMode ? 'border-stone-700' : 'border-stone-100'}`}>
                <div className="space-y-2">
                    <div className="flex justify-between items-center"><label className="text-sm font-bold flex items-center gap-2"><Ruler className="w-4 h-4"/> Length</label><span className={`font-mono text-sm px-2 rounded ${darkMode?'bg-stone-800':'bg-stone-100'}`}>{(activeDims.length * 2).toFixed(1)}ft</span></div>
                    {inputMode === 'sliders' ? <input type="range" min="1.5" max="10.0" step="0.1" value={(activeDims.length*2)} onChange={(e) => handleDimChange('length', e.target.value)} className="w-full accent-orange-600 h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer" />
                    : <input type="number" min="1.0" step="0.1" value={(activeDims.length * 2).toFixed(1)} onChange={(e) => handleDimChange('length', e.target.value)} className={`w-full p-2 border rounded-lg font-mono focus:outline-none ${darkMode?'bg-stone-800 border-stone-700':'border-stone-200'}`} />}
                </div>
                
                <div className="space-y-2">
                    <div className="flex justify-between items-center"><label className="text-sm font-bold flex items-center gap-2"><Ruler className="w-4 h-4 rotate-90"/> Width</label><span className={`font-mono text-sm px-2 rounded ${darkMode?'bg-stone-800':'bg-stone-100'}`}>{(activeDims.width * 12).toFixed(0)}in</span></div>
                    {inputMode === 'sliders' ? <input type="range" min="1" max="40" step="1" value={(activeDims.width*12)} onChange={(e) => handleDimChange('width', e.target.value)} className="w-full accent-orange-600 h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer" />
                    : <input type="number" min="1.0" step="0.1" value={(activeDims.width * 12).toFixed(0)} onChange={(e) => handleDimChange('width', e.target.value)} className={`w-full p-2 border rounded-lg font-mono focus:outline-none ${darkMode?'bg-stone-800 border-stone-700':'border-stone-200'}`} />}
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between items-center"><label className="text-sm font-bold flex items-center gap-2"><Box className="w-4 h-4"/> Thickness</label><span className={`font-mono text-sm px-2 rounded ${darkMode?'bg-stone-800':'bg-stone-100'}`}>{(activeDims.thickness * 10).toFixed(1)}in</span></div>
                    {inputMode === 'sliders' ? <input type="range" min="0.5" max="5.0" step="0.1" value={(activeDims.thickness*10)} onChange={(e) => handleDimChange('thickness', e.target.value)} className="w-full accent-orange-600 h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer" />
                    : <input type="number" min="1.0" step="0.1" value={(activeDims.thickness * 10).toFixed(1)} onChange={(e) => handleDimChange('thickness', e.target.value)} className={`w-full p-2 border rounded-lg font-mono focus:outline-none ${darkMode?'bg-stone-800 border-stone-700':'border-stone-200'}`} />}
                </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="space-y-3 pt-4 border-t border-stone-200 dark:border-stone-700">
                <div className={`p-4 rounded-xl border-2 transition-all flex justify-between items-center ${sawActive ? 'border-orange-500 bg-orange-900/20' : (darkMode ? 'border-stone-700 bg-stone-800' : 'border-stone-100 bg-stone-50')}`}>
                    <span className="font-bold flex items-center gap-2"><Navigation className={`w-4 h-4 ${sawActive ? 'animate-pulse' : ''}`} /> Power Saw</span>
                    <button onClick={() => { setSawActive(!sawActive); setSelectedId(null); setPhysicsEnabled(false); }} className={`text-xs font-bold px-3 py-1 rounded-full border ${sawActive ? 'bg-orange-600 text-white' : (darkMode ? 'bg-stone-700 text-white' : 'bg-white text-stone-500')}`}>{sawActive ? 'STOP' : 'START'}</button>
                </div>
                {selectedId && <button onClick={deleteSelected} className="w-full py-3 rounded-xl border-2 border-red-900/30 text-red-500 font-bold bg-red-900/10 hover:bg-red-900/20 flex items-center justify-center gap-2 transition-all"><Trash2 className="w-4 h-4"/> Delete Piece</button>}
                <button onClick={() => { setMasterDims({ width: 1.5, length: 7.0, thickness: 0.2 }); setPlanks([{ id: 'master', width: 1.5, length: 7.0, thickness: 0.2, x: 0, z: 0 }]); setExplosions([]); setSelectedId(null); }} className={`w-full py-3 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all ${darkMode ? 'border-stone-700 text-stone-400 hover:bg-stone-800' : 'border-stone-200 text-stone-600 hover:bg-stone-100'}`}><RefreshCw className="w-4 h-4"/> Reset All</button>
            </div>

            {/* CUT LIST TABLE */}
            <div className={`rounded-xl border overflow-hidden flex flex-col ${darkMode ? 'border-stone-700 bg-stone-800' : 'border-stone-200 bg-stone-50'}`}>
                {/* Header Row */}
                <div className={`flex justify-between items-center p-3 border-b ${darkMode ? 'border-stone-700 bg-stone-800' : 'border-stone-200 bg-stone-100'}`}>
                    <div className="flex items-center gap-2">
                        <Table2 className="w-4 h-4 text-stone-500"/>
                        <span className="text-xs font-bold uppercase tracking-wider">Cut List ({planks.length})</span>
                    </div>
                    <button onClick={downloadCSV} className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200 flex items-center gap-1"><Download className="w-3 h-3"/> CSV</button>
                </div>
                {/* Scrollable Rows - FIXED QUOTES HERE */}
                <div className="max-h-48 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {planks.map((p, i) => {
                        const vol = calculateBoardFeet(p.length*2, p.width*12, p.thickness*10).toFixed(1);
                        return (
                            <div key={p.id} onClick={() => setSelectedId(p.id)} className={`grid grid-cols-3 gap-2 p-2 rounded text-xs cursor-pointer items-center border transition-all ${selectedId === p.id ? 'bg-orange-600 text-white border-orange-600' : (darkMode ? 'bg-stone-900 border-stone-700 hover:border-stone-500' : 'bg-white border-stone-200 hover:border-orange-300')}`}>
                                <span className="font-bold flex items-center gap-1 col-span-1">{selectedId === p.id && <MousePointer2 className="w-3 h-3"/>} #{i+1}</span>
                                {/* ESCAPED QUOTES BELOW */}
                                <span className="font-mono text-center col-span-1">{(p.length*2).toFixed(1)}&apos; x {(p.width*12).toFixed(0)}&quot;</span>
                                <span className="text-right opacity-70 col-span-1">{vol} BF</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* BOTTOM TOTALS (STICKY) */}
        <div className={`p-6 border-t flex-shrink-0 ${darkMode ? 'border-stone-700 bg-stone-900' : 'border-stone-100 bg-white'}`}>
            <div className="flex justify-between items-end mb-2">
                <span className="text-stone-500 text-sm">Total Volume</span>
                <span className="text-xl font-bold font-mono">{totalBF.toFixed(1)} <span className="text-sm font-normal text-stone-500">Board Feet</span></span>
            </div>
            <div className="flex justify-between items-end mb-4">
                <span className="text-stone-500 text-sm">Est. Price</span>
                <span className="text-4xl font-serif">${price}</span>
            </div>
            <button className={`w-full py-4 rounded-xl font-bold transition transform active:scale-95 shadow-lg ${darkMode ? 'bg-white text-black hover:bg-stone-200' : 'bg-stone-900 text-white hover:bg-black'}`}>Request Custom Quote</button>
        </div>
      </div>
    </div>
  );
}