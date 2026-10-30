import React, { useState } from "react";
import { useQueryClient } from "react-query";
import useConnector from "./useConnector";
import { Heading, Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import Spinner from "./Spinner";
import { INITIALIZING_SPINNER_MESSAGE } from "../config/config";
import { DEFAULT_API_BASE_URL } from "../config/endpoint";
import APIKeyForm from "./APIKeyForm";
import { FormState, Project, TableSelectionInfo } from "../types/types";
import TableSelection from "./TableSelection";
import ResultsForm from "./ResultsForm";

const RootView = () => {
  const queryClient = useQueryClient();
  const {
    isSubmitting,
    errorMessage,
    isInitializing,
    handleSubmit,
    connector,
  } = useConnector();

  const [formState, setFormState] = useState<FormState>(FormState.API_KEY);
  const [apiKey, setApiKey] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE_URL);
  const [project, setProject] = useState<Project | null>(null);
  const [tableSelection, setTableSelection] = useState<
    Map<string, TableSelectionInfo>
  >(new Map());

  if (errorMessage) {
    <Theme appearance="light" accentColor="iris" scaling="110%">
      <div className="w-full h-screen flex flex-col justify-center items-center">
        <Heading>errorMessage</Heading>
      </div>
    </Theme>;
  }

  return (
    <Theme appearance="light" accentColor="iris" scaling="110%">
      {isInitializing ? (
        <Spinner message={INITIALIZING_SPINNER_MESSAGE} isFullScreen={true} />
      ) : (
        <>
          {formState === FormState.API_KEY && (
            <div className="w-full h-screen flex flex-col justify-center items-center">
              <APIKeyForm
                initialApiBaseUrl={apiBaseUrl}
                initialProjectId={project?.projectId}
                onValidAPIKey={(nextApiKey: string, nextProject: Project, nextApiBaseUrl: string) => {
                  if (apiBaseUrl !== nextApiBaseUrl || apiKey !== nextApiKey || project?.projectId !== nextProject.projectId) {
                    queryClient.clear();
                    setTableSelection(new Map());
                  }
                  setApiBaseUrl(nextApiBaseUrl);
                  setApiKey(nextApiKey);
                  setProject(nextProject);
                  setFormState(FormState.TABLE_SELECT);
                }}
              />
            </div>
          )}
          {formState === FormState.TABLE_SELECT && (
            <div className="w-full h-full flex flex-col justify-center items-center ml-4">
              <TableSelection
                key={`${apiBaseUrl}:${project?.projectId}`}
                apiBaseUrl={apiBaseUrl}
                project={project}
                apiKey={apiKey}
                onSubmit={(tableSelection) => {
                  setTableSelection(tableSelection);
                  setFormState(FormState.SUMMARY);
                }}
                onBackClicked={() => {
                  setFormState(FormState.API_KEY);
                }}
                tableSelection={tableSelection}
                onTableSelected={(
                  tableSelection: Map<string, TableSelectionInfo>
                ) => {
                  setTableSelection(tableSelection);
                }}
              />
            </div>
          )}
          {formState === FormState.SUMMARY && (
            <div className="w-full h-screen flex flex-col justify-center items-center">
              <ResultsForm
                tableSelection={tableSelection!}
                onFinish={(tableSelections) => {
                  connector.secrets = {
                    apiKey: apiKey,
                    projectId: project?.projectId,
                  };
                  handleSubmit([
                    {
                      fetcher: "DataFetcher",
                      parser: "DataParser",
                      data: {
                        tableSelections,
                        apiBaseUrl,
                      },
                    },
                  ]);
                }}
                onBackClicked={() => {
                  setFormState(FormState.TABLE_SELECT);
                }}
                isSubmitting={isSubmitting}
              />
            </div>
          )}
        </>
      )}
      <ToastContainer />
    </Theme>
  );
};

export default RootView;
