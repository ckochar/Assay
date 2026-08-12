function polygonPoints(polygon) {
  if (!Array.isArray(polygon) || polygon.length === 0) return [];
  if (typeof polygon[0] === "number") {
    const points = [];
    for (let index = 0; index + 1 < polygon.length; index += 2) {
      if (Number.isFinite(polygon[index]) && Number.isFinite(polygon[index + 1])) {
        points.push({ x: polygon[index], y: polygon[index + 1] });
      }
    }
    return points;
  }
  return polygon
    .filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y))
    .map((point) => ({ x: point.x, y: point.y }));
}

function boundsFromItems(items) {
  const points = items.flatMap((item) => polygonPoints(item?.polygon));
  if (!points.length) return null;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return [minX, minY, maxX, minY, maxX, maxY, minX, maxY];
}

function wordPosition(word, fallbackIndex) {
  const points = polygonPoints(word?.polygon);
  if (!points.length) return { x: fallbackIndex, y: 0, hasGeometry: false };
  return {
    x: Math.min(...points.map((point) => point.x)),
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
    hasGeometry: true,
  };
}

function lineTolerance(page) {
  if (String(page?.unit || "").toLowerCase() === "inch") return 0.12;
  if (Number.isFinite(page?.height) && page.height > 0) return page.height * 0.012;
  return 8;
}

export function ocrLinesForPage(page) {
  const providerLines = (page?.lines || []).filter((line) => String(line?.content || "").trim());
  if (providerLines.length) return providerLines.map((line) => ({ ...line, source: "provider-line" }));

  const words = (page?.words || []).filter((word) => String(word?.content || "").trim());
  if (!words.length) return [];

  const positioned = words.map((word, index) => ({ word, ...wordPosition(word, index) }));
  const withGeometry = positioned.filter((item) => item.hasGeometry);

  if (!withGeometry.length) {
    return [{
      content: words.map((word) => word.content).join(" "),
      polygon: null,
      source: "word-fallback",
      wordCount: words.length,
    }];
  }

  const tolerance = lineTolerance(page);
  const sorted = [...positioned].sort((left, right) => left.y - right.y || left.x - right.x);
  const groups = [];

  for (const item of sorted) {
    let target = groups.find((group) => Math.abs(group.y - item.y) <= tolerance);
    if (!target) {
      target = { y: item.y, items: [] };
      groups.push(target);
    }
    target.items.push(item);
    target.y = target.items.reduce((sum, value) => sum + value.y, 0) / target.items.length;
  }

  return groups
    .sort((left, right) => left.y - right.y)
    .map((group) => {
      const ordered = [...group.items].sort((left, right) => left.x - right.x);
      return {
        content: ordered.map((item) => item.word.content).join(" "),
        polygon: boundsFromItems(ordered.map((item) => item.word)),
        source: "word-fallback",
        wordCount: ordered.length,
      };
    });
}

export function ocrPageText(page) {
  return ocrLinesForPage(page).map((line) => line.content).join("\n");
}

export function hasProviderLines(page) {
  return (page?.lines || []).some((line) => String(line?.content || "").trim());
}
