import { Project } from "../types/types";
import { resolveApiBaseUrl } from "./endpoint";
import { resolveProjectId } from "./project";

export async function authorizeProject(
  address: string,
  key: string,
  requestedProject: string,
  fetchApi: typeof fetch = fetch
): Promise<Project> {
  const apiBaseUrl = resolveApiBaseUrl(address);
  const apiKey = key.trim();
  if (!apiKey) throw new Error("Please enter your API Key.");
  const requestedId = requestedProject.trim() ? resolveProjectId(requestedProject) : "";

  const get = async (path: string, projectRequest = false): Promise<unknown> => {
    let response: Response;
    try {
      response = await fetchApi(`${apiBaseUrl}${path}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        redirect: "error",
      });
    } catch {
      throw new Error("Could not reach the Peaka API. Check its address, TLS certificate and network access. Use an address without redirects.");
    }
    if (!response.ok) {
      if (projectRequest && response.status === 403) {
        throw new Error("The API key is not authorized to read catalogs in the selected project.");
      }
      if (projectRequest && response.status === 404) {
        throw new Error("The selected project was not found or is not accessible to this API key.");
      }
      if (response.status === 401 || response.status === 403) {
        throw new Error("The API key was rejected by the selected Peaka instance.");
      }
      throw new Error(`The selected Peaka API returned an error (${response.status}).`);
    }
    try {
      return await response.json();
    } catch {
      throw new Error("The selected Peaka API returned an invalid JSON response.");
    }
  };

  const info = await get("/info");
  if (!info || typeof info !== "object" || Array.isArray(info)) {
    throw new Error("The selected Peaka API returned invalid API key information.");
  }
  const details = info as Record<string, unknown>;
  const keyProjectId = details.projectId == null ? "" : resolveProjectId(details.projectId);
  if (keyProjectId && requestedId && keyProjectId !== requestedId) {
    throw new Error("This API key belongs to another project. Use its matching Project ID or a partner/organization key.");
  }
  if (!keyProjectId && !requestedId) {
    throw new Error("Enter a Project ID when using a partner/organization API key.");
  }
  const projectId = keyProjectId || requestedId;
  const catalogs = await get(`/data/projects/${projectId}/catalogs`, true);
  if (!Array.isArray(catalogs)) {
    throw new Error("The selected Peaka API returned an invalid catalog list.");
  }

  return {
    projectId,
    projectName: typeof details.projectName === "string" && details.projectName.trim()
      ? details.projectName : projectId,
    email: typeof details.email === "string" ? details.email : "",
    userId: typeof details.userId === "string" ? details.userId : "",
  };
}
