// API Configuration
const API_BASE_URL = window.location.origin + '/api';
let authToken = localStorage.getItem('authToken') || null;
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    if (authToken && currentUser) {
        showAdminPortal();
        loadDashboard();
    } else {
        showLoginPage();
    }

    // Event Listeners
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    document.getElementById('menuToggle')?.addEventListener('click', toggleSidebar);

    // Navigation
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToPage(item.dataset.page);
        });
    });

    // Button Listeners
    document.getElementById('addClientBtn')?.addEventListener('click', () => showClientModal());
    document.getElementById('addSubscriptionBtn')?.addEventListener('click', () => showSubscriptionModal());
    document.getElementById('sendBulkAlertBtn')?.addEventListener('click', showBulkAlertModal);
    document.getElementById('sendAllRemindersBtn')?.addEventListener('click', sendAllReminders);
    document.getElementById('clientSearch')?.addEventListener('input', (e) => searchClients(e.target.value));

    // Filter buttons
    document.querySelectorAll('.btn-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadSubscriptions(btn.dataset.filter);
        });
    });
});

// Authentication Functions
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showAdminPortal();
            loadDashboard();
        } else {
            errorDiv.textContent = data.error || 'Login failed';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'Connection error. Please try again.';
        errorDiv.style.display = 'block';
    }
}

function handleLogout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    showLoginPage();
}

function showLoginPage() {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('adminPortal').style.display = 'none';
}

function showAdminPortal() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('adminPortal').style.display = 'flex';
    document.getElementById('adminUsername').textContent = currentUser.username;
}

