// API Base URL
const API_BASE_URL = 'http://localhost:8000/api';

// Global variables
let showInactivePlayers = false;

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the application
    initApp();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup sortable queues
    setupSortableQueues();
});

// Initialize the application
function initApp() {
    // Load all data
    loadCourts();
    loadPlayers();
    loadQueues();
}

// Setup event listeners
function setupEventListeners() {
    // Add player form submit
    document.getElementById('savePlayerBtn').addEventListener('click', addPlayer);
    
    // Update player form submit
    document.getElementById('updatePlayerBtn').addEventListener('click', updatePlayer);
    
    // Toggle inactive players
    document.getElementById('toggleInactivePlayers').addEventListener('click', toggleInactivePlayers);
}

// Setup sortable queues
function setupSortableQueues() {
    // Advanced queue
    new Sortable(document.getElementById('advanced-queue'), {
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: function() {
            updateQueueOrder('advanced');
        }
    });
    
    // Intermediate queue
    new Sortable(document.getElementById('intermediate-queue'), {
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: function() {
            updateQueueOrder('intermediate');
        }
    });
}

// Load courts data
function loadCourts() {
    fetch(`${API_BASE_URL}/courts`)
        .then(response => response.json())
        .then(courts => {
            renderCourts(courts);
        })
        .catch(error => {
            console.error('Error fetching courts:', error);
            showAlert('Error loading courts', 'danger');
        });
}

// Load players data
function loadPlayers() {
    fetch(`${API_BASE_URL}/players`)
        .then(response => response.json())
        .then(players => {
            renderPlayers(players);
        })
        .catch(error => {
            console.error('Error fetching players:', error);
            showAlert('Error loading players', 'danger');
        });
}

// Load queues data
function loadQueues() {
    fetch(`${API_BASE_URL}/queue`)
        .then(response => response.json())
        .then(data => {
            renderQueue('advanced', data.advanced_queue);
            renderQueue('intermediate', data.intermediate_queue);
        })
        .catch(error => {
            console.error('Error fetching queues:', error);
            showAlert('Error loading queues', 'danger');
        });
}

// Render courts
function renderCourts(courts) {
    const courtsContainer = document.getElementById('courts-container');
    
    if (courts.length === 0) {
        courtsContainer.innerHTML = '<div class="alert alert-info">No courts available</div>';
        return;
    }
    
    courtsContainer.innerHTML = '';
    
    courts.forEach(court => {
        // Create court details element
        const courtElement = document.createElement('div');
        courtElement.className = 'court-card';
        courtElement.innerHTML = `
            <div class="court-name">
                ${court.name}
                <span class="court-type type-${court.court_type}">${court.court_type}</span>
                <button class="btn btn-sm btn-outline-primary float-right" 
                    onclick="loadCourtDetails(${court.id})">
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
            </div>
            <div id="court-players-${court.id}" class="court-players">
                <div class="text-center">
                    <div class="spinner-border spinner-border-sm" role="status">
                        <span class="sr-only">Loading...</span>
                    </div>
                </div>
            </div>
            <div class="mt-2">
                <button class="btn btn-sm btn-danger" onclick="clearCourt(${court.id})">
                    <i class="fas fa-users-slash"></i> Clear Court
                </button>
            </div>
        `;
        
        courtsContainer.appendChild(courtElement);
        
        // Load court details (players on this court)
        loadCourtDetails(court.id);
    });
}

// Load court details
function loadCourtDetails(courtId) {
    fetch(`${API_BASE_URL}/courts/${courtId}`)
        .then(response => response.json())
        .then(court => {
            renderCourtPlayers(courtId, court.players);
        })
        .catch(error => {
            console.error(`Error fetching details for court ${courtId}:`, error);
            document.getElementById(`court-players-${courtId}`).innerHTML = 
                '<div class="alert alert-danger">Error loading court details</div>';
        });
}

