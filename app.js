// Content Loading Functions
async function loadContent() {
  try {
      // Define the content files - for GitHub Pages we need to list them explicitly
      const contentFiles = [
          'con_big_don.txt'
          // Add more files here as needed
      ];
      
      const contentArea = document.querySelector('.content');
      contentArea.innerHTML = ''; // Clear existing content
      
      // Create navigation links
      const navLinks = document.querySelector('nav div');
      navLinks.innerHTML = '<a href="#">Home</a>';
      
      for (let i = 0; i < contentFiles.length; i++) {
          const fileName = contentFiles[i];
          
          // Add navigation link
          const linkId = `post${i + 1}`;
          navLinks.innerHTML += `<a href="#${linkId}">${formatTitle(fileName)}</a>`;
          
          // Prevent horizontal scrolling
          document.addEventListener('wheel', (e) => {
              if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                  e.preventDefault();
              }
          }, { passive: false });

          try {
              // Fetch content file
              console.log('Fetching:', `content/${fileName}`); // Debug log
              const response = await fetch(`content/${fileName}`);
              
              if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
              }
              
              const content = await response.text();
              console.log('Content loaded:', content); // Debug log
              
              const postDiv = document.createElement('div');
              postDiv.className = 'post';
              postDiv.id = linkId;
              
              // Add title
              const title = document.createElement('h2');
              title.textContent = formatTitle(fileName);
              postDiv.appendChild(title);
              
              // Process paragraphs
              const paragraphs = content.split('::').filter(p => p.trim());
              paragraphs.forEach(p => {
                  const cleanContent = p.split(':/:')[0].trim();
                  if (cleanContent) {
                      const para = document.createElement('p');
                      para.textContent = cleanContent;
                      postDiv.appendChild(para);
                  }
              });
              
              contentArea.appendChild(postDiv);
              
              // Always add a horizontal rule after each post
              const hr = document.createElement('hr');
              contentArea.appendChild(hr);
              if (i < contentFiles.length - 1) {
                  const hr = document.createElement('hr');
                  contentArea.appendChild(hr);
              }
          } catch (error) {
              console.error(`Error loading ${fileName}:`, error);
              // Create error message in the content area
              const errorDiv = document.createElement('div');
              errorDiv.className = 'post error';
              errorDiv.innerHTML = `<h2>Error Loading Content</h2><p>Could not load ${fileName}: ${error.message}</p>`;
              contentArea.appendChild(errorDiv);
          }
      }
  } catch (error) {
      console.error('Error loading content:', error);
  }
}

function formatTitle(fileName) {
  return fileName
      .replace('.txt', '')
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
}

// Tree Animation State
let state = {
    points: [],
    staticPoints: [],
    MIN_DISTANCE: 5,
    MAX_DISTANCE: 33,
    activePointIndices: new Set(),
    POINTS_PER_GROWTH: 3,
    GROWTH_INTERVAL: 50,
    lastGrowthTime: 0,
    branchPoints: [],
    lastDirectionChange: 0,
    DIRECTION_CHANGE_INTERVAL: 1200,
    baseAngleOffset: 0,
    targetAngleOffset: 0,
    angleTransitionStart: 0,
    ANGLE_TRANSITION_DURATION: 800,
    canvasWidth: 0,
    canvasHeight: 0,
    lastTimestamp: 0,
    pointQueue: [],
    lastTreeSpawnTime: 0,
    TREE_SPAWN_INTERVAL: 3600,
    globalPointCounter: 0,
    treeInfo: [],
    activeTreeIndex: 0,
    enableCulling: true
};

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let animationFrame;
let dpr = window.devicePixelRatio || 1;

function updateSize() {
    const rect = canvas.getBoundingClientRect();
    state.canvasWidth = rect.width;
    state.canvasHeight = rect.height;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    //ctx.resetTransform();
    //ctx.scale(dpr, dpr);
    
    ctx.fillStyle = getBackgroundColor();
    ctx.fillRect(0, 0, state.canvasWidth, state.canvasHeight);
    
    resetTrees();
}

// [Previous tree animation functions remain the same]
function resetTrees() {
    state.points = [];
    state.staticPoints = [];
    state.activePointIndices.clear();
    state.branchPoints = [];
    state.treeInfo = [];
    state.pointQueue = [];
    state.globalPointCounter = 0;
    state.enableCulling = false;
    
    state.lastTreeSpawnTime = performance.now();
    
    initializeTree(
        state.canvasWidth * 0.5,
        state.canvasHeight * 0.5,
        0,
        true
    );
    
    initializeTree(
        state.canvasWidth * 0.5,
        state.canvasHeight * 0.5,
        Math.PI,
        true
    );
    
    state.activeTreeIndex = 0;
}

