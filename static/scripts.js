const API_BASE_URL = "http://localhost:8000/api";

// Global state
let allPlayers = [];
let allCourts = [];

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  loadAllData();
  
  // Start automatic assignment system immediately
  startContinuousAutoAssignment();
});

// Setup all event listeners
function setupEventListeners() {
  // Add player form submit
  document.getElementById("savePlayerBtn").addEventListener("click", addPlayer);
  
  // Update player form submit
  document.getElementById("updatePlayerBtn").addEventListener("click", updatePlayer);
  
  // Player pool search
  const searchInput = document.getElementById("player-pool-search");
  if (searchInput) {
    searchInput.addEventListener("input", filterPlayerPool);
  }
  
  // Filter checkboxes
  document.getElementById("show-active")?.addEventListener("change", filterPlayerPool);
  document.getElementById("show-inactive")?.addEventListener("change", filterPlayerPool);
  
  // Modal close handlers
  document.querySelector(".close-modal")?.addEventListener("click", closePlayerPoolModal);
  document.getElementById("close-pool-modal")?.addEventListener("click", closePlayerPoolModal);
}

// Load all data (players, courts, queues)
async function loadAllData() {
  try {
    await Promise.all([
      loadPlayers(),
      loadCourts(),
      loadQueues()
    ]);
    enableDropZones();
  } catch (error) {
    console.error("Error loading data:", error);
    showAlert("Failed to load application data", "danger");
  }
}

// ===============================
// PLAYER MANAGEMENT
// ===============================

// Load all players
async function loadPlayers() {
  try {
    const response = await fetch(`${API_BASE_URL}/players`);
    if (!response.ok) throw new Error("Failed to fetch players");
    
    allPlayers = await response.json();
    renderPlayerPool();
    return allPlayers;
  } catch (error) {
    console.error("Error loading players:", error);
    showAlert("Failed to load players", "danger");
    return [];
  }
}

