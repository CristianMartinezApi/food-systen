export type GuidedAssemblyGroup = {
  id?: number | string;
  name: string;
  minSelections?: number;
  maxSelections?: number;
};

export type GuidedAssemblySelection = {
  groupId: number;
  optionIds: number[];
};

export function validateGuidedSelections(groups: GuidedAssemblyGroup[], selections: GuidedAssemblySelection[]) {
  const groupMap = new Map(groups.map((group) => [group.id, group]));

  for (const selection of selections) {
    const group = groupMap.get(selection.groupId);
    if (!group) continue;

    const selectedCount = selection.optionIds?.length || 0;
    const min = Number(group.minSelections ?? 0);
    const max = Number(group.maxSelections ?? selectedCount);

    if (selectedCount < min) {
      throw new Error(`Grupo "${group.name}" deve ter pelo menos ${min} seleção(ões).`);
    }

    if (selectedCount > max) {
      throw new Error(`Grupo "${group.name}" permite no máximo ${max} seleção(ões).`);
    }
  }

  for (const group of groups) {
    const matchingSelection = selections.find((selection) => selection.groupId === group.id);
    const selectedCount = matchingSelection?.optionIds?.length || 0;
    const min = Number(group.minSelections ?? 0);
    const max = Number(group.maxSelections ?? selectedCount);

    if (selectedCount < min) {
      throw new Error(`Grupo "${group.name}" deve ter pelo menos ${min} seleção(ões).`);
    }

    if (selectedCount > max) {
      throw new Error(`Grupo "${group.name}" permite no máximo ${max} seleção(ões).`);
    }
  }
}
