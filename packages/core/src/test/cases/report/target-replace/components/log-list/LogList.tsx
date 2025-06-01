import { ProList } from '@ant-design/pro-components';
import { useSelector } from 'react-redux';
import { StateWithHistory } from 'redux-undo';
import { EndPredictionState } from '../../reducer';
import { LogItem } from '../../types/logItem';

interface LogListProps {
  endName: string;
  stateName?: string;
  progress: number;
}

export const LogList = (props: any) => {
  const { day, logs } = useSelector((state: StateWithHistory<EndPredictionState>) => {
    const { present } = state;
    return present;
  });

  return (
    <ProList<LogItem>
      size="small"
      style={{
        width: '500px',
      }}
      // toolBarRender={() => {
      //   return [
      //     <Button key="add" type="primary">
      //       新建
      //     </Button>,
      //   ];
      // }}
      onRow={(record: any) => {
        return {
          // onMouseEnter: () => {
          //   console.log(record);
          // },
          // onClick: () => {
          //   console.log(record);
          // },
        };
      }}
      rowKey="name"
      headerTitle="事件日志"
      dataSource={logs}
      showActions="hover"
      showExtra="hover"
      search={{
        filterType: 'light',
      }}
      metas={{
        description: {
          render: (dom, entity) => {
            const { day, desc } = entity;
            return (
              <div>
                <h4
                  className="ant-pro-list-row-show-action-hover ant-pro-list-row-show-extra-hover ant-pro-list-row-title ant-list-item-meta-title"
                  style={{
                    display: 'inline-block',
                    width: '5em',
                    margin: '0',
                  }}
                >
                  {`第 ${day} 天`}
                </h4>
                <span
                  style={{
                    fontWeight: 'normal',
                  }}
                >
                  {desc}
                </span>
              </div>
            );
          },
          search: false,
        },
        title: {
          search: false,
        },
        day: {
          title: '时间',
          valueType: 'digit',
        },
      }}
    />
  );
};
