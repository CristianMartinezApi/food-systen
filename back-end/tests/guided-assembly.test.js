const test = require("node:test");
const assert = require("node:assert/strict");
const { validateGuidedSelections } = require("../src/utils/guided-assembly.js");

test("aceita seleção válida para grupos guiados", () => {
  const groups = [
    { id: 1, name: "Ingredientes Base", minSelections: 2, maxSelections: 2 },
    { id: 2, name: "Tipo de Queijo", minSelections: 1, maxSelections: 1 },
    { id: 3, name: "Complemento", minSelections: 1, maxSelections: 1 },
  ];

  const selections = [
    { groupId: 1, optionIds: [10, 11] },
    { groupId: 2, optionIds: [20] },
    { groupId: 3, optionIds: [30] },
  ];

  assert.doesNotThrow(() => validateGuidedSelections(groups, selections));
});

test("rejeita seleção fora do min/max", () => {
  const groups = [
    { id: 1, name: "Ingredientes Base", minSelections: 2, maxSelections: 2 },
    { id: 2, name: "Tipo de Queijo", minSelections: 1, maxSelections: 1 },
  ];

  const selections = [
    { groupId: 1, optionIds: [10] },
    { groupId: 2, optionIds: [20] },
  ];

  assert.throws(
    () => validateGuidedSelections(groups, selections),
    /pelo menos/,
  );
});
