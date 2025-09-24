// Authentication functions
function checkAuth() {
    const currentPlayer = localStorage.getItem('currentPlayer');
    if (!currentPlayer) {
        // Redirect to login if not authenticated
        window.location.href = '/login';
        return false;
    }
    
    // Update welcome message
    const player = JSON.parse(currentPlayer);
    const welcomeMessage = document.getElementById('welcome-message');
    if (welcomeMessage) {
        welcomeMessage.textContent = `Welcome, ${player.name}!`;
    }
    
    return true;
}

async function logout() {
    const currentPlayer = localStorage.getItem('currentPlayer');
    if (currentPlayer) {
        const player = JSON.parse(currentPlayer);
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(player.email),
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    
    localStorage.removeItem('currentPlayer');
    window.location.href = '/login';
}

// Check authentication on page load
window.addEventListener('load', () => {
    checkAuth();
});

// Badminton Queue Management System
class BadmintonQueueApp {
    constructor() {
        this.init();
    }

    async init() {
        // Check authentication first
        if (!checkAuth()) {
            return;
        }
        
        await this.refreshAll();
        this.setupEventListeners();
    }

    // Single API call to get all data
    async refreshAll() {
        try {
            const response = await fetch('/api/queue/refresh-all', {
                method: 'POST'
            });
            if (response.ok) {
                const data = await response.json();
                console.log(data)
                this.renderQueues(data.queues);
                this.renderCourts(data.courts);
                
                // Show auto-assignment notifications if any were made
                if (data.auto_assignments && data.auto_assignments.length > 0) {
                    this.showAutoAssignmentNotification(data.auto_assignments);
                }
            } else {
                console.error('Failed to refresh data:', response.statusText);
            }
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    }

    // Show notification for auto-assignments
    showAutoAssignmentNotification(assignments) {
        const messages = assignments.map(assignment => 
            `${assignment.player.name} (${assignment.player.qualification}) → ${assignment.court.name} (${assignment.court.type})`
        );
        
        const notification = document.createElement('div');
        notification.className = 'auto-assignment-notification';
        notification.innerHTML = `
            <div class="notification-header">Auto-assigned players to courts:</div>
            <div class="notification-body">
                ${messages.map(msg => `<div class="assignment-item">• ${msg}</div>`).join('')}
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    // General notification method
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-message">${message}</div>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 4000);
    }

    // Simplified queue rendering
    renderQueues(queuesData) {
        this.renderQueue('player-queue', queuesData.advanced, 'advanced');
        this.renderQueue('player-queue-right', queuesData.intermediate, 'intermediate');
    }

    renderQueue(containerId, players, queueType) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        
        players.forEach((player, index) => {
            const playerElement = this.createPlayerElement(player, index + 1, queueType);
            container.appendChild(playerElement);
        });
    }

    createPlayerElement(player, position, queueType) {
        const playerDiv = document.createElement('div');
        playerDiv.className = `queue-item player-box ${queueType}-player`;
        playerDiv.draggable = true;
        playerDiv.dataset.playerId = player.id;
        playerDiv.dataset.qualification = player.qualification;
        
        playerDiv.innerHTML = `
            <div class="queue-number">${position}</div>
            <div class="player-name">${player.name}</div>
        `;

        this.addDragEventListeners(playerDiv);
        return playerDiv;
    }

    // Simplified court rendering
    renderCourts(courtsData) {
        courtsData.forEach(courtData => {
            this.renderCourt(courtData);
        });
    }

    renderCourt(courtData) {
        const courtElement = document.getElementById(`${courtData.court.name}-court`);
        if (!courtElement) return;

        const playersContainer = courtElement.querySelector('.court-players');
        playersContainer.innerHTML = '';
        
        courtData.players.forEach(player => {
            const playerElement = this.createCourtPlayerElement(player);
            playersContainer.appendChild(playerElement);
        });

        // Update court styling
        this.updateCourtStyling(courtElement, courtData.court.type);
    }

    createCourtPlayerElement(player) {
        const playerDiv = document.createElement('div');
        playerDiv.className = `player-box ${player.qualification}-player`;
        playerDiv.dataset.playerId = player.id;
        playerDiv.dataset.qualification = player.qualification;
        playerDiv.draggable = true;
        playerDiv.textContent = player.name;
        
        this.addDragEventListeners(playerDiv);
        return playerDiv;
    }

    updateCourtStyling(courtElement, courtType) {
        courtElement.classList.remove('court-advanced', 'court-intermediate', 'court-training');
        courtElement.classList.add(`court-${courtType}`);
        
        const dropdown = courtElement.querySelector('.court-type-dropdown');
        if (dropdown) {
            dropdown.value = courtType;
        }
    }

    // Drag and drop setup
    addDragEventListeners(element) {
        element.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', element.dataset.playerId);
            e.dataTransfer.setData('application/qualification', element.dataset.qualification);
            element.classList.add('dragging');
            
            // Store the dragging player qualification for use in dragover events
            this.currentDragQualification = element.dataset.qualification;
        });

        element.addEventListener('dragend', (e) => {
            element.classList.remove('dragging');
            this.currentDragQualification = null;
        });
    }

    setupEventListeners() {
        this.setupCourtDropZones();
        this.setupQueueDropZones();
    }

    setupCourtDropZones() {
        const courts = document.querySelectorAll('.court');
        
        courts.forEach(court => {
            court.addEventListener('dragover', (e) => {
                e.preventDefault();
                
                // Check if this is a valid drop target
                const courtType = this.getCourtTypeFromElement(court);
                
                if (courtType === 'advanced' && this.currentDragQualification === 'intermediate') {
                    court.classList.add('drag-over-invalid');
                    court.classList.remove('drag-over-court');
                } else {
                    court.classList.add('drag-over-court');
                    court.classList.remove('drag-over-invalid');
                }
            });

            court.addEventListener('dragleave', (e) => {
                court.classList.remove('drag-over-court', 'drag-over-invalid');
            });

            court.addEventListener('drop', async (e) => {
                e.preventDefault();
                court.classList.remove('drag-over-court', 'drag-over-invalid');
                
                const playerId = e.dataTransfer.getData('text/plain');
                const playerQualification = e.dataTransfer.getData('application/qualification');
                const courtId = this.getCourtIdFromElement(court);
                
                // Check if court is advanced and player is not advanced
                const courtType = this.getCourtTypeFromElement(court);
                if (courtType === 'advanced' && playerQualification !== 'advanced') {
                    alert('Only advanced players can be assigned to advanced courts!');
                    return;
                }
                
                if (playerId && courtId) {
                    await this.movePlayerToCourt(playerId, courtId);
                }
            });
        });
    }

    setupQueueDropZones() {
        const advancedQueue = document.getElementById('player-queue');
        const intermediateQueue = document.getElementById('player-queue-right');

        [advancedQueue, intermediateQueue].forEach(queue => {
            queue.addEventListener('dragover', (e) => {
                e.preventDefault();
                const queueType = queue.id === 'player-queue' ? 'advanced' : 'intermediate';
                queue.classList.add(`drag-over-${queueType}`);
            });

            queue.addEventListener('dragleave', (e) => {
                queue.classList.remove('drag-over-advanced', 'drag-over-intermediate');
            });

            queue.addEventListener('drop', async (e) => {
                e.preventDefault();
                queue.classList.remove('drag-over-advanced', 'drag-over-intermediate');
                
                const playerId = e.dataTransfer.getData('text/plain');
                const currentQualification = e.dataTransfer.getData('application/qualification');
                const targetQualification = queue.id === 'player-queue' ? 'advanced' : 'intermediate';
                
                if (playerId) {
                    await this.movePlayerToQueue(playerId, targetQualification, currentQualification);
                }
            });
        });
    }

    getCourtIdFromElement(courtElement) {
        const courtName = courtElement.id.replace('-court', '');
        // Simple mapping - you may want to fetch this from API if needed
        const courtMappings = {
            'G1': 1, 'G2': 2, 'G3': 3, 'G4': 4,
            'W1': 5, 'W2': 6, 'W3': 7, 'W4': 8
        };
        return courtMappings[courtName] || null;
    }

    getCourtTypeFromElement(courtElement) {
        // Check the court's CSS classes to determine type
        if (courtElement.classList.contains('court-advanced')) {
            return 'advanced';
        } else if (courtElement.classList.contains('court-intermediate')) {
            return 'intermediate';
        } else if (courtElement.classList.contains('court-training')) {
            return 'training';
        }
        
        // Fallback: check dropdown value if available
        const dropdown = courtElement.querySelector('.court-type-dropdown');
        if (dropdown) {
            return dropdown.value;
        }
        
        return 'training'; // default
    }

    // Simplified API calls
    async movePlayerToCourt(playerId, courtId) {
        try {
            const response = await fetch(`/api/queue/move-to-court/${playerId}/${courtId}`, {
                method: 'POST'
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log(result.message);
                await this.refreshAll(); // Single refresh call
            } else {
                const error = await response.json();
                alert(`Error: ${error.detail}`);
            }
        } catch (error) {
            console.error('Error moving player to court:', error);
            alert('Failed to move player to court');
        }
    }

    async movePlayerToQueue(playerId, targetQualification, currentQualification) {
        try {
            const url = targetQualification !== currentQualification 
                ? `/api/queue/move-to-queue/${playerId}?qualification=${targetQualification}`
                : `/api/queue/move-to-queue/${playerId}`;
                
            const response = await fetch(url, {
                method: 'POST'
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log(result.message);
                await this.refreshAll(); // Single refresh call
            } else {
                const error = await response.json();
                alert(`Error: ${error.detail}`);
            }
        } catch (error) {
            console.error('Error moving player to queue:', error);
            alert('Failed to move player to queue');
        }
    }
}

// Simplified global functions
async function addAdvancedPlayer() {
    const name = prompt('Enter advanced player name:');
    
    if (name) {
        try {
            const response = await fetch('/api/players/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name, qualification: 'advanced' })
            });
            
            if (response.ok) {
                await app.refreshAll();
            } else {
                const error = await response.json();
                alert(`Error: ${error.detail}`);
            }
        } catch (error) {
            alert('Failed to create advanced player');
        }
    }
}

async function addIntermediatePlayer() {
    const name = prompt('Enter intermediate player name:');
    
    if (name) {
        try {
            const response = await fetch('/api/players/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name, qualification: 'intermediate' })
            });
            
            if (response.ok) {
                await app.refreshAll();
            } else {
                const error = await response.json();
                alert(`Error: ${error.detail}`);
            }
        } catch (error) {
            alert('Failed to create intermediate player');
        }
    }
}

async function deletePlayer() {
    const playerId = prompt('Enter player ID to delete:');
    if (playerId) {
        try {
            const response = await fetch(`/api/players/${playerId}`, { method: 'DELETE' });
            if (response.ok) {
                await app.refreshAll();
            } else {
                const error = await response.json();
                alert(`Error: ${error.detail}`);
            }
        } catch (error) {
            alert('Failed to delete player');
        }
    }
}

async function autoFillCourts() {
    try {
        const response = await fetch('/api/queue/auto-fill-courts', {
            method: 'POST'
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log(result.message);
            
            if (result.assignments && result.assignments.length > 0) {
                app.showAutoAssignmentNotification(result.assignments);
            } else {
                // Show a brief message that no assignments were needed
                const notification = document.createElement('div');
                notification.className = 'auto-assignment-notification info';
                notification.innerHTML = `
                    <div class="notification-body">No auto-fill needed - courts are full or no players in queue</div>
                    <button class="notification-close" onclick="this.parentElement.remove()">×</button>
                `;
                document.body.appendChild(notification);
                setTimeout(() => notification.remove(), 3000);
            }
            
            await app.refreshAll();
        } else {
            const error = await response.json();
            alert(`Error: ${error.detail}`);
        }
    } catch (error) {
        console.error('Error auto-filling courts:', error);
        alert('Failed to auto-fill courts');
    }
}

async function startNewSession() {
    if (confirm('Start new session? This will deactivate all players and set all courts to training mode.')) {
        try {
            const response = await fetch('/api/queue/start-new-session', {
                method: 'POST'
            });
            
            if (response.ok) {
                const result = await response.json();
                const message = `New session started!\n• ${result.players_deactivated} players deactivated\n• ${result.courts_set_to_training} courts set to training`;
                app.showNotification(message, 'success');
                await app.refreshAll();
            } else {
                const error = await response.json();
                alert(`Error: ${error.detail}`);
            }
        } catch (error) {
            console.error('Error starting new session:', error);
            alert('Failed to start new session');
        }
    }
}

async function changeCourtType(courtID, newType) {
    try {
        const response = await fetch(`/api/courts/${courtID}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ court_type: newType })
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Show notification if players were moved
            if (result.moved_players && result.moved_players.length > 0) {
                const playerNames = result.moved_players.map(p => p.name).join(', ');
                const message = `Court changed to ${newType}. Moved ${result.moved_players.length} players back to queue: ${playerNames}`;
                app.showNotification(message, 'info');
            } else if (newType === 'training') {
                app.showNotification(`Court changed to training court`, 'info');
            }
            
            await app.refreshAll();
        } else {
            const error = await response.json();
            alert(`Error: ${error.detail}`);
        }
    } catch (error) {
        alert(error);
    }
}

