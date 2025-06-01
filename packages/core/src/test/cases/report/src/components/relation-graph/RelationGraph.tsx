import React from 'react';
import { ReactG6 } from '../base/ReactG6';

interface RelationGraphProps {}

const data = {
  nodes: [
    { id: '1', name: '人物1', status: '状态1', label: '人物1' },
    { id: '2', name: '人物2', status: '状态2', label: '人物2' },
    { id: '3', name: '人物3', status: '状态3', label: '人物3' },
  ],
  edges: [
    { source: '1', target: '2' },
    { source: '1', target: '3' },
  ],
};

const staticOptions = {
  layout: {
    type: 'force',
    preventOverlap: true,
    nodeSize: 50,
    linkDistance: 100,
    nodeStrength: -30,
    edgeStrength: 0.1,
  },
  defaultNode: {
    size: 40
  },
  modes: {
    default: ['drag-canvas', 'zoom-canvas'],
  },
};

export const RelationGraph = (props: RelationGraphProps) => {
  return (
    <div style={{ flex: 1, overflow: 'hidden' }}>
      <ReactG6 data={data} options={staticOptions} domAttributes={{ style: { width: '100%', height: '100%' } }} />
    </div>
  );
};
