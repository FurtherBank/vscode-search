import React from 'react';
import { Button, Progress, Space } from 'antd';
import { ReactG6 } from '../base/ReactG6';

interface EndGraphProps {}

const data = {
  nodes: [
    { id: 'node1', label: '开始' },
    { id: 'node2', label: '计算机学生' },
    { id: 'node3', label: '码农' },
    { id: 'node4', label: '35岁' },
    { id: 'node5', label: '公务员' },
    { id: 'node6', label: '平安幸福的一生' },
  ],
  edges: [
    {
      source: 'node1',
      target: 'node2',
      label: '选择计算机专业',
    },
    {
      source: 'node2',
      target: 'node3',
      label: '热爱编程',
    },
    {
      source: 'node3',
      target: 'node4',
      label: '持续工作',
    },
    {
      source: 'node4',
      target: 'node5',
      label: '考公',
    },
    {
      source: 'node2',
      target: 'node5',
      label: '考公',
    },
    {
      source: 'node5',
      target: 'node6',
      label: '持续工作',
    },
  ],
};

const staticOptions = {
  layout: {
    type: 'dagre',
    rankdir: 'LR',
  },
  defaultNode: {
    type: 'rect',
    style: {
      size: [100, 28],
      radius: 4,
    },
    // 其他配置
  },
  defaultEdge: {
    type: 'line',
    style: {
      endArrow: true,
    },
    labelCfg: {
      style: {
        fill: '#333',
        fontSize: 12,
      },
    },
  },
  modes: {
    default: ['drag-canvas', 'zoom-canvas'],
  },
  labelCfg: {
    autoRotate: true,
  },
  width: 1208,
  height: 600,
};

export const EndGraph = (props: EndGraphProps) => {
  return <ReactG6 data={data} options={staticOptions} />;
};
