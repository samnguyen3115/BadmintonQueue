// // Badminton Queue Management System
// class BadmintonQueueApp {
//     constructor() {
//         this.players = [];
//         this.courts = [];
//         this.init();
//     }

//     async init() {
//         await this.loadPlayers();
//         await this.loadCourts();
//         this.renderQueues();
//         this.renderCourts();
//         this.setupEventListeners();
//     }

//     // Fetch all players from the database
//     async loadPlayers() {
//         try {
//             const response = await fetch('/api/players/');
//             if (response.ok) {
//                 this.players = await response.json();
//                 console.log('Players loaded:', this.players);
//                 console.log('Queued players:', this.getQueuedPlayers());
//             } else {
//                 console.error('Failed to load players:', response.statusText);
//             }
//         } catch (error) {
//             console.error('Error loading players:', error);
//         }
//     }

//     // Fetch all courts from the database
//     async loadCourts() {
//         try {
//             const response = await fetch('/api/courts/');
//             if (response.ok) {
//                 this.courts = await response.json();
//                 console.log('Courts loaded:', this.courts);
//             } else {
//                 console.error('Failed to load courts:', response.statusText);
//             }
//         } catch (error) {
//             console.error('Error loading courts:', error);
//         }
//     }

//     // Get players in queue (not assigned to any court)
//     getQueuedPlayers() {
//         console.log('All players in getQueuedPlayers:', this.players);
//         const queuedPlayers = this.players.filter(player => {
//             console.log(`Player ${player.name}: court_id=${player.court_id}`);
//             return !player.court_id;
//         });
//         console.log('Filtered queued players:', queuedPlayers);
//         return queuedPlayers;
//     }

//     // Get advanced queue players
//     getAdvancedQueue() {
//         return this.getQueuedPlayers().filter(player => 
//             player.qualification === 'advanced'
//         );
//     }

//     // Get intermediate queue players
//     getIntermediateQueue() {
//         return this.getQueuedPlayers().filter(player => 
//             player.qualification === 'intermediate'
//         );
//     }

//     // Render players in their respective queues
//     renderQueues() {
//         this.renderAdvancedQueue();
//         this.renderIntermediateQueue();
//     }

//     renderAdvancedQueue() {
//         const queueContainer = document.getElementById('player-queue');
//         // Get advanced players with no court assignment (court_id is null)
//         const advancedPlayers = this.players.filter(player => 
//             player.qualification === 'advanced' && player.court_id === null
//         );
        
//         console.log('Rendering advanced queue:', advancedPlayers);
//         queueContainer.innerHTML = '';
        
//         advancedPlayers.forEach((player, index) => {
//             const playerElement = this.createPlayerElement(player, index + 1);
//             queueContainer.appendChild(playerElement);
//         });
//     }

//     renderIntermediateQueue() {
//         const queueContainer = document.getElementById('player-queue-right');
//         // Get intermediate players with no court assignment (court_id is null)
//         const intermediatePlayers = this.players.filter(player => 
//             player.qualification === 'intermediate' && player.court_id === null
//         );
        
//         console.log('Rendering intermediate queue:', intermediatePlayers);
//         queueContainer.innerHTML = '';
        
//         intermediatePlayers.forEach((player, index) => {
//             const playerElement = this.createPlayerElement(player, index + 1);
//             queueContainer.appendChild(playerElement);
//         });
//     }

//     // Create a player element for the queue
//     createPlayerElement(player, position) {
//         const playerDiv = document.createElement('div');
//         playerDiv.className = `queue-item player-box ${player.qualification}-player`;
//         playerDiv.draggable = true;
//         playerDiv.dataset.playerId = player.id;
//         playerDiv.dataset.qualification = player.qualification;
        
//         playerDiv.innerHTML = `
//             <div class="queue-number">${position}</div>
//             <div class="player-name">${player.name}</div>
//         `;

//         // Add drag event listeners
//         this.addDragEventListeners(playerDiv);
        
//         return playerDiv;
//     }

//     // Add drag and drop functionality
//     addDragEventListeners(element) {
//         element.addEventListener('dragstart', (e) => {
//             e.dataTransfer.setData('text/plain', element.dataset.playerId);
//             e.dataTransfer.setData('application/qualification', element.dataset.qualification);
//             element.classList.add('dragging');
//         });

//         element.addEventListener('dragend', (e) => {
//             element.classList.remove('dragging');
//         });
//     }

//     // Render courts with assigned players
//     renderCourts() {
//         this.courts.forEach(court => {
//             this.renderCourt(court);
//         });
//     }

//     async renderCourt(court) {
//         const courtElement = document.getElementById(`${court.name}-court`);
//         if (!courtElement) return;

//         try {
//             // Get players assigned to this court
//             const response = await fetch(`/api/courts/${court.id}/players`);
//             if (response.ok) {
//                 const courtPlayers = await response.json();
//                 const playersContainer = courtElement.querySelector('.court-players');
                
//                 playersContainer.innerHTML = '';
                
