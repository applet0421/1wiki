import type { Prisma, PrismaClient } from "@prisma/client";
import { parsePromptKey, type PromptKey } from "./prompt-definitions";
import { validatePromptTemplate } from "./prompt-template";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export type ActivePrompt = {
  definitionId: string;
  versionId: string;
  key: PromptKey;
  name: string;
  description: string;
  allowedVariables: string[];
  requiredVariables: string[];
  versionNumber: number;
  systemTemplate: string;
  userTemplate: string;
};

type VersionInput = {
  key: PromptKey;
  baseVersionNumber: number;
  systemTemplate: string;
  userTemplate: string;
  createdById: string;
};

type RestoreInput = {
  key: PromptKey;
  sourceVersionNumber: number;
  baseVersionNumber: number;
  createdById: string;
};

function stringArray(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error("Prompt 變數設定不正確。");
  }
  return value;
}

async function findDefinition(client: DatabaseClient, key: PromptKey) {
  const definition = await client.promptDefinition.findUnique({ where: { key } });
  if (!definition) throw new Error("找不到 Prompt。");
  return definition;
}

export async function getActivePrompt(client: DatabaseClient, key: PromptKey): Promise<ActivePrompt> {
  const definition = await findDefinition(client, key);
  const version = await client.promptVersion.findUnique({
    where: {
      promptDefinitionId_versionNumber: {
        promptDefinitionId: definition.id,
        versionNumber: definition.activeVersionNumber,
      },
    },
  });
  if (!version) throw new Error("Prompt 沒有可用版本。");
  return {
    definitionId: definition.id,
    versionId: version.id,
    key: parsePromptKey(definition.key),
    name: definition.name,
    description: definition.description,
    allowedVariables: stringArray(definition.allowedVariables),
    requiredVariables: stringArray(definition.requiredVariables),
    versionNumber: version.versionNumber,
    systemTemplate: version.systemTemplate,
    userTemplate: version.userTemplate,
  };
}

async function createInsideTransaction(client: Prisma.TransactionClient, input: VersionInput): Promise<ActivePrompt> {
  const definition = await findDefinition(client, input.key);
  if (definition.activeVersionNumber !== input.baseVersionNumber) {
    throw new Error("Prompt 已被其他管理員更新，請重新載入。");
  }
  const allowedVariables = stringArray(definition.allowedVariables);
  const requiredVariables = stringArray(definition.requiredVariables);
  validatePromptTemplate({ ...input, allowedVariables, requiredVariables });
  const versionNumber = definition.activeVersionNumber + 1;
  const version = await client.promptVersion.create({
    data: {
      promptDefinitionId: definition.id,
      versionNumber,
      systemTemplate: input.systemTemplate,
      userTemplate: input.userTemplate,
      createdById: input.createdById,
    },
  });
  const updated = await client.promptDefinition.updateMany({
    where: { id: definition.id, activeVersionNumber: input.baseVersionNumber },
    data: { activeVersionNumber: versionNumber },
  });
  if (updated.count !== 1) throw new Error("Prompt 已被其他管理員更新，請重新載入。");
  return {
    definitionId: definition.id,
    versionId: version.id,
    key: input.key,
    name: definition.name,
    description: definition.description,
    allowedVariables,
    requiredVariables,
    versionNumber,
    systemTemplate: version.systemTemplate,
    userTemplate: version.userTemplate,
  };
}

export async function createPromptVersion(client: PrismaClient, input: VersionInput): Promise<ActivePrompt> {
  return client.$transaction((transaction) => createInsideTransaction(transaction, input));
}

export async function restorePromptVersion(client: PrismaClient, input: RestoreInput): Promise<ActivePrompt> {
  return client.$transaction(async (transaction) => {
    const definition = await findDefinition(transaction, input.key);
    if (definition.activeVersionNumber !== input.baseVersionNumber) {
      throw new Error("Prompt 已被其他管理員更新，請重新載入。");
    }
    const source = await transaction.promptVersion.findFirst({
      where: { promptDefinitionId: definition.id, versionNumber: input.sourceVersionNumber },
    });
    if (!source) throw new Error("找不到要回復的 Prompt 版本。");
    return createInsideTransaction(transaction, {
      key: input.key,
      baseVersionNumber: input.baseVersionNumber,
      systemTemplate: source.systemTemplate,
      userTemplate: source.userTemplate,
      createdById: input.createdById,
    });
  });
}

export async function listPromptDefinitions(client: DatabaseClient) {
  return client.promptDefinition.findMany({ orderBy: { name: "asc" } });
}

export async function getPromptDetail(client: DatabaseClient, key: PromptKey) {
  const active = await getActivePrompt(client, key);
  const versions = await client.promptVersion.findMany({
    where: { promptDefinitionId: active.definitionId },
    include: { createdBy: { select: { displayName: true } } },
    orderBy: { versionNumber: "desc" },
  });
  return { active, versions };
}
