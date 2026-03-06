# 🚀 Quick Action Plan - Orbital IDE

## 🔴 **Critical Issues to Fix NOW**

### 1. Add Pre-compiled WASM Files (30 minutes)

**Problem**: Deployment fails because WASM files don't exist

**Solution**:
```bash
# On your local machine with Stellar CLI installed:

# Create WASM directory
mkdir -p client/public/wasm

# Counter contract
stellar contract init counter-example --with-example counter
cd counter-example
stellar contract build
cp target/wasm32-unknown-unknown/release/*.wasm ../client/public/wasm/counter.wasm
cd ..

# Token contract
stellar contract init token-example --with-example token
cd token-example
stellar contract build
cp target/wasm32-unknown-unknown/release/*.wasm ../client/public/wasm/token.wasm
cd ..

# Hello World
stellar contract init hello-example --with-example hello_world
cd hello-example
stellar contract build
cp target/wasm32-unknown-unknown/release/*.wasm ../client/public/wasm/hello_world.wasm
cd ..

# For Escrow and Voting - you'll need to create these or find examples
```

**Verification**:
```bash
ls -lh client/public/wasm/
# Should show: counter.wasm, token.wasm, hello_world.wasm
```

---

### 2. Better Error Messages (15 minutes)

**File**: `client/src/compiler.js`

**Replace lines 145-151**:
```javascript
// Current:
return {
    status: CompilationStatus.ERROR,
    error: 'Compilation service not available. Please ensure VITE_COMPILER_URL is configured.',
};

// Change to:
return {
    status: CompilationStatus.ERROR,
    error: `⚠️ Pre-compiled WASM not found for "${contractName}".\n\n` +
           `To deploy this contract:\n` +
           `1. Compile locally: stellar contract build\n` +
           `2. Add WASM file to: client/public/wasm/${contractName}.wasm\n` +
           `3. Or set up compilation backend service\n\n` +
           `For now, try the "counter" or "token" examples if WASM files are available.`,
};
```

---

### 3. Fix Function Discovery (20 minutes)

**File**: `client/src/App.jsx`

**Find the interact panel code** and update to use example metadata:

```javascript
// Around line 850-900, find where functions are displayed
// Instead of calling getContractFunctions (which returns empty)
// Use the example metadata:

const displayFunctions = () => {
  if (!deployedContract) return null;
  
  // Get functions from example metadata
  const example = getExample(selectedExample);
  const functions = example?.functions || [];
  
  if (functions.length === 0) {
    return <div>No functions available for this contract</div>;
  }
  
  return functions.map(func => (
    // ... existing function display code
  ));
};
```

---

## 🟡 **Important Improvements (This Week)**

### 4. Add Deployment Progress (30 minutes)

**File**: `client/src/App.jsx`

**Update handleDeploy** to show detailed progress:

```javascript
setDeployStatus({ 
  status: 'pending', 
  message: 'Step 1/4: Compiling contract...', 
  progress: 25 
});

// After compilation:
setDeployStatus({ 
  status: 'pending', 
  message: 'Step 2/4: Uploading WASM (checking size)...', 
  progress: 50 
});

// After WASM upload:
setDeployStatus({ 
  status: 'pending', 
  message: 'Step 3/4: Deploying contract instance...', 
  progress: 75 
});

// After deploy complete:
setDeployStatus({ 
  status: 'success', 
  message: 'Step 4/4: Contract deployed! 🎉', 
  progress: 100 
});
```

**Add progress bar CSS**:
```css
/* client/src/App.css */
.deploy-progress {
  width: 100%;
  height: 4px;
  background: var(--noir);
  border-radius: 2px;
  overflow: hidden;
  margin: 10px 0;
}

.deploy-progress-bar {
  height: 100%;
  background: var(--cyan-electric);
  transition: width 0.3s ease;
}
```

---

### 5. Local Storage Persistence (45 minutes)

**Create new file**: `client/src/storage.js`

```javascript
/**
 * Local storage utilities for Orbital IDE
 */

const STORAGE_KEYS = {
  DEPLOYED_CONTRACTS: 'orbital_contracts',
  TRANSACTION_HISTORY: 'orbital_history',
  CUSTOM_CODE: 'orbital_code',
  PREFERENCES: 'orbital_prefs',
};

export const Storage = {
  // Save deployed contract
  saveContract(contractData) {
    const contracts = this.getContracts();
    contracts.unshift({
      ...contractData,
      savedAt: new Date().toISOString(),
    });
    localStorage.setItem(STORAGE_KEYS.DEPLOYED_CONTRACTS, JSON.stringify(contracts.slice(0, 10)));
  },

  // Get all deployed contracts
  getContracts() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.DEPLOYED_CONTRACTS) || '[]');
    } catch {
      return [];
    }
  },

  // Save transaction
  saveTransaction(tx) {
    const history = this.getHistory();
    history.unshift({
      ...tx,
      savedAt: new Date().toISOString(),
    });
    localStorage.setItem(STORAGE_KEYS.TRANSACTION_HISTORY, JSON.stringify(history.slice(0, 50)));
  },

  // Get transaction history
  getHistory() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTION_HISTORY) || '[]');
    } catch {
      return [];
    }
  },

  // Auto-save code
  saveCode(contractName, code) {
    const saved = this.getSavedCode();
    saved[contractName] = {
      code,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.CUSTOM_CODE, JSON.stringify(saved));
  },

  // Load saved code
  getSavedCode(contractName) {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOM_CODE) || '{}');
      return contractName ? saved[contractName] : saved;
    } catch {
      return contractName ? null : {};
    }
  },

  // Clear all data
  clearAll() {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  },
};
```