// Render players on a court
function renderCourtPlayers(courtId, players) {
    const courtPlayersElement = document.getElementById(`court-players-${courtId}`);
    
    if (players.length === 0) {
        courtPlayersElement.innerHTML = '<div class="alert alert-info">No players on this court</div>';
        return;
    }
    
    courtPlayersElement.innerHTML = '';
    
    players.forEach(player => {
        const playerElement = document.createElement('div');
        playerElement.className = 'player-card mb-2';
        playerElement.innerHTML = `
            <span class="player-name">${player.name}</span>
            <span class="player-qualification qualification-${player.qualification}">
                ${player.qualification}
            </span>
            <div class="float-right">
                <button class="btn btn-sm btn-outline-danger" 
                    onclick="removePlayerFromCourt(${courtId}, ${player.id})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        courtPlayersElement.appendChild(playerElement);
    });
}

// Render players
function renderPlayers(players) {
    const playersContainer = document.getElementById('players-container');
    
    if (players.length === 0) {
        playersContainer.innerHTML = '<div class="alert alert-info">No players available</div>';
        return;
    }
    
    playersContainer.innerHTML = '';
    
    // First, separate active and inactive players
    const activePlayers = players.filter(player => player.is_active);
    const inactivePlayers = players.filter(player => !player.is_active);
    
    // Render active players
    activePlayers.forEach(player => {
        playersContainer.appendChild(createPlayerElement(player));
    });
    
    // Render inactive players (if showing)
    if (showInactivePlayers) {
        if (inactivePlayers.length > 0) {
            const inactiveHeader = document.createElement('h5');
            inactiveHeader.className = 'mt-4 mb-3';
            inactiveHeader.innerText = 'Inactive Players';
            playersContainer.appendChild(inactiveHeader);
            
            inactivePlayers.forEach(player => {
                playersContainer.appendChild(createPlayerElement(player));
            });
        }
    }
}

// Create player element
function createPlayerElement(player) {
    const playerElement = document.createElement('div');
    playerElement.className = `player-card ${!player.is_active ? 'player-inactive' : ''}`;
    playerElement.setAttribute('data-player-id', player.id);
    
    const activeStatus = player.is_active ? 
        `<span class="badge badge-success">Active</span>` : 
        `<span class="badge badge-secondary">Inactive</span>`;
    
    playerElement.innerHTML = `
        <span class="player-name">${player.name}</span>
        <span class="player-qualification qualification-${player.qualification}">
            ${player.qualification}
        </span>
        ${activeStatus}
        <div class="player-actions">
            ${player.is_active ? `
                <button class="btn btn-sm btn-outline-primary" 
                    onclick="addPlayerToQueue(${player.id}, '${player.qualification}')">
                    <i class="fas fa-plus"></i> Add to Queue
                </button>
            ` : ''}
            <button class="btn btn-sm btn-outline-info" 
                onclick="editPlayer(${player.id})">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm ${player.is_active ? 'btn-outline-warning' : 'btn-outline-success'}" 
                onclick="togglePlayerActive(${player.id})">
                <i class="fas ${player.is_active ? 'fa-times' : 'fa-check'}"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" 
                onclick="deletePlayer(${player.id})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    return playerElement;
}

// Render queue
function renderQueue(queueType, players) {
    const queueElement = document.getElementById(`${queueType}-queue`);
    
    if (players.length === 0) {
        queueElement.innerHTML = '<div class="alert alert-info">No players in queue</div>';
        return;
    }
    
    queueElement.innerHTML = '';
    
    players.forEach((player, index) => {
        const queueItem = document.createElement('div');
        queueItem.className = 'queue-item';
        queueItem.setAttribute('data-player-id', player.id);
        
        queueItem.innerHTML = `
            <span class="queue-position">${index + 1}</span>
            <span class="player-name">${player.name}</span>
            <span class="player-qualification qualification-${player.qualification}">
                ${player.qualification}
            </span>
            <div class="float-right">
                <button class="btn btn-sm btn-outline-primary" 
                    onclick="assignPlayerToCourt(${player.id}, '${player.qualification}')">
                    <i class="fas fa-arrow-right"></i> Assign
                </button>
                <button class="btn btn-sm btn-outline-danger" 
                    onclick="removePlayerFromQueue(${player.id})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        queueElement.appendChild(queueItem);
    });
}

// Add new player
function addPlayer() {
    const playerName = document.getElementById('playerName').value.trim();
    const playerEmail = document.getElementById('playerEmail').value.trim();
    const qualification = document.querySelector('input[name="qualification"]:checked').value;
    
    if (!playerName || !playerEmail) {
        showAlert('Please fill in all fields', 'warning');
        return;
    }
    
    const playerData = {
        name: playerName,
        email: playerEmail,
        qualification: qualification
    };
    
    fetch(`${API_BASE_URL}/players`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(playerData)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.detail || 'Failed to add player');
            });
        }
        return response.json();
    })
    .then(data => {
        // Close modal and reset form
        $('#addPlayerModal').modal('hide');
        document.getElementById('addPlayerForm').reset();
        
        showAlert(`Player ${data.name} added successfully`, 'success');
        loadPlayers();
    })
    .catch(error => {
        console.error('Error adding player:', error);
        showAlert(error.message, 'danger');
    });
}

// Edit player
function editPlayer(playerId) {
    fetch(`${API_BASE_URL}/players/${playerId}`)
        .then(response => response.json())
        .then(player => {
            document.getElementById('editPlayerId').value = player.id;
            document.getElementById('editPlayerName').value = player.name;
            document.getElementById('editPlayerEmail').value = player.email;
            
            if (player.qualification === 'advanced') {
                document.getElementById('editAdvancedQualification').checked = true;
            } else {
                document.getElementById('editIntermediateQualification').checked = true;
            }
            
            $('#editPlayerModal').modal('show');
        })
        .catch(error => {
            console.error('Error fetching player details:', error);
            showAlert('Error loading player details', 'danger');
        });
}

// Update player
function updatePlayer() {
    const playerId = document.getElementById('editPlayerId').value;
    const playerName = document.getElementById('editPlayerName').value.trim();
    const playerEmail = document.getElementById('editPlayerEmail').value.trim();
    const qualification = document.querySelector('input[name="editQualification"]:checked').value;
    
    if (!playerName || !playerEmail) {
        showAlert('Please fill in all fields', 'warning');
        return;
    }
    
    const playerData = {
        name: playerName,
        email: playerEmail,
        qualification: qualification
    };
    
    fetch(`${API_BASE_URL}/players/${playerId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(playerData)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.detail || 'Failed to update player');
            });
        }
        return response.json();
    })
    .then(data => {
        // Close modal
        $('#editPlayerModal').modal('hide');
        
        showAlert(`Player ${data.name} updated successfully`, 'success');
        loadPlayers();
        loadQueues();
        loadCourts();
    })
    .catch(error => {
        console.error('Error updating player:', error);
        showAlert(error.message, 'danger');
    });
}

