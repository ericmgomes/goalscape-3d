import { Line, OrbitControls, PerspectiveCamera, Stars, Text } from '@react-three/drei';
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { GoalGraph, PositionedGoalNode } from '../models/graph';
import { nodePositionMap } from '../utils/graphLookups';
import { layoutGraph } from '../utils/layoutGraph';

type GoalGraphSceneProps = {
  graph: GoalGraph;
  layoutGraphSource?: GoalGraph;
  selectedNodeId?: string;
  focusNodeId?: string;
  expandedNodeIds: Set<string>;
  initialCameraState?: CameraState;
  onSelectNode: (node: PositionedGoalNode) => void;
  onNodeContextMenu: (node: PositionedGoalNode, point: { x: number; y: number }) => void;
  onHoverNode: (node?: PositionedGoalNode) => void;
  onCameraStateChange?: (state: CameraState) => void;
};

export type GoalGraphSceneHandle = {
  resetFocus: () => void;
  focusNode: (nodeId: string) => void;
};

export type CameraState = {
  position: [number, number, number];
  target: [number, number, number];
};

export const GoalGraphScene = forwardRef<GoalGraphSceneHandle, GoalGraphSceneProps>(function GoalGraphScene(props, ref) {
  return (
    <Canvas className="graph-canvas" dpr={[1, 2]}>
      <color attach="background" args={['#05070d']} />
      <fog attach="fog" args={['#05070d', 70, 165]} />
      <PerspectiveCamera makeDefault position={[0, 18, 72]} fov={50} />
      <ambientLight intensity={0.65} />
      <pointLight position={[20, 30, 20]} intensity={18} color="#7dd3fc" />
      <pointLight position={[-30, -10, -20]} intensity={8} color="#f0abfc" />
      <Stars radius={135} depth={70} count={2200} factor={3.2} saturation={0.12} fade speed={0.28} />
      <GraphObjects {...props} ref={ref} />
      <OrbitControls enableDamping dampingFactor={0.08} enableRotate enablePan enableZoom makeDefault />
    </Canvas>
  );
});

