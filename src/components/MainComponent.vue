<template>
  <v-card>
    <v-toolbar color="indigo" elevation="4">
      <v-btn icon>
        <v-icon>mdi-github</v-icon>
      </v-btn>

      <v-toolbar-title class="toolbar-title">Copilot Metrics Viewer | {{ capitalizedItemName }} : {{ displayViewOrgsName }}  {{ teamName }}
      </v-toolbar-title>
      <h2 class="error-message"> {{ mockedDataMessage }} </h2>
      <v-spacer></v-spacer>
   
      <v-select
        v-model="currentOrg"
        :items="loadOrgsName"
        label="Select Organization"
        dense
        outlined
        class="mx-4"
        style="max-width: 300px;"
        @update:model-value="handleOrgChange"
      ></v-select>
      <!-- Conditionally render the logout button -->
      <v-btn v-if="showLogoutButton" href="/logout" class="logout-button">Logout</v-btn>

      <template v-slot:extension>
        <v-tabs v-model="tab" align-tabs="title">
          <v-tab v-for="item in tabItems" :key="item" :value="item">
            {{ item }}
          </v-tab>
        </v-tabs>
      </template>
    </v-toolbar>

    <!-- API Error Message -->
    <div v-if="apiError && !signInRequired" class="error-message" v-html="apiError"></div>
    <div v-if="signInRequired" class="github-login-container">
      <a href="/login" class="github-login-button">
        <v-icon left>mdi-github</v-icon>
        Sign in with GitHub
      </a>
    </div>
    <div v-if="!apiError">
      <v-progress-linear v-if="!metricsReady" indeterminate color="indigo"></v-progress-linear>
      <v-window v-if="metricsReady" v-model="tab">
        <v-window-item v-for="item in tabItems" :key="item" :value="item">
          <v-card flat>
            <MetricsViewer v-if="item === itemName" :metrics="metrics" />
            <BreakdownComponent v-if="item === 'languages'" :metrics="metrics" :breakdownKey="'language'" />
            <BreakdownComponent v-if="item === 'editors'" :metrics="metrics" :breakdownKey="'editor'" />
            <CopilotChatViewer v-if="item === 'copilot chat'" :metrics="metrics" />
            <SeatsAnalysisViewer v-if="item === 'seat analysis'" :seats="seats" />
            <ApiResponse v-if="item === 'api response'" :metrics="metrics" :seats="seats" />
          </v-card>
        </v-window-item>
      </v-window>
    </div>

  </v-card>
</template>

<script lang='ts'>
import { defineComponent, ref } from 'vue'
import { getMetricsApi } from '../api/GitHubApi';
import { getTeamMetricsApi } from '../api/GitHubApi';
import { getSeatsApi } from '../api/ExtractSeats';
import { Metrics } from '../model/Metrics';
import { Seat } from "../model/Seat";
import { GHOrgs } from '@/model/GHOrgs';
import {GHOrg} from '@/model/GHOrgs';

//Components
import MetricsViewer from './MetricsViewer.vue'
import BreakdownComponent from './BreakdownComponent.vue' 
import CopilotChatViewer from './CopilotChatViewer.vue' 
import SeatsAnalysisViewer from './SeatsAnalysisViewer.vue'
import ApiResponse from './ApiResponse.vue'
import config from '../config';
import { changeOrg } from '../config';
import { getOrgs } from '../api/GitHubApi';
import { text } from 'express';

