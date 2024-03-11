function invertPolygons(polygons, boundingBox) {
  // Destructure the bounding box coordinates
  const [boxX1, boxY1, boxX2, boxY2] = boundingBox;
  // Start with the bounding box coordinates
  let invertedPoints = [[boxX1, boxY2], [boxX2, boxY2], [boxX2, boxY1], [boxX1, boxY1]];

  // Loop through each polygon
  polygons.forEach(poly => {
    // Starting point
    invertedPoints.push([0, poly[0][1]]);

    // Add the points of the polygon
    invertedPoints = invertedPoints.concat(poly);

    // Ending point
    invertedPoints.push(poly[0]);
    invertedPoints.push([0, poly[0][1]]);

    // Re-connect to the bounding box to start a new cut
    invertedPoints.push([boxX1, boxY1]);
  });

  // Return the points. Since JavaScript typically works with arrays of arrays for points,
  // there's no need to flatten the list as in Python.
  return invertedPoints;
}

function reverseArray(arr) {
  // Reverses the array in place
  return arr.reverse();
}

function pointsToCssClipPath(points) {
  // Map each point array to a string in the format "xpx ypx"
  const pointsStr = points.map(point => `${point[0]}px ${point[1]}px`).join(", ");
  // Return the formatted CSS clip-path string
  return `polygon(${pointsStr})`;
}

function applyClipPathDirectly(selector, clipPathString) {
  const element = document.querySelector(selector);
  if (element) {
    element.style.clipPath = clipPathString;
    // For cross-browser compatibility, you might also want to set the prefixed version
    element.style.webkitClipPath = clipPathString;
  } else {
    console.error('Element not found');
  }
}

function getOvalVertices(rectangleVertices) {
  let width = rectangleVertices[1][0] - rectangleVertices[0][0]
  let height = rectangleVertices[3][1] - rectangleVertices[0][1]

  // let numOfVertices = Math.floor((width * height) / 40)
  let numOfVertices = 100
  const angles = linspace(0, 2 * Math.PI, numOfVertices);

  const ellipsePoints = generateEllipsePoints(width, height, rectangleVertices, angles);
  return ellipsePoints;
}

function linspace(start, stop, num) {
  const step = (stop - start) / num;
  return Array.from({ length: num }, (_, i) => start + step * i);
}

function generateEllipsePoints(width, height, rectangleVertices, angles) {

  const ellipsePoints = angles.map(angle => {
    return [
      ((width / 2 * Math.cos(angle)) + (width / 2) + (rectangleVertices[0][0]) ),
      ((height / 2 * Math.sin(angle)) + (height / 2) + (rectangleVertices[0][1]) )
    ];
  });
  return ellipsePoints;
}

function doPolygonsOverlap(polygon1, polygon2) {
  function onSegment(p, q, r) {
    // Given three collinear points p, q, and r, checks if point q lies on line segment 'pr'
    return (
      q[0] <= Math.max(p[0], r[0]) && q[0] >= Math.min(p[0], r[0]) &&
      q[1] <= Math.max(p[1], r[1]) && q[1] >= Math.min(p[1], r[1])
    );
  }

  function orientation(p, q, r) {
    // Find orientation of ordered triplet (p, q, r)
    const val = ((q[1] - p[1]) * (r[0] - q[0])) - ((q[0] - p[0]) * (r[1] - q[1]));
    if (val === 0) { return 0; }  // Collinear
    return (val > 0) ? 1 : 2;  // Clock or counterclock wise
  }

  function doIntersect(p1, q1, p2, q2) {
    // Main function to check whether the line segment 'p1q1' and 'p2q2' intersect
    const o1 = orientation(p1, q1, p2);
    const o2 = orientation(p1, q1, q2);
    const o3 = orientation(p2, q2, p1);
    const o4 = orientation(p2, q2, q1);

    // General case
    if (o1 !== o2 && o3 !== o4) {
      return true;
    }

    // Special cases
    if (o1 === 0 && onSegment(p1, p2, q1)) return true;
    if (o2 === 0 && onSegment(p1, q2, q1)) return true;
    if (o3 === 0 && onSegment(p2, p1, q2)) return true;
    if (o4 === 0 && onSegment(p2, q1, q2)) return true;

    return false;  // Doesn't fall in any of the above cases
  }

  // Check if any of the edges intersect
  for (let i = 0; i < polygon1.length; i++) {
    for (let j = 0; j < polygon2.length; j++) {
      if (doIntersect(
        polygon1[i], polygon1[(i + 1) % polygon1.length],
        polygon2[j], polygon2[(j + 1) % polygon2.length]
      )) {
        return true;
      }
    }
  }

  return false;
}

function getAllVertices(x, y, width, height) {
  x1 = x
  y1 = y
  x2 = x + width
  y2 = y + height

  return [[x1, y1], [x2, y1], [x2, y2], [x1, y2]]
}

function getAllPolygons(shapeList){

  let polygons = [];

  for (let i =0; i < shapeList.length; i++) {
    if (shapeList[i]['shape'] == 'rectangle') {
      polygons.push(getAllVertices(shapeList[i]['x'], shapeList[i]['y'], shapeList[i]['width'], shapeList[i]['height']));
    }
    else if (shapeList[i]['shape'] == 'circle') {
      polygons.push(getOvalVertices(getAllVertices(shapeList[i]['x'], shapeList[i]['y'], shapeList[i]['width'], shapeList[i]['height'])));
    }
  }

  return polygons;
}

function invertPolygonsAndGetClipPath(polygons, pageWidth, pageHeight) {
  let invertedPoints =  invertPolygons(polygons, [0, 0, pageWidth, pageHeight]);

  return pointsToCssClipPath(invertedPoints);
}

function getMergedPolygon(polygon1, polygon2) {

  polygon1.push(polygon1[0]);
  polygon2.push(polygon2[0]);

  let polygonA = turf.polygon([polygon1]);
  let polygonB = turf.polygon([polygon2]);

  const unionedPolygon = turf.union(polygonA, polygonB);

  return unionedPolygon['geometry']['coordinates'][0];
}

function mergeAllPolygons(polygons) {
  let mergedPolygons = []; // This will store the final merged polygons
  let visited = new Array(polygons.length).fill(false); // Keep track of polygons that have been merged or checked

  // Helper function to merge a polygon with any overlapping ones
  function mergeWithOverlapping(currentPolygon, startIndex) {
    let merged = currentPolygon;
    for (let j = startIndex + 1; j < polygons.length; j++) {
      if (!visited[j] && doPolygonsOverlap(merged, polygons[j])) {
        merged = getMergedPolygon(merged, polygons[j]); // Merge overlapping polygons using your function
        visited[j] = true; // Mark this polygon as merged/visited
      }
    }
    return merged;
  }

  for (let i = 0; i < polygons.length; i++) {
    if (!visited[i]) {
      visited[i] = true; // Mark this polygon as visited
      let merged = mergeWithOverlapping(polygons[i], i);
      mergedPolygons.push(merged); // Add the merged polygon to the result
    }
  }

  // Return the merged and individual polygons
  return mergedPolygons;
}

function blurScreen(shapeList, pageWidth, pageHeight) {
  console.log(shapeList)
  let polygons = getAllPolygons(shapeList);
  let multiPolygon = mergeAllPolygons(polygons);

  let clipPath = invertPolygonsAndGetClipPath(multiPolygon, pageWidth, pageHeight);

  let polygonDiv = document.getElementById("polygon-div");
  applyClipPathDirectly("#polygon-div", clipPath);
}
