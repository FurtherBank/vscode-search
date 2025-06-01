import React, { useContext } from 'react';
import { EndPreditionActionType, EndPreditionActionParams, EndPreditionAction } from '.';
import { ExternalConfig } from '../App';

const ExternalConfigContext = React.createContext<ExternalContext>(null!);

export interface ExternalContext {
  config: ExternalConfig;
  execute: {
    <T extends EndPreditionActionType>(type: T, params: EndPreditionActionParams[T]): EndPreditionAction<T>;
    <T extends 'undo' | 'redo'>(type: T): { type: T };
  };
}

export const CtxProvider = ExternalConfigContext.Provider;

export const useCtx = () => {
  return useContext(ExternalConfigContext);
};