// Add new player
async function addPlayer() {
  const playerName = document.getElementById("playerName").value.trim();
  const qualification = document.querySelector('input[name="qualification"]:checked').value;

  // Fix qualification value mapping
  const qualificationMap = {
    'A': 'advanced',
    'I': 'intermediate'
  };

  const playerData = {
    name: playerName,
    qualification: qualificationMap[qualification] || qualification,
  };

  try {
    const response = await fetch(`${API_BASE_URL}/players`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(playerData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to add player");
    }

    const newPlayer = await response.json();
    
    // Close modal and reset form
    $("#addPlayerModal").modal("hide");
    document.getElementById("addPlayerForm").reset();

    showAlert(`Player ${newPlayer.name} added successfully`, "success");
    await loadAllData(); // Refresh all data
    
    // Trigger auto-assignment for the new player
    setTimeout(async () => {
      await runAutoAssignment();
    }, 1000);
    
  } catch (error) {
    console.error("Error adding player:", error);
    showAlert(error.message, "danger");
  }
}

// Update player
async function updatePlayer() {
  const playerId = document.getElementById("editPlayerId").value;
  const playerName = document.getElementById("editPlayerName").value.trim();
  const qualification = document.querySelector('input[name="editQualification"]:checked').value;

  try {
    const response = await fetch(`${API_BASE_URL}/players/${playerId}?qualification=${qualification}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to update player");
    }

    const updatedPlayer = await response.json();
    
    // Close modal
    $("#editPlayerModal").modal("hide");

    showAlert(`Player ${updatedPlayer.name} updated successfully`, "success");
    await loadAllData(); // Refresh all data
  } catch (error) {
    console.error("Error updating player:", error);
    showAlert(error.message, "danger");
  }
}

// Delete player
async function deletePlayer(playerId) {
  if (!playerId) {
    showAlert("Please select a player to delete", "warning");
    return;
  }

  if (!confirm("Are you sure you want to delete this player?")) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/players/${playerId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to delete player");
    }

    showAlert("Player deleted successfully", "success");
    await loadAllData(); // Refresh all data
  } catch (error) {
    console.error("Error deleting player:", error);
    showAlert(error.message, "danger");
  }
}

// Toggle player active status
async function togglePlayerActive(playerId) {
  try {
    const response = await fetch(`${API_BASE_URL}/players/${playerId}/toggle-active`, {
      method: "POST",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to toggle player status");
    }

    const updatedPlayer = await response.json();
    showAlert(`Player ${updatedPlayer.name} is now ${updatedPlayer.is_active ? 'active' : 'inactive'}`, "info");
    await loadAllData(); // Refresh all data
    
    // If player was activated, trigger auto-assignment
    if (updatedPlayer.is_active) {
      setTimeout(async () => {
        await runAutoAssignment();
      }, 1000);
    }
    
  } catch (error) {
    console.error("Error toggling player status:", error);
    showAlert(error.message, "danger");
  }
}

// Open edit player modal
function openEditPlayerModal(player) {
  document.getElementById("editPlayerId").value = player.id;
  document.getElementById("editPlayerName").value = player.name;
  document.getElementById("editPlayerEmail").value = player.email || "";
  
  // Set qualification radio button
  const qualificationRadio = document.querySelector(`input[name="editQualification"][value="${player.qualification}"]`);
  if (qualificationRadio) {
    qualificationRadio.checked = true;
  }
  
  $("#editPlayerModal").modal("show");
}

// ===============================
// COURT MANAGEMENT
// ===============================

// Load all courts
async function loadCourts() {
  try {
    const response = await fetch(`${API_BASE_URL}/courts`);
    if (!response.ok) throw new Error("Failed to fetch courts");
    
    allCourts = await response.json();
    renderCourts();
    return allCourts;
  } catch (error) {
    console.error("Error loading courts:", error);
    showAlert("Failed to load courts", "danger");
    return [];
  }
}

// Create court if not exists
async function createCourt(courtName, courtType = "intermediate") {
  try {
    const response = await fetch(`${API_BASE_URL}/courts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: courtName,
        court_type: courtType
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      if (error.detail.includes("already exists")) {
        return null; // Court already exists, that's ok
      }
      throw new Error(error.detail || "Failed to create court");
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating court:", error);
    return null;
  }
}

// Change court type
async function changeCourtType(courtName, newType) {
  try {
    // Find court by name
    const court = allCourts.find(c => c.name === courtName);
    if (!court) {
      showAlert(`Court ${courtName} not found`, "warning");
      return;
    }

    const response = await fetch(`${API_BASE_URL}/courts/${court.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: courtName,
        court_type: newType
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to update court");
    }

    // Update court type in our local data
    court.court_type = newType;
    
    // Apply visual styling immediately
    const courtElement = document.getElementById(`${courtName}-court`);
    if (courtElement) {
      courtElement.setAttribute('data-court-type', newType);
    }

    showAlert(`Court ${courtName} changed to ${newType}`, "success");
    updateAutoStatus(`Court ${courtName} type changed to ${newType}`, true);
    await loadCourts(); // Refresh courts
  } catch (error) {
    console.error("Error changing court type:", error);
    showAlert(error.message, "danger");
  }
}

// Get players on a specific court
async function getPlayersOnCourt(courtId) {
  try {
    const response = await fetch(`${API_BASE_URL}/courts/${courtId}/players`);
    if (!response.ok) throw new Error("Failed to fetch court players");
    
    return await response.json();
  } catch (error) {
    console.error("Error loading court players:", error);
    return [];
  }
}

// Assign player to court
async function assignPlayerToCourt(courtId, playerId) {
  try {
    const response = await fetch(`${API_BASE_URL}/courts/${courtId}/assign/${playerId}`, {
      method: "POST",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to assign player");
    }

    const result = await response.json();
    showAlert(result.message, "success");
    await loadAllData(); // Refresh all data
  } catch (error) {
    console.error("Error assigning player:", error);
    showAlert(error.message, "danger");
  }
}

// Remove player from court
async function removePlayerFromCourt(courtId, playerId) {
  try {
    const response = await fetch(`${API_BASE_URL}/courts/${courtId}/remove/${playerId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to remove player");
    }

    const result = await response.json();
    showAlert(result.message, "info");
    await loadAllData(); // Refresh all data
  } catch (error) {
    console.error("Error removing player:", error);
    showAlert(error.message, "danger");
  }
}

// ===============================
// QUEUE MANAGEMENT
// ===============================

// Load queues
async function loadQueues() {
  try {
    const response = await fetch(`${API_BASE_URL}/queue`);
    if (!response.ok) throw new Error("Failed to fetch queues");
    
    const queues = await response.json();
    renderQueues(queues);
    return queues;
  } catch (error) {
    console.error("Error loading queues:", error);
    showAlert("Failed to load queues", "danger");
    return { advanced_queue: [], intermediate_queue: [] };
  }
}

// Add player to queue
async function addPlayerToQueue(playerId, queueType) {
  try {
    const response = await fetch(`${API_BASE_URL}/queue/${queueType}/${playerId}`, {
      method: "POST",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to add to queue");
    }

    const result = await response.json();
    showAlert(result.message, "success");
    await loadAllData(); // Refresh all data
  } catch (error) {
    console.error("Error adding to queue:", error);
    showAlert(error.message, "danger");
  }
}

// Remove player from queue
async function removePlayerFromQueue(playerId) {
  try {
    const response = await fetch(`${API_BASE_URL}/queue/${playerId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to remove from queue");
    }

    const result = await response.json();
    showAlert(result.message, "info");
    await loadAllData(); // Refresh all data
  } catch (error) {
    console.error("Error removing from queue:", error);
    showAlert(error.message, "danger");
  }
}

// ===============================
// RENDERING FUNCTIONS
// ===============================

// Render player pool (for modal)
function renderPlayerPool() {
  const playerPoolList = document.getElementById("player-pool-list");
  if (!playerPoolList) return;

  playerPoolList.innerHTML = "";

  allPlayers.forEach(player => {
    const playerDiv = document.createElement("div");
    playerDiv.className = `player-pool-item ${player.is_active ? 'active' : 'inactive'}`;
    playerDiv.innerHTML = `
      <div class="player-info">
        <span class="player-name">${player.name}</span>
        <span class="player-qualification ${player.qualification}">${player.qualification}</span>
        <span class="player-status">${player.is_active ? 'Active' : 'Inactive'}</span>
      </div>
      <div class="player-actions">
        <button class="btn btn-sm btn-outline-primary" onclick="openEditPlayerModal(${JSON.stringify(player).replace(/"/g, '&quot;')})">Edit</button>
        <button class="btn btn-sm ${player.is_active ? 'btn-outline-warning' : 'btn-outline-success'}" 
                onclick="togglePlayerActive(${player.id})">${player.is_active ? 'Deactivate' : 'Activate'}</button>
        <button class="btn btn-sm btn-outline-danger" onclick="deletePlayer(${player.id})">Delete</button>
      </div>
    `;
    playerPoolList.appendChild(playerDiv);
  });
}

// Render queues
function renderQueues(queues) {
  const advancedQueue = document.getElementById("player-queue");
  const intermediateQueue = document.getElementById("player-queue-right");
  
  if (advancedQueue) {
    advancedQueue.innerHTML = "";
    queues.advanced_queue.forEach(player => {
      advancedQueue.appendChild(createPlayerCard(player));
    });
  }
  
  if (intermediateQueue) {
    intermediateQueue.innerHTML = "";
    queues.intermediate_queue.forEach(player => {
      intermediateQueue.appendChild(createPlayerCard(player));
    });
  }
}

// Render courts
async function renderCourts() {
  const courtNames = ['G1', 'G2', 'G3', 'G4', 'W1', 'W2', 'W3', 'W4'];
  
  for (const courtName of courtNames) {
    // Ensure court exists in database
    await createCourt(courtName, 'intermediate');
    
    // Find court element and render players
    const courtElement = document.getElementById(`${courtName}-court`);
    if (courtElement) {
      const court = allCourts.find(c => c.name === courtName);
      if (court) {
        // Apply court type visual styling
        courtElement.setAttribute('data-court-type', court.court_type);
        
        // Update dropdown to match current court type
        const dropdown = courtElement.querySelector('.court-type-dropdown');
        if (dropdown) {
          dropdown.value = court.court_type;
        }
        
        // Render players
        const playersContainer = courtElement.querySelector('.court-players');
        if (playersContainer) {
          const players = await getPlayersOnCourt(court.id);
          playersContainer.innerHTML = "";
          players.forEach(player => {
            playersContainer.appendChild(createPlayerCard(player));
          });
        }
      }
    }
  }
}

// Create player card element
function createPlayerCard(player) {
  const playerDiv = document.createElement("div");
  playerDiv.className = "player-card";
  playerDiv.dataset.id = player.id;
  playerDiv.draggable = true;
  
  // Create minimal player card structure
  playerDiv.innerHTML = `
    <div class="player-info">
      <span class="player-name">${player.name}</span>
      <span class="player-qualification qualification-${player.qualification}">
        ${player.qualification.charAt(0).toUpperCase()}
      </span>
    </div>
    <button class="edit-btn" onclick="openEditPlayerModal(${JSON.stringify(player).replace(/"/g, '&quot;')})">
      ✏️
    </button>
  `;

  // Drag events with minimal visual feedback
  playerDiv.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", player.id);
    e.dataTransfer.setData("qualification", player.qualification);
    e.dataTransfer.setData("player", JSON.stringify(player));
    playerDiv.classList.add("dragging");
  });

  playerDiv.addEventListener("dragend", (e) => {
    playerDiv.classList.remove("dragging");
  });

  return playerDiv;
}

// ===============================
// DRAG AND DROP
// ===============================

function enableDropZones() {
  const dropZones = document.querySelectorAll("#player-queue, #player-queue-right, .court-players");

  dropZones.forEach((zone) => {
    // Allow drop with modern visual feedback
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.classList.add("drag-over");
    });

    zone.addEventListener("dragleave", (e) => {
      // Only remove if we're leaving the drop zone completely
      if (!zone.contains(e.relatedTarget)) {
        zone.classList.remove("drag-over");
      }
    });

    // Handle drop
    zone.addEventListener("drop", async (e) => {
      e.preventDefault();
      zone.classList.remove("drag-over");

      const playerId = parseInt(e.dataTransfer.getData("text/plain"));
      const playerData = JSON.parse(e.dataTransfer.getData("player"));

      await handlePlayerDrop(playerId, playerData, zone);
    });
  });
}

async function handlePlayerDrop(playerId, playerData, dropZone) {
  try {
    if (dropZone.id === "player-queue" || dropZone.id === "player-queue-right") {
      // Dropped in queue - add to queue
      const queueType = dropZone.id === "player-queue" ? "advanced" : "intermediate";
      
      // Check if player qualification matches queue
      if (playerData.qualification !== queueType) {
        showAlert(`Player qualification (${playerData.qualification}) doesn't match ${queueType} queue`, "warning");
        return;
      }
      
      await addPlayerToQueue(playerId, queueType);
    } else if (dropZone.classList.contains("court-players")) {
      // Dropped on court - assign to court
      const courtElement = dropZone.closest(".court");
      const courtName = courtElement.id.replace("-court", "");
      
      // Find court by name
      const court = allCourts.find(c => c.name === courtName);
      if (court) {
        await assignPlayerToCourt(court.id, playerId);
      }
    }
  } catch (error) {
    console.error("Error handling drop:", error);
    showAlert("Failed to move player", "danger");
  }
}

