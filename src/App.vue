<template>
  <!-- class, not id="app": the index.html mount point already owns id="app", so
       reusing it here nested two id="app" elements (invalid). See ADR-0015. -->
  <div class="app-root">
    <Layout>
      <router-view v-slot="{ Component, route }">
        <component :is="Component" :key="route.path" />
      </router-view>
    </Layout>
  </div>
</template>

<script>
import Layout from './components/Layout.vue'

export default {
  name: 'App',
  components: {
    Layout
  }
}
</script>
