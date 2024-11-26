'use client';

import React from 'react';
import ReactFlow, { 
  Node, 
  Edge,
  Controls,
  Background,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface SchemaViewerProps {
    schema: {
      sql: string;
      prisma: string;
    };
  }
  
  export default function SchemaViewer({ schema }: SchemaViewerProps) {
    const [nodes, setNodes] = React.useState<Node[]>([]);
    const [edges, setEdges] = React.useState<Edge[]>([]);
  
    React.useEffect(() => {
        if (schema?.prisma) {
          console.log('Parsing schema:', schema.prisma);
          // Parse Prisma schema to extract models with more flexible regex
          const models = schema.prisma.match(/model\s+\w+\s*{[\s\S]+?}/g) || [];
          console.log('Found models:', models);
          
          const parsedNodes: Node[] = [];
          const parsedEdges: Edge[] = [];
          
          models.forEach((model, index) => {
            // Extract model name with more flexible regex
            const modelName = model.match(/model\s+(\w+)/)?.[1] || '';
            console.log('Processing model:', modelName);
            
            // Extract fields with more flexible regex
            const fields = model.match(/^\s*(\w+)\s+(\w+)(\s*@[^$\n]*)?$/gm) || [];
            const fieldsList = fields.map(f => f.trim()).join('\n');
            console.log('Fields:', fields);
            
            // Create node
            parsedNodes.push({
              id: modelName,
              position: { x: 250 * (index % 3), y: 200 * Math.floor(index / 3) },
              data: { 
                label: (
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{modelName}</div>
                    <div style={{ textAlign: 'left', whiteSpace: 'pre' }}>{fieldsList}</div>
                  </div>
                )
              },
              style: {
                background: '#f5f5f5',
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '10px',
                minWidth: '200px',
              },
            });
            
            // Extract relationships with more flexible regex
            const relations = model.match(/@relation\([^)]*\)/g) || [];
            relations.forEach(relation => {
              const targetModel = relation.match(/references:\s*\[([^\]]+)\]/)?.[1];
              if (targetModel) {
                parsedEdges.push({
                  id: `${modelName}-${targetModel}`,
                  source: modelName,
                  target: targetModel,
                  type: 'smoothstep',
                  animated: true,
                });
              }
            });
          });
          
          console.log('Setting nodes:', parsedNodes);
          console.log('Setting edges:', parsedEdges);
          setNodes(parsedNodes);
          setEdges(parsedEdges);
        }
      }, [schema]);
  
    return (
        <div style={{ width: '100%', height: '100%' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>
      );
  }