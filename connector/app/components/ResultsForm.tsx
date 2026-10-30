import { Box, Button, Heading, ScrollArea, Table } from "@radix-ui/themes";
import React from "react";
import { TableSelectionInfo, TableSelectionScanMode } from "../types/types";
import Spinner from "./Spinner";
import { EXPORTING_TABLES_MESSAGE } from "../config/config";

export interface ResultsFormProps {
  tableSelection: Map<string, TableSelectionInfo>;
  onFinish: (tableSelections: TableSelectionInfo[]) => void;
  onBackClicked: () => void;
  isSubmitting: boolean;
}

const ResultsForm = ({
  tableSelection,
  onFinish,
  onBackClicked,
  isSubmitting,
}: ResultsFormProps) => {
  return (
    <div className="flex justify-center items-center w-full mt-44">
      <Box height="100%" width={"100%"}>
        <div className="flex flex-col items-center justify-center w-full">
          {isSubmitting ? (
            <div>
              <Spinner message={EXPORTING_TABLES_MESSAGE} isFullScreen={true} />
            </div>
          ) : (
            <>
              <div className="mb-14">
                <Heading>Exported Table Summary</Heading>
              </div>
              <ScrollArea
                type="auto"
                scrollbars="both"
                style={{ height: 400, width: "100%" }}
              >
                <Box p="8" width={"100%"}>
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
                          </Table.Row>
                        );
                      })}
                    </Table.Body>
                  </Table.Root>
                </Box>
              </ScrollArea>
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
                    const tableSelections: TableSelectionInfo[] = [];
                    Array.from(tableSelection.keys()).map(async (key) => {
                      const selection = tableSelection.get(key);
                      if (selection) {
                        tableSelections.push(selection);
                      }
                    });
                    onFinish(tableSelections);
                  }}
                >
                  Finish
                </Button>
              </div>
            </>
          )}
        </div>
      </Box>
    </div>
  );
};

export default ResultsForm;
