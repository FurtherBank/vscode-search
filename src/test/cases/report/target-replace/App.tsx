import { useCallback, useMemo, useState } from 'react';                
import {
  createAction,
  getReducer,
} from './reducer';
import { legacy_createStore as createStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MainPage } from './components/MainPage';
import { CtxProvider, ExternalContext } from './reducer/context';

export interface ExternalConfig {}

export function MyApp() {
  const [externalConfig, setExternalConfig] = useState<ExternalConfig>({});
  const handleExternalConfigChange = useCallback(
    (config: ExternalConfig) => {
      setExternalConfig(config);
    },
    [setExternalConfig]
  );

  const store = useMemo(() => {
    const reducer = getReducer(externalConfig);
    return createStore(reducer);
  }, [externalConfig]);

  const ctx = useMemo(() => {
    const execute = (type: any, params: any) => {
      return store.dispatch(createAction(type, params));
    }
    return {
      config: externalConfig,
      execute: execute as ExternalContext['execute']
    };
  }, [externalConfig, store]);

  return (
    <CtxProvider value={ctx}>
      <Provider store={store}>
        <MainPage />
      </Provider>
    </CtxProvider>
  );
}