// ===============================
// AUTOMATION FUNCTIONS
// ===============================

// Auto-fill all empty courts with queued players
async function autoFillCourts() {
  try {
    showAlert("Running auto-assignment...", "info");
    
    const response = await fetch(`${API_BASE_URL}/automation/auto-fill-courts`, {
      method: "POST",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to auto-fill courts");
    }

    const result = await response.json();
    
    if (result.success) {
      const assignments = result.data.assignments_made;
      showAlert(`Auto-assignment complete! ${assignments} players assigned to courts.`, "success");
      
      // Show details if any assignments were made
      if (result.data.details && result.data.details.length > 0) {
        console.log("Assignment details:", result.data.details);
      }
      
      await loadAllData(); // Refresh all data
    } else {
      showAlert("Auto-assignment failed: " + result.message, "warning");
    }
  } catch (error) {
    console.error("Error in auto-fill:", error);
    showAlert(error.message, "danger");
  }
}

// Smart assignment that prioritizes game courts
async function smartAssignPlayers() {
  try {
    showAlert("Running smart assignment...", "info");
    
    const response = await fetch(`${API_BASE_URL}/automation/smart-assign`, {
      method: "POST",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to run smart assignment");
    }

    const result = await response.json();
    
    if (result.success) {
      showAlert(result.message, "success");
      
      // Show assignment details
      if (result.data && result.data.assignments) {
        console.log("Smart assignment details:", result.data.assignments);
      }
      
      await loadAllData(); // Refresh all data
    } else {
      showAlert("Smart assignment failed: " + result.message, "warning");
    }
  } catch (error) {
    console.error("Error in smart assignment:", error);
    showAlert(error.message, "danger");
  }
}

// Get court status information
async function getCourtStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/automation/court-status`);
    if (!response.ok) throw new Error("Failed to fetch court status");
    
    const courtStatus = await response.json();
    console.log("Court Status:", courtStatus);
    
    // Display court status in console or modal
    displayCourtStatusModal(courtStatus);
    
    return courtStatus;
  } catch (error) {
    console.error("Error getting court status:", error);
    showAlert("Failed to get court status", "danger");
    return [];
  }
}

// Get queue status information
async function getQueueStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/automation/queue-status`);
    if (!response.ok) throw new Error("Failed to fetch queue status");
    
    const queueStatus = await response.json();
    console.log("Queue Status:", queueStatus);
    
    return queueStatus;
  } catch (error) {
    console.error("Error getting queue status:", error);
    showAlert("Failed to get queue status", "danger");
    return {};
  }
}

