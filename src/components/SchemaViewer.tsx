import React, { useEffect, useState } from 'react';
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
} from 'reactflow';
import 'reactflow/dist/style.css';

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
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = React.useState<Node | null>(null);
  const [isDark, setIsDark] = React.useState(false);

  useEffect(() => {
    // Sync with global theme
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

  const updateSQL = React.useCallback((nodes: Node[], edges: Edge[]) => {
    if (!onSchemaChange) return;

    const tables = new Map<string, { fields: string[] }>();
    nodes.forEach(node => {
      tables.set(node.id, { fields: node.data.fields });
    });

    const foreignKeys = edges.map(edge => ({
      sourceTable: edge.source,
      sourceField: edge.sourceHandle || '',
      targetTable: edge.target,
      targetField: edge.targetHandle || '',
    }));

    const sqlStatements = Array.from(tables.entries()).map(([tableName, tableInfo]) => {
      const fieldsSQL = tableInfo.fields.join(',\n  ');
      const tableFK = foreignKeys
        .filter(fk => fk.sourceTable === tableName)
        .map(fk => `FOREIGN KEY (${fk.sourceField}) REFERENCES ${fk.targetTable}(${fk.targetField})`);
      
      return `CREATE TABLE ${tableName} (\n  ${fieldsSQL}${
        tableFK.length ? ',\n  ' + tableFK.join(',\n  ') : ''
      }\n);`;
    });

    onSchemaChange(sqlStatements.join('\n\n'));
  }, [onSchemaChange]);

  React.useEffect(() => {
    if (!schema?.sql) return;
    
    const tableMatches = schema.sql.match(/CREATE TABLE ["`]?(\w+)["`]?\s*\(([\s\S]+?)\);/g) || [];
    const parsedNodes: Node[] = [];
    const parsedEdges: Edge[] = [];
    const tables = new Map<string, TableInfo>();

    // Premier passage : créer les nœuds pour toutes les tables
    tableMatches.forEach((tableMatch, index) => {
      const tableNameMatch = tableMatch.match(/CREATE TABLE ["`]?(\w+)["`]?/);
      if (!tableNameMatch) return;
      
      const tableName = tableNameMatch[1];
      const fieldsMatch = tableMatch.match(/\(([\s\S]+)\)/);
      if (!fieldsMatch) return;
      
      const fields = fieldsMatch[1]
        .split(',')
        .map(field => field.trim())
        .filter(field => field && !field.toLowerCase().includes('foreign key'));
      
      tables.set(tableName, { fields, foreignKeys: [] });
      
      const foreignKeyRegex = /FOREIGN KEY\s*\(\s*["`]?(\w+)["`]?\s*\)\s*REFERENCES\s*["`]?(\w+)["`]?\s*\(\s*["`]?(\w+)["`]?\s*\)/gi;
      let fkMatch;
      while ((fkMatch = foreignKeyRegex.exec(fieldsMatch[1])) !== null) {
        const [_, sourceField, targetTable, targetField] = fkMatch;
        tables.get(tableName)?.foreignKeys.push({
          sourceField: sourceField.trim(),
          targetTable: targetTable.trim(),
          targetField: targetField.trim(),
        });
      }

      const colorKeys = Object.keys(nodeColors);
      const colorKey = colorKeys[index % colorKeys.length];
      const color = isDark ? nodeColors[colorKey as keyof typeof nodeColors].dark : nodeColors[colorKey as keyof typeof nodeColors].light;
      
      parsedNodes.push({
        id: tableName,
        type: 'default',
        position: { 
          x: 300 * (index % 3), 
          y: 250 * Math.floor(index / 3) 
        },
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

    // Deuxième passage : créer les arêtes pour les clés étrangères
    tables.forEach((tableInfo, tableName) => {
      tableInfo.foreignKeys.forEach((fk) => {
        const sourceNode = parsedNodes.find(node => node.id === tableName);
        const targetNode = parsedNodes.find(node => node.id === fk.targetTable);
        
        if (sourceNode && targetNode) {
          const color = isDark ? nodeColors.primary.dark : nodeColors.primary.light;
          parsedEdges.push({
            id: `${tableName}-${fk.targetTable}-${fk.sourceField}`,
            source: tableName,
            target: fk.targetTable,
            sourceHandle: fk.sourceField,
            targetHandle: fk.targetField,
            type: 'smoothstep',
            animated: true,
            label: `${fk.sourceField} → ${fk.targetField}`,
            labelStyle: { fill: color },
            style: { 
              stroke: color,
              strokeWidth: 2,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: color,
            },
          });
        }
      });
    });

    setNodes(parsedNodes);
    setEdges(parsedEdges);
  }, [schema?.sql, isDark]);

  const handleNodesChange = React.useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      const updatedNodes = nodes.map(node => {
        const change = changes.find(
          (c): c is NodeChange & { id: string; type: 'position'; position: { x: number; y: number } } => 
            'id' in c && c.id === node.id && c.type === 'position'
        );
        if (change) {
          return { ...node, position: change.position };
        }
        return node;
      });
      updateSQL(updatedNodes, edges);
    },
    [nodes, edges, onNodesChange, updateSQL]
  );

  const handleEdgesChange = React.useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
      updateSQL(nodes, edges);
    },
    [nodes, edges, onEdgesChange, updateSQL]
  );

  const handleConnect = React.useCallback(
    (params: Connection) => {
      const newEdge: Edge = {
        id: `e${params.source}-${params.target}`,
        source: params.source!,
        target: params.target!,
        type: 'smoothstep',
        animated: true,
        style: { stroke: isDark ? nodeColors.primary.dark : nodeColors.primary.light, strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isDark ? nodeColors.primary.dark : nodeColors.primary.light,
        },
      };
      
      setEdges(eds => [...eds, newEdge]);
      updateSQL(nodes, [...edges, newEdge]);
    },
    [nodes, edges, setEdges, updateSQL, isDark]
  );

  const onConnect = React.useCallback(
    (params: Connection) => {
      const newEdge: Edge = {
        id: `e${params.source}-${params.target}`,
        source: params.source!,
        target: params.target!,
        type: 'smoothstep',
        animated: true,
        style: { stroke: isDark ? nodeColors.primary.dark : nodeColors.primary.light, strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isDark ? nodeColors.primary.dark : nodeColors.primary.light,
        },
      };
      
      setEdges(eds => [...eds, newEdge]);
      updateSQL(nodes, [...edges, newEdge]);
    },
    [nodes, edges, setEdges, updateSQL, isDark]
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        className="h-full w-full"
      >
        <Background color={isDark ? '#475569' : '#e2e8f0'} />
        <Controls className={isDark ? 'text-white' : 'text-slate-800'} />
      </ReactFlow>
      
      {selectedNode && (
        <div className={`absolute top-4 right-4 p-4 rounded-lg shadow-lg ${isDark ? 'bg-slate-700 text-white' : 'bg-white text-slate-800'}`}>
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
                        return {
                          ...n,
                          data: {
                            ...n.data,
                            fields: n.data.fields.map((f: string, i: number) =>
                              i === index ? e.target.value : f
                            ),
                          },
                        };
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