import { Button, Select, Table, TextField } from "@radix-ui/themes";
import React, { useState } from "react";
import {
  CatalogDTO,
  TableDTO,
  TableSelectionInfo,
  TableSelectionScanMode,
} from "../types/types";
import { useQuery } from "react-query";
import { IS_TABLE_CACHED_URL_TEMPLATE } from "../config/config";

export interface TableSelectionRowProps {
  table: TableDTO;
  onTableExported: (selectionInfo: TableSelectionInfo) => void;
  isExported: boolean;
  projectId: string;
  apiKey: string;
  apiBaseUrl: string;
  catalogs: CatalogDTO[];
}

const TableSelectionRow = ({
  table,
  onTableExported,
  isExported,
  projectId,
  apiKey,
  apiBaseUrl,
  catalogs,
}: TableSelectionRowProps) => {
  const [limit, setLimit] = useState<number>(50);
  const [scanMode, setScanMode] = useState("full-scan");
  const [isExporting, setIsExporting] = useState(false);

  const key = `${table.catalogId}-${table.schemaName}-${table.tableName}`;

  const { refetch } = useQuery(
    ["table-cached", apiBaseUrl, projectId, key],
    async () => {
      const res = await fetch(
        `${apiBaseUrl}${IS_TABLE_CACHED_URL_TEMPLATE({
          projectId: projectId,
          catalogId: table.catalogId,
          schemaName: table.schemaName,
          tableName: table.tableName,
        })}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          redirect: "error",
        }
      );

      return await res.json();
    },
    { enabled: false }
  );

  return (
    <Table.Row>
      <Table.Cell>{table.tableName}</Table.Cell>
      <Table.Cell>
        <div className="flex justify-center items-center gap-3">
          <Select.Root
            value={scanMode}
            size={"2"}
            onValueChange={(value) => {
              setScanMode(value);
            }}
          >
            <Select.Trigger className="w-28" />
            <Select.Content>
              <Select.Item value="full-scan">Full Scan</Select.Item>
              <Select.Item value="limit">Limit</Select.Item>
            </Select.Content>
          </Select.Root>
          <div className="w-20">
            <TextField.Input
              disabled={scanMode === "full-scan"}
              type="number"
              size="2"
              placeholder="Limit"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
              }}
            />
          </div>
        </div>
      </Table.Cell>
      <Table.Cell>
        <Button
          color="cyan"
          variant="soft"
          disabled={isExported || isExporting}
          onClick={async () => {
            setIsExporting(true);
            const { data } = await refetch();
            const catalog = catalogs.find(
              (catalog) => catalog.id === table.catalogId
            );

            const tableInfo: TableSelectionInfo = {
              key: key,
              table: table,
              scanMode:
                scanMode === "full-scan"
                  ? TableSelectionScanMode.FULL_SCAN
                  : TableSelectionScanMode.LIMIT,
              limit: limit,
              isTableCached: data.isCached,
              catalog: catalog!,
            };

            onTableExported(tableInfo);
            setIsExporting(false);
          }}
        >
          Export
        </Button>
      </Table.Cell>
    </Table.Row>
  );
};

export default TableSelectionRow;