const GraphObjects = forwardRef<GoalGraphSceneHandle, GoalGraphSceneProps>(function GraphObjects({
  graph,
  layoutGraphSource,
  selectedNodeId,
  focusNodeId,
  expandedNodeIds,
  initialCameraState,
  onSelectNode,
  onNodeContextMenu,
  onHoverNode,
  onCameraStateChange
}: GoalGraphSceneProps, ref) {
  const layout = useMemo(() => layoutGraph(layoutGraphSource ?? graph), [graph, layoutGraphSource]);
  const visibleNodeIds = useMemo(() => new Set(graph.nodes.map((node) => node.id)), [graph.nodes]);
  const renderedNodes = useMemo(
    () => layout.nodes.filter((node) => visibleNodeIds.has(node.id)),
    [layout.nodes, visibleNodeIds]
  );
  const positions = useMemo(() => nodePositionMap(layout.nodes), [layout.nodes]);
  const controls = useThree(
    (state) =>
      state.controls as unknown as
        | {
            target: THREE.Vector3;
            update: () => void;
            addEventListener: (event: 'start' | 'end', callback: () => void) => void;
            removeEventListener: (event: 'start' | 'end', callback: () => void) => void;
          }
        | undefined
  );
  const camera = useThree((state) => state.camera);
  const focusTarget = useRef<{
    target: THREE.Vector3;
    cameraPosition: THREE.Vector3;
    progress: number;
  } | null>(null);
  const lastFocusNodeId = useRef<string | undefined>(undefined);
  const isProgrammaticCameraMove = useRef(false);
  const didApplyInitialCameraState = useRef(false);

  useImperativeHandle(ref, () => ({
    resetFocus() {
      const nodeId = focusNodeId ?? selectedNodeId;
      focusCameraOnNode(nodeId);
    },
    focusNode(nodeId: string) {
      focusCameraOnNode(nodeId);
    }
  }));

  function focusCameraOnNode(nodeId?: string) {
      const focusedNode = nodeId ? positions.get(nodeId) : undefined;

      if (!focusedNode) {
        return;
      }

      focusTarget.current = makeCameraTransition(focusedNode, camera, controls);
      lastFocusNodeId.current = nodeId;
  }

  useFrame((_state, delta) => {
    if (focusNodeId && focusNodeId !== lastFocusNodeId.current) {
      const focusedNode = positions.get(focusNodeId);

      if (focusedNode) {
        focusTarget.current = makeCameraTransition(focusedNode, camera, controls);
        lastFocusNodeId.current = focusNodeId;
      }
    }

    if (!focusTarget.current || !controls) {
      return;
    }

    focusTarget.current.progress = Math.min(1, focusTarget.current.progress + delta / 2.15);
    const eased = easeInOutCubic(focusTarget.current.progress);

    isProgrammaticCameraMove.current = true;
    controls.target.lerp(focusTarget.current.target, eased * 0.07);
    camera.position.lerp(focusTarget.current.cameraPosition, eased * 0.06);
    controls.update();
    isProgrammaticCameraMove.current = false;

    if (
      focusTarget.current.progress >= 1 &&
      controls.target.distanceTo(focusTarget.current.target) < 0.12 &&
      camera.position.distanceTo(focusTarget.current.cameraPosition) < 0.2
    ) {
      focusTarget.current = null;
    }
  });

  useEffect(() => {
    if (!controls) {
      return;
    }

    const cancelFocusTransition = () => {
      if (!isProgrammaticCameraMove.current) {
        focusTarget.current = null;
      }
    };
    const saveCameraState = () => {
      onCameraStateChange?.({
        position: vectorToTuple(camera.position),
        target: vectorToTuple(controls.target)
      });
    };

    controls.addEventListener('start', cancelFocusTransition);
    controls.addEventListener('end', saveCameraState);

    return () => {
      controls.removeEventListener('start', cancelFocusTransition);
      controls.removeEventListener('end', saveCameraState);
    };
  }, [camera.position, controls, onCameraStateChange]);

  useEffect(() => {
    if (!controls || !initialCameraState || didApplyInitialCameraState.current) {
      return;
    }

    camera.position.set(...initialCameraState.position);
    controls.target.set(...initialCameraState.target);
    controls.update();
    didApplyInitialCameraState.current = true;
  }, [camera.position, controls, initialCameraState]);

  function handleDoubleClick(node: PositionedGoalNode) {
    const target = new THREE.Vector3(node.x, node.y, node.z);
    const cameraOffset = new THREE.Vector3(0, 8, 24);
    focusTarget.current = {
      target,
      cameraPosition: target.clone().add(cameraOffset),
      progress: 0
    };
    lastFocusNodeId.current = node.id;
  }

  return (
    <group>
      {graph.edges.map((edge) => {
        const source = positions.get(edge.source);
        const target = positions.get(edge.target);

        if (!source || !target) {
          return null;
        }

        return (
          <Line
            key={`${edge.source}-${edge.target}`}
            points={[
              [source.x, source.y, source.z],
              [target.x, target.y, target.z]
            ]}
            color="#7890a8"
            transparent
            opacity={0.32}
            lineWidth={1}
          />
        );
      })}

      {renderedNodes.map((node) => (
        <GoalSphere
          key={node.id}
          node={node}
          selected={node.id === selectedNodeId}
          expandable={graph.nodes.some((candidate) => candidate.parentId === node.id)}
          expanded={expandedNodeIds.has(node.id)}
          onClick={onSelectNode}
          onContextMenu={onNodeContextMenu}
          onDoubleClick={handleDoubleClick}
          onHover={onHoverNode}
        />
      ))}
    </group>
  );
});

function easeInOutCubic(value: number): number {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3);
}

function vectorToTuple(vector: THREE.Vector3): [number, number, number] {
  return [vector.x, vector.y, vector.z];
}

type GoalSphereProps = {
  node: PositionedGoalNode;
  selected: boolean;
  expandable: boolean;
  expanded: boolean;
  onClick: (node: PositionedGoalNode) => void;
  onContextMenu: (node: PositionedGoalNode, point: { x: number; y: number }) => void;
  onDoubleClick: (node: PositionedGoalNode) => void;
  onHover: (node?: PositionedGoalNode) => void;
};

