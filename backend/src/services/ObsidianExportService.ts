import JSZip from 'jszip';
import type { GoalGraph, GoalNode } from '../models/graph.js';

export type ObsidianExportFile = {
  path: string;
  title: string;
  nodeId?: string;
  content: string;
};

export class ObsidianExportService {
  async createZip(graph: GoalGraph): Promise<Buffer> {
    const zip = new JSZip();
    const files = this.createFiles(graph);

    files.forEach((file) => {
      zip.file(file.path, file.content);
    });

    return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

  createFiles(graph: GoalGraph): ObsidianExportFile[] {
    const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
    const childrenByParent = new Map<string, GoalNode[]>();

    graph.nodes.forEach((node) => {
      if (!node.parentId) {
        return;
      }

      childrenByParent.set(node.parentId, [...(childrenByParent.get(node.parentId) ?? []), node]);
    });

    const fileNamesById = this.createFileNameMap(graph.nodes);
    const rootNodes = graph.nodes.filter((node) => !node.parentId);
    const files = graph.nodes.map((node) =>
      this.createGoalFile({
        node,
        parent: node.parentId ? nodeById.get(node.parentId) : undefined,
        children: childrenByParent.get(node.id) ?? [],
        fileNamesById
      })
    );

    files.unshift(this.createIndexFile(rootNodes, fileNamesById));
    return files;
  }

  private createGoalFile({
    node,
    parent,
    children,
    fileNamesById
  }: {
    node: GoalNode;
    parent?: GoalNode;
    children: GoalNode[];
    fileNamesById: Map<string, string>;
  }): ObsidianExportFile {
    const title = node.title || 'Untitled goal';
    const parentLink = parent ? wikiLink(fileNamesById.get(parent.id), parent.title) : undefined;
    const childLinks = children.map((child) => `- ${wikiLink(fileNamesById.get(child.id), child.title)}`);
    const content = [
      '---',
      `id: ${yamlString(node.id)}`,
      `title: ${yamlString(title)}`,
      `level: ${node.level ?? 0}`,
      parent ? `parent: ${yamlString(parent.id)}` : 'parent:',
      typeof node.progress === 'number' ? `progress: ${roundNumber(node.progress)}` : 'progress:',
      typeof node.size === 'number' ? `importance: ${roundNumber(node.size)}` : 'importance:',
      '---',
      '',
      `# ${title}`,
      '',
      node.description ? `${node.description}\n` : undefined,
      parentLink ? `Parent: ${parentLink}` : 'Parent: Root goal',
      '',
      '## Children',
      '',
      childLinks.length ? childLinks.join('\n') : 'No child goals.',
      '',
      '## Metadata',
      '',
      `- ID: \`${node.id}\``,
      `- Level: ${node.level ?? 0}`,
      `- Progress: ${typeof node.progress === 'number' ? `${Math.round(node.progress * 100)}%` : 'Not set'}`,
      `- Importance: ${typeof node.size === 'number' ? `${Math.round(node.size * 100)}%` : 'Not set'}`,
      ''
    ]
      .filter((line): line is string => typeof line === 'string')
      .join('\n');

    return {
      path: `goals/${fileNamesById.get(node.id)}.md`,
      title,
      nodeId: node.id,
      content
    };
  }

  private createIndexFile(rootNodes: GoalNode[], fileNamesById: Map<string, string>): ObsidianExportFile {
    const rootLinks = rootNodes.map((node) => `- ${wikiLink(fileNamesById.get(node.id), node.title)}`);
    const content = ['# Goalscape Export', '', '## Root Goals', '', rootLinks.length ? rootLinks.join('\n') : 'No root goals found.', ''].join(
      '\n'
    );

    return {
      path: 'index.md',
      title: 'Goalscape Export',
      content
    };
  }

  private createFileNameMap(nodes: GoalNode[]): Map<string, string> {
    const usedNames = new Map<string, number>();
    const fileNamesById = new Map<string, string>();

    nodes.forEach((node) => {
      const baseName = sanitizeFileName(node.title || 'Untitled goal') || 'Untitled goal';
      const existingCount = usedNames.get(baseName) ?? 0;
      usedNames.set(baseName, existingCount + 1);
      fileNamesById.set(node.id, existingCount ? `${baseName} ${existingCount + 1}` : baseName);
    });

    return fileNamesById;
  }
}

function sanitizeFileName(value: string): string {
  return value
    .replace(/[\\/:*?"<>|#^[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 96);
}

function wikiLink(fileName: string | undefined, label: string): string {
  const target = fileName ?? sanitizeFileName(label);
  return `[[goals/${target}|${label}]]`;
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}

function roundNumber(value: number): number {
  return Math.round(value * 10000) / 10000;
}
