<script setup lang="ts">
// import '@primevue/themes'
import MainPanels from './components/MainPanels.vue'

var darkMode = false
var themeClass = 'dark-theme'

function darkLightToggle() {
  console.log('clicked!')
  darkMode = darkMode ? false : true
  const el = document.body

  if (darkMode) {
    el.classList.add('dark-theme')
  } else {
    el.classList.remove('dark-theme')
  }
  console.log('theme: ', themeClass)
}
</script>

<template>
  <header>
    <div>
      <span class="hover-pointer no-select" @click="darkLightToggle()"> Dark / Light </span>
    </div>
  </header>

  <main class="no-select">
    <MainPanels />
  </main>
</template>

<style scoped>
.hover-pointer {
  cursor: pointer;
}
</style>
