// src/components/LogConfigurator.jsx
'use client';

import { useRef, useState, useMemo, Suspense, useEffect } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Center, Grid, Html, Outlines, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Truck, RefreshCw, Navigation, AlertTriangle, MousePointer2, Download, Box, Table2, TreePine, Palette, RotateCw, Scissors, Cylinder as CylinderIcon, Square } from 'lucide-react';
import { useTheme } from '@/components/Providers';
import { getLocationCurrency } from '@/lib/api';

// --- CONFIGURATION ---
const WOOD_TYPES = {
  walnut: { name: 'Black Walnut', color: '#5d4037', priceMult: 2.5, roughness: 0.6 },
  oak: { name: 'White Oak', color: '#e0cda7', priceMult: 1.8, roughness: 0.7 },
  cherry: { name: 'American Cherry', color: '#8b4513', priceMult: 2.0, roughness: 0.5 },
  teak: { name: 'Burmese Teak', color: '#c19a6b', priceMult: 3.0, roughness: 0.8 },
  pine: { name: 'Yellow Pine', color: '#f4e99b', priceMult: 1.0, roughness: 0.9 },
};

const STANDARD_SIZES = [
  { label: '2x4', w: 3.5, t: 1.5 },
  { label: '2x6', w: 5.5, t: 1.5 },
  { label: '4x4', w: 3.5, t: 3.5 },
  { label: '1x6', w: 5.5, t: 0.75 },
  { label: '1x12', w: 11.25, t: 0.75 },
];

// --- GEOMETRY UTILS ---
const EPSILON = 1e-6;
const POINT_EPS = 1e-4;
const MIN_PIECE_AREA = 0.03;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const almostEqual = (a, b, eps = EPSILON) => Math.abs(a - b) <= eps;

const pointsEqual = (a, b, eps = POINT_EPS) =>
  almostEqual(a.x, b.x, eps) && almostEqual(a.y, b.y, eps);

const roundPoint = (p, digits = 6) => {
  const f = 10 ** digits;
  return { x: Math.round(p.x * f) / f, y: Math.round(p.y * f) / f };
};

const getCentroid = (points) => {
    let cx = 0, cy = 0;
    points.forEach(p => { cx += p.x; cy += p.y; });
    return { x: cx / points.length, y: cy / points.length };
};

const getIntersectionLineInfinite = (line1, line2, seg1, seg2) => {
    const x1 = line1.x, y1 = line1.y, x2 = line2.x, y2 = line2.y;
    const x3 = seg1.x, y3 = seg1.y, x4 = seg2.x, y4 = seg2.y;
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (Math.abs(denom) < EPSILON) return null;
    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
    if (ub >= -EPSILON && ub <= 1 + EPSILON) return roundPoint({ x: x1 + ua * (x2 - x1), y: y1 + ua * (y2 - y1) });
    return null;
};

const isLeft = (a, b, c) => ((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) > 0;

const polygonSignedArea = (points) => {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    area += (p1.x * p2.y) - (p2.x * p1.y);
  }
  return area / 2;
};

const polygonArea = (points) => Math.abs(polygonSignedArea(points));

const removeSequentialDuplicates = (points) => {
  if (points.length === 0) return points;
  const out = [roundPoint(points[0])];
  for (let i = 1; i < points.length; i++) {
    const rounded = roundPoint(points[i]);
    if (!pointsEqual(rounded, out[out.length - 1])) {
      out.push(rounded);
    }
  }
  if (out.length > 1 && pointsEqual(out[0], out[out.length - 1])) {
    out.pop();
  }
  return out;
};

const removeCollinear = (points) => {
  if (points.length < 4) return points;
  const out = [];
  for (let i = 0; i < points.length; i++) {
    const prev = points[(i - 1 + points.length) % points.length];
    const curr = points[i];
    const next = points[(i + 1) % points.length];
    const cross = (curr.x - prev.x) * (next.y - curr.y) - (curr.y - prev.y) * (next.x - curr.x);
    if (Math.abs(cross) > POINT_EPS) out.push(curr);
  }
  return out;
};

const normalizePolygon = (points) => {
  let poly = removeSequentialDuplicates(points);
  poly = removeCollinear(poly);
  if (poly.length < 3) return null;
  if (polygonArea(poly) < MIN_PIECE_AREA) return null;
  if (polygonSignedArea(poly) < 0) poly = [...poly].reverse();
  return poly;
};

