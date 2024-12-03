'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactFlow, { 
  Node, 
  Edge,
  Controls,
  Background,
  MarkerType,
  NodeChange,
  EdgeChange,
  Connection,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
} from 'reactflow';
import { X } from 'lucide-react';
import 'reactflow/dist/style.css';
import { toPng } from 'html-to-image';

interface SchemaViewerProps {
  schema: {
    sql: string;
  };
  onSchemaChange?: (newSql: string) => void;
}

const nodeColors = {
  primary: {
    light: '#3b82f6',
    dark: '#60a5fa'
  },
  secondary: {
    light: '#8b5cf6',
    dark: '#a78bfa'
  },
  success: {
    light: '#10b981',
    dark: '#34d399'
  },
  warning: {
    light: '#f59e0b',
    dark: '#fbbf24'
  },
  error: {
    light: '#ef4444',
    dark: '#f87171'
  }
};

const nodeDefaults = {
  style: {
    padding: 20,
    borderRadius: 8,
    width: 'auto',
    minWidth: '200px',
  },
};

interface TableNodeProps {
  tableName: string;
  fields: string[];
  color: string;
  isDark?: boolean;
}

const TableNode: React.FC<TableNodeProps> = ({ tableName, fields, color, isDark = false }) => (
  <div className={`w-full ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
    <div className={`font-bold text-lg mb-3 pb-2 border-b whitespace-nowrap ${isDark ? 'border-slate-600' : 'border-slate-200'}`} style={{ color }}>
      {tableName}
    </div>
    <div className="text-sm text-left space-y-1">
      {fields.map((field, idx) => (
        <div key={idx} className={`whitespace-nowrap ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          {field}
        </div>
      ))}
    </div>
  </div>
);

interface ForeignKey {
  sourceField: string;
  targetTable: string;
  targetField: string;
}

interface TableInfo {
  fields: string[];
  foreignKeys: ForeignKey[];
}

export default function SchemaViewer({ schema, onSchemaChange }: SchemaViewerProps) {
  return (
    <div className="h-full w-full">
      <ReactFlowProvider>
        <SchemaViewerInner schema={schema} onSchemaChange={onSchemaChange} />
      </ReactFlowProvider>
    </div>
  );
}

