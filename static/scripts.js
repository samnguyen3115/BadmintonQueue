const API_BASE_URL = "http://localhost:8000/api";

// Add new player
function addPlayer() {
  const playerName = document.getElementById("playerName").value.trim();
  const qualification = document.querySelector(
    'input[name="qualification"]:checked'
  ).value;

  const playerData = {
    name: playerName,
    qualification: qualification,
  };

  fetch(`${API_BASE_URL}/players`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(playerData),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((err) => {
          throw new Error(err.detail || "Failed to add player");
        });
      }
      return response.json();
    })
    .then((data) => {
      // Close modal and reset form
      $("#addPlayerModal").modal("hide");
      document.getElementById("addPlayerForm").reset();

      console.log(`Player ${data.name} added successfully`);
      loadPlayers();
    })
    .catch((error) => {
      console.error("Error adding player:", error);
      console.log(error.message, "danger");
    });
} // Setup event listeners
function setupEventListeners() {
  // Add player form submit
  document.getElementById("savePlayerBtn").addEventListener("click", addPlayer);
}
// Run after DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  loadPlayers();
  enableDropZones();
});

function loadPlayers() {
  fetch(`${API_BASE_URL}/players`)
    .then((response) => {
      if (!response.ok) throw new Error("Failed to fetch players");
      return response.json();
    })
    .then((players) => {
      // Clear current queues
      const advancedQueue = document.getElementById("player-queue");
      const intermediateQueue = document.getElementById("player-queue-right");
      advancedQueue.innerHTML = "";
      intermediateQueue.innerHTML = "";

      // Render each player
      players.forEach((player) => {
        const playerDiv = document.createElement("div");
        playerDiv.className = "player-card";
        playerDiv.dataset.id = player.id;
        playerDiv.draggable = true; // ✅ make draggable
        playerDiv.innerHTML = `
    <span class="player-name">${player.name}</span>
    <button class="edit-btn btn btn-sm btn-outline-primary">✏️</button>
  `;

        // Drag events
        playerDiv.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("text/plain", player.id);
          e.dataTransfer.setData("qualification", player.qualification);
        });

        // Attach edit button logic
        playerDiv.querySelector(".edit-btn").addEventListener("click", () => {
          openEditPlayerModal(player);
        });

        // Add to correct queue
        if (
          player.qualification === "A" ||
          player.qualification === "advanced"
        ) {
          advancedQueue.appendChild(playerDiv);
        } else {
          intermediateQueue.appendChild(playerDiv);
        }
      });
    })
    .catch((err) => {
      console.error("Error loading players:", err);
      showAlert("Failed to load players", "danger");
    });
}
function enableDropZones() {
  const dropZones = document.querySelectorAll(
    "#player-queue, #player-queue-right, .court-players"
  );

  dropZones.forEach((zone) => {
    // Allow drop
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.classList.add("highlight-drop"); // optional styling
    });

    zone.addEventListener("dragleave", () => {
      zone.classList.remove("highlight-drop");
    });

    // Handle drop
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("highlight-drop");

      const playerId = e.dataTransfer.getData("text/plain");
      const qualification = e.dataTransfer.getData("qualification");

      const playerCard = document.querySelector(`[data-id='${playerId}']`);
      if (playerCard) {
        zone.appendChild(playerCard);

        // Optional: update backend where the player is now
        updatePlayerLocation(playerId, zone.id, qualification);
      }
    });
  });
}
function updatePlayerLocation(
  playerId,
  courtID,
  
) {
  fetch(`${API_BASE_URL}/${courtId}/assign/${playerId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      player_id :  playerId,
      court_id : courtID
    }),
  })
    .then((res) => {
      if (!res.ok) throw new Error("Failed to update location");
      return res.json();
    })
    .then((data) => {
      console.log("Player moved:", data);
    })
    .catch((err) => {
      console.error("Error updating player location:", err);
      showAlert("Failed to move player", "danger");
    });
}
