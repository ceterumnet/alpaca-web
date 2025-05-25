<template>
  <div v-if="discoveryStore.showManualDiscoveryPrompt" class="manual-discovery-prompt-modal">
    <div class="modal-content">
      <h3>Manual Device Discovery</h3>
      <p>
        Initial automatic discovery failed. Please enter the host and port of your Alpaca device server.
      </p>
      
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="manual-host">Host:</label>
          <input id="manual-host" v-model="localHost" type="text" required />
        </div>
        <div class="form-group">
          <label for="manual-port">Port:</label>
          <input id="manual-port" v-model.number="localPort" type="number" required min="1" max="65535" />
        </div>
        
        <p class="cors-note">
          <small>
            Note: If connection still fails, ensure the Alpaca device at the specified address
            is configured to accept requests from this web application (CORS policy).
          </small>
        </p>
        
        <div class="modal-actions">
          <button type="submit">Connect</button>
          <button type="button" @click="handleCancel">Cancel</button>
        </div>
      </form>
      
      <div v-if="discoveryStore.lastError && discoveryStore.status === 'error' && isManualAttemptError" class="error-message">
        <p>Connection Error: {{ discoveryStore.lastError }}</p>
        <p>Please verify the host, port, and device CORS settings.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useEnhancedDiscoveryStore } from '@/stores/useEnhancedDiscoveryStore';

const discoveryStore = useEnhancedDiscoveryStore();

// Local refs for form inputs, initialized from store but editable locally
const localHost = ref('');
const localPort = ref<number | null>(null);

// Watch for when the prompt becomes visible to initialize local refs
watch(() => discoveryStore.showManualDiscoveryPrompt, (newValue) => {
  if (newValue) {
    localHost.value = discoveryStore.manualHostInput;
    localPort.value = discoveryStore.manualPortInput;
  }
}, { immediate: true });

const handleSubmit = async () => {
  if (localHost.value && localPort.value) {
    await discoveryStore.submitManualDiscovery(localHost.value, localPort.value);
    // The store will hide the prompt on successful submission path
    // If submitManualDiscovery itself fails and we want to keep the modal open,
    // the store's showManualDiscoveryPrompt logic might need adjustment,
    // or we handle it here. For now, assuming store handles visibility.
  } else {
    // Basic validation feedback, or rely on HTML5 required attribute
    console.warn('Host and Port are required for manual discovery.');
  }
};

const handleCancel = () => {
  // Manually hide the prompt by setting the store variable.
  // Consider if a dedicated store action for "cancelManualDiscovery" is cleaner.
  discoveryStore.setShowManualDiscoveryPrompt(false); 
  // Reset initialDirectDiscoveryAttemptFailed to allow re-prompting if user cancels then retries discovery
  // This might be better handled in the store itself if cancellation implies a reset of the "attempted" state.
  // For now, direct mutation as per existing pattern:
  // discoveryStore.initialDirectDiscoveryAttemptFailed = false; // Re-evaluate this line.
  // Let's remove the direct mutation of initialDirectDiscoveryAttemptFailed here.
  // The store's setShowManualDiscoveryPrompt or a dedicated cancel action should handle if this flag needs reset.
  // For now, cancelling just closes the dialog. Another discovery attempt will use existing state.
};

// Computed property to determine if the current error is from a manual attempt
// This helps show a more specific error message within the modal.
const isManualAttemptError = computed(() => {
    // If initialDirectDiscoveryAttemptFailed is true (set before calling discoverDevices with manual settings)
    // and there's an error, it implies the manual attempt resulted in this error.
    return discoveryStore.initialAttemptFailed && discoveryStore.lastError;
});

</script>

<style scoped>
.manual-discovery-prompt-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgb(0 0 0 / 50%);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000; /* Ensure it's on top */
}

.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgb(0 0 0 / 10%);
  width: 90%;
  max-width: 500px;
  color: #333; /* Ensuring text is readable on white background */
}

.modal-content h3 {
  margin-top: 0;
  color: #1a202c; /* Darker heading */
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input {
  width: calc(100% - 20px); /* Adjust for padding */
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}

.cors-note {
  margin-top: 10px;
  margin-bottom: 20px;
  font-size: 0.9em;
  color: #555;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.modal-actions button {
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.modal-actions button[type="submit"] {
  background-color: #4CAF50; /* Green */
  color: white;
}

.modal-actions button[type="button"] {
  background-color: #f44336; /* Red */
  color: white;
}

.error-message {
  margin-top: 15px;
  color: #d32f2f; /* Red for errors */
  background-color: #ffebee; /* Light red background */
  border: 1px solid #d32f2f;
  padding: 10px;
  border-radius: 4px;
}
</style> 