// Player Modal Functions
async function openPlayerModal() {
    const modal = document.getElementById('player-pool-modal');
    modal.style.display = 'block';
    await loadAllPlayers();
}

function closePlayerModal() {
    const modal = document.getElementById('player-pool-modal');
    modal.style.display = 'none';
}

async function loadAllPlayers() {
    try {
        const response = await fetch('/api/players/');
        if (response.ok) {
            const players = await response.json();
            displayPlayersInModal(players);
        } else {
            console.error('Failed to load players');
        }
    } catch (error) {
        console.error('Error loading players:', error);
    }
}

function displayPlayersInModal(players) {
    const playerList = document.getElementById('player-pool-list');
    const showActive = document.getElementById('show-active').checked;
    const showInactive = document.getElementById('show-inactive').checked;
    const showAdvanced = document.getElementById('show-advanced').checked;
    const showIntermediate = document.getElementById('show-intermediate').checked;
    const searchTerm = document.getElementById('player-pool-search').value.toLowerCase();

    // Filter players
    const filteredPlayers = players.filter(player => {
        const activeMatch = (player.is_active && showActive) || (!player.is_active && showInactive);
        const qualificationMatch = (player.qualification === 'advanced' && showAdvanced) || 
                                 (player.qualification === 'intermediate' && showIntermediate);
        const searchMatch = player.name.toLowerCase().includes(searchTerm);
        
        return activeMatch && qualificationMatch && searchMatch;
    });

    playerList.innerHTML = '';
    
    filteredPlayers.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = `player-modal-item ${player.is_active ? 'active' : 'inactive'} ${player.qualification}`;
        
        playerDiv.innerHTML = `
            <div class="player-info">
                <span class="player-name">${player.name}</span>
                <span class="player-qualification ${player.qualification}">${player.qualification === 'advanced' ? 'A' : 'I'}</span>
            </div>
            <div class="player-actions">
                <button onclick="togglePlayerStatus(${player.id}, ${!player.is_active})" 
                        class="btn btn-sm ${player.is_active ? 'btn-warning' : 'btn-success'}">
                    ${player.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button onclick="deletePlayerById(${player.id})" class="btn btn-sm btn-danger">Delete</button>
            </div>
        `;
        
        playerList.appendChild(playerDiv);
    });
}

