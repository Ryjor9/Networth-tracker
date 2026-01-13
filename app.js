// Net Worth Tracker - JavaScript Application
// All data is stored in browser localStorage

// ==================== Data Structure ====================

let assets = [];
let liabilities = [];
let snapshots = [];
let editingAssetId = null;
let editingLiabilityId = null;

// Asset categories with icons
const assetCategories = {
    'Real Estate': '🏠',
    'Vehicle': '🚗',
    'Bank Account': '🏦',
    'Investment Account': '📈',
    'Retirement Account': '📅',
    'Cash': '💵',
    'Cryptocurrency': '₿',
    'Business Interest': '💼',
    'Collectibles': '🎨',
    'Jewelry': '💎',
    'Other': '📦'
};

// Liability categories with icons
const liabilityCategories = {
    'Mortgage': '🏠',
    'Auto Loan': '🚗',
    'Student Loan': '🎓',
    'Credit Card': '💳',
    'Personal Loan': '👤',
    'Business Loan': '💼',
    'Medical Debt': '🏥',
    'Other': '📄'
};

// ==================== Initialization ====================

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initializeEventListeners();
    updateAllDisplays();
});

function loadData() {
    const savedAssets = localStorage.getItem('networth_assets');
    const savedLiabilities = localStorage.getItem('networth_liabilities');
    const savedSnapshots = localStorage.getItem('networth_snapshots');
    
    if (savedAssets) assets = JSON.parse(savedAssets);
    if (savedLiabilities) liabilities = JSON.parse(savedLiabilities);
    if (savedSnapshots) snapshots = JSON.parse(savedSnapshots);
}

function saveData() {
    localStorage.setItem('networth_assets', JSON.stringify(assets));
    localStorage.setItem('networth_liabilities', JSON.stringify(liabilities));
    localStorage.setItem('networth_snapshots', JSON.stringify(snapshots));
}

// ==================== Event Listeners ====================

function initializeEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Add buttons
    document.getElementById('add-asset-btn').addEventListener('click', () => openAssetModal());
    document.getElementById('add-liability-btn').addEventListener('click', () => openLiabilityModal());
    
    // Modal close buttons
    document.querySelectorAll('.close-btn, .cancel-btn').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });

    // Form submissions
    document.getElementById('asset-form').addEventListener('submit', handleAssetSubmit);
    document.getElementById('liability-form').addEventListener('submit', handleLiabilitySubmit);

    // Settings buttons
    document.getElementById('export-template-btn').addEventListener('click', exportTemplate);
    document.getElementById('export-data-btn').addEventListener('click', exportData);
    document.getElementById('delete-all-btn').addEventListener('click', deleteAllData);
    document.getElementById('take-snapshot-btn').addEventListener('click', takeSnapshot);
    
    // CSV Import
    document.getElementById('import-csv-btn').addEventListener('click', () => {
        document.getElementById('import-modal').classList.add('active');
    });
    
    document.getElementById('csv-file-input').addEventListener('change', (e) => {
        const btn = document.getElementById('process-import-btn');
        btn.disabled = !e.target.files.length;
    });
    
    document.getElementById('process-import-btn').addEventListener('click', processImport);

    // Category change listeners for showing/hiding debt/asset associations
    document.getElementById('asset-category').addEventListener('change', updateAssetDebtOptions);
    document.getElementById('liability-category').addEventListener('change', updateLiabilityAssetOptions);

    // Close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeAllModals();
        });
    });
}

// ==================== Tab Switching ====================

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Update displays for the active tab
    if (tabName === 'overview') {
        updateOverview();
    } else if (tabName === 'breakdown') {
        updateBreakdown();
    } else if (tabName === 'manage') {
        displayAssets();
        displayLiabilities();
    } else if (tabName === 'settings') {
        updateStats();
    }
}

// ==================== Calculations ====================

function calculateTotalAssets() {
    return assets.reduce((total, asset) => total + parseFloat(asset.currentValue), 0);
}

function calculateTotalLiabilities() {
    return liabilities.reduce((total, liability) => total + parseFloat(liability.currentBalance), 0);
}

function calculateNetWorth() {
    return calculateTotalAssets() - calculateTotalLiabilities();
}

function calculateAssetEquity(asset) {
    if (!asset.associatedDebtId) return asset.currentValue;
    
    const debt = liabilities.find(l => l.id === asset.associatedDebtId);
    if (!debt) return asset.currentValue;
    
    return asset.currentValue - debt.currentBalance;
}