// Toggle player active status
function togglePlayerActive(playerId) {
    fetch(`${API_BASE_URL}/players/${playerId}/toggle-active`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        showAlert(`Player ${data.name} ${data.is_active ? 'activated' : 'deactivated'}`, 'success');
        loadPlayers();
        loadQueues();
        loadCourts();
    })
    .catch(error => {
        console.error('Error toggling player status:', error);
        showAlert('Error updating player status', 'danger');
    });
}

// Delete player
function deletePlayer(playerId) {
    if (!confirm('Are you sure you want to delete this player?')) {
        return;
    }
    
    fetch(`${API_BASE_URL}/players/${playerId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert(data.message, 'success');
            loadPlayers();
            loadQueues();
            loadCourts();
        } else {
            showAlert('Error deleting player', 'danger');
        }
    })
    .catch(error => {
        console.error('Error deleting player:', error);
        showAlert('Error deleting player', 'danger');
    });
}

// Add player to queue
function addPlayerToQueue(playerId, qualification) {
    fetch(`${API_BASE_URL}/queue/${qualification}/${playerId}`, {
        method: 'POST'
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.detail || 'Failed to add player to queue');
            });
        }
        return response.json();
    })
    .then(data => {
        showAlert('Player added to queue', 'success');
        loadQueues();
    })
    .catch(error => {
        console.error('Error adding player to queue:', error);
        showAlert(error.message, 'danger');
    });
}

// Remove player from queue
function removePlayerFromQueue(playerId) {
    fetch(`${API_BASE_URL}/queue/${playerId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('Player removed from queue', 'success');
            loadQueues();
        } else {
            showAlert('Error removing player from queue', 'danger');
        }
    })
    .catch(error => {
        console.error('Error removing player from queue:', error);
        showAlert('Error removing player from queue', 'danger');
    });
}

// Update queue order
function updateQueueOrder(queueType) {
    const queueElement = document.getElementById(`${queueType}-queue`);
    const queueItems = queueElement.querySelectorAll('.queue-item');
    
    const playerIds = Array.from(queueItems).map(item => 
        parseInt(item.getAttribute('data-player-id'))
    );
    
    if (playerIds.length === 0) return;
    
    fetch(`${API_BASE_URL}/queue/${queueType}/reorder`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(playerIds)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.detail || 'Failed to reorder queue');
            });
        }
        return response.json();
    })
    .then(data => {
        showAlert('Queue order updated', 'success');
        loadQueues();
    })
    .catch(error => {
        console.error('Error updating queue order:', error);
        showAlert(error.message, 'danger');
        loadQueues();
    });
}

