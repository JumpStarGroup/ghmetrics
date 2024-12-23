<template>
  <v-app>
    <v-main>
      <TestComponent/>
    </v-main>
  </v-app>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
//import MainComponent from './components/MainComponent.vue'
import TestComponent from './components/TestComponent.vue';

export default defineComponent({
  name: 'App',

  components: {
    TestComponent,
    //MainComponent,
  },

  data () {
    return {
      //
    }
  },
})
</script>
