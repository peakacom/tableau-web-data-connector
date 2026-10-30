import {
  Box,
  Button,
  Card,
  Flex,
  Grid,
  Heading,
  ScrollArea,
  Select,
  Table,
  Text,
} from "@radix-ui/themes";
import React, { useState } from "react";
import {
  CatalogDTO,
  Project,
  SchemaDTO,
  TableDTO,
  TableSelectionInfo,
  TableSelectionScanMode,
} from "../types/types";
import {
  GET_CATALOGS_URL_TEMPLATE,
  GET_SCHEMAS_URL_TEMPLATE,
  GET_TABLES_URL_TEMPLATE,
  LOADING_TABLE_MESSAGE,
  PEAKA_BI_TABLE_SCHEMA_NAME,
  PEAKA_QUERY_SCHEMA_NAME,
  PEAKA_TABLE_SCHEMA_NAME,
} from "../config/config";
import { useQuery } from "react-query";
import TableSelectionRow from "./TableSelectionRow";
import Spinner from "./Spinner";
import { toast } from "react-toastify";

export interface TableSelectionProps {
  project: Project | null;
  apiKey: string;
  apiBaseUrl: string;
  tableSelection: Map<string, TableSelectionInfo>;
  onSubmit: (tableSelection: Map<string, TableSelectionInfo>) => void;
  onBackClicked: () => void;
  onTableSelected: (tableSelection: Map<string, TableSelectionInfo>) => void;
}
const TableSelection = ({
  project,
  apiKey,
  apiBaseUrl,
  tableSelection,
  onSubmit,
  onBackClicked,
  onTableSelected,
}: TableSelectionProps) => {
  if (project === null) {
    return <Text>No Project.</Text>;
  }

  const [selectedCatalog, setSelectedCatalog] = useState<
    CatalogDTO | undefined
  >(undefined);

  const [selectedSchema, setSelectedSchema] = useState<SchemaDTO | undefined>(
    undefined
  );

  const { isLoading: isLoadingCatalog, data: catalogData } = useQuery(
    ["catalogs", apiBaseUrl, project.projectId],
    async () => {
      const res = await fetch(
        `${apiBaseUrl}${GET_CATALOGS_URL_TEMPLATE({
          projectId: project.projectId,
        })}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          redirect: "error",
        }
      );
      return (await res.json()) as CatalogDTO[];
    }
  );

  const { data: schemaData, isLoading: isLoadingSchema } = useQuery(
    ["schemas", apiBaseUrl, project.projectId, selectedCatalog],
    async () => {
      if (selectedCatalog?.id === "peaka") {
        const internalSchemas: SchemaDTO[] = [
          { schemaName: PEAKA_TABLE_SCHEMA_NAME, catalogId: "1" },
          { schemaName: PEAKA_BI_TABLE_SCHEMA_NAME, catalogId: "1" },
          { schemaName: PEAKA_QUERY_SCHEMA_NAME, catalogId: "2" },
        ];

        return internalSchemas;
      }

      const res = await fetch(
        `${apiBaseUrl}${GET_SCHEMAS_URL_TEMPLATE({
          projectId: project.projectId,
          catalogId: selectedCatalog?.id,
        })}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          redirect: "error",
        }
      );

      return (await res.json()) as SchemaDTO[];
    },
    { enabled: !!selectedCatalog }
  );

  const { data: tableData, isLoading: isLoadingTable } = useQuery(
    ["tables", apiBaseUrl, project.projectId, selectedSchema],
    async () => {
      let schemaName = "";

      switch (selectedSchema?.schemaName) {
        case PEAKA_TABLE_SCHEMA_NAME:
          schemaName = "table";
          break;
        case PEAKA_BI_TABLE_SCHEMA_NAME:
          schemaName = "bitable";
          break;
        case PEAKA_QUERY_SCHEMA_NAME:
          schemaName = "query";
          break;
        default:
          schemaName = selectedSchema?.schemaName as string;
      }

      const res = await fetch(
        `${apiBaseUrl}${GET_TABLES_URL_TEMPLATE({
          projectId: project.projectId,
          catalogId: selectedSchema?.catalogId,
          schemaName: schemaName,
        })}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          redirect: "error",
        }
      );

      if (!res.ok) {
        throw new Error("Failed to fetch tables.");
      }

      const tables = (await res.json()) as TableDTO[];
      return tables.filter((table) => table.schemaName === schemaName);
    },
    { enabled: !!selectedSchema }
  );

  return (
    <div className="flex flex-col justify-center items-center w-full h-full">
      <div className="flex justify-end items-center w-full mr-12 mt-5">
        <Card style={{ maxWidth: 600 }}>
          <Flex gap="3" align="center">
            <Box>
              {project.email && <Text as="div" size="2" weight="bold">Email: {project.email}</Text>}
              <Text as="div" size="2" color="gray">
                Project ID: {project.projectId}
              </Text>
              {project.projectName !== project.projectId && (
                <Text as="div" size="2" color="gray">Project Name: {project.projectName}</Text>
              )}
            </Box>
          </Flex>
        </Card>
      </div>

      <Grid columns="2" gap="3" width="auto" height="min-content">
        <Box height="100%" width="auto">
          <div className="flex flex-col justify-start items-start gap-7">
            <Heading>Table Selection</Heading>
            <div className="flex items-center justify-center gap-3 mt-6">
              <Select.Root
                value={selectedCatalog?.id}
                disabled={isLoadingCatalog || isLoadingSchema || isLoadingTable}
                onValueChange={(value) => {
                  if (value === "peaka") {
                    const catalog: CatalogDTO = {
                      displayName: "Peaka",
                      id: "peaka",
                      queryName: "peaka",
                      type: "peaka",
                      subType: "peaka",
                      props: {},
                    };
                    setSelectedCatalog(catalog);
                    setSelectedSchema(undefined);
                    return;
                  }
                  const catalog = catalogData?.find(
                    (catalog) => catalog.id === value
                  );
                  setSelectedCatalog(catalog);
                  setSelectedSchema(undefined);
                }}
              >
                <Select.Trigger
                  className="w-80"
                  placeholder="Select a catalog"
                />
                <Select.Content>
                  <Select.Item value="peaka">Peaka</Select.Item>
                  {Array.isArray(catalogData) &&
                    catalogData
                      ?.filter(
                        (catalog) => catalog.id !== "1" && catalog.id !== "2"
                      )
                      .map((catalog) => (
                        <Select.Item value={catalog.id} key={catalog.id}>
                          {catalog.displayName}
                        </Select.Item>
                      ))}
                </Select.Content>
              </Select.Root>

              <Select.Root
                value={selectedSchema?.schemaName}
                disabled={
                  !selectedCatalog ||
                  isLoadingCatalog ||
                  isLoadingSchema ||
                  isLoadingTable
                }
                onValueChange={(value) => {
                  const schema = schemaData?.find(
                    (schema) => schema.schemaName === value
                  );
                  setSelectedSchema(schema);
                }}
              >
                <Select.Trigger
                  className="w-80"
                  placeholder="Select a schema"
                />
                <Select.Content>
                  {Array.isArray(schemaData) &&
                    schemaData?.map((schema) => (
                      <Select.Item
                        value={schema.schemaName}
                        key={schema.schemaName}
                      >
                        {schema.schemaName}
                      </Select.Item>
                    ))}
                </Select.Content>
              </Select.Root>
            </div>
            <div className="flex items-center justify-center">
              <ScrollArea
                type="auto"
                scrollbars="both"
                style={{ height: 400, width: 700 }}
              >
                <Box p="2" pr="8">
                  {isLoadingTable ? (
                    <div className="mt-20">
                      <Spinner
                        message={LOADING_TABLE_MESSAGE}
                        isFullScreen={false}
                      />
                    </div>
                  ) : (
                    <Table.Root>
                      <Table.Header>
                        <Table.Row>
                          <Table.ColumnHeaderCell>
                            Table Name
                          </Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>
                            Scan Mode
                          </Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>
                            Action
                          </Table.ColumnHeaderCell>
                        </Table.Row>
                      </Table.Header>

                      <Table.Body>
                        {tableData
                          ?.sort((a, b) => {
                            if (a.tableName > b.tableName) {
                              return 1;
                            }
                            if (a.tableName < b.tableName) {
                              return -1;
                            }
                            return 0;
                          })
                          .filter((table) => !table.isDynamicTable)
                          .map((table) => (
                            <TableSelectionRow
                              key={table.tableName}
                              apiBaseUrl={apiBaseUrl}
                              table={table}
                              onTableExported={(
                                selectionInfo: TableSelectionInfo
                              ) => {
                                onTableSelected(
                                  new Map(
                                    tableSelection.set(
                                      selectionInfo.key,
                                      selectionInfo
                                    )
                                  )
                                );
                              }}
                              isExported={
                                tableSelection.get(
                                  `${table.catalogId}-${table.schemaName}-${table.tableName}`
                                )
                                  ? true
                                  : false
                              }
                              projectId={project!.projectId}
                              apiKey={apiKey}
                              catalogs={catalogData!}
                            />
                          ))}
                      </Table.Body>
                    </Table.Root>
                  )}
                </Box>
              </ScrollArea>
            </div>
          </div>
        </Box>

        <Box height="100%" width="auto">
          <div className="flex flex-col justify-start items-start gap-7">
            <div className="ml-4">
              <Heading>Selected Tables</Heading>
            </div>
            <div className="flex items-center justify-center mt-11">
              <ScrollArea
                type="auto"
                scrollbars="both"
                style={{ height: 400, width: 700 }}
              >
                <Box p="2" pr="8" pt={"8"}>
                  <Table.Root>
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeaderCell>
                          Catalog Name
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>
                          Schema Name
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>
                          Table Name
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>
                          Scan Mode
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Action</Table.ColumnHeaderCell>
                      </Table.Row>
                    </Table.Header>

                    <Table.Body>
                      {Array.from(tableSelection.keys()).map((key) => {
                        const tableSelectionInfo = tableSelection.get(key);
                        const table = tableSelectionInfo?.table;

                        if (!tableSelectionInfo || !table) {
                          return null;
                        }

                        return (
                          <Table.Row key={tableSelectionInfo.key}>
                            <Table.Cell>
                              {tableSelectionInfo.catalog.displayName}
                            </Table.Cell>
                            <Table.Cell>{table.schemaName}</Table.Cell>
                            <Table.Cell>{table.tableName}</Table.Cell>
                            <Table.Cell>
                              {tableSelectionInfo.scanMode ===
                              TableSelectionScanMode.FULL_SCAN
                                ? "Full Scan"
                                : `Limit: ${tableSelectionInfo.limit}`}
                            </Table.Cell>
                            <Table.Cell>
                              <Button
                                color="crimson"
                                variant="soft"
                                onClick={() => {
                                  tableSelection.delete(tableSelectionInfo.key);
                                  onTableSelected(new Map(tableSelection));
                                }}
                              >
                                Remove
                              </Button>
                            </Table.Cell>
                          </Table.Row>
                        );
                      })}
                    </Table.Body>
                  </Table.Root>
                </Box>
              </ScrollArea>
            </div>
          </div>
        </Box>
      </Grid>
      <div className="flex justify-between items-center w-full p-12">
        <Button
          size="2"
          variant="soft"
          onClick={() => {
            onBackClicked();
          }}
        >
          Back
        </Button>
        <Button
          size="2"
          variant="soft"
          onClick={() => {
            if (tableSelection.size === 0) {
              toast.error("Please select at least one table to export data.", {
                theme: "colored",
              });
              return;
            }
            onSubmit(tableSelection);
          }}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default TableSelection;
