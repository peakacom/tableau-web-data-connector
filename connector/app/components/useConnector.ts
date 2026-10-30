import { useState, useRef } from "react";
import Connector, { HandlerInput, Logger } from "@tableau/taco-toolkit";

type ConnectorState = {
  isSubmitting: boolean;
  isInitializing: boolean;
  errorMessage?: string;
};

const useConnector = () => {
  const [connectorState, setConnectorState] = useState<ConnectorState>({
    isInitializing: true,
    isSubmitting: false,
  });

  const [connector] = useState<Connector>(
    () =>
      new Connector(
        (_: Connector) => {
          Logger.info("Connector initialized.");

          setConnectorState({ ...connectorState, isInitializing: false });
        },
        (_: Connector, error: Error) => {
          Logger.error(`Connector Initialized Error: ${error.message}`);
          setConnectorState({
            ...connectorState,
            errorMessage: error.message,
            isInitializing: false,
          });
        }
      )
  );

  const submittingRef = useRef(false);

  const handleSubmit = (handlerInputs: HandlerInput[]) => {
    if (connectorState.isSubmitting || submittingRef.current) {
      console.warn("Connector is submitting...");
      return;
    }

    submittingRef.current = true;
    setConnectorState({ ...connectorState, isSubmitting: true });

    try {
      connector.handlerInputs = handlerInputs;
      connector.submit();
    } catch (error) {
      submittingRef.current = false;
      setConnectorState({
        ...connectorState,
        errorMessage: error.message,
        isSubmitting: false,
      });
    }
  };

  return {
    connector,
    ...connectorState,
    handleSubmit,
  };
};

export default useConnector;
