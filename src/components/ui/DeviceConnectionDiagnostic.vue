<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useUnifiedStore } from '@/stores/UnifiedStore';

const props = defineProps({
  deviceId: {
    type: String,
    required: true
  }
});

const store = useUnifiedStore();
const diagnosticResults = ref<{
  deviceFound: boolean;
  hasApiUrl: boolean;
  hasClient: boolean;
  isConnected: boolean;
  deviceInfo: Record<string, unknown>;
  errorMessage?: string;
} | null>(null);

const hasIssues = computed(() => {
  if (!diagnosticResults.value) return false;
  return !diagnosticResults.value.deviceFound || 
         !diagnosticResults.value.hasApiUrl;
});

// Run diagnostics on the device
const runDiagnostics = () => {
  try {
    // Get the device
    const device = store.getDeviceById(props.deviceId);
    
    if (!device) {
      diagnosticResults.value = {
        deviceFound: false,
        hasApiUrl: false,
        hasClient: false,
        isConnected: false,
        deviceInfo: {},
        errorMessage: `Device not found: ${props.deviceId}`
      };
      return;
    }
    
    // Check for apiBaseUrl
    const hasApiUrl = !!device.apiBaseUrl;
    
    // No longer check for a client directly; rely on apiBaseUrl
    const hasClient = !!device.apiBaseUrl;
    
    // Get device info
    const deviceInfo = {
      id: device.id,
      name: device.name,
      type: device.type,
      isConnected: device.isConnected,
      status: device.status,
      apiBaseUrl: device.apiBaseUrl,
      ipAddress: device.ipAddress,
      port: device.port,
      deviceNum: device.deviceNum,
      hasProperties: !!device.properties && Object.keys(device.properties).length > 0
    };
    
    diagnosticResults.value = {
      deviceFound: true,
      hasApiUrl,
      hasClient,
      isConnected: device.isConnected,
      deviceInfo
    };
    
    // Add error message if issues were found
    if (!hasApiUrl) {
      diagnosticResults.value.errorMessage = 'Device is missing API URL. Check device configuration.';
    }
  } catch (error) {
    diagnosticResults.value = {
      deviceFound: false,
      hasApiUrl: false,
      hasClient: false,
      isConnected: false,
      deviceInfo: {},
      errorMessage: `Error running diagnostics: ${error}`
    };
  }
};

// Suggest fixes based on diagnostic results
const suggestedFix = computed(() => {
  if (!diagnosticResults.value) return '';
  
  if (!diagnosticResults.value.deviceFound) {
    return 'Device not found in the store. Try re-running device discovery.';
  }
  
  if (!diagnosticResults.value.hasApiUrl) {
    return 'Device is missing API URL. Try updating the device with a valid API URL.';
  }
  
  if (!diagnosticResults.value.isConnected) {
    return 'Device is not connected. Try connecting to the device.';
  }
  
  return 'Device appears to be properly configured.';
});

// Try to fix common issues
const attemptFix = async () => {
  if (!diagnosticResults.value) return;
  
  try {
    const device = store.getDeviceById(props.deviceId);
    if (!device) return;
    
    // If missing API URL, try to construct one from IP and port
    if (!diagnosticResults.value.hasApiUrl && device.ipAddress && device.port) {
      const deviceNum = device.deviceNum !== undefined ? device.deviceNum : 0;
      const apiBaseUrl = `http://${device.ipAddress}:${device.port}/api/v1/${device.type.toLowerCase()}/${deviceNum}`;
      
      // @ts-expect-error - TypeScript context issues with store methods
      store.updateDevice(props.deviceId, { apiBaseUrl });
      console.log(`Fixed: Added API URL ${apiBaseUrl} to device ${props.deviceId}`);
      
      // Re-run diagnostics after fix
      setTimeout(runDiagnostics, 100);
    }
    
    // Try to connect the device if it's not connected
    if (!diagnosticResults.value.isConnected && diagnosticResults.value.hasClient) {
      console.log(`Attempting to connect device ${props.deviceId}`);
      // @ts-expect-error - TypeScript context issues with store methods
      await store.connectDevice(props.deviceId);
      
      // Re-run diagnostics after fix
      setTimeout(runDiagnostics, 100);
    }
  } catch (error) {
    console.error(`Error attempting fix:`, error);
  }
};

// Run diagnostics on mount
onMounted(runDiagnostics);

// Add UI update check methods
const lastUiUpdateTime = ref(Date.now())
const uiUpdateCheckInterval = ref<number | null>(null)