function GoalSphere({ node, selected, expandable, expanded, onClick, onContextMenu, onDoubleClick, onHover }: GoalSphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const labelRef = useRef<THREE.Object3D>(null);
  const revealProgress = useRef(0);
  const camera = useThree((state) => state.camera);
  const cameraWorldQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const parentWorldQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const inverseParentWorldQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const cameraWorldPosition = useMemo(() => new THREE.Vector3(), []);
  const labelWorldPosition = useMemo(() => new THREE.Vector3(), []);
  const labelLocalPosition = useMemo(() => new THREE.Vector3(), []);
  const level = node.level ?? 0;
  const size = sphereRadius(node);
  const color = nodeBlue(node);

  useFrame(({ clock }) => {
    if (!meshRef.current) {
      return;
    }

    const pulse = selected ? 1 + Math.sin(clock.elapsedTime * 2.1) * 0.025 : 1;
    revealProgress.current = Math.min(1, revealProgress.current + 0.075);
    const reveal = easeOutCubic(revealProgress.current);
    meshRef.current.scale.setScalar(pulse * (0.72 + reveal * 0.28));

    if (labelRef.current?.parent) {
      camera.getWorldQuaternion(cameraWorldQuaternion);
      labelRef.current.parent.getWorldQuaternion(parentWorldQuaternion);
      inverseParentWorldQuaternion.copy(parentWorldQuaternion).invert();
      labelRef.current.quaternion.copy(inverseParentWorldQuaternion.multiply(cameraWorldQuaternion));

      camera.getWorldPosition(cameraWorldPosition);
      labelRef.current.parent.getWorldPosition(labelWorldPosition);
      labelWorldPosition.lerp(cameraWorldPosition, 0.04);
      labelRef.current.parent.worldToLocal(labelLocalPosition.copy(labelWorldPosition));
      labelRef.current.position.copy(labelLocalPosition);
      labelRef.current.renderOrder = 1000;

      const labelMesh = labelRef.current as THREE.Mesh;
      const materials = Array.isArray(labelMesh.material) ? labelMesh.material : [labelMesh.material];
      materials.forEach((material) => {
        if (material) {
          material.depthTest = false;
          material.depthWrite = false;
          material.needsUpdate = true;
        }
      });
    }
  });

  function stop(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
  }

  return (
    <group position={[node.x, node.y, node.z]}>
      <mesh
        ref={meshRef}
        onClick={(event) => {
          stop(event);
          onClick(node);
        }}
        onDoubleClick={(event) => {
          stop(event);
          onDoubleClick(node);
        }}
        onContextMenu={(event) => {
          stop(event);
          onContextMenu(node, {
            x: event.nativeEvent.clientX,
            y: event.nativeEvent.clientY
          });
        }}
        onPointerEnter={(event) => {
          stop(event);
          document.body.style.cursor = 'pointer';
          onHover(node);
        }}
        onPointerLeave={() => {
          document.body.style.cursor = 'default';
          onHover(undefined);
        }}
      >
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={selected ? 0.82 : nodeEmissiveIntensity(level)}
          roughness={0.38}
          metalness={0.08}
        />
      </mesh>
      {selected ? (
        <mesh>
          <sphereGeometry args={[size * 1.35, 32, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.12} depthWrite={false} />
        </mesh>
      ) : null}
      {expandable ? (
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[size * 1.12, 0.035, 8, 48]} />
          <meshBasicMaterial color={expanded ? '#7dd3fc' : '#94a3b8'} transparent opacity={0.72} />
        </mesh>
      ) : null}
      <Text
        ref={labelRef}
        position={[0, 0, size + 0.5]}
        fontSize={Math.max(0.34, size * 0.2)}
        color={level <= 1 ? '#061a2c' : '#e0f2fe'}
        anchorX="center"
        anchorY="middle"
        textAlign="center"
        maxWidth={size * 1.42}
        outlineWidth={level === 0 ? 0 : 0.018}
        outlineColor="#05070d"
      >
        {node.title}
      </Text>
    </group>
  );
}

function makeCameraTransition(
  focusedNode: PositionedGoalNode,
  camera: THREE.Camera,
  controls?: { target: THREE.Vector3; update: () => void }
) {
  const target = new THREE.Vector3(focusedNode.x, focusedNode.y, focusedNode.z);
  const cameraDirection = camera.position.clone().sub(controls?.target ?? new THREE.Vector3()).normalize();
  const fallbackDirection = new THREE.Vector3(0.35, 0.22, 1).normalize();
  const direction = cameraDirection.lengthSq() > 0.01 ? cameraDirection : fallbackDirection;

  return {
    target,
    cameraPosition: target.clone().add(direction.multiplyScalar(42)),
    progress: 0
  };
}

function nodeBlue(node: PositionedGoalNode): string {
  const level = node.level ?? 0;
  const importance = typeof node.size === 'number' ? Math.min(1, Math.max(0, node.size)) : 0.18;
  const baseLightnessByLevel = [93, 71, 46, 28, 17, 10, 7];
  const baseLightness = baseLightnessByLevel[Math.min(level, baseLightnessByLevel.length - 1)];
  const importanceLift = importance * (level <= 1 ? 6 : 3.5);
  const lightness = Math.max(6, Math.min(94, baseLightness + importanceLift));
  const saturation = Math.max(78, Math.min(98, 86 + importance * 10));
  const color = new THREE.Color();

  color.setHSL(200 / 360, saturation / 100, lightness / 100);
  return `#${color.getHexString()}`;
}

function nodeEmissiveIntensity(level: number): number {
  return Math.max(0.08, 0.3 - level * 0.035);
}

function sphereRadius(node: PositionedGoalNode): number {
  const level = node.level ?? 0;
  const normalizedImportance = typeof node.size === 'number' ? Math.min(1, Math.max(0.02, node.size)) : 0.42;
  const parentEquivalentRadius = level === 0 ? 3.55 : 3.35;
  const depthReduction = level * 0.06;

  return Math.max(0.72, Math.min(4.35, Math.sqrt(normalizedImportance) * parentEquivalentRadius - depthReduction));
}