// Assign player to court
function assignPlayerToCourt(playerId, qualification) {
    // First, get available courts of the right type
    fetch(`${API_BASE_URL}/courts`)
        .then(response => response.json())
        .then(courts => {
            // Filter courts by type and active status
            const availableCourts = courts.filter(court => 
                court.court_type === qualification && court.is_active
            );
            
            if (availableCourts.length === 0) {
                showAlert(`No ${qualification} courts available`, 'warning');
                return;
            }
            
            // If only one court, assign directly
            if (availableCourts.length === 1) {
                assignToSpecificCourt(playerId, availableCourts[0].id);
                return;
            }
            
            // If multiple courts, ask user to select
            let courtOptions = '';
            availableCourts.forEach(court => {
                courtOptions += `
                    <button class="btn btn-outline-primary m-2" 
                        onclick="assignToSpecificCourt(${playerId}, ${court.id}); $('#courtSelectionModal').modal('hide');">
                        ${court.name}
                    </button>
                `;
            });
            
            // Create and show modal for court selection
            const modalHtml = `
                <div class="modal fade" id="courtSelectionModal" tabindex="-1" role="dialog">
                    <div class="modal-dialog" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Select Court</h5>
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                    <span aria-hidden="true">&times;</span>
                                </button>
                            </div>
                            <div class="modal-body text-center">
                                ${courtOptions}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove any existing modal
            const existingModal = document.getElementById('courtSelectionModal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // Add the modal to the body
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Show the modal
            $('#courtSelectionModal').modal('show');
        })
        .catch(error => {
            console.error('Error fetching courts:', error);
            showAlert('Error loading courts', 'danger');
        });
}

// Assign player to specific court
function assignToSpecificCourt(playerId, courtId) {
    fetch(`${API_BASE_URL}/courts/${courtId}/assign/${playerId}`, {
        method: 'POST'
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.detail || 'Failed to assign player to court');
            });
        }
        return response.json();
    })
    .then(data => {
        showAlert('Player assigned to court', 'success');
        loadCourts();
        loadQueues();
    })
    .catch(error => {
        console.error('Error assigning player to court:', error);
        showAlert(error.message, 'danger');
    });
}

// Remove player from court
function removePlayerFromCourt(courtId, playerId) {
    fetch(`${API_BASE_URL}/courts/${courtId}/remove/${playerId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('Player removed from court', 'success');
            loadCourtDetails(courtId);
        } else {
            showAlert('Error removing player from court', 'danger');
        }
    })
    .catch(error => {
        console.error('Error removing player from court:', error);
        showAlert('Error removing player from court', 'danger');
    });
}

// Clear court (remove all players)
function clearCourt(courtId) {
    if (!confirm('Are you sure you want to remove all players from this court?')) {
        return;
    }
    
    fetch(`${API_BASE_URL}/courts/${courtId}/clear`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert(data.message, 'success');
            loadCourtDetails(courtId);
        } else {
            showAlert('Error clearing court', 'danger');
        }
    })
    .catch(error => {
        console.error('Error clearing court:', error);
        showAlert('Error clearing court', 'danger');
    });
}

// Toggle showing inactive players
function toggleInactivePlayers() {
    showInactivePlayers = !showInactivePlayers;
    
    const toggleButton = document.getElementById('toggleInactivePlayers');
    if (showInactivePlayers) {
        toggleButton.innerText = 'Hide Inactive Players';
        toggleButton.classList.remove('btn-outline-primary');
        toggleButton.classList.add('btn-primary');
    } else {
        toggleButton.innerText = 'Show Inactive Players';
        toggleButton.classList.remove('btn-primary');
        toggleButton.classList.add('btn-outline-primary');
    }
    
    loadPlayers();
}

// Show alert message
function showAlert(message, type) {
    // Create alert element
    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${type} alert-dismissible fade show`;
    alertElement.setAttribute('role', 'alert');
    alertElement.innerHTML = `
        ${message}
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
        </button>
    `;
    
    // Insert at the top of the container
    const container = document.querySelector('.container');
    container.insertBefore(alertElement, container.firstChild);
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
        $(alertElement).alert('close');
    }, 3000);
}
