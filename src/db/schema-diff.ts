/**
 * Schema diff — compares two database schemas and produces a diff result.
 * Runs in the main process only.
 */

import type {
  ColumnInfo,
  IndexInfo,
  ConstraintInfo,
  SchemaDiffResult,
  TableDiff,
  ColumnDiff,
  IndexDiff,
  ConstraintDiff,
  DiffStatus,
} from "../shared/types/database";
import type { DatabaseDriver } from "./types";

export async function computeSchemaDiff(
  sourceDriver: DatabaseDriver,
  sourceSchema: string,
  targetDriver: DatabaseDriver,
  targetSchema: string,
): Promise<SchemaDiffResult> {
  const [sourceTables, targetTables] = await Promise.all([
    sourceDriver.getTables(sourceSchema),
    targetDriver.getTables(targetSchema),
  ]);

  const sourceNames = new Set(sourceTables.map((t) => t.name));
  const targetNames = new Set(targetTables.map((t) => t.name));

  const allTableNames = new Set([...sourceNames, ...targetNames]);
  const tableDiffs: TableDiff[] = [];

  for (const tableName of allTableNames) {
    const inSource = sourceNames.has(tableName);
    const inTarget = targetNames.has(tableName);

    if (!inTarget) {
      // Table only in source → removed in target
      const structure = await sourceDriver.getTableStructure(sourceSchema, tableName);
      tableDiffs.push({
        tableName,
        status: "removed",
        columnDiffs: structure.columns.map((c) => ({
          columnName: c.name,
          status: "removed" as DiffStatus,
          sourceColumn: c,
        })),
        indexDiffs: structure.indexes.map((i) => ({
          indexName: i.name,
          status: "removed" as DiffStatus,
          sourceIndex: i,
        })),
        constraintDiffs: structure.constraints.map((c) => ({
          constraintName: c.name,
          status: "removed" as DiffStatus,
          sourceConstraint: c,
        })),
      });
    } else if (!inSource) {
      // Table only in target → added
      const structure = await targetDriver.getTableStructure(targetSchema, tableName);
      tableDiffs.push({
        tableName,
        status: "added",
        columnDiffs: structure.columns.map((c) => ({
          columnName: c.name,
          status: "added" as DiffStatus,
          targetColumn: c,
        })),
        indexDiffs: structure.indexes.map((i) => ({
          indexName: i.name,
          status: "added" as DiffStatus,
          targetIndex: i,
        })),
        constraintDiffs: structure.constraints.map((c) => ({
          constraintName: c.name,
          status: "added" as DiffStatus,
          targetConstraint: c,
        })),
      });
    } else {
      // Table in both — compare structures
      const [sourceStructure, targetStructure] = await Promise.all([
        sourceDriver.getTableStructure(sourceSchema, tableName),
        targetDriver.getTableStructure(targetSchema, tableName),
      ]);

      const columnDiffs = diffColumns(sourceStructure.columns, targetStructure.columns);
      const indexDiffs = diffIndexes(sourceStructure.indexes, targetStructure.indexes);
      const constraintDiffs = diffConstraints(
        sourceStructure.constraints,
        targetStructure.constraints,
      );

      const hasChanges =
        columnDiffs.some((d) => d.status !== "unchanged") ||
        indexDiffs.some((d) => d.status !== "unchanged") ||
        constraintDiffs.some((d) => d.status !== "unchanged");

      tableDiffs.push({
        tableName,
        status: hasChanges ? "modified" : "unchanged",
        columnDiffs,
        indexDiffs,
        constraintDiffs,
      });
    }
  }

  // Sort: removed first, then added, then modified, then unchanged
  const order: Record<DiffStatus, number> = {
    removed: 0,
    added: 1,
    modified: 2,
    unchanged: 3,
  };
  tableDiffs.sort((a, b) => order[a.status] - order[b.status]);

  return { tableDiffs, sourceSchema, targetSchema };
}

function diffColumns(
  source: ColumnInfo[],
  target: ColumnInfo[],
): ColumnDiff[] {
  const sourceMap = new Map(source.map((c) => [c.name, c]));
  const targetMap = new Map(target.map((c) => [c.name, c]));
  const allNames = new Set([...sourceMap.keys(), ...targetMap.keys()]);

  const diffs: ColumnDiff[] = [];
  for (const name of allNames) {
    const src = sourceMap.get(name);
    const tgt = targetMap.get(name);

    if (!tgt) {
      diffs.push({ columnName: name, status: "removed", sourceColumn: src });
    } else if (!src) {
      diffs.push({ columnName: name, status: "added", targetColumn: tgt });
    } else {
      const same =
        src.dataType === tgt.dataType &&
        src.nullable === tgt.nullable &&
        src.defaultValue === tgt.defaultValue &&
        src.isPrimaryKey === tgt.isPrimaryKey;
      diffs.push({
        columnName: name,
        status: same ? "unchanged" : "modified",
        sourceColumn: src,
        targetColumn: tgt,
      });
    }
  }
  return diffs;
}

function diffIndexes(
  source: IndexInfo[],
  target: IndexInfo[],
): IndexDiff[] {
  const sourceMap = new Map(source.map((i) => [i.name, i]));
  const targetMap = new Map(target.map((i) => [i.name, i]));
  const allNames = new Set([...sourceMap.keys(), ...targetMap.keys()]);

  const diffs: IndexDiff[] = [];
  for (const name of allNames) {
    const src = sourceMap.get(name);
    const tgt = targetMap.get(name);

    if (!tgt) {
      diffs.push({ indexName: name, status: "removed", sourceIndex: src });
    } else if (!src) {
      diffs.push({ indexName: name, status: "added", targetIndex: tgt });
    } else {
      const same =
        src.unique === tgt.unique &&
        src.primary === tgt.primary &&
        src.columns.length === tgt.columns.length &&
        src.columns.every((c, i) => c === tgt.columns[i]);
      diffs.push({
        indexName: name,
        status: same ? "unchanged" : "modified",
        sourceIndex: src,
        targetIndex: tgt,
      });
    }
  }
  return diffs;
}

function diffConstraints(
  source: ConstraintInfo[],
  target: ConstraintInfo[],
): ConstraintDiff[] {
  const sourceMap = new Map(source.map((c) => [c.name, c]));
  const targetMap = new Map(target.map((c) => [c.name, c]));
  const allNames = new Set([...sourceMap.keys(), ...targetMap.keys()]);

  const diffs: ConstraintDiff[] = [];
  for (const name of allNames) {
    const src = sourceMap.get(name);
    const tgt = targetMap.get(name);

    if (!tgt) {
      diffs.push({ constraintName: name, status: "removed", sourceConstraint: src });
    } else if (!src) {
      diffs.push({ constraintName: name, status: "added", targetConstraint: tgt });
    } else {
      const same =
        src.type === tgt.type &&
        src.columns.length === tgt.columns.length &&
        src.columns.every((c, i) => c === tgt.columns[i]) &&
        src.referencedTable === tgt.referencedTable;
      diffs.push({
        constraintName: name,
        status: same ? "unchanged" : "modified",
        sourceConstraint: src,
        targetConstraint: tgt,
      });
    }
  }
  return diffs;
}