export default defineComponent({
  name: 'MainComponent',
  components: {
    MetricsViewer,
    BreakdownComponent,
    CopilotChatViewer,
    SeatsAnalysisViewer,
    ApiResponse
  },
  computed: {
    gitHubOrgName() {
      return config.github.org;
    },
    gitHubOrgNames() {
      return config.github.orgs;
    },
    itemName() {
      return config.scope.type;
    },
    capitalizedItemName():string {
      return this.itemName.charAt(0).toUpperCase() + this.itemName.slice(1);
    },
    displayedViewName(): string {
      return config.scope.name;
    },
    //add the orgs names to the view
    displayViewOrgsName(): string[] {
      return config.github.orgs;
    },
    loadOrgsName(): string[]  {
      console.log('now loadOrgsName:', this.userOrgs);
      return config.github.orgs;
    },
    defaultSelectOrg: {
      get() {
        return this.currentOrg;
      },
      set(value: string) {
        this.currentOrg = value;
      }
    }
    ,
    isScopeOrganization() {
      return config.scope.type === 'organization';
    },
    teamName() {
      var teamName;
      if (config.github.team && config.github.team.trim() !== '') {
        teamName = "| Team : " + config.github.team;
      } else {
        teamName = '';
      }
      return teamName;
    },
    mockedDataMessage() {
      return config.mockedData ? 'Using mock data - see README if unintended' : '';
    },
    showLogoutButton() {
      return config.github.baseApi === '/api/github';
    }
  },
  data () {
    return {
      tabItems: ['languages', 'editors', 'copilot chat', 'seat analysis', 'api response'],
      tab: null,
      currentOrg: '',
    }
  },
  created() {
    this.tabItems.unshift(this.itemName);
    this.currentOrg = config.github.orgs[0];
  },
  methods: {
    handleOrgChange(newValue: string) {
      this.currentOrg = newValue;
      this.defaultSelectOrg = newValue;
      this.$forceUpdate();
      this.dataUpdate();
    },
    dataUpdate() {
       config.github.org = this.currentOrg;
       config.changeOrg(this.currentOrg);
       this.refreshData();
       console.log(this.metrics.values);
    },
  },

  setup() {
    const metricsReady = ref(false);
    const metrics = ref<Metrics[]>([]);
    const seatsReady = ref(false); 
    const seats = ref<Seat[]>([]); 
    const apiError = ref<string | undefined>(undefined);
    const signInRequired = ref(false);
    const userOrgs = ref<GHOrgs>();
    // Add ref for loadOrgsName
    const loadOrgsName = ref<string[]>([]);
    
    const processError = (error: any) => {
      console.log(error);
      if (error.response && error.response.status) {
        switch (error.response.status) {
          case 401:
            apiError.value = '401 Unauthorized access - check if your token in the .env file is correct.';
            if (config.github.baseApi === '/api/github') {
              signInRequired.value = true;
            }
            break;
          case 404:
            apiError.value = `404 Not Found - is the ${config.scope.type} '${config.scope.name}' correct?`;
            apiError.value = error.message;
        }
        apiError.value += ' <br> If .env file is modified, restart the app for the changes to take effect.';
      }
    };

    const refreshData = async () => {
      try {
        // Reset error states
        apiError.value = undefined;
        signInRequired.value = false;
        
        // Update the value property of the ref
        userOrgs.value = await getOrgs();
        let orgs_string = '';
        if (userOrgs.value?.orgs) {
          orgs_string = userOrgs.value.orgs
            .map((org: GHOrg) => org.login)
            .join('|');
          config.changeOrgs(orgs_string);
          // Update the ref instead of this.displayViewOrgsName
          console.log('orgs_string:', config.github.orgs);
          loadOrgsName.value = config.github.orgs;
        }
        //userOrgs.value = noworgs;

        // Fetch metrics based on team configuration
        if (config.github.team && config.github.team.trim() !== '') {
          metrics.value = await getTeamMetricsApi();
        } else {
          metrics.value = await getMetricsApi();
        }
        metricsReady.value = true;
        // Fetch seats data
        seats.value = await getSeatsApi();
        seatsReady.value = true;
      } catch (error) {
        processError(error);
      }
      //udpate all the viewer components - MetricsViewer,BreakdownComponent,CopilotChatViewer,SeatsAnalysisViewer
      if(MetricsViewer) {
        //refresh the MetricsViewer
        
      }


    };

    // Initial data load
    refreshData();

    return { 
      metricsReady, 
      metrics, 
      seatsReady, 
      seats, 
      apiError, 
      signInRequired,
      userOrgs, // Add to returned object
      refreshData // Expose refreshData for potential reuse
    };
  }
})
</script>

<style scoped>
.toolbar-title {
  white-space: nowrap;
  overflow: visible;
  text-overflow: clip;

}
.error-message {
  color: red;
}
.logout-button {
  margin-left: auto;
}
.github-login-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
.github-login-button {
  display: flex;
  align-items: center;
  background-color: #24292e;
  color: white;
  padding: 10px 20px;
  border-radius: 5px;
  text-decoration: none;
  font-weight: bold;
  font-size: 14px;
}
.github-login-button:hover {
  background-color: #444d56;
}
.github-login-button v-icon {
  margin-right: 8px;
}
</style>