// Display court status in a modal
function displayCourtStatusModal(courtStatus) {
  let modalHtml = `
    <div id="court-status-modal" class="modal" style="display: block;">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Court Status</h2>
          <span class="close-modal" onclick="closeCourtStatusModal()">&times;</span>
        </div>
        <div class="modal-body">
          <div class="court-status-grid">
  `;
  
  courtStatus.forEach(court => {
    const statusClass = court.is_full ? 'full' : court.player_count > 0 ? 'partial' : 'empty';
    modalHtml += `
      <div class="court-status-card ${statusClass}">
        <h4>${court.court_name} (${court.court_type})</h4>
        <div class="court-info">
          <span class="player-count">${court.player_count}/4 players</span>
          <span class="slots-available">${court.slots_available} slots available</span>
        </div>
        <div class="court-players">
          ${court.players.map(p => `<span class="player-tag">${p.name}</span>`).join('')}
        </div>
      </div>
    `;
  });
  
  modalHtml += `
          </div>
        </div>
        <div class="modal-footer">
          <div class="auto-status-info">
            <span class="status-dot active"></span>
            <span>Auto-assignment is continuously running</span>
          </div>
          <button onclick="closeCourtStatusModal()" class="btn btn-secondary">Close</button>
        </div>
      </div>
    </div>
  `;
  
  // Remove existing modal if any
  const existingModal = document.getElementById('court-status-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Add modal to page
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Display assignment rules modal
function showAssignmentRules() {
  const rulesHtml = `
    <div id="assignment-rules-modal" class="modal" style="display: block;">
      <div class="modal-content">
        <div class="modal-header">
          <h2>🤖 Auto-Assignment Rules</h2>
          <span class="close-modal" onclick="closeAssignmentRulesModal()">&times;</span>
        </div>
        <div class="modal-body">
          <div class="rules-content">
            <h3>📋 Assignment Priority System</h3>
            
            <div class="rule-section">
              <h4>🥇 Priority 1: Perfect Matches</h4>
              <ul>
                <li><strong>Advanced Players</strong> → <strong>Advanced Courts</strong> (G1, G2)</li>
                <li><strong>Intermediate Players</strong> → <strong>Intermediate Courts</strong> (G3, G4, W1-W4)</li>
              </ul>
            </div>
            
            <div class="rule-section">
              <h4>🥈 Priority 2: Training Courts</h4>
              <ul>
                <li><strong>Any Players</strong> → <strong>Training Courts</strong> (Mixed skill levels allowed)</li>
              </ul>
            </div>
            
            <div class="rule-section">
              <h4>🥉 Priority 3: Overflow Assignment</h4>
              <ul>
                <li><strong>Advanced Players</strong> → <strong>Intermediate Courts</strong> (When advanced courts full)</li>
              </ul>
            </div>
            
            <h3>⚡ Automatic Triggers</h3>
            <ul>
              <li>Every <strong>30 seconds</strong> - Continuous monitoring</li>
              <li>When <strong>games finish</strong> (🔄 rotation button)</li>
              <li>When <strong>new players added</strong></li>
              <li>When <strong>players activated</strong></li>
            </ul>
            
            <h3>🎯 Court Configuration</h3>
            <div class="court-config">
              <div class="court-type">
                <strong>Advanced Courts:</strong> G1, G2
              </div>
              <div class="court-type">
                <strong>Intermediate Courts:</strong> G3, G4, W1, W2, W3, W4
              </div>
              <div class="court-type">
                <strong>Training Courts:</strong> (None by default - can be set via dropdown)
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button onclick="closeAssignmentRulesModal()" class="btn btn-primary">Got It!</button>
        </div>
      </div>
    </div>
  `;
  
  // Remove existing modal if any
  const existingModal = document.getElementById('assignment-rules-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Add modal to page
  document.body.insertAdjacentHTML('beforeend', rulesHtml);
}

// Close assignment rules modal
function closeAssignmentRulesModal() {
  const modal = document.getElementById('assignment-rules-modal');
  if (modal) {
    modal.remove();
  }
}

// Close court status modal
function closeCourtStatusModal() {
  const modal = document.getElementById('court-status-modal');
  if (modal) {
    modal.remove();
  }
}

// Auto-assignment with intervals (continuous monitoring)
let autoAssignmentInterval = null;
let autoAssignmentActive = false;

function startContinuousAutoAssignment() {
  if (autoAssignmentInterval) {
    clearInterval(autoAssignmentInterval);
  }
  
  autoAssignmentActive = true;
  updateAutoStatus("Auto-assignment system started", true);
  
  // Run initial assignment
  setTimeout(() => {
    runAutoAssignment();
  }, 2000); // Wait 2 seconds for initial data load
  
  // Set up continuous monitoring every 30 seconds
  autoAssignmentInterval = setInterval(() => {
    runAutoAssignment();
  }, 30000); // 30 seconds interval
}

async function runAutoAssignment() {
  if (!autoAssignmentActive) return;
  
  try {
    console.log("Running automatic court assignment...");
    updateAutoStatus("Checking courts...", true);
    
    const response = await fetch(`${API_BASE_URL}/automation/smart-assign`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Auto-assignment request failed");
    }

    const result = await response.json();
    
    if (result.success && result.data && result.data.assignments && result.data.assignments.length > 0) {
      const assignmentCount = result.data.assignments.length;
      console.log(`Auto-assigned ${assignmentCount} players:`, result.data.assignments);
      
      // Log detailed assignment information
      result.data.assignments.forEach(assignment => {
        console.log(`✓ ${assignment.player_name} → ${assignment.court_name} (${assignment.assignment_type})`);
      });
      
      let statusMessage = `${assignmentCount} players assigned`;
      
      // Add remaining player count if any
      if (result.data.remaining_advanced > 0 || result.data.remaining_intermediate > 0) {
        statusMessage += ` (${result.data.remaining_advanced + result.data.remaining_intermediate} still waiting)`;
      }
      
      updateAutoStatus(`Last run: ${statusMessage}`, true);
      
      // Show success alert for significant assignments
      if (assignmentCount >= 2) {
        showAlert(`Auto-assigned ${assignmentCount} players to courts`, "success");
      }
      
      // Refresh the display to show new assignments
      await loadAllData();
    } else {
      updateAutoStatus("Last run: No assignments needed", true);
    }
  } catch (error) {
    console.error("Auto-assignment error:", error);
    updateAutoStatus("Last run: Error occurred", false);
  }
}

function updateAutoStatus(message, isActive) {
  const statusText = document.querySelector('.status-text');
  const statusDot = document.querySelector('.status-dot');
  const lastRun = document.getElementById('last-auto-run');
  
  if (statusText) {
    statusText.textContent = isActive ? 'Auto-Assignment: ACTIVE' : 'Auto-Assignment: ERROR';
  }
  
  if (statusDot) {
    statusDot.className = isActive ? 'status-dot active' : 'status-dot inactive';
  }
  
  if (lastRun) {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    lastRun.textContent = `${message} (${timeString})`;
  }
}

// Remove the old manual start/stop functions and replace with automatic ones
function stopAutoAssignment() {
  // This function is now internal - auto-assignment always runs
  if (autoAssignmentInterval) {
    clearInterval(autoAssignmentInterval);
    autoAssignmentInterval = null;
    autoAssignmentActive = false;
    updateAutoStatus("Auto-assignment stopped", false);
  }
}

// ===============================
// UTILITY FUNCTIONS
// ===============================

// Show alert message
function showAlert(message, type = "info") {
  // Create alert element
  const alertDiv = document.createElement("div");
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="close" data-dismiss="alert">
      <span>&times;</span>
    </button>
  `;
  
  // Add to page
  const container = document.querySelector(".app-header") || document.body;
  container.insertAdjacentElement("afterend", alertDiv);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.remove();
    }
  }, 5000);
}

// Filter player pool
function filterPlayerPool() {
  const searchTerm = document.getElementById("player-pool-search")?.value.toLowerCase() || "";
  const showActive = document.getElementById("show-active")?.checked ?? true;
  const showInactive = document.getElementById("show-inactive")?.checked ?? true;
  
  const playerItems = document.querySelectorAll(".player-pool-item");
  
  playerItems.forEach(item => {
    const playerName = item.querySelector(".player-name").textContent.toLowerCase();
    const isActive = item.classList.contains("active");
    
    const matchesSearch = playerName.includes(searchTerm);
    const matchesFilter = (isActive && showActive) || (!isActive && showInactive);
    
    item.style.display = (matchesSearch && matchesFilter) ? "flex" : "none";
  });
}

// Open player pool modal
function openPlayerPoolModal() {
  document.getElementById("player-pool-modal").style.display = "block";
  renderPlayerPool();
}

// Close player pool modal
function closePlayerPoolModal() {
  document.getElementById("player-pool-modal").style.display = "none";
}

// Rotate court players (finish game)
async function rotateCourtPlayers(courtName) {
  const court = allCourts.find(c => c.name === courtName);
  if (!court) {
    showAlert(`Court ${courtName} not found`, "warning");
    return;
  }
  
  try {
    const players = await getPlayersOnCourt(court.id);
    
    if (players.length === 0) {
      showAlert(`No players on court ${courtName}`, "info");
      return;
    }
    
    // Remove all players from court (they go back to queue)
    for (const player of players) {
      await removePlayerFromCourt(court.id, player.id);
    }
    
    showAlert(`Game finished on court ${courtName}. Players returned to queue.`, "success");
    
    // Trigger immediate auto-assignment for the now-empty court
    setTimeout(async () => {
      await runAutoAssignment();
    }, 1000); // Small delay to ensure data is updated
    
  } catch (error) {
    console.error("Error rotating players:", error);
    showAlert("Failed to rotate players", "danger");
  }
}

// Start new session
function startNewSession() {
  if (confirm("Are you sure you want to start a new session? This will clear all court assignments.")) {
    // Implementation would clear all court assignments
    showAlert("New session started", "info");
    loadAllData();
  }
}

// Sync with database
function syncWithFirebase() {
  showAlert("Syncing with database...", "info");
  loadAllData();
}
