<template>
  <v-card>
    <v-toolbar color="indigo" elevation="4">
      <v-btn icon>
        <v-icon>mdi-github</v-icon>
      </v-btn>

      <v-toolbar-title class="toolbar-title">Copilot Metrics Viewer 
      </v-toolbar-title>
      <v-select
        v-model="selectedOrg"
        :items="orgsList"
        label="Select Org"
        outlined
        dense
        class="select-org"
        @update:modelValue="handleOrgChange"
      ></v-select>
      <v-select
        v-model="selectedTeam"
        :items="teamsList"
        label="Select Team"
        outlined
        dense
        class="select-team"
        @update:modelValue="handleTeamChange"
      ></v-select>

      <h2 class="error-message"> {{ mockedDataMessage }} </h2>
      <v-spacer></v-spacer>
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

<script lang="ts">
import { defineComponent, handleError, onMounted, ref, watch } from 'vue';
import config from '../config';
import { GHOrg } from '@/model/GHOrgs';
import { GHOrgs } from '@/model/GHOrgs';
import { GHTeam } from '@/model/GHTeams';
import { GHTeams } from '@/model/GHTeams';
//import { getMetricsApi } from '@/api/GitHubApi';
import { getOrgs } from '../api/GitHubApi';
import { getTeamsForOrg } from '../api/GitHubApi';
import { Metrics } from '../model/Metrics';
import { getMetricsApi } from '../api/GitHubApi';
import { getTeamMetricsApi } from '../api/GitHubApi';
import { Seat } from "../model/Seat";
import { getSeatsApi } from '../api/ExtractSeats';
//Components
import MetricsViewer from './MetricsViewer.vue'
import BreakdownComponent from './BreakdownComponent.vue' 
import CopilotChatViewer from './CopilotChatViewer.vue' 
import SeatsAnalysisViewer from './SeatsAnalysisViewer.vue'
import ApiResponse from './ApiResponse.vue'

export default defineComponent({
  name: 'TestComponent',

  components: {
    MetricsViewer,
    BreakdownComponent,
    CopilotChatViewer,
    SeatsAnalysisViewer,
    ApiResponse
  },

  //public conponents for config instance
  data () {
    return {
      tabItems: ['languages', 'editors', 'copilot chat', 'seat analysis', 'api response'],
      tab: null,
      itemName: 'Enterprises',
      allItems: [] as any[][] ,
    }
  },
  created() {
    this.tabItems.unshift(this.itemName);
  },
  computed: {
    mockedDataMessage() {
      return config.mockedData ? 'Using mock data - see README if unintended' : '';
    },
    showLogoutButton() {
      return config.github.baseApi === '/api/github';
    },
  },
  methods: {
    handleOrgChange(org: string) {
      config.changeCurrentOrg(org);
      this.teamsList = config.github.currentSelTeams;
      this.fetchMetricsData();
    },

    handleTeamChange(team: string) {
      config.changeCurrentTeam(team);
      this.fetchMetricsData(); 
    }
  },
  setup() {
        
        const apiError = ref<string | undefined>(undefined);
        const signInRequired = ref(false);
        const metricsReady = ref(false);
        const metrics = ref<Metrics[]>([]);
        const seatsReady = ref(false); 
        const seats = ref<Seat[]>([]); 
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
                apiError.value = `404 Not Found - is the right correct correct?`;
                apiError.value = error.message;
        }
        apiError.value += ' <br> If .env file is modified, restart the app for the changes to take effect.';
      }
    };


        //function to init the orgs and teams information
        const initOrgsTeams = async () => {
        let orgs = await getOrgs();
        let orgs_strings: string[] = [];
        let teams_strings: string[] = [];
        //if config.github.entName is setted, 
        // then insert with Ent:enterprieName  into config.github.allGithubOrgs in the beginning
        if (config.github.entName && config.github.entName !== '') {
          orgs_strings.push('Ent-'+config.github.entName);
          teams_strings.push('Ent-'+config.github.entName+':ALL');
        }
        //trick to remove hidden orgs informaion
        if (config.github.hiddenOrgs && config.github.hiddenOrgs !== '') {
           //remove the org in orgs if the org.login is in the hiddenOrgs
            orgs.orgs = orgs.orgs.filter((org: GHOrg):boolean => {
              return !config.github.hiddenOrgs.includes(org.login);
            });
        }
        //get the org names from the GHOrgs object and contact it to a string seperate by '|';
        // and then get the teams information for each orgs with the function : getTeamsForOrg from githubapi.ts
        // and store the teams information to a GHTeams object
        for (let i = 0; i < orgs.orgs.length; i++) {
          orgs_strings.push(orgs.orgs[i].login);
          let nowteams_string = orgs.orgs[i].login + ':ALL|'; 
          let teams = await getTeamsForOrg(orgs.orgs[i].login);
          teams.teams.forEach((team: GHTeam):void => {
            nowteams_string += team.name + '|';
         });
          nowteams_string = nowteams_string.slice(0, -1);//remove the last '|'    
          teams_strings.push(nowteams_string);
        }

        //init the orgs and teams information to the config object
        config.initORgs_Teams(orgs_strings, teams_strings);
        config.changeCurrentOrg(config.github.allGithubOrgs[0]);
        config.changeCurrentTeam(config.github.currentSelTeams[0]);
        config.orgsTeamsInited = true;
      }
    if (!config.orgsTeamsInited) {
      initOrgsTeams();
    }
    const selectedOrg = ref<string | null>(null);
    const selectedTeam = ref<string | null>(null);
    const teamsList = ref<string[]>([]);
    const orgsList = ref<string[]>([]);
    const initializeOrgTeam = async () => {
      try {
        // Wait for initialization
        while (!config.orgsTeamsInited) {
          await new Promise(resolve => setTimeout(resolve, 40))
        }
        
        // Update orgsList after initialization
        orgsList.value = config.github.allGithubOrgs;
        teamsList.value = config.github.currentSelTeams;
        config.changeCurrentOrg(config.github.allGithubOrgs[0]);
        fetchMetricsData();
      } catch (e) {
        console.error('Error initializing component:', e)
      }
    }

    const fetchMetricsData = async () => {
      try {
        // Reset error states
        apiError.value = undefined;
        signInRequired.value = false;

        // Fetch metrics based on team configuration
        let entAndOrg = false;
        if (config.github.currentSelOrg.startsWith('Ent-')) {
          // this is the configuration for enterprise
          const entName = config.github.currentSelOrg.split('-')[1];
          entAndOrg = true;
        } else if(config.github.currentSelTeam !== 'ALL') {
          // this is the configuration for a specific team in selected org
        } else {
          // this is the configuration for all teams in selected org
          entAndOrg = true;
        }
        if (!entAndOrg) {
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
    };

    onMounted(() => {
      initializeOrgTeam();
    });

    

    return {
      selectedOrg,
      orgsList,
      selectedTeam,
      teamsList,
      apiError,
      signInRequired, 
      metricsReady,
      metrics,
      seats,
      seatsReady,
      config,
      fetchMetricsData,
    }
  }
});
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