**Use in App.jsx**:
```javascript
import { Storage } from './storage';

// After successful deployment:
Storage.saveContract(deployedContract);
Storage.saveTransaction(transaction);

// On component mount:
useEffect(() => {
  const savedContracts = Storage.getContracts();
  if (savedContracts.length > 0) {
    // Show "Recently Deployed" section
  }
}, []);

// Auto-save code on change:
useEffect(() => {
  const timer = setTimeout(() => {
    if (code && selectedExample === 'custom') {
      Storage.saveCode('custom', code);
    }
  }, 2000); // Debounce 2 seconds
  
  return () => clearTimeout(timer);
}, [code]);
```

---

### 6. Fee Estimation UI (30 minutes)

**File**: `client/src/deploy.js`

**Add new function**:
```javascript
/**
 * Estimate deployment cost
 */
export async function estimateDeploymentFee(wasmBuffer, sourcePublicKey) {
  try {
    const sourceAccount = await horizonServer.loadAccount(sourcePublicKey);
    
    const operation = StellarSdk.Operation.uploadContractWasm({
      wasm: wasmBuffer,
    });
    
    const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();
    
    const simulateResponse = await sorobanServer.simulateTransaction(transaction);
    
    if (SorobanServer.Api.isSimulationError(simulateResponse)) {
      return { error: simulateResponse.error };
    }
    
    // Extract estimated fee from simulation
    const estimatedFee = simulateResponse.minResourceFee || '0';
    const stroops = parseInt(estimatedFee);
    const xlm = stroops / 10000000;
    
    return {
      stroops,
      xlm: xlm.toFixed(7),
      operations: 2, // Upload + Deploy
      totalXlm: (xlm * 2).toFixed(7),
    };
    
  } catch (error) {
    console.error('Fee estimation error:', error);
    return { error: error.message };
  }
}
```

**Add to UI** in App.jsx:
```javascript
const [estimatedFee, setEstimatedFee] = useState(null);

// Before deployment:
const showFeeEstimate = async () => {
  const fee = await Compiler.estimateDeploymentFee(wasmBuffer, publicKey);
  setEstimatedFee(fee);
  // Show modal: "Estimated cost: 2.5 XLM. Continue?"
};
```

---

## 🔵 **Nice to Have (Next Week)**

### 7. Keyboard Shortcuts (1 hour)

**File**: `client/src/App.jsx`

```javascript
useEffect(() => {
  const handleKeyPress = (e) => {
    // Ctrl/Cmd + D = Deploy
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      handleDeploy();
    }
    
    // Ctrl/Cmd + Enter = Execute function
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (activePanel === 'interact') {
        handleCallFunction();
      }
    }
    
    // Ctrl/Cmd + / = Focus AI chat
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      document.querySelector('.ai-input')?.focus();
    }
  };
  
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [activePanel]);
```

---

### 8. Mobile Responsiveness (2 hours)

**File**: `client/src/App.css`

**Add media queries**:
```css
/* Mobile: Stack panels vertically */
@media (max-width: 768px) {
  .app-container {
    flex-direction: column !important;
  }
  
  .sidebar {
    width: 100% !important;
    height: auto !important;
    max-height: 200px;
    overflow-y: auto;
  }
  
  .main-panel {
    width: 100% !important;
  }
  
  .info-panel {
    width: 100% !important;
    height: auto !important;
  }
  
  /* Hide wallet address on mobile */
  .wallet-info {
    font-size: 12px;
  }
  
  .wallet-address {
    max-width: 120px;
  }
}
```

---

## 📊 **Testing Checklist**

After implementing fixes:

- [ ] Deploy counter contract successfully
- [ ] Call increment function
- [ ] Verify transaction on Stellar Expert
- [ ] Check localStorage persistence
- [ ] Test error messages
- [ ] Try keyboard shortcuts
- [ ] Test on mobile browser
- [ ] Verify fee estimation
- [ ] Check AI features still work
- [ ] Test wallet reconnection

---

## 🎯 **Deployment Checklist**

Before deploying to Vercel/production:

- [ ] Add WASM files to git
- [ ] Set VITE_COMPILER_URL (if backend ready)
- [ ] Test build: `npm run build`
- [ ] Check bundle size: `ls -lh dist/`
- [ ] Run in preview: `npm run preview`
- [ ] Test all features in preview
- [ ] Update README with deployment status
- [ ] Tag release: `git tag v1.0.0-orange-belt`

---

## 📝 **Documentation Updates Needed**

- [ ] Update README with WASM compilation instructions
- [ ] Add troubleshooting section
- [ ] Document environment variables
- [ ] Add architecture diagram
- [ ] Create user guide
- [ ] Add API documentation
- [ ] Write deployment guide

---

**Priority Order**:
1. Add WASM files ← START HERE
2. Test deployment works
3. Improve error messages
4. Add progress indicators
5. Everything else

Good luck! 🚀