//                 courtPlayers.forEach(player => {
//                     const playerElement = this.createCourtPlayerElement(player);
//                     playersContainer.appendChild(playerElement);
//                 });

//                 // Update court type styling
//                 this.updateCourtStyling(courtElement, court.court_type);
//             }
//         } catch (error) {
//             console.error(`Error loading players for court ${court.name}:`, error);
//         }
//     }

//     createCourtPlayerElement(player) {
//         const playerDiv = document.createElement('div');
//         playerDiv.className = `player-box ${player.qualification}-player`;
//         playerDiv.dataset.playerId = player.id;
//         playerDiv.dataset.qualification = player.qualification;
//         playerDiv.draggable = true;
//         playerDiv.textContent = player.name;
        
//         // Add drag event listeners for court players
//         this.addDragEventListeners(playerDiv);
        
//         return playerDiv;
//     }

//     updateCourtStyling(courtElement, courtType) {
//         // Remove existing court type classes
//         courtElement.classList.remove('court-advanced', 'court-intermediate', 'court-training');
        
//         // Add the appropriate class
//         courtElement.classList.add(`court-${courtType}`);
        
//         // Update the dropdown selection
//         const dropdown = courtElement.querySelector('.court-type-dropdown');
//         if (dropdown) {
//             dropdown.value = courtType;
//         }
//     }

//     // Setup event listeners for the application
//     setupEventListeners() {
//         this.setupCourtDropZones();
//         this.setupQueueDropZones();
//     }

//     setupCourtDropZones() {
//         const courts = document.querySelectorAll('.court');
        
//         courts.forEach(court => {
//             court.addEventListener('dragover', (e) => {
//                 e.preventDefault();
//                 court.classList.add('drag-over-court');
//             });

//             court.addEventListener('dragleave', (e) => {
//                 court.classList.remove('drag-over-court');
//             });

//             court.addEventListener('drop', async (e) => {
//                 e.preventDefault();
//                 court.classList.remove('drag-over-court');
                
//                 const playerId = e.dataTransfer.getData('text/plain');
//                 const courtId = this.getCourtIdFromElement(court);
                
//                 if (playerId && courtId) {
//                     await this.assignPlayerToCourt(playerId, courtId);
//                 }
//             });
//         });
//     }

//     setupQueueDropZones() {
//         const advancedQueue = document.getElementById('player-queue');
//         const intermediateQueue = document.getElementById('player-queue-right');

//         [advancedQueue, intermediateQueue].forEach(queue => {
//             queue.addEventListener('dragover', (e) => {
//                 e.preventDefault();
//                 const queueType = queue.id === 'player-queue' ? 'advanced' : 'intermediate';
//                 queue.classList.add(`drag-over-${queueType}`);
//             });

//             queue.addEventListener('dragleave', (e) => {
//                 queue.classList.remove('drag-over-advanced', 'drag-over-intermediate');
//             });

//             queue.addEventListener('drop', async (e) => {
//                 e.preventDefault();
//                 queue.classList.remove('drag-over-advanced', 'drag-over-intermediate');
                
//                 const playerId = e.dataTransfer.getData('text/plain');
//                 const currentQualification = e.dataTransfer.getData('application/qualification');
//                 const queueType = queue.id === 'player-queue' ? 'advanced' : 'intermediate';
                
//                 if (playerId) {
//                     await this.movePlayerToQueue(playerId, queueType, currentQualification);
//                 }
//             });
//         });
//     }

//     getCourtIdFromElement(courtElement) {
//         const courtName = courtElement.id.replace('-court', '');
//         const court = this.courts.find(c => c.name === courtName);
//         return court ? court.id : null;
//     }

//     // API calls for player management
//     async assignPlayerToCourt(playerId, courtId) {
//         try {
//             console.log(`Assigning player ${playerId} to court ${courtId}...`);
//             const response = await fetch(`/api/courts/${courtId}/assign/${playerId}`, {
//                 method: 'POST'
//             });
            
//             if (response.ok) {
//                 const result = await response.json();
//                 console.log(result.message);
                
//                 // Refresh the display - player should disappear from queue and appear on court
//                 await this.loadPlayers();
//                 this.renderQueues(); // This will remove the player from queue display
//                 await this.renderCourt(this.courts.find(c => c.id === courtId));
                
//                 console.log('Player assigned successfully and display refreshed');
//             } else {
//                 const error = await response.json();
//                 alert(`Error: ${error.detail}`);
//             }
//         } catch (error) {
//             console.error('Error assigning player to court:', error);
//             alert('Failed to assign player to court');
//         }
//     }

//     async movePlayerToQueue(playerId, targetQueueType, currentQualification) {
//         console.log(`Moving player ${playerId} to ${targetQueueType} queue (current: ${currentQualification})`);
        
//         try {
//             // Step 1: Remove from court if assigned (this puts them in queue)
//             console.log('Step 1: Removing from court...');
//             await this.removePlayerFromCourt(playerId);
            
