import React, { useEffect, useRef } from 'react';
import G6, { Graph, GraphData, GraphOptions, TreeGraphData } from '@antv/g6';
import './resize-canvas.css';

export const ReactG6 = (props: {
  data: GraphData | TreeGraphData | undefined;
  options: Omit<GraphOptions, 'container'>;
  domAttributes?: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>;
}) => {
  const { data, options, domAttributes = {} } = props;
  const { className = '', ...restDomAttributes } = domAttributes;
  const ref = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);

  useEffect(() => {
    if (!graphRef.current) {
      const graph = new G6.Graph({
        // width: 10,
        // height: 10,
        container: ref.current!,
        ...options,
      });
      graph.data(data);
      graph.render();
      graphRef.current = graph;
    }
  }, []);

  // 响应式调整 graph 的 size
  // useEffect(() => {
  //   const resizeObserver = new ResizeObserver((entries) => {
  //     for (let entry of entries) {
  //       if (graphRef.current) graphRef.current.changeSize(entry.target.clientWidth, entry.target.clientHeight - 6);
  //       console.log(entry.target.clientWidth, entry.target.clientHeight - 6);
  //     }
  //   });
  //   if (ref.current) resizeObserver.observe(ref.current);
  //   return () => {
  //     resizeObserver.disconnect();
  //   };
  // }, [ref.current, graphRef.current]);

  return <div ref={ref} className={'resize-canvas ' + className} {...restDomAttributes}></div>;
};