function calculateRealEstateEquity() {
    return assets
        .filter(a => a.category === 'Real Estate')
        .reduce((total, asset) => total + calculateAssetEquity(asset), 0);
}

function calculateVehicleEquity() {
    return assets
        .filter(a => a.category === 'Vehicle')
        .reduce((total, asset) => total + calculateAssetEquity(asset), 0);
}

function calculatePayoffPercentage(liability) {
    const paid = liability.originalAmount - liability.currentBalance;
    return (paid / liability.originalAmount) * 100;
}

// ==================== Display Functions ====================

function updateAllDisplays() {
    updateOverview();
    updateBreakdown();
    displayAssets();
    displayLiabilities();
    updateStats();
}

function updateOverview() {
    const netWorth = calculateNetWorth();
    const totalAssets = calculateTotalAssets();
    const totalLiabilities = calculateTotalLiabilities();
    
    // Update net worth display
    document.getElementById('net-worth-display').textContent = formatCurrency(netWorth);
    
    // Update change display
    const changeElement = document.getElementById('net-worth-change');
    if (snapshots.length > 0) {
        const lastSnapshot = snapshots[snapshots.length - 1];
        const change = netWorth - lastSnapshot.netWorth;
        const percentage = lastSnapshot.netWorth !== 0 ? (change / Math.abs(lastSnapshot.netWorth)) * 100 : 0;
        
        if (change !== 0) {
            const arrow = change >= 0 ? '↑' : '↓';
            changeElement.textContent = `${arrow} ${formatCurrency(Math.abs(change))} (${percentage.toFixed(2)}%)`;
            changeElement.className = change >= 0 ? 'net-worth-change positive' : 'net-worth-change negative';
        } else {
            changeElement.textContent = '';
        }
    } else {
        changeElement.textContent = '';
    }
    
    // Update summary cards
    document.getElementById('total-assets').textContent = formatCurrency(totalAssets);
    document.getElementById('total-liabilities').textContent = formatCurrency(totalLiabilities);
}

function updateBreakdown() {
    // Update equity
    document.getElementById('real-estate-equity').textContent = formatCurrency(calculateRealEstateEquity());
    document.getElementById('vehicle-equity').textContent = formatCurrency(calculateVehicleEquity());
    
    // Display assets breakdown
    const assetsBreakdown = document.getElementById('assets-breakdown');
    const assetsByCategory = {};
    
    assets.forEach(asset => {
        if (!assetsByCategory[asset.category]) {
            assetsByCategory[asset.category] = {
                count: 0,
                total: 0
            };
        }
        assetsByCategory[asset.category].count++;
        assetsByCategory[asset.category].total += asset.currentValue;
    });
    
    if (Object.keys(assetsByCategory).length === 0) {
        assetsBreakdown.innerHTML = '<p class="empty-state">No assets to display</p>';
    } else {
        assetsBreakdown.innerHTML = Object.entries(assetsByCategory)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([category, data]) => `
                <div class="breakdown-item">
                    <div class="breakdown-item-left">
                        <div class="breakdown-icon">${assetCategories[category]}</div>
                        <div class="breakdown-info">
                            <h4>${category}</h4>
                            <div class="breakdown-count">${data.count} item${data.count !== 1 ? 's' : ''}</div>
                        </div>
                    </div>
                    <div class="breakdown-value" style="color: #22c55e;">${formatCurrency(data.total)}</div>
                </div>
            `).join('');
    }
    
    // Display liabilities breakdown
    const liabilitiesBreakdown = document.getElementById('liabilities-breakdown');
    const liabilitiesByCategory = {};
    
    liabilities.forEach(liability => {
        if (!liabilitiesByCategory[liability.category]) {
            liabilitiesByCategory[liability.category] = {
                count: 0,
                total: 0
            };
        }
        liabilitiesByCategory[liability.category].count++;
        liabilitiesByCategory[liability.category].total += liability.currentBalance;
    });
    
    if (Object.keys(liabilitiesByCategory).length === 0) {
        liabilitiesBreakdown.innerHTML = '<p class="empty-state">No liabilities to display</p>';
    } else {
        liabilitiesBreakdown.innerHTML = Object.entries(liabilitiesByCategory)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([category, data]) => `
                <div class="breakdown-item">
                    <div class="breakdown-item-left">
                        <div class="breakdown-icon">${liabilityCategories[category]}</div>
                        <div class="breakdown-info">
                            <h4>${category}</h4>
                            <div class="breakdown-count">${data.count} item${data.count !== 1 ? 's' : ''}</div>
                        </div>
                    </div>
                    <div class="breakdown-value" style="color: #ef4444;">${formatCurrency(data.total)}</div>
                </div>
            `).join('');
    }
    
    // Display snapshots
    displaySnapshots();
}

