export function clampPercent(value) {
  return Math.max(0, Math.min(100, Number(value || 0)));
}

export function pricedPercentageMap(work) {
  const items = Array.isArray(work?.items) ? work.items : [];
  const total = Number(work?.budget || 0)
    || items.reduce((sum, item) => sum + Number(item.budget || 0), 0);
  if (!items.length || total <= 0) return new Map();

  const rows = items.map((item) => ({
    id: item.id,
    value: Math.round((Number(item.budget || 0) / total * 100) * 100) / 100,
  }));
  const sum = rows.reduce((acc, row) => acc + row.value, 0);
  const last = rows.map((row) => row.value).lastIndexOf(
    [...rows].reverse().find((row) => row.value > 0)?.value,
  );
  const residual = Math.round((100 - sum) * 100) / 100;
  if (last >= 0 && Math.abs(residual) <= 0.25) {
    rows[last].value = Math.round((rows[last].value + residual) * 100) / 100;
  }
  return new Map(rows.map((row) => [row.id, row.value]));
}

export function itemPricedPercentage(work, item) {
  const explicit = Number(item?.pricedPercentage);
  if (Number.isFinite(explicit)) return clampPercent(explicit);
  return pricedPercentageMap(work).get(item?.id) || 0;
}

export function officializationsForItem(state, workId, itemId) {
  return (state?.measurementOfficializations || [])
    .filter((entry) =>
      entry.workId === workId
      && entry.itemId === itemId
      && entry.status !== "cancelled"
    )
    .sort((a, b) =>
      String(a.officializedAt || "").localeCompare(String(b.officializedAt || ""))
    );
}

export function itemOfficialPercentage(state, workId, itemId) {
  return clampPercent(officializationsForItem(state, workId, itemId).at(-1)?.percentage || 0);
}

export function workOfficialPercentage(state, work) {
  const total = Number(work?.budget || 0);
  if (!total) return 0;
  const executed = (work.items || []).reduce((sum, item) => {
    return sum + Number(item.budget || 0)
      * itemOfficialPercentage(state, work.id, item.id) / 100;
  }, 0);
  return Math.round((executed / total * 100) * 100) / 100;
}

export function measurementRows(state, work) {
  return (work.items || []).map((item) => {
    const entries = officializationsForItem(state, work.id, item.id);
    const percentage = itemOfficialPercentage(state, work.id, item.id);
    return {
      item,
      pricedPercentage: itemPricedPercentage(work, item),
      percentage,
      executedValue: Number(item.budget || 0) * percentage / 100,
      diaryCount: new Set(entries.map((entry) => entry.diaryEntryId).filter(Boolean)).size,
      note: entries.at(-1)?.administrativeNote || "",
    };
  });
}

export function formatPercent(value, digits = 2) {
  return `${clampPercent(value).toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}
