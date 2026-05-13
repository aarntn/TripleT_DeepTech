export function fmtRM(value) {
  return `RM ${Math.round(value).toLocaleString()}`;
}

export function fmtKwh(value) {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)} GWh`;
  }

  if (Math.abs(value) >= 1_000) {
    return `${Math.round(value / 1_000).toLocaleString()} MWh`;
  }

  return `${Math.round(value).toLocaleString()} kWh`;
}

export function fmtPayback(value) {
  if (!Number.isFinite(value)) {
    return { display: "N/A", label: "No positive annual net benefit" };
  }

  return {
    display: `${value.toFixed(1)} years`,
    label: value <= 3 ? "Commercially attractive" : "Longer recovery cycle",
  };
}
