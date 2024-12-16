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
  
  let state = {

    canvasWidth: 0,
    canvasHeight: 0,
    originalWidth: 0,
    originalHeight: 0,

    MIN_DISTANCE: 5,
    MAX_DISTANCE: 33,

    GROWTH_INTERVAL: 50,
    TREE_SPAWN_INTERVAL: 3600,
    DIRECTION_CHANGE_INTERVAL: 1200,
    ANGLE_TRANSITION_DURATION: 800,

    lastTimestamp: 0,
    lastGrowthTime: 0,
    lastTreeSpawnTime: 0,
    lastDirectionChange: 0,
    angleTransitionStart: 0,

    baseAngleOffset: 0,
    targetAngleOffset: 0,

    branchPoints: {
      sun: [],
      moon: []
    },

    sunBranchPoints: [],
    mooonBranchPoints: [],

  };

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  let animationFrame;
  let dpr = window.devicePixelRatio || 1;

  function initializeTree(startX, startY, baseAngle, treeTag, shouldReplace) {
    //baseAngle = ensureAngleInView(startX, startY, baseAngle);

    let branch = {
        startX,
        startY,
        baseAngle,
        angle: baseAngle,
        length: state.canvasHeight * 0.4,
        width: 55,
        progress: 0,
        level: 0,
        ends: 1,
        children: [],
        tag: treeTag,
    };

    if (shouldReplace) {
        // Dynamically update the branch variable (if needed)
        if (treeTag === 'sun') {
            sunBranch = branch; // Ensure these variables exist
        } else if (treeTag === 'moon') {
            moonBranch = branch;
        }
    }

    // Dynamically push branch into the correct array
    if (state.branchPoints[treeTag]) {
        state.branchPoints[treeTag].push(branch);
    } else {
        console.warn(`Unknown treeTag: ${treeTag}`);
    }
  }



  //checks where and when to spawn trees lmao
  function checkTreeSpawn(timestamp, tag) {
    let tree = branchePoints[tag];
    let branch = tree[tree.length - 1];
    const x = branch.startX + Math.cos(branch.angle) * (branch.length * branch.progress);
    const y = branch.startY - Math.sin(branch.angle) * (branch.length * branch.progress);
    const angle = ensureAngleInView(x,y, branch.angle);
    initializeTree(x, y, angle, tag, true);
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
      level: parentBranch.level + 1,
      ends: 1,
      children: [],
      tag: treeTag
    };
  }

  function growBranches(timestamp) {

    if (Math.random() < 0.4) {
      state.branchPoints.forEach((branchArr) => {
        branchArr.forEach((branch) => {
          let tip = branch.ends;
          for(let i = 0; i < tip; i++ ){
            if (branch.progress < 1) {
              branch.progress += 0.02;
              if (branch.level < 4 && branch.progress > 0.3 && Math.random() < 0.1) {
                const newBranch = generateNewBranch(branch, branch.progress);
                branch.push(newBranch);
                if(branch.progress > 0.9){
                  branch.push({
                    startX,
                    startY,
                    baseAngle: parentBranch.baseAngle + baseSpread,
                    angle,
                    length: parentBranch.length * (0.6 + Math.random() * 0.3),
                    width: parentBranch.width,
                    progress: 0,
                    level: parentBranch.level + 1,
                    ends: 1,
                    children: [],
                    tag: treeTag
                  });
                }
                branch.ends += 1;
              }
            }
          }
        });
      });
    }

    state.branchPoints.forEach((branchArr) => {
      branchArr.forEach((branch) => {
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
            phase: Math.random() * Math.PI * 2,
            waveMagnitude: 2 + Math.random() * 2,
            movementScale: 2 + Math.random() * 2,
            index: pointIndex++,
            branchLevel: branch.level,
          };
          newPoints.push(point);
          state.activePointIndices.add(point.index);
        }
      });

    });


    const newBranch = generateNewBranch(branch, branch.progress);
    state.branchPoints.push(newBranch);
    removeOldestPointByBirthOrder(oldestBirth);
    finalizeRemovals();
  }

  function generateConnections() {
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
  
  function updatePoints(time) {
  }

  function updateDirections(timestamp) {
    state.baseAngleOffset = state.targetAngleOffset;
    state.targetAngleOffset = (Math.random() * 1.2 - 0.6);
    state.angleTransitionStart = timestamp;
    const currentOffset = getCurrentAngleOffset();
    state.branchPoints.forEach(branch => {
      branch.angle = branch.baseAngle + currentOffset;
      branch.angle = ensureAngleInView(branch.startX, branch.startY, branch.angle);
    });
  }

  function ensureAngleInView(x, y, angle) {
    const testDist = 200;
    const testX = x + Math.cos(angle) * testDist;
    const testY = y - Math.sin(angle) * testDist;
    const viewportTop = window.scrollY;
    const viewportBottom = window.scrollY + window.innerHeight;
    
    // Check if point would go outside canvas bounds
    if (testX < 0 || testX > state.canvasWidth) {
        // If going too far left or right, turn back towards center
        angle = testX < 0 ? 
            0 + (Math.random() * 0.6 - 0.3) :  // Turn right if too far left
            Math.PI + (Math.random() * 0.6 - 0.3);  // Turn left if too far right
    }
    
    // Check if point would go outside viewport
    if (testY < viewportTop) {
        // If going above viewport, angle downward
        angle = Math.PI * 1.5 + (Math.random() * 0.6 - 0.3);  // Point down (270° ± 17°)
    } else if (testY > viewportBottom) {
        // If going below viewport, angle upward
        angle = Math.PI * 0.5 + (Math.random() * 0.6 - 0.3);  // Point up (90° ± 17°)
    }
    
    // If point is far outside viewport, make more aggressive correction
    const margin = window.innerHeight * 0.7;
    if (y < viewportTop - margin) {
        // Way above viewport, force downward more strongly
        angle = Math.PI * 1.5 + (Math.random() * 0.3 - 0.15);  // More strictly down (270° ± 8°)
    } else if (y > viewportBottom + margin) {
        // Way below viewport, force upward more strongly
        angle = Math.PI * 0.5 + (Math.random() * 0.3 - 0.15);  // More strictly up (90° ± 8°)
    }
    
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

  function regressTree() {
    // For each tree type in branchPoints (e.g., 'sun', 'moon')
    for (const tag in state.branchPoints) {
      const branchArr = state.branchPoints[tag];
      
      // We'll create a new array that filters out fully pruned top-level branches.
      // This handles the possibility of even the top-level branches being removed.
      state.branchPoints[tag] = branchArr.filter(branch => !pruneBranch(branch));
    }
  }
  
  /**
   * pruneBranch attempts to prune children of the given branch from the ends inward.
   * Returns true if this branch should also be removed from its parent's children array, false otherwise.
   */
  function pruneBranch(branch) {
    if (!branch.children || branch.children.length === 0) {
      // This is a leaf branch (an end). Indicate it can be culled.
      return true;
    }
  
    // Try to prune children first. We'll keep only children that cannot be removed.
    branch.children = branch.children.filter(child => !pruneBranch(child));
  
    // After pruning children, if no children remain, this branch is now also a leaf and can be removed.
    if (branch.children.length === 0) {
      return true;
    }
  
    // If some children remain, we do not remove this branch.
    return false;
  }
  

  function extendCanvas() {
    // Get the current scroll position
    const scrollY = window.scrollY;
    
    // Get the viewport height
    const viewportHeight = window.innerHeight;
    
    // Calculate the total height needed (scroll position + viewport height)
    const totalHeightNeeded = scrollY + viewportHeight;
    
    // Only extend if we need more height
    if (totalHeightNeeded > state.canvasHeight) {
        // Store old dimensions
        const oldWidth = state.canvasWidth;
        const oldHeight = state.canvasHeight;
        
        // Update state dimensions (keep width same, extend height)
        state.canvasWidth = oldWidth;
        state.canvasHeight = totalHeightNeeded;
        
        // Update canvas size with DPR
        canvas.width = state.canvasWidth * dpr;
        canvas.height = state.canvasHeight * dpr;
        
        // Reset and scale for DPR
        ctx.resetTransform();
        ctx.scale(dpr, dpr);
        
        // Update background but only for the extended area
        ctx.fillStyle = getBackgroundColor();
        ctx.fillRect(0, oldHeight, state.canvasWidth, state.canvasHeight - oldHeight);
        
        // Update canvas style height
        canvas.style.height = `${state.canvasHeight}px`;
        
        // No need to update point positions since we're just extending downward
        // Tree positions and existing points remain unchanged
        
        // Update any relevant distance parameters
        state.MAX_DISTANCE = Math.min(33, Math.max(state.canvasWidth, state.canvasHeight) * 0.05);
        state.MIN_DISTANCE = Math.min(5, state.MAX_DISTANCE * 0.15);
        
        console.log(`Canvas extended to height: ${state.canvasHeight}`);
    }
  }

  function updateSize() {
    const rect = canvas.getBoundingClientRect();
    state.canvasWidth = rect.width;
    state.canvasHeight = rect.height;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.fillStyle = getBackgroundColor();
    ctx.fillRect(0, 0, state.canvasWidth, state.canvasHeight);

    //method to make sure trees are rendered within bounds
  }

  document.addEventListener('scroll', () => {
    requestAnimationFrame(extendCanvas);
  });
  
  function animate(timestamp) {
    updateDirections(timestamp);
    checkTreeSpawn(timestamp);
    growBranches(timestamp);
    updatePoints(timestamp * 0.001);
    const { lines } = generateConnections();
    drawFrame(state.points, lines);
    animationFrame = requestAnimationFrame(animate);
  }

  document.addEventListener('DOMContentLoaded', async () => {
  document.querySelector('.toggle-mode').addEventListener('click', () => {
      document.body.classList.toggle('light-mode');
      ctx.fillStyle = getBackgroundColor();
      ctx.fillRect(0, 0, state.canvasWidth, state.canvasHeight);
  });
  
  window.addEventListener('resize', updateSize);

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  state.originalHeight = canvas.height;
  state.originalWidth = canvas.width;

  updateSize();

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

  animationFrame = requestAnimationFrame(animate);
  });