const slicePolygon = (points, l1, l2) => {
    const poly1 = [];
    const poly2 = [];
    for (let i = 0; i < points.length; i++) {
        const curr = points[i];
        const next = points[(i + 1) % points.length];
        const intersection = getIntersectionLineInfinite(l1, l2, curr, next);
        if (isLeft(l1, l2, curr)) poly1.push(curr); else poly2.push(curr);
        if (intersection) {
            poly1.push(intersection);
            poly2.push(intersection);
        }
    }
    const n1 = normalizePolygon(poly1);
    const n2 = normalizePolygon(poly2);
    if (!n1 || !n2) return null;
    return [n1, n2];
};

const getBounds = (points) => {
    let minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity;
    points.forEach(p => {
        if(p.x < minX) minX = p.x;
        if(p.x > maxX) maxX = p.x;
        if(p.y < minY) minY = p.y;
        if(p.y > maxY) maxY = p.y;
    });
    return { w: maxX-minX, d: maxY-minY, minX, maxX, minY, maxY };
};

const calculateBoardFeet = (lengthFt, widthIn, thickIn) => {
    return (lengthFt * widthIn * thickIn) / 12;
};

const pointInPolygon = (point, points) => {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x;
    const yi = points[i].y;
    const xj = points[j].x;
    const yj = points[j].y;
    const intersects = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / ((yj - yi) || 1e-9) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
};

const countLinePolygonIntersections = (points, l1, l2) => {
  const intersections = [];
  for (let i = 0; i < points.length; i++) {
    const curr = points[i];
    const next = points[(i + 1) % points.length];
    const intersection = getIntersectionLineInfinite(l1, l2, curr, next);
    if (!intersection) continue;
    if (!intersections.some((p) => pointsEqual(p, intersection))) {
      intersections.push(intersection);
    }
  }
  return intersections.length;
};

const makePieceId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

// --- COMPONENTS ---

function IndianTruck({ children }) {
  return (
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

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <shadowMaterial opacity={0.2} />
    </mesh>
  );
}

function RCDrivingSaw({ active, onUpdatePos, sawRotation, onClickToCut }) {
  const sawRef = useRef();
  const bladeRef = useRef();
  const mousePlane = useRef(null);
  const targetPos = useRef(new THREE.Vector3(0, 1, 0));
  
  useEffect(() => { mousePlane.current = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.0); }, []);

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
            <group rotation={[0, sawRotation, 0]}> 
                <mesh position={[0, 0.6, -0.2]} rotation={[-Math.PI/4, 0, 0]}><capsuleGeometry args={[0.05, 0.4]} /><meshStandardMaterial color="#ff6600" /></mesh>
                <mesh ref={bladeRef} position={[0, 0, 0]} rotation={[0, 0, Math.PI/2]}>
                    <cylinderGeometry args={[0.5, 0.5, 0.02, 32]} /><meshStandardMaterial color="#ccc" metalness={0.8} roughness={0.2} />
                    <mesh><cylinderGeometry args={[0.52, 0.52, 0.02, 24]} /><meshStandardMaterial color="#555" wireframe /></mesh>
                </mesh>
                <mesh rotation={[Math.PI/2, 0, 0]} position={[0, -0.9, 0]}><planeGeometry args={[0.02, 3]} /><meshBasicMaterial color="red" opacity={0.5} transparent /></mesh>
            </group>
            <Html position={[0, 1, 0]} center><div className="bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none">CLICK TO CUT</div></Html>
        </group>
      )}
    </>
  );
}

function WoodExplosion({ position, color }) {
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
    if (!meshRef.current) return;
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
        <meshStandardMaterial color={color || "#C19A6B"} />
    </instancedMesh>
  );
}

// --- 3D LABELS COMPONENT (Reusable) ---
const DimensionLabels = ({ isSelected, w, d, thickness, isLog }) => {
    if (!isSelected) return null;
    return (
        <group position={[0, thickness + (isLog ? 0.6 : 0.2), 0]}>
            <Text 
                position={[0, 0, -d/2 - 0.2]} 
                rotation={[-Math.PI/2, 0, 0]} 
                fontSize={0.3} color="white" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="black"
            >
                {(d * 2).toFixed(1)}&apos;
            </Text>
            <Text 
                position={[w/2 + 0.2, 0, 0]} 
                rotation={[-Math.PI/2, 0, -Math.PI/2]} 
                fontSize={0.3} color="white" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="black"
            >
                {(isLog ? thickness * 10 : w * 12).toFixed(1)}&quot;
            </Text>
        </group>
    );
};