// Navigation
function navigateToPage(pageName) {
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`[data-page="${pageName}"]`).classList.add('active');

    // Update page title
    const titles = {
        dashboard: 'Dashboard',
        clients: 'Clients',
        subscriptions: 'Subscriptions',
        alerts: 'WhatsApp Alerts',
        expiring: 'Expiring Soon'
    };
    document.getElementById('pageTitle').textContent = titles[pageName] || pageName;

    // Show/hide pages
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(`${pageName}Page`).classList.add('active');

    // Load page data
    switch(pageName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'clients':
            loadClients();
            break;
        case 'subscriptions':
            loadSubscriptions();
            break;
        case 'alerts':
            loadAlerts();
            break;
        case 'expiring':
            loadExpiringSubscriptions();
            break;
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

// API Helper
async function apiCall(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    return response.json();
}

// Dashboard Functions
async function loadDashboard() {
    try {
        const stats = await apiCall('/subscriptions/stats/dashboard');
        
        document.getElementById('totalClients').textContent = stats.total_clients || 0;
        document.getElementById('activeSubscriptions').textContent = stats.active_subscriptions || 0;
        document.getElementById('expiringSoon').textContent = stats.expiring_soon || 0;
        document.getElementById('expiredSubscriptions').textContent = stats.expired_subscriptions || 0;

        // Load recent subscriptions
        const subscriptions = await apiCall('/subscriptions');
        displayRecentSubscriptions(subscriptions.slice(0, 10));
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function displayRecentSubscriptions(subscriptions) {
    const tbody = document.querySelector('#recentSubscriptionsTable tbody');
    tbody.innerHTML = '';

    subscriptions.forEach(sub => {
        const daysLeft = Math.ceil((new Date(sub.end_date) - new Date()) / (1000 * 60 * 60 * 24));
        const statusClass = sub.status === 'active' ? 'success' : 'danger';
        
        tbody.innerHTML += `
            <tr>
                <td>${sub.client_name}</td>
                <td>${sub.plan_name}</td>
                <td>${formatDate(sub.end_date)}</td>
                <td><span class="badge badge-${statusClass}">${sub.status}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="renewSubscription(${sub.id})">
                            <i class="fas fa-redo"></i> Renew
                        </button>
                        <button class="btn btn-sm btn-success" onclick="sendReminder(${sub.id})">
                            <i class="fas fa-bell"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
}

// Client Functions
async function loadClients() {
    try {
        const clients = await apiCall('/clients');
        displayClients(clients);
    } catch (error) {
        console.error('Error loading clients:', error);
    }
}

function displayClients(clients) {
    const tbody = document.querySelector('#clientsTable tbody');
    tbody.innerHTML = '';

    clients.forEach(client => {
        const statusClass = client.status === 'active' ? 'success' : 'danger';
        
        tbody.innerHTML += `
            <tr>
                <td><strong>${client.name}</strong></td>
                <td>${client.phone}</td>
                <td>${client.whatsapp_number}</td>
                <td>${client.email || '-'}</td>
                <td>${client.subscription_count || 0} (${client.active_subscriptions || 0} active)</td>
                <td><span class="badge badge-${statusClass}">${client.status}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="editClient(${client.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-success" onclick="addSubscriptionForClient(${client.id})">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteClient(${client.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
}

async function searchClients(query) {
    if (query.length < 2) {
        loadClients();
        return;
    }

    try {
        const clients = await apiCall(`/clients/search/${query}`);
        displayClients(clients);
    } catch (error) {
        console.error('Error searching clients:', error);
    }
}

// Subscription Functions
async function loadSubscriptions(filter = 'all') {
    try {
        let subscriptions;
        if (filter === 'expired') {
            subscriptions = await apiCall('/subscriptions/expired');
        } else {
            subscriptions = await apiCall('/subscriptions');
            if (filter === 'active') {
                subscriptions = subscriptions.filter(s => s.status === 'active');
            }
        }
        displaySubscriptions(subscriptions);
    } catch (error) {
        console.error('Error loading subscriptions:', error);
    }
}

function displaySubscriptions(subscriptions) {
    const tbody = document.querySelector('#subscriptionsTable tbody');
    tbody.innerHTML = '';

    subscriptions.forEach(sub => {
        const statusClass = sub.status === 'active' ? 'success' : 'danger';
        const paymentClass = sub.payment_status === 'paid' ? 'success' : 'warning';
        
        tbody.innerHTML += `
            <tr>
                <td><strong>${sub.client_name}</strong></td>
                <td>${sub.plan_name}</td>
                <td>${sub.device_type || '-'}</td>
                <td>${formatDate(sub.start_date)}</td>
                <td>${formatDate(sub.end_date)}</td>
                <td><span class="badge badge-${statusClass}">${sub.status}</span></td>
                <td><span class="badge badge-${paymentClass}">${sub.payment_status || 'N/A'}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="renewSubscription(${sub.id})">
                            <i class="fas fa-redo"></i>
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="editSubscription(${sub.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-success" onclick="sendReminder(${sub.id})">
                            <i class="fas fa-bell"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
}

async function loadExpiringSubscriptions() {
    try {
        const subscriptions = await apiCall('/subscriptions/expiring?days=7');
        displayExpiringSubscriptions(subscriptions);
    } catch (error) {
        console.error('Error loading expiring subscriptions:', error);
    }
}

function displayExpiringSubscriptions(subscriptions) {
    const tbody = document.querySelector('#expiringTable tbody');
    tbody.innerHTML = '';

    if (subscriptions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No subscriptions expiring in the next 7 days</td></tr>';
        return;
    }

    subscriptions.forEach(sub => {
        const daysLeft = Math.ceil((new Date(sub.end_date) - new Date()) / (1000 * 60 * 60 * 24));
        const urgencyClass = daysLeft <= 3 ? 'danger' : 'warning';
        
        tbody.innerHTML += `
            <tr>
                <td><strong>${sub.client_name}</strong></td>
                <td>${sub.plan_name}</td>
                <td>${formatDate(sub.end_date)}</td>
                <td><span class="badge badge-${urgencyClass}">${daysLeft} day${daysLeft !== 1 ? 's' : ''}</span></td>
                <td>${sub.whatsapp_number}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="renewSubscription(${sub.id})">
                            <i class="fas fa-redo"></i> Renew
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="sendReminder(${sub.id})">
                            <i class="fas fa-paper-plane"></i> Remind
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
}

// WhatsApp Alert Functions
async function loadAlerts() {
    try {
        const alerts = await apiCall('/whatsapp/alerts');
        displayAlerts(alerts);
    } catch (error) {
        console.error('Error loading alerts:', error);
    }
}

function displayAlerts(alerts) {
    const tbody = document.querySelector('#alertsTable tbody');
    tbody.innerHTML = '';

    if (alerts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No alerts sent yet</td></tr>';
        return;
    }

    alerts.forEach(alert => {
        const statusClass = alert.status === 'sent' ? 'success' : 'danger';
        const truncatedMessage = alert.message.substring(0, 50) + (alert.message.length > 50 ? '...' : '');
        
        tbody.innerHTML += `
            <tr>
                <td>${formatDateTime(alert.sent_at)}</td>
                <td>${alert.client_name || 'N/A'}</td>
                <td>${alert.whatsapp_number}</td>
                <td title="${escapeHtml(alert.message)}">${escapeHtml(truncatedMessage)}</td>
                <td><span class="badge badge-${statusClass}">${alert.status}</span></td>
            </tr>
        `;
    });
}

async function sendReminder(subscriptionId) {
    if (!confirm('Send renewal reminder via WhatsApp?')) return;

    try {
        const result = await apiCall(`/whatsapp/send-renewal-reminder/${subscriptionId}`, 'POST');
        if (result.success) {
            alert('Reminder sent successfully!');
            loadAlerts();
        } else {
            alert('Failed to send reminder: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        alert('Error sending reminder: ' + error.message);
    }
}

async function sendAllReminders() {
    if (!confirm('Send reminders to all expiring subscriptions?')) return;

    try {
        const subscriptions = await apiCall('/subscriptions/expiring?days=7');
        let sent = 0;
        let failed = 0;

        for (const sub of subscriptions) {
            try {
                const result = await apiCall(`/whatsapp/send-renewal-reminder/${sub.id}`, 'POST');
                if (result.success) sent++;
                else failed++;
            } catch (error) {
                failed++;
            }
        }

        alert(`Reminders sent: ${sent}\nFailed: ${failed}`);
        loadAlerts();
    } catch (error) {
        alert('Error sending reminders: ' + error.message);
    }
}

// Modal Functions
function showClientModal(clientId = null) {
    const isEdit = clientId !== null;
    const modalHtml = `
        <div class="modal-overlay" id="clientModal">
            <div class="modal">
                <div class="modal-header">
                    <h2>${isEdit ? 'Edit' : 'Add'} Client</h2>
                    <button class="modal-close" onclick="closeModal('clientModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="clientForm">
                        <input type="hidden" id="clientId" value="${clientId || ''}">
                        <div class="form-group">
                            <label>Name *</label>
                            <input type="text" id="clientName" required>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Phone *</label>
                                <input type="tel" id="clientPhone" required>
                            </div>
                            <div class="form-group">
                                <label>WhatsApp Number *</label>
                                <input type="tel" id="clientWhatsapp" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="clientEmail">
                        </div>
                        <div class="form-group">
                            <label>Address</label>
                            <textarea id="clientAddress" rows="2"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Notes</label>
                            <textarea id="clientNotes" rows="2"></textarea>
                        </div>
                        ${isEdit ? `
                        <div class="form-group">
                            <label>Status</label>
                            <select id="clientStatus">
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                        ` : ''}
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('clientModal')">Cancel</button>
                    <button class="btn btn-primary" onclick="saveClient()">${isEdit ? 'Update' : 'Add'} Client</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalContainer').innerHTML = modalHtml;

    if (isEdit) {
        loadClientData(clientId);
    }
}

async function loadClientData(clientId) {
    try {
        const client = await apiCall(`/clients/${clientId}`);
        document.getElementById('clientName').value = client.name;
        document.getElementById('clientPhone').value = client.phone;
        document.getElementById('clientWhatsapp').value = client.whatsapp_number;
        document.getElementById('clientEmail').value = client.email || '';
        document.getElementById('clientAddress').value = client.address || '';
        document.getElementById('clientNotes').value = client.notes || '';
        if (document.getElementById('clientStatus')) {
            document.getElementById('clientStatus').value = client.status;
        }
    } catch (error) {
        alert('Error loading client data');
    }
}

async function saveClient() {
    const clientId = document.getElementById('clientId').value;
    const clientData = {
        name: document.getElementById('clientName').value,
        phone: document.getElementById('clientPhone').value,
        whatsapp_number: document.getElementById('clientWhatsapp').value,
        email: document.getElementById('clientEmail').value,
        address: document.getElementById('clientAddress').value,
        notes: document.getElementById('clientNotes').value,
        status: document.getElementById('clientStatus')?.value || 'active'
    };

    try {
        if (clientId) {
            await apiCall(`/clients/${clientId}`, 'PUT', clientData);
            alert('Client updated successfully!');
        } else {
            await apiCall('/clients', 'POST', clientData);
            alert('Client added successfully!');
        }
        closeModal('clientModal');
        loadClients();
    } catch (error) {
        alert('Error saving client: ' + error.message);
    }
}

async function editClient(clientId) {
    showClientModal(clientId);
}

async function deleteClient(clientId) {
    if (!confirm('Are you sure you want to delete this client? This will also delete all their subscriptions.')) return;

    try {
        await apiCall(`/clients/${clientId}`, 'DELETE');
        alert('Client deleted successfully!');
        loadClients();
    } catch (error) {
        alert('Error deleting client: ' + error.message);
    }
}

function showSubscriptionModal(subscriptionId = null, clientId = null) {
    const isEdit = subscriptionId !== null;
    const modalHtml = `
        <div class="modal-overlay" id="subscriptionModal">
            <div class="modal">
                <div class="modal-header">
                    <h2>${isEdit ? 'Edit' : 'Add'} Subscription</h2>
                    <button class="modal-close" onclick="closeModal('subscriptionModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="subscriptionForm">
                        <input type="hidden" id="subscriptionId" value="${subscriptionId || ''}">
                        ${!isEdit ? `
                        <div class="form-group">
                            <label>Client *</label>
                            <select id="subscriptionClient" required>
                                <option value="">Select Client</option>
                            </select>
                        </div>
                        ` : ''}
                        <div class="form-row">
                            <div class="form-group">
                                <label>Plan Name *</label>
                                <input type="text" id="subscriptionPlan" required placeholder="e.g., Premium IPTV">
                            </div>
                            <div class="form-group">
                                <label>Device Type</label>
                                <input type="text" id="subscriptionDevice" placeholder="e.g., Android Box, Smart TV">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Username</label>
                                <input type="text" id="subscriptionUsername">
                            </div>
                            <div class="form-group">
                                <label>Password</label>
                                <input type="text" id="subscriptionPassword">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Start Date *</label>
                                <input type="date" id="subscriptionStart" required>
                            </div>
                            <div class="form-group">
                                <label>End Date *</label>
                                <input type="date" id="subscriptionEnd" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Price</label>
                                <input type="number" id="subscriptionPrice" step="0.01" placeholder="0.00">
                            </div>
                            <div class="form-group">
                                <label>Payment Status</label>
                                <select id="subscriptionPayment">
                                    <option value="paid">Paid</option>
                                    <option value="pending">Pending</option>
                                    <option value="unpaid">Unpaid</option>
                                </select>
                            </div>
                        </div>
                        ${isEdit ? `
                        <div class="form-group">
                            <label>Status</label>
                            <select id="subscriptionStatus">
                                <option value="active">Active</option>
                                <option value="expired">Expired</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                        ` : ''}
                        <div class="form-group">
                            <label>Notes</label>
                            <textarea id="subscriptionNotes" rows="2"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('subscriptionModal')">Cancel</button>
                    <button class="btn btn-primary" onclick="saveSubscription()">${isEdit ? 'Update' : 'Add'} Subscription</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalContainer').innerHTML = modalHtml;

    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('subscriptionStart').value = today;
    
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    document.getElementById('subscriptionEnd').value = nextMonth.toISOString().split('T')[0];

    if (!isEdit) {
        loadClientsForSelect(clientId);
    } else {
        loadSubscriptionData(subscriptionId);
    }
}

async function loadClientsForSelect(selectedClientId = null) {
    try {
        const clients = await apiCall('/clients');
        const select = document.getElementById('subscriptionClient');
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = `${client.name} (${client.phone})`;
            if (client.id == selectedClientId) option.selected = true;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading clients:', error);
    }
}

async function loadSubscriptionData(subscriptionId) {
    try {
        const subscriptions = await apiCall('/subscriptions');
        const sub = subscriptions.find(s => s.id == subscriptionId);
        
        if (sub) {
            document.getElementById('subscriptionPlan').value = sub.plan_name;
            document.getElementById('subscriptionDevice').value = sub.device_type || '';
            document.getElementById('subscriptionUsername').value = sub.username || '';
            document.getElementById('subscriptionPassword').value = sub.password || '';
            document.getElementById('subscriptionStart').value = sub.start_date;
            document.getElementById('subscriptionEnd').value = sub.end_date;
            document.getElementById('subscriptionPrice').value = sub.price || '';
            document.getElementById('subscriptionPayment').value = sub.payment_status || 'paid';
            document.getElementById('subscriptionNotes').value = sub.notes || '';
            if (document.getElementById('subscriptionStatus')) {
                document.getElementById('subscriptionStatus').value = sub.status;
            }
        }
    } catch (error) {
        alert('Error loading subscription data');
    }
}

async function saveSubscription() {
    const subscriptionId = document.getElementById('subscriptionId').value;
    const subscriptionData = {
        plan_name: document.getElementById('subscriptionPlan').value,
        device_type: document.getElementById('subscriptionDevice').value,
        username: document.getElementById('subscriptionUsername').value,
        password: document.getElementById('subscriptionPassword').value,
        start_date: document.getElementById('subscriptionStart').value,
        end_date: document.getElementById('subscriptionEnd').value,
        price: document.getElementById('subscriptionPrice').value || null,
        payment_status: document.getElementById('subscriptionPayment').value,
        notes: document.getElementById('subscriptionNotes').value,
        status: document.getElementById('subscriptionStatus')?.value || 'active'
    };

    if (!subscriptionId) {
        subscriptionData.client_id = document.getElementById('subscriptionClient').value;
    }

    try {
        if (subscriptionId) {
            await apiCall(`/subscriptions/${subscriptionId}`, 'PUT', subscriptionData);
            alert('Subscription updated successfully!');
        } else {
            await apiCall('/subscriptions', 'POST', subscriptionData);
            alert('Subscription added successfully!');
        }
        closeModal('subscriptionModal');
        loadSubscriptions();
        loadDashboard();
    } catch (error) {
        alert('Error saving subscription: ' + error.message);
    }
}

async function addSubscriptionForClient(clientId) {
    showSubscriptionModal(null, clientId);
}

async function editSubscription(subscriptionId) {
    showSubscriptionModal(subscriptionId);
}

function renewSubscription(subscriptionId) {
    const modalHtml = `
        <div class="modal-overlay" id="renewModal">
            <div class="modal">
                <div class="modal-header">
                    <h2>Renew Subscription</h2>
                    <button class="modal-close" onclick="closeModal('renewModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="renewForm">
                        <input type="hidden" id="renewSubscriptionId" value="${subscriptionId}">
                        <div class="form-group">
                            <label>Duration (Months) *</label>
                            <input type="number" id="renewMonths" value="1" min="1" required>
                        </div>
                        <div class="form-group">
                            <label>Price</label>
                            <input type="number" id="renewPrice" step="0.01" placeholder="0.00">
                        </div>
                        <div class="form-group">
                            <label>Payment Status</label>
                            <select id="renewPayment">
                                <option value="paid">Paid</option>
                                <option value="pending">Pending</option>
                                <option value="unpaid">Unpaid</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('renewModal')">Cancel</button>
                    <button class="btn btn-primary" onclick="saveRenewal()">Renew Subscription</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalContainer').innerHTML = modalHtml;
}

async function saveRenewal() {
    const subscriptionId = document.getElementById('renewSubscriptionId').value;
    const renewalData = {
        months: document.getElementById('renewMonths').value,
        price: document.getElementById('renewPrice').value || null,
        payment_status: document.getElementById('renewPayment').value
    };

    try {
        await apiCall(`/subscriptions/${subscriptionId}/renew`, 'POST', renewalData);
        alert('Subscription renewed successfully!');
        closeModal('renewModal');
        loadSubscriptions();
        loadDashboard();
    } catch (error) {
        alert('Error renewing subscription: ' + error.message);
    }
}

function showBulkAlertModal() {
    const modalHtml = `
        <div class="modal-overlay" id="bulkAlertModal">
            <div class="modal">
                <div class="modal-header">
                    <h2>Send Bulk WhatsApp Alert</h2>
                    <button class="modal-close" onclick="closeModal('bulkAlertModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="bulkAlertForm">
                        <div class="form-group">
                            <label>Recipients</label>
                            <select id="bulkRecipients">
                                <option value="all_active">All Active Clients</option>
                                <option value="expiring">Expiring Subscriptions Only</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Message *</label>
                            <textarea id="bulkMessage" rows="6" required placeholder="Enter your message here..."></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('bulkAlertModal')">Cancel</button>
                    <button class="btn btn-primary" onclick="sendBulkAlert()">Send Messages</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalContainer').innerHTML = modalHtml;
}

async function sendBulkAlert() {
    const recipients = document.getElementById('bulkRecipients').value;
    const message = document.getElementById('bulkMessage').value;

    if (!message) {
        alert('Please enter a message');
        return;
    }

    if (!confirm('Send this message to selected recipients?')) return;

    try {
        let clients;
        if (recipients === 'expiring') {
            clients = await apiCall('/subscriptions/expiring?days=7');
        } else {
            clients = await apiCall('/clients');
        }

        let sent = 0;
        let failed = 0;

        for (const client of clients) {
            try {
                const result = await apiCall('/whatsapp/send', 'POST', {
                    client_id: client.client_id || client.id,
                    whatsapp_number: client.whatsapp_number,
                    message: message
                });
                if (result.success) sent++;
                else failed++;
            } catch (error) {
                failed++;
            }
        }

        alert(`Messages sent: ${sent}\nFailed: ${failed}`);
        closeModal('bulkAlertModal');
        loadAlerts();
    } catch (error) {
        alert('Error sending bulk alerts: ' + error.message);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.remove();
}

// Utility Functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
