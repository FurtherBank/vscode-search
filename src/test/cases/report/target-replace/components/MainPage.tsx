import React, { useCallback } from 'react';
import { App, Button, ConfigProvider, Divider, Space } from 'antd';
import { EndProgress } from './end-progress/EndProgress';
import { PageHeader } from '@ant-design/pro-components';
import { LogList } from './log-list/LogList';
import { RelationGraph } from './relation-graph/RelationGraph';
import { EndPredictionState } from '../reducer';
import { StateWithHistory } from 'redux-undo';
import { connect, useDispatch, useSelector } from 'react-redux';
import { RollbackOutlined, PlayCircleOutlined, FastForwardOutlined, ExportOutlined } from '@ant-design/icons';
import { useCtx } from '../reducer/context';

interface MainPageProps {}

interface MainPageBaseProps extends MainPageProps, EndPredictionState {}

const MainPageBase = (props: MainPageBaseProps) => {
  const { day } = props;

  const { config, execute } = useCtx();

  const nextDay = useCallback(() => {
    execute('forward', {});
  }, [execute]);

  const undo = useCallback(() => {
    execute('undo');
  }, [execute]);

  return (
    <ConfigProvider>
      <App
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <PageHeader
          title={`第 ${day} 天`}
          extra={
            <Space size={2} split={<Divider type="vertical" style={{ height: '24px' }} />}>
              <Space.Compact>
                <Button icon={<RollbackOutlined />} disabled={day <= 1} title="回退一天" onClick={undo}/>
                <Button icon={<PlayCircleOutlined />} onClick={nextDay}>
                  下一天
                </Button>
                <Button icon={<FastForwardOutlined />} title="前进十天" />
              </Space.Compact>
              <Button icon={<ExportOutlined />} type="primary">
                导出
              </Button>
            </Space>
          }
        ></PageHeader>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'row' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', boxSizing: 'border-box', width: 0 }}>
            <RelationGraph></RelationGraph>
            <PageHeader style={{ margin: '0' }}>
              <Space>
                <h3>结局进展</h3>
                <EndProgress endName="平安幸福的一生" progress={66} />
              </Space>
            </PageHeader>
          </div>
          <LogList />
        </div>
      </App>
    </ConfigProvider>
  );
};

export const MainPage = connect((state: StateWithHistory<EndPredictionState>, props: MainPageProps) => {
  const { present } = state;
  console.log(present);

  return present;
})(MainPageBase);
