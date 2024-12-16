  let state = {
    points: [],
    staticPoints: [],
    MIN_DISTANCE: 5,
    MAX_DISTANCE: 33,
    activePointIndices: new Set(),
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
    removalSet: new Set(),

    originalWidth: 0,
    originalHeight: 0
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
    
    ctx.fillStyle = getBackgroundColor();
    ctx.fillRect(0, 0, state.canvasWidth, state.canvasHeight);

    //method to make sure trees are rendered within bounds
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

  // Add scroll event listener
  document.addEventListener('scroll', () => {
    requestAnimationFrame(extendCanvas);
  });

  // Also call it on initial load to set correct size
  //window.addEventListener('load', extendCanvas);


  function resetTrees() { //might not be needed rn
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
  }

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
        level: 0,
    });

  }

  //checks where and when to spawn trees lmao
  function checkTreeSpawn(timestamp) {

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


  function findAngleForNewTree(x, y) {
    angle = ensureAngleInView(x, y, angle);
  }

  //
  function getCurrentAngleOffset() {
    const now = performance.now();
    const transitionProgress = Math.min(
      (now - state.angleTransitionStart) / state.ANGLE_TRANSITION_DURATION,
      1
    );
    return state.baseAngleOffset + (state.targetAngleOffset - state.baseAngleOffset) * transitionProgress;
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

  function growBranches(timestamp) {
      const newBranch = generateNewBranch(branch, branch.progress);
      state.branchPoints.push(newBranch);
      removeOldestPointByBirthOrder(oldestBirth);
      finalizeRemovals();
  }

  function generateNewBranch(parentBranch, parentProgress) {
    const currentAngleOffset = getCurrentAngleOffset();
    angle = ensureAngleInView(startX, startY, angle);
  }

  function removeOldestPointByBirthOrder(birthOrder) {
  }

  function finalizeRemovals() {
    removalSet.clear();
  }

  function updatePoints(time) {
  }

  function generateConnections() {
  }

  function getBackgroundColor() {
    return document.body.classList.contains('light-mode') ? '#ffffff' : '#000000';
  }

  function getLineColorStyles(pointA, pointB, dist) {
  }

  function drawFrame(points, lines) {
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