async function togglePlayerStatus(playerId, newStatus) {
    try {
        const response = await fetch(`/api/players/${playerId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: newStatus })
        });
        
        if (response.ok) {
            await loadAllPlayers(); // Refresh the list
            await app.refreshAll(); // Refresh the main app
        } else {
            const error = await response.json();
            alert(`Error: ${error.detail}`);
        }
    } catch (error) {
        console.error('Error toggling player status:', error);
        alert('Failed to update player status');
    }
}

async function deletePlayerById(playerId) {
    if (confirm('Are you sure you want to delete this player?')) {
        try {
            const response = await fetch(`/api/players/${playerId}`, { method: 'DELETE' });
            if (response.ok) {
                await loadAllPlayers(); // Refresh the list
                await app.refreshAll(); // Refresh the main app
            } else {
                const error = await response.json();
                alert(`Error: ${error.detail}`);
            }
        } catch (error) {
            console.error('Error deleting player:', error);
            alert('Failed to delete player');
        }
    }
}

// Add event listeners for modal filters
document.addEventListener('DOMContentLoaded', () => {
    // Filter event listeners
    document.getElementById('show-active').addEventListener('change', () => {
        if (document.getElementById('player-pool-modal').style.display === 'block') {
            loadAllPlayers();
        }
    });
    
    document.getElementById('show-inactive').addEventListener('change', () => {
        if (document.getElementById('player-pool-modal').style.display === 'block') {
            loadAllPlayers();
        }
    });
    
    document.getElementById('show-advanced').addEventListener('change', () => {
        if (document.getElementById('player-pool-modal').style.display === 'block') {
            loadAllPlayers();
        }
    });
    
    document.getElementById('show-intermediate').addEventListener('change', () => {
        if (document.getElementById('player-pool-modal').style.display === 'block') {
            loadAllPlayers();
        }
    });
    
    document.getElementById('player-pool-search').addEventListener('input', () => {
        if (document.getElementById('player-pool-modal').style.display === 'block') {
            loadAllPlayers();
        }
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('player-pool-modal');
        if (event.target === modal) {
            closePlayerModal();
        }
    });
});

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new BadmintonQueueApp();
});