// HYBRID PLANK COMPONENT
function HybridPlank({ data, isSelected, isDragging, onSelect, onToggleDrag, onUpdate, sawActive, woodTypeKey }) {
  const meshRef = useRef();
  const woodInfo = WOOD_TYPES[woodTypeKey] || WOOD_TYPES.oak;
  const isLog = data.type === 'log';

  const rotation = data.rotation || [0, 0, 0];

  const shape = useMemo(() => {
      const s = new THREE.Shape();
      if (data.points && data.points.length > 0) {
          s.moveTo(data.points[0].x, data.points[0].y);
          for (let i = 1; i < data.points.length; i++) {
              s.lineTo(data.points[i].x, data.points[i].y);
          }
          s.closePath();
      }
      return s;
  }, [data.points]);

  const baseTexture = useLoader(THREE.TextureLoader, '/wood_texture.jpg');
  const texture = useMemo(() => {
    if(!baseTexture) return null;
    const t = baseTexture.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(0.5, 0.5);
    return t;
  }, [baseTexture]);

  const bounds = useMemo(() => getBounds(data.points), [data.points]);

  const mousePlane = useRef(null);
  useEffect(() => { mousePlane.current = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); }, []);

  useFrame((state) => {
    if (isDragging && !sawActive && mousePlane.current) {
        const target = new THREE.Vector3();
        state.raycaster.ray.intersectPlane(mousePlane.current, target);
        if(onUpdate) onUpdate(data.id, { x: target.x, z: target.z });
    }
  });

  const Material = (
    <meshStandardMaterial 
      map={texture} 
      color={woodInfo.color} 
      emissive={isSelected ? "#aa4400" : "#000000"} 
      emissiveIntensity={isSelected ? 0.2 : 0} 
      roughness={woodInfo.roughness} 
    />
  );

  const extrudeSettings = { depth: data.thickness, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.01, bevelThickness: 0.01 };
  return (
    <group 
        ref={meshRef}
        position={[data.x, 0, data.z]}
        rotation={[rotation[0], rotation[1], rotation[2]]} 
        onClick={(e) => {
            if (sawActive) return;
            e.stopPropagation(); 
            onSelect(data.id);
            onToggleDrag(data.id);
        }}
        onPointerOver={() => !sawActive && (document.body.style.cursor = isDragging ? 'grabbing' : 'grab')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
    >
        {isLog ? (
             <mesh rotation={[Math.PI/2, 0, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[data.thickness/2, data.thickness/2, bounds.d, 32]} />
                {Material}
                {isSelected && <Outlines thickness={0.05} color="orange" />}
             </mesh>
        ) : (
            <mesh rotation={[Math.PI/2, 0, 0]} position={[0, 0, 0]} castShadow receiveShadow>
                <extrudeGeometry args={[shape, extrudeSettings]} />
                {Material}
                {isSelected && <Outlines thickness={0.05} color="orange" />}
            </mesh>
        )}
        <DimensionLabels isSelected={isSelected} w={bounds.w} d={bounds.d} thickness={data.thickness} isLog={isLog} />
    </group>
  );
}

function LoadingFallback() {
  return <Html center><div className="text-stone-500 font-bold animate-pulse">Loading Assets...</div></Html>;
}

// --- MAIN COMPONENT ---
export default function LogConfigurator() {
  const [viewMode, setViewMode] = useState('studio'); 
  const [activeWoodType, setActiveWoodType] = useState('walnut');
  const [draggingId, setDraggingId] = useState(null);
  const [debugOpen, setDebugOpen] = useState(true);
  
  const initialPoints = [{x: -1, y: -2}, {x: 1, y: -2}, {x: 1, y: 2}, {x: -1, y: 2}];
  const [planks, setPlanks] = useState([{ id: 'master', points: initialPoints, thickness: 0.2, x: 0, z: 0, type: 'plank', rotation: [0, 0, 0], cutReadyAt: 0 }]);
  const [selectedId, setSelectedId] = useState(null);
  
  const [sawActive, setSawActive] = useState(false);
  const [sawPos, setSawPos] = useState({ x: 0, z: 0 });
  const [sawRotation, setSawRotation] = useState(0); 
  const [explosions, setExplosions] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [conversionRate, setConversionRate] = useState(1);
  const [lastCutSummary, setLastCutSummary] = useState({ cutCount: 0, cooldownSkips: 0, invalidSlices: 0, token: 0 });
  const [cutToken, setCutToken] = useState(0);

  const { darkMode } = useTheme();
  const woodPriceMult = WOOD_TYPES[activeWoodType].priceMult;
  const totalVolume = planks.reduce((acc, p) => acc + (2 * p.thickness), 0); 
  const price = Math.floor(totalVolume * 200 * woodPriceMult);

  useEffect(() => {
    const detectCurrency = async () => {
      try {
        const locale = navigator.language || 'en-US';
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        const localeCountry = locale.includes('-') ? locale.split('-')[1].toUpperCase() : '';
        const { currency: detectedCurrency, rate } = await getLocationCurrency({
          locale,
          timezone,
          countryCode: localeCountry,
        });

        if (detectedCurrency === 'INR' || detectedCurrency === 'USD') {
          setCurrency(detectedCurrency);
          const normalizedRate = Number(rate);
          setConversionRate(detectedCurrency === 'INR' && normalizedRate > 0 ? normalizedRate : 1);
          return;
        }
      } catch (error) {
        console.error('Configurator currency detection failed:', error);
      }

      setCurrency('USD');
      setConversionRate(1);
    };

    detectCurrency();
  }, []);

  const formatCurrency = (amount) => {
    const locale = currency === 'INR' ? 'en-IN' : 'en-US';
    const displayAmount = (Number(amount) || 0) * conversionRate;
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(displayAmount);
  };

  const activePlank = selectedId ? planks.find(p => p.id === selectedId) : planks[0];

  const selectedDebug = useMemo(() => {
    if (!activePlank) return null;
    const dx = Math.sin(sawRotation);
    const dy = Math.cos(sawRotation);
    const { x, z } = sawPos;
    const lineStart = { x: x - dx * 20, y: z - dy * 20 };
    const lineEnd = { x: x + dx * 20, y: z + dy * 20 };
    const l1 = { x: lineStart.x - activePlank.x, y: lineStart.y - activePlank.z };
    const l2 = { x: lineEnd.x - activePlank.x, y: lineEnd.y - activePlank.z };
    const localSaw = { x: x - activePlank.x, y: z - activePlank.z };
    const bounds = getBounds(activePlank.points);
    return {
      area: polygonArea(activePlank.points),
      intersections: countLinePolygonIntersections(activePlank.points, l1, l2),
      containsSaw: pointInPolygon(localSaw, activePlank.points),
      cutReady: (activePlank.cutReadyAt || 0) <= cutToken,
      cutReadyAt: activePlank.cutReadyAt || 0,
      currentToken: cutToken,
      width: bounds.w,
      length: bounds.d,
      thickness: activePlank.thickness,
    };
  }, [activePlank, sawPos, sawRotation, cutToken]);

  useEffect(() => {
    document.body.style.cursor = draggingId ? 'grabbing' : 'auto';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [draggingId]);

  const setProfile = (type) => {
    const targetId = selectedId || (planks.length > 0 ? planks[0].id : null);
    if(!targetId) return;

    setPlanks(prev => prev.map(p => {
        if (p.id !== targetId) return p;
        const newPoints = [{x: -1, y: -2}, {x: 1, y: -2}, {x: 1, y: 2}, {x: -1, y: 2}]; 
        const newThick = type === 'log' ? 1.0 : 0.2; 
        return { ...p, points: newPoints, thickness: newThick, type: type, rotation: [0,0,0] };
    }));
  };

  const applyPreset = (preset) => {
      const targetId = selectedId || (planks.length > 0 ? planks[0].id : null);
      if(!targetId) return;

      setPlanks(prev => prev.map(p => {
          if(p.id !== targetId) return p;
          const newThickness = preset.t / 10;
          const newWidth = preset.w / 12;
          const bounds = getBounds(p.points);
          const currentLength = bounds.d || 4.0; 
          const halfW = newWidth / 2;
          const halfL = currentLength / 2;
          const newPoints = [{x: -halfW, y: -halfL}, {x: halfW, y: -halfL}, {x: halfW, y: halfL}, {x: -halfW, y: halfL}];
          return { ...p, thickness: newThickness, points: newPoints, type: 'plank' };
      }));
  };

  const handleDimChange = (axis, newVal) => {
    const targetId = selectedId || (planks.length > 0 ? planks[0].id : null);
    if(!targetId) return;
    setPlanks(prev => prev.map(p => {
        if (p.id !== targetId) return p;
        const bounds = getBounds(p.points);
        if (axis === 'thickness') return { ...p, thickness: parseFloat(newVal) };
        let scaleX = 1, scaleY = 1;
        if (axis === 'width') scaleX = newVal / (bounds.w || 1);
        if (axis === 'length') scaleY = newVal / (bounds.d || 1);
        const newPoints = p.points.map(pt => ({ x: pt.x * scaleX, y: pt.y * scaleY }));
        return { ...p, points: newPoints };
    }));
  };

  const downloadCSV = () => {
      const headers = ["ID", "Type", "Length (ft)", "Width (in)", "Thickness (in)", "Board Feet"].join(",");
      const rows = planks.map((p, i) => {
          const bounds = getBounds(p.points);
          const l = (bounds.d * 2).toFixed(2);
          const w = (bounds.w * 12).toFixed(2);
          const t = (p.thickness * 10).toFixed(2);
          const bf = calculateBoardFeet(l, w, t).toFixed(2);
          const typeName = p.type === 'log' ? 'Round Log' : 'Plank/Slab';
          return [`Piece #${i+1}`, typeName, l, w, t, bf].join(",");
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
    const nextCutToken = cutToken + 1;
    setCutToken(nextCutToken);
    const { x, z } = sawPos;
    const dx = Math.sin(sawRotation);
    const dy = Math.cos(sawRotation);
    const lineStart = { x: x - dx * 20, y: z - dy * 20 };
    const lineEnd = { x: x + dx * 20, y: z + dy * 20 };
    const nx = -dy;
    const ny = dx;
    const nextPlanks = [];
    const newExplosions = [];
    let cutCount = 0;
    let cooldownSkips = 0;
    let invalidSlices = 0;

    for (const plank of planks) {
      if ((plank.cutReadyAt || 0) > nextCutToken) {
        nextPlanks.push(plank);
        cooldownSkips += 1;
        continue;
      }

      const localSaw = { x: x - plank.x, y: z - plank.z };
      const l1 = { x: lineStart.x - plank.x, y: lineStart.y - plank.z };
      const l2 = { x: lineEnd.x - plank.x, y: lineEnd.y - plank.z };
      const hits = countLinePolygonIntersections(plank.points, l1, l2);
      const containsSaw = pointInPolygon(localSaw, plank.points);

      if (hits < 2 && !containsSaw) {
        nextPlanks.push(plank);
        continue;
      }

      const result = slicePolygon(plank.points, l1, l2);
      if (!result) {
        nextPlanks.push(plank);
        invalidSlices += 1;
        continue;
      }

      const [poly1Points, poly2Points] = result;
      const normalized1 = normalizePolygon(poly1Points);
      const normalized2 = normalizePolygon(poly2Points);
      if (!normalized1 || !normalized2) {
        nextPlanks.push(plank);
        invalidSlices += 1;
        continue;
      }
      const c1 = getCentroid(normalized1);
      const c2 = getCentroid(normalized2);
      const newPoints1 = normalized1.map((p) => ({ x: p.x - c1.x, y: p.y - c1.y }));
      const newPoints2 = normalized2.map((p) => ({ x: p.x - c2.x, y: p.y - c2.y }));

      const vec1 = { x: c1.x - localSaw.x, y: c1.y - localSaw.y };
      const dir1 = (vec1.x * nx + vec1.y * ny) >= 0 ? 1 : -1;
      const splitSize = Math.max(getBounds(plank.points).w, getBounds(plank.points).d);
      const sep = clamp(0.12 + (plank.thickness * 0.9) + (splitSize * 0.08), 0.22, 0.85);
      const pushX = nx * sep * dir1;
      const pushY = ny * sep * dir1;
      const newType = plank.type === 'log' ? 'custom' : plank.type;

      const p1 = {
        ...plank,
        id: makePieceId(),
        points: newPoints1,
        x: plank.x + c1.x + pushX,
        z: plank.z + c1.y + pushY,
        type: newType,
        rotation: plank.rotation || [0, 0, 0],
        cutReadyAt: nextCutToken + 1,
      };
      const p2 = {
        ...plank,
        id: makePieceId(),
        points: newPoints2,
        x: plank.x + c2.x - pushX,
        z: plank.z + c2.y - pushY,
        type: newType,
        rotation: plank.rotation || [0, 0, 0],
        cutReadyAt: nextCutToken + 1,
      };

      nextPlanks.push(p1, p2);
      newExplosions.push({ id: Date.now() + cutCount, pos: [x, 0.5, z], color: WOOD_TYPES[activeWoodType].color });
      cutCount += 1;
    }

    if (cutCount === 0) {
      setLastCutSummary({ cutCount, cooldownSkips, invalidSlices, token: nextCutToken });
      setErrorMsg("Missed!");
      setTimeout(() => setErrorMsg(''), 1000);
      return;
    }

    setPlanks(nextPlanks);
    setExplosions((prev) => [...prev, ...newExplosions]);
    setLastCutSummary({ cutCount, cooldownSkips, invalidSlices, token: nextCutToken });
  };

  const currentBounds = activePlank ? getBounds(activePlank.points) : { w: 2, d: 4 };
  const currentLength = (currentBounds.d * 2) || 4; 
  const currentWidth = (currentBounds.w * 12) || 12; 
  const currentThick = (activePlank ? activePlank.thickness * 10 : 2); 

  return (
    <div className={`flex flex-col lg:flex-row h-[850px] rounded-3xl overflow-hidden shadow-2xl border transition-colors duration-500 ${darkMode ? 'bg-stone-900 border-stone-800' : 'bg-stone-100 border-stone-200'}`}>
      
      {/* LEFT: 3D VIEWPORT */}
      <div className={`relative flex-1 ${darkMode ? 'bg-stone-800' : 'bg-[#f0f0f0]'}`}>
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between pointer-events-none">
            <div className="flex gap-2 pointer-events-auto">
                <button onClick={() => setViewMode(m => m === 'truck' ? 'studio' : 'truck')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all ${viewMode === 'truck' ? 'bg-orange-600 text-white' : 'bg-white text-stone-800'}`}><Truck className="w-4 h-4" /> {viewMode === 'truck' ? 'Studio' : 'Truck'}</button>
            </div>
        </div>
        {errorMsg && <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-red-600 text-white px-4 py-2 rounded-full font-bold shadow-lg animate-bounce flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> {errorMsg}</div>}
        
        <Canvas
          shadows
          camera={{ position: [0, 10, 5], fov: 45 }}
          onPointerMissed={() => {
            if (draggingId) {
              setDraggingId(null);
            } else {
              setSelectedId(null);
            }
          }}
        >
          <ambientLight intensity={darkMode ? 0.4 : 0.8} />
          <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
          <pointLight position={[-10, 5, -10]} intensity={0.5} />
          <Suspense fallback={<LoadingFallback />}>
            <Center top={viewMode === 'studio'}> 
                <group>
                    <RCDrivingSaw active={sawActive} onUpdatePos={setSawPos} sawRotation={sawRotation} onClickToCut={attemptCut} />
                    {explosions.map(ex => <WoodExplosion key={ex.id} position={ex.pos} color={ex.color} />)}
                    <group>
                        {viewMode === 'truck' ? (
                            <IndianTruck>{planks.map(p => (
                                <HybridPlank 
                                    key={p.id} data={p} isSelected={selectedId === p.id} onSelect={setSelectedId} 
                                    isDragging={draggingId === p.id}
                                    onToggleDrag={(id) => setDraggingId((prev) => (prev === id ? null : id))}
                                    onUpdate={(id, pos) => setPlanks(prev => prev.map(pl => pl.id === id ? { ...pl, ...pos } : pl))}
                                    sawActive={sawActive} woodTypeKey={activeWoodType} 
                                />
                            ))}</IndianTruck>
                        ) : (
                            <><Floor />{planks.map(p => (
                                <HybridPlank 
                                    key={p.id} data={p} isSelected={selectedId === p.id} onSelect={setSelectedId} 
                                    isDragging={draggingId === p.id}
                                    onToggleDrag={(id) => setDraggingId((prev) => (prev === id ? null : id))}
                                    onUpdate={(id, pos) => setPlanks(prev => prev.map(pl => pl.id === id ? { ...pl, ...pos } : pl))}
                                    sawActive={sawActive} woodTypeKey={activeWoodType} 
                                />
                            ))}</>
                        )}
                    </group>
                </group>
            </Center>
          </Suspense>
          <Grid position={[0, -2, 0]} args={[20, 20]} cellSize={0.5} cellThickness={0.5} cellColor={darkMode ? "#444" : "#ccc"} sectionSize={3} fadeDistance={30} infiniteGrid />
          <OrbitControls makeDefault enabled={!sawActive && !draggingId} minPolarAngle={0} maxPolarAngle={Math.PI / 2.1} target={[0, 0, 0]} />
        </Canvas>
      </div>

      {/* RIGHT: CONTROLS (SCROLLABLE) */}
      <div className={`w-full lg:w-96 flex flex-col border-l overflow-hidden ${darkMode ? 'bg-stone-900 border-stone-800 text-white' : 'bg-white border-stone-200'}`}>
        
        {/* FIXED Header */}
        <div className="p-6 border-b flex-shrink-0">
            <h3 className="text-2xl font-serif mb-1">{selectedId ? "Edit Piece" : "Master Log"}</h3>
            <p className={`text-sm ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>{selectedId ? "Drag to move. Drive saw to cut." : "Define main dimensions. We mill to order."}</p>
        </div>

        {/* SCROLLABLE Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            {/* Material */}
            <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2 block flex items-center gap-2"><Palette className="w-3 h-3"/> Material Select</label>
                <div className="grid grid-cols-5 gap-2">
                    {Object.entries(WOOD_TYPES).map(([key, info]) => (
                        <button key={key} onClick={() => setActiveWoodType(key)} className={`aspect-square rounded-lg border-2 transition-all relative group ${activeWoodType === key ? 'border-orange-500 scale-110 shadow-md' : 'border-transparent hover:scale-105'}`} style={{ backgroundColor: info.color }}>
                            {activeWoodType === key && <div className="absolute inset-0 flex items-center justify-center text-white/50"><TreePine className="w-4 h-4" /></div>}
                        </button>
                    ))}
                </div>
            </div>

            {/* Dimensions */}
            <div>
                 <label className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2 block flex items-center gap-2"><Box className="w-3 h-3"/> Dimensions</label>
                 <div className="space-y-4">
                    <div className="space-y-1"><div className="flex justify-between text-xs"><span className="text-stone-500">Length</span><span className="font-mono">{currentLength.toFixed(1)}&apos;</span></div><input type="range" min="1.0" max="10.0" step="0.1" value={currentLength} onChange={(e) => handleDimChange('length', e.target.value / 2)} className="w-full accent-orange-600 h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer" /></div>
                    <div className="space-y-1"><div className="flex justify-between text-xs"><span className="text-stone-500">Width</span><span className="font-mono">{currentWidth.toFixed(1)}&quot;</span></div><input type="range" min="1.0" max="40.0" step="0.5" value={currentWidth} onChange={(e) => handleDimChange('width', e.target.value / 12)} className="w-full accent-orange-600 h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer" /></div>
                    <div className="space-y-1"><div className="flex justify-between text-xs"><span className="text-stone-500">{activePlank?.type === 'log' ? 'Diameter' : 'Thickness'}</span><span className="font-mono">{currentThick.toFixed(1)}&quot;</span></div><input type="range" min="0.5" max="20.0" step="0.5" value={currentThick} onChange={(e) => handleDimChange('thickness', e.target.value / 10)} className="w-full accent-orange-600 h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer" /></div>
                 </div>
            </div>

            {/* Shape Presets */}
            <div>
                 <label className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2 block flex items-center gap-2"><Box className="w-3 h-3"/> Shape Presets</label>
                 <div className="flex gap-2 mb-3">
                    <button onClick={() => setProfile('plank')} className={`flex-1 py-2 flex items-center justify-center gap-2 rounded-lg text-xs font-bold border-2 transition-all ${(!activePlank || activePlank.type !== 'log') ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-transparent bg-stone-100 text-stone-500 dark:bg-stone-800'}`}><Square className="w-4 h-4" /> Plank</button>
                    <button onClick={() => setProfile('log')} className={`flex-1 py-2 flex items-center justify-center gap-2 rounded-lg text-xs font-bold border-2 transition-all ${(activePlank && activePlank.type === 'log') ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-transparent bg-stone-100 text-stone-500 dark:bg-stone-800'}`}><CylinderIcon className="w-4 h-4" /> Round Log</button>
                 </div>
                 {(!activePlank || activePlank.type !== 'log') && (
                     <div className="grid grid-cols-3 gap-2 mt-2">
                        {STANDARD_SIZES.map(s => (
                            <button key={s.label} onClick={() => applyPreset(s)} className={`py-1 px-2 rounded border text-xs font-mono transition-colors ${darkMode ? 'border-stone-700 hover:bg-stone-800 text-white' : 'border-stone-200 hover:bg-stone-100 text-stone-800'}`}>{s.label}</button>
                        ))}
                     </div>
                 )}
            </div>

            {/* Saw Control */}
            <div>
                 <label className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2 block flex items-center gap-2"><Scissors className="w-3 h-3"/> Saw Control</label>
                 <div className={`p-4 rounded-xl border-2 transition-all flex flex-col gap-4 ${sawActive ? 'border-orange-500 bg-orange-900/20' : (darkMode ? 'border-stone-700 bg-stone-800' : 'border-stone-100 bg-stone-50')}`}>
                    <div className="flex justify-between items-center">
                        <span className="font-bold flex items-center gap-2"><Navigation className={`w-4 h-4 ${sawActive ? 'animate-pulse' : ''}`} /> Power Saw</span>
                        <button onClick={() => { setSawActive(!sawActive); setSelectedId(null); setDraggingId(null); }} className={`text-xs font-bold px-3 py-1 rounded-full border ${sawActive ? 'bg-orange-600 text-white' : (darkMode ? 'bg-stone-700 text-white' : 'bg-white text-stone-500')}`}>{sawActive ? 'STOP' : 'START'}</button>
                    </div>
                    {sawActive && (
                        <div className="space-y-2 animate-in fade-in">
                            <div className="flex justify-between text-xs font-bold"><span className="flex items-center gap-1"><RotateCw className="w-3 h-3"/> Blade Angle</span><span className="font-mono">{(sawRotation * 180 / Math.PI).toFixed(0)}°</span></div>
                            <input type="range" min="-1.57" max="1.57" step="0.1" value={sawRotation} onChange={(e) => setSawRotation(parseFloat(e.target.value))} className="w-full accent-orange-600 h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer" />
                        </div>
                    )}
                 </div>
            </div>

            {/* Cut Debug */}
            <div className={`rounded-xl border ${darkMode ? 'border-stone-700 bg-stone-800' : 'border-stone-200 bg-stone-50'}`}>
                <button
                  onClick={() => setDebugOpen((prev) => !prev)}
                  className="w-full p-3 text-left text-xs font-bold uppercase tracking-wider text-stone-500"
                >
                  Cut Debug {debugOpen ? 'Hide' : 'Show'}
                </button>
                {debugOpen && (
                  <div className="px-3 pb-3 space-y-1 text-xs font-mono">
                    {selectedDebug ? (
                      <>
                        <div>Area: {selectedDebug.area.toFixed(4)}</div>
                        <div>Intersections: {selectedDebug.intersections}</div>
                        <div>Contains Saw: {selectedDebug.containsSaw ? 'yes' : 'no'}</div>
                        <div>Cut Ready: {selectedDebug.cutReady ? 'yes' : 'no'}</div>
                        <div>Token: {selectedDebug.currentToken} / ReadyAt: {selectedDebug.cutReadyAt}</div>
                        <div>W,L,T: {selectedDebug.width.toFixed(3)}, {selectedDebug.length.toFixed(3)}, {selectedDebug.thickness.toFixed(3)}</div>
                      </>
                    ) : (
                      <div>No active piece</div>
                    )}
                    <div className="pt-2 border-t border-stone-300/40 dark:border-stone-600/50">
                      LastCut: count={lastCutSummary.cutCount} cooldownSkips={lastCutSummary.cooldownSkips} invalid={lastCutSummary.invalidSlices} token={lastCutSummary.token}
                    </div>
                  </div>
                )}
            </div>

            {/* Cut List & CSV */}
            <div className={`rounded-xl border overflow-hidden flex flex-col ${darkMode ? 'border-stone-700 bg-stone-800' : 'border-stone-200 bg-stone-100'}`}>
                <div className={`flex justify-between items-center p-3 border-b ${darkMode ? 'border-stone-700 bg-stone-800' : 'border-stone-200 bg-stone-100'}`}>
                    <div className="flex items-center gap-2"><Table2 className="w-4 h-4 text-stone-500"/><span className="text-xs font-bold uppercase tracking-wider">Cut List ({planks.length})</span></div>
                    {/* FIXED CSV BUTTON */}
                    <button onClick={downloadCSV} className="text-[10px] font-bold bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 flex items-center gap-1 shadow-md transition-all active:scale-95"><Download className="w-3 h-3"/> Export CSV</button>
                </div>
                <div className="max-h-48 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {planks.map((p, i) => {
                        return (
                            <div key={p.id} onClick={() => setSelectedId(p.id)} className={`grid grid-cols-2 gap-2 p-2 rounded text-xs cursor-pointer items-center border transition-all ${selectedId === p.id ? 'bg-orange-600 text-white border-orange-600' : (darkMode ? 'bg-stone-900 border-stone-700 hover:border-stone-500' : 'bg-white border-stone-200 hover:border-orange-300')}`}>
                                <span className="font-bold flex items-center gap-1 col-span-1">{selectedId === p.id && <MousePointer2 className="w-3 h-3"/>} #{i+1}</span>
                                <span className="col-span-1 opacity-70 italic text-right">{p.type === 'log' ? 'Round Log' : (p.points.length > 4 ? 'Custom Slab' : 'Plank')}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            <button onClick={() => { setPlanks([{ id: 'master', points: [{x:-1,y:-2},{x:1,y:-2},{x:1,y:2},{x:-1,y:2}], thickness: 0.2, x: 0, z: 0, type: 'plank', rotation: [0,0,0], cutReadyAt: 0 }]); setExplosions([]); setSelectedId(null); setDraggingId(null); }} className={`w-full py-3 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all ${darkMode ? 'border-stone-700 text-stone-400 hover:bg-stone-800' : 'border-stone-200 text-stone-600 hover:bg-stone-100'}`}><RefreshCw className="w-4 h-4"/> Reset All</button>
        </div>

        {/* FIXED Footer */}
        <div className={`p-6 border-t flex-shrink-0 ${darkMode ? 'border-stone-700 bg-stone-900' : 'border-stone-100 bg-white'}`}>
            <div className="flex justify-between items-end mb-4"><span className="text-stone-500 text-sm">Est. Price ({WOOD_TYPES[activeWoodType].name})</span><span className="text-4xl font-serif">{formatCurrency(price)}</span></div>
            <button className={`w-full py-4 rounded-xl font-bold transition transform active:scale-95 shadow-lg ${darkMode ? 'bg-white text-black hover:bg-stone-200' : 'bg-stone-900 text-white hover:bg-black'}`}>Request Custom Quote</button>
        </div>
      </div>
    </div>
  );
}