function SchemaViewerInner({ schema, onSchemaChange }: SchemaViewerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = React.useState<Node | null>(null);
  const [isDark, setIsDark] = React.useState(false);
  const [initialSetup, setInitialSetup] = React.useState(true);
  const [isUpdatingFromSQL, setIsUpdatingFromSQL] = React.useState(false);
  const [isNodeMoving, setIsNodeMoving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const nodePositionRef = useRef<{ [key: string]: { x: number; y: number } }>({});
  const moveTimeoutRef = useRef<NodeJS.Timeout>();
  const prevSqlRef = React.useRef(schema?.sql);
  const reactFlowRef = useRef<HTMLDivElement>(null);

  const generateEdgeId = React.useCallback((source: string, sourceField: string, target: string, targetField: string) => {
    const [firstTable, firstField, secondTable, secondField] = [source, sourceField, target, targetField]
      .map(s => s.toLowerCase());
    return `${firstTable}-${firstField}-${secondTable}-${secondField}`;
  }, []);

  const parseSchema = React.useCallback(() => {
    if (!schema?.sql) return;
    if (prevSqlRef.current === schema.sql && !initialSetup) return;
    if (isNodeMoving) return;
    
    setIsUpdatingFromSQL(true);
    prevSqlRef.current = schema.sql;
    
    const tableMatches = schema.sql.match(/CREATE TABLE ["`]?(\w+)["`]?\s*\(([\s\S]+?)\);/g) || [];
    const parsedNodes: Node[] = [];
    const parsedEdges: Edge[] = [];
    const tables = new Map<string, TableInfo>();

    tableMatches.forEach((tableMatch, index) => {
      const tableNameMatch = tableMatch.match(/CREATE TABLE ["`]?(\w+)["`]?/);
      if (!tableNameMatch) return;
      
      const tableName = tableNameMatch[1];
      const fieldsMatch = tableMatch.match(/\(([\s\S]+)\)/);
      if (!fieldsMatch) return;
      
      const fields = fieldsMatch[1]
        .split(',')
        .map(field => field.trim())
        .filter(field => field);
      
      tables.set(tableName, { fields, foreignKeys: [] });
      
      // Check for inline REFERENCES in field definitions
      fields.forEach(field => {
        const inlineRefMatch = field.match(/(\w+).*\s+REFERENCES\s+["`]?(\w+)["`]?/i);
        if (inlineRefMatch) {
          const [, sourceField, targetTable] = inlineRefMatch;
          tables.get(tableName)?.foreignKeys.push({
            sourceField: sourceField.trim(),
            targetTable: targetTable.trim(),
            targetField: 'id'
          });
        }
      });
      
      // Also check for explicit FOREIGN KEY syntax
      const foreignKeyRegex = /FOREIGN KEY\s*\(\s*["`]?(\w+)["`]?\s*\)\s*REFERENCES\s*["`]?(\w+)["`]?\s*\(\s*["`]?(\w+)["`]?\s*\)/gi;
      let fkMatch;
      while ((fkMatch = foreignKeyRegex.exec(fieldsMatch[1])) !== null) {
        const [, sourceField, targetTable, targetField] = fkMatch;
        tables.get(tableName)?.foreignKeys.push({
          sourceField: sourceField.trim(),
          targetTable: targetTable.trim(),
          targetField: targetField.trim()
        });
      }

      const colorKeys = Object.keys(nodeColors);
      const colorKey = colorKeys[index % colorKeys.length];
      const color = isDark ? nodeColors[colorKey as keyof typeof nodeColors].dark : nodeColors[colorKey as keyof typeof nodeColors].light;
      
      const existingNode = nodes.find(n => n.id === tableName);
      const position = existingNode ? existingNode.position : {
        x: 300 * (index % 3),
        y: 250 * Math.floor(index / 3)
      };

      parsedNodes.push({
        id: tableName,
        type: 'default',
        position,
        data: { 
          label: <TableNode tableName={tableName} fields={fields} color={color} isDark={isDark} />,
          fields,
        },
        style: {
          ...nodeDefaults.style,
          border: `2px solid ${color}`,
          background: `${color}10`,
        },
      });
    });

    tables.forEach((tableInfo, tableName) => {
      tableInfo.foreignKeys.forEach((fk) => {
        const sourceNode = parsedNodes.find(node => node.id === tableName);
        const targetNode = parsedNodes.find(node => node.id === fk.targetTable);
        
        if (sourceNode && targetNode) {
          const color = isDark ? nodeColors.primary.dark : nodeColors.primary.light;
          const edgeId = generateEdgeId(tableName, fk.sourceField, fk.targetTable, fk.targetField);
          
          if (!parsedEdges.some(edge => edge.id === edgeId)) {
            parsedEdges.push({
              id: edgeId,
              source: tableName,
              target: fk.targetTable,
              sourceHandle: fk.sourceField,
              targetHandle: fk.targetField,
              type: 'smoothstep',
              animated: true,
              label: `${fk.sourceField} → ${fk.targetField}`,
              labelStyle: { 
                fill: color,
                fontSize: '12px',
                fontFamily: 'monospace',
              },
              style: { 
                stroke: color,
                strokeWidth: 2,
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: color,
                width: 20,
                height: 20,
              },
            });
          }
        }
      });
    });

    const updatedNodes = parsedNodes.map(newNode => {
      const existingNode = nodes.find(n => n.id === newNode.id);
      return existingNode ? { ...newNode, position: existingNode.position } : newNode;
    });

    setNodes(updatedNodes);
    setEdges(parsedEdges);
    setInitialSetup(false);
    setIsUpdatingFromSQL(false);
  }, [schema?.sql, isDark, initialSetup, generateEdgeId, isNodeMoving, nodes, setNodes, setEdges]);

  useEffect(() => {
    parseSchema();
    setIsUpdatingFromSQL(false);
  }, [schema.sql, parseSchema, setNodes, setEdges]);

  const updateSQL = React.useCallback((nodes: Node[], edges: Edge[]) => {
    if (!onSchemaChange || isUpdatingFromSQL) return;
    
    const tables = new Map<string, { fields: string[]; foreignKeys: ForeignKey[] }>();
    
    // Collecter les tables
    nodes.forEach(node => {
      // Nettoyer les champs de toute syntaxe Prisma
      const cleanedFields = node.data.fields.map((field: string) => {
        return field.replace(/@\w+(\([^)]*\))?/g, '').trim(); // Supprime les attributs Prisma
      });
      
      tables.set(node.id, { 
        fields: cleanedFields,
        foreignKeys: []
      });
    });

    // Collecter les foreign keys
    edges.forEach(edge => {
      const sourceTable = tables.get(edge.source);
      if (sourceTable && edge.sourceHandle && edge.targetHandle) {
        sourceTable.foreignKeys.push({
          sourceField: edge.sourceHandle.replace(/@\w+(\([^)]*\))?/g, '').trim(),
          targetTable: edge.target,
          targetField: edge.targetHandle.replace(/@\w+(\([^)]*\))?/g, '').trim()
        });
      }
    });

    // Générer le SQL standard
    const sqlStatements = Array.from(tables.entries()).map(([tableName, tableInfo]) => {
      const fieldsSQL = tableInfo.fields
        .filter(field => field.trim()) // Ignorer les champs vides
        .join(',\n  ');
        
      const tableFKs = tableInfo.foreignKeys.map(fk =>
        `FOREIGN KEY (${fk.sourceField}) REFERENCES ${fk.targetTable}(${fk.targetField})`
      );
      
      return `CREATE TABLE ${tableName} (\n  ${fieldsSQL}${
        tableFKs.length ? ',\n  ' + tableFKs.join(',\n  ') : ''
      }\n);`;
    });

    const newSQL = sqlStatements.join('\n\n');
    if (newSQL !== schema.sql) {
      setIsUpdatingFromSQL(true);
      onSchemaChange(newSQL);
      setTimeout(() => setIsUpdatingFromSQL(false), 0);
    }
  }, [onSchemaChange, isUpdatingFromSQL, schema.sql]);

  const handleNodesChange = React.useCallback(
    (changes: NodeChange[]) => {
      const positionChanges = changes.filter(change => 
        change.type === 'position' && 'position' in change
      ) as (NodeChange & { position: { x: number; y: number } })[];

      if (positionChanges.length > 0) {
        if (moveTimeoutRef.current) {
          clearTimeout(moveTimeoutRef.current);
        }

        setIsNodeMoving(true);
        positionChanges.forEach(change => {
          if ('id' in change) {
            nodePositionRef.current[change.id] = change.position;
          }
        });
      }

      onNodesChange(changes);
      
      if (positionChanges.length > 0) {
        moveTimeoutRef.current = setTimeout(() => {
          setIsNodeMoving(false);
          // Ne mettre à jour que les positions sans toucher aux relations
          const updatedNodes = nodes.map(node => ({
            ...node,
            position: nodePositionRef.current[node.id] || node.position
          }));
          setNodes(updatedNodes);
        }, 500);
      }
    },
    [nodes, setNodes, onNodesChange]
  );

  const handleEdgesChange = React.useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
    },
    [onEdgesChange]
  );

  const onConnect = React.useCallback(
    (params: Connection) => {
      if (!params.source || !params.target || !params.sourceHandle || !params.targetHandle) return;
      
      const edgeId = generateEdgeId(params.source, params.sourceHandle, params.target, params.targetHandle);
      const newEdge: Edge = {
        id: edgeId,
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
        type: 'smoothstep',
        animated: true,
        label: `${params.sourceHandle} → ${params.targetHandle}`,
        style: { 
          stroke: isDark ? nodeColors.primary.dark : nodeColors.primary.light, 
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isDark ? nodeColors.primary.dark : nodeColors.primary.light,
          width: 20,
          height: 20,
        },
      };
      
      if (!edges.some(edge => edge.id === edgeId)) {
        setEdges(eds => [...eds, newEdge]);
        updateSQL(nodes, [...edges, newEdge]);
      }
    },
    [nodes, edges, setEdges, updateSQL, isDark, generateEdgeId]
  );

  const downloadAsPng = useCallback(async () => {
    if (!reactFlowRef.current) return;

    try {
      setIsExporting(true);
      
      // Attendre que ReactFlow soit complètement rendu
      await new Promise(resolve => setTimeout(resolve, 100));

      const dataUrl = await toPng(reactFlowRef.current, {
        backgroundColor: isDark ? '#020617' : '#ffffff',
        quality: 1,
        pixelRatio: 2,
        skipFonts: true, // Ignore web font loading
        filter: (node) => {
          // Exclude control elements from export
          const excludeClasses = ['react-flow__controls', 'absolute'];
          return !excludeClasses.some(className => 
            node.classList?.contains(className)
          );
        }
      });
      
      const link = document.createElement('a');
      link.download = 'schema-diagram.png';
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error exporting schema:', error);
    } finally {
      setIsExporting(false);
    }
  }, [isDark]);

  useEffect(() => {
    return () => {
      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    updateTheme();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          updateTheme();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="h-full w-full relative flex flex-col">
      {/* Export button in top left */}
      <div className="absolute left-4 top-4 z-10">
        <button
          onClick={downloadAsPng}
          disabled={isExporting}
          className="p-2 rounded-lg flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground disabled:pointer-events-none disabled:opacity-50"
          title="Export as PNG"
        >
          {isExporting ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
          ) : (
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          )}
        </button>
      </div>
      
      {/* Controls in bottom left */}
      <div className="absolute bottom-2 left-2 z-50">
        <Controls 
          className={`${isDark ? 'dark' : ''} bg-background border rounded-lg shadow-lg`}
          showZoom={true}
          showFitView={true}
          showInteractive={false}
        />
      </div>

      <ReactFlow
        ref={reactFlowRef}
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => setSelectedNode(node)}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { 
            strokeWidth: 3,
            stroke: isDark ? '#94a3b8' : '#475569',
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 25,
            height: 25,
            color: isDark ? '#94a3b8' : '#475569',
          },
        }}
        fitView
        className="flex-1 [&_.react-flow__viewport]:!transform-gpu"
      >
        <Background color={isDark ? '#475569' : '#94a3b8'} />
      </ReactFlow>
      
      {selectedNode && (
        <div className={`absolute top-4 right-4 p-4 rounded-lg shadow-lg ${isDark ? 'bg-slate-700 text-white' : 'bg-white text-slate-800'}`}>
          <button
            onClick={() => setSelectedNode(null)}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
          <h3 className="font-bold mb-2">{selectedNode.id}</h3>
          <div className="space-y-2">
            {(selectedNode.data.fields as string[]).map((field: string, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={field}
                  onChange={(e) => {
                    const newNodes = nodes.map(n => {
                      if (n.id === selectedNode.id) {
                        const updatedNode = {
                          ...n,
                          data: {
                            ...n.data,
                            fields: n.data.fields.map((f: string, i: number) =>
                              i === index ? e.target.value : f
                            ),
                          },
                        };
                        return updatedNode;
                      }
                      return n;
                    });
                    setNodes(newNodes);
                    updateSQL(newNodes, edges);
                  }}
                  className={`border rounded px-2 py-1 text-sm w-full ${
                    isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                />
              </div>
            ))}
            <button
              onClick={() => {
                const newNodes = nodes.map(n => {
                  if (n.id === selectedNode.id) {
                    return {
                      ...n,
                      data: {
                        ...n.data,
                        fields: [...n.data.fields, 'new_field VARCHAR(255)'],
                      },
                    };
                  }
                  return n;
                });
                setNodes(newNodes);
                updateSQL(newNodes, edges);
              }}
              className={`bg-blue-500 text-white px-3 py-1 rounded text-sm mt-2 ${
                isDark ? 'bg-blue-700' : ''
              }`}
            >
              Ajouter un champ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}