function displaySnapshots() {
    const container = document.getElementById('snapshots-list');
    
    if (snapshots.length === 0) {
        container.innerHTML = '<p class="empty-state">No snapshots yet. Take your first snapshot!</p>';
        return;
    }
    
    const recentSnapshots = snapshots.slice(-5).reverse();
    container.innerHTML = recentSnapshots.map(snapshot => `
        <div class="snapshot-item">
            <div class="snapshot-info">
                <h4>${formatDate(snapshot.date)}</h4>
                ${snapshot.notes ? `<p>${snapshot.notes}</p>` : ''}
            </div>
            <div class="snapshot-value ${snapshot.netWorth >= 0 ? 'positive' : 'negative'}">
                ${formatCurrency(snapshot.netWorth)}
            </div>
        </div>
    `).join('');
}

function displayAssets() {
    const container = document.getElementById('assets-list');
    
    if (assets.length === 0) {
        container.innerHTML = '<p class="empty-state">No assets yet. Click "Add Asset" to get started!</p>';
        return;
    }
    
    // Group assets by category
    const grouped = {};
    assets.forEach(asset => {
        if (!grouped[asset.category]) grouped[asset.category] = [];
        grouped[asset.category].push(asset);
    });
    
    container.innerHTML = Object.entries(grouped).map(([category, items]) => {
        const categoryHtml = items.map(asset => {
            const equity = calculateAssetEquity(asset);
            const gain = asset.currentValue - asset.purchasePrice;
            const gainPercent = (gain / asset.purchasePrice) * 100;
            
            return `
                <div class="item-card" onclick="editAsset('${asset.id}')">
                    <div class="item-card-left">
                        <div class="item-icon">${assetCategories[asset.category]}</div>
                        <div class="item-info">
                            <h4>${asset.name}</h4>
                            <div class="item-details">
                                <span>${formatDate(asset.purchaseDate)}</span>
                                ${asset.associatedDebtId ? '<span>🔗 Linked</span>' : ''}
                            </div>
                        </div>
                    </div>
                    <div class="item-card-right">
                        <div class="item-value">${formatCurrency(asset.currentValue)}</div>
                        ${asset.associatedDebtId ? 
                            `<div class="item-secondary">Equity: ${formatCurrency(equity)}</div>` :
                            `<div class="item-secondary ${gain >= 0 ? 'positive' : 'negative'}">
                                ${gain >= 0 ? '↑' : '↓'} ${formatCurrency(Math.abs(gain))} (${gainPercent.toFixed(1)}%)
                            </div>`
                        }
                        <div class="item-actions" onclick="event.stopPropagation()">
                            <button class="btn-icon btn-edit" onclick="editAsset('${asset.id}')">Edit</button>
                            <button class="btn-icon btn-delete" onclick="deleteAsset('${asset.id}')">Delete</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        return `
            <div class="category-section">
                <h3 style="margin-bottom: 15px; color: #475569;">${category}</h3>
                ${categoryHtml}
            </div>
        `;
    }).join('');
}

function displayLiabilities() {
    const container = document.getElementById('liabilities-list');
    
    if (liabilities.length === 0) {
        container.innerHTML = '<p class="empty-state">No liabilities yet. Click "Add Liability" to get started!</p>';
        return;
    }
    
    // Group liabilities by category
    const grouped = {};
    liabilities.forEach(liability => {
        if (!grouped[liability.category]) grouped[liability.category] = [];
        grouped[liability.category].push(liability);
    });
    
    container.innerHTML = Object.entries(grouped).map(([category, items]) => {
        const categoryHtml = items.map(liability => {
            const payoffPercent = calculatePayoffPercentage(liability);
            
            return `
                <div class="item-card" onclick="editLiability('${liability.id}')">
                    <div class="item-card-left">
                        <div class="item-icon">${liabilityCategories[liability.category]}</div>
                        <div class="item-info">
                            <h4>${liability.name}</h4>
                            <div class="item-details">
                                <span>${formatDate(liability.startDate)}</span>
                                ${liability.interestRate > 0 ? `<span>${liability.interestRate}% APR</span>` : ''}
                                ${liability.associatedAssetId ? '<span>🔗 Linked</span>' : ''}
                            </div>
                        </div>
                    </div>
                    <div class="item-card-right">
                        <div class="item-value" style="color: #ef4444;">${formatCurrency(liability.currentBalance)}</div>
                        ${payoffPercent > 0 ? 
                            `<div class="item-secondary positive">${payoffPercent.toFixed(0)}% paid off</div>` : 
                            ''
                        }
                        <div class="item-actions" onclick="event.stopPropagation()">
                            <button class="btn-icon btn-edit" onclick="editLiability('${liability.id}')">Edit</button>
                            <button class="btn-icon btn-delete" onclick="deleteLiability('${liability.id}')">Delete</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        return `
            <div class="category-section">
                <h3 style="margin-bottom: 15px; color: #475569;">${category}</h3>
                ${categoryHtml}
            </div>
        `;
    }).join('');
}

function updateStats() {
    document.getElementById('stats-assets').textContent = assets.length;
    document.getElementById('stats-liabilities').textContent = liabilities.length;
    document.getElementById('stats-snapshots').textContent = snapshots.length;
}

// ==================== Utility Functions ====================

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ==================== Modal Management ====================

function openAssetModal(assetId = null) {
    editingAssetId = assetId;
    const modal = document.getElementById('asset-modal');
    const form = document.getElementById('asset-form');
    
    form.reset();
    
    if (assetId) {
        const asset = assets.find(a => a.id === assetId);
        if (asset) {
            document.getElementById('asset-modal-title').textContent = 'Edit Asset';
            document.getElementById('asset-name').value = asset.name;
            document.getElementById('asset-category').value = asset.category;
            document.getElementById('asset-purchase-date').value = asset.purchaseDate;
            document.getElementById('asset-purchase-price').value = asset.purchasePrice;
            document.getElementById('asset-current-value').value = asset.currentValue;
            document.getElementById('asset-notes').value = asset.notes || '';
            
            updateAssetDebtOptions();
            if (asset.associatedDebtId) {
                document.getElementById('asset-associated-debt').value = asset.associatedDebtId;
            }
        }
    } else {
        document.getElementById('asset-modal-title').textContent = 'Add Asset';
    }
    
    modal.classList.add('active');
}

function openLiabilityModal(liabilityId = null) {
    editingLiabilityId = liabilityId;
    const modal = document.getElementById('liability-modal');
    const form = document.getElementById('liability-form');
    
    form.reset();
    
    if (liabilityId) {
        const liability = liabilities.find(l => l.id === liabilityId);
        if (liability) {
            document.getElementById('liability-modal-title').textContent = 'Edit Liability';
            document.getElementById('liability-name').value = liability.name;
            document.getElementById('liability-category').value = liability.category;
            document.getElementById('liability-original-amount').value = liability.originalAmount;
            document.getElementById('liability-current-balance').value = liability.currentBalance;
            document.getElementById('liability-interest-rate').value = liability.interestRate || '';
            document.getElementById('liability-start-date').value = liability.startDate;
            document.getElementById('liability-notes').value = liability.notes || '';
            
            updateLiabilityAssetOptions();
            if (liability.associatedAssetId) {
                document.getElementById('liability-associated-asset').value = liability.associatedAssetId;
            }
        }
    } else {
        document.getElementById('liability-modal-title').textContent = 'Add Liability';
    }
    
    modal.classList.add('active');
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    editingAssetId = null;
    editingLiabilityId = null;
}

function updateAssetDebtOptions() {
    const category = document.getElementById('asset-category').value;
    const debtGroup = document.getElementById('asset-debt-group');
    const debtSelect = document.getElementById('asset-associated-debt');
    
    // Show debt options for Real Estate, Vehicle, and Business Interest
    if (['Real Estate', 'Vehicle', 'Business Interest'].includes(category)) {
        debtGroup.style.display = 'block';
        
        // Filter liabilities based on category
        let applicableLiabilities = [];
        if (category === 'Real Estate') {
            applicableLiabilities = liabilities.filter(l => l.category === 'Mortgage');
        } else if (category === 'Vehicle') {
            applicableLiabilities = liabilities.filter(l => l.category === 'Auto Loan');
        } else if (category === 'Business Interest') {
            applicableLiabilities = liabilities.filter(l => l.category === 'Business Loan');
        }
        
        debtSelect.innerHTML = '<option value="">None</option>' + 
            applicableLiabilities.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
    } else {
        debtGroup.style.display = 'none';
    }
}

function updateLiabilityAssetOptions() {
    const category = document.getElementById('liability-category').value;
    const assetGroup = document.getElementById('liability-asset-group');
    const assetSelect = document.getElementById('liability-associated-asset');
    
    // Show asset options for Mortgage, Auto Loan, and Business Loan
    if (['Mortgage', 'Auto Loan', 'Business Loan'].includes(category)) {
        assetGroup.style.display = 'block';
        
        // Filter assets based on category
        let applicableAssets = [];
        if (category === 'Mortgage') {
            applicableAssets = assets.filter(a => a.category === 'Real Estate');
        } else if (category === 'Auto Loan') {
            applicableAssets = assets.filter(a => a.category === 'Vehicle');
        } else if (category === 'Business Loan') {
            applicableAssets = assets.filter(a => a.category === 'Business Interest');
        }
        
        assetSelect.innerHTML = '<option value="">None</option>' + 
            applicableAssets.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    } else {
        assetGroup.style.display = 'none';
    }
}

// ==================== Form Submissions ====================

function handleAssetSubmit(e) {
    e.preventDefault();
    
    const assetData = {
        id: editingAssetId || generateId(),
        name: document.getElementById('asset-name').value,
        category: document.getElementById('asset-category').value,
        purchaseDate: document.getElementById('asset-purchase-date').value,
        purchasePrice: parseFloat(document.getElementById('asset-purchase-price').value),
        currentValue: parseFloat(document.getElementById('asset-current-value').value),
        associatedDebtId: document.getElementById('asset-associated-debt').value || null,
        notes: document.getElementById('asset-notes').value,
        createdAt: editingAssetId ? assets.find(a => a.id === editingAssetId).createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    if (editingAssetId) {
        const index = assets.findIndex(a => a.id === editingAssetId);
        assets[index] = assetData;
    } else {
        assets.push(assetData);
    }
    
    saveData();
    updateAllDisplays();
    closeAllModals();
}

function handleLiabilitySubmit(e) {
    e.preventDefault();
    
    const liabilityData = {
        id: editingLiabilityId || generateId(),
        name: document.getElementById('liability-name').value,
        category: document.getElementById('liability-category').value,
        originalAmount: parseFloat(document.getElementById('liability-original-amount').value),
        currentBalance: parseFloat(document.getElementById('liability-current-balance').value),
        interestRate: parseFloat(document.getElementById('liability-interest-rate').value) || 0,
        startDate: document.getElementById('liability-start-date').value,
        associatedAssetId: document.getElementById('liability-associated-asset').value || null,
        notes: document.getElementById('liability-notes').value,
        createdAt: editingLiabilityId ? liabilities.find(l => l.id === editingLiabilityId).createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    if (editingLiabilityId) {
        const index = liabilities.findIndex(l => l.id === editingLiabilityId);
        liabilities[index] = liabilityData;
    } else {
        liabilities.push(liabilityData);
    }
    
    saveData();
    updateAllDisplays();
    closeAllModals();
}

// ==================== CRUD Operations ====================

function editAsset(id) {
    openAssetModal(id);
}

function deleteAsset(id) {
    if (confirm('Are you sure you want to delete this asset?')) {
        assets = assets.filter(a => a.id !== id);
        saveData();
        updateAllDisplays();
    }
}

function editLiability(id) {
    openLiabilityModal(id);
}

function deleteLiability(id) {
    if (confirm('Are you sure you want to delete this liability?')) {
        liabilities = liabilities.filter(l => l.id !== id);
        saveData();
        updateAllDisplays();
    }
}

// ==================== Snapshots ====================

function takeSnapshot() {
    const notes = prompt('Add a note for this snapshot (optional):');
    
    const snapshot = {
        id: generateId(),
        date: new Date().toISOString(),
        totalAssets: calculateTotalAssets(),
        totalLiabilities: calculateTotalLiabilities(),
        netWorth: calculateNetWorth(),
        notes: notes || ''
    };
    
    snapshots.push(snapshot);
    saveData();
    updateDashboard();
    
    alert('Snapshot saved successfully!');
}

// ==================== CSV Functions ====================

function exportTemplate() {
    const csv = `Type,Name,Category,Purchase Date,Purchase Price,Current Value,Original Amount,Current Balance,Interest Rate,Start Date,Notes
Asset,Example Home,Real Estate,2020-01-01,300000,350000,,,,,My primary residence
Asset,Example Car,Vehicle,2021-06-15,25000,18000,,,,,2021 Honda Accord
Asset,Savings Account,Bank Account,2019-01-01,0,15000,,,,,Emergency fund
Liability,Home Mortgage,Mortgage,,,,250000,240000,3.5,2020-01-01,30-year fixed
Liability,Car Loan,Auto Loan,,,,25000,12000,4.5,2021-06-15,60-month term`;
    
    downloadCSV(csv, 'networth-template.csv');
}

function exportData() {
    let csv = 'Type,Name,Category,Purchase Date,Purchase Price,Current Value,Original Amount,Current Balance,Interest Rate,Start Date,Notes\n';
    
    // Export assets
    assets.forEach(asset => {
        csv += `Asset,"${asset.name}",${asset.category},${asset.purchaseDate},${asset.purchasePrice},${asset.currentValue},,,,,"${asset.notes || ''}"\n`;
    });
    
    // Export liabilities
    liabilities.forEach(liability => {
        csv += `Liability,"${liability.name}",${liability.category},,,${liability.originalAmount},${liability.currentBalance},${liability.interestRate},${liability.startDate},"${liability.notes || '"}"\n`;
    });
    
    downloadCSV(csv, 'networth-data.csv');
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

function processImport() {
    const fileInput = document.getElementById('csv-file-input');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a file first');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csv = e.target.result;
            const result = parseCSV(csv);
            
            const resultDiv = document.getElementById('import-result');
            resultDiv.className = 'import-result success';
            resultDiv.textContent = `Successfully imported ${result.assetsAdded} assets and ${result.liabilitiesAdded} liabilities!`;
            
            saveData();
            updateAllDisplays();
            
            setTimeout(() => {
                closeAllModals();
            }, 2000);
            
        } catch (error) {
            const resultDiv = document.getElementById('import-result');
            resultDiv.className = 'import-result error';
            resultDiv.textContent = `Import failed: ${error.message}`;
        }
    };
    
    reader.readAsText(file);
}

function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    let assetsAdded = 0;
    let liabilitiesAdded = 0;
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
        const fields = parseCSVLine(lines[i]);
        
        if (fields.length < 11) continue;
        
        const type = fields[0].trim();
        
        if (type === 'Asset') {
            const asset = {
                id: generateId(),
                name: fields[1],
                category: fields[2],
                purchaseDate: fields[3],
                purchasePrice: parseFloat(fields[4]),
                currentValue: parseFloat(fields[5]),
                associatedDebtId: null,
                notes: fields[10] || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            if (asset.name && asset.category && asset.purchaseDate && !isNaN(asset.purchasePrice) && !isNaN(asset.currentValue)) {
                assets.push(asset);
                assetsAdded++;
            }
        } else if (type === 'Liability') {
            const liability = {
                id: generateId(),
                name: fields[1],
                category: fields[2],
                originalAmount: parseFloat(fields[6]),
                currentBalance: parseFloat(fields[7]),
                interestRate: parseFloat(fields[8]) || 0,
                startDate: fields[9],
                associatedAssetId: null,
                notes: fields[10] || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            if (liability.name && liability.category && !isNaN(liability.originalAmount) && !isNaN(liability.currentBalance) && liability.startDate) {
                liabilities.push(liability);
                liabilitiesAdded++;
            }
        }
    }
    
    return { assetsAdded, liabilitiesAdded };
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

// ==================== Delete All Data ====================

function deleteAllData() {
    if (confirm('Are you sure you want to delete ALL data? This cannot be undone!')) {
        if (confirm('This will permanently delete all assets, liabilities, and snapshots. Are you REALLY sure?')) {
            assets = [];
            liabilities = [];
            snapshots = [];
            saveData();
            updateAllDisplays();
            alert('All data has been deleted.');
        }
    }
}
