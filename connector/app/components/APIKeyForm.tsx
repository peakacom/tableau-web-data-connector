import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Button, Callout, Heading, Link, TextField } from "@radix-ui/themes";
import React, { useState } from "react";
import { DEFAULT_API_BASE_URL, resolveApiBaseUrl } from "../config/endpoint";
import { authorizeProject } from "../config/authorization";
import { toast } from "react-toastify";
import { Project } from "../types/types";

export interface APIKeyFormProps {
  initialApiBaseUrl?: string;
  initialProjectId?: string;
  onValidAPIKey: (apiKey: string, project: Project, apiBaseUrl: string) => void;
}

const APIKeyForm = ({ onValidAPIKey, initialApiBaseUrl = DEFAULT_API_BASE_URL, initialProjectId = "" }: APIKeyFormProps) => {
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState(initialApiBaseUrl);
  const [projectId, setProjectId] = useState(initialProjectId);
  return (
    <div className="flex flex-col justify-center items-center gap-6">
      <Heading>Peaka Web Data Connector</Heading>
      <div className="w-full">
        <label htmlFor="peaka-api-address">Peaka API address</label>
        <TextField.Input
          id="peaka-api-address"
          type="url"
          value={apiBaseUrl}
          disabled={loading}
          placeholder="https://partner.peaka.studio/api/v1"
          onChange={event => setApiBaseUrl(event.target.value)}
        />
      </div>
      <div className="w-full">
        <TextField.Input
          type="password"
          disabled={loading}
          placeholder="Peaka API Key"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
          }}
        />
      </div>
      <div className="w-full">
        <label htmlFor="peaka-project-id">Project ID</label>
        <TextField.Input
          id="peaka-project-id"
          value={projectId}
          disabled={loading}
          placeholder="Required for partner/organization API keys"
          onChange={event => setProjectId(event.target.value)}
        />
        <p className="text-sm mt-1">Leave blank for a project API key to use its own project.</p>
      </div>
      <Callout.Root variant="soft">
        <Callout.Icon>
          <InfoCircledIcon />
        </Callout.Icon>
        <Callout.Text>
          Checkout Peaka{" "}
          <Link
            href="https://www.peaka.com/docs/how-to-guides/how-to-generate-api-keys/"
            target="_blank"
            rel="noopener noreferrer"
          >
            documentation
          </Link>{" "}
          for getting your API Key.
        </Callout.Text>
      </Callout.Root>

      <div className="flex justify-end items-center w-full">
        <Button
          variant="classic"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            try {
              const resolvedApiBaseUrl = resolveApiBaseUrl(apiBaseUrl);
              const project = await authorizeProject(resolvedApiBaseUrl, apiKey, projectId);
              onValidAPIKey(apiKey.trim(), project, resolvedApiBaseUrl);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not authorize this connection.", { theme: "colored" });
            } finally {
              setLoading(false);
            }
          }}
        >
          Authorize
        </Button>
      </div>
    </div>
  );
};

export default APIKeyForm;
