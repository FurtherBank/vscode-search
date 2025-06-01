import React, { useCallback } from 'react';
import { App, Button, Progress, Space } from 'antd';
import { EndGraph } from '../end-graph/EndGraph';

interface EndProgressProps {
  endName: string;
  stateName?: string;
  progress: number;
}

export const EndProgress = (props: EndProgressProps) => {
  const { endName, stateName, progress } = props;

  const { message, notification, modal } = App.useApp();

  const showModal = useCallback(() => {
    const content = <EndGraph />;
    modal.info({
      title: endName,
      content,
      closable: true,
      width: '80vw',
      footer: null,
    });
  }, [modal, endName]);

  return (
    <Button size={'small'} onClick={showModal}>
      <Space size={'small'}>
        <Progress type="circle" trailColor="#e6f4ff" percent={progress} strokeWidth={20} size={14} showInfo={false} />
        {endName}
        <span>{stateName}</span>
        {progress + '%'}
      </Space>
    </Button>
  );
};
