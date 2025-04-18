document.addEventListener('DOMContentLoaded', () => {
    const createTeamBtn = document.getElementById('createTeamBtn');
    const viewLeaderboardBtn = document.getElementById('viewLeaderboardBtn');
    const createTeamSection = document.getElementById('createTeamSection');
    const leaderboardSection = document.getElementById('leaderboardSection');
    const createTeamForm = document.getElementById('createTeamForm');
    const charitySearch = document.getElementById('charitySearch');
    const charityResults = document.getElementById('charityResults');
    const leaderboard = document.getElementById('leaderboard');

    let selectedCharity = null;

    // Navigation handlers
    createTeamBtn.addEventListener('click', () => {
        createTeamSection.classList.remove('hidden');
        leaderboardSection.classList.add('hidden');
    });

    viewLeaderboardBtn.addEventListener('click', () => {
        createTeamSection.classList.add('hidden');
        leaderboardSection.classList.remove('hidden');
        loadLeaderboard();
    });

    // Charity search handler
    let searchTimeout;
    charitySearch.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchCharities(e.target.value);
        }, 300);
    });

    // Form submission handler
    createTeamForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!selectedCharity) {
            alert('Please select a charity');
            return;
        }

        const formData = {
            name: document.getElementById('teamName').value,
            description: document.getElementById('teamDescription').value,
            charityId: selectedCharity.id
        };

        try {
            const response = await fetch('/api/teams', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                alert('Team created successfully!');
                createTeamForm.reset();
                selectedCharity = null;
                viewLeaderboardBtn.click();
            } else {
                throw new Error('Failed to create team');
            }
        } catch (error) {
            alert('Error creating team: ' + error.message);
        }
    });

    // Helper functions
    async function searchCharities(query) {
        if (!query) {
            charityResults.classList.add('hidden');
            return;
        }

        try {
            const response = await fetch(`/api/charities?search=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to search charities');
            }
            
            charityResults.innerHTML = '';
            
            if (!data || data.length === 0) {
                const noResults = document.createElement('div');
                noResults.className = 'charity-item';
                noResults.textContent = 'No charities found';
                charityResults.appendChild(noResults);
            } else {
                data.forEach(charity => {
                    const div = document.createElement('div');
                    div.className = 'charity-item';
                    div.innerHTML = `
                        <div class="charity-name">${charity.name}</div>
                        ${charity.description ? `<div class="charity-description">${charity.description}</div>` : ''}
                    `;
                    div.addEventListener('click', () => {
                        selectedCharity = charity;
                        charitySearch.value = charity.name;
                        charityResults.classList.add('hidden');
                    });
                    charityResults.appendChild(div);
                });
            }

            charityResults.classList.remove('hidden');
        } catch (error) {
            console.error('Error searching charities:', error);
            charityResults.innerHTML = '';
            const errorDiv = document.createElement('div');
            errorDiv.className = 'charity-item error';
            errorDiv.textContent = `Error: ${error.message}`;
            charityResults.appendChild(errorDiv);
            charityResults.classList.remove('hidden');
        }
    }

    async function loadLeaderboard() {
        try {
            const response = await fetch('/api/leaderboard');
            const teams = await response.json();
            
            leaderboard.innerHTML = '';
            teams.forEach(team => {
                const card = document.createElement('div');
                card.className = 'team-card';
                card.innerHTML = createTeamCard(team);
                leaderboard.appendChild(card);
            });
        } catch (error) {
            console.error('Error loading leaderboard:', error);
        }
    }

    // Add donation form to team details
    function showTeamDetails(team) {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="team-details">
                <h2>${team.name}</h2>
                <p>${team.description}</p>
                <div class="donation-stats">
                    <div class="stat">
                        <span class="stat-value">$${team.totalRaised.toFixed(2)}</span>
                        <span class="stat-label">Total Raised</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${team.donorCount}</span>
                        <span class="stat-label">Donors</span>
                    </div>
                </div>
                
                <div class="donation-form">
                    <h3>Make a Donation</h3>
                    <form id="donation-form">
                        <div class="form-group">
                            <label for="donor-name">Your Name</label>
                            <input type="text" id="donor-name" required>
                        </div>
                        <div class="form-group">
                            <label for="donation-amount">Amount ($)</label>
                            <input type="number" id="donation-amount" min="1" step="0.01" required>
                        </div>
                        <button type="submit" class="btn-primary">Donate Now</button>
                    </form>
                </div>
                
                <div class="recent-donations">
                    <h3>Recent Donations</h3>
                    <div class="donations-list">
                        ${team.donations && team.donations.length > 0 
                            ? team.donations.map(donation => `
                                <div class="donation-item">
                                    <span class="donor-name">${donation.donorName}</span>
                                    <span class="donation-amount">$${donation.amount.toFixed(2)}</span>
                                    <span class="donation-date">${new Date(donation.createdAt).toLocaleDateString()}</span>
                                </div>
                            `).join('')
                            : '<p>No donations yet. Be the first to donate!</p>'
                        }
                    </div>
                </div>
                
                <button onclick="showLeaderboard()" class="btn-secondary">Back to Leaderboard</button>
            </div>
        `;

        // Add event listener for donation form
        const donationForm = document.getElementById('donation-form');
        donationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const donorName = document.getElementById('donor-name').value;
            const amount = document.getElementById('donation-amount').value;
            
            try {
                const response = await fetch('/api/donations', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        teamId: team.id,
                        charityId: team.charityId,
                        amount,
                        donorName
                    })
                });
                
                if (!response.ok) {
                    throw new Error('Failed to submit donation');
                }
                
                // Refresh the team details to show the new donation
                const updatedTeam = await fetchTeamDetails(team.id);
                showTeamDetails(updatedTeam);
                
                // Show success message
                alert('Thank you for your donation!');
            } catch (error) {
                console.error('Error submitting donation:', error);
                alert('Failed to submit donation. Please try again.');
            }
        });
    }

    // Add helper function to fetch team details
    async function fetchTeamDetails(teamId) {
        const response = await fetch('/api/leaderboard');
        const teams = await response.json();
        return teams.find(team => team.id === teamId);
    }

    // Update the team card to show donation stats
    function createTeamCard(team) {
        return `
            <div class="team-card">
                <div class="team-info" onclick="showTeamDetails('${team.id}')">
                    <h3>${team.name}</h3>
                    <p>${team.description}</p>
                    <div class="team-stats">
                        <div class="stat">
                            <span class="stat-value">$${team.totalRaised.toFixed(2)}</span>
                            <span class="stat-label">Raised</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value">${team.donorCount}</span>
                            <span class="stat-label">Donors</span>
                        </div>
                    </div>
                </div>
                <button class="btn-donate" onclick="showDonationForm('${team.id}', '${team.name}')">Team ${team.name} - Make a Donation</button>
            </div>
        `;
    }

    // Make showDonationForm globally accessible
    window.showDonationForm = function(teamId, teamName) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <h2>Donate to Team ${teamName}</h2>
                <form id="donation-form">
                    <div class="form-group">
                        <label for="donor-name">Your Name</label>
                        <input type="text" id="donor-name" required>
                    </div>
                    <div class="form-group">
                        <label for="donation-amount">Amount ($)</label>
                        <input type="number" id="donation-amount" min="1" step="0.01" required>
                    </div>
                    
                    <div class="credit-card-form">
                        <h3>Payment Information</h3>
                        <div class="form-group">
                            <label for="card-number">Card Number</label>
                            <input type="text" id="card-number" placeholder="1234 5678 9012 3456" required>
                        </div>
                        <div class="card-row">
                            <div class="form-group">
                                <label for="card-expiry">Expiry Date</label>
                                <input type="text" id="card-expiry" placeholder="MM/YY" required>
                            </div>
                            <div class="form-group">
                                <label for="card-cvv">CVV</label>
                                <input type="text" id="card-cvv" placeholder="123" required>
                            </div>
                        </div>
                    </div>
                    
                    <button type="submit" class="btn-primary">Complete Donation</button>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Close modal when clicking X or outside
        modal.querySelector('.close-modal').onclick = () => modal.remove();
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };

        // Handle form submission
        const form = modal.querySelector('#donation-form');
        form.onsubmit = async (e) => {
            e.preventDefault();
            
            const donorName = document.getElementById('donor-name').value;
            const amount = document.getElementById('donation-amount').value;
            
            console.log('Submitting donation:', { teamId, amount, donorName });
            
            try {
                const response = await fetch('/api/donations', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        teamId,
                        amount: parseFloat(amount),
                        donorName
                    })
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    console.error('Donation failed:', data);
                    throw new Error(data.error || 'Failed to submit donation');
                }
                
                console.log('Donation successful:', data);
                
                // Close modal
                modal.remove();
                
                // Refresh leaderboard
                loadLeaderboard();
                
                // Show success message
                alert('Thank you for your donation!');
            } catch (error) {
                console.error('Error submitting donation:', error);
                alert(`Failed to submit donation: ${error.message}`);
            }
        };
    };

    // Initial load
    loadLeaderboard();
}); 