//             // Step 2: Change qualification if different from target queue
//             if (currentQualification !== targetQueueType) {
//                 console.log(`Step 2: Changing qualification from ${currentQualification} to ${targetQueueType}...`);
//                 await this.updatePlayerQualification(playerId, targetQueueType);
//             } else {
//                 console.log('Step 2: No qualification change needed');
//             }
            
//             // Step 3: Refresh the display
//             console.log('Step 3: Refreshing display...');
//             await this.loadPlayers();
//             this.renderQueues();
//             this.renderCourts();
            
//             console.log('Move completed successfully');
            
//         } catch (error) {
//             console.error('Error moving player to queue:', error);
//             alert('Failed to move player to queue: ' + error.message);
//         }
//     }

//     async removePlayerFromCourt(playerId) {
//         try {
//             console.log(`Removing player ${playerId} from court...`);
//             const response = await fetch(`/api/queue/${playerId}`, {
//                 method: 'DELETE'
//             });
            
//             if (response.ok) {
//                 const result = await response.json();
//                 console.log('Player removed from court:', result.message);
//                 return true;
//             } else {
//                 const error = await response.json();
//                 console.warn('Remove from court response:', error);
//                 // Don't throw error if player wasn't on a court to begin with
//                 return true;
//             }
//         } catch (error) {
//             console.error('Error removing player from court:', error);
//             throw error;
//         }
//     }

//     async updatePlayerQualification(playerId, newQualification) {
//         try {
//             console.log(`Updating player ${playerId} qualification to ${newQualification}...`);
//             const response = await fetch(`/api/players/${playerId}?qualification=${newQualification}`, {
//                 method: 'PUT'
//             });
            
//             if (response.ok) {
//                 const result = await response.json();
//                 console.log(`Player qualification changed to ${newQualification}:`, result);
//                 return result;
//             } else {
//                 const error = await response.json();
//                 console.error('Qualification update failed:', error);
//                 alert(`Error changing qualification: ${error.detail}`);
//                 throw new Error('Failed to update qualification');
//             }
//         } catch (error) {
//             console.error('Error updating player qualification:', error);
//             throw error;
//         }
//     }

//     // Refresh all data and UI
//     async refresh() {
//         await this.loadPlayers();
//         await this.loadCourts();
//         this.renderQueues();
//         this.renderCourts();
//     }
// }

// // Global functions for HTML button events
// async function addPlayer() {
//     const name = prompt('Enter player name:');
//     const qualification = prompt('Enter qualification (advanced/intermediate):');
    
//     if (name && (qualification === 'advanced' || qualification === 'intermediate')) {
//         try {
//             const response = await fetch('/api/players/', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json'
//                 },
//                 body: JSON.stringify({
//                     name: name,
//                     qualification: qualification
//                 })
//             });
            
//             if (response.ok) {
//                 const player = await response.json();
//                 console.log('Player created:', player);
//                 await app.refresh();
//             } else {
//                 const error = await response.json();
//                 alert(`Error: ${error.detail}`);
//             }
//         } catch (error) {
//             console.error('Error creating player:', error);
//             alert('Failed to create player');
//         }
//     } else {
//         alert('Please enter valid name and qualification (advanced/intermediate)');
//     }
// }

// async function deletePlayer() {
//     const playerId = prompt('Enter player ID to delete:');
    
//     if (playerId) {
//         try {
//             const response = await fetch(`/api/players/${playerId}`, {
//                 method: 'DELETE'
//             });
            
//             if (response.ok) {
//                 const result = await response.json();
//                 console.log(result.message);
//                 await app.refresh();
//             } else {
//                 const error = await response.json();
//                 alert(`Error: ${error.detail}`);
//             }
//         } catch (error) {
//             console.error('Error deleting player:', error);
//             alert('Failed to delete player');
//         }
//     }
// }

// async function syncWithFirebase() {
//     // For now, just refresh from database
//     console.log('Syncing with database...');
//     await app.refresh();
// }

// async function startNewSession() {
//     if (confirm('Start new session? This will move all players back to queue.')) {
//         // Implementation for new session logic
//         console.log('Starting new session...');
//         await app.refresh();
//     }
// }

// async function rotateCourtPlayers(courtName) {
//     console.log(`Rotating players on court ${courtName}`);
//     // Implementation for rotating players on a court
//     await app.refresh();
// }

// async function changeCourtType(courtName, newType) {
//     try {
//         const court = app.courts.find(c => c.name === courtName);
//         if (!court) return;
        
//         const response = await fetch(`/api/courts/${court.id}`, {
//             method: 'PUT',
//             headers: {
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify({
//                 name: court.name,
//                 court_type: newType
//             })
//         });
        
//         if (response.ok) {
//             console.log(`Court ${courtName} type changed to ${newType}`);
//             await app.loadCourts();
//             await app.renderCourt(court);
//         } else {
//             const error = await response.json();
//             alert(`Error: ${error.detail}`);
//         }
//     } catch (error) {
//         console.error('Error changing court type:', error);
//         alert('Failed to change court type');
//     }
// }

// // Initialize the application when the page loads
// let app;
// document.addEventListener('DOMContentLoaded', () => {
//     app = new BadmintonQueueApp();
// });