// [Rest of the tree animation functions remain the same as in original code]
function initializeTree(startX, startY, baseAngle, isActive) {
    baseAngle = ensureAngleInView(startX, startY, baseAngle);

    const treeIndex = state.treeInfo.length;
    state.treeInfo.push({
        rootX: startX,
        rootY: startY,
        angle: baseAngle,
        active: isActive
    });

    state.branchPoints.push({
        startX,
        startY,
        baseAngle,
        angle: baseAngle,
        length: state.canvasHeight * 0.4,
        width: 55,
        progress: 0,
        parentIndex: -1,
        level: 0,
        treeIndex: treeIndex
    });
}

function ensureAngleInView(x, y, angle) {
    const testDist = 200;
    const testX = x + Math.cos(angle) * testDist;
    const testY = y - Math.sin(angle) * testDist;
    if (testX < 0 || testX > state.canvasWidth || testY < 0 || testY > state.canvasHeight) {
      const turn = (Math.random() < 0.5 ? 1 : -1) * (135 * Math.PI / 180);
      angle += turn;
    }
    if((testY + (canvas.height * 0.7)) < window.scrollY){
          angle = (Math.random * .6 - 3) + (Math.PI * 1.5);
    }
    if((testY - (canvas.height * 0.7)) > window.scrollY){
      angle = (Math.random * .6 - 3) + (Math.PI / 2);
    }
    return angle;
  }

  function checkTreeSpawn(timestamp) {
    if (timestamp - state.lastTreeSpawnTime > state.TREE_SPAWN_INTERVAL && state.points.length > 0) {
      const randomPoint = state.points[Math.floor(Math.random() * state.points.length)];
      const angle = findAngleForNewTree(randomPoint.x, randomPoint.y);

      if (state.treeInfo[state.activeTreeIndex]) {
        state.treeInfo[state.activeTreeIndex].active = false;
      }
      if(randomPoint.x < 0 || randomPoint.x > canvas.width || randomPoint.y < 0 || canvas.height){
          let num = Math.random() < 0.5 ? Math.PI : 0;
          initializeTree(state.canvasWidth * 0.5, state.canvasHeight * 0.5, num, true);
          
      }else{
          initializeTree(randomPoint.x, randomPoint.y, angle, true);
      }
      state.activeTreeIndex = state.treeInfo.length - 1;
      state.enableCulling = true;
      state.lastTreeSpawnTime = timestamp;
    }
  }

  function findAngleForNewTree(x, y) {
    let closestBranch = null;
    let closestDist = Infinity;
    for (let b of state.branchPoints) {
      const dx = b.startX - x;
      const dy = b.startY - y;
      const dist = dx*dx + dy*dy;
      if (dist < closestDist) {
        closestDist = dist;
        closestBranch = b;
      }
    }
    let angle = closestBranch ? closestBranch.angle : Math.PI/2;
    angle = ensureAngleInView(x, y, angle);
    return angle;
  }

  function getCurrentAngleOffset() {
    const now = performance.now();
    const transitionProgress = Math.min(
      (now - state.angleTransitionStart) / state.ANGLE_TRANSITION_DURATION,
      1
    );
    return state.baseAngleOffset + (state.targetAngleOffset - state.baseAngleOffset) * transitionProgress;
  }

  function updateDirections(timestamp) {
    if (timestamp - state.lastDirectionChange > state.DIRECTION_CHANGE_INTERVAL) {
      state.lastDirectionChange = timestamp;
      state.baseAngleOffset = state.targetAngleOffset;
      // No scroll bias now. Just random.
      state.targetAngleOffset = (Math.random() * 1.2 - 0.6);
      state.angleTransitionStart = timestamp;
    }
    const currentOffset = getCurrentAngleOffset();
    state.branchPoints.forEach(branch => {
      branch.angle = branch.baseAngle + currentOffset;
      branch.angle = ensureAngleInView(branch.startX, branch.startY, branch.angle);
    });
  }

  function growBranches(timestamp) {
    if (timestamp - state.lastGrowthTime > state.GROWTH_INTERVAL) {
      state.lastGrowthTime = timestamp;

      state.branchPoints.forEach((branch) => {
        if (!state.treeInfo[branch.treeIndex].active) return;
        if (branch.progress < 1) {
          branch.progress += 0.02;
          if (branch.level < 4 && branch.progress > 0.3 && Math.random() < 0.1) {
            const newBranch = generateNewBranch(branch, branch.progress);
            state.branchPoints.push(newBranch);
          }
        }
      });

      let pointIndex = state.points.length;
      const newPoints = [];
      state.branchPoints.forEach(branch => {
        if (!state.treeInfo[branch.treeIndex].active) return;
        if (branch.progress < 1) {
          const x = branch.startX + Math.cos(branch.angle) * (branch.length * branch.progress);
          const y = branch.startY - Math.sin(branch.angle) * (branch.length * branch.progress);
          const point = {
            x,
            y,
            originalX: x,
            originalY: y,
            density: Math.max(0.3, 1 - branch.progress * 0.5),
            hue: 200 + Math.random() * 160,
            index: pointIndex++,
            phase: Math.random() * Math.PI * 2,
            waveMagnitude: 2 + Math.random() * 2,
            movementScale: 2 + Math.random() * 2,
            branchLevel: branch.level,
            treeIndex: branch.treeIndex,
            birthOrder: state.globalPointCounter++
          };
          newPoints.push(point);
          state.activePointIndices.add(point.index);
        }
      });

      if (newPoints.length > 0) {
        state.points.push(...newPoints);
        state.staticPoints.push(...newPoints.map(p => ({ ...p })));
        for (let p of newPoints) {
          state.pointQueue.push(p.birthOrder);
        }

        if (state.enableCulling) {
          for (let i = 0; i < newPoints.length; i++) {
            if (state.pointQueue.length > 0) {
              const oldestBirth = state.pointQueue.shift();
              removeOldestPointByBirthOrder(oldestBirth);
            }
          }
          finalizeRemovals();
        }
      }
    }
  }

  function generateNewBranch(parentBranch, parentProgress) {
    const spreadFactor = 1.8 + (parentBranch.level * 0.8);
    const baseSpread = (Math.random() * spreadFactor - spreadFactor/2);
    const currentAngleOffset = getCurrentAngleOffset();
    let angle = parentBranch.baseAngle + baseSpread + currentAngleOffset;
    const startX = parentBranch.startX + Math.cos(parentBranch.angle) * (parentBranch.length * parentProgress);
    const startY = parentBranch.startY - Math.sin(parentBranch.angle) * (parentBranch.length * parentProgress);
    angle = ensureAngleInView(startX, startY, angle);
    return {
      startX,
      startY,
      baseAngle: parentBranch.baseAngle + baseSpread,
      angle,
      length: parentBranch.length * (0.6 + Math.random() * 0.3),
      width: parentBranch.width,
      progress: 0,
      parentIndex: state.branchPoints.indexOf(parentBranch),
      level: parentBranch.level + 1,
      treeIndex: parentBranch.treeIndex
    };
  }

  let removalSet = new Set();
  function removeOldestPointByBirthOrder(birthOrder) {
    for (let p of state.points) {
      if (p.birthOrder === birthOrder) {
        removalSet.add(p.index);
        break;
      }
    }
  }

  function finalizeRemovals() {
    if (removalSet.size === 0) return;

    state.points = state.points.filter(p => !removalSet.has(p.index));
    state.staticPoints = state.staticPoints.filter(sp => !removalSet.has(sp.index));
    for (let rm of removalSet) {
      state.activePointIndices.delete(rm);
    }

    state.points.sort((a, b) => a.birthOrder - b.birthOrder);
    for (let i = 0; i < state.points.length; i++) {
      const p = state.points[i];
      p.index = i;
      state.staticPoints[i] = { ...state.staticPoints[i], index: i };
    }

    const newActive = new Set();
    for (let p of state.points) {
      if (state.activePointIndices.has(p.index)) {
        newActive.add(p.index);
      } else {
        newActive.add(p.index);
      }
    }
    state.activePointIndices = newActive;

    state.pointQueue = state.points.map(p => p.birthOrder);
    removalSet.clear();
  }

  function updatePoints(time) {
    for (let idx of state.activePointIndices) {
      if (idx >= state.points.length) continue;
      const point = state.points[idx];
      const basePoint = state.staticPoints[idx];
      const t = time + point.phase;
      const waveScale = Math.max(0.2, 1 - point.branchLevel * 0.2);
      point.x = basePoint.originalX + Math.sin(t * 2) * point.waveMagnitude * waveScale;
      point.y = basePoint.originalY + Math.cos(t * 2) * point.movementScale * waveScale;
    }

    // Occasionally deactivate points
    if (time % 5 < 0.1) {
      for (let index of state.activePointIndices) {
        if (Math.random() < 0.05) {
          state.activePointIndices.delete(index);
        }
      }
    }
  }

  function generateConnections() {
    const points = state.points;
    const lines = [];
    if (points.length === 0) return { lines };

    const cellSize = state.MAX_DISTANCE;
    const grid = new Map();

    function cellKey(cx, cy) {
      return `${cx},${cy}`;
    }

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (p.x < 0 || p.x > state.canvasWidth || p.y < 0 || p.y > state.canvasHeight) {
        continue;
      }
      const cx = Math.floor(p.x / cellSize);
      const cy = Math.floor(p.y / cellSize);
      const key = cellKey(cx, cy);
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(i);
    }

    const neighbors = [-1, 0, 1];
    for (let [key, cellIndices] of grid) {
      const [cx, cy] = key.split(',').map(Number);
      const candidateIndices = [];
      for (let nx of neighbors) {
        for (let ny of neighbors) {
          const nKey = cellKey(cx + nx, cy + ny);
          if (grid.has(nKey)) {
            candidateIndices.push(...grid.get(nKey));
          }
        }
      }

      for (let i = 0; i < cellIndices.length; i++) {
        const pIndex = cellIndices[i];
        const p = points[pIndex];
        for (let j = i + 1; j < cellIndices.length; j++) {
          const qIndex = cellIndices[j];
          const q = points[qIndex];
          const dx = q.x - p.x;
          const dy = q.y - p.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < state.MAX_DISTANCE * state.MAX_DISTANCE) {
            lines.push({ x1: p.x, y1: p.y, x2: q.x, y2: q.y, pIndex, qIndex });
          }
        }

        for (let qIndex of candidateIndices) {
          if (qIndex <= pIndex) continue;
          const q = points[qIndex];
          const dx = q.x - p.x;
          const dy = q.y - p.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < state.MAX_DISTANCE * state.MAX_DISTANCE) {
            lines.push({ x1: p.x, y1: p.y, x2: q.x, y2: q.y, pIndex, qIndex });
          }
        }
      }
    }

    return { lines };
  }

  function getBackgroundColor() {
    return document.body.classList.contains('light-mode') ? '#ffffff' : '#000000';
  }

  function getLineColorStyles(pointA, pointB, dist) {
    // In dark mode: highlight lines are white.
    // In light mode: highlight lines are black.
    const isLight = document.body.classList.contains('light-mode');
    const highlightColor = isLight ? '0,0,0' : '255,255,255';

    const alpha = (1 - dist / state.MAX_DISTANCE) * 0.4;
    const density = (pointA.density + pointB.density) / 2;

    const hue = (pointA.hue + pointB.hue) / 2;
    // If density > 0.85, use highlight color (white in dark mode, black in light mode)
    if (density > 0.85) {
      return {
        strokeStyle: `rgba(${highlightColor}, ${alpha * 0.6})`,
        lineWidth: Math.min(2.2 * density, 2.2) * (1 - dist / state.MAX_DISTANCE)
      };
    } else {
      // Iridescent color lines remain the same in both modes.
      return {
        strokeStyle: `hsla(${hue}, 80%, 75%, ${alpha * 0.8})`,
        lineWidth: Math.min(2.2 * density, 2.2) * (1 - dist / state.MAX_DISTANCE)
      };
    }
  }

  function drawFrame(points, lines) {
    ctx.fillStyle = document.body.classList.contains('light-mode')
      ? 'rgba(255, 255, 255, 0.1)'
      : 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, state.canvasWidth, state.canvasHeight);

    // No intersection checks, just draw behind text
    let filteredLines = lines;

    const MAX_LINES_DRAWN = 5000;
    if (filteredLines.length > MAX_LINES_DRAWN) {
      filteredLines = filteredLines.slice(0, MAX_LINES_DRAWN);
    }

    for (let i = 0; i < filteredLines.length; i++) {
      const line = filteredLines[i];
      const pointA = points[line.pIndex];
      const pointB = points[line.qIndex];

      const dx = pointB.x - pointA.x;
      const dy = pointB.y - pointA.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < state.MAX_DISTANCE) {
        const styles = getLineColorStyles(pointA, pointB, dist);
        ctx.beginPath();
        ctx.moveTo(pointA.x, pointA.y);
        ctx.lineTo(pointB.x, pointB.y);
        ctx.strokeStyle = styles.strokeStyle;
        ctx.lineWidth = styles.lineWidth;
        ctx.stroke();
      }
    }
  }

  function animate(timestamp) {
    updateDirections(timestamp);
    checkTreeSpawn(timestamp);
    growBranches(timestamp);
    updatePoints(timestamp * 0.001);
    const { lines } = generateConnections();
    drawFrame(state.points, lines);
    animationFrame = requestAnimationFrame(animate);
  }

// [Continue with all other tree animation functions from original code...]

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Document loaded, starting content load...'); // Debug log
  await loadContent();
  
  document.querySelector('.toggle-mode').addEventListener('click', () => {
      document.body.classList.toggle('light-mode');
      ctx.fillStyle = getBackgroundColor();
      ctx.fillRect(0, 0, state.canvasWidth, state.canvasHeight);
  });
  
  window.addEventListener('resize', updateSize);
  updateSize();
  animationFrame = requestAnimationFrame(animate);
});