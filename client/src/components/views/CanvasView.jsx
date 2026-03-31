import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Position,
    Handle
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion } from 'framer-motion';
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '../../utils/constants';
import Avatar from '../ui/Avatar';
import { cn } from '../../utils/helpers';
import toast from 'react-hot-toast';

// Custom Node for a Task
const TaskNode = React.memo(({ data, id }) => {
    const priorityColor = PRIORITY_OPTIONS.find(p => p.value === data.priority)?.color || '#94a3b8';
    
    return (
        <div 
            className="group relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl w-[260px] cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-indigo-500 transition-all overflow-hidden" 
            onDoubleClick={data.onDoubleClick}
        >
            <div className="absolute top-0 left-0 bottom-0 w-1.5" style={{ backgroundColor: priorityColor }} />
            
            <div className="p-3 pl-4 pt-4">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 break-words leading-tight">{data.title}</p>
                <div className="flex items-center gap-1.5 mt-3">
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400">
                        {STATUS_OPTIONS.find(s => s.value === data.status)?.label || data.status}
                    </span>
                    <div className="flex-1" />
                    {data.assignee && (
                    <div title={data.assignee.name}>
                        <Avatar user={data.assignee} size="xs" />
                    </div>
                    )}
                </div>
            </div>

            <Handle type="target" position={Position.Left} className="w-2 h-4 rounded !bg-slate-300 dark:!bg-slate-600 !border-0" />
            <Handle type="source" position={Position.Right} className="w-2 h-4 rounded !bg-indigo-400 !border-0" />
        </div>
    );
});

const nodeTypes = {
    TaskNode: TaskNode,
};

const StorageKey = (projectId) => `v1:tm:canvas:coords:${projectId}`;

const CanvasView = ({ tasks = [], onFocusChange, projectId }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [isRestored, setIsRestored] = useState(false);

    // Initial load & map
    useEffect(() => {
        if (!projectId) return;
        
        const savedCoords = JSON.parse(localStorage.getItem(StorageKey(projectId)) || '{}');
        
        // Build Nodes
        const initialNodes = tasks.map((t, idx) => {
            // Restore saved coord or place in a staggering grid
            const saved = savedCoords[t.id];
            const x = saved?.x ?? (100 + (idx % 4) * 300);
            const y = saved?.y ?? (100 + Math.floor(idx / 4) * 150);
            
            return {
                id: t.id,
                type: 'TaskNode',
                position: { x, y },
                data: {
                    title: t.title,
                    priority: t.priority,
                    status: t.status,
                    assignee: t.assignee,
                    onDoubleClick: () => onFocusChange(t)
                }
            };
        });
        
        // Build Edges
        const initialEdges = [];
        tasks.forEach(t => {
            if (t.blockedBy && Array.isArray(t.blockedBy)) {
                t.blockedBy.forEach(b => {
                    initialEdges.push({
                        id: `e-${b.blockingTaskId}-${t.id}`,
                        source: b.blockingTaskId,
                        target: t.id,
                        animated: true,
                        style: { stroke: '#6366f1', strokeWidth: 2 }
                    });
                });
            }
        });

        setNodes(initialNodes);
        setEdges(initialEdges);
        setIsRestored(true);
    }, [tasks, projectId]);

    // Save on drag end or node move
    const handleNodeDragStop = useCallback((e, node) => {
        const savedCoords = JSON.parse(localStorage.getItem(StorageKey(projectId)) || '{}');
        savedCoords[node.id] = { x: node.position.x, y: node.position.y };
        localStorage.setItem(StorageKey(projectId), JSON.stringify(savedCoords));
    }, [projectId]);

    const handleConnect = useCallback((params) => {
        toast.error('Dependencies must be added in the Task Details panel for now.');
    }, [setEdges]);

    return (
        <div className="w-full h-full bg-slate-50 dark:bg-[#0f1117] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner relative overflow-hidden">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeDragStop={handleNodeDragStop}
                onConnect={handleConnect}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.2}
                maxZoom={2}
                defaultEdgeOptions={{ type: 'smoothstep' }}
            >
                <Background color="#64748b" gap={20} size={1} variant="dots" className="opacity-20 dark:opacity-30" />
                <Controls className="fill-slate-400 !border-slate-200 dark:!border-slate-700 bg-white dark:bg-slate-800" />
            </ReactFlow>

            <div className="absolute top-4 left-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg !z-50 pointer-events-none">
                <span className="text-xs font-bold text-slate-500">
                    Double-click task to open. Drag to organize.
                </span>
            </div>
        </div>
    );
};

export default CanvasView;
