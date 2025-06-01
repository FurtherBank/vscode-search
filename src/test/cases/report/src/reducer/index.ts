import produce from 'immer';
import undoable from 'redux-undo';
import { LogItem } from '../types/logItem';
import { ExternalConfig } from '../App';

export interface EndPredictionState {
  day: number;
  agentsState: any[];
  envState: any;
  logs: LogItem[];
}

export interface EndPreditionActionParams {
  forward: {};
}

export type EndPreditionActionType = keyof EndPreditionActionParams;

export interface EndPreditionAction<T extends EndPreditionActionType = EndPreditionActionType> {
  type: T;
  params: EndPreditionActionParams[T];
}

const initialLogs = [
  {
    id: 0,
    day: 1,
    desc: '这个新世界真美丽！',
    action: 'abc',
  },
  {
    id: 1,
    day: 9,
    desc: '在这个世界生活真的好难……怎么办才好呢？',
    action: 'abc',
  },
  {
    id: 2,
    day: 99,
    desc: '我在这个世界上竟然呆了这么久！真是难以置信！接下来的时间应当做一些什么呢？',
    action: 'abc',
  },
  {
    id: 3,
    day: 996,
    desc: '我是一条测试的描述，但是没有想到她会有这么长的，真的难以置信！',
    action: 'abc',
  },
];

const initialState: EndPredictionState = {
  day: 1,
  logs: initialLogs,
  agentsState: [],
  envState: {},
};

/**
 * 导出 reducer 方法，其中可使用 ctx 闭包上下文
 * @param ctx
 * @returns
 */
export const getReducer = (config: ExternalConfig) => {
  const reducers = {
    forward: (state: EndPredictionState, params: {}) => {
      state.day++;
    },
  };

  return undoable(
    produce((state: EndPredictionState, action: EndPreditionAction) => {
      const { type, ...params } = action;
      if (reducers[type as keyof typeof reducers] != undefined) {
        reducers[type as keyof typeof reducers](state, params);
      }
    }, initialState),
    {
      undoType: 'undo',
    }
  );
};

export const createAction = <T extends EndPreditionActionType>(type: T, params: EndPreditionActionParams[T]) => {
  return {
    type,
    ...params,
  } as EndPreditionAction<T>;
};