// Check if component props are being correctly passed
const checkUiUpdateProps = () => {
  const device = store.getDeviceById(props.deviceId)
  
  const propsState = {
    deviceFound: !!device,
    deviceHasApiUrl: !!device?.apiBaseUrl,
    deviceIsConnected: device?.isConnected || false,
    clientExists: false,
    lastChecked: Date.now()
  }
  
  console.log('[UIDiagnostic] Component props state:', propsState)
  
  // Update the UI
  lastUiUpdateTime.value = Date.now()
  
  // Return the state for use in the template
  return propsState
}

// Start periodic UI update checks
const startUiUpdateDiagnostics = () => {
  // Clear existing interval if any
  if (uiUpdateCheckInterval.value) {
    clearInterval(uiUpdateCheckInterval.value)
  }
  
  // Set interval to check UI props every 3 seconds
  uiUpdateCheckInterval.value = window.setInterval(() => {
    checkUiUpdateProps()
  }, 3000)
}

// Stop diagnostics
const stopUiUpdateDiagnostics = () => {
  if (uiUpdateCheckInterval.value) {
    clearInterval(uiUpdateCheckInterval.value)
    uiUpdateCheckInterval.value = null
  }
}

// Run UI diagnostics on mount
onMounted(() => {
  // Initialize UI checks
  startUiUpdateDiagnostics()
})

// Cleanup on unmount
onBeforeUnmount(() => {
  stopUiUpdateDiagnostics()
})
</script>

<template>
  <div class="device-diagnostic">
    <div class="diagnostic-header">
      <h3>Device Connection Diagnostic</h3>
      <button class="refresh-button" @click="runDiagnostics">
        Refresh
      </button>
    </div>
    
    <div v-if="diagnosticResults" class="diagnostic-results">
      <div class="status-grid">
        <div class="status-item">
          <span class="status-label">Device Found:</span>
          <span class="status-value" :class="{ 'status-ok': diagnosticResults.deviceFound, 'status-error': !diagnosticResults.deviceFound }">
            {{ diagnosticResults.deviceFound ? 'Yes' : 'No' }}
          </span>
        </div>
        
        <div class="status-item">
          <span class="status-label">Has API URL:</span>
          <span class="status-value" :class="{ 'status-ok': diagnosticResults.hasApiUrl, 'status-error': !diagnosticResults.hasApiUrl }">
            {{ diagnosticResults.hasApiUrl ? 'Yes' : 'No' }}
          </span>
        </div>
        
        <div class="status-item">
          <span class="status-label">Has Client:</span>
          <span class="status-value" :class="{ 'status-ok': diagnosticResults.hasClient, 'status-error': !diagnosticResults.hasClient }">
            {{ diagnosticResults.hasClient ? 'Yes' : 'No' }}
          </span>
        </div>
        
        <div class="status-item">
          <span class="status-label">Is Connected:</span>
          <span class="status-value" :class="{ 'status-ok': diagnosticResults.isConnected, 'status-warning': !diagnosticResults.isConnected }">
            {{ diagnosticResults.isConnected ? 'Yes' : 'No' }}
          </span>
        </div>
      </div>
      
      <div v-if="diagnosticResults.errorMessage" class="error-message">
        {{ diagnosticResults.errorMessage }}
      </div>
      
      <div v-if="hasIssues" class="fix-section">
        <p class="suggestion">{{ suggestedFix }}</p>
        <button class="fix-button" @click="attemptFix">
          Attempt Auto-Fix
        </button>
      </div>
      
      <div class="device-details">
        <h4>Device Details</h4>
        <pre>{{ JSON.stringify(diagnosticResults.deviceInfo, null, 2) }}</pre>
      </div>
    </div>
    
    <div v-else class="loading">
      Running diagnostics...
    </div>
  </div>
</template>

<style scoped>
.device-diagnostic {
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #f9f9f9;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

.diagnostic-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.diagnostic-header h3 {
  margin: 0;
  font-size: 1.2rem;
}

.refresh-button, .fix-button {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.refresh-button:hover, .fix-button:hover {
  background-color: #3e8e41;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.status-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  background-color: #fff;
  border-radius: 4px;
}

.status-label {
  font-weight: bold;
}

.status-value {
  font-family: monospace;
}

.status-ok {
  color: #4CAF50;
  font-weight: bold;
}

.status-error {
  color: #f44336;
  font-weight: bold;
}

.status-warning {
  color: #ff9800;
  font-weight: bold;
}

.error-message {
  padding: 0.5rem;
  background-color: #ffebee;
  border-left: 4px solid #f44336;
  margin-bottom: 1rem;
}

.fix-section {
  margin-bottom: 1rem;
}

.suggestion {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-style: italic;
}

.device-details {
  background-color: #fff;
  padding: 0.5rem;
  border-radius: 4px;
}

.device-details h4 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.device-details pre {
  margin: 0;
  white-space: pre-wrap;
  font-size: 0.8rem;
}

.loading {
  text-align: center;
  padding: 1rem;
  font-style: italic;
}
</style> 