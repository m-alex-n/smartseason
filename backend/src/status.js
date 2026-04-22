const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysSince(date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return Math.floor((Date.now() - d.getTime()) / MS_PER_DAY);
}

function expectedStageForDays(days) {
  if (days <= 14) return "PLANTED";
  if (days <= 60) return "GROWING";
  if (days <= 90) return "READY";
  return "HARVESTED";
}

function stageMaxDays(stage) {
  switch (stage) {
    case "PLANTED":
      return 14;
    case "GROWING":
      return 60;
    case "READY":
      return 90;
    case "HARVESTED":
      return Infinity;
    default:
      return 14;
  }
}

function stageOrder(stage) {
  switch (stage) {
    case "PLANTED":
      return 0;
    case "GROWING":
      return 1;
    case "READY":
      return 2;
    case "HARVESTED":
      return 3;
    default:
      return 0;
  }
}

function computeFieldStatus(field) {
  if (field.currentStage === "HARVESTED") return "COMPLETED";

  const days = daysSince(field.plantingDate);
  const expected = expectedStageForDays(days);

  // If the field is behind expected stage and overdue by >14 days, consider it at risk.
  // "Overdue" here means that based on planting date the expected stage advanced,
  // but the field hasn't progressed to that stage yet.
  const behind = stageOrder(field.currentStage) < stageOrder(expected);
  const overdueByDays = days - stageMaxDays(field.currentStage);
  const atRisk = behind && overdueByDays > 14;

  return atRisk ? "AT_RISK" : "ACTIVE";
}

module.exports = { computeFieldStatus };

